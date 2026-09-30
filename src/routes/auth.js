import { Router } from 'express';
import QRCode from 'qrcode';
import { hashPassword, verifyPassword, sha256, encrypt, decrypt } from '../lib/crypto.js';
import { generateSecret, otpauthUri, verifyTotp, recoveryCode } from '../lib/totp.js';
import { audit } from '../lib/audit.js';
import { HttpError, v } from '../lib/validate.js';
import { asyncHandler as h } from '../middleware/security.js';
import { clearSessionCookie, createSession, requireAdmin, requireSession } from '../middleware/session.js';

const MAX_FAILS = 5;
const LOCK_MINUTES = 15;
// a real hash to compare against when the email is unknown, so timing does not reveal which emails exist
const dummyHash = hashPassword('not-a-real-password-just-for-timing');

export const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, role: u.role });

export function authState(auth) {
  if (!auth) return 'anonymous';
  if (auth.role !== 'admin') return 'ok';
  if (!auth.totpEnabled) return 'setup_2fa';
  return auth.mfaVerified ? 'ok' : 'verify_2fa';
}

export function authRoutes({ db, config, limits }) {
  const r = Router();

  async function registerFailure(userId) {
    const { rows } = await db.query(
      `UPDATE users
          SET failed_logins = failed_logins + 1,
              locked_until = CASE WHEN failed_logins + 1 >= $2 THEN now() + ($3 * interval '1 minute') ELSE locked_until END
        WHERE id = $1
        RETURNING failed_logins`,
      [userId, MAX_FAILS, LOCK_MINUTES]
    );
    return rows[0].failed_logins >= MAX_FAILS;
  }

  r.get('/me', (req, res) => {
    res.json({ state: authState(req.auth), user: req.auth ? publicUser(req.auth.user) : null });
  });

  r.post('/login', limits.login, h(async (req, res) => {
    const email = v.email(req.body?.email, 'email', { required: true });
    const password = v.str(req.body?.password, 'password', { required: true, max: 200, trim: false });
    const { rows } = await db.query('SELECT * FROM users WHERE lower(email) = lower($1) AND active = TRUE', [email]);
    const user = rows[0];
    const passwordOk = await verifyPassword(password, user ? user.password_hash : await dummyHash);

    if (user?.locked_until && new Date(user.locked_until) > new Date()) {
      throw new HttpError(429, 'Too many attempts. Please try again in 15 minutes.');
    }
    if (!user || !passwordOk) {
      if (user) await registerFailure(user.id);
      await audit(db, req, 'auth.login_failed', { meta: { email } });
      throw new HttpError(401, 'Incorrect email or password.');
    }

    await db.query('UPDATE users SET failed_logins = 0, locked_until = NULL, last_login_at = now() WHERE id = $1', [user.id]);
    await createSession(db, config, req, res, user.id);
    req.auth = { user };
    await audit(db, req, 'auth.login', { entity: 'user', entityId: user.id });
    res.json({
      user: publicUser(user),
      state: user.role !== 'admin' ? 'ok' : user.totp_enabled ? 'verify_2fa' : 'setup_2fa'
    });
  }));

  r.post('/logout', h(async (req, res) => {
    if (req.auth) await db.query('DELETE FROM sessions WHERE token_hash = $1', [req.auth.tokenHash]);
    clearSessionCookie(config, res);
    res.json({ ok: true });
  }));

  // ---- two-factor authentication ----
  r.post('/2fa/setup', requireSession, limits.twofa, h(async (req, res) => {
    if (req.auth.role !== 'admin') throw new HttpError(403, 'Access denied.');
    const { rows } = await db.query('SELECT email, totp_enabled FROM users WHERE id = $1', [req.auth.user.id]);
    if (rows[0].totp_enabled) throw new HttpError(409, 'Two-factor authentication is already enabled.');
    const secret = generateSecret();
    await db.query('UPDATE users SET totp_secret_enc = $2 WHERE id = $1', [req.auth.user.id, encrypt(secret)]);
    const uri = otpauthUri(secret, rows[0].email);
    res.json({ secret, uri, qr: await QRCode.toDataURL(uri, { margin: 1, width: 220 }) });
  }));

  r.post('/2fa/enable', requireSession, limits.twofa, h(async (req, res) => {
    if (req.auth.role !== 'admin') throw new HttpError(403, 'Access denied.');
    const { rows } = await db.query('SELECT totp_secret_enc, totp_enabled FROM users WHERE id = $1', [req.auth.user.id]);
    const user = rows[0];
    if (user.totp_enabled) throw new HttpError(409, 'Two-factor authentication is already enabled.');
    if (!user.totp_secret_enc) throw new HttpError(400, 'Start the setup first.');
    const code = (v.str(req.body?.code, 'code', { required: true, max: 10 })).replace(/\s/g, '');
    const step = verifyTotp(decrypt(user.totp_secret_enc), code, 0);
    if (!step) throw new HttpError(401, 'That code is not correct. Check the time on your phone and try again.');

    const codes = Array.from({ length: 8 }, recoveryCode);
    await db.tx(async (t) => {
      await t.query('UPDATE users SET totp_enabled = TRUE, totp_last_step = $2 WHERE id = $1', [req.auth.user.id, step]);
      await t.query('DELETE FROM recovery_codes WHERE user_id = $1', [req.auth.user.id]);
      for (const c of codes) await t.query('INSERT INTO recovery_codes (user_id, code_hash) VALUES ($1, $2)', [req.auth.user.id, sha256(c)]);
      await t.query('UPDATE sessions SET mfa_verified = TRUE WHERE token_hash = $1', [req.auth.tokenHash]);
    });
    await audit(db, req, '2fa.enabled', { entity: 'user', entityId: req.auth.user.id });
    res.json({ ok: true, state: 'ok', recovery_codes: codes });
  }));

  r.post('/2fa/verify', requireSession, limits.twofa, h(async (req, res) => {
    const { rows } = await db.query('SELECT id, totp_secret_enc, totp_enabled, totp_last_step FROM users WHERE id = $1', [req.auth.user.id]);
    const user = rows[0];
    if (!user.totp_enabled) throw new HttpError(400, 'Two-factor authentication is not set up.');
    const code = v.str(req.body?.code, 'code', { required: true, max: 32 }).replace(/\s/g, '').toLowerCase();

    let ok = false;
    if (/^\d{6}$/.test(code)) {
      const step = verifyTotp(decrypt(user.totp_secret_enc), code, user.totp_last_step);
      // the WHERE clause makes sure one code can only ever be used once, even with parallel requests
      if (step) ok = (await db.query('UPDATE users SET totp_last_step = $2 WHERE id = $1 AND totp_last_step < $2', [user.id, step])).rowCount === 1;
    } else if (/^[a-z2-7]{5}-[a-z2-7]{5}$/.test(code)) {
      ok = (await db.query('UPDATE recovery_codes SET used_at = now() WHERE user_id = $1 AND code_hash = $2 AND used_at IS NULL', [user.id, sha256(code)])).rowCount === 1;
      if (ok) await audit(db, req, '2fa.recovery_code_used', { entity: 'user', entityId: user.id });
    }

    if (!ok) {
      const locked = await registerFailure(user.id);
      await audit(db, req, 'auth.2fa_failed', { entity: 'user', entityId: user.id });
      if (locked) {
        await db.query('DELETE FROM sessions WHERE user_id = $1', [user.id]);
        clearSessionCookie(config, res);
        throw new HttpError(429, 'Too many attempts. Please try again in 15 minutes.');
      }
      throw new HttpError(401, 'That code is not correct.');
    }
    await db.query('UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = $1', [user.id]);
    await db.query('UPDATE sessions SET mfa_verified = TRUE WHERE token_hash = $1', [req.auth.tokenHash]);
    res.json({ ok: true, state: 'ok', user: publicUser(req.auth.user) });
  }));

  // ---- password ----
  r.post('/password', requireAdmin, limits.login, h(async (req, res) => {
    const current = v.str(req.body?.current_password, 'current_password', { required: true, max: 200, trim: false });
    const next = v.str(req.body?.new_password, 'new_password', { required: true, min: 12, max: 200, trim: false });
    const { rows } = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.auth.user.id]);
    if (!(await verifyPassword(current, rows[0].password_hash))) throw new HttpError(401, 'Your current password is not correct.');
    if (next === current) throw new HttpError(400, 'Choose a password you have not used before.');
    await db.query('UPDATE users SET password_hash = $2 WHERE id = $1', [req.auth.user.id, await hashPassword(next)]);
    await db.query('DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2', [req.auth.user.id, req.auth.tokenHash]);
    await audit(db, req, 'auth.password_changed', { entity: 'user', entityId: req.auth.user.id });
    res.json({ ok: true });
  }));

  return r;
}

import { sha256, randomToken, hashIp } from '../lib/crypto.js';
import { HttpError } from '../lib/validate.js';

export const cookieName = (config) => (config.isProd ? '__Host-mis' : 'mis');

function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

export async function createSession(db, config, req, res, userId) {
  const token = randomToken(32);
  await db.query('DELETE FROM sessions WHERE expires_at < now()');
  await db.query(
    `INSERT INTO sessions (token_hash, user_id, expires_at, ip_hash, user_agent)
     VALUES ($1, $2, now() + ($3 * interval '1 hour'), $4, $5)`,
    [sha256(token), userId, config.sessionHours, hashIp(req.ip), (req.get('user-agent') || '').slice(0, 200)]
  );
  res.cookie(cookieName(config), token, {
    httpOnly: true, sameSite: 'lax', secure: config.isProd, path: '/', maxAge: config.sessionHours * 3600 * 1000
  });
}

export function clearSessionCookie(config, res) {
  res.clearCookie(cookieName(config), { httpOnly: true, sameSite: 'lax', secure: config.isProd, path: '/' });
}

export function sessionMiddleware(db, config) {
  const name = cookieName(config);
  return async (req, res, next) => {
    req.auth = null;
    try {
      const token = readCookie(req, name);
      if (token && /^[A-Za-z0-9_-]{30,80}$/.test(token)) {
        const { rows } = await db.query(
          `SELECT s.token_hash, s.mfa_verified, s.last_seen_at,
                  u.id AS user_id, u.email, u.name, u.role, u.client_id, u.totp_enabled, u.active
             FROM sessions s JOIN users u ON u.id = s.user_id
            WHERE s.token_hash = $1
              AND s.expires_at > now()
              AND s.last_seen_at > now() - ($2 * interval '1 minute')`,
          [sha256(token), config.idleMinutes]
        );
        const row = rows[0];
        if (row && row.active) {
          req.auth = {
            tokenHash: row.token_hash,
            mfaVerified: row.mfa_verified,
            totpEnabled: row.totp_enabled,
            role: row.role,
            clientId: row.client_id,
            user: { id: row.user_id, email: row.email, name: row.name, role: row.role }
          };
          if (Date.now() - new Date(row.last_seen_at).getTime() > 60_000) {
            await db.query('UPDATE sessions SET last_seen_at = now() WHERE token_hash = $1', [row.token_hash]);
          }
        }
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireSession(req, res, next) {
  if (!req.auth) return next(new HttpError(401, 'Please sign in.', { code: 'UNAUTHENTICATED' }));
  next();
}

// Full access: signed in, is an admin, and completed two-factor authentication.
export function requireAdmin(req, res, next) {
  if (!req.auth) return next(new HttpError(401, 'Please sign in.', { code: 'UNAUTHENTICATED' }));
  if (req.auth.role !== 'admin') return next(new HttpError(403, 'Access denied.'));
  if (!req.auth.totpEnabled) return next(new HttpError(403, 'Set up two-factor authentication first.', { code: 'MFA_SETUP_REQUIRED' }));
  if (!req.auth.mfaVerified) return next(new HttpError(403, 'Enter your two-factor code.', { code: 'MFA_REQUIRED' }));
  next();
}

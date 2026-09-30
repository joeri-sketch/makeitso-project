import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN, Client, codeFor, signedInAdmin, startTestServer } from './helpers.js';

// Signs in with a fresh, valid 2FA code. (The replay guard is reset so tests can sign in repeatedly.)
async function signIn(ctx, secret) {
  await ctx.db.query('UPDATE users SET totp_last_step = 0');
  const c = new Client(ctx.base);
  assert.equal((await c.post('/api/auth/login', { email: ADMIN.email, password: ADMIN.password })).status, 200);
  assert.equal((await c.post('/api/auth/2fa/verify', { code: codeFor(secret) })).status, 200);
  return c;
}

describe('authentication', () => {
  let ctx, secret, recoveryCodes;
  before(async () => {
    ctx = await startTestServer();
    ({ secret, recoveryCodes } = await signedInAdmin(ctx));
  });
  after(async () => { await ctx.close(); });

  it('rejects wrong credentials with one generic message (no account enumeration)', async () => {
    const a = await new Client(ctx.base).post('/api/auth/login', { email: ADMIN.email, password: 'wrong-password-123' });
    const b = await new Client(ctx.base).post('/api/auth/login', { email: 'nobody@example.com', password: 'wrong-password-123' });
    assert.equal(a.status, 401);
    assert.equal(b.status, 401);
    assert.equal(a.json.error, b.json.error);
  });

  it('keeps the CRM locked until two-factor authentication is completed', async () => {
    const c = new Client(ctx.base);
    assert.equal((await c.get('/api/clients')).status, 401);
    const login = await c.post('/api/auth/login', { email: ADMIN.email, password: ADMIN.password });
    assert.equal(login.json.state, 'verify_2fa');
    const blocked = await c.get('/api/clients');
    assert.equal(blocked.status, 403);
    assert.equal(blocked.json.code, 'MFA_REQUIRED');
    assert.equal((await c.post('/api/auth/2fa/verify', { code: '000000' })).status, 401);
    await ctx.db.query('UPDATE users SET failed_logins = 0, totp_last_step = 0');
    assert.equal((await c.post('/api/auth/2fa/verify', { code: codeFor(secret) })).status, 200);
    assert.equal((await c.get('/api/clients')).status, 200);
  });

  it('forces a new admin to set up 2FA before anything else', async () => {
    await ctx.db.query(
      `INSERT INTO users (email, name, role, password_hash) SELECT 'second@example.com', 'Second', 'admin', password_hash FROM users WHERE lower(email) = $1`,
      [ADMIN.email]
    );
    const c = new Client(ctx.base);
    const login = await c.post('/api/auth/login', { email: 'second@example.com', password: ADMIN.password });
    assert.equal(login.json.state, 'setup_2fa');
    const blocked = await c.get('/api/clients');
    assert.equal(blocked.status, 403);
    assert.equal(blocked.json.code, 'MFA_SETUP_REQUIRED');
    await ctx.db.query(`DELETE FROM users WHERE lower(email) = 'second@example.com'`);
  });

  it('never exposes password hashes or 2FA secrets', async () => {
    const c = await signIn(ctx, secret);
    const me = await c.get('/api/auth/me');
    assert.equal(me.json.state, 'ok');
    assert.ok(!/password|totp|secret|hash/i.test(me.text));
    const setup = await c.post('/api/auth/2fa/setup');
    assert.equal(setup.status, 409, 'cannot restart 2FA set-up once enabled');
  });

  it('never accepts the same two-factor code twice', async () => {
    await ctx.db.query('UPDATE users SET totp_last_step = 0');
    const code = codeFor(secret);
    const c1 = new Client(ctx.base);
    await c1.post('/api/auth/login', { email: ADMIN.email, password: ADMIN.password });
    assert.equal((await c1.post('/api/auth/2fa/verify', { code })).status, 200);
    const c2 = new Client(ctx.base);
    await c2.post('/api/auth/login', { email: ADMIN.email, password: ADMIN.password });
    assert.equal((await c2.post('/api/auth/2fa/verify', { code })).status, 401);
  });

  it('accepts each recovery code only once', async () => {
    await ctx.db.query('UPDATE users SET failed_logins = 0, locked_until = NULL');
    const code = recoveryCodes[0];
    const c1 = new Client(ctx.base);
    await c1.post('/api/auth/login', { email: ADMIN.email, password: ADMIN.password });
    assert.equal((await c1.post('/api/auth/2fa/verify', { code })).status, 200);
    const c2 = new Client(ctx.base);
    await c2.post('/api/auth/login', { email: ADMIN.email, password: ADMIN.password });
    assert.equal((await c2.post('/api/auth/2fa/verify', { code })).status, 401);
  });

  it('refuses state-changing requests without the anti-CSRF header or from another origin', async () => {
    const c = new Client(ctx.base);
    const credentials = { email: ADMIN.email, password: ADMIN.password };
    assert.equal((await c.req('POST', '/api/auth/login', credentials, { 'x-requested-with': 'other' })).status, 403);
    assert.equal((await c.req('POST', '/api/auth/login', credentials, { origin: 'https://evil.example' })).status, 403);
  });

  it('signs out other sessions when the password changes', async () => {
    await ctx.db.query('UPDATE users SET failed_logins = 0, locked_until = NULL');
    const a = await signIn(ctx, secret);
    const b = await signIn(ctx, secret);
    assert.equal((await b.get('/api/clients')).status, 200);
    const res = await a.post('/api/auth/password', { current_password: ADMIN.password, new_password: 'a-brand-new-long-password' });
    assert.equal(res.status, 200);
    assert.equal((await a.get('/api/clients')).status, 200);
    assert.equal((await b.get('/api/clients')).status, 401);
    const weak = await a.post('/api/auth/password', { current_password: 'a-brand-new-long-password', new_password: 'short' });
    assert.equal(weak.status, 400);
  });
});

describe('account lockout', () => {
  let ctx;
  before(async () => { ctx = await startTestServer(); await signedInAdmin(ctx); });
  after(async () => { await ctx.close(); });

  it('locks the account after 5 wrong passwords, even for the correct password', async () => {
    const c = new Client(ctx.base);
    for (let i = 0; i < 5; i += 1) {
      assert.equal((await c.post('/api/auth/login', { email: ADMIN.email, password: 'wrong-password-123' })).status, 401);
    }
    assert.equal((await c.post('/api/auth/login', { email: ADMIN.email, password: ADMIN.password })).status, 429);
  });
});

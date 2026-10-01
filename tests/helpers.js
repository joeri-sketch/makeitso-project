process.env.NODE_ENV = 'test';
delete process.env.DATABASE_URL;

const { config } = await import('../src/config.js');
const { createDb } = await import('../src/db/index.js');
const { migrate } = await import('../src/db/migrate.js');
const { createApp } = await import('../src/app.js');
const { createAdmin } = await import('../src/services/bootstrap.js');
const { totpAt } = await import('../src/lib/totp.js');

export async function startTestServer({ rateLimits = false } = {}) {
  const db = await createDb(config);
  await migrate(db);
  const app = createApp({ db, config, rateLimits, log: () => {} });
  const server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    db, base,
    close: async () => { await new Promise((r) => server.close(r)); await db.close(); }
  };
}

// A tiny HTTP client that remembers cookies, like a browser.
export class Client {
  constructor(base) { this.base = base; this.jar = new Map(); }

  async req(method, path, body, headers = {}) {
    const cookie = [...this.jar].map(([k, v]) => `${k}=${v}`).join('; ');
    const res = await fetch(this.base + path, {
      method,
      redirect: 'manual',
      headers: { 'content-type': 'application/json', 'x-requested-with': 'makeitso', ...(cookie ? { cookie } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    for (const line of res.headers.getSetCookie?.() ?? []) {
      const [pair, ...attrs] = line.split(';');
      const i = pair.indexOf('=');
      const name = pair.slice(0, i).trim();
      const value = pair.slice(i + 1).trim();
      if (value === '' || attrs.some((a) => /max-age=0|expires=thu, 01 jan 1970/i.test(a))) this.jar.delete(name);
      else this.jar.set(name, value);
    }
    let json = null;
    const text = await res.text();
    try { json = JSON.parse(text); } catch { /* not JSON */ }
    return { status: res.status, json, text, headers: res.headers };
  }

  get(path) { return this.req('GET', path); }
  post(path, body = {}) { return this.req('POST', path, body); }
  put(path, body) { return this.req('PUT', path, body); }
  patch(path, body = {}) { return this.req('PATCH', path, body); }
  del(path) { return this.req('DELETE', path); }
}

export const step = (offset = 0) => Math.floor(Date.now() / 30000) + offset;
export const codeFor = (secret, offset = 0) => totpAt(secret, step(offset));

export const ADMIN = { name: 'Test Admin', email: 'admin@example.com', password: 'correct-horse-battery-staple' };

// Creates an admin, signs in and completes the mandatory 2FA set-up. Returns the secret and recovery codes.
export async function signedInAdmin(ctx, { createUser = true } = {}) {
  if (createUser) await createAdmin(ctx.db, ADMIN);
  const client = new Client(ctx.base);
  let res = await client.post('/api/auth/login', { email: ADMIN.email, password: ADMIN.password });
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${res.text}`);
  res = await client.post('/api/auth/2fa/setup');
  const { secret } = res.json;
  res = await client.post('/api/auth/2fa/enable', { code: codeFor(secret) });
  if (res.status !== 200) throw new Error(`2fa enable failed: ${res.status} ${res.text}`);
  return { client, secret, recoveryCodes: res.json.recovery_codes };
}

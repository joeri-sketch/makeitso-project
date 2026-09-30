import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Client, startTestServer } from './helpers.js';
import { INLINE_SCRIPT } from '../src/middleware/security.js';

describe('website, headers and abuse protection', () => {
  let ctx;
  before(async () => { ctx = await startTestServer(); });
  after(async () => { await ctx.close(); });

  it('reports healthy', async () => {
    const res = await new Client(ctx.base).get('/healthz');
    assert.equal(res.status, 200);
    assert.equal(res.json.ok, true);
  });

  it('serves the existing static website unchanged', async () => {
    const c = new Client(ctx.base);
    for (const file of ['index.html', 'styles.css', 'script.js', 'i18n.js']) {
      const res = await c.get(file === 'index.html' ? '/' : `/${file}`);
      assert.equal(res.status, 200, file);
      assert.equal(res.text, readFileSync(new URL(`../public/${file}`, import.meta.url), 'utf8'), `${file} is served byte-for-byte`);
    }
  });

  it('sends strict security headers that still allow the site to work', async () => {
    const res = await new Client(ctx.base).get('/');
    const csp = res.headers.get('content-security-policy');
    assert.match(csp, /default-src 'self'/);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.match(csp, /fonts\.googleapis\.com/);
    assert.ok(!/unsafe-inline/.test(csp.match(/script-src[^;]*/)[0]), 'no unsafe-inline for scripts');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-powered-by'), null);
    assert.ok(res.headers.get('permissions-policy'));
  });

  it('allows exactly the one inline script the website has (by hash)', async () => {
    const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
    const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    assert.deepEqual(inline, [INLINE_SCRIPT], 'index.html must only contain the allow-listed inline script');
  });

  it('does not serve source files, dotfiles or the database folder', async () => {
    const c = new Client(ctx.base);
    for (const path of ['/src/config.js', '/package.json', '/.env', '/.git/config', '/data/pglite', '/tests/helpers.js', '/../package.json']) {
      const res = await c.get(path);
      assert.ok([400, 403, 404].includes(res.status), `${path} -> ${res.status}`);
    }
  });

  it('rate limits the public contact endpoint', async () => {
    const limited = await startTestServer({ rateLimits: true });
    try {
      const c = new Client(limited.base);
      const body = (i) => ({ name: 'Bot', email: `bot${i}@example.com`, message: `spam message number ${i}`, t: 5000 });
      const statuses = [];
      for (let i = 0; i < 7; i += 1) statuses.push((await c.post('/api/public/leads', body(i))).status);
      assert.deepEqual(statuses.slice(0, 5), [201, 201, 201, 201, 201]);
      assert.equal(statuses[5], 429);
    } finally {
      await limited.close();
    }
  });

  it('rate limits sign-in attempts per address', async () => {
    const limited = await startTestServer({ rateLimits: true });
    try {
      const c = new Client(limited.base);
      let last;
      for (let i = 0; i < 12; i += 1) last = (await c.post('/api/auth/login', { email: 'x@example.com', password: 'whatever-password' })).status;
      assert.equal(last, 429);
    } finally {
      await limited.close();
    }
  });

  it('returns JSON errors without leaking internals', async () => {
    const c = new Client(ctx.base);
    const bad = await c.req('POST', '/api/public/leads', undefined, { 'content-type': 'application/json' });
    assert.ok([400, 403].includes(bad.status));
    const res = await fetch(`${ctx.base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-requested-with': 'makeitso' }, body: '{not json' });
    assert.equal(res.status, 400);
    assert.ok(!/at .*\.js/.test(await res.text()), 'no stack traces');
  });
});

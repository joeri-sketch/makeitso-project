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

  it('serves linked, separate pages for all six departments', async () => {
    const c = new Client(ctx.base);
    const home = await c.get('/');
    const slugs = ['brand-strategy', 'social-content', 'paid-media', 'web-landing-pages', 'video-motion', 'growth-analytics'];
    for (const slug of slugs) {
      assert.match(home.text, new RegExp(`href="/services/${slug}/"`), `${slug} has a department-card link`);
      const page = await c.get(`/services/${slug}/`);
      assert.equal(page.status, 200, slug);
      assert.match(page.text, new RegExp(`data-service="${slug}"`), slug);
      assert.match(page.text, /class="cosmos"/, `${slug} has the homepage starfield`);
      assert.match(page.text, /class="nebula n1"/, `${slug} has ambient nebula layers`);
      assert.match(page.text, /aria-label="Main navigation"/, `${slug} has main-site navigation`);
      assert.match(page.text, /class="menu-btn"/, `${slug} has a responsive menu button`);
      assert.match(page.text, /class="footer service-footer"/, `${slug} has the site footer`);
      assert.match(page.text, /href="\/portal\/">Client login/, `${slug} footer has client login`);
      assert.match(page.text, /href="\/admin">Admin login/, `${slug} footer has admin login`);
      assert.match(page.text, /class="lang lang-footer"/, `${slug} footer has language controls`);
    }
    for (const file of ['service-data.js', 'service-page.js', 'service-navigation.js']) {
      assert.equal((await c.get(`/services/${file}`)).status, 200, file);
    }
  });

  it('serves linked, separate concept pages for all three sample missions', async () => {
    const c = new Client(ctx.base);
    const home = await c.get('/');
    const missions = ['nova-coffee', 'orbit-fitness', 'luna-records'];
    for (const slug of missions) {
      assert.match(home.text, new RegExp(`href="/missions/${slug}/"`), `${slug} has a mission-card link`);
      const page = await c.get(`/missions/${slug}/`);
      assert.equal(page.status, 200, slug);
      assert.match(page.text, new RegExp(`data-mission="${slug}"`), slug);
      assert.match(page.text, /class="cosmos"/, `${slug} has the homepage starfield`);
      assert.match(page.text, /aria-label="Main navigation"/, `${slug} has main-site navigation`);
      assert.match(page.text, /class="footer service-footer"/, `${slug} has the site footer`);
      assert.match(page.text, /name="description"/, `${slug} has a page description`);
    }
    for (const file of ['mission-data.js', 'mission-page.js']) {
      assert.equal((await c.get(`/missions/${file}`)).status, 200, file);
    }
  });

  it('serves the client portal without exposing it to search engines', async () => {
    const c = new Client(ctx.base);
    const page = await c.get('/portal/');
    assert.equal(page.status, 200);
    assert.match(page.text, /name="robots" content="noindex, nofollow"/);
    for (const file of ['portal.js', 'portal.css']) {
      const asset = await c.get(`/portal/${file}`);
      assert.equal(asset.status, 200, file);
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

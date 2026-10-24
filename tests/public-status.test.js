import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client, startTestServer } from './helpers.js';
import { config } from '../src/config.js';

describe('public live system status', () => {
  let ctx;
  let redirectPortal = false;
  const calls = [];
  const statusFetch = async (input, options) => {
    const url = new URL(input);
    calls.push({ url, options });
    if (redirectPortal && url.pathname === '/portal/') {
      return new Response(null, { status: 302, headers: { location: 'https://elsewhere.invalid/' } });
    }
    if (url.pathname === '/api/auth/me') {
      return new Response(JSON.stringify({ state: 'anonymous', user: null }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }
    if (url.pathname === '/health') {
      return new Response('Healthy', { status: 200, headers: { 'content-type': 'text/plain' } });
    }
    if (url.pathname === '/') {
      return new Response(`<!doctype html><html><body>${'a'.repeat(35_000)}</body></html>`, {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' }
      });
    }
    return new Response('<!doctype html><html><body>ok</body></html>', {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' }
    });
  };

  before(async () => {
    ctx = await startTestServer({
      statusFetch,
      configOverrides: {
        publicStatusSite: 'https://site.internal.test/',
        mediaTargets: { ...config.mediaTargets, jellyfin: 'https://jellyfin.internal.test:8443/' }
      }
    });
  });
  after(async () => { await ctx.close(); });

  it('returns five live systems without exposing probe targets and caches checks', async () => {
    const client = new Client(ctx.base);
    const response = await client.get('/api/public/status');
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(response.json.services.map(({ id, status }) => [id, status]), [
      ['website', 'operational'],
      ['apps', 'operational'],
      ['portal', 'operational'],
      ['email', 'maintenance'],
      ['billing', 'operational']
    ]);
    assert.ok(response.json.checked_at);
    assert.ok(response.json.services.every((service) => service.checked_at === response.json.checked_at));
    assert.equal(response.json.services[4].status, response.json.services[2].status);
    assert.doesNotMatch(JSON.stringify(response.json), /jellyfin|internal\.test/i);
    assert.deepEqual(
      new Set(calls.map(({ url }) => `${url.hostname}${url.pathname}`)),
      new Set([
        'site.internal.test/',
        'site.internal.test/about/',
        'jellyfin.internal.test/health',
        'site.internal.test/portal/',
        'site.internal.test/api/auth/me'
      ])
    );

    const count = calls.length;
    const cached = await client.get('/api/public/status');
    assert.deepEqual(cached.json, response.json);
    assert.equal(calls.length, count);
    assert.ok(calls.every(({ options }) => options.redirect === 'manual'));
    assert.ok(calls.every(({ options }) => options.credentials === 'omit'));
  });

  it('does not follow redirects and marks the client portal and linked billing systems unavailable', async () => {
    const redirectCtx = await startTestServer({
      statusFetch,
      configOverrides: {
        publicStatusSite: 'https://site.internal.test/',
        mediaTargets: { ...config.mediaTargets, jellyfin: 'https://jellyfin.internal.test:8443/' }
      }
    });
    redirectPortal = true;
    try {
      const response = await new Client(redirectCtx.base).get('/api/public/status');
      const services = Object.fromEntries(response.json.services.map(({ id, status }) => [id, status]));
      assert.equal(services.portal, 'outage');
      assert.equal(services.billing, 'outage');
      const portalRequest = calls.findLast(({ url }) => url.pathname === '/portal/');
      assert.equal(portalRequest.options.redirect, 'manual');
      assert.ok(calls.every(({ url }) => url.hostname !== 'elsewhere.invalid'));
    } finally {
      redirectPortal = false;
      await redirectCtx.close();
    }
  });
});

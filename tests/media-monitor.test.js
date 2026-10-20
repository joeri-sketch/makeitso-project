import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { Client, signedInAdmin, startTestServer } from './helpers.js';
const { config } = await import('../src/config.js');
import { createDb } from '../src/db/index.js';
import { migrate } from '../src/db/migrate.js';
import { createMediaMonitor, mediaStatusView, mediaTargetFingerprint, runMediaMonitorCycle } from '../src/services/media-monitor.js';

const TARGETS = {
  jellyfin: 'http://jellyfin.test:8096/',
  jellyseerr: 'http://jellyseerr.test:5055/',
  ubuntu: null
};

const response = (body, status = 200) => new Response(body, { status });

describe('automatic private media monitor', () => {
  let db;
  before(async () => {
    db = await createDb(config);
    await migrate(db);
  });
  after(async () => { await db.close(); });

  it('checks only fixed endpoints and accepts only the expected health responses', async () => {
    const requests = [];
    await runMediaMonitorCycle(db, {
      config: { mediaTargets: TARGETS },
      fetchImpl: async (url, options) => {
        requests.push({ url, options });
        return url.endsWith('/health') ? response('Healthy') : response('{"version":"2.7.3"}');
      }
    });
    assert.deepEqual(requests.map(({ url }) => url), [
      'http://jellyfin.test:8096/health',
      'http://jellyseerr.test:5055/api/v1/status'
    ]);
    for (const { options } of requests) {
      assert.equal(options.method, 'GET');
      assert.equal(options.redirect, 'manual');
      assert.equal(options.credentials, 'omit');
      assert.equal('authorization' in options.headers, false);
      assert.equal('x-api-key' in options.headers, false);
    }
    const rows = (await db.query('SELECT service, status FROM media_service_health ORDER BY service')).rows;
    assert.deepEqual(rows.map(({ status }) => status), ['operational', 'operational']);
    assert.equal(JSON.stringify(await db.query('SELECT * FROM media_service_health')).includes(TARGETS.jellyfin), false);
  });

  it('rejects redirects, unsuccessful HTTP, malformed health data and oversized bodies', async () => {
    const cases = [
      { service: 'jellyfin', fetchImpl: async () => response('Healthy', 302) },
      { service: 'jellyfin', fetchImpl: async () => response('healthy') },
      { service: 'jellyfin', fetchImpl: async () => response('x'.repeat(16 * 1024 + 1)) },
      { service: 'jellyseerr', fetchImpl: async () => response('{"version":""}') },
      { service: 'jellyseerr', fetchImpl: async () => response('not json') },
      { service: 'jellyseerr', fetchImpl: async () => response('{"version":"2.7.3"}', 503) }
    ];
    const failureCounts = new Map();
    for (const { service, fetchImpl } of cases) {
      const targetConfig = { mediaTargets: { ...TARGETS, jellyseerr: null, jellyfin: null, [service]: TARGETS[service] } };
      await runMediaMonitorCycle(db, { config: targetConfig, fetchImpl });
      const row = (await db.query('SELECT status, failure_count FROM media_service_health WHERE service = $1', [service])).rows[0];
      const expectedFailureCount = (failureCounts.get(service) ?? 0) + 1;
      failureCounts.set(service, expectedFailureCount);
      assert.equal(row.status, expectedFailureCount === 1 ? 'degraded' : 'offline');
      assert.equal(row.failure_count, expectedFailureCount);
    }
  });

  it('times out, degrades after a first failure, goes offline after a second, then recovers', async () => {
    let now = 1_800_000_000_000;
    const options = {
      config: { mediaTargets: { jellyfin: TARGETS.jellyfin, jellyseerr: null } },
      clock: () => now,
      timeoutMs: 10
    };
    await runMediaMonitorCycle(db, {
      ...options,
      fetchImpl: async () => new Promise(() => {})
    });
    let row = (await db.query('SELECT status, failure_count, last_success_at FROM media_service_health WHERE service = $1', ['jellyfin'])).rows[0];
    assert.equal(row.status, 'offline');
    assert.equal(row.failure_count, 4); // Three prior invalid responses plus this timeout.
    assert.equal(row.last_success_at !== null, true);

    const changedTarget = { mediaTargets: { jellyfin: 'http://new-jellyfin.test:8096/', jellyseerr: null } };
    await runMediaMonitorCycle(db, {
      config: changedTarget,
      clock: () => now,
      fetchImpl: async () => response('down', 503)
    });
    row = (await db.query('SELECT status, failure_count, last_success_at, target_fingerprint FROM media_service_health WHERE service = $1', ['jellyfin'])).rows[0];
    assert.equal(row.status, 'degraded');
    assert.equal(row.failure_count, 1);
    assert.equal(row.last_success_at, null);
    assert.equal(row.target_fingerprint, mediaTargetFingerprint(changedTarget.mediaTargets.jellyfin));

    await runMediaMonitorCycle(db, {
      config: changedTarget,
      clock: () => now,
      fetchImpl: async () => response('Healthy')
    });
    row = (await db.query('SELECT status, failure_count, last_success_at FROM media_service_health WHERE service = $1', ['jellyfin'])).rows[0];
    assert.equal(row.status, 'operational');
    assert.equal(row.failure_count, 0);
    assert.ok(row.last_success_at);

    now += 1_501;
    await runMediaMonitorCycle(db, {
      ...options,
      fetchImpl: async () => {
        now += 1_500;
        return response('Healthy');
      }
    });
    row = (await db.query('SELECT status, response_ms FROM media_service_health WHERE service = $1', ['jellyfin'])).rows[0];
    assert.equal(row.status, 'degraded');
    assert.equal(row.response_ms, 1_500);
  });

  it('presents persisted results as stale after 150 seconds, and target changes as unknown', async () => {
    const checkedAt = new Date(1_800_000_000_000).toISOString();
    const row = {
      target_fingerprint: mediaTargetFingerprint(TARGETS.jellyfin),
      status: 'operational',
      checked_at: checkedAt,
      response_ms: 31,
      failure_count: 0
    };
    const current = mediaStatusView('jellyfin', TARGETS.jellyfin, row, Date.parse(checkedAt) + 150_001);
    assert.equal(current.status, 'unknown');
    assert.equal(current.stale, true);
    assert.equal(mediaStatusView('jellyfin', TARGETS.jellyfin, row, Date.parse(checkedAt) + 150_000).status, 'operational');
    const changed = mediaStatusView('jellyfin', 'http://other.test/', row, Date.parse(checkedAt));
    assert.equal(changed.status, 'unknown');
    assert.equal(changed.checked_at, null);
    assert.equal(changed.stale, true);
  });

  it('invalidates persisted failures and last success before checking a changed target', async () => {
    const changedTarget = 'http://reconfigured-jellyfin.test:8096/';
    let requestStarted;
    const started = new Promise((resolve) => { requestStarted = resolve; });
    let finishRequest;
    const cycle = runMediaMonitorCycle(db, {
      config: { mediaTargets: { jellyfin: changedTarget, jellyseerr: null } },
      fetchImpl: () => new Promise((resolve) => {
        finishRequest = resolve;
        requestStarted();
      })
    });
    await started;
    const invalidated = (await db.query(
      'SELECT target_fingerprint, status, checked_at, last_success_at, response_ms, failure_count FROM media_service_health WHERE service = $1',
      ['jellyfin']
    )).rows[0];
    assert.equal(invalidated.target_fingerprint, mediaTargetFingerprint(changedTarget));
    assert.equal(invalidated.status, 'unknown');
    assert.equal(invalidated.checked_at, null);
    assert.equal(invalidated.last_success_at, null);
    assert.equal(invalidated.response_ms, null);
    assert.equal(invalidated.failure_count, 0);
    finishRequest(response('Healthy'));
    await cycle;
  });

  it('starts immediately and waits for its in-flight check when stopped', async () => {
    let requests = 0;
    let requestAborted;
    const aborted = new Promise((resolve) => { requestAborted = resolve; });
    const monitor = createMediaMonitor({
      db,
      config: { mediaTargets: { jellyfin: TARGETS.jellyfin, jellyseerr: null } },
      timeoutMs: 10_000,
      fetchImpl: (_url, { signal }) => new Promise((resolve, reject) => {
        requests += 1;
        signal.addEventListener('abort', () => {
          requestAborted();
          reject(new Error('aborted'));
        }, { once: true });
      })
    });
    monitor.start();
    for (let attempt = 0; attempt < 20 && requests === 0; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
    assert.equal(requests, 1);
    const stopping = monitor.stop();
    await aborted;
    await stopping;
    assert.equal(requests, 1);
  });
});

describe('automatic media status API overlay', () => {
  let ctx, admin, portal, client;
  const targets = { jellyfin: 'http://private-jellyfin.test:8096/', jellyseerr: 'http://private-jellyseerr.test:5055/', ubuntu: null };

  before(async () => {
    ctx = await startTestServer({ configOverrides: { mediaTargets: targets } });
    ({ client: admin } = await signedInAdmin(ctx));
    client = (await admin.post('/api/clients', {
      company_name: 'Monitor Client',
      status: 'active',
      contact: { name: 'Portal User', email: 'monitor-client@example.test', is_primary: true }
    })).json.client;
    const invitation = await admin.post(`/api/clients/${client.id}/invitations`, { email: 'monitor-client@example.test' });
    const token = new URL(invitation.json.invitation_url).searchParams.get('invite');
    portal = new Client(ctx.base);
    assert.equal((await portal.post('/api/portal/invitations/accept', { token, password: 'monitor-client-password' })).status, 201);
    assert.equal((await admin.put(`/api/clients/${client.id}/media`, { enabled: true })).status, 200);
  });
  after(async () => { await ctx.close(); });

  it('overlays global monitoring without exposing trusted targets and keeps Ubuntu manual', async () => {
    const requestedUrls = [];
    await runMediaMonitorCycle(ctx.db, {
      config: { mediaTargets: targets },
      fetchImpl: async (url) => {
        requestedUrls.push(url);
        return url.endsWith('/health') ? response('Healthy') : response('{"version":"2.7.3"}');
      }
    });
    await admin.put(`/api/clients/${client.id}/media/jellyfin`, {
      url: 'https://client-editable.example.test/',
      share_access: true,
      message: 'Manual value must not override monitoring.'
    });
    await ctx.db.query(
      'UPDATE client_media_services SET status = $3 WHERE client_id = $1 AND service = $2',
      [client.id, 'jellyfin', 'degraded']
    );
    assert.deepEqual(requestedUrls, [
      'http://private-jellyfin.test:8096/health',
      'http://private-jellyseerr.test:5055/api/v1/status'
    ]);
    await admin.put(`/api/clients/${client.id}/media/ubuntu`, {
      url: 'https://ubuntu.example.test/',
      status: 'maintenance',
      message: 'Ubuntu remains manually monitored.'
    });
    const adminResult = await admin.get(`/api/clients/${client.id}/media`);
    const jellyfin = adminResult.json.services.find(({ service }) => service === 'jellyfin');
    const ubuntu = adminResult.json.services.find(({ service }) => service === 'ubuntu');
    assert.equal(jellyfin.status, 'operational');
    assert.equal(jellyfin.status_source, 'automatic');
    assert.equal(jellyfin.manual_status, 'degraded');
    assert.equal(jellyfin.configured_url, targets.jellyfin);
    assert.ok(jellyfin.checked_at);
    assert.equal(jellyfin.stale, false);
    assert.equal(ubuntu.status, 'maintenance');
    assert.equal(ubuntu.status_source, 'manual');
    assert.equal(ubuntu.configured_url, null);

    const portalResult = await portal.get('/api/portal/media');
    const portalJellyfin = portalResult.json.services.find(({ service }) => service === 'jellyfin');
    assert.equal(portalJellyfin.status, 'operational');
    assert.equal(portalJellyfin.status_source, 'automatic');
    assert.equal(portalJellyfin.url, 'https://client-editable.example.test/');
    assert.equal(JSON.stringify(portalResult.json).includes('private-jellyfin.test'), false);
    assert.equal(JSON.stringify(portalResult.json).includes('private-jellyseerr.test'), false);
    assert.equal(JSON.stringify(portalResult.json).includes('configured_url'), false);
  });

  it('rejects manual status edits on monitored services but allows notices and Ubuntu status', async () => {
    const path = `/api/clients/${client.id}/media`;
    assert.equal((await admin.put(`${path}/jellyfin`, { status: 'offline' })).status, 400);
    assert.equal((await admin.put(`${path}/jellyseerr`, { status: 'operational' })).status, 400);
    assert.equal((await admin.put(`${path}/jellyfin`, { message: 'Maintenance notice.' })).status, 200);
    assert.equal((await admin.put(`${path}/ubuntu`, { status: 'degraded' })).status, 200);
  });

  it('checks Ubuntu TCP reachability, detects refusal, recovers and keeps the target private', async () => {
    const server = createServer((socket) => socket.end());
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const port = server.address().port;
    targets.ubuntu = `tcp://127.0.0.1:${port}`;
    const cycle = () => runMediaMonitorCycle(ctx.db, {
      config: { mediaTargets: targets },
      fetchImpl: async (url) => url.endsWith('/health') ? response('Healthy') : response('{"version":"2.7.3"}')
    });
    try {
      await cycle();
      let data = (await portal.get('/api/portal/media')).json;
      let ubuntu = data.services.find((s) => s.service === 'ubuntu');
      assert.equal(ubuntu.status_source, 'automatic');
      assert.equal(ubuntu.status, 'operational');
      assert.ok(ubuntu.checked_at);
      assert.equal(ubuntu.stale, false);
      assert.equal(JSON.stringify(data).includes(targets.ubuntu), false);
      assert.equal(ubuntu.url, null);
      const adminUbuntu = (await admin.get(`/api/clients/${client.id}/media`)).json.services.find((s) => s.service === 'ubuntu');
      assert.equal(adminUbuntu.configured_url, null, 'TCP target must not become a browser link');
      assert.equal((await admin.put(`/api/clients/${client.id}/media/ubuntu`, { status: 'offline' })).status, 400);
      assert.equal((await admin.put(`/api/clients/${client.id}/media/ubuntu`, { message: 'Connection check only.' })).status, 200);
      await new Promise((resolve) => server.close(resolve));
      await cycle();
      ubuntu = (await portal.get('/api/portal/media')).json.services.find((s) => s.service === 'ubuntu');
      assert.equal(ubuntu.status, 'degraded');
      assert.equal(ubuntu.failure_count, 1);
      await cycle();
      ubuntu = (await portal.get('/api/portal/media')).json.services.find((s) => s.service === 'ubuntu');
      assert.equal(ubuntu.status, 'offline');
      assert.equal(ubuntu.failure_count, 2);
      server.listen(port, '127.0.0.1');
      await once(server, 'listening');
      await cycle();
      ubuntu = (await portal.get('/api/portal/media')).json.services.find((s) => s.service === 'ubuntu');
      assert.equal(ubuntu.status, 'operational');
      assert.equal(ubuntu.failure_count, 0);
      await ctx.db.query("UPDATE media_service_health SET checked_at = now() - interval '151 seconds' WHERE service = 'ubuntu'");
      ubuntu = (await portal.get('/api/portal/media')).json.services.find((s) => s.service === 'ubuntu');
      assert.equal(ubuntu.status, 'unknown');
      assert.equal(ubuntu.stale, true);
    } finally {
      targets.ubuntu = null;
      if (server.listening) await new Promise((resolve) => server.close(resolve));
    }
  });

  it('migrates only the old default per-client URLs to the supplied HTTPS addresses', async () => {
    const custom = await admin.post('/api/clients', { company_name: 'Custom link media client' });
    const customId = custom.json.client.id;
    await ctx.db.query(
      `INSERT INTO client_media_services (client_id, service, url) VALUES
       ($1, 'jellyfin', 'http://jellyfin.makeitso.studio:8096/'),
       ($1, 'jellyseerr', 'http://jellyfin.makeitso.studio:5055/'),
       ($1, 'ubuntu', 'https://custom-ubuntu.example.test/')`,
      [customId]
    );
    await ctx.db.exec(readFileSync(new URL('../src/db/migrations/010_update_media_service_links.sql', import.meta.url), 'utf8'));
    const { rows } = await ctx.db.query('SELECT service, url FROM client_media_services WHERE client_id = $1 ORDER BY service', [customId]);
    assert.deepEqual(rows, [
      { service: 'jellyfin', url: 'https://jellyfin.makeitso.studio/' },
      { service: 'jellyseerr', url: 'https://seer.makeitso.studio/' },
      { service: 'ubuntu', url: 'https://custom-ubuntu.example.test/' }
    ]);
  });
});

it('validates Ubuntu TCP environment configuration and supports disabling it', () => {
  const load = (value) => spawnSync(process.execPath, ['--input-type=module', '-e',
    "import { config } from './src/config.js'; console.log(JSON.stringify(config.mediaTargets.ubuntu));"
  ], { cwd: new URL('..', import.meta.url), encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test', MEDIA_UBUNTU_TCP: value } });
  assert.equal(load('213.119.105.234:3389').stdout.trim(), '"tcp://213.119.105.234:3389"');
  assert.equal(load('').stdout.trim(), 'null');
  for (const value of ['213.119.105.234', 'host:0', 'host:65536', 'user:secret@host:3389', 'http://host:3389', 'host:3389/path']) {
    assert.notEqual(load(value).status, 0, value);
  }
});

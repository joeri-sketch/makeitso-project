import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client, signedInAdmin, startTestServer } from './helpers.js';

let decrypt;

async function createPortalAccount(admin, ctx, company, email, password) {
  const client = (await admin.post('/api/clients', {
    company_name: company,
    status: 'active',
    contact: { name: `${company} Contact`, email, is_primary: true }
  })).json.client;
  const invitation = await admin.post(`/api/clients/${client.id}/invitations`, { email });
  assert.equal(invitation.status, 201);
  const token = new URL(invitation.json.invitation_url).searchParams.get('invite');
  const portal = new Client(ctx.base);
  const accepted = await portal.post('/api/portal/invitations/accept', { token, password });
  assert.equal(accepted.status, 201, accepted.text);
  return { client, portal };
}

describe('private client media', () => {
  let ctx, admin, clientOne, portalOne, clientTwo, portalTwo;
  before(async () => {
    ctx = await startTestServer();
    ({ decrypt } = await import('../src/lib/crypto.js'));
    ({ client: admin } = await signedInAdmin(ctx));
    ({ client: clientOne, portal: portalOne } = await createPortalAccount(
      admin, ctx, 'Media One', 'media-one@example.com', 'client-one-password'
    ));
    ({ client: clientTwo, portal: portalTwo } = await createPortalAccount(
      admin, ctx, 'Media Two', 'media-two@example.com', 'client-two-password'
    ));
  });
  after(async () => { await ctx.close(); });

  it('keeps media disabled by default and scopes portal access to the session client', async () => {
    const anonymous = new Client(ctx.base);
    assert.equal((await anonymous.get(`/api/clients/${clientOne.id}/media`)).status, 401);
    assert.equal((await portalOne.get(`/api/clients/${clientOne.id}/media`)).status, 403);

    const initial = await admin.get(`/api/clients/${clientOne.id}/media`);
    assert.equal(initial.status, 200);
    assert.equal(initial.json.enabled, false);
    assert.deepEqual(initial.json.services.map(({ service }) => service), ['jellyfin', 'jellyseerr', 'ubuntu']);
    assert.equal(initial.json.services.every(({ status, has_password }) => status === 'unknown' && !has_password), true);
    assert.equal((await portalOne.get('/api/portal/media')).status, 403);

    assert.equal((await admin.put(`/api/clients/${clientOne.id}/media`, { enabled: 'true' })).status, 400);
    assert.equal((await admin.put(`/api/clients/${clientOne.id}/media`, { enabled: true })).status, 200);
    const one = await portalOne.get('/api/portal/media');
    const two = await portalTwo.get('/api/portal/media');
    assert.equal(one.status, 200);
    assert.equal(two.status, 403);
    assert.deepEqual(one.json.services.map(({ service }) => service), ['jellyfin', 'jellyseerr', 'ubuntu']);
    assert.equal(one.json.services.find(({ service }) => service === 'jellyfin').share_access, false);
    assert.equal((await admin.put(`/api/clients/${clientTwo.id}/media`, { enabled: true })).status, 200);
    assert.deepEqual((await portalTwo.get('/api/portal/media')).json.services.map(({ service }) => service), ['jellyfin', 'jellyseerr', 'ubuntu']);
  });

  it('encrypts passwords at rest and never returns them except after portal reauthentication', async () => {
    const servicePath = `/api/clients/${clientOne.id}/media/jellyfin`;
    const save = await admin.put(servicePath, {
      url: 'https://media.example.test:8443/library',
      username: 'media-user',
      login_note: 'Use the household account.',
      share_access: true,
      status: 'operational',
      message: 'Checked manually.',
      password: 'private-media-password'
    });
    assert.equal(save.status, 200);
    assert.equal(save.json.service.has_password, true);
    assert.ok(save.json.service.status_updated_at);
    assert.equal(JSON.stringify(save.json).includes('private-media-password'), false);
    assert.equal(JSON.stringify(save.json).includes('password_enc'), false);

    const stored = (await ctx.db.query(
      'SELECT password_enc FROM client_media_services WHERE client_id = $1 AND service = $2',
      [clientOne.id, 'jellyfin']
    )).rows[0].password_enc;
    assert.notEqual(stored, 'private-media-password');
    assert.equal(decrypt(stored), 'private-media-password');

    const adminRead = await admin.get(`/api/clients/${clientOne.id}/media`);
    assert.equal(JSON.stringify(adminRead.json).includes('private-media-password'), false);
    assert.equal(JSON.stringify(adminRead.json).includes(stored), false);
    const portalRead = await portalOne.get('/api/portal/media');
    const shared = portalRead.json.services.find(({ service }) => service === 'jellyfin');
    assert.equal(shared.url, 'https://media.example.test:8443/library');
    assert.equal(shared.username, 'media-user');
    assert.equal(shared.login_note, 'Use the household account.');
    assert.equal(shared.share_access, true);
    assert.equal(shared.has_password, true);
    assert.equal(JSON.stringify(portalRead.json).includes('private-media-password'), false);
    assert.equal(JSON.stringify(portalRead.json).includes(stored), false);

    assert.equal((await portalOne.post('/api/portal/media/jellyfin/password', { password: 'wrong-password' })).status, 401);
    const reveal = await portalOne.post('/api/portal/media/jellyfin/password', { password: 'client-one-password' });
    assert.equal(reveal.status, 200);
    assert.deepEqual(reveal.json, { password: 'private-media-password' });
    const audit = await ctx.db.query(
      `SELECT action, meta FROM activity_log WHERE client_id = $1 AND action = 'media.password_revealed'`,
      [clientOne.id]
    );
    assert.equal(audit.rows.length, 1);
    assert.equal(JSON.stringify(audit.rows).includes('private-media-password'), false);
    assert.match(JSON.stringify(audit.rows), /jellyfin/);

    const crossClientReveal = await portalTwo.post('/api/portal/media/jellyfin/password', { password: 'client-two-password' });
    assert.equal(crossClientReveal.status, 404);
    assert.equal((await admin.put(`/api/clients/${clientOne.id}/media`, { enabled: false })).status, 200);
    assert.equal((await portalOne.get('/api/portal/media')).status, 403);
    assert.equal((await portalOne.post('/api/portal/media/jellyfin/password', { password: 'client-one-password' })).status, 403);
    assert.equal((await admin.put(`/api/clients/${clientOne.id}/media`, { enabled: true })).status, 200);
  });

  it('hides unshared details and preserves or explicitly clears saved passwords', async () => {
    const path = `/api/clients/${clientOne.id}/media/jellyfin`;
    const timestamp = (await admin.get(`/api/clients/${clientOne.id}/media`)).json.services[0].status_updated_at;
    const sameStatus = await admin.put(path, { status: 'operational', message: 'Checked manually.' });
    assert.equal(sameStatus.json.service.status_updated_at, timestamp);

    const blankPassword = await admin.put(path, { username: 'updated-user', password: '' });
    assert.equal(blankPassword.json.service.has_password, true);
    assert.equal((await portalOne.post('/api/portal/media/jellyfin/password', { password: 'client-one-password' })).json.password, 'private-media-password');

    const hidden = await admin.put(path, { share_access: false });
    assert.equal(hidden.json.service.has_password, true);
    const portalHidden = (await portalOne.get('/api/portal/media')).json.services[0];
    assert.equal(portalHidden.url, null);
    assert.equal(portalHidden.username, null);
    assert.equal(portalHidden.login_note, null);
    assert.equal(portalHidden.share_access, false);
    assert.equal(portalHidden.has_password, false);
    assert.equal((await portalOne.post('/api/portal/media/jellyfin/password', { password: 'client-one-password' })).status, 404);

    await new Promise((resolve) => setTimeout(resolve, 10));
    const changedStatus = await admin.put(path, { status: 'degraded', message: 'Limited performance.' });
    assert.equal(changedStatus.json.service.status, 'degraded');
    assert.notEqual(changedStatus.json.service.status_updated_at, timestamp);
    assert.equal((await admin.put(path, { clear_password: true })).json.service.has_password, false);
    assert.equal((await portalOne.post('/api/portal/media/jellyfin/password', { password: 'client-one-password' })).status, 404);
  });

  it('rejects unsafe URLs and invalid service fields and blocks archived clients', async () => {
    const path = `/api/clients/${clientTwo.id}/media/ubuntu`;
    for (const url of [
      'ftp://media.example.test',
      'https://user:pass@media.example.test',
      'https://media.example.test/path?token=secret',
      'https://media.example.test/path#fragment',
      'not a url'
    ]) {
      assert.equal((await admin.put(path, { url })).status, 400, url);
    }
    assert.equal((await admin.put(path, { url: `https://${'a'.repeat(500)}.test` })).status, 400);
    assert.equal((await admin.put(`/api/clients/${clientTwo.id}/media/other`, { status: 'offline' })).status, 400);
    assert.equal((await admin.put(path, { share_access: 'true' })).status, 400);
    assert.equal((await admin.put(path, { status: 'up' })).status, 400);

    assert.equal((await admin.post(`/api/clients/${clientTwo.id}/archive`)).status, 200);
    assert.equal((await admin.get(`/api/clients/${clientTwo.id}/media`)).status, 404);
    assert.equal((await admin.put(`/api/clients/${clientTwo.id}/media`, { enabled: true })).status, 404);
    assert.equal((await admin.put(path, { status: 'offline' })).status, 404);
    assert.equal((await portalTwo.get('/api/portal/media')).status, 404);
    assert.equal((await portalTwo.post('/api/portal/media/jellyfin/password', { password: 'client-two-password' })).status, 404);
    assert.equal((await admin.patch(`/api/clients/${clientOne.id}`, { status: 'inactive' })).status, 200);
    assert.equal((await portalOne.get('/api/portal/media')).status, 404);
    assert.equal((await portalOne.post('/api/portal/media/jellyfin/password', { password: 'client-one-password' })).status, 404);
  });
});

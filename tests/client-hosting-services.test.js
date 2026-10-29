import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client, signedInAdmin, startTestServer } from './helpers.js';

describe('client hosting services', () => {
  let ctx, admin;
  before(async () => {
    ctx = await startTestServer();
    ({ client: admin } = await signedInAdmin(ctx));
  });
  after(async () => { await ctx.close(); });

  it('lets admins manage services and only returns non-ended services to their own portal client', async () => {
    const clientOne = (await admin.post('/api/clients', {
      company_name: 'Northstar Studio', language: 'en',
      contact: { name: 'Alex Morgan', email: 'alex@northstar.example', is_primary: true }
    })).json.client;
    const clientTwo = (await admin.post('/api/clients', {
      company_name: 'Luna Records', language: 'fr',
      contact: { name: 'Lou Vega', email: 'lou@luna.example', is_primary: true }
    })).json.client;

    assert.equal((await admin.post('/api/clients/not-a-number/services', {
      service_type: 'domain', name: 'invalid.example', start_date: '2025-01-01'
    })).status, 400);
    assert.equal((await admin.post(`/api/clients/${clientOne.id}/services`, {
      service_type: 'jellyfin', name: 'Unexpected service', start_date: '2025-01-01'
    })).status, 400);
    assert.equal((await admin.post(`/api/clients/${clientOne.id}/services`, {
      service_type: 'domain', name: 'northstar.example', start_date: '2026-02-01', renewal_date: '2026-01-01'
    })).status, 400);

    const created = await admin.post(`/api/clients/${clientOne.id}/services`, {
      service_type: 'domain', name: 'northstar.example', start_date: '2025-01-15',
      renewal_date: '2026-01-15', notes: 'DNS managed by Make It So.'
    });
    assert.equal(created.status, 201);
    const domainService = created.json.service;
    const ended = await admin.post(`/api/clients/${clientOne.id}/services`, {
      service_type: 'email_hosting', name: 'Old mailbox', status: 'ended',
      start_date: '2023-01-01', renewal_date: '2024-01-01'
    });
    assert.equal(ended.status, 201);
    const secondClientService = await admin.post(`/api/clients/${clientTwo.id}/services`, {
      service_type: 'web_hosting', name: 'Luna website', start_date: '2025-03-01'
    });
    assert.equal(secondClientService.status, 201);

    assert.equal((await admin.patch(`/api/clients/${clientTwo.id}/services/${domainService.id}`, { status: 'suspended' })).status, 404);
    assert.equal((await admin.patch(`/api/clients/${clientOne.id}/services/${domainService.id}`, { renewal_date: '2024-01-01' })).status, 400);
    const update = await admin.patch(`/api/clients/${clientOne.id}/services/${domainService.id}`, {
      status: 'suspended', notes: 'Waiting for client approval.'
    });
    assert.equal(update.status, 200);
    assert.equal(update.json.service.status, 'suspended');
    assert.equal(update.json.service.notes, 'Waiting for client approval.');

    const detail = await admin.get(`/api/clients/${clientOne.id}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.json.services.length, 2);

    const inviteOne = await admin.post(`/api/clients/${clientOne.id}/invitations`, { email: 'alex@northstar.example' });
    const inviteTwo = await admin.post(`/api/clients/${clientTwo.id}/invitations`, { email: 'lou@luna.example' });
    const portalOne = new Client(ctx.base);
    const portalTwo = new Client(ctx.base);
    assert.equal((await portalOne.get('/api/portal/overview')).status, 401);
    assert.equal((await portalOne.post('/api/portal/invitations/accept', {
      token: new URL(inviteOne.json.invitation_url).searchParams.get('invite'),
      password: 'valid-client-password'
    })).status, 201);
    assert.equal((await portalTwo.post('/api/portal/invitations/accept', {
      token: new URL(inviteTwo.json.invitation_url).searchParams.get('invite'),
      password: 'another-client-password'
    })).status, 201);

    const overviewOne = (await portalOne.get('/api/portal/overview')).json;
    assert.deepEqual(overviewOne.services.map((service) => service.id), [domainService.id]);
    assert.equal(overviewOne.services[0].name, 'northstar.example');
    assert.equal(overviewOne.services[0].status, 'suspended');
    assert.equal(overviewOne.services[0].notes, 'Waiting for client approval.');
    const overviewTwo = (await portalTwo.get('/api/portal/overview')).json;
    assert.deepEqual(overviewTwo.services.map((service) => service.id), [secondClientService.json.service.id]);

    assert.equal((await admin.del(`/api/clients/${clientOne.id}/services/${domainService.id}`)).status, 200);
    assert.equal((await admin.del(`/api/clients/${clientOne.id}/services/${domainService.id}`)).status, 404);
    assert.deepEqual((await portalOne.get('/api/portal/overview')).json.services, []);
  });
});

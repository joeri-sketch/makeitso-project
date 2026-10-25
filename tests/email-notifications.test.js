import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client, signedInAdmin, startTestServer } from './helpers.js';
import { decrypt } from '../src/lib/crypto.js';
import { createStatusNotificationMonitor } from '../src/services/status-notifications.js';

describe('client and public status email notifications', () => {
  it('emails portal invitations and project phase or milestone changes', async () => {
    const invitations = [];
    const updates = [];
    const ctx = await startTestServer({
      sendInvitationEmail: async (message) => invitations.push(message),
      sendProjectUpdateEmail: async (message) => updates.push(message)
    });
    try {
      const { client: admin } = await signedInAdmin(ctx, {
        admin: { name: 'Notification Admin', email: 'notifications-admin@example.test', password: 'notification-admin-password' }
      });
      const client = (await admin.post('/api/clients', {
        company_name: 'Northstar Studio',
        language: 'nl',
        contact: { name: 'Alex Morgan', email: 'alex@northstar.example', is_primary: true }
      })).json.client;
      const invitation = await admin.post(`/api/clients/${client.id}/invitations`, { email: 'alex@northstar.example' });
      assert.equal(invitation.status, 201);
      assert.equal(invitation.json.email_sent, true);
      assert.equal(invitations.length, 1);
      assert.equal(invitations[0].email, 'alex@northstar.example');
      assert.match(invitations[0].url, /invite=/);
      assert.equal(invitations[0].company, 'Northstar Studio');
      assert.equal(invitations[0].language, 'nl');

      const project = (await admin.post('/api/projects', { client_id: client.id, name: 'Website' })).json.project;
      const phase = await admin.patch(`/api/projects/${project.id}`, { status: 'development' });
      assert.equal(phase.json.email_sent, true);
      assert.equal(updates.length, 1);
      assert.equal(updates[0].email, 'alex@northstar.example');
      assert.equal(updates[0].to, 'development');
      assert.equal(updates[0].language, 'nl');

      const milestone = (await admin.post(`/api/projects/${project.id}/milestones`, { title: 'Prototype' })).json.milestone;
      const done = await admin.patch(`/api/milestones/${milestone.id}`, { status: 'done' });
      assert.equal(done.json.email_sent, true);
      assert.equal(updates.length, 2);
      assert.equal(updates[1].item, 'Prototype');
      assert.equal(updates[1].to, 'done');
    } finally {
      await ctx.close();
    }
  });

  it('requires explicit consent, confirms status subscriptions, and supports one-click unsubscribe', async () => {
    const confirmationMessages = [];
    const statusMessages = [];
    const ctx = await startTestServer({
      sendStatusSubscriptionConfirmation: async (message) => confirmationMessages.push(message),
      sendStatusUpdate: async (message) => statusMessages.push(message)
    });
    try {
      const client = new Client(ctx.base);
      const common = { email: 'alerts@example.net', language: 'en' };
      assert.equal((await client.post('/api/public/status-subscriptions', common)).status, 400);
      const requested = await client.post('/api/public/status-subscriptions', { ...common, consent: true });
      assert.equal(requested.status, 202);
      assert.equal(confirmationMessages.length, 1);
      assert.match(confirmationMessages[0].url, /confirm=/);
      assert.doesNotMatch(confirmationMessages[0].url, /alerts@example\.net/);
      const confirmationToken = new URL(confirmationMessages[0].url).searchParams.get('confirm');
      const stored = (await ctx.db.query(
        'SELECT confirmation_token_hash FROM status_email_subscriptions WHERE email = $1',
        ['alerts@example.net']
      )).rows[0];
      assert.notEqual(stored.confirmation_token_hash, confirmationToken);
      assert.equal((await client.post('/api/public/status-subscriptions/confirm', { token: confirmationToken })).status, 200);
      assert.equal((await client.post('/api/public/status-subscriptions/confirm', { token: confirmationToken })).status, 400);

      const status = (serviceStatus) => ({
        checked_at: new Date().toISOString(),
        services: ['website', 'apps', 'portal', 'email', 'billing'].map((id) => ({
          id,
          status: id === 'website' ? serviceStatus : 'operational',
          checked_at: new Date().toISOString()
        }))
      });
      let current = status('operational');
      const monitor = createStatusNotificationMonitor({
        db: ctx.db,
        config: { publicStatusSite: 'https://makeitso.studio/' },
        mailer: { sendStatusUpdate: async (message) => statusMessages.push(message) },
        getPublicStatus: async () => current,
        log: () => {}
      });
      await monitor.poll();
      current = status('outage');
      await monitor.poll();
      current = status('operational');
      await monitor.poll();
      assert.equal(statusMessages.length, 2);
      assert.equal(statusMessages[0].service, 'Website & public pages');
      assert.equal(statusMessages[0].status, 'unavailable');
      assert.equal(statusMessages[0].recovered, false);
      assert.equal(statusMessages[1].recovered, true);

      const unsubscribeToken = new URL(statusMessages[0].unsubscribeUrl).searchParams.get('unsubscribe');
      assert.equal((await client.post('/api/public/status-subscriptions/unsubscribe', { token: unsubscribeToken })).status, 200);
      const subscription = (await ctx.db.query(
        'SELECT unsubscribed_at FROM status_email_subscriptions WHERE email = $1',
        ['alerts@example.net']
      )).rows[0];
      assert.ok(subscription.unsubscribed_at);
      current = status('outage');
      await monitor.poll();
      assert.equal(statusMessages.length, 2);
      assert.equal(decrypt((await ctx.db.query(
        'SELECT unsubscribe_token_enc FROM status_email_subscriptions WHERE email = $1',
        ['alerts@example.net']
      )).rows[0].unsubscribe_token_enc), unsubscribeToken);
    } finally {
      await ctx.close();
    }
  });
});

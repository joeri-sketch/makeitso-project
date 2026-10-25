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
      sendProjectUpdateEmail: async (message) => updates.push(message),
      configOverrides: {
        publicOrigin: 'https://makeitso-production.up.railway.app',
        publicStatusSite: 'https://makeitso.studio/'
      }
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
      assert.match(invitation.json.invitation_url, /^https:\/\/makeitso\.studio\/portal\/\?invite=/);
      assert.doesNotMatch(invitation.json.invitation_url, /up\.railway\.app/);
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
      assert.equal(statusMessages[0].report.length, 5);
      assert.deepEqual(statusMessages[0].report.map(({ service }) => service), [
        'Website & public pages',
        'Apps',
        'Client portal',
        'Email & contact form',
        'Quotes & invoices'
      ]);
      assert.equal(statusMessages[0].report.find(({ service }) => service === 'Website & public pages').status, 'unavailable');
      assert.equal(statusMessages[1].recovered, true);
      assert.equal(statusMessages[1].report.length, 5);
      assert.equal(statusMessages[1].report.find(({ service }) => service === 'Website & public pages').status, 'operational');
      const events = (await ctx.db.query(
        'SELECT status_snapshot FROM public_status_events ORDER BY id'
      )).rows.map(({ status_snapshot }) => JSON.parse(status_snapshot));
      assert.equal(events.length, 2);
      assert.equal(events[0].length, 5);
      assert.equal(events[0].find(({ id }) => id === 'website').status, 'outage');
      assert.equal(events[1].find(({ id }) => id === 'website').status, 'operational');

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

  it('respects notification preferences while preserving leads, invitation links and status subscription confirmation', async () => {
    const contactEmails = [];
    const invitations = [];
    const projectUpdates = [];
    const confirmations = [];
    const statusUpdates = [];
    const ctx = await startTestServer({
      emailPreferences: {
        contactLeads: false,
        clientInvitations: false,
        projectUpdates: false,
        statusUpdates: false
      },
      sendContactEmail: async (message) => contactEmails.push(message),
      sendInvitationEmail: async (message) => invitations.push(message),
      sendProjectUpdateEmail: async (message) => projectUpdates.push(message),
      sendStatusSubscriptionConfirmation: async (message) => confirmations.push(message),
      sendStatusUpdate: async (message) => statusUpdates.push(message)
    });
    try {
      const publicClient = new Client(ctx.base);
      const lead = await publicClient.post('/api/public/leads', {
        name: 'Alex Morgan',
        email: 'alex@example.net',
        company: 'Northstar',
        message: 'We need a website.',
        language: 'en',
        t: Date.now() - 5000
      });
      assert.equal(lead.status, 201);
      assert.equal(contactEmails.length, 0);
      assert.equal((await ctx.db.query('SELECT id FROM leads')).rows.length, 1);

      const { client: admin } = await signedInAdmin(ctx);
      const client = (await admin.post('/api/clients', {
        company_name: 'Northstar Studio',
        language: 'nl',
        contact: { name: 'Alex Morgan', email: 'alex@northstar.example', is_primary: true }
      })).json.client;
      const invitation = await admin.post(`/api/clients/${client.id}/invitations`, { email: 'alex@northstar.example' });
      assert.equal(invitation.status, 201);
      assert.equal(invitation.json.email_sent, false);
      assert.equal(invitation.json.email_skipped, true);
      assert.match(invitation.json.invitation_url, /^https:\/\/makeitso\.studio\/portal\/\?invite=/);
      assert.equal(invitations.length, 0);

      const project = (await admin.post('/api/projects', { client_id: client.id, name: 'Website' })).json.project;
      const update = await admin.patch(`/api/projects/${project.id}`, { status: 'development' });
      assert.equal(update.status, 200);
      assert.equal(update.json.email_skipped, true);
      assert.equal(projectUpdates.length, 0);

      const requested = await publicClient.post('/api/public/status-subscriptions', {
        email: 'alerts@example.net',
        language: 'en',
        consent: true
      });
      assert.equal(requested.status, 202);
      assert.equal(confirmations.length, 1, 'subscription confirmation remains enabled during a status-notification pause');

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
        mailer: {
          isEnabled: (name) => name !== 'statusUpdates',
          sendStatusUpdate: async (message) => statusUpdates.push(message)
        },
        getPublicStatus: async () => current,
        log: () => {}
      });
      await monitor.poll();
      current = status('outage');
      await monitor.poll();
      assert.equal(statusUpdates.length, 0);
      assert.equal((await ctx.db.query('SELECT id FROM public_status_events')).rows.length, 1);
      assert.equal((await ctx.db.query('SELECT id FROM public_status_deliveries')).rows.length, 0);
    } finally {
      await ctx.close();
    }
  });
});

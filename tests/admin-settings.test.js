import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, signedInAdmin } from './helpers.js';

const notifications = {
  contactLeads: false,
  clientInvitations: false,
  projectUpdates: true,
  statusUpdates: false
};
const emailSettings = (overrides = {}) => ({
  provider: 'resend',
  email_from: 'Make It So <hello@example.com>',
  contact_email: 'hello@example.com',
  smtp_host: '',
  smtp_port: 465,
  smtp_secure: true,
  smtp_user: '',
  smtp_password: '',
  resend_api_key: '',
  clear_smtp_password: false,
  clear_resend_api_key: false,
  notifications,
  ...overrides
});

test('admin language preference and encrypted email settings', async (t) => {
  const deliveredTo = [];
  const activeMailerConfigs = [];
  const ctx = await startTestServer({
    sendTestEmail: async (recipient) => deliveredTo.push(recipient),
    updateMailerConfig: (settings) => activeMailerConfigs.push(settings),
    configOverrides: {
      emailProvider: 'resend',
      emailFrom: '',
      contactEmail: '',
      smtpFrom: '',
      smtpHost: '',
      smtpUser: '',
      smtpPassword: '',
      resendApiKey: ''
    }
  });
  t.after(() => ctx.close());

  const admin = await signedInAdmin(ctx);

  const initialMe = await admin.client.get('/api/auth/me');
  assert.equal(initialMe.json.user.admin_language, 'nl');
  const language = await admin.client.patch('/api/auth/preferences', { admin_language: 'en' });
  assert.equal(language.status, 200);
  assert.equal(language.json.admin_language, 'en');
  const updatedMe = await admin.client.get('/api/auth/me');
  assert.equal(updatedMe.json.user.admin_language, 'en');

  const initialSettings = await admin.client.get('/api/admin/settings/email');
  assert.equal(initialSettings.status, 200);
  assert.equal(initialSettings.json.settings.resend_api_key_set, false);
  assert.equal(Object.hasOwn(initialSettings.json.settings, 'resend_api_key'), false);
  assert.deepEqual(initialSettings.json.settings.notifications, {
    contactLeads: true,
    clientInvitations: true,
    projectUpdates: true,
    statusUpdates: true
  });

  const saved = await admin.client.put('/api/admin/settings/email', emailSettings({ resend_api_key: 're_test_secret_123' }));
  assert.equal(saved.status, 200);
  assert.equal(saved.json.settings.resend_api_key_set, true);
  assert.deepEqual(saved.json.settings.notifications, notifications);
  assert.equal(JSON.stringify(saved.json).includes('re_test_secret_123'), false);
  assert.equal(activeMailerConfigs.length, 1);
  assert.equal(activeMailerConfigs[0].resendApiKey, 're_test_secret_123');
  assert.deepEqual(activeMailerConfigs[0].notifications, notifications);

  const preserved = await admin.client.put('/api/admin/settings/email', emailSettings());
  assert.equal(preserved.status, 200);
  assert.equal(preserved.json.settings.resend_api_key_set, true);
  assert.equal(activeMailerConfigs.at(-1).resendApiKey, 're_test_secret_123');

  const stored = await ctx.db.query("SELECT setting_value FROM app_settings WHERE setting_key = 'email_config'");
  assert.equal(stored.rows[0].setting_value.includes('re_test_secret_123'), false);

  const testMail = await admin.client.post('/api/admin/settings/email/test');
  assert.equal(testMail.status, 200);
  assert.deepEqual(deliveredTo, ['admin@example.com']);

  const invalid = await admin.client.put('/api/admin/settings/email', emailSettings({
    contact_email: '',
    clear_resend_api_key: true
  }));
  assert.equal(invalid.status, 400);
});

test('email settings are not available without authenticated admin access', async (t) => {
  const ctx = await startTestServer();
  t.after(() => ctx.close());

  const response = await fetch(`${ctx.base}/api/admin/settings/email`);
  assert.equal(response.status, 401);
});

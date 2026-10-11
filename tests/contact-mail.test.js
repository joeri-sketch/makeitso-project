import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createContactMailer } from '../src/services/contact-mail.js';
import { Client, startTestServer } from './helpers.js';

const smtpConfig = {
  smtpHost: 'smtp.hostinger.com',
  smtpPort: 465,
  smtpSecure: true,
  smtpUser: 'hello@example.com',
  smtpPassword: 'mailbox-password',
  smtpFrom: 'hello@example.com',
  contactEmail: 'hello@example.com'
};

describe('contact form SMTP delivery', () => {
  it('sends a formatted notification using the configured SMTP transport', async () => {
    let transportOptions;
    let message;
    const mailer = createContactMailer(smtpConfig, (options) => {
      transportOptions = options;
      return { sendMail: async (mail) => { message = mail; } };
    });

    await mailer.send({
      name: 'Alex Visitor',
      email: 'alex@example.net',
      company: 'Northstar',
      message: 'We need a new website.',
      language: 'nl'
    });

    assert.deepEqual(transportOptions, {
      host: 'smtp.hostinger.com',
      port: 465,
      secure: true,
      auth: { user: 'hello@example.com', pass: 'mailbox-password' }
    });
    assert.equal(message.from, 'hello@example.com');
    assert.equal(message.to, 'hello@example.com');
    assert.deepEqual(message.replyTo, { name: 'Alex Visitor', address: 'alex@example.net' });
    assert.equal(message.subject, 'New website contact form message');
    assert.match(message.text, /Company: Northstar/);
    assert.match(message.text, /Language: nl/);
    assert.match(message.text, /We need a new website\./);
  });

  it('refuses to claim delivery when SMTP credentials are not configured', async () => {
    const mailer = createContactMailer({ ...smtpConfig, smtpPassword: '' });
    await assert.rejects(mailer.send({}), /SMTP_HOST, SMTP_USER and SMTP_PASSWORD/);
  });

  it('stores a lead and reports an explicit delivery error if SMTP fails', async () => {
    const ctx = await startTestServer({
      sendContactEmail: async () => { throw new Error('SMTP_AUTH_FAILED'); }
    });
    try {
      const res = await new Client(ctx.base).post('/api/public/leads', {
        name: 'Alex Visitor',
        email: 'alex@example.net',
        message: 'Please get in touch about a website.',
        language: 'en',
        t: 4000
      });
      assert.equal(res.status, 503);
      assert.match(res.json.error, /message was saved, but email delivery failed/i);
      const { rows } = await ctx.db.query('SELECT email FROM leads WHERE email = $1', ['alex@example.net']);
      assert.equal(rows.length, 1, 'the submitted message remains saved for the admin');
    } finally {
      await ctx.close();
    }
  });
});

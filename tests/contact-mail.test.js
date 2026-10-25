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

const resendConfig = {
  resendApiKey: 're_test_api_key',
  emailFrom: 'Make It So <hello@example.com>',
  contactEmail: 'hello@example.com'
};

describe('contact form email delivery', () => {
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
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
      auth: { user: 'hello@example.com', pass: 'mailbox-password' }
    });
    assert.equal(message.from, 'hello@example.com');
    assert.equal(message.to, 'hello@example.com');
    assert.deepEqual(message.replyTo, { name: 'Alex Visitor', address: 'alex@example.net' });
    assert.equal(message.subject, 'New website contact form message');
    assert.match(message.text, /Company: Northstar/);
    assert.match(message.text, /Language: nl/);
    assert.match(message.text, /We need a new website\./);
    assert.match(message.html, /background-color:#07103a/);
    assert.match(message.html, /NIEUW BERICHT/);
    assert.match(message.html, /Beantwoord dit bericht/);
    assert.match(message.html, /href="mailto:alex@example\.net"/);
  });

  it('refuses to claim delivery when SMTP credentials are not configured', async () => {
    const mailer = createContactMailer({ ...smtpConfig, smtpPassword: '' });
    await assert.rejects(mailer.send({}), /SMTP_HOST, SMTP_USER, SMTP_PASSWORD/);
    assert.equal(await mailer.verify(), 'maintenance');
  });

  it('sends invitations, project updates and status emails through the same SMTP transport', async () => {
    const messages = [];
    let verificationCount = 0;
    const mailer = createContactMailer(smtpConfig, () => ({
      sendMail: async (message) => messages.push(message),
      verify: async () => { verificationCount += 1; }
    }));

    await mailer.sendInvitation({
      email: 'alex@example.net', name: 'Alex', company: 'Northstar',
      url: 'https://makeitso.studio/portal/?invite=one-time-token', language: 'nl'
    });
    await mailer.sendProjectUpdate({
      email: 'alex@example.net', name: 'Alex', project: 'Website', from: 'discovery',
      to: 'development', language: 'nl'
    });
    await mailer.sendProjectUpdate({
      email: 'alex@example.net', name: 'Alex', project: 'Website', item: 'Prototype',
      from: 'doing', to: 'done', language: 'nl'
    });
    await mailer.sendStatusSubscriptionConfirmation({
      email: 'alerts@example.net', url: 'https://makeitso.studio/status/?confirm=token', language: 'fr'
    });
    await mailer.sendStatusUpdate({
      email: 'alerts@example.net', service: 'Site web', status: 'indisponible',
      recovered: false, unsubscribeUrl: 'https://makeitso.studio/status/?unsubscribe=token', language: 'fr',
      report: [
        { service: 'Site web', status: 'indisponible', statusCode: 'outage' },
        { service: 'Applications', status: 'opérationnel', statusCode: 'operational' }
      ]
    });
    assert.equal(await mailer.verify(), 'operational');
    assert.equal(await mailer.verify(), 'operational');
    assert.equal(verificationCount, 1, 'SMTP verification is cached briefly');
    assert.match(messages[0].text, /uitgenodigd/i);
    assert.match(messages[1].text, /Ontwikkeling/);
    assert.match(messages[2].text, /Prototype/);
    assert.match(messages[3].text, /Confirmez votre abonnement/);
    assert.match(messages[4].text, /indisponible/);
    assert.match(messages[0].html, /JOUW KLANTPORTAAL/);
    assert.match(messages[0].html, /Stel je toegang in/);
    assert.match(messages[1].html, /PROJECTLOGBOEK/);
    assert.match(messages[2].html, /MIJLPAAL/);
    assert.match(messages[3].html, /Confirmer l’abonnement/);
    assert.match(messages[4].html, /ÉTAT DU SERVICE · ALERTE/);
    assert.match(messages[4].html, /LES CINQ SYSTÈMES/);
    assert.match(messages[4].html, /Applications/);
    assert.match(messages[4].text, /État des cinq services/);
    assert.match(messages[4].text, /Site web : indisponible/);
    assert.equal(messages.every((message) => message.from === smtpConfig.smtpFrom), true);
    assert.equal(messages.every((message) => message.from === smtpConfig.smtpFrom), true);
  });

  it('sends all email through the Resend HTTPS API and reports the last delivery result', async () => {
    const requests = [];
    const mailer = createContactMailer(
      resendConfig,
      () => { throw new Error('SMTP must not be initialized when Resend is configured'); },
      () => {},
      async (url, options) => {
        requests.push({ url, options, body: JSON.parse(options.body) });
        return new Response(JSON.stringify({ id: `email-${requests.length}` }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    );
    assert.equal(await mailer.verify(), 'unknown', 'a send-only API key cannot be safely probed without sending an email');

    await mailer.send({
      name: 'Alex Visitor',
      email: 'alex@example.net',
      company: '<img src=x onerror=alert(1)>',
      message: '<script>alert(1)</script>\nSecond line & more',
      language: 'nl'
    });
    await mailer.sendInvitation({
      email: 'alex@example.net', name: '<Alex>', company: '<Northstar>',
      url: 'https://makeitso.studio/portal/?invite=token', language: 'nl'
    });
    await mailer.sendProjectUpdate({
      email: 'alex@example.net', name: 'Alex', project: '<Website>',
      from: 'discovery', to: 'development', language: 'nl'
    });
    await mailer.sendStatusSubscriptionConfirmation({
      email: 'alerts@example.net', url: 'https://makeitso.studio/status/?confirm=token', language: 'fr'
    });
    await mailer.sendStatusUpdate({
      email: 'alerts@example.net', service: 'Site web', status: 'indisponible',
      recovered: false, unsubscribeUrl: 'https://makeitso.studio/status/?unsubscribe=token', language: 'fr',
      report: [
        { service: 'Site web', status: 'indisponible', statusCode: 'outage' },
        { service: 'Applications', status: 'opérationnel', statusCode: 'operational' }
      ]
    });

    assert.equal(requests.length, 5);
    assert.equal(requests[0].url, 'https://api.resend.com/emails');
    assert.equal(requests[0].options.method, 'POST');
    assert.equal(requests[0].options.redirect, 'error');
    assert.equal(requests[0].options.headers.Authorization, 'Bearer re_test_api_key');
    assert.equal(requests[0].body.from, resendConfig.emailFrom);
    assert.equal(requests[0].body.to, resendConfig.contactEmail);
    assert.equal(requests[0].body.subject, 'New website contact form message');
    assert.match(requests[0].body.text, /<script>alert\(1\)<\/script>/);
    assert.equal(requests[0].body.reply_to, 'Alex Visitor <alex@example.net>');
    assert.match(requests[0].body.html, /&lt;img src=x onerror=alert\(1\)&gt;/);
    assert.match(requests[0].body.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.match(requests[0].body.html, /Second line &amp; more/);
    assert.doesNotMatch(requests[0].body.html, /<script>|<img src=x onerror/);
    assert.match(requests[0].body.html, /background-color:#07103a/);
    assert.match(requests[0].body.html, /NIEUW BERICHT/);
    assert.equal(requests[1].body.from, resendConfig.emailFrom);
    assert.equal(requests[1].body.to, 'alex@example.net');
    assert.equal(requests[1].body.subject, 'Uitnodiging voor het Make It So-klantenportaal');
    assert.match(requests[1].body.text, /portal\/\?invite=token/);
    assert.match(requests[1].body.html, /JOUW KLANTPORTAAL/);
    assert.match(requests[1].body.html, /&lt;Alex&gt;/);
    assert.match(requests[1].body.html, /&lt;Northstar&gt;/);
    assert.doesNotMatch(requests[1].body.html, /<Alex>|<Northstar>/);
    assert.equal(requests[2].body.to, 'alex@example.net');
    assert.match(requests[2].body.text, /Ontwikkeling/);
    assert.match(requests[2].body.html, /PROJECTLOGBOEK/);
    assert.match(requests[2].body.html, /&lt;Website&gt;/);
    assert.equal(requests[3].body.to, 'alerts@example.net');
    assert.match(requests[3].body.text, /Confirmez votre abonnement/);
    assert.match(requests[3].body.html, /Confirmer l’abonnement/);
    assert.equal(requests[4].body.to, 'alerts@example.net');
    assert.match(requests[4].body.text, /indisponible/);
    assert.match(requests[4].body.html, /ÉTAT DU SERVICE · ALERTE/);
    assert.match(requests[4].body.html, /status\/\?unsubscribe=token/);
    assert.match(requests[4].body.html, /LES CINQ SYSTÈMES/);
    assert.match(requests[4].body.html, /Applications/);
    assert.match(requests[4].body.text, /État des cinq services/);
    assert.equal(await mailer.verify(), 'operational');
  });

  it('switches provider at runtime and closes the previous SMTP transport', async () => {
    const resendRequests = [];
    const smtpMessages = [];
    let transportClosed = 0;
    const mailer = createContactMailer(
      { ...resendConfig, emailProvider: 'resend' },
      (options) => ({
        options,
        sendMail: async (message) => smtpMessages.push(message),
        close: () => { transportClosed += 1; }
      }),
      () => {},
      async (_url, options) => {
        resendRequests.push(options);
        return new Response(JSON.stringify({ id: 'test-email' }), { status: 200 });
      }
    );

    await mailer.sendTestEmail('admin@example.com');
    assert.equal(resendRequests.length, 1);

    mailer.updateConfig({
      emailProvider: 'smtp',
      emailFrom: 'Make It So <hello@example.com>',
      smtpFrom: 'Make It So <hello@example.com>',
      smtpHost: 'smtp.example.com',
      smtpPort: 465,
      smtpSecure: true,
      smtpUser: 'hello@example.com',
      smtpPassword: 'smtp secret',
      resendApiKey: 're_test_api_key'
    });
    await mailer.sendTestEmail('admin@example.com');

    assert.equal(smtpMessages.length, 1);
    assert.equal(smtpMessages[0].to, 'admin@example.com');
    assert.equal(smtpMessages[0].from, 'Make It So <hello@example.com>');
    assert.equal(transportClosed, 0);

    mailer.updateConfig({ emailProvider: 'resend' });
    assert.equal(transportClosed, 1);
    await mailer.sendTestEmail('admin@example.com');
    assert.equal(resendRequests.length, 2);
  });

  it('does not send categories disabled in email notification preferences', async () => {
    const sent = [];
    const mailer = createContactMailer({
      ...resendConfig,
      notifications: {
        contactLeads: false,
        clientInvitations: false,
        projectUpdates: false,
        statusUpdates: false
      }
    }, undefined, () => {}, async (_url, options) => {
      sent.push(JSON.parse(options.body));
      return new Response(JSON.stringify({ id: 'should-not-send' }), { status: 200 });
    });

    await mailer.send({ name: 'Alex', email: 'alex@example.net', message: 'Hello', language: 'en' });
    await mailer.sendInvitation({ email: 'alex@example.net', name: 'Alex', company: 'Northstar', url: 'https://example.com', language: 'en' });
    await mailer.sendProjectUpdate({ email: 'alex@example.net', name: 'Alex', project: 'Website', from: 'review', to: 'launched', language: 'en' });
    await mailer.sendStatusUpdate({ email: 'alerts@example.net', service: 'Website', status: 'unavailable', recovered: false, unsubscribeUrl: 'https://example.com', language: 'en' });
    assert.equal(sent.length, 0);
    assert.equal(mailer.isEnabled('statusUpdates'), false);
  });

  it('reports Resend HTTP failures without exposing provider response details', async () => {
    const mailer = createContactMailer(
      resendConfig,
      undefined,
      () => {},
      async () => new Response(JSON.stringify({ name: 'validation_error', message: 'private provider detail' }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' }
      })
    );
    await assert.rejects(mailer.send({
      name: 'Alex Visitor',
      email: 'alex@example.net',
      message: 'We need a new website.',
      language: 'en'
    }), (error) => {
      assert.equal(error.code, 'validation_error');
      assert.doesNotMatch(error.message, /private provider detail/);
      return true;
    });
    assert.equal(await mailer.verify(), 'outage');
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

import nodemailer from 'nodemailer';

const copy = {
  en: {
    inviteSubject: 'Your Make It So client portal invitation',
    invite: (name, company, url) => `Hello ${name},\n\n${company} has invited you to the Make It So client portal. Use the secure link below to set a password and access your project updates, quotes and invoices. This link expires in 7 days.\n\n${url}\n\nIf you were not expecting this invitation, you can ignore this email.\n\nMake It So`,
    projectSubject: (project) => `Project update: ${project}`,
    project: (name, project, item, detail) => `Hello ${name},\n\nThere is an update to your Make It So project "${project}":\n${item ? `${item}\n` : ''}\n${detail}\n\nSign in to your client portal for the latest project information.\n\nMake It So`,
    statusSubject: (service, recovered) => `${service}: ${recovered ? 'service restored' : 'service update'}`,
    status: (service, status, unsubscribeUrl) => `The status of ${service} has changed to ${status}.\n\nSee the current service overview at https://makeitso.studio/status/.\n\nTo stop receiving status emails, use this link: ${unsubscribeUrl}`,
    confirmationSubject: 'Confirm your Make It So status email subscription',
    confirmation: (url) => `Confirm your subscription to service incident and recovery emails from Make It So by opening this link:\n\n${url}\n\nIf you did not request these updates, you can ignore this email.`
  },
  nl: {
    inviteSubject: 'Uitnodiging voor het Make It So-klantenportaal',
    invite: (name, company, url) => `Hallo ${name},\n\n${company} heeft je uitgenodigd voor het klantenportaal van Make It So. Gebruik de beveiligde link hieronder om een wachtwoord in te stellen en je projectupdates, offertes en facturen te bekijken. De link verloopt na 7 dagen.\n\n${url}\n\nVerwachtte je deze uitnodiging niet? Dan mag je deze e-mail negeren.\n\nMake It So`,
    projectSubject: (project) => `Projectupdate: ${project}`,
    project: (name, project, item, detail) => `Hallo ${name},\n\nEr is een update voor je Make It So-project "${project}":\n${item ? `${item}\n` : ''}\n${detail}\n\nMeld je aan bij het klantenportaal voor de actuele projectinformatie.\n\nMake It So`,
    statusSubject: (service, recovered) => `${service}: ${recovered ? 'dienst hersteld' : 'statusupdate'}`,
    status: (service, status, unsubscribeUrl) => `De status van ${service} is gewijzigd naar ${status}.\n\nBekijk het actuele dienstenoverzicht op https://makeitso.studio/status/.\n\nWil je geen statusmails meer ontvangen? Gebruik dan deze link: ${unsubscribeUrl}`,
    confirmationSubject: 'Bevestig je Make It So-statusmeldingen',
    confirmation: (url) => `Bevestig je aanmelding voor e-mails over storingen en herstel bij Make It So via deze link:\n\n${url}\n\nHeb je deze updates niet aangevraagd? Dan mag je deze e-mail negeren.`
  },
  fr: {
    inviteSubject: 'Invitation à votre portail client Make It So',
    invite: (name, company, url) => `Bonjour ${name},\n\n${company} vous invite sur le portail client Make It So. Utilisez le lien sécurisé ci-dessous pour définir un mot de passe et consulter vos projets, devis et factures. Ce lien expire dans 7 jours.\n\n${url}\n\nSi vous n’attendiez pas cette invitation, vous pouvez ignorer cet e-mail.\n\nMake It So`,
    projectSubject: (project) => `Mise à jour du projet : ${project}`,
    project: (name, project, item, detail) => `Bonjour ${name},\n\nUne mise à jour concerne votre projet Make It So « ${project} » :\n${item ? `${item}\n` : ''}\n${detail}\n\nConnectez-vous au portail client pour consulter les dernières informations.\n\nMake It So`,
    statusSubject: (service, recovered) => `${service} : ${recovered ? 'service rétabli' : 'mise à jour du service'}`,
    status: (service, status, unsubscribeUrl) => `Le statut de ${service} a changé : ${status}.\n\nConsultez l’état actuel des services sur https://makeitso.studio/status/.\n\nPour ne plus recevoir ces e-mails, utilisez ce lien : ${unsubscribeUrl}`,
    confirmationSubject: 'Confirmez votre abonnement aux alertes Make It So',
    confirmation: (url) => `Confirmez votre abonnement aux e-mails de panne et de rétablissement des services Make It So en ouvrant ce lien :\n\n${url}\n\nSi vous n’avez pas demandé ces alertes, ignorez cet e-mail.`
  }
};

const languageCopy = (language) => copy[language] || copy.en;
const contactEmailCopy = {
  en: {
    kicker: 'NEW TRANSMISSION',
    title: 'A new message is in orbit.',
    intro: 'Someone has sent a message through the Make It So website.',
    name: 'NAME',
    email: 'EMAIL',
    company: 'COMPANY',
    language: 'LANGUAGE',
    message: 'MESSAGE',
    reply: 'Reply to this message',
    footer: 'Built for ambitious ideas, from first signal to final launch.'
  },
  nl: {
    kicker: 'NIEUW BERICHT',
    title: 'Er is een nieuw bericht binnengekomen.',
    intro: 'Iemand heeft een bericht verstuurd via de Make It So-website.',
    name: 'NAAM',
    email: 'E-MAIL',
    company: 'BEDRIJF',
    language: 'TAAL',
    message: 'BERICHT',
    reply: 'Beantwoord dit bericht',
    footer: 'Voor ambitieuze ideeën, van eerste signaal tot lancering.'
  },
  fr: {
    kicker: 'NOUVEAU MESSAGE',
    title: 'Un nouveau message est arrivé.',
    intro: 'Quelqu’un a envoyé un message depuis le site Make It So.',
    name: 'NOM',
    email: 'E-MAIL',
    company: 'ENTREPRISE',
    language: 'LANGUE',
    message: 'MESSAGE',
    reply: 'Répondre à ce message',
    footer: 'Pour les idées ambitieuses, du premier signal au lancement.'
  }
};
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
})[character]);

function contactEmailHtml(lead) {
  const text = contactEmailCopy[lead.language] || contactEmailCopy.en;
  const company = lead.company || (lead.language === 'nl' ? 'Niet opgegeven' : lead.language === 'fr' ? 'Non renseignée' : 'Not provided');
  return `<!doctype html>
<html lang="${escapeHtml(lead.language)}">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
  <body style="margin:0;padding:0;background-color:#eef1f8;font-family:Arial,Helvetica,sans-serif;color:#10172f;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(text.intro)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#eef1f8;">
      <tr><td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;">
          <tr><td style="padding:0 0 14px;color:#07103a;font-size:13px;font-weight:bold;letter-spacing:2px;">MAKE IT SO <span style="color:#0b3bff;">/</span> CREATIVE STUDIO</td></tr>
          <tr><td style="background-color:#07103a;border-top:5px solid #ff6a1f;border-radius:18px 18px 0 0;padding:32px 36px;color:#ffffff;">
            <div style="display:inline-block;margin:0 0 18px;padding:7px 11px;border-radius:5px;background-color:#ff6a1f;color:#07103a;font-size:10px;font-weight:bold;letter-spacing:1.5px;">${escapeHtml(text.kicker)}</div>
            <h1 style="margin:0 0 12px;font-size:30px;line-height:1.2;color:#ffffff;">${escapeHtml(text.title)}</h1>
            <p style="margin:0;color:#c7d0ef;font-size:15px;line-height:1.6;">${escapeHtml(text.intro)}</p>
          </td></tr>
          <tr><td style="padding:28px 36px;background-color:#ffffff;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td width="50%" valign="top" style="padding:0 12px 20px 0;">
                  <div style="margin-bottom:6px;color:#68718a;font-size:10px;font-weight:bold;letter-spacing:1.3px;">${escapeHtml(text.name)}</div>
                  <div style="color:#10172f;font-size:15px;line-height:1.5;overflow-wrap:anywhere;">${escapeHtml(lead.name)}</div>
                </td>
                <td width="50%" valign="top" style="padding:0 0 20px 12px;">
                  <div style="margin-bottom:6px;color:#68718a;font-size:10px;font-weight:bold;letter-spacing:1.3px;">${escapeHtml(text.email)}</div>
                  <div style="color:#0b3bff;font-size:15px;line-height:1.5;overflow-wrap:anywhere;"><a href="mailto:${escapeHtml(lead.email)}" style="color:#0b3bff;text-decoration:underline;">${escapeHtml(lead.email)}</a></div>
                </td>
              </tr>
              <tr>
                <td width="50%" valign="top" style="padding:0 12px 20px 0;">
                  <div style="margin-bottom:6px;color:#68718a;font-size:10px;font-weight:bold;letter-spacing:1.3px;">${escapeHtml(text.company)}</div>
                  <div style="color:#10172f;font-size:15px;line-height:1.5;overflow-wrap:anywhere;">${escapeHtml(company)}</div>
                </td>
                <td width="50%" valign="top" style="padding:0 0 20px 12px;">
                  <div style="margin-bottom:6px;color:#68718a;font-size:10px;font-weight:bold;letter-spacing:1.3px;">${escapeHtml(text.language)}</div>
                  <div style="color:#10172f;font-size:15px;line-height:1.5;">${escapeHtml(lead.language)}</div>
                </td>
              </tr>
            </table>
            <div style="margin:2px 0 10px;color:#68718a;font-size:10px;font-weight:bold;letter-spacing:1.3px;">${escapeHtml(text.message)}</div>
            <div style="padding:18px 20px;border-left:3px solid #0b3bff;border-radius:0 8px 8px 0;background-color:#f3f5fc;color:#10172f;font-size:15px;line-height:1.7;white-space:pre-wrap;overflow-wrap:anywhere;">${escapeHtml(lead.message)}</div>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:24px;"><tr>
              <td align="center" style="border-radius:8px;background-color:#0b3bff;">
                <a href="mailto:${escapeHtml(lead.email)}" style="display:inline-block;padding:13px 20px;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;">${escapeHtml(text.reply)} &rarr;</a>
              </td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:20px 24px;border-radius:0 0 18px 18px;background-color:#ffffff;border-top:1px solid #e5e9f2;color:#68718a;font-size:12px;line-height:1.6;">
            ${escapeHtml(text.footer)}<br>
            <a href="https://makeitso.studio/" style="color:#0b3bff;text-decoration:none;">makeitso.studio</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

const projectStatuses = {
  en: { discovery: 'Discovery', wireframing: 'Wireframing', development: 'Development', review: 'Review', launched: 'Launched', on_hold: 'On hold', todo: 'To do', doing: 'In progress', done: 'Done' },
  nl: { discovery: 'Verkenning', wireframing: 'Wireframes', development: 'Ontwikkeling', review: 'Review', launched: 'Gelanceerd', on_hold: 'On hold', todo: 'Te doen', doing: 'Bezig', done: 'Afgerond' },
  fr: { discovery: 'Découverte', wireframing: 'Maquettes filaires', development: 'Développement', review: 'Révision', launched: 'Lancé', on_hold: 'En pause', todo: 'À faire', doing: 'En cours', done: 'Terminé' }
};

export function createContactMailer(config, createTransport = nodemailer.createTransport, log = () => {}, fetchImpl = globalThis.fetch) {
  const resendConfigured = Boolean(config.resendApiKey && config.emailFrom);
  const configured = resendConfigured || Boolean(config.smtpHost && config.smtpUser && config.smtpPassword && config.smtpFrom);
  const transport = configured
    && !resendConfigured
    ? createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth: { user: config.smtpUser, pass: config.smtpPassword },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000
    })
    : null;
  let lastVerification = null;
  let verificationExpires = 0;
  let verificationInFlight;

  const sendResend = async (message) => {
    let replyTo;
    if (message.replyTo) {
      const { name, address } = message.replyTo;
      const safeName = String(name).replace(/[\r\n"]/g, ' ').trim();
      replyTo = safeName ? `${safeName} <${address}>` : address;
    }
    let response;
    try {
      response = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(10_000),
        headers: {
          Authorization: `Bearer ${config.resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: config.emailFrom,
          to: message.to,
          subject: message.subject,
          text: message.text,
          ...(message.html ? { html: message.html } : {}),
          ...(replyTo ? { reply_to: replyTo } : {})
        })
      });
    } catch (error) {
      lastVerification = 'outage';
      verificationExpires = Date.now() + 60_000;
      if (!error.code) error.code = error.name === 'TimeoutError' ? 'RESEND_TIMEOUT' : 'RESEND_REQUEST_FAILED';
      throw error;
    }

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const error = new Error('Resend rejected the email request.');
      error.code = typeof body?.name === 'string' ? body.name : `RESEND_HTTP_${response.status}`;
      lastVerification = 'outage';
      verificationExpires = Date.now() + 60_000;
      throw error;
    }
    lastVerification = 'operational';
    verificationExpires = Date.now() + 60_000;
  };

  const send = async (message) => {
    if (!transport) {
      if (resendConfigured) {
        if (!config.contactEmail && !message.to) {
          const error = new Error('Email recipient is not configured. Set CONTACT_EMAIL.');
          error.code = 'MAIL_RECIPIENT_MISSING';
          throw error;
        }
        await sendResend(message);
        return;
      }
      throw new Error('Email is not configured. Set RESEND_API_KEY and EMAIL_FROM, or configure SMTP_HOST, SMTP_USER, SMTP_PASSWORD and SMTP_FROM.');
    }
    if (!config.contactEmail && !message.to) {
      const error = new Error('Email recipient is not configured. Set CONTACT_EMAIL.');
      error.code = 'MAIL_RECIPIENT_MISSING';
      throw error;
    }
    await transport.sendMail({ from: config.smtpFrom, ...message });
  };

  return {
    async send(lead) {
      await send({
        to: config.contactEmail,
        replyTo: { name: lead.name, address: lead.email },
        subject: 'New website contact form message',
        text: [
          'New contact form submission',
          '',
          `Name: ${lead.name}`,
          `Email: ${lead.email}`,
          `Company: ${lead.company || 'Not provided'}`,
          `Language: ${lead.language}`,
          '',
          'Message:',
          lead.message
          ].join('\n'),
          html: contactEmailHtml(lead)
      });
    },
    async sendInvitation({ email, name, company, url, language }) {
      const text = languageCopy(language);
      await send({ to: email, subject: text.inviteSubject, text: text.invite(name, company, url) });
    },
    async sendProjectUpdate({ email, name, project, item, from, to, language }) {
      const text = languageCopy(language);
      const labels = projectStatuses[language] || projectStatuses.en;
      const detail = `${labels[from] || from} → ${labels[to] || to}`;
      await send({
        to: email,
        subject: text.projectSubject(project),
        text: text.project(name, project, item, detail)
      });
    },
    async sendStatusUpdate({ email, service, status, recovered, unsubscribeUrl, language }) {
      const text = languageCopy(language);
      await send({
        to: email,
        subject: text.statusSubject(service, recovered),
        text: text.status(service, status, unsubscribeUrl)
      });
    },
    async sendStatusSubscriptionConfirmation({ email, url, language }) {
      const text = languageCopy(language);
      await send({ to: email, subject: text.confirmationSubject, text: text.confirmation(url) });
    },
    async verify() {
      if (resendConfigured) return lastVerification || 'unknown';
      if (!transport) return 'maintenance';
      if (lastVerification && Date.now() < verificationExpires) return lastVerification;
      if (verificationInFlight) return verificationInFlight;
      verificationInFlight = (async () => {
        try {
          await transport.verify();
          lastVerification = 'operational';
        } catch (error) {
          lastVerification = 'outage';
          log({ level: 'warn', msg: 'SMTP verification failed.', code: error.code || 'SMTP_VERIFY_FAILED' });
        }
        verificationExpires = Date.now() + 60_000;
        return lastVerification;
      })();
      try {
        return await verificationInFlight;
      } finally {
        verificationInFlight = null;
      }
    },
    isConfigured: configured
  };
}

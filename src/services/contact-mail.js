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
        ].join('\n')
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

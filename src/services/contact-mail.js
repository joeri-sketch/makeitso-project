import nodemailer from 'nodemailer';

const copy = {
  en: {
    inviteSubject: 'Your Make It So client portal invitation',
    invite: (name, company, url) => `Hello ${name},\n\n${company} has invited you to the Make It So client portal. Use the secure link below to set a password and access your project updates, quotes and invoices. This link expires in 7 days.\n\n${url}\n\nIf you were not expecting this invitation, you can ignore this email.\n\nMake It So`,
    inviteKicker: 'YOUR CLIENT PORTAL',
    inviteTitle: 'Your project has a new home.',
    inviteHeaderIntro: 'Your secure invitation is ready.',
    inviteIntro: (company) => `${company} has invited you to follow your project with Make It So.`,
    inviteAccess: 'One secure place for project progress, updates, quotes and invoices.',
    inviteButton: 'Set up your access',
    inviteExpiry: 'Your personal invitation link is valid for 7 days.',
    inviteIgnore: 'If you were not expecting this invitation, you can safely ignore this email.',
    inviteFooter: 'Your next step starts here.',
    projectSubject: (project) => `Project update: ${project}`,
    project: (name, project, item, detail) => `Hello ${name},\n\nThere is an update to your Make It So project "${project}":\n${item ? `${item}\n` : ''}\n${detail}\n\nSign in to your client portal for the latest project information.\n\nMake It So`,
    projectKicker: 'PROJECT LOG · UPDATE',
    projectTitle: 'Your project is moving forward.',
    projectIntro: (project) => `There’s a new update for ${project}.`,
    projectPhase: 'PROJECT PHASE',
    projectMilestone: 'MILESTONE',
    projectButton: 'View project',
    projectSignoff: 'Your client portal has the latest details.',
    projectGreeting: 'Here’s the latest from your project.',
    projectFooter: 'Project updates, all in one place.',
    statusSubject: (service, recovered) => `${service}: ${recovered ? 'service restored' : 'service update'}`,
    status: (service, status, unsubscribeUrl, report = []) => `The status of ${service} has changed to ${status}.\n\n${report.length ? `All system status:\n${report.map((entry) => `- ${entry.service}: ${entry.status}`).join('\n')}\n\n` : ''}See the current service overview at https://makeitso.studio/status/.\n\nTo stop receiving status emails, use this link: ${unsubscribeUrl}`,
    statusIncidentKicker: 'SERVICE STATUS · ALERT',
    statusRecoveryKicker: 'SERVICE STATUS · RESTORED',
    statusIncidentTitle: 'A service needs attention.',
    statusRecoveryTitle: 'Back on course.',
    statusIncidentIntro: 'We’re sharing an important update about a monitored service.',
    statusRecoveryIntro: 'A previously affected service is available again.',
    statusCurrent: 'CURRENT STATUS',
    statusOverview: 'ALL FIVE SYSTEMS',
    statusButton: 'View live status',
    statusUnsubscribe: 'Unsubscribe from status emails',
    statusFooter: 'A clear signal when it matters.',
    confirmationSubject: 'Confirm your Make It So status email subscription',
    confirmation: (url) => `Confirm your subscription to service incident and recovery emails from Make It So by opening this link:\n\n${url}\n\nIf you did not request these updates, you can ignore this email.`,
    confirmKicker: 'STATUS COMMUNICATIONS',
    confirmTitle: 'Stay in the loop.',
    confirmHeaderIntro: 'One quick confirmation and you’re all set.',
    confirmIntro: 'Confirm your email to receive service incident and recovery updates from Make It So.',
    confirmButton: 'Confirm subscription',
    confirmIgnore: 'If you did not request these updates, you can safely ignore this email.',
    confirmFooter: 'You are in control of your updates.'
  },
  nl: {
    inviteSubject: 'Uitnodiging voor het Make It So-klantenportaal',
    invite: (name, company, url) => `Hallo ${name},\n\n${company} heeft je uitgenodigd voor het klantenportaal van Make It So. Gebruik de beveiligde link hieronder om een wachtwoord in te stellen en je projectupdates, offertes en facturen te bekijken. De link verloopt na 7 dagen.\n\n${url}\n\nVerwachtte je deze uitnodiging niet? Dan mag je deze e-mail negeren.\n\nMake It So`,
    inviteKicker: 'JOUW KLANTPORTAAL',
    inviteTitle: 'Je project krijgt een nieuwe thuisbasis.',
    inviteHeaderIntro: 'Je beveiligde uitnodiging staat klaar.',
    inviteIntro: (company) => `${company} nodigt je uit om je project te volgen bij Make It So.`,
    inviteAccess: 'Eén veilige plek voor projectvoortgang, updates, offertes en facturen.',
    inviteButton: 'Stel je toegang in',
    inviteExpiry: 'Je persoonlijke uitnodigingslink is 7 dagen geldig.',
    inviteIgnore: 'Verwachtte je deze uitnodiging niet? Dan mag je deze e-mail veilig negeren.',
    inviteFooter: 'Je volgende stap begint hier.',
    projectSubject: (project) => `Projectupdate: ${project}`,
    project: (name, project, item, detail) => `Hallo ${name},\n\nEr is een update voor je Make It So-project "${project}":\n${item ? `${item}\n` : ''}\n${detail}\n\nMeld je aan bij het klantenportaal voor de actuele projectinformatie.\n\nMake It So`,
    projectKicker: 'PROJECTLOGBOEK · UPDATE',
    projectTitle: 'Je project gaat vooruit.',
    projectIntro: (project) => `Er is een nieuwe update voor ${project}.`,
    projectPhase: 'PROJECTFASE',
    projectMilestone: 'MIJLPAAL',
    projectButton: 'Bekijk project',
    projectSignoff: 'De nieuwste informatie staat in je klantenportaal.',
    projectGreeting: 'Dit is de nieuwste update over je project.',
    projectFooter: 'Alle projectupdates op één plek.',
    statusSubject: (service, recovered) => `${service}: ${recovered ? 'dienst hersteld' : 'statusupdate'}`,
    status: (service, status, unsubscribeUrl, report = []) => `De status van ${service} is gewijzigd naar ${status}.\n\n${report.length ? `Status van alle systemen:\n${report.map((entry) => `- ${entry.service}: ${entry.status}`).join('\n')}\n\n` : ''}Bekijk het actuele dienstenoverzicht op https://makeitso.studio/status/.\n\nWil je geen statusmails meer ontvangen? Gebruik dan deze link: ${unsubscribeUrl}`,
    statusIncidentKicker: 'DIENSTSTATUS · MELDING',
    statusRecoveryKicker: 'DIENSTSTATUS · HERSTELD',
    statusIncidentTitle: 'Een dienst vraagt aandacht.',
    statusRecoveryTitle: 'We zijn weer op koers.',
    statusIncidentIntro: 'We delen een belangrijke update over een gecontroleerde dienst.',
    statusRecoveryIntro: 'Een dienst die eerder problemen had, is weer beschikbaar.',
    statusCurrent: 'HUIDIGE STATUS',
    statusOverview: 'ALLE VIJF SYSTEMEN',
    statusButton: 'Bekijk live status',
    statusUnsubscribe: 'Afmelden voor statusmails',
    statusFooter: 'Een duidelijk signaal wanneer het telt.',
    confirmationSubject: 'Bevestig je Make It So-statusmeldingen',
    confirmation: (url) => `Bevestig je aanmelding voor e-mails over storingen en herstel bij Make It So via deze link:\n\n${url}\n\nHeb je deze updates niet aangevraagd? Dan mag je deze e-mail negeren.`,
    confirmKicker: 'STATUSMELDINGEN',
    confirmTitle: 'Blijf op de hoogte.',
    confirmHeaderIntro: 'Bevestig één keer en je bent klaar.',
    confirmIntro: 'Bevestig je e-mailadres om statusupdates over storingen en herstel van Make It So te ontvangen.',
    confirmButton: 'Bevestig aanmelding',
    confirmIgnore: 'Heb je deze updates niet aangevraagd? Dan mag je deze e-mail veilig negeren.',
    confirmFooter: 'Jij bepaalt welke updates je ontvangt.'
  },
  fr: {
    inviteSubject: 'Invitation à votre portail client Make It So',
    invite: (name, company, url) => `Bonjour ${name},\n\n${company} vous invite sur le portail client Make It So. Utilisez le lien sécurisé ci-dessous pour définir un mot de passe et consulter vos projets, devis et factures. Ce lien expire dans 7 jours.\n\n${url}\n\nSi vous n’attendiez pas cette invitation, vous pouvez ignorer cet e-mail.\n\nMake It So`,
    inviteKicker: 'VOTRE PORTAIL CLIENT',
    inviteTitle: 'Votre projet a un nouvel espace.',
    inviteHeaderIntro: 'Votre invitation sécurisée est prête.',
    inviteIntro: (company) => `${company} vous invite à suivre votre projet avec Make It So.`,
    inviteAccess: 'Un espace sécurisé pour suivre le projet, les actualités, les devis et les factures.',
    inviteButton: 'Configurer votre accès',
    inviteExpiry: 'Votre lien d’invitation personnel est valable 7 jours.',
    inviteIgnore: 'Si vous n’attendiez pas cette invitation, vous pouvez l’ignorer.',
    inviteFooter: 'Votre prochaine étape commence ici.',
    projectSubject: (project) => `Mise à jour du projet : ${project}`,
    project: (name, project, item, detail) => `Bonjour ${name},\n\nUne mise à jour concerne votre projet Make It So « ${project} » :\n${item ? `${item}\n` : ''}\n${detail}\n\nConnectez-vous au portail client pour consulter les dernières informations.\n\nMake It So`,
    projectKicker: 'JOURNAL DE PROJET · ACTUALITÉ',
    projectTitle: 'Votre projet avance.',
    projectIntro: (project) => `Une nouvelle actualité concerne ${project}.`,
    projectPhase: 'ÉTAPE DU PROJET',
    projectMilestone: 'JALON',
    projectButton: 'Voir le projet',
    projectSignoff: 'Les dernières informations sont disponibles dans votre portail client.',
    projectGreeting: 'Voici les dernières nouvelles de votre projet.',
    projectFooter: 'Toutes les actualités du projet au même endroit.',
    statusSubject: (service, recovered) => `${service} : ${recovered ? 'service rétabli' : 'mise à jour du service'}`,
    status: (service, status, unsubscribeUrl, report = []) => `Le statut de ${service} a changé : ${status}.\n\n${report.length ? `État des cinq services :\n${report.map((entry) => `- ${entry.service} : ${entry.status}`).join('\n')}\n\n` : ''}Consultez l’état actuel des services sur https://makeitso.studio/status/.\n\nPour ne plus recevoir ces e-mails, utilisez ce lien : ${unsubscribeUrl}`,
    statusIncidentKicker: 'ÉTAT DU SERVICE · ALERTE',
    statusRecoveryKicker: 'ÉTAT DU SERVICE · RÉTABLI',
    statusIncidentTitle: 'Un service nécessite votre attention.',
    statusRecoveryTitle: 'Tout est rentré dans l’ordre.',
    statusIncidentIntro: 'Nous vous informons d’un changement important concernant un service suivi.',
    statusRecoveryIntro: 'Un service précédemment perturbé est de nouveau disponible.',
    statusCurrent: 'ÉTAT ACTUEL',
    statusOverview: 'LES CINQ SYSTÈMES',
    statusButton: 'Voir l’état en direct',
    statusUnsubscribe: 'Se désabonner des alertes',
    statusFooter: 'Un signal clair au bon moment.',
    confirmationSubject: 'Confirmez votre abonnement aux alertes Make It So',
    confirmation: (url) => `Confirmez votre abonnement aux e-mails de panne et de rétablissement des services Make It So en ouvrant ce lien :\n\n${url}\n\nSi vous n’avez pas demandé ces alertes, ignorez cet e-mail.`,
    confirmKicker: 'ALERTES DE SERVICE',
    confirmTitle: 'Restez informé.',
    confirmHeaderIntro: 'Une dernière confirmation et c’est fait.',
    confirmIntro: 'Confirmez votre adresse e-mail pour recevoir les alertes de panne et de rétablissement de Make It So.',
    confirmButton: 'Confirmer l’abonnement',
    confirmIgnore: 'Si vous n’avez pas demandé ces alertes, vous pouvez ignorer cet e-mail.',
    confirmFooter: 'Vous gardez le contrôle de vos alertes.'
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

const safeEmailUrl = (value) => {
  const url = new URL(value);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Email links must use HTTP or HTTPS.');
  return escapeHtml(url.href);
};

function emailFrame({ language, kicker, title, intro, content, accent = '#0b3bff', preheader = intro, footer }) {
  return `<!doctype html>
<html lang="${escapeHtml(language)}">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
  <body style="margin:0;padding:0;background-color:#eef1f8;font-family:Arial,Helvetica,sans-serif;color:#10172f;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#eef1f8;">
      <tr><td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">
          <tr><td style="padding:0 0 14px;color:#07103a;font-size:13px;font-weight:bold;letter-spacing:2px;">MAKE IT SO <span style="color:${accent};">/</span> CREATIVE STUDIO</td></tr>
          <tr><td style="background-color:#07103a;border-top:5px solid ${accent};border-radius:18px 18px 0 0;padding:32px 36px;color:#ffffff;">
            <div style="display:inline-block;margin:0 0 18px;padding:7px 11px;border-radius:5px;background-color:${accent};color:#07103a;font-size:10px;font-weight:bold;letter-spacing:1.5px;">${escapeHtml(kicker)}</div>
            <h1 style="margin:0 0 12px;font-size:29px;line-height:1.2;color:#ffffff;">${escapeHtml(title)}</h1>
            <p style="margin:0;color:#c7d0ef;font-size:15px;line-height:1.7;">${escapeHtml(intro)}</p>
          </td></tr>
          <tr><td style="padding:28px 36px;background-color:#ffffff;">${content}</td></tr>
          <tr><td style="padding:20px 24px;border-radius:0 0 18px 18px;background-color:#ffffff;border-top:1px solid #e5e9f2;color:#68718a;font-size:12px;line-height:1.6;">
            ${escapeHtml(footer)}<br>
            <a href="https://makeitso.studio/" style="color:#0b3bff;text-decoration:none;">makeitso.studio</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function emailButton(url, label, accent = '#0b3bff', foreground = '#ffffff') {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
    <td align="center" style="border-radius:8px;background-color:${accent};">
      <a href="${safeEmailUrl(url)}" style="display:inline-block;padding:14px 20px;color:${foreground};font-size:14px;font-weight:bold;text-decoration:none;">${escapeHtml(label)} &rarr;</a>
    </td>
  </tr></table>`;
}

function invitationEmailHtml({ name, company, url, language }) {
  const text = languageCopy(language);
  const content = `<p style="margin:0 0 18px;color:#10172f;font-size:16px;font-weight:bold;">${escapeHtml(name)}</p>
    <p style="margin:0 0 12px;color:#10172f;font-size:15px;line-height:1.7;">${escapeHtml(text.inviteIntro(company))}</p>
    <p style="margin:0 0 24px;color:#68718a;font-size:14px;line-height:1.7;">${escapeHtml(text.inviteAccess)}</p>
    ${emailButton(url, text.inviteButton, '#ff6a1f', '#07103a')}
    <p style="margin:20px 0 0;color:#68718a;font-size:12px;line-height:1.6;">${escapeHtml(text.inviteExpiry)}<br>${escapeHtml(text.inviteIgnore)}</p>`;
  return emailFrame({
    language,
    kicker: text.inviteKicker,
    title: text.inviteTitle,
    intro: text.inviteHeaderIntro,
    content,
    accent: '#ff6a1f',
    preheader: text.inviteAccess,
    footer: text.inviteFooter
  });
}

function projectUpdateEmailHtml({ name, project, item, detail, language }) {
  const text = languageCopy(language);
  const itemLabel = item ? text.projectMilestone : text.projectPhase;
  const accent = '#4de4ff';
  const content = `<p style="margin:0 0 4px;color:#10172f;font-size:15px;font-weight:bold;line-height:1.6;">${escapeHtml(name)}</p>
    <p style="margin:0 0 20px;color:#10172f;font-size:15px;line-height:1.6;">${escapeHtml(text.projectGreeting)}</p>
    <div style="margin:0 0 22px;padding:20px 22px;border-left:4px solid ${accent};border-radius:0 10px 10px 0;background-color:#f3f5fc;">
      <div style="margin-bottom:8px;color:#68718a;font-size:10px;font-weight:bold;letter-spacing:1.4px;">${escapeHtml(itemLabel)}</div>
      ${item ? `<div style="margin-bottom:8px;color:#10172f;font-size:17px;font-weight:bold;line-height:1.45;">${escapeHtml(item)}</div>` : ''}
      <div style="color:#10172f;font-size:15px;line-height:1.6;">${escapeHtml(project)}</div>
      <div style="margin-top:10px;color:#0b3bff;font-size:14px;font-weight:bold;line-height:1.6;">${escapeHtml(detail)}</div>
    </div>
    ${emailButton('https://makeitso.studio/portal/', text.projectButton)}
    <p style="margin:18px 0 0;color:#68718a;font-size:12px;line-height:1.6;">${escapeHtml(text.projectSignoff)}</p>`;
  return emailFrame({
    language,
    kicker: text.projectKicker,
    title: text.projectTitle,
    intro: text.projectIntro(project),
    content,
    accent,
    preheader: `${itemLabel}: ${item || detail}`,
    footer: text.projectFooter
  });
}

function statusUpdateEmailHtml({ service, status, recovered, unsubscribeUrl, language, report = [] }) {
  const text = languageCopy(language);
  const accent = recovered ? '#36f1b6' : '#ff6a1f';
  const reportMarkup = report.length
    ? `<div style="margin:0 0 22px;">
        <div style="margin-bottom:10px;color:#68718a;font-size:10px;font-weight:bold;letter-spacing:1.4px;">${escapeHtml(text.statusOverview)}</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e5e9f2;border-radius:10px;border-collapse:separate;border-spacing:0;overflow:hidden;">
          ${report.map((entry, index) => {
            const statusColor = entry.statusCode === 'operational' ? '#16794b'
              : entry.statusCode === 'degraded' || entry.statusCode === 'outage' ? '#b04416'
                : entry.statusCode === 'maintenance' ? '#6848a8' : '#68718a';
            const statusBackground = entry.statusCode === 'operational' ? '#eaf7f0'
              : entry.statusCode === 'degraded' || entry.statusCode === 'outage' ? '#fff1e9'
                : entry.statusCode === 'maintenance' ? '#f2edfb' : '#eef1f8';
            const border = index === report.length - 1 ? '0' : '1px solid #e5e9f2';
            return `<tr>
              <td style="padding:11px 12px;border-bottom:${border};color:#10172f;font-size:13px;line-height:1.5;">${escapeHtml(entry.service)}</td>
              <td align="right" style="padding:11px 12px;border-bottom:${border};">
                <span style="display:inline-block;padding:5px 8px;border-radius:20px;background-color:${statusBackground};color:${statusColor};font-size:11px;font-weight:bold;line-height:1.2;">${escapeHtml(entry.status)}</span>
              </td>
            </tr>`;
          }).join('')}
        </table>
      </div>`
    : '';
  const content = `<div style="margin:0 0 22px;padding:18px 20px;border-left:4px solid ${accent};border-radius:0 10px 10px 0;background-color:#f3f5fc;">
      <div style="margin-bottom:7px;color:#68718a;font-size:10px;font-weight:bold;letter-spacing:1.4px;">${escapeHtml(text.statusCurrent)}</div>
      <div style="margin-bottom:8px;color:#10172f;font-size:18px;font-weight:bold;line-height:1.45;">${escapeHtml(service)}</div>
      <div style="color:#10172f;font-size:15px;line-height:1.6;">${escapeHtml(status)}</div>
    </div>
    ${reportMarkup}
    ${emailButton('https://makeitso.studio/status/', text.statusButton, recovered ? '#36f1b6' : '#0b3bff', recovered ? '#07103a' : '#ffffff')}
    <p style="margin:22px 0 0;font-size:12px;line-height:1.6;"><a href="${safeEmailUrl(unsubscribeUrl)}" style="color:#68718a;text-decoration:underline;">${escapeHtml(text.statusUnsubscribe)}</a></p>`;
  return emailFrame({
    language,
    kicker: recovered ? text.statusRecoveryKicker : text.statusIncidentKicker,
    title: recovered ? text.statusRecoveryTitle : text.statusIncidentTitle,
    intro: recovered ? text.statusRecoveryIntro : text.statusIncidentIntro,
    content,
    accent,
    preheader: `${service}: ${status}`,
    footer: text.statusFooter
  });
}

function statusConfirmationEmailHtml({ url, language }) {
  const text = languageCopy(language);
  const content = `<p style="margin:0 0 24px;color:#10172f;font-size:15px;line-height:1.7;">${escapeHtml(text.confirmIntro)}</p>
    ${emailButton(url, text.confirmButton)}
    <p style="margin:20px 0 0;color:#68718a;font-size:12px;line-height:1.6;">${escapeHtml(text.confirmIgnore)}</p>`;
  return emailFrame({
    language,
    kicker: text.confirmKicker,
    title: text.confirmTitle,
    intro: text.confirmHeaderIntro,
    content,
    accent: '#b9a4ff',
    preheader: text.confirmIntro,
    footer: text.confirmFooter
  });
}

const projectStatuses = {
  en: { discovery: 'Discovery', wireframing: 'Wireframing', development: 'Development', review: 'Review', launched: 'Launched', on_hold: 'On hold', todo: 'To do', doing: 'In progress', done: 'Done' },
  nl: { discovery: 'Verkenning', wireframing: 'Wireframes', development: 'Ontwikkeling', review: 'Review', launched: 'Gelanceerd', on_hold: 'On hold', todo: 'Te doen', doing: 'Bezig', done: 'Afgerond' },
  fr: { discovery: 'Découverte', wireframing: 'Maquettes filaires', development: 'Développement', review: 'Révision', launched: 'Lancé', on_hold: 'En pause', todo: 'À faire', doing: 'En cours', done: 'Terminé' }
};

export function createContactMailer(config, createTransport = nodemailer.createTransport, log = () => {}, fetchImpl = globalThis.fetch) {
  let activeConfig = { ...config };
  let resendConfigured = false;
  let configured = false;
  let transport = null;
  const configure = (next) => {
    transport?.close?.();
    activeConfig = { ...activeConfig, ...next };
    resendConfigured = activeConfig.emailProvider === 'resend'
      ? Boolean(activeConfig.resendApiKey && activeConfig.emailFrom)
      : activeConfig.emailProvider === 'smtp'
        ? false
        : Boolean(activeConfig.resendApiKey && activeConfig.emailFrom);
    configured = resendConfigured || Boolean(activeConfig.smtpHost && activeConfig.smtpUser && activeConfig.smtpPassword && activeConfig.smtpFrom);
    transport = configured && !resendConfigured
      ? createTransport({
        host: activeConfig.smtpHost,
        port: activeConfig.smtpPort,
        secure: activeConfig.smtpSecure,
        auth: { user: activeConfig.smtpUser, pass: activeConfig.smtpPassword },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 10000
      })
      : null;
  };
  configure({});
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
          from: activeConfig.emailFrom,
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
        if (!activeConfig.contactEmail && !message.to) {
          const error = new Error('Email recipient is not configured. Set CONTACT_EMAIL.');
          error.code = 'MAIL_RECIPIENT_MISSING';
          throw error;
        }
        await sendResend(message);
        return;
      }
      throw new Error('Email is not configured. Set RESEND_API_KEY and EMAIL_FROM, or configure SMTP_HOST, SMTP_USER, SMTP_PASSWORD and SMTP_FROM.');
    }
    if (!activeConfig.contactEmail && !message.to) {
      const error = new Error('Email recipient is not configured. Set CONTACT_EMAIL.');
      error.code = 'MAIL_RECIPIENT_MISSING';
      throw error;
    }
    await transport.sendMail({ from: activeConfig.smtpFrom || activeConfig.emailFrom, ...message });
  };
  const isNotificationEnabled = (notification) => activeConfig.notifications?.[notification] !== false;

  return {
    updateConfig(next) {
      configure(next);
      lastVerification = null;
      verificationExpires = 0;
    },
    isEnabled(notification) {
      return isNotificationEnabled(notification);
    },
    async sendTestEmail(recipient) {
      await send({
        to: recipient,
        subject: 'Make It So — test email',
        text: 'Your Make It So admin email settings are working.',
        html: '<div style="background:#f4f6ff;padding:32px;font-family:Arial,sans-serif;color:#07103a"><div style="max-width:560px;margin:auto;background:#fff;border-radius:18px;padding:32px"><p style="color:#0b3bff;font-weight:bold">MAKE IT SO</p><h1 style="font-size:24px">Email settings are working</h1><p>This test confirms that your admin email settings can send messages.</p></div></div>'
      });
    },
    async send(lead) {
      if (!isNotificationEnabled('contactLeads')) return;
      await send({
        to: activeConfig.contactEmail,
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
      if (!isNotificationEnabled('clientInvitations')) return;
      const text = languageCopy(language);
      await send({
        to: email,
        subject: text.inviteSubject,
        text: text.invite(name, company, url),
        html: invitationEmailHtml({ name, company, url, language })
      });
    },
    async sendProjectUpdate({ email, name, project, item, from, to, language }) {
      if (!isNotificationEnabled('projectUpdates')) return;
      const text = languageCopy(language);
      const labels = projectStatuses[language] || projectStatuses.en;
      const detail = `${labels[from] || from} → ${labels[to] || to}`;
      await send({
        to: email,
        subject: text.projectSubject(project),
        text: text.project(name, project, item, detail),
        html: projectUpdateEmailHtml({ name, project, item, detail, language })
      });
    },
    async sendStatusUpdate({ email, service, status, recovered, unsubscribeUrl, language, report = [] }) {
      if (!isNotificationEnabled('statusUpdates')) return;
      const text = languageCopy(language);
      await send({
        to: email,
        subject: text.statusSubject(service, recovered),
        text: text.status(service, status, unsubscribeUrl, report),
        html: statusUpdateEmailHtml({ service, status, recovered, unsubscribeUrl, language, report })
      });
    },
    async sendStatusSubscriptionConfirmation({ email, url, language }) {
      const text = languageCopy(language);
      await send({
        to: email,
        subject: text.confirmationSubject,
        text: text.confirmation(url),
        html: statusConfirmationEmailHtml({ url, language })
      });
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
    get isConfigured() { return configured; }
  };
}

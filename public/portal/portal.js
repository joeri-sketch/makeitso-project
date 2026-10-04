const $ = (selector, root = document) => root.querySelector(selector);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const app = $('#app');
const state = { user: null, overview: null, invoices: [], tickets: [], language: 'en' };
const COPY = {
  en: { portal: 'Client portal', signIn: 'Sign in', email: 'Email', password: 'Password', continue: 'Continue', dashboard: 'Your projects', signOut: 'Sign out', quotes: 'Quotes', milestones: 'Milestones', workItems: 'Current work', updates: 'Project updates', noProjects: 'No active projects yet.', noNotes: 'No shared updates yet.', noQuotes: 'No quotes yet.', progress: 'Progress', next: 'Next step', target: 'Target date', accept: 'Accept quote', decline: 'Decline quote', decision: 'Your decision', valid: 'Valid until', invitation: 'Set up your client account', setPassword: 'Create password', activate: 'Activate account', passwordHelp: 'Use at least 12 characters.', invitationBad: 'This invitation is invalid or expired. Ask your contact for a new one.', admin: 'This is an admin account. Go to the admin area.', quote: 'Quote', subtotal: 'Subtotal', vat: 'VAT', total: 'Total', response: 'Message (optional)', noMilestones: 'No milestones yet.', status: 'Status', description: 'Description', tax: 'VAT', terms: 'Terms', error: 'Something went wrong.', invoices: 'Invoices', noInvoices: 'No invoices yet.', downloadPdf: 'Download PDF', due: 'Due', balance: 'Balance due', tickets: 'Support', noTickets: 'No support tickets yet.', newTicket: 'Create a support ticket', subject: 'Subject', message: 'Message', send: 'Send', reply: 'Reply', closed: 'This ticket is closed.', priority: 'Priority', feedbackNeeded: 'Feedback needed', noMessages: 'No messages yet.', addMessage: 'Add a message', sendMessage: 'Send message', you: 'You', studio: 'Make It So', workDescription: 'Feature details', testSite: 'Test site', testSiteReady: 'A preview is ready for you to explore.', testSitePending: 'Your preview link will appear here when it is ready to share.', openTestSite: 'Open test site', projectConversation: 'Project conversation', projectConversationIntro: 'Questions or feedback? Keep the conversation with the studio here.', featureLabel: 'Feature', sendProjectMessage: 'Send message' },
  nl: { portal: 'Klantportaal', signIn: 'Inloggen', email: 'E-mail', password: 'Wachtwoord', continue: 'Doorgaan', dashboard: 'Jouw projecten', signOut: 'Uitloggen', quotes: 'Offertes', milestones: 'Mijlpalen', workItems: 'Huidig werk', updates: 'Projectupdates', noProjects: 'Nog geen actieve projecten.', noNotes: 'Nog geen gedeelde updates.', noQuotes: 'Nog geen offertes.', progress: 'Voortgang', next: 'Volgende stap', target: 'Streefdatum', accept: 'Offerte goedkeuren', decline: 'Offerte afwijzen', decision: 'Jouw beslissing', valid: 'Geldig tot', invitation: 'Stel je klantaccount in', setPassword: 'Wachtwoord aanmaken', activate: 'Account activeren', passwordHelp: 'Gebruik minstens 12 tekens.', invitationBad: 'Deze uitnodiging is ongeldig of verlopen. Vraag een nieuwe aan.', admin: 'Dit is een beheerdersaccount. Ga naar de beheeromgeving.', quote: 'Offerte', subtotal: 'Subtotaal', vat: 'BTW', total: 'Totaal', response: 'Bericht (optioneel)', noMilestones: 'Nog geen mijlpalen.', status: 'Status', description: 'Omschrijving', tax: 'btw', terms: 'Voorwaarden', error: 'Er is iets misgegaan.', invoices: 'Facturen', noInvoices: 'Nog geen facturen.', downloadPdf: 'Download PDF', due: 'Vervaldatum', balance: 'Openstaand', tickets: 'Ondersteuning', noTickets: 'Nog geen supporttickets.', newTicket: 'Nieuw supportticket', subject: 'Onderwerp', message: 'Bericht', send: 'Versturen', reply: 'Antwoorden', closed: 'Dit ticket is gesloten.', priority: 'Prioriteit', feedbackNeeded: 'Feedback gevraagd', noMessages: 'Nog geen berichten.', addMessage: 'Bericht toevoegen', sendMessage: 'Bericht versturen', you: 'Jij', studio: 'Make It So', workDescription: 'Functieomschrijving', testSite: 'Testomgeving', testSiteReady: 'Er staat een preview voor je klaar.', testSitePending: 'De link naar je preview verschijnt hier zodra die klaar is om te delen.', openTestSite: 'Open testomgeving', projectConversation: 'Projectgesprek', projectConversationIntro: 'Vragen of feedback? Bespreek ze hier met de studio.', featureLabel: 'Functie', sendProjectMessage: 'Bericht versturen' },
  fr: { portal: 'Espace client', signIn: 'Connexion', email: 'E-mail', password: 'Mot de passe', continue: 'Continuer', dashboard: 'Vos projets', signOut: 'Déconnexion', quotes: 'Devis', milestones: 'Étapes', workItems: 'Travaux en cours', updates: 'Actualités du projet', noProjects: 'Aucun projet actif pour le moment.', noNotes: 'Aucune actualité partagée.', noQuotes: 'Aucun devis pour le moment.', progress: 'Progression', next: 'Prochaine étape', target: 'Date cible', accept: 'Accepter le devis', decline: 'Refuser le devis', decision: 'Votre décision', valid: 'Valable jusqu’au', invitation: 'Créer votre compte client', setPassword: 'Créer un mot de passe', activate: 'Activer le compte', passwordHelp: 'Utilisez au moins 12 caractères.', invitationBad: 'Cette invitation est invalide ou expirée. Demandez-en une nouvelle.', admin: 'Ce compte est un compte administrateur. Accédez à l’administration.', quote: 'Devis', subtotal: 'Sous-total', vat: 'TVA', total: 'Total', response: 'Message (facultatif)', noMilestones: 'Aucune étape pour le moment.', status: 'Statut', description: 'Description', tax: 'TVA', terms: 'Conditions', error: 'Une erreur est survenue.', invoices: 'Factures', noInvoices: 'Aucune facture pour le moment.', downloadPdf: 'Télécharger le PDF', due: 'Échéance', balance: 'Solde dû', tickets: 'Assistance', noTickets: 'Aucun ticket pour le moment.', newTicket: 'Créer un ticket d’assistance', subject: 'Sujet', message: 'Message', send: 'Envoyer', reply: 'Répondre', closed: 'Ce ticket est fermé.', priority: 'Priorité', feedbackNeeded: 'Votre retour est attendu', noMessages: 'Aucun message pour le moment.', addMessage: 'Ajouter un message', sendMessage: 'Envoyer le message', you: 'Vous', studio: 'Make It So', workDescription: 'Détails de la fonctionnalité', testSite: 'Site de test', testSiteReady: 'Un aperçu est prêt à être consulté.', testSitePending: 'Le lien de prévisualisation apparaîtra ici dès qu’il pourra être partagé.', openTestSite: 'Ouvrir le site de test', projectConversation: 'Conversation du projet', projectConversationIntro: 'Une question ou un retour ? Échangez ici avec le studio.', featureLabel: 'Fonctionnalité', sendProjectMessage: 'Envoyer le message' }
};
Object.assign(COPY.en, {
  statusIntro: 'A clear overview of what is complete, what is in progress and what comes next.',
  lastUpdated: 'Last updated', started: 'Started', overallProgress: 'Overall progress',
  projectNote: 'Project note', noBlockers: 'No blockers', blockers: 'Blockers',
  nextMilestone: 'Next milestone', activeCount: 'active', path: 'Project path',
  featureOverview: 'Feature overview', featureCount: 'features tracked',
  activeWork: 'Where we are working', upcoming: 'Up next', noWork: 'No shared work items yet.',
  noPath: 'Milestones will appear here when they are added.',
  latestUpdates: 'Latest updates', noMessages: 'No messages yet.',
  discussion: 'Discussion', discuss: 'Discuss this feature', featureStatus: 'Feature status',
  projectStatus: 'Project status', invoicesTitle: 'Your invoices and project details'
});
Object.assign(COPY.nl, {
  statusIntro: 'Een helder overzicht van wat klaar is, waar we aan werken en wat er hierna komt.',
  lastUpdated: 'Laatst bijgewerkt', started: 'Gestart', overallProgress: 'Totale voortgang',
  projectNote: 'Projectnotitie', noBlockers: 'Geen blokkades', blockers: 'Blokkades',
  nextMilestone: 'Volgende mijlpaal', activeCount: 'actief', path: 'Projectpad',
  featureOverview: 'Functieoverzicht', featureCount: 'functies opgevolgd',
  activeWork: 'Waar we aan werken', upcoming: 'Hierna', noWork: 'Nog geen gedeelde werkitems.',
  noPath: 'Mijlpalen verschijnen hier zodra ze zijn toegevoegd.',
  latestUpdates: 'Laatste updates', discussion: 'Gesprek', discuss: 'Bespreek deze functie',
  featureStatus: 'Functiestatus', projectStatus: 'Projectstatus', invoicesTitle: 'Facturen en projectgegevens'
});
Object.assign(COPY.fr, {
  statusIntro: 'Un aperçu clair de ce qui est terminé, en cours et de la prochaine étape.',
  lastUpdated: 'Dernière mise à jour', started: 'Début', overallProgress: 'Progression totale',
  projectNote: 'Note du projet', noBlockers: 'Aucun blocage', blockers: 'Blocages',
  nextMilestone: 'Prochaine étape', activeCount: 'actif(s)', path: 'Parcours du projet',
  featureOverview: 'Aperçu des fonctionnalités', featureCount: 'fonctionnalités suivies',
  activeWork: 'Travail en cours', upcoming: 'À suivre', noWork: 'Aucun élément partagé pour le moment.',
  noPath: 'Les étapes apparaîtront ici lorsqu’elles seront ajoutées.',
  latestUpdates: 'Dernières actualités', discussion: 'Discussion', discuss: 'Discuter de cette fonctionnalité',
  featureStatus: 'Statut de la fonctionnalité', projectStatus: 'Statut du projet', invoicesTitle: 'Factures et détails du projet'
});
const t = (key) => COPY[state.language]?.[key] || COPY.en[key] || key;
const STATUS = {
  en: { discovery: 'Discovery', wireframing: 'Wireframes', development: 'In progress', review: 'In review', launched: 'Launched', on_hold: 'On hold', todo: 'Up next', doing: 'In progress', in_progress: 'In progress', in_review: 'In review', blocked: 'Blocked', done: 'Done', sent: 'Sent', accepted: 'Accepted', declined: 'Declined', expired: 'Expired' },
  nl: { discovery: 'Verkenning', wireframing: 'Wireframes', development: 'Ontwikkeling', review: 'Review', launched: 'Gelanceerd', on_hold: 'On hold', todo: 'Te doen', doing: 'Bezig', in_progress: 'Bezig', in_review: 'Ter controle', blocked: 'Geblokkeerd', done: 'Klaar', sent: 'Verzonden', accepted: 'Goedgekeurd', declined: 'Afgewezen', expired: 'Verlopen' },
  fr: { discovery: 'Découverte', wireframing: 'Maquettes', development: 'Développement', review: 'Révision', launched: 'Lancé', on_hold: 'En pause', todo: 'À faire', doing: 'En cours', in_progress: 'En cours', in_review: 'À vérifier', blocked: 'Bloqué', done: 'Terminé', sent: 'Envoyé', accepted: 'Accepté', declined: 'Refusé', expired: 'Expiré' }
};

async function api(method, path, body) {
  const response = await fetch(`/api${path}`, {
    method, credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'makeitso' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  let data = null;
  try { data = await response.json(); } catch { /* Non-JSON response. */ }
  if (!response.ok) throw new Error(data?.error || `${t('error')} (${response.status})`);
  return data;
}

const date = (value) => value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString(state.language) : '—';
const money = (cents) => new Intl.NumberFormat(state.language, { style: 'currency', currency: 'EUR' }).format(Number(cents) / 100);
const status = (value) => `<span class="chip s-${esc(value)}">${esc(STATUS[state.language]?.[value] || String(value || '').replaceAll('_', ' '))}</span>`;

function brand() {
  return `<a class="brand" href="/"><span>make it so<em>.</em></span></a>`;
}

function showLogin(message = '') {
  app.innerHTML = `<main class="auth"><section class="auth-card">${brand()}<h1>${t('signIn')}</h1><p class="muted">${t('portal')}</p>
    <form id="login"><label class="field">${t('email')}<input type="email" name="email" autocomplete="username" required></label>
      <label class="field">${t('password')}<input type="password" name="password" autocomplete="current-password" required></label>
      <p class="error" role="alert">${esc(message)}</p><button class="btn primary">${t('continue')}</button></form>
    </section></main>`;
  $('#login').onsubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = $('button', form);
    button.disabled = true;
    try {
      const response = await api('POST', '/auth/login', { email: form.email.value, password: form.password.value });
      if (response.user.role !== 'client') {
        await api('POST', '/auth/logout');
        throw new Error(t('admin'));
      }
      state.user = response.user;
      await loadOverview();
    } catch (error) {
      $('.error', form).textContent = error.message;
      button.disabled = false;
    }
  };
}

function showInvitation(token, message = '') {
  app.innerHTML = `<main class="auth"><section class="auth-card">${brand()}<h1>${t('invitation')}</h1>
    <p class="muted">${t('passwordHelp')}</p><form id="activate">
      <label class="field">${t('setPassword')}<input type="password" name="password" minlength="12" maxlength="200" autocomplete="new-password" required></label>
      <p class="error" role="alert">${esc(message)}</p><button class="btn primary">${t('activate')}</button></form></section></main>`;
  $('#activate').onsubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = $('button', form);
    button.disabled = true;
    try {
      const response = await api('POST', '/portal/invitations/accept', { token, password: form.password.value });
      state.user = response.user;
      history.replaceState(null, '', '/portal/');
      await loadOverview();
    } catch (error) {
      $('.error', form).textContent = error.message || t('invitationBad');
      button.disabled = false;
    }
  };
}

async function loadOverview() {
  const [data, invoiceData, ticketData] = await Promise.all([
    api('GET', '/portal/overview'),
    api('GET', '/portal/invoices'),
    api('GET', '/portal/tickets')
  ]);
  state.overview = data;
  state.invoices = invoiceData.invoices;
  state.tickets = ticketData.tickets;
  state.language = ['nl', 'fr', 'en'].includes(data.client.language) ? data.client.language : 'en';
  renderDashboard();
}

function renderDashboard() {
  const data = state.overview;
  const projects = data.projects.length
    ? data.projects.map((project) => {
      const projectId = Number(project.id);
      const milestones = data.milestones.filter((milestone) => Number(milestone.project_id) === projectId);
      const workItems = data.work_items.filter((item) => Number(item.project_id) === projectId);
      const updates = data.notes.filter((note) => Number(note.project_id) === projectId);
      const activeItems = workItems.filter((item) => item.status !== 'done');
      const feedbackItems = workItems.filter((item) => item.status === 'in_review');
      const blockers = workItems.filter((item) => item.status === 'blocked');
      const messages = data.project_messages.filter((message) => Number(message.project_id) === projectId);
      const nextMilestone = milestones.find((milestone) => milestone.status !== 'done');
      const nextStep = project.next_step || nextMilestone?.title || t('noPath');
      const progress = Math.max(0, Math.min(100, Number(project.progress) || 0));
      const timeline = milestones.length
        ? `<ol class="status-timeline">${milestones.map((milestone) => `<li class="timeline-step ${milestone.status === 'done' ? 'is-done' : milestone === nextMilestone ? 'is-current' : ''}">
            <span class="timeline-marker" aria-hidden="true">${milestone.status === 'done' ? '✓' : ''}</span>
            <strong>${esc(milestone.title)}</strong>
            <small>${milestone.due_date ? date(milestone.due_date) : esc(STATUS[state.language]?.[milestone.status] || milestone.status)}</small>
          </li>`).join('')}</ol>`
        : `<p class="empty">${t('noPath')}</p>`;
      const workList = activeItems.length
        ? `<ul class="status-work-list">${activeItems.map((item) => `<li>
            <span class="work-status-dot dot-${esc(item.status)}" aria-hidden="true">${item.status === 'blocked' ? '!' : item.status === 'in_review' ? '◉' : '•'}</span>
            <span class="grow"><strong>${esc(item.title)}</strong>${item.description ? `<span class="sub">${esc(item.description)}</span>` : ''}</span>
            ${status(item.status)}
          </li>`).join('')}</ul>`
        : `<p class="empty">${workItems.length ? t('noWork') : t('noWork')}</p>`;
      const features = workItems.length
        ? workItems.map((item, index) => `<article class="feature-card feature-${esc(item.status)}">
            <span class="feature-number">${String(index + 1).padStart(2, '0')}</span>
            <div class="feature-heading"><h3>${esc(item.title)}</h3>${status(item.status)}</div>
            <p class="feature-description">${item.description ? esc(item.description) : '—'}</p>
            ${item.due_date ? `<p class="feature-due">${t('due')}: ${date(item.due_date)}</p>` : ''}
            ${item.status === 'in_review' ? `<p class="feature-review">${t('feedbackNeeded')}</p>` : ''}
          </article>`).join('')
        : `<p class="empty">${t('noWork')}</p>`;
      const conversation = `<section class="project-conversation-card">
          <header class="status-section-heading"><div><span class="eyebrow">${t('projectStatus')}</span><h3>${t('projectConversation')}</h3><p>${t('projectConversationIntro')}</p></div></header>
          <div class="project-thread">${messages.length ? messages.map((message) => `<article class="work-message ${message.author_role === 'client' ? 'from-client' : 'from-studio'}"><p>${esc(message.body)}</p><small>${esc(message.author_role === 'client' ? t('you') : (message.author_name || t('studio')))}${message.work_item_title ? ` · ${t('featureLabel')}: ${esc(message.work_item_title)}` : ''} · ${date(message.created_at)}</small></article>`).join('') : `<p class="muted">${t('noMessages')}</p>`}</div>
          <form class="project-message-form" data-project-message="${esc(project.id)}"><label class="field">${t('addMessage')}<textarea name="body" maxlength="5000" required></textarea></label><p class="error" role="alert"></p><button class="btn small primary">${t('sendProjectMessage')}</button></form>
        </section>`;
      const latestUpdate = updates[0];
      return `<article class="status-project">
        <header class="status-project-heading">
          <div><p class="eyebrow">${t('projectStatus')} · ${esc(project.category || t('portal'))}</p>
            <h2>${esc(project.name)}</h2><p>${t('statusIntro')}</p></div>
          <p class="updated-stamp">${t('lastUpdated')} <strong>${date(project.updated_at)}</strong></p>
        </header>
        <div class="status-summary-grid">
          <section class="status-progress-card">
            <div class="status-progress-head"><div><span class="status-eyebrow">${t('overallProgress')}</span><h3>${esc(project.name)}</h3></div><strong class="progress-value">${progress}%</strong></div>
            <div class="status-progress-track" role="progressbar" aria-label="${t('overallProgress')}" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"><span style="width:${progress}%"></span></div>
            <div class="status-progress-dates"><span>${t('started')} · ${date(project.created_at)}</span><span>${t('target')} · ${date(project.target_date)}</span></div>
          </section>
          <section class="status-context-card">
            <span class="eyebrow">${t('projectNote')}</span><h3>${latestUpdate ? t('latestUpdates') : t('projectNote')}</h3>
            <span class="context-health ${blockers.length ? 'has-blockers' : ''}"><i></i>${blockers.length ? `${blockers.length} ${t('blockers')}` : t('noBlockers')}</span>
            ${latestUpdate ? `<p class="context-update">${esc(latestUpdate.body)}</p><small>${esc(latestUpdate.author_name || t('studio'))} · ${date(latestUpdate.created_at)}</small>` : `<p class="context-update">${esc(project.next_step || t('noNotes'))}</p>`}
            <div class="next-step-box"><strong>${t('nextMilestone')}</strong><span>${esc(nextStep)}</span></div>
          </section>
        </div>
        <section class="test-site-panel">
          <div class="test-site-icon" aria-hidden="true">↗</div>
          <div class="test-site-copy"><span class="eyebrow">${t('testSite')}</span><p>${project.preview_url ? t('testSiteReady') : t('testSitePending')}</p></div>
          ${project.preview_url ? `<a class="test-site-link" href="${esc(project.preview_url)}" target="_blank" rel="noopener noreferrer">${t('openTestSite')} <span aria-hidden="true">↗</span></a>` : ''}
        </section>
        <div class="status-work-grid">
          <section class="status-panel active-work-panel">
            <header class="status-section-heading"><h3>${t('activeWork')}</h3><span class="eyebrow">${activeItems.length} ${t('activeCount')}</span></header>
            ${workList}
          </section>
          <section class="status-panel milestone-panel">
            <header class="status-section-heading"><h3>${t('milestones')}</h3><span class="eyebrow">${t('path')}</span></header>
            ${timeline}
            ${feedbackItems.length ? `<div class="client-action"><strong>${t('feedbackNeeded')}</strong><span>${feedbackItems.map((item) => esc(item.title)).join(' · ')}</span></div>` : ''}
          </section>
        </div>
        <section class="feature-overview">
          <header class="status-section-heading"><div><span class="eyebrow">${t('projectStatus')}</span><h3>${t('featureOverview')}</h3></div><span class="eyebrow">${workItems.length} ${t('featureCount')}</span></header>
          <div class="feature-grid">${features}</div>
        </section>
        ${conversation}
        ${updates.length > 1 ? `<section class="project-updates"><header class="status-section-heading"><h3>${t('latestUpdates')}</h3></header>${updates.slice(1).map((note) => `<article class="note"><p>${esc(note.body)}</p><small>${esc(note.author_name || t('studio'))} · ${date(note.created_at)}</small></article>`).join('')}</section>` : ''}
      </article>`;
    }).join('')
    : `<p class="empty">${t('noProjects')}</p>`;
  const quotes = data.quotes.length
    ? `<ul class="list">${data.quotes.map((quote) => `<li><span class="grow"><strong>${esc(quote.quote_number)}</strong> · ${esc(quote.title)}<span class="sub">${t('valid')}: ${date(quote.valid_until)} · ${esc(quote.total)}</span></span>${status(quote.display_status)}<a class="btn small" href="#quote-${esc(quote.id)}">${t('quote')}</a></li>`).join('')}</ul>`
    : `<p class="empty">${t('noQuotes')}</p>`;
  const notes = data.notes.length
    ? data.notes.map((note) => `<article class="note"><p>${esc(note.body)}</p><small>${esc(note.project_name || data.client.company_name)} · ${esc(note.author_name || 'Make It So')} · ${date(note.created_at)}</small></article>`).join('')
    : `<p class="empty">${t('noNotes')}</p>`;
  const invoices = state.invoices.length
    ? `<ul class="list">${state.invoices.map((invoice) => `<li><span class="grow"><strong>${esc(invoice.invoice_number)}</strong> · ${esc(invoice.title)}<span class="sub">${t('due')}: ${date(invoice.due_date)} · ${t('balance')}: ${money(invoice.balance_cents)}</span></span>${status(invoice.display_status)}<a class="btn small" href="/api/portal/invoices/${esc(invoice.id)}/pdf">${t('downloadPdf')}</a></li>`).join('')}</ul>`
    : `<p class="empty">${t('noInvoices')}</p>`;
  const tickets = state.tickets.length
    ? `<ul class="list">${state.tickets.map((ticket) => `<li><span class="grow"><strong>#${esc(ticket.id)} · ${esc(ticket.subject)}</strong><span class="sub">${date(ticket.updated_at)} · ${esc(ticket.message_count)} ${t('message').toLowerCase()}s</span></span>${status(ticket.status)}<a class="btn small" href="#ticket-${esc(ticket.id)}">${t('reply')}</a></li>`).join('')}</ul>`
    : `<p class="empty">${t('noTickets')}</p>`;
  app.innerHTML = `<header class="portal-top"><a class="brand" href="/" aria-label="Make It So home"><span class="brand-mark">✦</span><span>make it so<em>.</em></span></a>
      <nav class="portal-nav" aria-label="${t('portal')}"><a href="#project-status">${t('dashboard')}</a><a href="#portal-billing">${t('quotes')}</a><a href="#portal-support">${t('tickets')}</a></nav>
      <div class="portal-account"><span class="account-initials" aria-hidden="true">${esc(state.user.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase())}</span><span class="account-name">${esc(state.user.name)}</span><button id="logout" class="btn">${t('signOut')}</button></div>
    </header>
    <main class="wrap portal-wrap"><header class="portal-welcome"><div><span class="eyebrow">${t('portal')}</span><h1>${esc(data.client.company_name)}</h1></div></header>
      <section class="status-project-list" id="project-status">${projects}</section>
      <section class="portal-extras" id="portal-billing"><header class="status-section-heading"><div><span class="eyebrow">${t('portal')}</span><h2>${t('invoicesTitle')}</h2></div></header>
        <div class="grid two"><section class="card"><header><h2>${t('quotes')}</h2></header>${quotes}</section>
          <section class="card"><header><h2>${t('invoices')}</h2></header>${invoices}</section>
          <section class="card"><header><h2>${t('updates')}</h2></header>${notes || ''}</section>
          <section class="card" id="portal-support"><header><h2>${t('tickets')}</h2></header>
          <form id="ticket-create" class="stack"><label class="field">${t('subject')}<input name="subject" maxlength="160" required></label>
            <label class="field">${t('message')}<textarea name="message" maxlength="5000" required></textarea></label>
            <p class="error" role="alert"></p><button class="btn primary">${t('newTicket')}</button></form>
          ${tickets}</section></div></section>
      <section id="quote-detail" class="card" hidden style="margin-top:16px"></section>
      <section id="ticket-detail" class="card" hidden style="margin-top:16px"></section>
    </main>`;
  $('#logout').onclick = async () => { await api('POST', '/auth/logout'); location.reload(); };
  $('#ticket-create').onsubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = $('button', form);
    button.disabled = true;
    try {
      const { ticket } = await api('POST', '/portal/tickets', { subject: form.subject.value, message: form.message.value });
      await loadOverview();
      location.hash = `#ticket-${ticket.id}`;
    } catch (error) {
      $('.error', form).textContent = error.message;
      button.disabled = false;
    }
  };
  app.onsubmit = async (event) => {
    const form = event.target.closest('form[data-project-message]');
    if (!form) return;
    event.preventDefault();
    const button = $('button', form);
    button.disabled = true;
    try {
      await api('POST', `/portal/projects/${encodeURIComponent(form.dataset.projectMessage)}/messages`, { body: form.body.value });
      const scrollY = window.scrollY;
      await loadOverview();
      window.scrollTo(0, scrollY);
    } catch (error) {
      $('.error', form).textContent = error.message;
      button.disabled = false;
    }
  };
  app.onclick = handlePortalClick;
  const deepLink = location.hash.match(/^#quote-(\d+)$/);
  if (deepLink) openQuote(deepLink[1]).catch((error) => window.alert(error.message));
  const ticketLink = location.hash.match(/^#ticket-(\d+)$/);
  if (ticketLink) openTicket(ticketLink[1]).catch((error) => window.alert(error.message));
}

async function handlePortalClick(event) {
  const link = event.target.closest('a[href^="#quote-"]');
  if (link) {
    event.preventDefault();
    const quoteId = link.getAttribute('href').slice('#quote-'.length);
    try { await openQuote(quoteId); } catch (error) { window.alert(error.message); }
    return;
  }
  const ticketLink = event.target.closest('a[href^="#ticket-"]');
  if (!ticketLink) return;
  event.preventDefault();
  try { await openTicket(ticketLink.getAttribute('href').slice('#ticket-'.length)); }
  catch (error) { window.alert(error.message); }
}

async function openTicket(ticketId) {
  const { ticket } = await api('GET', `/portal/tickets/${encodeURIComponent(ticketId)}`);
  const panel = $('#ticket-detail');
  panel.hidden = false;
  panel.innerHTML = `<header><div><h2>#${esc(ticket.id)} · ${esc(ticket.subject)}</h2><p class="muted">${t('priority')}: ${esc(ticket.priority)}</p></div>${status(ticket.status)}</header>
    <section class="stack">${ticket.messages.map((message) => `<article class="note"><p>${esc(message.body)}</p><small>${esc(message.author_name || 'Make It So')} · ${date(message.created_at)}</small></article>`).join('')}</section>
    ${ticket.status === 'closed' ? `<p class="notice">${t('closed')}</p>` : `<form id="ticket-reply" class="stack" style="margin-top:16px"><label class="field">${t('message')}<textarea name="message" maxlength="5000" required></textarea></label>
      <p class="error" role="alert"></p><button class="btn primary">${t('reply')}</button></form>`}`;
  $('#ticket-reply', panel)?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = $('button', form);
    button.disabled = true;
    try {
      await api('POST', `/portal/tickets/${encodeURIComponent(ticket.id)}/messages`, { message: form.message.value });
      await loadOverview();
      location.hash = `#ticket-${ticket.id}`;
    } catch (error) {
      $('.error', form).textContent = error.message;
      button.disabled = false;
    }
  });
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function openQuote(quoteId) {
  const { quote } = await api('GET', `/portal/quotes/${encodeURIComponent(quoteId)}`);
  renderQuote(quote);
  $('#quote-detail').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderQuote(quote) {
  const panel = $('#quote-detail');
  const items = quote.items.map((item) => {
    const amount = Math.round(Number(item.quantity) * Number(item.unit_price) * 100);
    const withVat = amount + Math.round(Number(item.quantity) * Number(item.unit_price) * Number(item.vat_rate));
    return `<tr><td>${esc(item.description)}<span class="sub">${esc(item.quantity)} × ${money(Math.round(Number(item.unit_price) * 100))} · ${esc(item.vat_rate)}% ${t('tax')}</span></td><td>${money(withVat)}</td></tr>`;
  }).join('');
  const decision = quote.display_status === 'sent'
    ? `<label class="field">${t('response')}<textarea id="quote-note" maxlength="1000"></textarea></label><div class="actions"><button class="btn primary" data-decision="accepted">${t('accept')}</button><button class="btn danger" data-decision="declined">${t('decline')}</button></div>`
    : `<p class="notice">${t('decision')}: ${esc(quote.display_status)}</p>`;
  panel.hidden = false;
  panel.innerHTML = `<header><div><h2>${t('quote')} ${esc(quote.quote_number)} · ${esc(quote.title)}</h2><p class="muted">${t('valid')}: ${date(quote.valid_until)}</p></div>${status(quote.display_status)}</header>
    ${quote.introduction ? `<p style="white-space:pre-wrap;margin-bottom:14px">${esc(quote.introduction)}</p>` : ''}
    <div class="table-wrap"><table class="quote-items"><thead><tr><th>${t('description')}</th><th>${t('total')}</th></tr></thead><tbody>${items}</tbody></table></div>
    ${quote.terms ? `<section style="margin:16px 0"><h3>${t('terms')}</h3><p style="white-space:pre-wrap">${esc(quote.terms)}</p></section>` : ''}
    <dl class="details" style="margin:16px 0"><dt>${t('subtotal')}</dt><dd>${esc(quote.subtotal)}</dd><dt>${t('vat')}</dt><dd>${esc(quote.vat)}</dd><dt>${t('total')}</dt><dd><strong>${esc(quote.total)}</strong></dd></dl>
    <div id="quote-actions">${decision}</div>`;
  panel.onclick = async (event) => {
    const button = event.target.closest('[data-decision]');
    if (!button) return;
    button.disabled = true;
    try {
      await api('POST', `/portal/quotes/${encodeURIComponent(quote.id)}/respond`, {
        decision: button.dataset.decision,
        note: $('#quote-note')?.value || ''
      });
      await loadOverview();
      window.location.hash = '';
    } catch (error) {
      window.alert(error.message);
      button.disabled = false;
    }
  };
}

async function boot() {
  const invitation = new URLSearchParams(location.search).get('invite');
  const language = new URLSearchParams(location.search).get('lang');
  if (['nl', 'fr', 'en'].includes(language)) state.language = language;
  if (invitation) {
    showInvitation(invitation);
    return;
  }
  try {
    const { state: auth, user } = await api('GET', '/auth/me');
    if (auth !== 'ok' || !user || user.role !== 'client') {
      if (user?.role === 'admin') {
        app.innerHTML = `<main class="auth"><section class="auth-card">${brand()}<p>${t('admin')}</p><a href="/admin/">Admin area</a></section></main>`;
      } else showLogin();
      return;
    }
    state.user = user;
    await loadOverview();
  } catch {
    showLogin();
  }
}

boot().catch((error) => {
  app.innerHTML = `<main class="auth"><section class="auth-card">${brand()}<p class="error">${esc(error.message || t('error'))}</p><button class="btn" onclick="location.reload()">Try again</button></section></main>`;
});

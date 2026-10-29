import { createMediaPanel, mediaTabLabel } from './media.js';

const $ = (selector, root = document) => root.querySelector(selector);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const app = $('#app');
const state = { user: null, overview: null, invoices: [], tickets: [], contracts: [], language: 'en', activeTab: 'overview' };
let mediaPanel;
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
  projectStatus: 'Project status', invoicesTitle: 'Your invoices and project details',
  projectsTab: 'Projects', quotesTab: 'Quotes', invoicesTab: 'Invoices', supportTab: 'Support'
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
  featureStatus: 'Functiestatus',   projectStatus: 'Projectstatus', invoicesTitle: 'Facturen en projectgegevens',
  projectsTab: 'Projecten', quotesTab: 'Offertes', invoicesTab: 'Facturen', supportTab: 'Ondersteuning'
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
  featureStatus: 'Statut de la fonctionnalité',   projectStatus: 'Statut du projet', invoicesTitle: 'Factures et détails du projet',
  projectsTab: 'Projets', quotesTab: 'Devis', invoicesTab: 'Factures', supportTab: 'Assistance'
});
Object.assign(COPY.en, {
  contracts: 'Contracts', contractsTab: 'Contracts', noContracts: 'No contracts to review yet.',
  contractApprovalNote: 'Portal approval is recorded with your account and timestamp. It is not a qualified electronic signature.',
  approveContract: 'Approve contract', requestChanges: 'Request changes', changeNote: 'Describe the requested changes',
  version: 'Version', decisionRecorded: 'Decision recorded'
});
Object.assign(COPY.nl, {
  contracts: 'Contracten', contractsTab: 'Contracten', noContracts: 'Er staan nog geen contracten klaar om te beoordelen.',
  contractApprovalNote: 'Je akkoord wordt met je account en tijdstip geregistreerd. Dit is geen gekwalificeerde elektronische handtekening.',
  approveContract: 'Contract goedkeuren', requestChanges: 'Wijzigingen vragen', changeNote: 'Beschrijf de gewenste wijzigingen',
  version: 'Versie', decisionRecorded: 'Beslissing geregistreerd'
});
Object.assign(COPY.fr, {
  contracts: 'Contrats', contractsTab: 'Contrats', noContracts: 'Aucun contrat à examiner pour le moment.',
  contractApprovalNote: 'Votre approbation est enregistrée avec votre compte et la date. Il ne s’agit pas d’une signature électronique qualifiée.',
  approveContract: 'Approuver le contrat', requestChanges: 'Demander des modifications', changeNote: 'Décrivez les modifications souhaitées',
  version: 'Version', decisionRecorded: 'Décision enregistrée'
});
Object.assign(COPY.en, {
  loginWelcome: 'Welcome to your workspace',
  loginDescription: 'Follow your projects, services and invoices in one clear place.',
  overviewTab: 'Overview', workspace: 'Workspace', workspaceNav: 'Workspace', welcomeBack: 'Welcome back', workspaceIntro: 'Here is the latest overview of your projects and services.',
  today: 'Today', activeServices: 'active', activeProjects: 'in progress', openInvoices: 'open', servicesTitle: 'Active services',
  serviceSummary: 'Start and renewal dates for your digital services.', projectSummary: 'Your current projects.',
  invoiceSummary: 'Recent invoices and outstanding balances.', viewAll: 'View all', noProjectSummary: 'No projects to show yet.',
  noOpenInvoices: 'No open invoices.', updated: 'Updated', domainService: 'Domain registration',
  hostingService: 'Website server', emailService: 'Business mailboxes', supportTitle: 'Personal support',
  supportIntro: 'Questions about your services? Send us a message.', contactUs: 'Contact us',
  renewalHint: 'Renewal information when scheduled', projectWaiting: 'Waiting to start',
  services: 'Your services', servicesTab: 'Services', noServices: 'No active services are listed yet.',
  serviceType: 'Service', serviceName: 'Name', serviceStatus: 'Status', serviceStarted: 'Started',
  serviceRenewal: 'Next renewal', serviceNotes: 'Notes', noRenewal: 'No renewal scheduled',
  domain: 'Web domain', web_hosting: 'Web hosting / server', email_hosting: 'Email hosting',
  active: 'Active', pending: 'Pending', suspended: 'Suspended', ended: 'Ended'
});
Object.assign(COPY.nl, {
  loginWelcome: 'Welkom in je klantomgeving',
  loginDescription: 'Volg je projecten, diensten en facturen op één overzichtelijke plek.',
  overviewTab: 'Overzicht', workspace: 'Klantomgeving', workspaceNav: 'Werkruimte', welcomeBack: 'Dag', workspaceIntro: 'Dit is de actuele stand van je Make It So-diensten.',
  today: 'Vandaag', activeServices: 'actief', activeProjects: 'lopend', openInvoices: 'open', servicesTitle: 'Actieve diensten',
  serviceSummary: 'Start- en verlengdata van je digitale diensten.', projectSummary: 'Je lopende projecten.',
  invoiceSummary: 'Recente facturen en openstaande bedragen.', viewAll: 'Bekijk alles', noProjectSummary: 'Er zijn nog geen projecten.',
  noOpenInvoices: 'Geen open facturen.', updated: 'Bijgewerkt', domainService: 'Domeinregistratie',
  hostingService: 'Websiteserver', emailService: 'Zakelijke mailboxen', supportTitle: 'Persoonlijke hulp',
  supportIntro: 'Een vraag over je diensten? Stuur ons een bericht.', contactUs: 'Contact opnemen',
  renewalHint: 'Verlengingsinformatie indien gepland', projectWaiting: 'Wacht op start',
  services: 'Jouw diensten', servicesTab: 'Diensten', noServices: 'Er zijn nog geen actieve diensten geregistreerd.',
  serviceType: 'Dienst', serviceName: 'Naam', serviceStatus: 'Status', serviceStarted: 'Gestart',
  serviceRenewal: 'Volgende verlenging', serviceNotes: 'Opmerkingen', noRenewal: 'Geen verlenging gepland',
  domain: 'Webdomein', web_hosting: 'Webhosting / server', email_hosting: 'E-mailhosting',
  active: 'Actief', pending: 'In afwachting', suspended: 'Opgeschort', ended: 'Beëindigd'
});
Object.assign(COPY.fr, {
  loginWelcome: 'Bienvenue dans votre espace',
  loginDescription: 'Suivez vos projets, services et factures au même endroit.',
  overviewTab: 'Aperçu', workspace: 'Espace client', workspaceNav: 'Espace client', welcomeBack: 'Bon retour', workspaceIntro: 'Voici un aperçu récent de vos projets et services.',
  today: 'Aujourd’hui', activeServices: 'actifs', activeProjects: 'en cours', openInvoices: 'ouvertes', servicesTitle: 'Services actifs',
  serviceSummary: 'Dates de début et de renouvellement de vos services.', projectSummary: 'Vos projets en cours.',
  invoiceSummary: 'Factures récentes et soldes à régler.', viewAll: 'Tout afficher', noProjectSummary: 'Aucun projet pour le moment.',
  noOpenInvoices: 'Aucune facture ouverte.', updated: 'Mis à jour', domainService: 'Enregistrement du domaine',
  hostingService: 'Serveur du site', emailService: 'Boîtes e-mail professionnelles', supportTitle: 'Assistance personnelle',
  supportIntro: 'Une question sur vos services ? Envoyez-nous un message.', contactUs: 'Nous contacter',
  renewalHint: 'Détails de renouvellement si prévus', projectWaiting: 'En attente de démarrage',
  services: 'Vos services', servicesTab: 'Services', noServices: 'Aucun service actif n’est encore répertorié.',
  serviceType: 'Service', serviceName: 'Nom', serviceStatus: 'Statut', serviceStarted: 'Début',
  serviceRenewal: 'Prochain renouvellement', serviceNotes: 'Notes', noRenewal: 'Aucun renouvellement prévu',
  domain: 'Domaine web', web_hosting: 'Hébergement web / serveur', email_hosting: 'Hébergement e-mail',
  active: 'Actif', pending: 'En attente', suspended: 'Suspendu', ended: 'Terminé'
});
const t = (key) => COPY[state.language]?.[key] || COPY.en[key] || key;
const STATUS = {
  en: { discovery: 'Discovery', wireframing: 'Wireframes', development: 'In progress', review: 'In review', launched: 'Launched', on_hold: 'On hold', todo: 'Up next', doing: 'In progress', in_progress: 'In progress', in_review: 'In review', blocked: 'Blocked', done: 'Done', sent: 'Sent', issued: 'Issued', paid: 'Paid', overdue: 'Overdue', void: 'Void', accepted: 'Accepted', declined: 'Declined', expired: 'Expired', approved: 'Approved', changes_requested: 'Changes requested', withdrawn: 'Withdrawn', active: 'Active', pending: 'Pending', suspended: 'Suspended', ended: 'Ended' },
  nl: { discovery: 'Verkenning', wireframing: 'Wireframes', development: 'Ontwikkeling', review: 'Review', launched: 'Gelanceerd', on_hold: 'On hold', todo: 'Te doen', doing: 'Bezig', in_progress: 'Bezig', in_review: 'Ter controle', blocked: 'Geblokkeerd', done: 'Klaar', sent: 'Verzonden', issued: 'Verzonden', paid: 'Betaald', overdue: 'Te laat', void: 'Vervallen', accepted: 'Goedgekeurd', declined: 'Afgewezen', expired: 'Verlopen', approved: 'Goedgekeurd', changes_requested: 'Wijzigingen gevraagd', withdrawn: 'Ingetrokken', active: 'Actief', pending: 'In afwachting', suspended: 'Opgeschort', ended: 'Beëindigd' },
  fr: { discovery: 'Découverte', wireframing: 'Maquettes', development: 'Développement', review: 'Révision', launched: 'Lancé', on_hold: 'En pause', todo: 'À faire', doing: 'En cours', in_progress: 'En cours', in_review: 'À vérifier', blocked: 'Bloqué', done: 'Terminé', sent: 'Envoyé', issued: 'Émise', paid: 'Payée', overdue: 'En retard', void: 'Annulée', accepted: 'Accepté', declined: 'Refusé', expired: 'Expiré', approved: 'Approuvé', changes_requested: 'Modifications demandées', withdrawn: 'Retiré', active: 'Actif', pending: 'En attente', suspended: 'Suspendu', ended: 'Terminé' }
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
  mediaPanel?.destroy();
  mediaPanel = null;
  app.innerHTML = `<main class="auth auth-studio"><div class="auth-shell">
    <section class="auth-intro"><span class="eyebrow">${t('portal')}</span><h1>${t('loginWelcome')}</h1><p>${t('loginDescription')}</p>
      <div class="auth-orbit" aria-hidden="true"><span></span><i></i><b></b></div></section>
    <section class="auth-card">${brand()}<div><h2>${t('signIn')}</h2><p class="muted">${t('portal')}</p></div>
    <form id="login"><label class="field">${t('email')}<input type="email" name="email" autocomplete="username" required></label>
      <label class="field">${t('password')}<input type="password" name="password" autocomplete="current-password" required></label>
      <p class="error" role="alert">${esc(message)}</p><button class="btn primary">${t('continue')}</button></form>
    </section></div></main>`;
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
  const [data, invoiceData, ticketData, contractData] = await Promise.all([
    api('GET', '/portal/overview'),
    api('GET', '/portal/invoices'),
    api('GET', '/portal/tickets'),
    api('GET', '/portal/contracts')
  ]);
  state.overview = data;
  state.invoices = invoiceData.invoices;
  state.tickets = ticketData.tickets;
  state.contracts = contractData.contracts;
  state.language = ['nl', 'fr', 'en'].includes(data.client.language) ? data.client.language : 'en';
  renderDashboard();
}

function renderDashboard() {
  mediaPanel?.destroy();
  mediaPanel = null;
  const data = state.overview;
  if (state.activeTab === 'media' && !data.client.media_enabled) state.activeTab = 'overview';
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
    ? `<ul class="list">${data.quotes.map((quote) => `<li><span class="grow"><strong>${esc(quote.quote_number)}</strong> · ${esc(quote.title)}<span class="sub">${t('valid')}: ${date(quote.valid_until)} · ${esc(quote.total)}</span></span>${status(quote.display_status)}<span class="row-actions"><a class="btn small" href="#quote-${esc(quote.id)}">${t('quote')}</a><a class="btn small" href="/api/portal/quotes/${esc(quote.id)}/pdf" download>${t('downloadPdf')}</a></span></li>`).join('')}</ul>`
    : `<p class="empty">${t('noQuotes')}</p>`;
  const notes = data.notes.length
    ? data.notes.map((note) => `<article class="note"><p>${esc(note.body)}</p><small>${esc(note.project_name || data.client.company_name)} · ${esc(note.author_name || 'Make It So')} · ${date(note.created_at)}</small></article>`).join('')
    : `<p class="empty">${t('noNotes')}</p>`;
  const invoices = state.invoices.length
    ? `<ul class="list">${state.invoices.map((invoice) => `<li><span class="grow"><strong>${esc(invoice.invoice_number)}</strong> · ${esc(invoice.title)}<span class="sub">${t('due')}: ${date(invoice.due_date)} · ${t('balance')}: ${money(invoice.balance_cents)}</span></span>${status(invoice.display_status)}<a class="btn small" href="/api/portal/invoices/${esc(invoice.id)}/pdf">${t('downloadPdf')}</a></li>`).join('')}</ul>`
    : `<p class="empty">${t('noInvoices')}</p>`;
  const contracts = state.contracts.length
    ? state.contracts.map((contract) => `<article class="card contract-card">
        <header><div><h3>${esc(contract.title)}</h3><p class="muted">${esc(contract.project_name || data.client.company_name)} · ${t('version')} ${esc(contract.version)}</p></div>${status(contract.status)}</header>
        <p><a class="btn small" href="/api/portal/contracts/${esc(contract.id)}/document" download>${t('downloadPdf')}</a></p>
        ${contract.status === 'sent' ? `<form class="contract-response" data-contract-response="${esc(contract.id)}">
          <p class="muted">${t('contractApprovalNote')}</p>
          <label class="field">${t('changeNote')}<textarea name="note" maxlength="1000"></textarea></label>
          <p class="error" role="alert"></p><div class="actions">
            <button type="button" class="btn primary" data-contract-decision="approved">${t('approveContract')}</button>
            <button type="button" class="btn" data-contract-decision="changes_requested">${t('requestChanges')}</button>
          </div></form>` : `<p class="muted">${t('decisionRecorded')}: ${date(contract.decision_at)}${contract.decision_note ? ` · ${esc(contract.decision_note)}` : ''}</p>`}
      </article>`).join('')
    : `<p class="empty">${t('noContracts')}</p>`;
  const tickets = state.tickets.length
    ? `<ul class="list">${state.tickets.map((ticket) => `<li><span class="grow"><strong>#${esc(ticket.id)} · ${esc(ticket.subject)}</strong><span class="sub">${date(ticket.updated_at)} · ${esc(ticket.message_count)} ${t('message').toLowerCase()}s</span></span>${status(ticket.status)}<a class="btn small" href="#ticket-${esc(ticket.id)}">${t('reply')}</a></li>`).join('')}</ul>`
    : `<p class="empty">${t('noTickets')}</p>`;
  const activeServices = data.services.filter((service) => service.status === 'active');
  const services = data.services.length
    ? `<div class="service-table-wrap"><table class="service-table">
        <thead><tr><th scope="col">${t('serviceType')}</th><th scope="col">${t('serviceName')}</th><th scope="col">${t('serviceStatus')}</th><th scope="col">${t('serviceStarted')}</th><th scope="col">${t('serviceRenewal')}</th></tr></thead>
        <tbody>${data.services.map((service) => `<tr>
          <td data-label="${t('serviceType')}">${esc(t(service.service_type))}</td>
          <td data-label="${t('serviceName')}"><strong>${esc(service.name)}</strong>${service.notes ? `<span class="service-note">${esc(service.notes)}</span>` : ''}</td>
          <td data-label="${t('serviceStatus')}">${status(service.status)}</td>
          <td data-label="${t('serviceStarted')}">${date(service.start_date)}</td>
          <td data-label="${t('serviceRenewal')}">${service.renewal_date ? date(service.renewal_date) : t('noRenewal')}</td>
        </tr>`).join('')}</tbody></table></div>`
    : `<p class="empty service-empty">${t('noServices')}</p>`;
  const serviceDetails = {
    domain: { name: t('domain'), detail: t('domainService'), icon: '◎' },
    web_hosting: { name: t('web_hosting'), detail: t('hostingService'), icon: '▤' },
    email_hosting: { name: t('email_hosting'), detail: t('emailService'), icon: '✉' }
  };
  const overviewServices = activeServices.length
    ? `<div class="service-table-wrap"><table class="service-table studio-service-table">
          <thead><tr><th scope="col">${t('serviceType')}</th><th scope="col">${t('serviceName')}</th><th scope="col">${t('serviceStatus')}</th><th scope="col">${t('serviceStarted')}</th><th scope="col">${t('serviceRenewal')}</th><th scope="col"><span class="sr-only">${t('supportTab')}</span></th></tr></thead>
          <tbody>${activeServices.map((service) => {
            const details = serviceDetails[service.service_type] || { name: t(service.service_type), detail: '', icon: '◈' };
            return `<tr>
              <td><span class="studio-service-type"><i aria-hidden="true">${details.icon}</i><span><strong>${esc(details.name)}</strong><small>${esc(details.detail)}</small></span></span></td>
              <td class="studio-service-name">${esc(service.name)}</td>
              <td>${status(service.status)}</td>
              <td>${date(service.start_date)}</td>
              <td class="studio-renewal"><strong>${service.renewal_date ? date(service.renewal_date) : t('noRenewal')}</strong>${service.notes ? `<small>${esc(service.notes)}</small>` : ''}</td>
              <td><button class="studio-details-link" type="button" data-portal-tab="support">${t('supportTab')} ↗</button></td>
            </tr>`;
          }).join('')}</tbody></table></div>`
    : `<p class="empty service-empty">${t('noServices')}</p>`;
  const activeProjects = data.projects.filter((project) => project.status !== 'launched');
  const openInvoices = state.invoices.filter((invoice) => !['paid', 'void'].includes(invoice.display_status));
  const projectSummary = activeProjects.length
    ? `<ul class="overview-list">${activeProjects.slice(0, 3).map((project) => {
      const progress = Math.max(0, Math.min(100, Number(project.progress) || 0));
      const projectState = project.status === 'discovery' ? t('projectWaiting') : STATUS[state.language]?.[project.status] || project.status;
      const projectTarget = project.target_date ? `${projectState} · ${t('target')} ${date(project.target_date)}` : projectState;
      return `<li><span class="overview-project-icon" aria-hidden="true">▦</span><span class="grow"><strong>${esc(project.name)}</strong><small>${esc(projectTarget)}</small></span><span class="overview-progress" role="progressbar" aria-label="${t('overallProgress')}" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"><i style="width:${progress}%"></i></span><b class="overview-percent">${progress}%</b></li>`;
    }).join('')}</ul>`
    : `<p class="empty">${t('noProjectSummary')}</p>`;
  const invoiceSummary = openInvoices.length
    ? `<ul class="overview-list overview-invoices">${openInvoices.slice(0, 3).map((invoice) => `<li><span class="overview-invoice-icon" aria-hidden="true">▤</span><span class="grow"><strong>${esc(invoice.invoice_number)} · ${esc(invoice.title)}</strong><small>${t('due')} ${date(invoice.due_date)} · ${t('balance')} ${money(invoice.balance_cents)}</small></span>${status(invoice.display_status)}<a class="overview-download" href="/api/portal/invoices/${esc(invoice.id)}/pdf" aria-label="${t('downloadPdf')} ${esc(invoice.invoice_number)}">↓</a></li>`).join('')}</ul>`
    : `<p class="empty">${t('noOpenInvoices')}</p>`;
  const firstName = state.user.name.trim().split(/\s+/)[0];
  const sidebarTab = (name, label, icon) => `<button type="button" role="tab" id="tab-${name}" data-tab="${name}" aria-controls="portal-tab-${name}" aria-selected="${state.activeTab === name}" tabindex="${state.activeTab === name ? '0' : '-1'}"><i aria-hidden="true">${icon}</i>${label}</button>`;
  app.innerHTML = `<header class="portal-top"><a class="brand" href="/" aria-label="Make It So home"><span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M12 1.75 15.1 8.9 22.25 12l-7.15 3.1L12 22.25 8.9 15.1 1.75 12 8.9 8.9z"/></svg></span><span>make it so<em>.</em></span></a>
      <div class="portal-account"><span class="account-initials" aria-hidden="true">${esc(state.user.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase())}</span><span class="account-name">${esc(state.user.name)}</span><button id="logout" class="btn">${t('signOut')}</button></div>
    </header>
    <div class="portal-layout">
      <aside class="portal-sidebar">
        <div class="sidebar-brand"><i aria-hidden="true">✦</i><span>Make It So</span></div>
        <p class="sidebar-label">${t('workspaceNav')}</p>
        <nav class="portal-nav" id="portal-tabs" role="tablist" aria-label="${t('portal')}">
          ${sidebarTab('overview', t('overviewTab'), '⌂')}
          ${sidebarTab('services', t('servicesTab'), '◈')}
          ${sidebarTab('projects', t('projectsTab'), '▦')}
          ${sidebarTab('invoices', t('invoicesTab'), '▤')}
          ${sidebarTab('quotes', t('quotesTab'), '◇')}
          ${sidebarTab('contracts', t('contractsTab'), '▧')}
          ${sidebarTab('support', t('supportTab'), '✉')}
          ${data.client.media_enabled ? sidebarTab('media', mediaTabLabel(state.language), '◉') : ''}
        </nav>
        <section class="sidebar-support"><strong>${t('supportTitle')}</strong><p>${t('supportIntro')}</p><button type="button" data-portal-tab="support">${t('contactUs')} →</button></section>
      </aside>
      <main class="wrap portal-wrap"><header class="portal-welcome dashboard-greeting"><div><span class="eyebrow">${t('workspace')} · ${esc(data.client.company_name)}</span><h1>${t('welcomeBack')}, ${esc(firstName)}.</h1><p>${t('workspaceIntro')}</p></div><div class="dashboard-today"><span>${t('today')}</span><strong>${date(new Date().toISOString())}</strong></div></header>
      <section class="portal-tab-panel portal-overview" id="portal-tab-overview" role="tabpanel" aria-labelledby="tab-overview"${state.activeTab === 'overview' ? '' : ' hidden'}>
        <div class="overview-stats">
          <article class="overview-stat"><span class="overview-stat-icon service-stat-icon" aria-hidden="true">◈</span><div><strong>${activeServices.length}</strong><span>${t('activeServices')}</span></div></article>
          <article class="overview-stat"><span class="overview-stat-icon project-stat-icon" aria-hidden="true">▦</span><div><strong>${activeProjects.length}</strong><span>${t('activeProjects')}</span></div></article>
          <article class="overview-stat"><span class="overview-stat-icon invoice-stat-icon" aria-hidden="true">▤</span><div><strong>${openInvoices.length}</strong><span>${t('openInvoices')}</span></div></article>
        </div>
        <section class="card overview-services">
          <header class="studio-services-heading"><div><h2>${t('servicesTitle')}</h2><p>${t('serviceSummary')}</p></div><span>${t('renewalHint')}</span></header>
          ${overviewServices}
        </section>
        <div class="overview-lower">
          <section class="card overview-card"><header class="overview-card-heading"><div><h2>${t('projectsTab')}</h2><p>${t('projectSummary')}</p></div><button class="overview-view-all" type="button" data-portal-tab="projects">${t('viewAll')} <span aria-hidden="true">→</span></button></header>${projectSummary}</section>
          <section class="card overview-card"><header class="overview-card-heading"><div><h2>${t('invoicesTab')}</h2><p>${t('invoiceSummary')}</p></div><button class="overview-view-all" type="button" data-portal-tab="invoices">${t('viewAll')} <span aria-hidden="true">→</span></button></header>${invoiceSummary}</section>
        </div>
      </section>
      <section class="portal-tab-panel status-project-list" id="portal-tab-projects" role="tabpanel" aria-labelledby="tab-projects"${state.activeTab === 'projects' ? '' : ' hidden'}>${projects}</section>
      <section class="portal-tab-panel portal-extras" id="portal-tab-services" role="tabpanel" aria-labelledby="tab-services"${state.activeTab === 'services' ? '' : ' hidden'}>
        <header class="status-section-heading"><div><span class="eyebrow">${t('portal')}</span><h2>${t('services')}</h2></div><span class="eyebrow">${data.services.length} ${t('servicesTab').toLowerCase()}</span></header>
        <section class="card service-card">${services}</section>
      </section>
      <section class="portal-tab-panel portal-extras" id="portal-tab-quotes" role="tabpanel" aria-labelledby="tab-quotes"${state.activeTab === 'quotes' ? '' : ' hidden'}><header class="status-section-heading"><div><span class="eyebrow">${t('portal')}</span><h2>${t('quotes')}</h2></div></header>
        <section class="card"><header><h2>${t('quotes')}</h2></header>${quotes}</section>
        <section id="quote-detail" class="card" hidden style="margin-top:16px"></section>
      </section>
      <section class="portal-tab-panel portal-extras" id="portal-tab-contracts" role="tabpanel" aria-labelledby="tab-contracts"${state.activeTab === 'contracts' ? '' : ' hidden'}><header class="status-section-heading"><div><span class="eyebrow">${t('portal')}</span><h2>${t('contracts')}</h2></div></header>
        <div class="contract-list">${contracts}</div>
      </section>
      <section class="portal-tab-panel portal-extras" id="portal-tab-invoices" role="tabpanel" aria-labelledby="tab-invoices"${state.activeTab === 'invoices' ? '' : ' hidden'}><header class="status-section-heading"><div><span class="eyebrow">${t('portal')}</span><h2>${t('invoices')}</h2></div></header>
        <section class="card"><header><h2>${t('invoices')}</h2></header>${invoices}</section>
      </section>
      <section class="portal-tab-panel portal-extras" id="portal-tab-support" role="tabpanel" aria-labelledby="tab-support"${state.activeTab === 'support' ? '' : ' hidden'}>
        <div class="grid two"><section class="card"><header><h2>${t('updates')}</h2></header>${notes}</section>
          <section class="card" id="portal-support"><header><h2>${t('tickets')}</h2></header>
          <form id="ticket-create" class="stack"><label class="field">${t('subject')}<input name="subject" maxlength="160" required></label>
            <label class="field">${t('message')}<textarea name="message" maxlength="5000" required></textarea></label>
            <p class="error" role="alert"></p><button class="btn primary">${t('newTicket')}</button></form>
          ${tickets}</section></div>
        <section id="ticket-detail" class="card" hidden style="margin-top:16px"></section>
      </section>
      ${data.client.media_enabled ? `<section class="portal-tab-panel" id="portal-tab-media" role="tabpanel" aria-labelledby="tab-media"${state.activeTab === 'media' ? '' : ' hidden'}></section>` : ''}
      </main>
    </div>`;
  if (data.client.media_enabled) {
    mediaPanel = createMediaPanel({
      container: $('#portal-tab-media'), language: state.language, api,
      support: () => { setPortalTab('support'); $('#ticket-create input').focus(); }
    });
    if (state.activeTab === 'media') mediaPanel.load();
  }
  $('#logout').onclick = async () => {
    mediaPanel?.conceal();
    try { await api('POST', '/auth/logout'); location.reload(); }
    catch (error) { window.alert(error.message); }
  };
  $('#portal-tabs').onclick = (event) => {
    const tab = event.target.closest('[data-tab]');
    if (!tab) return;
    setPortalTab(tab.dataset.tab);
  };
  $('#portal-tabs').onkeydown = (event) => {
    const tabs = [...document.querySelectorAll('#portal-tabs [data-tab]')];
    const current = tabs.indexOf(event.target.closest('[data-tab]'));
    if (current < 0) return;
    const next = event.key === 'ArrowRight' ? (current + 1) % tabs.length
      : event.key === 'ArrowLeft' ? (current - 1 + tabs.length) % tabs.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault();
    setPortalTab(tabs[next].dataset.tab);
    tabs[next].focus();
  };
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

function setPortalTab(tabName) {
  if (!['overview', 'projects', 'services', 'quotes', 'contracts', 'invoices', 'support', 'media'].includes(tabName)) return;
  if (tabName === 'media' && !state.overview?.client.media_enabled) return;
  mediaPanel?.conceal();
  state.activeTab = tabName;
  document.querySelectorAll('#portal-tabs [data-tab]').forEach((tab) => {
    tab.setAttribute('aria-selected', String(tab.dataset.tab === tabName));
    tab.tabIndex = tab.dataset.tab === tabName ? 0 : -1;
  });
  document.querySelectorAll('.portal-tab-panel').forEach((panel) => {
    panel.hidden = panel.id !== `portal-tab-${tabName}`;
  });
  if (tabName === 'media') mediaPanel?.load();
}

async function handlePortalClick(event) {
  const dashboardTab = event.target.closest('[data-portal-tab]');
  if (dashboardTab) {
    setPortalTab(dashboardTab.dataset.portalTab);
    $('#tab-' + dashboardTab.dataset.portalTab)?.focus();
    return;
  }
  const decisionButton = event.target.closest('[data-contract-decision]');
  if (decisionButton) {
    const form = decisionButton.closest('[data-contract-response]');
    if (!form) return;
    event.preventDefault();
    const decision = decisionButton.dataset.contractDecision;
    const note = form.elements.note.value.trim();
    const error = $('.error', form);
    error.textContent = '';
    if (decision === 'changes_requested' && !note) {
      error.textContent = t('changeNote');
      form.elements.note.focus();
      return;
    }
    const buttons = form.querySelectorAll('button');
    buttons.forEach((button) => { button.disabled = true; });
    try {
      await api('POST', `/portal/contracts/${encodeURIComponent(form.dataset.contractResponse)}/respond`, { decision, note });
      state.activeTab = 'contracts';
      await loadOverview();
      setPortalTab('contracts');
    } catch (requestError) {
      error.textContent = requestError.message;
      buttons.forEach((button) => { button.disabled = false; });
    }
    return;
  }
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
  setPortalTab('support');
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
  setPortalTab('quotes');
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
    <p><a class="btn small" href="/api/portal/quotes/${esc(quote.id)}/pdf" download>${t('downloadPdf')}</a></p>
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

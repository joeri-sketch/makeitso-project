(() => {
  'use strict';

  const app = document.querySelector('[data-status-page]');
  if (!app) return;

  const services = [
    { id: 'website', icon: '◉', status: 'unknown' },
    { id: 'apps', icon: '▣', status: 'unknown' },
    { id: 'portal', icon: '◌', status: 'unknown' },
    { id: 'email', icon: '✉', status: 'unknown' },
    { id: 'billing', icon: '▤', status: 'unknown' }
  ];
  const lastUpdatedAt = null;
  const incidents = [];

  const copy = {
    en: {
      title: 'System status — Make It So',
      description: 'Manually published status information for Make It So websites, apps, email and business systems.',
      back: '← Back to Make It So',
      kicker: 'SYSTEMS · STATUS REPORT',
      headline: ['Clear signals.', 'No guesswork.'],
      intro: 'A single place to find the latest published status for the digital services that support our work.',
      signalLabel: 'STATUS CONTROL · MANUAL UPDATES',
      signalTitle: 'A clear view of every system.',
      signalFoot: 'PUBLIC STATUS REPORT',
      overview: 'Service overview',
      overviewLead: 'See the published status of each service at a glance.',
      manualTitle: 'Manually maintained',
      manualText: 'Statuses on this page are updated manually. The page does not run automatic uptime checks or verify email delivery.',
      lastUpdate: 'Last published update',
      notUpdated: 'No update time published',
      services: {
        website: ['Website & public pages', 'The main Make It So website and public information pages.'],
        apps: ['Business applications', 'The software and digital systems we build and operate.'],
        portal: ['Client portal & project status', 'Secure client access to project progress, quotes and invoices.'],
        email: ['Email & contact form', 'Business email and delivery of website contact requests.'],
        billing: ['Quotes & invoicing', 'Quote, invoice and document services for clients.']
      },
      status: {
        unknown: 'Not confirmed',
        operational: 'Operational',
        degraded: 'Degraded performance',
        outage: 'Service disruption',
        maintenance: 'Maintenance'
      },
      incidents: 'Incident history',
      incidentsLead: 'Published service notices and maintenance updates.',
      emptyTitle: 'No updates published',
      emptyText: 'There are no incident or maintenance notices on this page yet.',
      helpTitle: 'Need a hand?',
      helpText: 'If you are experiencing a problem with a Make It So service, contact us and include which service is affected.',
      contact: 'Contact Make It So',
      allUnknown: 'Status updates are not available yet.',
      allOperational: 'All published services are operational.',
      attention: 'Some services need attention.',
      statusLabel: 'CURRENT PUBLISHED STATUS',
      board: 'Bridge board',
      heroKicker: '01 · Bridge status',
      boardKicker: '02 · Service board',
      logKicker: '03 · Ship’s log',
      helpKicker: '04 · Hailing frequencies open',
      boardTitle: ['Five systems.', 'One glance.'],
      logTitle: ['What changed,', 'and when.'],
      boardLead: {
        unknown: 'Statuses will appear here once they are published.',
        operational: 'Every published service is operational.',
        attention: 'The one that needs you is marked. The rest are running.'
      },
      lines: {
        unknown: ['Standing', 'by'],
        operational: ['All systems', 'nominal'],
        attention: ['Some systems', 'need a hand'],
        maintenance: ['{short} is in', 'dry dock'],
        outage: ['{short} is', 'offline'],
        degraded: ['{short} is running', 'slow']
      },
      lead: {
        unknown: 'Nothing has been published yet.',
        operational: 'Website, apps, portal, email and billing are operational.',
        attention: 'Some services need attention.',
        maintenance: '{name} is in a scheduled maintenance window. The other published services are operational.',
        outage: '{name} is disrupted. The board shows what is still up.',
        degraded: '{name} is slower than usual. The other published services are operational.'
      },
      short: { website: 'Website', apps: 'Apps', portal: 'Portal', email: 'Email', billing: 'Billing' },
      counts: {
        operational: '{n} operational',
        maintenance: '{n} maintenance',
        degraded: '{n} degraded',
        outage: '{n} offline',
        unknown: '{n} not confirmed'
      },
      contactBridge: 'Hail the bridge'
    },
    nl: {
      title: 'Systeemstatus — Make It So',
      description: 'Handmatig gepubliceerde statusinformatie voor de websites, apps, e-mail en systemen van Make It So.',
      back: '← Terug naar Make It So',
      kicker: 'SYSTEMEN · STATUSRAPPORT',
      headline: ['Duidelijk signaal.', 'Geen giswerk.'],
      intro: 'Eén plek voor de laatst gepubliceerde status van de digitale diensten die ons werk ondersteunen.',
      signalLabel: 'STATUSBEHEER · HANDMATIGE UPDATES',
      signalTitle: 'Een helder overzicht van elk systeem.',
      signalFoot: 'OPENBAAR STATUSRAPPORT',
      overview: 'Overzicht van diensten',
      overviewLead: 'Bekijk in één oogopslag de gepubliceerde status van elke dienst.',
      manualTitle: 'Handmatig bijgehouden',
      manualText: 'De statussen op deze pagina worden handmatig bijgewerkt. De pagina voert geen automatische uptimecontroles uit en controleert de e-mailbezorging niet.',
      lastUpdate: 'Laatst gepubliceerde update',
      notUpdated: 'Geen updatetijd gepubliceerd',
      services: {
        website: ['Website & openbare pagina’s', 'De Make It So-website en openbare informatiepagina’s.'],
        apps: ['Bedrijfsapplicaties', 'De software en digitale systemen die we bouwen en beheren.'],
        portal: ['Klantportaal & projectstatus', 'Beveiligde toegang voor klanten tot projectvoortgang, offertes en facturen.'],
        email: ['E-mail & contactformulier', 'Zakelijke e-mail en bezorging van aanvragen via de website.'],
        billing: ['Offertes & facturatie', 'Offerte-, factuur- en documentdiensten voor klanten.']
      },
      status: {
        unknown: 'Niet bevestigd',
        operational: 'Operationeel',
        degraded: 'Verminderde prestaties',
        outage: 'Dienststoring',
        maintenance: 'Onderhoud'
      },
      incidents: 'Incidenthistorie',
      incidentsLead: 'Gepubliceerde storingsmeldingen en onderhoudsupdates.',
      emptyTitle: 'Nog geen updates',
      emptyText: 'Er staan nog geen storings- of onderhoudsmeldingen op deze pagina.',
      helpTitle: 'Hulp nodig?',
      helpText: 'Ervaar je een probleem met een dienst van Make It So? Neem contact op en vermeld om welke dienst het gaat.',
      contact: 'Contacteer Make It So',
      allUnknown: 'Er zijn nog geen statusupdates beschikbaar.',
      allOperational: 'Alle gepubliceerde diensten zijn operationeel.',
      attention: 'Sommige diensten vragen aandacht.',
      statusLabel: 'HUIDIGE GEPUBLICEERDE STATUS',
      board: 'Brugbord',
      heroKicker: '01 · Brugstatus',
      boardKicker: '02 · Dienstenbord',
      logKicker: '03 · Scheepslog',
      helpKicker: '04 · Hulpfrequenties open',
      boardTitle: ['Vijf systemen.', 'Eén blik.'],
      logTitle: ['Wat veranderde,', 'en wanneer.'],
      boardLead: {
        unknown: 'Statussen verschijnen hier zodra ze gepubliceerd zijn.',
        operational: 'Elke gepubliceerde dienst is operationeel.',
        attention: 'Wat aandacht vraagt, is gemarkeerd. De rest draait.'
      },
      lines: {
        unknown: ['We staan', 'klaar'],
        operational: ['Alle systemen', 'nominaal'],
        attention: ['Sommige systemen', 'vragen aandacht'],
        maintenance: ['{short} ligt in', 'onderhoud'],
        outage: ['{short} is', 'offline'],
        degraded: ['{short} draait', 'trager']
      },
      lead: {
        unknown: 'Er is nog niets gepubliceerd.',
        operational: 'Website, apps, portaal, e-mail en facturatie zijn operationeel.',
        attention: 'Sommige diensten vragen aandacht.',
        maintenance: '{name} is in een gepland onderhoudsvenster. De andere gepubliceerde diensten zijn operationeel.',
        outage: '{name} is verstoord. Het bord toont wat nog werkt.',
        degraded: '{name} is trager dan gewoonlijk. De andere gepubliceerde diensten zijn operationeel.'
      },
      short: { website: 'Website', apps: 'Apps', portal: 'Portaal', email: 'E-mail', billing: 'Facturatie' },
      counts: {
        operational: '{n} operationeel',
        maintenance: '{n} in onderhoud',
        degraded: '{n} vertraagd',
        outage: '{n} offline',
        unknown: '{n} niet bevestigd'
      },
      contactBridge: 'Roep de brug'
    },
    fr: {
      title: 'État des services — Make It So',
      description: 'Informations de statut publiées manuellement pour les sites, applications, e-mails et systèmes de Make It So.',
      back: '← Retour à Make It So',
      kicker: 'SYSTÈMES · RAPPORT DE STATUT',
      headline: ['Un signal clair.', 'Sans incertitude.'],
      intro: 'Un seul endroit pour consulter le dernier état publié des services numériques qui soutiennent notre travail.',
      signalLabel: 'CONTRÔLE DU STATUT · MISES À JOUR MANUELLES',
      signalTitle: 'Une vue claire de chaque système.',
      signalFoot: 'RAPPORT DE STATUT PUBLIC',
      overview: 'Vue d’ensemble des services',
      overviewLead: 'Consultez en un coup d’œil le statut publié de chaque service.',
      manualTitle: 'Mise à jour manuelle',
      manualText: 'Les statuts de cette page sont mis à jour manuellement. Aucun contrôle automatique de disponibilité ni de remise des e-mails n’est effectué.',
      lastUpdate: 'Dernière mise à jour publiée',
      notUpdated: 'Aucune heure publiée',
      services: {
        website: ['Site web et pages publiques', 'Le site Make It So et ses pages d’information publiques.'],
        apps: ['Applications professionnelles', 'Les logiciels et systèmes numériques que nous créons et exploitons.'],
        portal: ['Portail client et suivi de projet', 'Accès sécurisé à l’avancement, aux devis et aux factures.'],
        email: ['E-mail et formulaire de contact', 'E-mail professionnel et réception des demandes envoyées via le site.'],
        billing: ['Devis et facturation', 'Services de devis, factures et documents destinés aux clients.']
      },
      status: {
        unknown: 'Non confirmé',
        operational: 'Opérationnel',
        degraded: 'Performances réduites',
        outage: 'Interruption de service',
        maintenance: 'Maintenance'
      },
      incidents: 'Historique des incidents',
      incidentsLead: 'Avis de service et mises à jour de maintenance publiés.',
      emptyTitle: 'Aucune mise à jour publiée',
      emptyText: 'Aucun avis d’incident ou de maintenance n’est encore publié sur cette page.',
      helpTitle: 'Besoin d’aide ?',
      helpText: 'Vous rencontrez un problème avec un service Make It So ? Contactez-nous en précisant le service concerné.',
      contact: 'Contacter Make It So',
      allUnknown: 'Les mises à jour de statut ne sont pas encore disponibles.',
      allOperational: 'Tous les services publiés sont opérationnels.',
      attention: 'Certains services nécessitent une attention particulière.',
      statusLabel: 'STATUT PUBLIÉ ACTUEL',
      board: 'Tableau de bord',
      heroKicker: '01 · Statut de la passerelle',
      boardKicker: '02 · Services',
      logKicker: '03 · Journal de bord',
      helpKicker: '04 · Fréquences ouvertes',
      boardTitle: ['Cinq systèmes.', 'Un coup d’œil.'],
      logTitle: ['Ce qui a changé,', 'et quand.'],
      boardLead: {
        unknown: 'Les statuts apparaîtront ici dès qu’ils seront publiés.',
        operational: 'Chaque service publié est opérationnel.',
        attention: 'Ce qui demande attention est marqué. Le reste tourne.'
      },
      lines: {
        unknown: ['En', 'attente'],
        operational: ['Tous les systèmes', 'nominaux'],
        attention: ['Certains systèmes', 'demandent attention'],
        maintenance: ['{short} est en', 'maintenance'],
        outage: ['{short} est', 'hors service'],
        degraded: ['{short} est', 'ralenti']
      },
      lead: {
        unknown: 'Rien n’a encore été publié.',
        operational: 'Le site, les applications, le portail, l’e-mail et la facturation sont opérationnels.',
        attention: 'Certains services nécessitent une attention particulière.',
        maintenance: '{name} est dans une fenêtre de maintenance planifiée. Les autres services publiés sont opérationnels.',
        outage: '{name} est interrompu. Le tableau montre ce qui fonctionne encore.',
        degraded: '{name} est plus lent que d’habitude. Les autres services publiés sont opérationnels.'
      },
      short: { website: 'Site', apps: 'Applications', portal: 'Portail', email: 'E-mail', billing: 'Facturation' },
      counts: {
        operational: '{n} opérationnel',
        maintenance: '{n} en maintenance',
        degraded: '{n} ralenti',
        outage: '{n} hors service',
        unknown: '{n} non confirmé'
      },
      contactBridge: 'Appeler la passerelle'
    }
  };

  const getStatus = (service) => ['unknown', 'operational', 'degraded', 'outage', 'maintenance'].includes(service.status)
    ? service.status
    : 'unknown';

  const esc = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  const fill = (template, values) => String(template).replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');

  function storyFor(text, states) {
    const named = services.map((service, index) => ({
      status: states[index],
      name: (text.services[service.id] || text.services.website)[0],
      short: text.short[service.id] || service.id
    }));
    const exceptions = named.filter((service) => service.status !== 'operational');
    const single = exceptions.length === 1 && exceptions[0].status !== 'unknown'
      && named.every((service) => service.status === 'operational' || service === exceptions[0])
      ? exceptions[0]
      : null;
    if (states.every((status) => status === 'unknown')) {
      return { lines: text.lines.unknown, lead: text.lead.unknown, boardLead: text.boardLead.unknown, tone: 'unknown' };
    }
    if (states.every((status) => status === 'operational')) {
      return { lines: text.lines.operational, lead: text.lead.operational, boardLead: text.boardLead.operational, tone: 'operational' };
    }
    if (single && text.lines[single.status]) {
      return {
        lines: text.lines[single.status].map((line) => fill(line, single)),
        lead: fill(text.lead[single.status], single),
        boardLead: text.boardLead.attention,
        tone: single.status
      };
    }
    return { lines: text.lines.attention, lead: text.lead.attention, boardLead: text.boardLead.attention, tone: 'degraded' };
  }

  function render() {
    const language = window.i18n?.lang || 'en';
    const text = copy[language] || copy.en;
    const states = services.map(getStatus);
    const story = storyFor(text, states);
    const publishedLabel = lastUpdatedAt && Number.isFinite(Date.parse(lastUpdatedAt))
      ? `${text.lastUpdate} ${new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(lastUpdatedAt))}`
      : text.notUpdated;
    const summary = ['operational', 'maintenance', 'degraded', 'outage', 'unknown']
      .map((status) => {
        const n = states.filter((item) => item === status).length;
        return n ? fill(text.counts[status], { n: String(n) }) : '';
      })
      .filter(Boolean)
      .join(' · ');
    const incidentMarkup = incidents.length
      ? incidents.map((incident) => {
        const incidentText = incident.copy?.[language] || incident.copy?.en || { title: '', message: '' };
        const status = getStatus(incident);
        const date = new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(new Date(incident.publishedAt));
        const serviceName = incident.service && text.short[incident.service] ? ` · ${text.short[incident.service]}` : '';
        return `<article class="status-notice status-${esc(status)}">
          <span class="status-rail" aria-hidden="true"></span>
          <div>
            <p class="status-when">${esc(date)} · ${esc(text.status[status] || text.status.unknown)}${esc(serviceName)}</p>
            <h3>${esc(incidentText.title)}</h3>
            <p>${esc(incidentText.message)}</p>
          </div>
        </article>`;
      }).join('')
      : `<p class="status-empty">${esc(text.emptyText)}</p>`;

    document.documentElement.lang = language;
    document.title = text.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', text.description);
    app.innerHTML = `
      <section class="panel hero status-bridge" aria-labelledby="bridge-title">
        <i class="blob b1"></i><i class="blob b2"></i><i class="blob b3"></i>
        <div class="status-bridge-grid">
          <div>
            <div class="lcars" aria-hidden="true"><i></i><i></i><i></i></div>
            <p class="logline"><span class="pulse"></span> ${esc(text.heroKicker)}</p>
            <h1 class="hero-title" id="bridge-title">${esc(story.lines[0])}${story.lines[1] ? `<br>${esc(story.lines[1])}` : ''}<b>.</b></h1>
            <p class="lead">${esc(story.lead)}</p>
            <p class="status-meta"><span>${esc(publishedLabel)}</span><span>${esc(text.manualText)}</span></p>
          </div>
          <aside class="chat${story.tone === 'operational' ? ' engaged' : ''}" aria-label="${esc(text.board)}">
            <header>
              <span class="online${story.tone === 'operational' ? '' : ' status-idle'}" aria-hidden="true"></span>
              <div><strong>${esc(text.board)}</strong><small>${esc(summary)}</small></div>
            </header>
            <ul class="status-sys">
              ${services.map((service) => {
                const status = getStatus(service);
                return `<li><strong>${esc(text.short[service.id] || service.id)}</strong><span class="status-pill status-pill-${esc(status)}"><i aria-hidden="true"></i>${esc(text.status[status])}</span></li>`;
              }).join('')}
            </ul>
          </aside>
        </div>
      </section>

      <section class="status-block" aria-labelledby="status-overview-title">
        <header class="status-section-head">
          <div>
            <div class="lcars" aria-hidden="true"><i></i><i></i><i></i></div>
            <p class="kicker">${esc(text.boardKicker)}</p>
            <h2 id="status-overview-title">${esc(text.boardTitle[0])}<br><span>${esc(text.boardTitle[1])}</span></h2>
          </div>
          <p>${esc(story.boardLead)}</p>
        </header>
        <div class="status-rows">
          ${services.map((service, index) => {
            const status = getStatus(service);
            const [name, description] = text.services[service.id] || text.services.website;
            return `<article class="status-row status-${esc(status)}">
              <span class="status-num">${String(index + 1).padStart(2, '0')}</span>
              <div><h3>${esc(name)}</h3><p>${esc(description)}</p></div>
              <span class="status-pill status-pill-${esc(status)}"><i aria-hidden="true"></i>${esc(text.status[status])}</span>
            </article>`;
          }).join('')}
        </div>
      </section>

      <section class="status-block" aria-labelledby="status-incidents-title">
        <header class="status-section-head">
          <div>
            <div class="lcars" aria-hidden="true"><i></i><i></i><i></i></div>
            <p class="kicker">${esc(text.logKicker)}</p>
            <h2 id="status-incidents-title">${esc(text.logTitle[0])}<br><span>${esc(text.logTitle[1])}</span></h2>
          </div>
          <p>${esc(text.incidentsLead)}</p>
        </header>
        <div class="status-incident-list">${incidentMarkup}</div>
      </section>

      <section class="panel cta status-hail">
        <div class="status-hail-grid">
          <div>
            <p class="kicker dark">${esc(text.helpKicker)}</p>
            <h2 id="status-help-title">${esc(text.helpTitle.replace(/\?$/, ''))}<b>?</b></h2>
            <p>${esc(text.helpText)}</p>
          </div>
          <a class="btn btn-dark btn-lg" href="/?lang=${encodeURIComponent(language)}#contact">${esc(text.contactBridge)} <span class="chip" aria-hidden="true">→</span></a>
        </div>
      </section>`;
  }

  render();
  window.i18n?.onChange(render);
})();

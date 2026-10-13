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
      statusLabel: 'CURRENT PUBLISHED STATUS'
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
      statusLabel: 'HUIDIGE GEPUBLICEERDE STATUS'
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
      statusLabel: 'STATUT PUBLIÉ ACTUEL'
    }
  };

  const getStatus = (service) => ['unknown', 'operational', 'degraded', 'outage', 'maintenance'].includes(service.status)
    ? service.status
    : 'unknown';

  function render() {
    const language = window.i18n?.lang || 'en';
    const text = copy[language] || copy.en;
    const states = services.map(getStatus);
    const allOperational = states.length > 0 && states.every((status) => status === 'operational');
    const allUnknown = states.every((status) => status === 'unknown');
    const needsAttention = states.some((status) => ['degraded', 'outage'].includes(status));
    const overallState = allUnknown ? 'unknown' : allOperational ? 'operational' : needsAttention ? 'degraded' : 'maintenance';
    const overallText = allUnknown ? text.allUnknown : allOperational ? text.allOperational : text.attention;
    const updateTime = lastUpdatedAt && Number.isFinite(Date.parse(lastUpdatedAt))
      ? new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(lastUpdatedAt))
      : text.notUpdated;
    const incidentMarkup = incidents.length
      ? incidents.map((incident) => {
        const incidentText = incident.copy[language] || incident.copy.en;
        const date = new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(new Date(incident.publishedAt));
        return `<article class="status-incident"><span class="studio-kicker">${date} · ${text.status[incident.status] || text.status.unknown}</span><h3>${incidentText.title}</h3><p>${incidentText.message}</p></article>`;
      }).join('')
      : `<div class="status-empty">
          <span class="status-empty-mark" aria-hidden="true">✦</span>
          <div><h3>${text.emptyTitle}</h3><p>${text.emptyText}</p></div>
        </div>`;

    document.documentElement.lang = language;
    document.title = text.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', text.description);
    app.innerHTML = `
      <section class="status-hero">
        <div class="status-orbit" aria-hidden="true"><i></i><i></i><span>✦</span></div>
        <div class="status-hero-copy">
          <a class="detail-back" href="/?lang=${language}">${text.back}</a>
          <p class="studio-kicker">${text.kicker}</p>
          <h1>${text.headline[0]}<br><span>${text.headline[1]}</span></h1>
          <p class="studio-intro">${text.intro}</p>
          <div class="status-manual-note"><span aria-hidden="true">◷</span>${text.manualText}</div>
        </div>
        <aside class="status-signal">
          <span class="studio-signal-label">${text.signalLabel}</span>
          <span class="status-overall status-${overallState}"><i aria-hidden="true"></i>${overallText}</span>
          <strong>${text.signalTitle}</strong>
          <span class="studio-signal-status">${text.statusLabel}</span>
          <div class="status-signal-line" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
          <span class="studio-signal-label">${text.signalFoot}</span>
        </aside>
      </section>

      <section class="status-section" aria-labelledby="status-overview-title">
        <header class="status-section-head">
          <div><p class="studio-kicker">${text.kicker}</p><h2 id="status-overview-title">${text.overview}</h2></div>
          <p>${text.overviewLead}</p>
        </header>
        <div class="status-list">
          ${services.map((service, index) => {
            const status = getStatus(service);
            const [name, description] = text.services[service.id] || text.services.website;
            return `<article class="status-row status-row-${status}">
              <span class="status-service-icon" aria-hidden="true">${service.icon}</span>
              <div class="status-service-copy"><span class="status-index">${String(index + 1).padStart(2, '0')} · ${text.signalFoot}</span><h3>${name}</h3><p>${description}</p></div>
              <span class="status-pill status-pill-${status}"><i aria-hidden="true"></i>${text.status[status]}</span>
            </article>`;
          }).join('')}
        </div>
        <aside class="status-manual-card">
          <span class="status-manual-icon" aria-hidden="true">◷</span>
          <div><h3>${text.manualTitle}</h3><p>${text.manualText}</p></div>
          <span class="status-update">${text.lastUpdate}<strong>${updateTime}</strong></span>
        </aside>
      </section>

      <section class="status-incidents" aria-labelledby="status-incidents-title">
        <header class="status-section-head">
          <div><p class="studio-kicker">${text.kicker}</p><h2 id="status-incidents-title">${text.incidents}</h2></div>
          <p>${text.incidentsLead}</p>
        </header>
        <div class="status-incident-list">${incidentMarkup}</div>
      </section>

      <section class="status-help">
        <div><p class="studio-kicker">${text.kicker}</p><h2>${text.helpTitle}</h2><p>${text.helpText}</p></div>
        <a class="btn btn-orange btn-lg" href="/?lang=${language}#contact">${text.contact}<span class="chip" aria-hidden="true">→</span></a>
      </section>`;
  }

  render();
  window.i18n?.onChange(render);
})();

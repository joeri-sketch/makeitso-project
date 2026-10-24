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
  let lastUpdatedAt = null;
  let statusUnavailable = false;

  const copy = {
    en: {
      title: 'System status — Make It So',
      description: 'Live status and availability updates for Make It So websites, apps, client portal, email and billing services.',
      back: '← Back to Make It So',
      kicker: 'SYSTEMS · STATUS REPORT',
      headline: ['Clear signals.', 'No guesswork.'],
      intro: 'A single place to check the current availability of the digital services that support our work.',
      signalLabel: 'STATUS CONTROL · LIVE CHECKS',
      signalTitle: 'A clear view of every system.',
      signalFoot: 'PUBLIC STATUS REPORT',
      overview: 'Service overview',
      overviewLead: 'See the current status of each service at a glance.',
      liveText: 'Live checks · refreshed automatically',
      statusError: 'Live status is temporarily unavailable.',
      lastUpdate: 'Last checked',
      notUpdated: 'Waiting for the first status check',
      services: {
        website: ['Website & public pages', 'The main Make It So website and public information pages.'],
        apps: ['Apps', 'Availability of the applications service.'],
        portal: ['Client portal & project status', 'Secure client access to project progress and account services.'],
        email: ['Email & contact form', 'Email delivery and contact-form submissions are currently unavailable and under maintenance.'],
        billing: ['Quotes & invoices', 'Quote and invoice access follows the client portal status.']
      },
      status: {
        unknown: 'Not confirmed',
        operational: 'Operational',
        degraded: 'Degraded performance',
        outage: 'Service disruption',
        maintenance: 'Maintenance'
      },
      incidents: 'Active incidents',
      incidentsLead: 'Active service notices based on the latest checks.',
      emptyTitle: 'No active incidents',
      emptyText: 'There are no active service incidents or maintenance notices.',
      helpTitle: 'Need a hand?',
      helpText: 'If you are experiencing a problem with a Make It So service, contact us and include which service is affected.',
      contact: 'Contact Make It So',
      allUnknown: 'Status updates are not available yet.',
      allOperational: 'All monitored services are operational.',
      attention: 'Some services need attention.',
      statusLabel: 'CURRENT LIVE STATUS',
      board: 'Bridge board',
      heroKicker: '01 · Bridge status',
      boardKicker: '02 · Service board',
      logKicker: '03 · Ship’s log',
      helpKicker: '04 · Hailing frequencies open',
      boardTitle: ['Five systems.', 'One glance.'],
      logTitle: ['Current service', 'notices.'],
      boardLead: {
        unknown: 'Statuses will appear here after the first live check.',
        operational: 'Every monitored service is operational.',
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
        unknown: 'The first live status check is in progress.',
        operational: 'Website, apps, client portal, email and billing are operational.',
        attention: 'Some services need attention.',
        maintenance: '{name} is currently under maintenance.',
        outage: '{name} is disrupted. The board shows what is still up.',
        degraded: '{name} is slower than usual.'
      },
      incidentTitle: 'Status update: {name}',
      incidentMessage: '{name} is currently {status}. This page refreshes automatically.',
      emailMaintenance: 'Email delivery and contact-form submissions are currently unavailable and under maintenance.',
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
      description: 'Live status en beschikbaarheidsupdates voor de website, apps, het klantportaal, e-mail en facturatie van Make It So.',
      back: '← Terug naar Make It So',
      kicker: 'SYSTEMEN · STATUSRAPPORT',
      headline: ['Duidelijk signaal.', 'Geen giswerk.'],
      intro: 'Eén plek om de actuele beschikbaarheid van de digitale diensten te controleren.',
      signalLabel: 'STATUSBEHEER · LIVE CONTROLES',
      signalTitle: 'Een helder overzicht van elk systeem.',
      signalFoot: 'OPENBAAR STATUSRAPPORT',
      overview: 'Overzicht van diensten',
      overviewLead: 'Bekijk in één oogopslag de actuele status van elke dienst.',
      liveText: 'Live controles · wordt automatisch vernieuwd',
      statusError: 'De live status is tijdelijk niet beschikbaar.',
      lastUpdate: 'Laatst gecontroleerd',
      notUpdated: 'Wachten op de eerste statuscontrole',
      services: {
        website: ['Website & openbare pagina’s', 'De Make It So-website en openbare informatiepagina’s.'],
        apps: ['Apps', 'Beschikbaarheid van de applicatiedienst.'],
        portal: ['Klantportaal & projectstatus', 'Beveiligde toegang voor klanten tot projectvoortgang en accountdiensten.'],
        email: ['E-mail & contactformulier', 'E-mailbezorging en inzendingen via het contactformulier zijn momenteel niet beschikbaar en in onderhoud.'],
        billing: ['Offertes & facturen', 'Toegang tot offertes en facturen volgt de status van het klantportaal.']
      },
      status: {
        unknown: 'Niet bevestigd',
        operational: 'Operationeel',
        degraded: 'Verminderde prestaties',
        outage: 'Dienststoring',
        maintenance: 'Onderhoud'
      },
      incidents: 'Actieve incidenten',
      incidentsLead: 'Actuele meldingen op basis van de laatste controles.',
      emptyTitle: 'Geen actieve incidenten',
      emptyText: 'Er zijn geen actieve storingen of onderhoudsmeldingen.',
      helpTitle: 'Hulp nodig?',
      helpText: 'Ervaar je een probleem met een dienst van Make It So? Neem contact op en vermeld om welke dienst het gaat.',
      contact: 'Contacteer Make It So',
      allUnknown: 'Er zijn nog geen statusupdates beschikbaar.',
      allOperational: 'Alle gecontroleerde diensten zijn operationeel.',
      attention: 'Sommige diensten vragen aandacht.',
      statusLabel: 'HUIDIGE LIVE STATUS',
      board: 'Brugbord',
      heroKicker: '01 · Brugstatus',
      boardKicker: '02 · Dienstenbord',
      logKicker: '03 · Scheepslog',
      helpKicker: '04 · Hulpfrequenties open',
      boardTitle: ['Vijf systemen.', 'Eén blik.'],
      logTitle: ['Actuele service-', 'meldingen.'],
      boardLead: {
        unknown: 'Statussen verschijnen na de eerste live controle.',
        operational: 'Elke gecontroleerde dienst is operationeel.',
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
        unknown: 'De eerste live statuscontrole wordt uitgevoerd.',
        operational: 'Website, apps, klantportaal, e-mail en facturatie zijn operationeel.',
        attention: 'Sommige diensten vragen aandacht.',
        maintenance: '{name} is momenteel in onderhoud.',
        outage: '{name} is verstoord. Het bord toont wat nog werkt.',
        degraded: '{name} werkt trager dan gewoonlijk.'
      },
      incidentTitle: 'Statusupdate: {name}',
      incidentMessage: '{name} heeft momenteel de status {status}. Deze pagina wordt automatisch vernieuwd.',
      emailMaintenance: 'E-mailbezorging en inzendingen via het contactformulier zijn momenteel niet beschikbaar en in onderhoud.',
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
      description: 'État en direct et mises à jour de disponibilité du site, des applications, du portail client, des e-mails et de la facturation de Make It So.',
      back: '← Retour à Make It So',
      kicker: 'SYSTÈMES · RAPPORT DE STATUT',
      headline: ['Un signal clair.', 'Sans incertitude.'],
      intro: 'Un seul endroit pour vérifier la disponibilité actuelle des services numériques qui soutiennent notre travail.',
      signalLabel: 'CONTRÔLE DU STATUT · VÉRIFICATIONS EN DIRECT',
      signalTitle: 'Une vue claire de chaque système.',
      signalFoot: 'RAPPORT DE STATUT PUBLIC',
      overview: 'Vue d’ensemble des services',
      overviewLead: 'Consultez en un coup d’œil le statut actuel de chaque service.',
      liveText: 'Vérifications en direct · actualisation automatique',
      statusError: 'Le statut en direct est temporairement indisponible.',
      lastUpdate: 'Dernière vérification',
      notUpdated: 'En attente de la première vérification',
      services: {
        website: ['Site web et pages publiques', 'Le site Make It So et ses pages d’information publiques.'],
        apps: ['Applications', 'Disponibilité du service des applications.'],
        portal: ['Portail client et suivi de projet', 'Accès sécurisé à l’avancement du projet et aux services du compte.'],
        email: ['E-mail et formulaire de contact', 'La remise des e-mails et les demandes envoyées via le formulaire sont actuellement indisponibles et en maintenance.'],
        billing: ['Devis et factures', 'L’accès aux devis et factures suit le statut du portail client.']
      },
      status: {
        unknown: 'Non confirmé',
        operational: 'Opérationnel',
        degraded: 'Performances réduites',
        outage: 'Interruption de service',
        maintenance: 'Maintenance'
      },
      incidents: 'Incidents actifs',
      incidentsLead: 'Avis actifs basés sur les dernières vérifications.',
      emptyTitle: 'Aucun incident actif',
      emptyText: 'Aucun incident ou avis de maintenance n’est actif.',
      helpTitle: 'Besoin d’aide ?',
      helpText: 'Vous rencontrez un problème avec un service Make It So ? Contactez-nous en précisant le service concerné.',
      contact: 'Contacter Make It So',
      allUnknown: 'Les mises à jour de statut ne sont pas encore disponibles.',
      allOperational: 'Tous les services surveillés sont opérationnels.',
      attention: 'Certains services nécessitent une attention particulière.',
      statusLabel: 'STATUT EN DIRECT',
      board: 'Tableau de bord',
      heroKicker: '01 · Statut de la passerelle',
      boardKicker: '02 · Services',
      logKicker: '03 · Journal de bord',
      helpKicker: '04 · Fréquences ouvertes',
      boardTitle: ['Cinq systèmes.', 'Un coup d’œil.'],
      logTitle: ['Avis de service', 'actuels.'],
      boardLead: {
        unknown: 'Les statuts apparaîtront après la première vérification.',
        operational: 'Chaque service surveillé est opérationnel.',
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
        unknown: 'La première vérification du statut est en cours.',
        operational: 'Le site, les applications, le portail client, l’e-mail et la facturation sont opérationnels.',
        attention: 'Certains services nécessitent une attention particulière.',
        maintenance: '{name} est actuellement en maintenance.',
        outage: '{name} est interrompu. Le tableau montre ce qui fonctionne encore.',
        degraded: '{name} est plus lent que d’habitude.'
      },
      incidentTitle: 'Mise à jour du statut : {name}',
      incidentMessage: '{name} est actuellement {status}. Cette page s’actualise automatiquement.',
      emailMaintenance: 'La remise des e-mails et les demandes envoyées via le formulaire sont actuellement indisponibles et en maintenance.',
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
    const checkedLabel = lastUpdatedAt && Number.isFinite(Date.parse(lastUpdatedAt))
      ? `${text.lastUpdate} ${new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(lastUpdatedAt))}`
      : text.notUpdated;
    const summary = ['operational', 'maintenance', 'degraded', 'outage', 'unknown']
      .map((status) => {
        const n = states.filter((item) => item === status).length;
        return n ? fill(text.counts[status], { n: String(n) }) : '';
      })
      .filter(Boolean)
      .join(' · ');
    const activeIncidents = services.filter((service) => service.status !== 'operational' && service.status !== 'unknown');
    const incidentMarkup = activeIncidents.length
      ? activeIncidents.map((service) => {
        const status = getStatus(service);
        const name = text.services[service.id][0];
        const message = service.id === 'email' && status === 'maintenance'
          ? text.emailMaintenance
          : fill(text.incidentMessage, { name, status: text.status[status] });
        const dateValue = service.checked_at || lastUpdatedAt;
        const date = dateValue && Number.isFinite(Date.parse(dateValue))
          ? new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(dateValue))
          : text.notUpdated;
        return `<article class="status-notice status-${esc(status)}">
          <span class="status-rail" aria-hidden="true"></span>
          <div>
            <p class="status-when">${esc(date)} · ${esc(text.status[status])} · ${esc(text.short[service.id])}</p>
            <h3>${esc(fill(text.incidentTitle, { name }))}</h3>
            <p>${esc(message)}</p>
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
            <p class="status-meta"><span>${esc(checkedLabel)}</span><span>${esc(statusUnavailable ? text.statusError : text.liveText)}</span></p>
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

  let statusLoading = false;
  async function refreshStatus() {
    if (statusLoading) return;
    statusLoading = true;
    try {
      const response = await fetch('/api/public/status', {
        method: 'GET',
        cache: 'no-store',
        credentials: 'omit',
        headers: { accept: 'application/json' }
      });
      if (!response.ok) throw new Error('Status request failed.');
      const data = await response.json();
      if (!Array.isArray(data.services) || !data.checked_at) throw new Error('Invalid status response.');
      const latest = new Map(data.services.map((service) => [service.id, service]));
      services.forEach((service) => {
        const current = latest.get(service.id);
        service.status = current ? current.status : 'unknown';
        service.checked_at = current?.checked_at || data.checked_at;
      });
      lastUpdatedAt = data.checked_at;
      statusUnavailable = false;
    } catch {
      statusUnavailable = true;
    } finally {
      statusLoading = false;
      render();
    }
  }

  render();
  refreshStatus();
  window.setInterval(refreshStatus, 60_000);
  window.i18n?.onChange(render);
})();

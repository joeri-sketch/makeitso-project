/* ==========================================================
   MAKE IT SO — translations (English · Nederlands · Français)
   Each row is [English, Dutch, French]. The English text is the key,
   so the HTML stays plain, readable English.
   The brand phrase "Make it so." is deliberately kept as-is in every language.
   ========================================================== */
(() => {
  'use strict';

  const NB = '\u00a0'; // non-breaking space (French punctuation)

  const ROWS = [
    // ----- page meta -----
    ['Websites, Apps & Marketing for Small Companies | Make It So', 'Websites, apps & marketing voor kleine bedrijven | Make It So', 'Sites web, apps & marketing pour petites entreprises | Make It So'],
    ['Make It So builds websites, apps and business software, and creates brand and marketing campaigns for small companies in Belgium.',
      'Make It So bouwt websites, apps en bedrijfssoftware en ontwikkelt merk- en marketingcampagnes voor kleine bedrijven in België.',
      'Make It So crée des sites web, des applications et des logiciels métier, ainsi que des campagnes de marque et de marketing pour les petites entreprises en Belgique.'],
    ['Websites, apps, business software, branding and marketing for small companies in Belgium.',
      'Websites, apps, bedrijfssoftware, branding en marketing voor kleine bedrijven in België.',
      'Sites web, applications, logiciels métier, identité de marque et marketing pour les petites entreprises en Belgique.'],

    // ----- accessibility labels -----
    ['Skip to content', 'Naar de inhoud', 'Aller au contenu'],
    ['Loading', 'Laden', 'Chargement'],
    ['Language', 'Taal', 'Langue'],
    ['Make It So, back to top', 'Make It So, terug naar boven', 'Make It So, retour en haut'],
    ['Make It So home', 'Make It So startpagina', 'Make It So accueil'],
    ['Quick navigation', 'Snelnavigatie', 'Navigation rapide'],
    ['Main navigation', 'Hoofdnavigatie', 'Navigation principale'],
    ['Footer navigation', 'Voettekstnavigatie', 'Navigation de pied de page'],
    ['Open menu', 'Menu openen', 'Ouvrir le menu'],
    ['Close menu', 'Menu sluiten', 'Fermer le menu'],
    ['Replay the conversation', 'Gesprek opnieuw afspelen', 'Rejouer la conversation'],
    ['A sample conversation with the Make It So bridge', 'Een voorbeeldgesprek met de Make It So-brug', 'Un exemple de conversation avec la passerelle Make It So'],
    ['The Make It So robot assistant: a sleek robot whose screen face shows expressions, wearing an indigo jacket and holding a cup of tea',
      'De Make It So-robotassistent: een strakke robot met een scherm als gezicht dat emoties toont, in een indigokleurig jasje en met een kopje thee',
      'L\'assistant robot Make It So : un robot élégant dont l\'écran affiche des expressions, en veste indigo et tenant une tasse de thé'],

    // ----- navigation -----
    ['What we do', 'Wat we doen', 'Nos services'],
    ['Missions', 'Missies', 'Missions'],
    ['Mission log', 'Missielogboek', 'Journal de mission'],
    ['Process', 'Aanpak', 'Méthode'],
    ['About', 'Over ons', 'À propos'],
    ['Approach', 'Aanpak', 'Approche'],
    ['FAQ', 'Veelgestelde vragen', 'FAQ'],
    ['Hail us', 'Contact', 'Contact'],
    ['Engage', 'Vooruit', 'Engagez'],

    // ----- hero -----
    ['Captain\'s log ·', 'Kapiteinslogboek ·', 'Journal du capitaine ·'],
    ['Stardate', 'Sterrendatum', 'Date stellaire'],
    ['Watch it launch', 'Zie het opstijgen', 'Regardez-le décoller'],
    ['Make It So builds websites, apps and business software, and creates brand and marketing campaigns for small companies in Belgium.',
      'Make It So bouwt websites, apps en bedrijfssoftware en ontwikkelt merk- en marketingcampagnes voor kleine bedrijven in België.',
      'Make It So crée des sites web, des applications et des logiciels métier, ainsi que des campagnes de marque et de marketing pour les petites entreprises en Belgique.'],
    ['See the mission log', 'Bekijk het missielogboek', 'Voir le journal de mission'],
    ['days from brief', 'dagen van briefing', 'jours du brief'],
    ['to live campaign', 'tot live campagne', 'à la campagne en ligne'],
    ['reply time on', 'reactietijd op', 'délai de réponse à'],
    ['every message', 'elk bericht', 'chaque message'],
    ['boring decks.', 'saaie presentaties.', 'présentations ennuyeuses.'],
    ['Ever.', 'Nooit.', 'Jamais.'],

    // ----- chat card -----
    ['Bridge online', 'Brug online', 'Passerelle en ligne'],
    ['Hailing frequencies open', 'Kanalen geopend', 'Canaux ouverts'],
    ['Engaged ✦', 'Koers gezet ✦', 'En route ✦'],
    ['We launch in three weeks and nobody knows us yet.', 'We lanceren over drie weken en niemand kent ons nog.', 'Nous lançons dans trois semaines et personne ne nous connaît encore.'],
    ['Course plotted: brand, launch film and paid social, live in 14 days.',
      'Koers uitgezet: merk, lanceerfilm en betaalde social, live binnen 14 dagen.',
      `Cap fixé${NB}: marque, film de lancement et social payant, en ligne sous 14 jours.`],
    ['Wait, that\'s it? That was fast.', 'Wacht, is dat alles? Dat ging snel.', `Attendez, c'est tout${NB}? C'était rapide.`],
    ['Say the magic words…', 'Zeg de toverwoorden…', 'Dites les mots magiques…'],

    // ----- ticker + tags shared with cards -----
    ['Brand strategy', 'Merkstrategie', 'Stratégie de marque'],
    ['Social campaigns', 'Social campagnes', 'Campagnes sociales'],
    ['Launch films', 'Lanceerfilms', 'Films de lancement'],
    ['Paid media', 'Online adverteren', 'Publicité en ligne'],
    ['Web design', 'Webdesign', 'Design web'],
    ['Copywriting', 'Copywriting', 'Rédaction'],
    ['Influencers', 'Influencers', 'Influenceurs'],
    ['Analytics', 'Analytics', 'Analyses'],

    // ----- departments -----
    ['01 · Departments', '01 · Afdelingen', '01 · Départements'],
    ['Every department.', 'Elke afdeling.', 'Chaque département.'],
    ['One crew.', 'Eén team.', 'Un seul équipage.'],
    ['Explore service', 'Bekijk de afdeling', 'Explorer le service'],
    ['From the first spark of an idea to the campaign that everyone is talking about — one small, senior team, zero hand-offs.',
      'Van de eerste vonk van een idee tot de campagne waar iedereen over praat — één klein, ervaren team, nul overdrachten.',
      'De la première étincelle d\'une idée à la campagne dont tout le monde parle — une petite équipe senior, zéro relais.'],

    ['Brand & strategy', 'Merk & strategie', 'Marque & stratégie'],
    ['Positioning, naming, identity and a voice that sounds like nobody else.',
      'Positionering, naamgeving, identiteit en een stem die op niemand anders lijkt.',
      'Positionnement, naming, identité et une voix qui ne ressemble à aucune autre.'],
    ['Positioning', 'Positionering', 'Positionnement'],
    ['Identity', 'Identiteit', 'Identité'],
    ['Tone of voice', 'Tone of voice', 'Ton de marque'],

    ['Social & content', 'Social & content', 'Réseaux & contenu'],
    ['Scroll-stopping content and communities that keep the conversation going.',
      'Content die de scroll stopt en communities die het gesprek gaande houden.',
      'Du contenu qui arrête le scroll et des communautés qui font vivre la conversation.'],
    ['Content', 'Content', 'Contenu'],
    ['Creators', 'Creators', 'Créateurs'],

    ['Ads tuned weekly and reported honestly.',
      'Advertenties die we wekelijks optimaliseren en eerlijk rapporteren.',
      'Des annonces optimisées chaque semaine et un reporting honnête.'],
    ['Paid social', 'Betaalde social', 'Social payant'],
    ['Search', 'Zoekmachines', 'Recherche'],

    ['Web & landing pages', 'Web & landingspagina\'s', 'Web & pages d\'atterrissage'],
    ['Fast, beautiful pages built to turn attention into action.',
      'Snelle, mooie pagina\'s die aandacht omzetten in actie.',
      'Des pages rapides et belles, conçues pour transformer l\'attention en action.'],
    ['Websites', 'Websites', 'Sites web'],

    ['Video & motion', 'Video & motion', 'Vidéo & motion'],
    ['Launch films, reels and motion graphics with cinematic swagger.',
      'Lanceerfilms, reels en motion graphics met een filmische swagger.',
      'Films de lancement, reels et motion design avec un vrai panache cinématographique.'],

    ['Growth & analytics', 'Groei & analyse', 'Croissance & analyse'],
    ['Dashboards, experiments and insight, so every decision has data behind it.',
      'Dashboards, experimenten en inzichten, zodat elke beslissing op data rust.',
      'Tableaux de bord, expériences et analyses, pour que chaque décision s\'appuie sur des données.'],
    ['Dashboards', 'Dashboards', 'Tableaux de bord'],
    ['A/B tests', 'A/B-tests', 'Tests A/B'],

    // ----- mission log -----
    ['02 · Mission log', '02 · Missielogboek', '02 · Journal de mission'],
    ['Sample missions,', 'Voorbeeldmissies,', 'Exemples de missions,'],
    ['boldly designed.', 'gedurfd ontworpen.', 'conçues avec audace.'],
    ['Concept campaigns that show how we think. Your real case studies will live here.',
      'Conceptcampagnes die laten zien hoe wij denken. Jouw echte cases komen hier te staan.',
      'Des campagnes concept qui montrent notre façon de penser. Vos vraies études de cas viendront ici.'],
    ['Move.', 'Beweeg.', 'Bougez.'],
    ['Play.', 'Speel.', 'Jouez.'],
    ['Sample mission · Launch campaign', 'Voorbeeldmissie · Lanceringscampagne', 'Exemple de mission · Campagne de lancement'],
    ['Sample mission · Brand & content', 'Voorbeeldmissie · Merk & content', 'Exemple de mission · Marque & contenu'],
    ['Sample mission · Web & social', 'Voorbeeldmissie · Web & social', 'Exemple de mission · Web & social'],
    ['A roastery introduced to a whole city in one week: launch film, street takeover and paid social.',
      'Een koffiebranderij in één week bekend gemaakt bij een hele stad: lanceerfilm, straatactie en betaalde social.',
      `Une torréfaction présentée à toute une ville en une semaine${NB}: film de lancement, opération de rue et social payant.`],
    ['A new brand identity and a creator-led content engine for a boutique fitness studio.',
      'Een nieuwe merkidentiteit en een door creators gedreven contentmotor voor een boutique-fitnessstudio.',
      'Une nouvelle identité de marque et une machine à contenu portée par des créateurs pour un studio de fitness boutique.'],
    ['An immersive release site and a social rollout that turned listeners into a community.',
      'Een meeslepende releasesite en een social rollout die luisteraars tot een community maakte.',
      'Un site de sortie immersif et un déploiement social qui a transformé des auditeurs en communauté.'],
    ['Open mission profile', 'Bekijk missieprofiel', 'Voir le profil de mission'],

    // ----- process -----
    ['03 · Warp factor', '03 · Warpsnelheid', '03 · Vitesse de distorsion'],
    ['From idea to warp speed', 'Van idee naar warpsnelheid', 'De l\'idée à la vitesse de distorsion'],
    ['in four moves.', 'in vier stappen.', 'en quatre étapes.'],
    ['Scan', 'Scannen', 'Scanner'],
    ['We dig into your brand, audience and rivals to find the gap nobody is flying into.',
      'We duiken in je merk, doelgroep en concurrenten om de ruimte te vinden waar niemand naartoe vliegt.',
      'Nous explorons votre marque, votre public et vos concurrents pour trouver le vide où personne ne s\'aventure.'],
    ['Plot the course', 'Koers uitzetten', 'Tracer la route'],
    [`One sharp strategy: message, channels, budget and a timeline you can hold us to.`,
      'Één scherpe strategie: boodschap, kanalen, budget en een planning waar je ons aan kunt houden.',
      `Une stratégie précise${NB}: message, canaux, budget et un calendrier auquel vous pouvez nous tenir.`],
    ['Content, campaigns and web experiences built fast, tested hard and launched on schedule.',
      'Content, campagnes en webervaringen: snel gebouwd, grondig getest en op tijd gelanceerd.',
      `Contenu, campagnes et expériences web${NB}: conçus vite, testés à fond et lancés dans les délais.`],
    ['Log & learn', 'Loggen & leren', 'Noter & apprendre'],
    ['Clear reporting, honest insight and the next move already on the whiteboard.',
      'Heldere rapportage, eerlijke inzichten en de volgende zet staat al op het whiteboard.',
      'Un reporting clair, des analyses honnêtes et le prochain coup déjà au tableau.'],

    // ----- contact -----
    ['04 · Hailing frequencies open', '04 · Kanalen geopend', '04 · Canaux ouverts'],
    ['Ready to', 'Klaar voor', 'Prêt à'],
    ['engage', 'de start', 'décoller'],
    ['?', '?', `${NB}?`],
    ['Tell us what you\'re building. We reply within a day with a few first ideas — no deck, no obligation.',
      'Vertel ons wat je aan het bouwen bent. Binnen een dag reageren we met een paar eerste ideeën — geen presentatie, geen verplichtingen.',
      'Dites-nous ce que vous construisez. Nous répondons sous un jour avec quelques premières idées — sans présentation, sans engagement.'],
    ['Your name', 'Je naam', 'Votre nom'],
    ['Email', 'E-mail', 'E-mail'],
    ['you@company.com', 'jij@bedrijf.nl', 'vous@entreprise.fr'],
    ['What\'s the mission?', 'Wat is de missie?', `Quelle est la mission${NB}?`],
    ['A launch, a rebrand, a campaign that needs to be unmissable…',
      'Een lancering, een rebranding, een campagne die onmisbaar moet zijn…',
      'Un lancement, un rebranding, une campagne qui doit être incontournable…'],
    ['Send transmission', 'Verstuur transmissie', 'Envoyer la transmission'],
    ['Opening your mail app… if nothing happens, email hello@makeitso.studio directly.',
      'Je e-mailapp wordt geopend… gebeurt er niets, mail dan rechtstreeks naar hello@makeitso.studio.',
      'Ouverture de votre application de messagerie… si rien ne se passe, écrivez directement à hello@makeitso.studio.'],
    ['New mission from {name}', 'Nieuwe missie van {name}', 'Nouvelle mission de {name}'],
    ['Message received. We reply within a day.', 'Bericht ontvangen. We reageren binnen een dag.', 'Message reçu. Nous répondons sous un jour.'],

    // ----- footer -----
    ['Make It So. Creative marketing agency.', 'Make It So. Creatief marketingbureau.', 'Make It So. Agence de marketing créatif.'],
    ['Client login', 'Klantlogin', 'Connexion client'],
    ['Admin login', 'Admin login', 'Connexion admin'],
    ['Powered by Earl Grey. Hot. Live long and prosper.', 'Aangedreven door Earl Grey. Heet. Leef lang en voorspoedig.', 'Propulsé par du thé Earl Grey. Chaud. Longue vie et prospérité.']
  ];

  const LANGS = ['en', 'nl', 'fr'];
  const norm = (s) => s.replace(/\s+/g, ' ').trim();

  const dict = new Map();
  for (const [en, nl, fr] of ROWS) dict.set(norm(en), { en, nl, fr });

  // unit suffix for the animated "24h" counter
  const SUFFIX = { h: { en: 'h', nl: 'u', fr: ' h' } };

  const ATTRS = ['aria-label', 'placeholder', 'data-placeholder'];
  const META = ['meta[name="description"]', 'meta[property="og:title"]', 'meta[property="og:description"]'];

  const textOriginals = new WeakMap();
  const attrOriginals = new WeakMap();
  const listeners = [];
  let lang = 'en';
  let titleOriginal = null;

  const lookup = (key, to) => {
    const entry = dict.get(norm(key));
    return entry ? entry[to] : null;
  };

  function t(key, vars) {
    let out = lookup(key, lang) || key;
    if (vars) for (const [k, v] of Object.entries(vars)) out = out.replace(`{${k}}`, v);
    return out;
  }

  function applyText() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const p = node.parentElement;
        if (!p || /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/.test(p.tagName)) return NodeFilter.FILTER_REJECT;
        return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const original = textOriginals.get(node) ?? node.nodeValue;
      if (!dict.has(norm(original))) continue;
      textOriginals.set(node, original);
      const lead = original.match(/^\s*/)[0];
      const trail = original.match(/\s*$/)[0];
      node.nodeValue = lead + (lookup(original, lang) || norm(original)) + trail;
    }
  }

  function applyAttributes() {
    for (const attr of ATTRS) {
      for (const el of document.querySelectorAll(`[${attr}]`)) {
        const saved = attrOriginals.get(el) || {};
        const original = saved[attr] ?? el.getAttribute(attr);
        if (!dict.has(norm(original))) continue;
        saved[attr] = original;
        attrOriginals.set(el, saved);
        el.setAttribute(attr, lookup(original, lang) || original);
      }
    }
    for (const sel of META) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const saved = attrOriginals.get(el) || {};
      const original = saved.content ?? el.getAttribute('content');
      saved.content = original;
      attrOriginals.set(el, saved);
      el.setAttribute('content', lookup(original, lang) || original);
    }
    if (titleOriginal === null) titleOriginal = document.title;
    document.title = lookup(titleOriginal, lang) || titleOriginal;
  }

  function applySuffixes() {
    for (const el of document.querySelectorAll('[data-suffix]')) {
      if (!el.dataset.suffixKey) el.dataset.suffixKey = el.dataset.suffix;
      const map = SUFFIX[el.dataset.suffixKey];
      if (!map) continue;
      el.dataset.suffix = map[lang];
      const digits = el.textContent.match(/^\d+/);
      if (digits) el.textContent = digits[0] + map[lang];
    }
  }

  function set(next, { persist = true } = {}) {
    if (!LANGS.includes(next)) next = 'en';
    lang = next;
    document.documentElement.lang = lang;
    applyText();
    applyAttributes();
    applySuffixes();
    document.querySelectorAll('[data-lang]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.lang === lang));
    });
    if (persist) { try { localStorage.setItem('mis-lang', lang); } catch (e) { /* storage unavailable */ } }
    listeners.forEach((fn) => fn(lang));
  }

  function detect() {
    const fromUrl = new URLSearchParams(location.search).get('lang');
    if (LANGS.includes(fromUrl)) return fromUrl;
    try { const saved = localStorage.getItem('mis-lang'); if (LANGS.includes(saved)) return saved; } catch (e) { /* ignore */ }
    const browser = (navigator.language || 'en').slice(0, 2).toLowerCase();
    return LANGS.includes(browser) ? browser : 'en';
  }

  window.i18n = {
    t,
    set,
    get lang() { return lang; },
    onChange(fn) { listeners.push(fn); }
  };

  document.querySelectorAll('[data-lang]').forEach((btn) => btn.addEventListener('click', () => set(btn.dataset.lang)));

  const initial = detect();
  if (initial !== 'en') set(initial, { persist: false });
})();

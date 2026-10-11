(() => {
  'use strict';

  const { services, ui } = window.makeItSoServices;
  const app = document.querySelector('[data-service]');
  const current = services.find((service) => service.id === app?.dataset.service);
  const i18n = window.i18n;
  const webAppCopy = {
    en: {
      name: 'Websites, apps & software',
      intro: 'We design and build websites, web apps and custom business software for small companies—from polished front ends to reliable back ends and integrations.',
      tags: ['Websites & apps', 'Front end', 'Back end & integrations'],
      heading: 'One connected build.<br>Front to back.',
      summary: 'From discovery and architecture to interface and backend implementation, we build the right digital solution for the way your business works.',
      features: [
        ['Start with the real workflow', 'We map what your customers and team need the software to do, then agree the right scope and technical approach.'],
        ['Build a clear, useful interface', 'Responsive front ends make websites and apps easy to understand and use across devices.'],
        ['Connect the back end', 'Reliable application logic, data and integrations bring the experience together behind the scenes.']
      ]
    },
    nl: {
      name: 'Websites, apps & software',
      intro: 'We ontwerpen en bouwen websites, webapps en bedrijfssoftware op maat voor kleine bedrijven — van sterke front-ends tot betrouwbare back-ends en koppelingen.',
      tags: ['Websites & apps', 'Front-end', 'Back-end & koppelingen'],
      heading: 'Eén samenhangend systeem.<br>Van voor tot achter.',
      summary: 'Van analyse en architectuur tot interface en backend: we bouwen de digitale oplossing die past bij de manier waarop jouw bedrijf werkt.',
      features: [
        ['Vertrek vanuit het echte werkproces', 'We brengen in kaart wat klanten en medewerkers nodig hebben en bepalen samen de juiste scope en technische aanpak.'],
        ['Bouw een heldere, bruikbare interface', 'Responsieve front-ends maken websites en apps eenvoudig te begrijpen en te gebruiken op elk apparaat.'],
        ['Verbind de back-end', 'Betrouwbare softwarelogica, gegevens en koppelingen brengen de volledige ervaring samen.']
      ]
    },
    fr: {
      name: 'Sites web, apps & logiciels',
      intro: 'Nous concevons des sites web, des applications et des logiciels métier sur mesure pour les petites entreprises, du front-end soigné au back-end et aux intégrations fiables.',
      tags: ['Sites web & apps', 'Front-end', 'Back-end & intégrations'],
      heading: 'Un système cohérent.<br>Du front au back.',
      summary: 'De l’analyse et de l’architecture aux interfaces et au back-end, nous créons une solution numérique adaptée au fonctionnement de votre entreprise.',
      features: [
        ['Partir des vrais besoins', 'Nous clarifions les besoins de vos clients et de votre équipe, puis définissons ensemble le périmètre et l’approche technique.'],
        ['Créer une interface claire et utile', 'Des interfaces front-end adaptatives rendent les sites et les applications faciles à comprendre et à utiliser sur chaque appareil.'],
        ['Relier le back-end', 'La logique applicative, les données et les intégrations réunissent toute l’expérience en coulisses.']
      ]
    }
  };

  const projectExamples = {
    'brand-strategy': {
      project: 'nova-bakery',
      image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=85',
      alt: {
        en: 'Fresh artisan bread in a neighborhood bakery',
        nl: 'Vers ambachtelijk brood in een buurtbakkerij',
        fr: 'Pains artisanaux frais dans une boulangerie de quartier'
      },
      locales: {
        en: { sampleTitle: 'Nova Bakery finds its own voice.', sampleBody: 'A neighborhood bakery gets a distinctive brand platform: clear positioning, a warm visual identity and a launch story rooted in its craft and community.', deliverables: 'Positioning · Logo & visual identity · Brand voice' },
        nl: { sampleTitle: 'Nova Bakery krijgt een eigen verhaal.', sampleBody: 'Een buurtbakkerij krijgt een herkenbaar merkfundament: een heldere positionering, een warme visuele identiteit en een lanceringsverhaal dat past bij het vak en de buurt.', deliverables: 'Positionering · Logo & visuele identiteit · Merktaal' },
        fr: { sampleTitle: 'Nova Bakery affirme sa personnalité.', sampleBody: 'Une boulangerie de quartier se dote d’une plateforme de marque distinctive : positionnement clair, identité visuelle chaleureuse et récit de lancement ancré dans son savoir-faire.', deliverables: 'Positionnement · Logo & identité visuelle · Ton de marque' }
      }
    },
    'social-content': {
      project: 'move-studio',
      image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=85',
      alt: {
        en: 'Bright independent fitness studio with strength training equipment',
        nl: 'Lichte onafhankelijke fitnessstudio met krachttrainingsmateriaal',
        fr: 'Studio de fitness indépendant et lumineux avec équipements de musculation'
      },
      locales: {
        en: { sampleTitle: 'Move Studio gets the community moving.', sampleBody: 'A welcoming movement studio builds a social presence with coach-led clips, member stories and an easy invitation to try a first class.', deliverables: 'Social concept · Coach & member stories · Content calendar' },
        nl: { sampleTitle: 'Move Studio brengt de buurt in beweging.', sampleBody: 'Een toegankelijke bewegingsstudio bouwt aan een herkenbare social presence met coachvideo’s, ledenverhalen en een uitnodiging om een eerste les te proberen.', deliverables: 'Socialconcept · Verhalen van coaches & leden · Contentkalender' },
        fr: { sampleTitle: 'Move Studio met son quartier en mouvement.', sampleBody: 'Un studio accueillant développe sa présence sociale avec des vidéos de coachs, des témoignages de membres et une invitation simple à essayer un premier cours.', deliverables: 'Concept social · Témoignages · Calendrier éditorial' }
      }
    },
    'paid-media': {
      project: 'roam-rental',
      image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=85',
      alt: {
        en: 'Modern car ready for a scenic weekend trip',
        nl: 'Moderne auto klaar voor een mooie weekendrit',
        fr: 'Voiture moderne prête pour une escapade panoramique'
      },
      locales: {
        en: { sampleTitle: 'Roam puts the next trip in reach.', sampleBody: 'A local car-rental company reaches people planning a getaway with focused search and social campaigns, clear vehicle choices and a direct route to booking.', deliverables: 'Campaign plan · Paid social · Search ads' },
        nl: { sampleTitle: 'Roam brengt je volgende trip dichtbij.', sampleBody: 'Een lokaal autoverhuurbedrijf bereikt mensen die een uitstap plannen met gerichte zoek- en socialcampagnes, duidelijke autokeuzes en een directe route naar boeken.', deliverables: 'Campagneplan · Paid social · Zoekadvertenties' },
        fr: { sampleTitle: 'Roam rapproche votre prochaine escapade.', sampleBody: 'Une agence de location locale touche les personnes qui préparent un voyage grâce à des campagnes ciblées sur les réseaux et la recherche, avec un accès direct à la réservation.', deliverables: 'Plan de campagne · Réseaux sociaux payants · Annonces de recherche' }
      }
    },
    'web-landing-pages': {
      project: 'roam-rental',
      image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=85',
      alt: {
        en: 'Modern car ready for a scenic weekend trip',
        nl: 'Moderne auto klaar voor een mooie weekendrit',
        fr: 'Voiture moderne prête pour une escapade panoramique'
      },
      locales: {
        en: { sampleTitle: 'Roam makes booking feel effortless.', sampleBody: 'A clear, responsive rental website helps visitors compare vehicles, understand the essentials and reserve the right car in a few simple steps.', deliverables: 'User journey · Responsive website · Booking flow' },
        nl: { sampleTitle: 'Roam maakt boeken eenvoudig.', sampleBody: 'Een heldere, responsive verhuurwebsite helpt bezoekers auto’s vergelijken, de voorwaarden begrijpen en in enkele stappen de juiste wagen reserveren.', deliverables: 'Klantreis · Responsive website · Boekingsproces' },
        fr: { sampleTitle: 'Roam simplifie la réservation.', sampleBody: 'Un site de location clair et responsive aide à comparer les véhicules, à comprendre les conditions et à réserver la bonne voiture en quelques étapes.', deliverables: 'Parcours utilisateur · Site responsive · Réservation' }
      }
    },
    'video-motion': {
      project: 'nova-bakery',
      image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=85',
      alt: {
        en: 'Fresh artisan bread in a neighborhood bakery',
        nl: 'Vers ambachtelijk brood in een buurtbakkerij',
        fr: 'Pains artisanaux frais dans une boulangerie de quartier'
      },
      locales: {
        en: { sampleTitle: 'Nova Bakery turns craft into a story.', sampleBody: 'A short launch film follows the baker from first light to fresh loaves, with social edits that introduce the people and rituals behind the brand.', deliverables: 'Creative concept · Launch film · Social edits' },
        nl: { sampleTitle: 'Nova Bakery brengt het vak in beeld.', sampleBody: 'Een korte lanceringsfilm volgt de bakker van het eerste ochtendlicht tot de verse broden, met social edits over de mensen en rituelen achter het merk.', deliverables: 'Creatief concept · Lanceringsfilm · Social edits' },
        fr: { sampleTitle: 'Nova Bakery raconte son savoir-faire.', sampleBody: 'Un court film de lancement suit la boulangère des premières lueurs aux pains tout juste sortis du four, décliné en formats sociaux sur les personnes et les gestes du métier.', deliverables: 'Concept créatif · Film de lancement · Formats sociaux' }
      }
    },
    'growth-analytics': {
      project: 'roam-rental',
      image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=85',
      alt: {
        en: 'Modern car ready for a scenic weekend trip',
        nl: 'Moderne auto klaar voor een mooie weekendrit',
        fr: 'Voiture moderne prête pour une escapade panoramique'
      },
      locales: {
        en: { sampleTitle: 'Roam learns what drives bookings.', sampleBody: 'A practical measurement plan shows where rental customers discover, compare and book—then turns the biggest drop-offs into focused website experiments.', deliverables: 'Measurement plan · Booking dashboard · Test roadmap' },
        nl: { sampleTitle: 'Roam ontdekt wat boekingen oplevert.', sampleBody: 'Een praktisch meetplan toont waar huurders ontdekken, vergelijken en boeken. De grootste uitval wordt vertaald naar gerichte experimenten op de website.', deliverables: 'Meetplan · Boekingsdashboard · Testroadmap' },
        fr: { sampleTitle: 'Roam comprend ce qui déclenche les réservations.', sampleBody: 'Un plan de mesure concret révèle où les clients découvrent, comparent et réservent. Les principaux points de friction deviennent des tests ciblés sur le site.', deliverables: 'Plan de mesure · Tableau de bord des réservations · Feuille de tests' }
      }
    }
  };

  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  if (!app || !current) {
    document.title = 'Service not found — Make It So';
    const content = document.querySelector('#service-content');
    if (content) content.innerHTML = '<section class="wrap service-missing"><h1>Service not found</h1><p><a href="/#departments">Return to departments</a></p></section>';
    return;
  }

  const localizedUrl = (href, language) => {
    const url = new URL(href, location.origin);
    url.searchParams.set('lang', language);
    return `${url.pathname}${url.search}${url.hash}`;
  };

  function render() {
    const language = i18n?.lang || 'en';
    const baseCopy = current.locales[language] || current.locales.en;
    const example = projectExamples[current.id];
    const copy = {
      ...baseCopy,
      ...(current.id === 'web-landing-pages' ? webAppCopy[language] : {}),
      ...(example.locales[language] || example.locales.en)
    };
    const labels = ui[language] || ui.en;
    const index = services.indexOf(current);
    document.documentElement.lang = language;
    document.title = `${copy.name} — Make It So`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', copy.intro);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', current.color);

    const related = services.filter((service) => service !== current);
    const features = copy.features.map(([title, body], featureIndex) => `
      <article class="service-feature">
        <span class="service-feature-num">${String(featureIndex + 1).padStart(2, '0')}</span>
        <h3>${escape(title)}</h3><p>${escape(body)}</p>
      </article>`).join('');

    app.dataset.serviceId = current.id;
    app.style.setProperty('--service-color', current.color);
    app.innerHTML = `
      <section class="detail-hero">
        <div class="detail-orbit" aria-hidden="true"></div>
        <div class="detail-wrap detail-grid">
          <div class="detail-copy">
            <a class="detail-back" href="${localizedUrl('/#departments', language)}">← ${escape(labels.back)}</a>
            <p class="detail-kicker">${String(index + 1).padStart(2, '0')} · ${escape(labels.category)} · ${escape(copy.name)}</p>
            <h1>${escape(copy.title[0])}<br><span>${escape(copy.title[1])}</span></h1>
            <p class="detail-intro">${escape(copy.intro)}</p>
            <ul class="detail-tags">${copy.tags.map((tag) => `<li>${escape(tag)}</li>`).join('')}</ul>
            <div class="detail-actions">
              <a class="btn btn-white btn-sm" href="#service-example">${escape(labels.explore)} <span class="chip" aria-hidden="true">→</span></a>
              <a class="detail-contact" href="${localizedUrl('/#contact', language)}">${escape(labels.start)}</a>
            </div>
          </div>
          <aside class="service-scan" aria-label="${escape(copy.visual)}">
            <div class="service-scan-head"><span>${escape(copy.name.toUpperCase())} · ${escape(labels.scan)}</span><span class="scan-live">● LIVE</span></div>
            <div class="service-scan-screen">
              <div class="scan-orbits" aria-hidden="true"><i></i><i></i><i></i></div>
              <div class="scan-emblem" aria-hidden="true">${escape(current.icon)}</div>
              <span class="scan-mark">${escape(labels.status)}</span>
              <strong>${escape(copy.visual)}</strong>
              <div class="scan-bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
            </div>
            <p>${escape(copy.summary)}</p>
          </aside>
        </div>
      </section>
      <section class="detail-section">
        <div class="detail-section-head">
          <div><p class="detail-overline">${escape(labels.what)} · ${escape(copy.name)}</p><h2>${copy.heading}</h2></div>
          <p>${escape(copy.summary)}</p>
        </div>
        <div class="service-features">${features}</div>
      </section>
      <section class="service-example" id="service-example">
        <div class="example-copy">
          <p class="example-label">${escape(labels.example)}</p>
          <h2>${escape(copy.sampleTitle)}</h2>
          <p>${escape(copy.sampleBody)}</p>
          <div class="example-deliverables"><span aria-hidden="true">✦</span>${escape(copy.deliverables)}</div>
          <a class="example-project-link" href="${localizedUrl(`/missions/${example.project}/`, language)}">${escape(labels.fullProject)} <span aria-hidden="true">↗</span></a>
        </div>
        <div class="example-art" aria-label="${escape(copy.sampleTitle)}">
          <img class="example-art-photo" src="${escape(example.image)}" alt="${escape(example.alt[language] || example.alt.en)}" loading="lazy" decoding="async">
          <span class="example-star star-a" aria-hidden="true">✦</span>
          <span class="example-star star-b" aria-hidden="true">✧</span>
          <span class="example-planet" aria-hidden="true">${escape(current.icon)}</span>
          <span class="example-art-caption">${escape(labels.sample)} <i>·</i> ${escape(copy.name)}</span>
        </div>
      </section>
      <section class="service-related">
        <p class="detail-overline">${escape(labels.other)}</p>
        <nav aria-label="${escape(labels.other)}" class="service-related-links">
          ${related.map((service) => {
            const otherCopy = service.locales[language] || service.locales.en;
            return `<a href="${localizedUrl(`/services/${service.id}/`, language)}" style="--related-color:${service.color}"><i aria-hidden="true"></i>${escape(otherCopy.name)}<span aria-hidden="true">↗</span></a>`;
          }).join('')}
        </nav>
      </section>`;

    const footer = document.querySelector('[data-service-footer]');
    if (footer) {
      footer.innerHTML = related.map((service) => {
        const otherCopy = service.locales[language] || service.locales.en;
        return `<a href="${localizedUrl(`/services/${service.id}/`, language)}" style="--related-color:${service.color}">${escape(otherCopy.name)}</a>`;
      }).join('');
    }
    document.querySelectorAll('.service-header a[href^="/"]').forEach((link) => {
      link.href = localizedUrl(link.getAttribute('href'), language);
    });
  }

  render();
  i18n?.onChange(render);
})();

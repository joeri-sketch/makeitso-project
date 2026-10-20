(() => {
  'use strict';

  // Published apps and software. Add an entry to list it on this page.
  // links.platform is one of: web, windows, macos, ios, android.
  // href must be a site path (/portal/) or an http(s) URL.
  const DOWNLOADS = [
    // {
    //   id: 'field-notes',
    //   version: '1.0.0',
    //   updated: '2026-10-20',
    //   links: [
    //     { platform: 'web', href: 'https://example.com' },
    //     { platform: 'windows', href: 'https://example.com/field-notes-setup.exe' },
    //     { platform: 'macos', href: 'https://example.com/field-notes.dmg' }
    //   ],
    //   name: { en: 'Field Notes', nl: 'Field Notes', fr: 'Field Notes' },
    //   summary: {
    //     en: 'A short description of what the software does.',
    //     nl: 'Een korte omschrijving van wat de software doet.',
    //     fr: 'Une courte description de ce que fait le logiciel.'
    //   }
    // }
  ];

  const PLATFORMS = ['web', 'windows', 'macos', 'ios', 'android'];
  const COPY = {
    en: {
      title: 'Downloads — Make It So',
      description: 'Download the apps and software published by Make It So.',
      back: 'Back to home',
      kicker: '04 · Downloads',
      headline: ['Apps and', 'software.'],
      intro: 'Find the apps and software we publish. Each listing shows the current version and where to open or download it.',
      tags: ['Web apps', 'Desktop', 'Mobile'],
      signal: 'APPS → SOFTWARE',
      section: 'Available software',
      lead: 'Choose a platform and take the current version. These listings are updated when we publish a new release.',
      emptyTitle: 'Nothing listed yet.',
      empty: 'When an app or piece of software is ready to share, it appears here with its version and download.',
      all: 'All',
      open: 'Open app',
      download: 'Download',
      version: 'Version',
      updated: 'Updated',
      noneForPlatform: 'Nothing is listed for this platform.',
      unavailable: 'Not available for download yet.',
      asideTitle: 'The current release, in one place.',
      aside: 'This page lists software we have published. It does not install anything by itself, and it does not check whether a copy on your computer is up to date.',
      ctaTitle: 'Need something built?',
      cta: 'Tell us about the app or system you want. We can scope it as a project.',
      ctaLink: 'Tell us what you need',
      platforms: { web: 'Web', windows: 'Windows', macos: 'macOS', ios: 'iOS', android: 'Android' }
    },
    nl: {
      title: 'Downloads — Make It So',
      description: 'Download de apps en software die Make It So publiceert.',
      back: 'Terug naar start',
      kicker: '04 · Downloads',
      headline: ['Apps en', 'software.'],
      intro: 'Vind de apps en software die wij publiceren. Bij elke vermelding zie je de huidige versie en waar je die opent of downloadt.',
      tags: ['Webapps', 'Desktop', 'Mobiel'],
      signal: 'APPS → SOFTWARE',
      section: 'Beschikbare software',
      lead: 'Kies een platform en neem de huidige versie. Deze lijst wordt bijgewerkt wanneer we een nieuwe release publiceren.',
      emptyTitle: 'Nog niets vermeld.',
      empty: 'Zodra een app of software klaar is om te delen, verschijnt die hier met versie en download.',
      all: 'Alles',
      open: 'Open de app',
      download: 'Downloaden',
      version: 'Versie',
      updated: 'Bijgewerkt',
      noneForPlatform: 'Voor dit platform staat er nog niets.',
      unavailable: 'Nog niet beschikbaar om te downloaden.',
      asideTitle: 'De huidige release, op één plek.',
      aside: 'Deze pagina toont software die wij hebben gepubliceerd. Ze installeert niets vanzelf en controleert niet of een kopie op je computer up-to-date is.',
      ctaTitle: 'Iets laten bouwen?',
      cta: 'Vertel ons welke app of welk systeem je nodig hebt. We kunnen het als project afbakenen.',
      ctaLink: 'Start een gesprek',
      platforms: { web: 'Web', windows: 'Windows', macos: 'macOS', ios: 'iOS', android: 'Android' }
    },
    fr: {
      title: 'Téléchargements — Make It So',
      description: 'Téléchargez les applications et logiciels publiés par Make It So.',
      back: 'Retour à l’accueil',
      kicker: '04 · Téléchargements',
      headline: ['Applications', 'et logiciels.'],
      intro: 'Retrouvez les applications et logiciels que nous publions. Chaque fiche indique la version actuelle et où l’ouvrir ou la télécharger.',
      tags: ['Applications web', 'Bureau', 'Mobile'],
      signal: 'APPS → LOGICIELS',
      section: 'Logiciels disponibles',
      lead: 'Choisissez une plateforme et prenez la version actuelle. Cette liste est mise à jour à chaque nouvelle version publiée.',
      emptyTitle: 'Rien n’est listé pour le moment.',
      empty: 'Lorsqu’une application ou un logiciel est prêt à être partagé, il apparaît ici avec sa version et son téléchargement.',
      all: 'Tout',
      open: 'Ouvrir l’application',
      download: 'Télécharger',
      version: 'Version',
      updated: 'Mis à jour',
      noneForPlatform: 'Rien n’est listé pour cette plateforme.',
      unavailable: 'Pas encore disponible au téléchargement.',
      asideTitle: 'La version actuelle, au même endroit.',
      aside: 'Cette page présente les logiciels que nous avons publiés. Elle n’installe rien toute seule et ne vérifie pas si la copie sur votre ordinateur est à jour.',
      ctaTitle: 'Besoin d’un outil sur mesure ?',
      cta: 'Parlez-nous de l’application ou du système dont vous avez besoin. Nous pouvons le cadrer comme un projet.',
      ctaLink: 'Parlons de votre projet',
      platforms: { web: 'Web', windows: 'Windows', macos: 'macOS', ios: 'iOS', android: 'Android' }
    }
  };

  const app = document.querySelector('[data-downloads]');
  if (!app) return;

  const state = { platform: 'all' };
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  const safeHref = (href) => {
    if (typeof href !== 'string') return '';
    if (href.startsWith('/') && !href.startsWith('//')) return href;
    try {
      const url = new URL(href);
      if (url.protocol === 'https:' || url.protocol === 'http:') return url.href;
    } catch { /* Drop anything that is not a normal web address. */ }
    return '';
  };

  const localizedUrl = (href, language) => {
    if (!href.startsWith('/')) return href;
    const url = new URL(href, location.origin);
    url.searchParams.set('lang', language);
    return `${url.pathname}${url.search}${url.hash}`;
  };

  const text = (entry, field, language) => {
    const value = entry?.[field];
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value[language] || value.en || '';
  };

  const published = DOWNLOADS.map((entry) => {
    const links = (Array.isArray(entry.links) ? entry.links : [])
      .map((link) => ({ platform: link.platform, href: safeHref(link.href) }))
      .filter((link) => PLATFORMS.includes(link.platform) && link.href);
    return { ...entry, links };
  }).filter((entry) => entry.id && text(entry, 'name', 'en'));

  const availablePlatforms = PLATFORMS.filter((platform) => published.some((entry) => entry.links.some((link) => link.platform === platform)));

  function render() {
    const language = window.i18n?.lang || 'en';
    const copy = COPY[language] || COPY.en;
    document.documentElement.lang = language;
    document.title = copy.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', copy.description);
    if (!availablePlatforms.includes(state.platform)) state.platform = 'all';

    const visible = published.filter((entry) => state.platform === 'all' || entry.links.some((link) => link.platform === state.platform));
    const filters = availablePlatforms.length
      ? `<div class="download-filters" role="group" aria-label="${escape(copy.section)}">${['all', ...availablePlatforms].map((platform) => `
          <button type="button" data-platform="${escape(platform)}" aria-pressed="${state.platform === platform}">${escape(platform === 'all' ? copy.all : copy.platforms[platform])}</button>`).join('')}</div>`
      : '';
    const cards = published.length
      ? (visible.length
        ? `<div class="download-grid">${visible.map((entry, index) => {
          const links = entry.links.filter((link) => state.platform === 'all' || link.platform === state.platform);
          const actions = links.length
            ? links.map((link) => {
              const external = !link.href.startsWith('/');
              const href = localizedUrl(link.href, language);
              const label = link.platform === 'web' ? copy.open : copy.download;
              return `<a class="btn btn-orange btn-sm" href="${escape(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escape(label)}<span>${escape(copy.platforms[link.platform])}</span></a>`;
            }).join('')
            : `<p class="download-pending">${escape(copy.unavailable)}</p>`;
          const updated = entry.updated && Number.isFinite(Date.parse(entry.updated))
            ? new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(new Date(entry.updated))
            : '';
          const meta = [
            entry.version ? `${copy.version} ${entry.version}` : '',
            updated ? `${copy.updated} ${updated}` : ''
          ].filter(Boolean).join(' · ');
          return `<article class="download-card">
            <span class="download-num">${String(index + 1).padStart(2, '0')}</span>
            <div>
              <h3>${escape(text(entry, 'name', language))}</h3>
              ${meta ? `<p class="download-meta">${escape(meta)}</p>` : ''}
              <p>${escape(text(entry, 'summary', language))}</p>
              <ul class="download-platforms">${entry.links.map((link) => `<li>${escape(copy.platforms[link.platform])}</li>`).join('')}</ul>
            </div>
            <div class="download-actions">${actions}</div>
          </article>`;
        }).join('')}</div>`
        : `<p class="download-empty">${escape(copy.noneForPlatform)}</p>`)
      : `<article class="download-empty"><h3>${escape(copy.emptyTitle)}</h3><p>${escape(copy.empty)}</p></article>`;

    app.innerHTML = `
      <section class="studio-hero">
        <div class="studio-hero-orbit" aria-hidden="true"><i></i><i></i><span>↓</span></div>
        <div class="studio-hero-copy">
          <a class="detail-back" href="${localizedUrl('/', language)}">← ${escape(copy.back)}</a>
          <p class="studio-kicker">${escape(copy.kicker)}</p>
          <h1>${escape(copy.headline[0])}<br><span>${escape(copy.headline[1])}</span></h1>
          <p class="studio-intro">${escape(copy.intro)}</p>
          <ul class="detail-tags">${copy.tags.map((tag) => `<li>${escape(tag)}</li>`).join('')}</ul>
        </div>
        <div class="studio-signal" aria-hidden="true"><span class="studio-signal-label">MAKE IT SO · DOWNLOADS</span><strong>${escape(copy.signal)}</strong><div class="studio-signal-line"><i></i><i></i><i></i><i></i><i></i></div><span class="studio-signal-status">● ${language === 'nl' ? 'KOERS BEPAALD' : language === 'fr' ? 'CAP DÉFINI' : 'COURSE SET'}</span></div>
      </section>
      <section class="studio-section">
        <header class="studio-section-head"><div><p class="detail-overline">${escape(copy.kicker)}</p><h2>${escape(copy.section)}</h2></div><p>${escape(copy.lead)}</p></header>
        ${filters}
        ${cards}
      </section>
      <section class="studio-aside">
        <span class="studio-aside-mark" aria-hidden="true">↓</span>
        <div><p class="studio-kicker">${escape(copy.kicker)}</p><h2>${escape(copy.asideTitle)}</h2></div>
        <p>${escape(copy.aside)}</p>
      </section>
      <section class="studio-cta">
        <div><p class="studio-kicker">${escape(copy.kicker)}</p><h2>${escape(copy.ctaTitle)}</h2><p>${escape(copy.cta)}</p></div>
        <a class="btn btn-orange btn-lg" href="${localizedUrl('/#contact', language)}">${escape(copy.ctaLink)} <span class="chip" aria-hidden="true">→</span></a>
      </section>`;
  }

  app.addEventListener('click', (event) => {
    const button = event.target.closest('[data-platform]');
    if (!button || !app.contains(button)) return;
    state.platform = button.dataset.platform;
    render();
  });

  render();
  window.i18n?.onChange(render);
})();

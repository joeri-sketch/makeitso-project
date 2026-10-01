(() => {
  'use strict';

  const { missions, ui } = window.makeItSoMissions;
  const app = document.querySelector('[data-mission]');
  const current = missions.find((mission) => mission.id === app?.dataset.mission);
  const i18n = window.i18n;
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  if (!app || !current) {
    document.title = 'Mission not found — Make It So';
    const content = document.querySelector('#mission-content');
    if (content) content.innerHTML = '<section class="wrap service-missing"><h1>Mission not found</h1><p><a href="/#missions">Return to the mission log</a></p></section>';
    return;
  }

  const localizedUrl = (href, language) => {
    const url = new URL(href, location.origin);
    url.searchParams.set('lang', language);
    return `${url.pathname}${url.search}${url.hash}`;
  };

  function render() {
    const language = i18n?.lang || 'en';
    const copy = current.locales[language] || current.locales.en;
    const labels = ui[language] || ui.en;
    const index = missions.indexOf(current);
    const related = missions.filter((mission) => mission !== current);

    document.documentElement.lang = language;
    document.title = `${copy.name} · Mission log — Make It So`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', copy.intro);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', current.color);
    app.style.setProperty('--service-color', current.color);
    app.style.setProperty('--mission-color', current.color);
    app.dataset.missionId = current.id;
    app.innerHTML = `
      <section class="detail-hero">
        <div class="detail-orbit" aria-hidden="true"></div>
        <div class="detail-wrap detail-grid">
          <div class="detail-copy">
            <a class="detail-back" href="${localizedUrl('/#missions', language)}">← ${escape(labels.back)}</a>
            <p class="detail-kicker">${String(index + 1).padStart(2, '0')} · ${escape(labels.category)} · ${escape(copy.category)}</p>
            <h1>${escape(copy.title[0])}<br><span>${escape(copy.title[1])}</span></h1>
            <p class="detail-intro">${escape(copy.intro)}</p>
            <ul class="detail-tags">${copy.tags.map((tag) => `<li>${escape(tag)}</li>`).join('')}</ul>
            <span class="mission-concept">${escape(labels.concept)}</span>
          </div>
          <aside class="service-scan" aria-label="${escape(copy.visual)}">
            <div class="service-scan-head"><span>${escape(copy.name.toUpperCase())} · ${escape(labels.status)}</span><span class="scan-live">● LIVE</span></div>
            <div class="service-scan-screen">
              <div class="scan-orbits" aria-hidden="true"><i></i><i></i><i></i></div>
              <div class="scan-emblem" aria-hidden="true">${escape(current.icon)}</div>
              <span class="scan-mark">${escape(labels.status)}</span>
              <strong>${escape(copy.visual)}</strong>
              <div class="scan-bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
            </div>
          </aside>
        </div>
      </section>
      <section class="detail-section">
        <div class="mission-brief">
          <div>
            <p class="detail-overline">${escape(labels.brief)} · ${escape(copy.name)}</p>
            <h2>${escape(copy.briefTitle)}</h2>
          </div>
          <p class="mission-brief-copy">${escape(copy.brief)}</p>
        </div>
        <div class="mission-brief mission-plan-heading">
          <div>
            <p class="detail-overline">${escape(labels.plan)}</p>
            <h2>${escape(copy.planTitle)}</h2>
          </div>
          <p class="mission-brief-copy">${escape(copy.planIntro)}</p>
        </div>
        <div class="mission-plan">
          ${copy.steps.map(([title, body], stepIndex) => `
            <article>
              <span>${String(stepIndex + 1).padStart(2, '0')} · ${escape(labels.plan)}</span>
              <h3>${escape(title.replace(/^\d{2} · /, ''))}</h3>
              <p>${escape(body)}</p>
            </article>`).join('')}
        </div>
      </section>
      <section class="service-example mission-example">
        <div class="example-copy">
          <p class="example-label">${escape(labels.concept)}</p>
          <h2>${escape(copy.name)}</h2>
          <p>${escape(copy.planIntro)}</p>
          <div class="example-deliverables"><span aria-hidden="true">✦</span>${escape(copy.deliverables)}</div>
        </div>
        <div class="example-art" aria-label="${escape(copy.visual)}">
          <span class="example-star star-a" aria-hidden="true">✦</span>
          <span class="example-star star-b" aria-hidden="true">✧</span>
          <span class="example-planet" aria-hidden="true">${escape(current.icon)}</span>
          <span class="example-art-caption">${escape(labels.category)} <i>·</i> ${escape(copy.name)}</span>
        </div>
      </section>
      <p class="mission-note"><strong>${escape(labels.concept)}:</strong> ${escape(labels.note)}</p>
      <section class="mission-cta">
        <p class="detail-overline">${escape(labels.start)}</p>
        <a class="btn btn-orange btn-sm" href="${localizedUrl('/#contact', language)}">${escape(labels.start)} <span class="chip" aria-hidden="true">→</span></a>
      </section>
      <section class="service-related">
        <p class="detail-overline">${escape(labels.other)}</p>
        <nav aria-label="${escape(labels.other)}" class="service-related-links">
          ${related.map((mission) => {
            const otherCopy = mission.locales[language] || mission.locales.en;
            return `<a href="${localizedUrl(`/missions/${mission.id}/`, language)}" style="--related-color:${mission.color}"><i aria-hidden="true"></i>${escape(otherCopy.name)}<span aria-hidden="true">↗</span></a>`;
          }).join('')}
        </nav>
      </section>`;
  }

  render();
  i18n?.onChange(render);
})();

(() => {
  'use strict';

  const { services, ui } = window.makeItSoServices;
  const app = document.querySelector('[data-service]');
  const current = services.find((service) => service.id === app?.dataset.service);
  const i18n = window.i18n;

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
    const copy = current.locales[language] || current.locales.en;
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
        </div>
        <div class="example-art" aria-label="${escape(copy.sampleTitle)}">
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

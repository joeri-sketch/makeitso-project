import { languages, pageUrl, seoPages, siteOrigin } from './seo-data.js';

const path = location.pathname.replace(/index\.html$/, '');
const page = seoPages.find((entry) => entry.path === path);

function meta(attribute, key, value) {
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.append(element);
  }
  element.content = value;
}

function link(rel, href, language) {
  const selector = language ? `link[rel="${rel}"][hreflang="${language}"]` : `link[rel="${rel}"]`;
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('link');
    element.rel = rel;
    if (language) element.hreflang = language;
    document.head.append(element);
  }
  element.href = href;
}

function updateSeo() {
  if (!page) return;
  const language = window.i18n?.lang || 'en';
  const index = languages.indexOf(language);
  const title = page.titles[index];
  const description = page.descriptions[index];
  const url = pageUrl(path, language);
  document.title = title;
  meta('name', 'description', description);
  meta('property', 'og:title', title);
  meta('property', 'og:description', description);
  meta('property', 'og:type', 'website');
  meta('property', 'og:site_name', 'Make It So');
  meta('property', 'og:url', url);
  meta('property', 'og:locale', { en: 'en_GB', nl: 'nl_BE', fr: 'fr_BE' }[language]);
  meta('property', 'og:image', `${siteOrigin}/brand/social-preview.png`);
  meta('property', 'og:image:width', '1200');
  meta('property', 'og:image:height', '630');
  meta('property', 'og:image:alt', 'Make It So — websites, apps, branding & marketing');
  meta('name', 'twitter:card', 'summary_large_image');
  meta('name', 'twitter:title', title);
  meta('name', 'twitter:description', description);
  meta('name', 'twitter:image', `${siteOrigin}/brand/social-preview.png`);
  link('canonical', url);
  for (const locale of languages) link('alternate', pageUrl(path, locale), locale);
  link('alternate', pageUrl(path, 'en'), 'x-default');

  const businessId = `${siteOrigin}/#business`;
  const business = {
    '@type': 'ProfessionalService',
    '@id': businessId,
    name: 'Make It So',
    url: `${siteOrigin}/`,
    image: `${siteOrigin}/brand/social-preview.png`,
    logo: `${siteOrigin}/brand/make-it-so-icon.png`,
    email: 'hello@makeitso.studio',
    vatID: 'BE1030043889',
    address: {
      '@type': 'PostalAddress', streetAddress: 'Stichelendries 47/A',
      postalCode: '9340', addressLocality: 'Oordegem (Lede)', addressCountry: 'BE'
    },
    areaServed: { '@type': 'Country', name: 'Belgium' }
  };
  const graph = [
    business,
    {
      '@type': 'WebSite', '@id': `${siteOrigin}/#website`, url: `${siteOrigin}/`,
      name: 'Make It So', publisher: { '@id': businessId }, inLanguage: languages
    },
    {
      '@type': 'WebPage', '@id': `${url}#page`, url, name: title, description,
      inLanguage: language, isPartOf: { '@id': `${siteOrigin}/#website` },
      about: { '@id': businessId }
    }
  ];
  if (path !== '/') {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Make It So', item: pageUrl('/', language) },
        { '@type': 'ListItem', position: 2, name: title.split(' | ')[0], item: url }
      ]
    });
  }
  if (page.service) {
    graph.push({
      '@type': 'Service', '@id': `${url}#service`, url, name: title.split(' | ')[0],
      description, provider: { '@id': businessId }, areaServed: { '@type': 'Country', name: 'Belgium' }
    });
  }
  let schema = document.getElementById('site-schema');
  if (!schema) {
    document.querySelectorAll('script[type="application/ld+json"]').forEach((element) => element.remove());
    schema = document.createElement('script');
    schema.type = 'application/ld+json';
    schema.id = 'site-schema';
    document.head.append(schema);
  }
  schema.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
}

updateSeo();
window.i18n?.onChange(() => {
  const url = new URL(location.href);
  const language = window.i18n.lang;
  if (language === 'en') url.searchParams.delete('lang');
  else url.searchParams.set('lang', language);
  history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  updateSeo();
});

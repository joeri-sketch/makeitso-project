import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Client, startTestServer } from './helpers.js';
import { INLINE_SCRIPT } from '../src/middleware/security.js';

describe('website, headers and abuse protection', () => {
  let ctx;
  before(async () => { ctx = await startTestServer(); });
  after(async () => { await ctx.close(); });

  it('reports healthy', async () => {
    const res = await new Client(ctx.base).get('/healthz');
    assert.equal(res.status, 200);
    assert.equal(res.json.ok, true);
  });

  it('serves the existing static website unchanged', async () => {
    const c = new Client(ctx.base);
    for (const file of ['index.html', 'styles.css', 'script.js', 'i18n.js']) {
      const res = await c.get(file === 'index.html' ? '/' : `/${file}`);
      assert.equal(res.status, 200, file);
      assert.equal(res.text, readFileSync(new URL(`../public/${file}`, import.meta.url), 'utf8'), `${file} is served byte-for-byte`);
    }
  });

  it('serves the localized manual system status page without implying live monitoring', async () => {
    const c = new Client(ctx.base);
    const page = await c.get('/status/');
    assert.equal(page.status, 200);
    assert.match(page.text, /data-status-page/);
    assert.match(page.text, /status-page\.js/);

    const script = await c.get('/status-page.js');
    assert.equal(script.status, 200);
    for (const phrase of [
      'Website & public pages', 'Client portal & project status', 'Email & contact form',
      'Website & openbare pagina’s', 'Portail client et suivi de projet',
      'Statuses on this page are updated manually.',
      'The page does not run automatic uptime checks',
      "status: 'unknown'", 'const lastUpdatedAt = null;', 'const incidents = [];'
    ]) {
      assert.ok(script.text.includes(phrase), `status page includes “${phrase}”`);
    }

    const navigation = await c.get('/services/service-navigation.js');
    assert.match(navigation.text, /data-status-link/);
    const homepage = await c.get('/script.js');
    assert.match(homepage.text, /i18n\.t\('System status'\)/);
    const translations = await c.get('/i18n.js');
    for (const phrase of ['System status', 'Systeemstatus', 'État des services']) {
      assert.ok(translations.text.includes(phrase), `status navigation includes “${phrase}”`);
    }
  });

  it('shows server and email delivery errors instead of opening a local mail app', async () => {
    const c = new Client(ctx.base);
    const script = await c.get('/script.js');
    assert.match(script.text, /res\.status === 503 \? 'mail-failed' : 'rejected'/);
    assert.match(script.text, /if \(result === 'mail-failed'\) \{ setNote\(MAIL_FAILURE_NOTE\); return; \}/);
    assert.match(script.text, /if \(result === 'rejected'\) \{ setNote\(SUBMIT_FAILURE_NOTE\); return; \}/);
    assert.match(script.text, /if \(res\.status === 404 \|\| res\.status === 405\) return 'fallback'/, 'static-only hosting retains the mail app fallback');
    const translations = await c.get('/i18n.js');
    for (const phrase of ['Your message was saved, but the email could not be delivered.', 'Je bericht is opgeslagen, maar de e-mail kon niet worden bezorgd.', 'Votre message a été enregistré, mais l’e-mail n’a pas pu être remis.']) {
      assert.ok(translations.text.includes(phrase), `contact error feedback is localized: ${phrase}`);
    }
  });

  it('uses localized service wording instead of Departments in site navigation', async () => {
    const c = new Client(ctx.base);
    for (const path of ['/', '/services/brand-strategy/', '/missions/nova-coffee/', '/about/']) {
      const page = await c.get(path);
      assert.equal(page.status, 200, path);
      assert.match(page.text, />What we do<\/a>/, `${path} uses the updated navigation label`);
      assert.doesNotMatch(page.text, />Departments<\/a>/, `${path} no longer says Departments in navigation`);
    }
    const translations = await c.get('/i18n.js');
    for (const phrase of ['What we do', 'Wat we doen', 'Nos services']) {
      assert.ok(translations.text.includes(phrase), `navigation translation includes “${phrase}”`);
    }
  });

  it('serves linked, separate pages for all six departments', async () => {
    const c = new Client(ctx.base);
    const home = await c.get('/');
    const slugs = ['brand-strategy', 'social-content', 'paid-media', 'web-landing-pages', 'video-motion', 'growth-analytics'];
    for (const slug of slugs) {
      assert.match(home.text, new RegExp(`href="/services/${slug}/"`), `${slug} has a department-card link`);
      const page = await c.get(`/services/${slug}/`);
      assert.equal(page.status, 200, slug);
      assert.match(page.text, new RegExp(`data-service="${slug}"`), slug);
      assert.match(page.text, /class="cosmos"/, `${slug} has the homepage starfield`);
      assert.match(page.text, /class="nebula n1"/, `${slug} has ambient nebula layers`);
      assert.match(page.text, /aria-label="Main navigation"/, `${slug} has main-site navigation`);
      assert.match(page.text, /class="menu-btn"/, `${slug} has a responsive menu button`);
      assert.match(page.text, /class="footer service-footer"/, `${slug} has the site footer`);
      assert.match(page.text, /href="\/portal\/">Client login/, `${slug} footer has client login`);
      assert.match(page.text, /href="\/admin">Admin login/, `${slug} footer has admin login`);
      assert.match(page.text, /class="lang lang-footer"/, `${slug} footer has language controls`);
    }
    for (const file of ['service-data.js', 'service-page.js', 'service-navigation.js']) {
      assert.equal((await c.get(`/services/${file}`)).status, 200, file);
    }
  });

  it('maps department examples to the matching localized case studies', async () => {
    const c = new Client(ctx.base);
    const page = await c.get('/services/service-page.js');
    assert.equal(page.status, 200);
    const mappings = [
      ['brand-strategy', 'nova-bakery'],
      ['social-content', 'move-studio'],
      ['paid-media', 'roam-rental'],
      ['web-landing-pages', 'roam-rental'],
      ['video-motion', 'nova-bakery'],
      ['growth-analytics', 'roam-rental']
    ];
    for (const [service, project] of mappings) {
      assert.match(page.text, new RegExp(`'${service}':\\s*\\{\\s*project:\\s*'${project}'`), `${service} points to ${project}`);
    }
    for (const phrase of ['Nova Bakery', 'Move Studio', 'Roam', 'Nova Bakery krijgt', 'Move Studio brengt', 'Roam ontdekt', 'Nova Bakery affirme', 'Move Studio met', 'Roam comprend']) {
      assert.ok(page.text.includes(phrase), `department examples include localized concept copy: ${phrase}`);
    }
    assert.match(page.text, /localizedUrl\(`\/missions\/\$\{example\.project\}\/`, language\)/, 'project links preserve the selected language');
    const data = await c.get('/services/service-data.js');
    assert.match(data.text, /fullProject: 'See the full concept'/);
    assert.match(data.text, /fullProject: 'Bekijk het volledige concept'/);
    assert.match(data.text, /fullProject: 'Voir le concept complet'/);
    const styles = await c.get('/styles.css');
    assert.match(styles.text, /\.example-project-link[^}]*var\(--service-color\)/, 'project link keeps each department accent color');
  });

  it('serves linked, separate concept pages for all three sample missions', async () => {
    const c = new Client(ctx.base);
    const home = await c.get('/');
    const missions = ['nova-bakery', 'move-studio', 'roam-rental'];
    for (const slug of missions) {
      assert.match(home.text, new RegExp(`href="/missions/${slug}/"`), `${slug} has a mission-card link`);
      const page = await c.get(`/missions/${slug}/`);
      assert.equal(page.status, 200, slug);
      assert.match(page.text, new RegExp(`data-project="${slug}"`), slug);
      assert.match(page.text, /class="cosmos"/, `${slug} has the homepage starfield`);
      assert.match(page.text, /aria-label="Main navigation"/, `${slug} has main-site navigation`);
      assert.match(page.text, /class="footer project-footer"/, `${slug} has the site footer`);
      assert.match(page.text, /name="description"/, `${slug} has a page description`);
      assert.match(page.text, /name="robots" content="noindex, nofollow"/, `${slug} stays out of search results`);
      assert.match(page.text, /Stichelendries 47\/A, 9340 Oordegem \(Lede\), Belgium/, `${slug} footer has the registered address`);
      assert.match(page.text, /VAT: BE1030043889/, `${slug} footer has the VAT number`);
      assert.match(page.text, /href="\/portal\/">Client login/, `${slug} footer links to the client portal`);
      assert.match(page.text, /href="\/admin">Admin login/, `${slug} footer links to the admin`);
    }
    for (const file of ['project-page.js', 'project-pages.css']) {
      assert.equal((await c.get(`/missions/${file}`)).status, 200, file);
    }
  });

  it('serves localized crew, approach and FAQ pages linked from the site navigation', async () => {
    const c = new Client(ctx.base);
    const home = await c.get('/');
    for (const [slug, heading] of [['about', 'data-studio-page="about"'], ['approach', 'data-studio-page="approach"'], ['faq', 'data-studio-page="faq"']]) {
      assert.match(home.text, new RegExp(`href="/${slug}/"`), `${slug} is linked from the homepage`);
      const page = await c.get(`/${slug}/`);
      assert.equal(page.status, 200, slug);
      assert.match(page.text, new RegExp(heading), slug);
      assert.match(page.text, /aria-label="Main navigation"/, `${slug} has the main navigation`);
      assert.match(page.text, /aria-label="Footer navigation"/, `${slug} has the footer navigation`);
      assert.match(page.text, new RegExp(`href="/${slug}/"`), `${slug} appears in the page navigation`);
      assert.match(page.text, /class="lang lang-footer"/, `${slug} has language controls`);
    }
    const studio = await c.get('/studio-pages.js');
    assert.equal(studio.status, 200);
    for (const phrase of ['Small teams.', 'Klein team.', 'Petite équipe.', 'Discover', 'Verkennen', 'Explorer', 'Ways to work together', 'Manieren om samen te werken', 'Façons de collaborer', 'Defined project', 'Afgebakend project', 'Projet défini', 'How can we work together?', 'Hoe kunnen we samenwerken?', 'Comment pouvons-nous collaborer ?', 'How much does a project cost?', 'Wat kost een project?', 'Quel est le prix d’un projet ?']) {
      assert.ok(studio.text.includes(phrase), `localized studio content includes “${phrase}”`);
    }
    const styles = await c.get('/styles.css');
    assert.match(styles.text, /@media \(max-width: 1080px\) \{[\s\S]*?\.studio-hero-orbit \{\s*display: none;\s*\}/, 'decorative orbit stays clear of the studio-page headline on tablet and mobile');
    const translations = await c.get('/i18n.js');
    assert.doesNotMatch(translations.text, /Make It So\. Creatief marketingbureau\.|Make It So\. Agence de marketing créatif\./, 'footer copyright stays in English');
    assert.doesNotMatch(translations.text, /Aangedreven door Earl Grey|Propulsé par du thé Earl Grey/, 'footer sign-off stays in English');
    const projectPage = await c.get('/missions/project-page.js');
    assert.equal(projectPage.status, 200);
    assert.equal([...projectPage.text.matchAll(/footerNote: 'Powered by Earl Grey\. Hot\. Live long and prosper\.'/g)].length, 3, 'sample mission footer sign-off stays in English in every locale');
    assert.equal([...projectPage.text.matchAll(/footerCopyright: 'Fictional sample project\.'/g)].length, 3, 'sample mission footer copyright stays in English in every locale');
  });

  it('serves the client portal without exposing it to search engines', async () => {
    const c = new Client(ctx.base);
    const page = await c.get('/portal/');
    assert.equal(page.status, 200);
    assert.match(page.text, /name="robots" content="noindex, nofollow"/);
    for (const file of ['portal.js', 'portal.css']) {
      const asset = await c.get(`/portal/${file}`);
      assert.equal(asset.status, 200, file);
    }
  });

  it('provides SEO discovery files and canonical public page URLs', async () => {
    const c = new Client(ctx.base);
    const robots = await c.get('/robots.txt');
    assert.equal(robots.status, 200);
    assert.match(robots.text, /Sitemap: https:\/\/makeitso\.studio\/sitemap\.xml/);
    assert.match(robots.text, /Disallow: \/api\//);

    const sitemap = await c.get('/sitemap.xml');
    assert.equal(sitemap.status, 200);
    assert.match(sitemap.text, /https:\/\/makeitso\.studio\/services\/web-landing-pages\//);
    assert.doesNotMatch(sitemap.text, /missions\/|\/portal\/|\/admin/);

    for (const path of ['/', '/about/', '/approach/', '/faq/', '/services/web-landing-pages/']) {
      const page = await c.get(path);
      assert.equal(page.status, 200, path);
      assert.match(page.text, /<link rel="canonical" href="https:\/\/makeitso\.studio\//, path);
    }
    const webPage = await c.get('/services/web-landing-pages/');
    assert.match(webPage.text, /Websites, Apps &amp; Business Software/);
    assert.match(webPage.text, /front-end design to back-end development and integrations/);
    const webPageScript = await c.get('/services/service-page.js');
    for (const phrase of ['custom business software', 'bedrijfssoftware op maat', 'logiciels métier sur mesure']) {
      assert.ok(webPageScript.text.includes(phrase), `web development page copy includes “${phrase}”`);
    }
    const home = await c.get('/');
    assert.match(home.text, /application\/ld\+json/);
    assert.match(home.text, /"@type": "Organization"/);
    assert.match(home.text, /websites, apps and business software/i);

    for (const slug of ['nova-coffee', 'orbit-fitness', 'luna-records', 'nova-bakery', 'move-studio', 'roam-rental']) {
      const page = await c.get(`/missions/${slug}/`);
      assert.match(page.text, /name="robots" content="noindex, (?:no)?follow"/, slug);
    }
  });

  it('shows the registered business address and VAT number in every public page footer', async () => {
    const c = new Client(ctx.base);
    const pages = [
      '/', '/about/', '/approach/', '/faq/',
      '/services/brand-strategy/', '/services/social-content/', '/services/paid-media/',
      '/services/web-landing-pages/', '/services/video-motion/', '/services/growth-analytics/',
      '/missions/nova-coffee/', '/missions/orbit-fitness/', '/missions/luna-records/',
      '/missions/nova-bakery/', '/missions/move-studio/', '/missions/roam-rental/'
    ];
    for (const path of pages) {
      const page = await c.get(path);
      assert.equal(page.status, 200, path);
      assert.match(page.text, /<address class="business-details">/, path);
      assert.match(page.text, /Stichelendries 47\/A, 9340 Oordegem \(Lede\), Belgium/, path);
      assert.match(page.text, /VAT: BE1030043889/, path);
    }
  });

  it('sends strict security headers that still allow the site to work', async () => {
    const res = await new Client(ctx.base).get('/');
    const csp = res.headers.get('content-security-policy');
    assert.match(csp, /default-src 'self'/);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.match(csp, /fonts\.googleapis\.com/);
    assert.match(csp, /img-src[^;]*https:\/\/images\.unsplash\.com/);
    assert.ok(!/unsafe-inline/.test(csp.match(/script-src[^;]*/)[0]), 'no unsafe-inline for scripts');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-powered-by'), null);
    assert.ok(res.headers.get('permissions-policy'));
  });

  it('allows exactly the one inline script the website has (by hash)', async () => {
    const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
    const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    assert.deepEqual(inline, [INLINE_SCRIPT], 'index.html must only contain the allow-listed inline script');
  });

  it('shows the preloader only once per browser tab session', async () => {
    assert.match(INLINE_SCRIPT, /sessionStorage\.getItem\('makeitso-preloader-seen'\)/);
    assert.match(INLINE_SCRIPT, /sessionStorage\.setItem\('makeitso-preloader-seen','1'\)/);
    const styles = readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');
    assert.match(styles, /\.js\.preloader-seen \.preloader\s*\{\s*display:\s*none;/);
  });

  it('does not serve source files, dotfiles or the database folder', async () => {
    const c = new Client(ctx.base);
    for (const path of ['/src/config.js', '/package.json', '/.env', '/.git/config', '/data/pglite', '/tests/helpers.js', '/../package.json']) {
      const res = await c.get(path);
      assert.ok([400, 403, 404].includes(res.status), `${path} -> ${res.status}`);
    }
  });

  it('rate limits the public contact endpoint', async () => {
    const limited = await startTestServer({ rateLimits: true });
    try {
      const c = new Client(limited.base);
      const body = (i) => ({ name: 'Bot', email: `bot${i}@example.com`, message: `spam message number ${i}`, t: 5000 });
      const statuses = [];
      for (let i = 0; i < 7; i += 1) statuses.push((await c.post('/api/public/leads', body(i))).status);
      assert.deepEqual(statuses.slice(0, 5), [201, 201, 201, 201, 201]);
      assert.equal(statuses[5], 429);
    } finally {
      await limited.close();
    }
  });

  it('rate limits sign-in attempts per address', async () => {
    const limited = await startTestServer({ rateLimits: true });
    try {
      const c = new Client(limited.base);
      let last;
      for (let i = 0; i < 12; i += 1) last = (await c.post('/api/auth/login', { email: 'x@example.com', password: 'whatever-password' })).status;
      assert.equal(last, 429);
    } finally {
      await limited.close();
    }
  });

  it('returns JSON errors without leaking internals', async () => {
    const c = new Client(ctx.base);
    const bad = await c.req('POST', '/api/public/leads', undefined, { 'content-type': 'application/json' });
    assert.ok([400, 403].includes(bad.status));
    const res = await fetch(`${ctx.base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-requested-with': 'makeitso' }, body: '{not json' });
    assert.equal(res.status, 400);
    assert.ok(!/at .*\.js/.test(await res.text()), 'no stack traces');
  });
});

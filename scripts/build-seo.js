import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { chromium } from 'playwright';
import { languages, pageUrl, seoPages } from '../public/seo-data.js';

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const output = new URL('../generated/seo/', import.meta.url);
const app = express();
app.use(express.static(publicDir));
const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
let browser;
try {
  browser = await chromium.launch();
  const context = await browser.newContext({ locale: 'en-GB', reducedMotion: 'reduce' });
  const base = `http://127.0.0.1:${server.address().port}`;
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== base) return route.fulfill({ status: 200, body: '' });
    // Capture the homepage content before its decorative animation mutates it.
    if (url.pathname === '/script.js') return route.fulfill({ status: 200, contentType: 'text/javascript', body: '' });
    return route.continue();
  });
  const page = await context.newPage();
  const background = await readFile(new URL('../public/brand/make-it-so-hero-background.svg', import.meta.url), 'utf8');
  const logo = await readFile(new URL('../public/brand/make-it-so-logo-outlined.svg', import.meta.url), 'utf8');
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.setContent(`<html><body style="margin:0"><svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <svg width="1200" height="630" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">${background.slice(background.indexOf('>') + 1, background.lastIndexOf('</svg>'))}</svg>
    <g transform="translate(100 185)"><svg width="1000" height="230" viewBox="0 0 613 140">${logo.slice(logo.indexOf('>') + 1, logo.lastIndexOf('</svg>'))}</svg></g>
    <text x="100" y="485" fill="white" font-family="Arial,sans-serif" font-size="32">Websites. Apps. Branding. Marketing.</text>
    <text x="100" y="555" fill="white" font-family="Arial,sans-serif" font-size="22">makeitso.studio</text>
  </svg></body></html>`);
  await page.screenshot({ path: fileURLToPath(new URL('../public/brand/social-preview.png', import.meta.url)) });
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(error));
  for (const entry of seoPages) {
    for (const language of languages) {
      await page.goto(`${base}${entry.path}?lang=${language}`, { waitUntil: 'networkidle' });
      await page.addScriptTag({ type: 'module', url: `${base}/seo.js` });
      await page.waitForFunction(() => document.getElementById('site-schema'));
      assert.deepEqual(browserErrors, [], `Browser errors while rendering ${entry.path}`);
      const html = await page.evaluate(() => {
        document.documentElement.classList.remove('js', 'preloader-seen');
        // The module script must remain portable to the deployed origin.
        document.querySelectorAll('script[src]').forEach((script) => {
          const url = new URL(script.src);
          script.setAttribute('src', url.pathname);
        });
        return `<!doctype html>\n${document.documentElement.outerHTML}\n`;
      });
      assert.match(html, new RegExp(`<html lang="${language}"`));
      const headings = await page.locator('main h1').count();
      assert.equal(headings, 1, `${entry.path} (${language}) must have one rendered H1`);
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), pageUrl(entry.path, language));
      const folder = new URL(`.${entry.path}${language}/`, output);
      await mkdir(folder, { recursive: true });
      await writeFile(new URL('index.html', folder), html);
      console.log(`Rendered ${entry.path} (${language})`);
    }
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${seoPages.flatMap((entry) => languages.map((language) => `  <url><loc>${pageUrl(entry.path, language)}</loc>${[...languages, 'x-default'].map((locale) => `<xhtml:link rel="alternate" hreflang="${locale}" href="${pageUrl(entry.path, locale === 'x-default' ? 'en' : locale)}"/>`).join('')}</url>`)).join('\n')}\n</urlset>\n`;
  await writeFile(new URL('../public/sitemap.xml', import.meta.url), xml);
  const fingerprint = createHash('sha256');
  for (const file of ['i18n.js', 'studio-pages.js', 'services/service-data.js', 'services/service-page.js', 'services/service-navigation.js', 'status-page.js', 'seo.js', 'seo-data.js', ...seoPages.map((entry) => `.${entry.path}index.html`)]) {
    fingerprint.update(file);
    fingerprint.update((await readFile(new URL(`../public/${file}`, import.meta.url), 'utf8')).replace(/\r\n/g, '\n'));
  }
  await writeFile(new URL('source-hash.txt', output), `${fingerprint.digest('hex')}\n`);
} finally {
  if (browser) await browser.close();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

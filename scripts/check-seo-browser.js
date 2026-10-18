import assert from 'node:assert/strict';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { chromium } from 'playwright';
import { languages, pageUrl, seoPages } from '../public/seo-data.js';
import { securityHeaders } from '../src/middleware/security.js';
import { seoPagesMiddleware } from '../src/middleware/seo.js';

const app = express();
app.use(securityHeaders({ isProd: false }));
app.use(seoPagesMiddleware);
app.use(express.static(fileURLToPath(new URL('../public/', import.meta.url))));
const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
let browser;
try {
  browser = await chromium.launch();
  const base = `http://127.0.0.1:${server.address().port}`;
  const context = await browser.newContext({ locale: 'en-GB', reducedMotion: 'reduce' });
  await context.route('**/*', (route) => new URL(route.request().url()).origin === base
    ? route.continue()
    : route.fulfill({ status: 200, body: '' }));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const entry of seoPages) {
    for (const initial of languages) {
      await page.goto(`${base}${entry.path}?lang=${initial}`, { waitUntil: 'networkidle' });
      for (const language of [initial, 'en', 'nl', 'fr']) {
        await page.locator(`header [data-lang="${language}"]`).click();
        assert.equal(await page.title(), entry.titles[languages.indexOf(language)]);
        assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), pageUrl(entry.path, language));
        assert.equal(await page.locator('main h1').count(), 1);
        assert.equal(await page.locator('html').getAttribute('lang'), language);
        const footer = await page.locator('.footer .foot-bottom').innerText();
        assert.ok(footer.includes('Powered by Earl Grey. Hot. Live long and prosper.'));
        const status = await page.locator('.footer [data-status-link]').getAttribute('href');
        assert.ok(status.includes(`/status/?lang=${language}`));
        const approach = page.locator('header a[href*="/approach/"]').first();
        assert.equal(await approach.innerText(), { en: 'Approach', nl: 'Aanpak', fr: 'Approche' }[language]);
      }
      console.log(`Verified language switching: ${entry.path} (initial ${initial})`);
    }
  }
  assert.deepEqual(errors, []);
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await noJs.newPage();
  for (const entry of seoPages) {
    await staticPage.goto(`${base}${entry.path}?lang=nl`, { waitUntil: 'domcontentloaded' });
    assert.equal(await staticPage.locator('main h1').count(), 1);
    assert.equal(await staticPage.title(), entry.titles[1]);
  }
  console.log('Verified indexable content without JavaScript.');
} finally {
  if (browser) await browser.close();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

import assert from 'node:assert/strict';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { chromium } from 'playwright';

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const app = express();
let requests = 0;
app.get('/api/public/status', (req, res) => {
  requests += 1;
  const checkedAt = new Date(Date.UTC(2026, 0, 1, 0, requests)).toISOString();
  const appsStatus = requests === 1 ? 'outage' : 'operational';
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    checked_at: checkedAt,
    refresh_interval_seconds: 60,
    services: [
      { id: 'website', status: 'operational', checked_at: checkedAt },
      { id: 'apps', status: appsStatus, checked_at: checkedAt },
      { id: 'portal', status: 'operational', checked_at: checkedAt },
      { id: 'email', status: 'maintenance', checked_at: checkedAt },
      { id: 'billing', status: 'operational', checked_at: checkedAt }
    ]
  });
});
app.use(express.static(publicDir));
const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
let browser;
try {
  browser = await chromium.launch();
  const context = await browser.newContext();
  await context.route('**/*', (route) => new URL(route.request().url()).origin === `http://127.0.0.1:${server.address().port}`
    ? route.continue() : route.fulfill({ status: 200, body: '' }));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.clock.install();
  await page.goto(`http://127.0.0.1:${server.address().port}/status/?lang=en`);
  await page.locator('.status-row.status-outage').waitFor();
  assert.equal(await page.locator('.status-row').count(), 5);
  assert.match(await page.locator('.status-row').nth(3).innerText(), /Email & contact form/);
  assert.match(await page.locator('.status-row').nth(3).innerText(), /Maintenance/);
  assert.match(await page.locator('.status-row').filter({ hasText: 'Quotes & invoices' }).innerText(), /Operational/);
  assert.match(await page.locator('.status-incident-list').innerText(), /Apps is currently Service disruption/);
  assert.doesNotMatch(await page.locator('body').innerText(), /jellyfin|internal\.test/i);

  await page.locator('[data-lang="nl"]').first().click();
  await page.locator('.status-row').filter({ hasText: 'E-mail & contactformulier' }).waitFor();
  assert.match(await page.locator('.status-row').filter({ hasText: 'E-mail & contactformulier' }).innerText(), /Onderhoud/);

  await page.clock.fastForward(60_000);
  await page.locator('.status-row.status-operational').filter({ hasText: 'Apps' }).waitFor();
  assert.equal(requests, 2, 'the page should fetch fresh statuses every minute');
  assert.deepEqual(errors, []);
  console.log('Verified live status rendering, incident updates, localization, automatic refresh and public redaction.');
} finally {
  if (browser) await browser.close();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

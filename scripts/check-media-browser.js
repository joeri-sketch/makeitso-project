import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { Client, signedInAdmin, startTestServer } from '../tests/helpers.js';

const ctx = await startTestServer();
let browser;
try {
  const { client: admin } = await signedInAdmin(ctx);
  const client = (await admin.post('/api/clients', {
    company_name: 'Media browser test', language: 'nl',
    contact: { name: 'Media client', email: 'media-browser@example.com', is_primary: true }
  })).json.client;
  const invitation = await admin.post(`/api/clients/${client.id}/invitations`, { email: 'media-browser@example.com' });
  const portal = new Client(ctx.base);
  const portalPassword = 'browser-only-portal-password';
  await portal.post('/api/portal/invitations/accept', {
    token: new URL(invitation.json.invitation_url).searchParams.get('invite'), password: portalPassword
  });
  browser = await chromium.launch();
  const browserContext = await browser.newContext();
  await browserContext.route('**/*', (route) => new URL(route.request().url()).origin === ctx.base
    ? route.continue() : route.fulfill({ status: 200, body: '' }));
  const page = await browserContext.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  async function session(http) {
    await browserContext.clearCookies();
    await browserContext.addCookies([...http.jar].map(([name, value]) => ({ name, value, url: ctx.base, httpOnly: true, sameSite: 'Lax' })));
  }
  await session(portal);
  await page.goto(`${ctx.base}/portal/`);
  await page.locator('#tab-projects').waitFor();
  assert.equal(await page.locator('#tab-media').count(), 0);

  await session(admin);
  await page.goto(`${ctx.base}/admin/#/clients/${client.id}`);
  await page.locator('#media-permission').waitFor();
  await page.locator('#media-permission input').check();
  await page.locator('#media-permission button').click();
  await page.waitForFunction(() => document.querySelector('#media-permission button')?.disabled === false);
  assert.equal((await admin.get(`/api/clients/${client.id}/media`)).json.enabled, true);
  await page.locator('[data-action="edit-media"][data-service="jellyfin"]').click();
  await page.locator('#f-status').selectOption('operational');
  await page.locator('#f-message').fill('Streaming available. <script>not executable</script>');
  await page.locator('#f-share_access').check();
  await page.locator('#f-url').fill('https://jellyfin.example.com');
  await page.locator('#f-username').fill('personal.media');
  await page.locator('#f-password').fill('browser-only-service-secret');
  await page.locator('#modal button.primary').click();
  await page.waitForFunction(() => !document.querySelector('#modal').open);
  const stored = (await admin.get(`/api/clients/${client.id}/media`)).json.services.find((s) => s.service === 'jellyfin');
  assert.equal(stored.has_password, true);
  assert.equal(stored.username, 'personal.media');
  const shared = (await portal.get('/api/portal/media')).json.services.find((s) => s.service === 'jellyfin');
  assert.equal(shared.share_access, true);

  await session(portal);
  await page.goto(`${ctx.base}/portal/`);
  await page.locator('#tab-media').click();
  const panel = page.locator('#portal-tab-media');
  const card = panel.locator('[data-service="jellyfin"]');
  await card.waitFor();
  assert.match(await panel.innerText(), /Jouw media\. In beeld\./);
  assert.match(await panel.innerText(), /geen live monitoring/);
  assert.match(await panel.innerText(), /Niet bevestigd/);
  assert.match(await panel.innerText(), /<script>not executable<\/script>/);
  assert.equal(await panel.locator('script').count(), 0);
  assert.equal(new URL(await card.locator('a').first().getAttribute('href')).hostname, 'jellyfin.example.com');
  assert.equal(await card.locator('[data-secret]').inputValue(), '');
  assert.equal(await panel.locator('input[value="browser-only-service-secret"]').count(), 0);
  await page.clock.install();
  await card.locator('[data-reveal]').click();
  await page.locator('.media-dialog input').fill('wrong-password');
  await page.locator('.media-dialog button[type=submit]').click();
  await page.locator('.media-dialog .error').filter({ hasText: /.+/ }).waitFor();
  assert.equal(await card.locator('[data-secret]').inputValue(), '');
  await page.locator('.media-dialog input').fill(portalPassword);
  await page.locator('.media-dialog button[type=submit]').click();
  await card.locator('[data-secret]').waitFor({ state: 'visible' });
  assert.equal(await card.locator('[data-secret]').inputValue(), 'browser-only-service-secret');
  await page.clock.fastForward(31000);
  assert.equal(await card.locator('[data-secret]').inputValue(), '');
  assert.equal(await card.locator('[data-secret]').isVisible(), false);
  await card.locator('[data-reveal]').click();
  await page.locator('.media-dialog input').fill(portalPassword);
  await page.locator('.media-dialog button[type=submit]').click();
  await card.locator('[data-secret]').waitFor({ state: 'visible' });
  await page.locator('#tab-projects').click();
  assert.equal(await card.locator('[data-secret]').inputValue(), '');
  await page.locator('#tab-media').click();
  await card.waitFor();
  await panel.locator('[data-support]').click();
  assert.equal(await page.locator('#tab-support').getAttribute('aria-selected'), 'true');
  await page.locator('#tab-media').click();
  await card.waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No horizontal mobile overflow');
  assert.equal(await panel.locator('.media-grid').first().evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length), 1);
  await page.setViewportSize({ width: 1440, height: 1100 });
  if (process.env.MEDIA_SCREENSHOT_DIR) {
    await page.screenshot({ path: `${process.env.MEDIA_SCREENSHOT_DIR}\\media-portal-desktop.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `${process.env.MEDIA_SCREENSHOT_DIR}\\media-portal-mobile.png`, fullPage: true });
  }
  for (const [language, title] of [['en', 'Your media. In view.'], ['fr', 'Vos médias. En un coup d’œil.']]) {
    assert.equal((await admin.patch(`/api/clients/${client.id}`, { language })).status, 200);
    await page.goto(`${ctx.base}/portal/`);
    await page.locator('#tab-media').click();
    await panel.locator('.media-heading h1').waitFor();
    assert.equal(await panel.locator('.media-heading h1').innerText(), title);
  }
  await admin.put(`/api/clients/${client.id}/media`, { enabled: false });
  await panel.locator('[data-refresh]').click();
  await panel.locator('.error').filter({ hasText: /.+/ }).waitFor();
  assert.equal(await panel.locator('[data-service]').count(), 0);
  await page.reload();
  await page.locator('#tab-projects').waitFor();
  assert.equal(await page.locator('#tab-media').count(), 0);
  assert.deepEqual(errors, []);
  console.log('Verified media admin settings, opt-in access, EN/NL/FR, responsive layout, password reauthentication, auto-hide, tab cleanup and revocation.');
} finally {
  if (browser) await browser.close();
  await ctx.close();
}

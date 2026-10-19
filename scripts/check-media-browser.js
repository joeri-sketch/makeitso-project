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
  const header = page.locator('.portal-top');
  const headerBox = await header.boundingBox();
  assert.ok(headerBox.x > 0 && headerBox.width < 1300, 'Portal navigation should sit in a centered container');
  assert.equal(await header.evaluate((el) => Number.parseFloat(getComputedStyle(el).borderTopLeftRadius) > 0), true);
  assert.equal(await header.locator('.brand-mark svg path').count(), 1);
  assert.equal(await header.locator('.brand-mark svg path').evaluate((path) => getComputedStyle(path).fill), 'rgb(255, 106, 31)');
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileHeader = await header.boundingBox();
  assert.ok(mobileHeader.x >= 0 && mobileHeader.width < 390, 'Mobile navigation should remain inset and contained');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Contained header must not cause horizontal overflow');
  await page.setViewportSize({ width: 1440, height: 1100 });

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
  // Exercise automatic display and polling without depending on external servers.
  const automaticData = (await portal.get('/api/portal/media')).json;
  automaticData.services = automaticData.services.map((service) => service.service === 'ubuntu'
    ? { ...service, status_source: 'manual' }
    : {
      ...service, status: 'operational', status_source: 'automatic', stale: false,
      checked_at: new Date().toISOString(), status_updated_at: new Date().toISOString(), response_ms: 125,
      ...(service.service === 'jellyfin' ? { url: 'http://jellyfin.example.com:8096/' } : {})
    });
  let automaticRequests = 0;
  const automaticRoute = async (route) => {
    automaticRequests++;
    await route.fulfill({ json: automaticData });
  };
  await page.route('**/api/portal/media', automaticRoute);
  for (const [language, automaticLabel, manualLabel] of [
    ['nl', 'Automatische controle', 'Handmatige status'],
    ['en', 'Automatic check', 'Manual status'],
    ['fr', 'Contrôle automatique', 'Statut manuel']
  ]) {
    await admin.patch(`/api/clients/${client.id}`, { language });
    await page.goto(`${ctx.base}/portal/`);
    await page.locator('#tab-media').click();
    await panel.locator('[data-health="jellyfin"]').waitFor();
    assert.match(await panel.locator('[data-health="jellyfin"]').innerText(), new RegExp(automaticLabel));
    assert.match(await panel.locator('[data-health="jellyfin"]').innerText(), /125 ms/);
    assert.match(await panel.locator('[data-health="ubuntu"]').innerText(), new RegExp(manualLabel));
    await card.locator('.media-http-warning').waitFor();
    assert.equal(await panel.locator('[data-service="jellyseerr"] a').count(), 0);
    if (language === 'nl' && process.env.MEDIA_SCREENSHOT_DIR) {
      await page.setViewportSize({ width: 1440, height: 1100 });
      await page.screenshot({ path: `${process.env.MEDIA_SCREENSHOT_DIR}\\media-monitor-desktop.png`, fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: `${process.env.MEDIA_SCREENSHOT_DIR}\\media-monitor-mobile.png`, fullPage: true });
    }
  }
  const requestsBefore = automaticRequests;
  automaticData.services[0] = { ...automaticData.services[0], status: 'unknown', stale: true, response_ms: null };
  await page.clock.fastForward(31000);
  await page.waitForFunction(() => document.querySelector('[data-health="jellyfin"] .health-unknown'));
  assert.ok(automaticRequests > requestsBefore);
  assert.equal(await panel.locator('[data-health="jellyfin"] .health-operational').count(), 0);
  await panel.locator('[data-health="jellyfin"] .media-stale').waitFor();
  automaticData.services[2] = {
    ...automaticData.services[2], status_source: 'automatic', status: 'operational',
    checked_at: new Date().toISOString(), response_ms: 42, stale: false
  };
  await panel.locator('[data-refresh]').click();
  await page.waitForFunction(() => document.querySelector('[data-health="ubuntu"] .health-operational'));
  assert.match(await panel.locator('[data-health="ubuntu"]').innerText(), /TCP/);
  assert.equal(await panel.locator('[data-service="ubuntu"] a').count(), 0);
  await page.unroute('**/api/portal/media', automaticRoute);
  const adminAutomaticData = (await admin.get(`/api/clients/${client.id}/media`)).json;
  adminAutomaticData.services = adminAutomaticData.services.map((service) => ({
    ...service,
    status_source: service.service === 'ubuntu' ? 'manual' : 'automatic',
    configured_url: service.service === 'jellyseerr' ? 'http://requests.example.com:5055/' : null
  }));
  const adminAutomaticRoute = (route) => route.fulfill({ json: adminAutomaticData });
  await page.route(`**/api/clients/${client.id}/media`, adminAutomaticRoute);
  await session(admin);
  await page.goto(`${ctx.base}/admin/#/clients/${client.id}`);
  await page.locator('[data-action="edit-media"][data-service="jellyseerr"]').click();
  assert.equal(await page.locator('#f-status').count(), 0, 'Automatic status cannot be manually edited');
  assert.equal(await page.locator('#f-url').inputValue(), 'http://requests.example.com:5055/');
  assert.equal(await page.locator('#f-share_access').isChecked(), false, 'Suggested URL never opts client into sharing');
  await page.locator('#modal [data-close]').first().click();
  await page.locator('[data-action="edit-media"][data-service="ubuntu"]').click();
  await page.locator('#f-status').waitFor();
  await page.locator('#modal [data-close]').first().click();
  await page.unroute(`**/api/clients/${client.id}/media`, adminAutomaticRoute);
  await session(portal);
  await page.goto(`${ctx.base}/portal/`);
  await page.locator('#tab-media').click();
  await panel.locator('[data-refresh]').waitFor();
  await admin.put(`/api/clients/${client.id}/media`, { enabled: false });
  await panel.locator('[data-refresh]').click();
  await panel.locator('.error').filter({ hasText: /.+/ }).waitFor();
  assert.equal(await panel.locator('[data-service]').count(), 0);
  await page.reload();
  await page.locator('#tab-projects').waitFor();
  assert.equal(await page.locator('#tab-media').count(), 0);
  assert.deepEqual(errors, []);
  console.log('Verified media admin settings, opt-in access, EN/NL/FR, responsive layout, password reauthentication, auto-hide, automatic status display/polling, HTTP warnings, stale results and revocation.');
} finally {
  if (browser) await browser.close();
  await ctx.close();
}

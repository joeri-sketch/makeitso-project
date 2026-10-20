import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { languages, pageUrl, seoPages } from '../public/seo-data.js';
import { Client, startTestServer } from './helpers.js';

describe('public search engine optimization', () => {
  let ctx;
  before(async () => { ctx = await startTestServer(); });
  after(async () => { await ctx.close(); });

  it('ships rendered HTML, self-canonicals and reciprocal language alternates for every indexable page', async () => {
    const client = new Client(ctx.base);
    const sitemap = (await client.get('/sitemap.xml')).text;
    for (const entry of seoPages) {
      for (const language of languages) {
        const url = pageUrl(entry.path, language);
        const response = await client.get(`${entry.path}?lang=${language}`);
        assert.equal(response.status, 200, url);
        assert.equal(response.headers.get('content-language'), language);
        assert.match(response.text, new RegExp(`<html lang="${language}"`));
        assert.ok(response.text.includes(`<link rel="canonical" href="${url}">`), url);
        assert.equal([...response.text.matchAll(/<h1(?:\s|>)/g)].length, 1, url);
        assert.ok(response.text.includes(entry.descriptions[languages.indexOf(language)].replace(/&/g, '&amp;')), url);
        assert.ok(sitemap.includes(`<loc>${url}</loc>`), url);
        assert.doesNotMatch(response.text, /noindex/);
        assert.doesNotMatch(response.text, /127\.0\.0\.1|localhost/);
        for (const locale of [...languages, 'x-default']) {
          assert.ok(response.text.includes(`hreflang="${locale}" href="${pageUrl(entry.path, locale === 'x-default' ? 'en' : locale)}"`), `${url}: ${locale}`);
        }
        const schema = JSON.parse(response.text.match(/<script type="application\/ld\+json" id="site-schema">([\s\S]*?)<\/script>/)[1]);
        assert.equal(schema['@graph'][0]['@type'], 'ProfessionalService');
        assert.equal(schema['@graph'][0].address.addressCountry, 'BE');
        assert.ok(response.text.includes('property="og:image" content="https://makeitso.studio/brand/social-preview.png"'));
      }
    }
  });

  it('normalizes tracking parameters and invalid languages without indexing private routes', async () => {
    const client = new Client(ctx.base);
    for (const suffix of ['?utm_source=test', '?lang=invalid', '?lang=nl&lang=fr', 'index.html']) {
      const response = await client.get(`/${suffix}`);
      assert.equal(response.status, 200);
      assert.match(response.text, /rel="canonical" href="https:\/\/makeitso\.studio\/"/);
    }
    for (const route of ['/admin/', '/portal/', '/healthz', '/api/auth/session']) {
      const response = await client.get(route);
      assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow', route);
    }
    const missing = await client.get('/page-that-does-not-exist/');
    assert.equal(missing.status, 404);
  });

  it('keeps generated content in sync with its editable source files', () => {
    const fingerprint = createHash('sha256');
    for (const file of ['i18n.js', 'studio-pages.js', 'services/service-data.js', 'services/service-page.js', 'services/service-navigation.js', 'status-page.js', 'seo.js', 'seo-data.js', ...seoPages.map((entry) => `.${entry.path}index.html`)]) {
      fingerprint.update(file);
      fingerprint.update(readFileSync(new URL(`../public/${file}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n'));
    }
    assert.equal(fingerprint.digest('hex'), readFileSync(new URL('../generated/seo/source-hash.txt', import.meta.url), 'utf8').trim(), 'Run pnpm build:seo after editing public page content');
  });

  it('provides a share image with the declared dimensions', async () => {
    const response = await fetch(`${ctx.base}/brand/social-preview.png`);
    assert.equal(response.status, 200);
    const image = Buffer.from(await response.arrayBuffer());
    assert.equal(image.readUInt32BE(16), 1200);
    assert.equal(image.readUInt32BE(20), 630);
  });
});

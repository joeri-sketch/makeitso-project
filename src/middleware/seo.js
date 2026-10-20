import { fileURLToPath } from 'node:url';
import { languages, seoPages } from '../../public/seo-data.js';

const output = new URL('../../generated/seo/', import.meta.url);
const paths = new Set(seoPages.map((entry) => entry.path));

export function seoPagesMiddleware(req, res, next) {
  if (!['GET', 'HEAD'].includes(req.method)) return next();
  if (/^\/(?:admin|portal|api)(?:\/|$)|^\/healthz$/.test(req.path)) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    return next();
  }
  const path = req.path.replace(/index\.html$/, '');
  if (!paths.has(path)) return next();
  const language = languages.includes(req.query.lang) ? req.query.lang : 'en';
  res.setHeader('Content-Language', language);
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.sendFile(fileURLToPath(new URL(`.${path}${language}/index.html`, output)), (error) => {
    if (error) next(error);
  });
}

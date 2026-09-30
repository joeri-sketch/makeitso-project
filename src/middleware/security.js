import { createHash } from 'node:crypto';
import helmet from 'helmet';
import { HttpError } from '../lib/validate.js';

// The static site has one small inline script in <head>; allow exactly that script by hash.
export const INLINE_SCRIPT = "document.documentElement.classList.add('js')";
const inlineHash = `'sha256-${createHash('sha256').update(INLINE_SCRIPT).digest('base64')}'`;

export function securityHeaders(config) {
  const directives = {
    'default-src': ["'self'"],
    'script-src': ["'self'", inlineHash],
    'style-src': ["'self'", 'https://fonts.googleapis.com'],
    'style-src-attr': ["'unsafe-inline'"],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    'img-src': ["'self'", 'data:'],
    'connect-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"]
  };
  if (config.isProd) directives['upgrade-insecure-requests'] = [];
  const helm = helmet({
    contentSecurityPolicy: { useDefaults: false, directives },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  });
  return (req, res, next) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    helm(req, res, next);
  };
}

// State-changing API calls must come from our own pages: custom header (cannot be sent cross-site
// without a CORS preflight, which we never allow) plus an Origin check.
export function csrfGuard(config) {
  return (req, res, next) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
    if (req.get('x-requested-with') !== 'makeitso') return next(new HttpError(403, 'Invalid request.'));
    const origin = req.get('origin');
    if (origin) {
      const expected = config.publicOrigin || `${req.protocol}://${req.get('host')}`;
      if (origin !== expected) return next(new HttpError(403, 'Invalid request origin.'));
    }
    next();
  };
}

export function requestLogger(log) {
  return (req, res, next) => {
    const started = Date.now();
    res.on('finish', () => {
      if (req.path === '/healthz') return;
      log({ m: req.method, p: req.path, s: res.statusCode, ms: Date.now() - started });
    });
    next();
  };
}

export function errorHandler(log) {
  // eslint-disable-next-line no-unused-vars
  return (err, req, res, next) => {
    if (res.headersSent) return next(err);
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, ...err.extra });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON.' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large.' });
    if (err.code === '23505') return res.status(409).json({ error: 'That value already exists.' });
    if (err.code === '23503') return res.status(409).json({ error: 'This record is still in use by other records.' });
    log({ level: 'error', m: req.method, p: req.path, error: err.message });
    res.status(500).json({ error: 'Something went wrong.' });
  };
}

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

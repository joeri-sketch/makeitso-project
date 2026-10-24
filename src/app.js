import { fileURLToPath } from 'node:url';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { authRoutes } from './routes/auth.js';
import { crmRoutes } from './routes/crm.js';
import { invoiceRoutes, portalInvoiceRoutes } from './routes/invoices.js';
import { adminMediaRoutes, portalMediaRoutes } from './routes/media.js';
import { portalRoutes } from './routes/portal.js';
import { quoteRoutes } from './routes/quotes.js';
import { publicRoutes } from './routes/public.js';
import { createContactMailer } from './services/contact-mail.js';
import { createPublicStatusChecker } from './services/public-status.js';
import { supportRoutes } from './routes/support.js';
import { csrfGuard, errorHandler, requestLogger, securityHeaders } from './middleware/security.js';
import { sessionMiddleware } from './middleware/session.js';
import { seoPagesMiddleware } from './middleware/seo.js';

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));

export const defaultLog = (entry) => console.log(JSON.stringify({ t: new Date().toISOString(), ...entry }));

export function createApp({
  db,
  config,
  rateLimits = !config.isTest,
  log = defaultLog,
  mailer = createContactMailer(config),
  statusFetch = globalThis.fetch
}) {
  const app = express();
  app.disable('x-powered-by');
  const hops = Number(config.trustProxy);
  app.set('trust proxy', config.trustProxy === '0' ? false : Number.isNaN(hops) ? config.trustProxy : hops);

  const limiter = (windowMs, limit, message) =>
    rateLimits
      ? rateLimit({ windowMs, limit, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: message } })
      : (req, res, next) => next();
  const limits = {
    general: limiter(60_000, 300, 'Too many requests. Please slow down.'),
    login: limiter(15 * 60_000, 10, 'Too many attempts. Please try again later.'),
    twofa: limiter(15 * 60_000, 15, 'Too many attempts. Please try again later.'),
    publicLead: limiter(60 * 60_000, 5, 'Too many messages. Please try again later or email us directly.'),
    publicStatus: limiter(60_000, 60, 'Too many status checks. Please try again shortly.')
  };

  app.use(requestLogger(log));
  app.use(securityHeaders(config));
  app.use(seoPagesMiddleware);

  app.get('/healthz', async (req, res) => {
    try {
      await db.query('SELECT 1');
      res.json({ ok: true });
    } catch {
      res.status(503).json({ ok: false });
    }
  });

  // ---- API ----
  app.use('/api', (req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  app.use('/api', limits.general, express.json({ limit: '100kb' }), csrfGuard(config), sessionMiddleware(db, config));
  app.use('/api/auth', authRoutes({ db, config, limits }));
  const getPublicStatus = createPublicStatusChecker({ config, fetchImpl: statusFetch, log });
  app.use('/api/public', publicRoutes({ db, config, limits, mailer, log, getPublicStatus }));
  app.use('/api', adminMediaRoutes({ db }));
  app.use('/api/portal', portalMediaRoutes({ db, limits }));
  app.use('/api/portal', portalRoutes({ db, config, limits }));
  app.use('/api/portal', portalInvoiceRoutes({ db }));
  app.use('/api', supportRoutes({ db, limits }));
  app.use('/api', crmRoutes({ db, config }));
  app.use('/api', invoiceRoutes({ db }));
  app.use('/api', quoteRoutes({ db }));
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

  // ---- website + admin UI (static files) ----
  app.use(express.static(publicDir, { maxAge: config.isProd ? '5m' : 0 }));

  app.use(errorHandler(log));
  return app;
}

const env = process.env;
const isProd = env.NODE_ENV === 'production';
const isTest = env.NODE_ENV === 'test';

let appSecret = env.APP_SECRET;
if (!appSecret) {
  if (isProd) throw new Error('APP_SECRET is required in production. Use a long random string (at least 32 characters).');
  appSecret = 'dev-only-secret-do-not-use-in-production-0123456789';
} else if (isProd && appSecret.length < 32) {
  throw new Error('APP_SECRET must be at least 32 characters.');
}

export const config = {
  env: env.NODE_ENV || 'development',
  isProd,
  isTest,
  port: Number(env.PORT) || 3000,
  databaseUrl: env.DATABASE_URL || '',
  databaseSsl: env.DATABASE_SSL,
  dataDir: env.DATA_DIR || 'data',
  appSecret,
  publicOrigin: (env.PUBLIC_ORIGIN || '').replace(/\/+$/, ''),
  trustProxy: env.TRUST_PROXY ?? (isProd ? '1' : '0'),
  adminEmail: env.ADMIN_EMAIL || '',
  adminName: env.ADMIN_NAME || 'Admin',
  adminPassword: env.ADMIN_PASSWORD || '',
  sessionHours: 12,
  idleMinutes: 120,
  leadMinFillMs: 1500
};

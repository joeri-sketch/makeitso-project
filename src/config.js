const env = process.env;
const isProd = env.NODE_ENV === 'production';
const isTest = env.NODE_ENV === 'test';

// In production the server refuses to start with unsafe or incomplete settings, and says exactly what is missing.
if (isProd) {
  const problems = [];
  if (!env.APP_SECRET) problems.push('APP_SECRET is missing. Set it to a random string of at least 32 characters.');
  else if (env.APP_SECRET.length < 32) problems.push('APP_SECRET is too short. It needs at least 32 characters.');
  if (!env.DATABASE_URL && env.ALLOW_EMBEDDED_DB !== 'true') {
    problems.push('DATABASE_URL is missing. Add a PostgreSQL database and link its DATABASE_URL, otherwise all data would be lost on every deploy.');
  }
  if (problems.length) throw new Error(`Cannot start. Fix these settings first:\n - ${problems.join('\n - ')}`);
}
const appSecret = env.APP_SECRET || 'dev-only-secret-do-not-use-in-production-0123456789';

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

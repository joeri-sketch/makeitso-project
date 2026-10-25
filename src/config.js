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
  const mailSettings = [env.SMTP_HOST, env.SMTP_USER, env.SMTP_PASSWORD].map((value) => Boolean(value));
  if (!env.RESEND_API_KEY && mailSettings.some(Boolean) && !mailSettings.every(Boolean)) {
    problems.push('SMTP_HOST, SMTP_USER and SMTP_PASSWORD must all be set to enable contact-form email.');
  }
  if (env.RESEND_API_KEY && !(env.EMAIL_FROM || env.SMTP_FROM || env.SMTP_USER)) {
    problems.push('EMAIL_FROM is required when RESEND_API_KEY is set; use a sender address from a verified Resend domain.');
  }
  if (problems.length) throw new Error(`Cannot start. Fix these settings first:\n - ${problems.join('\n - ')}`);
}
const appSecret = env.APP_SECRET || 'dev-only-secret-do-not-use-in-production-0123456789';
const smtpPort = Number(env.SMTP_PORT) || 465;

function mediaTarget(name, fallback) {
  const value = env[name] === undefined ? fallback : env[name].trim();
  if (!value) return null;
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid HTTP(S) URL without credentials, query, or fragment.`);
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname ||
      parsed.username || parsed.password || parsed.search || parsed.hash || /[?#]/.test(value)) {
    throw new Error(`${name} must be a valid HTTP(S) URL without credentials, query, or fragment.`);
  }
  return parsed.href;
}

function ubuntuTarget() {
  const value = env.MEDIA_UBUNTU_TCP === undefined
    ? isTest ? '' : '213.119.105.234:3389'
    : env.MEDIA_UBUNTU_TCP.trim();
  if (!value) return null;
  let parsed;
  try { parsed = new URL(`tcp://${value}`); }
  catch { throw new Error('MEDIA_UBUNTU_TCP must be a host:port address.'); }
  if (!parsed.hostname || !parsed.port || Number(parsed.port) < 1 || parsed.username || parsed.password ||
      parsed.pathname || parsed.search || parsed.hash || /[/?#\s]/.test(value)) {
    throw new Error('MEDIA_UBUNTU_TCP must be a host:port address.');
  }
  return parsed.href;
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
  publicOrigins: (env.PUBLIC_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean),
  publicOrigin: (env.PUBLIC_ORIGIN || '').split(',')[0].trim().replace(/\/+$/, ''),
  publicStatusSite: mediaTarget('PUBLIC_STATUS_SITE_URL', 'https://makeitso.studio/'),
  trustProxy: env.TRUST_PROXY ?? (isProd ? '1' : '0'),
  adminEmail: env.ADMIN_EMAIL || '',
  adminName: env.ADMIN_NAME || 'Admin',
  adminPassword: env.ADMIN_PASSWORD || '',
  smtpHost: env.SMTP_HOST || '',
  smtpPort,
  smtpSecure: env.SMTP_SECURE === undefined ? smtpPort === 465 : env.SMTP_SECURE === 'true',
  smtpUser: env.SMTP_USER || '',
  smtpPassword: env.SMTP_PASSWORD || '',
  resendApiKey: env.RESEND_API_KEY || '',
  emailFrom: env.EMAIL_FROM || env.SMTP_FROM || env.SMTP_USER || '',
  smtpFrom: env.SMTP_FROM || env.SMTP_USER || '',
  contactEmail: env.CONTACT_EMAIL || env.SMTP_USER || '',
  sessionHours: 12,
  idleMinutes: 120,
  leadMinFillMs: 1500,
  mediaTargets: {
    jellyfin: mediaTarget('MEDIA_JELLYFIN_URL', isTest ? '' : 'https://jellyfin.makeitso.studio/'),
    jellyseerr: mediaTarget('MEDIA_JELLYSEERR_URL', isTest ? '' : 'https://seer.makeitso.studio/'),
    ubuntu: ubuntuTarget()
  }
};

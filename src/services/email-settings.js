import { encrypt, decrypt } from '../lib/crypto.js';

const SETTING_KEY = 'email_config';
export const DEFAULT_EMAIL_NOTIFICATIONS = Object.freeze({
  contactLeads: true,
  clientInvitations: true,
  projectUpdates: true,
  statusUpdates: true
});

const envSettings = (config) => {
  const provider = config.emailProvider || (config.resendApiKey ? 'resend' : 'smtp');
  return {
    provider,
    emailFrom: (provider === 'smtp' ? config.smtpFrom || config.emailFrom : config.emailFrom) || '',
    contactEmail: config.contactEmail || '',
    smtpHost: config.smtpHost || '',
    smtpPort: config.smtpPort || 465,
    smtpSecure: Boolean(config.smtpSecure),
    smtpUser: config.smtpUser || '',
    smtpPassword: config.smtpPassword || '',
    resendApiKey: config.resendApiKey || '',
    notifications: { ...DEFAULT_EMAIL_NOTIFICATIONS }
  };
};

function decodeStored(value) {
  const stored = JSON.parse(value);
  return {
    provider: stored.provider,
    emailFrom: stored.emailFrom,
    contactEmail: stored.contactEmail,
    smtpHost: stored.smtpHost,
    smtpPort: stored.smtpPort,
    smtpSecure: stored.smtpSecure,
    smtpUser: stored.smtpUser,
    smtpPassword: stored.smtpPasswordEnc ? decrypt(stored.smtpPasswordEnc) : '',
    resendApiKey: stored.resendApiKeyEnc ? decrypt(stored.resendApiKeyEnc) : '',
    notifications: { ...DEFAULT_EMAIL_NOTIFICATIONS, ...stored.notifications }
  };
}

export async function getEmailConfig(db, config) {
  const { rows } = await db.query('SELECT setting_value FROM app_settings WHERE setting_key = $1', [SETTING_KEY]);
  if (!rows[0]) return envSettings(config);
  return { ...envSettings(config), ...decodeStored(rows[0].setting_value) };
}

export async function saveEmailConfig(db, config, input) {
  const current = await getEmailConfig(db, config);
  const next = {
    provider: input.provider,
    emailFrom: input.email_from,
    contactEmail: input.contact_email,
    smtpHost: input.smtp_host,
    smtpPort: input.smtp_port,
    smtpSecure: input.smtp_secure,
    smtpUser: input.smtp_user,
    smtpPassword: input.clear_smtp_password ? '' : input.smtp_password || current.smtpPassword,
    resendApiKey: input.clear_resend_api_key ? '' : input.resend_api_key || current.resendApiKey,
    notifications: input.notifications
  };

  const stored = {
    provider: next.provider,
    emailFrom: next.emailFrom,
    contactEmail: next.contactEmail,
    smtpHost: next.smtpHost,
    smtpPort: next.smtpPort,
    smtpSecure: next.smtpSecure,
    smtpUser: next.smtpUser,
    smtpPasswordEnc: next.smtpPassword ? encrypt(next.smtpPassword) : null,
    resendApiKeyEnc: next.resendApiKey ? encrypt(next.resendApiKey) : null,
    notifications: next.notifications
  };
  await db.query(
    `INSERT INTO app_settings (setting_key, setting_value, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (setting_key) DO UPDATE
       SET setting_value = EXCLUDED.setting_value, updated_at = now()`,
    [SETTING_KEY, JSON.stringify(stored)]
  );
  return next;
}

export function publicEmailConfig(settings) {
  return {
    provider: settings.provider,
    email_from: settings.emailFrom,
    contact_email: settings.contactEmail,
    smtp_host: settings.smtpHost,
    smtp_port: settings.smtpPort,
    smtp_secure: settings.smtpSecure,
    smtp_user: settings.smtpUser,
    smtp_password_set: Boolean(settings.smtpPassword),
    resend_api_key_set: Boolean(settings.resendApiKey),
    notifications: settings.notifications
  };
}

export function parseEmailConfigInput(body, current) {
  const fail = (message, field) => {
    const error = new Error(message);
    error.status = 400;
    error.field = field;
    throw error;
  };
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('Settings must be an object.', 'settings');
  const text = (value, field, { max = 255, required = false } = {}) => {
    if (typeof value !== 'string') fail(`${field} must be text.`, field);
    const result = value.trim();
    if (required && !result) fail(`${field} is required.`, field);
    if (result.length > max) fail(`${field} is too long.`, field);
    if (/[\r\n]/.test(result)) fail(`${field} contains invalid characters.`, field);
    return result;
  };
  const secret = (value, field, { trim = false } = {}) => {
    if (typeof value !== 'string') fail(`${field} must be text.`, field);
    const result = trim ? value.trim() : value;
    if (result.length > 4096) fail(`${field} is too long.`, field);
    if (/[\r\n]/.test(result)) fail(`${field} contains invalid characters.`, field);
    return result;
  };
  const email = (value, field) => {
    const result = text(value, field, { max: 320 });
    if (result && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/.test(result)) {
      fail(`${field} must be a valid email address.`, field);
    }
    return result;
  };
  const provider = body.provider;
  if (!['resend', 'smtp'].includes(provider)) fail('Choose Resend or SMTP.', 'provider');

  const emailFrom = text(body.email_from, 'email_from', { max: 320, required: true });
  if (!/^(?:[^<>]*\s)?<[^<>\s@]+@[^<>\s@]+\.[^<>\s@]+>$/.test(emailFrom) &&
      !/^[^<>\s@]+@[^<>\s@]+\.[^<>\s@]+$/.test(emailFrom)) {
    fail('Enter a sender email address, optionally with a display name.', 'email_from');
  }
  const smtpHost = text(body.smtp_host, 'smtp_host', { max: 253 });
  const smtpUser = text(body.smtp_user, 'smtp_user', { max: 254 });
  const smtpPassword = secret(body.smtp_password || '', 'smtp_password');
  const resendApiKey = secret(body.resend_api_key || '', 'resend_api_key', { trim: true });
  const smtpPort = Number(body.smtp_port);
  if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) fail('SMTP port must be between 1 and 65535.', 'smtp_port');
  if (typeof body.smtp_secure !== 'boolean') fail('Choose whether SMTP uses a secure connection.', 'smtp_secure');
  if (typeof body.clear_smtp_password !== 'boolean' || typeof body.clear_resend_api_key !== 'boolean') {
    fail('Credential removal flags must be booleans.', 'credentials');
  }
  if (!body.notifications || typeof body.notifications !== 'object' || Array.isArray(body.notifications)) {
    fail('Choose which email notifications are enabled.', 'notifications');
  }
  const notifications = {};
  for (const key of Object.keys(DEFAULT_EMAIL_NOTIFICATIONS)) {
    if (typeof body.notifications[key] !== 'boolean') fail(`Notification option ${key} must be enabled or disabled.`, `notifications.${key}`);
    notifications[key] = body.notifications[key];
  }

  const result = {
    provider,
    email_from: emailFrom,
    contact_email: email(body.contact_email, 'contact_email'),
    smtp_host: smtpHost,
    smtp_port: smtpPort,
    smtp_secure: body.smtp_secure,
    smtp_user: smtpUser,
    smtp_password: smtpPassword,
    resend_api_key: resendApiKey,
    notifications,
    clear_smtp_password: body.clear_smtp_password,
    clear_resend_api_key: body.clear_resend_api_key
  };
  const hasSmtpPassword = result.clear_smtp_password ? false : Boolean(smtpPassword || current.smtpPassword);
  const hasResendKey = result.clear_resend_api_key ? false : Boolean(resendApiKey || current.resendApiKey);
  if (provider === 'resend' && !hasResendKey) fail('Add a Resend API key before saving Resend settings.', 'resend_api_key');
  if (provider === 'smtp' && (!smtpHost || !smtpUser || !hasSmtpPassword)) {
    fail('SMTP requires a host, username and password.', 'smtp_host');
  }
  return result;
}

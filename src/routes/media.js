import { Router } from 'express';
import { audit } from '../lib/audit.js';
import { decrypt, encrypt, verifyPassword } from '../lib/crypto.js';
import { HttpError, v } from '../lib/validate.js';
import { asyncHandler as h } from '../middleware/security.js';
import { requireAdmin, requireSession } from '../middleware/session.js';
import { config as defaultConfig } from '../config.js';
import { mediaTargetFingerprint, mediaStatusView } from '../services/media-monitor.js';

const SERVICES = ['jellyfin', 'jellyseerr', 'ubuntu'];
const STATUSES = ['unknown', 'operational', 'degraded', 'offline', 'maintenance'];
const SERVICE_FIELDS = new Set(['url', 'username', 'login_note', 'share_access', 'status', 'message', 'password', 'clear_password']);
const EMPTY_SERVICE = (service) => ({
  service, url: null, username: null, login_note: null, share_access: false,
  status: 'unknown', message: null, status_updated_at: null, has_password: false
});
const SERVICE_SELECT = `service, url, username, login_note, share_access, status, message,
                        status_updated_at, (password_enc IS NOT NULL) AS has_password`;

function serviceId(value) {
  return v.oneOf(value, 'service', SERVICES, { required: true });
}

function optionalBoolean(value, field) {
  if (typeof value !== 'boolean') throw new HttpError(400, `${field} must be a boolean.`, { field });
  return value;
}

function mediaUrl(value) {
  const text = v.str(value, 'url', { max: 500 });
  if (text === null) return null;
  let parsed;
  try {
    parsed = new URL(text);
  } catch {
    throw new HttpError(400, 'url must be a valid HTTP(S) URL without credentials, query, or fragment.', { field: 'url' });
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname ||
      parsed.username || parsed.password || parsed.search || parsed.hash || /[?#]/.test(text)) {
    throw new HttpError(400, 'url must be a valid HTTP(S) URL without credentials, query, or fragment.', { field: 'url' });
  }
  return text;
}

function parseServiceBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Request body must be a JSON object.');
  }
  for (const key of Object.keys(body)) {
    if (!SERVICE_FIELDS.has(key)) throw new HttpError(400, `Unsupported field: ${key}.`, { field: key });
  }
  const fields = {};
  if ('url' in body) fields.url = mediaUrl(body.url);
  if ('username' in body) fields.username = v.str(body.username, 'username', { max: 255 });
  if ('login_note' in body) fields.login_note = v.str(body.login_note, 'login_note', { max: 1000 });
  if ('share_access' in body) fields.share_access = optionalBoolean(body.share_access, 'share_access');
  if ('status' in body) fields.status = v.oneOf(body.status, 'status', STATUSES, { required: true });
  if ('message' in body) fields.message = v.str(body.message, 'message', { max: 2000 });

  const clearPassword = 'clear_password' in body
    ? optionalBoolean(body.clear_password, 'clear_password')
    : false;
  const password = 'password' in body
    ? v.str(body.password, 'password', { max: 500, trim: false })
    : null;
  if (clearPassword && password !== null) {
    throw new HttpError(400, 'password and clear_password cannot be used together.');
  }
  if (clearPassword) fields.password_enc = null;
  else if (password !== null) fields.password_enc = encrypt(password);

  if (!Object.keys(fields).length) throw new HttpError(400, 'Provide at least one media service field to update.');
  return fields;
}

async function lockAvailableClient(tx, clientId) {
  const client = (await tx.query(
    'SELECT id, status, media_enabled FROM clients WHERE id = $1 AND archived_at IS NULL FOR UPDATE',
    [clientId]
  )).rows[0];
  if (!client) throw new HttpError(404, 'Client not found.');
  return client;
}

export function adminMediaRoutes({ db, config = defaultConfig }) {
  const r = Router();
  r.use('/clients/:id/media', requireAdmin);

  r.get('/clients/:id/media', h(async (req, res) => {
    const clientId = v.id(req.params.id);
    const client = (await db.query(
      'SELECT media_enabled FROM clients WHERE id = $1 AND archived_at IS NULL',
      [clientId]
    )).rows[0];
    if (!client) throw new HttpError(404, 'Client not found.');
    const rows = (await db.query(
      `SELECT ${SERVICE_SELECT} FROM client_media_services WHERE client_id = $1`,
      [clientId]
    )).rows;
    const byService = new Map(rows.map((row) => [row.service, row]));
    const monitoring = await readAutomaticStatuses(db, config);
    res.json({
      enabled: client.media_enabled,
      services: SERVICES.map((service) => enrichAdminService(byService.get(service) ?? EMPTY_SERVICE(service), service, config, monitoring))
    });
  }));

  r.put('/clients/:id/media', h(async (req, res) => {
    const clientId = v.id(req.params.id);
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) ||
        Object.keys(req.body).some((key) => key !== 'enabled')) {
      throw new HttpError(400, 'Request body must contain only enabled.');
    }
    const enabled = optionalBoolean(req.body.enabled, 'enabled');
    await db.tx(async (tx) => {
      await lockAvailableClient(tx, clientId);
      await tx.query('UPDATE clients SET media_enabled = $2, updated_at = now() WHERE id = $1', [clientId, enabled]);
      await audit(tx, req, 'media.permission_updated', {
        entity: 'client', entityId: clientId, clientId, meta: { enabled }
      });
    });
    res.json({ enabled });
  }));

  r.put('/clients/:id/media/:service', h(async (req, res) => {
    const clientId = v.id(req.params.id);
    const service = serviceId(req.params.service);
    if (Object.hasOwn(req.body ?? {}, 'status') && config.mediaTargets?.[service]) {
      throw new HttpError(400, 'Status is monitored automatically and cannot be edited.');
    }
    const fields = parseServiceBody(req.body);
    const result = await db.tx(async (tx) => {
      await lockAvailableClient(tx, clientId);
      const keys = Object.keys(fields);
      const values = [clientId, service, ...keys.map((key) => fields[key])];
      const columns = ['client_id', 'service', ...keys];
      const placeholders = values.map((_, index) => `$${index + 1}`);
      const assignments = keys.map((key, index) => `${key} = EXCLUDED.${key}`);
      if ('status' in fields || 'message' in fields) {
        const initiallyChanged =
          ('status' in fields && fields.status !== 'unknown') ||
          ('message' in fields && fields.message !== null);
        values.push(initiallyChanged);
        columns.push('status_updated_at');
        placeholders.push(`CASE WHEN $${values.length} THEN now() ELSE NULL END`);
        const statusParam = 'status' in fields ? `$${keys.indexOf('status') + 3}` : 'client_media_services.status';
        const messageParam = 'message' in fields ? `$${keys.indexOf('message') + 3}` : 'client_media_services.message';
        assignments.push(
          `status_updated_at = CASE
             WHEN client_media_services.status IS DISTINCT FROM ${statusParam}
               OR client_media_services.message IS DISTINCT FROM ${messageParam}
             THEN now() ELSE client_media_services.status_updated_at END`
        );
      }
      const row = (await tx.query(
        `INSERT INTO client_media_services (${columns.join(', ')})
         VALUES (${placeholders.join(', ')})
         ON CONFLICT (client_id, service) DO UPDATE SET ${assignments.join(', ')}
         RETURNING ${SERVICE_SELECT}`,
        values
      )).rows[0];
      await audit(tx, req, 'media.service_updated', {
        entity: 'client_media_service', entityId: clientId, clientId,
        meta: { service, fields: keys.filter((key) => key !== 'password_enc') }
      });
      return row;
    });
    res.json({ service: result });
  }));

  return r;
}

export function portalMediaRoutes({ db, limits, config = defaultConfig }) {
  const r = Router();
  r.use('/media', requireSession, (req, res, next) => {
    if (req.auth.role !== 'client' || !req.auth.clientId) return next(new HttpError(403, 'Client portal access only.'));
    next();
  });

  r.get('/media', h(async (req, res) => {
    const clientId = req.auth.clientId;
    const rows = await db.tx(async (tx) => {
      const client = await lockAvailableClient(tx, clientId);
      if (client.status !== 'active') throw new HttpError(404, 'Client account is no longer active.');
      if (!client.media_enabled) throw new HttpError(403, 'Media access is not enabled.');
      return (await tx.query(
        `SELECT ${SERVICE_SELECT} FROM client_media_services WHERE client_id = $1`,
        [clientId]
      )).rows;
    });
    const byService = new Map(rows.map((row) => [row.service, row]));
    const monitoring = await readAutomaticStatuses(db, config);
    res.json({
      services: SERVICES.map((service) => {
        const row = byService.get(service) ?? EMPTY_SERVICE(service);
        const shared = row.share_access;
        const automatic = mediaStatusView(service, config.mediaTargets?.[service], monitoring.get(service));
        return {
          service,
          share_access: shared,
          url: shared ? row.url : null,
          username: shared ? row.username : null,
          login_note: shared ? row.login_note : null,
          has_password: shared && row.has_password,
          status: automatic.status_source === 'automatic' ? automatic.status : row.status,
          message: row.message,
          status_updated_at: automatic.status_source === 'automatic' ? automatic.checked_at : row.status_updated_at,
          ...automatic
        };
      })
    });
  }));

  r.post('/media/:service/password', limits.login, h(async (req, res) => {
    const clientId = req.auth.clientId;
    const service = serviceId(req.params.service);
    const password = v.str(req.body?.password, 'password', { required: true, max: 200, trim: false });
    const revealed = await db.tx(async (tx) => {
      const client = await lockAvailableClient(tx, clientId);
      if (client.status !== 'active') throw new HttpError(404, 'Client account is no longer active.');
      if (client.media_enabled !== true) throw new HttpError(403, 'Media access is not enabled.');
      const account = (await tx.query(
        `SELECT password_hash FROM users
          WHERE id = $1 AND client_id = $2 AND role = 'client' AND active = TRUE FOR UPDATE`,
        [req.auth.user.id, clientId]
      )).rows[0];
      if (!account || !(await verifyPassword(password, account.password_hash))) {
        throw new HttpError(401, 'Your current password is not correct.');
      }
      const row = (await tx.query(
        `SELECT share_access, password_enc FROM client_media_services
          WHERE client_id = $1 AND service = $2 FOR UPDATE`,
        [clientId, service]
      )).rows[0];
      if (!row?.share_access || !row.password_enc) throw new HttpError(404, 'A shared password is not available.');
      await audit(tx, req, 'media.password_revealed', {
        entity: 'client_media_service', entityId: clientId, clientId, meta: { service }
      });
      return decrypt(row.password_enc);
    });
    res.json({ password: revealed });
  }));

  return r;
}

async function readAutomaticStatuses(db, config) {
  const targets = Object.entries(config.mediaTargets ?? {}).filter(([, target]) => target);
  if (!targets.length) return new Map();
  const { rows } = await db.query(
    'SELECT service, target_fingerprint, status, checked_at, last_success_at, response_ms, failure_count FROM media_service_health'
  );
  return new Map(rows.map((row) => [row.service, row]));
}

function enrichAdminService(row, service, config, monitoring) {
  const automatic = mediaStatusView(service, config.mediaTargets?.[service], monitoring.get(service));
  return {
    ...row,
    status: automatic.status_source === 'automatic' ? automatic.status : row.status,
    status_updated_at: automatic.status_source === 'automatic' ? automatic.checked_at : row.status_updated_at,
    status_source: automatic.status_source,
    checked_at: automatic.checked_at,
    response_ms: automatic.response_ms,
    stale: automatic.stale,
    failure_count: automatic.failure_count,
    configured_url: service === 'ubuntu' ? null : config.mediaTargets?.[service] ?? null,
    manual_status: row.status
  };
}

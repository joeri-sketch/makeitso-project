import { Router } from 'express';
import { audit } from '../lib/audit.js';
import { hashIp, hashPassword, randomToken, sha256 } from '../lib/crypto.js';
import { HttpError, v } from '../lib/validate.js';
import { asyncHandler as h } from '../middleware/security.js';
import { createSession, requireSession } from '../middleware/session.js';
import { publicUser } from './auth.js';

const requireClient = (req, res, next) => {
  if (!req.auth || req.auth.role !== 'client' || !req.auth.clientId) return next(new HttpError(403, 'Client portal access only.'));
  next();
};

const CURRENCY = new Intl.NumberFormat('en-BE', { style: 'currency', currency: 'EUR' });

export function portalRoutes({ db, config, limits }) {
  const r = Router();

  r.post('/invitations/accept', limits.login, h(async (req, res) => {
    const token = v.str(req.body?.token, 'token', { required: true, min: 30, max: 100, trim: false });
    const password = v.str(req.body?.password, 'password', { required: true, min: 12, max: 200, trim: false });
    const invitation = (await db.query(
      `SELECT i.id, i.client_id, i.email, i.name, c.archived_at
         FROM client_invitations i JOIN clients c ON c.id = i.client_id
        WHERE i.token_hash = $1 AND i.accepted_at IS NULL AND i.expires_at > now()`,
      [sha256(token)]
    )).rows[0];
    if (!invitation || invitation.archived_at) throw new HttpError(400, 'This invitation is invalid or has expired. Ask your contact for a new one.');
    const passwordHash = await hashPassword(password);
    const user = await db.tx(async (t) => {
      const locked = (await t.query(
        `SELECT id, client_id, email, name FROM client_invitations
          WHERE id = $1 AND token_hash = $2 AND accepted_at IS NULL AND expires_at > now()
          FOR UPDATE`,
        [invitation.id, sha256(token)]
      )).rows[0];
      if (!locked) throw new HttpError(400, 'This invitation is invalid or has expired. Ask your contact for a new one.');
      const existing = (await t.query('SELECT id, client_id, role, active FROM users WHERE lower(email) = lower($1) FOR UPDATE', [locked.email])).rows[0];
      let created;
      let action = 'portal.account_activated';
      if (existing) {
        if (existing.role !== 'client' || Number(existing.client_id) !== Number(locked.client_id) || existing.active) {
          throw new HttpError(409, 'An active account already exists for this email. Sign in or ask the administrator for help.');
        }
        created = (await t.query(
          `UPDATE users SET name = $2, password_hash = $3, active = TRUE, failed_logins = 0, locked_until = NULL
            WHERE id = $1 RETURNING id, email, name, role`,
          [existing.id, locked.name, passwordHash]
        )).rows[0];
        action = 'portal.account_reactivated';
      } else {
        created = (await t.query(
          `INSERT INTO users (email, name, role, client_id, password_hash)
           VALUES ($1, $2, 'client', $3, $4) RETURNING id, email, name, role`,
          [locked.email, locked.name, locked.client_id, passwordHash]
        )).rows[0];
      }
      await t.query('UPDATE client_invitations SET accepted_at = now() WHERE id = $1', [locked.id]);
      await audit(t, req, action, { entity: 'user', entityId: created.id, clientId: locked.client_id });
      return created;
    });
    await createSession(db, config, req, res, user.id);
    req.auth = { user, role: 'client' };
    await audit(db, req, 'portal.login', { entity: 'user', entityId: user.id, clientId: invitation.client_id });
    res.status(201).json({ user: publicUser(user) });
  }));

  r.use(requireSession, requireClient);

  r.get('/overview', h(async (req, res) => {
    const clientId = req.auth.clientId;
    const [client, projects, milestones, notes, quotes] = await Promise.all([
      db.query('SELECT company_name, language FROM clients WHERE id = $1 AND archived_at IS NULL', [clientId]),
      db.query(
        `SELECT id, name, category, description, status, progress, next_step, target_date, updated_at
           FROM projects WHERE client_id = $1 AND archived_at IS NULL ORDER BY updated_at DESC, id DESC`,
        [clientId]
      ),
      db.query(
        `SELECT m.id, m.project_id, m.title, m.status, m.due_date, m.completed_at, p.name AS project_name
           FROM milestones m JOIN projects p ON p.id = m.project_id
          WHERE p.client_id = $1 AND p.archived_at IS NULL
          ORDER BY p.updated_at DESC, m.sort_order, m.id`,
        [clientId]
      ),
      db.query(
        `SELECT n.id, n.client_id, n.project_id, n.body, n.created_at, u.name AS author_name, p.name AS project_name
           FROM notes n LEFT JOIN projects p ON p.id = n.project_id
           LEFT JOIN users u ON u.id = n.author_id
          WHERE n.client_visible = TRUE
            AND (n.client_id = $1 OR (p.client_id = $1 AND p.archived_at IS NULL))
          ORDER BY n.created_at DESC LIMIT 100`,
        [clientId]
      ),
      db.query(
        `SELECT q.id, q.quote_number, q.title, q.status,
                CASE WHEN q.status = 'sent' AND q.valid_until < CURRENT_DATE THEN 'expired' ELSE q.status END AS display_status,
                q.valid_until, q.sent_at, q.decision_at,
                COALESCE(SUM(ROUND(i.quantity * i.unit_price * 100) + ROUND(i.quantity * i.unit_price * i.vat_rate)), 0)::bigint AS total_cents
           FROM quotes q LEFT JOIN quote_items i ON i.quote_id = q.id
          WHERE q.client_id = $1 AND q.status <> 'draft'
          GROUP BY q.id ORDER BY q.created_at DESC, q.id DESC`,
        [clientId]
      )
    ]);
    if (!client.rows[0]) throw new HttpError(404, 'Client account is no longer active.');
    res.json({
      client: client.rows[0],
      projects: projects.rows,
      milestones: milestones.rows,
      notes: notes.rows,
      quotes: quotes.rows.map((quote) => ({ ...quote, total: CURRENCY.format(Number(quote.total_cents) / 100) }))
    });
  }));

  r.get('/quotes/:id', h(async (req, res) => {
    const id = v.id(req.params.id);
    const quote = (await db.query(
      `SELECT q.*, c.company_name,
              CASE WHEN q.status = 'sent' AND q.valid_until < CURRENT_DATE THEN 'expired' ELSE q.status END AS display_status,
              COALESCE(SUM(ROUND(i.quantity * i.unit_price * 100)), 0)::bigint AS subtotal_cents,
              COALESCE(SUM(ROUND(i.quantity * i.unit_price * i.vat_rate)), 0)::bigint AS vat_cents,
              COALESCE(SUM(ROUND(i.quantity * i.unit_price * 100) + ROUND(i.quantity * i.unit_price * i.vat_rate)), 0)::bigint AS total_cents
         FROM quotes q JOIN clients c ON c.id = q.client_id
         LEFT JOIN quote_items i ON i.quote_id = q.id
        WHERE q.id = $1 AND q.client_id = $2 AND q.status <> 'draft'
        GROUP BY q.id, c.company_name`,
      [id, req.auth.clientId]
    )).rows[0];
    if (!quote) throw new HttpError(404, 'Quote not found.');
    quote.items = (await db.query(
      'SELECT description, quantity, unit_price, vat_rate, sort_order FROM quote_items WHERE quote_id = $1 ORDER BY sort_order, id',
      [id]
    )).rows;
    for (const key of ['subtotal', 'vat', 'total']) quote[key] = CURRENCY.format(Number(quote[`${key}_cents`]) / 100);
    delete quote.subtotal_cents;
    delete quote.vat_cents;
    delete quote.total_cents;
    res.json({ quote });
  }));

  r.post('/quotes/:id/respond', h(async (req, res) => {
    const id = v.id(req.params.id);
    const decision = v.oneOf(req.body?.decision, 'decision', ['accepted', 'declined'], { required: true });
    const note = v.str(req.body?.note, 'note', { max: 1000 }) ?? '';
    const quote = await db.tx(async (t) => {
      const current = (await t.query(
        `SELECT client_id, status, valid_until, quote_number FROM quotes
          WHERE id = $1 AND client_id = $2 FOR UPDATE`,
        [id, req.auth.clientId]
      )).rows[0];
      if (!current) throw new HttpError(404, 'Quote not found.');
      if (current.status !== 'sent') throw new HttpError(409, 'This quote is no longer awaiting a response.');
      if (current.valid_until && current.valid_until < new Date().toISOString().slice(0, 10)) throw new HttpError(409, 'This quote has expired.');
      const updated = (await t.query(
        `UPDATE quotes SET status = $3, decision_at = now(), decision_by = $4, decision_ip_hash = $5,
                           decision_note = $6, updated_at = now()
          WHERE id = $1 AND client_id = $2 AND status = 'sent' RETURNING id, status, decision_at`,
        [id, req.auth.clientId, decision, req.auth.user.id, hashIp(req.ip), note]
      )).rows[0];
      if (!updated) throw new HttpError(409, 'This quote is no longer awaiting a response.');
      await audit(t, req, `quote.${decision}`, {
        entity: 'quote', entityId: id, clientId: req.auth.clientId,
        meta: { quote_number: current.quote_number, note }
      });
      return updated;
    });
    res.json({ quote });
  }));

  return r;
}

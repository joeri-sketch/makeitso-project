import { Router } from 'express';
import { audit } from '../lib/audit.js';
import { HttpError, v } from '../lib/validate.js';
import { asyncHandler as h } from '../middleware/security.js';
import { requireAdmin } from '../middleware/session.js';

const TICKET_STATUSES = ['open', 'in_progress', 'waiting_client', 'resolved', 'closed'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];
const messageBody = (value) => v.str(value, 'message', { required: true, min: 1, max: 5000 });

async function ticketDetail(db, id, clientId = null) {
  const ticket = (await db.query(
    `SELECT t.*, c.company_name
       FROM support_tickets t JOIN clients c ON c.id=t.client_id
      WHERE t.id=$1 AND ($2::bigint IS NULL OR t.client_id=$2)`,
    [id, clientId]
  )).rows[0];
  if (!ticket) throw new HttpError(404, 'Ticket not found.');
  ticket.messages = (await db.query(
    `SELECT m.id, m.body, m.created_at, m.author_id, u.name AS author_name, u.role AS author_role
       FROM support_messages m LEFT JOIN users u ON u.id=m.author_id
      WHERE m.ticket_id=$1 ORDER BY m.created_at, m.id`,
    [id]
  )).rows;
  return ticket;
}

async function createTicket(db, req, clientId, subject, body) {
  return db.tx(async (t) => {
    const created = (await t.query(
      `INSERT INTO support_tickets (client_id, subject) VALUES ($1, $2) RETURNING id`,
      [clientId, subject]
    )).rows[0];
    await t.query(
      'INSERT INTO support_messages (ticket_id, author_id, body) VALUES ($1, $2, $3)',
      [created.id, req.auth.user.id, body]
    );
    await audit(t, req, 'support.ticket_created', {
      entity: 'support_ticket', entityId: created.id, clientId, meta: { subject }
    });
    return created;
  });
}

export function supportRoutes({ db, limits }) {
  const r = Router();

  const client = Router();
  client.use((req, res, next) => {
    if (!req.auth || req.auth.role !== 'client' || !req.auth.clientId) return next(new HttpError(403, 'Client portal access only.'));
    next();
  });

  client.get('/tickets', h(async (req, res) => {
    const { rows } = await db.query(
      `SELECT t.id, t.subject, t.status, t.priority, t.created_at, t.updated_at,
              count(m.id)::int AS message_count
         FROM support_tickets t LEFT JOIN support_messages m ON m.ticket_id=t.id
        WHERE t.client_id=$1 GROUP BY t.id ORDER BY t.updated_at DESC, t.id DESC`,
      [req.auth.clientId]
    );
    res.json({ tickets: rows });
  }));

  client.get('/tickets/:id', h(async (req, res) => {
    res.json({ ticket: await ticketDetail(db, v.id(req.params.id), req.auth.clientId) });
  }));

  client.post('/tickets', limits.login, h(async (req, res) => {
    const subject = v.str(req.body?.subject, 'subject', { required: true, min: 4, max: 160 });
    const body = messageBody(req.body?.message);
    const ticket = await createTicket(db, req, req.auth.clientId, subject, body);
    res.status(201).json({ ticket: await ticketDetail(db, ticket.id, req.auth.clientId) });
  }));

  client.post('/tickets/:id/messages', limits.login, h(async (req, res) => {
    const id = v.id(req.params.id);
    const body = messageBody(req.body?.message);
    await db.tx(async (t) => {
      const ticket = (await t.query(
        'SELECT id, status FROM support_tickets WHERE id=$1 AND client_id=$2 FOR UPDATE',
        [id, req.auth.clientId]
      )).rows[0];
      if (!ticket) throw new HttpError(404, 'Ticket not found.');
      if (ticket.status === 'closed') throw new HttpError(409, 'This ticket is closed. Open a new ticket if you still need help.');
      await t.query('INSERT INTO support_messages (ticket_id, author_id, body) VALUES ($1, $2, $3)', [id, req.auth.user.id, body]);
      await t.query(
        `UPDATE support_tickets SET status='open', resolved_at=NULL, updated_at=now() WHERE id=$1`,
        [id]
      );
      await audit(t, req, 'support.client_replied', { entity: 'support_ticket', entityId: id, clientId: req.auth.clientId });
    });
    res.json({ ticket: await ticketDetail(db, id, req.auth.clientId) });
  }));

  r.use('/portal', client);

  const admin = Router();
  admin.use(requireAdmin);

  admin.get('/tickets', h(async (req, res) => {
    const status = req.query.status ? v.oneOf(req.query.status, 'status', TICKET_STATUSES) : null;
    const { rows } = await db.query(
      `SELECT t.id, t.client_id, t.subject, t.status, t.priority, t.created_at, t.updated_at, c.company_name,
              count(m.id)::int AS message_count
         FROM support_tickets t JOIN clients c ON c.id=t.client_id
         LEFT JOIN support_messages m ON m.ticket_id=t.id
        WHERE ($1::text IS NULL OR t.status=$1)
        GROUP BY t.id, c.company_name ORDER BY
          CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
          CASE WHEN t.status IN ('resolved','closed') THEN 1 ELSE 0 END,
          t.updated_at DESC, t.id DESC`,
      [status]
    );
    res.json({ tickets: rows });
  }));

  admin.get('/tickets/:id', h(async (req, res) => {
    res.json({ ticket: await ticketDetail(db, v.id(req.params.id)) });
  }));

  admin.patch('/tickets/:id', h(async (req, res) => {
    const id = v.id(req.params.id);
    const status = Object.hasOwn(req.body || {}, 'status') ? v.oneOf(req.body.status, 'status', TICKET_STATUSES, { required: true }) : null;
    const priority = Object.hasOwn(req.body || {}, 'priority') ? v.oneOf(req.body.priority, 'priority', PRIORITIES, { required: true }) : null;
    if (!status && !priority) throw new HttpError(400, 'Choose a status or priority to update.');
    await db.tx(async (t) => {
      const current = (await t.query('SELECT client_id, status, priority FROM support_tickets WHERE id=$1 FOR UPDATE', [id])).rows[0];
      if (!current) throw new HttpError(404, 'Ticket not found.');
      await t.query(
        `UPDATE support_tickets
            SET status=COALESCE($2,status), priority=COALESCE($3,priority),
                resolved_at=CASE WHEN $2='resolved' THEN COALESCE(resolved_at,now()) WHEN $2 IN ('open','in_progress','waiting_client') THEN NULL ELSE resolved_at END,
                closed_at=CASE WHEN $2='closed' THEN COALESCE(closed_at,now()) WHEN $2 IS NOT NULL AND $2<>'closed' THEN NULL ELSE closed_at END,
                updated_at=now()
          WHERE id=$1`,
        [id, status, priority]
      );
      await audit(t, req, 'support.ticket_updated', {
        entity: 'support_ticket', entityId: id, clientId: current.client_id,
        meta: { status: status || current.status, priority: priority || current.priority }
      });
    });
    res.json({ ticket: await ticketDetail(db, id) });
  }));

  admin.post('/tickets/:id/messages', h(async (req, res) => {
    const id = v.id(req.params.id);
    const body = messageBody(req.body?.message);
    await db.tx(async (t) => {
      const ticket = (await t.query('SELECT client_id, status FROM support_tickets WHERE id=$1 FOR UPDATE', [id])).rows[0];
      if (!ticket) throw new HttpError(404, 'Ticket not found.');
      if (ticket.status === 'closed') throw new HttpError(409, 'Reopen the ticket before replying.');
      await t.query('INSERT INTO support_messages (ticket_id, author_id, body) VALUES ($1, $2, $3)', [id, req.auth.user.id, body]);
      await t.query(
        `UPDATE support_tickets SET status='waiting_client', resolved_at=NULL, updated_at=now() WHERE id=$1`,
        [id]
      );
      await audit(t, req, 'support.admin_replied', { entity: 'support_ticket', entityId: id, clientId: ticket.client_id });
    });
    res.json({ ticket: await ticketDetail(db, id) });
  }));

  r.use(admin);
  return r;
}

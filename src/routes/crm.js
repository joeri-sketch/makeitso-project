import { Router } from 'express';
import { randomToken, sha256 } from '../lib/crypto.js';
import { audit } from '../lib/audit.js';
import { HttpError, companyNumber, parse, v, vatNumber } from '../lib/validate.js';
import { asyncHandler as h } from '../middleware/security.js';
import { requireAdmin } from '../middleware/session.js';

const LANGS = ['nl', 'fr', 'en'];
const CLIENT_STATUS = ['prospect', 'active', 'inactive'];
const PROJECT_STATUS = ['discovery', 'wireframing', 'development', 'review', 'launched', 'on_hold'];
const MILESTONE_STATUS = ['todo', 'doing', 'done'];
const LEAD_STATUS = ['new', 'contacted', 'qualified', 'converted', 'lost'];
const WORK_ITEM_STATUS = ['todo', 'in_progress', 'in_review', 'done', 'blocked'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

const like = (q) => `%${String(q).trim().replace(/[\\%_]/g, '\\$&')}%`;
const url = (x, name) => {
  const s = v.str(x, name, { max: 200 });
  if (s !== null && !/^https?:\/\/\S+\.\S+$/i.test(s)) throw new HttpError(400, `${name} must start with http:// or https://`, { field: name });
  return s;
};

const clientSchema = {
  company_name: (x) => v.str(x, 'company_name', { required: true, max: 160 }),
  legal_form: (x) => v.str(x, 'legal_form', { max: 40 }),
  vat_number: (x) => vatNumber(x),
  company_number: (x) => companyNumber(x),
  email: (x) => v.email(x, 'email'),
  phone: (x) => v.str(x, 'phone', { max: 40 }),
  website: (x) => url(x, 'website'),
  address_line1: (x) => v.str(x, 'address_line1', { max: 160 }),
  address_line2: (x) => v.str(x, 'address_line2', { max: 160 }),
  postal_code: (x) => v.str(x, 'postal_code', { max: 12 }),
  city: (x) => v.str(x, 'city', { max: 80 }),
  country: (x) => {
    const s = v.str(x, 'country', { max: 2 });
    if (s === null) return 'BE';
    if (!/^[A-Za-z]{2}$/.test(s)) throw new HttpError(400, 'country must be a two-letter code.', { field: 'country' });
    return s.toUpperCase();
  },
  language: (x) => v.oneOf(x, 'language', LANGS) ?? 'nl',
  status: (x) => v.oneOf(x, 'status', CLIENT_STATUS) ?? 'active'
};

const contactSchema = {
  name: (x) => v.str(x, 'name', { required: true, max: 120 }),
  email: (x) => v.email(x, 'email'),
  phone: (x) => v.str(x, 'phone', { max: 40 }),
  role: (x) => v.str(x, 'role', { max: 80 }),
  is_primary: (x) => v.bool(x)
};

const projectSchema = {
  client_id: (x) => v.id(x, 'client_id'),
  name: (x) => v.str(x, 'name', { required: true, max: 160 }),
  category: (x) => v.str(x, 'category', { max: 80 }),
  description: (x) => v.str(x, 'description', { max: 2000 }) ?? '',
  status: (x) => v.oneOf(x, 'status', PROJECT_STATUS) ?? 'discovery',
  progress: (x) => v.int(x, 'progress', { min: 0, max: 100 }) ?? 0,
  next_step: (x) => v.str(x, 'next_step', { max: 240 }) ?? '',
  target_date: (x) => v.date(x, 'target_date')
};

const milestoneSchema = {
  title: (x) => v.str(x, 'title', { required: true, max: 160 }),
  status: (x) => v.oneOf(x, 'status', MILESTONE_STATUS) ?? 'todo',
  due_date: (x) => v.date(x, 'due_date'),
  sort_order: (x) => v.int(x, 'sort_order', { min: 0, max: 100000 }) ?? 0
};

const workItemSchema = {
  title: (x) => v.str(x, 'title', { required: true, max: 200 }),
  description: (x) => v.str(x, 'description', { max: 2000 }) ?? '',
  status: (x) => v.oneOf(x, 'status', WORK_ITEM_STATUS) ?? 'todo',
  priority: (x) => v.oneOf(x, 'priority', PRIORITIES) ?? 'normal',
  due_date: (x) => v.date(x, 'due_date'),
  estimate_minutes: (x) => v.int(x, 'estimate_minutes', { min: 1, max: 1440 }),
  client_visible: (x) => v.bool(x),
  sort_order: (x) => v.int(x, 'sort_order', { min: 0, max: 100000 }) ?? 0
};

const timeEntrySchema = {
  entry_date: (x) => v.date(x, 'entry_date', { required: true }),
  duration_minutes: (x) => v.int(x, 'duration_minutes', { min: 1, max: 1440, required: true }),
  description: (x) => v.str(x, 'description', { required: true, min: 2, max: 500 }),
  billable: (x) => x === undefined ? true : v.bool(x),
  work_item_id: (x) => x === null || x === '' ? null : v.id(x, 'work_item_id')
};

const projectProgress = `(CASE WHEN (SELECT count(*) FROM work_items wi WHERE wi.project_id = p.id) > 0
  THEN (SELECT round(100.0 * count(*) FILTER (WHERE wi.status = 'done') / count(*))::int FROM work_items wi WHERE wi.project_id = p.id)
  ELSE p.progress END)`;

// table and column names come from the schemas above, never from user input
async function updateRow(db, table, id, fields, extraSet = '') {
  const keys = Object.keys(fields);
  if (!keys.length) throw new HttpError(400, 'Nothing to update.');
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const { rows } = await db.query(`UPDATE ${table} SET ${sets}${extraSet} WHERE id = $1 RETURNING *`, [id, ...keys.map((k) => fields[k])]);
  if (!rows[0]) throw new HttpError(404, 'Not found.');
  return rows[0];
}

async function insertRow(db, table, fields) {
  const keys = Object.keys(fields);
  const { rows } = await db.query(
    `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
    keys.map((k) => fields[k])
  );
  return rows[0];
}

export function crmRoutes({ db, config }) {
  const r = Router();
  r.use(requireAdmin);

  // ---------------- dashboard + activity ----------------
  r.get('/dashboard', h(async (req, res) => {
    const [counts, byStatus, milestones, activity] = await Promise.all([
      db.query(`SELECT
          (SELECT count(*) FROM clients WHERE archived_at IS NULL AND status = 'active')::int AS active_clients,
          (SELECT count(*) FROM clients WHERE archived_at IS NULL AND status = 'prospect')::int AS prospects,
          (SELECT count(*) FROM projects WHERE archived_at IS NULL AND status NOT IN ('launched'))::int AS open_projects,
          (SELECT count(*) FROM leads WHERE status = 'new')::int AS new_leads`),
      db.query(`SELECT status, count(*)::int AS n FROM projects WHERE archived_at IS NULL GROUP BY status`),
      db.query(`SELECT m.id, m.title, m.due_date, m.status, p.id AS project_id, p.name AS project_name, c.company_name
                  FROM milestones m JOIN projects p ON p.id = m.project_id JOIN clients c ON c.id = p.client_id
                 WHERE m.status <> 'done' AND p.archived_at IS NULL
                 ORDER BY m.due_date NULLS LAST, m.id LIMIT 6`),
      db.query(`SELECT a.id, a.action, a.entity, a.entity_id, a.meta, a.created_at, u.name AS actor_name
                  FROM activity_log a LEFT JOIN users u ON u.id = a.actor_id
                 WHERE a.action NOT LIKE 'auth.%' AND a.action NOT LIKE '2fa.%'
                 ORDER BY a.created_at DESC, a.id DESC LIMIT 10`)
    ]);
    res.json({ counts: counts.rows[0], projects_by_status: byStatus.rows, upcoming_milestones: milestones.rows, recent_activity: activity.rows });
  }));

  r.get('/activity', h(async (req, res) => {
    const clientId = req.query.client_id ? v.id(req.query.client_id, 'client_id') : null;
    const projectId = req.query.project_id ? v.id(req.query.project_id, 'project_id') : null;
    const limit = v.int(req.query.limit, 'limit', { min: 1, max: 100 }) ?? 30;
    const { rows } = await db.query(
      `SELECT a.id, a.action, a.entity, a.entity_id, a.meta, a.created_at, u.name AS actor_name
         FROM activity_log a LEFT JOIN users u ON u.id = a.actor_id
        WHERE ($1::bigint IS NULL OR a.client_id = $1) AND ($2::bigint IS NULL OR a.project_id = $2)
        ORDER BY a.created_at DESC, a.id DESC LIMIT $3`,
      [clientId, projectId, limit]
    );
    res.json({ activity: rows });
  }));

  // ---------------- clients ----------------
  r.get('/clients', h(async (req, res) => {
    const q = req.query.q ? like(req.query.q) : null;
    const status = v.oneOf(req.query.status, 'status', CLIENT_STATUS);
    const archived = v.bool(req.query.archived);
    const { rows } = await db.query(
      `SELECT c.*,
              (SELECT count(*) FROM projects p WHERE p.client_id = c.id AND p.archived_at IS NULL)::int AS project_count,
              (SELECT name FROM contacts k WHERE k.client_id = c.id ORDER BY is_primary DESC, id LIMIT 1) AS primary_contact
         FROM clients c
        WHERE ($1::text IS NULL OR c.company_name ILIKE $1 OR c.email ILIKE $1 OR c.vat_number ILIKE $1 OR c.city ILIKE $1
               OR EXISTS (SELECT 1 FROM contacts k WHERE k.client_id = c.id AND (k.name ILIKE $1 OR k.email ILIKE $1)))
          AND ($2::text IS NULL OR c.status = $2)
          AND ($3::boolean OR c.archived_at IS NULL)
        ORDER BY lower(c.company_name) LIMIT 500`,
      [q, status, archived]
    );
    res.json({ clients: rows });
  }));

  r.post('/clients', h(async (req, res) => {
    const data = parse(req.body, clientSchema);
    const contact = req.body.contact && req.body.contact.name ? parse(req.body.contact, contactSchema) : null;
    const client = await db.tx(async (t) => {
      const created = await insertRow(t, 'clients', data);
      if (contact) await insertRow(t, 'contacts', { ...contact, client_id: created.id, is_primary: true });
      await audit(t, req, 'client.created', { entity: 'client', entityId: created.id, clientId: created.id, meta: { name: created.company_name } });
      return created;
    });
    res.status(201).json({ client });
  }));

  r.get('/clients/:id', h(async (req, res) => {
    const id = v.id(req.params.id);
    const { rows } = await db.query('SELECT * FROM clients WHERE id = $1', [id]);
    if (!rows[0]) throw new HttpError(404, 'Client not found.');
    const [contacts, projects, notes, activity, accounts] = await Promise.all([
      db.query('SELECT * FROM contacts WHERE client_id = $1 ORDER BY is_primary DESC, id', [id]),
      db.query('SELECT * FROM projects WHERE client_id = $1 ORDER BY archived_at NULLS FIRST, updated_at DESC', [id]),
      db.query(`SELECT n.*, u.name AS author_name FROM notes n LEFT JOIN users u ON u.id = n.author_id
                 WHERE n.client_id = $1 ORDER BY n.pinned DESC, n.created_at DESC LIMIT 100`, [id]),
      db.query(`SELECT a.id, a.action, a.entity, a.meta, a.created_at, u.name AS actor_name
                  FROM activity_log a LEFT JOIN users u ON u.id = a.actor_id
                 WHERE a.client_id = $1 ORDER BY a.created_at DESC, a.id DESC LIMIT 25`, [id]),
      db.query('SELECT id, email, name, active, created_at FROM users WHERE client_id = $1 ORDER BY created_at', [id])
    ]);
    res.json({ client: rows[0], contacts: contacts.rows, projects: projects.rows, notes: notes.rows, activity: activity.rows, accounts: accounts.rows });
  }));

  r.post('/clients/:id/invitations', h(async (req, res) => {
    const clientId = v.id(req.params.id);
    const email = v.email(req.body?.email, 'email', { required: true });
    const contact = await db.query(
      `SELECT k.name, k.email, c.language FROM contacts k JOIN clients c ON c.id = k.client_id
        WHERE c.id = $1 AND c.archived_at IS NULL AND lower(k.email) = lower($2)
        ORDER BY k.is_primary DESC, k.id LIMIT 1`,
      [clientId, email]
    );
    if (!contact.rows[0]) throw new HttpError(400, 'Choose an email address saved on this client’s contacts.', { field: 'email' });
    const existing = (await db.query('SELECT id, client_id, role, active FROM users WHERE lower(email) = lower($1)', [email])).rows[0];
    if (existing && (existing.role !== 'client' || Number(existing.client_id) !== clientId || existing.active)) {
      throw new HttpError(409, 'An active account already exists for this email.');
    }
    const token = randomToken(32);
    await db.tx(async (t) => {
      await t.query(
        `UPDATE client_invitations SET expires_at = now()
          WHERE client_id = $1 AND lower(email) = lower($2) AND accepted_at IS NULL AND expires_at > now()`,
        [clientId, email]
      );
      await t.query(
        `INSERT INTO client_invitations (client_id, email, name, token_hash, created_by, expires_at)
         VALUES ($1, $2, $3, $4, $5, now() + interval '7 days')`,
        [clientId, email, contact.rows[0].name, sha256(token), req.auth.user.id]
      );
      await audit(t, req, 'portal.invitation_created', {
        entity: 'client', entityId: clientId, clientId, meta: { email }
      });
    });
    const origin = config.publicOrigin || `${req.protocol}://${req.get('host')}`;
    res.status(201).json({
      invitation_url: `${origin}/portal/?invite=${encodeURIComponent(token)}&lang=${contact.rows[0].language}`,
      expires_in_days: 7
    });
  }));

  r.post('/clients/:id/access/revoke', h(async (req, res) => {
    const clientId = v.id(req.params.id);
    const userId = req.body?.user_id ? v.id(req.body.user_id, 'user_id') : null;
    if (!userId) throw new HttpError(400, 'Choose a client account to revoke.', { field: 'user_id' });
    const revoked = await db.tx(async (t) => {
      const user = (await t.query(
        `UPDATE users SET active = FALSE WHERE id = $1 AND client_id = $2 AND role = 'client'
         RETURNING id, email, name`,
        [userId, clientId]
      )).rows[0];
      if (!user) throw new HttpError(404, 'Client account not found.');
      await t.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
      await t.query(
        `UPDATE client_invitations SET expires_at = now()
          WHERE client_id = $1 AND lower(email) = lower($2) AND accepted_at IS NULL`,
        [clientId, user.email]
      );
      await audit(t, req, 'portal.access_revoked', {
        entity: 'user', entityId: userId, clientId, meta: { email: user.email }
      });
      return user;
    });
    res.json({ account: revoked });
  }));

  r.patch('/clients/:id', h(async (req, res) => {
    const id = v.id(req.params.id);
    const data = parse(req.body, clientSchema, { partial: true });
    const client = await updateRow(db, 'clients', id, data, ', updated_at = now()');
    await audit(db, req, 'client.updated', { entity: 'client', entityId: id, clientId: id, meta: { fields: Object.keys(data) } });
    res.json({ client });
  }));

  for (const [path, set, action] of [['archive', 'now()', 'client.archived'], ['restore', 'NULL', 'client.restored']]) {
    r.post(`/clients/:id/${path}`, h(async (req, res) => {
      const id = v.id(req.params.id);
      const { rows } = await db.query(`UPDATE clients SET archived_at = ${set}, updated_at = now() WHERE id = $1 RETURNING *`, [id]);
      if (!rows[0]) throw new HttpError(404, 'Client not found.');
      await audit(db, req, action, { entity: 'client', entityId: id, clientId: id, meta: { name: rows[0].company_name } });
      res.json({ client: rows[0] });
    }));
  }

  // ---------------- contacts ----------------
  r.post('/clients/:id/contacts', h(async (req, res) => {
    const clientId = v.id(req.params.id);
    const data = parse(req.body, contactSchema);
    const contact = await db.tx(async (t) => {
      const { rows } = await t.query('SELECT id FROM clients WHERE id = $1', [clientId]);
      if (!rows[0]) throw new HttpError(404, 'Client not found.');
      if (data.is_primary) await t.query('UPDATE contacts SET is_primary = FALSE WHERE client_id = $1', [clientId]);
      const created = await insertRow(t, 'contacts', { ...data, client_id: clientId });
      await audit(t, req, 'contact.created', { entity: 'contact', entityId: created.id, clientId, meta: { name: created.name } });
      return created;
    });
    res.status(201).json({ contact });
  }));

  r.patch('/contacts/:id', h(async (req, res) => {
    const id = v.id(req.params.id);
    const data = parse(req.body, contactSchema, { partial: true });
    const contact = await db.tx(async (t) => {
      const current = (await t.query('SELECT client_id FROM contacts WHERE id = $1', [id])).rows[0];
      if (!current) throw new HttpError(404, 'Contact not found.');
      if (data.is_primary) await t.query('UPDATE contacts SET is_primary = FALSE WHERE client_id = $1 AND id <> $2', [current.client_id, id]);
      const updated = await updateRow(t, 'contacts', id, data);
      await audit(t, req, 'contact.updated', { entity: 'contact', entityId: id, clientId: current.client_id });
      return updated;
    });
    res.json({ contact });
  }));

  r.delete('/contacts/:id', h(async (req, res) => {
    const id = v.id(req.params.id);
    const { rows } = await db.query('DELETE FROM contacts WHERE id = $1 RETURNING client_id, name', [id]);
    if (!rows[0]) throw new HttpError(404, 'Contact not found.');
    await audit(db, req, 'contact.deleted', { entity: 'contact', entityId: id, clientId: rows[0].client_id, meta: { name: rows[0].name } });
    res.json({ ok: true });
  }));

  // ---------------- projects ----------------
  r.get('/projects', h(async (req, res) => {
    const clientId = req.query.client_id ? v.id(req.query.client_id, 'client_id') : null;
    const status = v.oneOf(req.query.status, 'status', PROJECT_STATUS);
    const archived = v.bool(req.query.archived);
    const q = req.query.q ? like(req.query.q) : null;
    const { rows } = await db.query(
      `SELECT p.*, ${projectProgress} AS progress, c.company_name,
              (SELECT count(*) FROM milestones m WHERE m.project_id = p.id)::int AS milestone_count,
              (SELECT count(*) FROM milestones m WHERE m.project_id = p.id AND m.status = 'done')::int AS milestones_done,
              (SELECT count(*) FROM work_items wi WHERE wi.project_id = p.id)::int AS work_item_count,
              (SELECT count(*) FROM work_items wi WHERE wi.project_id = p.id AND wi.status = 'done')::int AS work_items_done,
              (SELECT COALESCE(sum(te.duration_minutes), 0)::int FROM time_entries te WHERE te.project_id = p.id) AS logged_minutes
         FROM projects p JOIN clients c ON c.id = p.client_id
        WHERE ($1::bigint IS NULL OR p.client_id = $1) AND ($2::text IS NULL OR p.status = $2)
          AND ($3::boolean OR p.archived_at IS NULL) AND ($4::text IS NULL OR p.name ILIKE $4 OR c.company_name ILIKE $4)
        ORDER BY p.updated_at DESC LIMIT 500`,
      [clientId, status, archived, q]
    );
    res.json({ projects: rows });
  }));

  r.post('/projects', h(async (req, res) => {
    const data = parse(req.body, projectSchema);
    const project = await db.tx(async (t) => {
      const client = (await t.query('SELECT id FROM clients WHERE id = $1 AND archived_at IS NULL', [data.client_id])).rows[0];
      if (!client) throw new HttpError(400, 'Choose an existing client.', { field: 'client_id' });
      const created = await insertRow(t, 'projects', data);
      await audit(t, req, 'project.created', { entity: 'project', entityId: created.id, clientId: created.client_id, projectId: created.id, meta: { name: created.name } });
      return created;
    });
    res.status(201).json({ project });
  }));

  r.get('/projects/:id', h(async (req, res) => {
    const id = v.id(req.params.id);
    const { rows } = await db.query(
      `SELECT p.*, ${projectProgress} AS progress, c.company_name,
              (SELECT count(*) FROM work_items wi WHERE wi.project_id = p.id)::int AS work_item_count,
              (SELECT count(*) FROM work_items wi WHERE wi.project_id = p.id AND wi.status = 'done')::int AS work_items_done,
              (SELECT COALESCE(sum(wi.estimate_minutes), 0)::int FROM work_items wi WHERE wi.project_id = p.id) AS estimate_minutes,
              (SELECT COALESCE(sum(te.duration_minutes), 0)::int FROM time_entries te WHERE te.project_id = p.id) AS logged_minutes,
              (SELECT COALESCE(sum(te.duration_minutes) FILTER (WHERE te.billable), 0)::int FROM time_entries te WHERE te.project_id = p.id) AS billable_minutes
         FROM projects p JOIN clients c ON c.id = p.client_id WHERE p.id = $1`, [id]);
    if (!rows[0]) throw new HttpError(404, 'Project not found.');
    const [milestones, workItems, timeEntries, notes, activity] = await Promise.all([
      db.query('SELECT * FROM milestones WHERE project_id = $1 ORDER BY sort_order, id', [id]),
      db.query('SELECT * FROM work_items WHERE project_id = $1 ORDER BY CASE status WHEN \'in_progress\' THEN 0 WHEN \'in_review\' THEN 1 WHEN \'blocked\' THEN 2 WHEN \'todo\' THEN 3 ELSE 4 END, due_date NULLS LAST, sort_order, id', [id]),
      db.query('SELECT te.*, wi.title AS work_item_title FROM time_entries te LEFT JOIN work_items wi ON wi.id = te.work_item_id WHERE te.project_id = $1 ORDER BY te.entry_date DESC, te.id DESC LIMIT 100', [id]),
      db.query(`SELECT n.*, u.name AS author_name FROM notes n LEFT JOIN users u ON u.id = n.author_id
                 WHERE n.project_id = $1 ORDER BY n.pinned DESC, n.created_at DESC LIMIT 100`, [id]),
      db.query(`SELECT a.id, a.action, a.entity, a.meta, a.created_at, u.name AS actor_name
                  FROM activity_log a LEFT JOIN users u ON u.id = a.actor_id
                 WHERE a.project_id = $1 ORDER BY a.created_at DESC, a.id DESC LIMIT 25`, [id])
    ]);
    res.json({ project: rows[0], milestones: milestones.rows, work_items: workItems.rows, time_entries: timeEntries.rows, notes: notes.rows, activity: activity.rows });
  }));

  r.patch('/projects/:id', h(async (req, res) => {
    const id = v.id(req.params.id);
    const data = parse(req.body, projectSchema, { partial: true });
    const before = (await db.query('SELECT status, client_id FROM projects WHERE id = $1', [id])).rows[0];
    if (!before) throw new HttpError(404, 'Project not found.');
    if (data.client_id && data.client_id !== before.client_id) throw new HttpError(400, 'A project cannot move to another client.', { field: 'client_id' });
    delete data.client_id;
    const project = await updateRow(db, 'projects', id, data, ', updated_at = now()');
    const meta = { fields: Object.keys(data) };
    let action = 'project.updated';
    if (data.status && data.status !== before.status) { action = 'project.status_changed'; meta.from = before.status; meta.to = data.status; }
    await audit(db, req, action, { entity: 'project', entityId: id, clientId: before.client_id, projectId: id, meta });
    res.json({ project });
  }));

  for (const [path, set, action] of [['archive', 'now()', 'project.archived'], ['restore', 'NULL', 'project.restored']]) {
    r.post(`/projects/:id/${path}`, h(async (req, res) => {
      const id = v.id(req.params.id);
      const { rows } = await db.query(`UPDATE projects SET archived_at = ${set}, updated_at = now() WHERE id = $1 RETURNING *`, [id]);
      if (!rows[0]) throw new HttpError(404, 'Project not found.');
      await audit(db, req, action, { entity: 'project', entityId: id, clientId: rows[0].client_id, projectId: id, meta: { name: rows[0].name } });
      res.json({ project: rows[0] });
    }));
  }

  // ---------------- milestones ----------------
  r.post('/projects/:id/milestones', h(async (req, res) => {
    const projectId = v.id(req.params.id);
    const data = parse(req.body, milestoneSchema);
    const milestone = await db.tx(async (t) => {
      const project = (await t.query('SELECT client_id FROM projects WHERE id = $1', [projectId])).rows[0];
      if (!project) throw new HttpError(404, 'Project not found.');
      if (!('sort_order' in req.body)) {
        data.sort_order = (await t.query('SELECT COALESCE(MAX(sort_order), 0)::int + 10 AS n FROM milestones WHERE project_id = $1', [projectId])).rows[0].n;
      }
      const created = await insertRow(t, 'milestones', { ...data, project_id: projectId, completed_at: data.status === 'done' ? new Date() : null });
      await audit(t, req, 'milestone.created', { entity: 'milestone', entityId: created.id, clientId: project.client_id, projectId, meta: { title: created.title } });
      return created;
    });
    await db.query('UPDATE projects SET updated_at = now() WHERE id = $1', [projectId]);
    res.status(201).json({ milestone });
  }));

  r.patch('/milestones/:id', h(async (req, res) => {
    const id = v.id(req.params.id);
    const data = parse(req.body, milestoneSchema, { partial: true });
    const current = (await db.query(
      'SELECT m.project_id, m.status, p.client_id FROM milestones m JOIN projects p ON p.id = m.project_id WHERE m.id = $1', [id])).rows[0];
    if (!current) throw new HttpError(404, 'Milestone not found.');
    const set = data.status ? (data.status === 'done' ? ', completed_at = COALESCE(completed_at, now())' : ', completed_at = NULL') : '';
    const milestone = await updateRow(db, 'milestones', id, data, set);
    const action = data.status && data.status !== current.status ? 'milestone.status_changed' : 'milestone.updated';
    await audit(db, req, action, { entity: 'milestone', entityId: id, clientId: current.client_id, projectId: current.project_id, meta: { title: milestone.title, from: current.status, to: milestone.status } });
    await db.query('UPDATE projects SET updated_at = now() WHERE id = $1', [current.project_id]);
    res.json({ milestone });
  }));

  r.delete('/milestones/:id', h(async (req, res) => {
    const id = v.id(req.params.id);
    const { rows } = await db.query(
      `DELETE FROM milestones m USING projects p WHERE m.id = $1 AND p.id = m.project_id RETURNING m.project_id, m.title, p.client_id`, [id]);
    if (!rows[0]) throw new HttpError(404, 'Milestone not found.');
    await audit(db, req, 'milestone.deleted', { entity: 'milestone', entityId: id, clientId: rows[0].client_id, projectId: rows[0].project_id, meta: { title: rows[0].title } });
    res.json({ ok: true });
  }));

  // ---------------- project work items + time tracking ----------------
  r.get('/work-items', h(async (req, res) => {
    const status = req.query.status ? v.oneOf(req.query.status, 'status', WORK_ITEM_STATUS) : null;
    const projectId = req.query.project_id ? v.id(req.query.project_id, 'project_id') : null;
    const { rows } = await db.query(
      `SELECT wi.*, p.name AS project_name, p.client_id, c.company_name
         FROM work_items wi JOIN projects p ON p.id = wi.project_id JOIN clients c ON c.id = p.client_id
        WHERE p.archived_at IS NULL AND ($1::bigint IS NULL OR wi.project_id = $1)
          AND ($2::text IS NULL OR wi.status = $2)
        ORDER BY CASE wi.status WHEN 'in_progress' THEN 0 WHEN 'in_review' THEN 1 WHEN 'blocked' THEN 2 WHEN 'todo' THEN 3 ELSE 4 END,
                 wi.due_date NULLS LAST, wi.updated_at DESC, wi.id DESC LIMIT 500`,
      [projectId, status]
    );
    res.json({ work_items: rows });
  }));

  r.post('/projects/:id/work-items', h(async (req, res) => {
    const projectId = v.id(req.params.id, 'project_id');
    const data = parse(req.body, workItemSchema);
    const item = await db.tx(async (t) => {
      const project = (await t.query('SELECT client_id FROM projects WHERE id = $1', [projectId])).rows[0];
      if (!project) throw new HttpError(404, 'Project not found.');
      if (!Object.hasOwn(req.body, 'sort_order')) {
        data.sort_order = (await t.query('SELECT COALESCE(MAX(sort_order), 0)::int + 10 AS n FROM work_items WHERE project_id = $1', [projectId])).rows[0].n;
      }
      const created = await insertRow(t, 'work_items', { ...data, project_id: projectId, completed_at: data.status === 'done' ? new Date() : null });
      await audit(t, req, 'work_item.created', { entity: 'work_item', entityId: created.id, clientId: project.client_id, projectId, meta: { title: created.title } });
      return created;
    });
    await db.query('UPDATE projects SET updated_at = now() WHERE id = $1', [projectId]);
    res.status(201).json({ work_item: item });
  }));

  r.patch('/work-items/:id', h(async (req, res) => {
    const id = v.id(req.params.id);
    const data = parse(req.body, workItemSchema, { partial: true });
    const current = (await db.query(
      'SELECT wi.project_id, wi.status, p.client_id FROM work_items wi JOIN projects p ON p.id = wi.project_id WHERE wi.id = $1', [id])).rows[0];
    if (!current) throw new HttpError(404, 'Work item not found.');
    const set = data.status ? (data.status === 'done' ? ', completed_at = COALESCE(completed_at, now())' : ', completed_at = NULL') : '';
    const item = await updateRow(db, 'work_items', id, data, `${set}, updated_at = now()`);
    const action = data.status && data.status !== current.status ? 'work_item.status_changed' : 'work_item.updated';
    await audit(db, req, action, { entity: 'work_item', entityId: id, clientId: current.client_id, projectId: current.project_id, meta: { title: item.title, from: current.status, to: item.status } });
    await db.query('UPDATE projects SET updated_at = now() WHERE id = $1', [current.project_id]);
    res.json({ work_item: item });
  }));

  r.delete('/work-items/:id', h(async (req, res) => {
    const id = v.id(req.params.id);
    const { rows } = await db.query(
      `DELETE FROM work_items wi USING projects p
        WHERE wi.id = $1 AND p.id = wi.project_id
        RETURNING wi.project_id, wi.title, p.client_id`, [id]);
    if (!rows[0]) throw new HttpError(404, 'Work item not found.');
    await audit(db, req, 'work_item.deleted', { entity: 'work_item', entityId: id, clientId: rows[0].client_id, projectId: rows[0].project_id, meta: { title: rows[0].title } });
    await db.query('UPDATE projects SET updated_at = now() WHERE id = $1', [rows[0].project_id]);
    res.json({ ok: true });
  }));

  r.get('/time-entries', h(async (req, res) => {
    const projectId = req.query.project_id ? v.id(req.query.project_id, 'project_id') : null;
    const from = req.query.from ? v.date(req.query.from, 'from') : null;
    const to = req.query.to ? v.date(req.query.to, 'to') : null;
    const { rows } = await db.query(
      `SELECT te.*, wi.title AS work_item_title, p.name AS project_name, p.client_id, c.company_name,
              u.name AS author_name
         FROM time_entries te JOIN projects p ON p.id = te.project_id JOIN clients c ON c.id = p.client_id
         LEFT JOIN work_items wi ON wi.id = te.work_item_id LEFT JOIN users u ON u.id = te.created_by
        WHERE ($1::bigint IS NULL OR te.project_id = $1)
          AND ($2::date IS NULL OR te.entry_date >= $2) AND ($3::date IS NULL OR te.entry_date <= $3)
        ORDER BY te.entry_date DESC, te.id DESC LIMIT 1000`,
      [projectId, from, to]
    );
    res.json({
      time_entries: rows,
      totals: {
        minutes: rows.reduce((total, entry) => total + entry.duration_minutes, 0),
        billable_minutes: rows.reduce((total, entry) => total + (entry.billable ? entry.duration_minutes : 0), 0)
      }
    });
  }));

  r.post('/time-entries', h(async (req, res) => {
    const projectId = v.id(req.body?.project_id, 'project_id');
    const data = parse(req.body, timeEntrySchema);
    const entry = await db.tx(async (t) => {
      const project = (await t.query('SELECT client_id FROM projects WHERE id = $1', [projectId])).rows[0];
      if (!project) throw new HttpError(404, 'Project not found.');
      if (data.work_item_id) {
        const item = (await t.query('SELECT id FROM work_items WHERE id = $1 AND project_id = $2', [data.work_item_id, projectId])).rows[0];
        if (!item) throw new HttpError(400, 'Choose a work item from this project.', { field: 'work_item_id' });
      }
      const created = await insertRow(t, 'time_entries', { ...data, project_id: projectId, created_by: req.auth.user.id });
      await audit(t, req, 'time_entry.created', { entity: 'time_entry', entityId: created.id, clientId: project.client_id, projectId, meta: { duration_minutes: created.duration_minutes, billable: created.billable } });
      return created;
    });
    res.status(201).json({ time_entry: entry });
  }));

  r.patch('/time-entries/:id', h(async (req, res) => {
    const id = v.id(req.params.id);
    const data = parse(req.body, timeEntrySchema, { partial: true });
    const current = (await db.query(
      'SELECT te.project_id, p.client_id FROM time_entries te JOIN projects p ON p.id = te.project_id WHERE te.id = $1', [id])).rows[0];
    if (!current) throw new HttpError(404, 'Time entry not found.');
    if (Object.hasOwn(data, 'work_item_id') && data.work_item_id) {
      const item = (await db.query('SELECT id FROM work_items WHERE id = $1 AND project_id = $2', [data.work_item_id, current.project_id])).rows[0];
      if (!item) throw new HttpError(400, 'Choose a work item from this project.', { field: 'work_item_id' });
    }
    const entry = await updateRow(db, 'time_entries', id, data, ', updated_at = now()');
    await audit(db, req, 'time_entry.updated', { entity: 'time_entry', entityId: id, clientId: current.client_id, projectId: current.project_id, meta: { duration_minutes: entry.duration_minutes, billable: entry.billable } });
    res.json({ time_entry: entry });
  }));

  r.delete('/time-entries/:id', h(async (req, res) => {
    const id = v.id(req.params.id);
    const { rows } = await db.query(
      'DELETE FROM time_entries te USING projects p WHERE te.id = $1 AND p.id = te.project_id RETURNING te.project_id, te.duration_minutes, p.client_id', [id]);
    if (!rows[0]) throw new HttpError(404, 'Time entry not found.');
    await audit(db, req, 'time_entry.deleted', { entity: 'time_entry', entityId: id, clientId: rows[0].client_id, projectId: rows[0].project_id, meta: { duration_minutes: rows[0].duration_minutes } });
    res.json({ ok: true });
  }));

  // ---------------- notes ----------------
  r.post('/notes', h(async (req, res) => {
    const body = v.str(req.body?.body, 'body', { required: true, max: 4000 });
    const clientVisible = v.bool(req.body?.client_visible);
    const clientId = req.body.client_id ? v.id(req.body.client_id, 'client_id') : null;
    const projectId = req.body.project_id ? v.id(req.body.project_id, 'project_id') : null;
    if (!clientId && !projectId) throw new HttpError(400, 'A note must belong to a client or a project.');
    const note = await db.tx(async (t) => {
      let owner = clientId;
      if (projectId) {
        const p = (await t.query('SELECT client_id FROM projects WHERE id = $1', [projectId])).rows[0];
        if (!p) throw new HttpError(404, 'Project not found.');
        owner = p.client_id;
      } else if (!(await t.query('SELECT 1 FROM clients WHERE id = $1', [clientId])).rows[0]) {
        throw new HttpError(404, 'Client not found.');
      }
      const created = await insertRow(t, 'notes', {
        client_id: projectId ? null : clientId, project_id: projectId, author_id: req.auth.user.id, body, client_visible: clientVisible
      });
      await audit(t, req, 'note.created', { entity: 'note', entityId: created.id, clientId: owner, projectId });
      return created;
    });
    res.status(201).json({ note: { ...note, author_name: req.auth.user.name } });
  }));

  r.patch('/notes/:id', h(async (req, res) => {
    const id = v.id(req.params.id);
    const data = {};
    if (Object.hasOwn(req.body || {}, 'pinned')) data.pinned = v.bool(req.body.pinned);
    if (Object.hasOwn(req.body || {}, 'client_visible')) data.client_visible = v.bool(req.body.client_visible);
    if (!Object.keys(data).length) throw new HttpError(400, 'Nothing to update.');
    const current = (await db.query(
      `SELECT n.client_id, n.project_id, COALESCE(n.client_id, p.client_id) AS owner_client_id
         FROM notes n LEFT JOIN projects p ON p.id = n.project_id WHERE n.id = $1`,
      [id]
    )).rows[0];
    if (!current) throw new HttpError(404, 'Note not found.');
    const { rows } = await db.query(
      'UPDATE notes SET pinned = COALESCE($2, pinned), client_visible = COALESCE($3, client_visible) WHERE id = $1 RETURNING *',
      [id, data.pinned ?? null, data.client_visible ?? null]
    );
    if (!rows[0]) throw new HttpError(404, 'Note not found.');
    if (Object.hasOwn(data, 'client_visible') && data.client_visible !== rows[0].client_visible) {
      await audit(db, req, 'note.visibility_changed', {
        entity: 'note', entityId: id, clientId: current.owner_client_id, projectId: current.project_id,
        meta: { visible: rows[0].client_visible }
      });
    }
    res.json({ note: rows[0] });
  }));

  r.delete('/notes/:id', h(async (req, res) => {
    const id = v.id(req.params.id);
    const { rows } = await db.query('DELETE FROM notes WHERE id = $1 RETURNING client_id, project_id', [id]);
    if (!rows[0]) throw new HttpError(404, 'Note not found.');
    await audit(db, req, 'note.deleted', { entity: 'note', entityId: id, clientId: rows[0].client_id, projectId: rows[0].project_id });
    res.json({ ok: true });
  }));

  // ---------------- leads ----------------
  r.get('/leads', h(async (req, res) => {
    const status = v.oneOf(req.query.status, 'status', LEAD_STATUS);
    const { rows } = await db.query(
      `SELECT l.id, l.name, l.email, l.company, l.message, l.language, l.source, l.status, l.client_id, l.created_at
         FROM leads l WHERE ($1::text IS NULL OR l.status = $1) ORDER BY l.created_at DESC, l.id DESC LIMIT 200`, [status]);
    res.json({ leads: rows });
  }));

  r.patch('/leads/:id', h(async (req, res) => {
    const id = v.id(req.params.id);
    const status = v.oneOf(req.body?.status, 'status', LEAD_STATUS.filter((s) => s !== 'converted'), { required: true });
    const { rows } = await db.query(
      `UPDATE leads SET status = $2, updated_at = now() WHERE id = $1 AND status <> 'converted' RETURNING *`, [id, status]);
    if (!rows[0]) throw new HttpError(404, 'Lead not found (or already converted).');
    await audit(db, req, 'lead.status_changed', { entity: 'lead', entityId: id, meta: { to: status } });
    res.json({ lead: rows[0] });
  }));

  r.post('/leads/:id/convert', h(async (req, res) => {
    const id = v.id(req.params.id);
    const result = await db.tx(async (t) => {
      const lead = (await t.query('SELECT * FROM leads WHERE id = $1 FOR UPDATE', [id])).rows[0];
      if (!lead) throw new HttpError(404, 'Lead not found.');
      if (lead.status === 'converted') throw new HttpError(409, 'This lead is already a client.');
      const client = await insertRow(t, 'clients', {
        company_name: lead.company || lead.name, email: lead.email, language: lead.language, status: 'prospect'
      });
      await insertRow(t, 'contacts', { client_id: client.id, name: lead.name, email: lead.email, is_primary: true });
      await insertRow(t, 'notes', { client_id: client.id, author_id: req.auth.user.id, body: `First message from the website:\n\n${lead.message}` });
      await t.query(`UPDATE leads SET status = 'converted', client_id = $2, updated_at = now() WHERE id = $1`, [id, client.id]);
      await audit(t, req, 'lead.converted', { entity: 'lead', entityId: id, clientId: client.id, meta: { name: lead.name } });
      return client;
    });
    res.status(201).json({ client: result });
  }));

  r.delete('/leads/:id', h(async (req, res) => {
    const id = v.id(req.params.id);
    const { rowCount } = await db.query('DELETE FROM leads WHERE id = $1', [id]);
    if (!rowCount) throw new HttpError(404, 'Lead not found.');
    await audit(db, req, 'lead.deleted', { entity: 'lead', entityId: id });
    res.json({ ok: true });
  }));

  return r;
}

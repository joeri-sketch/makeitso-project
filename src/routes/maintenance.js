import { Router } from 'express';
import { audit } from '../lib/audit.js';
import { HttpError, parse, v } from '../lib/validate.js';
import { asyncHandler as h } from '../middleware/security.js';
import { requireAdmin } from '../middleware/session.js';

const FREQUENCIES = ['monthly', 'quarterly', 'yearly'];
const planSchema = {
  project_id: (value) => v.id(value, 'project_id'),
  title: (value) => v.str(value, 'title', { required: true, min: 2, max: 160 }),
  description: (value) => v.str(value, 'description', { max: 2000 }) ?? '',
  frequency: (value) => v.oneOf(value, 'frequency', FREQUENCIES, { required: true }),
  next_due_date: (value) => v.date(value, 'next_due_date', { required: true }),
  reminder_days: (value) => v.int(value, 'reminder_days', { min: 0, max: 90, required: true })
};

export function maintenanceRoutes({ db }) {
  const r = Router();
  r.use(requireAdmin);

  r.get('/maintenance-plans', h(async (_req, res) => {
    const { rows } = await db.query(
      `SELECT mp.*, p.name AS project_name, p.client_id, c.company_name
         FROM maintenance_plans mp
         JOIN projects p ON p.id = mp.project_id
         JOIN clients c ON c.id = p.client_id
        ORDER BY mp.active DESC, mp.next_due_date, mp.id`
    );
    res.json({ plans: rows });
  }));

  r.post('/maintenance-plans', h(async (req, res) => {
    const data = parse(req.body, planSchema);
    const project = (await db.query(
      `SELECT p.id, p.client_id FROM projects p
        JOIN clients c ON c.id = p.client_id
       WHERE p.id = $1 AND p.archived_at IS NULL AND c.archived_at IS NULL`,
      [data.project_id]
    )).rows[0];
    if (!project) throw new HttpError(400, 'Choose an active project.', { field: 'project_id' });
    const { rows } = await db.query(
      `INSERT INTO maintenance_plans
         (project_id, title, description, frequency, next_due_date, anchor_day, anchor_month, reminder_days, created_by)
       VALUES ($1, $2, $3, $4, $5, EXTRACT(DAY FROM $5::date)::int, EXTRACT(MONTH FROM $5::date)::int, $6, $7)
       RETURNING *`,
      [data.project_id, data.title, data.description, data.frequency, data.next_due_date, data.reminder_days, req.auth.user.id]
    );
    await audit(db, req, 'maintenance_plan.created', {
      entity: 'maintenance_plan', entityId: rows[0].id, clientId: project.client_id, projectId: project.id,
      meta: { title: data.title, frequency: data.frequency }
    });
    res.status(201).json({ plan: rows[0] });
  }));

  r.patch('/maintenance-plans/:id', h(async (req, res) => {
    const id = v.id(req.params.id);
    const schema = {
      title: (value) => v.str(value, 'title', { required: true, min: 2, max: 160 }),
      description: (value) => v.str(value, 'description', { max: 2000 }) ?? '',
      frequency: (value) => v.oneOf(value, 'frequency', FREQUENCIES, { required: true }),
      next_due_date: (value) => v.date(value, 'next_due_date', { required: true }),
      reminder_days: (value) => v.int(value, 'reminder_days', { min: 0, max: 90, required: true }),
      active: (value) => {
        if (typeof value !== 'boolean') throw new HttpError(400, 'active must be a boolean.', { field: 'active' });
        return value;
      }
    };
    const fields = parse(req.body, schema, { partial: true });
    if (fields.next_due_date) {
      const [, month, day] = fields.next_due_date.split('-').map(Number);
      fields.anchor_day = day;
      fields.anchor_month = month;
    }
    const plan = await db.tx(async (t) => {
      const current = (await t.query(
        `SELECT mp.project_id, p.client_id FROM maintenance_plans mp
         JOIN projects p ON p.id = mp.project_id WHERE mp.id = $1 FOR UPDATE`,
        [id]
      )).rows[0];
      if (!current) throw new HttpError(404, 'Maintenance plan not found.');
      const keys = Object.keys(fields);
      if (!keys.length) throw new HttpError(400, 'Nothing to update.');
      const sets = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
      const updated = (await t.query(
        `UPDATE maintenance_plans SET ${sets}, updated_at = now() WHERE id = $1 RETURNING *`,
        [id, ...keys.map((key) => fields[key])]
      )).rows[0];
      await audit(t, req, 'maintenance_plan.updated', {
        entity: 'maintenance_plan', entityId: id, clientId: current.client_id, projectId: current.project_id,
        meta: { fields: keys }
      });
      return updated;
    });
    res.json({ plan });
  }));

  return r;
}

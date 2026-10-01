import { Router } from 'express';
import { audit } from '../lib/audit.js';
import { HttpError, parse, v } from '../lib/validate.js';
import { asyncHandler as h } from '../middleware/security.js';
import { requireAdmin } from '../middleware/session.js';

const quoteSchema = {
  client_id: (x) => v.id(x, 'client_id'),
  title: (x) => v.str(x, 'title', { required: true, max: 160 }),
  valid_until: (x) => v.date(x, 'valid_until'),
  introduction: (x) => v.str(x, 'introduction', { max: 2000 }) ?? '',
  terms: (x) => v.str(x, 'terms', { max: 4000 }) ?? ''
};

function lineItems(input) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 50) {
    throw new HttpError(400, 'Add between 1 and 50 quote items.', { field: 'items' });
  }
  return input.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new HttpError(400, `Quote item ${index + 1} must be an object.`, { field: 'items' });
    }
    const description = v.str(item.description, `items.${index}.description`, { required: true, max: 240 });
    const decimal = (value, name, { min, max, defaultValue }) => {
      if ((value === undefined || value === null || value === '') && defaultValue !== undefined) return defaultValue;
      if (typeof value !== 'number' && typeof value !== 'string') throw new HttpError(400, `${name} must be a number.`);
      const text = String(value);
      const n = Number(text);
      if (!/^\d+(?:\.\d{1,2})?$/.test(text) || !Number.isFinite(n) || n < min || n > max) {
        throw new HttpError(400, `${name} must be between ${min} and ${max}, with at most 2 decimal places.`, { field: 'items' });
      }
      return n;
    };
    return {
      description,
      quantity: decimal(item.quantity, `items.${index}.quantity`, { min: 0.01, max: 10000 }),
      unit_price: decimal(item.unit_price, `items.${index}.unit_price`, { min: 0, max: 1000000 }),
      vat_rate: decimal(item.vat_rate, `items.${index}.vat_rate`, { min: 0, max: 100, defaultValue: 21 }),
      sort_order: index
    };
  });
}

const totals = `COALESCE(SUM(ROUND(i.quantity * i.unit_price * 100)), 0)::bigint AS subtotal_cents,
                COALESCE(SUM(ROUND(i.quantity * i.unit_price * i.vat_rate)), 0)::bigint AS vat_cents,
                COALESCE(SUM(ROUND(i.quantity * i.unit_price * 100) + ROUND(i.quantity * i.unit_price * i.vat_rate)), 0)::bigint AS total_cents`;

function currentStatus(quote) {
  if (quote.status === 'sent' && quote.valid_until && quote.valid_until < new Date().toISOString().slice(0, 10)) return 'expired';
  return quote.status;
}

async function quoteRows(db, clientId = null) {
  const { rows } = await db.query(
    `SELECT q.*,
            CASE WHEN q.status = 'sent' AND q.valid_until < CURRENT_DATE THEN 'expired' ELSE q.status END AS display_status,
            c.company_name, ${totals}
       FROM quotes q JOIN clients c ON c.id = q.client_id
       LEFT JOIN quote_items i ON i.quote_id = q.id
      WHERE ($1::bigint IS NULL OR q.client_id = $1)
      GROUP BY q.id, c.company_name
      ORDER BY q.created_at DESC, q.id DESC`,
    [clientId]
  );
  return rows;
}

async function quoteDetail(db, id, clientId = null) {
  const { rows } = await db.query(
    `SELECT q.*, c.company_name, ${totals}
       FROM quotes q JOIN clients c ON c.id = q.client_id
       LEFT JOIN quote_items i ON i.quote_id = q.id
      WHERE q.id = $1 AND ($2::bigint IS NULL OR q.client_id = $2)
      GROUP BY q.id, c.company_name`,
    [id, clientId]
  );
  if (!rows[0]) throw new HttpError(404, 'Quote not found.');
  const quote = rows[0];
  quote.display_status = currentStatus(quote);
  quote.items = (await db.query('SELECT id, description, quantity, unit_price, vat_rate, sort_order FROM quote_items WHERE quote_id = $1 ORDER BY sort_order, id', [id])).rows;
  return quote;
}

export function quoteRoutes({ db }) {
  const r = Router();
  r.use(requireAdmin);

  r.get('/quotes', h(async (req, res) => {
    res.json({ quotes: await quoteRows(db) });
  }));

  r.get('/quotes/:id', h(async (req, res) => {
    res.json({ quote: await quoteDetail(db, v.id(req.params.id)) });
  }));

  r.post('/quotes', h(async (req, res) => {
    const data = parse(req.body, quoteSchema);
    const items = lineItems(req.body?.items);
    const quote = await db.tx(async (t) => {
      const client = (await t.query('SELECT id FROM clients WHERE id = $1 AND archived_at IS NULL', [data.client_id])).rows[0];
      if (!client) throw new HttpError(400, 'Choose an existing client.', { field: 'client_id' });
      const { rows } = await t.query(
        `INSERT INTO quotes (client_id, title, valid_until, introduction, terms, created_by)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [data.client_id, data.title, data.valid_until, data.introduction, data.terms, req.auth.user.id]
      );
      const created = rows[0];
      const number = `MIS-Q-${new Date(created.created_at).getUTCFullYear()}-${String(created.id).padStart(6, '0')}`;
      await t.query('UPDATE quotes SET quote_number = $2 WHERE id = $1', [created.id, number]);
      for (const item of items) {
        await t.query(
          'INSERT INTO quote_items (quote_id, description, quantity, unit_price, vat_rate, sort_order) VALUES ($1, $2, $3, $4, $5, $6)',
          [created.id, item.description, item.quantity, item.unit_price, item.vat_rate, item.sort_order]
        );
      }
      await audit(t, req, 'quote.created', { entity: 'quote', entityId: created.id, clientId: data.client_id, meta: { quote_number: number } });
      return created;
    });
    res.status(201).json({ quote: await quoteDetail(db, quote.id) });
  }));

  r.patch('/quotes/:id', h(async (req, res) => {
    const id = v.id(req.params.id);
    const fields = parse(req.body, quoteSchema, { partial: true });
    delete fields.client_id;
    const items = Object.hasOwn(req.body, 'items') ? lineItems(req.body.items) : null;
    const quote = await db.tx(async (t) => {
      const current = (await t.query('SELECT client_id, quote_number, status FROM quotes WHERE id = $1 FOR UPDATE', [id])).rows[0];
      if (!current) throw new HttpError(404, 'Quote not found.');
      if (current.status !== 'draft') throw new HttpError(409, 'Only draft quotes can be edited.');
      const keys = Object.keys(fields);
      if (!keys.length && !items) throw new HttpError(400, 'Nothing to update.');
      if (keys.length) {
        const sets = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
        await t.query(`UPDATE quotes SET ${sets}, updated_at = now() WHERE id = $1`, [id, ...keys.map((key) => fields[key])]);
      }
      if (items) {
        if (!keys.length) await t.query('UPDATE quotes SET updated_at = now() WHERE id = $1', [id]);
        await t.query('DELETE FROM quote_items WHERE quote_id = $1', [id]);
        for (const item of items) {
          await t.query(
            'INSERT INTO quote_items (quote_id, description, quantity, unit_price, vat_rate, sort_order) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, item.description, item.quantity, item.unit_price, item.vat_rate, item.sort_order]
          );
        }
      }
      await audit(t, req, 'quote.updated', {
        entity: 'quote', entityId: id, clientId: current.client_id,
        meta: { quote_number: current.quote_number, fields: [...keys, ...(items ? ['items'] : [])] }
      });
      return current;
    });
    res.json({ quote: await quoteDetail(db, id) });
  }));

  r.post('/quotes/:id/send', h(async (req, res) => {
    const id = v.id(req.params.id);
    const quote = await db.tx(async (t) => {
      const current = (await t.query('SELECT client_id, status, valid_until, quote_number FROM quotes WHERE id = $1 FOR UPDATE', [id])).rows[0];
      if (!current) throw new HttpError(404, 'Quote not found.');
      if (current.status !== 'draft') throw new HttpError(409, 'Only draft quotes can be sent.');
      if (current.valid_until && current.valid_until < new Date().toISOString().slice(0, 10)) throw new HttpError(400, 'The validity date has passed.');
      const count = (await t.query('SELECT count(*)::int AS count FROM quote_items WHERE quote_id = $1', [id])).rows[0].count;
      if (!count) throw new HttpError(400, 'Add at least one item before sending the quote.');
      const sent = (await t.query(`UPDATE quotes SET status = 'sent', sent_at = now(), updated_at = now() WHERE id = $1 RETURNING *`, [id])).rows[0];
      await audit(t, req, 'quote.sent', { entity: 'quote', entityId: id, clientId: current.client_id, meta: { quote_number: current.quote_number } });
      return sent;
    });
    res.json({ quote: await quoteDetail(db, quote.id) });
  }));

  return r;
}

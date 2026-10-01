import { Router } from 'express';
import { audit } from '../lib/audit.js';
import { invoicePdf } from '../lib/invoice-pdf.js';
import { HttpError, parse, v, vatNumber, companyNumber } from '../lib/validate.js';
import { asyncHandler as h } from '../middleware/security.js';
import { requireAdmin, requireSession } from '../middleware/session.js';

const profileSchema = {
  legal_name: (x) => v.str(x, 'legal_name', { required: true, max: 160 }),
  vat_number: (x) => vatNumber(x) ?? '',
  company_number: (x) => companyNumber(x) ?? '',
  address_line1: (x) => v.str(x, 'address_line1', { required: true, max: 160 }),
  address_line2: (x) => v.str(x, 'address_line2', { max: 160 }) ?? '',
  postal_code: (x) => v.str(x, 'postal_code', { required: true, max: 20 }),
  city: (x) => v.str(x, 'city', { required: true, max: 100 }),
  country: (x) => {
    const value = v.str(x, 'country', { required: true, max: 2 });
    if (!/^[A-Za-z]{2}$/.test(value)) throw new HttpError(400, 'Country must be a two-letter code.');
    return value.toUpperCase();
  },
  email: (x) => v.email(x, 'email') ?? '',
  phone: (x) => v.str(x, 'phone', { max: 40 }) ?? '',
  iban: (x) => v.str(x, 'iban', { max: 40 }) ?? '',
  payment_instructions: (x) => v.str(x, 'payment_instructions', { max: 1000 }) ?? '',
  default_payment_days: (x) => v.int(x, 'default_payment_days', { min: 0, max: 365, required: true })
};

const invoiceSchema = {
  client_id: (x) => v.id(x, 'client_id'),
  title: (x) => v.str(x, 'title', { required: true, max: 160 }),
  due_date: (x) => v.date(x, 'due_date'),
  notes: (x) => v.str(x, 'notes', { max: 4000 }) ?? ''
};

function amount(value) {
  if (typeof value !== 'number' && typeof value !== 'string') throw new HttpError(400, 'amount must be a number.');
  const text = String(value);
  const number = Number(text);
  if (!/^\d+(?:\.\d{1,2})?$/.test(text) || !Number.isFinite(number) || number < 0.01 || number > 10000000) {
    throw new HttpError(400, 'amount must be between 0.01 and 10000000, with at most 2 decimal places.');
  }
  return number;
}

function lineItems(input) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 50) {
    throw new HttpError(400, 'Add between 1 and 50 invoice items.', { field: 'items' });
  }
  return input.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new HttpError(400, `Invoice item ${index + 1} must be an object.`);
    const decimal = (value, name, min, max, defaultValue) => {
      if ((value === undefined || value === null || value === '') && defaultValue !== undefined) return defaultValue;
      if (typeof value !== 'number' && typeof value !== 'string') throw new HttpError(400, `${name} must be a number.`);
      const text = String(value);
      const number = Number(text);
      if (!/^\d+(?:\.\d{1,2})?$/.test(text) || !Number.isFinite(number) || number < min || number > max) {
        throw new HttpError(400, `${name} must be between ${min} and ${max}, with at most 2 decimal places.`);
      }
      return number;
    };
    return {
      description: v.str(item.description, `items.${index}.description`, { required: true, max: 240 }),
      quantity: decimal(item.quantity, `items.${index}.quantity`, 0.01, 10000),
      unit_price: decimal(item.unit_price, `items.${index}.unit_price`, 0, 1000000),
      vat_rate: decimal(item.vat_rate, `items.${index}.vat_rate`, 0, 100, 21),
      sort_order: index
    };
  });
}

const totals = `COALESCE(SUM(ROUND(i.quantity * i.unit_price * 100)), 0)::bigint AS subtotal_cents,
                COALESCE(SUM(ROUND(i.quantity * i.unit_price * i.vat_rate)), 0)::bigint AS vat_cents,
                COALESCE(SUM(ROUND(i.quantity * i.unit_price * 100) + ROUND(i.quantity * i.unit_price * i.vat_rate)), 0)::bigint AS total_cents,
                COALESCE((SELECT SUM(ROUND(p.amount * 100)) FROM invoice_payments p WHERE p.invoice_id = q.id), 0)::bigint AS paid_cents`;

async function invoiceDetail(db, id) {
  const { rows } = await db.query(
    `SELECT q.*, c.company_name, ${totals}
       FROM invoices q JOIN clients c ON c.id = q.client_id
       LEFT JOIN invoice_items i ON i.invoice_id = q.id
      WHERE q.id = $1
      GROUP BY q.id, c.company_name`,
    [id]
  );
  if (!rows[0]) throw new HttpError(404, 'Invoice not found.');
  const invoice = rows[0];
  invoice.items = (await db.query(
    'SELECT id, description, quantity, unit_price, vat_rate, sort_order FROM invoice_items WHERE invoice_id = $1 ORDER BY sort_order, id',
    [id]
  )).rows;
  invoice.payments = (await db.query(
    'SELECT id, amount, paid_on, reference, note, created_at FROM invoice_payments WHERE invoice_id = $1 ORDER BY paid_on, id',
    [id]
  )).rows;
  invoice.balance_cents = Math.max(0, Number(invoice.total_cents) - Number(invoice.paid_cents));
  invoice.display_status = invoice.status === 'void' ? 'void' :
    invoice.status === 'draft' ? 'draft' :
      invoice.balance_cents === 0 ? 'paid' :
        invoice.due_date < new Date().toISOString().slice(0, 10) ? 'overdue' : 'issued';
  return invoice;
}

async function replaceItems(db, invoiceId, items) {
  await db.query('DELETE FROM invoice_items WHERE invoice_id = $1', [invoiceId]);
  for (const item of items) {
    await db.query(
      'INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, vat_rate, sort_order) VALUES ($1, $2, $3, $4, $5, $6)',
      [invoiceId, item.description, item.quantity, item.unit_price, item.vat_rate, item.sort_order]
    );
  }
}

function clientSnapshot(client) {
  return {
    company_name: client.company_name,
    vat_number: client.vat_number || '',
    company_number: client.company_number || '',
    address_line1: client.address_line1 || '',
    address_line2: client.address_line2 || '',
    postal_code: client.postal_code || '',
    city: client.city || '',
    country: client.country || '',
    email: client.email || ''
  };
}

export function invoiceRoutes({ db }) {
  const r = Router();
  r.use(requireAdmin);

  r.get('/business-profile', h(async (req, res) => {
    const { rows } = await db.query('SELECT * FROM business_profile WHERE id = 1');
    res.json({ profile: rows[0] });
  }));

  r.put('/business-profile', h(async (req, res) => {
    const profile = parse(req.body, profileSchema);
    const { rows } = await db.query(
      `UPDATE business_profile SET legal_name=$1, vat_number=$2, company_number=$3,
       address_line1=$4, address_line2=$5, postal_code=$6, city=$7, country=$8, email=$9,
       phone=$10, iban=$11, payment_instructions=$12, default_payment_days=$13, updated_at=now()
       WHERE id=1 RETURNING *`,
      [profile.legal_name, profile.vat_number, profile.company_number, profile.address_line1, profile.address_line2,
        profile.postal_code, profile.city, profile.country, profile.email, profile.phone, profile.iban,
        profile.payment_instructions, profile.default_payment_days]
    );
    await audit(db, req, 'invoice.business_profile_updated', { entity: 'business_profile', entityId: 1 });
    res.json({ profile: rows[0] });
  }));

  r.get('/invoices', h(async (req, res) => {
    const { rows } = await db.query(
      `SELECT q.id, q.invoice_number, q.client_id, q.status, q.issue_date, q.due_date, q.title,
              c.company_name, ${totals}
         FROM invoices q JOIN clients c ON c.id = q.client_id
         LEFT JOIN invoice_items i ON i.invoice_id = q.id
        GROUP BY q.id, c.company_name ORDER BY q.created_at DESC, q.id DESC`
    );
    res.json({ invoices: rows.map((invoice) => ({
      ...invoice,
      balance_cents: Math.max(0, Number(invoice.total_cents) - Number(invoice.paid_cents)),
      display_status: invoice.status === 'void' ? 'void' : invoice.status === 'draft' ? 'draft' :
        Number(invoice.paid_cents) >= Number(invoice.total_cents) ? 'paid' :
          invoice.due_date < new Date().toISOString().slice(0, 10) ? 'overdue' : 'issued'
    })) });
  }));

  r.get('/invoices/:id', h(async (req, res) => {
    res.json({ invoice: await invoiceDetail(db, v.id(req.params.id)) });
  }));

  r.post('/invoices', h(async (req, res) => {
    const data = parse(req.body, invoiceSchema);
    const items = lineItems(req.body.items);
    const invoice = await db.tx(async (t) => {
      const client = (await t.query('SELECT * FROM clients WHERE id=$1 AND archived_at IS NULL', [data.client_id])).rows[0];
      if (!client) throw new HttpError(400, 'Choose an existing, active client.');
      const created = (await t.query(
        `INSERT INTO invoices (client_id, title, due_date, notes, created_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [data.client_id, data.title, data.due_date, data.notes, req.auth.user.id]
      )).rows[0];
      await replaceItems(t, created.id, items);
      await audit(t, req, 'invoice.draft_created', { entity: 'invoice', entityId: created.id, clientId: data.client_id });
      return created;
    });
    res.status(201).json({ invoice: await invoiceDetail(db, invoice.id) });
  }));

  r.post('/quotes/:id/invoice', h(async (req, res) => {
    const quoteId = v.id(req.params.id);
    const invoice = await db.tx(async (t) => {
      const quote = (await t.query(
        `SELECT q.id, q.client_id, q.title, q.status, q.introduction, q.terms
           FROM quotes q WHERE q.id = $1 FOR UPDATE`,
        [quoteId]
      )).rows[0];
      if (!quote) throw new HttpError(404, 'Quote not found.');
      if (quote.status !== 'accepted') throw new HttpError(409, 'Only accepted quotes can be converted to an invoice.');
      if ((await t.query('SELECT 1 FROM invoices WHERE quote_id=$1', [quoteId])).rows[0]) throw new HttpError(409, 'An invoice already exists for this quote.');
      const created = (await t.query(
        `INSERT INTO invoices (client_id, quote_id, title, notes, created_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [quote.client_id, quote.id, quote.title, [quote.introduction, quote.terms].filter(Boolean).join('\n\n'), req.auth.user.id]
      )).rows[0];
      const items = (await t.query(
        'SELECT description, quantity, unit_price, vat_rate, sort_order FROM quote_items WHERE quote_id=$1 ORDER BY sort_order, id',
        [quote.id]
      )).rows;
      if (!items.length) throw new HttpError(409, 'The accepted quote has no items.');
      await replaceItems(t, created.id, items);
      await audit(t, req, 'invoice.draft_created_from_quote', {
        entity: 'invoice', entityId: created.id, clientId: quote.client_id, meta: { quote_id: quote.id }
      });
      return created;
    });
    res.status(201).json({ invoice: await invoiceDetail(db, invoice.id) });
  }));

  r.patch('/invoices/:id', h(async (req, res) => {
    const id = v.id(req.params.id);
    const fields = parse(req.body, invoiceSchema, { partial: true });
    delete fields.client_id;
    const items = Object.hasOwn(req.body || {}, 'items') ? lineItems(req.body.items) : null;
    if (!Object.keys(fields).length && !items) throw new HttpError(400, 'Nothing to update.');
    await db.tx(async (t) => {
      const current = (await t.query('SELECT client_id, status FROM invoices WHERE id=$1 FOR UPDATE', [id])).rows[0];
      if (!current) throw new HttpError(404, 'Invoice not found.');
      if (current.status !== 'draft') throw new HttpError(409, 'Issued invoices cannot be edited.');
      if (Object.keys(fields).length) {
        const keys = Object.keys(fields);
        const set = keys.map((key, index) => `${key}=$${index + 2}`).join(', ');
        await t.query(`UPDATE invoices SET ${set}, updated_at=now() WHERE id=$1`, [id, ...keys.map((key) => fields[key])]);
      }

      if (items) await replaceItems(t, id, items);
      await audit(t, req, 'invoice.draft_updated', { entity: 'invoice', entityId: id, clientId: current.client_id });
    });
    res.json({ invoice: await invoiceDetail(db, id) });
  }));

  r.post('/invoices/:id/issue', h(async (req, res) => {
    const id = v.id(req.params.id);
    const invoice = await db.tx(async (t) => {
      const current = (await t.query(
        `SELECT q.*, c.company_name, c.vat_number, c.company_number, c.address_line1, c.address_line2,
                c.postal_code, c.city, c.country, c.email
           FROM invoices q JOIN clients c ON c.id=q.client_id WHERE q.id=$1 FOR UPDATE OF q`,
        [id]
      )).rows[0];
      if (!current) throw new HttpError(404, 'Invoice not found.');
      if (current.status !== 'draft') throw new HttpError(409, 'Only draft invoices can be issued.');
      const itemCount = Number((await t.query('SELECT count(*)::int AS count FROM invoice_items WHERE invoice_id=$1', [id])).rows[0].count);
      if (!itemCount) throw new HttpError(400, 'Add at least one invoice item before issuing.');
      const buyerSnapshot = clientSnapshot(current);
      const requiredBuyer = ['company_name', 'address_line1', 'postal_code', 'city', 'country'];
      if (requiredBuyer.some((key) => !buyerSnapshot[key]?.trim())) {
        throw new HttpError(400, 'Complete the client billing address in the client record before issuing this invoice.');
      }
      const seller = (await t.query('SELECT * FROM business_profile WHERE id=1')).rows[0];
      const requiredSeller = ['legal_name', 'address_line1', 'postal_code', 'city', 'country'];
      if (requiredSeller.some((key) => !seller[key]?.trim())) throw new HttpError(400, 'Complete your business details in Invoice settings before issuing an invoice.');
      const today = new Date().toISOString().slice(0, 10);
      const dueDate = current.due_date || new Date(Date.parse(`${today}T00:00:00Z`) + seller.default_payment_days * 86400000).toISOString().slice(0, 10);
      if (dueDate < today) throw new HttpError(400, 'The due date cannot be before the issue date.');
      const invoiceTotal = (await t.query(
        `SELECT COALESCE(SUM(ROUND(quantity * unit_price * 100) + ROUND(quantity * unit_price * vat_rate)), 0)::bigint AS total_cents
           FROM invoice_items WHERE invoice_id=$1`,
        [id]
      )).rows[0].total_cents;
      if (Number(invoiceTotal) <= 0) throw new HttpError(400, 'An invoice total must be greater than zero.');
      const year = Number(today.slice(0, 4));
      const counter = (await t.query(
        `INSERT INTO invoice_counters (year, last_number) VALUES ($1, 1)
         ON CONFLICT (year) DO UPDATE SET last_number=invoice_counters.last_number+1
         RETURNING last_number`,
        [year]
      )).rows[0];
      const number = `MIS-${year}-${String(counter.last_number).padStart(5, '0')}`;
      const sellerSnapshot = {
        legal_name: seller.legal_name, vat_number: seller.vat_number, company_number: seller.company_number,
        address_line1: seller.address_line1, address_line2: seller.address_line2,
        postal_code: seller.postal_code, city: seller.city, country: seller.country,
        email: seller.email, phone: seller.phone, iban: seller.iban, payment_instructions: seller.payment_instructions
      };
      const updated = (await t.query(
        `UPDATE invoices SET status='issued', invoice_number=$2, issue_date=$3, due_date=$4,
          seller_snapshot=$5::jsonb, client_snapshot=$6::jsonb, issued_at=now(), updated_at=now()
          WHERE id=$1 RETURNING *`,
        [id, number, today, dueDate, JSON.stringify(sellerSnapshot), JSON.stringify(buyerSnapshot)]
      )).rows[0];
      await audit(t, req, 'invoice.issued', { entity: 'invoice', entityId: id, clientId: current.client_id, meta: { invoice_number: number } });
      return updated;
    });
    res.json({ invoice: await invoiceDetail(db, invoice.id) });
  }));

  r.post('/invoices/:id/void', h(async (req, res) => {
    const id = v.id(req.params.id);
    const reason = v.str(req.body?.reason, 'reason', { required: true, max: 1000 });
    await db.tx(async (t) => {
      const invoice = (await t.query('SELECT client_id, status, invoice_number FROM invoices WHERE id=$1 FOR UPDATE', [id])).rows[0];
      if (!invoice) throw new HttpError(404, 'Invoice not found.');
      if (invoice.status !== 'issued') throw new HttpError(409, 'Only issued invoices can be voided.');
      const payment = (await t.query('SELECT 1 FROM invoice_payments WHERE invoice_id=$1 LIMIT 1', [id])).rows[0];
      if (payment) throw new HttpError(409, 'An invoice with recorded payments cannot be voided. Contact your accountant about a credit note.');
      await t.query(`UPDATE invoices SET status='void', voided_at=now(), void_reason=$2, updated_at=now() WHERE id=$1`, [id, reason]);
      await audit(t, req, 'invoice.voided', { entity: 'invoice', entityId: id, clientId: invoice.client_id, meta: { invoice_number: invoice.invoice_number, reason } });
    });
    res.json({ invoice: await invoiceDetail(db, id) });
  }));

  r.post('/invoices/:id/payments', h(async (req, res) => {
    const id = v.id(req.params.id);
    const paymentAmount = amount(req.body?.amount);
    const paidOn = v.date(req.body?.paid_on, 'paid_on', { required: true });
    const reference = v.str(req.body?.reference, 'reference', { max: 120 }) ?? '';
    const note = v.str(req.body?.note, 'note', { max: 1000 }) ?? '';
    await db.tx(async (t) => {
      const invoice = (await t.query('SELECT client_id, status, invoice_number FROM invoices WHERE id=$1 FOR UPDATE', [id])).rows[0];
      if (!invoice) throw new HttpError(404, 'Invoice not found.');
      if (invoice.status !== 'issued') throw new HttpError(409, 'Payments can only be recorded for issued invoices.');
      const totalsRow = (await t.query(
        `SELECT COALESCE(SUM(ROUND(i.quantity * i.unit_price * 100) + ROUND(i.quantity * i.unit_price * i.vat_rate)), 0)::bigint AS total_cents,
                COALESCE((SELECT SUM(ROUND(p.amount * 100)) FROM invoice_payments p WHERE p.invoice_id=$1), 0)::bigint AS paid_cents
           FROM invoice_items i WHERE i.invoice_id=$1`,
        [id]
      )).rows[0];
      const balance = Number(totalsRow.total_cents) - Number(totalsRow.paid_cents);
      if (Math.round(paymentAmount * 100) > balance) throw new HttpError(400, 'Payment exceeds the outstanding balance.');
      await t.query(
        `INSERT INTO invoice_payments (invoice_id, amount, paid_on, reference, note, recorded_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, paymentAmount, paidOn, reference, note, req.auth.user.id]
      );
      await audit(t, req, 'invoice.payment_recorded', {
        entity: 'invoice', entityId: id, clientId: invoice.client_id,
        meta: { invoice_number: invoice.invoice_number, amount: paymentAmount, paid_on: paidOn, reference }
      });
    });
    res.json({ invoice: await invoiceDetail(db, id) });
  }));

  r.get('/invoices/:id/pdf', h(async (req, res) => {
    const invoice = await invoiceDetail(db, v.id(req.params.id));
    if (invoice.status === 'draft') throw new HttpError(409, 'Issue this invoice before downloading its PDF.');
    const pdf = await invoicePdf(invoice);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`);
    res.setHeader('Content-Length', pdf.length);
    res.send(pdf);
  }));

  return r;
}

export function portalInvoiceRoutes({ db }) {
  const r = Router();
  r.use(requireSession, (req, res, next) => {
    if (req.auth.role !== 'client' || !req.auth.clientId) return next(new HttpError(403, 'Client portal access only.'));
    next();
  });

  r.get('/invoices', h(async (req, res) => {
    const { rows } = await db.query(
      `SELECT q.id, q.invoice_number, q.status, q.issue_date, q.due_date, q.title,
              COALESCE(SUM(ROUND(i.quantity * i.unit_price * 100) + ROUND(i.quantity * i.unit_price * i.vat_rate)), 0)::bigint AS total_cents,
              COALESCE((SELECT SUM(ROUND(p.amount * 100)) FROM invoice_payments p WHERE p.invoice_id=q.id), 0)::bigint AS paid_cents
         FROM invoices q LEFT JOIN invoice_items i ON i.invoice_id=q.id
        WHERE q.client_id=$1 AND q.status<>'draft'
        GROUP BY q.id ORDER BY q.issue_date DESC, q.id DESC`,
      [req.auth.clientId]
    );
    res.json({ invoices: rows.map((invoice) => ({
      ...invoice,
      balance_cents: Math.max(0, Number(invoice.total_cents) - Number(invoice.paid_cents)),
      display_status: invoice.status === 'void' ? 'void' :
        Number(invoice.paid_cents) >= Number(invoice.total_cents) ? 'paid' :
          invoice.due_date < new Date().toISOString().slice(0, 10) ? 'overdue' : 'issued'
    })) });
  }));

  r.get('/invoices/:id/pdf', h(async (req, res) => {
    const invoice = await invoiceDetail(db, v.id(req.params.id));
    if (Number(invoice.client_id) !== Number(req.auth.clientId) || invoice.status === 'draft') {
      throw new HttpError(404, 'Invoice not found.');
    }
    const pdf = await invoicePdf(invoice);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`);
    res.setHeader('Content-Length', pdf.length);
    res.send(pdf);
  }));
  return r;
}

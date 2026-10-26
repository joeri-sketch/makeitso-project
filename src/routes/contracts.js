import express, { Router } from 'express';
import { audit } from '../lib/audit.js';
import { hashIp } from '../lib/crypto.js';
import { HttpError, v } from '../lib/validate.js';
import { asyncHandler as h } from '../middleware/security.js';
import { requireAdmin, requireSession } from '../middleware/session.js';
import { generateContractPdf } from '../lib/contract-pdf.js';

const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;
const pdfBody = express.raw({ type: 'application/pdf', limit: MAX_DOCUMENT_SIZE });
const decodeHeader = (value, field) => {
  try {
    return decodeURIComponent(value || '');
  } catch {
    throw new HttpError(400, `${field} contains invalid encoding.`, { field });
  }
};
const cleanFileName = (name) => v.str(decodeHeader(name, 'file_name'), 'file_name', { max: 180 })?.replace(/[^\w.\- ()]/g, '_') || 'contract.pdf';

function assertPdf(req) {
  if (!Buffer.isBuffer(req.body) || req.body.length < 8 || !req.body.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
    throw new HttpError(400, 'Upload a valid PDF document.', { field: 'document' });
  }
}

async function latestVersion(db, contractId) {
  return (await db.query(
    `SELECT id, version, file_name, created_at FROM contract_versions
      WHERE contract_id = $1 ORDER BY version DESC LIMIT 1`,
    [contractId]
  )).rows[0] || null;
}

export function contractRoutes({ db }) {
  const admin = Router();
  admin.use(requireAdmin);

  admin.get('/', h(async (_req, res) => {
    const { rows } = await db.query(
      `SELECT c.*, cl.company_name, p.name AS project_name, cv.version, cv.file_name,
              cv.created_at AS version_created_at, du.name AS decision_by_name
         FROM client_contracts c
         JOIN clients cl ON cl.id = c.client_id
         LEFT JOIN projects p ON p.id = c.project_id
         LEFT JOIN LATERAL (
           SELECT version, file_name, created_at FROM contract_versions
            WHERE contract_id = c.id ORDER BY version DESC LIMIT 1
         ) cv ON TRUE
         LEFT JOIN users du ON du.id = c.decision_by
        ORDER BY c.updated_at DESC, c.id DESC`
    );
    res.json({ contracts: rows });
  }));

  admin.post('/', pdfBody, h(async (req, res) => {
    assertPdf(req);
    const clientId = v.id(req.get('x-client-id'), 'client_id');
    const projectId = req.get('x-project-id') ? v.id(req.get('x-project-id'), 'project_id') : null;
    const title = v.str(decodeHeader(req.get('x-contract-title'), 'title'), 'title', { required: true, min: 2, max: 160 });
    const fileName = cleanFileName(req.get('x-file-name'));
    const client = (await db.query('SELECT id FROM clients WHERE id = $1 AND archived_at IS NULL', [clientId])).rows[0];
    if (!client) throw new HttpError(400, 'Choose an active client.', { field: 'client_id' });
    if (projectId) {
      const project = (await db.query(
        'SELECT id FROM projects WHERE id = $1 AND client_id = $2 AND archived_at IS NULL',
        [projectId, clientId]
      )).rows[0];
      if (!project) throw new HttpError(400, 'Choose an active project belonging to this client.', { field: 'project_id' });
    }

    const contract = await db.tx(async (t) => {
      const created = (await t.query(
        `INSERT INTO client_contracts (client_id, project_id, title, created_by)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [clientId, projectId, title, req.auth.user.id]
      )).rows[0];
      await t.query(
        `INSERT INTO contract_versions (contract_id, version, file_name, document, uploaded_by)
         VALUES ($1, 1, $2, $3, $4)`,
        [created.id, fileName, req.body, req.auth.user.id]
      );
      await t.query(
        `INSERT INTO contract_events (contract_id, version, actor_id, event_type)
         VALUES ($1, 1, $2, 'created')`,
        [created.id, req.auth.user.id]
      );
      await audit(t, req, 'contract.created', {
        entity: 'client_contract', entityId: created.id, clientId, projectId, meta: { title }
      });
      return created;
    });
    res.status(201).json({ contract: { ...contract, version: 1, file_name: fileName } });
  }));

  admin.post('/generate', h(async (req, res) => {
    const clientId = v.id(req.body?.client_id, 'client_id');
    const projectId = v.id(req.body?.project_id, 'project_id');
    const quoteId = req.body?.quote_id ? v.id(req.body.quote_id, 'quote_id') : null;

    const client = (await db.query(
      `SELECT c.*,
              (SELECT json_build_object('name', ct.name, 'role', ct.role, 'email', ct.email)
                 FROM contacts ct
                WHERE ct.client_id = c.id AND ct.is_primary = TRUE
                ORDER BY ct.id LIMIT 1) AS primary_contact
         FROM clients c
        WHERE c.id = $1 AND c.archived_at IS NULL`,
      [clientId]
    )).rows[0];
    if (!client) throw new HttpError(400, 'Choose an active client.', { field: 'client_id' });
    if (!client.address_line1 || !client.postal_code || !client.city || !(client.company_number || client.vat_number) || !client.email) {
      throw new HttpError(400, 'Complete the client address, company or VAT number, and email in the client profile before generating a contract.', {
        field: 'client_id'
      });
    }

    const project = (await db.query(
      `SELECT id, name, category, description, next_step, target_date
         FROM projects
        WHERE id = $1 AND client_id = $2 AND archived_at IS NULL`,
      [projectId, clientId]
    )).rows[0];
    if (!project) throw new HttpError(400, 'Choose an active project belonging to this client.', { field: 'project_id' });

    let quote = null;
    if (quoteId) {
      quote = (await db.query(
        `SELECT q.id, q.quote_number, q.title, q.status, q.introduction, q.terms,
                COALESCE(SUM(ROUND(i.quantity * i.unit_price * 100)), 0)::bigint AS subtotal_cents,
                COALESCE(SUM(ROUND(i.quantity * i.unit_price * i.vat_rate)), 0)::bigint AS vat_cents
           FROM quotes q
           LEFT JOIN quote_items i ON i.quote_id = q.id
          WHERE q.id = $1 AND q.client_id = $2 AND q.status <> 'declined'
          GROUP BY q.id`,
        [quoteId, clientId]
      )).rows[0];
      if (!quote) throw new HttpError(400, 'Choose an active quote belonging to this client.', { field: 'quote_id' });
      quote.items = (await db.query(
        'SELECT description, quantity, unit_price, vat_rate FROM quote_items WHERE quote_id = $1 ORDER BY sort_order, id',
        [quoteId]
      )).rows;
      if (!quote.items.length) throw new HttpError(400, 'Add at least one item to the selected quote before generating a contract.', { field: 'quote_id' });
    } else if (!project.description.trim()) {
      throw new HttpError(400, 'Add a project description or select a quote to define the agreed scope.', { field: 'quote_id' });
    }

    const contact = client.primary_contact && (typeof client.primary_contact === 'string'
      ? JSON.parse(client.primary_contact)
      : client.primary_contact);
    const document = await generateContractPdf({ client, contact, project, quote });
    const title = v.str(req.body?.title, 'title', { max: 160 }) || `Samenwerking overeenkomst - ${project.name}`.slice(0, 160);
    const fileName = `samenwerking-overeenkomst-${project.id}.pdf`;

    const contract = await db.tx(async (t) => {
      const created = (await t.query(
        `INSERT INTO client_contracts (client_id, project_id, title, created_by)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [clientId, projectId, title, req.auth.user.id]
      )).rows[0];
      await t.query(
        `INSERT INTO contract_versions (contract_id, version, file_name, document, uploaded_by)
         VALUES ($1, 1, $2, $3, $4)`,
        [created.id, fileName, document, req.auth.user.id]
      );
      await t.query(
        `INSERT INTO contract_events (contract_id, version, actor_id, event_type)
         VALUES ($1, 1, $2, 'created')`,
        [created.id, req.auth.user.id]
      );
      await audit(t, req, 'contract.created', {
        entity: 'client_contract', entityId: created.id, clientId, projectId,
        meta: { title, generated: true, quoteId }
      });
      return created;
    });
    res.status(201).json({ contract: { ...contract, version: 1, file_name: fileName } });
  }));

  admin.get('/:id/document', h(async (req, res) => {
    const id = v.id(req.params.id);
    const version = (await db.query(
      `SELECT version, file_name, document FROM contract_versions
        WHERE contract_id = $1 ORDER BY version DESC LIMIT 1`,
      [id]
    )).rows[0];
    if (!version) throw new HttpError(404, 'Contract document not found.');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${version.file_name}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Length', version.document.length);
    res.end(version.document);
  }));

  admin.post('/:id/versions', pdfBody, h(async (req, res) => {
    assertPdf(req);
    const id = v.id(req.params.id);
    const fileName = cleanFileName(req.get('x-file-name'));
    const result = await db.tx(async (t) => {
      const contract = (await t.query(
        'SELECT client_id, project_id, status FROM client_contracts WHERE id = $1 FOR UPDATE',
        [id]
      )).rows[0];
      if (!contract) throw new HttpError(404, 'Contract not found.');
      if (!['draft', 'changes_requested'].includes(contract.status)) {
        throw new HttpError(409, 'A new version can only be uploaded for a draft or a contract returned for changes.');
      }
      const previous = (await t.query(
        'SELECT COALESCE(MAX(version), 0)::int AS version FROM contract_versions WHERE contract_id = $1',
        [id]
      )).rows[0].version;
      const version = previous + 1;
      await t.query(
        `INSERT INTO contract_versions (contract_id, version, file_name, document, uploaded_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, version, fileName, req.body, req.auth.user.id]
      );
      await t.query(
        `UPDATE client_contracts SET status = 'draft', decision_at = NULL, decision_by = NULL,
                decision_version = NULL, decision_note = '', updated_at = now()
          WHERE id = $1`,
        [id]
      );
      await t.query(
        `INSERT INTO contract_events (contract_id, version, actor_id, event_type)
         VALUES ($1, $2, $3, 'version_uploaded')`,
        [id, version, req.auth.user.id]
      );
      await audit(t, req, 'contract.version_uploaded', {
        entity: 'client_contract', entityId: id, clientId: contract.client_id,
        projectId: contract.project_id, meta: { version }
      });
      return { version, file_name: fileName };
    });
    res.status(201).json({ version: result });
  }));

  admin.post('/:id/send', h(async (req, res) => {
    const id = v.id(req.params.id);
    const contract = await db.tx(async (t) => {
      const current = (await t.query(
        `SELECT c.client_id, c.project_id, c.status, cv.version
           FROM client_contracts c
           JOIN LATERAL (SELECT version FROM contract_versions WHERE contract_id = c.id ORDER BY version DESC LIMIT 1) cv ON TRUE
          WHERE c.id = $1 FOR UPDATE`,
        [id]
      )).rows[0];
      if (!current) throw new HttpError(404, 'Contract not found.');
      if (!['draft', 'changes_requested'].includes(current.status)) throw new HttpError(409, 'This contract cannot be shared in its current state.');
      await t.query(
        `UPDATE client_contracts SET status = 'sent', sent_at = now(), decision_at = NULL,
                decision_by = NULL, decision_version = NULL, decision_note = '', updated_at = now()
          WHERE id = $1`,
        [id]
      );
      await t.query(
        `INSERT INTO contract_events (contract_id, version, actor_id, event_type)
         VALUES ($1, $2, $3, 'shared')`,
        [id, current.version, req.auth.user.id]
      );
      await audit(t, req, 'contract.shared', {
        entity: 'client_contract', entityId: id, clientId: current.client_id,
        projectId: current.project_id, meta: { version: current.version }
      });
      return { id, status: 'sent', version: current.version };
    });
    res.json({ contract });
  }));

  admin.post('/:id/withdraw', h(async (req, res) => {
    const id = v.id(req.params.id);
    const contract = await db.tx(async (t) => {
      const current = (await t.query(
        'SELECT client_id, project_id, status FROM client_contracts WHERE id = $1 FOR UPDATE',
        [id]
      )).rows[0];
      if (!current) throw new HttpError(404, 'Contract not found.');
      if (!['sent', 'changes_requested'].includes(current.status)) throw new HttpError(409, 'Only shared contracts can be withdrawn.');
      await t.query(`UPDATE client_contracts SET status = 'withdrawn', updated_at = now() WHERE id = $1`, [id]);
      const version = (await latestVersion(t, id))?.version || null;
      await t.query(
        `INSERT INTO contract_events (contract_id, version, actor_id, event_type)
         VALUES ($1, $2, $3, 'withdrawn')`,
        [id, version, req.auth.user.id]
      );
      await audit(t, req, 'contract.withdrawn', {
        entity: 'client_contract', entityId: id, clientId: current.client_id, projectId: current.project_id
      });
      return { id, status: 'withdrawn' };
    });
    res.json({ contract });
  }));

  const client = Router();
  client.use(requireSession, (req, res, next) => {
    if (!req.auth || req.auth.role !== 'client' || !req.auth.clientId) return next(new HttpError(403, 'Client portal access only.'));
    next();
  });

  client.get('/', h(async (req, res) => {
    const { rows } = await db.query(
      `SELECT c.id, c.title, c.status, c.project_id, p.name AS project_name,
              c.sent_at, c.decision_at, c.decision_version, c.decision_note,
              cv.version, cv.file_name
         FROM client_contracts c
         LEFT JOIN projects p ON p.id = c.project_id
         JOIN LATERAL (
           SELECT version, file_name FROM contract_versions
            WHERE contract_id = c.id ORDER BY version DESC LIMIT 1
         ) cv ON TRUE
        WHERE c.client_id = $1 AND c.status <> 'draft'
        ORDER BY c.updated_at DESC, c.id DESC`,
      [req.auth.clientId]
    );
    res.json({ contracts: rows });
  }));

  client.get('/:id/document', h(async (req, res) => {
    const id = v.id(req.params.id);
    const version = (await db.query(
      `SELECT cv.version, cv.file_name, cv.document
         FROM contract_versions cv
         JOIN client_contracts c ON c.id = cv.contract_id
        WHERE c.id = $1 AND c.client_id = $2 AND c.status <> 'draft'
        ORDER BY cv.version DESC LIMIT 1`,
      [id, req.auth.clientId]
    )).rows[0];
    if (!version) throw new HttpError(404, 'Contract document not found.');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${version.file_name}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Length', version.document.length);
    res.end(version.document);
  }));

  client.post('/:id/respond', h(async (req, res) => {
    const id = v.id(req.params.id);
    const decision = v.oneOf(req.body?.decision, 'decision', ['approved', 'changes_requested'], { required: true });
    const note = v.str(req.body?.note, 'note', { max: 1000 }) ?? '';
    if (decision === 'changes_requested' && !note.trim()) throw new HttpError(400, 'Add a note describing the requested changes.', { field: 'note' });
    const updated = await db.tx(async (t) => {
      const current = (await t.query(
        `SELECT c.client_id, c.project_id, c.status, cv.version
           FROM client_contracts c
           JOIN LATERAL (SELECT version FROM contract_versions WHERE contract_id = c.id ORDER BY version DESC LIMIT 1) cv ON TRUE
          WHERE c.id = $1 AND c.client_id = $2 FOR UPDATE`,
        [id, req.auth.clientId]
      )).rows[0];
      if (!current) throw new HttpError(404, 'Contract not found.');
      if (current.status !== 'sent') throw new HttpError(409, 'This contract is no longer awaiting a response.');
      await t.query(
        `UPDATE client_contracts SET status = $2, decision_at = now(), decision_by = $3,
                decision_version = $4, decision_note = $5, updated_at = now()
          WHERE id = $1`,
        [id, decision, req.auth.user.id, current.version, note]
      );
      await t.query(
        `INSERT INTO contract_events (contract_id, version, actor_id, event_type, note)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, current.version, req.auth.user.id, decision, note]
      );
      await audit(t, req, `contract.${decision}`, {
        entity: 'client_contract', entityId: id, clientId: req.auth.clientId,
        projectId: current.project_id, meta: { version: current.version, note, ip_hash: hashIp(req.ip) }
      });
      return { id, status: decision, decision_at: new Date().toISOString(), decision_version: current.version, decision_note: note };
    });
    res.json({ contract: updated });
  }));

  return { admin, client };
}

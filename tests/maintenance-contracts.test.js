import test from 'node:test';
import assert from 'node:assert/strict';
import { Client, signedInAdmin, startTestServer } from './helpers.js';
import { nextDueDate, processDueMaintenancePlans } from '../src/services/maintenance-scheduler.js';

const pdf = Buffer.from('%PDF-1.7\nMake It So test document');

test('maintenance recurrence preserves the original calendar day', () => {
  assert.equal(nextDueDate('2000-01-31', 'monthly', 31, 1), '2000-02-29');
  assert.equal(nextDueDate('2000-02-29', 'monthly', 31, 1), '2000-03-31');
  assert.equal(nextDueDate('2024-02-29', 'yearly', 29, 2), '2025-02-28');
  assert.equal(nextDueDate('2025-02-28', 'yearly', 29, 2), '2026-02-28');
});

async function uploadPdf(client, path, { fileName = 'agreement.pdf', title, clientId, projectId, content = pdf } = {}) {
  const cookie = [...client.jar].map(([name, value]) => `${name}=${value}`).join('; ');
  const response = await fetch(`${client.base}/api${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/pdf',
      'X-Requested-With': 'makeitso',
      ...(cookie ? { cookie } : {}),
      'X-File-Name': encodeURIComponent(fileName),
      ...(title ? { 'X-Contract-Title': encodeURIComponent(title) } : {}),
      ...(clientId ? { 'X-Client-Id': String(clientId) } : {}),
      ...(projectId ? { 'X-Project-Id': String(projectId) } : {})
    },
    body: content
  });
  return { status: response.status, headers: response.headers, body: Buffer.from(await response.arrayBuffer()) };
}

async function downloadPdf(client, path) {
  const cookie = [...client.jar].map(([name, value]) => `${name}=${value}`).join('; ');
  const response = await fetch(`${client.base}${path}`, {
    headers: { 'X-Requested-With': 'makeitso', ...(cookie ? { cookie } : {}) }
  });
  return { status: response.status, headers: response.headers, body: Buffer.from(await response.arrayBuffer()) };
}

function extractPdfText(pdf) {
  const encodedStrings = pdf.toString('latin1').matchAll(/<([0-9a-f]+)>/gi);
  return [...encodedStrings]
    .map(([, encoded]) => Buffer.from(encoded, 'hex').toString('latin1'))
    .join('');
}

test('dashboard shows project, support, sales and invoice attention counts', async (t) => {
  const ctx = await startTestServer();
  t.after(() => ctx.close());
  const { client: admin } = await signedInAdmin(ctx);
  const client = (await admin.post('/api/clients', { company_name: 'Dashboard Studio' })).json.client;
  const project = (await admin.post('/api/projects', { client_id: client.id, name: 'Dashboard site' })).json.project;
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  await ctx.db.query('INSERT INTO milestones (project_id, title, due_date) VALUES ($1, $2, $3)', [project.id, 'Late review', yesterday]);
  await ctx.db.query("INSERT INTO work_items (project_id, title, status) VALUES ($1, 'Blocked task', 'blocked')", [project.id]);
  await ctx.db.query("INSERT INTO support_tickets (client_id, subject) VALUES ($1, 'Needs an answer')", [client.id]);
  await ctx.db.query(
    "INSERT INTO leads (name, email, message, language, source, status) VALUES ('Taylor', 'taylor@example.com', 'Please contact me', 'en', 'website', 'new')"
  );
  const invoice = (await ctx.db.query(
    `INSERT INTO invoices (client_id, status, issue_date, due_date, title)
     VALUES ($1, 'issued', CURRENT_DATE, CURRENT_DATE, 'Unpaid invoice') RETURNING id`,
    [client.id]
  )).rows[0];
  await ctx.db.query(
    'INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, vat_rate) VALUES ($1, $2, 1, 100, 21)',
    [invoice.id, 'Design work']
  );
  const dueSoon = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
  await admin.post('/api/maintenance-plans', {
    project_id: project.id, title: 'Monthly care', description: '', frequency: 'monthly',
    next_due_date: dueSoon, reminder_days: 7
  });

  const dashboard = await admin.get('/api/dashboard');
  assert.equal(dashboard.status, 200);
  assert.equal(dashboard.json.counts.overdue_milestones, 1);
  assert.equal(dashboard.json.counts.blocked_work_items, 1);
  assert.equal(dashboard.json.counts.open_tickets, 1);
  assert.equal(dashboard.json.counts.new_leads, 1);
  assert.equal(dashboard.json.counts.unpaid_invoices, 1);
  assert.equal(dashboard.json.maintenance_reminders.length, 1);
});

test('maintenance plans validate, pause, and generate due tasks idempotently', async (t) => {
  const ctx = await startTestServer();
  t.after(() => ctx.close());
  const { client: admin } = await signedInAdmin(ctx);
  const client = (await admin.post('/api/clients', { company_name: 'Recurring Studio' })).json.client;
  const project = (await admin.post('/api/projects', { client_id: client.id, name: 'Care plan project' })).json.project;
  const invalid = await admin.post('/api/maintenance-plans', {
    project_id: project.id, title: 'Invalid plan', frequency: 'weekly',
    next_due_date: '2020-01-01', reminder_days: 7
  });
  assert.equal(invalid.status, 400);

  const created = await admin.post('/api/maintenance-plans', {
    project_id: project.id, title: 'Monthly security review', description: 'Check dependencies',
    frequency: 'monthly', next_due_date: '2000-01-31', reminder_days: 7
  });
  assert.equal(created.status, 201);
  const planId = created.json.plan.id;

  assert.equal(await processDueMaintenancePlans(ctx.db), 1);
  assert.equal(await processDueMaintenancePlans(ctx.db), 0);
  const generated = await ctx.db.query(
    'SELECT id, title, due_date, maintenance_plan_id FROM work_items WHERE maintenance_plan_id = $1',
    [planId]
  );
  assert.equal(generated.rows.length, 1);
  assert.equal(generated.rows[0].title, 'Monthly security review');
  assert.equal(String(generated.rows[0].due_date).slice(0, 10), '2000-01-31');

  const updated = await admin.patch(`/api/maintenance-plans/${planId}`, { active: false });
  assert.equal(updated.status, 200);
  assert.equal(updated.json.plan.active, false);
  assert.equal((await admin.get('/api/maintenance-plans')).json.plans.length, 1);
});

test('client contracts support private PDF review, versioning, decisions and audit records', async (t) => {
  const ctx = await startTestServer();
  t.after(() => ctx.close());
  const { client: admin } = await signedInAdmin(ctx);
  const client = (await admin.post('/api/clients', {
    company_name: 'Contract Client',
    contact: { name: 'Casey Client', email: 'casey@example.com', is_primary: true }
  })).json.client;
  const project = (await admin.post('/api/projects', { client_id: client.id, name: 'Contract project' })).json.project;
  const invite = await admin.post(`/api/clients/${client.id}/invitations`, { email: 'casey@example.com' });
  const token = new URL(invite.json.invitation_url).searchParams.get('invite');
  const clientPortal = new Client(ctx.base);
  const accepted = await clientPortal.post('/api/portal/invitations/accept', {
    token, password: 'client-long-password'
  });
  assert.equal(accepted.status, 201);
  assert.equal((await clientPortal.get('/api/contracts')).status, 403);

  const badPdf = await uploadPdf(admin, '/contracts', {
    title: 'Service agreement', clientId: client.id, content: Buffer.from('not a PDF document')
  });
  assert.equal(badPdf.status, 400);
  const uploaded = await uploadPdf(admin, '/contracts', {
    fileName: 'service agreement.pdf', title: 'Service agreement', clientId: client.id, projectId: project.id
  });
  assert.equal(uploaded.status, 201);
  const contract = JSON.parse(uploaded.body.toString());
  assert.equal(contract.contract.status, 'draft');
  assert.equal((await clientPortal.get('/api/portal/contracts')).json.contracts.length, 0);
  assert.equal((await downloadPdf(clientPortal, `/api/portal/contracts/${contract.contract.id}/document`)).status, 404);

  assert.equal((await admin.post(`/api/contracts/${contract.contract.id}/send`)).status, 200);
  const visible = await clientPortal.get('/api/portal/contracts');
  assert.equal(visible.status, 200);
  assert.equal(visible.json.contracts[0].status, 'sent');
  const document = await downloadPdf(clientPortal, `/api/portal/contracts/${contract.contract.id}/document`);
  assert.equal(document.status, 200);
  assert.equal(document.headers.get('content-type'), 'application/pdf');
  assert.deepEqual(document.body.subarray(0, 5), Buffer.from('%PDF-'));

  const missingNote = await clientPortal.post(`/api/portal/contracts/${contract.contract.id}/respond`, {
    decision: 'changes_requested'
  });
  assert.equal(missingNote.status, 400);
  const changes = await clientPortal.post(`/api/portal/contracts/${contract.contract.id}/respond`, {
    decision: 'changes_requested', note: 'Please update the delivery date.'
  });
  assert.equal(changes.status, 200);
  assert.equal(changes.json.contract.status, 'changes_requested');

  const revision = await uploadPdf(admin, `/contracts/${contract.contract.id}/versions`, {
    fileName: 'service agreement v2.pdf', content: Buffer.from('%PDF-1.7\nrevision')
  });
  assert.equal(revision.status, 201);
  assert.equal(JSON.parse(revision.body.toString()).version.version, 2);
  assert.equal((await admin.post(`/api/contracts/${contract.contract.id}/send`)).status, 200);
  const approved = await clientPortal.post(`/api/portal/contracts/${contract.contract.id}/respond`, { decision: 'approved' });
  assert.equal(approved.status, 200);
  assert.equal(approved.json.contract.status, 'approved');
  assert.equal(approved.json.contract.decision_version, 2);
  assert.equal((await clientPortal.post(`/api/portal/contracts/${contract.contract.id}/respond`, { decision: 'approved' })).status, 409);

  const stored = await admin.get('/api/contracts');
  assert.equal(stored.json.contracts[0].status, 'approved');
  assert.equal(stored.json.contracts[0].decision_version, 2);
  const events = await ctx.db.query(
    'SELECT event_type, version FROM contract_events WHERE contract_id = $1 ORDER BY id',
    [contract.contract.id]
  );
  assert.deepEqual(events.rows.map((event) => event.event_type), ['created', 'shared', 'changes_requested', 'version_uploaded', 'shared', 'approved']);
  assert.equal(events.rows.at(-1).version, 2);
});

test('generated contracts use verified client, project, and quote data', async (t) => {
  const ctx = await startTestServer();
  t.after(() => ctx.close());
  const { client: admin } = await signedInAdmin(ctx);
  const unauthenticated = new Client(ctx.base);
  assert.equal((await unauthenticated.post('/api/contracts/generate', {})).status, 401);

  const client = (await admin.post('/api/clients', {
    company_name: 'Northstar Studio BV',
    legal_form: 'BV',
    company_number: '0123456749',
    email: 'office@northstar.example',
    address_line1: 'Ruimtevaartlaan 12',
    postal_code: '9000',
    city: 'Gent',
    country: 'BE',
    contact: { name: 'Alex Morgan', email: 'alex@northstar.example', role: 'Zaakvoerder', is_primary: true }
  })).json.client;
  const incomplete = (await admin.post('/api/clients', { company_name: 'Incomplete Client' })).json.client;
  const project = (await admin.post('/api/projects', {
    client_id: client.id,
    name: 'Northstar website',
    category: 'Website',
    description: 'Design and development of a responsive company website.',
    target_date: '2027-02-01'
  })).json.project;
  const emptyProject = (await admin.post('/api/projects', {
    client_id: client.id, name: 'Unspecified work'
  })).json.project;
  const unrelated = (await admin.post('/api/clients', {
    company_name: 'Luna Records',
    company_number: '1030043889',
    email: 'office@luna.example',
    address_line1: 'Moonstraat 5',
    postal_code: '2000',
    city: 'Antwerpen'
  })).json.client;
  const unrelatedProject = (await admin.post('/api/projects', {
    client_id: unrelated.id, name: 'Luna website', description: 'Website redesign.'
  })).json.project;

  assert.equal((await admin.post('/api/contracts/generate', {
    client_id: incomplete.id, project_id: project.id
  })).status, 400);
  assert.equal((await admin.post('/api/contracts/generate', {
    client_id: client.id, project_id: emptyProject.id
  })).status, 400);
  assert.equal((await admin.post('/api/contracts/generate', {
    client_id: client.id, project_id: unrelatedProject.id
  })).status, 400);

  const quoteResponse = await admin.post('/api/quotes', {
    client_id: client.id,
    title: 'Website design and development',
    introduction: 'A complete responsive website.',
    terms: '50% advance payment; balance after delivery.',
    items: [{ description: 'Design and development', quantity: 1, unit_price: 2000, vat_rate: 21 }]
  });
  assert.equal(quoteResponse.status, 201);
  const quote = quoteResponse.json.quote;
  await ctx.db.query("UPDATE quotes SET status = 'accepted' WHERE id = $1", [quote.id]);

  const wrongClientQuote = await admin.post('/api/contracts/generate', {
    client_id: unrelated.id, project_id: unrelatedProject.id, quote_id: quote.id
  });
  assert.equal(wrongClientQuote.status, 400);

  const generated = await admin.post('/api/contracts/generate', {
    client_id: client.id, project_id: project.id, quote_id: quote.id
  });
  assert.equal(generated.status, 201);
  assert.equal(generated.json.contract.status, 'draft');
  assert.equal(generated.json.contract.client_id, client.id);
  assert.equal(generated.json.contract.project_id, project.id);
  assert.equal(generated.json.contract.title, 'Samenwerking overeenkomst - Northstar website');

  const download = await downloadPdf(admin, `/api/contracts/${generated.json.contract.id}/document`);
  assert.equal(download.status, 200);
  assert.equal(download.headers.get('content-type'), 'application/pdf');
  assert.deepEqual(download.body.subarray(0, 5), Buffer.from('%PDF-'));
  const pdf = extractPdfText(download.body);
  assert.match(pdf, /SAMENWERKING OVEREENKOMST/);
  assert.match(pdf, /MAKE IT SO BV/);
  assert.match(pdf, /BE1030043889/);
  assert.match(pdf, /Stichelendries 47A/);
  assert.match(pdf, /Northstar Studio BV/);
  assert.match(pdf, /0123\.456\.749/);
  assert.match(pdf, /alex@northstar\.example/);
  assert.match(pdf, /Northstar website/);
  assert.match(pdf, /Website design and development/);
  assert.match(pdf, /50,00/);
  assert.match(pdf, /AI/);

  const events = await ctx.db.query(
    'SELECT action, meta FROM activity_log WHERE entity = $1 AND entity_id = $2',
    ['client_contract', generated.json.contract.id]
  );
  assert.equal(events.rows.length, 1);
  assert.equal(events.rows[0].action, 'contract.created');
  assert.equal(events.rows[0].meta.generated, true);
  assert.equal(events.rows[0].meta.quoteId, quote.id);
});

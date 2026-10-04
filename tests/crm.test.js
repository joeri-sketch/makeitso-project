import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client, signedInAdmin, startTestServer } from './helpers.js';

// 0123456749 is a structurally valid Belgian enterprise number (97 - (01234567 mod 97) = 49)
const VALID_VAT = 'BE0123.456.749';

describe('CRM: clients, contacts, projects, milestones, notes', () => {
  let ctx, api;
  before(async () => { ctx = await startTestServer(); ({ client: api } = await signedInAdmin(ctx)); });
  after(async () => { await ctx.close(); });

  it('creates a client with a valid Belgian VAT number and normalises it', async () => {
    const res = await api.post('/api/clients', {
      company_name: 'Northstar BV', vat_number: VALID_VAT, company_number: '0123.456.749', email: 'HELLO@Northstar.be',
      language: 'nl', city: 'Gent', contact: { name: 'Alex Morgan', email: 'alex@northstar.be', role: 'Owner' }
    });
    assert.equal(res.status, 201);
    assert.equal(res.json.client.vat_number, 'BE0123456749');
    assert.equal(res.json.client.company_number, '0123.456.749');
    assert.equal(res.json.client.email, 'hello@northstar.be');
    const detail = await api.get(`/api/clients/${res.json.client.id}`);
    assert.equal(detail.json.contacts.length, 1);
    assert.equal(detail.json.contacts[0].is_primary, true);
  });

  it('rejects invalid VAT numbers, bad emails and unknown fields safely', async () => {
    const vat = await api.post('/api/clients', { company_name: 'X', vat_number: 'BE0123456789' });
    assert.equal(vat.status, 400);
    assert.equal(vat.json.field, 'vat_number');
    assert.equal((await api.post('/api/clients', { company_name: 'X', email: 'not-an-email' })).status, 400);
    assert.equal((await api.post('/api/clients', { company_name: '' })).status, 400);
    const sneaky = await api.post('/api/clients', { company_name: 'Sneaky BV', id: 999, archived_at: '2020-01-01' });
    assert.equal(sneaky.status, 201);
    assert.notEqual(sneaky.json.client.id, 999);
    assert.equal(sneaky.json.client.archived_at, null);
  });

  it('is safe against SQL injection in search and text fields', async () => {
    const evil = "'; DROP TABLE clients; --";
    assert.equal((await api.post('/api/clients', { company_name: evil })).status, 201);
    const found = await api.get(`/api/clients?q=${encodeURIComponent("%' OR 1=1 --")}`);
    assert.equal(found.status, 200);
    assert.equal(found.json.clients.length, 0);
    assert.ok((await api.get('/api/clients')).json.clients.length >= 2);
  });

  it('searches, filters and archives clients', async () => {
    const created = (await api.post('/api/clients', { company_name: 'Luna Records', status: 'prospect', city: 'Antwerpen' })).json.client;
    assert.equal((await api.get('/api/clients?q=luna')).json.clients.length, 1);
    assert.equal((await api.get('/api/clients?q=antwerp')).json.clients.length, 1);
    assert.equal((await api.get('/api/clients?status=prospect')).json.clients.some((c) => c.id === created.id), true);
    await api.post(`/api/clients/${created.id}/archive`);
    assert.equal((await api.get('/api/clients?q=luna')).json.clients.length, 0);
    assert.equal((await api.get('/api/clients?q=luna&archived=true')).json.clients.length, 1);
    await api.post(`/api/clients/${created.id}/restore`);
    assert.equal((await api.get('/api/clients?q=luna')).json.clients.length, 1);
  });

  it('keeps exactly one primary contact per client', async () => {
    const client = (await api.post('/api/clients', { company_name: 'Orbit Fitness' })).json.client;
    const a = (await api.post(`/api/clients/${client.id}/contacts`, { name: 'Sam', is_primary: true })).json.contact;
    const b = (await api.post(`/api/clients/${client.id}/contacts`, { name: 'Lou', is_primary: true })).json.contact;
    const detail = (await api.get(`/api/clients/${client.id}`)).json;
    assert.equal(detail.contacts.filter((c) => c.is_primary).length, 1);
    assert.equal(detail.contacts.find((c) => c.is_primary).id, b.id);
    await api.patch(`/api/contacts/${a.id}`, { is_primary: true });
    assert.equal((await api.get(`/api/clients/${client.id}`)).json.contacts.find((c) => c.is_primary).id, a.id);
    assert.equal((await api.del(`/api/contacts/${b.id}`)).status, 200);
  });

  it('manages projects and logs status changes', async () => {
    const client = (await api.post('/api/clients', { company_name: 'Nova Coffee' })).json.client;
    assert.equal((await api.post('/api/projects', { client_id: 99999, name: 'Ghost' })).status, 400, 'project needs a real client');
    assert.equal((await api.post('/api/projects', { client_id: client.id, name: 'Site', progress: 150 })).status, 400);
    assert.equal((await api.post('/api/projects', { client_id: client.id, name: 'Site', target_date: '2026-02-30' })).status, 400);

    const project = (await api.post('/api/projects', {
      client_id: client.id, name: 'Launch site', category: 'Web',
      target_date: '2026-11-14', preview_url: 'https://preview.example.com'
    })).json.project;
    assert.equal(project.status, 'discovery');
    assert.equal(project.target_date, '2026-11-14');
    assert.equal(project.preview_url, 'https://preview.example.com');
    assert.equal((await api.post('/api/projects', {
      client_id: client.id, name: 'Invalid URL', preview_url: 'javascript:alert(1)'
    })).status, 400);

    const upd = await api.patch(`/api/projects/${project.id}`, {
      status: 'development', progress: 40, next_step: 'Prototype review', preview_url: 'https://test.example.com'
    });
    assert.equal(upd.status, 200);
    assert.equal(upd.json.project.progress, 40);
    assert.equal(upd.json.project.preview_url, 'https://test.example.com');
    assert.equal((await api.patch(`/api/projects/${project.id}`, { preview_url: 'file:///tmp/preview' })).status, 400);
    const detail = (await api.get(`/api/projects/${project.id}`)).json;
    assert.ok(detail.activity.some((a) => a.action === 'project.status_changed' && a.meta.from === 'discovery' && a.meta.to === 'development'));
    assert.equal((await api.patch(`/api/projects/${project.id}`, { client_id: 1 })).status, 400, 'cannot reassign to another client');
    assert.equal((await api.patch(`/api/projects/${project.id}`, { status: 'bogus' })).status, 400);
  });

  it('tracks milestones and completion times', async () => {
    const client = (await api.post('/api/clients', { company_name: 'Milestone Co' })).json.client;
    const project = (await api.post('/api/projects', { client_id: client.id, name: 'P' })).json.project;
    const m1 = (await api.post(`/api/projects/${project.id}/milestones`, { title: 'Wireframes', due_date: '2026-10-10' })).json.milestone;
    const m2 = (await api.post(`/api/projects/${project.id}/milestones`, { title: 'Build' })).json.milestone;
    assert.ok(m2.sort_order > m1.sort_order);
    const done = (await api.patch(`/api/milestones/${m1.id}`, { status: 'done' })).json.milestone;
    assert.ok(done.completed_at);
    const reopened = (await api.patch(`/api/milestones/${m1.id}`, { status: 'doing' })).json.milestone;
    assert.equal(reopened.completed_at, null);
    const list = (await api.get('/api/projects')).json.projects.find((p) => p.id === project.id);
    assert.equal(list.milestone_count, 2);
    assert.equal((await api.del(`/api/milestones/${m2.id}`)).status, 200);
  });

  it('tracks work items, derives project progress, and manages scoped time entries', async () => {
    const client = (await api.post('/api/clients', { company_name: 'Work Tracking Co' })).json.client;
    const otherClient = (await api.post('/api/clients', { company_name: 'Other Work Co' })).json.client;
    const project = (await api.post('/api/projects', { client_id: client.id, name: 'Tracked site', progress: 23 })).json.project;
    const otherProject = (await api.post('/api/projects', { client_id: otherClient.id, name: 'Other site' })).json.project;

    const first = await api.post(`/api/projects/${project.id}/work-items`, {
      title: 'Build the homepage', estimate_minutes: 120, client_visible: true, priority: 'high'
    });
    assert.equal(first.status, 201);
    assert.equal(first.json.work_item.status, 'todo');
    const second = (await api.post(`/api/projects/${project.id}/work-items`, {
      title: 'Internal QA', status: 'done', client_visible: false
    })).json.work_item;
    const otherWorkItem = (await api.post(`/api/projects/${otherProject.id}/work-items`, { title: 'Other task' })).json.work_item;
    assert.ok(second.completed_at);
    assert.equal((await api.post(`/api/projects/${project.id}/work-items`, { title: 'Invalid', status: 'unknown' })).status, 400);

    let detail = (await api.get(`/api/projects/${project.id}`)).json;
    assert.equal(detail.project.progress, 50);
    assert.equal(detail.project.work_item_count, 2);
    assert.equal(detail.project.work_items_done, 1);
    const done = await api.patch(`/api/work-items/${first.json.work_item.id}`, { status: 'done' });
    assert.ok(done.json.work_item.completed_at);
    assert.equal((await api.get(`/api/projects/${project.id}`)).json.project.progress, 100);
    await api.patch(`/api/work-items/${first.json.work_item.id}`, { status: 'in_review' });
    assert.equal((await api.get(`/api/projects/${project.id}`)).json.project.progress, 50);

    const entry = await api.post('/api/time-entries', {
      project_id: project.id, work_item_id: first.json.work_item.id, entry_date: '2026-05-12',
      duration_minutes: 90, description: 'Homepage implementation'
    });
    assert.equal(entry.status, 201);
    assert.equal(entry.json.time_entry.billable, true);
    assert.equal((await api.post('/api/time-entries', {
      project_id: project.id, work_item_id: otherWorkItem.id, entry_date: '2026-05-12',
      duration_minutes: 30, description: 'Wrong project task'
    })).status, 400);
    assert.equal((await api.post('/api/time-entries', {
      project_id: project.id, work_item_id: first.json.work_item.id, entry_date: '2026-05-12',
      duration_minutes: 0, description: 'Invalid duration'
    })).status, 400);

    const list = await api.get('/api/time-entries?from=2026-05-01&to=2026-05-31');
    assert.equal(list.status, 200);
    assert.equal(list.json.time_entries.length, 1);
    assert.equal(list.json.totals.minutes, 90);
    assert.equal(list.json.totals.billable_minutes, 90);
    assert.equal((await api.patch(`/api/time-entries/${entry.json.time_entry.id}`, { billable: false, duration_minutes: 60 })).status, 200);
    const updated = (await api.get(`/api/projects/${project.id}`)).json;
    assert.equal(updated.project.logged_minutes, 60);
    assert.equal(updated.project.billable_minutes, 0);
    assert.equal((await api.del(`/api/time-entries/${entry.json.time_entry.id}`)).status, 200);
    assert.equal((await api.del(`/api/work-items/${second.id}`)).status, 200);
    assert.equal((await api.get(`/api/projects/${otherProject.id}`)).json.project.progress, 0);
  });

  it('stores notes on clients and projects, and refuses clients with projects being hard-deleted', async () => {
    const client = (await api.post('/api/clients', { company_name: 'Notes Co' })).json.client;
    const project = (await api.post('/api/projects', { client_id: client.id, name: 'P' })).json.project;
    const n = await api.post('/api/notes', { client_id: client.id, body: 'Prefers phone calls.' });
    assert.equal(n.status, 201);
    await api.post('/api/notes', { project_id: project.id, body: 'Waiting for logo files.' });
    assert.equal((await api.post('/api/notes', { body: 'orphan' })).status, 400);
    assert.equal((await api.get(`/api/clients/${client.id}`)).json.notes.length, 1);
    assert.equal((await api.get(`/api/projects/${project.id}`)).json.notes.length, 1);
    await api.patch(`/api/notes/${n.json.note.id}`, { pinned: true });
    assert.equal((await api.del(`/api/notes/${n.json.note.id}`)).status, 200);
    // database-level protection: a client with projects cannot be deleted by accident
    await assert.rejects(ctx.db.query('DELETE FROM clients WHERE id = $1', [client.id]), /foreign key|violates/i);
  });

  it('serves a dashboard summary', async () => {
    const res = await api.get('/api/dashboard');
    assert.equal(res.status, 200);
    assert.equal(typeof res.json.counts.active_clients, 'number');
    assert.ok(Array.isArray(res.json.projects_by_status));
    assert.ok(Array.isArray(res.json.recent_activity));
    assert.ok(res.json.recent_activity.every((a) => !a.action.startsWith('auth.')));
  });

  it('denies every CRM endpoint to visitors who are not signed in', async () => {
    const anon = new Client(ctx.base);
    for (const path of ['/api/clients', '/api/projects', '/api/leads', '/api/dashboard', '/api/activity', '/api/clients/1']) {
      assert.equal((await anon.get(path)).status, 401, path);
    }
    assert.equal((await anon.post('/api/clients', { company_name: 'x' })).status, 401);
  });
});

describe('leads from the website form', () => {
  let ctx, api;
  before(async () => { ctx = await startTestServer(); ({ client: api } = await signedInAdmin(ctx)); });
  after(async () => { await ctx.close(); });

  const form = (over = {}) => ({ name: 'Marie Dubois', email: 'marie@example.be', message: 'We need a new website and a launch campaign.', language: 'fr', t: 4000, ...over });

  it('accepts a real submission without login and shows it to the admin', async () => {
    const visitor = new Client(ctx.base);
    const res = await visitor.post('/api/public/leads', form());
    assert.equal(res.status, 201);
    const leads = (await api.get('/api/leads')).json.leads;
    assert.equal(leads.length, 1);
    assert.equal(leads[0].status, 'new');
    assert.equal(leads[0].language, 'fr');
    assert.equal((await api.get('/api/dashboard')).json.counts.new_leads, 1);
  });

  it('rejects bots (too fast, honeypot, bad data) and ignores duplicates', async () => {
    const visitor = new Client(ctx.base);
    assert.equal((await visitor.post('/api/public/leads', form({ t: 100 }))).status, 400);
    assert.equal((await visitor.post('/api/public/leads', form({ t: undefined }))).status, 400);
    assert.equal((await visitor.post('/api/public/leads', form({ website: 'http://spam.example' }))).status, 400);
    assert.equal((await visitor.post('/api/public/leads', form({ email: 'nope' }))).status, 400);
    assert.equal((await visitor.post('/api/public/leads', form({ message: 'hi' }))).status, 400);
    const before = (await api.get('/api/leads')).json.leads.length;
    await visitor.post('/api/public/leads', form());
    assert.equal((await api.get('/api/leads')).json.leads.length, before, 'duplicate within 10 minutes is ignored');
  });

  it('never stores raw IP addresses', async () => {
    const { rows } = await ctx.db.query('SELECT ip_hash FROM leads LIMIT 1');
    assert.ok(rows[0].ip_hash && !/^\d+\.\d+\.\d+\.\d+$/.test(rows[0].ip_hash) && !rows[0].ip_hash.includes('::'));
  });

  it('converts a lead into a client with a contact and the first message as a note', async () => {
    const lead = (await api.get('/api/leads')).json.leads[0];
    const res = await api.post(`/api/leads/${lead.id}/convert`);
    assert.equal(res.status, 201);
    const detail = (await api.get(`/api/clients/${res.json.client.id}`)).json;
    assert.equal(detail.client.status, 'prospect');
    assert.equal(detail.client.language, 'fr');
    assert.equal(detail.contacts[0].name, 'Marie Dubois');
    assert.match(detail.notes[0].body, /new website/);
    assert.equal((await api.post(`/api/leads/${lead.id}/convert`)).status, 409, 'cannot convert twice');
    assert.equal((await api.get('/api/leads?status=converted')).json.leads.length, 1);
  });

  it('lets the admin update lead status and delete spam', async () => {
    await new Client(ctx.base).post('/api/public/leads', form({ email: 'other@example.be', message: 'Another different enquiry here.' }));
    const lead = (await api.get('/api/leads?status=new')).json.leads[0];
    assert.equal((await api.patch(`/api/leads/${lead.id}`, { status: 'contacted' })).json.lead.status, 'contacted');
    assert.equal((await api.patch(`/api/leads/${lead.id}`, { status: 'converted' })).status, 400, 'converting goes through /convert');
    assert.equal((await api.del(`/api/leads/${lead.id}`)).status, 200);
  });
});

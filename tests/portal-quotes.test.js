import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client, signedInAdmin, startTestServer } from './helpers.js';

const futureDate = () => new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

describe('client portal and quotes', () => {
  let ctx, admin;
  before(async () => {
    ctx = await startTestServer();
    ({ client: admin } = await signedInAdmin(ctx));
  });
  after(async () => { await ctx.close(); });

  it('creates one-time invitations, activates client accounts, and scopes portal data to that client', async () => {
    const client1 = (await admin.post('/api/clients', {
      company_name: 'Northstar Studio', language: 'en',
      contact: { name: 'Alex Morgan', email: 'alex@northstar.example', is_primary: true }
    })).json.client;
    const client2 = (await admin.post('/api/clients', {
      company_name: 'Luna Records', language: 'fr',
      contact: { name: 'Lou Vega', email: 'lou@luna.example', is_primary: true }
    })).json.client;
    const project = (await admin.post('/api/projects', {
      client_id: client1.id, name: 'New website', progress: 45,
      next_step: 'Review prototype', preview_url: 'https://preview.northstar.example'
    })).json.project;
    await admin.post(`/api/projects/${project.id}/milestones`, { title: 'Prototype', status: 'doing' });
    const sharedWork = (await admin.post(`/api/projects/${project.id}/work-items`, { title: 'Build the prototype', description: 'Homepage and mobile layout', status: 'in_review', client_visible: true })).json.work_item;
    const privateWork = (await admin.post(`/api/projects/${project.id}/work-items`, { title: 'Private budget review', status: 'done', client_visible: false })).json.work_item;
    const privateNote = (await admin.post('/api/notes', { client_id: client1.id, body: 'Internal budget note.' })).json.note;
    await admin.post('/api/notes', { project_id: project.id, body: 'The prototype is ready to review.', client_visible: true });

    assert.equal((await admin.post(`/api/clients/${client1.id}/invitations`, { email: 'other@northstar.example' })).status, 400);
    const invite1 = await admin.post(`/api/clients/${client1.id}/invitations`, { email: 'alex@northstar.example' });
    assert.equal(invite1.status, 201);
    assert.equal(invite1.json.expires_in_days, 7);
    const token1 = new URL(invite1.json.invitation_url).searchParams.get('invite');
    assert.ok(token1);
    const storedToken = (await ctx.db.query('SELECT token_hash FROM client_invitations WHERE client_id = $1', [client1.id])).rows[0].token_hash;
    assert.notEqual(storedToken, token1);
    assert.equal(storedToken.length, 64);
    assert.match(invite1.json.invitation_url, /lang=en$/);

    const portal1 = new Client(ctx.base);
    assert.equal((await portal1.post('/api/portal/invitations/accept', { token: token1, password: 'short' })).status, 400);
    assert.equal((await portal1.post('/api/portal/invitations/accept', { token: 'invalid-token-value-long-enough', password: 'valid-client-password' })).status, 400);
    const activated1 = await portal1.post('/api/portal/invitations/accept', { token: token1, password: 'valid-client-password' });
    assert.equal(activated1.status, 201);
    assert.equal(activated1.json.user.role, 'client');
    assert.equal((await portal1.post('/api/portal/invitations/accept', { token: token1, password: 'valid-client-password' })).status, 400);
    assert.equal((await portal1.get('/api/portal/overview')).status, 200);
    const overview1 = (await portal1.get('/api/portal/overview')).json;
    assert.equal(overview1.client.company_name, 'Northstar Studio');
    assert.equal(overview1.projects.length, 1);
    assert.equal(overview1.projects[0].progress, 0);
    assert.equal(overview1.projects[0].preview_url, 'https://preview.northstar.example');
    assert.equal(overview1.work_items.length, 1);
    assert.equal(overview1.work_items[0].title, 'Build the prototype');
    assert.equal(overview1.work_items[0].description, 'Homepage and mobile layout');
    assert.equal(overview1.work_items[0].project_id, project.id);
    assert.deepEqual(overview1.project_messages, []);
    assert.equal((await portal1.post(`/api/portal/projects/${project.id}/messages`, { body: ' ' })).status, 400);
    const clientReply = await portal1.post(`/api/portal/projects/${project.id}/messages`, { body: 'The mobile layout looks good.' });
    assert.equal(clientReply.status, 201);
    assert.equal(clientReply.json.message.body, 'The mobile layout looks good.');
    const adminReply = await admin.post(`/api/projects/${project.id}/messages`, { body: 'Great, we will move this feature forward.' });
    assert.equal(adminReply.status, 201);
    const conversation = (await portal1.get('/api/portal/overview')).json.project_messages;
    assert.deepEqual(conversation.map((message) => message.body), ['The mobile layout looks good.', 'Great, we will move this feature forward.']);
    assert.deepEqual(conversation.map((message) => message.author_role), ['client', 'admin']);
    const adminProject = (await admin.get(`/api/projects/${project.id}`)).json;
    assert.equal(adminProject.project_messages.length, 2);
    assert.equal(overview1.milestones.length, 1);
    assert.equal(overview1.notes.length, 1);
    assert.equal(overview1.notes[0].body, 'The prototype is ready to review.');
    assert.equal(overview1.quotes.length, 0);
    await admin.patch(`/api/notes/${privateNote.id}`, { client_visible: true });
    assert.equal((await portal1.get('/api/portal/overview')).json.notes.length, 2);
    await admin.patch(`/api/notes/${privateNote.id}`, { client_visible: false });
    assert.equal((await portal1.get('/api/portal/overview')).json.notes.length, 1);

    const invite2 = await admin.post(`/api/clients/${client2.id}/invitations`, { email: 'lou@luna.example' });
    const token2 = new URL(invite2.json.invitation_url).searchParams.get('invite');
    const portal2 = new Client(ctx.base);
    assert.equal((await portal2.post('/api/portal/invitations/accept', { token: token2, password: 'another-client-password' })).status, 201);
    assert.equal((await portal2.get('/api/portal/overview')).json.projects.length, 0);
    assert.equal((await portal2.get('/api/portal/overview')).json.work_items.length, 0);
    assert.equal((await portal2.post(`/api/portal/projects/${project.id}/messages`, { body: 'Cross-client message.' })).status, 404);
    assert.equal((await admin.post(`/api/projects/${project.id}/messages`, { body: ' ' })).status, 400);

    await admin.patch(`/api/work-items/${sharedWork.id}`, { status: 'done' });
    const completeOverview = (await portal1.get('/api/portal/overview')).json;
    assert.equal(completeOverview.projects[0].progress, 100);
    await admin.patch(`/api/work-items/${sharedWork.id}`, { client_visible: false });
    const privateOverview = (await portal1.get('/api/portal/overview')).json;
    assert.equal(privateOverview.work_items.length, 0);
    assert.equal(privateOverview.projects[0].progress, 45);

    const account = (await admin.get(`/api/clients/${client1.id}`)).json.accounts[0];
    assert.equal(account.email, 'alex@northstar.example');
    assert.equal((await admin.post(`/api/clients/${client1.id}/access/revoke`, { user_id: account.id })).status, 200);
    assert.equal((await portal1.get('/api/portal/overview')).status, 401);
    const renewed = await admin.post(`/api/clients/${client1.id}/invitations`, { email: 'alex@northstar.example' });
    const renewedToken = new URL(renewed.json.invitation_url).searchParams.get('invite');
    const reactivated = await portal1.post('/api/portal/invitations/accept', { token: renewedToken, password: 'renewed-client-password' });
    assert.equal(reactivated.status, 201);
    assert.equal((await portal1.get('/api/portal/overview')).status, 200);
  });

  it('creates draft quotes, calculates totals server-side, and records client decisions', async () => {
    const client = (await admin.post('/api/clients', {
      company_name: 'Orbit Design', contact: { name: 'Sam Lee', email: 'sam@orbit.example' }
    })).json.client;
    const invitation = await admin.post(`/api/clients/${client.id}/invitations`, { email: 'sam@orbit.example' });
    const token = new URL(invitation.json.invitation_url).searchParams.get('invite');
    const portal = new Client(ctx.base);
    await portal.post('/api/portal/invitations/accept', { token, password: 'another-safe-password' });

    const invalid = await admin.post('/api/quotes', {
      client_id: client.id, title: 'Invalid', items: [{ description: 'Bad quantity', quantity: -1, unit_price: 100 }]
    });
    assert.equal(invalid.status, 400);

    const created = await admin.post('/api/quotes', {
      client_id: client.id,
      title: 'Website redesign',
      valid_until: futureDate(),
      introduction: 'Design and build of the new site.',
      terms: '50% deposit to begin.',
      items: [
        { description: 'Design and development', quantity: 2, unit_price: 100, vat_rate: 21 },
        { description: 'Hosting setup', quantity: 0.5, unit_price: 30, vat_rate: 0 }
      ],
      total_cents: 1
    });
    assert.equal(created.status, 201);
    const quote = created.json.quote;
    assert.match(quote.quote_number, /^MIS-Q-\d{4}-\d+$/);
    assert.equal(Number(quote.subtotal_cents), 21500);
    assert.equal(Number(quote.vat_cents), 4200);
    assert.equal(Number(quote.total_cents), 25700);
    assert.equal((await admin.patch(`/api/quotes/${quote.id}`, { title: 'Revised offer' })).status, 200);
    assert.equal((await portal.get(`/api/portal/quotes/${quote.id}`)).status, 404, 'draft quotes are not client-visible');
    assert.equal((await admin.post(`/api/quotes/${quote.id}/send`)).status, 200);
    assert.equal((await admin.patch(`/api/quotes/${quote.id}`, { title: 'Cannot change after sharing' })).status, 409);
    const visible = (await portal.get('/api/portal/overview')).json.quotes;
    assert.equal(visible.length, 1);
    assert.equal(visible[0].display_status, 'sent');
    assert.equal(Number(visible[0].total_cents), 25700);
    const portalQuote = await portal.get(`/api/portal/quotes/${quote.id}`);
    assert.equal(portalQuote.status, 200);
    assert.equal(portalQuote.json.quote.display_status, 'sent');

    const unrelatedClient = (await admin.post('/api/clients', {
      company_name: 'Unrelated', contact: { name: 'Taylor', email: 'taylor@unrelated.example' }
    })).json.client;
    const otherInvitation = await admin.post(`/api/clients/${unrelatedClient.id}/invitations`, { email: 'taylor@unrelated.example' });
    const otherToken = new URL(otherInvitation.json.invitation_url).searchParams.get('invite');
    const unrelatedPortal = new Client(ctx.base);
    await unrelatedPortal.post('/api/portal/invitations/accept', { token: otherToken, password: 'third-safe-client-password' });
    assert.equal((await unrelatedPortal.get(`/api/portal/quotes/${quote.id}`)).status, 404);
    assert.equal((await unrelatedPortal.post(`/api/portal/quotes/${quote.id}/respond`, { decision: 'accepted' })).status, 404);
    assert.equal((await unrelatedPortal.get('/api/quotes')).status, 403);

    const decision = await portal.post(`/api/portal/quotes/${quote.id}/respond`, { decision: 'accepted', note: 'Looks good.' });
    assert.equal(decision.status, 200);
    assert.equal(decision.json.quote.status, 'accepted');
    assert.equal((await portal.post(`/api/portal/quotes/${quote.id}/respond`, { decision: 'declined' })).status, 409);
    assert.equal((await admin.get(`/api/quotes/${quote.id}`)).json.quote.decision_note, 'Looks good.');

    const declined = await admin.post('/api/quotes', {
      client_id: client.id, title: 'Optional support plan', items: [{ description: 'Monthly support', quantity: 1, unit_price: 80 }]
    });
    await admin.post(`/api/quotes/${declined.json.quote.id}/send`);
    const response = await portal.post(`/api/portal/quotes/${declined.json.quote.id}/respond`, { decision: 'declined' });
    assert.equal(response.status, 200);
    assert.equal(response.json.quote.status, 'declined');
    assert.equal((await admin.get('/api/quotes')).json.quotes.find((q) => q.id === declined.json.quote.id).display_status, 'declined');

    const past = await admin.post('/api/quotes', {
      client_id: client.id, title: 'Past validity', valid_until: '2020-01-01', items: [{ description: 'Expired draft', quantity: 1, unit_price: 1 }]
    });
    assert.equal((await admin.post(`/api/quotes/${past.json.quote.id}/send`)).status, 400);
  });

  it('requires client authentication for portal data and restricts quote routes to admins', async () => {
    const anonymous = new Client(ctx.base);
    assert.equal((await anonymous.get('/api/portal/overview')).status, 401);
    assert.equal((await anonymous.get('/api/quotes')).status, 401);
  });
});

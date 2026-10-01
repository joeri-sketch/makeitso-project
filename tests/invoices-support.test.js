import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client, signedInAdmin, startTestServer } from './helpers.js';

describe('invoices and support tickets', () => {
  let ctx, admin;
  before(async () => {
    ctx = await startTestServer();
    ({ client: admin } = await signedInAdmin(ctx));
  });
  after(async () => { await ctx.close(); });

  it('issues sequential immutable invoices, records partial bank payments, and scopes PDF access', async () => {
    const client = (await admin.post('/api/clients', {
      company_name: 'Nebula Studio', address_line1: '1 Star Lane', postal_code: '1000', city: 'Brussels', country: 'BE',
      contact: { name: 'Casey Reed', email: 'casey@nebula.example' }
    })).json.client;
    const unconfigured = (await admin.post('/api/invoices', {
      client_id: client.id, title: 'Setup check',
      items: [{ description: 'Service', quantity: 1, unit_price: 10 }]
    })).json.invoice;
    assert.equal((await admin.post(`/api/invoices/${unconfigured.id}/issue`)).status, 400);
    assert.equal((await admin.get(`/api/invoices/${unconfigured.id}`)).json.invoice.status, 'draft');
    const profile = await admin.put('/api/business-profile', {
      legal_name: 'Make It So BV', vat_number: '', company_number: '',
      address_line1: '2 Space Road', address_line2: '', postal_code: '2000', city: 'Antwerp',
      country: 'BE', email: 'billing@makeitso.example', phone: '', iban: 'BE00000000000000',
      payment_instructions: 'Please mention your invoice number.', default_payment_days: 30
    });
    assert.equal(profile.status, 200);

    const created = await admin.post('/api/invoices', {
      client_id: client.id, title: 'Website development', due_date: null, notes: 'Thank you.',
      items: [{ description: 'Website build', quantity: 2, unit_price: 200, vat_rate: 21 }]
    });
    assert.equal(created.status, 201, created.text);
    const draft = created.json.invoice;
    assert.equal(draft.status, 'draft');
    assert.equal(Number(draft.total_cents), 48400);
    assert.equal((await admin.get(`/api/invoices/${draft.id}/pdf`)).status, 409);
    assert.equal((await admin.post(`/api/invoices/${draft.id}/issue`)).status, 200);
    const issued = (await admin.get(`/api/invoices/${draft.id}`)).json.invoice;
    assert.match(issued.invoice_number, /^MIS-\d{4}-00001$/);
    assert.equal(issued.display_status, 'issued');
    assert.equal(issued.due_date, new Date(Date.parse(`${issued.issue_date}T00:00:00Z`) + 30 * 86400000).toISOString().slice(0, 10));
    assert.equal((await admin.patch(`/api/invoices/${draft.id}`, { title: 'Changed' })).status, 409);
    assert.equal((await admin.post(`/api/invoices/${draft.id}/payments`, {
      amount: 500, paid_on: new Date().toISOString().slice(0, 10)
    })).status, 400, 'overpayment is rejected');
    assert.equal((await admin.post(`/api/invoices/${draft.id}/payments`, {
      amount: 100, paid_on: new Date().toISOString().slice(0, 10), reference: 'BANK-001'
    })).status, 200);
    const partlyPaid = (await admin.get(`/api/invoices/${draft.id}`)).json.invoice;
    assert.equal(Number(partlyPaid.paid_cents), 10000);
    assert.equal(Number(partlyPaid.balance_cents), 38400);
    const paid = await admin.post(`/api/invoices/${draft.id}/payments`, {
      amount: 384, paid_on: new Date().toISOString().slice(0, 10), reference: 'BANK-002'
    });
    assert.equal(paid.json.invoice.display_status, 'paid');
    assert.equal(Number(paid.json.invoice.balance_cents), 0);
    assert.equal((await admin.post(`/api/invoices/${draft.id}/void`, { reason: 'Already paid.' })).status, 409);
    assert.equal((await admin.get(`/api/invoices/${draft.id}/pdf`)).headers.get('content-type'), 'application/pdf');

    const invite = await admin.post(`/api/clients/${client.id}/invitations`, { email: 'casey@nebula.example' });
    const portal = new Client(ctx.base);
    await portal.post('/api/portal/invitations/accept', {
      token: new URL(invite.json.invitation_url).searchParams.get('invite'),
      password: 'secure-client-password'
    });
    const visible = await portal.get('/api/portal/invoices');
    assert.equal(visible.status, 200);
    assert.equal(visible.json.invoices.length, 1);
    assert.equal(visible.json.invoices[0].invoice_number, issued.invoice_number);
    const pdf = await portal.get(`/api/portal/invoices/${draft.id}/pdf`);
    assert.equal(pdf.status, 200);
    assert.match(pdf.text, /^%PDF-/);

    const quote = (await admin.post('/api/quotes', {
      client_id: client.id, title: 'Follow-up design',
      items: [{ description: 'Design work', quantity: 1, unit_price: 80 }]
    })).json.quote;
    await admin.post(`/api/quotes/${quote.id}/send`);
    assert.equal((await portal.post(`/api/portal/quotes/${quote.id}/respond`, { decision: 'accepted' })).status, 200);
    const fromQuote = await admin.post(`/api/quotes/${quote.id}/invoice`);
    assert.equal(fromQuote.status, 201, fromQuote.text);
    assert.equal(fromQuote.json.invoice.quote_id, quote.id);
    assert.equal(fromQuote.json.invoice.items[0].description, 'Design work');
    assert.equal((await admin.post(`/api/quotes/${quote.id}/invoice`)).status, 409, 'quote conversion is one-time');

    const otherClient = (await admin.post('/api/clients', {
      company_name: 'Other Company', contact: { name: 'Other Contact', email: 'other@company.example' }
    })).json.client;
    const otherInvite = await admin.post(`/api/clients/${otherClient.id}/invitations`, { email: 'other@company.example' });
    const otherPortal = new Client(ctx.base);
    await otherPortal.post('/api/portal/invitations/accept', {
      token: new URL(otherInvite.json.invitation_url).searchParams.get('invite'),
      password: 'other-secure-password'
    });
    assert.equal((await otherPortal.get('/api/portal/invoices')).json.invoices.length, 0);
    assert.equal((await otherPortal.get(`/api/portal/invoices/${draft.id}/pdf`)).status, 404);

    const voidDraft = (await admin.post('/api/invoices', {
      client_id: client.id, title: 'Cancelled service',
      items: [{ description: 'Cancelled work', quantity: 1, unit_price: 50 }]
    })).json.invoice;
    await admin.post(`/api/invoices/${voidDraft.id}/issue`);
    assert.equal((await admin.post(`/api/invoices/${voidDraft.id}/void`, { reason: 'Created in error.' })).status, 200);
    const nextDraft = (await admin.post('/api/invoices', {
      client_id: client.id, title: 'Follow-up work',
      items: [{ description: 'Support', quantity: 1, unit_price: 50 }]
    })).json.invoice;
    await admin.post(`/api/invoices/${nextDraft.id}/issue`);
    const next = (await admin.get(`/api/invoices/${nextDraft.id}`)).json.invoice;
    assert.match(next.invoice_number, /^MIS-\d{4}-00003$/);
  });

  it('lets clients and admins exchange tenant-scoped ticket messages and track ticket state', async () => {
    const client = (await admin.post('/api/clients', {
      company_name: 'Comet Works', contact: { name: 'Riley Park', email: 'riley@comet.example' }
    })).json.client;
    const invite = await admin.post(`/api/clients/${client.id}/invitations`, { email: 'riley@comet.example' });
    const portal = new Client(ctx.base);
    await portal.post('/api/portal/invitations/accept', {
      token: new URL(invite.json.invitation_url).searchParams.get('invite'),
      password: 'comet-client-password'
    });

    assert.equal((await portal.get('/api/portal/tickets')).status, 200);
    const created = await portal.post('/api/portal/tickets', {
      subject: 'Cannot access staging',
      message: 'The staging link is returning an error.'
    });
    assert.equal(created.status, 201, created.text);
    const ticketId = created.json.ticket.id;
    assert.equal(created.json.ticket.messages.length, 1);
    assert.equal((await admin.get('/api/tickets')).json.tickets.length, 1);
    assert.equal((await admin.get(`/api/tickets/${ticketId}`)).json.ticket.status, 'open');

    const stranger = (await admin.post('/api/clients', {
      company_name: 'Stranger Ltd', contact: { name: 'Jordan', email: 'jordan@stranger.example' }
    })).json.client;
    const strangerInvite = await admin.post(`/api/clients/${stranger.id}/invitations`, { email: 'jordan@stranger.example' });
    const strangerPortal = new Client(ctx.base);
    await strangerPortal.post('/api/portal/invitations/accept', {
      token: new URL(strangerInvite.json.invitation_url).searchParams.get('invite'),
      password: 'stranger-client-password'
    });
    assert.equal((await strangerPortal.get(`/api/portal/tickets/${ticketId}`)).status, 404);

    await admin.post(`/api/tickets/${ticketId}/messages`, { message: 'We are checking the server now.' });
    assert.equal((await admin.get(`/api/tickets/${ticketId}`)).json.ticket.status, 'waiting_client');
    assert.equal((await portal.post(`/api/portal/tickets/${ticketId}/messages`, { message: 'Thanks for checking.' })).json.ticket.status, 'open');
    await admin.patch(`/api/tickets/${ticketId}`, { status: 'resolved', priority: 'high' });
    assert.equal((await admin.get(`/api/tickets/${ticketId}`)).json.ticket.priority, 'high');
    assert.equal((await portal.post(`/api/portal/tickets/${ticketId}/messages`, { message: 'One more detail.' })).json.ticket.status, 'open');
    await admin.patch(`/api/tickets/${ticketId}`, { status: 'closed' });
    assert.equal((await portal.post(`/api/portal/tickets/${ticketId}/messages`, { message: 'Reopening this.' })).status, 409);
    await admin.patch(`/api/tickets/${ticketId}`, { status: 'open' });
    assert.equal((await admin.post(`/api/tickets/${ticketId}/messages`, { message: 'The ticket is reopened.' })).json.ticket.status, 'waiting_client');
  });

  it('denies admin invoice and ticket endpoints to visitors and clients', async () => {
    const visitor = new Client(ctx.base);
    assert.equal((await visitor.get('/api/invoices')).status, 401);
    assert.equal((await visitor.get('/api/tickets')).status, 401);
  });
});

// Make It So admin. Plain JavaScript, no build step. Every value is escaped by the html`` template.

/* ---------------- tiny helpers ---------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
const fmt = (x) => (x instanceof Raw ? x.s : Array.isArray(x) ? x.map(fmt).join('') : esc(x));
const html = (strings, ...vals) => new Raw(strings.reduce((out, s, i) => out + s + (i < vals.length ? fmt(vals[i]) : ''), ''));
const raw = (s) => new Raw(s);
const show = (el, tpl) => { el.innerHTML = tpl.s; };

const date = (d) => (d ? new Date(`${String(d).slice(0, 10)}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
function ago(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`;
  return date(iso);
}

const LABEL = {
  prospect: 'Prospect', active: 'Active', inactive: 'Inactive',
  discovery: 'Discovery', wireframing: 'Wireframing', development: 'Development', review: 'Review', launched: 'Launched', on_hold: 'On hold',
  todo: 'To do', doing: 'Doing', done: 'Done',
  new: 'New', contacted: 'Contacted', qualified: 'Qualified', converted: 'Converted', lost: 'Lost',
  nl: 'Nederlands', fr: 'Français', en: 'English'
};
const label = (k) => LABEL[k] ?? k;
const chip = (k) => html`<span class="chip s-${k}">${label(k)}</span>`;
const options = (keys) => keys.map((k) => [k, label(k)]);
const CLIENT_STATUS = options(['prospect', 'active', 'inactive']);
const PROJECT_STATUS = options(['discovery', 'wireframing', 'development', 'review', 'launched', 'on_hold']);
const LANGUAGES = options(['nl', 'fr', 'en']);

/* ---------------- API ---------------- */
async function api(method, path, body) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'makeitso' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status; err.code = data?.code; err.field = data?.field;
    throw err;
  }
  return data;
}
const get = (p) => api('GET', p);
const post = (p, b = {}) => api('POST', p, b);
const patch = (p, b = {}) => api('PATCH', p, b);
const del = (p) => api('DELETE', p);

/* ---------------- toast + modal ---------------- */
let toastTimer;
function toast(message, kind = '') {
  const t = $('#toast');
  t.textContent = message;
  t.className = `show ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = ''; }, 3200);
}

function fieldHtml(f, value) {
  const id = `f-${f.name}`;
  const v = value ?? f.default ?? '';
  let control;
  if (f.type === 'select') {
    control = html`<select id="${id}" name="${f.name}">${f.options.map(([val, text]) => html`<option value="${val}" ${String(val) === String(v) ? 'selected' : ''}>${text}</option>`)}</select>`;
  } else if (f.type === 'textarea') {
    control = html`<textarea id="${id}" name="${f.name}" rows="${f.rows || 4}" maxlength="${f.max || 4000}">${v}</textarea>`;
  } else if (f.type === 'checkbox') {
    return html`<label class="check full" for="${id}"><input type="checkbox" id="${id}" name="${f.name}" ${v ? 'checked' : ''}> ${f.label}</label>`;
  } else {
    control = html`<input id="${id}" name="${f.name}" type="${f.type || 'text'}" value="${v}" ${f.required ? 'required' : ''} ${f.min !== undefined ? html`min="${f.min}"` : ''} ${f.max !== undefined && f.type === 'number' ? html`max="${f.max}"` : ''} autocomplete="off">`;
  }
  return html`<label class="field ${f.full ? 'full' : ''}" for="${id}"><span>${f.label}${f.required ? ' *' : ''}</span>${control}${f.hint ? html`<small>${f.hint}</small>` : ''}</label>`;
}

// Opens a form in a dialog. `onSubmit(values)` should throw to show an error message.
function openForm({ title, fields, values = {}, submit = 'Save', onSubmit }) {
  const dlg = $('#modal');
  show(dlg, html`<form class="modal-form" novalidate>
    <header><h2>${title}</h2><button type="button" class="icon-btn" data-close aria-label="Close">×</button></header>
    <div class="form-grid">${fields.map((f) => fieldHtml(f, values[f.name]))}</div>
    <p class="form-error" role="alert"></p>
    <footer><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">${submit}</button></footer>
  </form>`);
  const form = $('form', dlg);
  dlg.onclick = (e) => { if (e.target.closest('[data-close]') || e.target === dlg) dlg.close(); };
  form.onsubmit = async (e) => {
    e.preventDefault();
    const out = {};
    for (const f of fields) {
      const el = form.elements[f.name];
      if (f.type === 'checkbox') out[f.name] = el.checked;
      else if (f.type === 'number') out[f.name] = el.value === '' ? null : Number(el.value);
      else out[f.name] = el.value;
    }
    const button = $('button.primary', form);
    button.disabled = true;
    $('.form-error', form).textContent = '';
    try {
      await onSubmit(out);
      dlg.close();
    } catch (err) {
      $('.form-error', form).textContent = err.message;
      if (err.field && form.elements[err.field]) form.elements[err.field].focus();
      button.disabled = false;
    }
  };
  dlg.showModal();
  form.querySelector('input:not([type=hidden]), select, textarea')?.focus();
}

function showCopyLink({ title, description, url }) {
  const dlg = $('#modal');
  show(dlg, html`<form class="modal-form">
    <header><h2>${title}</h2><button type="button" class="icon-btn" data-close aria-label="Close">×</button></header>
    <p class="muted">${description}</p>
    <label class="field full"><span>Link</span><input id="invitation-link" value="${url}" readonly></label>
    <footer><button type="button" class="btn" data-close>Close</button><button type="button" class="btn primary" id="copy-invitation">Copy link</button></footer>
  </form>`);
  dlg.onclick = (event) => { if (event.target.closest('[data-close]') || event.target === dlg) dlg.close(); };
  $('#copy-invitation').onclick = async () => {
    const input = $('#invitation-link');
    try {
      await navigator.clipboard.writeText(input.value);
      toast('Link copied');
    } catch {
      input.focus();
      input.select();
      toast('Select and copy the invitation link');
    }
  };
  dlg.showModal();
}

/* ---------------- app state + shell ---------------- */
const app = $('#app');
const state = { user: null, auth: 'anonymous', leads: 0 };
const brand = html`<span class="brand"><span class="mark"><svg width="18" height="18" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4l3 8.4L28 15l-9 2.6L16 26l-3-8.4L4 15l9-2.6z" fill="#ff6a1f"/></svg></span>${raw('<span class="word">make it so<em>.</em></span>')}<span class="tag">ADMIN</span></span>`;

async function boot() {
  try {
    const me = await get('/auth/me');
    state.user = me.user;
    state.auth = me.state;
  } catch {
    state.auth = 'anonymous';
  }
  if (state.user?.role === 'client') { location.replace('/portal/'); return; }
  if (state.auth === 'anonymous') return loginScreen();
  if (state.auth === 'verify_2fa') return verifyScreen();
  if (state.auth === 'setup_2fa') return setupScreen();
  return shell();
}

function authCard(inner) {
  show(app, html`<div class="auth"><div class="auth-card">${brand}${inner}</div></div>`);
}

function loginScreen() {
  authCard(html`<div><h1>Sign in</h1><p class="muted">Admin area for the Make It So team.</p></div>
    <form id="login" novalidate>
      <label class="field"><span>Email</span><input name="email" type="email" autocomplete="username" required autofocus></label>
      <label class="field"><span>Password</span><input name="password" type="password" autocomplete="current-password" required></label>
      <p class="form-error" role="alert"></p>
      <button class="btn primary">Continue</button>
    </form>`);
  const form = $('#login');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const btn = $('button', form); btn.disabled = true;
    try {
      await post('/auth/login', { email: form.email.value, password: form.password.value });
      boot();
    } catch (err) {
      $('.form-error', form).textContent = err.message;
      btn.disabled = false;
    }
  };
}

function verifyScreen() {
  authCard(html`<div><h1>Two-factor code</h1><p class="muted">Enter the 6-digit code from your authenticator app, or one of your recovery codes.</p></div>
    <form id="verify" novalidate>
      <label class="field"><span>Code</span><input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="12" required autofocus></label>
      <p class="form-error" role="alert"></p>
      <button class="btn primary">Verify</button>
      <button type="button" class="btn ghost" data-logout>Cancel and sign out</button>
    </form>`);
  const form = $('#verify');
  $('[data-logout]', form).onclick = logout;
  form.onsubmit = async (e) => {
    e.preventDefault();
    const btn = $('button.primary', form); btn.disabled = true;
    try {
      await post('/auth/2fa/verify', { code: form.code.value });
      boot();
    } catch (err) {
      $('.form-error', form).textContent = err.message;
      if (err.status === 429) return boot();
      btn.disabled = false;
    }
  };
}

async function setupScreen() {
  authCard(html`<p class="muted">Preparing…</p>`);
  let setup;
  try { setup = await post('/auth/2fa/setup'); } catch (err) { return authCard(html`<p class="form-error">${err.message}</p><button class="btn" data-logout>Sign out</button>`); }
  authCard(html`<div><h1>Protect your account</h1><p class="muted">Two-factor authentication is required for admins. Scan this code with an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password, Authy…).</p></div>
    <div class="qr"><img src="${setup.qr}" alt="QR code for your authenticator app"><span class="muted">Can't scan? Enter this key:</span><span class="secret">${setup.secret}</span></div>
    <form id="enable" novalidate>
      <label class="field"><span>6-digit code from the app</span><input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="10" required autofocus></label>
      <p class="form-error" role="alert"></p>
      <button class="btn primary">Turn on two-factor</button>
    </form>`);
  const form = $('#enable');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const btn = $('button', form); btn.disabled = true;
    try {
      const res = await post('/auth/2fa/enable', { code: form.code.value });
      recoveryScreen(res.recovery_codes);
    } catch (err) {
      $('.form-error', form).textContent = err.message;
      btn.disabled = false;
    }
  };
}

function recoveryScreen(codes) {
  authCard(html`<div><h1>Save your recovery codes</h1><p class="muted">If you lose your phone, each code below lets you sign in once. They are shown only now — store them in a password manager.</p></div>
    <div class="codes">${codes.map((c) => html`<span>${c}</span>`)}</div>
    <div class="notice">Keep these somewhere safe and private. Anyone with a code and your password can sign in.</div>
    <button class="btn" id="copy-codes" type="button">Copy codes</button>
    <button class="btn primary" id="done" type="button">I've saved them — continue</button>`);
  $('#copy-codes').onclick = async () => {
    try { await navigator.clipboard.writeText(codes.join('\n')); toast('Codes copied'); } catch { toast('Copy failed — select and copy them manually', 'error'); }
  };
  $('#done').onclick = boot;
}

async function logout() {
  try { await post('/auth/logout'); } catch { /* already signed out */ }
  state.user = null; state.auth = 'anonymous';
  location.hash = '';
  loginScreen();
}

const NAV = [['#/', 'Dashboard'], ['#/clients', 'Clients'], ['#/projects', 'Projects'], ['#/quotes', 'Quotes'], ['#/leads', 'Leads'], ['#/account', 'Account']];

function shell() {
  show(app, html`<div class="shell">
    <aside class="sidebar"><div class="brand-wrap">${brand}</div>
      <nav aria-label="Main">${NAV.map(([href, text]) => html`<a class="nav-link" href="${href}" data-nav="${href}"><span>${text}</span>${href === '#/leads' ? html`<span class="badge" id="lead-badge" hidden></span>` : ''}</a>`)}</nav>
      <div class="side-foot"><span class="muted">${state.user.name}</span><button class="btn small" id="logout">Sign out</button></div>
    </aside>
    <main id="view" tabindex="-1"></main>
  </div>`);
  $('#logout').onclick = logout;
  refreshBadge();
  route();
}

async function refreshBadge() {
  try {
    const d = await get('/dashboard');
    state.leads = d.counts.new_leads;
    const b = $('#lead-badge');
    if (b) { b.textContent = state.leads; b.hidden = !state.leads; }
  } catch { /* ignore */ }
}

/* ---------------- router ---------------- */
const routes = [
  [/^#\/?$/, dashboardView],
  [/^#\/clients$/, clientsView],
  [/^#\/clients\/(\d+)$/, clientView],
  [/^#\/projects$/, projectsView],
  [/^#\/projects\/(\d+)$/, projectView],
  [/^#\/quotes$/, quotesView],
  [/^#\/quotes\/(\d+)$/, quoteView],
  [/^#\/leads$/, leadsView],
  [/^#\/account$/, accountView]
];

async function route() {
  if (state.auth !== 'ok') return;
  const view = $('#view');
  if (!view) return;
  const hash = location.hash || '#/';
  for (const link of document.querySelectorAll('[data-nav]')) {
    const base = link.dataset.nav;
    const on = base === '#/' ? hash === '#/' || hash === '#' : hash.startsWith(base);
    if (on) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  }
  const match = routes.map(([re, fn]) => [hash.match(re), fn]).find(([m]) => m);
  view.onclick = null;
  view.onchange = null;
  show(view, html`<p class="muted">Loading…</p>`);
  try {
    if (match) await match[1](view, ...match[0].slice(1).map(Number));
    else show(view, html`<div class="card"><h2>Page not found</h2><p><a href="#/">Back to the dashboard</a></p></div>`);
  } catch (err) {
    if (err.status === 401 || err.code?.startsWith('MFA')) return boot();
    show(view, html`<div class="card"><h2>Something went wrong</h2><p class="muted">${err.message}</p><p><button class="btn" data-retry>Try again</button></p></div>`);
    view.onclick = (e) => { if (e.target.closest('[data-retry]')) route(); };
  }
}
window.addEventListener('hashchange', route);

// shared click dispatcher: <button data-action="name" data-id="1">
function actions(view, handlers) {
  view.onclick = async (e) => {
    const el = e.target.closest('[data-action]');
    if (el && handlers[el.dataset.action]) {
      e.preventDefault();
      try { await handlers[el.dataset.action](el, Number(el.dataset.id), el.dataset); } catch (err) { toast(err.message, 'error'); }
      return;
    }
    const row = e.target.closest('tr[data-href]');
    if (row && !e.target.closest('a, button, input, select')) location.hash = row.dataset.href;
  };
}

/* ---------------- activity text ---------------- */
const q = (s) => `“${s ?? ''}”`;
const ACTIVITY = {
  'client.created': (m) => `created client ${q(m.name)}`,
  'client.updated': () => 'updated client details',
  'client.archived': (m) => `archived client ${q(m.name)}`,
  'client.restored': (m) => `restored client ${q(m.name)}`,
  'contact.created': (m) => `added contact ${q(m.name)}`,
  'contact.updated': () => 'updated a contact',
  'contact.deleted': (m) => `removed contact ${q(m.name)}`,
  'project.created': (m) => `created project ${q(m.name)}`,
  'project.updated': () => 'updated project details',
  'project.status_changed': (m) => `moved the project from ${label(m.from)} to ${label(m.to)}`,
  'project.archived': (m) => `archived project ${q(m.name)}`,
  'project.restored': (m) => `restored project ${q(m.name)}`,
  'milestone.created': (m) => `added milestone ${q(m.title)}`,
  'milestone.updated': () => 'updated a milestone',
  'milestone.status_changed': (m) => `set milestone ${q(m.title)} to ${label(m.to)}`,
  'milestone.deleted': (m) => `removed milestone ${q(m.title)}`,
  'note.created': () => 'added a note',
  'note.deleted': () => 'deleted a note',
  'note.visibility_changed': (m) => `${m.visible ? 'shared' : 'made private'} a note`,
  'portal.invitation_created': () => 'created a client portal invitation',
  'portal.access_revoked': () => 'revoked client portal access',
  'quote.created': (m) => `created quote ${q(m.quote_number)}`,
  'quote.updated': (m) => `updated quote ${q(m.quote_number || '')}`,
  'quote.sent': (m) => `sent quote ${q(m.quote_number)}`,
  'quote.accepted': (m) => `client accepted quote ${q(m.quote_number)}`,
  'quote.declined': (m) => `client declined quote ${q(m.quote_number)}`,
  'lead.created': () => 'a new message came in from the website',
  'lead.status_changed': (m) => `set a lead to ${label(m.to)}`,
  'lead.converted': (m) => `converted lead ${q(m.name)} into a client`,
  'lead.deleted': () => 'deleted a lead'
};
const activityList = (items) => (items.length
  ? html`<ul class="list">${items.map((a) => html`<li><span class="grow"><strong>${a.actor_name || 'Website'}</strong> ${(ACTIVITY[a.action] || (() => a.action))(a.meta || {})}</span><span class="muted">${ago(a.created_at)}</span></li>`)}</ul>`
  : html`<p class="muted">Nothing yet.</p>`);

/* ---------------- forms (shared) ---------------- */
const clientFields = [
  { name: 'company_name', label: 'Company name', required: true, full: true },
  { name: 'status', label: 'Status', type: 'select', options: CLIENT_STATUS, default: 'active' },
  { name: 'language', label: 'Language', type: 'select', options: LANGUAGES, default: 'nl' },
  { name: 'vat_number', label: 'VAT number', hint: 'e.g. BE0123.456.749' },
  { name: 'company_number', label: 'Company number (KBO/BCE)' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'phone', label: 'Phone' },
  { name: 'website', label: 'Website', hint: 'Starts with https://', full: true },
  { name: 'address_line1', label: 'Address', full: true },
  { name: 'postal_code', label: 'Postal code' },
  { name: 'city', label: 'City' },
  { name: 'country', label: 'Country code', hint: 'BE, NL, FR…', default: 'BE' }
];
const contactFields = [
  { name: 'name', label: 'Name', required: true, full: true },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'phone', label: 'Phone' },
  { name: 'role', label: 'Role', hint: 'e.g. Owner, Marketing manager' },
  { name: 'is_primary', label: 'Primary contact', type: 'checkbox' }
];
const projectFields = (clients) => [
  ...(clients ? [{ name: 'client_id', label: 'Client', type: 'select', options: clients.map((c) => [c.id, c.company_name]), full: true }] : []),
  { name: 'name', label: 'Project name', required: true, full: true },
  { name: 'category', label: 'Category', hint: 'e.g. Website, Branding, Campaign' },
  { name: 'status', label: 'Status', type: 'select', options: PROJECT_STATUS, default: 'discovery' },
  { name: 'progress', label: 'Progress (%)', type: 'number', min: 0, max: 100, default: 0 },
  { name: 'target_date', label: 'Target date', type: 'date' },
  { name: 'next_step', label: 'Next step', full: true },
  { name: 'description', label: 'Description', type: 'textarea', full: true, max: 2000 }
];
const milestoneFields = [
  { name: 'title', label: 'Milestone', required: true, full: true },
  { name: 'due_date', label: 'Due date', type: 'date' },
  { name: 'status', label: 'Status', type: 'select', options: options(['todo', 'doing', 'done']), default: 'todo' }
];

function newClient(after) {
  openForm({
    title: 'New client',
    fields: [...clientFields, { name: 'contact_name', label: 'Primary contact name', full: true, hint: 'Optional' }, { name: 'contact_email', label: 'Primary contact email', type: 'email', full: true }],
    submit: 'Create client',
    onSubmit: async ({ contact_name, contact_email, ...data }) => {
      const body = { ...data };
      if (contact_name) body.contact = { name: contact_name, email: contact_email };
      const { client } = await post('/clients', body);
      toast('Client created');
      after ? after(client) : (location.hash = `#/clients/${client.id}`);
    }
  });
}

async function newProject(after, clientId) {
  let clients = null;
  if (!clientId) {
    clients = (await get('/clients')).clients;
    if (!clients.length) { toast('Create a client first', 'error'); return; }
  }
  openForm({
    title: 'New project',
    fields: projectFields(clients),
    values: clientId ? {} : { client_id: clients[0].id },
    submit: 'Create project',
    onSubmit: async (data) => {
      const { project } = await post('/projects', { ...data, client_id: clientId || Number(data.client_id) });
      toast('Project created');
      after ? after(project) : (location.hash = `#/projects/${project.id}`);
    }
  });
}

/* ---------------- dashboard ---------------- */
async function dashboardView(view) {
  const d = await get('/dashboard');
  const c = d.counts;
  const total = d.projects_by_status.reduce((n, s) => n + s.n, 0);
  state.leads = c.new_leads;
  const badge = $('#lead-badge'); if (badge) { badge.textContent = c.new_leads; badge.hidden = !c.new_leads; }
  show(view, html`
    <header class="page-head"><div><h1>Dashboard</h1><p class="muted">Welcome back, ${state.user.name}.</p></div>
      <div class="actions"><button class="btn" data-action="new-project">+ New project</button><button class="btn primary" data-action="new-client">+ New client</button></div></header>
    <div class="grid kpis">
      <div class="card kpi"><span>Active clients</span><strong>${c.active_clients}</strong></div>
      <div class="card kpi"><span>Prospects</span><strong>${c.prospects}</strong></div>
      <div class="card kpi"><span>Open projects</span><strong>${c.open_projects}</strong></div>
      <a class="card kpi" href="#/leads" style="text-decoration:none;color:inherit"><span>New leads</span><strong>${c.new_leads}</strong></a>
    </div>
    <div class="grid two">
      <section class="card"><header><h2>Upcoming milestones</h2></header>
        ${d.upcoming_milestones.length ? html`<ul class="list">${d.upcoming_milestones.map((m) => html`<li><span class="grow"><a href="#/projects/${m.project_id}">${m.title}</a><span class="sub">${m.project_name} · ${m.company_name}</span></span><span class="muted">${m.due_date ? date(m.due_date) : 'No date'}</span></li>`)}</ul>` : html`<p class="muted">No open milestones. Add some on a project page.</p>`}
      </section>
      <section class="card"><header><h2>Projects by status</h2></header>
        ${total ? html`<ul class="list status-list">${d.projects_by_status.map((s) => html`<li>${chip(s.status)}<progress max="${total}" value="${s.n}"></progress><strong>${s.n}</strong></li>`)}</ul>` : html`<p class="muted">No projects yet.</p>`}
      </section>
    </div>
    <section class="card" style="margin-top:16px"><header><h2>Recent activity</h2></header>${activityList(d.recent_activity)}</section>`);
  actions(view, { 'new-client': () => newClient(), 'new-project': () => newProject() });
}

/* ---------------- clients ---------------- */
async function clientsView(view) {
  const f = { q: '', status: '', archived: false };
  show(view, html`
    <header class="page-head"><div><h1>Clients</h1><p class="muted">Everyone you work with, in one place.</p></div><div class="actions"><button class="btn primary" data-action="new">+ New client</button></div></header>
    <div class="toolbar">
      <label class="sr-only" for="q">Search clients</label><input id="q" type="search" placeholder="Search name, email, VAT, city…">
      <label class="sr-only" for="st">Status</label><select id="st"><option value="">All statuses</option>${CLIENT_STATUS.map(([k, t]) => html`<option value="${k}">${t}</option>`)}</select>
      <label class="check"><input type="checkbox" id="arch"> Show archived</label>
    </div>
    <div class="table-wrap" id="table"></div>`);
  const load = async () => {
    const qs = new URLSearchParams({ ...(f.q && { q: f.q }), ...(f.status && { status: f.status }), ...(f.archived && { archived: 'true' }) });
    const { clients } = await get(`/clients?${qs}`);
    show($('#table'), clients.length ? html`<table><thead><tr><th>Company</th><th>Contact</th><th>Status</th><th>Language</th><th>Projects</th></tr></thead><tbody>
      ${clients.map((c) => html`<tr class="link" data-href="#/clients/${c.id}"><td><strong>${c.company_name}</strong>${c.archived_at ? html` <span class="chip">Archived</span>` : ''}<span class="sub">${[c.city, c.vat_number].filter(Boolean).join(' · ')}</span></td><td>${c.primary_contact || '—'}<span class="sub">${c.email || ''}</span></td><td>${chip(c.status)}</td><td>${label(c.language)}</td><td>${c.project_count}</td></tr>`)}
      </tbody></table>` : html`<div class="empty">No clients found. Try a different search, or add your first client.</div>`);
  };
  let timer;
  $('#q').oninput = (e) => { clearTimeout(timer); timer = setTimeout(() => { f.q = e.target.value.trim(); load(); }, 250); };
  $('#st').onchange = (e) => { f.status = e.target.value; load(); };
  $('#arch').onchange = (e) => { f.archived = e.target.checked; load(); };
  actions(view, { new: () => newClient() });
  await load();
}

async function clientView(view, id) {
  const d = await get(`/clients/${id}`);
  const c = d.client;
  const detail = (k, v) => (v ? html`<dt>${k}</dt><dd>${v}</dd>` : '');
  show(view, html`
    <a class="back" href="#/clients">← All clients</a>
    <header class="page-head"><div><h1>${c.company_name}</h1><p>${chip(c.status)} ${c.archived_at ? chip('inactive') : ''} <span class="muted">${label(c.language)} · client since ${date(c.created_at)}</span></p></div>
      <div class="actions"><button class="btn" data-action="edit">Edit</button><button class="btn primary" data-action="new-project">+ New project</button>
        ${c.archived_at ? html`<button class="btn" data-action="restore">Restore</button>` : html`<button class="btn danger" data-action="archive">Archive</button>`}</div></header>
    <div class="grid two">
      <div class="stack">
        <section class="card"><header><h2>Company</h2></header><dl class="details">
          ${detail('VAT number', c.vat_number)}${detail('Company no.', c.company_number)}${detail('Email', c.email && html`<a href="mailto:${c.email}">${c.email}</a>`)}${detail('Phone', c.phone)}
          ${detail('Website', c.website && html`<a href="${c.website}" target="_blank" rel="noopener noreferrer">${c.website}</a>`)}
          ${detail('Address', [c.address_line1, [c.postal_code, c.city].filter(Boolean).join(' '), c.country].filter(Boolean).join(', '))}
        </dl></section>
        <section class="card"><header><h2>Contacts</h2><button class="btn small" data-action="add-contact">+ Add</button></header>
          ${d.contacts.length ? html`<ul class="list">${d.contacts.map((k) => html`<li><span class="grow"><strong>${k.name}</strong> ${k.is_primary ? html`<span class="chip s-active">Primary</span>` : ''}<span class="sub">${[k.role, k.email, k.phone].filter(Boolean).join(' · ')}</span></span>
            <span class="row-actions"><button class="btn small" data-action="edit-contact" data-id="${k.id}">Edit</button><button class="btn small danger" data-action="delete-contact" data-id="${k.id}">Remove</button></span></li>`)}</ul>` : html`<p class="muted">No contacts yet.</p>`}
        </section>
        <section class="card"><header><h2>Client portal access</h2><button class="btn small primary" data-action="invite" ${c.archived_at ? 'disabled' : ''}>+ Invite contact</button></header>
          <p class="muted">Invitation links are one-time and expire after 7 days. Share them with the client yourself.</p>
          ${d.accounts.length ? html`<ul class="list">${d.accounts.map((account) => html`<li><span class="grow"><strong>${account.name}</strong><span class="sub">${account.email} · ${account.active ? 'Portal access active' : 'Access revoked'}</span></span>
            ${account.active ? html`<button class="btn small danger" data-action="revoke-access" data-id="${account.id}">Revoke</button>` : chip('inactive')}</li>`)}</ul>` : html`<p class="muted" style="margin-top:12px">No client logins yet.</p>`}
        </section>
        <section class="card"><header><h2>Activity</h2></header>${activityList(d.activity)}</section>
      </div>
      <div class="stack">
        <section class="card"><header><h2>Projects</h2><button class="btn small" data-action="new-project">+ New</button></header>
          ${d.projects.length ? html`<ul class="list">${d.projects.map((p) => html`<li><span class="grow"><a href="#/projects/${p.id}"><strong>${p.name}</strong></a>${p.archived_at ? html` <span class="chip">Archived</span>` : ''}<span class="sub">${p.category || ''}${p.target_date ? ` · target ${date(p.target_date)}` : ''}</span></span>${chip(p.status)}</li>`)}</ul>` : html`<p class="muted">No projects yet.</p>`}
        </section>
        <section class="card"><header><h2>Notes</h2></header>
          <form class="note-form" id="note-form"><label class="sr-only" for="note-body">New note</label><textarea id="note-body" placeholder="Add a private note about this client…" maxlength="4000"></textarea><label class="check"><input type="checkbox" id="note-visible"> Share this update with the client</label><button class="btn small">Add note</button></form>
          ${d.notes.map((n) => html`<div class="note ${n.pinned ? 'pinned' : ''}"><p>${n.body}</p><div class="meta"><span>${n.author_name || 'Someone'} · ${ago(n.created_at)} · ${n.client_visible ? 'Visible to client' : 'Private'}</span><span class="row-actions"><button class="btn small ghost" data-action="toggle-note-visibility" data-id="${n.id}" data-visible="${n.client_visible}">${n.client_visible ? 'Make private' : 'Share with client'}</button><button class="btn small ghost" data-action="pin-note" data-id="${n.id}" data-pinned="${n.pinned}">${n.pinned ? 'Unpin' : 'Pin'}</button><button class="btn small ghost" data-action="delete-note" data-id="${n.id}">Delete</button></span></div></div>`)}
        </section>
      </div>
    </div>`);
  const reload = () => clientView(view, id);
  const contact = (id2) => d.contacts.find((k) => k.id === id2);
  $('#note-form').onsubmit = async (e) => {
    e.preventDefault();
    const body = $('#note-body').value.trim();
    if (!body) return;
    try { await post('/notes', { client_id: id, body, client_visible: $('#note-visible').checked }); reload(); } catch (err) { toast(err.message, 'error'); }
  };
  actions(view, {
    edit: () => openForm({ title: 'Edit client', fields: clientFields, values: c, onSubmit: async (v) => { await patch(`/clients/${id}`, v); toast('Saved'); reload(); } }),
    archive: async () => { if (confirm('Archive this client? Their data is kept and can be restored.')) { await post(`/clients/${id}/archive`); toast('Client archived'); reload(); } },
    restore: async () => { await post(`/clients/${id}/restore`); toast('Client restored'); reload(); },
    invite: () => {
      const choices = d.contacts.filter((k) => k.email).map((k) => [k.email, `${k.name} · ${k.email}`]);
      if (!choices.length) { toast('Add a contact with an email address first', 'error'); return; }
      openForm({
        title: 'Invite client contact',
        fields: [{ name: 'email', label: 'Contact email', type: 'select', options: choices, required: true, full: true }],
        submit: 'Create invitation',
        onSubmit: async ({ email }) => {
          const invitation = await post(`/clients/${id}/invitations`, { email });
          toast('Invitation link created');
          setTimeout(() => showCopyLink({
            title: 'Invitation link created',
            description: 'Copy this one-time link and send it to the client yourself. It expires in 7 days. The link is not sent by email.',
            url: invitation.invitation_url
          }), 0);
        }
      });
    },
    'revoke-access': async (_, userId) => {
      if (!confirm('Revoke this client account’s access immediately?')) return;
      await post(`/clients/${id}/access/revoke`, { user_id: userId });
      toast('Client access revoked');
      reload();
    },
    'new-project': () => newProject(reload, id),
    'add-contact': () => openForm({ title: 'Add contact', fields: contactFields, values: { is_primary: !d.contacts.length }, submit: 'Add contact', onSubmit: async (v) => { await post(`/clients/${id}/contacts`, v); reload(); } }),
    'edit-contact': (_, cid) => openForm({ title: 'Edit contact', fields: contactFields, values: contact(cid), onSubmit: async (v) => { await patch(`/contacts/${cid}`, v); reload(); } }),
    'delete-contact': async (_, cid) => { if (confirm('Remove this contact?')) { await del(`/contacts/${cid}`); reload(); } },
    'pin-note': async (el, nid) => { await patch(`/notes/${nid}`, { pinned: el.dataset.pinned !== 'true' }); reload(); },
    'toggle-note-visibility': async (el, nid) => { await patch(`/notes/${nid}`, { client_visible: el.dataset.visible !== 'true' }); reload(); },
    'delete-note': async (_, nid) => { if (confirm('Delete this note?')) { await del(`/notes/${nid}`); reload(); } }
  });
}

/* ---------------- projects ---------------- */
async function projectsView(view) {
  const f = { q: '', status: '', archived: false };
  show(view, html`
    <header class="page-head"><div><h1>Projects</h1><p class="muted">What's in motion, and what's next.</p></div><div class="actions"><button class="btn primary" data-action="new">+ New project</button></div></header>
    <div class="toolbar">
      <label class="sr-only" for="q">Search projects</label><input id="q" type="search" placeholder="Search project or client…">
      <label class="sr-only" for="st">Status</label><select id="st"><option value="">All statuses</option>${PROJECT_STATUS.map(([k, t]) => html`<option value="${k}">${t}</option>`)}</select>
      <label class="check"><input type="checkbox" id="arch"> Show archived</label>
    </div>
    <div class="table-wrap" id="table"></div>`);
  const load = async () => {
    const qs = new URLSearchParams({ ...(f.q && { q: f.q }), ...(f.status && { status: f.status }), ...(f.archived && { archived: 'true' }) });
    const { projects } = await get(`/projects?${qs}`);
    show($('#table'), projects.length ? html`<table><thead><tr><th>Project</th><th>Client</th><th>Status</th><th>Progress</th><th>Target</th></tr></thead><tbody>
      ${projects.map((p) => html`<tr class="link" data-href="#/projects/${p.id}"><td><strong>${p.name}</strong>${p.archived_at ? html` <span class="chip">Archived</span>` : ''}<span class="sub">${p.next_step ? `Next: ${p.next_step}` : p.category || ''}</span></td><td>${p.company_name}</td><td>${chip(p.status)}</td><td><div class="prog"><progress max="100" value="${p.progress}"></progress>${p.progress}%</div></td><td>${date(p.target_date) || '—'}</td></tr>`)}
      </tbody></table>` : html`<div class="empty">No projects found.</div>`);
  };
  let timer;
  $('#q').oninput = (e) => { clearTimeout(timer); timer = setTimeout(() => { f.q = e.target.value.trim(); load(); }, 250); };
  $('#st').onchange = (e) => { f.status = e.target.value; load(); };
  $('#arch').onchange = (e) => { f.archived = e.target.checked; load(); };
  actions(view, { new: () => newProject() });
  await load();
}

async function projectView(view, id) {
  const d = await get(`/projects/${id}`);
  const p = d.project;
  const done = d.milestones.filter((m) => m.status === 'done').length;
  show(view, html`
    <a class="back" href="#/clients/${p.client_id}">← ${p.company_name}</a>
    <header class="page-head"><div><h1>${p.name}</h1><p>${chip(p.status)} ${p.archived_at ? html`<span class="chip">Archived</span>` : ''} <span class="muted">${p.category || 'Project'}${p.target_date ? ` · target ${date(p.target_date)}` : ''}</span></p></div>
      <div class="actions"><button class="btn" data-action="edit">Edit</button>
        ${p.archived_at ? html`<button class="btn" data-action="restore">Restore</button>` : html`<button class="btn danger" data-action="archive">Archive</button>`}</div></header>
    <div class="grid two">
      <div class="stack">
        <section class="card"><header><h2>Status</h2></header>
          <div class="prog" style="margin-bottom:14px"><progress max="100" value="${p.progress}"></progress><strong>${p.progress}%</strong></div>
          <div class="form-grid">
            <label class="field"><span>Stage</span><select id="quick-status">${PROJECT_STATUS.map(([k, t]) => html`<option value="${k}" ${k === p.status ? 'selected' : ''}>${t}</option>`)}</select></label>
            <label class="field"><span>Progress (%)</span><input id="quick-progress" type="number" min="0" max="100" value="${p.progress}"></label>
            <label class="field full"><span>Next step</span><input id="quick-next" value="${p.next_step}" maxlength="240"></label>
          </div>
          <p style="margin-top:12px"><button class="btn small primary" data-action="quick-save">Save changes</button></p>
          ${p.description ? html`<p class="muted" style="margin-top:14px;white-space:pre-wrap">${p.description}</p>` : ''}
        </section>
        <section class="card"><header><h2>Milestones <span class="muted">${done}/${d.milestones.length}</span></h2><button class="btn small" data-action="add-milestone">+ Add</button></header>
          ${d.milestones.length ? html`<ul class="list">${d.milestones.map((m) => html`<li class="milestone ${m.status}"><button class="state" data-action="cycle-milestone" data-id="${m.id}" data-status="${m.status}" aria-label="Status: ${label(m.status)}. Click to change">${m.status === 'done' ? '✓' : m.status === 'doing' ? '•' : ''}</button><span class="grow"><span class="title">${m.title}</span><span class="sub">${m.due_date ? `Due ${date(m.due_date)}` : 'No due date'} · ${label(m.status)}</span></span><span class="row-actions"><button class="btn small" data-action="edit-milestone" data-id="${m.id}">Edit</button><button class="btn small danger" data-action="delete-milestone" data-id="${m.id}">✕</button></span></li>`)}</ul>` : html`<p class="muted">No milestones yet. Break the project into steps your client can follow.</p>`}
        </section>
      </div>
      <div class="stack">
        <section class="card"><header><h2>Notes</h2></header>
          <form class="note-form" id="note-form"><label class="sr-only" for="note-body">New note</label><textarea id="note-body" placeholder="Add a private note about this project…" maxlength="4000"></textarea><label class="check"><input type="checkbox" id="note-visible"> Share this update with the client</label><button class="btn small">Add note</button></form>
          ${d.notes.map((n) => html`<div class="note ${n.pinned ? 'pinned' : ''}"><p>${n.body}</p><div class="meta"><span>${n.author_name || 'Someone'} · ${ago(n.created_at)} · ${n.client_visible ? 'Visible to client' : 'Private'}</span><span class="row-actions"><button class="btn small ghost" data-action="toggle-note-visibility" data-id="${n.id}" data-visible="${n.client_visible}">${n.client_visible ? 'Make private' : 'Share with client'}</button><button class="btn small ghost" data-action="pin-note" data-id="${n.id}" data-pinned="${n.pinned}">${n.pinned ? 'Unpin' : 'Pin'}</button><button class="btn small ghost" data-action="delete-note" data-id="${n.id}">Delete</button></span></div></div>`)}
        </section>
        <section class="card"><header><h2>Activity</h2></header>${activityList(d.activity)}</section>
      </div>
    </div>`);
  const reload = () => projectView(view, id);
  const NEXT = { todo: 'doing', doing: 'done', done: 'todo' };
  $('#note-form').onsubmit = async (e) => {
    e.preventDefault();
    const body = $('#note-body').value.trim();
    if (!body) return;
    try { await post('/notes', { project_id: id, body, client_visible: $('#note-visible').checked }); reload(); } catch (err) { toast(err.message, 'error'); }
  };
  actions(view, {
    'quick-save': async () => {
      await patch(`/projects/${id}`, { status: $('#quick-status').value, progress: Number($('#quick-progress').value), next_step: $('#quick-next').value });
      toast('Project updated'); reload();
    },
    edit: () => openForm({ title: 'Edit project', fields: projectFields(null), values: p, onSubmit: async (v) => { await patch(`/projects/${id}`, v); toast('Saved'); reload(); } }),
    archive: async () => { if (confirm('Archive this project?')) { await post(`/projects/${id}/archive`); reload(); } },
    restore: async () => { await post(`/projects/${id}/restore`); reload(); },
    'add-milestone': () => openForm({ title: 'Add milestone', fields: milestoneFields, submit: 'Add', onSubmit: async (v) => { await post(`/projects/${id}/milestones`, v); reload(); } }),
    'edit-milestone': (_, mid) => openForm({ title: 'Edit milestone', fields: milestoneFields, values: d.milestones.find((m) => m.id === mid), onSubmit: async (v) => { await patch(`/milestones/${mid}`, v); reload(); } }),
    'cycle-milestone': async (el, mid) => { await patch(`/milestones/${mid}`, { status: NEXT[el.dataset.status] }); reload(); },
    'delete-milestone': async (_, mid) => { if (confirm('Delete this milestone?')) { await del(`/milestones/${mid}`); reload(); } },
    'pin-note': async (el, nid) => { await patch(`/notes/${nid}`, { pinned: el.dataset.pinned !== 'true' }); reload(); },
    'toggle-note-visibility': async (el, nid) => { await patch(`/notes/${nid}`, { client_visible: el.dataset.visible !== 'true' }); reload(); },
    'delete-note': async (_, nid) => { if (confirm('Delete this note?')) { await del(`/notes/${nid}`); reload(); } }
  });
}

/* ---------------- quotes ---------------- */
function quoteLineHtml(item = {}) {
  return html`<div class="quote-line" data-quote-line>
    <label class="field"><span>Description</span><input data-item="description" value="${item.description ?? ''}" maxlength="240" required></label>
    <label class="field"><span>Quantity</span><input data-item="quantity" type="number" min="0.01" max="10000" step="0.01" value="${item.quantity ?? 1}" required></label>
    <label class="field"><span>Unit price (€)</span><input data-item="unit_price" type="number" min="0" max="1000000" step="0.01" value="${item.unit_price ?? 0}" required></label>
    <label class="field"><span>VAT %</span><input data-item="vat_rate" type="number" min="0" max="100" step="0.01" value="${item.vat_rate ?? 21}" required></label>
    <button type="button" class="btn small danger" data-remove-line aria-label="Remove line item">Remove</button>
  </div>`;
}

async function showQuoteForm(quote = null) {
  let clients = (await get('/clients')).clients;
  if (quote && !clients.some((client) => client.id === quote.client_id)) {
    clients = [{ id: quote.client_id, company_name: quote.company_name }, ...clients];
  }
  if (!clients.length) { toast('Create a client first', 'error'); return; }
  const items = quote?.items?.length ? quote.items : [{ description: '', quantity: 1, unit_price: 0, vat_rate: 21 }];
  const dlg = $('#modal');
  const clientOptions = clients.map((client) => html`<option value="${client.id}" ${Number(client.id) === Number(quote?.client_id) ? 'selected' : ''}>${client.company_name}</option>`);
  show(dlg, html`<form class="modal-form quote-modal">
    <header><h2>${quote ? 'Edit draft quote' : 'New quote'}</h2><button type="button" class="icon-btn" data-close aria-label="Close">×</button></header>
    <div class="form-grid">
      <label class="field full"><span>Client *</span><select name="client_id" required>${clientOptions}</select></label>
      <label class="field full"><span>Title *</span><input name="title" maxlength="160" value="${quote?.title ?? ''}" required></label>
      <label class="field"><span>Valid until</span><input name="valid_until" type="date" value="${quote?.valid_until ?? ''}"></label>
      <label class="field full"><span>Introduction</span><textarea name="introduction" maxlength="2000">${quote?.introduction ?? ''}</textarea></label>
      <label class="field full"><span>Terms</span><textarea name="terms" maxlength="4000">${quote?.terms ?? ''}</textarea></label>
    </div>
    <section><header class="line-head"><h3>Line items</h3><button type="button" class="btn small" id="add-quote-line">+ Add item</button></header>
      <div id="quote-lines">${items.map((item) => quoteLineHtml(item))}</div></section>
    <p class="form-error" role="alert"></p>
    <footer><button type="button" class="btn" data-close>Cancel</button><button class="btn primary">${quote ? 'Save draft' : 'Create draft'}</button></footer>
  </form>`);
  const form = $('form', dlg);
  const lines = $('#quote-lines', form);
  dlg.onclick = (event) => {
    if (event.target.closest('[data-close]') || event.target === dlg) dlg.close();
    if (event.target.closest('#add-quote-line')) lines.append(quoteLineHtml({ quantity: 1, unit_price: 0, vat_rate: 21 }).s);
    if (event.target.closest('[data-remove-line]')) {
      if (lines.children.length === 1) return toast('A quote needs at least one item', 'error');
      event.target.closest('[data-quote-line]').remove();
    }
  };
  form.onsubmit = async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const button = $('button.primary', form);
    button.disabled = true;
    $('.form-error', form).textContent = '';
    const payload = {
      client_id: Number(form.elements.client_id.value),
      title: form.elements.title.value,
      valid_until: form.elements.valid_until.value || null,
      introduction: form.elements.introduction.value,
      terms: form.elements.terms.value,
      items: [...lines.querySelectorAll('[data-quote-line]')].map((row) => ({
        description: $('[data-item="description"]', row).value,
        quantity: Number($('[data-item="quantity"]', row).value),
        unit_price: Number($('[data-item="unit_price"]', row).value),
        vat_rate: Number($('[data-item="vat_rate"]', row).value)
      }))
    };
    try {
      const result = quote
        ? await patch(`/quotes/${quote.id}`, payload)
        : await post('/quotes', payload);
      dlg.close();
      toast(quote ? 'Draft quote updated' : 'Draft quote created');
      location.hash = `#/quotes/${result.quote.id}`;
    } catch (error) {
      $('.form-error', form).textContent = error.message;
      button.disabled = false;
    }
  };
  dlg.showModal();
}

const quoteMoney = (cents) => new Intl.NumberFormat('en-BE', { style: 'currency', currency: 'EUR' }).format(Number(cents) / 100);

async function quotesView(view) {
  const { quotes } = await get('/quotes');
  show(view, html`<header class="page-head"><div><h1>Quotes</h1><p class="muted">Prepare offers, share them in the client portal, and track decisions.</p></div>
    <button class="btn primary" data-action="new">+ New quote</button></header>
    <div class="table-wrap">${quotes.length ? html`<table><thead><tr><th>Quote</th><th>Client</th><th>Status</th><th>Valid until</th><th>Total</th></tr></thead><tbody>
      ${quotes.map((quote) => html`<tr class="link" data-href="#/quotes/${quote.id}"><td><strong>${quote.quote_number}</strong><span class="sub">${quote.title}</span></td><td>${quote.company_name}</td><td>${chip(quote.display_status)}</td><td>${date(quote.valid_until) || '—'}</td><td>${quoteMoney(quote.total_cents)}</td></tr>`)}</tbody></table>` : html`<div class="empty">No quotes yet. Create a draft quote for a client.</div>`}</div>`);
  actions(view, { new: () => showQuoteForm() });
}

async function quoteView(view, id) {
  const { quote } = await get(`/quotes/${id}`);
  const isDraft = quote.status === 'draft';
  const subtotal = quoteMoney(quote.subtotal_cents);
  const vat = quoteMoney(quote.vat_cents);
  const total = quoteMoney(quote.total_cents);
  show(view, html`<a class="back" href="#/quotes">← All quotes</a>
    <header class="page-head"><div><h1>${quote.quote_number}</h1><p>${quote.title} · ${chip(quote.display_status)} <span class="muted">for ${quote.company_name}</span></p></div>
      <div class="actions">${isDraft ? html`<button class="btn" data-action="edit">Edit draft</button><button class="btn primary" data-action="send">Share with client</button>` :
        html`<button class="btn" data-action="share">Copy portal link</button>`}</div></header>
    <div class="grid two">
      <section class="card"><header><h2>Quote details</h2></header><dl class="details"><dt>Valid until</dt><dd>${date(quote.valid_until) || 'No expiry'}</dd><dt>Created</dt><dd>${date(quote.created_at)}</dd>
        ${quote.sent_at ? html`<dt>Shared</dt><dd>${date(quote.sent_at)}</dd>` : ''}${quote.decision_at ? html`<dt>Client decision</dt><dd>${quote.display_status} · ${date(quote.decision_at)}</dd>` : ''}</dl>
        ${quote.decision_note ? html`<p class="notice" style="margin-top:14px">Client message: ${quote.decision_note}</p>` : ''}</section>
      <section class="card"><header><h2>${quote.company_name}</h2></header>${quote.introduction ? html`<p style="white-space:pre-wrap">${quote.introduction}</p>` : html`<p class="muted">No introduction.</p>`}</section>
    </div>
    <section class="card" style="margin-top:16px"><header><h2>Line items</h2></header>
      <div class="table-wrap"><table><thead><tr><th>Description</th><th>Quantity</th><th>Unit price</th><th>VAT</th><th>Amount incl. VAT</th></tr></thead><tbody>
        ${quote.items.map((item) => html`<tr><td>${item.description}</td><td>${item.quantity}</td><td>${quoteMoney(Math.round(Number(item.unit_price) * 100))}</td><td>${item.vat_rate}%</td><td>${quoteMoney(Math.round(Number(item.quantity) * Number(item.unit_price) * 100) + Math.round(Number(item.quantity) * Number(item.unit_price) * Number(item.vat_rate)))}</td></tr>`)}</tbody></table></div>
      <dl class="details quote-totals"><dt>Subtotal</dt><dd>${subtotal}</dd><dt>VAT</dt><dd>${vat}</dd><dt><strong>Total</strong></dt><dd><strong>${total}</strong></dd></dl>
      ${quote.terms ? html`<h3 style="margin-top:24px">Terms</h3><p style="white-space:pre-wrap">${quote.terms}</p>` : ''}</section>`);
  actions(view, {
    edit: () => showQuoteForm(quote),
    send: async () => {
      if (!confirm('Share this quote with the client in their portal? They will be able to accept or decline it.')) return;
      await post(`/quotes/${id}/send`);
      toast('Quote shared in the client portal');
      showCopyLink({
        title: 'Quote shared',
        description: 'The quote is now visible in the client portal. Copy this link and send it to the client; email is not configured.',
        url: `${location.origin}/portal/#quote-${id}`
      });
      quoteView(view, id);
    },
    share: () => showCopyLink({
      title: 'Client portal link',
      description: 'Copy this link and send it to the client. They must sign in to view the quote.',
      url: `${location.origin}/portal/#quote-${id}`
    })
  });
}

/* ---------------- leads ---------------- */
async function leadsView(view, _, filter = '') {
  const LEAD_TABS = [['', 'All'], ['new', 'New'], ['contacted', 'Contacted'], ['qualified', 'Qualified'], ['converted', 'Converted'], ['lost', 'Lost']];
  const { leads } = await get(`/leads${filter ? `?status=${filter}` : ''}`);
  show(view, html`
    <header class="page-head"><div><h1>Leads</h1><p class="muted">Messages from the contact form on your website.</p></div></header>
    <div class="tabs" role="group" aria-label="Filter leads">${LEAD_TABS.map(([k, t]) => html`<button class="tab" data-action="tab" data-filter="${k}" aria-pressed="${k === filter}">${t}</button>`)}</div>
    <div class="stack">${leads.length ? leads.map((l) => html`<article class="card lead">
      <div class="lead-head"><div><strong>${l.name}</strong> ${chip(l.status)} <span class="chip">${label(l.language)}</span><br><span class="muted"><a href="mailto:${l.email}">${l.email}</a>${l.company ? ` · ${l.company}` : ''} · ${ago(l.created_at)}</span></div>
        <div class="row-actions">
          ${l.status === 'converted' ? html`<a class="btn small" href="#/clients/${l.client_id}">Open client</a>` : html`
            <select aria-label="Lead status" data-action-change="status" data-id="${l.id}">${['new', 'contacted', 'qualified', 'lost'].map((s) => html`<option value="${s}" ${s === l.status ? 'selected' : ''}>${label(s)}</option>`)}</select>
            <button class="btn small primary" data-action="convert" data-id="${l.id}">Convert to client</button>`}
          <a class="btn small" href="mailto:${l.email}?subject=${encodeURIComponent('Re: your message to Make It So')}">Reply</a>
          <button class="btn small danger" data-action="delete" data-id="${l.id}">Delete</button>
        </div></div>
      <p class="msg">${l.message}</p></article>`) : html`<div class="card empty">No leads here yet. When someone uses the contact form on your website, it shows up here.</div>`}</div>`);
  view.onchange = async (e) => {
    const sel = e.target.closest('[data-action-change="status"]');
    if (!sel) return;
    try { await patch(`/leads/${sel.dataset.id}`, { status: sel.value }); toast('Lead updated'); leadsView(view, null, filter); refreshBadge(); } catch (err) { toast(err.message, 'error'); }
  };
  actions(view, {
    tab: (el) => leadsView(view, null, el.dataset.filter),
    convert: async (_, id) => { if (confirm('Create a client (with contact and note) from this lead?')) { const { client } = await post(`/leads/${id}/convert`); toast('Client created'); refreshBadge(); location.hash = `#/clients/${client.id}`; } },
    delete: async (_, id) => { if (confirm('Delete this lead permanently?')) { await del(`/leads/${id}`); toast('Lead deleted'); leadsView(view, null, filter); refreshBadge(); } }
  });
}

/* ---------------- account ---------------- */
async function accountView(view) {
  show(view, html`
    <header class="page-head"><div><h1>Account</h1><p class="muted">${state.user.name} · ${state.user.email}</p></div></header>
    <div class="grid two">
      <section class="card"><header><h2>Change password</h2></header>
        <form id="pw" class="stack" novalidate>
          <label class="field"><span>Current password</span><input name="current" type="password" autocomplete="current-password" required></label>
          <label class="field"><span>New password</span><input name="next" type="password" autocomplete="new-password" minlength="12" required><small>At least 12 characters. A passphrase of a few random words works well.</small></label>
          <p class="form-error" role="alert"></p>
          <div><button class="btn primary">Update password</button></div>
        </form>
        <p class="muted" style="margin-top:12px">Changing your password signs out all your other sessions.</p>
      </section>
      <section class="card"><header><h2>Security</h2></header>
        <ul class="list"><li><span class="grow"><strong>Two-factor authentication</strong><span class="sub">Required for all admins</span></span><span class="chip s-active">On</span></li>
          <li><span class="grow"><strong>Sessions</strong><span class="sub">Automatically signed out after 2 hours of inactivity</span></span></li></ul>
        <p class="muted" style="margin-top:12px">Lost your phone and recovery codes? Ask whoever runs the server to reset two-factor for your account.</p>
      </section>
    </div>`);
  const form = $('#pw');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const err = $('.form-error', form);
    err.textContent = '';
    try {
      await post('/auth/password', { current_password: form.current.value, new_password: form.next.value });
      form.reset(); toast('Password updated');
    } catch (ex) { err.textContent = ex.message; }
  };
}

boot();

// Make It So admin. Plain JavaScript, no build step. Every value is escaped by the html`` template.
import { setLanguage, translateMarkup, translateText } from './i18n.js';

/* ---------------- tiny helpers ---------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
const fmt = (x) => (x instanceof Raw ? x.s : Array.isArray(x) ? x.map(fmt).join('') : esc(x));
let htmlSlotId = 0;
const html = (strings, ...vals) => {
  const slots = [];
  const markup = strings.reduce((out, part, index) => {
    if (index >= vals.length) return out + part;
    const token = `__MIS_SLOT_${htmlSlotId++}__`;
    slots.push([token, fmt(vals[index])]);
    return out + part + token;
  }, '');
  let localized = translateMarkup(markup);
  for (const [token, value] of slots) localized = localized.split(token).join(value);
  return new Raw(localized);
};
const raw = (s) => new Raw(s);
const show = (el, tpl) => {
  el.innerHTML = tpl.s;
  const wrappers = [...(el.matches?.('.table-wrap') ? [el] : []), ...el.querySelectorAll('.table-wrap')];
  for (const wrapper of wrappers) {
    const table = wrapper.querySelector('table');
    if (!table) continue;
    wrapper.tabIndex = 0;
    if (!wrapper.querySelector('.table-hint')) {
      const hint = document.createElement('span');
      hint.className = 'table-hint';
      hint.textContent = translateText('Swipe horizontally to see more →');
      wrapper.insertBefore(hint, table);
    }
    const lastHeading = table.querySelector('thead tr')?.lastElementChild?.textContent.trim().toLowerCase();
    if (lastHeading === 'actions' || lastHeading === 'acties') wrapper.classList.add('has-actions');
  }
};

const date = (d) => (d ? new Date(`${String(d).slice(0, 10)}T12:00:00`).toLocaleDateString(state.language === 'en' ? 'en-GB' : 'nl-BE', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
function ago(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return state.language === 'nl' ? 'zojuist' : 'just now';
  if (s < 3600) return state.language === 'nl' ? `${Math.floor(s / 60)} min geleden` : `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return state.language === 'nl' ? `${Math.floor(s / 3600)} u geleden` : `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86400) return state.language === 'nl' ? `${Math.floor(s / 86400)} d geleden` : `${Math.floor(s / 86400)} d ago`;
  return date(iso);
}

const LABEL = {
  prospect: 'Prospect', active: 'Active', inactive: 'Inactive',
  discovery: 'Discovery', wireframing: 'Wireframing', development: 'Development', review: 'Review', launched: 'Launched', on_hold: 'On hold',
  todo: 'To do', doing: 'Doing', done: 'Done',
  in_progress: 'In progress', in_review: 'In review', blocked: 'Blocked',
  new: 'New', contacted: 'Contacted', qualified: 'Qualified', converted: 'Converted', lost: 'Lost',
  draft: 'Draft', issued: 'Issued', paid: 'Paid', overdue: 'Overdue', void: 'Void',
  open: 'Open', in_progress: 'In progress', waiting_client: 'Waiting for client', resolved: 'Resolved', closed: 'Closed',
  low: 'Low', normal: 'Normal', high: 'High', urgent: 'Urgent',
  monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly',
  sent: 'Awaiting client', approved: 'Approved', changes_requested: 'Changes requested', withdrawn: 'Withdrawn',
  nl: 'Nederlands', fr: 'Français', en: 'English'
};
const label = (k) => translateText(LABEL[k] ?? k);
const chip = (k) => html`<span class="chip s-${k}">${label(k)}</span>`;
const options = (keys) => keys.map((k) => [k, label(k)]);
const CLIENT_STATUS = options(['prospect', 'active', 'inactive']);
const PROJECT_STATUS = options(['discovery', 'wireframing', 'development', 'review', 'launched', 'on_hold']);
const LANGUAGES = options(['nl', 'fr', 'en']);
const WORK_ITEM_STATUS = options(['todo', 'in_progress', 'in_review', 'done', 'blocked']);
const PRIORITIES = options(['low', 'normal', 'high', 'urgent']);

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
    const err = new Error(translateText(data?.error || `Request failed (${res.status})`));
    err.status = res.status; err.code = data?.code; err.field = data?.field;
    throw err;
  }
  return data;
}
const get = (p) => api('GET', p);
const post = (p, b = {}) => api('POST', p, b);
const put = (p, b) => api('PUT', p, b);
const patch = (p, b = {}) => api('PATCH', p, b);
const del = (p) => api('DELETE', p);

/* ---------------- toast + modal ---------------- */
let toastTimer;
function toast(message, kind = '') {
  const t = $('#toast');
  t.textContent = translateText(message);
  t.className = `show ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = ''; }, 3200);
}

function fieldHtml(f, value) {
  const id = `f-${f.name}`;
  const fieldLabel = translateText(f.label);
  const v = value ?? f.default ?? '';
  let control;
  if (f.type === 'select') {
    control = html`<select id="${id}" name="${f.name}">${f.options.map(([val, text]) => html`<option value="${val}" ${String(val) === String(v) ? 'selected' : ''}>${text}</option>`)}</select>`;
  } else if (f.type === 'textarea') {
    control = html`<textarea id="${id}" name="${f.name}" rows="${f.rows || 4}" maxlength="${f.max || 4000}">${v}</textarea>`;
  } else if (f.type === 'checkbox') {
    return html`<label class="check full" for="${id}"><input type="checkbox" id="${id}" name="${f.name}" ${v ? 'checked' : ''}> ${fieldLabel}</label>`;
  } else {
    control = html`<input id="${id}" name="${f.name}" type="${f.type || 'text'}" value="${v}" ${f.required ? 'required' : ''} ${f.min !== undefined ? html`min="${f.min}"` : ''} ${f.max !== undefined && f.type === 'number' ? html`max="${f.max}"` : ''} ${f.step !== undefined ? html`step="${f.step}"` : ''} autocomplete="off">`;
  }
  return html`<label class="field ${f.full ? 'full' : ''}" for="${id}"><span>${fieldLabel}${f.required ? ' *' : ''}</span>${control}${f.hint ? html`<small>${translateText(f.hint)}</small>` : ''}</label>`;
}

// Opens a form in a dialog. `onSubmit(values)` should throw to show an error message.
function openForm({ title, fields, values = {}, submit = 'Save', onSubmit }) {
  const dlg = $('#modal');
  show(dlg, html`<form class="modal-form" novalidate>
    <header><h2>${translateText(title)}</h2><button type="button" class="icon-btn" data-close aria-label="Close">×</button></header>
    <div class="form-grid">${fields.map((f) => fieldHtml(f, values[f.name]))}</div>
    <p class="form-error" role="alert"></p>
    <footer><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">${translateText(submit)}</button></footer>
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
    <header><h2>${translateText(title)}</h2><button type="button" class="icon-btn" data-close aria-label="Close">×</button></header>
    <p class="muted">${translateText(description)}</p>
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
const state = { user: null, auth: 'anonymous', leads: 0, language: 'nl', theme: readThemePreference() };
const brand = html`<span class="brand"><span class="mark"><svg width="18" height="18" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4l3 8.4L28 15l-9 2.6L16 26l-3-8.4L4 15l9-2.6z" fill="#ff6a1f"/></svg></span>${raw('<span class="word">make it so<em>.</em></span>')}<span class="tag">ADMIN</span></span>`;

function readThemePreference() {
  const theme = localStorage.getItem('makeitso.adminTheme');
  return ['mission-control', 'orbit-glass'].includes(theme) ? theme : 'classic';
}

async function boot() {
  try {
    const me = await get('/auth/me');
    state.user = me.user;
    state.auth = me.state;
    state.language = me.user?.admin_language === 'en' ? 'en' : 'nl';
    setLanguage(state.language);
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
  state.language = 'nl';
  setLanguage('nl');
  location.hash = '';
  loginScreen();
}

function applyThemePreference(event) {
  const next = event.target.value;
  if (!['classic', 'mission-control', 'orbit-glass'].includes(next)) return;
  try {
    localStorage.setItem('makeitso.adminTheme', next);
    state.theme = next;
    $('.shell').dataset.theme = next;
    document.documentElement.dataset.adminTheme = next;
  } catch (error) {
    event.target.value = state.theme;
    toast(error.message, 'error');
  }
}

const NAV_GROUPS = [
  ['Work', [['#/projects', 'Projects'], ['#/work', 'Current work'], ['#/maintenance', 'Maintenance'], ['#/timesheets', 'Timesheets'], ['#/tickets', 'Support']]],
  ['Clients', [['#/clients', 'Clients'], ['#/leads', 'Leads']]],
  ['Finances', [['#/quotes', 'Quotes'], ['#/invoices', 'Invoices'], ['#/contracts', 'Contracts']]],
  ['Settings', [['#/account', 'Account'], ['#/settings/email', 'Email settings']]]
];

function shell() {
  document.documentElement.dataset.adminTheme = state.theme;
  show(app, html`<div class="shell" data-theme="${state.theme}">
    <aside class="sidebar"><div class="brand-wrap">${brand}</div>
      <nav aria-label="Main">
        <a class="nav-link dashboard-link" href="#/" data-nav="#/"><span>${translateText('Dashboard')}</span></a>
        ${NAV_GROUPS.map(([group, links]) => html`<section class="nav-group"><h2>${translateText(group)}</h2>
          ${links.map(([href, text]) => html`<a class="nav-link" href="${href}" data-nav="${href}"><span>${translateText(text)}</span>${href === '#/leads' ? html`<span class="badge" id="lead-badge" hidden></span>` : ''}</a>`)}
        </section>`)}
      </nav>
      <div class="side-foot"><span class="muted">${state.user.name}</span>
        <div class="side-preferences">
        <label class="language-picker"><span>Language</span><select id="language-select" aria-label="Language"><option value="nl" ${state.language === 'nl' ? 'selected' : ''}>Nederlands</option><option value="en" ${state.language === 'en' ? 'selected' : ''}>English</option></select></label>
        <label class="language-picker theme-picker"><span>Theme</span><select id="theme-select" aria-label="Theme"><option value="classic" ${state.theme === 'classic' ? 'selected' : ''}>Classic</option><option value="mission-control" ${state.theme === 'mission-control' ? 'selected' : ''}>Mission Control</option><option value="orbit-glass" ${state.theme === 'orbit-glass' ? 'selected' : ''}>Orbit Glass</option></select></label>
        </div>
        <button class="btn small" id="logout">Sign out</button></div>
    </aside>
    <main id="view" tabindex="-1"></main>
  </div>`);
  $('#logout').onclick = logout;
  $('#theme-select').onchange = applyThemePreference;
  $('#language-select').onchange = async (event) => {
    const next = event.target.value === 'en' ? 'en' : 'nl';
    try {
      await patch('/auth/preferences', { admin_language: next });
      const unsaved = Array.from($('#view')?.querySelectorAll('input, select, textarea') || [])
        .map((field) => ({ value: field.value, checked: field.type === 'checkbox' ? field.checked : undefined }));
      state.language = next;
      state.user.admin_language = next;
      setLanguage(next);
      await shell();
      Array.from($('#view')?.querySelectorAll('input, select, textarea') || []).forEach((field, index) => {
        const saved = unsaved[index];
        if (!saved) return;
        field.value = saved.value;
        if (saved.checked !== undefined) field.checked = saved.checked;
      });
    } catch (error) {
      event.target.value = state.language;
      toast(error.message, 'error');
    }
  };
  refreshBadge();
  return route();
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
  [/^#\/work$/, workView],
  [/^#\/maintenance$/, maintenanceView],
  [/^#\/timesheets$/, timesheetsView],
  [/^#\/quotes$/, quotesView],
  [/^#\/quotes\/(\d+)$/, quoteView],
  [/^#\/invoices$/, invoicesView],
  [/^#\/invoices\/(\d+)$/, invoiceView],
  [/^#\/contracts$/, contractsView],
  [/^#\/tickets$/, ticketsView],
  [/^#\/tickets\/(\d+)$/, ticketView],
  [/^#\/leads$/, leadsView],
  [/^#\/settings\/email$/, emailSettingsView],
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
  'work_item.created': (m) => `added work item ${q(m.title)}`,
  'work_item.updated': (m) => `updated work item ${q(m.title)}`,
  'work_item.status_changed': (m) => `moved work item ${q(m.title)} to ${label(m.to)}`,
  'work_item.deleted': (m) => `removed work item ${q(m.title)}`,
  'time_entry.created': (m) => `logged ${duration(m.duration_minutes)} of time`,
  'time_entry.updated': (m) => `updated a ${duration(m.duration_minutes)} time entry`,
  'time_entry.deleted': (m) => `removed a ${duration(m.duration_minutes)} time entry`,
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
  'lead.deleted': () => 'deleted a lead',
  'maintenance_plan.created': (m) => `created maintenance plan ${q(m.title)}`,
  'maintenance_plan.updated': () => 'updated a maintenance plan',
  'contract.created': (m) => `created contract ${q(m.title)}`,
  'contract.shared': () => 'shared a contract with the client',
  'contract.version_uploaded': (m) => `uploaded contract version ${m.version}`,
  'contract.approved': () => 'client approved a contract',
  'contract.changes_requested': () => 'client requested contract changes',
  'contract.withdrawn': () => 'withdrew a contract'
};
const activityList = (items) => (items.length
  ? html`<ul class="list">${items.map((a) => html`<li><span class="grow"><strong>${a.actor_name || 'Website'}</strong> ${translateText((ACTIVITY[a.action] || (() => a.action))(a.meta || {}))}</span><span class="muted">${ago(a.created_at)}</span></li>`)}</ul>`
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
  { name: 'preview_url', label: 'Client test-site URL', type: 'url', full: true, hint: 'Only shared with this project’s client. Use the complete https:// URL.' },
  { name: 'description', label: 'Description', type: 'textarea', full: true, max: 2000 }
];
const milestoneFields = [
  { name: 'title', label: 'Milestone', required: true, full: true },
  { name: 'due_date', label: 'Due date', type: 'date' },
  { name: 'status', label: 'Status', type: 'select', options: options(['todo', 'doing', 'done']), default: 'todo' }
];
const workItemFields = [
  { name: 'title', label: 'Work item', required: true, full: true },
  { name: 'description', label: 'Description', type: 'textarea', full: true, max: 2000 },
  { name: 'status', label: 'Status', type: 'select', options: WORK_ITEM_STATUS, default: 'todo' },
  { name: 'priority', label: 'Priority', type: 'select', options: PRIORITIES, default: 'normal' },
  { name: 'due_date', label: 'Due date', type: 'date' },
  { name: 'estimate_hours', label: 'Estimate (hours)', type: 'number', min: 0.25, max: 24, step: 0.25 },
  { name: 'client_visible', label: 'Show this work item in the client portal', type: 'checkbox', full: true }
];

const localDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const duration = (minutes) => `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${String(minutes % 60).padStart(2, '0')}m` : ''}`;

function workItemValues(item = {}) {
  return { ...item, estimate_hours: item.estimate_minutes == null ? '' : item.estimate_minutes / 60 };
}

function saveWorkItemValues(values) {
  const { estimate_hours, ...data } = values;
  data.estimate_minutes = estimate_hours == null || estimate_hours === '' ? null : Math.round(estimate_hours * 60);
  return data;
}

function newWorkItem(projectId, projects, after) {
  const fields = projectId
    ? workItemFields
    : [{ name: 'project_id', label: 'Project', type: 'select', options: projects.map((p) => [p.id, `${p.name} · ${p.company_name}`]), full: true }, ...workItemFields];
  if (!projectId && !projects.length) { toast('Create a project first', 'error'); return; }
  openForm({
    title: 'Add work item', fields, submit: 'Add work item',
    values: { ...(projectId ? {} : { project_id: projects[0]?.id }), status: 'todo', priority: 'normal' },
    onSubmit: async (values) => {
      const targetProject = projectId || Number(values.project_id);
      delete values.project_id;
      await post(`/projects/${targetProject}/work-items`, saveWorkItemValues(values));
      toast('Work item added');
      after();
    }
  });
}

async function openTimeEntryForm(entry, projects, allItems, after) {
  const entryProject = entry && (projects.find((project) => Number(project.id) === Number(entry.project_id))
    || { id: entry.project_id, name: entry.project_name, company_name: entry.company_name || '' });
  const formProjects = entry ? [entryProject] : projects.filter((project) => !project.archived_at);
  if (!formProjects.length) { toast('Create a project first', 'error'); return; }
  const formItems = entry?.work_item_id && !allItems.some((item) => Number(item.id) === Number(entry.work_item_id))
    ? [...allItems, { id: entry.work_item_id, project_id: entry.project_id, title: entry.work_item_title }]
    : allItems;
  const fields = [
    { name: 'project_id', label: 'Project', type: 'select', options: formProjects.map((p) => [p.id, `${p.name} · ${p.company_name}`]), full: true },
    { name: 'work_item_id', label: 'Related work item', type: 'select', options: [], full: true },
    { name: 'entry_date', label: 'Date', type: 'date', required: true },
    { name: 'duration_hours', label: 'Time (hours)', type: 'number', min: 0.25, max: 24, step: 0.25, required: true },
    { name: 'description', label: 'What did you work on?', type: 'textarea', required: true, full: true, max: 500 },
    { name: 'billable', label: 'Billable time', type: 'checkbox', default: true, full: true }
  ];
  openForm({
    title: entry ? 'Edit time entry' : 'Log time', fields,
    values: {
      project_id: entry?.project_id ?? formProjects[0].id,
      work_item_id: entry?.work_item_id ?? '',
      entry_date: entry?.entry_date?.slice(0, 10) ?? localDate(),
      duration_hours: entry ? entry.duration_minutes / 60 : '',
      description: entry?.description ?? '',
      billable: entry?.billable ?? true
    },
    onSubmit: async (values) => {
      const body = {
        ...values,
        project_id: Number(values.project_id),
        work_item_id: values.work_item_id || null,
        duration_minutes: Math.round(values.duration_hours * 60)
      };
      delete body.duration_hours;
      if (entry) await patch(`/time-entries/${entry.id}`, body);
      else await post('/time-entries', body);
      toast(entry ? 'Time entry updated' : 'Time logged');
      after();
    }
  });
  const form = $('#modal form');
  const projectSelect = form.elements.project_id;
  const itemSelect = form.elements.work_item_id;
  const syncItems = () => {
    const selectedProject = Number(projectSelect.value);
    const selectedItem = itemSelect.value;
    itemSelect.replaceChildren(new Option('No work item', ''));
    for (const item of formItems.filter((work) => Number(work.project_id) === selectedProject)) {
      itemSelect.add(new Option(item.title, item.id));
    }
    itemSelect.value = [...itemSelect.options].some((option) => option.value === String(selectedItem)) ? selectedItem : '';
  };
  projectSelect.addEventListener('change', syncItems);
  syncItems();
}

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
  const attentionItems = [
    ['Overdue milestones', c.overdue_milestones, '#/projects'],
    ['Blocked work items', c.blocked_work_items, '#/work'],
    ['Open support tickets', c.open_tickets, '#/tickets'],
    ['Unanswered leads', c.new_leads, '#/leads'],
    ['Unpaid invoices', c.unpaid_invoices, '#/invoices']
  ];
  state.leads = c.new_leads;
  const badge = $('#lead-badge'); if (badge) { badge.textContent = c.new_leads; badge.hidden = !c.new_leads; }
  show(view, html`
    <header class="page-head dashboard-head"><div><p class="dashboard-eyebrow">Make It So · Admin overview</p><h1>Dashboard</h1><p class="muted">Welcome back, ${state.user.name}.</p></div>
      <div class="actions"><button class="btn" data-action="new-project">+ New project</button><button class="btn primary" data-action="new-client">+ New client</button></div></header>
    <div class="grid kpis dashboard-kpis">
      <div class="card kpi"><span>Active clients</span><strong>${c.active_clients}</strong></div>
      <div class="card kpi"><span>Prospects</span><strong>${c.prospects}</strong></div>
      <div class="card kpi"><span>Open projects</span><strong>${c.open_projects}</strong></div>
      <a class="card kpi" href="#/leads" style="text-decoration:none;color:inherit"><span>New leads</span><strong>${c.new_leads}</strong></a>
    </div>
    <section class="card attention-card dashboard-attention"><header><div><h2>Needs attention</h2><p class="muted">Items that may need a follow-up.</p></div></header>
      <ul class="attention-list">${attentionItems.map(([title, count, href]) => html`<li><a href="${href}"><span>${title}</span><strong>${count}</strong></a></li>`)}</ul>
    </section>
    <div class="dashboard-content">
      <div class="dashboard-primary">
        <section class="card"><header><h2>Upcoming milestones</h2></header>
          ${d.upcoming_milestones.length ? html`<ul class="list">${d.upcoming_milestones.map((m) => html`<li><span class="grow"><a href="#/projects/${m.project_id}">${m.title}</a><span class="sub">${m.project_name} · ${m.company_name}</span></span><span class="muted">${m.due_date ? date(m.due_date) : 'No date'}</span></li>`)}</ul>` : html`<p class="muted">No open milestones. Add some on a project page.</p>`}
        </section>
        <section class="card"><header><h2>Projects by status</h2></header>
          ${total ? html`<ul class="list status-list">${d.projects_by_status.map((s) => html`<li>${chip(s.status)}<progress max="${total}" value="${s.n}"></progress><strong>${s.n}</strong></li>`)}</ul>` : html`<p class="muted">No projects yet.</p>`}
        </section>
        <section class="card maintenance-reminders"><header><div><h2>Maintenance reminders</h2><p class="muted">Recurring client work coming up.</p></div><a class="btn small" href="#/maintenance">Manage plans</a></header>
          ${d.maintenance_reminders.length ? html`<ul class="list">${d.maintenance_reminders.map((plan) => html`<li><span class="grow"><strong>${plan.title}</strong><span class="sub">${plan.project_name} · ${plan.company_name}</span></span><span class="muted">${date(plan.next_due_date)}</span></li>`)}</ul>` : html`<p class="muted">No maintenance tasks are due soon.</p>`}
        </section>
      </div>
      <section class="card dashboard-activity"><header><h2>Recent activity</h2></header>${activityList(d.recent_activity)}</section>
    </div>
  `);
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
  const media = c.archived_at ? null : await get(`/clients/${id}/media`);
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
        ${media ? html`<section class="card"><header><h2>Extra portal sections</h2></header>
          <p class="muted">Private media status is separate from the public website status. Disabled by default for new clients.</p>
          <form id="media-permission" class="stack" style="margin-top:16px">
            <label class="check"><input type="checkbox" name="enabled" ${media.enabled ? 'checked' : ''}> Show media server status to this client</label>
            <p class="muted">Applies to all portal users of this client. Sharing service links and accounts is controlled separately below.</p>
            <p class="form-error" role="alert"></p><button class="btn primary">Save portal permission</button>
          </form>
          <hr><header><h3>Media services &amp; access</h3></header>
          <p class="muted">Configured services are checked automatically every 60 seconds. Ubuntu checks TCP port reachability only, not OS health or remote-desktop sign-in. Share dedicated client accounts, never root or administrator credentials.</p>
          <ul class="list">${media.services.map((s) => html`<li><span class="grow"><strong>${mediaServiceName(s.service)}</strong><span class="sub">${mediaStatusLabel(s.status)} · ${s.status_source === 'automatic' ? 'Automatic check' : 'Manual status'} · ${s.share_access ? 'Client access shared' : 'Access not shared'}${s.has_password ? ' · Password stored securely' : ''}</span>${s.status_source === 'automatic' ? html`<span class="sub">${s.checked_at ? `Last check: ${new Date(s.checked_at).toLocaleString('en-GB')}` : 'First check pending'}${s.stale && s.checked_at ? ' · No recent measurement' : ''}</span>` : ''}</span><button class="btn small" data-action="edit-media" data-service="${s.service}">Manage</button></li>`)}</ul>
        </section>` : ''}
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
  $('#media-permission')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = $('button', form);
    button.disabled = true;
    $('.form-error', form).textContent = '';
    try {
      await put(`/clients/${id}/media`, { enabled: form.elements.enabled.checked });
      toast('Portal permission saved');
      await reload();
    } catch (error) { $('.form-error', form).textContent = error.message; button.disabled = false; }
  });
  $('#note-form').onsubmit = async (e) => {
    e.preventDefault();
    const body = $('#note-body').value.trim();
    if (!body) return;
    try { await post('/notes', { client_id: id, body, client_visible: $('#note-visible').checked }); reload(); } catch (err) { toast(err.message, 'error'); }
  };
  actions(view, {
    'edit-media': (el) => editMediaService(id, media.services.find((s) => s.service === el.dataset.service), reload),
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
          if (invitation.email_skipped) {
            toast('Invitation email paused');
            setTimeout(() => showCopyLink({
              title: 'Invitation email paused',
              description: 'Email notifications are paused. Copy and share this one-time link with the client. It expires in 7 days.',
              url: invitation.invitation_url
            }), 0);
            return;
          }
          toast(invitation.email_sent ? 'Invitation email sent' : 'Invitation created, but email could not be sent', invitation.email_sent ? 'success' : 'error');
          setTimeout(() => showCopyLink({
            title: invitation.email_sent ? 'Invitation email sent' : 'Invitation email could not be sent',
            description: invitation.email_sent
              ? 'The client has been emailed this one-time link. You can copy it as a backup. It expires in 7 days.'
              : 'Email delivery failed. Copy and send this one-time link to the client yourself. It expires in 7 days.',
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

const MEDIA_STATUS = [
  ['unknown', 'Not confirmed'], ['operational', 'Operational'], ['degraded', 'Degraded'],
  ['offline', 'Offline'], ['maintenance', 'Maintenance']
];
const mediaServiceName = (service) => ({ jellyfin: 'Jellyfin', jellyseerr: 'Jellyseerr', ubuntu: 'Ubuntu server' }[service]);
const mediaStatusLabel = (status) => MEDIA_STATUS.find(([value]) => value === status)?.[1] || 'Not confirmed';

function editMediaService(clientId, service, reload) {
  const automatic = service.status_source === 'automatic';
  openForm({
    title: `${mediaServiceName(service.service)} · status & client access`,
    fields: [
      ...(automatic ? [] : [{ name: 'status', label: 'Manual status (not live monitoring)', type: 'select', options: MEDIA_STATUS, full: true }]),
      { name: 'message', label: 'Shared status / maintenance notice', type: 'textarea', max: 2000, full: true },
      { name: 'share_access', label: 'Share this service link and account with this client', type: 'checkbox' },
      { name: 'url', label: 'Client-facing service URL', type: 'url', full: true, hint: automatic ? 'Status is checked automatically using the server configuration, not this editable link. Prefer HTTPS before client sign-in; HTTP does not encrypt credentials.' : 'HTTP(S) only. No embedded username, password, query string or fragment. Ubuntu has no configured web interface; leave blank unless one exists.' },
      { name: 'username', label: 'Client username', full: true },
      { name: 'login_note', label: 'Sign-in instructions', type: 'textarea', max: 1000, full: true, hint: 'For example: sign in with your Jellyfin account. Do not include passwords here.' },
      { name: 'password', label: service.has_password ? 'Replace stored password' : 'Client service password', type: 'password', full: true, hint: 'Leave blank to keep the current password. Encrypted at rest; not returned in admin reads.' },
      { name: 'clear_password', label: 'Remove the stored password', type: 'checkbox' }
    ],
    values: { ...service, url: service.url || service.configured_url || '' },
    onSubmit: async (values) => {
      await put(`/clients/${clientId}/media/${service.service}`, values);
      toast('Media service saved');
      await reload();
    }
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

async function workView(view) {
  const [{ projects }, { work_items: initialItems }] = await Promise.all([get('/projects'), get('/work-items')]);
  show(view, html`
    <header class="page-head"><div><h1>Current work</h1><p class="muted">A live overview of tasks across active projects.</p></div>
      <div class="actions"><button class="btn" data-action="new-time">Log time</button><button class="btn primary" data-action="new-item">+ Add work item</button></div></header>
    <div class="grid kpis">
      <div class="card kpi"><span>Open work items</span><strong id="work-open">0</strong></div>
      <div class="card kpi"><span>In progress</span><strong id="work-active">0</strong></div>
      <div class="card kpi"><span>Blocked</span><strong id="work-blocked">0</strong></div>
      <div class="card kpi"><span>Completed</span><strong id="work-done">0</strong></div>
    </div>
    <div class="work-board" id="work-board"></div>`);
  const reload = () => workView(view);
  const render = (items) => {
    $('#work-open').textContent = items.filter((item) => item.status !== 'done').length;
    $('#work-active').textContent = items.filter((item) => item.status === 'in_progress').length;
    $('#work-blocked').textContent = items.filter((item) => item.status === 'blocked').length;
    $('#work-done').textContent = items.filter((item) => item.status === 'done').length;
    show($('#work-board'), html`${WORK_ITEM_STATUS.map(([statusKey, title]) => {
      const statusItems = items.filter((item) => item.status === statusKey);
      return html`<section class="work-column"><header><h2>${title}</h2><span class="chip">${statusItems.length}</span></header>
        ${statusItems.length ? statusItems.map((item) => html`<article class="work-card">
          <div class="work-card-head"><strong>${item.title}</strong>${chip(item.priority)}</div>
          <a class="sub" href="#/projects/${item.project_id}">${item.project_name} · ${item.company_name}</a>
          ${item.due_date ? html`<span class="sub">Due ${date(item.due_date)}</span>` : ''}
          ${item.client_visible ? html`<span class="work-visible">Visible to client</span>` : ''}
          <div class="row-actions"><button class="btn small" data-action="edit" data-id="${item.id}">Edit</button>
            ${statusKey !== 'done' ? html`<button class="btn small" data-action="advance" data-id="${item.id}" data-status="${statusKey}">${statusKey === 'blocked' ? 'Unblock' : 'Move forward'}</button>` : ''}</div>
        </article>`) : html`<p class="work-empty">No items</p>`}
      </section>`;
    })}`);
  };
  render(initialItems);
  actions(view, {
    'new-item': () => newWorkItem(null, projects, reload),
    'new-time': async () => {
      const [{ projects: currentProjects }, { work_items: items }] = await Promise.all([get('/projects'), get('/work-items')]);
      await openTimeEntryForm(null, currentProjects, items, reload);
    },
    edit: (_, id) => {
      const item = initialItems.find((entry) => Number(entry.id) === id);
      if (!item) return;
      openForm({ title: 'Edit work item', fields: workItemFields, values: workItemValues(item), onSubmit: async (values) => { await patch(`/work-items/${id}`, saveWorkItemValues(values)); toast('Work item updated'); reload(); } });
    },
    advance: async (el, id) => {
      const next = { todo: 'in_progress', in_progress: 'in_review', in_review: 'done', blocked: 'todo' }[el.dataset.status];
      await patch(`/work-items/${id}`, { status: next });
      reload();
    }
  });
}

const MAINTENANCE_FREQUENCIES = options(['monthly', 'quarterly', 'yearly']);

function maintenancePlanForm(plan, projects, after) {
  const fields = [
    ...(!plan ? [{ name: 'project_id', label: 'Project', type: 'select', options: projects.map((project) => [project.id, `${project.name} · ${project.company_name}`]), full: true }] : []),
    { name: 'title', label: 'Maintenance task', required: true, full: true },
    { name: 'description', label: 'Description', type: 'textarea', max: 2000, full: true },
    { name: 'frequency', label: 'Frequency', type: 'select', options: MAINTENANCE_FREQUENCIES, required: true },
    { name: 'next_due_date', label: 'Next due date', type: 'date', required: true },
    { name: 'reminder_days', label: 'Reminder (days before)', type: 'number', min: 0, max: 90, default: 7 }
  ];
  openForm({
    title: plan ? 'Edit maintenance plan' : 'New maintenance plan',
    submit: plan ? 'Save plan' : 'Create plan',
    fields,
    values: plan || { project_id: projects[0]?.id, frequency: 'monthly', reminder_days: 7 },
    onSubmit: async (values) => {
      if (plan) await patch(`/maintenance-plans/${plan.id}`, values);
      else await post('/maintenance-plans', values);
      toast(plan ? 'Maintenance plan updated' : 'Maintenance plan created');
      after();
    }
  });
}

async function maintenanceView(view) {
  const [{ plans }, { projects }] = await Promise.all([get('/maintenance-plans'), get('/projects')]);
  show(view, html`
    <header class="page-head"><div><h1>Maintenance</h1><p class="muted">Recurring care plans create a work item automatically when their due date arrives.</p></div>
      <button class="btn primary" data-action="new">+ New maintenance plan</button></header>
    <section class="card"><header><h2>Recurring plans</h2></header>
      ${plans.length ? html`<div class="table-wrap"><table><thead><tr><th>Task</th><th>Client / project</th><th>Frequency</th><th>Next due</th><th>Reminder</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        ${plans.map((plan) => html`<tr><td><strong>${plan.title}</strong><span class="sub">${plan.description || ''}</span></td>
          <td>${plan.company_name}<span class="sub">${plan.project_name}</span></td><td>${label(plan.frequency)}</td><td>${date(plan.next_due_date)}</td>
          <td>${plan.reminder_days} ${translateText('days before')}</td><td>${plan.active ? chip('active') : chip('inactive')}</td>
          <td><div class="row-actions"><button class="btn small" data-action="edit" data-id="${plan.id}">Edit</button>
            <button class="btn small" data-action="toggle" data-id="${plan.id}">${plan.active ? 'Pause' : 'Resume'}</button></div></td></tr>`)}</tbody></table></div>`
        : html`<div class="empty">No maintenance plans yet. Create one to schedule recurring client work.</div>`}
    </section>`);
  const reload = () => maintenanceView(view);
  actions(view, {
    new: () => projects.length ? maintenancePlanForm(null, projects, reload) : toast('Create a project first', 'error'),
    edit: (_, id) => {
      const plan = plans.find((item) => Number(item.id) === id);
      if (plan) maintenancePlanForm(plan, projects, reload);
    },
    toggle: async (_, id) => {
      const plan = plans.find((item) => Number(item.id) === id);
      if (!plan) return;
      await patch(`/maintenance-plans/${id}`, { active: !plan.active });
      toast(plan.active ? 'Maintenance plan paused' : 'Maintenance plan resumed');
      reload();
    }
  });
}

async function uploadContractDocument(path, file, metadata = {}) {
  const response = await fetch(`/api${path}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/pdf',
      'X-Requested-With': 'makeitso',
      'X-File-Name': encodeURIComponent(file.name),
      ...(metadata.clientId ? { 'X-Client-Id': String(metadata.clientId) } : {}),
      ...(metadata.projectId ? { 'X-Project-Id': String(metadata.projectId) } : {}),
      ...(metadata.title ? { 'X-Contract-Title': encodeURIComponent(metadata.title) } : {})
    },
    body: file
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(translateText(result?.error || `Request failed (${response.status})`));
  return result;
}

async function contractsView(view) {
  const [{ contracts }, { clients }, { projects }] = await Promise.all([
    get('/contracts'), get('/clients'), get('/projects')
  ]);
  show(view, html`
    <header class="page-head"><div><h1>Contracts</h1><p class="muted">Share PDF agreements in the client portal and keep an auditable record of each decision. This records portal approval, not a qualified electronic signature.</p></div></header>
    <form id="contract-upload" class="card stack">
      <header><h2>Upload a contract</h2></header>
      <div class="form-grid">
        <label class="field" for="contract-client"><span>Client</span><select id="contract-client" name="client_id" required><option value="">Choose a client</option>${clients.map((client) => html`<option value="${client.id}">${client.company_name}</option>`)}</select></label>
        <label class="field" for="contract-project"><span>Project (optional)</span><select id="contract-project" name="project_id"><option value="">Client-wide agreement</option>${projects.map((project) => html`<option value="${project.id}" data-client="${project.client_id}">${project.name} · ${project.company_name}</option>`)}</select></label>
        <label class="field full" for="contract-title"><span>Contract title</span><input id="contract-title" name="title" maxlength="160" required></label>
        <label class="field full" for="contract-file"><span>PDF document (max. 10 MB)</span><input id="contract-file" name="document" type="file" accept="application/pdf,.pdf" required></label>
      </div>
      <p class="form-error" role="alert"></p><div class="actions"><button class="btn primary">Upload draft</button></div>
    </form>
    <section class="card contracts-list"><header><h2>Contract register</h2></header>
      ${contracts.length ? html`<div class="table-wrap"><table><thead><tr><th>Contract</th><th>Client / project</th><th>Status</th><th>Version</th><th>Decision</th><th>Actions</th></tr></thead><tbody>
        ${contracts.map((contract) => html`<tr><td><strong>${contract.title}</strong><span class="sub">${contract.file_name || 'PDF document'}</span></td>
          <td>${contract.company_name}<span class="sub">${contract.project_name || translateText('Client-wide')}</span></td><td>${chip(contract.status)}</td>
          <td>${contract.version ? `v${contract.version}` : '—'}</td>
          <td>${contract.decision_at ? `${contract.decision_by_name || 'Client'} · ${date(contract.decision_at)}` : '—'}${contract.decision_note ? html`<span class="sub">${contract.decision_note}</span>` : ''}</td>
          <td><div class="row-actions"><a class="btn small" href="/api/contracts/${contract.id}/document">PDF</a>
            ${['draft', 'changes_requested'].includes(contract.status) ? html`<button class="btn small" data-action="revision" data-id="${contract.id}">Upload version</button><button class="btn small primary" data-action="send" data-id="${contract.id}">Share</button>` : ''}
            ${['sent', 'changes_requested'].includes(contract.status) ? html`<button class="btn small danger" data-action="withdraw" data-id="${contract.id}">Withdraw</button>` : ''}</div></td></tr>`)}</tbody></table></div>`
        : html`<div class="empty">No contracts yet. Upload a PDF to create a draft.</div>`}
    </section>`);

  const form = $('#contract-upload', view);
  const clientSelect = $('#contract-client', form);
  const projectSelect = $('#contract-project', form);
  clientSelect.onchange = () => {
    for (const option of projectSelect.options) {
      if (option.value) option.hidden = option.dataset.client !== clientSelect.value;
    }
    if (projectSelect.selectedOptions[0]?.hidden) projectSelect.value = '';
  };
  form.onsubmit = async (event) => {
    event.preventDefault();
    const error = $('.form-error', form);
    const file = form.elements.document.files[0];
    error.textContent = '';
    if (!file || file.size > 10 * 1024 * 1024) {
      error.textContent = translateText('Choose a PDF smaller than 10 MB.');
      return;
    }
    const button = $('button.primary', form);
    button.disabled = true;
    try {
      await uploadContractDocument('/contracts', file, {
        clientId: form.elements.client_id.value,
        projectId: form.elements.project_id.value,
        title: form.elements.title.value
      });
      toast('Contract draft created');
      await contractsView(view);
    } catch (exception) {
      error.textContent = exception.message;
      button.disabled = false;
    }
  };

  actions(view, {
    send: async (_, id) => {
      await post(`/contracts/${id}/send`);
      toast('Contract shared in the client portal');
      contractsView(view);
    },
    withdraw: async (_, id) => {
      if (!confirm(translateText('Withdraw this contract from the client portal?'))) return;
      await post(`/contracts/${id}/withdraw`);
      toast('Contract withdrawn');
      contractsView(view);
    },
    revision: (_, id) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/pdf,.pdf';
      input.onchange = async () => {
        const file = input.files[0];
        if (!file) return;
        try {
          await uploadContractDocument(`/contracts/${id}/versions`, file);
          toast('Contract version uploaded');
          contractsView(view);
        } catch (error) {
          toast(error.message, 'error');
        }
      };
      input.click();
    }
  });
}

async function timesheetsView(view) {
  const [{ projects }, { work_items: allItems }] = await Promise.all([get('/projects?archived=true'), get('/work-items')]);
  const now = new Date();
  const monthDefault = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  show(view, html`
    <header class="page-head"><div><h1>Timesheets</h1><p class="muted">Review and manage time logged across projects.</p></div>
      <div class="actions"><button class="btn" data-action="export">Export CSV</button><button class="btn primary" data-action="new">+ Log time</button></div></header>
    <div class="toolbar"><label class="field"><span>Month</span><input id="timesheet-month" type="month" value="${monthDefault}"></label>
      <label class="field"><span>Project</span><select id="timesheet-project"><option value="">All projects</option>${projects.map((p) => html`<option value="${p.id}">${p.name} · ${p.company_name}</option>`)}</select></label></div>
    <div class="grid kpis">
      <div class="card kpi"><span>Total time</span><strong id="timesheet-total">0h</strong></div>
      <div class="card kpi"><span>Billable</span><strong id="timesheet-billable">0h</strong></div>
      <div class="card kpi"><span>Entries</span><strong id="timesheet-count">0</strong></div>
    </div>
    <div class="table-wrap" id="timesheet-table"></div>`);
  let entries = [];
  const load = async () => {
    const month = $('#timesheet-month').value;
    const params = new URLSearchParams();
    if (month) {
      const [year, monthNumber] = month.split('-').map(Number);
      params.set('from', `${month}-01`);
      params.set('to', `${year}-${String(monthNumber).padStart(2, '0')}-${String(new Date(year, monthNumber, 0).getDate()).padStart(2, '0')}`);
    }
    if ($('#timesheet-project').value) params.set('project_id', $('#timesheet-project').value);
    const result = await get(`/time-entries?${params}`);
    entries = result.time_entries;
    $('#timesheet-total').textContent = duration(result.totals.minutes);
    $('#timesheet-billable').textContent = duration(result.totals.billable_minutes);
    $('#timesheet-count').textContent = entries.length;
    show($('#timesheet-table'), entries.length ? html`<table><thead><tr><th>Date</th><th>Project / task</th><th>Description</th><th>Time</th><th>Billable</th><th>Actions</th></tr></thead><tbody>
      ${entries.map((entry) => html`<tr><td>${date(entry.entry_date)}</td><td><a href="#/projects/${entry.project_id}">${entry.project_name}</a>${entry.work_item_title ? html`<span class="sub">${entry.work_item_title}</span>` : ''}</td><td>${entry.description}<span class="sub">${entry.author_name || 'Former team member'}</span></td><td>${duration(entry.duration_minutes)}</td><td>${entry.billable ? 'Yes' : 'No'}</td><td class="row-actions"><button class="btn small" data-action="edit" data-id="${entry.id}">Edit</button><button class="btn small danger" data-action="delete" data-id="${entry.id}">Delete</button></td></tr>`)}</tbody></table>` : html`<div class="empty">No time entries for this period.</div>`);
  };
  $('#timesheet-month').onchange = load;
  $('#timesheet-project').onchange = load;
  actions(view, {
    new: async () => await openTimeEntryForm(null, projects, allItems, load),
    edit: async (_, id) => {
      const entry = entries.find((item) => Number(item.id) === id);
      if (entry) await openTimeEntryForm(entry, projects, allItems, load);
    },
    delete: async (_, id) => {
      if (confirm('Delete this time entry?')) { await del(`/time-entries/${id}`); toast('Time entry deleted'); load(); }
    },
    export: () => {
      const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
      const rows = [['Date', 'Project', 'Work item', 'Description', 'Minutes', 'Billable'], ...entries.map((entry) => [String(entry.entry_date).slice(0, 10), entry.project_name, entry.work_item_title, entry.description, entry.duration_minutes, entry.billable ? 'Yes' : 'No'])];
      const blob = new Blob([rows.map((row) => row.map(quote).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `make-it-so-timesheet-${$('#timesheet-month').value || 'all'}.csv`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    }
  });
  await load();
}

async function projectView(view, id) {
  const d = await get(`/projects/${id}`);
  const p = d.project;
  const done = d.milestones.filter((m) => m.status === 'done').length;
  const workDone = d.work_items.filter((item) => item.status === 'done').length;
  show(view, html`
    <a class="back" href="#/clients/${p.client_id}">← ${p.company_name}</a>
    <header class="page-head"><div><h1>${p.name}</h1><p>${chip(p.status)} ${p.archived_at ? html`<span class="chip">Archived</span>` : ''} <span class="muted">${p.category || 'Project'}${p.target_date ? ` · target ${date(p.target_date)}` : ''}</span></p></div>
      <div class="actions"><button class="btn" data-action="edit">Edit</button>
        ${p.archived_at ? html`<button class="btn" data-action="restore">Restore</button>` : html`<button class="btn danger" data-action="archive">Archive</button>`}</div></header>
    <div class="grid two">
      <div class="stack">
        <section class="card"><header><h2>Status</h2></header>
          <div class="prog" style="margin-bottom:14px"><progress max="100" value="${p.progress}"></progress><strong>${p.progress}%</strong></div>
          ${d.work_items.length ? html`<p class="muted work-progress-note">Progress is calculated from work items (${workDone}/${d.work_items.length} complete).</p>` : ''}
          <div class="form-grid">
            <label class="field"><span>Stage</span><select id="quick-status">${PROJECT_STATUS.map(([k, t]) => html`<option value="${k}" ${k === p.status ? 'selected' : ''}>${t}</option>`)}</select></label>
            ${d.work_items.length ? '' : html`<label class="field"><span>Progress (%)</span><input id="quick-progress" type="number" min="0" max="100" value="${p.progress}"></label>`}
            <label class="field full"><span>Next step</span><input id="quick-next" value="${p.next_step}" maxlength="240"></label>
          </div>
          <p style="margin-top:12px"><button class="btn small primary" data-action="quick-save">Save changes</button></p>
          ${p.description ? html`<p class="muted" style="margin-top:14px;white-space:pre-wrap">${p.description}</p>` : ''}
        </section>
        <section class="card"><header><h2>Work items <span class="muted">${workDone}/${d.work_items.length}</span></h2><button class="btn small" data-action="add-work-item">+ Add</button></header>
          ${d.work_items.length ? html`<ul class="list">${d.work_items.map((item) => html`<li class="work-row"><span class="grow"><strong>${item.title}</strong><span class="sub">${chip(item.status)} ${chip(item.priority)}${item.due_date ? ` · Due ${date(item.due_date)}` : ''}${item.estimate_minutes ? ` · Estimate ${duration(item.estimate_minutes)}` : ''}${item.client_visible ? ' · Visible to client' : ''}</span></span><span class="row-actions"><button class="btn small" data-action="edit-work-item" data-id="${item.id}">Edit</button>${item.status !== 'done' ? html`<button class="btn small" data-action="advance-work-item" data-id="${item.id}" data-status="${item.status}">Next status</button>` : ''}<button class="btn small danger" data-action="delete-work-item" data-id="${item.id}">✕</button></span></li>`)}</ul>` : html`<p class="muted">Add work items to track tasks, priorities and progress. Work-item progress updates automatically.</p>`}
        </section>
        <section class="card"><header><h2>Time entries <span class="muted">${duration(Number(p.logged_minutes) || 0)} logged</span></h2><button class="btn small" data-action="add-time-entry">+ Log time</button></header>
          ${d.time_entries.length ? html`<ul class="list">${d.time_entries.map((entry) => html`<li><span class="grow"><strong>${entry.description}</strong><span class="sub">${date(entry.entry_date)} · ${duration(entry.duration_minutes)} · ${entry.billable ? 'Billable' : 'Non-billable'}${entry.work_item_title ? ` · ${entry.work_item_title}` : ''}</span></span><span class="row-actions"><button class="btn small" data-action="edit-time-entry" data-id="${entry.id}">Edit</button><button class="btn small danger" data-action="delete-time-entry" data-id="${entry.id}">✕</button></span></li>`)}</ul>` : html`<p class="muted">No time logged for this project yet.</p>`}
        </section>
        <section class="card"><header><h2>Milestones <span class="muted">${done}/${d.milestones.length}</span></h2><button class="btn small" data-action="add-milestone">+ Add</button></header>
          ${d.milestones.length ? html`<ul class="list">${d.milestones.map((m) => html`<li class="milestone ${m.status}"><button class="state" data-action="cycle-milestone" data-id="${m.id}" data-status="${m.status}" aria-label="Status: ${label(m.status)}. Click to change">${m.status === 'done' ? '✓' : m.status === 'doing' ? '•' : ''}</button><span class="grow"><span class="title">${m.title}</span><span class="sub">${m.due_date ? `Due ${date(m.due_date)}` : 'No due date'} · ${label(m.status)}</span></span><span class="row-actions"><button class="btn small" data-action="edit-milestone" data-id="${m.id}">Edit</button><button class="btn small danger" data-action="delete-milestone" data-id="${m.id}">✕</button></span></li>`)}</ul>` : html`<p class="muted">No milestones yet. Break the project into steps your client can follow.</p>`}
        </section>
      </div>
      <div class="stack">
        <section class="card"><header><h2>Client conversation</h2></header>
          ${d.project_messages.length ? html`<div class="work-thread">${d.project_messages.map((message) => html`<article class="work-message ${message.author_role === 'client' ? 'from-client' : 'from-studio'}"><p>${message.body}</p><small>${message.author_name || 'Account removed'}${message.work_item_title ? ` · Feature: ${message.work_item_title}` : ''} · ${ago(message.created_at)}</small></article>`)}</div>` : html`<p class="muted">No project messages yet.</p>`}
          <form class="project-reply-form" id="project-message-form"><label class="field" for="project-message-body"><span>Reply to the client</span><textarea id="project-message-body" name="body" maxlength="5000" required></textarea></label><p class="form-error" role="alert"></p><button class="btn small primary">Send reply</button></form>
        </section>
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
  $('#project-message-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const button = $('button', form);
    button.disabled = true;
    try {
      await post(`/projects/${id}/messages`, { body: form.body.value });
      toast('Message sent to client');
      reload();
    } catch (err) {
      $('.form-error', form).textContent = err.message;
      button.disabled = false;
    }
  };
  actions(view, {
    'quick-save': async () => {
      const update = { status: $('#quick-status').value, next_step: $('#quick-next').value };
      if (!d.work_items.length) update.progress = Number($('#quick-progress').value);
      const result = await patch(`/projects/${id}`, update);
      if (result.email_skipped) { toast('Project updated; project notification email is paused.'); reload(); return; }
      toast(result.email_sent === false ? 'Project updated, but the client email could not be sent' : 'Project updated', result.email_sent === false ? 'error' : '');
      reload();
    },
    edit: () => openForm({ title: 'Edit project', fields: projectFields(null), values: p, onSubmit: async (v) => { const result = await patch(`/projects/${id}`, v); toast(result.email_skipped ? 'Saved; project notification email is paused.' : result.email_sent === false ? 'Saved, but the client email could not be sent' : 'Saved', result.email_sent === false ? 'error' : ''); reload(); } }),
    archive: async () => { if (confirm('Archive this project?')) { await post(`/projects/${id}/archive`); reload(); } },
    restore: async () => { await post(`/projects/${id}/restore`); reload(); },
    'add-work-item': () => newWorkItem(id, null, reload),
    'edit-work-item': (_, wid) => {
      const item = d.work_items.find((work) => Number(work.id) === wid);
      if (item) openForm({ title: 'Edit work item', fields: workItemFields, values: workItemValues(item), onSubmit: async (values) => { await patch(`/work-items/${wid}`, saveWorkItemValues(values)); toast('Work item updated'); reload(); } });
    },
    'advance-work-item': async (el, wid) => {
      const next = { todo: 'in_progress', in_progress: 'in_review', in_review: 'done', blocked: 'todo' }[el.dataset.status];
      await patch(`/work-items/${wid}`, { status: next });
      reload();
    },
    'delete-work-item': async (_, wid) => { if (confirm('Delete this work item?')) { await del(`/work-items/${wid}`); reload(); } },
    'add-time-entry': async () => await openTimeEntryForm(null, [p], d.work_items, reload),
    'edit-time-entry': async (_, entryId) => {
      const entry = d.time_entries.find((timeEntry) => Number(timeEntry.id) === entryId);
      if (entry) await openTimeEntryForm(entry, [p], d.work_items, reload);
    },
    'delete-time-entry': async (_, entryId) => { if (confirm('Delete this time entry?')) { await del(`/time-entries/${entryId}`); reload(); } },
    'add-milestone': () => openForm({ title: 'Add milestone', fields: milestoneFields, submit: 'Add', onSubmit: async (v) => { await post(`/projects/${id}/milestones`, v); reload(); } }),
    'edit-milestone': (_, mid) => openForm({ title: 'Edit milestone', fields: milestoneFields, values: d.milestones.find((m) => m.id === mid), onSubmit: async (v) => { const result = await patch(`/milestones/${mid}`, v); if (result.email_skipped) toast('Milestone updated; project notification email is paused.'); else if (result.email_sent === false) toast('Milestone updated, but the client email could not be sent', 'error'); reload(); } }),
    'cycle-milestone': async (el, mid) => { const result = await patch(`/milestones/${mid}`, { status: NEXT[el.dataset.status] }); if (result.email_skipped) toast('Milestone updated; project notification email is paused.'); else if (result.email_sent === false) toast('Milestone updated, but the client email could not be sent', 'error'); reload(); },
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
        html`${quote.status === 'accepted' ? html`<button class="btn primary" data-action="create-invoice">Create invoice</button>` : ''}<button class="btn" data-action="share">Copy portal link</button>`}</div></header>
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
    'create-invoice': async () => {
      const result = await post(`/quotes/${id}/invoice`);
      toast('Invoice draft created from accepted quote');
      location.hash = `#/invoices/${result.invoice.id}`;
    },
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

/* ---------------- invoices ---------------- */
const invoiceMoney = (cents) => new Intl.NumberFormat('en-BE', { style: 'currency', currency: 'EUR' }).format(Number(cents) / 100);
const invoiceToday = () => new Date().toISOString().slice(0, 10);

async function invoiceProfileForm() {
  const { profile } = await get('/business-profile');
  openForm({
    title: 'Invoice business details',
    submit: 'Save details',
    fields: [
      { name: 'legal_name', label: 'Legal business name', required: true, max: 160, full: true },
      { name: 'vat_number', label: 'VAT number', max: 30 },
      { name: 'company_number', label: 'Company number (KBO/BCE)', max: 20 },
      { name: 'address_line1', label: 'Address', required: true, max: 160, full: true },
      { name: 'address_line2', label: 'Address line 2', max: 160, full: true },
      { name: 'postal_code', label: 'Postal code', required: true, max: 20 },
      { name: 'city', label: 'City', required: true, max: 100 },
      { name: 'country', label: 'Country code', required: true, max: 2 },
      { name: 'email', label: 'Business email', type: 'email' },
      { name: 'phone', label: 'Phone', max: 40 },
      { name: 'iban', label: 'IBAN for bank transfers', max: 40, full: true },
      { name: 'payment_instructions', label: 'Payment instructions', type: 'textarea', max: 1000, full: true },
      { name: 'default_payment_days', label: 'Default payment term (days)', type: 'number', required: true, min: 0, max: 365 }
    ],
    values: profile,
    onSubmit: async (values) => { await put('/business-profile', values); toast('Invoice business details saved'); }
  });
}

async function showInvoiceForm(invoice = null) {
  let clients = (await get('/clients')).clients;
  if (invoice && !clients.some((client) => Number(client.id) === Number(invoice.client_id))) {
    clients = [{ id: invoice.client_id, company_name: invoice.company_name }, ...clients];
  }
  if (!clients.length) { toast('Create a client first', 'error'); return; }
  const lines = invoice?.items?.length ? invoice.items : [{ description: '', quantity: 1, unit_price: 0, vat_rate: 21 }];
  const dlg = $('#modal');
  show(dlg, html`<form class="modal-form quote-modal">
    <header><h2>${invoice ? 'Edit invoice draft' : 'New invoice draft'}</h2><button type="button" class="icon-btn" data-close aria-label="Close">×</button></header>
    <div class="form-grid">
      <label class="field full"><span>Client *</span><select name="client_id" required>${clients.map((client) => html`<option value="${client.id}" ${Number(client.id) === Number(invoice?.client_id) ? 'selected' : ''}>${client.company_name}</option>`)}</select></label>
      <label class="field full"><span>Title *</span><input name="title" maxlength="160" value="${invoice?.title ?? ''}" required></label>
      <label class="field"><span>Due date</span><input name="due_date" type="date" value="${invoice?.due_date ?? ''}"></label>
      <label class="field full"><span>Notes</span><textarea name="notes" maxlength="4000">${invoice?.notes ?? ''}</textarea></label>
    </div>
    <section><header class="line-head"><h3>Line items</h3><button type="button" class="btn small" id="add-invoice-line">+ Add item</button></header>
      <div id="invoice-lines">${lines.map((item) => quoteLineHtml(item))}</div></section>
    <p class="form-error" role="alert"></p>
    <footer><button type="button" class="btn" data-close>Cancel</button><button class="btn primary">${invoice ? 'Save draft' : 'Create draft'}</button></footer>
  </form>`);
  const form = $('form', dlg);
  const lineContainer = $('#invoice-lines', form);
  dlg.onclick = (event) => {
    if (event.target.closest('[data-close]') || event.target === dlg) dlg.close();
    if (event.target.closest('#add-invoice-line')) lineContainer.append(quoteLineHtml({ quantity: 1, unit_price: 0, vat_rate: 21 }).s);
    if (event.target.closest('[data-remove-line]')) {
      if (lineContainer.children.length === 1) return toast('An invoice needs at least one item', 'error');
      event.target.closest('[data-quote-line]').remove();
    }
  };
  form.onsubmit = async (event) => {
    event.preventDefault();
    const button = $('button.primary', form);
    button.disabled = true;
    $('.form-error', form).textContent = '';
    const payload = {
      client_id: Number(form.elements.client_id.value),
      title: form.elements.title.value,
      due_date: form.elements.due_date.value || null,
      notes: form.elements.notes.value,
      items: [...lineContainer.querySelectorAll('[data-quote-line]')].map((row) => ({
        description: $('[data-item="description"]', row).value,
        quantity: Number($('[data-item="quantity"]', row).value),
        unit_price: Number($('[data-item="unit_price"]', row).value),
        vat_rate: Number($('[data-item="vat_rate"]', row).value)
      }))
    };
    try {
      const result = invoice ? await patch(`/invoices/${invoice.id}`, payload) : await post('/invoices', payload);
      dlg.close();
      toast(invoice ? 'Invoice draft saved' : 'Invoice draft created');
      location.hash = `#/invoices/${result.invoice.id}`;
    } catch (error) {
      $('.form-error', form).textContent = error.message;
      button.disabled = false;
    }
  };
  dlg.showModal();
}

async function invoicesView(view) {
  const { invoices } = await get('/invoices');
  show(view, html`<header class="page-head"><div><h1>Invoices</h1><p class="muted">Issue invoices, download PDFs, and record bank transfers.</p></div>
    <div class="actions"><button class="btn" data-action="profile">Business details</button><button class="btn primary" data-action="new">+ New invoice</button></div></header>
    <div class="notice" style="margin-bottom:16px">PDF invoices only; Peppol delivery is not configured. Confirm legal and e-invoicing requirements with your accountant before using these for Belgian B2B invoicing.</div>
    <div class="table-wrap">${invoices.length ? html`<table><thead><tr><th>Invoice</th><th>Client</th><th>Status</th><th>Due</th><th>Total</th><th>Balance</th></tr></thead><tbody>
      ${invoices.map((invoice) => html`<tr class="link" data-href="#/invoices/${invoice.id}"><td><strong>${invoice.invoice_number || 'Draft'}</strong><span class="sub">${invoice.title}</span></td><td>${invoice.company_name}</td><td>${chip(invoice.display_status)}</td><td>${date(invoice.due_date) || '—'}</td><td>${invoiceMoney(invoice.total_cents)}</td><td>${invoiceMoney(invoice.balance_cents)}</td></tr>`)}</tbody></table>` : html`<div class="empty">No invoices yet.</div>`}</div>`);
  actions(view, { new: () => showInvoiceForm(), profile: invoiceProfileForm });
}

async function invoiceView(view, id) {
  const { invoice } = await get(`/invoices/${id}`);
  const isDraft = invoice.status === 'draft';
  show(view, html`<a class="back" href="#/invoices">← All invoices</a>
    <header class="page-head"><div><h1>${invoice.invoice_number || 'Invoice draft'}</h1><p>${invoice.title} · ${chip(invoice.display_status)} <span class="muted">for ${invoice.company_name}</span></p></div>
      <div class="actions">${isDraft ? html`<button class="btn" data-action="edit">Edit draft</button><button class="btn primary" data-action="issue">Issue invoice</button>` : html`<a class="btn" href="/api/invoices/${invoice.id}/pdf" target="_blank" rel="noopener">Download PDF</a>${invoice.status === 'issued' ? html`<button class="btn" data-action="payment">Record payment</button><button class="btn danger" data-action="void">Void invoice</button>` : ''}`}</div></header>
    <div class="grid two"><section class="card"><header><h2>${invoice.company_name}</h2></header><dl class="details">
      <dt>Issue date</dt><dd>${date(invoice.issue_date) || 'Not issued'}</dd><dt>Due date</dt><dd>${date(invoice.due_date) || '—'}</dd>
      ${invoice.quote_id ? html`<dt>Based on quote</dt><dd><a href="#/quotes/${invoice.quote_id}">Open quote</a></dd>` : ''}
      ${invoice.void_reason ? html`<dt>Void reason</dt><dd>${invoice.void_reason}</dd>` : ''}</dl>
      ${invoice.notes ? html`<p style="white-space:pre-wrap;margin-top:12px">${invoice.notes}</p>` : ''}</section>
      <section class="card"><header><h2>Totals</h2></header><dl class="details"><dt>Subtotal</dt><dd>${invoiceMoney(invoice.subtotal_cents)}</dd><dt>VAT</dt><dd>${invoiceMoney(invoice.vat_cents)}</dd><dt>Total</dt><dd><strong>${invoiceMoney(invoice.total_cents)}</strong></dd><dt>Paid</dt><dd>${invoiceMoney(invoice.paid_cents)}</dd><dt>Balance due</dt><dd><strong>${invoiceMoney(invoice.balance_cents)}</strong></dd></dl></section></div>
    <section class="card" style="margin-top:16px"><header><h2>Line items</h2></header><div class="table-wrap"><table><thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>VAT</th><th>Total</th></tr></thead><tbody>
      ${invoice.items.map((item) => html`<tr><td>${item.description}</td><td>${item.quantity}</td><td>${invoiceMoney(Math.round(Number(item.unit_price) * 100))}</td><td>${item.vat_rate}%</td><td>${invoiceMoney(Math.round(Number(item.quantity) * Number(item.unit_price) * 100) + Math.round(Number(item.quantity) * Number(item.unit_price) * Number(item.vat_rate)))}</td></tr>`)}</tbody></table></div></section>
    <section class="card" style="margin-top:16px"><header><h2>Payment history</h2></header>${invoice.payments.length ? html`<ul class="list">${invoice.payments.map((payment) => html`<li><span class="grow"><strong>${invoiceMoney(Math.round(Number(payment.amount) * 100))}</strong> · ${date(payment.paid_on)}<span class="sub">${payment.reference || 'Bank transfer'}${payment.note ? ` · ${payment.note}` : ''}</span></span></li>`)}</ul>` : html`<p class="muted">No payments recorded.</p>`}</section>`);
  actions(view, {
    edit: () => showInvoiceForm(invoice),
    issue: async () => {
      if (!confirm('Issue this invoice? It will receive a permanent number and cannot be edited or deleted.')) return;
      await post(`/invoices/${id}/issue`);
      toast('Invoice issued');
      invoiceView(view, id);
    },
    payment: () => openForm({
      title: 'Record bank transfer',
      fields: [
        { name: 'amount', label: `Amount (€), balance ${invoiceMoney(invoice.balance_cents)}`, type: 'number', required: true, min: 0.01, max: 10000000 },
        { name: 'paid_on', label: 'Payment date', type: 'date', required: true },
        { name: 'reference', label: 'Bank reference', max: 120 },
        { name: 'note', label: 'Note', type: 'textarea', max: 1000, full: true }
      ],
      values: { paid_on: invoiceToday() },
      submit: 'Save payment',
      onSubmit: async (values) => { await post(`/invoices/${id}/payments`, values); toast('Payment recorded'); invoiceView(view, id); }
    }),
    void: () => openForm({
      title: 'Void invoice',
      fields: [{ name: 'reason', label: 'Reason for voiding', type: 'textarea', required: true, max: 1000, full: true }],
      submit: 'Void invoice',
      onSubmit: async ({ reason }) => { await post(`/invoices/${id}/void`, { reason }); toast('Invoice voided'); invoiceView(view, id); }
    })
  });
}

/* ---------------- support ---------------- */
const TICKET_STATUS = ['open', 'in_progress', 'waiting_client', 'resolved', 'closed'];
const TICKET_PRIORITY = ['low', 'normal', 'high', 'urgent'];

async function ticketsView(view) {
  const { tickets } = await get('/tickets');
  show(view, html`<header class="page-head"><div><h1>Support</h1><p class="muted">Client support conversations.</p></div></header>
    <div class="table-wrap">${tickets.length ? html`<table><thead><tr><th>Ticket</th><th>Client</th><th>Priority</th><th>Status</th><th>Updated</th></tr></thead><tbody>
      ${tickets.map((ticket) => html`<tr class="link" data-href="#/tickets/${ticket.id}"><td><strong>#${ticket.id} ${ticket.subject}</strong><span class="sub">${ticket.message_count} messages</span></td><td>${ticket.company_name}</td><td>${chip(ticket.priority)}</td><td>${chip(ticket.status)}</td><td>${ago(ticket.updated_at)}</td></tr>`)}</tbody></table>` : html`<div class="empty">No support tickets yet.</div>`}</div>`);
  actions(view, {});
}

async function ticketView(view, id) {
  const { ticket } = await get(`/tickets/${id}`);
  show(view, html`<a class="back" href="#/tickets">← All tickets</a>
    <header class="page-head"><div><h1>#${ticket.id} · ${ticket.subject}</h1><p class="muted">${ticket.company_name} · created ${date(ticket.created_at)}</p></div>
      <div class="actions"><label class="field">Status<select id="ticket-status" data-ticket-field="status">${TICKET_STATUS.map((value) => html`<option value="${value}" ${value === ticket.status ? 'selected' : ''}>${label(value)}</option>`)}</select></label>
      <label class="field">Priority<select id="ticket-priority" data-ticket-field="priority">${TICKET_PRIORITY.map((value) => html`<option value="${value}" ${value === ticket.priority ? 'selected' : ''}>${label(value)}</option>`)}</select></label></div></header>
    <section class="stack">${ticket.messages.map((message) => html`<article class="card"><header><strong>${message.author_name || (message.author_role === 'admin' ? 'Make It So' : 'Client')}</strong><span class="muted">${ago(message.created_at)}</span></header><p class="msg">${message.body}</p></article>`)}</section>
    ${ticket.status !== 'closed' ? html`<form class="card stack" id="ticket-reply" style="margin-top:16px"><label class="field">Reply<textarea name="message" maxlength="5000" required></textarea></label><button class="btn primary">Send reply</button></form>` : html`<p class="notice" style="margin-top:16px">This ticket is closed. Reopen it to reply.</p>`}`);
  for (const element of view.querySelectorAll('[data-ticket-field]')) {
    element.onchange = async () => {
      try {
        await patch(`/tickets/${id}`, { [element.dataset.ticketField]: element.value });
        toast('Ticket updated');
      } catch (error) { toast(error.message, 'error'); ticketView(view, id); }
    };
  }
  const form = $('#ticket-reply', view);
  if (form) form.onsubmit = async (event) => {
    event.preventDefault();
    try { await post(`/tickets/${id}/messages`, { message: form.elements.message.value }); ticketView(view, id); }
    catch (error) { toast(error.message, 'error'); }
  };
}

/* ---------------- leads ---------------- */
async function leadsView(view, _, filter = '') {
  const LEAD_TABS = [['', 'All'], ['new', 'New'], ['contacted', 'Contacted'], ['qualified', 'Qualified'], ['converted', 'Converted'], ['lost', 'Lost']];
  const { leads } = await get(`/leads${filter ? `?status=${filter}` : ''}`);
  show(view, html`
    <header class="page-head"><div><h1>Leads</h1><p class="muted">Messages from the contact form on your website.</p></div></header>
    <div class="tabs" role="group" aria-label="Filter leads">${LEAD_TABS.map(([k, t]) => html`<button class="tab" data-action="tab" data-filter="${k}" aria-pressed="${k === filter}">${translateText(t)}</button>`)}</div>
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
    convert: async (_, id) => { if (confirm(translateText('Create a client (with contact and note) from this lead?'))) { const { client } = await post(`/leads/${id}/convert`); toast('Client created'); refreshBadge(); location.hash = `#/clients/${client.id}`; } },
    delete: async (_, id) => { if (confirm(translateText('Delete this lead permanently?'))) { await del(`/leads/${id}`); toast('Lead deleted'); leadsView(view, null, filter); refreshBadge(); } }
  });
}

/* ---------------- email settings ---------------- */
async function emailSettingsView(view) {
  const { settings } = await get('/admin/settings/email');
  const notifications = settings.notifications;
  show(view, html`
    <header class="page-head"><div><h1>Email settings</h1><p class="muted">Configure the service used for contact forms, client invitations, project updates and status notifications.</p></div></header>
    <form id="email-settings" class="stack" novalidate>
      <section class="card"><header><h2>Provider</h2></header>
        <div class="form-grid">
          <label class="field" for="email-provider"><span>Email provider</span><select id="email-provider" name="provider"><option value="resend" ${settings.provider === 'resend' ? 'selected' : ''}>Resend</option><option value="smtp" ${settings.provider === 'smtp' ? 'selected' : ''}>SMTP</option></select></label>
          <label class="field" for="email-from"><span>From address</span><input id="email-from" name="email_from" type="text" value="${settings.email_from}" required placeholder="Make It So &lt;hello@example.com&gt;"></label>
          <label class="field" for="contact-email"><span>Contact recipient</span><input id="contact-email" name="contact_email" type="email" value="${settings.contact_email}" placeholder="hello@example.com"></label>
        </div>
      </section>
      <section class="card email-provider-settings" data-provider="resend"><header><h2>Resend</h2></header>
        <div class="form-grid">
          <label class="field full" for="resend-api-key"><span>Resend API key</span><input id="resend-api-key" name="resend_api_key" type="password" autocomplete="new-password" placeholder="${settings.resend_api_key_set ? 'Leave blank to keep the saved key.' : 'No key saved.'}"><small>${settings.resend_api_key_set ? 'A Resend API key is configured.' : 'No key saved.'}</small></label>
          <label class="check full" for="clear-resend-key"><input id="clear-resend-key" name="clear_resend_api_key" type="checkbox"> Remove saved API key</label>
        </div>
      </section>
      <section class="card email-provider-settings" data-provider="smtp"><header><h2>SMTP</h2></header>
        <div class="form-grid">
          <label class="field" for="smtp-host"><span>SMTP host</span><input id="smtp-host" name="smtp_host" type="text" value="${settings.smtp_host}" placeholder="smtp.example.com"></label>
          <label class="field" for="smtp-port"><span>SMTP port</span><input id="smtp-port" name="smtp_port" type="number" min="1" max="65535" value="${settings.smtp_port}" required></label>
          <label class="field" for="smtp-user"><span>SMTP username</span><input id="smtp-user" name="smtp_user" type="text" value="${settings.smtp_user}" autocomplete="username"></label>
          <label class="field" for="smtp-password"><span>SMTP password</span><input id="smtp-password" name="smtp_password" type="password" autocomplete="new-password" placeholder="${settings.smtp_password_set ? 'Leave blank to keep the saved password.' : 'No password saved.'}"><small>${settings.smtp_password_set ? 'An SMTP password is configured.' : 'No password saved.'}</small></label>
          <label class="check full" for="smtp-secure"><input id="smtp-secure" name="smtp_secure" type="checkbox" ${settings.smtp_secure ? 'checked' : ''}> Use a secure connection</label>
          <label class="check full" for="clear-smtp-password"><input id="clear-smtp-password" name="clear_smtp_password" type="checkbox"> Remove saved SMTP password</label>
        </div>
      </section>
      <section class="card"><header><h2>Notification preferences</h2></header>
        <p class="muted">Choose which system emails are sent. Contact requests are always saved in the admin. Client invitations still create a link you can copy. Status subscription confirmations and unsubscribe requests are not affected by the status pause.</p>
        <div class="notification-preferences">
          <label class="check" for="notify-contact-leads"><input id="notify-contact-leads" name="notify_contact_leads" type="checkbox" ${notifications.contactLeads ? 'checked' : ''}> Email me when a website contact form is submitted</label>
          <label class="check" for="notify-client-invitations"><input id="notify-client-invitations" name="notify_client_invitations" type="checkbox" ${notifications.clientInvitations ? 'checked' : ''}> Send client portal invitation emails</label>
          <label class="check" for="notify-project-updates"><input id="notify-project-updates" name="notify_project_updates" type="checkbox" ${notifications.projectUpdates ? 'checked' : ''}> Send project and milestone update emails</label>
          <label class="check" for="pause-status-updates"><input id="pause-status-updates" name="pause_status_updates" type="checkbox" ${notifications.statusUpdates ? '' : 'checked'}> Pause public status incident and recovery emails</label>
        </div>
      </section>
      <section class="card stack">
        <p class="muted"><span>Secrets are encrypted before they are stored and are never displayed again.</span> <span>A test email will be sent to your admin account address.</span></p>
        <p class="form-error" role="alert"></p>
        <div class="actions"><button class="btn primary" type="submit">Save email settings</button><button class="btn" type="button" id="test-email">Send test email</button></div>
      </section>
    </form>`);

  const form = $('#email-settings', view);
  const provider = $('#email-provider', form);
  const updateProviderSections = () => {
    for (const section of form.querySelectorAll('.email-provider-settings')) {
      section.hidden = section.dataset.provider !== provider.value;
    }
  };
  provider.onchange = updateProviderSections;
  updateProviderSections();
  form.onsubmit = async (event) => {
    event.preventDefault();
    const error = $('.form-error', form);
    error.textContent = '';
    try {
      await put('/admin/settings/email', {
        provider: provider.value,
        email_from: form.elements.email_from.value,
        contact_email: form.elements.contact_email.value,
        smtp_host: form.elements.smtp_host.value,
        smtp_port: Number(form.elements.smtp_port.value),
        smtp_secure: form.elements.smtp_secure.checked,
        smtp_user: form.elements.smtp_user.value,
        smtp_password: form.elements.smtp_password.value,
        resend_api_key: form.elements.resend_api_key.value,
        clear_smtp_password: form.elements.clear_smtp_password.checked,
        clear_resend_api_key: form.elements.clear_resend_api_key.checked,
        notifications: {
          contactLeads: form.elements.notify_contact_leads.checked,
          clientInvitations: form.elements.notify_client_invitations.checked,
          projectUpdates: form.elements.notify_project_updates.checked,
          statusUpdates: !form.elements.pause_status_updates.checked
        }
      });
      toast('Email settings saved');
      await emailSettingsView(view);
    } catch (exception) {
      error.textContent = exception.message;
    }
  };
  $('#test-email', view).onclick = async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      await post('/admin/settings/email/test');
      toast('Test email sent');
    } catch (exception) {
      toast(exception.message, 'error');
    } finally {
      button.disabled = false;
    }
  };
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

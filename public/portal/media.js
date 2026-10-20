const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const names = { jellyfin: 'Jellyfin', jellyseerr: 'Jellyseerr', ubuntu: 'Ubuntu server' };
const COPY = {
  en: {
    tab: 'Media servers', title: 'Your media. In view.', intro: 'Your streaming services, requests and server in one place.',
    private: 'Private · account access only', control: 'MEDIA CONTROL', manual: 'Manually updated by Make It So · not live monitoring',
    unknown: 'Not confirmed', operational: 'Operational', degraded: 'Degraded', offline: 'Offline', maintenance: 'Maintenance',
    summary: 'Service availability', unconfirmed: 'Availability has not yet been confirmed.', confirmed: 'View the latest shared updates below.',
    refresh: 'Refresh', updated: 'Last status update', never: 'Not updated yet', access: 'Your access',
    accessIntro: 'Use your own account. Passwords stay hidden until you verify your portal password.',
    username: 'Username', password: 'Password', show: 'Show password', hide: 'Hide password', copy: 'Copy', copied: 'Copied',
    open: 'Open service', notShared: 'Access has not been shared by the administrator.', noPassword: 'No password shared.',
    noUrl: 'Service link not configured yet.', support: 'Having trouble watching?', supportIntro: 'Tell us which service is affected and what happens.',
    report: 'Report a problem', notes: 'Updates & maintenance', noNotes: 'No shared notices.',
    verify: 'Verify your identity', verifyIntro: 'Enter your client portal password, not your media service password.',
    cancel: 'Cancel', reveal: 'Verify & show', expires: 'Automatically hidden after 30 seconds.',
    loading: 'Loading media services…', retry: 'Try again', unavailable: 'Media services could not be loaded.',
    jellyfin: 'Stream films & series', jellyseerr: 'Request films & series', ubuntu: 'Underlying infrastructure',
    safety: 'Only your client accounts are shared here. Never use a root or administrator account.',
    stale: 'Older manual update — current availability is not verified.',
    automatic: 'Automatic check', manualLabel: 'Manual status', checked: 'Last check', response: 'Response time',
    monitoring: 'Automatic services checked every 60 seconds',
    tcp: 'TCP port reachable only — does not verify Ubuntu health or remote-desktop sign-in.',
    outdated: 'No recent measurement — current availability is not confirmed.',
    pending: 'First check pending', httpWarning: 'This service uses HTTP. Login details are not encrypted in transit. Use HTTPS before signing in.'
  },
  nl: {
    tab: 'Mediaservers', title: 'Jouw media. In beeld.', intro: 'Je streamingdiensten, aanvragen en server op één plek.',
    private: 'Afgeschermd · toegang via je account', control: 'MEDIA CONTROL', manual: 'Handmatig bijgewerkt door Make It So · geen live monitoring',
    unknown: 'Niet bevestigd', operational: 'Operationeel', degraded: 'Vertraagd', offline: 'Offline', maintenance: 'Onderhoud',
    summary: 'Beschikbaarheid van je diensten', unconfirmed: 'De beschikbaarheid is nog niet bevestigd.', confirmed: 'Bekijk hieronder de laatst gedeelde updates.',
    refresh: 'Vernieuwen', updated: 'Laatste statusupdate', never: 'Nog niet bijgewerkt', access: 'Jouw toegang',
    accessIntro: 'Gebruik je eigen account. Wachtwoorden blijven verborgen tot je jouw portaalwachtwoord bevestigt.',
    username: 'Gebruikersnaam', password: 'Wachtwoord', show: 'Wachtwoord tonen', hide: 'Wachtwoord verbergen', copy: 'Kopieer', copied: 'Gekopieerd',
    open: 'Open dienst', notShared: 'Toegang is niet gedeeld door de beheerder.', noPassword: 'Geen wachtwoord gedeeld.',
    noUrl: 'De dienstlink is nog niet ingesteld.', support: 'Lukt het niet om te kijken?', supportIntro: 'Vermeld de dienst en wat je ziet gebeuren.',
    report: 'Probleem melden', notes: 'Meldingen & onderhoud', noNotes: 'Geen gedeelde meldingen.',
    verify: 'Bevestig je identiteit', verifyIntro: 'Vul je wachtwoord van het klantportaal in, niet dat van je mediadienst.',
    cancel: 'Annuleren', reveal: 'Bevestigen & tonen', expires: 'Wordt na 30 seconden automatisch verborgen.',
    loading: 'Mediaservers laden…', retry: 'Opnieuw proberen', unavailable: 'Mediaservers konden niet geladen worden.',
    jellyfin: 'Films & series streamen', jellyseerr: 'Films & series aanvragen', ubuntu: 'Onderliggende infrastructuur',
    safety: 'Alleen je eigen klantaccounts worden hier gedeeld. Gebruik nooit een root- of beheeraccount.',
    stale: 'Oudere handmatige update — de huidige beschikbaarheid is niet geverifieerd.',
    automatic: 'Automatische controle', manualLabel: 'Handmatige status', checked: 'Laatste controle', response: 'Reactietijd',
    monitoring: 'Automatische diensten elke 60 seconden gecontroleerd',
    tcp: 'Alleen bereikbaarheid van de TCP-poort — geen controle van Ubuntu-gezondheid of remote-desktoplogin.',
    outdated: 'Geen recente meting — de huidige beschikbaarheid is niet bevestigd.',
    pending: 'Eerste controle wordt afgewacht', httpWarning: 'Deze dienst gebruikt HTTP. Inloggegevens worden onderweg niet versleuteld. Gebruik HTTPS voordat je inlogt.'
  },
  fr: {
    tab: 'Serveurs média', title: 'Vos médias. En un coup d’œil.', intro: 'Streaming, demandes et serveur au même endroit.',
    private: 'Privé · accès via votre compte', control: 'MEDIA CONTROL', manual: 'Mis à jour manuellement par Make It So · pas de surveillance en direct',
    unknown: 'Non confirmé', operational: 'Opérationnel', degraded: 'Ralenti', offline: 'Hors ligne', maintenance: 'Maintenance',
    summary: 'Disponibilité de vos services', unconfirmed: 'La disponibilité n’a pas encore été confirmée.', confirmed: 'Consultez les dernières informations partagées ci-dessous.',
    refresh: 'Actualiser', updated: 'Dernière mise à jour', never: 'Pas encore mis à jour', access: 'Vos accès',
    accessIntro: 'Utilisez votre compte personnel. Vérifiez votre mot de passe du portail pour afficher un mot de passe.',
    username: 'Identifiant', password: 'Mot de passe', show: 'Afficher le mot de passe', hide: 'Masquer le mot de passe', copy: 'Copier', copied: 'Copié',
    open: 'Ouvrir le service', notShared: 'L’administrateur n’a pas partagé cet accès.', noPassword: 'Aucun mot de passe partagé.',
    noUrl: 'Le lien du service n’est pas encore configuré.', support: 'Un problème de lecture ?', supportIntro: 'Précisez le service concerné et ce qui se passe.',
    report: 'Signaler un problème', notes: 'Informations & maintenance', noNotes: 'Aucune information partagée.',
    verify: 'Confirmez votre identité', verifyIntro: 'Saisissez le mot de passe du portail client, pas celui du service média.',
    cancel: 'Annuler', reveal: 'Vérifier et afficher', expires: 'Masqué automatiquement après 30 secondes.',
    loading: 'Chargement des services média…', retry: 'Réessayer', unavailable: 'Impossible de charger les services média.',
    jellyfin: 'Films et séries en streaming', jellyseerr: 'Demandes de films et séries', ubuntu: 'Infrastructure sous-jacente',
    safety: 'Seuls vos comptes clients sont partagés ici. N’utilisez jamais de compte root ou administrateur.',
    stale: 'Ancienne mise à jour manuelle — disponibilité actuelle non vérifiée.',
    automatic: 'Contrôle automatique', manualLabel: 'Statut manuel', checked: 'Dernier contrôle', response: 'Temps de réponse',
    monitoring: 'Services automatiques contrôlés toutes les 60 secondes',
    tcp: 'Accessibilité du port TCP uniquement — ne vérifie ni la santé Ubuntu ni la connexion au bureau distant.',
    outdated: 'Aucune mesure récente — disponibilité actuelle non confirmée.',
    pending: 'En attente du premier contrôle', httpWarning: 'Ce service utilise HTTP. Les identifiants ne sont pas chiffrés en transit. Utilisez HTTPS avant de vous connecter.'
  }
};

export const mediaTabLabel = (language) => (COPY[language] || COPY.en).tab;

export function createMediaPanel({ container, language, api, support }) {
  const t = COPY[language] || COPY.en;
  const timers = new Set();
  let generation = 0;
  let dialog;
  let busy = false;
  let destroyed = false;
  let hasAutomatic = false;
  const stamp = (value) => value ? new Date(value).toLocaleString(language) : t.never;
  const badge = (service) => `<span class="media-badge health-${esc(service.status)}">${esc(t[service.status] || t.unknown)}</span>${service.service === 'ubuntu' && service.status_source === 'automatic' ? `<p class="media-source muted">${esc(t.tcp)}</p>` : ''}`;
  function conceal() {
    generation++;
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
    container.querySelectorAll('[data-secret]').forEach((input) => { input.value = ''; input.hidden = true; });
    container.querySelectorAll('[data-secret-actions]').forEach((el) => { el.hidden = true; });
    container.querySelectorAll('[data-reveal]').forEach((el) => { el.hidden = false; });
    container.querySelectorAll('[data-mask]').forEach((el) => { el.hidden = false; });
    container.querySelectorAll('.media-feedback').forEach((el) => { el.textContent = ''; });
    if (dialog) { dialog.close(); dialog.remove(); dialog = null; }
  }
  function onVisibility() {
    if (document.hidden) conceal();
    else if (hasAutomatic && !container.hidden) load({ quiet: true });
  }
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', conceal);
  function draw(services) {
    hasAutomatic = services.some((s) => s.status_source === 'automatic');
    const notices = services.filter((s) => s.message);
    container.innerHTML = `<div class="media-heading"><div><span class="eyebrow">${esc(t.tab)}</span><h1>${esc(t.title)}</h1><p class="muted">${esc(t.intro)}</p></div><span class="updated-stamp">${esc(t.private)}</span></div>
      <section class="media-summary"><div><span class="eyebrow">${esc(t.control)}</span><h2>${esc(t.summary)}</h2><p>${esc(services.every((s) => s.status === 'unknown') ? t.unconfirmed : t.confirmed)}</p><small>${esc(hasAutomatic ? t.monitoring : t.manual)}</small></div><button type="button" class="btn" data-refresh>${esc(t.refresh)}</button></section>
      <div class="media-grid">${services.map((s) => `<article class="media-card" data-health="${esc(s.service)}"><header><span class="media-icon" aria-hidden="true">${s.service === 'jellyfin' ? '△' : s.service === 'jellyseerr' ? '+' : '▤'}</span><div><h2>${names[s.service]}</h2><p class="muted">${esc(t[s.service])}</p></div></header>${badge(s)}<p class="media-source muted">${esc(s.status_source === 'automatic' ? t.automatic : t.manualLabel)}</p><dl><dt>${esc(s.status_source === 'automatic' ? t.checked : t.updated)}</dt><dd>${esc(stamp(s.status_source === 'automatic' ? s.checked_at : s.status_updated_at))}</dd>${s.status_source === 'automatic' && s.response_ms !== null && s.response_ms !== undefined ? `<dt>${esc(t.response)}</dt><dd>${esc(s.response_ms)} ms</dd>` : ''}</dl>${s.status_source === 'automatic' ? s.stale ? `<p class="media-stale">${esc(s.checked_at ? t.outdated : t.pending)}</p>` : '' : s.status_updated_at && Date.now() - new Date(s.status_updated_at).getTime() > 86400000 ? `<p class="media-stale">${esc(t.stale)}</p>` : ''}</article>`).join('')}</div>
      <div class="media-notice-grid"><section class="media-card"><h2>${esc(t.notes)}</h2>${notices.length ? notices.map((s) => `<article class="media-notice"><strong>${names[s.service]}</strong><p>${esc(s.message)}</p>${s.status_source === 'automatic' ? '' : `<small class="muted">${esc(stamp(s.status_updated_at))}</small>`}</article>`).join('') : `<p class="muted">${esc(t.noNotes)}</p>`}</section><section class="media-help"><h2>${esc(t.support)}</h2><p>${esc(t.supportIntro)}</p><button type="button" class="btn primary" data-support>${esc(t.report)} →</button></section></div>
      <section class="media-access"><header><h2>${esc(t.access)}</h2><p class="muted">${esc(t.accessIntro)}</p></header><div class="media-grid">${services.map((s) => `<article class="media-card" data-service="${esc(s.service)}"><h3>${names[s.service]}</h3>${s.share_access ? `
        ${s.url ? `<a class="media-url" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.url)} ↗</a>${s.url.startsWith('http:') ? `<p class="notice media-http-warning">${esc(t.httpWarning)}</p>` : ''}` : `<p class="muted">${esc(t.noUrl)}</p>`}
        ${s.username ? `<div class="media-field"><span class="muted">${esc(t.username)}</span><div><strong>${esc(s.username)}</strong><button type="button" class="btn small" data-copy-user>${esc(t.copy)}</button></div></div>` : ''}
        ${s.login_note ? `<p class="media-login-note">${esc(s.login_note)}</p>` : ''}
        <div class="media-field"><span class="muted">${esc(t.password)}</span>${s.has_password ? `<p data-mask>••••••••••••</p><input data-secret type="text" readonly hidden aria-label="${esc(t.password)}" autocomplete="off"><button type="button" class="btn small" data-reveal>${esc(t.show)}</button><div class="actions" data-secret-actions hidden><button type="button" class="btn small" data-hide>${esc(t.hide)}</button><button type="button" class="btn small" data-copy-secret>${esc(t.copy)}</button></div>` : `<p>${esc(t.noPassword)}</p>`}</div>
        ${s.url ? `<a class="btn primary" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(t.open)} ↗</a>` : ''}` : `<p class="muted">${esc(t.notShared)}</p>`}<p class="media-feedback" role="status"></p></article>`).join('')}</div><p class="muted media-safety">${esc(t.safety)}</p></section><p class="error" data-media-error role="alert"></p>`;
    container.querySelector('[data-refresh]').onclick = () => load();
    container.querySelector('[data-support]').onclick = support;
    container.querySelectorAll('[data-service]').forEach((card) => {
      const service = services.find((s) => s.service === card.dataset.service);
      const feedback = card.querySelector('.media-feedback');
      async function copy(value) {
        try { await navigator.clipboard.writeText(value); feedback.textContent = t.copied; }
        catch (error) { feedback.textContent = error.message; }
      }
      card.querySelector('[data-copy-user]')?.addEventListener('click', () => copy(service.username));
      card.querySelector('[data-copy-secret]')?.addEventListener('click', () => copy(card.querySelector('[data-secret]').value));
      card.querySelector('[data-hide]')?.addEventListener('click', conceal);
      card.querySelector('[data-reveal]')?.addEventListener('click', () => reveal(card, service.service));
    });
  }
  async function reveal(card, service) {
    conceal();
    const current = generation;
    const opener = card.querySelector('[data-reveal]');
    dialog = document.createElement('dialog');
    dialog.className = 'media-dialog';
    dialog.innerHTML = `<form class="stack"><h2>${esc(t.verify)}</h2><p class="muted">${esc(t.verifyIntro)}</p><label class="field">${esc(t.password)}<input name="password" type="password" autocomplete="current-password" maxlength="200" required></label><p class="error" role="alert"></p><div class="actions"><button class="btn primary" type="submit">${esc(t.reveal)}</button><button class="btn" type="button" data-cancel>${esc(t.cancel)}</button></div></form>`;
    const activeDialog = dialog;
    document.body.append(dialog);
    dialog.querySelector('[data-cancel]').onclick = () => { conceal(); opener.focus(); };
    dialog.addEventListener('cancel', () => { conceal(); opener.focus(); });
    dialog.querySelector('form').onsubmit = async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const submit = form.querySelector('[type=submit]');
      submit.disabled = true;
      try {
        const result = await api('POST', `/portal/media/${encodeURIComponent(service)}/password`, { password: form.elements.password.value });
        form.reset();
        if (current !== generation || !card.isConnected || container.hidden || document.hidden) return;
        activeDialog.close();
        activeDialog.remove();
        dialog = null;
        const input = card.querySelector('[data-secret]');
        input.value = result.password;
        input.hidden = false;
        card.querySelector('[data-mask]').hidden = true;
        opener.hidden = true;
        card.querySelector('[data-secret-actions]').hidden = false;
        card.querySelector('.media-feedback').textContent = t.expires;
        card.querySelector('[data-hide]').focus();
        timers.add(setTimeout(conceal, 30000));
      } catch (error) {
        if (current === generation) form.querySelector('.error').textContent = error.message;
      } finally { form.elements.password.value = ''; submit.disabled = false; }
    };
    dialog.showModal();
    dialog.querySelector('input').focus();
  }
  async function load({ quiet = false } = {}) {
    if (busy) return;
    busy = true;
    conceal();
    if (!quiet) container.innerHTML = `<p class="muted" role="status">${esc(t.loading)}</p>`;
    try {
      const { services } = await api('GET', '/portal/media');
        if (!destroyed && container.isConnected &&
            (!quiet || (!dialog && !container.querySelector('[data-secret]:not([hidden])')))) {
          const focused = container.contains(document.activeElement) ? document.activeElement : null;
          const action = focused && ['data-refresh', 'data-support', 'data-reveal', 'data-copy-user'].find((attr) => focused.hasAttribute(attr));
          const service = focused?.closest('[data-service]')?.dataset.service;
          draw(services);
          if (quiet && action) {
            const root = service ? container.querySelector(`[data-service="${service}"]`) : container;
            root?.querySelector(`[${action}]`)?.focus({ preventScroll: true });
          }
        }
    } catch (error) {
      if (!destroyed && container.isConnected &&
          (!quiet || (!dialog && !container.querySelector('[data-secret]:not([hidden])')))) {
        container.innerHTML = `<section class="media-card"><h2>${esc(t.unavailable)}</h2><p class="error" role="alert">${esc(error.message)}</p><button type="button" class="btn" data-retry>${esc(t.retry)}</button></section>`;
        container.querySelector('[data-retry]').onclick = () => load();
      }
    } finally { busy = false; }
  }
  const refreshTimer = setInterval(() => {
    if (hasAutomatic && !container.hidden && !document.hidden && !dialog &&
        !container.querySelector('[data-secret]:not([hidden])')) load({ quiet: true });
  }, 30000);
  return {
    load,
    conceal,
    destroy() {
      destroyed = true;
      clearInterval(refreshTimer);
      conceal();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', conceal);
    }
  };
}

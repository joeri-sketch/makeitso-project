(() => {
  'use strict';

  const menu = document.querySelector('.menu-btn[aria-controls="service-nav-links"]');
  const links = document.getElementById('service-nav-links');
  const i18n = window.i18n;
  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  const ensureStatusLink = () => {
    const footerNav = document.querySelector('.footer .foot-top nav');
    if (!footerNav) return;
    let statusLink = footerNav.querySelector('a[data-status-link]');
    if (!statusLink) {
      statusLink = document.createElement('a');
      statusLink.dataset.statusLink = '';
      statusLink.href = '/status/';
      footerNav.append(statusLink);
    }
    statusLink.textContent = i18n?.t('System status') || 'System status';
  };

  const updateLinks = () => {
    ensureStatusLink();
    const language = i18n?.lang || 'en';
    document.querySelectorAll('a[href^="/"]').forEach((link) => {
      const url = new URL(link.getAttribute('href'), location.origin);
      url.searchParams.set('lang', language);
      link.href = `${url.pathname}${url.search}${url.hash}`;
    });
  };
  updateLinks();
  i18n?.onChange(updateLinks);

  if (!menu || !links) return;

  const setOpen = (open) => {
    links.classList.toggle('open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', i18n?.t(open ? 'Close menu' : 'Open menu') || (open ? 'Close menu' : 'Open menu'));
  };

  menu.addEventListener('click', () => setOpen(!links.classList.contains('open')));
  links.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && links.classList.contains('open')) {
      setOpen(false);
      menu.focus();
    }
  });
  i18n?.onChange(() => setOpen(links.classList.contains('open')));
})();

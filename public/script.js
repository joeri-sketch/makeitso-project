(() => {
  'use strict';

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* ---------- translations (i18n.js loads first; fall back to English if missing) ---------- */
  const i18n = window.i18n || { t: (key) => key, onChange() {} };
  const updateServiceLinks = () => {
    $$('[data-service-path]').forEach((link) => {
      const url = new URL(link.dataset.servicePath, location.origin);
      url.searchParams.set('lang', i18n.lang || 'en');
      link.href = `${url.pathname}${url.search}`;
    });
  };
  updateServiceLinks();
  i18n.onChange(updateServiceLinks);

  /* ---------- stardate + year ---------- */
  const now = new Date();
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 864e5);
  const stardate = $('#stardate');
  const renderStardate = () => {
    if (stardate) stardate.textContent = `${i18n.t('Stardate')} ${now.getFullYear()}.${String(dayOfYear).padStart(3, '0')}`;
  };
  renderStardate();
  i18n.onChange(renderStardate);
  const year = $('#year');
  if (year) year.textContent = now.getFullYear();

  /* ---------- preloader: the robot boots up, then the overlay fades out ---------- */
  let resolveReady;
  const ready = new Promise((resolve) => { resolveReady = resolve; }); // page animations wait for this
  const preloader = $('#preloader');
  if (!preloader) {
    resolveReady();
  } else {
    const fill = $('.pre-fill', preloader);
    const percent = $('.pre-pct', preloader);
    const robot = $('.pre-bot', preloader);
    const minTime = reduceMotion ? 300 : 1600;
    const started = performance.now();
    let pageLoaded = document.readyState === 'complete';
    let fontsReady = !document.fonts;
    let value = 0;
    let finished = false;

    if (!pageLoaded) addEventListener('load', () => { pageLoaded = true; }, { once: true });
    if (document.fonts) document.fonts.ready.then(() => { fontsReady = true; });
    document.body.style.overflow = 'hidden';

    const finish = () => {
      if (finished) return;
      finished = true;
      clearInterval(timer);
      fill.style.width = '100%';
      percent.textContent = '100%';
      robot.dataset.mood = 'engage';
      setTimeout(() => {
        preloader.classList.add('done');
        document.body.style.overflow = '';
        resolveReady();
        setTimeout(() => preloader.remove(), 1000);
      }, reduceMotion ? 0 : 600);
    };

    // a timer (not requestAnimationFrame) so it also completes in background tabs
    const timer = setInterval(() => {
      const elapsed = performance.now() - started;
      const cap = pageLoaded && fontsReady ? 100 : 90;
      const target = Math.min(cap, (elapsed / minTime) * 100);
      value += (target - value) * 0.3;
      if (target >= 100 && value > 99.2) value = 100;
      fill.style.width = `${value}%`;
      percent.textContent = `${Math.round(value)}%`;
      if (value >= 100 && elapsed >= minTime) finish();
    }, 40);
    setTimeout(finish, 7000); // fail-safe: never leave visitors on the loader
  }

  /* ---------- scroll reveal ---------- */
  const revealObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        revealObserver.unobserve(entry.target);
      }
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal').forEach((el) => {
    if (el.closest('.hero')) {
      // hero content fades in as soon as the preloader has faded out
      ready.then(() => setTimeout(() => el.classList.add('in'), 60));
    } else {
      revealObserver.observe(el);
    }
  });

  /* ---------- animated counters ---------- */
  const animateCount = (el) => {
    const target = Number(el.dataset.count);
    if (reduceMotion || target === 0) { el.textContent = target + (el.dataset.suffix || ''); return; }
    const start = performance.now();
    const duration = 1500;
    const step = (t) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(target * eased) + (el.dataset.suffix || '');
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const countObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      countObserver.unobserve(entry.target);
      ready.then(() => animateCount(entry.target));
    }
  }, { threshold: 0.6 });
  $$('[data-count]').forEach((el) => countObserver.observe(el));

  /* ---------- warp-speed starfield ---------- */
  class Warp {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.colors = (canvas.dataset.colors || '#ffffff').split(',');
      this.count = Number(canvas.dataset.count) || 140;
      this.base = Number(canvas.dataset.speed) || 0.06;
      this.boost = 0;
      this.targetBoost = 0;
      this.visible = false;
      this.mx = 0;
      this.my = 0;
      this.stars = Array.from({ length: this.count }, () => this.spawn({}, true));
      this.resize();
    }
    spawn(s, initial = false) {
      s.x = (Math.random() * 2 - 1) * 0.9;
      s.y = (Math.random() * 2 - 1) * 0.9;
      s.z = initial ? Math.random() * 0.95 + 0.05 : 1;
      s.pz = s.z;
      s.color = this.colors[(Math.random() * this.colors.length) | 0];
      return s;
    }
    resize() {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = rect.width;
      this.h = rect.height;
      this.canvas.width = Math.max(1, Math.round(rect.width * dpr));
      this.canvas.height = Math.max(1, Math.round(rect.height * dpr));
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    engage(ms = 1100) {
      this.targetBoost = 2.8;
      clearTimeout(this.engageTimer);
      this.engageTimer = setTimeout(() => { this.targetBoost = 0; }, ms);
    }
    step(dt) {
      const { ctx, w, h } = this;
      this.boost += (this.targetBoost - this.boost) * Math.min(1, dt * 5);
      const speed = this.base + this.boost;
      const cx = w / 2 + this.mx * 40;
      const cy = h / 2 + this.my * 26;
      const sx = w * 0.5;
      const sy = h * 0.5;
      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = 'round';
      for (const s of this.stars) {
        s.pz = s.z;
        s.z -= speed * dt;
        const x = cx + (s.x / s.z) * sx;
        const y = cy + (s.y / s.z) * sy;
        if (s.z <= 0.03 || x < -20 || x > w + 20 || y < -20 || y > h + 20) {
          this.spawn(s);
          continue;
        }
        const px = cx + (s.x / s.pz) * sx;
        const py = cy + (s.y / s.pz) * sy;
        const depth = 1 - s.z;
        ctx.globalAlpha = Math.min(1, depth * 1.6 + 0.25);
        ctx.strokeStyle = s.color;
        ctx.lineWidth = depth * 3 + 0.8;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  const warps = $$('canvas.warp').map((canvas) => new Warp(canvas));

  if (warps.length) {
    if (reduceMotion) {
      warps.forEach((w) => w.step(0.001));
    } else {
      const visibility = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          const warp = warps.find((w) => w.canvas === entry.target);
          if (warp) warp.visible = entry.isIntersecting;
        }
      });
      warps.forEach((w) => visibility.observe(w.canvas));

      const resizer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const warp = warps.find((w) => w.canvas === entry.target);
          if (warp) warp.resize();
        }
      });
      warps.forEach((w) => resizer.observe(w.canvas));

      let last = performance.now();
      const tick = (t) => {
        const dt = Math.min(0.05, (t - last) / 1000);
        last = t;
        for (const w of warps) if (w.visible) w.step(dt);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }

  /* ---------- hero pointer parallax ---------- */
  const hero = $('.hero');
  if (hero && !reduceMotion && matchMedia('(hover: hover)').matches) {
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      const mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      const my = ((e.clientY - r.top) / r.height - 0.5) * 2;
      hero.style.setProperty('--mx', mx.toFixed(3));
      hero.style.setProperty('--my', my.toFixed(3));
      warps[0].mx = mx;
      warps[0].my = my;
    });
  }

  /* ---------- "Engage": warp jump, then scroll ---------- */
  const flash = $('.flash');
  $$('[data-engage]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const target = $(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      if (reduceMotion) { target.scrollIntoView(); return; }
      warps.forEach((w) => w.engage());
      if (flash) {
        flash.classList.remove('go');
        void flash.offsetWidth;
        flash.classList.add('go');
      }
      setTimeout(() => target.scrollIntoView({ behavior: 'smooth' }), 550);
    });
  });

  /* ---------- sticky dock ---------- */
  const dock = $('#dock');
  if (dock) {
    const update = () => dock.classList.toggle('show', window.scrollY > window.innerHeight * 0.7);
    addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ---------- mobile menu ---------- */
  const menuBtn = $('.menu-btn');
  const links = $('#nav-links');
  if (menuBtn && links) {
    const setOpen = (open) => {
      links.classList.toggle('open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', i18n.t(open ? 'Close menu' : 'Open menu'));
    };
    menuBtn.addEventListener('click', () => setOpen(!links.classList.contains('open')));
    links.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
    i18n.onChange(() => setOpen(links.classList.contains('open')));
  }

  /* ---------- chat that types itself out ---------- */
  const chat = $('.chat');
  if (chat) {
    const msgs = $$('.msg', chat);
    const typed = $('.typed', chat);
    const status = $('.status-text', chat);
    const list = $('.messages', chat);
    const robot = $('.mascot');
    const setMood = (mood) => { if (robot) robot.dataset.mood = mood; };
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    let run = 0;

    const showAll = () => {
      msgs.forEach((m) => m.classList.add('in'));
      status.textContent = i18n.t('Engaged ✦');
      chat.classList.add('engaged');
      setMood('engage');
    };

    async function play() {
      const id = ++run;
      const alive = () => id === run;
      list.querySelectorAll('.typing').forEach((n) => n.remove());
      msgs.forEach((m) => m.classList.remove('in'));
      typed.textContent = '';
      typed.classList.remove('on');
      chat.classList.remove('engaged');
      status.textContent = i18n.t('Hailing frequencies open');
      setMood('smug');

      const typing = () => {
        const li = document.createElement('li');
        li.className = 'msg us typing';
        li.setAttribute('aria-hidden', 'true');
        li.innerHTML = '<i></i><i></i><i></i>';
        return li;
      };

      await sleep(500); if (!alive()) return;
      msgs[0].classList.add('in');
      setMood('hmm');

      await sleep(1000); if (!alive()) return;
      const dots = typing();
      msgs[1].before(dots);
      setMood('think');
      await sleep(1300); if (!alive()) return;
      dots.remove();
      msgs[1].classList.add('in');
      setMood('smug');

      await sleep(1200); if (!alive()) return;
      msgs[2].classList.add('in');

      await sleep(900); if (!alive()) return;
      typed.classList.add('on');
      for (const ch of 'Make it so.') {
        typed.textContent += ch;
        await sleep(85); if (!alive()) return;
      }
      await sleep(450); if (!alive()) return;
      typed.textContent = '';
      typed.classList.remove('on');
      msgs[3].classList.add('in');
      status.textContent = i18n.t('Engaged ✦');
      chat.classList.add('engaged');
      setMood('engage');
    }

    i18n.onChange(() => {
      status.textContent = i18n.t(chat.classList.contains('engaged') ? 'Engaged ✦' : 'Hailing frequencies open');
    });

    if (reduceMotion) {
      showAll();
    } else {
      const chatObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) { chatObserver.disconnect(); ready.then(play); }
      }, { threshold: 0.4 });
      chatObserver.observe(chat);
    }
    $('.replay', chat).addEventListener('click', () => (reduceMotion ? showAll() : play()));
  }

  /* ---------- contact form ---------- */
  // Sends the message to the backend (lead in the admin area). If the backend is not reachable
  // (for example on static hosting), it falls back to opening the visitor's mail app.
  const form = $('#hail');
  if (form) {
    const note = $('#form-note');
    const MAIL_NOTE = 'Opening your mail app… if nothing happens, email hello@makeitso.studio directly.';
    const SENT_NOTE = 'Message received. We reply within a day.';
    let noteKey = null;
    const setNote = (key) => { noteKey = key; note.textContent = key ? i18n.t(key) : ''; };

    const sendLead = async (payload) => {
      try {
        const res = await fetch('/api/public/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'makeitso' },
          body: JSON.stringify(payload),
          signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined
        });
        return res.ok;
      } catch {
        return false;
      }
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      const data = new FormData(form);
      const button = form.querySelector('button[type="submit"]');
      if (button) button.disabled = true;
      const sent = await sendLead({
        name: data.get('name'),
        email: data.get('email'),
        message: data.get('message'),
        language: i18n.lang || 'en',
        t: Math.round(performance.now())
      });
      if (button) button.disabled = false;
      if (sent) { form.reset(); setNote(SENT_NOTE); return; }

      const subject = i18n.t('New mission from {name}', { name: data.get('name') });
      const body = `${data.get('message')}\n\n— ${data.get('name')} (${data.get('email')})`;
      setNote(MAIL_NOTE);
      window.location.href = `mailto:hello@makeitso.studio?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
    i18n.onChange(() => { if (noteKey) setNote(noteKey); });
  }
})();

/* ════════════════════════════════════════════════
   HelstadSolutions — shared script (nb + en)
   Language-specific strings live in data-* attributes in each page.
   ════════════════════════════════════════════════ */

const root = document.documentElement;
const lang = root.lang || 'nb';
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* NAV */
const navbar = document.getElementById('navbar');
const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 12);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* SMOOTH SCROLL (Lenis) — skipped for visitors who prefer reduced motion */
const lenis = (!reduced && window.Lenis) ? new Lenis({ autoRaf: true, lerp: 0.1 }) : null;

document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const hash = a.getAttribute('href');
  const target = hash === '#' ? 0 : document.querySelector(hash);
  if (target === null) return;
  e.preventDefault();
  if (lenis) lenis.scrollTo(target, { offset: target === 0 ? 0 : -88, duration: 1.4 });
  else if (target === 0) window.scrollTo({ top: 0 });
  else target.scrollIntoView();
});

/* THEME TOGGLE — the new theme grows in a circle from the button */
(function () {
  const btn = document.getElementById('theme-toggle');
  btn.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    const apply = () => {
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    };
    if (!document.startViewTransition || reduced) return apply();

    const r = btn.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    root.classList.add('theme-vt');
    const t = document.startViewTransition(apply);
    t.ready.then(() => root.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 750, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' }
    ));
    t.finished.finally(() => root.classList.remove('theme-vt'));
  });
  // Follow the system setting until the visitor picks a theme themselves
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    let stored = null;
    try { stored = localStorage.getItem('theme'); } catch (err) {}
    if (!stored) root.setAttribute('data-theme', e.matches ? 'dark' : 'light');
  });
})();

/* LANGUAGE DROPDOWN */
(function () {
  const menu  = document.querySelector('.lang');
  const btn   = menu.querySelector('.lang-btn');
  const links = menu.querySelectorAll('.lang-list a');

  const setOpen = open => {
    menu.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
  };
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const open = !menu.classList.contains('open');
    setOpen(open);
    if (open) links[0].focus({ preventScroll: true });
  });
  document.addEventListener('click', e => { if (!menu.contains(e.target)) setOpen(false); });
  menu.addEventListener('keydown', e => {
    if (e.key === 'Escape') { setOpen(false); btn.focus(); }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const i = Array.from(links).indexOf(document.activeElement);
      const n = e.key === 'ArrowDown' ? i + 1 : i - 1;
      links[(n + links.length) % links.length].focus();
    }
  });

  // Folder links ("en/", "../") don't resolve to index.html when the file is opened locally
  if (location.protocol === 'file:') {
    links.forEach(a => { if (a.href.endsWith('/')) a.href += 'index.html'; });
  }
})();

/* SCROLL REVEAL */
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

/* HEADINGS — split into lines that rise out of a mask */
(function () {
  const els = document.querySelectorAll('[data-split]');
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function split(el) {
    if (el.dataset.src === undefined) el.dataset.src = el.innerHTML;
    else el.innerHTML = el.dataset.src;

    // Flatten to words, keeping the class of any wrapping span (e.g. .dim)
    const words = [];
    el.childNodes.forEach(n => {
      const cls = n.nodeType === 1 ? n.className : '';
      n.textContent.split(/\s+/).filter(Boolean).forEach(w => words.push([w, cls]));
    });
    el.innerHTML = words.map(([w, c]) => `<span class="word${c ? ' ' + c : ''}">${esc(w)}</span>`).join(' ');

    // Group words by the line they landed on
    const lines = [];
    let top = null;
    el.querySelectorAll('.word').forEach(w => {
      if (w.offsetTop !== top) { lines.push([]); top = w.offsetTop; }
      lines[lines.length - 1].push(w.outerHTML);
    });
    el.innerHTML = lines.map((l, i) =>
      `<span class="line"><span class="line-inner" style="--i:${i}">${l.join(' ')}</span></span>`
    ).join(' '); // the space keeps the text readable for screen readers and search engines
    el.classList.add('split-ready');
  }

  if (reduced) { els.forEach(el => el.classList.add('split-ready')); return; }

  // Wait for the web font so lines are measured with the final glyph widths
  const fontsReady = Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]);
  fontsReady.then(() => {
    els.forEach(split);
    void document.body.offsetWidth; // commit the hidden state so the first reveal animates
    els.forEach(el => io.observe(el));
  });

  let lastWidth = innerWidth, timer;
  window.addEventListener('resize', () => {
    if (innerWidth === lastWidth) return;
    lastWidth = innerWidth;
    clearTimeout(timer);
    timer = setTimeout(() => els.forEach(split), 150);
  });
})();

/* SERVICE HOVER PREVIEW — a small illustrated card follows the cursor */
(function () {
  const list = document.querySelector('.svc-list');
  if (!list || reduced || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const bars = (hs, x0, step, w, base, inkAt) => hs.map((h, i) =>
    `<rect class="bar ${i === inkAt ? 'ink' : 'f2'}" style="--n:${i}" x="${x0 + i * step}" y="${base - h}" width="${w}" height="${h}" rx="2"/>`).join('');

  const PREVIEWS = {
    systems: `
      <rect class="f" x="0" y="0" width="62" height="210"/>
      <rect class="ink" x="16" y="18" width="20" height="20" rx="6"/>
      <rect class="f2" x="16" y="56" width="30" height="6" rx="3"/><rect class="f2" x="16" y="74" width="24" height="6" rx="3"/>
      <rect class="f2" x="16" y="92" width="30" height="6" rx="3"/><rect class="f2" x="16" y="110" width="20" height="6" rx="3"/>
      <rect class="f" x="78" y="22" width="84" height="8" rx="4"/><circle class="f2" cx="272" cy="26" r="8"/>
      ${[78, 148, 218].map((x, i) => `<rect class="st" x="${x}" y="44" width="62" height="44" rx="8"/>
        <rect class="f" x="${x + 10}" y="54" width="28" height="5" rx="2.5"/>
        <rect class="ink" x="${x + 10}" y="66" width="${[36, 30, 40][i]}" height="10" rx="3"/>`).join('')}
      <rect class="st" x="78" y="98" width="202" height="98" rx="8"/>
      ${bars([34, 52, 40, 64, 48, 72, 58, 80, 66], 92, 20, 11, 184, 7)}`,
    ai: `
      <circle class="ink" cx="28" cy="26" r="11"/>
      <path class="inv" d="M28 19.5l1.7 4.8 4.8 1.7-4.8 1.7-1.7 4.8-1.7-4.8-4.8-1.7 4.8-1.7z"/>
      <rect class="f" x="48" y="22" width="76" height="8" rx="4"/>
      <rect class="ink" x="140" y="48" width="140" height="32" rx="12"/>
      <rect class="inv typ" x="154" y="61" width="96" height="6" rx="3" opacity=".75"/>
      <rect class="f" x="20" y="92" width="200" height="64" rx="12"/>
      <rect class="f2 typ" style="--n:1" x="34" y="106" width="150" height="6" rx="3"/>
      <rect class="f2 typ" style="--n:2" x="34" y="120" width="168" height="6" rx="3"/>
      <rect class="f2 typ" style="--n:3" x="34" y="134" width="104" height="6" rx="3"/>
      <rect class="st" x="20" y="168" width="260" height="28" rx="14"/>
      <rect class="f" x="36" y="179" width="96" height="6" rx="3"/>
      <circle class="ink" cx="265" cy="182" r="9"/>
      <path class="ln" style="stroke:var(--bg-elev)" d="M265 186.5v-9M261.5 181 265 177.5l3.5 3.5"/>`,
    apps: `
      <rect class="st" x="18" y="30" width="172" height="150" rx="10"/>
      <circle class="f2" cx="31" cy="42" r="3"/><circle class="f2" cx="41" cy="42" r="3"/><circle class="f2" cx="51" cy="42" r="3"/>
      <rect class="f2" x="18" y="53" width="172" height="1"/>
      <rect class="f" x="30" y="64" width="148" height="50" rx="6"/>
      <rect class="f2" x="30" y="124" width="120" height="6" rx="3"/><rect class="f2" x="30" y="136" width="86" height="6" rx="3"/>
      <rect class="ink" x="30" y="152" width="52" height="16" rx="8"/>
      <rect class="st" style="stroke:var(--fg);stroke-width:1.5" x="176" y="16" width="104" height="182" rx="20"/>
      <rect class="ink" x="212" y="25" width="32" height="8" rx="4"/>
      <rect class="f" x="188" y="42" width="80" height="50" rx="9"/>
      ${[106, 126, 146].map((y, i) => `<circle class="f2" cx="197" cy="${y + 3}" r="6"/>
        <rect class="f2" x="209" y="${y}" width="${[52, 40, 46][i]}" height="6" rx="3"/>`).join('')}
      <rect class="f2" x="176" y="168" width="104" height="1"/>
      <circle class="ink" cx="204" cy="182" r="3.5"/><circle class="f2" cx="228" cy="182" r="3.5"/><circle class="f2" cx="252" cy="182" r="3.5"/>`,
    integrations: `
      ${[30, 89, 148].map(y => `<path class="wire" d="M62 ${y + 16}C95 ${y + 16} 95 105 124 105"/>
        <path class="wire" d="M176 105C205 105 205 ${y + 16} 238 ${y + 16}"/>`).join('')}
      ${[22, 238].map(x => [30, 89, 148].map(y => `<rect class="st" x="${x}" y="${y}" width="40" height="32" rx="9"/>
        <rect class="f2" x="${x + 10}" y="${y + 10}" width="20" height="4" rx="2"/>
        <rect class="f" x="${x + 10}" y="${y + 18}" width="14" height="4" rx="2"/>`).join('')).join('')}
      <circle class="ink" cx="150" cy="105" r="26"/>
      <path class="inv" d="M153 91l-12 16h9l-3 12 12-16h-9z"/>`,
    web: `
      <rect class="f" x="0" y="0" width="300" height="30"/>
      <circle class="f2" cx="16" cy="15" r="3"/><circle class="f2" cx="26" cy="15" r="3"/><circle class="f2" cx="36" cy="15" r="3"/>
      <rect class="inv" x="100" y="9" width="100" height="12" rx="6"/>
      <rect class="ink" x="20" y="44" width="34" height="7" rx="3"/>
      <rect class="f2" x="190" y="45" width="22" height="5" rx="2.5"/><rect class="f2" x="220" y="45" width="22" height="5" rx="2.5"/><rect class="f2" x="250" y="45" width="22" height="5" rx="2.5"/>
      <rect class="ink" x="20" y="68" width="164" height="14" rx="4"/>
      <rect class="f2" x="20" y="88" width="118" height="14" rx="4"/>
      <rect class="f" x="20" y="114" width="150" height="5" rx="2.5"/><rect class="f" x="20" y="124" width="112" height="5" rx="2.5"/>
      <rect class="ink" x="20" y="140" width="58" height="18" rx="9"/>
      <rect class="f" x="200" y="66" width="80" height="92" rx="8"/>
      <rect class="f" x="20" y="172" width="80" height="24" rx="6"/><rect class="f" x="110" y="172" width="80" height="24" rx="6"/><rect class="f" x="200" y="172" width="80" height="24" rx="6"/>`,
    ops: `
      <circle class="ok" cx="26" cy="24" r="4.5"/>
      <rect class="f2" x="38" y="21" width="80" height="6" rx="3"/><rect class="f" x="222" y="19" width="58" height="10" rx="5"/>
      ${Array.from({ length: 30 }, (_, i) => `<rect class="bar ${i === 17 ? 'f2' : 'ok'}" style="--n:${i}" x="${(20 + i * 8.7).toFixed(1)}" y="42" width="5" height="22" rx="1.5"/>`).join('')}
      <rect class="st" x="20" y="78" width="260" height="82" rx="8"/>
      <path class="f" d="M28 146C60 138 80 128 108 130S160 108 190 112 240 98 272 100L272 152 28 152Z"/>
      <path class="ln draw" d="M28 146C60 138 80 128 108 130S160 108 190 112 240 98 272 100"/>
      ${[172, 188].map(y => `<circle class="ok" cx="27" cy="${y + 2.5}" r="3"/>
        <rect class="f2" x="38" y="${y}" width="86" height="5" rx="2.5"/>
        <rect class="f" x="232" y="${y}" width="48" height="5" rx="2.5"/>`).join('')}`
  };

  const W = 300, H = 210;
  const wrap = document.createElement('div');
  wrap.className = 'svc-preview';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = `<div class="svc-preview-card">${Object.entries(PREVIEWS).map(([k, svg]) =>
    `<div class="pv" data-pv="${k}"><svg viewBox="0 0 ${W} ${H}">${svg}</svg></div>`).join('')}</div>`;
  document.body.appendChild(wrap);
  const panes = wrap.querySelectorAll('.pv');

  let x = 0, y = 0, tx = 0, ty = 0, raf = null, active = null, hideTimer;
  function loop() {
    x += (tx - x) * 0.14;
    y += (ty - y) * 0.14;
    const tilt = Math.max(-8, Math.min(8, (tx - x) * 0.06));
    wrap.style.transform = `translate3d(${x - W / 2}px, ${y - H / 2}px, 0) rotate(${tilt}deg)`;
    raf = (Math.abs(tx - x) > 0.1 || Math.abs(ty - y) > 0.1) ? requestAnimationFrame(loop) : null;
  }
  list.addEventListener('mousemove', e => {
    tx = e.clientX; ty = e.clientY;
    if (!wrap.classList.contains('show')) { x = tx; y = ty; }
    if (!raf) raf = requestAnimationFrame(loop);
  });
  list.querySelectorAll('.svc').forEach(row => row.addEventListener('mouseenter', () => {
    clearTimeout(hideTimer);
    if (row.dataset.pv === active) return;
    active = row.dataset.pv;
    panes.forEach(p => p.classList.toggle('active', p.dataset.pv === active));
    wrap.classList.add('show');
  }));
  list.addEventListener('mouseleave', () => {
    wrap.classList.remove('show');
    // reset after the fade so the illustration animates again next time
    hideTimer = setTimeout(() => { active = null; panes.forEach(p => p.classList.remove('active')); }, 300);
  });
})();

/* SERVICE CHIPS — multi-select, mirrored into a hidden field */
const chips = document.querySelectorAll('.chip');
const servicesInput = document.getElementById('services');

function syncServices() {
  servicesInput.value = Array.from(chips)
    .filter(c => c.getAttribute('aria-pressed') === 'true')
    .map(c => c.dataset.value)
    .join(', ');
}
chips.forEach(chip => chip.addEventListener('click', () => {
  chip.setAttribute('aria-pressed', String(chip.getAttribute('aria-pressed') !== 'true'));
  syncServices();
}));

// Clicking a service row pre-selects it in the form (the link itself scrolls to the contact section)
document.querySelectorAll('.svc[data-service]').forEach(row => row.addEventListener('click', () => {
  const chip = Array.from(chips).find(c => c.dataset.value === row.dataset.service);
  if (chip) { chip.setAttribute('aria-pressed', 'true'); syncServices(); }
}));

/* CONTACT FORM — Formspree */
const form       = document.getElementById('contact-form');
const submitBtn  = document.getElementById('submit-btn');
const formStatus = document.getElementById('form-status');

function setLabel(btn, text) {
  const span = btn.querySelector('.btn-label > span');
  span.textContent = text;
  span.dataset.text = text;
}

if (form) {
  const msg = form.dataset;
  const idleLabel = submitBtn.querySelector('.btn-label > span').textContent;

  form.addEventListener('submit', async e => {
    e.preventDefault();

    setLabel(submitBtn, msg.sending);
    submitBtn.disabled = true;
    formStatus.hidden = true;
    formStatus.classList.remove('ok');

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        form.reset();
        chips.forEach(c => c.setAttribute('aria-pressed', 'false'));
        syncServices();
        formStatus.textContent = msg.success;
        formStatus.classList.add('ok');
      } else {
        formStatus.textContent = msg.error + ' ' + _em();
      }
    } catch {
      formStatus.textContent = msg.error + ' ' + _em();
    }

    formStatus.hidden = false;
    setLabel(submitBtn, idleLabel);
    submitBtn.disabled = false;
  });
}

/* FOOTER — parallax as it slides out, live Oslo time, measured load time */
(function () {
  const footer = document.querySelector('.footer');
  const main   = document.querySelector('main');
  const inner  = footer.querySelector('.footer-inner');

  if (!reduced) {
    let ticking = false;
    const update = () => {
      ticking = false;
      const shown = (innerHeight - main.getBoundingClientRect().bottom) / footer.offsetHeight;
      const p = Math.min(1, Math.max(0, shown));
      inner.style.transform = `translate3d(0, ${((1 - p) * -30).toFixed(2)}%, 0)`;
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  const clock = document.getElementById('clock');
  const fmt = new Intl.DateTimeFormat(lang, { timeZone: 'Europe/Oslo', hour: '2-digit', minute: '2-digit' });
  const tick = () => { clock.textContent = fmt.format(new Date()); };
  tick();
  setInterval(tick, 15000);

  // Real load time of this visit, from the browser's own measurements
  const perf = document.getElementById('perf');
  const showLoadTime = () => setTimeout(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const s = nav ? nav.loadEventStart / 1000 : 0;
    if (s <= 0 || s > 1.5) return;
    perf.querySelector('b').textContent =
      s.toLocaleString(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' s';
    perf.hidden = false;
  }, 0);
  if (document.readyState === 'complete') showLoadTime();
  else window.addEventListener('load', showLoadTime);
})();

// Email obfuscation — decoded at runtime so scrapers see no plain address
function _em() { return atob('YWxleGFuZGVyQGhlbHN0YWRzb2x1dGlvbnMuY29t'); }
document.querySelectorAll('[data-email]').forEach(el => {
  const addr = _em();
  const link = document.createElement('a');
  link.href = 'mailto:' + addr;
  link.textContent = addr;
  el.appendChild(link);
});

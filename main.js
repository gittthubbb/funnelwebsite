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

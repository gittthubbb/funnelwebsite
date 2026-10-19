/* ════════════════════════════════════════════════
   HelstadSolutions — shared script (nb + en)
   Language-specific strings live in data-* attributes in each page.
   ════════════════════════════════════════════════ */

/* NAV */
const navbar = document.getElementById('navbar');
const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 12);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* THEME TOGGLE */
(function () {
  const root = document.documentElement;
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
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
  const lang = document.querySelector('.lang');
  const btn  = lang.querySelector('.lang-btn');
  const links = lang.querySelectorAll('.lang-list a');

  const setOpen = open => {
    lang.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
  };
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const open = !lang.classList.contains('open');
    setOpen(open);
    if (open) links[0].focus({ preventScroll: true });
  });
  document.addEventListener('click', e => { if (!lang.contains(e.target)) setOpen(false); });
  lang.addEventListener('keydown', e => {
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

// Clicking a service row pre-selects it in the form (the link itself scrolls to #kontakt)
document.querySelectorAll('.svc[data-service]').forEach(row => row.addEventListener('click', () => {
  const chip = document.querySelector(`.chip[data-value="${row.dataset.service}"]`);
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

// Email obfuscation — decoded at runtime so scrapers see no plain address
function _em() { return atob('YWxleGFuZGVyQGhlbHN0YWRzb2x1dGlvbnMuY29t'); }
document.querySelectorAll('[data-email]').forEach(el => {
  const addr = _em();
  const link = document.createElement('a');
  link.href = 'mailto:' + addr;
  link.textContent = addr;
  el.appendChild(link);
});

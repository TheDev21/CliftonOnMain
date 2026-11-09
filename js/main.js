const nav = document.getElementById('nav');
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
let menuOpen = false;

hamburger.addEventListener('click', () => {
  menuOpen = !menuOpen;
  mobileMenu.classList.toggle('open', menuOpen);
  const spans = hamburger.querySelectorAll('span');
  if (menuOpen) {
    spans[0].style.transform = 'translateY(7px) rotate(45deg)';
    spans[1].style.opacity = '0';
    spans[2].style.transform = 'translateY(-7px) rotate(-45deg)';
  } else {
    spans[0].style.transform = '';
    spans[1].style.opacity = '';
    spans[2].style.transform = '';
  }
});

document.querySelectorAll('.mobile-link').forEach(link => {
  link.addEventListener('click', () => {
    menuOpen = false;
    mobileMenu.classList.remove('open');
    const spans = hamburger.querySelectorAll('span');
    spans.forEach(s => s.style = '');
  });
});

/* =========================================
   SCROLL REVEALS — staggered, word-by-word headings.
   Content stays visible if JS or IntersectionObserver is unavailable.
   ========================================= */
(() => {
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.documentElement.classList.add('js-reveal');
  // split section headings into words
  document.querySelectorAll('.section-intro h2, .reviews-head h2, .book-intro h2, .about-text h2, .bottom-cta h2').forEach(h => {
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(w => {
            if (!w.trim()) { frag.appendChild(document.createTextNode(w)); return; }
            const sp = document.createElement('span'); sp.className = 'word'; sp.innerHTML = `<span>${w}</span>`;
            frag.appendChild(sp);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(h);
    h.querySelectorAll('.word > span').forEach((w, i) => (w.style.transitionDelay = `${i * 60}ms`));
    h.classList.add('reveal-words');
  });
  const targets = document.querySelectorAll('.service-row, .info-block, .review-slide, .planner, .about-photo-wrap, .about-checklist li, .steps-list li, .stat, .faq-item, .reveal-words');
  targets.forEach(el => {
    el.classList.add('reveal');
    const sib = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
    el.style.setProperty('--d', `${Math.min(sib.indexOf(el), 6) * 70}ms`);
  });
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
  }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  targets.forEach(el => io.observe(el));
})();

/* =========================================
   SHOP DETAILS — the one place to update phone, address and hours
   for every interactive feature (status, planner, reminders, QR codes,
   contacts card, maps). Also update the matching text in index.html.
   ========================================= */
const SHOP = {
  name: "Clifton's On Main",
  tel: '+12766083772',
  phone: '(276) 608-3772',
  street: '272 W Main St',
  city: 'Abingdon', region: 'VA', zip: '24210',
  get address() { return `${this.street}, ${this.city}, ${this.region} ${this.zip}`; },
  get mapsQuery() { return encodeURIComponent(this.address); }
};

/* =========================================
   LIVE OPEN / CLOSED STATUS
   Hours are evaluated in the shop's timezone (America/New_York),
   so a visitor anywhere sees the shop's real status.
   ========================================= */
const HOURS = { // day index (0 = Sunday): [openMinutes, closeMinutes]
  0: null,
  1: [540, 1020], 2: [540, 1020], 3: [540, 1020], 4: [540, 1020], 5: [540, 1020],
  6: [540, 840]
};
const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function shopNow() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false
  }).formatToParts(new Date());
  const get = t => parts.find(p => p.type === t).value;
  const day = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(get('weekday'));
  const mins = (parseInt(get('hour'), 10) % 24) * 60 + parseInt(get('minute'), 10);
  return { day, mins };
}

function fmtTime(m) {
  const h = Math.floor(m / 60), mm = m % 60;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return mm ? `${h12}:${String(mm).padStart(2, '0')} ${suffix}` : `${h12} ${suffix}`;
}

function fmtDuration(m) {
  const h = Math.floor(m / 60), mm = m % 60;
  if (h && mm) return `${h} hr ${mm} min`;
  if (h) return `${h} hr`;
  return `${mm} min`;
}

function getStatus() {
  const { day, mins } = shopNow();
  const today = HOURS[day];
  if (today && mins >= today[0] && mins < today[1]) {
    const left = today[1] - mins;
    return { open: true, closingSoon: left <= 60, day, mins,
      text: left <= 60 ? `Open now · closes in ${fmtDuration(left)}` : `Open now · until ${fmtTime(today[1])}` };
  }
  // find next opening
  for (let i = 0; i < 8; i++) {
    const d = (day + i) % 7, h = HOURS[d];
    if (!h) continue;
    if (i === 0 && mins >= h[0]) continue;
    const when = i === 0 ? 'today' : i === 1 ? 'tomorrow' : DAY_NAMES[d];
    return { open: false, day, mins, nextDay: d, nextOpen: h[0], daysAhead: i,
      text: `Closed now · opens ${when} at ${fmtTime(h[0])}` };
  }
}

function renderStatus() {
  const st = getStatus();
  document.querySelectorAll('[data-live-status]').forEach(el => {
    el.classList.toggle('is-open', st.open);
    el.classList.toggle('is-soon', !!st.closingSoon);
    el.classList.toggle('is-closed', !st.open);
    const t = el.querySelector('[data-live-text]');
    if (t) t.textContent = st.text;
  });
  document.querySelectorAll('.hours-row[data-day]').forEach(row => {
    row.classList.toggle('is-today', +row.dataset.day === st.day);
  });
  document.dispatchEvent(new CustomEvent('shopstatus', { detail: st }));
  return st;
}
renderStatus();
setInterval(renderStatus, 30000);

/* Short status label for the mobile action bar */
document.addEventListener('shopstatus', e => {
  const st = e.detail;
  document.querySelectorAll('[data-live-short]').forEach(el => {
    el.textContent = st.open ? (st.closingSoon ? 'Closing soon' : 'Open now') : 'Closed';
  });
});
renderStatus();

/* =========================================
   "REMIND ME TO CALL" — when the shop is closed, offer a
   calendar reminder (.ics) timed for the next opening.
   Works with Apple, Google and Outlook calendars, no backend.
   ========================================= */
function nextOpeningUTC(st) {
  // Build the opening moment in New York time, then convert to UTC.
  const now = new Date();
  const target = new Date(now.getTime() + st.daysAhead * 86400000);
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(target);
  const [y, m, d] = ymd.split('-').map(Number);
  const h = Math.floor(st.nextOpen / 60), min = st.nextOpen % 60;
  // Guess UTC by assuming offset, then correct using the real NY offset at that moment.
  let guess = Date.UTC(y, m - 1, d, h + 5, min);
  const nyHour = +new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }).format(new Date(guess)) % 24;
  guess += (h - nyHour) * 3600000;
  return new Date(guess + 10 * 60000); // 10 minutes after opening
}

function icsStamp(d) { return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }

function downloadReminder() {
  let st = getStatus();
  if (st.open) {
    // Open right now: remind them at the next day's opening instead.
    for (let i = 1; i < 8; i++) {
      const d = (st.day + i) % 7;
      if (HOURS[d]) { st = { ...st, daysAhead: i, nextDay: d, nextOpen: HOURS[d][0] }; break; }
    }
  }
  const start = nextOpeningUTC(st);
  const end = new Date(start.getTime() + 15 * 60000);
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Cliftons On Main//Reminder//EN', 'BEGIN:VEVENT',
    `UID:${Date.now()}@cliftonsonmain`, `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(start)}`, `DTEND:${icsStamp(end)}`,
    'SUMMARY:Call Clifton\'s On Main to book a cut',
    `DESCRIPTION:Call ${SHOP.phone} to book. ${SHOP.address.replace(/,/g, '\\,')}`,
    `LOCATION:${SHOP.address.replace(/,/g, '\\,')}`,
    'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:Call Clifton\'s On Main', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = 'call-cliftons-on-main.ics';
  document.body.appendChild(a); a.click(); a.remove();
}

/* Reminder chooser: Google Calendar (web, great on Android) or Apple/Outlook (.ics) */
function reminderStart() {
  let st = getStatus();
  if (st.open) for (let i = 1; i < 8; i++) { const d = (st.day + i) % 7; if (HOURS[d]) { st = { ...st, daysAhead: i, nextDay: d, nextOpen: HOURS[d][0] }; break; } }
  return nextOpeningUTC(st);
}
function googleCalUrl() {
  const s = reminderStart(), e = new Date(s.getTime() + 15 * 60000);
  const q = new URLSearchParams({
    action: 'TEMPLATE', text: "Call Clifton's On Main to book a cut",
    dates: `${icsStamp(s)}/${icsStamp(e)}`,
    details: `Call ${SHOP.phone} to book.`, location: SHOP.address
  });
  return 'https://calendar.google.com/calendar/render?' + q;
}
function openReminderMenu(btn) {
  document.querySelector('.reminder-menu')?.remove();
  const menu = document.createElement('div');
  menu.className = 'reminder-menu';
  menu.innerHTML = `<a href="${googleCalUrl()}" target="_blank" rel="noopener">Google Calendar</a><button type="button">Apple / Outlook (.ics)</button>`;
  menu.querySelector('button').addEventListener('click', () => { downloadReminder(); menu.remove(); });
  menu.querySelector('a').addEventListener('click', () => setTimeout(() => menu.remove(), 100));
  btn.insertAdjacentElement('afterend', menu);
  setTimeout(() => document.addEventListener('click', function off(e) { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', off); } }), 0);
}
document.querySelectorAll('[data-reminder]').forEach(b => b.addEventListener('click', () => openReminderMenu(b)));
document.addEventListener('shopstatus', e => {
  const st = e.detail;
  document.querySelectorAll('[data-reminder], [data-reminder-wrap]').forEach(el => {
    if (el.closest('[data-reminder-wrap]') && el.matches('[data-reminder]')) return;
    el.hidden = st.open;
  });
  const when = st.open ? '' : st.daysAhead === 0 ? 'today' : st.daysAhead === 1 ? 'tomorrow' : DAY_NAMES[st.nextDay];
  document.querySelectorAll('[data-reminder-label]').forEach(el => {
    el.textContent = `Remind me ${when} at ${fmtTime(st.nextOpen || 540)}`;
  });
});
renderStatus();

/* =========================================
   DESKTOP CALL MODAL — desktop users can't tap tel: links,
   so show a scannable QR code and a copy button instead.
   QR library is loaded lazily from cdnjs only when needed.
   ========================================= */
const callModal = document.getElementById('callModal');
const isTouch = matchMedia('(hover: none) and (pointer: coarse)').matches;
let qrLoaded = false;

function withQr(cb) {
  if (window.qrcode) return cb();
  const s = document.createElement('script');
  s.src = 'js/vendor/qrcode.js'; // qrcode-generator 1.4.4, MIT, self-hosted
  s.onload = cb;
  s.onerror = () => document.querySelectorAll('.call-modal__qr:empty').forEach(el => (el.textContent = '📱'));
  document.head.appendChild(s);
}
function drawQr(elId, data) {
  withQr(() => {
    const el = document.getElementById(elId);
    if (!el || el.dataset.done) return;
    const qr = qrcode(0, 'M'); qr.addData(data); qr.make();
    el.innerHTML = qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
    el.dataset.done = '1';
  });
}
function loadQr() { drawQr('callQr', 'tel:' + SHOP.tel); }

if (callModal && !isTouch) {
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="tel:"]');
    if (!a || a.hasAttribute('data-direct-call')) return;
    e.preventDefault();
    loadQr();
    callModal.showModal();
  });
  callModal.addEventListener('click', e => {
    if (e.target === callModal || e.target.closest('[data-close-modal]')) callModal.close();
  });
}

document.querySelectorAll('[data-copy-phone]').forEach(btn => {
  btn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(SHOP.phone); btn.textContent = 'Copied ✓'; }
    catch { btn.textContent = SHOP.phone; }
    setTimeout(() => (btn.textContent = 'Copy number'), 2000);
  });
});

/* Hero rotating service word */
(() => {
  const rot = document.querySelector('[data-rotator]');
  if (!rot || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  setInterval(() => {
    const words = [...rot.children];
    const cur = rot.querySelector('.is-active') || words[0];
    const next = words[(words.indexOf(cur) + 1) % words.length];
    cur.classList.remove('is-active'); cur.classList.add('is-leaving');
    next.classList.remove('is-leaving'); next.classList.add('is-active');
    setTimeout(() => cur.classList.remove('is-leaving'), 600);
  }, 2200);
})();

/* When closed, the reminder replaces "See Our Hours" to keep the hero focused */
document.addEventListener('shopstatus', e => {
  document.querySelectorAll('[data-hours-btn]').forEach(b => (b.hidden = !e.detail.open));
});
renderStatus();

/* Barber pole spins on the logo while the page scrolls */
(() => {
  const mark = document.querySelector('.nav__logo-mark');
  if (!mark || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let t;
  addEventListener('scroll', () => {
    mark.classList.add('is-spinning');
    clearTimeout(t);
    t = setTimeout(() => mark.classList.remove('is-spinning'), 400);
  }, { passive: true });
})();

/* =========================================
   NAV STATE: transparent over hero, solid after; scrollspy
   ========================================= */
(() => {
  const hero = document.querySelector('.hero');
  const setNav = () => {
    const top = scrollY < (hero ? hero.offsetHeight - 90 : 10);
    nav.classList.toggle('is-top', top && !menuOpen);
    nav.classList.toggle('is-scrolled', !top);
  };
  addEventListener('scroll', setNav, { passive: true });
  hamburger.addEventListener('click', () => {
    setNav();
    hamburger.setAttribute('aria-expanded', String(menuOpen));
    hamburger.setAttribute('aria-label', menuOpen ? 'Close menu' : 'Open menu');
  });
  addEventListener('keydown', e => { if (e.key === 'Escape' && menuOpen) hamburger.click(); });
  setNav();

  const links = [...document.querySelectorAll('.nav__links a')];
  const spy = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      links.forEach(l => l.classList.toggle('is-active', l.getAttribute('href') === '#' + en.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach(l => { const t = document.querySelector(l.getAttribute('href')); if (t) spy.observe(t); });
})();

/* Scroll progress */
(() => {
  const bar = document.getElementById('scrollProgress');
  if (!bar) return;
  const update = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
  };
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  update();
})();

/* =========================================
   BOOKING PLANNER — turns picks into a one-line call script
   ========================================= */
const SERVICE_LABELS = { haircut: "men's haircut", beard: 'beard trim', shave: 'straight razor shave', military: 'military cut', kids: "kid's cut", bang: 'bang trim' };
(() => {
  const form = document.getElementById('planner');
  if (!form) return;
  const dayWrap = document.getElementById('dayChips');
  const script = document.getElementById('plannerScript');
  const { day, mins: nowMins } = shopNow();
  // time windows (minutes): morning 9-12, midday 11-2, afternoon 1-5
  const SLOT_END = { morning: 720, midday: 840, afternoon: 1020 };
  let added = 0;
  for (let i = 0; added < 6 && i < 10; i++) {
    const d = (day + i) % 7;
    if (!HOURS[d]) continue;
    if (i === 0 && nowMins >= HOURS[d][1] - 30) continue; // too late to get in today
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : DAY_NAMES[d].slice(0, 3);
    const full = i === 0 ? 'today' : i === 1 ? 'tomorrow' : DAY_NAMES[d];
    dayWrap.insertAdjacentHTML('beforeend',
      `<label><input type="radio" name="day" value="${full}" data-dayidx="${d}" ${added === 0 ? 'checked' : ''}><span>${label}${d === 6 ? '<small>till 2</small>' : ''}</span></label>`);
    added++;
  }
  const update = () => {
    const f = new FormData(form);
    // at least one service stays selected
    if (!f.getAll('service').length) { form.querySelector('input[name="service"]').checked = true; }
    const picked = new FormData(form).getAll('service').map(v => SERVICE_LABELS[v]);
    const svc = picked.length === 1 ? picked[0]
      : picked.slice(0, -1).join(', ') + ' and a ' + picked[picked.length - 1];
    const time = f.get('time');
    const dayVal = f.get('day');
    const isSat = form.querySelector('input[name="day"]:checked')?.dataset.dayidx === '6';
    const isToday = dayVal === 'today';
    const closeAt = isSat ? 840 : 1020;
    ['morning', 'midday', 'afternoon'].forEach(k => {
      const inp = form.querySelector(`input[name="time"][value="${k}"]`);
      inp.disabled = (k === 'afternoon' && isSat) || (isToday && nowMins >= Math.min(SLOT_END[k], closeAt) - 30);
    });
    const checked = form.querySelector('input[name="time"]:checked');
    if (checked.disabled) form.querySelector('input[name="time"]:not(:disabled)').checked = true;
    const t = new FormData(form).get('time');
    const when = t === 'any' ? 'whenever you have an opening' : `in the ${t === 'midday' ? 'middle of the day' : t}`;
    const name = (new FormData(form).get('name') || '').trim().replace(/[^\p{L}\s'-]/gu, '');
    script.textContent = `"Hi, ${name ? `this is ${name}. ` : ''}I'd like to book a ${svc} ${dayVal} ${when}."`;
  };
  form.addEventListener('change', update);
  form.addEventListener('input', update);
  update();
  document.getElementById('copyScript').addEventListener('click', async e => {
    try { await navigator.clipboard.writeText(script.textContent.replace(/"/g, '')); e.target.textContent = 'Copied ✓'; }
    catch { e.target.textContent = 'Copy failed'; }
    setTimeout(() => (e.target.textContent = 'Copy request'), 2000);
  });
  // "Book this" on a service pre-selects it in the planner
  document.querySelectorAll('[data-pick-service]').forEach(a => a.addEventListener('click', () => {
    const r = form.querySelector(`input[name="service"][value="${a.dataset.pickService}"]`);
    if (r) { form.querySelectorAll('input[name="service"]').forEach(i => (i.checked = i === r)); update(); }
  }));
})();

/* Click-to-load Google Map: nothing third-party loads until the visitor asks */
document.querySelectorAll('[data-load-map]').forEach(btn => btn.addEventListener('click', () => {
  const f = document.createElement('iframe');
  f.src = `https://www.google.com/maps?q=${SHOP.mapsQuery}&z=17&output=embed`;
  f.title = `Map to ${SHOP.name}, ${SHOP.address}`;
  f.loading = 'lazy';
  f.referrerPolicy = 'no-referrer-when-downgrade';
  f.allowFullscreen = true;
  btn.replaceWith(f);
}));

/* Smart directions: Apple devices open Apple Maps, everyone else Google Maps */
(() => {
  const apple = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document;
  const href = apple
    ? 'https://maps.apple.com/?daddr=' + SHOP.mapsQuery
    : 'https://www.google.com/maps/dir/?api=1&destination=' + SHOP.mapsQuery;
  document.querySelectorAll('a[href^="https://maps.google.com"]').forEach(a => (a.href = href));
})();

/* Reviews carousel: arrows, dots, gentle auto-advance (pauses on interaction) */
(() => {
  const track = document.getElementById('reviewsTrack');
  if (!track) return;
  const slides = [...track.children];
  const dots = document.getElementById('reviewsDots');
  slides.forEach(() => dots.appendChild(document.createElement('span')));
  let idx = 0, paused = false;
  const go = i => {
    idx = (i + slides.length) % slides.length;
    track.scrollTo({ left: slides[idx].offsetLeft - slides[0].offsetLeft });
  };
  document.querySelectorAll('[data-rev]').forEach(b => b.addEventListener('click', () => { paused = true; go(idx + +b.dataset.rev); }));
  track.addEventListener('scroll', () => {
    const i = Math.round(track.scrollLeft / (slides[1].offsetLeft - slides[0].offsetLeft));
    idx = Math.min(i, slides.length - 1);
    [...dots.children].forEach((d, n) => d.classList.toggle('is-active', n === idx));
  }, { passive: true });
  ['pointerdown', 'focusin', 'mouseenter'].forEach(ev => track.addEventListener(ev, () => (paused = true)));
  track.dispatchEvent(new Event('scroll'));
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setInterval(() => { if (!paused && !document.hidden) go(idx + 1); }, 6000);
  }
})();

/* Save to contacts (.vcf) — keeps the shop one tap away in the phone's contacts */
document.querySelectorAll('[data-save-contact]').forEach(b => b.addEventListener('click', () => {
  const vcf = [
    'BEGIN:VCARD', 'VERSION:3.0',
    "FN:Clifton's On Main", "ORG:Clifton's On Main Barbershop",
    `TEL;TYPE=WORK,VOICE:${SHOP.tel}`,
    `ADR;TYPE=WORK:;;${SHOP.street};${SHOP.city};${SHOP.region};${SHOP.zip};USA`,
    'NOTE:Mon–Fri 9 AM–5 PM\\, Sat 9 AM–2 PM\\, Sun closed. Walk-ins welcome.',
    'END:VCARD'
  ].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([vcf], { type: 'text/vcard' }));
  a.download = 'Cliftons-On-Main.vcf';
  document.body.appendChild(a); a.click(); a.remove();
  b.textContent = '✓ Saved';
}));

/* Send to a friend: native share sheet on phones, copy link elsewhere */
document.querySelectorAll('[data-share]').forEach(b => b.addEventListener('click', async () => {
  const data = { title: SHOP.name, text: `Good barbershop on Main Street in Abingdon. ${SHOP.phone}`, url: location.href };
  try {
    if (navigator.share) await navigator.share(data);
    else { await navigator.clipboard.writeText(`${data.text} ${data.url}`); b.textContent = '✓ Link copied'; }
  } catch { /* user dismissed */ }
}));

/* Tab nudge: when the visitor switches tabs, the title invites them back */
(() => {
  const original = document.title;
  document.addEventListener('visibilitychange', () => {
    document.title = document.hidden ? '✂️ Still need that cut? · Clifton\'s' : original;
  });
})();

/* Theme toggle */
(() => {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  const root = document.documentElement;
  const paint = () => {
    const dark = root.dataset.theme === 'dark';
    btn.textContent = dark ? '☀' : '☾';
    btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    document.querySelector('meta[name="theme-color"]').content = dark ? '#0f1724' : '#1c2e4a';
  };
  const flip = () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch {}
    paint();
  };
  btn.addEventListener('click', () => {
    // Circular "lights on/off" wipe from the toggle, where supported
    if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return flip();
    const r = btn.getBoundingClientRect();
    root.style.setProperty('--vt-x', `${r.left + r.width / 2}px`);
    root.style.setProperty('--vt-y', `${r.top + r.height / 2}px`);
    document.startViewTransition(flip);
  });
  paint();
})();

/* =========================================
   WEATHER-AWARE NUDGE — free Open-Meteo API (no key, CORS enabled).
   Fails silently; cached 30 min per visitor.
   ========================================= */
(() => {
  const el = document.getElementById('heroWeather');
  const conn = navigator.connection;
  if (!el || !window.fetch || (conn && (conn.saveData || /2g/.test(conn.effectiveType || '')))) return;
  const render = ({ t, code }) => {
    const temp = Math.round(t);
    const rainy = (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
    const snowy = (code >= 71 && code <= 77) || code === 85 || code === 86;
    let line;
    if (snowy) line = `${temp}° and snowy in Abingdon. Warm shop, hot lather, no rush.`;
    else if (rainy) line = `${temp}° and raining in Abingdon. Good day to duck into a warm chair.`;
    else if (temp >= 85) line = `${temp}° in Abingdon. A fresh short cut makes the heat easier.`;
    else if (temp <= 40) line = `${temp}° in Abingdon. Cold outside, warm in here.`;
    else line = `${temp}° and nice out in Abingdon. Easy walk down Main Street.`;
    el.textContent = line;
    el.hidden = false;
  };
  try {
    const c = JSON.parse(sessionStorage.getItem('wx') || 'null');
    if (c && Date.now() - c.at < 1800000) return render(c);
  } catch {}
  fetch('https://api.open-meteo.com/v1/forecast?latitude=36.7098&longitude=-81.9774&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=America%2FNew_York')
    .then(r => (r.ok ? r.json() : Promise.reject()))
    .then(d => {
      const data = { t: d.current.temperature_2m, code: d.current.weather_code, at: Date.now() };
      try { sessionStorage.setItem('wx', JSON.stringify(data)); } catch {}
      render(data);
    })
    .catch(() => {});
})();

/* =========================================
   RETURN-VISITOR MEMORY — remembers the last service picked in the
   planner (this browser only) and greets them with a one-tap rebook.
   ========================================= */
(() => {
  const form = document.getElementById('planner');
  const wb = document.getElementById('welcomeBack');
  if (!form || !wb) return;
  let saved = null;
  try { saved = localStorage.getItem('lastService'); } catch {}
  if (saved && SERVICE_LABELS[saved]) {
    const r = form.querySelector(`input[name="service"][value="${saved}"]`);
    if (r) { form.querySelectorAll('input[name="service"]').forEach(i => (i.checked = i === r)); r.dispatchEvent(new Event('change', { bubbles: true })); }
    wb.innerHTML = `👋 Welcome back. Book your usual <strong>${SERVICE_LABELS[saved]}</strong> →`;
    wb.hidden = false;
  }
  form.addEventListener('change', e => {
    if (e.target.name === 'service' && e.target.checked) try { localStorage.setItem('lastService', e.target.value); } catch {}
  });
})();

/* =========================================
   HOURS TIMELINE — each day gets a bar showing its open window,
   with a live "now" needle on today's row.
   ========================================= */
(() => {
  const START = 7 * 60, END = 19 * 60, span = END - START;
  const pct = m => `${((m - START) / span) * 100}%`;
  document.querySelectorAll('.hours-row[data-day]').forEach(row => {
    const h = HOURS[row.dataset.day];
    const bar = document.createElement('span');
    bar.className = 'hours-bar'; bar.setAttribute('aria-hidden', 'true');
    bar.innerHTML = h ? `<i style="left:${pct(h[0])};width:calc(${pct(h[1])} - ${pct(h[0])})"></i><b class="hours-needle"></b>` : '<b class="hours-needle"></b>';
    row.appendChild(bar);
  });
  const tick = () => {
    const { day, mins } = shopNow();
    document.querySelectorAll('.hours-row[data-day]').forEach(row => {
      const n = row.querySelector('.hours-needle');
      const show = +row.dataset.day === day && mins >= START && mins <= END;
      n.style.display = show ? 'block' : 'none';
      if (show) n.style.left = pct(mins);
    });
  };
  tick(); setInterval(tick, 60000);
})();

/* Back to top ring */
(() => {
  const btn = document.getElementById('toTop'), ring = document.getElementById('toTopRing');
  if (!btn) return;
  const up = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? scrollY / max : 0;
    ring.style.strokeDashoffset = 131.95 * (1 - p);
    btn.classList.toggle('is-visible', scrollY > innerHeight * 1.2);
  };
  addEventListener('scroll', up, { passive: true }); up();
})();

/* Smart announcement: only shows when it actually helps (closing soon / short Saturday / Sunday) */
(() => {
  const bar = document.getElementById('announce');
  if (!bar) return;
  try { if (sessionStorage.getItem('announceClosed')) return; } catch {}
  const st = getStatus();
  let msg = '';
  if (st.open && st.closingSoon) msg = `⏳ Closing in ${fmtDuration(HOURS[st.day][1] - st.mins)}. Call now to get in today.`;
  else if (st.day === 5 || st.day === 4) msg = '📅 Heads up: Saturdays close at 2 PM, and appointments are your best bet on weekends.';
  else if (st.day === 6 && st.open) msg = '📅 Short day today: we close at 2 PM.';
  else if (st.day === 0) msg = '😴 Closed Sundays. Line up your Monday cut now.';
  if (!msg) return;
  bar.querySelector('[data-announce-text]').textContent = msg;
  bar.hidden = false;
  bar.querySelector('.announce__close').addEventListener('click', () => {
    bar.hidden = true;
    try { sessionStorage.setItem('announceClosed', '1'); } catch {}
  });
})();

/* Offline-ready + installable (only over http/https) */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
document.getElementById('year') && (document.getElementById('year').textContent = new Date().getFullYear());
renderStatus();

/* Count-up stats when they scroll into view */
(() => {
  const els = document.querySelectorAll('[data-count]');
  if (!els.length || !('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    io.unobserve(en.target);
    const el = en.target, end = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0);
    if (!end) return;
    const t0 = performance.now(), dur = 1400;
    const step = now => {
      const p = Math.min((now - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
      el.textContent = (end * e).toFixed(dec);
      if (p < 1) requestAnimationFrame(step);
    };
    el.textContent = (0).toFixed(dec);
    requestAnimationFrame(step);
  }), { threshold: 0.6 });
  els.forEach(el => io.observe(el));
})();

/* Full-screen menu: light-on-dark header + scroll lock while open */
hamburger.addEventListener('click', () => {
  document.body.classList.toggle('menu-locked', menuOpen);
  nav.classList.toggle('menu-open', menuOpen);
  nav.classList.toggle('is-top', menuOpen || scrollY < 10);
});
document.querySelectorAll('.mobile-link').forEach(l => l.addEventListener('click', () => {
  document.body.classList.remove('menu-locked'); nav.classList.remove('menu-open');
  hamburger.setAttribute('aria-expanded', 'false');
}));
renderStatus();

/* Exit intent (desktop only, once per session, after 15s on page):
   offer to save the number instead of losing the visitor. */
(() => {
  const m = document.getElementById('exitModal');
  if (!m || isTouch) return;
  let armed = false;
  setTimeout(() => (armed = true), 15000);
  document.addEventListener('mouseout', e => {
    if (!armed || e.relatedTarget || e.clientY > 10) return;
    try { if (sessionStorage.getItem('exitShown')) return; sessionStorage.setItem('exitShown', '1'); } catch {}
    if (document.querySelector('dialog[open]')) return;
    m.showModal();
  });
  m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close-modal]')) m.close(); });
  m.querySelector('[data-reminder-exit]').addEventListener('click', () => { downloadReminder(); m.close(); });
})();

/* Magnetic primary buttons on desktop: they lean toward the cursor */
(() => {
  if (isTouch || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.btn-primary, .reviews-nav__btn').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const r = btn.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * 0.25, y = (e.clientY - r.top - r.height / 2) * 0.35;
      btn.style.transform = `translate(${x}px, ${y}px)`;
    });
    btn.addEventListener('mouseleave', () => (btn.style.transform = ''));
  });
})();

/* Light parallax: hero copy drifts up and fades, about photo floats */
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const heroC = document.querySelector('.hero__content');
  const photo = document.querySelector('.about-photo');
  let ticking = false;
  const run = () => {
    const y = scrollY;
    if (heroC && y < innerHeight) {
      heroC.style.transform = `translateY(${y * 0.25}px)`;
      heroC.style.opacity = String(1 - y / (innerHeight * 0.9));
    }
    if (photo) {
      const r = photo.getBoundingClientRect();
      if (r.bottom > 0 && r.top < innerHeight) photo.style.transform = `translateY(${(r.top + r.height / 2 - innerHeight / 2) * -0.08}px) scale(1.08)`;
    }
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(run); } }, { passive: true });
  run();
})();

/* Tactile call feedback on phones: short vibration + "Calling…" toast */
(() => {
  const toast = document.createElement('div');
  toast.className = 'toast'; toast.setAttribute('role', 'status');
  document.body.appendChild(toast);
  window.showToast = (msg) => {
    toast.textContent = msg; toast.classList.add('is-on');
    clearTimeout(toast._t); toast._t = setTimeout(() => toast.classList.remove('is-on'), 2600);
  };
  if (!isTouch) return;
  document.addEventListener('click', e => {
    if (!e.target.closest('a[href^="tel:"]')) return;
    try { navigator.vibrate && navigator.vibrate(18); } catch {}
    showToast("📞 Calling Clifton's On Main…");
  });
})();

/* Live favicon: the browser tab shows a green/amber/red dot for open/closing/closed */
(() => {
  const link = document.querySelector('link[rel="icon"]');
  if (!link || !window.fetch || location.protocol === 'file:') return;
  fetch(link.href).then(r => r.text()).then(svg => {
    const paint = st => {
      const color = st.open ? (st.closingSoon ? '#f0a830' : '#3ddc84') : '#ff4d4d';
      const dotted = svg.replace('</svg>', `<circle cx="52" cy="52" r="11" fill="${color}" stroke="#fff" stroke-width="3"/></svg>`);
      link.href = 'data:image/svg+xml,' + encodeURIComponent(dotted);
    };
    paint(getStatus());
    document.addEventListener('shopstatus', e => paint(e.detail));
  }).catch(() => {});
})();
try { sessionStorage.setItem('introSeen', '1'); } catch {}
setTimeout(() => document.getElementById('intro')?.remove(), 1600);

/* Copy address + desktop "directions to my phone" QR */
document.querySelectorAll('[data-copy-address]').forEach(b => b.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(SHOP.address); showToast('Address copied ✓'); } catch {}
}));
(() => {
  const m = document.getElementById('dirModal');
  if (!m) return;
  document.querySelectorAll('[data-dir-qr]').forEach(b => b.addEventListener('click', () => {
    drawQr('dirQr', 'https://www.google.com/maps/dir/?api=1&destination=' + SHOP.mapsQuery);
    m.showModal();
  }));
  m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close-modal]')) m.close(); });
})();

/* =========================================
   "WHEN AM I DUE?" — rebooking reminder that lands on a real opening day
   ========================================= */
(() => {
  const form = document.getElementById('dueForm');
  if (!form) return;
  const out = document.getElementById('dueResult'), cal = document.getElementById('dueCal'), call = document.getElementById('dueCall');
  const update = () => {
    const f = new FormData(form);
    let daysOut = +f.get('style') - +f.get('ago');
    const { day } = shopNow();
    if (daysOut <= 0) {
      out.innerHTML = `<strong>You're due now.</strong> Let's get you in this week.`;
      cal.hidden = true; call.hidden = false; return;
    }
    // land on the closest day the shop is open
    let d = (day + daysOut) % 7, guard = 0;
    while (!HOURS[d] && guard++ < 7) { daysOut++; d = (d + 1) % 7; }
    const date = new Date(Date.now() + daysOut * 86400000);
    const label = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York' });
    out.innerHTML = `You're due around <strong>${label}</strong>${daysOut <= 7 ? ' (that\'s soon)' : ''}.`;
    const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(date).replace(/-/g, '');
    const q = new URLSearchParams({
      action: 'TEMPLATE', text: "Haircut at Clifton's On Main",
      dates: `${ymd}T100000/${ymd}T101500`, ctz: 'America/New_York',
      details: `You're due for a fresh cut. Call ${SHOP.phone} to book.`, location: SHOP.address
    });
    cal.href = 'https://calendar.google.com/calendar/render?' + q;
    cal.hidden = false; call.hidden = daysOut > 7;
  };
  form.addEventListener('change', update); update();
})();

/* Action bar steps aside while the hero's own call button is on screen,
   then slides up as soon as it scrolls away: no duplicate CTAs. */
(() => {
  const bar = document.getElementById('actionBar'), heroBtns = document.querySelector('.hero__btns');
  if (!bar || !heroBtns || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(([en]) => bar.classList.toggle('is-tucked', en.isIntersecting), { threshold: 0.4 }).observe(heroBtns);
})();

/* Local time in Abingdon (helps out-of-town visitors) + seasonal holiday note */
(() => {
  const el = document.getElementById('localTime');
  const tick = () => {
    if (!el) return;
    const t = new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' });
    const st = getStatus();
    el.innerHTML = `It's <strong>${t}</strong> in Abingdon right now. ${st.open ? 'We\'re open.' : 'We\'re closed.'}`;
  };
  tick(); setInterval(tick, 30000);
  const md = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', month: '2-digit', day: '2-digit' }).format(new Date()).replace('-', '');
  const note = document.getElementById('holidayNote');
  if (note && (md >= '1120' || md <= '0102')) note.hidden = false;
})();

/* =========================================
   DEEP LINKS for ads, texts and QR flyers:
   ?service=beard&day=tomorrow&time=morning prefills the planner,
   and the hero headline leads with that service.
   ========================================= */
(() => {
  const q = new URLSearchParams(location.search);
  const form = document.getElementById('planner');
  const svc = q.get('service');
  if (form && svc && SERVICE_LABELS[svc]) {
    const set = (name, val) => {
      const r = form.querySelector(`input[name="${name}"][value="${CSS.escape(val)}"]`);
      if (r && !r.disabled) r.checked = true;
    };
    form.querySelectorAll('input[name="service"]').forEach(i => (i.checked = false));
    set('service', svc);
    if (q.get('day')) set('day', q.get('day'));
    if (q.get('time')) set('time', q.get('time'));
    form.dispatchEvent(new Event('change'));
    // hero: start the rotator on the requested service
    const map = { haircut: 'fades.', beard: 'beard trims.', shave: 'razor shaves.', kids: "kids' cuts.", military: 'military cuts.' };
    const rot = document.querySelector('[data-rotator]');
    if (rot && map[svc]) {
      [...rot.children].forEach(sp => sp.classList.toggle('is-active', sp.textContent === map[svc]));
      rot.prepend([...rot.children].find(sp => sp.textContent === map[svc]));
    }
  }
})();

/* =========================================
   CONVERSION EVENTS — pushed to window.dataLayer so any free analytics
   (GA4 via GTM, Plausible, Umami) can count calls, directions and reminders
   the moment it's installed. Nothing is sent anywhere until then.
   ========================================= */
window.dataLayer = window.dataLayer || [];
function track(event, detail = {}) {
  window.dataLayer.push({ event, ...detail, open_now: getStatus().open });
  if (window.plausible) window.plausible(event, { props: detail });
}
document.addEventListener('click', e => {
  const el = e.target.closest('a, button');
  if (!el) return;
  const where = el.closest('section, nav, footer, dialog, .action-bar')?.id || el.closest('section, nav, footer, dialog, .action-bar')?.className.split(' ')[0] || 'page';
  if (el.matches('a[href^="tel:"]')) track('call_click', { where });
  else if (el.matches('a[href*="maps"], [data-dir-qr]')) track('directions_click', { where });
  else if (el.matches('[data-reminder], .reminder-menu *, #dueCal')) track('reminder', { where });
  else if (el.matches('[data-save-contact]')) track('save_contact', { where });
  else if (el.matches('[data-share]')) track('share', { where });
  else if (el.matches('#copyScript, [data-copy-phone]')) track('copy', { where });
  else if (el.matches('[data-pick-service]')) track('service_pick', { service: el.dataset.pickService });
});

/* Walk-in path inside the planner */
document.getElementById('walkinBtn')?.addEventListener('click', () => {
  const c = document.getElementById('walkinCard');
  c.hidden = !c.hidden;
  renderStatus();
  if (!c.hidden) c.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

/* Today card in the hero: today's hours + how much of the day is left */
document.addEventListener('shopstatus', e => {
  const st = e.detail, h = HOURS[st.day];
  const dayEl = document.getElementById('todayDay');
  if (!dayEl) return;
  dayEl.textContent = DAY_NAMES[st.day];
  document.getElementById('todayHours').textContent = h ? `${fmtTime(h[0])} – ${fmtTime(h[1])}` : 'Closed today';
  const pct = h ? Math.max(0, Math.min(1, (st.mins - h[0]) / (h[1] - h[0]))) : 1;
  document.getElementById('todayMeter').style.width = `${pct * 100}%`;
});
renderStatus();

/* Whole service row is a target: click anywhere on it to plan that service */
document.querySelectorAll('.service-row').forEach(row => {
  row.style.cursor = 'pointer';
  row.addEventListener('click', e => {
    if (e.target.closest('a')) return;
    row.querySelector('[data-pick-service]')?.click();
  });
});

/* Hero spotlight: a soft warm light follows the cursor on desktop */
(() => {
  const hero = document.querySelector('.hero');
  if (!hero || isTouch || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    hero.style.setProperty('--mx', `${e.clientX - r.left}px`);
    hero.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
})();

/* FAQ deep links: /#faq-kids opens that answer; opening one updates the URL for sharing */
(() => {
  const openFromHash = () => {
    const el = location.hash && document.querySelector(location.hash);
    if (el && el.matches('details.faq-item')) { el.open = true; el.scrollIntoView({ block: 'center' }); }
  };
  addEventListener('hashchange', openFromHash); openFromHash();
  document.querySelectorAll('details.faq-item').forEach(d => d.addEventListener('toggle', () => {
    if (d.open) {
      history.replaceState(null, '', '#' + d.id);
      document.querySelectorAll('details.faq-item[open]').forEach(o => { if (o !== d) o.open = false; });
    }
  }));
})();

/* Planner-aware action bar: while the planner is on screen, the call button
   carries the visitor's request so they know exactly what to say. */
(() => {
  const planner = document.getElementById('planner');
  const label = document.querySelector('.action-bar__btn--call span');
  if (!planner || !label || !('IntersectionObserver' in window)) return;
  const SHORT = { haircut: 'haircut', beard: 'beard trim', shave: 'shave', military: 'military cut', kids: "kid's cut", bang: 'bang trim' };
  let visible = false;
  const paint = () => {
    if (!visible) { label.textContent = 'Call to book'; return; }
    const f = new FormData(planner);
    const day = f.get('day') || '';
    const svcs = f.getAll('service');
    label.textContent = `Call · ${svcs.length > 1 ? svcs.length + ' services' : SHORT[svcs[0]]} ${day.length > 9 ? day.slice(0, 3) : day}`;
  };
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; paint(); }, { threshold: 0.25 }).observe(planner);
  planner.addEventListener('change', paint);
})();

/* "Add to home screen": the shop becomes an app icon next to their other apps */
(() => {
  const btn = document.getElementById('installBtn');
  if (!btn) return;
  let deferred;
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; btn.hidden = false; });
  const iOS = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;
  const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  if (iOS && !standalone) btn.hidden = false;
  btn.addEventListener('click', async () => {
    if (deferred) { deferred.prompt(); await deferred.userChoice; deferred = null; btn.hidden = true; track('install'); }
    else if (iOS) showToast('Tap Share, then "Add to Home Screen"');
  });
  addEventListener('appinstalled', () => (btn.hidden = true));
})();

/* Data-saver aware: on Save-Data or 2G, skip the hero photo and weather call */
(() => {
  const c = navigator.connection;
  if (!c || !(c.saveData || /2g/.test(c.effectiveType || ''))) return;
  document.documentElement.classList.add('save-data');
  document.querySelector('.hero__photo img')?.remove();
})();

/* Hours table starts from today and shows real dates for the coming week */
(() => {
  const table = document.querySelector('.hours-table');
  if (!table) return;
  const { day } = shopNow();
  const rows = [...table.querySelectorAll('.hours-row[data-day]')];
  for (let i = 0; i < 7; i++) {
    const d = (day + i) % 7;
    const row = rows.find(r => +r.dataset.day === d);
    const date = new Date(Date.now() + i * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' });
    const first = row.querySelector('span');
    if (!first.querySelector('.hours-date')) first.insertAdjacentHTML('beforeend', ` <small class="hours-date">${i === 1 ? 'Tomorrow · ' : ''}${date}</small>`);
    table.appendChild(row);
  }
})();

/* Easter egg: type "trim" anywhere and it rains tiny barber poles and scissors */
(() => {
  let buf = '';
  addEventListener('keydown', e => {
    if (e.target.matches('input, textarea, select')) return;
    buf = (buf + e.key.toLowerCase()).slice(-4);
    if (buf !== 'trim' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for (let i = 0; i < 40; i++) {
      const s = document.createElement('span');
      s.className = 'confetti';
      s.textContent = ['✂', '💈', '★'][i % 3];
      s.style.left = Math.random() * 100 + 'vw';
      s.style.animationDuration = 1.8 + Math.random() * 1.6 + 's';
      s.style.animationDelay = Math.random() * 0.6 + 's';
      s.style.fontSize = 14 + Math.random() * 22 + 'px';
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 4200);
    }
    showToast(`Looking fresh already. Call ${SHOP.phone} ✂`);
  });
})();

/* Side index: highlights the section in view */
(() => {
  const idx = document.querySelector('.side-index');
  if (!idx) return;
  const links = [...idx.querySelectorAll('a')];
  const targets = links.map(l => document.querySelector(l.getAttribute('href'))).filter(Boolean);
  const onScroll = () => {
    idx.classList.toggle('is-visible', scrollY > innerHeight * 0.6);
    let cur = 0;
    targets.forEach((t, i) => { if (t.getBoundingClientRect().top < innerHeight * 0.45) cur = i; });
    links.forEach((l, i) => l.classList.toggle('is-active', i === cur));
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
})();
(() => {
  const t = document.getElementById('reviewsTrack');
  if (!t || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { t.classList.add('is-in-view'); io.disconnect(); } }, { threshold: 0.6 });
  io.observe(t);
})();
document.getElementById('planner')?.addEventListener('change', () => {
  const sat = document.querySelector('#dayChips input:checked')?.dataset.dayidx === '6';
  const h = document.getElementById('weekendHint'); if (h) h.hidden = !sat;
});

/* In-page links move keyboard/screen-reader focus to the target section */
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || a.getAttribute('href').length < 2) return;
  const t = document.querySelector(a.getAttribute('href'));
  if (!t) return;
  setTimeout(() => {
    const h = t.matches('h1,h2,h3') ? t : t.querySelector('h1, h2, h3') || t;
    if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1');
    h.focus({ preventScroll: true });
  }, 450);
});

/* Desktop keyboard shortcuts: C = call, B = book, H = hours, D = directions */
(() => {
  if (isTouch) return;
  const go = sel => document.querySelector(sel)?.scrollIntoView({ behavior: 'smooth' });
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.target.matches('input, textarea, select, [contenteditable]') || document.querySelector('dialog[open]')) return;
    const k = e.key.toLowerCase();
    if (k === 'c') { loadQr(); callModal?.showModal(); track('call_click', { where: 'shortcut' }); }
    else if (k === 'b') go('#book');
    else if (k === 'h') go('#hours');
    else if (k === 'd') document.querySelector('[data-dir-qr]')?.click();
  });
  const hint = document.createElement('p');
  hint.className = 'kbd-hint';
  hint.innerHTML = 'Shortcuts: <kbd>C</kbd> call · <kbd>B</kbd> book · <kbd>H</kbd> hours · <kbd>D</kbd> directions';
  document.querySelector('.footer-bottom')?.appendChild(hint);
})();
/* Printing adds a scan-to-call QR to the card */
addEventListener('beforeprint', () => drawQr('printQr', 'tel:' + SHOP.tel));

/* Time-of-day greeting in the shop's own time */
(() => {
  const loc = document.querySelector('.hero__location');
  if (!loc) return;
  const h = Math.floor(shopNow().mins / 60);
  const g = h < 5 ? 'Hello, night owl' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  loc.insertAdjacentHTML('beforeend', ` <span class="hero__greet">· ${g} from Main Street</span>`);
})();

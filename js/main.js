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

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll('.service-item, .review-card, .info-block').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(18px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  observer.observe(el);
});

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
  const st = getStatus();
  if (st.open) { location.href = 'tel:+12766083772'; return; }
  const start = nextOpeningUTC(st);
  const end = new Date(start.getTime() + 15 * 60000);
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Cliftons On Main//Reminder//EN', 'BEGIN:VEVENT',
    `UID:${Date.now()}@cliftonsonmain`, `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(start)}`, `DTEND:${icsStamp(end)}`,
    'SUMMARY:Call Clifton\'s On Main to book a cut',
    'DESCRIPTION:Call (276) 608-3772 to book. 272 W Main St\\, Abingdon\\, VA 24210',
    'LOCATION:272 W Main St\\, Abingdon\\, VA 24210',
    'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:Call Clifton\'s On Main', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = 'call-cliftons-on-main.ics';
  document.body.appendChild(a); a.click(); a.remove();
}

document.querySelectorAll('[data-reminder]').forEach(b => b.addEventListener('click', downloadReminder));
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

function loadQr() {
  if (qrLoaded) return;
  qrLoaded = true;
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
  s.onload = () => {
    const qr = qrcode(0, 'M');
    qr.addData('tel:+12766083772');
    qr.make();
    document.getElementById('callQr').innerHTML = qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
  };
  s.onerror = () => { document.getElementById('callQr').textContent = '📞'; };
  document.head.appendChild(s);
}

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
    try { await navigator.clipboard.writeText('(276) 608-3772'); btn.textContent = 'Copied ✓'; }
    catch { btn.textContent = '(276) 608-3772'; }
    setTimeout(() => (btn.textContent = 'Copy number'), 2000);
  });
});

/* Hero rotating service word */
(() => {
  const rot = document.querySelector('[data-rotator]');
  if (!rot || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const words = [...rot.children];
  let i = 0;
  setInterval(() => {
    const cur = words[i];
    i = (i + 1) % words.length;
    cur.classList.remove('is-active'); cur.classList.add('is-leaving');
    words[i].classList.remove('is-leaving'); words[i].classList.add('is-active');
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

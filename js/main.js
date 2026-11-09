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
  const targets = document.querySelectorAll('.service-row, .info-block, .review-slide, .planner, .about-photo-wrap, .about-checklist li, .reveal-words');
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

/* =========================================
   BOOKING PLANNER — turns picks into a one-line call script
   ========================================= */
const SERVICE_LABELS = { haircut: "men's haircut", beard: 'beard trim', shave: 'straight razor shave', military: 'military cut', kids: "kid's cut", bang: 'bang trim' };
(() => {
  const form = document.getElementById('planner');
  if (!form) return;
  const dayWrap = document.getElementById('dayChips');
  const script = document.getElementById('plannerScript');
  const { day } = shopNow();
  let added = 0;
  for (let i = 0; added < 6 && i < 10; i++) {
    const d = (day + i) % 7;
    if (!HOURS[d]) continue;
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : DAY_NAMES[d].slice(0, 3);
    const full = i === 0 ? 'today' : i === 1 ? 'tomorrow' : DAY_NAMES[d];
    dayWrap.insertAdjacentHTML('beforeend',
      `<label><input type="radio" name="day" value="${full}" data-dayidx="${d}" ${added === 0 ? 'checked' : ''}><span>${label}${d === 6 ? '<small>till 2</small>' : ''}</span></label>`);
    added++;
  }
  const update = () => {
    const f = new FormData(form);
    const svc = SERVICE_LABELS[f.get('service')];
    const time = f.get('time');
    const dayVal = f.get('day');
    const isSat = form.querySelector('input[name="day"]:checked')?.dataset.dayidx === '6';
    const pm = form.querySelector('input[value="afternoon"]');
    pm.disabled = isSat;
    if (isSat && time === 'afternoon') form.querySelector('input[value="midday"]').checked = true;
    const t = new FormData(form).get('time');
    const when = t === 'any' ? 'whenever you have an opening' : `in the ${t === 'midday' ? 'middle of the day' : t}`;
    script.textContent = `"Hi, I'd like to book a ${svc} ${dayVal} ${when}."`;
  };
  form.addEventListener('change', update);
  update();
  document.getElementById('copyScript').addEventListener('click', async e => {
    try { await navigator.clipboard.writeText(script.textContent.replace(/"/g, '')); e.target.textContent = 'Copied ✓'; }
    catch { e.target.textContent = 'Copy failed'; }
    setTimeout(() => (e.target.textContent = 'Copy request'), 2000);
  });
  // "Book this" on a service pre-selects it in the planner
  document.querySelectorAll('[data-pick-service]').forEach(a => a.addEventListener('click', () => {
    const r = form.querySelector(`input[name="service"][value="${a.dataset.pickService}"]`);
    if (r) { r.checked = true; update(); }
  }));
})();

/* Click-to-load Google Map: nothing third-party loads until the visitor asks */
document.querySelectorAll('[data-load-map]').forEach(btn => btn.addEventListener('click', () => {
  const f = document.createElement('iframe');
  f.src = 'https://www.google.com/maps?q=272+W+Main+St,+Abingdon,+VA+24210&z=17&output=embed';
  f.title = "Map to Clifton's On Main, 272 W Main St, Abingdon VA";
  f.loading = 'lazy';
  f.referrerPolicy = 'no-referrer-when-downgrade';
  f.allowFullscreen = true;
  btn.replaceWith(f);
}));

/* Smart directions: Apple devices open Apple Maps, everyone else Google Maps */
(() => {
  const apple = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document;
  const href = apple
    ? 'https://maps.apple.com/?daddr=272+W+Main+St,+Abingdon,+VA+24210'
    : 'https://www.google.com/maps/dir/?api=1&destination=272+W+Main+St,+Abingdon,+VA+24210';
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
    'TEL;TYPE=WORK,VOICE:+12766083772',
    'ADR;TYPE=WORK:;;272 W Main St;Abingdon;VA;24210;USA',
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
  const data = { title: "Clifton's On Main", text: "Good barbershop on Main Street in Abingdon. (276) 608-3772", url: location.href };
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
  btn.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch {}
    paint();
  });
  paint();
})();

/* =========================================
   WEATHER-AWARE NUDGE — free Open-Meteo API (no key, CORS enabled).
   Fails silently; cached 30 min per visitor.
   ========================================= */
(() => {
  const el = document.getElementById('heroWeather');
  if (!el || !window.fetch) return;
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
    if (r) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
    wb.innerHTML = `👋 Welcome back. Book your usual <strong>${SERVICE_LABELS[saved]}</strong> →`;
    wb.hidden = false;
  }
  form.addEventListener('change', e => {
    if (e.target.name === 'service') try { localStorage.setItem('lastService', e.target.value); } catch {}
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

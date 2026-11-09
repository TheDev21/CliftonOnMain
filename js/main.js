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

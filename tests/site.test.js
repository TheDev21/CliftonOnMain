/* End-to-end checks for the time-sensitive logic (status, planner, reminders).
   Run: npm test   (uses Playwright's Chromium; no server needed) */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

const PAGE = 'file://' + path.resolve(__dirname, '..', 'index.html');

async function at(iso, fn, url = PAGE) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.clock.setFixedTime(new Date(iso));
  await page.goto(url);
  try { return await fn(page); } finally {
    await browser.close();
    assert.deepEqual(errors, [], 'page threw errors');
  }
}
const status = p => p.evaluate(() => getStatus());

test('weekday mid-afternoon is open until 5 PM', () => at('2026-11-10T14:00:00-05:00', async p => {
  const s = await status(p);
  assert.equal(s.open, true);
  assert.equal(s.text, 'Open now · until 5 PM');
}));

test('last hour shows closing countdown', () => at('2026-11-10T16:20:00-05:00', async p => {
  const s = await status(p);
  assert.equal(s.closingSoon, true);
  assert.equal(s.text, 'Open now · closes in 40 min');
}));

test('Saturday closes at 2 PM', () => at('2026-11-14T14:05:00-05:00', async p => {
  assert.equal((await status(p)).text, 'Closed now · opens Monday at 9 AM');
}));

test('Sunday points to Monday morning', () => at('2026-11-15T11:00:00-05:00', async p => {
  assert.equal((await status(p)).text, 'Closed now · opens tomorrow at 9 AM');
}));

test('timezone: visitor clock in Los Angeles still uses shop time', () => at('2026-11-10T08:30:00-08:00', async p => {
  // 8:30 AM in LA is 11:30 AM in Abingdon -> open
  assert.equal((await status(p)).open, true);
}));

test('DST: reminder after spring-forward lands at 9:10 AM New York', () => at('2027-03-14T20:00:00-04:00', async p => {
  const local = await p.evaluate(() => nextOpeningUTC(getStatus()).toLocaleString('en-US', { timeZone: 'America/New_York' }));
  assert.match(local, /3\/15\/2027, 9:10:00 AM/);
}));

test('planner drops today when it is too late and disables passed slots', () => at('2026-11-10T15:10:00-05:00', async p => {
  const r = await p.evaluate(() => ({
    first: document.querySelector('#dayChips input').value,
    morningDisabled: document.querySelector('input[name=time][value=morning]').disabled
  }));
  assert.equal(r.first, 'today');
  assert.equal(r.morningDisabled, true);
}));

test('deep link prefills the planner', () => at('2026-11-10T10:00:00-05:00', async p => {
  const t = await p.textContent('#plannerScript');
  assert.match(t, /kid's cut tomorrow whenever you have an opening/);
}, PAGE + '?service=kids&day=tomorrow&time=any'));

test('due-date calculator never lands on a Sunday', () => at('2026-11-10T10:00:00-05:00', async p => {
  for (const [style, ago] of [['14', '0'], ['25', '7'], ['10', '0'], ['28', '14']]) {
    const txt = await p.evaluate(([s, a]) => {
      const f = document.getElementById('dueForm');
      f.querySelector('[name=style]').value = s; f.querySelector('[name=ago]').value = a;
      f.dispatchEvent(new Event('change'));
      return document.getElementById('dueResult').textContent;
    }, [style, ago]);
    assert.doesNotMatch(txt, /Sunday/, txt);
  }
}));

test('Google Calendar reminder targets 9:10 AM shop time', () => at('2026-11-10T19:00:00-05:00', async p => {
  const href = await p.evaluate(() => googleCalUrl());
  assert.match(href, /dates=20261111T141000Z/); // Wed 9:10 AM EST = 14:10 UTC
}));

test('contacts card carries phone and address', () => at('2026-11-10T10:00:00-05:00', async p => {
  const vcf = await p.evaluate(async () => {
    let blob; const orig = URL.createObjectURL; URL.createObjectURL = b => { blob = b; return orig(b); };
    document.querySelector('[data-save-contact]').click();
    return blob.text();
  });
  assert.match(vcf, /TEL;TYPE=WORK,VOICE:\+12766083772/);
  assert.match(vcf, /272 W Main St;Abingdon;VA;24210/);
}));

test('no duplicate element ids', () => at('2026-11-10T10:00:00-05:00', async p => {
  const dupes = await p.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map(e => e.id);
    return ids.filter((id, i) => ids.indexOf(id) !== i);
  });
  assert.deepEqual(dupes, []);
}));

test('every tel: link uses the shop number', () => at('2026-11-10T10:00:00-05:00', async p => {
  const bad = await p.$$eval('a[href^="tel:"]', as => as.map(a => a.getAttribute('href')).filter(h => h !== 'tel:+12766083772'));
  assert.deepEqual(bad, []);
}));

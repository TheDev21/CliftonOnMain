# Clifton's On Main — Barbershop Website

Website for **Clifton's On Main**, a barbershop at 272 W Main St, Abingdon, VA 24210. Built to turn visits into phone calls.

Plain HTML, CSS and JavaScript. No framework, no build step, no paid services.

## What it does

**Gets people to call**
- Live open/closed status in the shop's own timezone, everywhere on the page (hero, nav, footer, browser tab icon)
- 20-second booking planner: pick services, day and time, get a one-line script to read on the call. Handles multiple services, Saturday's short day and slots that already passed
- Mobile action bar (call, directions, status) that adapts to what the visitor picked
- Desktop scan-to-call and scan-for-directions QR codes
- Closed? "Remind me to call" adds the next opening to Google, Apple or Outlook calendar
- "When are you due?" calculator that drops the next cut on the calendar

**Builds trust**
- Google rating, review carousel with highlighted phrases, FAQ, how-a-visit-works timeline
- Save to contacts (vCard), share sheet, directions in Google Maps, Apple Maps or Waze

**Looks and feels the part**
- Poster-scale type (Fraunces), barber-pole details, rotating hero headline, scroll reveals
- Dark mode, full-screen mobile menu, installable app with offline support

**Built to be found and maintained**
- Structured data (BarberShop, FAQ), share card, sitemap
- Lighthouse: Performance 98 mobile / 99 desktop, Accessibility 100, SEO 100
- Automated tests for hours, timezones, daylight saving and the planner, run on every push

See **[OWNER_GUIDE.md](OWNER_GUIDE.md)** for updating hours, ad links and call tracking.

## Run it

Open `index.html` in a browser. For offline mode and the app install, serve it over http:

```bash
python3 -m http.server 8000
```

## Test

```bash
npm install
npx playwright install chromium
npm test
```

## Deploy (GitHub Pages)

Settings → Pages → deploy from the `main` branch, root folder. The site is set up for `https://thedev21.github.io/CliftonOnMain/`; update the canonical and share-image URLs in `index.html` if the address changes.

## Files

```
index.html            page
css/styles.css        styles
js/main.js            all interactive features (SHOP + HOURS config at the top)
js/vendor/qrcode.js   QR generator (MIT, self-hosted)
sw.js                 offline support
tests/                end-to-end tests
OWNER_GUIDE.md        how to run the site day to day
```

---

*Content sourced from public listings. Photos are Unsplash stock placeholders.*

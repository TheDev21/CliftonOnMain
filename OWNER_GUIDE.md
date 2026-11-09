# Owner's Guide

How to keep the site accurate and get the most bookings out of it. No coding experience needed for most of this.

## Changing hours, phone or address

These appear in a few places. Change all of them so nothing disagrees:

1. `js/main.js`, the `SHOP` block near the top (phone, address) and the `HOURS` block right below it. Hours are minutes after midnight: 9 AM is `540`, 5 PM is `1020`, 2 PM is `840`. A closed day is `null`.
2. `index.html`, search for `608-3772`, `272 W Main` and `9:00 AM` to update the visible text, the footer, the FAQ and the Google data block (`openingHoursSpecification`).
3. Run `npm test` if you can. The tests check the open/closed logic.

Everything interactive (live open/closed status, planner, reminders, QR codes, contacts card, maps) reads from `SHOP` and `HOURS`.

## Links you can use in ads, texts and flyers

Add these to the end of the site address to open the booking planner already filled in:

| Link ending | What it does |
| --- | --- |
| `?service=kids` | Planner set to a kid's cut, headline leads with "kids' cuts" |
| `?service=beard&day=tomorrow` | Beard trim, tomorrow |
| `?service=shave&time=morning` | Straight razor shave, morning |
| `#faq-kids` | Opens the "Do you cut kids' hair?" answer |
| `#book` | Jumps straight to the planner |

Services: `haircut`, `beard`, `shave`, `military`, `kids`, `bang`. Times: `morning`, `midday`, `afternoon`, `any`.

## Measuring calls (free)

The site already records every call tap, directions tap, reminder, contact save and share into `window.dataLayer`. Install any free analytics tool (Google Analytics 4 through Tag Manager, or Plausible/Umami) and these events show up as `call_click`, `directions_click`, `reminder`, `save_contact`, `share`, `install`. Each event says where on the page it happened, and whether the shop was open at the time.

## Things worth replacing when you can

- **Photos.** The hero and About photos are stock images from Unsplash. Real photos of the shop, the chairs and finished cuts will convert better than anything else on this list.
- **Reviews.** The three reviews come from public listings. Swap in recent Google reviews when you have favorites.
- **Website address.** The share image and canonical link assume `https://thedev21.github.io/CliftonOnMain/`. If you move to your own domain, update those in `index.html`, `robots.txt` and `sitemap.xml`.

## Good to know

- The weather line in the hero uses the free Open-Meteo service. If it's ever down, the line simply doesn't appear.
- The site works offline after the first visit (hours, phone and address stay available with no signal).
- Typing `trim` on a computer triggers a small surprise.

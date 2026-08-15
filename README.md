# Where Did the Day Go?

Time zones, explained so a 10-year-old gets it — for any two cities on Earth, in 12 languages.

## What it does

Pick any two of 184 cities across 122 IANA time zones and get a page that shows:

- **Two live clocks** with the local sky behind each one, so you can see that one city is
  bright while the other is dark.
- **A day ribbon** — two 24-hour stripes aligned to the same instants. Cities on a
  half-hour offset (India, Nepal, Adelaide, Newfoundland, Chatham) visibly sit half a block
  off, which is the whole lesson.
- **A great-circle arc** with the real distance and an estimated nonstop flight time.
- **A trip simulator** — move the takeoff time and watch which *day* you land on, with the
  arithmetic spelled out: calendar time elapsed, minus hours actually in the air, equals the
  time-zone jump.
- **A static hour-by-hour table**, an FAQ, and jet-lag notes. The table and FAQ are plain
  server-rendered HTML, so they are indexable without running any JavaScript.

## How the time maths works

There is no time-zone library. `lib/tz.ts` uses the platform's own `Intl` API, which is
backed by the IANA database shipped with Node and every browser. That means daylight-saving
rules stay correct without shipping a data update, and the client and server agree.

`scripts/validate-cities.ts` checks every `tz` field against `Intl.supportedValuesOf`, so a
typo in the city data fails fast rather than rendering a wrong clock.

## SEO

- One URL per route per locale: `/{locale}/{from}-to-{to}`.
- `hreflang` alternates for all 12 locales plus `x-default` on every page.
- `FAQPage` and `BreadcrumbList` JSON-LD per route page; `WebSite` site-wide.
- Sitemap index at `/sitemap-index.xml` pointing at chunked `/sitemap/{n}.xml` files
  (the sitemap protocol caps a single file at 50,000 URLs).
- The top `PRERENDER_PAIRS` routes per locale are statically generated at build time.
  Every other pair renders on first request and is then cached — `dynamicParams` plus
  `revalidate = 3600`, short enough that a cached page never states a stale gap across a
  daylight-saving switch.

## Configuration

| Env var | Default | What it does |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Vercel URL | Canonical origin used in metadata and sitemaps |
| `PRERENDER_PAIRS` | `60` | City pairs statically built per locale |
| `SITEMAP_PAIRS` | `4000` | City pairs listed in the sitemaps |

Raising `PRERENDER_PAIRS` trades build time for more instantly-served pages. At 60 the build
produces ~750 pages; at 500 it produces ~6,000. Pages outside the list still work — they are
just rendered on the first request.

## Adding a language

1. Copy `messages/en.json` to `messages/{locale}.json` and translate the values. Keep every
   key and every `{placeholder}` token; placeholders may move within a sentence but must all
   be present.
2. Add the locale to `LOCALES`, `HREFLANG` and `LOCALE_NAMES` in `lib/i18n.ts`. Add it to
   `RTL_LOCALES` if it is right-to-left.
3. Add it to the `LOCALES` array in `scripts/validate-messages.mjs`.

`npm run check` verifies that every locale has every key and that placeholders match English.
The build runs this first, so a truncated or malformed translation fails the build rather
than shipping half-English pages.

## Adding a city

Append a `C(...)` row in `lib/cities.ts`. Slugs must be lowercase kebab-case and must not
contain `-to-`, since that is the pair separator. Run `npm run check:cities` to validate.

## Local development

```bash
npm install
npm run dev      # http://localhost:3000 → redirects to /en
npm run build    # validates messages, generates the sitemap index, builds
npm start
```

## Notes on the numbers

Distances are great-circle (straight-line over the Earth's surface), so they are shorter than
any real flight path. Flight times are estimated from that distance at roughly 860 km/h plus
40 minutes of taxi, climb and descent — they are not airline timetables, and the site says so.

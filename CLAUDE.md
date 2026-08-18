# CLAUDE.md — project context

Read this before changing anything. Several things in here look like they could be
simplified. They can't: each one is a bug that was found, diagnosed and fixed, and the
"simpler" version is the bug.

## What this is

A Next.js 15 (App Router) site that explains the time difference between any two cities
on Earth, pitched at a **10-year-old**. 184 cities, 122 IANA zones, 102 countries,
12 languages. One page per city-pair per locale: `/{locale}/{from}-to-{to}`.

The audience decision drives everything. Copy is concrete and short. Numbers are always
anchored to something a child can picture. The site shows rather than asserts — the
half-hour offset is *visible* in the ribbon, not just stated in a sentence.

## Commands

```bash
npm run dev              # localhost:3000, redirects to /en
npm run build            # expand messages → validate → generate sitemap index → next build
npm run check            # validate all 12 locales (keys + placeholders)
npm run check:cities     # validate every IANA zone id against the runtime
npm run bundle:messages  # regenerate messages.bundle.b64 after editing translations
```

`npm run build` runs the validators first **on purpose**. A truncated translation or a
mistyped time zone fails the build loudly instead of shipping a wrong clock or a
half-English page. Do not move them out of the build command.

## Architecture

| Path | What it holds |
|---|---|
| `lib/tz.ts` | All time maths. Pure functions, no dependencies. |
| `lib/cities.ts` | The 184-city dataset + pair ranking + slug parsing. |
| `lib/route-facts.ts` | Everything a route page needs, computed once server-side. |
| `lib/i18n.ts` | Locale list, direction, message loading with English fallback. |
| `lib/activity.ts` | "what a kid is doing at this hour" + sky gradients. |
| `lib/solar.ts` | Subsolar point (declination + equation of time). Pure. |
| `lib/globe-math.ts` | Lat/lon→sphere + great-circle paths as number arrays. No three import. |
| `lib/quiz.ts` | Guess-the-time question/distractor generator. Pure, rand injected. |
| `lib/sound.ts` | WebAudio-synthesized SFX. Off by default; ctx created only in a user gesture. |
| `lib/passport.ts` | localStorage stamps (`wdtdg.passport.v1`, `wdtdg.quiz.v1`, `wdtdg.sound.v1`). |
| `components/*.tsx` | The interactive pieces. All client components. |
| `components/Globe/` | The 3D Earth. `CesiumGlobe.ts` is the ONLY file importing `cesium`, via `import()` from `Globe.tsx`. |
| `messages/*.json` | 169 keys × 12 locales. English is the source of truth. |
| `messages.bundle.b64` | Transport artifact only — see below. |
| `public/textures/` | NASA Blue/Black Marble 2K WebP (public domain). Regenerate: `node scripts/fetch-textures.mjs`. |

## Invariants — do not regress these

**0. `cesium` is the one rendering dependency, and it stays quarantined.**
Imported ONLY from `components/Globe/CesiumGlobe.ts`, which is itself loaded via a runtime
`import()` from `Globe.tsx` when the globe nears the viewport. It must never appear in the
server bundle or the initial route chunk (`grep` the route chunk for `Viewer` / `Ellipsoid`
after a build if in doubt). `Globe.tsx` falls back to `FlightArc.tsx` when WebGL is
unavailable — do not delete FlightArc. No Cesium ion token is required; optional Google
Photorealistic 3D Tiles stay off unless `NEXT_PUBLIC_GOOGLE_MAP_TILES_KEY` is set.

**1. No time-zone library. Ever.**
`lib/tz.ts` uses `Intl` only, which reads the IANA database already inside Node and every
browser. Adding `luxon` / `date-fns-tz` / `moment-timezone` would ship a *frozen copy* of
the DST rules that goes stale. The current approach is correct forever, for free.

**2. The clock-advance calculation must include whole days.**
```ts
const zoneJump  = offsetMinutes(arrInstant, toTz) - offsetMinutes(depInstant, fromTz);
const clockMoved = dur + zoneJump;          // may exceed 24 h — that is the point
```
An earlier version took `% 1440`, which silently discarded the lost day and told the
child the clock moved *4 hours* during a 15½-hour flight — the exact opposite of the
lesson. If you ever see a modulo near this, it is wrong.

**3. The day ribbon draws each city on its OWN hour boundaries.**
`stripe()` in `DayRibbon.tsx` offsets blocks by `k*60 - (gap % 60)`. That is why a
half-hour zone visibly sits half a block off the row above. Redrawing both stripes on a
shared grid would be simpler and would destroy the single most valuable thing on the page.

**4. Colour follows the city, not the slot.**
Blue is always the origin city, gold always the destination — clock cards, ribbon
stripes, arc endpoints, simulator pods. When the direction tab flips, `TripSim` swaps the
colours in JS. Do not put those colours back in CSS keyed to `.dep` / `.arr`; that
inverts the whole page's colour language on the return leg.

**5. Daylight cards flip to dark ink.**
`brightSky(h)` is `h >= 7 && h < 18` — the hours whose gradient is bright *top to bottom*.
The dawn (5–6) and dusk (18–19) gradients start at dark navy, so dark ink would fail at
the top of the card. Those two were fixed by **darkening the bottom stops instead**. Do
not "fix" them by widening `brightSky`.

**6. The ribbon must not steal vertical scrolls on touch.**
`touch-action: pan-y` plus a deferred commit: on a touch pointer the value is only
committed after >6px of horizontal movement, or on a tap that ends in place. Committing on
`pointerdown` froze the page and silently changed the answer whenever a child scrolled
past the widget.

**7. The ribbon widget is pinned `direction: ltr`.**
A native range input mirrors itself under `dir="rtl"` but the SVG (drawn with explicit
coordinates) does not, so the thumb and the playhead drifted apart in Arabic. The prose
underneath still follows page direction. Same reason the arc SVG is pinned LTR and its
caption is wrapped in U+2068/U+2069 isolates.

**8. Measure SVG text after it is in the document.**
The arc caption shrinks to fit narrow phones via `getComputedTextLength()`. A detached
node measures 0, so the fit silently no-ops. It runs in a `useEffect` after mount.

**9. City slugs may never contain `-to-`.**
That string is the pair separator. `scripts/validate-cities.ts` enforces it.

**10. `revalidate = 3600` on route pages.**
Pages state today's gap. An hour is short enough that no cached page survives a
daylight-saving switch stating the wrong number.

**11. Activities are weekday-aware, per city.**
Delhi can be on Saturday while San Francisco is still on Friday, so the weekend check is
done separately for each. Otherwise a card reads "Saturday" and "school time" together.

## The message bundle

`messages/*.json` are the source of truth — edit those. `messages.bundle.b64` is a
gzipped copy of all 12, used only to move the translation set through transports with a
payload limit. `scripts/expand-messages.mjs` restores the JSON files **only if they are
absent**, so in a normal checkout the bundle is inert.

**If you edit a translation, run `npm run bundle:messages`** so the two don't drift.
(Alternatively: delete the bundle and the expand step, now that the repo is on git. That
is a legitimate simplification — it was a workaround for a transport that no longer
applies.)

## Adding things

**A city** — append a `C(...)` row in `lib/cities.ts`, then `npm run check:cities`.
Fields are slug, name, country, ISO code, IANA zone, lat, lon, rank. `rank` is a rough
search-demand weight that decides which pairs get pre-rendered.

**A language** — copy `messages/en.json`, translate the values (keep every key and every
`{placeholder}`; placeholders may move within a sentence but must all survive), add the
locale to `LOCALES` / `HREFLANG` / `LOCALE_NAMES` in `lib/i18n.ts`, add it to `RTL_LOCALES`
if right-to-left, and add it to the array in `scripts/validate-messages.mjs`. Then
`npm run check` and `npm run bundle:messages`.

**More pre-rendered pages** — raise `PRERENDER_PAIRS` (env var, default 60). It is pairs
*per locale*, so 60 → ~750 pages, 500 → ~6,000. Pages outside the list still work; they
render on first request and cache.

## Known gaps

These are deliberate omissions, not oversights — pick them up if they matter to you.

- **No tests.** The validators cover data integrity; there is no unit test on `lib/tz.ts`.
  A test suite around `zonedToInstant` across DST boundaries would be the highest-value
  addition.
- **City names are English-only** in every locale. The UI chrome translates; "New Delhi"
  does not become "नई दिल्ली". Fixing this means a name-per-locale map in the city data,
  and it would meaningfully improve non-English SEO.
- **No OG images.** `opengraph-image.tsx` per route (via `next/og`) would make shared
  links look far better and is maybe 40 lines.
- **Flight times are estimates** from great-circle distance at ~860 km/h + 40 min. The
  site says so. Real schedule data would need an airline API.
- **`SITEMAP_PAIRS` is 4,000** of ~380,000 possible pairs. That is intentional — listing
  every pair would be a thin-content signal. Raise it as the site earns authority.

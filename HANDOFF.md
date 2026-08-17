# Handoff — how to take this forward

Everything here is built and verified. What's left is getting it onto GitHub and Vercel,
which needs to happen from your machine (a cloud sandbox can't hold your credentials).

---

## Step 1 — get it on your Mac and pushed

The zip already contains the git history and the remote, so this is two commands:

```bash
cd where-did-the-day-go
git push -u origin main
```

Git will ask for credentials once. Use a personal access token as the password, or run
`gh auth login` first if you have the GitHub CLI.

Verify it built for you before anything else:

```bash
npm install
npm run build     # expect: "messages ok: 12 locales x 148 keys" then ~752 pages
npm run dev       # open http://localhost:3000
```

Worth clicking once you're on `/en/san-francisco-to-new-delhi`:

- the two clocks tick and the skies differ
- drag the ribbon — Delhi's stripe sits **half a block off** San Francisco's
- move the takeoff slider until the landing date flips to the next day
- switch to `/ar/dubai-to-tokyo` and confirm the layout mirrors properly

---

## Step 2 — deploy

In Vercel: **Add New → Project → Import Git Repository → where-did-the-day-go**.
It auto-detects Next.js; no build configuration needed.

Set one environment variable:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain.com` (no trailing slash) |

That single variable is what makes the SEO real — it's the origin used in canonical tags,
`hreflang` alternates and every sitemap URL. Until it's set they point at the Vercel
preview host.

Optional: `PRERENDER_PAIRS` (default 60) trades build time for more instantly-served
pages, and `SITEMAP_PAIRS` (default 4000) controls how many routes are listed for crawlers.

**Housekeeping:** delete the three orphaned Vercel projects from my failed deploy attempts
— `where-did-the-day-go`, `wdtdg-probe`, `where-did-the-day-go-app`. None of them built.
Use a different name for the real one.

---

## Step 3 — Search Console

1. Add the domain as a property and verify it (Vercel can serve the DNS TXT record).
2. Submit `https://your-domain.com/sitemap-index.xml`.
3. Expect indexing to be slow and partial at first. 48,000 URLs is a lot to ask of a new
   domain; Google will sample. The pages most likely to rank early are the high-volume
   pairs — `new-york-to-london`, `london-to-new-delhi`, `san-francisco-to-new-delhi`.

---

## Using Claude Code on this

`CLAUDE.md` in the repo root is read automatically at the start of every session, so you
don't need to paste context. It documents the architecture and — more importantly — eleven
invariants that each represent a real bug that was found and fixed. Several of them look
like code that could be simplified; the simpler version is the bug.

Open a session in the project folder:

```bash
cd where-did-the-day-go
claude
```

### Good first prompts

**To ship it:**
> Push this to my GitHub repo and deploy it to Vercel. Set NEXT_PUBLIC_SITE_URL to my
> domain. Then confirm the live site serves /en, /ar/dubai-to-tokyo with dir=rtl, and
> /sitemap-index.xml.

**To close the biggest SEO gap** (city names are English in every locale):
> Read CLAUDE.md. City names are English-only in all 12 locales, which is the known gap
> that most hurts non-English search. Add a per-locale name map to the city data, starting
> with the top 40 cities by rank, and use it in headings, metadata and the FAQ. Keep the
> slugs unchanged — they're the URLs. Extend npm run check to catch a missing name.

**To add social previews:**
> Add an opengraph-image.tsx for the route pages using next/og. Show both city names, the
> time gap, and the two local times, in the site's existing dark palette.

**To harden the time maths:**
> Read CLAUDE.md, then write a test suite for lib/tz.ts. Focus on zonedToInstant across
> DST boundaries: the US spring-forward gap where a wall-clock time doesn't exist, the
> autumn fall-back where one happens twice, and the southern-hemisphere transitions.
> Also test that the gap between Asia/Kolkata and America/Los_Angeles is 750 minutes in
> July and 810 in January.

**To add languages:**
> Read CLAUDE.md's "adding a language" section. Add Turkish, Vietnamese and Thai. Keep
> every key and placeholder, and write for a 10-year-old — plain and concrete, not formal.
> Run npm run check when done.

### One warning

If Claude Code proposes any of the following, it has misread the code — point it at the
matching invariant in `CLAUDE.md`:

- installing a time-zone library (invariant 1)
- taking a modulo of the clock-advance (invariant 2)
- drawing both ribbon stripes on one shared hour grid (invariant 3)
- moving the takeoff/landing colours back into CSS (invariant 4)
- widening `brightSky()` to cover dawn and dusk (invariant 5)
- removing `touch-action: pan-y` or committing the ribbon value on `pointerdown` (6)

---

## Where the numbers come from

Clock offsets and daylight-saving rules: your device's own IANA database, read live via
`Intl`. Distances: great-circle, so shorter than any real flight path. Flight times:
estimated from that distance at ~860 km/h plus 40 minutes of taxi, climb and descent —
they are not airline timetables, and the site says so in the footer.

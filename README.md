# PowerCut — City-Wise Power Cut Intelligence Platform (Bengaluru slice)

This is a working vertical slice of the full platform spec, scoped to
**Bengaluru only**: outage data model → status engine → public city page →
admin CRUD → basic admin auth. Built to extend cleanly to more cities next.

## Database: PostgreSQL (not SQLite)

This started as a SQLite prototype (via Drizzle + better-sqlite3) but was
migrated to **PostgreSQL** after repeated production crashes: on Railway,
the native `better-sqlite3` binding caused a hard **segmentation fault**
the moment it touched a file on a persistent volume, regardless of journal
mode. That's a native-code/filesystem interaction issue that no
application-level config could reliably work around.

The fix: use **`postgres`** (a pure-JavaScript/TCP Postgres client, no
compiled native code at all) via `drizzle-orm/postgres-js`. This can't
segfault the same way, and it matches what the original spec asked for.
It also means you don't need a persistent volume at all — use any hosted
Postgres (Neon and Supabase both have workable free tiers).

## Homepage: national plan, real execution

A detailed India-wide plan (search-first hero, State→City→Area→Pincode
hierarchy, DISCOM finder, reliability scores, national stats) was
provided as a reference. Adopted the good architecture ideas, rejected
the fabricated data:

- **Hero**: now a full-width background image (`public/images/`) with
  a gradient overlay, not a two-column layout — content sits on top.
- **Browse by State**: real states from the database shown with real
  tracked-outage counts (`getAllStates()`), plus `UPCOMING_STATES` — a
  hardcoded display-only array of real state names marked "Coming Soon"
  (same pattern as `UPCOMING_CITIES`, NOT database rows).
- **DISCOM Finder**: real provider data (`getAllProviders()`) — BESCOM's
  actual name, helpline, and website. No fabricated DISCOM directory.
- **Not built**: national stats (586 ongoing etc.), reliability scores,
  news section, FAQ — these need either real historical data at scale
  or more research per-DISCOM, deliberately deferred rather than faked.

## Getting started

```bash
npm install
# Point at any Postgres instance — local, Neon, Supabase, Railway Postgres, etc.
export DATABASE_URL="postgres://user:password@host:5432/dbname"
npm run dev            # http://localhost:3000 — auto-migrates and seeds on start
```

Schema migrations and demo-data seeding happen **automatically on every
server start** via `scripts/bootstrap-db.mjs` (wired into both `dev` and
`start`) — idempotent, safe to re-run on every boot/redeploy since it
skips seeding once real data exists. No manual migration step needed.

Admin login: `http://localhost:3000/admin/outages` → redirects to
`/admin/login`. Default password is `powercut-admin` (set `ADMIN_PASSWORD`
env var to change it — do this before deploying anywhere real).

## Deploying (e.g. Railway/Render/Vercel)

1. Create a free Postgres database (Neon: neon.tech, Supabase:
   supabase.com, or your platform's own Postgres add-on). Copy its
   connection string.
2. Set env vars: `DATABASE_URL` (the connection string), `ADMIN_PASSWORD`,
   `ADMIN_SESSION_SECRET`.
3. Build command: `npm install && npm run build`. Start command:
   `npm run start` (runs the DB bootstrap automatically first).
4. No volume, no shell access, no manual migration step required.

## Deliberate engineering decisions (read before extending)

1. **Lazy DB connection.** `lib/db/index.ts` doesn't open a connection at
   module-import time — only on first actual query, inside a real request.
   This matters because Next.js loads this module while collecting page
   config at *build* time, before `DATABASE_URL` may be set/reachable;
   opening eagerly crashed the build outright before this fix.

2. **Auth is MVP-only.** One shared password, signed cookie, 12-hour
   session. Swap in NextAuth/Auth.js with real user records and roles
   before this goes near production.

3. **No source-fetching pipeline yet.** Sections 11–21 of the master spec
   (source adapters, raw document storage, AI extraction, duplicate
   detection, conflict resolution, source health monitoring) are not
   built. Everything in the database currently comes from the admin form
   or the seed script.

4. **Design direction.** The UI intentionally reads like a grid status
   console (dark instrument-panel header, amber hazard accent used once,
   monospace tabular times). Fonts are system-stack only (no Google
   Fonts) because this was built in a sandbox without that network access
   — swap in real display/mono webfonts when deploying somewhere with
   normal internet access.

## Multi-city architecture

The city page is a real dynamic route: `/power-cut/[state]/[city]`
(`app/power-cut/[state]/[city]/page.tsx`), not hardcoded to Bengaluru.
Adding a new city is a database operation, not a code change — insert
rows into `states`/`cities`/`localities` and the page works immediately.

- **Unknown cities show an honest "not covered yet" state** (not a
  generic error, not fabricated data) with a link back to Bengaluru.
- **Homepage city directory** (`getCityDirectory()` in
  `lib/db/queries.ts`) reads real cities from the database and marks
  each "Live" if it actually has published outages.
- **`UPCOMING_CITIES`** in `app/page.tsx` is a small hardcoded array of
  well-known city names shown as "Coming Soon" — these are NOT database
  rows. They exist purely so the homepage communicates the multi-city
  roadmap honestly without inserting guessed data that might conflict
  with a real city list provided later. Replace this array (or remove
  it and insert real inactive city rows instead) once a real city list
  exists.

## Design: Cyberpunk neon (magenta/purple) — current theme

### Visual polish pass: full color consistency + 3D tilt + SVG illustration

After the initial cyberpunk port, an audit found leftover Theme A
amber/copper colors still mixed into brand elements (the logo badge,
CTA buttons, active nav underline, hero badge) — these were never fully
migrated in the first pass. Fixed everywhere `grep` found them: logo,
header "Report Outage" button, hero "Check status" button, "see
coverage" link, locality chip badges, tab active-state indicator, form
input focus borders. The deliberate exception: `amber-status` stays
wherever it's a genuine **status** color (scheduled outages, the
"unverified" caution badge, preparation tips) — that's semantic, not
brand, and stays consistent with the fixed red/green rule.

- **Real 3D**: `components/ui/tilt-card.tsx` — a client component doing
  actual mouse-tracking perspective tilt (not a static CSS hover),
  applied to the hero stats widget, About/How-it-works cards, and city
  directory tiles. Three.js/WebGL was considered but scoped out as a
  separate, heavier effort — this CSS-only approach works everywhere
  including weaker mobile devices, which matters for a utility site.
- **Hero illustration**: `components/hero/hero-illustration.tsx` — a
  detailed layered SVG (isometric-style city blocks with 3 faces each
  for pseudo-3D depth, a lattice transmission tower, a glowing power
  core) replacing the earlier bare CSS-div illustration. Built as
  original SVG rather than a found photo, both to avoid licensing
  questions and to match the exact palette.
- **Icons**: emoji replaced with real SVG icon components
  (`components/icons/`) plus `drop-shadow` glow filters.


Ported from an approved static HTML demo into `app/globals.css`. Same
fixed rule as every previous theme iteration: red (`#F87171`) =
ongoing/danger, green (`#34D399`) = restored/good, never themed — only
the brand accent (magenta/purple gradient, glow effects) reflects the
current theme. Admin panel stays on its original light theme throughout.

## Design: Theme A (Amber/Copper glow) — superseded

The public-facing pages now use "Theme A" — chosen after comparing four
palette options as static demos. Key rules, enforced throughout:

- **Red (`#F87171`) = ongoing/danger and green (`#34D399`) = restored/good
  are FIXED constants**, never themed. Only the brand accent (amber→copper
  gradient) is used for headline glow, primary buttons, and badges — see
  `lib/outage-status.ts` and `app/globals.css`.
- Glass-morphism cards (`.glass` utility), ambient background glow orbs,
  a glowing gradient divider, and pulsing status dots are used throughout
  — see `app/globals.css` for all custom utilities.
- **The admin panel is intentionally NOT themed** — `app/admin/layout.tsx`
  locally overrides the dark public-site body back to the original light
  theme for the whole `/admin` section, so admin stays legible without
  touching every individual admin page.

### A note on visual verification

This was built and iterated against real screenshots (using `wkhtmltoimage`,
installed via apt) at several points in development — this caught real
bugs (flexbox `gap` not rendering in that older engine, a 5-column grid
collapsing to 1 column, mobile content overflowing its container). Those
fixes are real and apply regardless of browser.

However, that same tool has a **known limitation** specific to this app:
it doesn't handle React 19's `data-precedence` stylesheet-loading
attribute (visible in the compiled HTML's `<link>` tag), which is a
completely standard, well-supported mechanism in real browsers but not
in that ~2016-era rendering engine. This caused screenshots taken late in
development to show unstyled default HTML (blue underlined links, default
buttons) even though the underlying `className` values and compiled CSS
were independently verified correct via direct file/HTML inspection. If
you ever see this app looking unstyled in a screenshot, check whether it
was captured with `wkhtmltoimage` before assuming it's a real bug — check
the compiled CSS/HTML directly instead, the way this was resolved here.

## Interactive map (Leaflet + OpenStreetMap)

Two real maps, not decorative ones:

- **Homepage** (`app/page.tsx`) — India-zoom map. Bengaluru gets a real
  marker colored by actual live status (red=ongoing, orange=scheduled,
  blue=normal), clickable through to the city page. Five other major
  cities show as dim "not covered yet" markers at their real coordinates
  — real locations, honestly labeled as uncovered, never fake outage data.
- **Bengaluru page** — city-zoom map with one marker per locality,
  colored by that locality's most urgent current outage status.

Implementation notes:
- `react-leaflet` + `leaflet`, both pure JS — no native dependencies, so
  this can't hit the class of native-binary crash the SQLite driver did
  earlier in this project.
- Leaflet touches `window`/DOM directly and breaks under SSR, so the map
  component is dynamically imported with `ssr: false`
  (`components/map/map-loader.tsx`). The server-rendered HTML shows a
  "Loading map…" placeholder; the actual map only mounts client-side.
  This is expected — don't "fix" it by removing the dynamic import.
- Markers use custom `L.divIcon` colored circles instead of Leaflet's
  default marker images, which avoids a well-known bundler/asset-path
  breakage with Leaflet's default icons in Next.js.
- Tiles are CartoDB's free dark basemap (matches the site's dark theme),
  correctly attributed to both OpenStreetMap and CARTO per their terms.
- Locality coordinates (`lib/db/schema.ts` already had the columns) are
  populated in `scripts/bootstrap-db.mjs` with real public coordinates
  for each Bengaluru locality. There's no admin UI yet for editing
  locality coordinates — that requires direct DB access for now.

## Next slice candidates

- Wire a second city (e.g. Chennai/TANGEDCO) to prove the multi-provider,
  multi-state geography actually holds up.
- Replace MVP auth with NextAuth + a real `users` table and roles.
- A second, higher-confidence source once one becomes automatable —
  BESCOM's own official site currently blocks automated access via
  robots.txt, so this couldn't be built against them directly (see below).

## Crowd reports (spec section 40)

`/power-cut/karnataka/bengaluru` now has a "Report a power cut" form and
an aggregated community-reports panel, deliberately built as a **separate
system from the sourced outage pipeline**:

- `user_reports` is its own table — never a row in `power_outages`, never
  given a `sourceType` or confidence score. It's an unverified crowd
  signal, not sourced data, and the UI never lets those two things blur
  together.
- Tiers match the spec: 1 report → "Possible outage reported", 5+ →
  "Multiple users reporting outage", 20+ → "Strong local outage signal".
  See `lib/reports/tiers.ts`.
- Reports older than `REPORT_ACTIVE_WINDOW_HOURS` (3, by default) stop
  counting toward the current signal — old reports don't linger forever.
- Anonymous, no login required, with lightweight abuse resistance: a
  hashed IP + locality pair can't submit again for 30 minutes (see
  `app/api/reports/route.ts`). The IP itself is never stored, only a
  salted hash of it.
- `/admin/reports` shows the raw underlying log behind the aggregated
  public tiers.

This exists specifically to cover the gap sourced data can't: unscheduled,
unannounced outages that no official notice or secondary aggregator will
ever mention.

## Source ingestion: OneIndia (secondary source)

BESCOM's official Planned Outages page (`bescom.karnataka.gov.in`)
disallows automated access in its `robots.txt`. Building a scraper against
it anyway would mean bypassing an access control the site owner
deliberately set — this project won't do that (see the master spec,
section 13, and this codebase's own values around legitimate access).

So the only real-data source currently wired up is **OneIndia's Bengaluru
power-cut page**, which does allow fetching and itself aggregates from
BESCOM notices. Because it's a secondary/aggregator source, not BESCOM
directly, everything from it is treated accordingly:

- `lib/sources/oneindia-fetch.ts` — fetches the page, strips HTML to plain
  text.
- `lib/sources/oneindia-extractor.ts` — **rule-based only, no LLM calls**
  (by design/request) — regex pattern matching pulls (locality, date,
  start, end) candidates out of free-form prose. This has real limits:
  phrasing OneIndia hasn't used before may not match. Tested against real
  page content and works well for the phrasings observed, but expect
  gaps — that trade-off was accepted deliberately over adding an LLM
  dependency.
- `lib/sources/locality-match.ts` — matches extracted locality names
  against your existing `localities` table. **Deliberately does not
  auto-create new localities** from unverified source text — an
  unmatched name gets flagged `(unmapped)` on the outage record instead,
  for an admin to either map or create deliberately. This avoids the
  geography tables filling up with junk from extraction mistakes.
- `lib/sources/ingest-oneindia.ts` — orchestrates fetch → store raw
  snapshot in `source_documents` → extract → match → dedupe (by
  city+locality+date+start+end fingerprint) → insert.
- **Every record this creates is auto-published immediately** (per
  explicit request — no manual review queue). The safeguard used instead:
  every public-facing card and every admin list row for a non-official
  source shows a visible **"⚠ Unverified — [source name]"** badge, so
  nothing pretends to be as trustworthy as an official BESCOM source. See
  `lib/sources/source-meta.ts` for the display-name mapping.
- **Fuzzy deduplication.** Candidates aren't just checked for an exact
  timestamp match — anything in the same city+locality+date whose time
  window overlaps (or starts within an hour of) an existing record is
  treated as the same real-world event. If a genuinely different source
  corroborates an existing record instead of duplicating it, that
  record's confidence score bumps up (capped well below what an official
  source gets) rather than creating a second row. See
  `lib/sources/ingest-oneindia.ts`.
- Copyright: the extractor pulls out facts (locality, time, reason),
  never OneIndia's sentences — the `description` field is written in this
  app's own words, with the raw sentence kept internally for admin
  cross-reference only, never displayed publicly.

**Triggering it:**
- Manually: `/admin/sources` → "Fetch OneIndia now" button.
- Automatically: point an external free scheduler (e.g. cron-job.org) at
  `POST https://<your-domain>/api/admin/ingest/oneindia` daily, with
  header `x-ingest-secret: <your INGEST_SECRET value>`. OneIndia says
  BESCOM updates happen "every evening for the next day" — an evening
  fetch (e.g. 8–9 PM IST) is the natural cadence; a morning re-check
  catches late updates.

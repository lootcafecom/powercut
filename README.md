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

## Next slice candidates

- Wire a second city (e.g. Chennai/TANGEDCO) to prove the multi-provider,
  multi-state geography actually holds up.
- Replace MVP auth with NextAuth + a real `users` table and roles.
- A second, higher-confidence source once one becomes automatable —
  BESCOM's own official site currently blocks automated access via
  robots.txt, so this couldn't be built against them directly (see below).

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

# PowerCut — City-Wise Power Cut Intelligence Platform (Bengaluru slice)

This is a working vertical slice of the full platform spec, scoped to
**Bengaluru only**, covering: outage data model → status engine → public
city page → admin CRUD → basic admin auth. It's built to extend cleanly to
more cities/providers next.

## What's implemented

- **Public page**: `/power-cut/karnataka/bengaluru` — live status panel,
  Today/Tomorrow/Upcoming/History tabs, outage cards (locality, time,
  reason, provider, source, last-verified, preparation tips), and an
  explicit "no scheduled outage information available" empty state
  (never a silent "no power cut" claim).
- **Outage status engine** (`lib/outage-status.ts`) — computes
  scheduled / starting_soon / ongoing / scheduled_window_ended / restored
  live from timestamps. Crucially: passing the scheduled end time never
  auto-claims "restored" — only a real `actualEndTime` does that.
- **Admin CRUD** at `/admin/outages` (password-gated — see below):
  list, create, edit, delete, "mark verified now". Only outages with
  `verificationStatus = published` appear on the public site.
- **Data model** (`lib/db/schema.ts`): states → cities → localities,
  electricity_providers, provider_service_areas (many-to-many),
  power_outages — matching the master spec's schema shape.
- **Validation**: Zod schema (`lib/validators/outage.ts`) enforcing
  required fields, valid dates/URLs, and end-time-after-start-time.
- **Confidence/publishing workflow config** (`lib/config/confidence.ts`)
  with the 90/75/50 thresholds from the spec, ready to be wired into an
  automated pipeline later.
- **Basic admin auth**: single shared password + signed httpOnly cookie,
  gating all `/admin/*` routes via `proxy.ts`.

## Getting started

```bash
npm install
npm run dev            # http://localhost:3000 — auto-creates and seeds the DB on first request
```

For production (`npm run build && npm run start`), the database schema is
applied and demo data seeded **automatically on every server start** via
`scripts/bootstrap-db.mjs` (wired into the `start` script) — safe to re-run
on every boot/redeploy since it skips seeding once real data exists. No
manual `db:push`/`db:seed` step is required on a deploy host. Those
commands still exist for local/manual use if you want them.

Admin login: `http://localhost:3000/admin/outages` → redirects to
`/admin/login`. Default password is `powercut-admin` (set `ADMIN_PASSWORD`
env var to change it — do this before deploying anywhere real).

## Deploying (e.g. Railway/Render)

1. Set env vars: `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, and
   `DATABASE_FILE` (pointing at a path on a persistent volume, e.g.
   `/data/powercut.db` — without a volume, data resets on every restart,
   which is fine for a demo but not for real data).
2. Build command: `npm install && npm run build`. Start command:
   `npm run start` (this now runs the DB bootstrap automatically first).
3. That's it — no shell access or CLI needed for first-time setup.

## Deliberate engineering decisions (read before extending)

1. **SQLite via Drizzle ORM, not PostgreSQL via Prisma.** The master spec
   calls for Postgres + Prisma. This scaffold was built in a sandboxed
   environment whose network egress couldn't reach Prisma's binary-engine
   CDN, so Drizzle + SQLite was used instead — zero native network
   dependency, same relational modeling. The schema in `lib/db/schema.ts`
   is written in a Postgres-portable style on purpose. Moving to Postgres
   later means: swap `sqliteTable` → `pgTable`, swap the driver in
   `lib/db/index.ts` to `drizzle-orm/node-postgres`, point
   `drizzle.config.ts` at `dialect: "postgresql"`, and re-run migrations.
   No page or component code needs to change — they all go through
   `lib/db/queries.ts`.

2. **Auth is MVP-only.** One shared password, signed cookie, 12-hour
   session. This stops casual wandering into `/admin` but is not the
   "secure authentication system" (multi-user, roles, audit log) the
   full spec calls for. Swap in NextAuth/Auth.js (or similar) with real
   user records before this goes anywhere near production.

3. **No source-fetching pipeline yet.** Sections 11–21 of the master
   spec (source adapters, raw document storage, AI extraction, duplicate
   detection, conflict resolution, source health monitoring) are not
   built. Everything currently in the database was entered through the
   admin form or the seed script. The schema and confidence-threshold
   config are shaped so that pipeline can be added without changing the
   public-facing pages.

4. **Design direction.** The UI intentionally reads like a grid status
   console (dark instrument-panel header, amber hazard accent used once,
   monospace tabular times) rather than a decorated consumer app — this
   product's whole premise is that trustworthy timestamps matter more
   than visual flourish. See `app/globals.css` for the token system.
   Fonts are system-stack only (no Google Fonts) because this sandbox's
   network egress doesn't reach fonts.googleapis.com — swap in real
   display/mono webfonts when deploying somewhere with normal internet
   access.

## Next slice candidates

- Wire a second city (e.g. Chennai/TANGEDCO) to prove the multi-provider,
  multi-state geography actually holds up.
- Replace MVP auth with NextAuth + a real `users` table and roles.
- Build one real provider adapter (`discover/fetch/parse/normalize`) against
  a public BESCOM notice page, landing extracted rows in a
  `source_documents` table for review before publish.

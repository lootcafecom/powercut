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
- Build one real provider adapter (`discover/fetch/parse/normalize`)
  against a public BESCOM notice page, landing extracted rows in a
  `source_documents` table for review before publish.

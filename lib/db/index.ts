import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as dbSchema from "./schema";

/**
 * The connection is created lazily, on first actual query, not at module
 * import time — same reasoning as before: Next.js loads this module while
 * collecting page config at BUILD time, when DATABASE_URL may not be set
 * or reachable yet. The `postgres` package itself doesn't eagerly connect
 * on construction either way (it connects lazily per-query), but we still
 * guard here so a *missing* DATABASE_URL at build time doesn't throw.
 *
 * Using a plain TCP/JS Postgres client (the `postgres` package) instead of
 * a native SQLite binding is the whole point of this file: no compiled
 * native code means no possibility of the process segfaulting the way
 * better-sqlite3 did on some persistent-volume filesystems.
 */

type DrizzleDb = ReturnType<typeof drizzle<typeof dbSchema>>;

let _client: ReturnType<typeof postgres> | null = null;
let _db: DrizzleDb | null = null;

function getDb(): DrizzleDb {
  if (_db) return _db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Set it to your Postgres connection string (e.g. from Neon/Supabase/Railway Postgres)."
    );
  }

  _client = postgres(connectionString, { max: 5 });
  _db = drizzle(_client, { schema: dbSchema });
  return _db;
}

export const db: DrizzleDb = new Proxy({} as DrizzleDb, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb() as object, prop, receiver);
  },
});

export * as schema from "./schema";

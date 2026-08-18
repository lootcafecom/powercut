import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";
import fs from "fs";
import * as dbSchema from "./schema";

/**
 * The database connection is created lazily, on first actual query, not at
 * module import time. This matters because Next.js loads this module (via
 * lib/db/queries.ts) while collecting page config at BUILD time, before any
 * request has been made and before a deploy platform's persistent volume is
 * mounted. Opening the file eagerly at the top of this module would crash
 * the build the moment the target directory doesn't exist yet — which is
 * exactly the "Cannot open database because the directory does not exist"
 * error this pattern avoids.
 */

type DrizzleDb = ReturnType<typeof drizzle<typeof dbSchema>>;

let _sqlite: Database.Database | null = null;
let _db: DrizzleDb | null = null;

function getSqlite() {
  if (_sqlite) return _sqlite;

  const dbPath = process.env.DATABASE_FILE || path.join(process.cwd(), "powercut.db");
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  _sqlite = new Database(dbPath);
  // NOTE: deliberately NOT using WAL journal mode. WAL relies on
  // memory-mapped shared files (-wal/-shm), which segfaults the native
  // SQLite binding on some persistent-volume filesystems (observed on
  // Railway volumes). The default rollback journal is slightly slower
  // under heavy concurrent writes but is safe everywhere, and this app's
  // write volume doesn't come close to needing WAL's benefits.
  _sqlite.pragma("journal_mode = DELETE");
  _sqlite.pragma("foreign_keys = ON");
  return _sqlite;
}

function getDb(): DrizzleDb {
  if (_db) return _db;
  _db = drizzle(getSqlite(), { schema: dbSchema });
  return _db;
}

// A Proxy so existing call sites can keep doing `import { db } from "@/lib/db"`
// and `db.select(...)` etc. unchanged — the connection isn't actually opened
// until a property (like `.select`) is first accessed, which only happens
// inside a real request handler at runtime.
export const db: DrizzleDb = new Proxy({} as DrizzleDb, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb() as object, prop, receiver);
  },
});

export * as schema from "./schema";

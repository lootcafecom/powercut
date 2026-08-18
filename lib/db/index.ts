import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";
import * as dbSchema from "./schema";

const dbPath = process.env.DATABASE_FILE || path.join(process.cwd(), "powercut.db");

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema: dbSchema });
export * as schema from "./schema";

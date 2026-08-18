import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_FILE || path.join(process.cwd(), "powercut.db");

console.log(`[bootstrap-db] Using database file: ${dbPath}`);

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite);

migrate(db, { migrationsFolder: path.join(__dirname, "..", "lib", "db", "migrations") });
console.log("[bootstrap-db] Migrations applied (or already up to date).");

const { count } = sqlite
  .prepare("SELECT COUNT(*) as count FROM states")
  .get();

if (count > 0) {
  console.log(`[bootstrap-db] Data already present (${count} states) — skipping seed.`);
  sqlite.close();
  process.exit(0);
}

console.log("[bootstrap-db] No data found — seeding Bengaluru demo data...");

function istToUtcIso(daysFromToday, hourIst, minuteIst) {
  const now = new Date();
  const target = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysFromToday,
      hourIst,
      minuteIst
    )
  );
  target.setUTCMinutes(target.getUTCMinutes() - (5 * 60 + 30));
  return target.toISOString();
}

function dateOffset(daysFromToday) {
  const now = new Date();
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysFromToday)
  );
  return d.toISOString().slice(0, 10);
}

const nowMs = Date.now();

const insertState = sqlite.prepare(
  "INSERT INTO states (name, code, slug) VALUES (?, ?, ?)"
);
const stateId = insertState.run("Karnataka", "KA", "karnataka").lastInsertRowid;

const insertProvider = sqlite.prepare(
  `INSERT INTO electricity_providers (name, short_name, slug, website, official_source_url, customer_care_phone, description)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);
const providerId = insertProvider.run(
  "Bangalore Electricity Supply Company",
  "BESCOM",
  "bescom",
  "https://bescom.karnataka.gov.in",
  "https://bescom.karnataka.gov.in/scheduled-outages",
  "1912",
  "Electricity distribution utility serving Bengaluru and surrounding districts."
).lastInsertRowid;

const insertCity = sqlite.prepare(
  "INSERT INTO cities (state_id, name, slug, latitude, longitude) VALUES (?, ?, ?, ?, ?)"
);
const cityId = insertCity.run(stateId, "Bengaluru", "bengaluru", 12.9716, 77.5946).lastInsertRowid;

const insertLocality = sqlite.prepare(
  "INSERT INTO localities (city_id, name, slug) VALUES (?, ?, ?)"
);
const localityIds = {};
for (const name of [
  "Whitefield",
  "Electronic City",
  "Indiranagar",
  "Koramangala",
  "Jayanagar",
  "Yelahanka",
]) {
  const id = insertLocality.run(cityId, name, name.toLowerCase().replace(/\s+/g, "-")).lastInsertRowid;
  localityIds[name] = id;
}

const insertOutage = sqlite.prepare(`
  INSERT INTO power_outages (
    state_id, provider_id, city_id, locality_id, title, description, outage_type, reason,
    scheduled_date, start_time, end_time, actual_start_time, actual_end_time,
    source_type, source_url, confidence_score, verification_status,
    first_seen_at, published_at, last_verified_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const rows = [
  {
    locality: "Whitefield",
    title: "Scheduled maintenance outage - Whitefield feeder",
    description: "Planned shutdown for transformer maintenance on the Whitefield 11kV feeder.",
    outageType: "maintenance",
    reason: "Transformer maintenance work",
    scheduledDate: dateOffset(0),
    startTime: new Date(nowMs - 30 * 60 * 1000).toISOString(),
    endTime: new Date(nowMs + 90 * 60 * 1000).toISOString(),
    actualStart: null,
    actualEnd: null,
    sourceType: "official_website",
    sourceUrl: "https://bescom.karnataka.gov.in/scheduled-outages",
    confidence: 95,
    firstSeen: new Date(nowMs - 2 * 60 * 60 * 1000).toISOString(),
    lastVerified: new Date(nowMs - 15 * 60 * 1000).toISOString(),
  },
  {
    locality: "Electronic City",
    title: "Scheduled outage - Electronic City Phase 1",
    description: "Planned outage for cable upgrade work in Phase 1 industrial area.",
    outageType: "scheduled",
    reason: "Cable upgrade work",
    scheduledDate: dateOffset(0),
    startTime: new Date(nowMs + 15 * 60 * 1000).toISOString(),
    endTime: new Date(nowMs + 4 * 60 * 60 * 1000).toISOString(),
    actualStart: null,
    actualEnd: null,
    sourceType: "official_pdf",
    sourceUrl: "https://bescom.karnataka.gov.in/notices/ec-phase1.pdf",
    confidence: 92,
    firstSeen: new Date(nowMs - 5 * 60 * 60 * 1000).toISOString(),
    lastVerified: new Date(nowMs - 45 * 60 * 1000).toISOString(),
  },
  {
    locality: "Indiranagar",
    title: "Scheduled outage - Indiranagar 100ft Road",
    description: "Planned maintenance later today along 100ft Road commercial stretch.",
    outageType: "maintenance",
    reason: "Substation maintenance",
    scheduledDate: dateOffset(0),
    startTime: istToUtcIso(0, 20, 0),
    endTime: istToUtcIso(0, 22, 0),
    actualStart: null,
    actualEnd: null,
    sourceType: "official_website",
    sourceUrl: "https://bescom.karnataka.gov.in/scheduled-outages",
    confidence: 90,
    firstSeen: new Date(nowMs - 6 * 60 * 60 * 1000).toISOString(),
    lastVerified: new Date(nowMs - 60 * 60 * 1000).toISOString(),
  },
  {
    locality: "Koramangala",
    title: "Scheduled outage - Koramangala 5th Block",
    description: "Planned outage tomorrow for line clearance work.",
    outageType: "scheduled",
    reason: "Line clearance work",
    scheduledDate: dateOffset(1),
    startTime: istToUtcIso(1, 10, 0),
    endTime: istToUtcIso(1, 13, 30),
    actualStart: null,
    actualEnd: null,
    sourceType: "official_website",
    sourceUrl: "https://bescom.karnataka.gov.in/scheduled-outages",
    confidence: 93,
    firstSeen: new Date(nowMs - 3 * 60 * 60 * 1000).toISOString(),
    lastVerified: new Date(nowMs - 30 * 60 * 1000).toISOString(),
  },
  {
    locality: "Jayanagar",
    title: "Scheduled outage - Jayanagar 4th Block",
    description: "Window has passed; we have not yet received confirmed restoration data.",
    outageType: "maintenance",
    reason: "Transformer replacement",
    scheduledDate: dateOffset(0),
    startTime: new Date(nowMs - 5 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(nowMs - 2 * 60 * 60 * 1000).toISOString(),
    actualStart: null,
    actualEnd: null,
    sourceType: "official_website",
    sourceUrl: "https://bescom.karnataka.gov.in/scheduled-outages",
    confidence: 88,
    firstSeen: new Date(nowMs - 8 * 60 * 60 * 1000).toISOString(),
    lastVerified: new Date(nowMs - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    locality: "Yelahanka",
    title: "Scheduled outage - Yelahanka New Town",
    description: "Morning maintenance outage, confirmed restored by field crew.",
    outageType: "maintenance",
    reason: "Feeder maintenance",
    scheduledDate: dateOffset(0),
    startTime: new Date(nowMs - 7 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(nowMs - 5 * 60 * 60 * 1000).toISOString(),
    actualStart: new Date(nowMs - 7 * 60 * 60 * 1000).toISOString(),
    actualEnd: new Date(nowMs - 5.5 * 60 * 60 * 1000).toISOString(),
    sourceType: "official_website",
    sourceUrl: "https://bescom.karnataka.gov.in/scheduled-outages",
    confidence: 97,
    firstSeen: new Date(nowMs - 9 * 60 * 60 * 1000).toISOString(),
    lastVerified: new Date(nowMs - 5 * 60 * 60 * 1000).toISOString(),
  },
];

for (const r of rows) {
  insertOutage.run(
    stateId,
    providerId,
    cityId,
    localityIds[r.locality],
    r.title,
    r.description,
    r.outageType,
    r.reason,
    r.scheduledDate,
    r.startTime,
    r.endTime,
    r.actualStart,
    r.actualEnd,
    r.sourceType,
    r.sourceUrl,
    r.confidence,
    "published",
    r.firstSeen,
    r.firstSeen,
    r.lastVerified
  );
}

console.log(`[bootstrap-db] Seeded ${rows.length} demo outages for Bengaluru.`);
sqlite.close();

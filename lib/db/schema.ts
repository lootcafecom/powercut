import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
} from "drizzle-orm/sqlite-core";

/**
 * NOTE ON DATABASE ENGINE
 * The master spec calls for PostgreSQL + Prisma. This sandbox environment's
 * network egress does not allow reaching Prisma's binary-engine CDN, so this
 * scaffold uses Drizzle ORM + SQLite (file-based, zero network dependency)
 * to stay fully functional here. The schema below is intentionally written
 * in a Postgres-portable style (no SQLite-only tricks) — swapping the driver
 * to `drizzle-orm/node-postgres` and changing column helpers
 * (sqliteTable -> pgTable, integer timestamps -> timestamp) is a mechanical,
 * low-risk migration when this moves to production. See README.md.
 */

const timestamps = {
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
};

export const states = sqliteTable("states", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  countrySlug: text("country_slug").notNull().default("india"),
  name: text("name").notNull(),
  code: text("code"),
  slug: text("slug").notNull().unique(),
  status: text("status").notNull().default("active"),
  ...timestamps,
});

export const districts = sqliteTable("districts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  stateId: integer("state_id")
    .notNull()
    .references(() => states.id),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  status: text("status").notNull().default("active"),
  ...timestamps,
});

export const electricityProviders = sqliteTable("electricity_providers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  slug: text("slug").notNull().unique(),
  website: text("website"),
  officialSourceUrl: text("official_source_url"),
  customerCarePhone: text("customer_care_phone"),
  emergencyPhone: text("emergency_phone"),
  description: text("description"),
  status: text("status").notNull().default("active"),
  ...timestamps,
});

export const cities = sqliteTable("cities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  stateId: integer("state_id")
    .notNull()
    .references(() => states.id),
  districtId: integer("district_id").references(() => districts.id),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  status: text("status").notNull().default("active"),
  ...timestamps,
});

export const localities = sqliteTable("localities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  cityId: integer("city_id")
    .notNull()
    .references(() => cities.id),
  parentLocalityId: integer("parent_locality_id"),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  postalCode: text("postal_code"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  status: text("status").notNull().default("active"),
  ...timestamps,
});

// Many-to-many: which providers serve which geographic entities.
export const providerServiceAreas = sqliteTable("provider_service_areas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  providerId: integer("provider_id")
    .notNull()
    .references(() => electricityProviders.id),
  stateId: integer("state_id").references(() => states.id),
  districtId: integer("district_id").references(() => districts.id),
  cityId: integer("city_id").references(() => cities.id),
  localityId: integer("locality_id").references(() => localities.id),
  ...timestamps,
});

export const outageTypeValues = [
  "scheduled",
  "maintenance",
  "load_shedding",
  "emergency",
  "unscheduled",
  "unknown",
] as const;

export const verificationStatusValues = [
  "draft",
  "pending_review",
  "verified",
  "published",
  "rejected",
  "cancelled",
] as const;

export const sourceTypeValues = [
  "official_website",
  "official_api",
  "official_pdf",
  "official_notice",
  "official_social",
  "trusted_secondary_source",
  "manual",
  "user_report",
] as const;

export const powerOutages = sqliteTable("power_outages", {
  id: integer("id").primaryKey({ autoIncrement: true }),

  stateId: integer("state_id")
    .notNull()
    .references(() => states.id),
  districtId: integer("district_id").references(() => districts.id),
  providerId: integer("provider_id")
    .notNull()
    .references(() => electricityProviders.id),
  cityId: integer("city_id")
    .notNull()
    .references(() => cities.id),
  localityId: integer("locality_id").references(() => localities.id),

  title: text("title").notNull(),
  description: text("description"),
  outageType: text("outage_type").notNull().default("scheduled"),
  reason: text("reason"),

  // Stored as ISO date/time strings, always interpreted in the
  // city's/provider's timezone (see lib/timezone.ts) — never ambiguous
  // local wall-clock strings without a zone anchor.
  scheduledDate: text("scheduled_date").notNull(), // YYYY-MM-DD
  startTime: text("start_time").notNull(), // ISO 8601 datetime, UTC
  endTime: text("end_time").notNull(), // ISO 8601 datetime, UTC
  actualStartTime: text("actual_start_time"),
  actualEndTime: text("actual_end_time"),

  sourceType: text("source_type").notNull().default("manual"),
  sourceUrl: text("source_url"),
  sourceDocument: text("source_document"),

  confidenceScore: integer("confidence_score").notNull().default(50),
  verificationStatus: text("verification_status")
    .notNull()
    .default("draft"),

  firstSeenAt: text("first_seen_at").default(sql`CURRENT_TIMESTAMP`),
  publishedAt: text("published_at"),
  lastVerifiedAt: text("last_verified_at"),

  ...timestamps,
});

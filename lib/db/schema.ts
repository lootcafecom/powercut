import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  serial,
  real,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()::text`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`now()::text`),
};

export const states = pgTable("states", {
  id: serial("id").primaryKey(),
  countrySlug: text("country_slug").notNull().default("india"),
  name: text("name").notNull(),
  code: text("code"),
  slug: text("slug").notNull().unique(),
  status: text("status").notNull().default("active"),
  ...timestamps,
});

export const districts = pgTable("districts", {
  id: serial("id").primaryKey(),
  stateId: integer("state_id")
    .notNull()
    .references(() => states.id),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  status: text("status").notNull().default("active"),
  ...timestamps,
});

export const electricityProviders = pgTable("electricity_providers", {
  id: serial("id").primaryKey(),
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

export const cities = pgTable("cities", {
  id: serial("id").primaryKey(),
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

export const localities = pgTable("localities", {
  id: serial("id").primaryKey(),
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

export const providerServiceAreas = pgTable("provider_service_areas", {
  id: serial("id").primaryKey(),
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

// Raw snapshot of a fetched source page, kept so extraction can be
// re-run/debugged and every published outage has a traceable origin.
export const sourceDocuments = pgTable("source_documents", {
  id: serial("id").primaryKey(),
  sourceName: text("source_name").notNull(), // e.g. "oneindia_bengaluru"
  url: text("url").notNull(),
  contentHash: text("content_hash").notNull(),
  rawText: text("raw_text").notNull(),
  fetchedAt: text("fetched_at").notNull().default(sql`now()::text`),
  processingStatus: text("processing_status").notNull().default("pending"), // pending | processed | failed
  processingError: text("processing_error"),
  processedAt: text("processed_at"),
  recordsExtracted: integer("records_extracted").default(0),
});

export const powerOutages = pgTable("power_outages", {
  id: serial("id").primaryKey(),

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

  scheduledDate: text("scheduled_date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  actualStartTime: text("actual_start_time"),
  actualEndTime: text("actual_end_time"),

  sourceType: text("source_type").notNull().default("manual"),
  sourceUrl: text("source_url"),
  sourceDocument: text("source_document"),

  confidenceScore: integer("confidence_score").notNull().default(50),
  verificationStatus: text("verification_status").notNull().default("draft"),

  firstSeenAt: text("first_seen_at").default(sql`now()::text`),
  publishedAt: text("published_at"),
  lastVerifiedAt: text("last_verified_at"),

  ...timestamps,
});

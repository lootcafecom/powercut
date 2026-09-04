import { and, eq, desc, gte } from "drizzle-orm";
import { db } from "./index";
import {
  cities,
  states,
  localities,
  electricityProviders,
  powerOutages,
  sourceDocuments,
  userReports,
} from "./schema";

export async function getCityBySlug(stateSlug: string, citySlug: string) {
  const rows = await db
    .select({ city: cities, state: states })
    .from(cities)
    .innerJoin(states, eq(cities.stateId, states.id))
    .where(and(eq(states.slug, stateSlug), eq(cities.slug, citySlug)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getOutagesForCity(cityId: number) {
  return db
    .select({
      outage: powerOutages,
      locality: localities,
      provider: electricityProviders,
    })
    .from(powerOutages)
    .leftJoin(localities, eq(powerOutages.localityId, localities.id))
    .innerJoin(
      electricityProviders,
      eq(powerOutages.providerId, electricityProviders.id)
    )
    .where(
      and(
        eq(powerOutages.cityId, cityId),
        // Only show verified/published entries publicly.
        eq(powerOutages.verificationStatus, "published")
      )
    )
    .orderBy(powerOutages.startTime);
}

export async function getAllOutagesForAdmin() {
  return db
    .select({
      outage: powerOutages,
      city: cities,
      locality: localities,
      provider: electricityProviders,
    })
    .from(powerOutages)
    .innerJoin(cities, eq(powerOutages.cityId, cities.id))
    .leftJoin(localities, eq(powerOutages.localityId, localities.id))
    .innerJoin(
      electricityProviders,
      eq(powerOutages.providerId, electricityProviders.id)
    )
    .orderBy(desc(powerOutages.updatedAt));
}

export async function getOutageById(id: number) {
  const rows = await db
    .select()
    .from(powerOutages)
    .where(eq(powerOutages.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getRecentSourceDocuments(limit = 20) {
  return db
    .select()
    .from(sourceDocuments)
    .orderBy(desc(sourceDocuments.fetchedAt))
    .limit(limit);
}

export async function getPendingReviewCount() {
  const rows = await db
    .select({ id: powerOutages.id })
    .from(powerOutages)
    .where(eq(powerOutages.verificationStatus, "pending_review"));
  return rows.length;
}

export async function getActiveReportSummaries(cityId: number, windowHours: number) {
  const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
  const rows = await db
    .select({
      localityId: userReports.localityId,
      localityName: localities.name,
      createdAt: userReports.createdAt,
    })
    .from(userReports)
    .innerJoin(localities, eq(userReports.localityId, localities.id))
    .where(and(eq(userReports.cityId, cityId), gte(userReports.createdAt, cutoff)));

  const byLocality = new Map<
    number,
    { localityId: number; localityName: string; count: number; latestAt: string }
  >();
  for (const row of rows) {
    const existing = byLocality.get(row.localityId);
    if (existing) {
      existing.count++;
      if (row.createdAt > existing.latestAt) existing.latestAt = row.createdAt;
    } else {
      byLocality.set(row.localityId, {
        localityId: row.localityId,
        localityName: row.localityName,
        count: 1,
        latestAt: row.createdAt,
      });
    }
  }
  return Array.from(byLocality.values()).sort((a, b) => b.count - a.count);
}

export async function getRecentUserReports(limit = 50) {
  return db
    .select({
      id: userReports.id,
      localityName: localities.name,
      description: userReports.description,
      createdAt: userReports.createdAt,
    })
    .from(userReports)
    .innerJoin(localities, eq(userReports.localityId, localities.id))
    .orderBy(desc(userReports.createdAt))
    .limit(limit);
}

export async function getHomepageStats() {
  const [publishedRows, localityRows, cityRows] = await Promise.all([
    db
      .select({
        id: powerOutages.id,
        scheduledDate: powerOutages.scheduledDate,
        startTime: powerOutages.startTime,
        endTime: powerOutages.endTime,
        verificationStatus: powerOutages.verificationStatus,
      })
      .from(powerOutages)
      .where(eq(powerOutages.verificationStatus, "published")),
    db.select({ id: localities.id }).from(localities),
    db.select({ id: cities.id }).from(cities),
  ]);

  const now = Date.now();
  const todayCount = publishedRows.filter((r) => {
    const start = new Date(r.startTime);
    const today = new Date();
    return (
      start.getUTCFullYear() === today.getUTCFullYear() &&
      start.getUTCMonth() === today.getUTCMonth() &&
      start.getUTCDate() === today.getUTCDate()
    );
  }).length;

  const ongoingCount = publishedRows.filter((r) => {
    const start = new Date(r.startTime).getTime();
    const end = new Date(r.endTime).getTime();
    return now >= start && now < end;
  }).length;

  return {
    totalPublished: publishedRows.length,
    todayCount,
    ongoingCount,
    localitiesCovered: localityRows.length,
    citiesCovered: cityRows.length,
  };
}

export async function getLocalityByPincode(pincode: string) {
  const rows = await db
    .select({
      locality: localities,
      city: cities,
      state: states,
    })
    .from(localities)
    .innerJoin(cities, eq(localities.cityId, cities.id))
    .innerJoin(states, eq(cities.stateId, states.id))
    .where(eq(localities.postalCode, pincode))
    .limit(1);
  return rows[0] ?? null;
}

export async function getCityDirectory() {
  const rows = await db
    .select({
      cityId: cities.id,
      cityName: cities.name,
      citySlug: cities.slug,
      stateSlug: states.slug,
      stateName: states.name,
    })
    .from(cities)
    .innerJoin(states, eq(cities.stateId, states.id));

  const outageCounts = await db
    .select({ cityId: powerOutages.cityId })
    .from(powerOutages)
    .where(eq(powerOutages.verificationStatus, "published"));
  const citiesWithData = new Set(outageCounts.map((r) => r.cityId));

  return rows.map((r) => ({ ...r, isLive: citiesWithData.has(r.cityId) }));
}

export async function getAllStates() {
  return db.select().from(states);
}
export async function getAllProviders() {
  return db.select().from(electricityProviders);
}
export async function getAllCities() {
  return db.select().from(cities);
}
export async function getAllLocalities() {
  return db.select().from(localities);
}

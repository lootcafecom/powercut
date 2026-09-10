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

export async function getLocalityBySlug(cityId: number, localitySlug: string) {
  const rows = await db
    .select()
    .from(localities)
    .where(and(eq(localities.cityId, cityId), eq(localities.slug, localitySlug)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Real historical outage stats for one locality, split into 24h/7d/30d
 * windows. Returns actual counts from the database — on a fresh
 * install these will be small/sparse since there's no accumulated
 * history yet, which is expected, not a bug.
 */
export async function getOutageHistoryForLocality(localityId: number) {
  const now = Date.now();
  const windows = {
    last24h: new Date(now - 24 * 60 * 60 * 1000),
    last7d: new Date(now - 7 * 24 * 60 * 60 * 1000),
    last30d: new Date(now - 30 * 24 * 60 * 60 * 1000),
  };

  const rows = await db
    .select({ outage: powerOutages })
    .from(powerOutages)
    .where(
      and(
        eq(powerOutages.localityId, localityId),
        eq(powerOutages.verificationStatus, "published"),
        gte(powerOutages.startTime, windows.last30d.toISOString())
      )
    );

  function summarize(since: Date) {
    const inWindow = rows.filter((r) => new Date(r.outage.startTime) >= since);
    const durations = inWindow.map((r) => {
      const end = r.outage.actualEndTime ?? r.outage.endTime;
      return (new Date(end).getTime() - new Date(r.outage.startTime).getTime()) / 60000;
    });
    const avgMinutes = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    return { count: inWindow.length, avgMinutes: Math.round(avgMinutes) };
  }

  // Daily bucket counts for the last 30 days, oldest first — feeds the chart.
  const dailyBuckets: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const dayStart = new Date(now - i * 24 * 60 * 60 * 1000);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const count = rows.filter((r) => {
      const t = new Date(r.outage.startTime).getTime();
      return t >= dayStart.getTime() && t < dayEnd.getTime();
    }).length;
    dailyBuckets.push({ date: dayStart.toISOString().slice(0, 10), count });
  }

  return {
    last24h: summarize(windows.last24h),
    last7d: summarize(windows.last7d),
    last30d: summarize(windows.last30d),
    dailyBuckets,
  };
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

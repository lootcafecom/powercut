import { and, eq, desc } from "drizzle-orm";
import { db } from "./index";
import {
  cities,
  states,
  localities,
  electricityProviders,
  powerOutages,
  sourceDocuments,
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

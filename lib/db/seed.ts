import { db } from "./index";
import {
  states,
  cities,
  localities,
  electricityProviders,
  powerOutages,
} from "./schema";

// IST is UTC+5:30. We store times as ISO UTC strings; this helper builds
// a UTC ISO string for a given IST wall-clock time on a given date offset
// from today, so the seed data always looks "live" relative to whenever
// this script is run.
function istToUtcIso(daysFromToday: number, hourIst: number, minuteIst: number) {
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
  // Subtract 5h30m to convert an IST wall-clock time into the equivalent UTC instant.
  target.setUTCMinutes(target.getUTCMinutes() - (5 * 60 + 30));
  return target.toISOString();
}

function dateOffset(daysFromToday: number) {
  const now = new Date();
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysFromToday)
  );
  return d.toISOString().slice(0, 10);
}

async function main() {
  console.log("Seeding database...");

  const [karnataka] = await db
    .insert(states)
    .values({ name: "Karnataka", code: "KA", slug: "karnataka" })
    .returning();

  const [bescom] = await db
    .insert(electricityProviders)
    .values({
      name: "Bangalore Electricity Supply Company",
      shortName: "BESCOM",
      slug: "bescom",
      website: "https://bescom.karnataka.gov.in",
      officialSourceUrl: "https://bescom.karnataka.gov.in/scheduled-outages",
      customerCarePhone: "1912",
      description: "Electricity distribution utility serving Bengaluru and surrounding districts.",
    })
    .returning();

  const [bengaluru] = await db
    .insert(cities)
    .values({
      stateId: karnataka.id,
      name: "Bengaluru",
      slug: "bengaluru",
      latitude: 12.9716,
      longitude: 77.5946,
    })
    .returning();

  const localityNames = [
    "Whitefield",
    "Electronic City",
    "Indiranagar",
    "Koramangala",
    "Jayanagar",
    "Yelahanka",
  ];

  const insertedLocalities = [];
  for (const name of localityNames) {
    const [loc] = await db
      .insert(localities)
      .values({
        cityId: bengaluru.id,
        name,
        slug: name.toLowerCase().replace(/\s+/g, "-"),
      })
      .returning();
    insertedLocalities.push(loc);
  }
  const [whitefield, electronicCity, indiranagar, koramangala, jayanagar, yelahanka] =
    insertedLocalities;

  const now = new Date();
  const nowMs = now.getTime();

  // A spread of outages designed to exercise every status branch:
  // ongoing, starting soon, scheduled later today, scheduled tomorrow,
  // window ended (no restoration info), and one explicitly restored.
  await db.insert(powerOutages).values([
    {
      stateId: karnataka.id,
      providerId: bescom.id,
      cityId: bengaluru.id,
      localityId: whitefield.id,
      title: "Scheduled maintenance outage - Whitefield feeder",
      description:
        "Planned shutdown for transformer maintenance on the Whitefield 11kV feeder.",
      outageType: "maintenance",
      reason: "Transformer maintenance work",
      scheduledDate: dateOffset(0),
      startTime: new Date(nowMs - 30 * 60 * 1000).toISOString(), // started 30 min ago
      endTime: new Date(nowMs + 90 * 60 * 1000).toISOString(), // ends in 90 min
      sourceType: "official_website",
      sourceUrl: "https://bescom.karnataka.gov.in/scheduled-outages",
      confidenceScore: 95,
      verificationStatus: "published",
      firstSeenAt: new Date(nowMs - 2 * 60 * 60 * 1000).toISOString(),
      publishedAt: new Date(nowMs - 2 * 60 * 60 * 1000).toISOString(),
      lastVerifiedAt: new Date(nowMs - 15 * 60 * 1000).toISOString(),
    },
    {
      stateId: karnataka.id,
      providerId: bescom.id,
      cityId: bengaluru.id,
      localityId: electronicCity.id,
      title: "Scheduled outage - Electronic City Phase 1",
      description: "Planned outage for cable upgrade work in Phase 1 industrial area.",
      outageType: "scheduled",
      reason: "Cable upgrade work",
      scheduledDate: dateOffset(0),
      startTime: new Date(nowMs + 15 * 60 * 1000).toISOString(), // starts in 15 min
      endTime: new Date(nowMs + 4 * 60 * 60 * 1000).toISOString(),
      sourceType: "official_pdf",
      sourceUrl: "https://bescom.karnataka.gov.in/notices/ec-phase1.pdf",
      confidenceScore: 92,
      verificationStatus: "published",
      firstSeenAt: new Date(nowMs - 5 * 60 * 60 * 1000).toISOString(),
      publishedAt: new Date(nowMs - 5 * 60 * 60 * 1000).toISOString(),
      lastVerifiedAt: new Date(nowMs - 45 * 60 * 1000).toISOString(),
    },
    {
      stateId: karnataka.id,
      providerId: bescom.id,
      cityId: bengaluru.id,
      localityId: indiranagar.id,
      title: "Scheduled outage - Indiranagar 100ft Road",
      description: "Planned maintenance later today along 100ft Road commercial stretch.",
      outageType: "maintenance",
      reason: "Substation maintenance",
      scheduledDate: dateOffset(0),
      startTime: istToUtcIso(0, 20, 0),
      endTime: istToUtcIso(0, 22, 0),
      sourceType: "official_website",
      sourceUrl: "https://bescom.karnataka.gov.in/scheduled-outages",
      confidenceScore: 90,
      verificationStatus: "published",
      firstSeenAt: new Date(nowMs - 6 * 60 * 60 * 1000).toISOString(),
      publishedAt: new Date(nowMs - 6 * 60 * 60 * 1000).toISOString(),
      lastVerifiedAt: new Date(nowMs - 60 * 60 * 1000).toISOString(),
    },
    {
      stateId: karnataka.id,
      providerId: bescom.id,
      cityId: bengaluru.id,
      localityId: koramangala.id,
      title: "Scheduled outage - Koramangala 5th Block",
      description: "Planned outage tomorrow for line clearance work.",
      outageType: "scheduled",
      reason: "Line clearance work",
      scheduledDate: dateOffset(1),
      startTime: istToUtcIso(1, 10, 0),
      endTime: istToUtcIso(1, 13, 30),
      sourceType: "official_website",
      sourceUrl: "https://bescom.karnataka.gov.in/scheduled-outages",
      confidenceScore: 93,
      verificationStatus: "published",
      firstSeenAt: new Date(nowMs - 3 * 60 * 60 * 1000).toISOString(),
      publishedAt: new Date(nowMs - 3 * 60 * 60 * 1000).toISOString(),
      lastVerifiedAt: new Date(nowMs - 30 * 60 * 1000).toISOString(),
    },
    {
      stateId: karnataka.id,
      providerId: bescom.id,
      cityId: bengaluru.id,
      localityId: jayanagar.id,
      title: "Scheduled outage - Jayanagar 4th Block",
      description: "Window has passed; we have not yet received confirmed restoration data.",
      outageType: "maintenance",
      reason: "Transformer replacement",
      scheduledDate: dateOffset(0),
      startTime: new Date(nowMs - 5 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(nowMs - 2 * 60 * 60 * 1000).toISOString(),
      sourceType: "official_website",
      sourceUrl: "https://bescom.karnataka.gov.in/scheduled-outages",
      confidenceScore: 88,
      verificationStatus: "published",
      firstSeenAt: new Date(nowMs - 8 * 60 * 60 * 1000).toISOString(),
      publishedAt: new Date(nowMs - 8 * 60 * 60 * 1000).toISOString(),
      lastVerifiedAt: new Date(nowMs - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      stateId: karnataka.id,
      providerId: bescom.id,
      cityId: bengaluru.id,
      localityId: yelahanka.id,
      title: "Scheduled outage - Yelahanka New Town",
      description: "Morning maintenance outage, confirmed restored by field crew.",
      outageType: "maintenance",
      reason: "Feeder maintenance",
      scheduledDate: dateOffset(0),
      startTime: new Date(nowMs - 7 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(nowMs - 5 * 60 * 60 * 1000).toISOString(),
      actualStartTime: new Date(nowMs - 7 * 60 * 60 * 1000).toISOString(),
      actualEndTime: new Date(nowMs - 5.5 * 60 * 60 * 1000).toISOString(),
      sourceType: "official_website",
      sourceUrl: "https://bescom.karnataka.gov.in/scheduled-outages",
      confidenceScore: 97,
      verificationStatus: "published",
      firstSeenAt: new Date(nowMs - 9 * 60 * 60 * 1000).toISOString(),
      publishedAt: new Date(nowMs - 9 * 60 * 60 * 1000).toISOString(),
      lastVerifiedAt: new Date(nowMs - 5 * 60 * 60 * 1000).toISOString(),
    },
    {
      // A pending-review item — should NOT show on the public site.
      stateId: karnataka.id,
      providerId: bescom.id,
      cityId: bengaluru.id,
      localityId: whitefield.id,
      title: "Unconfirmed outage report - Whitefield ITPL Road",
      description: "AI-extracted from a secondary news source, awaiting admin verification.",
      outageType: "unknown",
      reason: "Unconfirmed",
      scheduledDate: dateOffset(1),
      startTime: istToUtcIso(1, 15, 0),
      endTime: istToUtcIso(1, 17, 0),
      sourceType: "trusted_secondary_source",
      sourceUrl: "https://example-news.local/bengaluru-power",
      confidenceScore: 62,
      verificationStatus: "pending_review",
      firstSeenAt: new Date(nowMs - 60 * 60 * 1000).toISOString(),
    },
  ]);

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));

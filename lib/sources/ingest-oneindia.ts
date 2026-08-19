import { and, eq, desc, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { fetchOneIndiaPageText, ONEINDIA_SOURCE_URL } from "./oneindia-fetch";
import { extractOneIndiaCandidates } from "./oneindia-extractor";
import { matchLocality } from "./locality-match";

export const SOURCE_NAME = "oneindia_bengaluru";
export const SOURCE_DISPLAY_NAME = "OneIndia Bengaluru";

// Secondary/aggregator source, not BESCOM directly. Auto-published per
// admin decision, but kept visibly lower confidence than an official
// source, and every public-facing card labels this as "Unverified" —
// see components/outage/outage-card.tsx + lib/sources/source-meta.ts.
const BASE_CONFIDENCE_SCORE = 40;
// Bumped when a second, distinct source corroborates an existing record
// instead of creating a duplicate — still capped below what an official
// source would get.
const CORROBORATION_BONUS = 15;
const MAX_SECONDARY_CONFIDENCE = 85;

// Two candidates are treated as the same real-world outage if they're in
// the same city+locality+date and their time windows overlap at all, or
// their start times are within this many minutes of each other. Different
// sources rarely report identical minute-for-minute timings for the same
// event, so exact-match dedup alone would let obvious duplicates through.
const FUZZY_START_TOLERANCE_MINUTES = 60;

export interface IngestSummary {
  fetched: boolean;
  contentChanged: boolean;
  candidatesFound: number;
  recordsCreated: number;
  recordsSkippedDuplicate: number;
  recordsCorroborated: number;
  recordsUnmatchedLocality: number;
  error?: string;
}

function timesOverlapOrClose(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  const aS = new Date(aStart).getTime();
  const aE = new Date(aEnd).getTime();
  const bS = new Date(bStart).getTime();
  const bE = new Date(bEnd).getTime();

  const overlaps = aS < bE && bS < aE;
  if (overlaps) return true;

  const startDiffMinutes = Math.abs(aS - bS) / 60000;
  return startDiffMinutes <= FUZZY_START_TOLERANCE_MINUTES;
}

export async function ingestOneIndia(): Promise<IngestSummary> {
  let pageText: string;
  let hash: string;
  try {
    const result = await fetchOneIndiaPageText();
    pageText = result.text;
    hash = result.hash;
  } catch (err) {
    return {
      fetched: false,
      contentChanged: false,
      candidatesFound: 0,
      recordsCreated: 0,
      recordsSkippedDuplicate: 0,
      recordsCorroborated: 0,
      recordsUnmatchedLocality: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const lastDoc = await db
    .select({ contentHash: schema.sourceDocuments.contentHash })
    .from(schema.sourceDocuments)
    .where(eq(schema.sourceDocuments.sourceName, SOURCE_NAME))
    .orderBy(desc(schema.sourceDocuments.fetchedAt))
    .limit(1);
  const mostRecentHash = lastDoc[0]?.contentHash ?? null;
  const contentChanged = mostRecentHash !== hash;

  const [sourceDoc] = await db
    .insert(schema.sourceDocuments)
    .values({
      sourceName: SOURCE_NAME,
      url: ONEINDIA_SOURCE_URL,
      contentHash: hash,
      rawText: pageText,
      processingStatus: "pending",
    })
    .returning();

  const candidates = extractOneIndiaCandidates(pageText);

  const [bengaluru] = await db
    .select({ id: schema.cities.id, stateId: schema.cities.stateId })
    .from(schema.cities)
    .where(eq(schema.cities.slug, "bengaluru"))
    .limit(1);

  const bescom = await db
    .select({ id: schema.electricityProviders.id })
    .from(schema.electricityProviders)
    .where(eq(schema.electricityProviders.slug, "bescom"))
    .limit(1);

  let recordsCreated = 0;
  let recordsSkippedDuplicate = 0;
  let recordsCorroborated = 0;
  let recordsUnmatchedLocality = 0;

  if (bengaluru && bescom[0]) {
    for (const candidate of candidates) {
      for (const rawArea of candidate.areaNamesRaw) {
        const localityId = await matchLocality(bengaluru.id, rawArea);
        if (!localityId) recordsUnmatchedLocality++;

        // Look for any existing outage the same day, same locality (or same
        // unmapped-city-wide bucket), whose window overlaps or starts close
        // in time — a fuzzy match, not just an exact timestamp match.
        const sameDayCandidates = await db
          .select({
            id: schema.powerOutages.id,
            startTime: schema.powerOutages.startTime,
            endTime: schema.powerOutages.endTime,
            sourceUrl: schema.powerOutages.sourceUrl,
            confidenceScore: schema.powerOutages.confidenceScore,
            description: schema.powerOutages.description,
          })
          .from(schema.powerOutages)
          .where(
            and(
              eq(schema.powerOutages.cityId, bengaluru.id),
              localityId
                ? eq(schema.powerOutages.localityId, localityId)
                : isNull(schema.powerOutages.localityId),
              eq(schema.powerOutages.scheduledDate, candidate.scheduledDate)
            )
          );

        const match = sameDayCandidates.find((existing) =>
          timesOverlapOrClose(
            existing.startTime,
            existing.endTime,
            candidate.startTime,
            candidate.endTime
          )
        );

        if (match) {
          recordsSkippedDuplicate++;
          // Corroboration: a genuinely different source confirming the
          // same event is a real trust signal — reflect that instead of
          // just silently dropping the duplicate.
          if (match.sourceUrl && match.sourceUrl !== ONEINDIA_SOURCE_URL) {
            const bumped = Math.min(
              (match.confidenceScore ?? BASE_CONFIDENCE_SCORE) + CORROBORATION_BONUS,
              MAX_SECONDARY_CONFIDENCE
            );
            await db
              .update(schema.powerOutages)
              .set({
                confidenceScore: bumped,
                lastVerifiedAt: new Date().toISOString(),
              })
              .where(eq(schema.powerOutages.id, match.id));
            recordsCorroborated++;
          }
          continue;
        }

        const localityLabel = localityId ? rawArea : `${rawArea} (area not yet mapped)`;

        await db.insert(schema.powerOutages).values({
          stateId: bengaluru.stateId,
          providerId: bescom[0].id,
          cityId: bengaluru.id,
          localityId: localityId ?? undefined,
          title: `Reported scheduled outage — ${localityLabel}`,
          description:
            `Automatically extracted from a secondary source (not BESCOM directly). ` +
            (localityId
              ? ""
              : `Could not match "${rawArea}" to an existing locality yet — consider mapping it. `) +
            `Cross-check against BESCOM's official notices if in doubt.`,
          outageType: "scheduled",
          reason: "Reported maintenance work (unverified)",
          scheduledDate: candidate.scheduledDate,
          startTime: candidate.startTime,
          endTime: candidate.endTime,
          sourceType: "trusted_secondary_source",
          sourceUrl: ONEINDIA_SOURCE_URL,
          sourceDocument: `source_documents:${sourceDoc.id}`,
          confidenceScore: BASE_CONFIDENCE_SCORE,
          // Auto-published per admin decision — see the "Unverified" badge
          // on the public card, which is the safeguard used instead of a
          // manual review queue for this source.
          verificationStatus: "published",
          firstSeenAt: new Date().toISOString(),
          publishedAt: new Date().toISOString(),
          lastVerifiedAt: new Date().toISOString(),
        });
        recordsCreated++;
      }
    }
  }

  await db
    .update(schema.sourceDocuments)
    .set({
      processingStatus: "processed",
      processedAt: new Date().toISOString(),
      recordsExtracted: recordsCreated,
    })
    .where(eq(schema.sourceDocuments.id, sourceDoc.id));

  return {
    fetched: true,
    contentChanged,
    candidatesFound: candidates.length,
    recordsCreated,
    recordsSkippedDuplicate,
    recordsCorroborated,
    recordsUnmatchedLocality,
  };
}

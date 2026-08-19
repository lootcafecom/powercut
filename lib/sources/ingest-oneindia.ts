import { and, eq, desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { fetchOneIndiaPageText, ONEINDIA_SOURCE_URL } from "./oneindia-fetch";
import { extractOneIndiaCandidates } from "./oneindia-extractor";
import { matchLocality } from "./locality-match";

const SOURCE_NAME = "oneindia_bengaluru";
// Secondary/aggregator source, not BESCOM directly — capped below the
// admin-review threshold in the confidence config so nothing from this
// source can ever auto-publish. See lib/config/confidence.ts.
const CONFIDENCE_SCORE = 40;

export interface IngestSummary {
  fetched: boolean;
  contentChanged: boolean;
  candidatesFound: number;
  recordsCreated: number;
  recordsSkippedDuplicate: number;
  recordsUnmatchedLocality: number;
  error?: string;
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
      recordsUnmatchedLocality: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // Check whether content actually changed since the last fetch — still
  // record the check (for the health/last-checked timeline) but skip
  // reprocessing identical content.
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

  // Bengaluru is the only city wired up in this slice — resolve it once.
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
  let recordsUnmatchedLocality = 0;

  if (bengaluru && bescom[0]) {
    for (const candidate of candidates) {
      for (const rawArea of candidate.areaNamesRaw) {
        const localityId = await matchLocality(bengaluru.id, rawArea);
        if (!localityId) recordsUnmatchedLocality++;

        // Dedupe fingerprint: same city + locality (or unmatched-null) +
        // date + start + end already present from any source/status.
        const existing = await db
          .select({ id: schema.powerOutages.id })
          .from(schema.powerOutages)
          .where(
            and(
              eq(schema.powerOutages.cityId, bengaluru.id),
              localityId
                ? eq(schema.powerOutages.localityId, localityId)
                : undefined,
              eq(schema.powerOutages.scheduledDate, candidate.scheduledDate),
              eq(schema.powerOutages.startTime, candidate.startTime),
              eq(schema.powerOutages.endTime, candidate.endTime)
            )
          )
          .limit(1);

        if (existing[0]) {
          recordsSkippedDuplicate++;
          continue;
        }

        const localityLabel = localityId ? rawArea : `${rawArea} (unmapped)`;

        await db.insert(schema.powerOutages).values({
          stateId: bengaluru.stateId,
          providerId: bescom[0].id,
          cityId: bengaluru.id,
          localityId: localityId ?? undefined,
          title: `Possible scheduled outage — ${localityLabel}`,
          description:
            `Extracted automatically from a secondary aggregator (OneIndia), not from BESCOM directly. ` +
            (localityId
              ? ""
              : `Could not match "${rawArea}" to an existing locality — check whether this needs a new locality created. `) +
            `Verify against BESCOM's official notices before publishing.`,
          outageType: "scheduled",
          reason: "Reported maintenance work (unverified)",
          scheduledDate: candidate.scheduledDate,
          startTime: candidate.startTime,
          endTime: candidate.endTime,
          sourceType: "trusted_secondary_source",
          sourceUrl: ONEINDIA_SOURCE_URL,
          sourceDocument: `source_documents:${sourceDoc.id}`,
          confidenceScore: CONFIDENCE_SCORE,
          verificationStatus: "pending_review",
          firstSeenAt: new Date().toISOString(),
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
    recordsUnmatchedLocality,
  };
}

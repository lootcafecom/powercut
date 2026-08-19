import { eq, and, ilike } from "drizzle-orm";
import { db, schema } from "@/lib/db";

/**
 * Tries to match a raw locality name (as written by an external source)
 * against existing localities for a city. Returns the matched locality id,
 * or null if nothing matches closely enough.
 *
 * Deliberately conservative: this does NOT create new locality rows from
 * unverified source text. An extractor pulling messy prose from a
 * secondary source is exactly the kind of input that could otherwise
 * pollute the geography tables with junk ("BESCOM has scheduled...", stray
 * fragments, etc). Unmatched names are surfaced to the admin instead (see
 * ingest-oneindia.ts), who can create the right locality deliberately.
 */
export async function matchLocality(
  cityId: number,
  rawName: string
): Promise<number | null> {
  const cleaned = rawName.trim();
  if (!cleaned) return null;

  const exact = await db
    .select({ id: schema.localities.id })
    .from(schema.localities)
    .where(
      and(
        eq(schema.localities.cityId, cityId),
        ilike(schema.localities.name, cleaned)
      )
    )
    .limit(1);
  if (exact[0]) return exact[0].id;

  // Loose substring match in either direction — catches cases like
  // "Whitefield" vs "Whitefield Main Road" without being too permissive.
  const candidates = await db
    .select({ id: schema.localities.id, name: schema.localities.name })
    .from(schema.localities)
    .where(eq(schema.localities.cityId, cityId));

  const cleanedLower = cleaned.toLowerCase();
  const partial = candidates.find(
    (c) =>
      c.name.toLowerCase().includes(cleanedLower) ||
      cleanedLower.includes(c.name.toLowerCase())
  );
  return partial?.id ?? null;
}

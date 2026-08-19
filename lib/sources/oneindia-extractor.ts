import {
  parseClockTime,
  parseDateStamp,
  addDays,
  dateStampToIsoDate,
  istWallClockToUtcIso,
  type DateStamp,
} from "./time-parsing";

export interface ExtractedOutageCandidate {
  /** Raw locality names as written in the source text — not yet matched to your DB. */
  areaNamesRaw: string[];
  scheduledDate: string; // YYYY-MM-DD
  startTime: string; // ISO UTC
  endTime: string; // ISO UTC
  /** The exact sentence fragment this was extracted from, kept for admin review — never shown publicly as-is. */
  rawSentence: string;
  /** The date stamp this bullet was posted under, kept for traceability. */
  postedDate: string; // YYYY-MM-DD
}

const TIME = "(\\d{1,2}(?::\\d{2})?\\s*(?:AM|PM|am|pm))";
// Matches "<area text> between/from <TIME> to/-/– <TIME>"
const AREA_TIME_RANGE = new RegExp(
  `([A-Za-z][A-Za-z0-9,'.\\- ]*?)\\s+(?:between|from)\\s+${TIME}\\s*(?:to|-|–)\\s*${TIME}`,
  "g"
);

const DATE_STAMP = /(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})/;

const SECTION_START = /Latest Update on Bengaluru Power Cut Today/i;
const SECTION_END = /Why Power Cuts Happen/i;

const LEADING_FILLER =
  /^.*?\b(?:power cut|shutdown|outages?|disruption)s?\s+(?:is|are|will be)?\s*(?:scheduled)?\s*(?:in|for)\b\s*/i;

function cleanAreaText(raw: string): string {
  // Area clusters chained with "and"/"," after the first one in a bullet
  // don't repeat the "...outages in" lead-in, so only strip it when present.
  let cleaned = raw;
  if (LEADING_FILLER.test(cleaned)) {
    cleaned = cleaned.replace(LEADING_FILLER, "");
  } else {
    // Fallback: if there's a bare " in " anywhere, keep only what follows
    // the LAST occurrence (handles "Note that ... is scheduled in X").
    const idx = cleaned.toLowerCase().lastIndexOf(" in ");
    if (idx !== -1) cleaned = cleaned.slice(idx + 4);
  }
  return cleaned
    .replace(/^(?:that\s+)?(?:a\s+)?/i, "")
    .trim();
}

function splitAreaText(raw: string): string[] {
  return cleanAreaText(raw)
    .replace(/^[\s,]*\b(?:in|and)\b\s*/i, "")
    .split(/,|\band\b/i)
    .map((s) => s.trim())
    .filter(
      (s) =>
        s.length > 1 &&
        !/^(and|in|scheduled|note|that|expect|electricity|power|cut|outage|shutdown)$/i.test(
          s
        )
    );
}

function splitIntoBullets(sectionText: string): string[] {
  // Each bullet in this section ends with a trailing "DD Mon YYYY" date stamp.
  // Split right after each date stamp to get one chunk per bullet.
  const parts = sectionText.split(
    /(?<=\d{1,2}\s+[A-Za-z]{3}\s+\d{4})\s*(?=[A-Z•\-])/
  );
  return parts.map((p) => p.trim()).filter(Boolean);
}

/**
 * Extracts structured outage candidates from the plain-text content of the
 * OneIndia Bengaluru power-cut page. Only looks at the "Latest Update"
 * bullet list, deliberately ignoring the rest of the page (FAQs, tariff
 * tables, helpline numbers) to avoid false-positive time-like matches.
 */
export function extractOneIndiaCandidates(
  pageText: string
): ExtractedOutageCandidate[] {
  const startIdx = pageText.search(SECTION_START);
  const endIdx = pageText.search(SECTION_END);
  if (startIdx === -1) return [];
  const sectionText = pageText.slice(
    startIdx,
    endIdx === -1 ? undefined : endIdx
  );

  const bullets = splitIntoBullets(sectionText);
  const candidates: ExtractedOutageCandidate[] = [];

  for (const bullet of bullets) {
    const dateMatch = bullet.match(DATE_STAMP);
    if (!dateMatch) continue;
    const postedStamp = parseDateStamp(dateMatch[1]);
    if (!postedStamp) continue;

    const isTomorrow = /\btomorrow\b/i.test(bullet);
    const outageStamp: DateStamp = isTomorrow
      ? addDays(postedStamp, 1)
      : postedStamp;

    AREA_TIME_RANGE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = AREA_TIME_RANGE.exec(bullet)) !== null) {
      const [rawSentence, areaTextRaw, startRaw, endRaw] = match;
      const start = parseClockTime(startRaw);
      const end = parseClockTime(endRaw);
      if (!start || !end) continue;

      const areaNamesRaw = splitAreaText(areaTextRaw);
      if (areaNamesRaw.length === 0) continue;

      candidates.push({
        areaNamesRaw,
        scheduledDate: dateStampToIsoDate(outageStamp),
        startTime: istWallClockToUtcIso(
          outageStamp.year,
          outageStamp.month,
          outageStamp.day,
          start.hour,
          start.minute
        ),
        endTime: istWallClockToUtcIso(
          outageStamp.year,
          outageStamp.month,
          outageStamp.day,
          end.hour,
          end.minute
        ),
        rawSentence: rawSentence.trim(),
        postedDate: dateStampToIsoDate(postedStamp),
      });
    }
  }

  return candidates;
}

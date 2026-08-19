export interface SourceMeta {
  displayName: string;
  official: boolean;
}

const KNOWN_SOURCES: Record<string, SourceMeta> = {
  "bescom.karnataka.gov.in": { displayName: "BESCOM (official)", official: true },
  "oneindia.com": { displayName: "OneIndia", official: false },
  "www.oneindia.com": { displayName: "OneIndia", official: false },
  "deccanherald.com": { displayName: "Deccan Herald", official: false },
  "www.deccanherald.com": { displayName: "Deccan Herald", official: false },
};

/**
 * Derives a human-readable source name from a stored source URL, falling
 * back to a generic label from sourceType if the URL isn't recognized.
 */
export function getSourceMeta(
  sourceUrl: string | null | undefined,
  sourceType: string
): SourceMeta {
  if (sourceUrl) {
    try {
      const host = new URL(sourceUrl).hostname;
      if (KNOWN_SOURCES[host]) return KNOWN_SOURCES[host];
    } catch {
      // fall through to sourceType-based fallback
    }
  }

  if (sourceType.startsWith("official")) {
    return { displayName: "Official provider source", official: true };
  }
  if (sourceType === "manual") {
    return { displayName: "Manually entered", official: false };
  }
  if (sourceType === "user_report") {
    return { displayName: "User report", official: false };
  }
  return { displayName: "Secondary source", official: false };
}

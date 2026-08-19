"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { IngestSummary } from "@/lib/sources/ingest-oneindia";

export function FetchNowButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<IngestSummary | null>(null);

  async function handleClick() {
    setPending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/ingest/oneindia", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      setResult(data);
      router.refresh();
    } catch {
      setResult({
        fetched: false,
        contentChanged: false,
        candidatesFound: 0,
        recordsCreated: 0,
        recordsSkippedDuplicate: 0,
        recordsCorroborated: 0,
        recordsUnmatchedLocality: 0,
        error: "Request failed",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={pending}
        className="rounded-md bg-ink px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white hover:bg-ink/90 disabled:opacity-50"
      >
        {pending ? "Fetching…" : "Fetch OneIndia now"}
      </button>

      {result && (
        <div className="mt-3 rounded-md border border-line bg-paper-2 p-3 text-sm">
          {result.error ? (
            <p className="text-alert">Error: {result.error}</p>
          ) : (
            <ul className="space-y-0.5 text-ink">
              <li>Candidates found: {result.candidatesFound}</li>
              <li>New records published: {result.recordsCreated}</li>
              <li>Skipped as duplicates: {result.recordsSkippedDuplicate}</li>
              <li>Corroborated by a second source: {result.recordsCorroborated ?? 0}</li>
              <li>Unmatched localities (need mapping): {result.recordsUnmatchedLocality}</li>
              <li className="text-muted">
                Page content changed since last fetch: {result.contentChanged ? "yes" : "no"}
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

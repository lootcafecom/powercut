import Link from "next/link";
import { getRecentSourceDocuments, getPendingReviewCount } from "@/lib/db/queries";
import { FetchNowButton } from "@/components/admin/fetch-now-button";

export const dynamic = "force-dynamic";

const statusColor: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  processed: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-700",
};

export default async function AdminSourcesPage() {
  const [docs, pendingCount] = await Promise.all([
    getRecentSourceDocuments(20),
    getPendingReviewCount(),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-ink">
        Sources
      </h1>
      <p className="mt-1 text-sm text-muted">
        Automated ingestion from secondary sources. Records publish
        automatically — every card on the public site is labeled
        &ldquo;Unverified&rdquo; when it comes from here rather than an
        official provider source. See{" "}
        <Link href="/admin/outages" className="underline">
          all outages
        </Link>{" "}
        to review or edit anything this creates.
      </p>

      {pendingCount > 0 && (
        <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {pendingCount} outage{pendingCount === 1 ? "" : "s"} still sitting
          in manual pending-review (from before auto-publish was enabled, or
          from the admin form) —{" "}
          <Link href="/admin/outages" className="underline font-medium">
            check the outages list
          </Link>
          .
        </div>
      )}

      <div className="mt-6 rounded-lg border border-line bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          OneIndia Bengaluru
        </h2>
        <p className="mt-1 text-sm text-muted">
          Fetches the daily power-cut page, extracts locality/time
          candidates with a rule-based parser (no AI calls), and creates
          pending-review outage records. For automatic daily runs, point an
          external scheduler (e.g. cron-job.org) at{" "}
          <code className="rounded bg-paper-2 px-1 py-0.5 text-xs">
            POST /api/admin/ingest/oneindia
          </code>{" "}
          with header{" "}
          <code className="rounded bg-paper-2 px-1 py-0.5 text-xs">
            x-ingest-secret: &lt;INGEST_SECRET&gt;
          </code>
          .
        </p>
        <div className="mt-4">
          <FetchNowButton />
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="border-b border-line bg-paper-2 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Fetched at</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Records extracted</th>
              <th className="px-4 py-3">Error</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((doc) => (
              <tr key={doc.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 tabular-nums-mono text-xs">
                  {doc.fetchedAt}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${
                      statusColor[doc.processingStatus] ?? ""
                    }`}
                  >
                    {doc.processingStatus}
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums-mono">
                  {doc.recordsExtracted ?? 0}
                </td>
                <td className="px-4 py-3 text-xs text-alert">
                  {doc.processingError ?? ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {docs.length === 0 && (
          <p className="p-8 text-center text-sm text-muted">
            No fetches yet. Click &ldquo;Fetch OneIndia now&rdquo; above.
          </p>
        )}
      </div>
    </div>
  );
}

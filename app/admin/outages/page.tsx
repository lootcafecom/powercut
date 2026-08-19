import Link from "next/link";
import { getAllOutagesForAdmin } from "@/lib/db/queries";
import { computeOutageStatus, statusLabels, statusColorClasses } from "@/lib/outage-status";
import { getSourceMeta } from "@/lib/sources/source-meta";
import { formatDateTimeIST } from "@/lib/format";
import { deleteOutage, markVerifiedNow } from "@/lib/actions/outage-actions";

export const dynamic = "force-dynamic";

const verificationBadge: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  pending_review: "bg-amber-100 text-amber-800",
  verified: "bg-blue-100 text-blue-800",
  published: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-500",
};

export default async function AdminOutagesPage() {
  const rows = await getAllOutagesForAdmin();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-ink">
            Outages
          </h1>
          <p className="text-sm text-muted">
            {rows.length} total · {rows.filter((r) => r.outage.verificationStatus === "pending_review").length} pending review
          </p>
        </div>
        <Link
          href="/admin/sources"
          className="rounded-md border border-line px-4 py-2 text-sm font-semibold uppercase tracking-wide text-ink hover:bg-paper-2"
        >
          Sources
        </Link>
        <Link
          href="/admin/outages/new"
          className="rounded-md bg-ink px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white hover:bg-ink/90"
        >
          + New outage
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-line bg-paper-2 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Locality</th>
              <th className="px-4 py-3">Window</th>
              <th className="px-4 py-3">Live status</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Verification</th>
              <th className="px-4 py-3">Confidence</th>
              <th className="px-4 py-3">Last verified</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ outage, locality, provider }) => {
              const status = computeOutageStatus(outage);
              const sourceMeta = getSourceMeta(outage.sourceUrl, outage.sourceType);
              return (
                <tr key={outage.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{locality?.name ?? "City-wide"}</p>
                    <p className="text-xs text-muted">{provider.shortName}</p>
                  </td>
                  <td className="px-4 py-3 tabular-nums-mono text-xs">
                    {formatDateTimeIST(outage.startTime)}
                    <br />
                    {formatDateTimeIST(outage.endTime)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-semibold uppercase ${statusColorClasses[status]}`}
                    >
                      {statusLabels[status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className={sourceMeta.official ? "text-emerald-700" : "text-amber-700"}>
                      {sourceMeta.official ? "✓ " : "⚠ "}
                      {sourceMeta.displayName}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${verificationBadge[outage.verificationStatus] ?? ""}`}
                    >
                      {outage.verificationStatus.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums-mono">{outage.confidenceScore}</td>
                  <td className="px-4 py-3 tabular-nums-mono text-xs">
                    {outage.lastVerifiedAt ? formatDateTimeIST(outage.lastVerifiedAt) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3 text-xs font-medium">
                      <form action={markVerifiedNow.bind(null, outage.id)}>
                        <button className="text-signal-ink hover:underline">
                          Mark verified
                        </button>
                      </form>
                      <Link
                        href={`/admin/outages/${outage.id}/edit`}
                        className="text-ink hover:underline"
                      >
                        Edit
                      </Link>
                      <form action={deleteOutage.bind(null, outage.id)}>
                        <button className="text-alert hover:underline">Delete</button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="p-8 text-center text-sm text-muted">
            No outages yet.{" "}
            <Link href="/admin/outages/new" className="text-signal-ink underline">
              Create the first one
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}

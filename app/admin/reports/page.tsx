import { getRecentUserReports } from "@/lib/db/queries";
import { formatDateTimeIST } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const reports = await getRecentUserReports(100);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-ink">
        Community Reports
      </h1>
      <p className="mt-1 text-sm text-muted">
        Raw, unverified user submissions. Aggregated tiers show publicly on
        the city page; this is the individual log behind them.
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="border-b border-line bg-paper-2 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Locality</th>
              <th className="px-4 py-3">Note</th>
              <th className="px-4 py-3">Reported at</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{r.localityName}</td>
                <td className="px-4 py-3 text-muted">{r.description || "—"}</td>
                <td className="px-4 py-3 tabular-nums-mono text-xs">
                  {formatDateTimeIST(r.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {reports.length === 0 && (
          <p className="p-8 text-center text-sm text-muted">No reports yet.</p>
        )}
      </div>
    </div>
  );
}

import { getReportTier, REPORT_ACTIVE_WINDOW_HOURS } from "@/lib/reports/tiers";
import { formatDateTimeIST } from "@/lib/format";

interface ReportSummary {
  localityId: number;
  localityName: string;
  count: number;
  latestAt: string;
}

export function CommunityReportsPanel({ summaries }: { summaries: ReportSummary[] }) {
  if (summaries.length === 0) return null;

  return (
    <div className="glow-red rounded-xl border-2 border-dashed border-red/30 bg-red/5 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-red">
        🔴 Community-reported — unverified, not from any source
      </p>
      <p className="mt-1 text-xs text-text-muted">
        These are raw user reports, not sourced or confirmed outages. They
        surface possible unscheduled outages that haven&rsquo;t been
        officially announced anywhere yet. Reports older than{" "}
        {REPORT_ACTIVE_WINDOW_HOURS} hours stop counting.
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {summaries.map((s) => {
          const tier = getReportTier(s.count);
          if (!tier) return null;
          return (
            <div
              key={s.localityId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-red/25 bg-bg-panel px-3 py-2 text-sm text-white"
            >
              <div>
                <span className="font-semibold">{s.localityName}</span>
                <span className="ml-2 text-red">{tier.label}</span>
              </div>
              <div className="text-xs tabular-nums-mono text-text-muted">
                {s.count} report{s.count === 1 ? "" : "s"} · last{" "}
                {formatDateTimeIST(s.latestAt)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

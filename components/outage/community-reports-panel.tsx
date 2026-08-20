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
    <div className="rounded-lg border-2 border-dashed border-alert/30 bg-alert/5 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-alert">
        🔴 Community-reported — unverified, not from any source
      </p>
      <p className="mt-1 text-xs text-muted">
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
              className={`flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm ${tier.colorClasses}`}
            >
              <div>
                <span className="font-semibold">{s.localityName}</span>
                <span className="ml-2">{tier.label}</span>
              </div>
              <div className="text-xs tabular-nums-mono opacity-80">
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

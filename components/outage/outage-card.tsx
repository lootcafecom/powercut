import {
  computeOutageStatus,
  statusLabels,
  statusDescriptions,
  statusColorClasses,
  type OutageStatus,
} from "@/lib/outage-status";
import { formatTimeIST, formatDateTimeIST, durationMinutes } from "@/lib/format";
import { preparationTips } from "@/lib/preparation";
import { getSourceMeta } from "@/lib/sources/source-meta";

const statusBarClasses: Record<OutageStatus, string> = {
  cancelled: "bg-slate-300",
  scheduled: "bg-signal",
  starting_soon: "bg-signal",
  ongoing: "bg-alert",
  scheduled_window_ended: "bg-slate-400",
  restored: "bg-ok",
  unknown: "bg-slate-300",
};

export interface OutageCardData {
  id: number;
  title: string;
  reason: string | null;
  localityName: string | null;
  providerShortName: string;
  startTime: string;
  endTime: string;
  actualEndTime: string | null;
  sourceType: string;
  sourceUrl: string | null;
  lastVerifiedAt: string | null;
  verificationStatus: string;
  confidenceScore: number;
}

export function OutageCard({ outage }: { outage: OutageCardData }) {
  const status = computeOutageStatus(outage);
  const mins = durationMinutes(outage.startTime, outage.endTime);
  const tips = status === "scheduled" || status === "starting_soon" ? preparationTips(mins) : [];
  const sourceMeta = getSourceMeta(outage.sourceUrl, outage.sourceType);

  return (
    <article className="flex overflow-hidden rounded-lg border border-line bg-white shadow-sm">
      <div className={`w-1.5 shrink-0 ${statusBarClasses[status]}`} aria-hidden />
      <div className="flex-1 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="font-display text-lg font-bold uppercase tracking-wide text-ink">
              {outage.localityName ?? "City-wide"}
            </h3>
            <p className="text-sm text-muted">{outage.title}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${statusColorClasses[status]}`}
            >
              {statusLabels[status]}
            </span>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                sourceMeta.official
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-amber-300 bg-amber-50 text-amber-800"
              }`}
            >
              {sourceMeta.official ? "✓ " : "⚠ "}
              {sourceMeta.official ? sourceMeta.displayName : `Unverified — ${sourceMeta.displayName}`}
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2 tabular-nums-mono text-2xl font-semibold text-ink">
          <span>{formatTimeIST(outage.startTime)}</span>
          <span className="text-muted text-base">–</span>
          <span>{formatTimeIST(outage.endTime)}</span>
        </div>

        <p className="mt-1 text-xs text-muted">{statusDescriptions[status]}</p>

        {outage.actualEndTime && (
          <p className="mt-1 text-xs font-medium text-ok">
            Confirmed restored at {formatTimeIST(outage.actualEndTime)}
          </p>
        )}

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">Reason</dt>
            <dd className="text-ink">{outage.reason ?? "Not specified"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">Provider</dt>
            <dd className="text-ink">{outage.providerShortName}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">Source</dt>
            <dd className="text-ink">{sourceMeta.displayName}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">Last verified</dt>
            <dd className="tabular-nums-mono text-ink">
              {outage.lastVerifiedAt ? formatDateTimeIST(outage.lastVerifiedAt) : "—"}
            </dd>
          </div>
        </dl>

        {tips.length > 0 && (
          <div className="mt-4 rounded-md border border-signal/30 bg-signal/10 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-signal-ink">
              Before it happens
            </p>
            <ul className="mt-1 list-inside list-disc text-sm text-ink/80">
              {tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </div>
        )}

        {outage.sourceUrl && (
          <a
            href={outage.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-xs font-medium text-signal-ink underline underline-offset-2"
          >
            View official source ↗
          </a>
        )}
      </div>
    </article>
  );
}

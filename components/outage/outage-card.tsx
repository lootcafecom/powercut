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
  cancelled: "bg-text-muted/40",
  scheduled: "bg-orange",
  starting_soon: "bg-orange",
  ongoing: "bg-red",
  scheduled_window_ended: "bg-text-muted/40",
  restored: "bg-green",
  unknown: "bg-text-muted/40",
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
    <article className="hover-lift flex overflow-hidden rounded-xl border border-line-soft bg-bg-card">
      <div className={`w-1.5 shrink-0 ${statusBarClasses[status]}`} aria-hidden />
      <div className="flex-1 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-white">
              {outage.localityName ?? "City-wide"}
            </h3>
            <p className="text-sm text-text-muted">{outage.title}</p>
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
                  ? "border-green/30 bg-green/10 text-green"
                  : "border-orange/30 bg-orange/10 text-orange"
              }`}
            >
              {sourceMeta.official ? "✓ " : "⚠ "}
              {sourceMeta.official ? sourceMeta.displayName : `Unverified — ${sourceMeta.displayName}`}
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2 tabular-nums-mono text-2xl font-bold text-white">
          <span>{formatTimeIST(outage.startTime)}</span>
          <span className="text-base text-text-muted">–</span>
          <span>{formatTimeIST(outage.endTime)}</span>
        </div>

        <p className="mt-1 text-xs text-text-muted">{statusDescriptions[status]}</p>

        {outage.actualEndTime && (
          <p className="mt-1 text-xs font-medium text-green">
            Confirmed restored at {formatTimeIST(outage.actualEndTime)}
          </p>
        )}

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs uppercase tracking-wide text-text-muted">Reason</dt>
            <dd className="text-white">{outage.reason ?? "Not specified"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-text-muted">Provider</dt>
            <dd className="text-white">{outage.providerShortName}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-text-muted">Source</dt>
            <dd className="text-white">{sourceMeta.displayName}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-text-muted">Last verified</dt>
            <dd className="tabular-nums-mono text-white">
              {outage.lastVerifiedAt ? formatDateTimeIST(outage.lastVerifiedAt) : "—"}
            </dd>
          </div>
        </dl>

        {tips.length > 0 && (
          <div className="mt-4 rounded-md border border-yellow/25 bg-yellow/10 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-yellow">
              Before it happens
            </p>
            <ul className="mt-1 list-inside list-disc text-sm text-white/80">
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
            className="mt-3 inline-block text-xs font-medium text-blue-2 underline underline-offset-2 hover:text-cyan"
          >
            View official source ↗
          </a>
        )}
      </div>
    </article>
  );
}

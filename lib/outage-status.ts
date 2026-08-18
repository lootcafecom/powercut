/**
 * Outage status engine.
 *
 * Computes a live, human-facing status for an outage from its scheduled
 * (and, if known, actual) times. This is deliberately NOT stored in the
 * database — it's derived at read time so it's always correct relative to
 * "now", and so changing the rules never requires a backfill.
 *
 * Rule from the spec that matters most: passing the scheduled end time
 * does NOT mean we say "restored". We only ever claim restoration when
 * actualEndTime (reliable, sourced information) is present.
 */

export type OutageStatus =
  | "cancelled"
  | "scheduled"
  | "starting_soon"
  | "ongoing"
  | "scheduled_window_ended"
  | "restored"
  | "unknown";

export interface StatusInput {
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  verificationStatus: string;
}

const STARTING_SOON_WINDOW_MINUTES = 30;

export function computeOutageStatus(
  outage: StatusInput,
  now: Date = new Date()
): OutageStatus {
  if (outage.verificationStatus === "cancelled") return "cancelled";
  if (outage.verificationStatus === "rejected") return "unknown";

  const start = new Date(outage.startTime);
  const end = new Date(outage.endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "unknown";
  }

  // Reliable restoration info takes precedence over anything derived.
  if (outage.actualEndTime) return "restored";

  const nowMs = now.getTime();
  const startMs = start.getTime();
  const endMs = end.getTime();
  const startingSoonMs = STARTING_SOON_WINDOW_MINUTES * 60 * 1000;

  if (nowMs < startMs - startingSoonMs) return "scheduled";
  if (nowMs >= startMs - startingSoonMs && nowMs < startMs)
    return "starting_soon";
  if (nowMs >= startMs && nowMs < endMs) return "ongoing";
  if (nowMs >= endMs) return "scheduled_window_ended";

  return "unknown";
}

export const statusLabels: Record<OutageStatus, string> = {
  cancelled: "Cancelled",
  scheduled: "Scheduled",
  starting_soon: "Starting Soon",
  ongoing: "Ongoing",
  scheduled_window_ended: "Scheduled Window Ended",
  restored: "Power Restored",
  unknown: "Status Unknown",
};

export const statusDescriptions: Record<OutageStatus, string> = {
  cancelled: "This scheduled outage was cancelled.",
  scheduled: "This outage has not started yet.",
  starting_soon: "This outage is expected to begin shortly.",
  ongoing: "Current time falls within the scheduled outage window.",
  scheduled_window_ended:
    "The scheduled window has passed. We do not have confirmed restoration information yet.",
  restored: "Power has been confirmed restored.",
  unknown: "We don't have enough reliable information to determine status.",
};

/** Tailwind color tokens per status, used by badges/cards. */
export const statusColorClasses: Record<OutageStatus, string> = {
  cancelled: "bg-slate-100 text-slate-500 border-slate-200",
  scheduled: "bg-amber-50 text-amber-800 border-amber-200",
  starting_soon: "bg-amber-100 text-amber-900 border-amber-300",
  ongoing: "bg-rose-50 text-rose-700 border-rose-200",
  scheduled_window_ended: "bg-slate-100 text-slate-600 border-slate-300",
  restored: "bg-emerald-50 text-emerald-700 border-emerald-200",
  unknown: "bg-slate-50 text-slate-500 border-slate-200",
};

export interface ReportTier {
  label: string;
  colorClasses: string;
}

/** How far back a report still counts toward the current active signal. */
export const REPORT_ACTIVE_WINDOW_HOURS = 3;

export function getReportTier(count: number): ReportTier | null {
  if (count <= 0) return null;
  if (count >= 20) {
    return {
      label: "Strong local outage signal",
      colorClasses: "bg-red-100 text-red-800 border-red-300",
    };
  }
  if (count >= 5) {
    return {
      label: "Multiple users reporting outage",
      colorClasses: "bg-orange-100 text-orange-800 border-orange-300",
    };
  }
  return {
    label: "Possible outage reported",
    colorClasses: "bg-amber-50 text-amber-800 border-amber-200",
  };
}

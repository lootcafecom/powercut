export interface ClockTime {
  hour: number;
  minute: number;
}

export interface DateStamp {
  year: number;
  month: number; // 0-indexed, for use with Date.UTC
  day: number;
}

/**
 * Parses a clock time string like "10:30 AM" or "8 AM" into 24-hour parts.
 * Returns null if it doesn't look like a time.
 */
export function parseClockTime(raw: string): ClockTime | null {
  const match = raw.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)$/);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = match[3].toUpperCase();
  if (hour === 12) hour = 0;
  if (meridiem === "PM") hour += 12;
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

/**
 * Converts an IST wall-clock time on a given calendar date into the
 * equivalent UTC ISO instant (IST = UTC+5:30).
 */
export function istWallClockToUtcIso(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
): string {
  const utc = new Date(Date.UTC(year, month, day, hour, minute));
  utc.setUTCMinutes(utc.getUTCMinutes() - (5 * 60 + 30));
  return utc.toISOString();
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Parses a "DD Mon YYYY" date stamp (e.g. "13 Aug 2026").
 */
export function parseDateStamp(raw: string): DateStamp | null {
  const match = raw.trim().match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (!match) return null;
  const day = parseInt(match[1], 10);
  const month = MONTHS[match[2].toLowerCase()];
  const year = parseInt(match[3], 10);
  if (month === undefined) return null;
  return { year, month, day };
}

export function addDays(stamp: DateStamp, delta: number): DateStamp {
  const d = new Date(Date.UTC(stamp.year, stamp.month, stamp.day + delta));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth(), day: d.getUTCDate() };
}

export function dateStampToIsoDate(stamp: DateStamp): string {
  return new Date(Date.UTC(stamp.year, stamp.month, stamp.day)).toISOString().slice(0, 10);
}

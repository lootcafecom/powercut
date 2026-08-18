const IST = "Asia/Kolkata";

export function formatTimeIST(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    timeZone: IST,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDateIST(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    timeZone: IST,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatDateShortIST(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    timeZone: IST,
    day: "numeric",
    month: "short",
  });
}

export function formatDateTimeIST(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: IST,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    day: "numeric",
    month: "short",
  });
}

export function isSameISTDate(iso: string, daysFromToday: number) {
  const target = new Date();
  target.setUTCDate(target.getUTCDate() + daysFromToday);
  const targetStr = target.toLocaleDateString("en-CA", { timeZone: IST }); // YYYY-MM-DD
  const outageStr = new Date(iso).toLocaleDateString("en-CA", { timeZone: IST });
  return targetStr === outageStr;
}

export function durationMinutes(startIso: string, endIso: string) {
  return Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000);
}

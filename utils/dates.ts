// Dates in this app are ISO day strings ("2026-08-03") meaning a day in the
// USER'S timezone, not UTC. `toISOString()` converts to UTC first, so in a
// +offset timezone (Italy is +1/+2) it rolls the date forward late in the
// evening — "today" becomes tomorrow. Every helper here works in local time.
//
// These used to be copy-pasted per screen, which let a fix in one file (the
// calendar) sit next to the bug in four others. Import from here instead.

const DAY_MS = 86400000;

/** A Date → "YYYY-MM-DD" in local time. */
export const toLocalIso = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Today as "YYYY-MM-DD" in local time. Safe to compare against stored dates. */
export const todayIso = (): string => toLocalIso(new Date());

/**
 * Whole days from today to an ISO day string: 0 = today, negative = past.
 * Measured from local midnight, so the answer doesn't drift as the day goes on
 * — "expires in 30 days" reads the same at 09:00 and at 23:00.
 * Returns null when the input is empty or unparseable.
 */
export function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso + "T00:00");
  if (isNaN(d.getTime())) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - start.getTime()) / DAY_MS);
}

/** "1996-04-12" → "12/04/1996", the old Dema DB "Data di nascita" format. */
export function fmtDob(iso?: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

/** Sunday-based start of the week containing `d`. */
export const getWeekStart = (d: Date): Date => {
  const out = new Date(d);
  out.setDate(out.getDate() - out.getDay());
  return out;
};

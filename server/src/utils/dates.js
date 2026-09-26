export const DAY_MS = 86_400_000;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Parse "YYYY-MM-DD" to a Date at UTC midnight, or null if it is not a real calendar date. */
export function parseISODate(value) {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  return date;
}

/** Date -> "YYYY-MM-DD" (dates are stored at UTC midnight, so this never shifts a day). */
export const toISODate = (date) => (date ? new Date(date).toISOString().slice(0, 10) : null);

/**
 * True if the calendar date is not in the future for *someone* on Earth right now.
 * Allows up to UTC+14 so a student reporting "today" just after local midnight is not rejected
 * by a server running in UTC.
 */
export const isNotFutureDate = (date) => date.getTime() <= Date.now() + 14 * 3_600_000;

/** Local-time midnight `daysAgo` days before today. */
export function startOfLocalDay(daysAgo = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

/** Local-time "YYYY-MM-DD" for a Date. */
export function localISODate(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

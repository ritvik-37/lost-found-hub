/** "2026-09-25" -> "25 Sept" (calendar dates are timezone-free, so parse as local midnight). */
export function formatDate(isoDate, opts = { day: 'numeric', month: 'short' }) {
  if (!isoDate) return '';
  const d = new Date(`${String(isoDate).slice(0, 10)}T00:00`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', opts);
}

export const formatLongDate = (isoDate) => formatDate(isoDate, { day: 'numeric', month: 'short', year: 'numeric' });

/** "PENDING" -> "Pending" */
export const titleCase = (s = '') => (s ? s[0] + s.slice(1).toLowerCase() : '');

/** Today's date in the user's timezone as "YYYY-MM-DD" (for <input type="date" max>). */
export function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export const plural = (n, word, pluralWord = `${word}s`) => `${n} ${n === 1 ? word : pluralWord}`;

export const firstName = (name = '') => name.trim().split(/\s+/)[0] || '';

export const initials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

export const cx = (...classes) => classes.filter(Boolean).join(' ');

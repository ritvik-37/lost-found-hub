// Anything that looks like an HTML tag, e.g. <script>, </b>, <img src=x>. Leaves "<3" or "a < b" alone.
const TAG = /<\/?[a-z][^>]*>/gi;
// ASCII control characters except tab (\t) and newline (\n).
const CONTROL = /[\u0000-\u0008\u000B-\u001F\u007F]/g;

/** Strip HTML tags and control characters, collapse runs of spaces, trim. */
export const cleanText = (value) =>
  String(value).replace(TAG, '').replace(CONTROL, '').replace(/[ \t]{2,}/g, ' ').trim();

/** Escape a user string for safe use inside a RegExp (prevents regex injection/ReDoS). */
export const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** "Rahul Mehta" -> "Rahul M." (what other students see for privacy). */
export function shortName(name = '') {
  const [first = '', ...rest] = String(name).trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}

import { z } from 'zod';
import { parseISODate } from '../utils/dates.js';
import { cleanText } from '../utils/text.js';

/** String that is cleaned (HTML tags and control characters stripped, trimmed) before length checks. */
export const text = (requiredMessage) => z.string({ error: requiredMessage }).overwrite(cleanText);

/** "YYYY-MM-DD" that is a real calendar date. */
export const isoDate = (message = 'Use a valid date (YYYY-MM-DD).') =>
  z.string({ error: message }).trim().refine((v) => parseISODate(v) !== null, message);

export const page = z.coerce.number().int().min(1).max(10_000).default(1);
export const limit = (max, fallback) => z.coerce.number().int().min(1).max(max).default(fallback);

/** Zod error -> { field: firstMessage } for the client to show under each input. */
export function toFieldErrors(error) {
  const errors = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join('.') : 'form';
    errors[key] ??= issue.message;
  }
  return errors;
}

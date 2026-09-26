import { Item } from '../models/Item.js';
import { DAY_MS } from '../utils/dates.js';

export const MATCH_THRESHOLD = 45;
export const MAX_MATCHES = 3;

// Filler words that would otherwise inflate the keyword score ("found near the ...").
const STOP_WORDS = new Set(
  'the and with for near from has have had was were this that its his her our your their found lost left one some very into onto about after before there here item just also but not are been who what when where which while than then them they campus'.split(' '),
);

/** Lower-cased words of 3+ letters/digits, minus filler words. */
export function keywords(text) {
  return new Set((String(text).toLowerCase().match(/[a-z0-9]{3,}/g) ?? []).filter((w) => !STOP_WORDS.has(w)));
}

/**
 * Score how likely two opposite-type reports describe the same object (0–100):
 *  +40 same category, +20 same location,
 *  +20 minus 2 per day apart (only within 7 days),
 *  +6 per shared keyword from title + description, capped at +30.
 */
export function scoreMatch(a, b) {
  let score = 0;
  const reasons = [];

  if (a.category === b.category) {
    score += 40;
    reasons.push('Same category');
  }
  if (a.location === b.location) {
    score += 20;
    reasons.push('Same location');
  }
  const days = Math.round(Math.abs(new Date(a.date) - new Date(b.date)) / DAY_MS);
  if (days <= 7) {
    score += 20 - days * 2;
    reasons.push(days === 0 ? 'Same day' : `${days} day${days === 1 ? '' : 's'} apart`);
  }
  const bWords = keywords(`${b.title} ${b.description}`);
  const shared = [...keywords(`${a.title} ${a.description}`)].filter((w) => bWords.has(w));
  if (shared.length) {
    score += Math.min(shared.length * 6, 30);
    reasons.push(`Shared: ${shared.slice(0, 4).join(', ')}`);
  }

  return { score: Math.min(100, Math.round(score)), reasons, sharedKeywords: shared };
}

/**
 * Top matches for an item: VERIFIED reports of the opposite type (LOST <-> FOUND) from other
 * users, scoring at least MATCH_THRESHOLD. Pure scoring logic, no external AI service.
 */
export async function findMatches(item, { threshold = MATCH_THRESHOLD, max = MAX_MATCHES } = {}) {
  const reporterId = item.reportedBy?._id ?? item.reportedBy;
  const candidates = await Item.find({
    _id: { $ne: item._id },
    type: item.type === 'LOST' ? 'FOUND' : 'LOST',
    status: 'VERIFIED',
    reportedBy: { $ne: reporterId },
  })
    .populate('reportedBy', 'name')
    .lean();

  return candidates
    .map((candidate) => ({ item: candidate, ...scoreMatch(item, candidate) }))
    .filter((m) => m.score >= threshold)
    .sort((x, y) => y.score - x.score || new Date(y.item.date) - new Date(x.item.date))
    .slice(0, max);
}

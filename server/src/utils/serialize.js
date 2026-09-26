import { STATUS_FLOW } from '../constants.js';
import { toISODate } from './dates.js';
import { shortName } from './text.js';

const plain = (doc) => (doc && typeof doc.toObject === 'function' ? doc.toObject() : doc);
const idOf = (ref) => (ref && typeof ref === 'object' && ref._id ? ref._id.toString() : ref ? ref.toString() : null);
const isPopulated = (ref) => ref && typeof ref === 'object' && 'name' in ref;

/** Other students see "Rahul M."; admins see the full name and email. */
function person(ref, { admin }) {
  if (!ref) return null;
  if (!isPopulated(ref)) return { id: idOf(ref) };
  return admin ? { id: idOf(ref), name: ref.name, email: ref.email } : { id: idOf(ref), name: shortName(ref.name) };
}

/**
 * Public shape of an item. `hiddenDetails` is only included for admins, or for the reporter
 * (includeHidden) who wrote it; it is also `select: false` in the schema so it is never loaded by accident.
 */
export function serializeItem(doc, { admin = false, includeHidden = false } = {}) {
  const o = plain(doc);
  const out = {
    id: o._id.toString(),
    type: o.type,
    title: o.title,
    description: o.description,
    category: o.category,
    location: o.location,
    exactSpot: o.exactSpot || '',
    date: toISODate(o.date),
    imageUrl: o.imageUrl || '',
    status: o.status,
    reportedBy: person(o.reportedBy, { admin }),
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
  if ((admin || includeHidden) && typeof o.hiddenDetails === 'string') out.hiddenDetails = o.hiddenDetails;
  if (admin || includeHidden) out.statusNote = o.statusNote || '';
  if (admin) out.nextStatuses = STATUS_FLOW[o.status] ?? [];
  return out;
}

export function serializeClaim(doc, { admin = false } = {}) {
  const o = plain(doc);
  return {
    id: o._id.toString(),
    status: o.status,
    message: o.message || '',
    proofAnswer: o.proofAnswer,
    adminRemarks: o.adminRemarks || '',
    createdAt: o.createdAt,
    reviewedAt: o.reviewedAt ?? null,
    item: o.item && typeof o.item === 'object' && 'title' in o.item ? serializeItem(o.item, { admin }) : { id: idOf(o.item) },
    claimant: person(o.claimant, { admin }),
  };
}

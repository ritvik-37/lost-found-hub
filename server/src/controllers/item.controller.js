import { PUBLIC_STATUSES } from '../constants.js';
import { isAdmin } from '../middleware/auth.js';
import { removeUpload, saveUpload } from '../middleware/upload.js';
import { Claim } from '../models/Claim.js';
import { Item } from '../models/Item.js';
import { findMatches } from '../services/matching.js';
import { ApiError } from '../utils/ApiError.js';
import { parseISODate, startOfLocalDay } from '../utils/dates.js';
import { serializeItem } from '../utils/serialize.js';
import { escapeRegex } from '../utils/text.js';

const SORTS = {
  newest: { date: -1, createdAt: -1 },
  oldest: { date: 1, createdAt: 1 },
};

const SEARCH_FIELDS = ['title', 'description', 'location', 'category', 'exactSpot'];

/** Shared by the public and admin listings. Every search word must appear in some field. */
export function buildItemFilter(query) {
  const filter = {};
  for (const key of ['type', 'category', 'location']) if (query[key]) filter[key] = query[key];
  if (query.dateFrom || query.dateTo) {
    filter.date = {};
    if (query.dateFrom) filter.date.$gte = parseISODate(query.dateFrom);
    if (query.dateTo) filter.date.$lte = parseISODate(query.dateTo);
  }
  const words = (query.q ?? '').split(/\s+/).filter(Boolean).slice(0, 6);
  if (words.length) {
    filter.$and = words.map((word) => {
      const rx = new RegExp(escapeRegex(word), 'i');
      return { $or: SEARCH_FIELDS.map((field) => ({ [field]: rx })) };
    });
  }
  return filter;
}

export const pageMeta = (total, page, limit) => ({ total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });

const isOwner = (item, user) => !!user && !!item.reportedBy && (item.reportedBy._id ?? item.reportedBy).equals(user._id);

/** PENDING/REJECTED reports are only visible to their reporter and admins. */
const canView = (item, user) => PUBLIC_STATUSES.includes(item.status) || isAdmin(user) || isOwner(item, user);

const serializeMatches = (matches) =>
  matches.map((m) => ({ score: m.score, reasons: m.reasons, item: serializeItem(m.item) }));

// GET /api/items
export async function listPublicItems(req, res) {
  const q = req.valid.query;
  const filter = buildItemFilter(q);
  filter.status = q.status ?? { $in: PUBLIC_STATUSES };

  const [items, total] = await Promise.all([
    Item.find(filter)
      .sort(SORTS[q.sort])
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .populate('reportedBy', 'name')
      .lean(),
    Item.countDocuments(filter),
  ]);
  res.json({ success: true, data: { items: items.map((i) => serializeItem(i)), ...pageMeta(total, q.page, q.limit) } });
}

// GET /api/items/summary  (home page "This week on campus")
export async function getPublicSummary(_req, res) {
  const since = startOfLocalDay(6);
  const [found, lost, returned] = await Promise.all([
    Item.countDocuments({ type: 'FOUND', status: { $in: PUBLIC_STATUSES }, createdAt: { $gte: since } }),
    Item.countDocuments({ type: 'LOST', status: { $in: PUBLIC_STATUSES }, createdAt: { $gte: since } }),
    Item.countDocuments({ status: { $in: ['CLAIMED', 'CLOSED'] }, statusChangedAt: { $gte: since } }),
  ]);
  res.json({ success: true, data: { week: { found, lost, returned } } });
}

// GET /api/items/mine
export async function listMyItems(req, res) {
  const items = await Item.find({ reportedBy: req.user._id })
    .select('+hiddenDetails')
    .sort({ createdAt: -1 })
    .populate('reportedBy', 'name')
    .lean();
  res.json({ success: true, data: { items: items.map((i) => serializeItem(i, { includeHidden: true })) } });
}

// GET /api/items/:id
export async function getItem(req, res) {
  const item = await Item.findById(req.params.id).select('+hiddenDetails').populate('reportedBy', 'name email').lean();
  if (!item || !canView(item, req.user)) throw ApiError.notFound('Item not found.');

  const user = req.user;
  const owner = isOwner(item, user);
  const admin = isAdmin(user);

  let myClaim = null;
  if (user && !owner) {
    const claim = await Claim.findOne({ item: item._id, claimant: user._id }).sort({ createdAt: -1 }).lean();
    if (claim) myClaim = { id: claim._id.toString(), status: claim.status, adminRemarks: claim.adminRemarks, createdAt: claim.createdAt };
  }
  const canClaim = !!user && !owner && !admin && item.status === 'VERIFIED' && (!myClaim || myClaim.status === 'REJECTED');

  res.json({
    success: true,
    data: {
      item: serializeItem(item, { admin, includeHidden: owner }),
      viewer: { signedIn: !!user, isOwner: owner, isAdmin: admin, canClaim, myClaim },
    },
  });
}

// GET /api/items/:id/matches
export async function getItemMatches(req, res) {
  const item = await Item.findById(req.params.id).lean();
  if (!item || !canView(item, req.user)) throw ApiError.notFound('Item not found.');
  const matches = await findMatches(item);
  res.json({ success: true, data: { matches: serializeMatches(matches) } });
}

// POST /api/items  (multipart/form-data or JSON)
export async function createItem(req, res) {
  const { type, title, description, category, location, exactSpot = '', date, hiddenDetails } = req.body;
  const imageUrl = req.file ? await saveUpload(req.file, req.user._id) : '';
  let item;
  try {
    item = await Item.create({
      type,
      title,
      description,
      category,
      location,
      exactSpot,
      date: parseISODate(date),
      hiddenDetails,
      imageUrl,
      status: 'PENDING',
      reportedBy: req.user._id,
      statusChangedAt: new Date(),
    });
  } catch (err) {
    removeUpload(imageUrl); // don't leave an orphan photo behind
    throw err;
  }
  await item.populate('reportedBy', 'name email');
  const matches = await findMatches(item);

  res.status(201).json({
    success: true,
    message: 'Report submitted. It will be public once an admin verifies it.',
    data: { item: serializeItem(item, { includeHidden: true }), matches: serializeMatches(matches) },
  });
}

// PUT /api/items/:id  (owner only, while PENDING)
export async function updateItem(req, res) {
  const item = await Item.findById(req.params.id);
  if (!item || !canView(item, req.user)) throw ApiError.notFound('Item not found.');
  if (!isOwner(item, req.user)) throw ApiError.forbidden('You can only edit your own reports.');
  if (item.status !== 'PENDING') throw ApiError.badRequest('Reports can only be edited while they are pending review.');

  const { removeImage, date, ...fields } = req.body;
  const set = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
  if (date) set.date = parseISODate(date);
  if (req.file) set.imageUrl = await saveUpload(req.file, req.user._id);
  else if (removeImage === 'true') set.imageUrl = '';

  // Conditional update: fails cleanly if an admin reviewed the report while it was being edited.
  let updated;
  try {
    updated = await Item.findOneAndUpdate(
      { _id: item._id, reportedBy: req.user._id, status: 'PENDING' },
      { $set: set },
      { returnDocument: 'after', runValidators: true },
    )
      .select('+hiddenDetails')
      .populate('reportedBy', 'name email');
  } catch (err) {
    if (req.file) removeUpload(set.imageUrl);
    throw err;
  }
  if (!updated) {
    if (req.file) removeUpload(set.imageUrl);
    throw ApiError.conflict('This report was reviewed while you were editing it, so it can no longer be changed.');
  }

  if (item.imageUrl && item.imageUrl !== updated.imageUrl) removeUpload(item.imageUrl);
  const matches = await findMatches(updated);
  res.json({
    success: true,
    message: 'Report updated.',
    data: { item: serializeItem(updated, { includeHidden: true }), matches: serializeMatches(matches) },
  });
}

// DELETE /api/items/:id  (owner or admin)
export async function deleteItem(req, res) {
  const item = await Item.findById(req.params.id);
  if (!item || !canView(item, req.user)) throw ApiError.notFound('Item not found.');
  const admin = isAdmin(req.user);
  if (!admin && !isOwner(item, req.user)) throw ApiError.forbidden('You can only delete your own reports.');
  // Handed-over items are kept as a record for the claimant; only an admin can remove them.
  if (!admin && ['CLAIMED', 'CLOSED'].includes(item.status)) {
    throw ApiError.badRequest('Claimed or closed reports are kept as a record. Ask an admin if it must be removed.');
  }

  await Promise.all([Claim.deleteMany({ item: item._id }), item.deleteOne()]);
  removeUpload(item.imageUrl);
  res.json({ success: true, message: 'Report deleted.' });
}

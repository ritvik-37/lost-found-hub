import { env } from '../config/env.js';
import { CATEGORIES, CLAIM_STATUSES, ITEM_STATUSES, STATUS_FLOW, canTransition } from '../constants.js';
import { describeLogins, seedDatabase } from '../seed/seed.js';
import { Claim } from '../models/Claim.js';
import { Item } from '../models/Item.js';
import { ApiError } from '../utils/ApiError.js';
import { localISODate, startOfLocalDay } from '../utils/dates.js';
import { serializeClaim, serializeItem } from '../utils/serialize.js';
import { buildItemFilter, pageMeta } from './item.controller.js';

const DEFAULT_APPROVE_REMARK = 'Approved. Collect your item from the Security Office (Admin Block, 10am–5pm) with your student ID.';
const DEFAULT_REJECT_REMARK = 'Your proof did not match the details of this item.';
const AUTO_REJECT_REMARK = 'Another claim was approved for this item.';

const countBy = (rows) => Object.fromEntries(rows.map((r) => [r._id, r.count]));

/** Reject every still-pending claim on an item (after one is approved or the item is closed). */
async function rejectPendingClaims(itemId, remark, reviewer, exceptClaimId) {
  const filter = { item: itemId, status: 'PENDING' };
  if (exceptClaimId) filter._id = { $ne: exceptClaimId };
  const result = await Claim.updateMany(filter, {
    $set: { status: 'REJECTED', adminRemarks: remark, reviewedBy: reviewer, reviewedAt: new Date() },
  });
  return result.modifiedCount;
}

// GET /api/admin/items
export async function listAllItems(req, res) {
  const q = req.valid.query;
  const filter = buildItemFilter(q);
  if (q.status) filter.status = q.status;

  const [items, total] = await Promise.all([
    Item.find(filter)
      .select('+hiddenDetails')
      .sort({ createdAt: q.sort === 'oldest' ? 1 : -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .populate('reportedBy', 'name email')
      .lean(),
    Item.countDocuments(filter),
  ]);

  const pending = await Claim.aggregate([
    { $match: { item: { $in: items.map((i) => i._id) }, status: 'PENDING' } },
    { $group: { _id: '$item', count: { $sum: 1 } } },
  ]);
  const pendingByItem = new Map(pending.map((p) => [p._id.toString(), p.count]));

  res.json({
    success: true,
    data: {
      items: items.map((i) => ({ ...serializeItem(i, { admin: true }), pendingClaims: pendingByItem.get(i._id.toString()) ?? 0 })),
      ...pageMeta(total, q.page, q.limit),
    },
  });
}

// PATCH /api/admin/items/:id/status
export async function updateItemStatus(req, res) {
  const { status: to, note = '' } = req.body;
  const item = await Item.findById(req.params.id);
  if (!item) throw ApiError.notFound('Item not found.');

  const from = item.status;
  if (!canTransition(from, to)) {
    const allowed = STATUS_FLOW[from].join(' or ');
    throw ApiError.badRequest(
      allowed
        ? `Can't move an item from ${from} to ${to}. From ${from} it can only move to ${allowed}.`
        : `Can't move an item from ${from} to ${to}. ${from} is a final status.`,
    );
  }

  // Only succeeds if nobody changed the status since we read it.
  const updated = await Item.findOneAndUpdate(
    { _id: item._id, status: from },
    { $set: { status: to, statusNote: note, statusChangedAt: new Date() } },
    { returnDocument: 'after' },
  )
    .select('+hiddenDetails')
    .populate('reportedBy', 'name email');
  if (!updated) throw ApiError.conflict('This item was just updated by someone else. Refresh and try again.');

  let autoRejected = 0;
  if (['CLAIMED', 'CLOSED', 'REJECTED'].includes(to)) {
    autoRejected = await rejectPendingClaims(item._id, `Item was marked ${to.toLowerCase()} by an admin.`, req.user._id);
  }

  res.json({
    success: true,
    message: `"${updated.title}" marked ${to.toLowerCase()}.`,
    data: { item: serializeItem(updated, { admin: true }), autoRejectedClaims: autoRejected },
  });
}

// GET /api/admin/claims
export async function listClaims(req, res) {
  const q = req.valid.query;
  const filter = q.status ? { status: q.status } : {};
  const [claims, total] = await Promise.all([
    Claim.find(filter)
      .sort({ createdAt: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .populate({ path: 'item', select: '+hiddenDetails', populate: { path: 'reportedBy', select: 'name email' } })
      .populate('claimant', 'name email')
      .lean(),
    Claim.countDocuments(filter),
  ]);
  res.json({
    success: true,
    data: { claims: claims.filter((c) => c.item).map((c) => serializeClaim(c, { admin: true })), ...pageMeta(total, q.page, q.limit) },
  });
}

// PATCH /api/admin/claims/:id
export async function reviewClaim(req, res) {
  const { status: decision, adminRemarks } = req.body;
  const claim = await Claim.findById(req.params.id);
  if (!claim) throw ApiError.notFound('Claim not found.');
  if (claim.status !== 'PENDING') throw ApiError.badRequest(`This claim was already ${claim.status.toLowerCase()}.`);

  const reviewedAt = new Date();
  const remarks = adminRemarks || (decision === 'APPROVED' ? DEFAULT_APPROVE_REMARK : DEFAULT_REJECT_REMARK);
  const review = { status: decision, adminRemarks: remarks, reviewedBy: req.user._id, reviewedAt };

  const updated = await Claim.findOneAndUpdate({ _id: claim._id, status: 'PENDING' }, { $set: review }, { returnDocument: 'after' });
  if (!updated) throw ApiError.conflict('This claim was just reviewed by someone else. Refresh to see the result.');

  let item = null;
  let autoRejected = 0;
  if (decision === 'APPROVED') {
    item = await Item.findOneAndUpdate(
      { _id: claim.item, status: 'VERIFIED' },
      { $set: { status: 'CLAIMED', statusNote: 'Claim approved', statusChangedAt: reviewedAt } },
      { returnDocument: 'after' },
    );
    if (!item) {
      // Item is no longer claimable: undo the approval so the claim stays reviewable.
      await Claim.updateOne(
        { _id: claim._id },
        { $set: { status: 'PENDING', adminRemarks: '' }, $unset: { reviewedBy: 1, reviewedAt: 1 } },
      );
      throw ApiError.badRequest('Only verified items can be claimed. This item is no longer verified.');
    }
    autoRejected = await rejectPendingClaims(item._id, AUTO_REJECT_REMARK, req.user._id, claim._id);
  }

  const full = await Claim.findById(updated._id)
    .populate({ path: 'item', select: '+hiddenDetails', populate: { path: 'reportedBy', select: 'name email' } })
    .populate('claimant', 'name email');

  res.json({
    success: true,
    message:
      decision === 'APPROVED'
        ? `Claim approved. The item is now marked claimed${autoRejected ? ` and ${autoRejected} other claim${autoRejected === 1 ? ' was' : 's were'} rejected` : ''}.`
        : 'Claim rejected.',
    data: { claim: serializeClaim(full, { admin: true }), autoRejectedClaims: autoRejected },
  });
}

// POST /api/admin/demo/reset  (only while DEMO_LOGINS is on)
export async function resetDemoData(_req, res) {
  if (!env.DEMO_LOGINS) throw ApiError.notFound('Demo reset is turned off.');
  const { passwords } = await seedDatabase({ log: () => {} });
  console.log('[seed] demo data reset by an admin. Logins (or use the demo buttons):');
  for (const line of describeLogins(passwords)) console.log(line);
  res.json({ success: true, message: 'Demo data restored. Everyone was signed out.' });
}

// GET /api/admin/stats
export async function getStats(_req, res) {
  const since = startOfLocalDay(6);
  const [byStatus, byCategory, byType, recent, claimsByStatus] = await Promise.all([
    Item.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Item.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
    Item.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
    Item.find({ createdAt: { $gte: since } }).select('createdAt').lean(),
    Claim.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  const statusCounts = countBy(byStatus);
  const categoryCounts = countBy(byCategory);
  const typeCounts = countBy(byType);
  const claimCounts = countBy(claimsByStatus);

  // Bucket in server local time so "today" matches the campus clock.
  const last7Days = Array.from({ length: 7 }, (_, i) => ({ date: localISODate(startOfLocalDay(6 - i)), count: 0 }));
  const dayIndex = new Map(last7Days.map((d, i) => [d.date, i]));
  for (const { createdAt } of recent) {
    const i = dayIndex.get(localISODate(createdAt));
    if (i !== undefined) last7Days[i].count += 1;
  }

  res.json({
    success: true,
    data: {
      totals: {
        total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
        ...Object.fromEntries(ITEM_STATUSES.map((s) => [s, statusCounts[s] ?? 0])),
      },
      byCategory: CATEGORIES.map((category) => ({ category, count: categoryCounts[category] ?? 0 })),
      byType: { LOST: typeCounts.LOST ?? 0, FOUND: typeCounts.FOUND ?? 0 },
      last7Days,
      claims: Object.fromEntries(CLAIM_STATUSES.map((s) => [s, claimCounts[s] ?? 0])),
    },
  });
}

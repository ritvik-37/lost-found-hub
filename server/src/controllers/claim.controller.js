import { ACTIVE_CLAIM_STATUSES, PUBLIC_STATUSES } from '../constants.js';
import { isAdmin } from '../middleware/auth.js';
import { Claim } from '../models/Claim.js';
import { Item } from '../models/Item.js';
import { ApiError } from '../utils/ApiError.js';
import { serializeClaim } from '../utils/serialize.js';

const ACTIVE_CLAIM_MSG = 'You already have an active claim for this item. You can track it under My Activity.';

// POST /api/items/:id/claims
export async function createClaim(req, res) {
  const item = await Item.findById(req.params.id);
  const reporterId = item?.reportedBy;
  const mine = !!reporterId && reporterId.equals(req.user._id);
  if (!item || (!PUBLIC_STATUSES.includes(item.status) && !mine)) throw ApiError.notFound('Item not found.');

  if (isAdmin(req.user)) throw ApiError.forbidden('Admins review claims and cannot submit them.');
  if (mine) throw ApiError.badRequest("You can't claim an item you reported.");
  if (item.status !== 'VERIFIED') {
    throw ApiError.badRequest(`Only verified items can be claimed. This item is already ${item.status.toLowerCase()}.`);
  }
  if (await Claim.exists({ item: item._id, claimant: req.user._id, status: { $in: ACTIVE_CLAIM_STATUSES } })) {
    throw ApiError.conflict(ACTIVE_CLAIM_MSG);
  }

  let claim;
  try {
    claim = await Claim.create({
      item: item._id,
      claimant: req.user._id,
      proofAnswer: req.body.proofAnswer,
      message: req.body.message ?? '',
    });
  } catch (err) {
    if (err?.code === 11000) throw ApiError.conflict(ACTIVE_CLAIM_MSG); // lost a double-submit race
    throw err;
  }

  res.status(201).json({
    success: true,
    message: 'Claim submitted. An admin will review your proof.',
    data: { claim: serializeClaim(claim) },
  });
}

// GET /api/claims/mine
export async function listMyClaims(req, res) {
  const claims = await Claim.find({ claimant: req.user._id })
    .sort({ createdAt: -1 })
    .populate({ path: 'item', populate: { path: 'reportedBy', select: 'name' } })
    .lean();
  res.json({
    success: true,
    data: { claims: claims.filter((c) => c.item).map((c) => serializeClaim(c)) },
  });
}

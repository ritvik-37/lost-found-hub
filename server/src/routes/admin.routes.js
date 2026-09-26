import { Router } from 'express';
import {
  getStats,
  listAllItems,
  listClaims,
  resetDemoData,
  reviewClaim,
  updateItemStatus,
} from '../controllers/admin.controller.js';
import { requireAdmin } from '../middleware/auth.js';
import { validate, validId } from '../middleware/validate.js';
import { adminClaimsQuery, itemStatusSchema, reviewClaimSchema } from '../validators/claim.js';
import { adminListQuery } from '../validators/item.js';

const router = Router();

router.use(requireAdmin);

router.get('/stats', getStats);
router.get('/items', validate({ query: adminListQuery }), listAllItems);
router.patch('/items/:id/status', validId('Item'), validate({ body: itemStatusSchema }), updateItemStatus);
router.get('/claims', validate({ query: adminClaimsQuery }), listClaims);
router.patch('/claims/:id', validId('Claim'), validate({ body: reviewClaimSchema }), reviewClaim);
router.post('/demo/reset', resetDemoData);

export default router;

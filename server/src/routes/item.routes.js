import { Router } from 'express';
import { createClaim } from '../controllers/claim.controller.js';
import {
  createItem,
  deleteItem,
  getItem,
  getItemMatches,
  getPublicSummary,
  listMyItems,
  listPublicItems,
  updateItem,
} from '../controllers/item.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { submitLimiter } from '../middleware/rateLimit.js';
import { uploadImage } from '../middleware/upload.js';
import { validate, validId } from '../middleware/validate.js';
import { createClaimSchema } from '../validators/claim.js';
import { createItemSchema, publicListQuery, updateItemSchema } from '../validators/item.js';

const router = Router();
const itemId = validId('Item');

// Static paths first so they are not captured by "/:id".
router.get('/', validate({ query: publicListQuery }), listPublicItems);
router.get('/summary', getPublicSummary);
router.get('/mine', requireAuth, listMyItems);

router.post('/', requireAuth, submitLimiter, uploadImage, validate({ body: createItemSchema }), createItem);

router.get('/:id', itemId, getItem);
router.get('/:id/matches', itemId, getItemMatches);
router.put('/:id', requireAuth, itemId, uploadImage, validate({ body: updateItemSchema }), updateItem);
router.delete('/:id', requireAuth, itemId, deleteItem);

router.post('/:id/claims', requireAuth, submitLimiter, itemId, validate({ body: createClaimSchema }), createClaim);

export default router;

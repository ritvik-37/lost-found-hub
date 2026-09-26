import { Router } from 'express';
import { listMyClaims } from '../controllers/claim.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/mine', requireAuth, listMyClaims);

export default router;

import { Router } from 'express';
import mongoose from 'mongoose';
import adminRoutes from './admin.routes.js';
import authRoutes from './auth.routes.js';
import claimRoutes from './claim.routes.js';
import itemRoutes from './item.routes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', db: mongoose.connection.readyState === 1 ? 'up' : 'down' } });
});

router.use('/auth', authRoutes);
router.use('/items', itemRoutes);
router.use('/claims', claimRoutes);
router.use('/admin', adminRoutes);

export default router;

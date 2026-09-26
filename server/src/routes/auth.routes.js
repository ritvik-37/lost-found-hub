import { Router } from 'express';
import { demoLogin, listDemoAccounts, login, logout, me, register } from '../controllers/auth.controller.js';
import { loginLimiter, registerLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { demoLoginSchema, loginSchema, registerSchema } from '../validators/auth.js';

const router = Router();

router.post('/register', registerLimiter, validate({ body: registerSchema }), register);
router.post('/login', loginLimiter, validate({ body: loginSchema }), login);
router.get('/demo', listDemoAccounts);
router.post('/demo', validate({ body: demoLoginSchema }), demoLogin);
router.post('/logout', logout);
router.get('/me', me);

export default router;

// services/auth/src/routes/auth.routes.js
// Extracted from finpay-api/src/routes/auth.routes.js — unchanged

import { Router } from 'express';
import { body } from 'express-validator';
import { register, login } from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('name').trim().notEmpty().withMessage('Name is required'),
], register);

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], login);

export default router;

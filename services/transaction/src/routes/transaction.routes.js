// services/transaction/src/routes/transaction.routes.js
import { Router } from 'express';
import { body }   from 'express-validator';
import { createTransaction, getTransactions } from '../controllers/transaction.controller.js';

const router = Router();

router.post('/', [
  body('receiverAccountId').notEmpty().withMessage('Receiver account ID required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('description').optional().trim().isLength({ max: 255 }),
], createTransaction);

router.get('/', getTransactions);

export default router;

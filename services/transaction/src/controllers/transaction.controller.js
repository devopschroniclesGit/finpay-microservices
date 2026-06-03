// services/transaction/src/controllers/transaction.controller.js
import { validationResult } from 'express-validator';
import { sendSuccess, sendError } from '../../../../shared/utils/response.js';
import * as txnService from '../services/transaction.service.js';

export const createTransaction = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, 422, 'Validation failed', errors.array());

    const { receiverAccountId, amount, description } = req.body;
    const result = await txnService.transfer({
      senderUserId: req.user.id,
      receiverAccountId,
      amount: parseFloat(amount),
      description,
    });
    return sendSuccess(res, 201, result, 'Transfer successful');
  } catch (err) {
    if (err.message === 'INSUFFICIENT_FUNDS')  return sendError(res, 400, 'Insufficient funds');
    if (err.message === 'ACCOUNT_NOT_FOUND')   return sendError(res, 404, 'Receiver account not found');
    if (err.message === 'SELF_TRANSFER')       return sendError(res, 400, 'Cannot transfer to own account');
    next(err);
  }
};

export const getTransactions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await txnService.getTransactionHistory({
      userId: req.user.id,
      page:   parseInt(page),
      limit:  Math.min(parseInt(limit), 100),
    });
    return sendSuccess(res, 200, result);
  } catch (err) {
    next(err);
  }
};

// services/account/src/controllers/account.controller.js
import { sendSuccess, sendError } from '../../../../shared/utils/response.js';
import * as accountService from '../services/account.service.js';

export const getAccount = async (req, res, next) => {
  try {
    const account = await accountService.getAccountByUserId(req.user.id);
    if (!account) return sendError(res, 404, 'Account not found');
    return sendSuccess(res, 200, account);
  } catch (err) {
    next(err);
  }
};

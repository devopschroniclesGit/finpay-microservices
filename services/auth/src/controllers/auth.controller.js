// services/auth/src/controllers/auth.controller.js
// Extracted from finpay-api/src/controllers/auth.controller.js

import { validationResult } from 'express-validator';
import { sendSuccess, sendError } from '../../../../shared/utils/response.js';
import * as authService from '../services/auth.service.js';

export const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 422, 'Validation failed', errors.array());
    }
    const { email, password, name } = req.body;
    const result = await authService.register({ email, password, name });
    return sendSuccess(res, 201, result, 'Registration successful');
  } catch (err) {
    if (err.message === 'EMAIL_EXISTS') {
      return sendError(res, 409, 'Email already registered');
    }
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 422, 'Validation failed', errors.array());
    }
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    return sendSuccess(res, 200, result, 'Login successful');
  } catch (err) {
    if (err.message === 'INVALID_CREDENTIALS') {
      return sendError(res, 401, 'Invalid email or password');
    }
    next(err);
  }
};

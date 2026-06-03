// shared/utils/response.js
// Extracted from finpay-api/src/utils/response.js — unchanged

export const sendSuccess = (res, statusCode, data, message = 'Success') => {
  return res.status(statusCode).json({ success: true, message, data });
};

export const sendError = (res, statusCode, message, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }),
  });
};

// shared/middleware/errorHandler.js
// Extracted from finpay-api/src/middleware/errorHandler.js

import logger from '../config/logger.js';

export const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled error', {
    message: err.message,
    stack:   err.stack,
    url:     req.url,
    method:  req.method,
  });

  const statusCode = err.statusCode || 500;
  const message    = err.message    || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'Internal server error'
      : message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

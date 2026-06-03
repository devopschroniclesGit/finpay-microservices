// shared/config/logger.js
// Extracted from finpay-api/src/config/logger.js — unchanged

import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    process.env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.prettyPrint()
  ),
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'finpay',
  },
  transports: [
    new winston.transports.Console(),
  ],
});

export default logger;

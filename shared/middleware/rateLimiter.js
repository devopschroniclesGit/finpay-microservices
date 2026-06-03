// shared/middleware/rateLimiter.js
// Extracted from finpay-api/src/middleware/rateLimiter.js
// Now reads RATE_LIMIT_WINDOW_MS and RATE_LIMIT_MAX_REQUESTS from ConfigMap env vars

import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import redis from '../config/redis.js';

// Global limiter — applied to all /api routes
// Values come from finpay-app-config ConfigMap (set from terraform.tfvars)
export const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS  || '900000'),  // 15 min
  max:      parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  standardHeaders: true,
  legacyHeaders:   false,
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
    prefix: 'rl:global:',
  }),
  message: { success: false, message: 'Too many requests, please try again later' },
});

// Auth limiter — tighter (20 req per 15 min)
// Prevents brute force on login/register
export const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS    || '900000'),
  max:      parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '20'),
  standardHeaders: true,
  legacyHeaders:   false,
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
    prefix: 'rl:auth:',
  }),
  message: { success: false, message: 'Too many auth attempts, please try again later' },
});

// Transaction limiter — 10 req per minute per user
export const transactionLimiter = rateLimit({
  windowMs: parseInt(process.env.TXN_RATE_LIMIT_WINDOW_MS    || '60000'),
  max:      parseInt(process.env.TXN_RATE_LIMIT_MAX_REQUESTS || '10'),
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator: (req) => req.user?.id || req.ip,
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
    prefix: 'rl:txn:',
  }),
  message: { success: false, message: 'Transaction rate limit exceeded' },
});

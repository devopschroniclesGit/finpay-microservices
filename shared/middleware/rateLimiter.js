import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import redis from '../config/redis.js';

const store = (prefix) => new RedisStore({
  sendCommand: (...args) => redis.call(...args),
  prefix,
});

const validate = {
  xForwardedForHeader: false,
  keyGeneratorIpFallback: false
};

export const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max:      parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  standardHeaders: true,
  legacyHeaders:   false,
  validate,
  store: store('rl:global:'),
  message: { success: false, message: 'Too many requests, please try again later' },
});

export const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS    || '900000'),
  max:      parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '20'),
  standardHeaders: true,
  legacyHeaders:   false,
  validate,
  store: store('rl:auth:'),
  message: { success: false, message: 'Too many auth attempts, please try again later' },
});

export const transactionLimiter = rateLimit({
  windowMs:  parseInt(process.env.TXN_RATE_LIMIT_WINDOW_MS    || '60000'),
  max:       parseInt(process.env.TXN_RATE_LIMIT_MAX_REQUESTS || '10'),
  standardHeaders: true,
  legacyHeaders:   false,
  validate,
  keyGenerator: (req) => req.user?.id || req.ip || 'unknown',
  store: store('rl:txn:'),
  message: { success: false, message: 'Transaction rate limit exceeded' },
});

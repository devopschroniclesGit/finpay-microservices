import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import redis from '../config/redis.js';

export const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max:      parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  standardHeaders: true,
  legacyHeaders:   false,
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
    prefix: 'rl:global:',
  }),
  message: { success: false, message: 'Too many requests, please try again later' },
});

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

export const transactionLimiter = rateLimit({
  windowMs: parseInt(process.env.TXN_RATE_LIMIT_WINDOW_MS    || '60000'),
  max:      parseInt(process.env.TXN_RATE_LIMIT_MAX_REQUESTS || '10'),
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise fall back to IP
    // Using requestIp to handle IPv6 correctly
    if (req.user?.id) return `user:${req.user.id}`;
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
  skip: (req) => !req.user,
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
    prefix: 'rl:txn:',
  }),
  message: { success: false, message: 'Transaction rate limit exceeded' },
});

// shared/middleware/idempotency.js
// Extracted from finpay-api/src/middleware/idempotency.js — unchanged

import redis from '../config/redis.js';
import { sendSuccess } from '../utils/response.js';
import logger from '../config/logger.js';

const TTL = parseInt(process.env.IDEMPOTENCY_TTL_SECONDS || '86400');  // 24h default

export const idempotency = async (req, res, next) => {
  const key = req.headers['x-idempotency-key'];
  if (!key) return next();

  const cacheKey = `idempotency:${req.user?.id}:${key}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.info('Idempotency cache hit', { key });
      const parsed = JSON.parse(cached);
      return sendSuccess(res, parsed.statusCode || 200, parsed.data, parsed.message);
    }

    // Patch res.json to cache the response before sending
    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        await redis.setex(cacheKey, TTL, JSON.stringify({
          statusCode: res.statusCode,
          data:       body.data,
          message:    body.message,
        }));
      }
      return originalJson(body);
    };

    next();
  } catch (err) {
    logger.error('Idempotency middleware error', { err: err.message });
    next();
  }
};

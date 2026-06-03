// shared/config/redis.js
// Extracted from finpay-api/src/config/redis.js
// Replaced Upstash REST client with ioredis for in-cluster ElastiCache

import Redis from 'ioredis';
import logger from './logger.js';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  retryStrategy: (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
});

redis.on('connect',   () => logger.info('Redis connected'));
redis.on('error',     (err) => logger.error('Redis error', { err: err.message }));
redis.on('reconnecting', () => logger.warn('Redis reconnecting'));

export default redis;

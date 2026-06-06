import Redis from 'ioredis';
import logger from './logger.js';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  retryStrategy: (times) => Math.min(times * 100, 3000),
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: false,
  reconnectOnError: () => true,
});

redis.on('connect',      () => logger.info('Redis connected'));
redis.on('error',        (err) => logger.error('Redis error', { err: err.message }));
redis.on('reconnecting', () => logger.warn('Redis reconnecting'));

export default redis;

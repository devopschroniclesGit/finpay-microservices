// services/account/src/services/account.service.js
// Extracted from finpay-api — same Redis cache pattern

import prisma from '../../../../shared/config/database.js';
import redis  from '../../../../shared/config/redis.js';
import logger from '../../../../shared/config/logger.js';

const CACHE_TTL = parseInt(process.env.CACHE_TTL_SECONDS || '30');

export const getAccountByUserId = async (userId) => {
  const cacheKey = `account:${userId}`;

  // Cache hit
  const cached = await redis.get(cacheKey);
  if (cached) {
    logger.info('Account cache hit', { userId });
    return JSON.parse(cached);
  }

  // Cache miss — query DB
  const account = await prisma.account.findUnique({
    where:  { userId },
    select: { id: true, balance: true, userId: true, createdAt: true },
  });

  if (account) {
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(account));
  }

  return account;
};

export const invalidateCache = async (userId) => {
  await redis.del(`account:${userId}`);
};

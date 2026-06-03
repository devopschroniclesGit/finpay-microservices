// services/auth/src/services/auth.service.js
// Extracted from finpay-api/src/services/auth.service.js

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../../../shared/config/database.js';
import logger from '../../../../shared/config/logger.js';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');
const JWT_SECRET    = process.env.JWT_SECRET;
const JWT_EXPIRES   = process.env.JWT_EXPIRES_IN || '7d';

export const register = async ({ email, password, name }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('EMAIL_EXISTS');

  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Create user and account atomically — same as original finpay-api
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: { email, password: hashedPassword, name },
    });
    await tx.account.create({
      data: { userId: newUser.id, balance: 0 },
    });
    return newUser;
  });

  logger.info('User registered', { userId: user.id, email });

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );

  return { token, user: { id: user.id, email: user.email, name: user.name } };
};

export const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('INVALID_CREDENTIALS');

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new Error('INVALID_CREDENTIALS');

  logger.info('User logged in', { userId: user.id, email });

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );

  return { token, user: { id: user.id, email: user.email, name: user.name } };
};

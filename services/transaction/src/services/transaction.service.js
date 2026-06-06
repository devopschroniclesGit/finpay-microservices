import prisma from '../../../../shared/config/database.js';
import { publishEvent } from '../../../../shared/config/rabbitmq.js';
import logger from '../../../../shared/config/logger.js';

const MAX_TRANSFER = parseInt(process.env.MAX_TRANSFER_AMOUNT_CENTS || '100000000');

export const transfer = async ({ senderUserId, receiverAccountId, amount, description }) => {
  const amountCents = Math.round(amount * 100);
  if (amountCents > MAX_TRANSFER) throw new Error('EXCEEDS_LIMIT');

  const senderAccount = await prisma.account.findUnique({ where: { userId: senderUserId } });
  if (!senderAccount) throw new Error('ACCOUNT_NOT_FOUND');
  if (senderAccount.id === receiverAccountId) throw new Error('SELF_TRANSFER');
  if (senderAccount.balance < amountCents) throw new Error('INSUFFICIENT_FUNDS');

  const receiverAccount = await prisma.account.findUnique({ where: { id: receiverAccountId } });
  if (!receiverAccount) throw new Error('ACCOUNT_NOT_FOUND');

  const transaction = await prisma.$transaction(async (tx) => {
    await tx.account.update({
      where: { id: senderAccount.id },
      data:  { balance: { decrement: amountCents } },
    });
    await tx.account.update({
      where: { id: receiverAccountId },
      data:  { balance: { increment: amountCents } },
    });
    const txn = await tx.transaction.create({
      data: {
        senderId:    senderAccount.id,
        receiverId:  receiverAccountId,
        amount:      amountCents,
        description: description || null,
        status:      'COMPLETED',
      },
    });
    await tx.auditLog.create({
      data: {
        userId: senderUserId,
        action: 'TRANSFER',
        meta:   JSON.stringify({ txnId: txn.id, amount: amountCents, receiverAccountId }),
      },
    });
    return txn;
  });

  logger.info('Transfer completed', {
    txnId: transaction.id,
    senderAccountId: senderAccount.id,
    receiverAccountId,
    amountCents,
  });

  // Publish event to RabbitMQ — non-fatal if RabbitMQ is down
  try {
    await publishEvent('transaction.completed', {
      txnId:            transaction.id,
      senderUserId,
      senderAccountId:  senderAccount.id,
      receiverAccountId,
      amountCents,
      description,
    });
  } catch (rmqErr) {
    logger.error('RabbitMQ publish failed - transfer still succeeded', { err: rmqErr.message });
  }

  return {
    id:          transaction.id,
    amount:      amountCents / 100,
    description: transaction.description,
    status:      transaction.status,
    createdAt:   transaction.createdAt,
  };
};

export const getTransactionHistory = async ({ userId, page, limit }) => {
  const account = await prisma.account.findUnique({ where: { userId } });
  if (!account) throw new Error('ACCOUNT_NOT_FOUND');

  const skip = (page - 1) * limit;
  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where: { OR: [{ senderId: account.id }, { receiverId: account.id }] },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.transaction.count({
      where: { OR: [{ senderId: account.id }, { receiverId: account.id }] },
    }),
  ]);

  return {
    transactions: transactions.map(t => ({
      ...t,
      amount: t.amount / 100,
      type:   t.senderId === account.id ? 'DEBIT' : 'CREDIT',
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

// shared/config/rabbitmq.js
// New — RabbitMQ AMQP client used by transaction, account, notification services

import amqplib from 'amqplib';
import logger from './logger.js';

const RABBITMQ_URL  = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const EXCHANGE_NAME = 'finpay.transactions';
const DEAD_LETTER   = 'finpay.dlq';

let connection = null;
let channel    = null;

export async function connectRabbitMQ() {
  try {
    connection = await amqplib.connect(RABBITMQ_URL);
    channel    = await connection.createChannel();

    // Main exchange — topic so we can route by event type
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

    // Dead letter exchange for failed messages
    await channel.assertExchange(DEAD_LETTER, 'fanout', { durable: true });

    // Dead letter queue
    await channel.assertQueue('finpay.dlq.queue', {
      durable: true,
      arguments: { 'x-queue-type': 'classic' },
    });
    await channel.bindQueue('finpay.dlq.queue', DEAD_LETTER, '#');

    connection.on('error',  (err) => logger.error('RabbitMQ connection error', { err: err.message }));
    connection.on('close',  ()    => logger.warn('RabbitMQ connection closed — reconnecting in 5s'));

    logger.info('RabbitMQ connected', { exchange: EXCHANGE_NAME });
    return channel;
  } catch (err) {
    logger.error('RabbitMQ connect failed', { err: err.message });
    // Retry after 5 seconds
    setTimeout(connectRabbitMQ, 5000);
  }
}

export async function publishEvent(routingKey, payload) {
  if (!channel) throw new Error('RabbitMQ channel not initialised');
  const message = Buffer.from(JSON.stringify({
    ...payload,
    timestamp: new Date().toISOString(),
    routingKey,
  }));
  channel.publish(EXCHANGE_NAME, routingKey, message, {
    persistent:   true,
    contentType:  'application/json',
  });
  logger.info('Event published', { routingKey, payload });
}

export async function consumeQueue(queueName, routingKey, handler) {
  if (!channel) throw new Error('RabbitMQ channel not initialised');

  await channel.assertQueue(queueName, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': DEAD_LETTER,
      'x-message-ttl':          86400000,   // 24h TTL
    },
  });
  await channel.bindQueue(queueName, EXCHANGE_NAME, routingKey);
  channel.prefetch(1);

  channel.consume(queueName, async (msg) => {
    if (!msg) return;
    try {
      const content = JSON.parse(msg.content.toString());
      await handler(content);
      channel.ack(msg);
    } catch (err) {
      logger.error('Message handler failed', { err: err.message });
      channel.nack(msg, false, false);  // send to DLQ
    }
  });

  logger.info('Consumer started', { queue: queueName, routingKey });
}

export { channel };

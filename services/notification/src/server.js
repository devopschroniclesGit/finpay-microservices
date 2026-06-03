// services/notification/src/server.js
// Notification service — NEW service (not in original finpay-api)
// Subscribes to RabbitMQ finpay.transactions exchange
// Sends email/log notifications on transaction events
// Port: 3004

import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import { connectRabbitMQ, consumeQueue } from '../../../shared/config/rabbitmq.js';
import { metricsMiddleware, metricsHandler } from '../../../shared/utils/metrics.js';
import { errorHandler } from '../../../shared/middleware/errorHandler.js';
import logger from '../../../shared/config/logger.js';

const app  = express();
const PORT = process.env.PORT || 3004;

app.use(helmet());
app.use(express.json());
app.use(metricsMiddleware);

app.get('/metrics', metricsHandler);
app.get('/api/v1/health', (req, res) => {
  res.json({ success: true, service: 'notification-service', status: 'healthy' });
});

app.use(errorHandler);

// ── RabbitMQ consumer ─────────────────────────────────────────────────────────

async function startConsumer() {
  await connectRabbitMQ();

  // Subscribe to transaction.completed events
  await consumeQueue(
    'notification.transaction.completed',
    'transaction.completed',
    async (event) => {
      logger.info('Processing transaction notification', {
        txnId:           event.txnId,
        senderUserId:    event.senderUserId,
        receiverAccountId: event.receiverAccountId,
        amountCents:     event.amountCents,
      });

      // In production: send email via SES / SMS via SNS
      // For demo: structured log acts as the notification
      logger.info('NOTIFICATION SENT', {
        type:    'TRANSFER_COMPLETE',
        txnId:   event.txnId,
        amount:  `ZAR ${(event.amountCents / 100).toFixed(2)}`,
        to:      event.receiverAccountId,
        from:    event.senderUserId,
        alertEmail: process.env.ALERT_EMAIL,
      });
    }
  );

  logger.info('Notification service consumer started');
}

startConsumer().then(() => {
  app.listen(PORT, () => logger.info(`notification-service running on port ${PORT}`));
}).catch((err) => {
  logger.error('Failed to start notification service', { err: err.message });
  process.exit(1);
});

export default app;

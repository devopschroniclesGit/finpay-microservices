// services/notification/src/server.js
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

// ── RabbitMQ consumer with retry ─────────────────────────────────────────────
const MAX_RETRIES = 20;
const RETRY_DELAY_MS = 5000;

async function startConsumer(attempt = 1) {
  try {
    logger.info(`RabbitMQ connect attempt ${attempt}/${MAX_RETRIES}`);
    await connectRabbitMQ();

    await consumeQueue('notification.transaction.completed', async (msg) => {
      const data = JSON.parse(msg.content.toString());
      logger.info('Transaction notification received', {
        txnId:            data.txnId,
        senderAccountId:  data.senderAccountId,
        receiverAccountId: data.receiverAccountId,
        amountCents:      data.amountCents,
      });
    });

    logger.info('Notification service consumer started');
  } catch (err) {
    logger.error('RabbitMQ connect failed', { err: err.message });

    if (attempt < MAX_RETRIES) {
      const delay = Math.min(RETRY_DELAY_MS * attempt, 30000);
      logger.warn(`Retrying in ${delay / 1000}s... (attempt ${attempt}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return startConsumer(attempt + 1);
    }

    logger.error('Max retries reached — notification consumer not started. Service still healthy.');
    // Do NOT exit — health endpoint stays up so pod does not crash loop
  }
}

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`notification-service running on port ${PORT}`);
  // Start consumer in background — do not block HTTP server
  startConsumer().catch(err => {
    logger.error('Unexpected error in startConsumer', { err: err.message });
  });
});

export default app;

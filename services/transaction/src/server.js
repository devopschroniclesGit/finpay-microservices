// services/transaction/src/server.js
// Transaction service — atomic transfers, history
// Port: 3003
// Publishes to RabbitMQ: finpay.transactions exchange

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { globalLimiter, transactionLimiter } from '../../../shared/middleware/rateLimiter.js';
import { authenticate }   from '../../../shared/middleware/auth.js';
import { idempotency }    from '../../../shared/middleware/idempotency.js';
import { errorHandler }   from '../../../shared/middleware/errorHandler.js';
import { metricsMiddleware, metricsHandler } from '../../../shared/utils/metrics.js';
import { connectRabbitMQ } from '../../../shared/config/rabbitmq.js';
import logger from '../../../shared/config/logger.js';
import transactionRoutes from './routes/transaction.routes.js';

const app  = express();
const PORT = process.env.PORT || 3003;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
app.use(metricsMiddleware);

app.get('/metrics', metricsHandler);
app.get('/api/v1/health', (req, res) => {
  res.json({ success: true, service: 'transaction-service', status: 'healthy' });
});

app.use('/api/v1/transactions', globalLimiter, authenticate, transactionLimiter, idempotency, transactionRoutes);

app.use(errorHandler);

// Connect RabbitMQ then start server
connectRabbitMQ().then(() => {
  app.listen(PORT, () => logger.info(`transaction-service running on port ${PORT}`));
});

export default app;

// services/account/src/server.js
// Account service — balance reads, account info
// Port: 3002

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { globalLimiter } from '../../../shared/middleware/rateLimiter.js';
import { authenticate }  from '../../../shared/middleware/auth.js';
import { errorHandler }  from '../../../shared/middleware/errorHandler.js';
import { metricsMiddleware, metricsHandler } from '../../../shared/utils/metrics.js';
import logger from '../../../shared/config/logger.js';
import accountRoutes from './routes/account.routes.js';

const app  = express();
const PORT = process.env.PORT || 3002;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
app.use(metricsMiddleware);

app.get('/metrics', metricsHandler);
app.get('/api/v1/health', (req, res) => {
  res.json({ success: true, service: 'account-service', status: 'healthy' });
});

app.use('/api/v1/accounts', globalLimiter, authenticate, accountRoutes);

app.use(errorHandler);

app.listen(PORT, () => logger.info(`account-service running on port ${PORT}`));

export default app;

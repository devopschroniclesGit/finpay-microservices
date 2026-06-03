// services/auth/src/server.js
// Auth service entry point — extracted from finpay-api
// Handles: register, login, JWT issuance
// Port: 3001

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { globalLimiter, authLimiter } from '../../../shared/middleware/rateLimiter.js';
import { errorHandler } from '../../../shared/middleware/errorHandler.js';
import { metricsMiddleware, metricsHandler } from '../../../shared/utils/metrics.js';
import logger from '../../../shared/config/logger.js';
import authRoutes from './routes/auth.routes.js';

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Security ─────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// ── Metrics ───────────────────────────────────────────────────────────────────
app.use(metricsMiddleware);
app.get('/metrics', metricsHandler);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/v1/health', (req, res) => {
  res.json({ success: true, service: 'auth-service', status: 'healthy',
             version: process.env.npm_package_version || '1.0.0' });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', globalLimiter, authLimiter, authRoutes);

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`auth-service running on port ${PORT}`);
});

export default app;

// shared/utils/metrics.js
// Extracted from finpay-api — exposes /metrics endpoint for Prometheus scraping

import client from 'prom-client';

const register = new client.Registry();
client.collectDefaultMetrics({ register });

// HTTP request counter
export const httpRequestsTotal = new client.Counter({
  name:    'http_requests_total',
  help:    'Total HTTP requests',
  labelNames: ['method', 'route', 'status', 'service'],
  registers: [register],
});

// HTTP request duration histogram
export const httpRequestDurationSeconds = new client.Histogram({
  name:    'http_request_duration_seconds',
  help:    'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status', 'service'],
  buckets: [0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

// Middleware to record metrics on every request
export const metricsMiddleware = (req, res, next) => {
  const end   = httpRequestDurationSeconds.startTimer();
  const route = req.route?.path || req.path;

  res.on('finish', () => {
    const labels = {
      method:  req.method,
      route,
      status:  res.statusCode,
      service: process.env.SERVICE_NAME || 'unknown',
    };
    httpRequestsTotal.inc(labels);
    end(labels);
  });
  next();
};

// /metrics route handler
export const metricsHandler = async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
};

export default register;

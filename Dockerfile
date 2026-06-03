# Multi-stage Dockerfile — builds any of the 4 services
# Build arg SERVICE = auth | account | transaction | notification
#
# Build:   docker build --build-arg SERVICE=auth -t finpay-auth .
# Run:     docker run -p 3001:3001 --env-file .env finpay-auth

ARG SERVICE=auth

# ── Stage 1: deps ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
COPY prisma/schema.prisma ./prisma/

RUN npm ci --only=production && \
    npx prisma generate

# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copy shared code
COPY shared/ ./shared/

# Copy only the target service
ARG SERVICE
COPY services/${SERVICE}/src/ ./services/${SERVICE}/src/

# ── Stage 3: production ───────────────────────────────────────────────────────
FROM node:20-alpine AS production

RUN addgroup -S finpay && adduser -S finpay -G finpay

WORKDIR /app

COPY --from=build --chown=finpay:finpay /app/node_modules ./node_modules
COPY --from=build --chown=finpay:finpay /app/prisma ./prisma
COPY --from=build --chown=finpay:finpay /app/shared ./shared

ARG SERVICE
ENV SERVICE_NAME=${SERVICE}
COPY --from=build --chown=finpay:finpay /app/services/${SERVICE}/src ./src

USER finpay

EXPOSE 3001 3002 3003 3004

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-3001}/api/v1/health || exit 1

CMD ["node", "src/server.js"]

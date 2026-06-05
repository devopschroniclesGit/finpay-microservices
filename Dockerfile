ARG SERVICE=auth

# ── Stage 1: deps ─────────────────────────────────────────────────────────────
FROM node:20-slim AS deps
WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma/schema.prisma ./prisma/

RUN npm ci && npx prisma generate

# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM node:20-slim AS build
WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY shared/ ./shared/

ARG SERVICE
COPY services/${SERVICE}/src/ ./services/${SERVICE}/src/

# ── Stage 3: production ───────────────────────────────────────────────────────
FROM node:20-slim AS production

RUN apt-get update && apt-get install -y openssl wget && rm -rf /var/lib/apt/lists/*
RUN groupadd -r finpay && useradd -r -g finpay finpay

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

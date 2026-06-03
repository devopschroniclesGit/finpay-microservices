# finpay-microservices

Microservices split of [finpay-api](https://github.com/devopschroniclesGit/finpay-api).
Same business logic, same Prisma schema, same rate limiting — split into 4 independent services.

## Services

| Service | Port | Extracted from | New additions |
|---|---|---|---|
| auth-service | 3001 | `src/controllers/auth*`, `src/services/auth*` | None — unchanged |
| account-service | 3002 | `src/controllers/account*`, `src/services/account*` | None — unchanged |
| transaction-service | 3003 | `src/controllers/transaction*`, `src/services/transaction*` | Publishes to RabbitMQ |
| notification-service | 3004 | Not in original | NEW — subscribes to RabbitMQ |

## Shared code (`/shared`)

Code extracted from original `finpay-api/src/` that all services use:

| File | Original location |
|---|---|
| `shared/config/database.js` | `src/config/database.js` |
| `shared/config/redis.js` | `src/config/redis.js` (swapped Upstash → ioredis for ElastiCache) |
| `shared/config/logger.js` | `src/config/logger.js` |
| `shared/config/rabbitmq.js` | NEW |
| `shared/middleware/auth.js` | `src/middleware/auth.js` |
| `shared/middleware/rateLimiter.js` | `src/middleware/rateLimiter.js` |
| `shared/middleware/idempotency.js` | `src/middleware/idempotency.js` |
| `shared/middleware/errorHandler.js` | `src/middleware/errorHandler.js` |
| `shared/utils/response.js` | `src/utils/response.js` |
| `shared/utils/metrics.js` | `src/utils/metrics.js` |

## Quick start (local)

```bash
git clone https://github.com/your-org/finpay-microservices
cd finpay-microservices
cp .env.example .env

docker compose up -d
npm install
npx prisma migrate dev
npx prisma db seed

# Services start automatically via docker-compose
# auth:         http://localhost:3001
# account:      http://localhost:3002
# transaction:  http://localhost:3003
# notification: http://localhost:3004
# rabbitmq UI:  http://localhost:15672 (finpay / finpay_dev_password)
```

## Environment variables

All `RATE_LIMIT_*` and `ALERT_EMAIL` values from `terraform.tfvars` flow into:

1. `modules/secrets/main.tf` → AWS Secrets Manager
2. ExternalSecrets Operator → Kubernetes Secret
3. `k8s/base/configmaps.yaml` → ConfigMap env vars
4. Mounted into pod environment at runtime

## CI/CD

On every merge to `main`:
1. GitHub Actions builds 4 Docker images in parallel
2. Pushes each to ECR: `finpay-auth`, `finpay-account`, `finpay-transaction`, `finpay-notification`
3. Commits updated image tags to `finpay-gitops` repo
4. ArgoCD detects the commit → syncs to EKS

## Related repos

- [`finpay-api`](https://github.com/devopschroniclesGit/finpay-api) — original monolith (source of this split)
- [`finpay-eks-infra`](https://github.com/your-org/finpay-eks-infra) — Terraform AWS infrastructure
- [`finpay-gitops`](https://github.com/your-org/finpay-gitops) — Kubernetes manifests + ArgoCD apps

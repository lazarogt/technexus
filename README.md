# TechNexus Docker Demo

Production-style Docker setup for the TechNexus marketplace:

- Frontend: React + Vite served by nginx on `http://localhost:3000`
- Backend: Node.js + Express on `http://localhost:5000`
- Health: `http://localhost:5000/health`
- Database: PostgreSQL 16 Alpine
- Cache: Redis 7

## Run

```bash
docker compose up -d --build
```

This is the supported demo startup path. PostgreSQL stays internal to the Compose network, so no host database port is required.

## Logs

```bash
docker compose logs -f
```

Backend logs are structured JSON in Docker and include `requestId`, route, status code, and response time.
Every response also exposes `X-Request-Id` for correlation.

## Health And Metrics

```bash
curl http://localhost:5000/health
curl http://localhost:5000/observability/metrics
curl http://localhost:5000/metrics
```

- `GET /health` returns backend, database, Redis, and uptime status.
- `GET /observability/metrics` returns JSON runtime counters: uptime, total requests, and error count.
- `GET /metrics` keeps the existing Prometheus-style exposition and now includes runtime HTTP counters in addition to outbox metrics.

The same JSON observability endpoint is also available on `http://localhost:5000/api/observability/metrics`.

NOTE:
Metrics are instance-local and reset on container restart.
For multi-instance deployments, use Prometheus aggregation.

## Monitoring Profile

Optional monitoring services stay off by default.

```bash
docker compose --profile monitoring up -d
```

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001`
- Grafana default credentials: `admin` / `admin`

## Stop

```bash
docker compose down
```

For a clean demo reset:

```bash
docker compose down -v --remove-orphans
docker compose up -d --build
```

## Notes

- The backend waits for PostgreSQL, applies Prisma migrations, seeds demo data when the catalog is empty, and then starts the app.
- Prisma migrations are the only schema bootstrap path for the Docker stack.
- Frontend UI is currently shipped in Spanish (`es`) and is prepared for future i18n expansion through the lightweight constants module in `frontend/src/i18n/es.ts`.
- Demo-only backend credentials are seeded automatically:
  - email: `admin@example.com`
  - password: `DemoAdmin123!`

## Validation

```bash
docker compose ps
curl http://localhost:5000/health
curl http://localhost:3000/healthz
curl http://localhost:3000/api/products
docker compose exec postgres pg_isready -U technexus -d technexus
```

## Backend Tests

```bash
docker compose exec backend npm test
docker compose exec backend npm run test:integration
```

Test mode uses a separate PostgreSQL database by default: `technexus_test`.
Override it with `TEST_POSTGRES_DB` and `TEST_POSTGRES_PORT` if needed. Host-side backend tests expect the Compose PostgreSQL service on `localhost:5433`. The smoke/bootstrap path waits for PostgreSQL, creates the test database when missing, runs `prisma migrate deploy`, and then runs `prisma generate` before seeding.

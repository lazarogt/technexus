# TechNexus Docker Demo

Demo-ready Docker setup for the TechNexus marketplace:

- Frontend: React + Vite on `http://localhost:5173`
- Backend: Node.js + Express on `http://localhost:5000`
- Health: `http://localhost:5000/health`
- Database: PostgreSQL 16 Alpine
- Cache: Redis 7

## Run

```bash
docker compose up -d --build
```

This is the supported demo startup path. PostgreSQL stays internal to the Compose network, so no host database port is required. The frontend is the only public demo entry, and all browser API traffic goes through the Vite `/api` proxy.

For a public tunnel with the bundled ngrok service:

```bash
docker compose --profile ngrok up -d --build
```

Inspect the tunnel locally at `http://localhost:4040`.

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
curl http://localhost:5173/
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
- Docker Compose runs the backend in `production` with structured logs, compiled `dist/` output, and internal database connectivity through the `postgres` service name.
- The frontend container runs the Vite dev server on `5173` and proxies `/api` and `/uploads` internally to `http://backend:5000`, so ngrok only needs to expose the frontend.
- The backend still publishes `5000` locally for health checks, smoke tests, and debugging, but it is not the demo URL shared with clients.
- `POST /api/products` validates product fields and related record ids server-side, derives the seller from the authenticated context for seller accounts, and returns `400` for invalid input/foreign-key issues or `409` for write conflicts instead of surfacing a generic `500`.
- Frontend UI is currently shipped in Spanish (`es`) and is prepared for future i18n expansion through the lightweight constants module in `frontend/src/i18n/es.ts`.
- Demo-only backend credentials are seeded automatically:
  - email: `admin@example.com`
  - password: `DemoAdmin123!`

## Security Defaults

- Express now disables `X-Powered-By`, applies explicit Helmet CSP headers, denies framing, and enables HSTS only in production.
- CORS now reflects the incoming origin and allows credentials so changing ngrok domains do not break the demo flow.
- Global rate limiting defaults to `100` requests per `15` minutes, and `/api/auth/login`, `/api/auth/register`, `/login`, and `/register` are further restricted to `10` requests per `15` minutes.
- Request payload validation is centralized in Zod. Invalid auth payloads, product writes, and query params return `400` before reaching Prisma.
- Product uploads remain under `/uploads`, but uploads are restricted to image MIME types, safe server-generated filenames, `5MB` per file, and five files per request.
- CSRF middleware is intentionally not enabled in this version because the app does not use cookie-backed auth. If auth is later migrated to `httpOnly` cookies, CSRF protection becomes mandatory.

## Required Backend Environment

- `JWT_SECRET` must be a strong non-placeholder secret. Production startup now rejects weak values such as `changeme`.
- `REQUEST_BODY_LIMIT` and `URLENCODED_PARAMETER_LIMIT` control parser limits and are validated at startup.
- See [.env.example](/media/rebeca-lazaro/1CB41B1EB41AF9CA4/Dev/Proyectos sistemas web/TechNexus/.env.example) for the current baseline values.

## Validation

```bash
docker compose ps
curl http://localhost:5000/health
curl http://localhost:5173/
curl http://localhost:5173/api/products
docker compose exec postgres pg_isready -U technexus -d technexus
```

## Demo Entry

- Open `http://localhost:5173/?demo=true` to force the guided demo tour from the first step.
- If the bundled ngrok container is unstable on your machine, run local ngrok instead:

```bash
ngrok http 5173
```

## Backend Tests

```bash
docker compose exec backend npm test
docker compose exec backend npm run test:integration
```

Test mode uses a separate PostgreSQL database by default: `technexus_test`.
Override it with `TEST_POSTGRES_DB` and `TEST_POSTGRES_PORT` if needed. Host-side backend tests expect the Compose PostgreSQL service on `localhost:5433`. The smoke/bootstrap path waits for PostgreSQL, creates the test database when missing, runs `prisma migrate deploy`, and then runs `prisma generate` before seeding.

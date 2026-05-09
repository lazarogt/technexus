# TechNexus Docker Deployment

Production-oriented Docker setup for the TechNexus marketplace:

- Frontend: React + Vite compiled once and served by Nginx on `http://localhost:5173`
- Backend: Node.js + Express on `http://localhost:5000`
- Health: `http://localhost:5000/health` and `http://localhost:5173/healthz`
- Database: PostgreSQL 16 Alpine
- Cache: Redis 7

## Required Environment

Copy `.env.example` to your deployment environment and replace all secrets before exposing the stack publicly.

```bash
cp .env.example .env
```

Minimum production values to review:

- `JWT_SECRET`: strong, unique, non-placeholder secret with at least 32 characters.
- `CORS_ORIGIN`: comma-separated public origins allowed to call the API, for example `https://technexus.example.com`.
- `VITE_SITE_URL`: public storefront origin used in `robots.txt` and `sitemap.xml`.
- `DEMO_MODE`: set to `true` only when the public guided demo should be available.
- `VITE_DEMO_AUTO_START`: keep `false` for production so the guided demo is opt-in.

## Run

```bash
docker compose up -d --build
```

PostgreSQL and Redis stay internal to the Compose network. The frontend is the public entrypoint and proxies `/api` and `/uploads` to the backend through Nginx.

For a public tunnel with the bundled ngrok service:

```bash
docker compose --profile ngrok up -d --build
```

Inspect the tunnel locally at `http://localhost:4040`.

## Logs

```bash
docker compose logs -f
```

Backend logs are structured JSON in Docker and include `requestId`, route, status code, and response time. Every response also exposes `X-Request-Id` for correlation.

## Health And Metrics

```bash
curl http://localhost:5000/health
curl http://localhost:5000/observability/metrics
curl http://localhost:5000/metrics
curl http://localhost:5173/healthz
curl http://localhost:5173/
```

- `GET /health` returns backend, database, Redis, and uptime status.
- `GET /observability/metrics` returns JSON runtime counters: uptime, total requests, and error count.
- `GET /metrics` keeps the Prometheus-style exposition and includes runtime HTTP counters in addition to outbox metrics.
- `GET /healthz` verifies the Nginx frontend container.

The same JSON observability endpoint is also available on `http://localhost:5000/api/observability/metrics`.

NOTE: metrics are instance-local and reset on container restart. For multi-instance deployments, use Prometheus aggregation.

## Monitoring Profile

Optional monitoring services stay off by default.

```bash
docker compose --profile monitoring up -d
```

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001`
- Grafana default credentials: `admin` / `admin` — replace these before public exposure.

## Stop

```bash
docker compose down
```

For a clean demo reset:

```bash
docker compose down -v --remove-orphans
docker compose up -d --build
```

## Deployment Notes

- The backend waits for PostgreSQL, applies Prisma migrations, seeds demo data when the catalog is empty, and then starts the app.
- Prisma migrations are the only schema bootstrap path for the Docker stack.
- Docker Compose runs the backend in `production` with structured logs, compiled `dist/` output, and internal database connectivity through the `postgres` service name.
- The frontend image now uses the production Nginx runner, not the Vite dev server.
- SEO assets are generated from the catalog API when available. Outside CI, the build can fall back to a minimal sitemap if the API is not reachable; set `SEO_ASSETS_ALLOW_FALLBACK=false` in strict pipelines.
- `POST /api/products` validates product fields and related record ids server-side, derives the seller from the authenticated context for seller accounts, and returns `400` for invalid input/foreign-key issues or `409` for write conflicts instead of surfacing a generic `500`.
- Frontend UI is currently shipped in Spanish (`es`) and is prepared for future i18n expansion through translation resources.
- Demo-only backend credentials are seeded automatically for controlled demo environments:
  - email: `admin@example.com`
  - password: `DemoAdmin123!`

## Public Demo Tour

The guided DemoTour is opt-in for visitors:

- Set `DEMO_MODE=true` and `VITE_DEMO_AUTO_START=false`.
- Visitors will see an `Iniciar tour demo` action instead of being forced into demo mode.
- Opening `/?demo=true` starts the guided tour from the first step.
- The tour can switch between customer, seller, and admin demo roles using `/api/auth/demo-session`.

Only enable `DEMO_MODE=true` against disposable demo data or a restricted demo environment. The route intentionally creates public demo sessions so visitors can see the marketplace operating.

## Security Defaults

- Express disables `X-Powered-By`, applies explicit Helmet CSP headers, denies framing, and enables HSTS in production.
- CORS allows credentials only for origins listed in `CORS_ORIGIN`; unconfigured origins are not reflected.
- Global rate limiting defaults to `100` requests per `15` minutes, and `/api/auth/login`, `/api/auth/register`, `/login`, and `/register` are further restricted to `10` requests per `15` minutes.
- Request payload validation is centralized in Zod. Invalid auth payloads, product writes, and query params return `400` before reaching Prisma.
- Product uploads remain under `/uploads`, but uploads are restricted to image MIME types, safe server-generated filenames, `5MB` per file, and five files per request.
- CSRF middleware is intentionally not enabled in this version because the app does not use cookie-backed auth. If auth is later migrated to `httpOnly` cookies, CSRF protection becomes mandatory.

## Validation

```bash
docker compose ps
curl http://localhost:5000/health
curl http://localhost:5173/healthz
curl http://localhost:5173/
curl http://localhost:5173/api/products
docker compose exec postgres pg_isready -U technexus -d technexus
```

## Backend Tests

```bash
docker compose exec backend npm test
docker compose exec backend npm run test:integration
```

Test mode uses a separate PostgreSQL database by default: `technexus_test`. Override it with `TEST_POSTGRES_DB` and `TEST_POSTGRES_PORT` if needed. Host-side backend tests expect the Compose PostgreSQL service on `localhost:5433`. The smoke/bootstrap path waits for PostgreSQL, creates the test database when missing, runs `prisma migrate deploy`, and then runs `prisma generate` before seeding.

## Production Hardening Notes

Recent marketplace hardening keeps the existing cash-on-delivery architecture while tightening critical production flows:

- Checkout now validates the live transactional cart before creating an order, rejects unavailable or stale-stock products, consumes cart rows before order creation to prevent duplicate double-submit orders, and reserves inventory with guarded decrement updates.
- Cart additions use transactional quantity increments and seller availability checks so blocked/deleted seller products cannot be added and concurrent adds do not silently overwrite quantities.
- Product catalog sorting includes deterministic tie-breakers for stable pagination across repeated requests.
- The checkout UI blocks invalid shipping totals, stale over-stock cart lines, and repeated submits; failed checkout attempts refresh the server cart snapshot so the user can recover from inventory changes.


# TechNexus Frontend

Standalone React + TypeScript + Vite frontend for TechNexus. It consumes the existing backend through `/api/*` and keeps storefront UI separated from dashboard UI.

## What ships here

- `StoreLayout` for public storefront routes:
  - `/`
  - `/products`
  - `/category/:id`
  - `/product/:id`
  - `/cart`
  - `/checkout`
- `DashboardLayout` for authenticated product surfaces:
  - `/account/*`
  - `/seller/*`
  - `/admin/*`
- Admin analytics route:
  - `/admin/analytics`
- Role-aware auth and guest session handling backed by the existing JWT API
- Product CRUD using multipart upload plus image URLs
- Cart and COD checkout using existing order/cart endpoints
- Inventory alerts and email outbox operations for admin/seller views
- Frontend localization with `i18next` + `react-i18next`
  - default UI language is Spanish (`es`)
  - translation resources live in `src/locales/en/translation.json` and `src/locales/es/translation.json`
  - `src/i18n.ts` bootstraps the app-wide i18n instance
- Conversion-focused storefront UX:
  - richer product cards with trust and stock cues
  - sticky buy box and mobile add-to-cart CTA
  - mini-cart dropdown/sheet with quick checkout
  - stepped checkout flow on the existing `/checkout` route
  - toast feedback and skeleton loaders for perceived speed
- Non-blocking analytics collection with provider switching:
  - `internal` mode posts compact events to `/api/analytics`
  - `posthog` mode forwards the same events to PostHog
  - storefront tracks product views, cart behavior, checkout start, and order completion
  - admin analytics view reads local metrics from `/api/admin/analytics/overview`

## Docker runtime

The default local stack is production-like and Docker-first:

```bash
docker compose up -d --build
```

You can automate the full local bootstrap, port-conflict handling, validation, Playwright run, and analytics smoke checks with:

```bash
./scripts/dev/start-local.sh
```

Runtime endpoints:

- frontend: `http://localhost:3000`
- backend: `http://localhost:5000`

The frontend is served through nginx and proxies both `/api/*` and `/uploads/*` to the backend container on port `5000`, so the existing route contracts stay unchanged.

The compose stack uses service-local Dockerfiles at `backend/Dockerfile` and `frontend/Dockerfile`, `postgres:16-alpine`, `redis:7-alpine`, and a named `postgres_data` volume for persistence.

The backend applies Prisma migrations, bootstraps the seeded users when missing, and runs `npm run db:demo` only when the catalog is empty, so restarts stay stable while fresh volumes still come up with demo data. PostgreSQL is internal-only in Docker; validation goes through `docker compose exec postgres ...` rather than a host-published database port.

The public demo endpoints stay fixed at `http://localhost:3000` and `http://localhost:5000`.

## Local development

1. For non-Docker frontend work, start the existing backend on its configured local port from `backend/.env`
2. Install dependencies in this folder:

```bash
npm install
```

3. Start the frontend:

```bash
npm run dev
```

Vite proxies both `/api` and `/uploads` to the backend, so the frontend can use backend-relative paths without rewriting contracts.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run test
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:debug
```

## Analytics

Storefront analytics is opt-in and non-blocking. When the provider is missing or misconfigured, the UI silently falls back to a no-op runtime.

- Frontend env values:
  - `VITE_ANALYTICS_PROVIDER=internal|posthog`
  - `VITE_POSTHOG_KEY`
  - `VITE_POSTHOG_HOST`
- Backend env value:
  - `ANALYTICS_PROVIDER=internal|posthog`

Tracked events:

- `view_home`
- `view_product`
- `add_to_cart`
- `view_cart`
- `start_checkout`
- `complete_order`

`internal` mode sends events to `/api/analytics` with a browser-stable analytics session ID. The backend accepts the event asynchronously, stores it in PostgreSQL, and never blocks the user flow if analytics persistence fails.

## Playwright E2E

The Playwright suite lives in `e2e/` and runs against the real frontend plus real backend APIs. It does not mock `/api/*`.

- Default local mode targets the dockerized nginx frontend on `http://localhost:3000`
- `e2e/global-setup.ts` brings up `postgres`, `redis`, `backend`, and `frontend`, resets PostgreSQL through the backend container, reseeds the database, provisions E2E users/catalog data, and waits for both backend and frontend readiness
- Vite mode remains available for CI or fast local runs with `E2E_USE_VITE=true`
- Vite mode still uses the Dockerized backend and database services

Run the suite with:

```bash
docker compose up -d --build
cd frontend
npm run test:e2e
```

For the full automated local validation against Docker + nginx, use:

```bash
./scripts/dev/start-local.sh
```

Use the old Vite target explicitly with:

```bash
cd frontend
E2E_USE_VITE=true npm run test:e2e
```

## CI

GitHub Actions CI lives in `.github/workflows/ci.yml`.

- Uses a real PostgreSQL service for integration checks
- Builds backend and frontend
- Runs backend unit tests, smoke tests, and Playwright E2E
- Starts the backend before Playwright and expects the configured local backend port to be reachable
- Runs Playwright in external-services mode with `E2E_USE_VITE=true`, so CI keeps its current managed-backend path while local default stays nginx on `:80`

## Architecture

- `src/app/*`: router, providers, guards
- `src/layouts/*`: `StoreLayout` and `DashboardLayout`
- `src/features/api/*`: typed backend client
- `src/features/auth/*`: user + guest session bootstrap
- `src/features/cart/*`: cart state and checkout bridge
- `src/components/*`: shared storefront and dashboard components
- `src/pages/*`: route screens only
- `src/styles/index.css`: global design system and responsive layout rules

## Notes

- The frontend does not modify or depend on backend internals beyond the published route contracts.
- Legacy backend routes remain intact because the UI talks to `/api/*` and the backend continues exposing legacy endpoints on its own.
- If Docker-owned files in `backend/uploads` cause host permission issues during smoke runs, use `UPLOADS_DIR=/tmp/technexus-uploads`.

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
docker-compose up --build
```

You can automate the full local bootstrap, port-conflict handling, validation, Playwright run, and analytics smoke checks with:

```bash
./scripts/dev/start-local.sh
```

Runtime endpoints:

- frontend: `http://localhost`
- backend: `http://localhost:4000`
- database: `localhost:5432`

The frontend is served through nginx and proxies both `/api/*` and `/uploads/*` to the backend container, so the existing route contracts stay unchanged.

If `5432` is already in use locally, the automation script keeps your local process intact and publishes the Docker PostgreSQL container on the next free port starting at `5433`.

The script keeps `http://localhost` and `http://localhost:4000` fixed. If `80` or `4000` are occupied by another process after Docker shutdown, it fails explicitly instead of remapping them.

When Docker image builds fail because of network or npm timeouts, the script retries the build once with plain Docker progress logs. If it still fails, it preserves the temporary artifact directory and log files for inspection.

## Local development

1. For non-Docker frontend work, start the existing backend on `http://localhost:4000`
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

- Default local mode targets the dockerized nginx frontend on `http://localhost`
- `e2e/global-setup.ts` brings up `db`, `backend`, and `frontend`, resets PostgreSQL, reseeds the database, provisions E2E users/catalog data, and waits for both backend and frontend readiness
- Vite mode remains available for CI or fast local runs with `E2E_USE_VITE=true`
- When Vite mode is active and the backend Docker image is slow to rebuild locally, the harness can still fall back to a local backend process in a writable `.e2e-runtime/` directory

Run the suite with:

```bash
docker-compose up --build -d
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

- Uses a real PostgreSQL service on `localhost:5433`
- Builds backend and frontend
- Runs backend unit tests, smoke tests, and Playwright E2E
- Starts the backend on `http://localhost:4000` before Playwright
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

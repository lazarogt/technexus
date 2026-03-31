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
- Role-aware auth and guest session handling backed by the existing JWT API
- Product CRUD using multipart upload plus image URLs
- Cart and COD checkout using existing order/cart endpoints
- Inventory alerts and email outbox operations for admin/seller views

## Local development

1. Start the existing backend on `http://localhost:4000`
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

## Playwright E2E

The Playwright suite lives in `e2e/` and runs against the real frontend plus real backend APIs. It does not mock `/api/*`.

- `playwright.config.ts` starts Vite on `http://localhost:5173`
- `e2e/global-setup.ts` resets PostgreSQL, reseeds the database, provisions E2E users/catalog data, and waits for the backend on `http://localhost:4000`
- When the backend Docker image is slow to rebuild locally, the harness falls back to a local backend process in a writable `.e2e-runtime/` directory so multipart upload flows still work without changing backend code

Run the suite with:

```bash
docker-compose up -d
cd frontend
npm run test:e2e
```

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

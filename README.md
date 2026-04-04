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

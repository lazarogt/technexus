#!/bin/sh
set -eu

docker compose down --volumes --remove-orphans
docker volume rm -f laptop-store_postgres_data >/dev/null 2>&1 || true
docker volume rm -f technexus_laptop-store_postgres_data >/dev/null 2>&1 || true
mkdir -p uploads

printf '%s\n' "PostgreSQL reset complete."

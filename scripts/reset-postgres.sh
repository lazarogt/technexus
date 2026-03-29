#!/bin/sh
set -eu

docker compose down --volumes --remove-orphans
docker volume rm -f technexus_postgres_data >/dev/null 2>&1 || true
docker volume rm -f technexus_technexus_postgres_data >/dev/null 2>&1 || true
mkdir -p uploads

printf '%s\n' "PostgreSQL reset complete."

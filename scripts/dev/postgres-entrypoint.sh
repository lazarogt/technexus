#!/bin/sh
set -eu

DATA_ROOT="/var/lib/postgresql/data"
PGDATA_DIR="${PGDATA:-$DATA_ROOT/pgdata}"

find_version_file() {
  if [ -f "$PGDATA_DIR/PG_VERSION" ]; then
    printf '%s\n' "$PGDATA_DIR/PG_VERSION"
    return
  fi

  if [ -f "$DATA_ROOT/PG_VERSION" ]; then
    printf '%s\n' "$DATA_ROOT/PG_VERSION"
    return
  fi

  find "$DATA_ROOT" -maxdepth 3 -name PG_VERSION -print 2>/dev/null | head -n 1 || true
}

VERSION_FILE="$(find_version_file)"

if [ -n "$VERSION_FILE" ]; then
  VERSION="$(cat "$VERSION_FILE" 2>/dev/null || true)"
  MAJOR_VERSION="$(printf '%s' "$VERSION" | cut -d. -f1)"

  if [ -n "$MAJOR_VERSION" ] && [ "$MAJOR_VERSION" != "16" ]; then
    echo "TechNexus: detected PostgreSQL data version $VERSION in $VERSION_FILE. Resetting postgres_data for PostgreSQL 16."
    find "$DATA_ROOT" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  fi
fi

mkdir -p "$PGDATA_DIR"

exec docker-entrypoint.sh postgres

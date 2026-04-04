#!/bin/sh
set -eu

max_attempts="${DB_BOOTSTRAP_RETRIES:-15}"
delay_seconds="${DB_BOOTSTRAP_DELAY_SECONDS:-2}"
attempt=1

while true; do
  echo "Running Prisma migrations (attempt ${attempt}/${max_attempts})..."

  if npm run db:deploy; then
    echo "Prisma migrations applied successfully."
    break
  fi

  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Prisma migrations failed after ${attempt} attempts."
    exit 1
  fi

  echo "Database not ready for migrations yet. Retrying in ${delay_seconds}s..."
  attempt=$((attempt + 1))
  sleep "$delay_seconds"
done

echo "Running Docker bootstrap seed..."
npm run docker:bootstrap

exec "$@"

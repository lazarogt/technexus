#!/bin/sh
set -eu

log_info() {
  printf '{"level":"info","time":"%s","component":"docker-entrypoint","message":"%s"}\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$1"
}

log_error() {
  printf '{"level":"error","time":"%s","component":"docker-entrypoint","message":"%s"}\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$1"
}

max_attempts="${DB_BOOTSTRAP_RETRIES:-15}"
delay_seconds="${DB_BOOTSTRAP_DELAY_SECONDS:-2}"
attempt=1

while true; do
  log_info "Running Prisma migrations (attempt ${attempt}/${max_attempts})"

  if npm run db:deploy; then
    log_info "Prisma migrations applied successfully"
    break
  fi

  if [ "$attempt" -ge "$max_attempts" ]; then
    log_error "Prisma migrations failed after ${attempt} attempts"
    exit 1
  fi

  log_info "Database not ready for migrations yet. Retrying in ${delay_seconds}s"
  attempt=$((attempt + 1))
  sleep "$delay_seconds"
done

log_info "Running Docker bootstrap seed"
npm run docker:bootstrap

exec "$@"

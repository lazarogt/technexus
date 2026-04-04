#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/technexus-local.XXXXXX")"
COMPOSE_OVERRIDE_PATH="$TMP_DIR/docker-compose.override.yml"
BUILD_LOG_PATH="$TMP_DIR/docker-build.log"
BACKEND_LOG_PATH="$TMP_DIR/backend.log"
FRONTEND_LOG_PATH="$TMP_DIR/frontend.log"
KEEP_TEMP_DIR=1
PORT_80_STATUS="unchecked"
PORT_4000_STATUS="unchecked"

declare -A RESULTS=(
  [docker_build]="pending"
  [healthchecks]="pending"
  [stack]="pending"
  [backend_tests]="pending"
  [backend_smoke]="pending"
  [frontend_build]="pending"
  [frontend_lint]="pending"
  [frontend_tests]="pending"
  [playwright_internal]="pending"
  [analytics_internal]="pending"
  [analytics_posthog]="pending"
)

log() {
  printf '[technexus-local] %s\n' "$*"
}

cleanup() {
  if [[ "$KEEP_TEMP_DIR" == "0" ]]; then
    rm -rf "$TMP_DIR"
    return
  fi

  log "Keeping temporary artifacts at $TMP_DIR"
}

trap cleanup EXIT

fail() {
  local message="$1"

  log "$message"
  capture_logs
  print_summary "failed"
  exit 1
}

require_command() {
  local command_name="$1"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    fail "Missing required command: $command_name"
  fi
}

port_in_use() {
  local port="$1"

  if command -v lsof >/dev/null 2>&1; then
    lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
    return $?
  fi

  if command -v ss >/dev/null 2>&1; then
    ss -ltn "sport = :$port" | tail -n +2 | grep -q .
    return $?
  fi

  fail "Neither lsof nor ss is available to inspect local ports"
}

find_next_free_port() {
  local port="$1"

  while port_in_use "$port"; do
    port=$((port + 1))
  done

  printf '%s\n' "$port"
}

port_listener_details() {
  local port="$1"

  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null | tail -n +2 | tr '\n' '; '
    return 0
  fi

  if command -v ss >/dev/null 2>&1; then
    ss -ltnp "sport = :$port" 2>/dev/null | tail -n +2 | tr '\n' '; '
    return 0
  fi

  printf 'unknown'
}

compose_base() {
  (
    cd "$ROOT_DIR" &&
      docker compose --env-file .env.docker -f docker-compose.yml "$@"
  )
}

compose() {
  (
    cd "$ROOT_DIR" &&
      docker compose --env-file .env.docker -f docker-compose.yml -f "$COMPOSE_OVERRIDE_PATH" "$@"
  )
}

write_compose_override() {
  local analytics_provider="$1"

  cat >"$COMPOSE_OVERRIDE_PATH" <<EOF
services:
  backend:
    environment:
      ANALYTICS_PROVIDER: "${analytics_provider}"
  frontend:
    build:
      args:
        VITE_ANALYTICS_PROVIDER: "${analytics_provider}"
        VITE_POSTHOG_KEY: "${VITE_POSTHOG_KEY:-}"
        VITE_POSTHOG_HOST: "${VITE_POSTHOG_HOST:-https://app.posthog.com}"
EOF
}

wait_for_http() {
  local label="$1"
  local url="$2"
  local timeout_seconds="$3"
  local started_at
  started_at="$(date +%s)"

  while (( "$(date +%s)" - started_at < timeout_seconds )); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi

    sleep 2
  done

  fail "$label was not ready at $url within ${timeout_seconds}s"
}

ensure_fixed_port_available() {
  local port="$1"
  local label="$2"
  local details

  if port_in_use "$port"; then
    if [[ "$port" == "3000" ]]; then
      PORT_80_STATUS="occupied"
    fi

    if [[ "$port" == "5000" ]]; then
      PORT_4000_STATUS="occupied"
    fi

    details="$(port_listener_details "$port")"
    fail "Required port ${port} for ${label} is busy after docker shutdown. Listener details: ${details:-unavailable}"
  fi
}

wait_for_compose_health() {
  local service="$1"
  local timeout_seconds="$2"
  local started_at
  local container_id
  local status

  started_at="$(date +%s)"

  while (( "$(date +%s)" - started_at < timeout_seconds )); do
    container_id="$(compose ps -q "$service" | tr -d '\n')"

    if [[ -n "$container_id" ]]; then
      status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id" 2>/dev/null || true)"

      if [[ "$status" == "healthy" || "$status" == "running" ]]; then
        return 0
      fi
    fi

    sleep 2
  done

  fail "Service $service did not become healthy within ${timeout_seconds}s"
}

capture_logs() {
  compose logs --tail=200 backend >"$BACKEND_LOG_PATH" 2>&1 || true
  compose logs --tail=200 frontend >"$FRONTEND_LOG_PATH" 2>&1 || true
}

docker_port_bindable() {
  return 0
}

run_compose_build() {
  local attempt="$1"

  log "Docker build attempt ${attempt}/2"
  (
    cd "$ROOT_DIR" &&
      DOCKER_BUILDKIT=0 COMPOSE_DOCKER_CLI_BUILD=0 docker compose --env-file .env.docker -f docker-compose.yml -f "$COMPOSE_OVERRIDE_PATH" build backend frontend
  ) 2>&1 | tee -a "$BUILD_LOG_PATH"
}

build_compose_images() {
  : >"$BUILD_LOG_PATH"

  if run_compose_build 1; then
    return 0
  fi

  log "Docker build failed on attempt 1. Retrying once."
  sleep 2

  if run_compose_build 2; then
    return 0
  fi

  return 1
}

print_summary() {
  local overall_status="$1"

  echo
  echo "TECHNEXUS_LOCAL_SUMMARY status=${overall_status}"
  echo "TECHNEXUS_LOCAL_SUMMARY postgres_network_access=internal-only"
  echo "TECHNEXUS_LOCAL_SUMMARY port_3000_status=${PORT_80_STATUS}"
  echo "TECHNEXUS_LOCAL_SUMMARY port_5000_status=${PORT_4000_STATUS}"
  for key in docker_build healthchecks stack backend_tests backend_smoke frontend_build frontend_lint frontend_tests playwright_internal analytics_internal analytics_posthog; do
    echo "TECHNEXUS_LOCAL_SUMMARY ${key}=${RESULTS[$key]}"
  done
  echo "TECHNEXUS_LOCAL_SUMMARY docker_ps_begin"
  compose ps || true
  echo "TECHNEXUS_LOCAL_SUMMARY docker_ps_end"

  if [[ "$overall_status" != "passed" ]]; then
    echo "TECHNEXUS_LOCAL_SUMMARY temp_dir=${TMP_DIR}"
    echo "TECHNEXUS_LOCAL_SUMMARY docker_build_log=${BUILD_LOG_PATH}"
    echo "TECHNEXUS_LOCAL_SUMMARY backend_log=${BACKEND_LOG_PATH}"
    echo "TECHNEXUS_LOCAL_SUMMARY frontend_log=${FRONTEND_LOG_PATH}"
    if [[ -f "$BUILD_LOG_PATH" ]]; then
      echo "TECHNEXUS_LOCAL_SUMMARY docker_build_log_tail_begin"
      tail -n 80 "$BUILD_LOG_PATH" || true
      echo "TECHNEXUS_LOCAL_SUMMARY docker_build_log_tail_end"
    fi
    if [[ -f "$BACKEND_LOG_PATH" ]]; then
      echo "TECHNEXUS_LOCAL_SUMMARY backend_log_tail_begin"
      tail -n 60 "$BACKEND_LOG_PATH" || true
      echo "TECHNEXUS_LOCAL_SUMMARY backend_log_tail_end"
    fi
    if [[ -f "$FRONTEND_LOG_PATH" ]]; then
      echo "TECHNEXUS_LOCAL_SUMMARY frontend_log_tail_begin"
      tail -n 60 "$FRONTEND_LOG_PATH" || true
      echo "TECHNEXUS_LOCAL_SUMMARY frontend_log_tail_end"
    fi
  fi
}

run_checked_step() {
  local result_key="$1"
  local label="$2"
  shift 2

  log "$label"
  if "$@"; then
    RESULTS["$result_key"]="passed"
    return 0
  fi

  RESULTS["$result_key"]="failed"
  fail "Step failed: $label"
}

run_in_dir() {
  local workdir="$1"
  shift
  (
    cd "$workdir" &&
      "$@"
  )
}

backend_env_command() {
  env UPLOADS_DIR=/tmp/technexus-uploads "$@"
}

frontend_build_env_command() {
  env \
    VITE_ANALYTICS_PROVIDER="$1" \
    VITE_POSTHOG_KEY="${VITE_POSTHOG_KEY:-}" \
    VITE_POSTHOG_HOST="${VITE_POSTHOG_HOST:-https://app.posthog.com}" \
    "${@:2}"
}

playwright_env_command() {
  env \
    E2E_EXTERNAL_SERVICES=true \
    E2E_ANALYTICS_PROVIDER="$1" \
    E2E_FRONTEND_URL=http://localhost:3000 \
    E2E_API_URL=http://localhost:5000/api \
    E2E_HEALTH_URL=http://localhost:5000/health \
    E2E_FRONTEND_HEALTH_URL=http://localhost:3000/healthz \
    "${@:2}"
}

login_admin_token() {
  curl -fsS \
    -X POST \
    http://localhost:5000/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"admin@example.com","password":"DemoAdmin123!"}' \
    | node -e 'let data="";process.stdin.on("data",(chunk)=>data+=chunk);process.stdin.on("end",()=>{const parsed=JSON.parse(data);process.stdout.write(parsed.token ?? "");});'
}

validate_internal_analytics_api() {
  local token
  local overview

  token="$(login_admin_token)"

  if [[ -z "$token" ]]; then
    return 1
  fi

  overview="$(
    curl -fsS \
      http://localhost:5000/api/admin/analytics/overview?range=24h \
      -H "Authorization: Bearer $token"
  )"

  EXPECTED_PROVIDER="internal" node -e '
    let input = "";
    process.stdin.on("data", (chunk) => (input += chunk));
    process.stdin.on("end", () => {
      const overview = JSON.parse(input);
      if (overview.provider !== process.env.EXPECTED_PROVIDER) process.exit(1);
      if (!overview.funnel || overview.funnel.viewHome < 1) process.exit(1);
      if (!Array.isArray(overview.recentEvents) || overview.recentEvents.length < 1) process.exit(1);
    });
  ' <<<"$overview"
}

validate_posthog_analytics_api() {
  local token
  local overview

  token="$(login_admin_token)"

  if [[ -z "$token" ]]; then
    return 1
  fi

  overview="$(
    curl -fsS \
      http://localhost:5000/api/admin/analytics/overview?range=24h \
      -H "Authorization: Bearer $token"
  )"

  EXPECTED_PROVIDER="posthog" node -e '
    let input = "";
    process.stdin.on("data", (chunk) => (input += chunk));
    process.stdin.on("end", () => {
      const overview = JSON.parse(input);
      if (overview.provider !== process.env.EXPECTED_PROVIDER) process.exit(1);
    });
  ' <<<"$overview"
}

run_posthog_smoke() {
  bootstrap_stack posthog postgres backend frontend
  validate_posthog_analytics_api
  run_in_dir "$ROOT_DIR/frontend" playwright_env_command posthog npm run test:e2e -- e2e/analytics.spec.ts
}

bootstrap_stack() {
  local analytics_provider="$1"
  local build_services=("$@")

  write_compose_override "$analytics_provider"
  compose down --remove-orphans || true
  ensure_fixed_port_available 3000 "frontend nginx"
  ensure_fixed_port_available 5000 "backend api"
  PORT_80_STATUS="free"
  PORT_4000_STATUS="free"

  run_in_dir "$ROOT_DIR/frontend" frontend_build_env_command "$analytics_provider" npm run build

  if build_compose_images; then
    RESULTS[docker_build]="passed"
  else
    RESULTS[docker_build]="failed"
    fail "Docker image build failed after one retry."
  fi

  compose up -d "${build_services[@]:1}"
  wait_for_compose_health postgres 120
  wait_for_compose_health backend 180
  wait_for_compose_health frontend 180
  wait_for_http "Backend health" "http://localhost:5000/health" 120
  wait_for_http "Frontend health" "http://localhost:3000/healthz" 120
  wait_for_http "Frontend homepage" "http://localhost:3000" 120
  wait_for_http "Frontend API proxy" "http://localhost:3000/api/products" 120
  RESULTS[healthchecks]="passed"
}

main() {
  require_command docker
  require_command curl
  require_command node
  require_command npm
  mkdir -p /tmp/technexus-uploads
  compose_base down --remove-orphans || true

  run_checked_step stack "Bootstrapping internal-mode Docker stack" bootstrap_stack internal postgres backend frontend

  run_checked_step backend_tests "Running backend unit tests" \
    compose exec -T backend npm test

  run_checked_step backend_smoke "Running backend smoke tests" \
    compose exec -T backend npm run test:smoke

  run_checked_step frontend_build "Building frontend locally" \
    run_in_dir "$ROOT_DIR/frontend" npm run build

  run_checked_step frontend_lint "Linting frontend locally" \
    run_in_dir "$ROOT_DIR/frontend" npm run lint

  run_checked_step frontend_tests "Running frontend unit tests" \
    run_in_dir "$ROOT_DIR/frontend" npm test

  run_checked_step playwright_internal "Running Playwright against nginx frontend" \
    run_in_dir "$ROOT_DIR/frontend" playwright_env_command internal npm run test:e2e

  run_checked_step analytics_internal "Validating internal analytics API overview" validate_internal_analytics_api

  run_checked_step analytics_posthog "Switching to posthog-mode smoke validation" run_posthog_smoke

  KEEP_TEMP_DIR=0
  print_summary "passed"
}

main "$@"

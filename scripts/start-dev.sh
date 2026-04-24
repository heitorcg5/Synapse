#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/infra/docker-compose.yml"

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose -f "$COMPOSE_FILE")
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose -f "$COMPOSE_FILE")
else
  echo "Error: docker compose is required." >&2
  exit 1
fi

MODE="${1:-db}"

case "$MODE" in
  db)
    echo "Starting PostgreSQL (development mode)..."
    "${COMPOSE_CMD[@]}" up -d postgres
    ;;
  full)
    echo "Starting full stack (postgres + backend + frontend)..."
    "${COMPOSE_CMD[@]}" up -d
    ;;
  *)
    echo "Usage: $0 [db|full]"
    echo "  db   - start only postgres for local backend/frontend"
    echo "  full - start all services from docker-compose"
    exit 1
    ;;
esac

echo "Waiting for postgres healthcheck..."
for i in {1..30}; do
  if "${COMPOSE_CMD[@]}" ps postgres | rg -q "healthy"; then
    echo "PostgreSQL is healthy."
    break
  fi
  sleep 1
done

echo
echo "Done."
echo "- API (when backend is running): http://localhost:8080/api"
echo "- Frontend (when frontend is running): http://localhost:5173"
echo
echo "Tip:"
echo "  backend local : cd backend && mvn spring-boot:run"
echo "  frontend local: cd frontend && npm run dev"

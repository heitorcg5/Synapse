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

echo "This will remove Synapse database data (docker volume)."
read -r -p "Continue? [y/N] " answer
if [[ ! "$answer" =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 0
fi

echo "Stopping services..."
"${COMPOSE_CMD[@]}" down

echo "Removing postgres volume..."
"${COMPOSE_CMD[@]}" down -v

echo "Starting fresh postgres container..."
"${COMPOSE_CMD[@]}" up -d postgres

echo "Waiting for postgres healthcheck..."
for i in {1..30}; do
  if "${COMPOSE_CMD[@]}" ps postgres | rg -q "healthy"; then
    echo "PostgreSQL is healthy and reset."
    exit 0
  fi
  sleep 1
done

echo "Warning: postgres did not reach healthy status in time."
exit 1

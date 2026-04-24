#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:8080/api}"
SEED_EMAIL="${SEED_EMAIL:-demo@synapse.local}"
SEED_PASSWORD="${SEED_PASSWORD:-synapse123}"

if ! command -v curl >/dev/null 2>&1; then
  echo "Error: curl is required." >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "Error: python3 is required." >&2
  exit 1
fi

echo "Seeding data against: $API_URL"
echo "Using user: $SEED_EMAIL"

register_payload="$(cat <<EOF
{"email":"$SEED_EMAIL","password":"$SEED_PASSWORD"}
EOF
)"

register_resp="$(curl -sS -o /tmp/synapse-register.json -w "%{http_code}" \
  -H "Content-Type: application/json" \
  -d "$register_payload" \
  "$API_URL/auth/register" || true)"

if [[ "$register_resp" == "201" ]]; then
  auth_json="$(cat /tmp/synapse-register.json)"
  echo "Registered seed user."
elif [[ "$register_resp" == "400" ]]; then
  echo "Seed user already exists, logging in..."
  login_resp="$(curl -sS -o /tmp/synapse-login.json -w "%{http_code}" \
    -H "Content-Type: application/json" \
    -d "$register_payload" \
    "$API_URL/auth/login")"
  if [[ "$login_resp" != "200" ]]; then
    echo "Error: login failed with status $login_resp"
    cat /tmp/synapse-login.json
    exit 1
  fi
  auth_json="$(cat /tmp/synapse-login.json)"
else
  echo "Error: register failed with status $register_resp"
  cat /tmp/synapse-register.json
  exit 1
fi

TOKEN="$(python3 -c 'import json,sys; print(json.loads(sys.stdin.read())["accessToken"])' <<< "$auth_json")"

auth_header=(-H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json")

create_folder() {
  local name="$1"
  curl -sS -X POST "${auth_header[@]}" \
    -d "{\"name\":\"$name\"}" \
    "$API_URL/content/folders" >/dev/null
}

create_content() {
  local type="$1"
  local source_url="$2"
  local raw_content="$3"
  curl -sS -X POST "${auth_header[@]}" \
    -d "{\"type\":\"$type\",\"sourceUrl\":\"$source_url\",\"rawContent\":\"$raw_content\"}" \
    "$API_URL/content" >/dev/null
}

echo "Creating sample folders..."
create_folder "Programming"
create_folder "Research"

echo "Creating sample captures..."
create_content "WEB" "https://spring.io/guides" "Spring guides and references"
create_content "VIDEO" "https://youtu.be/dQw4w9WgXcQ" "Video capture for testing flow"
create_content "TEXT" "" "This is a sample text capture for Synapse seed data."

echo "Seed completed successfully."
echo "You can now log in with: $SEED_EMAIL / $SEED_PASSWORD"

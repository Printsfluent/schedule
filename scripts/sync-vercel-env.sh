#!/usr/bin/env bash
# Push local .env Firebase vars to Vercel (production + preview + development).
# Prerequisite: npx vercel login && npx vercel link
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${1:-$ROOT/.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE"
  exit 1
fi

VARS=(
  VITE_FIREBASE_API_KEY
  VITE_FIREBASE_AUTH_DOMAIN
  VITE_FIREBASE_PROJECT_ID
  VITE_FIREBASE_APP_ID
  VITE_FIREBASE_SKIP_EMAIL_VERIFICATION
)

echo "Syncing Firebase env vars from $ENV_FILE to Vercel…"

for key in "${VARS[@]}"; do
  value="$(grep -E "^${key}=" "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '\r\n' || true)"
  if [[ -z "$value" || "$value" == *$'\n'* || "$value" == VITE_* ]]; then
    echo "  skip $key (not in env file)"
    continue
  fi
  echo "  set $key (production)"
  npx vercel env add "$key" production --value "$value" --yes --force --no-sensitive
done

echo "Done. Redeploy for changes to take effect: npm run deploy"

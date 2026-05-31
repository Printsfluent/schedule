#!/usr/bin/env bash
# Builds Rhythm and prints a public HTTPS link (works on any device worldwide).
# Link stays live while this script runs. Ctrl+C to stop.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Building Rhythm..."
npm run build

echo "Starting local preview..."
npx vite preview --port 5173 --host 127.0.0.1 &
PREVIEW_PID=$!
cleanup() { kill "$PREVIEW_PID" 2>/dev/null || true }
trap cleanup EXIT INT TERM

sleep 2
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Share the URL below — opens on iPhone, Android, Mac, PC"
echo "  Each person gets their own private data on their device."
echo "  Press Ctrl+C to stop sharing."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npx --yes cloudflared tunnel --url "http://127.0.0.1:5173"

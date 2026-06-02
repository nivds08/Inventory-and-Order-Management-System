#!/bin/sh
set -e

# Railway often injects PORT=8080 while public Networking may route to 8000.
# Fix: In Railway → backend service → Variables → add PORT = 8000 (if Networking shows 8000)
#   OR change Networking port to match whatever appears in the log below.
PORT="${PORT:-8000}"

echo "================================================"
echo " API listening on http://0.0.0.0:${PORT}"
echo " Railway Networking port MUST match: ${PORT}"
echo "================================================"

exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port "${PORT}" \
  --proxy-headers \
  --forwarded-allow-ips='*'

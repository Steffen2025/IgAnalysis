#!/usr/bin/env bash
# Run on the Hostinger VPS from /opt/botlogix-ig-analysis after git pull.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.vps.yml"

echo "==> Patch Traefik file routes (audit.botlogix.ca)"
python3 "$ROOT/deploy/patch-traefik-audit.py"

echo "==> Build dashboard image"
$COMPOSE build dashboard

echo "==> Migrate database"
$COMPOSE run --rm dashboard npm run migrate

echo "==> Start Postgres + dashboard"
$COMPOSE up -d

echo "==> Status"
$COMPOSE ps

echo "==> Health (in-container)"
$COMPOSE exec -T dashboard node -e \
  "fetch('http://127.0.0.1:5057/healthz').then(r=>{console.log('healthz',r.status);process.exit(r.ok?0:1)}).catch(e=>{console.error(e);process.exit(1)})"

echo "Done. Public URL: https://audit.botlogix.ca/healthz"

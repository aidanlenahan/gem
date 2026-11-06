#!/usr/bin/env bash
# Deploy current branch to production.
# Prod runs at gem.aidanlenahan.com / api-gem.aidanlenahan.com
# Reads config from /etc/gem/gem-api.env
set -euo pipefail

PROD_ENV_FILE="/etc/gem/gem-api.env"
PROD_API_URL="https://api-gem.aidanlenahan.com"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() { echo "==> $*"; }

# ── 1. Verify env file exists ────────────────────────────────────────────────
if [[ ! -f "$PROD_ENV_FILE" ]]; then
  echo "ERROR: $PROD_ENV_FILE not found."
  exit 1
fi

# ── 2. Confirm ───────────────────────────────────────────────────────────────
echo ""
echo "  ┌─────────────────────────────────────────┐"
echo "  │  Deploying to PRODUCTION                │"
echo "  │  gem.aidanlenahan.com                   │"
echo "  └─────────────────────────────────────────┘"
echo ""
read -r -p "Continue? [y/N] " confirm
if [[ "${confirm,,}" != "y" ]]; then
  echo "Aborted."
  exit 0
fi

# ── 3. Set up email notifications (captures all subsequent output) ───────────
# shellcheck source=notify.sh
source "$SCRIPT_DIR/notify.sh"
setup_notifications "$PROD_ENV_FILE" "Deploy -> Production (${PROD_API_URL})"

# ── 4. Enable full command tracing ───────────────────────────────────────────
set -x

# ── 5. Print system context ───────────────────────────────────────────────────
log "System context"
date
uname -a
whoami
pwd
node --version 2>/dev/null || true
npm  --version 2>/dev/null || true
git  log --oneline -5

# ── 6. Install dependencies ──────────────────────────────────────────────────
log "Installing dependencies"
npm install

# ── 7. Prisma client → API → web ─────────────────────────────────────────────
# Generate first so the API compiles against the current schema. Each env
# builds into its own dist-prod so a deploy never changes the other env's code.
log "Generating Prisma client"
(cd apps/api && npx prisma generate)

log "Building API (dist-prod)"
npm --workspace apps/api run build:prod
mkdir -p apps/api/dist-prod/generated
rm -rf apps/api/dist-prod/generated/prisma
cp -r apps/api/src/generated/prisma apps/api/dist-prod/generated/

log "Building web (targeting $PROD_API_URL)"
VITE_API_BASE_URL="$PROD_API_URL" \
  VITE_SOCKET_URL="$PROD_API_URL" \
  VITE_SENTRY_DSN="$(grep -E '^SENTRY_DSN=' "$PROD_ENV_FILE" | cut -d= -f2- | tr -d '\n\r ')" \
  npm run build:web:prod
# Source maps are not uploaded anywhere; don't serve them publicly.
find apps/web/dist-prod -name '*.map' -type f -delete

# ── 8. Migrations ────────────────────────────────────────────────────────────
# Tracing is paused here: DATABASE_URL contains the DB password and would
# otherwise be printed into the emailed deploy log.
log "Running database migrations (prod)"
{ set +x; } 2>/dev/null
_db_url="$(grep -E '^DATABASE_URL=' "$PROD_ENV_FILE" | cut -d= -f2-)"
(cd apps/api && DATABASE_URL="$_db_url" npx prisma migrate deploy)
unset _db_url
set -x

# ── 9. Restart prod services ─────────────────────────────────────────────────
log "Restarting prod services"
sudo systemctl restart gem-api gem-web

# ── 10. Wait for API to become healthy ────────────────────────────────────────
{ set +x; } 2>/dev/null
log "Waiting for API to become healthy (up to 30s)..."
_api_healthy=0
for i in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:4000/health" >/dev/null 2>&1; then
    echo "  gem-api  : healthy after ${i}s"
    _api_healthy=1
    break
  fi
  sleep 1
done
if [[ "$_api_healthy" -eq 0 ]]; then
  echo "  gem-api  : FAILED to become healthy after 30s — last journal entries:"
  journalctl -u gem-api --since "60 seconds ago" --no-pager || true
  exit 1
fi
systemctl is-active --quiet gem-web && echo "  gem-web  : active" || echo "  gem-web  : INACTIVE"
journalctl -u gem-api --since "30 seconds ago" --no-pager || true
set -x

log "Done — production live at https://gem.aidanlenahan.com"

#!/usr/bin/env bash
# Deploy current branch to the dev environment.
# Dev runs at gem-dev.aidanlenahan.com / api-gem-dev.aidanlenahan.com
# Reads config from /etc/gem/gem-api-dev.env
set -euo pipefail

DEV_ENV_FILE="/etc/gem/gem-api-dev.env"
DEV_API_URL="https://api-gem-dev.aidanlenahan.com"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() { echo "==> $*"; }

# ── 1. Verify env file exists ────────────────────────────────────────────────
if [[ ! -f "$DEV_ENV_FILE" ]]; then
  echo "ERROR: $DEV_ENV_FILE not found."
  echo "Copy infra/gem-api-dev.env.example to $DEV_ENV_FILE and fill in the values."
  exit 1
fi

# ── 2. Set up email notifications (captures all subsequent output) ───────────
# Fall back to prod env for SMTP if dev env doesn't carry SMTP credentials.
_smtp_env="$DEV_ENV_FILE"
grep -q "^SMTP_HOST=" "$_smtp_env" 2>/dev/null || _smtp_env="/etc/gem/gem-api.env"
# shellcheck source=notify.sh
source "$SCRIPT_DIR/notify.sh"
setup_notifications "$_smtp_env" "Deploy -> Dev (${DEV_API_URL})"

# ── 3. Enable full command tracing ───────────────────────────────────────────
# Every command is echoed (with + prefix) before execution.
# Goes to both the terminal and the email log.
set -x

# ── 4. Print system context ───────────────────────────────────────────────────
log "System context"
date
uname -a
whoami
pwd
node --version 2>/dev/null || true
npm  --version 2>/dev/null || true
git  log --oneline -5

# ── 5. Install dependencies ──────────────────────────────────────────────────
log "Installing dependencies"
npm install

# ── 6. Build API ─────────────────────────────────────────────────────────────
log "Building API"
npm run build:api

# ── 7. Build web with dev API URL ────────────────────────────────────────────
log "Building web (targeting $DEV_API_URL)"
_sentry_env="$DEV_ENV_FILE"
grep -q "^SENTRY_DSN=" "$_sentry_env" 2>/dev/null || _sentry_env="/etc/gem/gem-api.env"
VITE_API_BASE_URL="$DEV_API_URL" \
  VITE_SOCKET_URL="$DEV_API_URL" \
  VITE_SENTRY_DSN="$(grep -E '^SENTRY_DSN=' "$_sentry_env" 2>/dev/null | cut -d= -f2- | tr -d '\n\r ' || true)" \
  npm run build:web:dev

# ── 8. Run migrations + regenerate Prisma client ─────────────────────────────
log "Running database migrations (dev)"
cd apps/api
_db_url="$(grep -E '^DATABASE_URL=' "$DEV_ENV_FILE" | cut -d= -f2-)"
DATABASE_URL="$_db_url" npx prisma migrate deploy
log "Regenerating Prisma client"
DATABASE_URL="$_db_url" npx prisma generate
cd ../..

# ── 9. Copy Prisma generated client ──────────────────────────────────────────
log "Copying Prisma client"
mkdir -p apps/api/dist/generated
cp -r apps/api/src/generated/prisma apps/api/dist/generated/

# ── 10. Restart dev services ──────────────────────────────────────────────────
log "Restarting dev services"
sudo systemctl restart gem-api-dev gem-web-dev

# ── 11. Wait for API to become healthy ───────────────────────────────────────
{ set +x; } 2>/dev/null
log "Waiting for API to become healthy (up to 30s)..."
_api_healthy=0
for i in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:4001/health" >/dev/null 2>&1; then
    echo "  gem-api-dev  : healthy after ${i}s"
    _api_healthy=1
    break
  fi
  sleep 1
done
if [[ "$_api_healthy" -eq 0 ]]; then
  echo "  gem-api-dev  : FAILED to become healthy after 30s — last journal entries:"
  journalctl -u gem-api-dev --since "60 seconds ago" --no-pager || true
  exit 1
fi
systemctl is-active --quiet gem-web-dev && echo "  gem-web-dev  : active" || echo "  gem-web-dev  : INACTIVE"
journalctl -u gem-api-dev --since "30 seconds ago" --no-pager || true
set -x

log "Done — dev environment live at https://gem-dev.aidanlenahan.com"

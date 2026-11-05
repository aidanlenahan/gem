#!/usr/bin/env bash
# Deploy the current branch to the dev environment.
# Dev runs at gem-dev.aidanlenahan.com / api-gem-dev.aidanlenahan.com
# Reads config from /etc/gem/gem-api-dev.env
# Builds into apps/api/dist-dev + apps/web/dist-dev — prod's build is untouched.
set -euo pipefail

DEV_ENV_FILE="/etc/gem/gem-api-dev.env"
DEV_API_URL="https://api-gem-dev.aidanlenahan.com"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GEM_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"; export GEM_ROOT
cd "$GEM_ROOT"

# shellcheck source=lib/deploy-common.sh
source "$SCRIPT_DIR/lib/deploy-common.sh"

log() { echo "==> $*"; }

# ── 1. Preflight ─────────────────────────────────────────────────────────────
if [[ ! -f "$DEV_ENV_FILE" ]]; then
  echo "ERROR: $DEV_ENV_FILE not found."
  echo "Copy infra/gem-api-dev.env.example to $DEV_ENV_FILE and fill in the values."
  exit 1
fi
require_unit_dir gem-api-dev dist-dev
require_unit_dir gem-web-dev dist-dev

# Dev must never share prod's database or Redis DB (checked with tracing off —
# these values contain passwords).
{ set +x; } 2>/dev/null
_prod_env=/etc/gem/gem-api.env
for _k in REDIS_URL DATABASE_URL; do
  _dv="$(env_get "$DEV_ENV_FILE" "$_k")"; _pv="$(env_get "$_prod_env" "$_k")"
  if [[ -n "$_dv" && "$_dv" == "$_pv" ]]; then
    echo "ERROR: dev and prod use the same $_k — dev would read/write prod data (use e.g. redis://…/1 and the gem_staging DB)." >&2
    exit 1
  fi
done
unset _dv _pv _k

# ── 2. Email notifications (captures all subsequent output) ──────────────────
# Fall back to prod env for SMTP if dev env doesn't carry SMTP credentials.
_smtp_env="$DEV_ENV_FILE"
grep -q "^SMTP_HOST=" "$_smtp_env" 2>/dev/null || _smtp_env="/etc/gem/gem-api.env"
# shellcheck source=notify.sh
source "$SCRIPT_DIR/notify.sh"
setup_notifications "$_smtp_env" "Deploy -> Dev (${DEV_API_URL})"

# Sentry DSN / APP_ENV fall back to prod's file when dev doesn't set them.
_web_env="$DEV_ENV_FILE"
grep -q "^SENTRY_DSN" "$_web_env" 2>/dev/null || _web_env="/etc/gem/gem-api.env"

# ── 3. Full command tracing (secrets are read with tracing paused) ──────────
set -x

log "System context"
date; uname -a; whoami; pwd
node --version 2>/dev/null || true
npm  --version 2>/dev/null || true
git  log --oneline -5

# ── 4. Dependencies ──────────────────────────────────────────────────────────
log "Installing dependencies"
npm install --no-audit --no-fund

# ── 5. Prisma client → API → web ─────────────────────────────────────────────
log "Generating Prisma client"
prisma_generate
log "Building API (dist-dev)"
build_api dev
log "Building web (dist-dev → $DEV_API_URL)"
build_web dev "$DEV_API_URL" "$_web_env"

# ── 6. Migrations (fails the deploy on error) ────────────────────────────────
run_migrations "$DEV_ENV_FILE" "dev"

# ── 7. Restart + health check ────────────────────────────────────────────────
log "Restarting dev services"
sudo systemctl restart gem-api-dev gem-web-dev
wait_healthy 4001 gem-api-dev dev
systemctl is-active --quiet gem-web-dev && echo "  gem-web-dev  : active" || { echo "  gem-web-dev  : INACTIVE"; exit 1; }
journalctl -u gem-api-dev --since "30 seconds ago" --no-pager || true
set -x

log "Done — dev environment live at https://gem-dev.aidanlenahan.com (release $(git_sha))"

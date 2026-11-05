#!/usr/bin/env bash
# Deploy `main` to production.
# Prod runs at gem.aidanlenahan.com / api-gem.aidanlenahan.com
# Reads config from /etc/gem/gem-api.env
# Builds into apps/api/dist-prod + apps/web/dist-prod (never touches dev's build).
set -euo pipefail

PROD_ENV_FILE="/etc/gem/gem-api.env"
PROD_API_URL="https://api-gem.aidanlenahan.com"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GEM_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"; export GEM_ROOT
cd "$GEM_ROOT"

# shellcheck source=lib/deploy-common.sh
source "$SCRIPT_DIR/lib/deploy-common.sh"

log() { echo "==> $*"; }

# ── 1. Preflight ─────────────────────────────────────────────────────────────
if [[ ! -f "$PROD_ENV_FILE" ]]; then
  echo "ERROR: $PROD_ENV_FILE not found."
  exit 1
fi
require_prod_branch
require_unit_dir gem-api dist-prod
require_unit_dir gem-web dist-prod

# ── 2. Confirm ───────────────────────────────────────────────────────────────
echo ""
echo "  ┌─────────────────────────────────────────┐"
echo "  │  Deploying to PRODUCTION                │"
echo "  │  gem.aidanlenahan.com                   │"
echo "  └─────────────────────────────────────────┘"
echo "  commit: $(git log -1 --pretty='%h %s')"
echo ""
read -r -p "Continue? [y/N] " confirm
if [[ "${confirm,,}" != "y" ]]; then
  echo "Aborted."
  exit 0
fi

# ── 3. Email notifications (captures all subsequent output) ──────────────────
# shellcheck source=notify.sh
source "$SCRIPT_DIR/notify.sh"
setup_notifications "$PROD_ENV_FILE" "Deploy -> Production (${PROD_API_URL})"

# ── 4. Full command tracing (secrets are read with tracing paused) ──────────
set -x

log "System context"
date; uname -a; whoami; pwd
node --version 2>/dev/null || true
npm  --version 2>/dev/null || true
git  log --oneline -5

# ── 5. Install locked dependencies ───────────────────────────────────────────
# Not `npm ci`: it deletes node_modules, which the running prod AND dev
# processes share in this single checkout. Instead install, then refuse to
# continue if npm rewrote the lockfile (prod must run exactly what's in git).
log "Installing dependencies"
npm install --no-audit --no-fund
if ! git diff --quiet -- package-lock.json; then
  echo "ERROR: npm install modified package-lock.json — commit the lockfile update via a PR first." >&2
  git checkout -- package-lock.json
  exit 1
fi

# ── 6. Prisma client → API → web ─────────────────────────────────────────────
log "Generating Prisma client"
prisma_generate
log "Building API (dist-prod)"
build_api prod
log "Building web (dist-prod → $PROD_API_URL)"
build_web prod "$PROD_API_URL" "$PROD_ENV_FILE"

# ── 7. Migrations (fails the deploy on error) ────────────────────────────────
run_migrations "$PROD_ENV_FILE" "prod"

# ── 8. Restart + health check ────────────────────────────────────────────────
log "Restarting prod services"
sudo systemctl restart gem-api gem-web
wait_healthy 4000 gem-api prod
systemctl is-active --quiet gem-web && echo "  gem-web  : active" || { echo "  gem-web  : INACTIVE"; exit 1; }
journalctl -u gem-api --since "30 seconds ago" --no-pager || true

# Tag what's live so you can always see/roll back to the last good prod deploy.
git tag -f "prod-live" HEAD >/dev/null 2>&1 || true
git tag "prod-$(date +%Y%m%d-%H%M%S)" HEAD >/dev/null 2>&1 || true

set -x
log "Done — production live at https://gem.aidanlenahan.com (release $(git_sha))"

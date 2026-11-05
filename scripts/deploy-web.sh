#!/usr/bin/env bash
# Quick PRODUCTION rebuild + restart (API + web) — skips npm install and
# migrations. Use deploy-prod.sh when dependencies or the Prisma schema changed.
#
# Previously this built the web app into apps/web/dist, but gem-web serves
# apps/web/dist-prod, so "quick deploys" never actually shipped the frontend.
set -euo pipefail

PROD_ENV_FILE="/etc/gem/gem-api.env"
PROD_API_URL="https://api-gem.aidanlenahan.com"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GEM_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"; export GEM_ROOT
cd "$GEM_ROOT"

# shellcheck source=lib/deploy-common.sh
source "$SCRIPT_DIR/lib/deploy-common.sh"

[[ -f "$PROD_ENV_FILE" ]] || { echo "ERROR: $PROD_ENV_FILE not found." >&2; exit 1; }
require_prod_branch
require_unit_dir gem-api dist-prod
require_unit_dir gem-web dist-prod
if ! git diff --quiet prod-live HEAD -- apps/api/prisma package-lock.json 2>/dev/null; then
  echo "ERROR: schema or dependencies changed since the last full prod deploy — use ./scripts/deploy-prod.sh." >&2
  exit 1
fi

# shellcheck source=notify.sh
source "$SCRIPT_DIR/notify.sh"
setup_notifications "$PROD_ENV_FILE" "Deploy -> Web (quick rebuild + restart)"

START_TIME=$SECONDS
sudo -v
set -x

date; whoami
git log --oneline -5

echo "==> Building API (dist-prod)"
prisma_generate
build_api prod

echo "==> Building web (dist-prod)"
build_web prod "$PROD_API_URL" "$PROD_ENV_FILE"

echo "==> Restarting gem-api + gem-web"
sudo systemctl restart gem-api gem-web
wait_healthy 4000 gem-api prod
systemctl is-active --quiet gem-web && echo "  gem-web : active" || { echo "  gem-web : INACTIVE"; exit 1; }

git tag -f "prod-live" HEAD >/dev/null 2>&1 || true
echo ""
echo "Deploy completed in $((SECONDS - START_TIME))s"

#!/bin/bash
set -euo pipefail
cd /var/www/gem

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Email notifications ───────────────────────────────────────────────────────
# Find whichever env file has SMTP credentials.
_smtp_env=""
for _f in "/etc/gem/gem-api.env" "/etc/gem/gem-api-dev.env" "/var/www/gem/apps/api/.env"; do
  if [[ -f "$_f" ]] && grep -q "^SMTP_HOST=" "$_f"; then
    _smtp_env="$_f"; break
  fi
done
# shellcheck source=notify.sh
source "$SCRIPT_DIR/notify.sh"
setup_notifications "$_smtp_env" "Deploy -> Web (quick rebuild + restart)"

START_TIME=$SECONDS

sudo -v

# ── Enable full command tracing ───────────────────────────────────────────────
set -x

# ── System context ────────────────────────────────────────────────────────────
echo "==> System context"
date
uname -a
whoami
node --version 2>/dev/null || true
npm  --version 2>/dev/null || true
git  log --oneline -5

echo "==> Building API (dist-prod)..."
(cd apps/api && npx prisma generate)
npm --workspace apps/api run build:prod
mkdir -p apps/api/dist-prod/generated
rm -rf apps/api/dist-prod/generated/prisma
cp -r apps/api/src/generated/prisma apps/api/dist-prod/generated/

echo "==> Restarting gem-api..."
sudo systemctl restart gem-api

# gem-web serves dist-prod, so build there (this used to build into dist/,
# which nothing serves).
echo "==> Building web (dist-prod)..."
VITE_API_BASE_URL="https://api-gem.aidanlenahan.com" \
  VITE_SOCKET_URL="https://api-gem.aidanlenahan.com" \
  VITE_SENTRY_DSN="$(grep -E '^SENTRY_DSN=' "${_smtp_env}" 2>/dev/null | cut -d= -f2- | tr -d '\n\r ' || true)" \
  npm --workspace apps/web run build:fast -- --outDir dist-prod
find apps/web/dist-prod -name '*.map' -type f -delete

echo "==> Restarting gem-web..."
sudo systemctl restart gem-web

echo "==> Waiting for services to start..."
sleep 2

{ set +x; } 2>/dev/null
systemctl is-active --quiet gem-api && echo "  gem-api : active" || echo "  gem-api : INACTIVE"
systemctl is-active --quiet gem-web && echo "  gem-web : active" || echo "  gem-web : INACTIVE"
set -x

echo "==> Recent API log (last 10 seconds):"
journalctl -u gem-api --since "10 seconds ago" --no-pager || true

ELAPSED=$((SECONDS - START_TIME))
{ set +x; } 2>/dev/null
echo ""
echo "Deploy completed in ${ELAPSED}s"

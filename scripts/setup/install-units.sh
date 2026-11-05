#!/usr/bin/env bash
# Install / refresh the GEM systemd units from infra/systemd.
# Run once after pulling changes to infra/systemd (e.g. the dist-prod/dist-dev
# split), from the repo root:  sudo ./scripts/setup/install-units.sh
#
# It backs up whatever is currently installed, builds both API targets so the
# new ExecStart paths exist, then reloads systemd. It does NOT restart services
# — run ./scripts/deploy-prod.sh / ./scripts/deploy-dev.sh afterwards.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
UNIT_DIR=/etc/systemd/system
BACKUP="/etc/systemd/system/gem-unit-backup-$(date +%Y%m%d-%H%M%S)"

declare -A UNITS=(
  [gem-api.service]=gem-api.prod.service
  [gem-web.service]=gem-web.prod.service
  [gem-api-dev.service]=gem-api.dev.service
  [gem-web-dev.service]=gem-web.dev.service
)

if [[ $EUID -ne 0 ]]; then
  echo "Run with sudo: sudo $0" >&2
  exit 1
fi

branch="$(git -C "$REPO" rev-parse --abbrev-ref HEAD)"
if [[ "$branch" != "main" ]]; then
  echo "ERROR: check out 'main' first — this builds dist-prod from the current checkout (on '$branch')." >&2
  exit 1
fi

mkdir -p "$BACKUP"
for installed in "${!UNITS[@]}"; do
  src="$REPO/infra/systemd/${UNITS[$installed]}"
  if [[ -f "$UNIT_DIR/$installed" ]]; then
    cp "$UNIT_DIR/$installed" "$BACKUP/"
    if ! diff -q "$UNIT_DIR/$installed" "$src" >/dev/null; then
      echo "==> $installed differs from repo:"
      diff -u "$UNIT_DIR/$installed" "$src" || true
    fi
  fi
  cp "$src" "$UNIT_DIR/$installed"
done
echo "==> Previous units backed up to $BACKUP"

# Make sure the new ExecStart targets exist before anything restarts.
owner="$(stat -c %U "$REPO")"
echo "==> Building API into dist-prod and dist-dev (as $owner)"
sudo -u "$owner" bash -c "cd '$REPO' && (cd apps/api && npx prisma generate) \
  && for t in prod dev; do npm --workspace apps/api run build:\$t \
  && mkdir -p apps/api/dist-\$t/generated && rm -rf apps/api/dist-\$t/generated/prisma \
  && cp -r apps/api/src/generated/prisma apps/api/dist-\$t/generated/; done"

systemctl daemon-reload
echo "==> Units installed. Next: ./scripts/deploy-prod.sh (and ./scripts/deploy-dev.sh)"

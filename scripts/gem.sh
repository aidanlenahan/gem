#!/usr/bin/env bash
set -euo pipefail

PROD_ENV="/etc/gem/gem-api.env"
DEV_ENV="/etc/gem/gem-api-dev.env"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=notify.sh
source "$SCRIPT_DIR/notify.sh"

# Pick the best available env file that has SMTP credentials.
_gem_smtp_env() {
  for _f in "$PROD_ENV" "$DEV_ENV" "/var/www/gem/apps/api/.env"; do
    if [[ -f "$_f" ]] && grep -q "^SMTP_HOST=" "$_f" 2>/dev/null; then
      echo "$_f"; return
    fi
  done
  echo ""
}

# ── Colors ────────────────────────────────────────────────────────────────────
B='\033[1m'         # bold
D='\033[2m'         # dim
R='\033[0m'         # reset
RED='\033[0;31m'
GRN='\033[0;32m'
YLW='\033[0;33m'
CYN='\033[0;36m'

# ── Helpers ───────────────────────────────────────────────────────────────────
step() { echo -e "\n${CYN}▸${R} ${B}$*${R}"; }
ok()   { echo -e "${GRN}  ✓${R}  $*"; }
die()  { echo -e "\n${RED}  ✗  $*${R}\n" >&2; exit 1; }


svc_status() {
  systemctl is-active --quiet "$1" 2>/dev/null && echo -e "${GRN}●${R} running" || echo -e "${D}○ stopped${R}"
}

# ── Deploys ───────────────────────────────────────────────────────────────────
# Delegate to the deploy scripts so there is one implementation of each
# deploy. (This menu used to build into the wrong directories and ignore
# migration failures.)
deploy_prod() { "$SCRIPT_DIR/deploy-prod.sh"; }
deploy_dev()  { "$SCRIPT_DIR/deploy-dev.sh"; }

restart_prod() {
  step "Restarting production"
  sudo systemctl restart gem-api gem-web
  sleep 2
  systemctl is-active --quiet gem-api && ok "gem-api : active" || echo "  gem-api : INACTIVE"
  systemctl is-active --quiet gem-web && ok "gem-web : active" || echo "  gem-web : INACTIVE"
  journalctl -u gem-api --since "10 seconds ago" --no-pager 2>/dev/null || true
  ok "gem.aidanlenahan.com  is live"
}

restart_dev() {
  step "Restarting dev"
  sudo systemctl restart gem-api-dev gem-web-dev
  sleep 2
  systemctl is-active --quiet gem-api-dev && ok "gem-api-dev : active" || echo "  gem-api-dev : INACTIVE"
  systemctl is-active --quiet gem-web-dev && ok "gem-web-dev : active" || echo "  gem-web-dev : INACTIVE"
  journalctl -u gem-api-dev --since "10 seconds ago" --no-pager 2>/dev/null || true
  ok "gem-dev.aidanlenahan.com  is live"
}

stop_dev() {
  step "Stopping dev"
  sudo systemctl stop gem-api-dev gem-web-dev 2>/dev/null || true
  ok "Dev stopped"
}

# ── Sudo pre-auth ─────────────────────────────────────────────────────────────
sudo -v || die "sudo authentication failed"

# ── Menu ──────────────────────────────────────────────────────────────────────
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
PROD_ST=$(svc_status gem-api)
DEV_ST=$(svc_status gem-api-dev)

clear
echo
echo -e "  ${B}GEM${R}  ${D}·  branch: ${BRANCH}${R}"
echo
echo -e "  ${D}prod  ${R}${PROD_ST}      ${D}dev  ${R}${DEV_ST}"
echo
echo -e "  ───────────────────────────────────"
echo -e "  ${B}1${R}  Deploy → production"
echo -e "  ${B}2${R}  Deploy → production  +  stop dev"
echo -e "  ${B}3${R}  Deploy → dev"
echo -e "  ${B}4${R}  Stop dev"
echo -e "  ${B}5${R}  Restart production  ${D}(no build)${R}"
echo -e "  ${B}6${R}  Restart dev  ${D}(no build)${R}"
echo -e "  ───────────────────────────────────"
echo -e "  ${D}q  quit${R}"
echo
read -rp "  → " choice
echo

case "$choice" in
  1)
    deploy_prod
    ;;
  2)
    deploy_prod
    stop_dev
    ;;
  3)
    deploy_dev
    ;;
  4)
    setup_notifications "$(_gem_smtp_env)" "Stop Dev"
    set -x
    stop_dev
    ;;
  5)
    [[ -f "$PROD_ENV" ]] || die "Missing $PROD_ENV"
    setup_notifications "$(_gem_smtp_env)" "Restart Production (no build)"
    set -x
    restart_prod
    ;;
  6)
    [[ -f "$DEV_ENV" ]] || die "Missing $DEV_ENV"
    setup_notifications "$(_gem_smtp_env)" "Restart Dev (no build)"
    set -x
    restart_dev
    ;;
  q|Q|"")
    echo -e "  ${D}bye${R}\n"
    exit 0
    ;;
  *)
    echo -e "  ${RED}Invalid choice${R}\n"
    exit 1
    ;;
esac

echo

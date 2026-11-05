#!/usr/bin/env bash
# Interactive GEM ops menu. Deploys delegate to deploy-prod.sh / deploy-dev.sh
# so there is exactly one implementation of each deploy (this menu used to
# carry its own copy, which built into the wrong directories and ignored
# migration failures).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GEM_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"; export GEM_ROOT
cd "$GEM_ROOT"

PROD_ENV="/etc/gem/gem-api.env"
DEV_ENV="/etc/gem/gem-api-dev.env"

# shellcheck source=lib/deploy-common.sh
source "$SCRIPT_DIR/lib/deploy-common.sh"
# shellcheck source=notify.sh
source "$SCRIPT_DIR/notify.sh"

_gem_smtp_env() {
  for _f in "$PROD_ENV" "$DEV_ENV" "$GEM_ROOT/apps/api/.env"; do
    if [[ -f "$_f" ]] && grep -q "^SMTP_HOST=" "$_f" 2>/dev/null; then
      echo "$_f"; return
    fi
  done
  echo ""
}

B='\033[1m'; D='\033[2m'; R='\033[0m'; RED='\033[0;31m'; GRN='\033[0;32m'; CYN='\033[0;36m'
step() { echo -e "\n${CYN}▸${R} ${B}$*${R}"; }
ok()   { echo -e "${GRN}  ✓${R}  $*"; }
die()  { echo -e "\n${RED}  ✗  $*${R}\n" >&2; exit 1; }

svc_status() {
  systemctl is-active --quiet "$1" 2>/dev/null && echo -e "${GRN}●${R} running" || echo -e "${D}○ stopped${R}"
}
svc_release() { cat "$GEM_ROOT/apps/api/dist-$1/RELEASE" 2>/dev/null || echo "?"; }

restart_prod() {
  step "Restarting production"
  sudo systemctl restart gem-api gem-web
  wait_healthy 4000 gem-api prod
  systemctl is-active --quiet gem-web && ok "gem-web : active" || die "gem-web : INACTIVE"
}

restart_dev() {
  step "Restarting dev"
  sudo systemctl restart gem-api-dev gem-web-dev
  wait_healthy 4001 gem-api-dev dev
  systemctl is-active --quiet gem-web-dev && ok "gem-web-dev : active" || die "gem-web-dev : INACTIVE"
}

stop_dev() {
  step "Stopping dev"
  sudo systemctl stop gem-api-dev gem-web-dev 2>/dev/null || true
  ok "Dev stopped"
}

sudo -v || die "sudo authentication failed"

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
clear
echo
echo -e "  ${B}GEM${R}  ${D}·  branch: ${BRANCH} @ $(git_sha)${R}"
echo
echo -e "  ${D}prod  ${R}$(svc_status gem-api) ${D}$(svc_release prod)${R}      ${D}dev  ${R}$(svc_status gem-api-dev) ${D}$(svc_release dev)${R}"
echo
echo -e "  ───────────────────────────────────"
echo -e "  ${B}1${R}  Deploy → production   ${D}(main only)${R}"
echo -e "  ${B}2${R}  Deploy → production  +  stop dev"
echo -e "  ${B}3${R}  Deploy → dev          ${D}(current branch)${R}"
echo -e "  ${B}4${R}  Stop dev"
echo -e "  ${B}5${R}  Restart production  ${D}(no build)${R}"
echo -e "  ${B}6${R}  Restart dev  ${D}(no build)${R}"
echo -e "  ───────────────────────────────────"
echo -e "  ${D}q  quit${R}"
echo
read -rp "  → " choice
echo

case "$choice" in
  1) exec "$SCRIPT_DIR/deploy-prod.sh" ;;
  2) "$SCRIPT_DIR/deploy-prod.sh" && stop_dev ;;
  3) exec "$SCRIPT_DIR/deploy-dev.sh" ;;
  4) setup_notifications "$(_gem_smtp_env)" "Stop Dev"; stop_dev ;;
  5)
    [[ -f "$PROD_ENV" ]] || die "Missing $PROD_ENV"
    setup_notifications "$(_gem_smtp_env)" "Restart Production (no build)"
    restart_prod
    ;;
  6)
    [[ -f "$DEV_ENV" ]] || die "Missing $DEV_ENV"
    setup_notifications "$(_gem_smtp_env)" "Restart Dev (no build)"
    restart_dev
    ;;
  q|Q|"") echo -e "  ${D}bye${R}\n"; exit 0 ;;
  *) echo -e "  ${RED}Invalid choice${R}\n"; exit 1 ;;
esac
echo

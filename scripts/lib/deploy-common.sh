#!/usr/bin/env bash
# scripts/lib/deploy-common.sh
# Shared build/deploy primitives for deploy-prod.sh, deploy-dev.sh,
# deploy-web.sh and gem.sh. Source it; don't execute it.
#
# Why this exists
# ---------------
# Prod and dev run out of the SAME checkout (/var/www/gem). Before this file:
#   * both APIs ran apps/api/dist/server.js, so deploying a dev branch silently
#     replaced the code prod would run on its next restart/crash;
#   * deploy-web.sh / gem.sh built the web app into dist/, but the systemd
#     units serve dist-prod/ and dist-dev/, so those deploys shipped nothing;
#   * `set -x` tracing echoed DATABASE_URL (with password) into the deploy
#     log, which is then emailed.
# Every target now builds into its own directory:
#   prod → apps/api/dist-prod, apps/web/dist-prod
#   dev  → apps/api/dist-dev,  apps/web/dist-dev

GEM_ROOT="${GEM_ROOT:-/var/www/gem}"

# ── xtrace helpers ───────────────────────────────────────────────────────────
# Secrets must never be read or used while `set -x` is on: bash prints the
# expanded value of every assignment and command line it traces.
_xtrace_off() { _GEM_XTRACE_WAS_ON=0; [[ $- == *x* ]] && _GEM_XTRACE_WAS_ON=1; { set +x; } 2>/dev/null; }
_xtrace_restore() { if [[ "${_GEM_XTRACE_WAS_ON:-0}" == 1 ]]; then set -x; fi; }

# env_get FILE KEY — print KEY's value from an env file (first match, quotes
# and CR stripped). Prints nothing if the file or key is missing.
env_get() {
  local file="$1" key="$2" val
  [[ -f "$file" ]] || return 0
  val="$(grep -E "^${key}=" "$file" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r\n' || true)"
  val="${val%\"}"; val="${val#\"}"; val="${val%\'}"; val="${val#\'}"
  printf '%s' "$val"
}

# git_sha — short commit SHA of the checkout, suffixed with "-dirty" when
# there are uncommitted changes (so Sentry releases never lie).
git_sha() {
  local sha
  sha="$(git -C "$GEM_ROOT" rev-parse --short=12 HEAD 2>/dev/null || echo unknown)"
  if ! git -C "$GEM_ROOT" diff --quiet HEAD -- 2>/dev/null; then
    sha="${sha}-dirty"
  fi
  printf '%s' "$sha"
}

# ── Preflight checks ─────────────────────────────────────────────────────────
# require_prod_branch — production deploys must come from a clean, pushed
# `main`. Set GEM_ALLOW_ANY_BRANCH=1 to override in an emergency.
require_prod_branch() {
  [[ "${GEM_ALLOW_ANY_BRANCH:-0}" == 1 ]] && { echo "  ! GEM_ALLOW_ANY_BRANCH=1 — skipping branch checks"; return 0; }
  local branch
  branch="$(git -C "$GEM_ROOT" rev-parse --abbrev-ref HEAD)"
  if [[ "$branch" != "main" ]]; then
    echo "ERROR: production deploys must be from 'main' (currently on '$branch')." >&2
    echo "       git checkout main && git pull, or set GEM_ALLOW_ANY_BRANCH=1." >&2
    return 1
  fi
  if ! git -C "$GEM_ROOT" diff --quiet HEAD --; then
    echo "ERROR: uncommitted changes in $GEM_ROOT — commit/push them (or stash) before deploying prod." >&2
    git -C "$GEM_ROOT" status --short >&2
    return 1
  fi
  git -C "$GEM_ROOT" fetch --quiet origin main 2>/dev/null || true
  if [[ "$(git -C "$GEM_ROOT" rev-parse HEAD)" != "$(git -C "$GEM_ROOT" rev-parse origin/main 2>/dev/null)" ]]; then
    echo "ERROR: local main is not identical to origin/main — pull or push first." >&2
    return 1
  fi
}

# require_unit_dir UNIT DIR — make sure the installed systemd unit actually
# runs from DIR (e.g. dist-prod). Catches "repo units updated but not
# reinstalled", which would otherwise deploy into a directory nothing serves.
require_unit_dir() {
  local unit="$1" dir="$2"
  if ! systemctl cat "$unit" 2>/dev/null | grep -q -- "$dir"; then
    echo "ERROR: installed unit '$unit' does not reference '$dir'." >&2
    echo "       Reinstall the units once:  sudo ./scripts/setup/install-units.sh" >&2
    return 1
  fi
}

# ── Build steps ──────────────────────────────────────────────────────────────
# prisma_generate — must run BEFORE the API build so tsc compiles against the
# current schema.
prisma_generate() {
  (cd "$GEM_ROOT/apps/api" && npx prisma generate)
}

# build_api TARGET — TARGET is "prod" or "dev". Builds apps/api/dist-TARGET,
# bundles the generated Prisma client and writes the RELEASE file Sentry uses.
build_api() {
  local target="$1" out="$GEM_ROOT/apps/api/dist-$1"
  npm --workspace apps/api run "build:$target"
  mkdir -p "$out/generated"
  rm -rf "$out/generated/prisma"
  cp -r "$GEM_ROOT/apps/api/src/generated/prisma" "$out/generated/"
  git_sha > "$out/RELEASE"
}

# build_web TARGET API_URL ENV_FILE — builds apps/web/dist-TARGET with the
# right API URL, Sentry DSN/environment/release, then handles source maps.
build_web() {
  local target="$1" api_url="$2" env_file="$3" dsn sentry_env release
  _xtrace_off
  dsn="$(env_get "$env_file" SENTRY_DSN_WEB)"
  [[ -n "$dsn" ]] || dsn="$(env_get "$env_file" SENTRY_DSN)"
  local dsn_state=MISSING; [[ -n "$dsn" ]] && dsn_state="set"
  _xtrace_restore
  sentry_env="$(env_get "$env_file" APP_ENV)"
  if [[ "$target" == dev ]]; then
    # dev may borrow prod's env file for the DSN — never label it production.
    [[ -n "$sentry_env" && "$sentry_env" != production ]] || sentry_env=staging
  else
    sentry_env=production
  fi
  release="$(git_sha)"
  echo "  web: target=$target api=$api_url sentry_env=$sentry_env release=$release dsn=$dsn_state"
  _xtrace_off
  VITE_API_BASE_URL="$api_url" \
    VITE_SOCKET_URL="$api_url" \
    VITE_SENTRY_DSN="$dsn" \
    VITE_SENTRY_ENVIRONMENT="$sentry_env" \
    VITE_SENTRY_RELEASE="$release" \
    npm --workspace apps/web run "build:$target"
  local rc=$?
  _xtrace_restore
  [[ $rc -eq 0 ]] || return $rc
  finalize_sourcemaps "$GEM_ROOT/apps/web/dist-$target" "$env_file" "$release"
}

# finalize_sourcemaps OUTDIR ENV_FILE RELEASE — Vite emits "hidden" source
# maps, but they are still served publicly from /assets/*.map. If Sentry
# upload credentials exist, upload them first; then always delete them.
finalize_sourcemaps() {
  local out="$1" env_file="$2" release="$3" token org project
  _xtrace_off
  token="$(env_get "$env_file" SENTRY_AUTH_TOKEN)"
  org="$(env_get "$env_file" SENTRY_ORG)"
  project="$(env_get "$env_file" SENTRY_PROJECT_WEB)"
  if [[ -n "$token" && -n "$org" && -n "$project" ]]; then
    echo "  sourcemaps: uploading to Sentry ($org/$project, release $release)"
    SENTRY_AUTH_TOKEN="$token" npx --yes @sentry/cli@2 sourcemaps upload \
      --org "$org" --project "$project" --release "$release" "$out/assets" \
      || echo "  sourcemaps: upload FAILED (non-fatal) — stack traces will be minified"
  else
    echo "  sourcemaps: SENTRY_AUTH_TOKEN/SENTRY_ORG/SENTRY_PROJECT_WEB not set — skipping upload"
  fi
  _xtrace_restore
  find "$out" -name '*.map' -type f -delete
  echo "  sourcemaps: removed from $out (not publicly served)"
}

# run_migrations ENV_FILE LABEL — applies Prisma migrations. Fails the deploy
# on error (a half-migrated DB with new code is worse than a failed deploy).
run_migrations() {
  local env_file="$1" label="$2" db_url rc
  echo "==> Running database migrations ($label)"
  _xtrace_off
  db_url="$(env_get "$env_file" DATABASE_URL)"
  if [[ -z "$db_url" ]]; then
    _xtrace_restore
    echo "ERROR: DATABASE_URL missing from $env_file" >&2
    return 1
  fi
  (cd "$GEM_ROOT/apps/api" && DATABASE_URL="$db_url" npx prisma migrate deploy)
  rc=$?
  _xtrace_restore
  return $rc
}

# wait_healthy PORT UNIT TARGET — poll /health for up to 30s; dump the journal and
# fail if the API never comes up.
wait_healthy() {
  local port="$1" unit="$2" i
  { set +x; } 2>/dev/null
  echo "==> Waiting for $unit to become healthy (up to 30s)..."
  for i in $(seq 1 30); do
    if curl -sf "http://127.0.0.1:${port}/health" >/dev/null 2>&1; then
      echo "  $unit : healthy after ${i}s (release $(cat "$GEM_ROOT/apps/api/dist-${3:-prod}/RELEASE" 2>/dev/null || echo '?'))"
      return 0
    fi
    sleep 1
  done
  echo "  $unit : FAILED to become healthy after 30s — last journal entries:"
  journalctl -u "$unit" --since "60 seconds ago" --no-pager || true
  return 1
}

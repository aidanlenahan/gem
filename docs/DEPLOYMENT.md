# GEM — Dev / Prod Deployment Guide

## How the two environments work

| | **Production** | **Dev (staging)** |
|---|---|---|
| Web | https://gem.aidanlenahan.com → `127.0.0.1:4173` (`gem-web`) | https://gem-dev.aidanlenahan.com → `127.0.0.1:4174` (`gem-web-dev`) |
| API | https://api-gem.aidanlenahan.com → `127.0.0.1:4000` (`gem-api`) | https://api-gem-dev.aidanlenahan.com → `127.0.0.1:4001` (`gem-api-dev`) |
| Env file | `/etc/gem/gem-api.env` | `/etc/gem/gem-api-dev.env` |
| Database | `gem_prod` | `gem_staging` |
| Redis | `redis://…:6379` (db 0) | `redis://…:6379/1` (db 1) |
| Build dirs | `apps/api/dist-prod`, `apps/web/dist-prod` | `apps/api/dist-dev`, `apps/web/dist-dev` |
| `APP_ENV` (Sentry label) | `production` | `staging` |
| Deploys from | `main` only (enforced) | any branch |

Both run from one checkout, `/var/www/gem`. Because of that, **each environment
builds into its own `dist-*` directory**, so deploying a dev branch can't change
what prod runs. `node_modules` and `src/generated` are still shared; see
"Longer-term" below.

`NODE_ENV=production` is set for **both** (it controls secure cookies and turns
off dev-only routes). Use `APP_ENV` to tell the two apart.

## Day-to-day workflow

```
feature branch ──► deploy to dev ──► test on gem-dev ──► PR ──► CI green ──► merge to main ──► deploy prod
```

1. Work on a branch, not on `main`. Avoid editing directly on the VM. If you do,
   commit to a branch and push.
2. `git checkout my-branch && ./scripts/deploy-dev.sh`, then test on gem-dev.
   Check Sentry, filtered to **environment = staging**.
3. Open a PR. CI runs typecheck, lint, unit tests, a build, npm audit,
   TruffleHog and Semgrep.
4. Merge, then on the VM:
   `git checkout main && git pull && ./scripts/deploy-prod.sh`.
   The script refuses to run unless you're on a clean `main` that matches
   `origin/main`. After a successful deploy it moves the `prod-live` git tag
   and adds a timestamped `prod-YYYYMMDD-HHMMSS` tag.
5. Use `./scripts/deploy-web.sh` for a quick prod rebuild (no `npm install`, no
   migrations). It refuses to run if the Prisma schema or lockfile changed
   since `prod-live`.

**Rollback:** `git checkout prod-<previous timestamp>`, then
`GEM_ALLOW_ANY_BRANCH=1 ./scripts/deploy-prod.sh`. Be careful with migrations:
Prisma does not roll schema changes back, so write migrations that old code can
tolerate (add columns first; drop them in a later release).

## One-time setup after pulling this change

```bash
cd /var/www/gem && git checkout main && git pull
sudo ./scripts/setup/install-units.sh     # backs up + installs units, builds dist-prod/dist-dev
./scripts/deploy-prod.sh
./scripts/deploy-dev.sh                   # optional
```

Add to **both** env files (see `infra/*.env.example`):

```
APP_ENV=production        # or: staging, in gem-api-dev.env
SENTRY_DSN=…              # already there
# Optional, for readable stack traces in Sentry:
SENTRY_AUTH_TOKEN=…       # Sentry → Settings → Auth Tokens (project:releases)
SENTRY_ORG=…
SENTRY_PROJECT_WEB=…
```

### Cloudflare (dashboard changes)

1. **Fix the `cf-error-pages` Worker.** The deployed version replaces every API
   error response with an HTML page that has no CORS headers. Browsers see that
   as a network failure, so users get "You appear to be offline" for a wrong
   password, a logged-out session, a rate limit, and so on. Deploy
   `infra/cloudflare/cf-error-pages/src/index.js`: either paste it into
   Workers → cf-error-pages → Edit code, or run `npx wrangler deploy` from that
   folder after adding a `wrangler.toml`. Alternatively, remove the Worker's
   routes for `api-gem.*` and `api-gem-dev.*`.
   Check: `curl -i https://api-gem.aidanlenahan.com/users/me` should return a
   JSON 401, not HTML.
2. **Put the dev API behind Access too.** `gem-dev.aidanlenahan.com` is behind
   Cloudflare Access, but `api-gem-dev.aidanlenahan.com` is open to the
   internet, and its `/` endpoint lists every route. Add the API hostname to
   the same Access application (or a sibling one in the same team domain) so
   the browser's `CF_Authorization` cookie covers both.

## Error tracking: what you have now

There are two channels, and both now label the environment correctly.

**Sentry** (structured, searchable, deduplicated):
- API (`@sentry/node`): unhandled 5xx route errors, BullMQ worker failures,
  uncaught exceptions and unhandled rejections. Events are flushed before the
  process exits.
- Web (`@sentry/react`): runtime errors and React render crashes. It loads
  lazily, 5 seconds after page load or on first interaction.
- Each event carries `environment` (production or staging) and `release` (the
  git SHA, from `dist-*/RELEASE` and `VITE_SENTRY_RELEASE`). In Sentry, filter
  by environment and look at **Releases** to see which deploy introduced an
  error.
- Source maps: if the `SENTRY_*` upload variables are set, deploys upload the
  maps to Sentry and then **delete them from the public build**. Before this
  change, `/assets/*.map` were downloadable by anyone.

**Alert emails** (`ERROR_ALERT_EMAILS`): the same server errors as Sentry plus
client errors POSTed to `/internal/client-error`. Repeats are throttled to one
email per 15 minutes. The subject reads `[GEM PRODUCTION]` or `[GEM STAGING]`.

Suggested Sentry setup (in the Sentry UI):
- Alerts → "A new issue is created" in **production**, sent to email or phone.
  Make a separate, quieter rule for staging.
- Alerts → "Number of errors > N in 5 min" for spikes.
- Settings → Inbound Filters: filter known browser-extension noise.
- Once you trust Sentry's alerts, you can drop the custom alert emails for
  `source=api` to avoid getting everything twice.

## Longer-term (recommended)

- **Separate checkouts:** `/var/www/gem-prod` (only ever on `main` or a tag)
  and `/var/www/gem-dev` (any branch). This removes the last shared state:
  `node_modules` and the generated Prisma client. Point each unit's
  `WorkingDirectory` and `ExecStart` at its own checkout.
- **Separate uploads:** set `UPLOAD_DIR` for dev (it defaults to
  `/var/www/gem/uploads`, which prod also uses).
- **Uptime monitoring:** point the status page at `/health/all`, which checks
  the DB, Redis and storage, not just `/health`.
- **Static hosting:** `vite preview` is meant for previews, not production.
  Serving `dist-prod` with Caddy or nginx, or from Cloudflare Pages, would also
  let you add security headers (CSP, HSTS) to the frontend. Today the frontend
  sends none.
- **Backups:** add a nightly `pg_dump` of `gem_prod`, plus a tested restore. It
  is already on the todo list as "PBS backup integration".

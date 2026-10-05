# AGENTS.md

## Project overview

Cleveland sports hub — multi-page app (static HTML/CSS/vanilla JS) with a Node.js/Express backend that reverse-proxies ESPN's public REST API for NBA, NFL, and MLB data. No database, no auth, no external credentials.

## Running in the sandbox

```bash
docker compose -f docker-compose.base44.yml up -d --build
```

- App listens on container port 3002, mapped to host port 3000.
- Dev server: nodemon with `--legacy-watch` (bind-mount friendly), auto-restarts on file changes.
- Dependencies installed via `npm ci` on container startup (lockfile-preserving).
- Health: `GET /home.html` returns 200.

## Key fixes applied for local dev

- `package.json` scripts pointed to `app.js` (doesn't exist at root); corrected to `server/app.js`.
- `server/app.js` `express.static()` paths referenced `pages/`, `styles/`, `scripts/`, `images/` — these directories don't exist; all static assets live under `public/`. Corrected to `public`, `public/styles`, `public/scripts`, `public/images`.
- `package-lock.json` had nodemon's `resolved` URL pointing to a Wix-internal registry (`npm.dev.wixpress.com`) that's unreachable outside Wix; replaced with the public npm registry URL.

## Architecture notes

- `index.js` (root) — Vercel entry; exports the Express app.
- `server/app.js` — Express app: static serving, API router mounts (`/nba`, `/nfl`, `/mlb`), root redirect to `/home.html`, 404 handler.
- `server/leagues.js` — registry of supported leagues; adding one is a single entry.
- `server/routing/LeagueRouter.js` — generic express router shared by all leagues (no ESPN knowledge).
- `server/data/EspnDataSource.js` — the only provider-specific class (ESPN URLs, API versions, cache keys/TTLs, retry policy); replaceable via the same method contract.
- `server/core/TtlCache.js` — generic in-memory TTL cache, injectable into a data source.
- `public/` — all static frontend assets (HTML pages, CSS, client JS, images).
- ESPN API is public (no auth/key required).

## Environment variables

| Variable | Purpose |
|----------|---------|
| `NODE_ENV` | `production` enables restrictive CORS; omitted/dev = all origins allowed. |
| `ALLOWED_ORIGIN` | Allowed origin for CORS in production. Optional in dev. |
| `ESPN_API_BASE_URL` | Overrides the ESPN API root (default `https://site.api.espn.com/apis/site`). |

No secrets required to boot.

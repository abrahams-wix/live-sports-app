# Live Sports App

A Cleveland sports hub built as a **multi-page application (MPA)** with a **Node.js/Express** backend. The frontend serves static HTML, CSS, and vanilla JavaScript; the backend acts as a **reverse proxy** to ESPN’s public REST API for NBA, NFL, and MLB data.

Most team pages still render **mock data** embedded in the client. The Guardians page is partially integrated with live schedule and box score data from the API.

---

## Features

| Area | Description |
|------|-------------|
| **Home** | Landing page with navigation to three team views (`/home.html`). |
| **Team pages** | Guardians (MLB), Browns (NFL), Cavaliers (NBA). Shared layout and navigation; per-team theming via CSS custom properties. |
| **Schedule carousel** | Guardians only — horizontal carousel of upcoming games with keyboard and button navigation. |
| **Box score table** | Reusable client component; sport-specific columns (innings + R/H/E for baseball; quarters + total for basketball/football). |
| **REST API** | League-scoped proxy routes under `/nba`, `/nfl`, and `/mlb`. See [docs/API-OVERVIEW.md](docs/API-OVERVIEW.md). |

---

## Architecture

```
Browser (MPA)          Express server              Upstream
─────────────          ──────────────              ────────
public/*.html    ←──   static assets (local dev)
public/scripts/  ←──   (Vercel: CDN serves public/)
fetch /mlb/...   ──→   routers → fetchESPN()  ──→  ESPN site.api.espn.com
```

- **Presentation layer:** HTML pages in `public/`, client scripts in `public/scripts/`, styles in `public/styles/`.
- **API layer:** Express routers in `server/routers/` forward requests to ESPN and return JSON **pass-through** responses (minimal transformation).
- **Data layer (client):** Team-specific modules (`guards-data.js`, etc.) normalize upstream payloads into shapes consumed by UI components.

---

## Tech stack

- **Runtime:** Node.js
- **Server:** Express 5, CORS middleware
- **Client:** Vanilla JavaScript (no framework)
- **Dev tooling:** nodemon
- **Deployment:** [Express on Vercel](https://vercel.com/docs/frameworks/backend/express) via root `index.js`

---

## Project structure

| Path | Role |
|------|------|
| `index.js` | Vercel entry point; exports the Express app from `server/app.js`. |
| `server/app.js` | Express application: static file serving (local), API mounts, root redirect, 404 handler. |
| `server/routers/` | League-specific REST proxy routes (`basketball.js`, `football.js`, `baseball.js`, `cache.js`). |
| `public/` | Static assets served to the browser (HTML, CSS, JS, images). |
| `public/scripts/boxscore.js` | Box score table renderer and sport configuration. |
| `public/scripts/carousel.js` | Schedule carousel component. |
| `public/scripts/*-data.js` | Client-side data fetching and ESPN-to-UI normalization. |
| `docs/` | API reference, feature design notes, glossary. |

---

## Local development

```bash
npm install
npm run dev    # nodemon — auto-restart on file changes
# or
npm start      # node server/app.js
```

- **Default port:** `3002` (configured in `server/app.js`)
- **Base URL:** `http://localhost:3002`
- **Entry:** `http://localhost:3002/` redirects to `/home.html`

Serve the app over HTTP — do not open HTML files via `file://`, or relative asset paths will fail.

### Environment variables

| Variable | Purpose |
|----------|---------|
| `NODE_ENV=production` | Enables production CORS policy. |
| `ALLOWED_ORIGIN` | Allowed browser origin for CORS in production (e.g. `https://your-domain.com`). Omitted in development (all origins allowed). |

---

## Deployment (Vercel)

Static assets belong in `public/` — Vercel serves `public/**` from its CDN; `express.static()` is ignored in production.

```bash
npx vercel          # link project (first time)
npx vercel dev      # local preview aligned with production routing
npx vercel deploy   # deploy
```

---

## Documentation

| Doc | Contents |
|-----|----------|
| [docs/API-OVERVIEW.md](docs/API-OVERVIEW.md) | REST endpoint reference and ESPN response shapes used by the client. |
| [docs/GLOSSARY.md](docs/GLOSSARY.md) | Shared terminology. |
| [docs/SYSTEM-DESIGN-TEMPLATE.md](docs/SYSTEM-DESIGN-TEMPLATE.md) | Template for feature design write-ups. |
| [docs/features/](docs/features/) | Implemented feature design notes. |

UI changes should follow the design system in `.cursor/rules/design-system.mdc`.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Server won’t start | Run `npm run dev` or `npm start`. If port 3002 is in use, stop the conflicting process or change the port in `server/app.js`. |
| 404 on pages | Use `http://localhost:3002/home.html` (or your deployment URL). Assets live under `public/`. |
| Missing styles or scripts | Serve over HTTP, not `file://`. Confirm files exist under `public/styles/` and `public/scripts/`. |
| API returns errors locally | ESPN requests require network access. Check the terminal for upstream fetch errors. |
| Team page shows static data | Expected for Browns/Cavs; only Guardians is wired to live API endpoints today. |

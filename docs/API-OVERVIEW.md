# REST API Reference

The Express server exposes league-scoped **proxy endpoints** that forward requests to ESPN’s public REST API and return the upstream JSON **unchanged**. The client is responsible for normalizing ESPN payloads into UI-friendly shapes.

Full ESPN responses may include fields not documented here. The sections below cover the parts consumed by this application.

---

## Base URL and route prefixes

| Prefix | Router | League | Upstream base (ESPN v2 unless noted) |
|--------|--------|--------|--------------------------------------|
| `/nba` | `server/routers/basketball.js` | NBA | `.../basketball/nba` |
| `/nfl` | `server/routers/football.js` | NFL | `.../football/nfl` |
| `/mlb` | `server/routers/baseball.js` | MLB | `.../baseball/mlb` |

**Local base URL:** `http://localhost:3002` (see `server/app.js`).

---

## Endpoints

The same path pattern applies across leagues. Replace `{league}` with `nba`, `nfl`, or `mlb`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/{league}/` | Health check. Returns plain text (`"Basketball!"`, `"Football!"`, or `"Baseball!"`). |
| `GET` | `/{league}/scoreboard` | Daily scoreboard. **MLB:** optional query `?dates=YYYYMMDD` (defaults to today). |
| `GET` | `/{league}/teams` | All teams in the league. |
| `GET` | `/{league}/teams/:id` | Single team by ESPN team ID. |
| `GET` | `/{league}/teams/:id/roster` | Team roster. |
| `GET` | `/{league}/teams/:id/schedule` | Team schedule (past and upcoming events). |
| `GET` | `/{league}/standings` | League standings. |
| `GET` | `/{league}/news` | League news feed. |
| `GET` | `/{league}/summary/:id` | Game summary (box score, linescore, metadata). `:id` is an ESPN event ID. |
| `GET` | `/{league}/leaders` | League statistical leaders (ESPN v3 leaders API). |

---

## Response contract

| Condition | HTTP status | Body |
|-----------|-------------|------|
| Success | `200` | Upstream JSON (`Content-Type: application/json`) |
| Upstream error | Matches ESPN status | `{ "error": "ESPN API error" }` |
| Network / fetch failure | `500` | `{ "error": "Failed to fetch data" }` |
| Unmatched route | `404` | `{ "error", "message", "advice" }` (see `server/app.js`) |

---

## Payload shapes used by the client

The Guardians integration (`public/scripts/guards-data.js`) consumes **schedule** and **summary** endpoints. Other endpoints are available but not yet wired to the UI.

### `GET /{league}/teams/:id/schedule`

Returns an ESPN schedule object.

**`data.events[]`** — each event includes:

| Field | Description |
|-------|-------------|
| `event.id` | Event ID (used to fetch `GET /summary/:id`) |
| `event.date` | ISO 8601 timestamp |
| `event.competitions[0].date` | Competition start time |
| `event.competitions[0].venue.fullName` | Venue name |
| `event.competitions[0].competitors[]` | Home/away teams with `homeAway`, `score`, `team`, `records` |
| `event.competitions[0].status` | Game state (`type.description`, `shortDetail`) |

The client maps each event to a **game object**: `id`, `date`, `time`, `venue`, `homeTeam` / `awayTeam` (name, logo, record), `status`, scores, and a `boxscore` field populated later from the summary endpoint.

---

### `GET /{league}/summary/:id`

Returns an ESPN game summary.

| Field | Description |
|-------|-------------|
| `summary.boxscore.teams[]` | Away/home entries with `team`, `homeAway`, and `statistics[]` (batting, fielding, pitching groups) |
| `summary.linescore.innings[]` | Per-inning scoring when available |

The client adapter produces a **box score row array** — each row: `{ team, logo, homeAway, scoreboard, runs, hits, errors }` — passed to `generateTable()` in `public/scripts/boxscore.js`.

---

### Other endpoints

`/teams`, `/scoreboard`, `/standings`, `/news`, and `/leaders` return raw ESPN payloads. No server-side transformation is applied.

---

## MLB quick reference

| Resource | Example |
|----------|---------|
| Cleveland Guardians team ID | `5` |
| Team schedule | `GET /mlb/teams/5/schedule` |
| Game summary | `GET /mlb/summary/{eventId}` |
| Scoreboard by date | `GET /mlb/scoreboard?dates=20250618` |

---

## Summary

| Route | Client usage |
|-------|--------------|
| `GET /{league}/teams/:id/schedule` | Populate schedule carousel |
| `GET /{league}/summary/:id` | Lazy-load box score for selected game |
| All other routes | Available; not yet consumed by the frontend |

Update this document when new endpoints are added or additional upstream fields are normalized on the client.

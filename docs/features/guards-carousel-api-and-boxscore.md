# Guardians Page: Live API Integration

## Problem statement

Wire the Guardians team page to live ESPN data: real schedules and team logos in the carousel, expanded detail on the active slide, and team logos in the box score table.

---

## Key concepts

| Concept | Description |
|---------|-------------|
| **REST proxy** | The browser calls same-origin endpoints (`/mlb/teams/5/schedule`, `/mlb/summary/:id`); Express forwards to ESPN. |
| **Adapter pattern** | Client modules map ESPN JSON to the existing carousel game object and box score row schemas so UI components stay unchanged. |
| **Lazy loading** | Only the selected game’s summary is fetched, reducing initial payload and upstream calls. |

---

## CSS additions

| Concept | Usage |
|---------|-------|
| **Flexbox** | Layout for expanded active-card content (matchup, venue, status, stats). |
| **`.carousel-slide.active`** | Scoped styles for detail visible only on the center slide. |
| **First-column logo** | `display: flex`, `align-items: center`, `gap` — logo beside team name in the box score table. |

---

## Options considered

| Option | Pros | Cons |
|--------|------|------|
| **A — Eager load all summaries** | Box scores ready for every slide | High upstream call volume; slow first paint |
| **B — Lazy load on selection** *(chosen)* | Fast initial load; one summary per interaction | Brief loading state when switching slides |
| **C — Scoreboard by date** | One call per day | Requires date iteration to build a team-specific schedule |

---

## Decision

Use **team schedule** for the carousel game list and **lazy-loaded summaries** for box score data. Expand the active slide with status, score, venue, time, records, and R/H/E. Render team logos in the box score when the row includes a `logo` field.

---

## Technologies

- **Express REST proxy** — existing `/mlb` routes (no new server endpoints).
- **`fetch` API** — client-side HTTP calls to same-origin proxy.
- **Adapter functions** — ESPN `events[]` and `summary.boxscore` → internal schemas.

---

## Reference implementation

```js
// Fetch schedule and normalize to game objects
const { events } = await (await fetch('/mlb/teams/5/schedule')).json();
const games = events.map(event => {
  const comp = event.competitions[0];
  const home = comp.competitors.find(c => c.homeAway === 'home');
  const away = comp.competitors.find(c => c.homeAway === 'away');
  const logo = t => t.team.logos?.[0]?.href || t.team.logo || '';
  const record = t => t.records?.[0]?.summary ?? '0-0';
  return {
    id: event.id,
    date: formatDate(comp.date),
    time: comp.status?.shortDetail ?? '',
    venue: comp.venue?.fullName ?? '',
    homeTeam: { name: home.team.displayName, logo: logo(home), record: record(home) },
    awayTeam: { name: away.team.displayName, logo: logo(away), record: record(away) },
    status: comp.status?.type?.description,
    homeScore: home.score,
    awayScore: away.score,
    boxscore: null  // populated on selection
  };
});

// Lazy-load summary for selected game
const summary = await (await fetch(`/mlb/summary/${gameId}`)).json();
game.boxscore = mapSummaryToBoxscore(summary);
generateTable(game.boxscore, sportConfig);
```

---

## Glossary

| Term | Definition |
|------|------------|
| **Linescore** | Period-by-period scoring (e.g. runs per inning). Rendered in the box score when present in the summary payload. |
| **Summary endpoint** | `GET /mlb/summary/:id` — returns box score, game metadata, and optional linescore for one event. |

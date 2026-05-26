# Glossary

Definitions for terms used across project documentation.

---

## Architecture

| Term | Definition |
|------|------------|
| **MPA (Multi-Page Application)** | A web app with separate HTML documents per view, as opposed to a single-page application (SPA) that swaps views in one document. |
| **BFF (Backend for Frontend)** | A server layer tailored to frontend needs. Here, Express proxies ESPN and can add caching or CORS without exposing upstream details to the browser. |
| **Reverse proxy** | A server that receives client requests, forwards them to an upstream service, and returns the upstream response. |
| **Upstream API** | The external service this app calls — ESPN’s public REST API at `site.api.espn.com`. |
| **Pass-through response** | Returning upstream JSON without transformation. The proxy adds no business logic to the payload. |
| **Static assets** | Files served directly to the browser: HTML, CSS, JavaScript, and images under `public/`. |

---

## API and data

| Term | Definition |
|------|------------|
| **REST API** | An HTTP-based interface using resources (URLs) and standard methods (`GET`, etc.) with structured responses (JSON). |
| **Endpoint / route** | A URL path the server handles (e.g. `GET /mlb/teams/5/schedule`). |
| **Payload** | The data body of an HTTP request or response. |
| **Normalization** | Converting an upstream data shape into a consistent internal shape the UI expects. |
| **Adapter pattern** | A module that maps one interface (ESPN JSON) to another (carousel game object, box score rows). |
| **Lazy loading** | Fetching data on demand (e.g. loading a game summary only when the user selects that game). |
| **Cache / TTL** | Storing a response for a time-to-live period to reduce repeated upstream calls. Implemented in `server/routers/cache.js`. |

---

## Frontend

| Term | Definition |
|------|------------|
| **Client / client-side** | Code that runs in the browser (HTML, CSS, JavaScript in `public/`). |
| **Server / server-side** | Code that runs on Node.js (Express in `server/`). |
| **Component** | A reusable UI unit. Here, implemented as plain functions and DOM manipulation (box score table, carousel). |
| **State** | Data that drives what the UI displays (e.g. the currently selected carousel slide). |
| **Mock data** | Hardcoded sample data embedded in a page or script, used when live API integration is not yet implemented. |

---

## Operations

| Term | Definition |
|------|------------|
| **CORS (Cross-Origin Resource Sharing)** | Browser security policy controlling which origins may call the API. Configured via the `cors` middleware and `ALLOWED_ORIGIN`. |
| **Environment variable** | Runtime configuration (e.g. `NODE_ENV`, `ALLOWED_ORIGIN`) set outside application code. |
| **Deployment** | Publishing the application to a hosting platform (e.g. Vercel). |

---

## Sports data (ESPN-specific)

| Term | Definition |
|------|------------|
| **Event ID** | ESPN’s identifier for a single game, used with `/summary/:id`. |
| **Team ID** | ESPN’s identifier for a franchise (e.g. Guardians = `5`). |
| **Linescore** | Period-by-period scoring (e.g. inning runs in baseball). |
| **Box score** | Tabular summary of team and player statistics for a completed or in-progress game. |

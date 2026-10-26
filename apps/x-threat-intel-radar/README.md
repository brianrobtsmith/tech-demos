# X Threat Intel Radar

A single-user dashboard that watches X for posts mentioning CVE IDs and ranks the CVEs by how fast engagement is growing. It uses [X API v2 recent search](https://docs.x.com/x-api/posts/search/integrate/overview) (`GET /2/tweets/search/recent`) with a security-keyword query, extracts CVE IDs with the pattern `CVE-\d{4}-\d{4,}`, and scores each CVE by **engagement velocity** — likes + reposts + replies + quotes per hour since each post was created, summed across posts from the last 24 hours. Each CVE on the leaderboard expands to the posts that mention it, with links to x.com. The header shows the remaining API quota from the `x-rate-limit-*` response headers.

Inspired by the threat-intel templates among the [Grok Bot X templates](https://x.com/ericzakariasson/status/2108645012644991251).

## Run it

```bash
bun install
bun run dev
```

Open http://localhost:3000. With no token configured the app runs in **MOCK mode** (clearly labeled in the UI) using realistic fictional fixtures, so it demos without any keys.

## Live mode

1. Copy `.env.example` to `.env.local`.
2. Set `X_BEARER_TOKEN` to an app-only (OAuth 2.0) bearer token from the [X developer portal](https://developer.x.com). The token is only ever read server-side in the `/api/radar` route handler; it never reaches the browser.
3. Restart `bun run dev`.

Set `MOCK=1` to force mock mode even with a token present.

## UI states

- **429 rate limited** — shows a reset countdown from `x-rate-limit-reset` with a retry button.
- **401/403 auth failure** — explains the token problem and how to fix or fall back to mock mode.
- Loading skeletons, an empty state, and a network-error state.

For demos, `?simulate=429` or `?simulate=401` on the page URL exercises those error states without touching real quota.

## Notes

- Recent search covers the last 7 days; this app requests a 24h window (`start_time`), `max_results=100`, `tweet.fields=created_at,public_metrics,author_id`, `expansions=author_id`.
- X tokenizes on punctuation, so the query term `CVE` matches posts containing IDs like `CVE-2026-31337`; the regex filter then drops posts without a well-formed CVE ID.
- Per-app limit for recent search is 450 requests / 15 min (app-only auth); the dashboard auto-refreshes every 60s, well inside that.

## Scope cuts (see PLAN.md)

No persistence or trend history, no NVD/CVSS enrichment, no pagination beyond one page of results, no streaming API, no deployment, no auth.

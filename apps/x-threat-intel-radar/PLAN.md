# PLAN — x-threat-intel-radar

## Goal

Show off X API v2 recent search as a live threat-intel signal: the app finds posts mentioning CVE IDs, ranks the CVEs by how fast engagement is growing, and lets you drill into the posts. In under a minute you can see which vulnerabilities X is talking about *right now* and click through to the posts.

## In (MVP)

- One Next.js page: a live CVE leaderboard ranked by engagement velocity (likes + reposts + replies + quotes per hour since each post was created, summed per CVE).
- Server-side route `/api/radar` that calls `GET https://api.x.com/2/tweets/search/recent` with a CVE + security-keyword query; the bearer token never reaches the browser.
- CVE extraction via regex `CVE-\d{4}-\d{4,}` from post text; posts without a real CVE ID are dropped.
- Each CVE row expands to its posts (author, text, metrics, age, link to x.com).
- Rate-limit meter from `x-rate-limit-limit/remaining/reset` headers.
- Clear UI states: loading skeletons, empty, 429 (shows reset countdown), 401/403 (auth help), network error.
- MOCK mode (no key, or `MOCK=1`): realistic fixtures, clearly labeled with a badge in the UI.
- `.env.example`, README, refresh button with auto-refresh every 60s.

## Out (deferred)

- Accounts/auth/multi-user, persistence (DB or history across refreshes), trend charts over time, NVD/CVSS enrichment, pagination beyond one search page, streaming/filtered-stream API, alerting/notifications, deployment, tests beyond a smoke check, dark-mode toggle, mobile polish.

## Tasks

- [ ] Leaderboard loads in MOCK mode with labeled fixture data, ranked by velocity
- [ ] With `X_BEARER_TOKEN` set, `/api/radar` hits live recent search and returns ranked CVEs + rate-limit info
- [ ] Clicking a CVE expands its posts with metrics and working x.com links
- [ ] Rate-limit remaining/reset is visible; simulated 429 and 401 render dedicated UI states
- [ ] Capture ≥1 screenshot and ≥1 video of the running app

## Stack

- **Bun** — repo rule; runtime + installer.
- **Next.js (App Router, `bunx create-next-app`)** — official starter, gives a server-side API route so the bearer token stays off the client.
- **shadcn/ui** — repo rule; prebuilt Card/Badge/Accordion/Alert/Skeleton/Progress beat custom widgets.
- **X API v2 recent search via `fetch`** — one GET endpoint with a bearer header; an SDK adds nothing here and `fetch` keeps header access (`x-rate-limit-*`) direct.
- **No state library** — one `useState` + polling; the dataset is one API response.

# Open-model bakeoff: MVP plan

Source: [Chamath's post](https://x.com/chamath/status/2101406709231337710) quoting [Guillermo Rauch](https://x.com/rauchg/status/2101186741042663579): open models were 78.4% of token volume on Vercel's AI Gateway that day. If open weights are winning, the open question is *who serves them best*.

## Goal
A single-user, local page that races **Together AI, Fireworks, and Baseten** serving the **same open model**. Pick a model, type a prompt, hit Run, and within a minute you can see which provider gets the first token out fastest, which streams fastest, and what each run cost.

## In (MVP)
- **One shared model, chosen from a small hard-coded list** of US-origin open models (for example gpt-oss-120B from OpenAI, NVIDIA Nemotron 3 Ultra, or Meta's Llama 3.3 70B Instruct — no Chinese-lab models). Each entry maps to the provider-specific model ID. Default to one model; check the IDs against each provider's docs at build time and disable any provider that doesn't serve an entry.
- **Prompt box + Run button.** One prompt goes to every enabled provider at once.
- **2–3 provider panels, side by side**, each streaming its answer live. Provider checkboxes; a provider with no key in `.env` shows as disabled with a short hint instead of throwing an error.
- **Per-panel metrics:** time to first token (ms), tokens/sec (output tokens ÷ time from first to last token), total input/output tokens (from the `usage` chunk, otherwise a clearly marked estimate), and **estimated $** from a hard-coded price table (`$/1M input`, `$/1M output` per provider×model, with an "as of" date in the file).
- **Winner highlighting:** a small badge on the fastest TTFT, highest tok/s, and cheapest panel.
- **Last 10 runs in `localStorage`:** a compact table under the panels (prompt snippet, model, per-provider TTFT, tok/s, $). Click a row to see its metrics again. A Clear button.
- **Keys stay server-side:** `TOGETHER_API_KEY`, `FIREWORKS_API_KEY`, `BASETEN_API_KEY` in `apps/open-model-bakeoff/.env.local`, documented in `.env.example`. A single streaming API route proxies to each provider.
- **Self-contained:** `cd apps/open-model-bakeoff && bun install && bun run dev`.
- Clear empty, loading, and per-panel error states. One provider failing never breaks the others.

## Out (deferred)
- Auth, accounts, multi-user anything
- Server-side history or a database
- Automated benchmark suites, repeated runs, percentiles, eval scoring
- Fine-tuning, dedicated deployments, or custom Baseten model deploys (use shared/serverless endpoints only)
- Live price scraping or pricing APIs
- More than 3 providers (OpenRouter, Groq, DeepInfra, and others can come later)
- Settings page, key entry in the UI, mobile polish, dark-mode toggle, charts, deployment, test suites beyond a smoke check

## Tasks (vertical slices)
- [ ] A user with only `TOGETHER_API_KEY` set types a prompt and sees Together's answer stream into one panel with live TTFT and tok/s.
- [ ] With all three keys set, the same prompt streams into Together, Fireworks, and Baseten panels at the same time. A missing key shows a disabled panel, and a provider error shows inline in that panel only.
- [ ] Each finished panel shows total tokens and estimated $ from the price table, and the fastest-TTFT, fastest-tok/s, and cheapest panels get badges.
- [ ] A user can switch the shared model from the dropdown and re-run. Only providers that host that model are enabled.
- [ ] After a reload, the last 10 runs appear in a history table from `localStorage`, and Clear empties it.
- [ ] `README.md` + `.env.example` explain setup. `bun install && bun run dev` works from a clean clone.
- [ ] Capture ≥1 screenshot and ≥1 video of the running app (a real side-by-side race) and attach both to the PR.

## Stack
Bun · Next.js (App Router) · shadcn/ui · `openai` SDK

- **Bun**: repo standard; fast install and dev; the per-app `bunfig.toml` with `minimumReleaseAge = 259200` goes in before the first install.
- **Next.js, not Vite**: keys must never reach the browser, and a Next route handler gives us a server-side streaming proxy in the same app with no second server. Vite would need a separate backend just for that.
- **shadcn/ui, minimalist**: neutral theme; `card`, `button`, `textarea`, `select`, `checkbox`, `badge`, `table`, `skeleton` and nothing else.
- **`openai` SDK with a per-provider `baseURL`**: all three expose OpenAI-compatible chat completions (Together `https://api.together.xyz/v1`, Fireworks `https://api.fireworks.ai/inference/v1`, Baseten Model APIs `https://inference.baseten.co/v1`; verify against current docs). One client and one code path, with `stream: true` and `stream_options: { include_usage: true }`.
- **Timing measured server-side** (request start → first content delta → last delta) and streamed to the client alongside the text, so browser rendering doesn't skew the numbers. Use NDJSON or SSE per provider.

## Keys
You need your own API key from each provider. `.env.example`:

```
TOGETHER_API_KEY=
FIREWORKS_API_KEY=
BASETEN_API_KEY=
```

Copy it to `.env.local` and fill in whichever providers you have. Providers without a key are skipped.

## Caveats to show in the UI footer
These are single-shot numbers from your network at one moment, not a benchmark. Prices are hard-coded as of the date in `lib/prices.ts`.

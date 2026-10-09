# Open-model bakeoff

Race **Together AI**, **Fireworks**, and **Baseten** serving the **same open-weight model**. Type one prompt, hit Run, and watch three panels stream side by side with live metrics:

- **TTFT** — time to first token (ms), measured server-side
- **Speed** — output tokens per second (first → last token)
- **Tokens** — input/output counts from the provider's `usage` chunk (falls back to a clearly-marked chars÷4 estimate)
- **Est. cost** — from the hard-coded price table in `lib/prices.ts` (as-of date inside)

The fastest-TTFT, fastest-stream, and cheapest panels get 🏆 badges. The last 10 runs live in `localStorage`; click a history row to reload its metrics, or Clear to wipe it.

## Setup

```sh
cd apps/open-model-bakeoff
bun install
cp .env.example .env.local   # fill in whichever keys you have
bun run dev
```

Open http://localhost:3000.

### Env vars (`.env.local`)

| Variable | Purpose |
| --- | --- |
| `TOGETHER_API_KEY` | Together AI key ([api.together.xyz](https://api.together.xyz)) |
| `FIREWORKS_API_KEY` | Fireworks key ([fireworks.ai](https://fireworks.ai)) |
| `BASETEN_API_KEY` | Baseten key ([baseten.co](https://www.baseten.co)) |
| `MOCK_PROVIDERS` | Optional. `1` lets keyless providers stream a labeled mock response with simulated latency, so the UI can be demoed with no keys at all. |

Any subset works — providers without a key show as disabled with a hint instead of erroring. Keys are only read inside Next.js route handlers (`app/api/race`, `app/api/providers`) and never reach the browser.

## Models

A small hard-coded list of open-weight models that all three providers serve on their shared/serverless endpoints (verified 2026-10-09, see `lib/models.ts`):

| Model | Together | Fireworks | Baseten |
| --- | --- | --- | --- |
| gpt-oss-120B | `openai/gpt-oss-120b` | `accounts/fireworks/models/gpt-oss-120b` | `openai/gpt-oss-120b` |
| DeepSeek V4.1 Flash | `deepseek-ai/DeepSeek-V4.1-Flash` | `accounts/fireworks/models/deepseek-v4p1-flash` | `deepseek-ai/DeepSeek-V4.1-Flash` |
| Kimi K3 | `moonshotai/Kimi-K3` | `accounts/fireworks/models/kimi-k3` | `moonshotai/Kimi-K3` |

All three providers expose OpenAI-compatible chat completions, so one `openai` SDK client with a per-provider `baseURL` covers everything (`stream: true`, `stream_options: { include_usage: true }`).

## How it works

The browser POSTs `{ providerId, modelKey, prompt }` to `/api/race` once per enabled provider. The route handler opens the provider stream, timestamps request-start / first-delta / last-delta on the server, and relays NDJSON events (`first`, `delta`, `usage`, `done`, `error`) back to the client. One provider failing never affects the others.

## Caveats

Single-shot numbers from one network at one moment — not a benchmark. Prices are hard-coded as of the date in `lib/prices.ts`.

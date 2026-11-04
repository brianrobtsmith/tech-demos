# Grill-me gauntlet

Question a rough product idea **one decision at a time** before anything gets built, then download a short spec. The interview follows [Matt Pocock's grill-me skill](https://github.com/mattpocock/skills/tree/main/skills/productivity/grill-me) (MIT). The page opens on a fictional Setasides idea: let couples set aside money for irregular big expenses with a shared goal. You can replace that text with any other idea.

Setasides, in this demo, is a personal savings and planning app. Nothing here is a real person, a real balance, or financial advice.

## Setup

```sh
cd apps/grill-me-gauntlet && bun install && bun run dev
```

Open http://localhost:3000.

No API key is required. With no key, or with `MOCK_PROVIDERS=1`, the app runs a scripted interview and writes the spec from your answers.

### Env vars (`.env.local`)

Copy `.env.example` to `.env.local`.

| Variable | Purpose |
| --- | --- |
| `TOGETHER_API_KEY` | Together AI. Used first if set. Model `openai/gpt-oss-120b`. |
| `FIREWORKS_API_KEY` | Fireworks. Used when Together is unset. Model `accounts/fireworks/models/gpt-oss-120b`. |
| `BASETEN_API_KEY` | Baseten. Used when the other two are unset. Model `openai/gpt-oss-120b`. |
| `MOCK_PROVIDERS` | Set to `1` to force the script even when a key is present. |

Keys are read only in `app/api/grill/route.ts`. The browser never sees them. Live mode calls one US-hosted open model. This app does not call DeepSeek, Kimi, Qwen, GLM, or any other Chinese-lab model.

## What you can do

1. Keep the Setasides example or type another idea. **Start grilling.**
2. Each turn is one question plus a recommended answer. **Yes, use this** accepts it. **Send a different answer** uses your words. On the example, describing the problem as a disagreement adds a conflict question.
3. The branch list and the “Question N of M” label show what is settled and what is still open.
4. After you confirm a shared understanding, the page shows **problem, users, scope, open risks, and non-goals**. **Download markdown** saves `grill-me-spec.md`.

The last session is kept in `localStorage`. **Start over** clears the interview and leaves the idea text.

## Skill

`grill-me` is MIT, Copyright (c) 2026 Matt Pocock. The repo license is in `skills/upstream/LICENSE`. This app vendors, unchanged:

- `skills/upstream/grill-me/SKILL.md` (and `agents/openai.yaml`)
- `skills/upstream/grilling/SKILL.md` — the file `grill-me` tells the agent to call

Pinned commit: `4ae2317ddb22b046e26455e4f9c9b3aaaf62212d`. See `skills/upstream/SOURCE.md`.

The route reads those files on every request. In live mode they are the system prompt. The current `grilling` skill asks every ready frontier question in one round. This page asks **one** of those decisions per turn so the progress stays visible. The rest of the discipline is the skill's: a design tree, a recommended answer that “yes” accepts, and no spec until you confirm.

You can also install the skill yourself with `npx skills add mattpocock/skills --skill grill-me`. This demo does not need that command; the vendored files are what the server loads.

Found via [Greg Isenberg](https://x.com/gregisenberg/status/2117734977312047537).

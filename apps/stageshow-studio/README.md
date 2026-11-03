# Stageshow Studio

A one-page demo of [Stageshow](https://github.com/benjitaylor/skills/tree/main/stageshow): the same product brief drawn **with** the skill’s framing and **without** it.

The default brief is the Setasides Accounts page (fictional Dana & Sam Park). Generate, and you get side-by-side stills, a short live-update animation, the connection states from the product notes, and a bento grid.

## Run

From this folder:

```bash
bun install
bun run dev
```

Open the printed localhost URL. With no API keys the app stays in mock mode and uses `fixtures/` plus `data/accounts.sample.json`.

```bash
bun run lint
bun run build
```

## Mock mode

Mock mode is the default when no provider key is set, and whenever `MOCK_PROVIDERS=1`.

Copy `.env.example` to `.env.local` only if you want a live model. The first key that is set wins, unless `MODEL_PROVIDER` picks one of `openai`, `anthropic`, `together`, `fireworks`, or `baseten`.

| Provider | Key | Default model |
|---|---|---|
| OpenAI | `OPENAI_API_KEY` | `gpt-4.1-mini` |
| Anthropic | `ANTHROPIC_API_KEY` | `claude-haiku-4-5` |
| Together | `TOGETHER_API_KEY` | `openai/gpt-oss-120b` |
| Fireworks | `FIREWORKS_API_KEY` | `accounts/fireworks/models/gpt-oss-120b` |
| Baseten | `BASETEN_API_KEY` | `openai/gpt-oss-120b` |

Models from DeepSeek, Kimi, Qwen, GLM, and other Chinese labs are rejected. US-hosted endpoints only.

Live mode asks the model for structured scene JSON. The page renders that JSON. It does not inject model HTML.

Accounts stills always use the fictional Park household in `data/accounts.sample.json`. See `data/README.md` for the shape. There is no local accounts file.

## Stageshow credit

[Benji Taylor’s launch post](https://x.com/benjitaylor/status/2116593247854453244) · [skill](https://github.com/benjitaylor/skills/tree/main/stageshow) · [breakdown](https://x.com/shannholmberg/status/2116957574008590445)

The skill’s own folder carries an MIT license; the GitHub repo root does not show a detected license. This app does **not** copy `kit/`, examples, or other skill files into the repo. Install it on the machine that generates, if you want the live prompt to include the skill text:

```bash
npx skills add benjitaylor/skills --skill stageshow -g
```

Mock mode does not need that install. If `SKILL.md` is missing, the server uses a short summary of the same rules.

## What was left out

Accounts, auth, saving to a server, deployment, and the optional Plaid / Supabase phase. No edits to any Setasides project. Plans-tab depth and real money movement are out of scope.

# AGENTS.md — rules for cloud agents

These rules apply to every agent working in this repository. Follow them exactly.

## Scope

1. **Only add or update `apps/<kebab-slug>/`.** The slug is given in your task and must be kebab-case (e.g. `open-model-bakeoff`).
2. **Never touch other apps.** Do not edit, move, or delete anything in another `apps/*` folder.
3. **Do not change repo-level files** (`README.md`, `AGENTS.md`, `skills/`, `tracking/`, root `bunfig.toml`, `.gitignore`) unless the task explicitly says so.
4. **Never create new repositories.** All work goes into this repo.

## How to build

- **Model:** Fable 5.
- **Plan first** using [`skills/project-planning/SKILL.md`](./skills/project-planning/SKILL.md). Keep to the single-user MVP boundary in the plan; defer everything else.
- **Runtime/tooling:** Bun only (`bun`, `bunx`). No npm, yarn, or pnpm lockfiles.
- **Start from an official starter** via `bunx create-*` (or the framework's documented Bun command) inside `apps/<slug>/`.
- **Supply-chain guard:** before the first `bun install`, make sure `apps/<slug>/bunfig.toml` contains:

  ```toml
  [install]
  minimumReleaseAge = 259200
  ```

- **UI:** shadcn/ui, minimalist. Prefer prebuilt components and libraries over custom code.
- **Self-contained:** the app must run from its own folder with `bun install && bun run dev`. Include `apps/<slug>/README.md` with setup steps and any required env vars, plus a `.env.example` (never commit real secrets).

## Delivering

- **Open exactly one pull request** for the task, from a branch named after the slug.
- The PR **MUST attach at least one screenshot AND at least one video** of the app actually running. A PR without both is incomplete.
- PR description: what the demo does, how to run it, what was cut from scope.

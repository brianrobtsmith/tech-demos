---
name: project-planning
description: Plan a tight, single-user MVP demo built with Bun and shadcn/ui before any code is written. Use at the start of every build in apps/<slug>/.
---

# Project planning (Bun + shadcn MVP)

Opinionated: the goal is a small demo that works end to end, not a product. Write the plan into the PR description (or `apps/<slug>/PLAN.md`) before building.

## 1. Goal

One or two sentences: what technology is being shown off, and what a person can *do* with the demo in under a minute.

## 2. Single-user MVP boundary

- One user, running locally. No accounts, auth, teams, or multi-tenancy.
- State lives in memory or the browser (`localStorage`) unless the tech itself requires a store.
- Bring-your-own API keys via `.env` / `.env.example`.
- Write an explicit **In** list and an explicit **Out (deferred)** list.

## 3. Outcome tasks

A short checklist (aim for 3–7 items), each phrased as an observable outcome, not an activity:

- ✅ "User types a prompt and sees streamed output from provider A"
- ❌ "Set up streaming"

The last task is always: *capture ≥1 screenshot and ≥1 video of the running app for the PR.*

## 4. Prefer prebuilts

- Official SDKs over hand-rolled HTTP clients.
- shadcn/ui components and well-known libraries over custom widgets.
- If something takes more than a few lines and a library does it, use the library.

## 5. Scaffold

1. `cd apps/` and scaffold with an official starter via `bunx create-*` (e.g. `bunx create-next-app@latest <slug>`, `bun create vite <slug>`), using the framework's Bun option where offered.
2. **Before `bun install`**, add `apps/<slug>/bunfig.toml`:

   ```toml
   [install]
   minimumReleaseAge = 259200
   ```

   (3 days; skips freshly published packages as a supply-chain guard.)
3. `bun install`, then initialize shadcn: `bunx shadcn@latest init` and add only the components you need.

## 6. UI

Minimalist shadcn: neutral theme, one page if possible, clear empty/loading/error states, no custom design system.

## 7. Defer non-MVP

Anything not required to show the core tech goes in **Out (deferred)**: auth, persistence servers, settings pages, analytics, test suites beyond a smoke check, deployment, i18n, dark-mode toggles, mobile polish. When in doubt, cut it.

## Plan template

```markdown
## Goal
...
## In (MVP)
- ...
## Out (deferred)
- ...
## Tasks
- [ ] ...
- [ ] Capture ≥1 screenshot and ≥1 video of the running app
## Stack
Bun · <starter> · shadcn/ui · <SDKs>
```

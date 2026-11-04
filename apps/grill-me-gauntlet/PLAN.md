# Grill-me gauntlet: plan

Source: [Greg Isenberg on X](https://x.com/gregisenberg/status/2117734977312047537) · Skill: [mattpocock/skills → grill-me](https://github.com/mattpocock/skills/tree/main/skills/productivity/grill-me) · Install: `npx skills add mattpocock/skills --skill grill-me`

Featured idea: a **fictional Setasides feature** — let couples set aside money for irregular big expenses with a shared goal. Setasides is a personal savings and planning app. Every person and dollar in this demo is made up.

## Goal
Show Matt Pocock's **grill-me** skill: an agent that questions a rough product idea, one decision at a time, before anything gets built. In under a minute, a person pastes an idea (or keeps the Setasides example), answers a short interview, and downloads a one-page spec.

## Skill facts (verified from the repo)
- Repo license: **MIT**, Copyright (c) 2026 Matt Pocock. SPDX: MIT. Vendoring the skill text is allowed if the copyright and permission notice stay with the copy.
- `skills/productivity/grill-me/SKILL.md` is the user-invoked entry. Its body is: call the `grilling` skill.
- `skills/productivity/grilling/SKILL.md` is the interview discipline. It maps the idea as a **design tree**, asks only decisions whose prerequisites are already settled (the **frontier**), and gives a **recommended answer** worded so "yes" accepts it. Facts from the environment are the agent's job. The session is done when the frontier is empty, and the agent does not act until the user confirms a shared understanding.
- Pinned upstream commit: `4ae2317ddb22b046e26455e4f9c9b3aaaf62212d` (main, 2026-10-31).
- The current `grilling` skill asks the whole frontier in one round. This demo's page shows **one question at a time** (the next frontier decision only), which is the behavior the source post describes and the behavior this page is built to show. The rest of the discipline is unchanged: design tree, recommended answer, "yes" accepts it, no spec until the user confirms.

## License & attribution
- Vendor the MIT `LICENSE` plus `grill-me/SKILL.md`, `grill-me/agents/openai.yaml`, and `grilling/SKILL.md` under `skills/upstream/`, with `skills/upstream/SOURCE.md` naming the repo, path, and commit.
- The server reads those files at request time and puts them in the live system prompt. Do not paraphrase the skill into a second copy of the instructions.
- README and the page footer credit Matt Pocock, link the skill repo and the Greg Isenberg post, and name the MIT license.

## In (MVP)
- One page, Next.js 16 App Router + Bun + shadcn, self-contained in `apps/grill-me-gauntlet/`.
- `next.config.ts` sets `turbopack.root` to the app directory and keeps the Tailwind turbopack CSS rule used by the other apps:
  ```ts
  turbopack: {
    root: path.resolve(import.meta.dirname),
    rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } },
  }
  ```
- **Idea step.** A textarea, prefilled with the fictional Setasides example ("Let couples set aside money for irregular big expenses with a shared goal."). A control restores that example. Free-form text uses the same interview.
- **Interview.** The server returns one question: a short title, the question, the recommended answer, and which branch it belongs to (users, problem, sharing, scope, amount, risks, non-goals, confirm). "Yes, use this" accepts the recommendation. A text box sends a different answer. Settled decisions stay visible.
- **Progress.** A list of branches with the current one marked, a count ("Question 3 of 7"), and a progress bar. Upcoming branches can change after an answer; the list redraws from the server.
- **Spec.** After the user confirms, the page shows problem, users, scope, open risks, and non-goals, plus the decision log. **Download markdown** saves that spec. No code is generated.
- **Mock mode is the default.** `MOCK_PROVIDERS=1`, or no provider key, returns a scripted interview and a spec composed from the answers. The Setasides example has its own script. Any other idea gets a shorter script that quotes the idea. The app runs with zero keys. Mock copy never uses a real person or a real balance.
- **Live mode (optional).** First key among `TOGETHER_API_KEY`, `FIREWORKS_API_KEY`, `BASETEN_API_KEY` calls **gpt-oss-120b** through the OpenAI-compatible SDK (Together `openai/gpt-oss-120b`, Fireworks `accounts/fireworks/models/gpt-oss-120b`, Baseten `openai/gpt-oss-120b`). The model must return one JSON question, a confirmation, or the spec. US-hosted open models only. Never DeepSeek, Kimi, Qwen, GLM, or any other Chinese-lab model.
- `.env.example` lists those three keys and `MOCK_PROVIDERS`. Keys stay in route handlers.
- Session state in memory and `localStorage`. Start over clears it.
- README with `cd apps/grill-me-gauntlet && bun install && bun run dev`.

## Out (deferred)
- Auth, accounts, multi-user, a server database, deployment, i18n, a dark-mode toggle, mobile-specific polish, test suites beyond `bun run build` and `bun run lint`.
- `grill-with-docs` (glossary and ADRs), issue-tracker publishing, and generating tickets or code from the spec.
- Streaming tokens, model picking in the UI, more than one provider per session.
- Real Setasides data, bank links, or any personal financial information.

## Tasks
- [x] The page opens on the fictional Setasides idea in mock mode, with no keys required
- [x] Accepting or typing answers walks one question at a time, and the progress list updates
- [x] Confirming writes a spec with problem, users, scope, open risks, and non-goals, and Download saves markdown
- [x] A free-form idea uses the same flow with the generic mock script
- [x] With a provider key and `MOCK_PROVIDERS` unset, the same flow calls gpt-oss-120b on Together, Fireworks, or Baseten and loads the vendored skill text into the prompt
- [x] Footer and README credit Matt Pocock (MIT) and link the skill
- [x] `bun install && bun run dev` works from `apps/grill-me-gauntlet/`
- [x] Capture ≥1 screenshot and ≥1 video of the running app (mock flow: idea, a few answers, final spec) and attach both to the PR

## Stack
Bun · create-next-app (Next.js 16, Turbopack) · shadcn/ui (button, card, textarea, badge, progress, separator, skeleton) · `openai` SDK · zod

- **Bun** and `bunfig.toml` (`minimumReleaseAge = 259200`) before the first install.
- **Next.js route handlers** so the skill text and API keys stay on the server.
- **shadcn/ui**, neutral, one page.
- **`openai` SDK** with a per-provider `baseURL`, same three endpoints as open-model-bakeoff.

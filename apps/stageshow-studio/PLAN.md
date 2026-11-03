# stageshow-studio: plan

Source: [Benji Taylor on X](https://x.com/benjitaylor/status/2116593247854453244) · Breakdown: [shannholmberg](https://x.com/shannholmberg/status/2116957574008590445) · Skill: [benjitaylor/skills → stageshow](https://github.com/benjitaylor/skills/tree/main/stageshow) · Install: `npx skills add benjitaylor/skills --skill stageshow`

Featured product surface: **Setasides Accounts page** (design mockups + Product PRD excerpts vendored under `design/`).

## Goal
Show what Benji Taylor's **Stageshow** agent skill changes about faux product UI. In under a minute, a user opens the demo (default: the Setasides Accounts preset), hits Generate, and sees a **side-by-side**: the same brief rendered **with** Stageshow skill instructions vs **without**. Each side shows a few stills (and a small bento that can include a Cash flow tile). The difference in framing, restraint, and polish should be obvious.

## Stageshow facts (verified from SKILL.md)
- Skill teaches authored React + plain CSS faux UI (windows, phones, dashboards, bento grids, cursor walkthroughs)—not browser automation. `a.click()` / `a.set()` are illustration APIs.
- Quality bar: gold examples in the skill (`static-card`, `bento`, `hero-demo`, `ai-chat`, …). Failures called out: too much detail, wireframe, boxed screenshot, flat weight, bland gray.
- Workflow: plan medium/place → look (theme/palette/fidelity) → story → copy closest gold → craft → (optional) choreograph → rehearse.
- Kit: copy `kit/` when *using* the skill in an agent workspace. **This demo must not vendor or redistribute Stageshow kit/examples/references.** See License below.
- Typical still sizes: ~720×340 hero-beside-copy, ~900–1100 full-width hero, ~400×300 card; bento planned as one set.

## License & redistribution (important)
- GitHub does **not** detect a root LICENSE on `benjitaylor/skills` (repo-level "No license" on the about box).
- The skill folder itself ships `stageshow/LICENSE` (**MIT**, Copyright 2026 Benji Taylor) plus `NOTICE.md`. Treat repo-root ambiguity as a reason to stay conservative.
- **Do not vendor, copy, or commit** Stageshow `kit/`, `examples/`, `references/`, `scripts/`, or other skill files into this app.
- **Allowed:** install/invoke at build or generate time via `npx skills add benjitaylor/skills --skill stageshow` (or equivalent) inside the cloud-agent / local workspace only; feed skill instructions into the LLM prompt; produce **new** React/CSS output owned by this demo.
- README footer: credit Benji Taylor / Stageshow with links to the launch post and the skill repo. Do not claim the skill is Apache/MIT-cleared for redistribution beyond what MIT on the skill folder already allows—and still do not vendor its files here.

## Featured preset — Setasides Accounts page
- Default selection on first load. Free-text product idea input remains available beside it.
- Driven by `presets/setasides-accounts.json` (tokens, layout, sections, components, copy, PRD still list). Design HTML under `design/mockups/` and PNGs under `design/screenshots/` are the **visual source of truth**; the JSON is the machine-readable brief the generator consumes.
- Cash flow desktop/phone mockups may appear as a **second bento tile** (not the primary still).
- Design rules (must carry into both Stageshow and baseline prompts, and into mock fixtures):
  - Progress bars: **blue only**, never green.
  - Shortfalls: **gray** text/status, never red.
  - Kind labels: plain gray text; **no emoji, no pills**.
  - Amounts: big and bold.
  - Yields labeled as **targets** (e.g. "Target 3–5%"), with the shared disclaimer.
  - Tabs: **Accounts | Plans | Cash flow**. "Who needs to work?" lives on Cash flow only.

### Park household sample (committed)
Fictional Dana & Sam Park — safe to commit and required for screenshots/video:

| Item | Value |
|---|---|
| Total balance | $500,000 |
| Non-retirement | $114,600 |
| Retirement | $385,400 |
| Checking | $16,400 · target $14,278 · $2,122 over · ···8049 |
| Savings | $38,200 · target $40,000 · $1,800 short · Target yield 3–5% · earned $1,528 YTD |
| Long-term savings | $60,000 · Target yield 5%+ · earned $3,392 YTD · +$2,080 market change |
| Suggested move | Move $1,800 Checking → Savings (after: Checking $14,600 / Savings $40,000) |
| 401(k) | Dana $312,000 · available at 59½ |
| Roth IRA | Sam $73,400 |
| Cash flow (bento tile) | Dana $6,000 + Sam $3,500 = $9,500 in; out $7,139; **$2,361 ahead**; $410/mo investment income reinvested by default |

### Sample data only
- The app always reads `data/accounts.sample.json` (fictional Park household), including at runtime. There is no local accounts override.
- Never load real finances, bank logins, or Plaid tokens. Document the JSON schema in `data/README.md`.
- PR screenshots and video use this sample only.

### PRD states as Stageshow stills / short animations
From Product PRD excerpts in `design/prd/plaid-accounts-realtime-excerpts.md` (full draft: Google Doc `1_QqRR6s4yb25KqKGRUIShsOiEmlUUh3j0o6jJJedB6A`). Customer copy: plain language; never say "Plaid", "webhook", "Realtime", or "MCP" on the faux UI.

| Still / beat | Story |
|---|---|
| Connect | Empty Accounts → "Connect your bank" → institution picker (generic) → success with Park balances filling in |
| Syncing | Subtle "Updating balances…" status; blue progress, no green |
| Live update | Balance tick (e.g. Checking updates) as a short once-in-view animation |
| Re-sign-in | Banner: "Reconnect Example Bank to keep balances current" + Reconnect (ITEM_LOGIN_REQUIRED; no error codes) |
| Disconnect | Confirm remove → account row gone |
| Stale price | Holdings row with gray "Price as of …" when market price is stale (§16) |

MVP can ship **static stills** for each state plus one short live-update loop; full cursor choreography is nice-to-have within the same page.

## In (MVP)
- One page, Next.js 16 App Router + Bun + shadcn, self-contained in `apps/stageshow-studio/`.
- `next.config.ts` sets `turbopack.root` to the app dir **and** keeps the Tailwind turbopack CSS rule pattern used by bakeoff / kid-learning-paths:
  ```ts
  turbopack: {
    root: path.resolve(import.meta.dirname),
    rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } },
  }
  ```
- UI: preset chips (default **Setasides Accounts**) + textarea for a free-text idea + Generate. Side-by-side columns: **With Stageshow** | **Without Stageshow**. Each column: 2–4 stills + one bento grid preview.
- Generation path (server route):
  1. Build a shared product brief from the preset JSON (or free-text) + the Park sample accounts data.
  2. **With** path: system/developer prompt includes Stageshow skill guidance (loaded at runtime from an installed skill or a **summarized** instruction block derived at generate-time—not a vendored kit). Ask the model for React+CSS (or structured scene JSON the app renders) following Stageshow rules; prefer starting conceptually from gold patterns like `static-card` / `bento` / `device-pair`.
  3. **Without** path: same brief, generic "make a product mock UI" prompt, no Stageshow rules.
  4. US-hosted models only: OpenAI, Anthropic, or US open models via Together / Fireworks / Baseten (e.g. gpt-oss-120b). **Never** DeepSeek, Kimi, Qwen, or other Chinese-lab models.
- **MOCK mode:** `MOCK_PROVIDERS=1` or no keys → return committed fixtures under `fixtures/` that already illustrate a clear with-vs-without gap (Park Accounts). App must run with zero keys.
- `.env.example`: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `TOGETHER_API_KEY`, `FIREWORKS_API_KEY`, `BASETEN_API_KEY`, `MOCK_PROVIDERS`.
- README: setup, preset, accounts schema, Stageshow credit + no-vendoring note, mock mode. Sample data only.
- State in memory / `localStorage` only.

## Out (deferred)
- Auth, multi-user, persistence servers, deployment, i18n, dark-mode toggle, test suites beyond smoke.
- Vendoring Stageshow kit/examples; publishing generated UI as a design system.
- **Optional phase 2 (Brian decides — off by default):** Plaid Sandbox Link, token exchange Edge Function, webhook `/transactions/sync`, `realtime.broadcast_changes` on private `user:<id>` with RLS. If ever built inside this demo:
  - Use a **new** separate Supabase project or local `supabase start` only.
  - **Never** touch SetAsides / setasides-preview Supabase projects.
  - **Never** modify `brianrobtsmith/setasides`.
  - Still no real Plaid tokens in git; Sandbox only.
- Full Epic MM money movement; real RIA advice; Plans tab depth.

## Tasks
- [x] First paint defaults to Setasides Accounts preset; Generate (or mock) shows Park Accounts stills side-by-side with vs without Stageshow
- [x] Free-text idea path works the same side-by-side flow
- [x] Bento includes at least one Accounts hero tile; Cash flow may appear as a second tile
- [x] PRD states (connect, syncing, live update, re-sign-in, disconnect, stale price) appear as labeled stills or one short animation
- [x] Runtime accounts data is the Park household in `accounts.sample.json` only; no local override
- [x] `bun install && bun run dev` works from `apps/stageshow-studio/` with no keys (mock fixtures)
- [x] Capture ≥1 screenshot and ≥1 video of the running app (**sample/Park data only**) and attach both to the PR

## Stack
Bun · create-next-app (Next.js 16, Turbopack) · shadcn/ui (button, card, textarea, tabs, badge, skeleton, toggle-group) · `openai` and/or `@anthropic-ai/sdk` · zod · Stageshow invoked at generate-time only (no vendored kit)

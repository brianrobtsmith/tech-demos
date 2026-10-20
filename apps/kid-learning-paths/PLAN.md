# kid-learning-paths: plan

Source: [Lionel Mora on X](https://x.com/lionel_mora/status/2111156593693794386) · Data: [withmarbleapp/os-taxonomy](https://github.com/withmarbleapp/os-taxonomy) (v1, commit `79ce89b`)

## Goal
Show off the Marble Skill Taxonomy, an open prerequisite graph of primary-school learning. In under a minute, a user picks a child's age and a target concept, sees the prerequisite tree with reasons, runs a quick placement check that works backward from the goal, and gets a gap report plus generated practice for each missing concept.

## Data facts (verified in the repo)
- `data/topics.json` → `{ version, topicCount: 1616, topics: [...] }`. Each topic has `id` (`mt_…`), `type`, `subject`, `domain`, `name`, `description`, `ageRangeStart`, `ageRangeEnd`, `centrality`, `evidence[]` (mastery criteria), `assessmentPrompt` (has a `{{name}}` placeholder), and `standards[]`.
- `data/dependencies.json` → `{ edgeCount: 3317, dependencies: [{ topicId, prerequisiteId, strength: "hard"|"soft", reason }] }`. `topicId` depends on `prerequisiteId`, and the graph is a DAG.
- **Assessment items:** every topic (1,616 of 1,616) has an `assessmentPrompt` plus `evidence` criteria. These are parent-observation prompts, not multiple-choice quizzes. `teaching-research.json` (~24 MB, Science and Maths only, partial) has an `assess` field with diagnostics. Don't load it in the MVP.
- 8 subjects (Science 547, Mathematics 529, English 286, History 90, PSD 88, Life Skills 37, Computing 21, Learning to Learn 18).

## License & attribution
- Database: **ODbL 1.0** (attribution + share-alike for derived databases). Text content (names, descriptions, evidence, assessmentPrompt, reasons): **CC BY-SA 4.0**.
- Vendor only `topics.json` and `dependencies.json` (unmodified) into `apps/kid-learning-paths/data/`, plus `LICENSE` (ODbL), `LICENSE-CONTENT` (CC BY-SA), and a `data/README.md` with the source URL and commit. Do NOT vendor `curriculum-standards.json`, which carries third-party licenses. Show standard IDs only as plain strings, or hide them.
- The app footer and README must show: *"Marble Skill Taxonomy (v1) · © Generative Spark, Inc. (Marble) · https://withmarble.com · licensed under ODbL 1.0 (database) and CC BY-SA 4.0 (content)."*
- Practice items generated from CC BY-SA text are labeled "AI-generated, adapted from Marble Skill Taxonomy (CC BY-SA 4.0)".

## In (MVP)
- One page in Next.js (App Router) + shadcn, run with `bun install && bun run dev`. Self-contained in `apps/kid-learning-paths/`.
- `next.config.ts` sets `turbopack: { root: path.resolve(import.meta.dirname) }`.
- Taxonomy loaded server-side from the vendored JSON. Build an in-memory graph (prereqs map and unlocks map).
- **Pick:** a profile/age selector plus a subject filter and a searchable concept combobox (shadcn Command) limited to topics whose age range covers the age (±1).
- **Tree:** collapsible prerequisite tree (hard edges by default, soft edges toggleable). Each edge shows its `reason`. Also show an ordered **learn-first path**: a topological sort of the target's ancestors, earliest age first.
- **Placement check:** start at the target and ask 1–2 questions per concept, built from `assessmentPrompt` (with `{{name}}` replaced by the child's name) and the first `evidence` item. Answers are Yes / Not yet / Not sure. On "Yes", mark the concept and its ancestors as assumed mastered. On "Not yet", go back to its hard prerequisites (BFS, capped at ~12 questions).
- **Gap report:** mastered vs missing vs untested, with a **learn-next** list (missing concepts whose prerequisites are all mastered, in topological order).
- **Practice:** a "Generate practice" button per missing concept. It calls a server route that uses **gpt-oss-120B** through the OpenAI-compatible SDK on Together (`openai/gpt-oss-120b`), Fireworks (`accounts/fireworks/models/gpt-oss-120b`), or Baseten, whichever key is set first. It returns 3 age-appropriate questions plus 1 hands-on activity as JSON.
- **MOCK mode:** `MOCK_PROVIDERS=1`, or no keys set, returns canned practice so nothing needs a key. `.env.example` lists `TOGETHER_API_KEY`, `FIREWORKS_API_KEY`, `BASETEN_API_KEY`, `MOCK_PROVIDERS`.
- **Sample profiles:** "Kindergartner (Charlie)" (age 5, e.g. Maths target like adding within 10) and "5th grader (Lillian)" (age 10, e.g. fractions or multi-digit multiplication target). Each comes with clearly fake pre-filled sample answers labeled "Sample data", which you can load with one click.
- State in memory plus `localStorage`.

## Out (deferred)
- Accounts, multiple kids, saved history on a server, teaching-research.json and the curriculum-standards catalogue, 3D graph visualization, scoring or adaptive psychometrics, real child data, deployment, tests beyond a smoke check, dark-mode toggle, i18n.
- Any non-US model or provider. No Chinese models such as DeepSeek, Qwen, or Kimi.

## Tasks
- [ ] Choosing "5th grader (Lillian)" and a fractions concept shows a prerequisite tree with edge reasons and a numbered learn-first path
- [ ] Placement check asks ≤2 questions per concept, walks backward on "Not yet", and stops where the child is solid
- [ ] Gap report lists mastered / missing / untested plus a learn-next list
- [ ] "Generate practice" returns 3 questions + 1 activity via gpt-oss-120B on a US provider, or mock output with `MOCK_PROVIDERS=1`
- [ ] Footer and README show the Marble attribution, and LICENSE files are vendored with the data
- [ ] `bun install && bun run dev` works from `apps/kid-learning-paths/` with no keys
- [ ] Capture ≥1 screenshot and ≥1 video of the running app (Charlie and Lillian flows, mock mode) and attach them to the PR

## Stack
Bun · create-next-app (Next.js 16, Turbopack) · shadcn/ui (button, card, badge, command, popover, select, tabs, collapsible, progress) · `openai` SDK (OpenAI-compatible endpoints) · zod

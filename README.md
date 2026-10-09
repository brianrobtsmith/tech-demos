# Tech Demos

A monorepo of small, working demos of interesting tech, picked from X bookmarks.

- **One app per folder:** every demo lives in `apps/<slug>/` and is fully self-contained.
- **Bun everywhere:** each app runs with `bun install && bun run dev`. UI uses shadcn/ui.
- **Cloud agents only touch `apps/`:** builds are done by cloud agents following [AGENTS.md](./AGENTS.md) and planned with [`skills/project-planning/`](./skills/project-planning/SKILL.md).
- **Every build is a PR:** each pull request must include at least one screenshot and one video of the app running.

## Layout

```
apps/                      # one folder per demo (apps/<kebab-slug>/)
skills/project-planning/   # MVP planning skill used before every build
tracking/seen-bookmarks.json  # bookmarks proposed / skipped / built
bunfig.toml                # shared Bun install settings (minimumReleaseAge)
```

## Running a demo

```bash
cd apps/<slug>
bun install
bun run dev
```

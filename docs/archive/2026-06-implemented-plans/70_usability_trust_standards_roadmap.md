---
status: archived
lane: ui
type: plan
archived: 2026-06-09
---
> **ARCHIVED 2026-06-09 (implemented-plans sweep)** — original path: `docs/70_usability_trust_standards_roadmap.md`
> Reason: implemented planning artifact, archived per Kyle's 2026-06-09 directive (all plans implemented; no live backlog).
> Index: `docs/cowork/02_repo_archive_manifest.md` + `docs/64_repo_cleanup_archive_index.md`.

# Usability Trust And Standards Roadmap

🗄️ `[status: archived]` `[lane: ui]` `[type: plan]`

Date: 2026-06-08

## Goal

Restore confidence in Homebrew Forge by making app controls predictable,
empty/loading states honest, and navigation defaults user-controlled. This lane
prioritizes trust and consistency before expanding custom workspace behavior.

## North Star

Homebrew Forge should feel compact, modern, and calm: dense enough for real
studio work, but never cramped, clipped, or surprising. Familiar controls should
behave like users expect from desktop creative tools and modern productivity
apps.

## Phase Roadmap

| Phase | Slice | Done condition |
| --- | --- | --- |
| 1 | Track and stabilize | Backlog exists, hot dirty files are classified, and `docs/project-map.md` points future agents here. |
| 2 | Trust fixes first | Project/Work Mode chips use shared icons, selects have safe arrow padding, shared sorting uses one field plus one direction toggle, and empty/loading states no longer imply data loss. |
| 3 | Visual QA pass | Visual QA checks Home, Maker, Cards, Decks, Collections, Projects, References, Settings, dropdown padding, clipping, overflow, and empty/loading states. |
| 4 | Home and startup | Home is a first-class workspace, always reachable, and Settings can choose startup page, Work Mode, and project. |
| 5 | Editable rail per Work Mode | Home and Settings are locked; other rail sections can be reordered or hidden per mode from Settings. |
| 6 | Custom Work Modes | Users can add local custom modes with name, tag, default workspace, rail order, visibility, and default toggle. |

## Product Decisions

- Home and Settings are permanent rail anchors.
- Home is the recommended startup workspace for new/local preference state.
- Built-in Work Modes remain stable presets; custom modes are local browser
  preferences first.
- Sorting uses a single option menu plus a separate direction toggle, not
  duplicated ascending/descending options.
- Loading states must state that local data is being read. Empty states must
  distinguish an empty project/set from filtered-out rows.

## Acceptance Criteria

- No app-level dropdown places its arrow flush against the control border.
- Project and Work Mode controls do not render literal text carets.
- List sorting is consistent in Maker, Cards/Card Browser, Decks, Collections,
  Binders, and Lists.
- When local data is still loading, the app never says or implies that cards are
  missing.
- If the active project or set has no cards, the UI says so and offers a route
  to Projects.
- Home appears at the top of every rail mode; Settings appears at the bottom.
- Startup defaults and Work Mode defaults are configurable from Settings.
- Custom mode preference data can be reset without touching card, deck,
  collection, or project data.

## Verification

- `node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor test`
- `node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor typecheck`
- `node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor build`
- `node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor run test:ux-gate`
- `node packages/editor/scripts/forge-ui-visual-qa.mjs --phase usability-trust-standards`
- `scripts/codex/homebrew-forge-launcher-health-hook.sh`

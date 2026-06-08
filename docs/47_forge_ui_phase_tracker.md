# Forge UI Phase Tracker

Use this tracker before and after every Forge UI implementation slice. Do not mark a slice complete without verification evidence.

Status values: `planned`, `in_progress`, `verified`, `blocked`.

| Phase | Slice | Status | Owner surface | Verification | Evidence |
| --- | --- | --- | --- | --- | --- |
| 0 | North Star doc | verified | Docs | file exists | `docs/45_forge_ui_north_star.md` |
| 0 | Stack research doc | verified | Docs | file exists | `docs/46_forge_ui_stack_research.md` |
| 0 | Phase tracker | verified | Docs | file exists | `docs/47_forge_ui_phase_tracker.md` |
| 0 | Component inventory | verified | Docs | file exists | `docs/48_forge_ui_component_inventory.md` |
| 0 | AGENTS/project map pointers | verified | Repo guidance | manual review | `AGENTS.md`, `docs/project-map.md` |
| 1 | Style layer structure | verified | `packages/editor/src/styles/` | typecheck/build | `styles/forge-ui-craft.css` split from late craft overrides |
| 1 | Visual QA checklist/script | verified | editor scripts/docs | UX gate + visual QA | `docs/49_forge_ui_visual_qa_checklist.md`, `packages/editor/scripts/forge-ui-visual-qa.mjs`, `output/playwright/forge-ui-phase-1/qa-results.json` |
| 1 | Token normalization | verified | style layer | contrast scan | Phase 1 visual QA reported 0 text contrast failures and 0 dark-mode light-surface leaks |
| 2 | Forge UI primitive folder | verified | `components/forge-ui/` | typecheck/build | dependency-free primitive foundation added |
| 2 | Representative Cards/Decks primitive usage | verified | shared filtered empty state | UX gate + screenshots | `FilteredEmptyState` now uses `EmptyState` + `Button` |
| 2 | Lucide icon inventory | verified | `Icon.tsx` | typecheck/build/screenshots | `lucide-react` installed; `Icon.tsx` compatibility mapping documented in `docs/48_forge_ui_component_inventory.md` |
| 3 | AppShell extraction | verified | `App.tsx` shell | typecheck/build/UX gate/screenshots | `components/shell/AppShell.tsx`, `output/playwright/forge-ui-phase-3/qa-results.json` |
| 3 | TopCommandBar/SidebarNav/WorkspaceFrame | verified | shell components | typecheck/build/UX gate/screenshots | `components/shell/TopCommandBar.tsx`, `SidebarNav.tsx`, `WorkspaceFrame.tsx` |
| 3 | Workspace Health v1 | verified | shell/status | UX gate + status scenarios | `components/shell/WorkspaceHealth.tsx`, status bar health chips |
| 4 | Maker visual upgrade | verified | Maker workspace | typecheck/build/UX gate/screenshots | `CardList` now uses Forge UI status pills; `output/playwright/forge-ui-phase-4/` |
| 4 | Decks/Collections visual upgrade | verified | Decks/Collections | typecheck/build/UX gate/screenshots | Deck/collection source rows and collection status use Forge UI pills |
| 4 | Dashboard/Card Browser wrapper upgrade | verified | focused layouts | screenshots + contrast | Dashboard/Card Browser source rows use source-aware Forge UI pills |
| 5 | Overlay/dialog visual system | verified | shared overlays | typecheck/build/UX gate/overlay screenshots | `OverlayShell` has labelled dialog semantics, focus trap, Forge dialog classes, and `output/playwright/forge-ui-phase-5/dark-overlays-*.png` |
| 5 | Import/export/validation state polish | verified | transfer/print/create flows | UX gate + overlay screenshots | Create flow status uses Forge status pills; import/export dialogs captured in Phase 5 visual QA |
| 6 | Tailwind/shadcn spike | verified | build/style config | adoption gate | `docs/50_forge_ui_tailwind_shadcn_gate.md`; gate rejects Tailwind/shadcn install for now and approves Forge UI/Radix-compatible fallback |
| 7 | Command palette v1 | verified | global command UI | typecheck/build/UX gate/screenshots | `components/shell/CommandPalette.tsx`; toolbar + `Cmd/Ctrl+K`; `output/playwright/forge-ui-phase-7/dark-shell-command-palette.png` |
| 7 | Advanced Workspace Health rail | verified | shell/status | typecheck/build/UX gate/screenshots | `WorkspaceHealthPanel`; status strip Health button; `output/playwright/forge-ui-phase-7/dark-shell-workspace-health.png` |
| 8 | CSS consolidation | verified | styles | build + visual QA | `styles/forge-ui-shell.css` split from craft layer; `docs/51_forge_ui_global_css_exceptions.md` documents remaining legacy exceptions |
| 8 | Final North Star acceptance | verified | all editor surfaces | typecheck/build/UX gate/full visual QA | `output/playwright/forge-ui-phase-8/qa-results.json`; 14 screenshots passed with 0 contrast failures, 0 dark light-surface leaks, and no horizontal overflow |
| 9 | List controls and focused layout cleanup | in_progress | Maker/Card Browser/Decks/Collections/Binders/Lists | typecheck/build/UX gate/visual QA | `docs/49_list_controls_focus_layout_backlog.md`; evidence target `output/playwright/forge-ui-phase-list-controls-focus-layouts/` |
| 9 | References official-card browser | verified | References / Settings / toolbar | forge unit tests + typecheck/build + browser QA | `output/playwright/references-official-cards/qa-results.json`; `output/playwright/references-official-cards/keyboard-navigation-results.json` |

## Required Verification Per Slice

Run:

```bash
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor typecheck
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor build
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor run test:ux-gate
```

For visual slices, also run the Forge UI visual QA script and save screenshots under:

```text
output/playwright/forge-ui-phase-<phase>/
```

Command:

```bash
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor run visual:forge-ui -- --phase <phase>
```

## Current Blockers/Risks

- The global stylesheet is large and contains late source-order overrides.
- `App.tsx` and `WorkspaceView.tsx` still carry broad responsibility.
- The worktree is dirty; preserve unrelated changes.
- Tailwind/shadcn cannot be treated as a drop-in polish dependency until the adoption gate passes.

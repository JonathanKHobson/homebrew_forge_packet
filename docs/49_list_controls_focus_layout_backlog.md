# List Controls And Focused Layout Backlog

This slice fixes the editor-wide list control gap surfaced during the June 2026 review pass.

## North Star

Every browsable card or row list in Homebrew Forge should have a familiar, compact control pattern:

- persistent search
- explicit sort
- visible filter count and reset
- advanced filters in an overlay
- no disabled fake controls
- source-aware empty or unresolved states

The interaction should feel recognizable to users of document editors, design tools, and collection managers without copying any one product.

## Priority Matrix

| Priority | Surface | Issue | Decision | Verification |
| --- | --- | --- | --- | --- |
| P0 | Card Browser | Source rows can show endless preview/detail loading when the selected row is not the active Maker draft. | Resolve selected rows to saved authored drafts and cache browser previews independently. | Select SOA/SQM/deck/collection rows and confirm preview or explicit unresolved state. |
| P0 | Focused layouts | Focus Maker/Card Preview commands are disabled outside Maker. | Focused layouts are always enterable; no context opens a selector/empty state. | View menu from Maker, Decks, Collections, References. |
| P1 | Card Browser | Search/filter/sort controls are incomplete and include dead controls. | Compact bar plus advanced overlay; hide context picker unless scope needs it. | All/Project/Set/Deck/Collection/Binder/List/Official scopes. |
| P1 | Decks | Deck cards cannot be searched, filtered, or sorted; basic lands cause scrolling noise. | Add card-row controls in the center; group basics on by default for deck rows. | Deck with duplicated basics and mixed candidate/status rows. |
| P1 | Collections/Binders/Lists | Row controls are crowded and “No filters active” is visual noise. | Compact bar; filters badge only when active; rename Select filtered to Select shown. | Table/Grid/List/Single views. |
| P2 | Maker | Card list has filters but no sort. | Add shared Sort control while preserving browse overlay. | Maker list sort by name, collector number, mana, type, rarity, status. |

## Implementation Tracker

| Slice | Status | Owner Surface | Evidence |
| --- | --- | --- | --- |
| Docs/tracker | verified | `docs/` | `docs/49_list_controls_focus_layout_backlog.md`, `docs/47_forge_ui_phase_tracker.md` |
| Shared list controls | verified | `packages/editor/src/domain/listControls.ts`, `components/forge-ui/` | editor tests + typecheck/build |
| Maker sort | verified | `CardList.tsx` | shared Sort control + visual QA |
| Card Browser controls and previews | verified | `CardBrowserView.tsx` | saved preview cache + Card Browser visual QA |
| Deck card controls | verified | `WorkspaceView.tsx` | search/filter/sort + group basics toggle |
| Collections row controls | verified | `WorkspaceView.tsx` | compact search/sort/filter bar + Select shown |
| Focused layout entry | verified | `App.tsx`, `EditorToolbar.tsx` | UX gate focused-layout smoke |

## UXH Compass Notes

- H1 Visibility: active filters and sort state must be visible.
- H2 Match To Expectations: search, sort, filter, and close controls must live where users expect them.
- H3 Control And Freedom: focused layouts should not strand users; close exits globally.
- H4 Consistency: the same card-row control language applies across Maker, Decks, Collections, Binders, Lists, and Card Browser.
- H8 Minimalism: remove repeated import/export affordances and static “No filters active” text from crowded work surfaces.
- H11 Accessibility: icon-only view controls need labels, focus states, and keyboard paths.

## Acceptance

- No list surface relevant to cards/rows lacks an explicit sort control.
- Card Browser source rows either render saved previews, official images, or clear unresolved states.
- Deck rows can be searched, filtered, sorted, and basic lands are grouped by default without changing deck storage.
- Collection/Binder/List row controls are compact and consistent.
- Focused layouts are reachable from any workspace.

## Decks Follow-Up Backlog

These are deliberate next-slice items captured during the June 8 Decks UX review. They should not be half-implemented as visual-only controls.

| Priority | Request | Decision |
| --- | --- | --- |
| P1 | Multi-select deck card rows with checkboxes and obvious deselect behavior. | Add real selection state, keyboard support, selected-count affordance, and safe bulk actions before showing row checkboxes. |
| P1 | Quickly move selected cards between Main, Sideboard, and Maybeboard. | Pair with multi-select; expose board move as a toolbar action and context action. |
| P2 | Manual deck order and drag/reorder, including dragging cards between boards. | Add a manual sort mode only after row identity and persistence rules are explicit. |
| P2 | Commander, partner, and cover quick editing from the visible inspector/cover area. | Convert display slots/cover art into clear edit affordances backed by the existing metadata selectors or a focused picker overlay. |
| P3 | Shuffle and sample hand/draw simulator. | Treat as a Decks testing mode or Dashboard widget; do not mix it into the primary deck editing controls. |

## Verification Evidence

- `node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor test`
- `node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor typecheck`
- `node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor build`
- `node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor run test:ux-gate`
- `node packages/editor/scripts/forge-ui-visual-qa.mjs --phase list-controls-focus-layouts`
- `output/playwright/forge-ui-phase-list-controls-focus-layouts/qa-results.json`

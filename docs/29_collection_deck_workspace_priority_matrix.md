# Collections and Decks Workspace Priority Matrix

## How To Use This Matrix

Ship one slice at a time. Do not use later preview, Scryfall, legality, or drag
and drop ideas to delay the high-value workspace contract fixes.

Priority key:

- P0: required foundation,
- P1: next shippable user-visible value,
- P2: important polish,
- P3: future expansion.

## Phase Matrix

| Phase | Priority | Slice | Ship This | Do Not Touch Yet | Verification |
| --- | --- | --- | --- | --- | --- |
| 0 | P0 | Planning docs | Add workspace polish plan, priority matrix, and project-map pointer. | Runtime behavior. | Docs exist and point to each other. |
| 1 | P0 | Collection save foundation | Save API, client call, Forge persistence, legacy row defaults, and tests. | Preview overlay. | Collection save test passes and CSV round-trips new fields. |
| 2 | P1 | Collection row editing | Editable right-panel row inspector with dirty/save flow. | Full card editor behavior. | Edit row, save, reload, verify persisted fields. |
| 3 | P1 | Collection preview overlay | Lightweight row preview, local card link, variant selector, local-art preview. | Scryfall cache/sync automation. | Row click opens/closes overlay and linked local preview works. |
| 4 | P1 | Deck workspace contract | Add-cards overlay; right panel becomes deck/deck-entry inspector. | Legality, draw simulation, collection ownership math. | Add authored card and collection row, save, reload. |
| 5 | P2 | Deck compact layout | Desktop three-column Main/Side/Maybe layout with narrow fallback. | Drag/drop reordering. | Desktop and mobile screenshots show readable rows. |
| 6 | P2 | Visual polish and copy | Consistent labels, empty states, selected states, and no right-panel role drift. | New product areas. | Visual QA confirms no text overlap or confusing panel labels. |
| 7 | P3 | Optional official-art support | Scryfall art lookup/cache behind explicit preview source. | Scryfall as required render dependency. | App still works offline and without lookup data. |

## First Implementation Slice

The first code slice should include Phases 1 through 4 enough to make the
workspace contract visible:

1. Add collection save persistence and row defaults.
2. Make Collections right panel editable.
3. Add lightweight collection card preview overlay.
4. Replace Decks right-panel card browser with a deck add-cards overlay and
   right-panel inspector.

Phase 5 compact layout can ship in the same implementation pass if it does not
require a separate storage or drag/drop decision.

## Stop Conditions

Stop and split the work if:

- collection save needs a storage migration beyond optional CSV fields,
- Scryfall image lookup becomes required for preview,
- Decks needs new legality or ownership semantics,
- `WorkspaceView.tsx` grows with another large embedded workflow that belongs
  in an overlay component,
- visual QA shows the compact deck layout is harder to scan than the current
  layout.

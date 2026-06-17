# Create, Import, and Export Priority Matrix

## How To Use This Matrix

Work one phase and one slice at a time. Each slice should ship with its own
verification before the next slice begins. Do not use later phases as a reason
to block earlier high-value consistency fixes.

Priority key:

- P0: required foundation,
- P1: next shippable user-visible value,
- P2: important expansion,
- P3: future alignment or polish.

## Phase Matrix

| Phase | Priority | Slice | Ship This | Do Not Touch Yet | Verification |
| --- | --- | --- | --- | --- | --- |
| 0 | P0 | Planning docs | Add overlay plan, priority matrix, and project-map pointer. | Runtime behavior. | Docs exist and point to each other. |
| 1 | P0 | Overlay shell | Shared full-screen overlay shell, footer actions, focus handling, dirty-close confirmation, and flow state types. | Entity-specific persistence. | Story/manual render of clean and dirty close states. |
| 2A | P1 | Card create overlay | Maker plus opens overlay; create draft only after confirm; opens saved draft in Maker workspace. | Bulk card import and live preview tuning. | New card is not created until `Create Draft`; saved card opens for editing. |
| 2B | P1 | Deck create overlay | Decks plus opens overlay; metadata plus Main/Side/Maybe add table; creates deck through existing API. | Deck UI redesign outside create flow. | New deck appears in Decks list with requested sections. |
| 2C | P1 | Set create overlay | Sets plus opens overlay; uses existing create-set API; opens created set. | Moving cards between sets. | New set folder and library entry are created. |
| 2D | P1 | Project create overlay | Projects plus opens overlay; uses existing project API; selects created project. | Project package import/export. | New project appears in Projects list. |
| 2E | P1 | Gallery create overlay | Gallery plus opens overlay with upload/URL/metadata UI and staged unsupported states. | Bulk asset import persistence. | Overlay is consistent and does not claim unsupported imports completed. |
| 3A | P1 | Import hub IA | File > Import shows Cards/Decks/Sets/Projects/Gallery/References choices. | Real new importers beyond existing set/card flow. | Existing active-set import remains usable. |
| 3B | P2 | Card import | Support single/bulk cards into active or Ungrouped holding set. | Global card database. | Imported cards appear in target set/holding set. |
| 3C | P2 | Deck import | Import deck text or `.cod` into deck storage. | Legality validation. | Imported deck opens with Main/Side/Maybe preserved where possible. |
| 3D | P2 | Set import | Import to new or existing set with dry-run. | Project-level package import. | Dry-run and real import report counts and warnings. |
| 3E | P3 | Project import | Import grouped sets/cards/decks as a project package. | External package standards. | Package creates project plus child records. |
| 3F | P3 | Gallery import | Multi-file, URL, or CSV metadata asset import. | Automatic art licensing decisions. | Assets appear in Gallery with metadata or blank review state. |
| 3G | P3 | Reference import | Reuse the shipped Reference create overlay for File > Import reference flows. | Bulk Reference import inside the plus-button overlay. | Import hub opens Reference flow or staged reference import without duplicating UI. |
| 4A | P1 | Export hub IA | File > Export mirrors import choices. | Unsupported exporter internals. | Existing set/card/deck exports remain usable. |
| 4B | P2 | Card export | Choose current or another card; support single/bulk card exports. | Print-shop package export. | Selected card(s) export from File > Export. |
| 4C | P2 | Deck export | Export selected deck from File > Export. | Deck legality reports. | Text and `.cod` exports match Decks workspace output. |
| 4D | P2 | Set export | Existing set source/Cockatrice export lives under Sets in hub. | Multi-set packages. | Existing set export tests still pass. |
| 4E | P3 | Project export | Export project package with sets, decks, cards, gallery assets, and references. | Public sharing/gallery. | Project package can be reimported in a later phase. |
| 4F | P3 | Gallery export | Export selected or bulk assets with metadata. | Asset license automation. | Files and metadata export together. |
| 4G | P3 | Reference export | Export included plus local custom reference data after the Reference model stabilizes. | New Reference storage locations. | Export uses `reference/custom/references.json` plus included catalog source labels. |
| 5 | P2 | Ungrouped holding model | Add explicit Ungrouped project/group and holding set for unassigned cards. | True global card database. | Ungrouped appears at top of relevant lists. |
| 6 | P3 | Settings defaults | Add user setting for default create status; keep Save as Draft available. | Broad settings redesign. | Default status changes create overlay primary copy/status. |

## First Implementation Slice

Implementation note: the first shipped code slice now includes Phase 1, Phase
2A-2E, Phase 3A, Phase 4A/4C/4D, and the explicit `UNGRP` holding set. Later
work should continue from the remaining importer/exporter internals rather
than recreating plus-button forms.

Original recommended first code slice:

1. Add reusable overlay shell and dirty-close confirmation.
2. Replace the Maker plus button with the Card creation overlay.
3. Preserve the existing card save path and open the saved draft after confirm.
4. Do not change Decks/Sets/Projects/Gallery plus buttons until Maker proves
   the pattern.

Reason: Maker is the clearest UX problem because it currently creates an object
immediately and moves the user into editing before they have captured the known
card data.

## Component Boundaries

Keep implementation out of `WorkspaceView.tsx` where possible:

- shared overlay shell and dirty-close UI in `components/overlays/`,
- entity-specific create overlays in `components/overlays/`,
- flow types in `domain/createFlowTypes.ts` and `domain/transferFlowTypes.ts`,
- API additions in `api/client.ts` and `server/editorApiPlugin.ts`,
- low-level persistence in Forge packages only when a slice requires new data
  behavior.

## Testing Matrix

Every code slice:

- `node .tools/pnpm/bin/pnpm.cjs typecheck`
- `node .tools/pnpm/bin/pnpm.cjs build`

Slices touching deck behavior:

- `node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/forge test`

Visual QA slices:

- open the local editor,
- click the relevant plus button or File menu action,
- verify the overlay opens,
- verify Cancel and close behavior,
- verify dirty-close confirmation,
- verify primary save action,
- verify no text overlap at desktop width.

## Stop Conditions

Stop and split the work if:

- an overlay component grows beyond roughly 300-500 lines,
- a slice requires a new storage model that was not already chosen,
- Reference work depends on the separate Reference branch,
- a File Import/Export hub option would need fake behavior to look complete,
- `WorkspaceView.tsx` is growing instead of shrinking.

---
status: archived
lane: ui
type: plan
archived: 2026-06-09
---
> **ARCHIVED 2026-06-09 (implemented-plans sweep)** — original path: `docs/28_collection_deck_workspace_polish_plan.md`
> Reason: implemented planning artifact, archived per Kyle's 2026-06-09 directive (all plans implemented; no live backlog).
> Index: `docs/cowork/02_repo_archive_manifest.md` + `docs/64_repo_cleanup_archive_index.md`.

# Collections and Decks Workspace Polish Plan

🗄️ `[status: archived]` `[lane: ui]` `[type: plan]`

## Purpose

Collections and Decks should use the same workspace contract as Sets:

- left panel selects the object,
- center canvas shows that object's contents,
- right panel edits the selected object or selected row,
- overlays handle create, add, transfer, and deeper preview flows.

This plan keeps the current file-backed storage model while removing the UI
drift where Decks uses the right panel as a card browser and Collections shows
readonly details for fields that need editing.

## Product Rules

- Collections are isolated card/reference lists. Editing a collection row does
  not create or mutate authored cards, sets, or decks.
- Collection row edits are collection-specific: quantity, print identity,
  finish, condition, language, location, review status, and review notes.
- Collection-level metadata is edited in an overlay so the right panel can stay
  focused on the selected row.
- Clicking a collection row opens a lightweight preview overlay. It is not the
  full Maker editor.
- Local authored-card links are optional. When present, the selected linked
  variant controls the preview image and can open the card in Maker.
- Scryfall art is optional preview fallback only. It must not become a required
  render, save, import, export, or startup dependency.
- Decks remain top-level decklists under `decks/<deck-id>/`. The existing
  Main, Sideboard, Maybeboard, export, and optional `variant_id` behavior stays
  intact.
- Deck add-card browsing moves into an overlay. The Decks right panel edits
  deck metadata or the selected deck entry.

## Collection Preview Rules

Preview image priority:

1. selected linked local variant art,
2. linked card primary variant art,
3. optional Scryfall art when a future lookup/cache provides it,
4. metadata-only placeholder.

The first shipped preview overlay should show card name, print identity,
quantity, finish, condition, language, location, review status, review notes,
local card link controls, variant selector, and an `Open in Maker` action only
when a local authored card is linked.

## Component Boundaries

Keep implementation out of `WorkspaceView.tsx` where practical:

```text
packages/editor/src/components/overlays/
  CollectionMetadataOverlay.tsx
  CollectionCardPreviewOverlay.tsx
  DeckAddCardsOverlay.tsx
packages/editor/src/domain/
  collectionPreview.ts
```

`WorkspaceView.tsx` should orchestrate selected object, selected row, dirty
state, and callbacks. Persistence belongs in Forge collection storage plus the
editor API/client layers.

## Acceptance Criteria

- Collection rows can be edited in the right panel, saved, reloaded, and
  exported with updated values.
- Legacy collection CSVs load with default preview/link fields.
- Collection metadata edits happen in an overlay, not inline in the right
  panel.
- Collection row click opens a lightweight card preview overlay.
- Decks no longer use the right panel as a card browser.
- Decks can add authored cards and collection rows through an overlay with
  explicit count and board target controls.
- Deck right panel edits deck metadata when no row is selected and selected
  entry details when a row is selected.
- Deck center content is compact enough to compare Main, Sideboard, and
  Maybeboard without excessive scrolling on desktop.
- Sets, Collections, and Decks all preserve the left/center/right workspace
  contract.

## Verification

Every shipped slice should run:

- `node .tools/pnpm/bin/pnpm.cjs typecheck`
- `node .tools/pnpm/bin/pnpm.cjs build`
- `node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/forge test`

UI slices also need visual QA in the local editor for Collections and Decks,
followed by browser handoff cleanup for automation-owned sessions.

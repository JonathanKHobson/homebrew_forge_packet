# Collections Manager V1.5 Plan

## Purpose

Collections Manager V1.5 turns the current CSV-backed collection rows into a
usable binder workflow without collapsing Collections into authored Cards,
Sets, or Decks.

Ship one lane first: collection-owned selection, bulk row edits, richer binder
metadata, quick status marking, local/source-backed value estimates, and
collection-specific view modes.

## Product Rules

- Collections remain isolated ownership, inspiration, research, staging, and
  print-run lists.
- A binder is a collection presentation/organization mode, not a new nested
  storage root.
- Collection row edits never mutate authored card CSVs, deck entries, or set
  records.
- Market value starts with local Scryfall/source-row price snapshots. Do not
  imply authenticated live TCGplayer pricing or condition-adjusted valuation.
- Condition is a marketplace condition field: Unknown, Near Mint, Lightly
  Played, Moderately Played, Heavily Played, or Damaged.
- Finish is a physical print finish field: Unknown, Nonfoil, Foil, or Etched
  foil.
- Purchase price and estimated market value are separate. Purchase price is
  user-entered or imported; estimated value is source-backed and labeled.

## Phase Slices

| Phase | Slice | Ship This | Do Not Touch Yet | Verification |
| --- | --- | --- | --- | --- |
| 0 | Roadmap and tracker | This plan plus project-map and data-model pointers. | Runtime behavior beyond the planned slice. | Docs point to each other. |
| 1 | Storage contract | Optional collection metadata and entry fields for binders, row notes/tags/status, purchase price, and price snapshots. | Required migrations or remote account setup. | Legacy rows load; new fields round-trip through CSV/JSON. |
| 2 | Selection model | Individual selection, select filtered, select all, clear selection, selected count. | Cross-workspace selection. | Keyboard and mouse selection work on collection rows. |
| 3 | Bulk edit overlay | Apply toggled fields to selected rows for finish, condition, language, location, tags, notes, star/flag/delete markers, proxy/homebrew, altered, and misprint. | Bulk edits to authored Cards/Sets/Decks. | Save, reload, and verify only enabled fields changed. |
| 4 | Binder metadata | Collection kind, tags, accent color, cover image reference, linked sets, acquisition notes, and binder purchase total. | Nested binders inside binders. | Metadata saves and reloads. |
| 5 | Collection view modes | Table, image grid, compact list, and single-card review inside Collections. | Global Decks/Sets view-mode refactors. | Desktop and narrow viewport visual QA. |
| 6 | Quick row actions | Star, flag, quick metadata in preview, mark for deletion, hard delete confirmation. | Trash/recycle-bin workspace. | Marked rows persist until hard delete. |
| 7 | Value display | Per-row value, collection total, purchase total, gain/loss, and missing-price counts using source snapshots. | Live TCGplayer price refresh. | Dashboard and collection totals match source rows. |

## Implemented Follow-Up Slices

| Slice | Shipped Behavior | Boundary |
| --- | --- | --- |
| Price refresh | Collection rows can refresh market snapshots from the local official-card cache. Scryfall prices are carried through the official print cache and written to row-level `estimated_market_*` fields. | Refresh depends on the user syncing the local official-card cache first. |
| Provider price import | Collection rows can import TCGplayer, ManaBox, Card Kingdom, Cardmarket, or generic provider CSV snapshots by Scryfall ID or exact print keys. | This is a snapshot import path, not scraper automation. |
| Binder to set | A collection can copy all rows, or selected rows, into a chosen set as editable imported card drafts. | The original collection remains unchanged and unresolved rows are skipped with warnings. |
| Decks/Sets view modes | Decks now expose Board, Grid, List, and Single section views. Sets now expose Grid, List, and Single card views. | Cards Browser global view modes remain a separate lane. |

## Pricing Source Notes

- TCGplayer exposes API pricing through its developer/partner program and
  documents endpoints for catalog and pricing data, but access is governed by
  approval and API terms. Homebrew Forge should not claim unauthenticated live
  TCGplayer refresh.
- TCGplayer API terms prohibit automated collection of site pricing outside
  permitted API access. Keep provider support behind explicit API credentials or
  user-provided CSV snapshots.
- ManaBox documents multi-market card pricing and notes that condition,
  language, and location-specific pricing is not generally shown as separate
  app prices. Homebrew Forge should keep condition/language as owned-row
  metadata and label market value as a source snapshot unless a future licensed
  SKU-level provider is implemented.

## Acceptance Criteria

- A user can create or open a binder-style collection, select multiple cards,
  bulk edit ownership metadata, save, reload, and see those edits persist.
- A user can star, flag, tag, note, mark for deletion, and hard delete
  collection rows without affecting authored Cards, Sets, or Decks.
- A user can switch collection view modes without losing selected row context.
- A user can see purchase total, estimated market value, value source coverage,
  and gain/loss where local data supports it.
- Legacy collection CSVs still load with defaults and export cleanly.

## Future Backlog

- Authenticated TCGplayer pricing with SKU/condition/language mapping.
- Explicit nested binder folders if collection-level grouping stops being
  enough.
- Apply the view-mode component pattern to Decks, Sets, and Card Browser after
  Collections proves the interaction model.
- Price history, refresh scheduling, and alerting.

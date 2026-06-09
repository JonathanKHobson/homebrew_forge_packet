---
status: archived
lane: ui
type: plan
archived: 2026-06-09
---
> **ARCHIVED 2026-06-09 (implemented-plans sweep)** — original path: `docs/27_import_export_full_app_polish_plan.md`
> Reason: implemented planning artifact, archived per Kyle's 2026-06-09 directive (all plans implemented; no live backlog).
> Index: `docs/cowork/02_repo_archive_manifest.md` + `docs/64_repo_cleanup_archive_index.md`.

# Import/Export Full-App Polish Plan

🗄️ `[status: archived]` `[lane: ui]` `[type: plan]`

## Purpose

Homebrew Forge import/export must match the app's current data model instead of
lagging behind it. A user should be able to see what an import will create,
choose where it lands, understand which file formats are supported, and use CSV
as the complete app-native interchange format for cards, variants, decks,
collections, gallery assets, and references.

This plan records the full requested scope so implementation can proceed in
ordered slices without losing work that is intentionally staged.

## Current Highest Priority

Ship app-native CSV import for authored cards and card variants first.

This slice makes CSV import/export aware of:

- parent card identity in `cards.csv`,
- variant metadata in `card_variants.csv`,
- variant face/rules/art rows in `card_variant_faces.csv`,
- legacy fallback where imported cards without variant columns become one
  primary `Variant 1`,
- clear import UI copy that says the active set is the current destination.

## Product Rules

- Cards import adds cards to an existing target set or to an explicit Ungrouped
  holding set. It should not silently create a new set.
- Sets import creates a new set, asks for set identity, and imports the uploaded
  cards into that set.
- Collections are independent card/reference lists. They can feed Cards/Sets,
  Decks, and research flows, but importing a collection does not automatically
  create authored cards.
- Decks are top-level objects under `decks/<deck-id>/`. Deck import should
  create or update a deck, not add loose cards to a set.
- Projects import must wait until project export defines a package contract.
  A project package should be able to preserve app state and also support
  structured exchange with other tools.
- CSV is the app-native complete format. External formats should preserve what
  they can, but they should not pretend to support Homebrew Forge-only fields
  unless the format can carry them.

## Format Support Matrix

| Entity | P | Format | Status | Notes |
| --- | --- | --- | --- | --- |
| Cards | P0 | Homebrew Forge CSV | Implement now | Complete card, face, variant, variant face, art, tags, notes, and status fields. |
| Cards | P1 | Cockatrice XML / generic XML | Existing | Preserve card/face/art where possible; synthesize primary `Variant 1`. |
| Cards | P1 | Planesculptors text | Existing | Preserve parsed card/face/art where possible; synthesize primary `Variant 1`. |
| Cards | P1 | Collection copy | Existing | Copies selected collection rows as draft card templates into the active set. |
| Decks | P1 | Plain text decklist | Shipped | Parses sections and counts into deck storage, preserving unresolved rows. |
| Decks | P1 | Cockatrice `.cod` / XML | Shipped | Preserves Main and Side zones from Cockatrice deck XML. |
| Decks | P2 | Markdown decklist | Shipped | Accepts headings and plain count/name list blocks. |
| Decks | P2 | CSV | Shipped | App-native deck entries including optional `variant_id`. |
| Collections | P1 | Scanner CSV | Existing | ManaBox, TCGplayer, Dragon Shield, Delver Lens, generic CSV. |
| Collections | P2 | Plain text list | Shipped | Useful for loose ownership/research lists; unresolved rows stay in review. |
| Collections | P2 | XML / `.cod` | Shipped | Imports Cockatrice-style list XML into collection review rows. |
| Sets | P1 | CSV/XML/text cards into new set | Shipped | Set import collects set code/name/project/status/metadata before importing cards into the new set. |
| Projects | P2 | Homebrew Forge project package | Later | Requires project export contract first. |
| Projects | P3 | CSV/XML/JSON package | Later | Bulk interchange/export lane after package shape stabilizes. |
| Gallery | P2 | CSV metadata | Shipped | Bulk URL/local/data-URI asset metadata with optional card and variant assignment links. |
| Gallery | P2 | Multi-file import | Later | Needs visual asset review and assignment workflow. |
| References | P2 | CSV | Shipped | Local custom/homebrew reference terms import through File > Import > References. |
| References | P3 | Rules glossary/XML/JSON | Later | Must preserve source labels and avoid silent official-data mutation. |

## Implementation Phases

| Phase | P | Slice | Ship This | Staged Explicitly |
| --- | --- | --- | --- | --- |
| 1 | P0 | Docs and CSV contract | This doc, schema doc updates, card-with-variants CSV template, project-map pointer. | Project package details. |
| 2 | P0 | CSV variant backbone | Importer reads/writes variant CSVs, audits variant counts, and creates primary fallback variants. | Deck, collection, project package parsing. |
| 3 | P1 | Import hub clarity | Entity order is Cards, Decks, Sets, Projects, Gallery, Collections, References; labels explain destination and mode. | New set target selector if it requires a larger set-creation flow. |
| 4 | P1 | Deck import MVP | Text, Markdown, Cockatrice `.cod`/XML, and CSV deck import into deck storage, including optional `variant_id` where available. | Legality validation and draw simulation. |
| 5 | P1 | Set import target flow | Sets import asks for new set code/name/project/status/metadata, then runs the card importer into that set. | Multi-set project package import. |
| 6 | P2 | Collection format expansion | Add text/XML/`.cod` collection list intake using the collection review model. | Official-card auto-resolution beyond existing reviewed strategies. |
| 7 | P2 | Gallery import | CSV metadata import for URL, local-path, and data-URI assets with card/variant assignment. | Multi-file visual review, licensing automation, or automatic art-source claims. |
| 8 | P2 | Reference import | CSV reference import into local custom references. | Direct writes to official reference snapshots. |
| 9 | P2 | Project export package | Define JSON/ZIP package with sets, decks, cards, variants, gallery assets, and references. | Public marketplace/gallery sharing. |
| 10 | P2 | Project import package | Reimport the package produced by Phase 9. | External package standards not emitted by Homebrew Forge. |

## Acceptance Criteria

- A CSV import can create a parent card with two or more variants without
  duplicating it in the card list.
- Imported CSV variant rows appear in `card_variants.csv` and
  `card_variant_faces.csv`.
- Deck import can create a deck from plain text, Markdown, Cockatrice `.cod` or
  XML, and app-native deck CSV.
- Deck CSV preserves `variant_id`; unresolved deck rows stay visible with
  warnings.
- Set import creates a new set before importing card data, instead of replacing
  the active set.
- Collection import supports scanner/generic CSV, plain text lists, and
  Cockatrice `.cod`/XML while preserving unresolved rows for review.
- Reference import supports local custom/homebrew CSV terms and skips existing
  duplicates.
- CSV rows without variant fields still load with one primary `Variant 1`.
- Import audit reports cards, faces, variants, variant faces, art references,
  warnings, and unsupported layouts.
- Import hub copy uses plain user-facing labels and no longer says "Bulk Set
  Flow" for card import.
- Staged import options are named as staged, with priority and owner phase in
  this doc, instead of being hidden or made to look complete.

## Verification

Every shipped slice should run:

- `node .tools/pnpm/bin/pnpm.cjs typecheck`
- `node .tools/pnpm/bin/pnpm.cjs build`
- `node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/forge test`

UI slices also need Playwright visual QA for File > Import and any changed
entity panel.

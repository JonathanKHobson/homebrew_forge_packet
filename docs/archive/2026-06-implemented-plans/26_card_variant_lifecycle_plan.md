---
status: archived
lane: data
type: plan
archived: 2026-06-09
---
> **ARCHIVED 2026-06-09 (implemented-plans sweep)** — original path: `docs/26_card_variant_lifecycle_plan.md`
> Reason: implemented planning artifact, archived per Kyle's 2026-06-09 directive (all plans implemented; no live backlog).
> Index: `docs/cowork/02_repo_archive_manifest.md` + `docs/64_repo_cleanup_archive_index.md`.

# Card Variant Lifecycle Plan

🗄️ `[status: archived]` `[lane: data]` `[type: plan]`

## Purpose

Cards can have multiple variants under one authored card identity. A variant can
test mechanics, wording, art, frame finish, print treatment, or preserve an old
draft without turning the card list into duplicate cards.

This plan is the source of truth for work touching card variants, Save As
behavior, variant archive/restore, variant-aware search and filters, export
inclusion, and deck-specific variant selection.

## Data Contract

`cards.csv` remains the parent card identity. `card_faces.csv` remains a
compatibility mirror of the primary variant so existing render, import, and
export paths keep a stable primary card.

Each set owns these variant files:

```text
sets/<SET>/
  card_variants.csv
  card_variant_faces.csv
```

`card_variants.csv` stores one row per variant:

- `variant_id`: stable ID, usually `<CARD_ID>-V1`, `<CARD_ID>-V2`, etc.
- `card_id`: parent card ID from `cards.csv`.
- `display_name`: visible label such as `Variant 1` or `Foil Alt Art`.
- `kind`: `mechanics_test`, `wording_test`, `visual_alternate`,
  `finish_alternate`, `print_alternate`, or `history_snapshot`.
- `status`: `active`, `testing`, `final`, or `archived`.
- `is_primary`: exactly one `true` row per card.
- `export_policy`: `default`, `optional`, or `excluded`.
- `tags`, `notes`, `created_at`, and `updated_at`.

`card_variant_faces.csv` stores the face-level card text, frame, art, layout,
and render controls for each variant. It mirrors `card_faces.csv` fields with
`variant_id` added.

Existing sets without variant files must load as though each card has one
primary `Variant 1`. Saving a card writes the variant files and refreshes the
primary face mirror.

## Lifecycle

- New cards start with one primary `Variant 1`.
- Save overwrites the active variant.
- File > `Save as...` opens an overlay with actions for new card, new variant,
  and draft/snapshot-style variants.
- The Preview header shows the active variant and variant count.
- The Inspector Preview tab owns full variant metadata: switch, rename, kind,
  status, export policy, tags, notes, set primary, archive, and restore.
- Archived variants remain accessible but hidden from default search/filter and
  excluded from default exports.
- A card can be archived after variant archive/restore is stable. Card archive
  is parent-card lifecycle, not a substitute for variant archive.

## Search And Filter Rules

The card list remains parent-card based. Variant search/filter controls decide
how deeply a parent card is matched:

- Primary variants only.
- Active non-archived variants.
- All variants including archived.
- Archived variants only.

Filters cover variant kind, variant status, export policy, tags, and notes.

## Export Rules

Quick current-card export exports the active visible variant.

Full export workflows must expose variant inclusion policy:

- Primary only.
- Default export variants.
- All active variants.
- All variants including archived.

Bulk exports default to primary variants only. Optional and archived variants
are included only when the export workflow explicitly asks for them.

Deck entries may store `variant_id`. Deck exports resolve to the selected
variant, then fall back to the card primary variant with a warning if that
variant is missing.

Cockatrice set export gives non-primary exported variants distinct export card
IDs, image filenames, and display names so variants do not collide.

## Acceptance Criteria

- Legacy sets load with one synthesized primary variant per card.
- New and saved cards persist variants to CSV.
- Exactly one primary variant exists per card after saving.
- Saving active variant does not overwrite sibling variants.
- Save As can create both a new card and a new variant.
- Variants can be renamed, classified, tagged, noted, archived, restored, and
  promoted to primary.
- Search and filters can include or exclude variant metadata.
- Current-card export uses the active variant.
- Set/Cockatrice export respects variant inclusion policy.
- Deck entries round-trip optional `variant_id`.

# Data Model and CSV Schema

## Main design

Use a set folder as the project boundary:

```text
sets/<SET_CODE>/
  set.yaml
  cards.csv
  card_faces.csv
  card_variants.csv
  card_variant_faces.csv
  art_manifest.csv
  mechanics.csv
  export_profiles.yaml
```

CSV remains friendly for editing in Excel/Google Sheets. YAML/JSON handles richer nested configuration.

Decks live outside set folders because a deck can use cards from any set or
project:

```text
decks/<deck-id>/
  metadata.json
  entries.csv
```

`metadata.json` stores deck identity and optional organization links:

- `deckId`
- `name`
- `description`
- `linkedUniverseId`
- `linkedSetCode`
- `format`
- `colorIdentity`
- `commander`
- `partnerCommanders`
- `activeVariantId`
- `variants`: named deck builds with status, optional color identity and commander overrides, tags, and notes
- `status`
- `tags`
- `notes`

`entries.csv` stores one row per deck card reference or candidate-pool row:

- `deck_id`
- `entry_id`
- `deck_variant_id`: the named build this row belongs to; legacy rows without this value load into the default variant
- `section`: `main`, `side`, or `maybe`
- `count`
- `set_code`
- `card_id`
- `variant_id`: optional deck-specific variant choice
- `name_snapshot`
- `candidate_status`: `active`, `candidate`, `testing`, `locked`, or `cut`
- `roles`: pipe-separated deck role tags such as `ramp|draw|targeted_removal`
- `role_source`: `manual`, `heuristic`, `external_dataset`, or `none`
- `role_confidence`
- `impact_rating`, `synergy_rating`, `quality_rating`: 0-5 deck-building ratings
- `entry_tags`
- `entry_notes`
- `flags`
- `starred`
- `marked_for_deletion`

Deck entries resolve by `set_code + card_id`. Missing cards should remain in the
deck with a warning so experiments are not silently destroyed. When `variant_id`
is present, deck export uses that variant when it exists and falls back to the
card primary variant with a warning when it does not.

Deck exports use the active variant and skip `candidate`, `cut`, and
`marked_for_deletion` rows. Role inference applies in this order: manual entry
roles, optional local `reference/deck_roles.csv`, then built-in seed/heuristic
rules. `csv_templates/deck_roles_template.csv` documents the local role dataset
shape.

Collections live outside set folders because they are ownership, inspiration,
research, staging, or print-run organizers rather than authored set records.
Collection metadata can represent either a binder or a list:

```text
collections/<collection-id>/
  metadata.json
  entries.csv
```

`metadata.json` stores collection/list identity and default row behavior:

- `collectionId`
- `name`
- `description`
- `linkedUniverseId`: optional project attachment; lists are global by default
  but can be scoped to a project
- `gameId`
- `purpose`: `owned`, `inspiration`, `homebrew_print_run`, `research`, or
  `mixed`
- `source`
- `kind`: `binder` or `list`
- `listCategory`: `general`, `wishlist`, `recommendation`, `starred`,
  `flagged`, or `gift`
- `tags`
- `defaultEntryTags`
- `defaultOwnershipStatus`: `owned`, `wanted`, `recommended`, `reference`,
  `proxy`, or `homebrew_unprinted`
- `defaultStarred`, `defaultFlagged`, `defaultProxy`, `defaultHomebrew`
- `accentColor`, `coverImageRef`, `linkedSetCodes`, acquisition fields, and
  purchase-total fields

Default list folders are created lazily for `wish-list`, `recommendations`,
`starred`, `flagged`, and `gift-list`. They are stored with the same
`collections/<collection-id>/` structure and use `kind: list`.

`entries.csv` stores one row per collection card/reference row:

- `collection_id`
- `entry_id`
- `quantity`
- `ownership_status`: `owned`, `wanted`, `recommended`, `reference`, `proxy`,
  or `homebrew_unprinted`
- `owner_name`: plain display name for the person/entity that owns this row;
  blank or legacy rows default to `Kyle`. This is separate from
  `ownership_status`, which still means owned/wanted/reference/proxy state.
- `card_name`
- `set_code`
- `set_name`
- `collector_number`
- `scryfall_id`
- `finish`
- `condition`
- `language`
- `location`
- `source`
- `source_row`
- `match_key`
- `match_strategy`: `scryfall_id`, `set_number`, `set_name`, or `unresolved`
- `review_status`: `matched` or `needs_review`
- `review_notes`
- `linked_set_code`: optional local authored-set link for preview/open actions
- `linked_card_id`: optional local authored-card link
- `linked_variant_id`: optional local variant link; selected variant controls
  local preview art when present
- `preview_art_source`: `auto`, `local`, `scryfall`, or `none`; missing legacy
  values default to `auto`
- `purchase_price`, `purchase_currency`, and `purchase_date`: optional user or
  import-sourced acquisition data
- `estimated_market_price`, `estimated_market_currency`, `market_price_source`,
  and `market_price_updated_at`: optional source-backed value snapshot fields
- `tags` and `notes`: semicolon-delimited quick grouping plus row notes
- `starred`, `flagged`, `altered`, `misprint`, `proxy`, `homebrew`, and
  `marked_for_deletion`: optional quick status markers for collection review
  workflows

Binder rows default to `owned` ownership status and `Kyle` owner name.
List rows inherit the list's default ownership, tags, and marker defaults unless
an import row explicitly provides a different ownership status. Scanner imports
also recognize person-owner aliases such as `owner`, `owner_name`, `owned_by`,
and `card_owner`, preserving the typed casing after trimming. This supports
wish-list/reference rows and friend/partner collections that can be used in
decks without implying the primary user physically owns every row.

Collection row edits never create or mutate authored Cards, Sets, or Decks.
They only update the collection's own `entries.csv`.

## Why separate `cards.csv` and `card_faces.csv`?

Magic-style cards include layouts where one physical card has multiple faces or panels: double-faced cards, split cards, adventures, aftermath, battles, sagas, prototype, classes, cases, planeswalkers, and more. A single CSV row becomes awkward.

Use:

- `cards.csv`: identity, collector number, layout, export settings.
- `card_faces.csv`: one row per face/panel/text block.
- `card_variants.csv`: one row per alternate version of a parent card.
- `card_variant_faces.csv`: face/panel/text rows for each variant.

For simple cards, `cards.csv` can still include common face fields for convenience; the importer can expand them into `card_faces.csv` internally.
Existing sets without variant files load with one synthesized primary
`Variant 1` per card. Saving a card writes the variant files and keeps
`card_faces.csv` mirrored to the primary variant for compatibility.

## `sets_template.csv`

Key fields:

- `set_code`
- `set_name`
- `set_type`
- `version`
- `default_language`
- `default_asset_pack`
- `default_export_profile`
- `author`
- `status`
- `tags`
- `notes`

## `cards_template.csv`

Key fields:

- `card_id`: stable internal ID, e.g. `SG1-001`
- `set_code`
- `collector_number`
- `name`
- `layout`: normal, split, flip, transform, modal_dfc, meld, adventure, saga, class, case, battle, plane, scheme, token
- `mode`: custom, reskin, token, imported, placeholder
- `source_card_name`: for reskins/imports
- `source_set_code`
- `rarity`
- `color_identity`
- `tags`
- `status`: idea, draft, review, playtest, final, cut
- `print_count`
- `export_name_override`
- `notes`

## `card_faces_template.csv`

Key fields:

- `card_id`
- `face_index`
- `face_name`
- `mana_cost`
- `type_line`
- `oracle_text`
- `flavor_text`
- `power`
- `toughness`
- `loyalty`
- `defense`
- `colors`
- `frame_type`
- `art_id`
- `artist_display`
- `watermark`
- `rules_text_size_hint`
- `rules_text_padding_top`
- `rules_text_padding_right`
- `rules_text_padding_bottom`
- `rules_text_padding_left`
- `rules_text_reminder_mode` (legacy compatibility; reminder text is now inserted into `oracle_text` explicitly by the editor action panel rather than auto-rendered)
- `layout_variant`

## `card_variants_template.csv`

Key fields:

- `variant_id`
- `card_id`
- `display_name`: default `Variant 1`, `Variant 2`, etc.
- `kind`: mechanics_test, wording_test, visual_alternate, finish_alternate,
  print_alternate, history_snapshot
- `status`: active, testing, final, archived
- `is_primary`: exactly one true variant per card
- `export_policy`: default, optional, excluded
- `tags`
- `notes`
- `created_at`
- `updated_at`

## `card_variant_faces_template.csv`

Key fields:

- `variant_id`
- `card_id`
- all face fields from `card_faces_template.csv`

`card_variant_faces.csv` is the source of truth for non-primary variant text,
art, frame, and layout. `card_faces.csv` mirrors the primary variant.

## App-native card import CSV

`csv_templates/card_import_with_variants_template.csv` is the recommended
spreadsheet starting point for authored-card import. It is intentionally flat:
each row can carry parent-card fields, variant metadata, and one face row.

Rules:

- Use the same `card_id` for all variants of the same authored card.
- Use a unique `variant_id` for every variant, especially when a card has
  multiple faces.
- Use `face_index` to represent multiple faces/panels for one variant.
- Mark exactly one imported variant per `card_id` as `variant_is_primary=true`.
  If the file omits primary markers, the importer chooses one non-archived
  variant as the primary.
- Leave variant columns blank for a legacy/simple import; the importer creates
  one primary `Variant 1`.
- Variant enum values accept either underscores or spaces, e.g.
  `wording_test` or `wording test`.
- `variant_kind`: mechanics_test, wording_test, visual_alternate,
  finish_alternate, print_alternate, history_snapshot.
- `variant_status`: active, testing, final, archived.
- `variant_export_policy`: default, optional, excluded.
- Use semicolon-separated values for `tags` and `variant_tags`.
- Use `art_id` for app-owned art references. Use `art_url` or `art_file_path`
  only as import references; full-card render URLs are kept as references until
  source/editable art is available.

Import writes:

- deduplicated parent rows to `cards.csv`,
- primary variant faces to `card_faces.csv`,
- all variants to `card_variants.csv`,
- all variant face rows to `card_variant_faces.csv`,
- art references to `art_manifest.csv`.

## `art_manifest_template.csv`

Key fields:

- `art_id`
- `file_path`
- `source_url`
- `source_type`: local, commission, generated, public_domain, licensed_stock, personal_photo, scryfall_art_crop, other
- `artist`
- `license`
- `permission_status`
- `checksum_sha256`
- `crop_x`
- `crop_y`
- `crop_w`
- `crop_h`
- `notes`

## `library_assets_template.csv`

Use `csv_templates/library_assets_template.csv` for bulk Gallery import from
File > Import > Gallery. Each row upserts one row in the target set's
`art_manifest.csv` and can optionally assign that asset to card or variant face
rows.

Key fields:

- `set_code`: optional when an active set is loaded; defaults to the active set.
- `art_id`: stable asset ID. If omitted, the importer derives one from the
  filename, URL, or local path.
- `asset_type`: art, icon, symbol, frame, or reference.
- `source_mode`: url, local, or upload. If omitted, the importer infers it from
  `source_url`, `file_path`, or `data_uri`.
- `source_url`: required for URL assets.
- `file_path`: required for local-path assets.
- `data_uri` and `filename`: required for upload/data-URI assets.
- `artist`
- `license`
- `permission_status`: owned, licensed, needs_review, or placeholder.
- `assigned_card_ids`: semicolon-separated card IDs or active-set card names.
  Assignment updates the card's primary variant face.
- `assigned_variant_ids`: semicolon-separated variant IDs. In the active set,
  values can also use `Card Name / Variant Name`.
- `notes`

## `mechanics_template.csv`

Use this for set-specific custom mechanics:

- `mechanic_id`
- `name`
- `kind`: keyword, ability_word, action, counter, token, marker
- `rules_text`
- `reminder_text`
- `colors`
- `status`
- `notes`

## Validation implications

The schema should validate that:

- creatures have power/toughness,
- planeswalkers have loyalty,
- battles have defense,
- normal lands usually have no mana cost,
- Auras have an `Enchant ...` line,
- Equipment has an `Equip ...` line unless deliberately nonstandard,
- Vehicles have crew and P/T,
- tokens are listed consistently,
- art IDs resolve to local files,
- asset pack IDs resolve to installed manifests,
- side/layout combinations make sense.
- each card has exactly one primary variant,
- archived variants are hidden from default search and export,
- deck entries with `variant_id` resolve to that variant or warn and fall back
  to the card primary variant.

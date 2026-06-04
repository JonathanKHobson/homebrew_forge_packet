# Data Model and CSV Schema

## Main design

Use a set folder as the project boundary:

```text
sets/<SET_CODE>/
  set.yaml
  cards.csv
  card_faces.csv
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
- `status`
- `notes`

`entries.csv` stores one row per deck card reference:

- `deck_id`
- `section`: `main`, `side`, or `maybe`
- `count`
- `set_code`
- `card_id`
- `name_snapshot`

Deck entries resolve by `set_code + card_id`. Missing cards should remain in the
deck with a warning so experiments are not silently destroyed.

## Why separate `cards.csv` and `card_faces.csv`?

Magic-style cards include layouts where one physical card has multiple faces or panels: double-faced cards, split cards, adventures, aftermath, battles, sagas, prototype, classes, cases, planeswalkers, and more. A single CSV row becomes awkward.

Use:

- `cards.csv`: identity, collector number, layout, export settings.
- `card_faces.csv`: one row per face/panel/text block.

For simple cards, `cards.csv` can still include common face fields for convenience; the importer can expand them into `card_faces.csv` internally.

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
- `layout_variant`

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

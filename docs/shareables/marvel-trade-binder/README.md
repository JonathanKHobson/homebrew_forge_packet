---
status: live
lane: shareables
type: public-shareable
pin: false
---

# Marvel Trade Binder Shareable

Static GitHub Pages artifact for browsing Kyle's Marvel owned collection.

## Scope

- Source collection: `marvel-owned-cards`
- Public artifact: `docs/shareables/marvel-trade-binder/`
- Generated at: `2026-07-02T07:29:05.895Z`
- Rows: 295
- Total quantity: 425
- Sets: 4
- Market snapshot: $263.19

The public data excludes raw import rows, local file paths, source spreadsheet paths, purchase-source details, importer IDs, and auto-generated import notes. It keeps card identity, owned quantity, finish, condition, set data, public Scryfall references, market snapshot fields, tags, and public notes when present.

## MVP Features

- Search across card name, type, rules text, set, tags, and metadata.
- Filters for set, rarity, color, type, finish, condition, and selected/marked state.
- Sort by name, set/collector number, market value, quantity, condition, and rarity.
- Grid, table, set-grouped, and compare views.
- Local-only select and mark state in the browser.
- Download selected rows as CSV, TXT, or XML.

## Future Auto Shareables

1. Add an in-app Shareable Builder action on collections.
2. Reuse the sanitizer/export DTO so public metadata is explicit before writing files.
3. Let Kyle choose a privacy profile: public trade, private review, or full local preview.
4. Generate to `docs/shareables/<slug>/` with `data/cards.json` and `shareable-spec.json`.
5. Add a publish step that commits and pushes only the generated artifact after visual QA.
6. Later, add a GitHub Action or local scheduled refresh for chosen collections.

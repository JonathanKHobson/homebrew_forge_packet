---
status: live
lane: shareables
type: public-shareable
pin: false
---

# Owned Card Trade Binders Shareable

Static GitHub Pages artifact for browsing Kyle and Eleni owned collection binders.

## Scope

- Public artifact: `docs/shareables/marvel-trade-binder/`
- Generated at: `2026-07-10T01:24:15.721Z`
- Binders: 25
- Sets: 161
- Rows: 1732
- Total quantity: 2185
- Market snapshot: $1,605.76

The public data excludes raw import rows, local file paths, source spreadsheet paths, importer IDs, and auto-generated import notes. Partner-owned cards are visible for browsing but marked not tradable. Explicit Forge trade status is authoritative when present, and designated private Scryfall IDs are omitted before totals are calculated.

## MVP Features

- Prominent binder switching across owned collection binders.
- Set-family switching plus family-grouped set dropdowns.
- Persistent multi-select filters with active filter chips and per-chip removal.
- Owner and tradability filters, plus tradability sorting.
- Grid, table, single-card review, set-grouped, and compare views.
- Full-card preview modal.
- Local-only select and mark state in the browser.
- Download selected rows as CSV, TXT, or XML.
- Scryfall-backed compare search for a visitor's possible trade card.

## Current Tradability Rules

- Eleni-owned cards, including Squirrel Away and partner precons, are not tradable.
- Dogmeat commander copies are not tradable.
- Avengers Assemble deck cards are hard trades.
- Fallout Scrappy Survivors deck cards and red/green/white Fallout cards without blue or black are hard trades.
- Artist-signed cards are hard trades.
- Other Kyle-owned cards default to neutral tradability.
- Explicit `trade_status` values from collection rows override inferred trade policy.

## Future Auto Shareables

1. Move this generator behind an in-app Shareable Builder action on Collections.
2. Let Kyle choose a privacy profile before writing public data.
3. Keep tradability rules in a small editable policy file instead of this script.
4. Generate to `docs/shareables/<slug>/` with `data/cards.json` and `shareable-spec.json`.
5. Add a publish step that commits and pushes only the generated artifact after visual QA.

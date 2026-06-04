# Local Editor Spec

## Goal

A local browser UI that feels as low-cognitive-load as MTG.design while keeping the spreadsheet/files as the source of truth.

## Command

```bash
forge editor --set SG1
```

The CLI starts a local Vite/Express server and opens a browser.

## Main screens

### 1. Set dashboard

- set name/code/version/status,
- card count by type/rarity/status,
- validation errors,
- missing art/assets,
- last render/export time.

### 2. Card list

- filter by status/type/color/tags/missing art/errors,
- quick search by card name/source card,
- changed-since-last-render indicator,
- thumbnail preview.

### 3. Card editor

- fields mapped directly to CSV schema,
- live card preview,
- face tabs for DFC/split/adventure cards,
- rules-text lint warnings,
- asset/art picker,
- source-card comparison panel.

### 4. Art manager

- local import,
- URL import/cache,
- crop editor,
- checksum/source/license display,
- missing art report.

### 5. Asset manager

- installed asset packs,
- supported layouts,
- license notes,
- missing symbols/frames,
- asset audit.

### 6. Import / export dialogs

- open from File > Import or File > Export,
- keep labels broad enough for future card, set, deck, and batch flows,
- choose export profile,
- render changed/all,
- build Cockatrice ZIP,
- output log.

### 7. Decks workspace

- create decklists independent from sets/projects,
- optionally link a deck to one project and/or set for organization,
- search cards across all discovered sets,
- add cards into Main, Sideboard, or Maybeboard with counts,
- keep unresolved card references visible with warnings,
- export grouped plain text and Cockatrice `.cod` deck files.

## Save behavior

The editor writes back to:

- `cards.csv`,
- `card_faces.csv`,
- `art_manifest.csv`,
- `mechanics.csv`,
- `set.yaml`.

Decks write to `decks/<deck-id>/metadata.json` and
`decks/<deck-id>/entries.csv`.

It should not use a hidden database as the canonical store. A temporary SQLite cache is acceptable only for speed/search and must be regenerable from files.

## Manual edits

If the user edits CSV files externally while the editor is open, the app should:

- detect file changes,
- show a reload/merge prompt,
- avoid overwriting newer changes.

## Codex-friendly implementation

Implement the editor in thin slices:

1. read-only dashboard,
2. card list,
3. preview pane,
4. edit one card and write CSV,
5. art picker,
6. export buttons.

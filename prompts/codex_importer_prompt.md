# Codex Prompt — Importers and Migration

Implement importers for moving older custom sets into Homebrew Forge.

## First target: CSV importer

Command:

```bash
forge import csv --from <old.csv> --map <import_map.csv> --set <SET_CODE> [--dry-run]
```

## Required behavior

- Read arbitrary old CSV headers.
- Use mapping rows from `import_map.csv`.
- Write normalized `cards.csv`, `card_faces.csv`, and `art_manifest.csv`.
- Preserve existing IDs when possible.
- Generate stable IDs when missing.
- Convert art URL columns into art manifest rows.
- Do not download art unless `--download-art` is explicitly passed.
- If downloading art, store locally and record source URL/checksum.
- Produce a migration report.

## Future importers

Stub these with clear TODOs:

- Cockatrice XML importer.
- Magic Set Editor importer.
- MTG.design exported-image/import folder importer.

Do not implement MTG.design account scraping.

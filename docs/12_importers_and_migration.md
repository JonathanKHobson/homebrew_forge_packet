# Importers and Migration

## Goal

Bring existing sets/decks into Homebrew Forge without retyping everything.

## Importer types

### CSV importer

Primary path for your existing decks.

```bash
forge import csv --from ~/old/stargate/cards.csv --set SG1 --map import_map.csv
```

Features:

- column mapping,
- default values,
- row validation,
- art URL extraction into `art_manifest.csv`,
- one-face-to-card-faces expansion,
- duplicate ID detection.

### MTG.design importer

Do not scrape MTG.design account pages.

Supported safe paths:

- import card images you already exported,
- import any CSV/text exports MTG.design provides,
- import a manually saved page/file if you own the data and terms allow it.

Not supported in MVP:

- logging into MTG.design and bulk-editing cards,
- scraping private account data,
- scraping MTG.design frame assets.

### Magic Set Editor importer

Possible future adapter:

- read `.mse-set` files,
- extract card data,
- map fields to Homebrew Forge schema,
- optionally import rendered images as reference/legacy images.

### Cockatrice importer

Useful if you have older custom XML:

```bash
forge import cockatrice --from ~/Cockatrice/customsets/SG1.xml --set SG1
```

This can reconstruct card text and set metadata, but it may not recover full design/source fields.

### Scryfall/MTGJSON source-card importer

For reskins or cards based on existing Magic cards:

```bash
forge import scryfall --named "Sol Ring" --as DEMO-001
```

This creates a `source_card_name` link and copies reference metadata into the local row while keeping custom name/art editable.

## Migration steps for an old set

1. Create set folder.
2. Copy current CSV into `imports/raw/`.
3. Create `import_map.csv` mapping old columns to new schema.
4. Run CSV importer in dry-run mode.
5. Fix mapping warnings.
6. Import art URLs into `art_manifest.csv` and download/cache permitted images.
7. Validate card rows.
8. Attach an asset pack.
9. Render a small subset.
10. Export Cockatrice package.

## Keep old IDs stable

If your old Stargate sets already have internal IDs, preserve them. Do not renumber unless necessary. Stable IDs make changed-card rendering and output diffs much easier.

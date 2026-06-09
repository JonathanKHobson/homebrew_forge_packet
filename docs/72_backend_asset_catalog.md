---
status: active
lane: data
type: spec
---
# Backend Asset Catalog

🟢 `[status: active]` `[lane: data]` `[type: spec]`

Status: shipped first backend catalog pass on 2026-06-09.

## Purpose

The backend asset catalog makes local frame, symbol, watermark, mana-symbol,
font, mask, and MSE-style component libraries discoverable without making them
user-facing.

It is for future implementation slices like:

- making official set symbols available where official sets are referenced,
- adding set-symbol dropdowns to Maker,
- exposing saga, battle, class, adventure, planeswalker, token, and other frame
  families to the renderer,
- finding every border, mask, text box, chapter icon, or frame component without
  manually walking asset folders.

## Source Libraries

Configured source libraries live in `assets/catalog/source-libraries.yaml`.

Current sources:

- `mtg-vectors-main`: local SVG set-symbol and watermark source.
- `genevensis-frames-2023-09-14`: local GenevensiS MSE-style frame/component
  source.
- `basic-m15-magic-pack-main`: local Basic M15 plus Full Magic Pack MSE-style
  source.

All three sources are cataloged as local/reference-only. The catalog records
paths and checksums; it does not copy private, third-party, or official-looking
assets into the repo.

## Generated Files

Run:

```bash
pnpm forge assets catalog --write
```

Generated outputs:

- `assets/catalog/current/summary.json`: source, category, role, and extension
  counts.
- `assets/catalog/current/sources.json`: source paths and license-review status.
- `assets/catalog/current/items.jsonl`: full searchable line-delimited index.
- `assets/catalog/current/indexes/set-symbols.json`: set code and rarity lookup.
- `assets/catalog/current/indexes/watermarks.json`: watermark lookup.
- `assets/catalog/current/indexes/frame-families.json`: MSE frame/style family
  lookup.
- `assets/catalog/current/indexes/roles.json`: role-grouped examples.
- `assets/catalog/current/indexes/asset-pack-coverage.json`: which cataloged
  files are already declared by asset-pack manifests.

The first generated pass indexed 57,486 files across all three available source
libraries. The compact indexes are the first place to check; use `items.jsonl`
when a future slice needs exact file paths and hashes.

## MCP Layer

The searchable MCP lives in `scripts/mcp/asset-catalog/` and is wired through
the project `.mcp.json` as `homebrew-forge-assets`.

Build the MCP database:

```bash
python3 scripts/mcp/asset-catalog/build_index.py \
  --repo-root . \
  --catalog-dir assets/catalog/current \
  --db-path assets/catalog/current/asset-catalog.sqlite
```

Smoke the MCP:

```bash
python3 scripts/mcp/asset-catalog/smoke_test.py \
  --server scripts/mcp/asset-catalog/mcp_server.py \
  --db-path assets/catalog/current/asset-catalog.sqlite
```

Available tools:

- `asset_catalog_overview`
- `list_asset_sources`
- `asset_search`
- `asset_get`
- `find_set_symbol`
- `find_watermark`
- `find_frame_assets`
- `asset_relationships`

The SQLite/FTS index stores the full asset table, vector metadata for SVGs,
raster dimensions and declared chroma families, set-name aliases from the local
official-card cache and set CSVs, and relationship groups for duplicates,
set-symbol families, rarity variants, watermark families, frame-component
families, color variants, and existing asset-pack declarations.

## Example Lookups

Find the Assassin's Creed official set symbol:

```bash
rg '"setCode":"ACR"' assets/catalog/current/items.jsonl
```

Find planeswalker watermark options:

```bash
rg '"watermark":"planeswalker"' assets/catalog/current/items.jsonl
```

Find saga frame families:

```bash
rg 'saga' assets/catalog/current/indexes/frame-families.json
```

Ask the MCP for the same class of result:

```json
{"tool":"asset_search","arguments":{"query":"blue saga chapter icon","layout":"saga","limit":5}}
```

Find the Assassin's Creed common set stamp through natural language:

```json
{"tool":"asset_search","arguments":{"query":"Assassin Creed set stamp common optimized","limit":3}}
```

## Boundary

This is not a Maker UI slice and not a renderer role-mapping slice. Future work
should promote specific cataloged files into asset-pack manifests only after the
layout role, coordinates, license status, and intended UI behavior are reviewed.

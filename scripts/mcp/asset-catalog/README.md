---
status: active
lane: runtime
type: reference
---
# Homebrew Forge Asset Catalog MCP

🟢 `[status: active]` `[lane: runtime]` `[type: reference]`

This MCP exposes the backend asset catalog as searchable tools for AI-assisted
frame, symbol, stamp, icon, watermark, and component lookup.

Build the SQLite index:

```bash
python3 scripts/mcp/asset-catalog/build_index.py \
  --repo-root . \
  --catalog-dir assets/catalog/current \
  --db-path assets/catalog/current/asset-catalog.sqlite
```

Smoke the MCP server:

```bash
python3 scripts/mcp/asset-catalog/smoke_test.py \
  --server scripts/mcp/asset-catalog/mcp_server.py \
  --db-path assets/catalog/current/asset-catalog.sqlite
```

The project `.mcp.json` points clients at `mcp_server.py`. The server is
read-only except for no-op runtime inspection; rebuild the SQLite index with
`build_index.py` after regenerating `assets/catalog/current/items.jsonl`.

Tools exposed:

- `asset_catalog_overview`
- `list_asset_sources`
- `asset_search`
- `asset_get`
- `find_set_symbol`
- `find_watermark`
- `find_frame_assets`
- `asset_relationships`

By default the builder parses SVG vector metadata and records raster dimensions
plus path-derived chroma families. Deep PNG pixel sampling is intentionally
opt-in because decoding every frame PNG is too slow for routine MCP rebuilds:

```bash
python3 scripts/mcp/asset-catalog/build_index.py \
  --repo-root . \
  --max-png-decode-pixels 80000
```


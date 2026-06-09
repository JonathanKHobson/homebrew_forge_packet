---
status: completed
lane: docs
type: spec
---
# Architecture Overview

✅ `[status: completed]` `[lane: docs]` `[type: spec]`

## Monorepo layout

```text
homebrew-forge/
  AGENTS.md
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json

  apps/
    editor/                 # React/Vite local browser UI

  packages/
    schema/                 # Zod + JSON Schema contracts
    core/                   # Card model, set model, utilities
    renderer/               # React/SVG card renderer
    cli/                    # Node CLI commands
    assets/                 # Asset pack/source sync system
    importers/              # CSV, MSE, Cockatrice, MTG.design export adapters
    exporters/              # PNG/JPG/PDF/Cockatrice output
    reference/              # Scryfall/MTGJSON cache and search
    rules-lint/             # MTG templating/color-pie/rules-text linting
    test-fixtures/          # demo sets and fixture assets

  sets/
    DEMO/
      set.yaml
      cards.csv
      card_faces.csv
      art_manifest.csv
      mechanics.csv
      export_profiles.yaml
      art/
        raw/
        cropped/

  assets/
    packs/
      README.md
      <asset-pack-id>/
        manifest.yaml
        frames/
        symbols/
        fonts/
        layout-maps/

  reference-cache/
    scryfall/
    mtgjson/

  output/
    DEMO/
      images/
      cockatrice/
      print/
      logs/
```

## Data flow

```text
CSV/YAML input
  -> parse
  -> normalize
  -> schema validation
  -> rules linting
  -> asset resolution
  -> render React/SVG to DOM
  -> snapshot/export image
  -> postprocess
  -> package for target
```

## Rendering strategy

Use the browser as the layout engine.

1. `packages/renderer` exposes React components.
2. `apps/editor` shows live preview and edits data.
3. `packages/exporters` uses Playwright to render the same component headlessly.
4. Sharp post-processes screenshots to PNG/JPG/WebP as needed.
5. Optional PDF output is built from already-rendered images.

This avoids duplicate logic between UI and batch export.

## Asset strategy

Do not embed frame art directly in renderer code. The renderer receives an `AssetPack` object with:

- frame layers,
- text zones,
- art crop mask,
- symbol sources,
- font declarations,
- layout maps,
- color/style variants,
- legal/attribution metadata.

## Reference strategy

Scryfall/MTGJSON data is used for:

- finding official wording examples,
- importing existing card metadata,
- reskinning old cards,
- comparing mana value/color identity/type lines,
- filling set names/rarities/collector data,
- testing schema compatibility.

Reference data should not be required for rendering already-authored custom cards.

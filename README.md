# Homebrew Forge — General MTG Card Workflow Packet

> Expired worktree warning: do not start new Homebrew Forge work in this folder.
> Use `/Users/kyle/Documents/My Games/Magic The Gathering/homebrew_forge_packet`
> instead. The default app is now `/Applications/Homebrew Forge.app`.

Purpose: build a reusable, local, spreadsheet-first program for making and maintaining **any** Magic-style homebrew card set or deck, including older sets you already made, without making the workflow depend on MTG.design, Black Panther/Wakanda/Shuri, or any one theme.

## Recommended architecture

Build a TypeScript/React + Node CLI app with a shared rendering core:

```text
sets/<SET_CODE>/*.csv + local art + asset packs
        ↓
schema validation + reference checks
        ↓
React local editor with live card preview
        ↓
batch renderer via Playwright/SVG/Sharp
        ↓
PNG/JPG exports + Cockatrice package + optional print PDFs
```

The key design decision is that **card data, art metadata, and asset packs are local and version-controlled**, while exported card images are disposable.

## What changed from the Wakanda-specific packet

- No Black Panther, Wakanda, Shuri, Marvel, or theme-specific assumptions.
- The project is now called **Homebrew Forge**.
- The schema supports multiple sets/decks, migration of older sets, and source-card/reskin workflows.
- Frames and graphic assets are handled by a **pluggable asset-pack system** rather than being hand-built into the app.
- The prompts explicitly prevent Codex from hard-coding one setting, one deck, or one visual style.

## Important asset note

This packet does **not** include copyrighted card frames, fonts, official symbols, or art files. It defines a safe asset-ingestion architecture:

- import from a local directory you provide,
- sync from open-source/licensed packages such as icon fonts,
- download from public GitHub repositories only when license metadata is reviewed,
- cache source URLs/checksums so assets do not disappear,
- never make MTG.design, Scryfall, Card Conjurer, or any other web app the source of truth.

The asset module should support “scraping” only in the narrow engineering sense of **manifest-driven ingestion from permitted sources**. It should not bypass paywalls, logins, anti-bot systems, terms of service, copyright notices, or access controls.

## Packet contents

```text
README.md

docs/
  00_decision_summary.md
  01_research_summary.md
  02_architecture_overview.md
  03_data_model_and_csv_schema.md
  04_asset_pack_strategy.md
  05_asset_source_matrix.md
  06_scraping_and_asset_ingestion_policy.md
  07_renderer_engine_spec.md
  08_local_editor_spec.md
  09_cli_spec.md
  10_export_targets.md
  11_cockatrice_export_spec.md
  12_importers_and_migration.md
  13_reference_data_layer.md
  14_validation_and_rules_linting.md
  15_testing_quality_and_visual_regression.md
  16_security_legal_and_private_use.md
  17_implementation_roadmap.md
  18_repo_issue_backlog.md
  19_glossary.md

prompts/
  codex_master_prompt.md
  codex_phase_prompts.md
  codex_asset_pack_prompt.md
  codex_importer_prompt.md
  codex_first_task_prompt.md

config_examples/
  AGENTS.md
  asset_sources.example.yaml
  export_profiles.example.yaml
  homebrew-forge.config.example.yaml
  mcp_config_examples.md

csv_templates/
  sets_template.csv
  cards_template.csv
  card_faces_template.csv
  art_manifest_template.csv
  asset_manifest_template.csv
  import_map_template.csv
  mechanics_template.csv
  export_profiles_template.csv

schemas/
  card.schema.json
  card_face.schema.json
  set.schema.json
  art_manifest.schema.json
  asset_pack.schema.json
  export_profile.schema.json

src_contracts/
  AssetSourcePlugin.ts
  AssetPack.ts
  CardRecord.ts
  Exporter.ts
  Importer.ts
  Renderer.ts

skills/homebrew-forge/
  SKILL.md
```

## First practical build target

Do not start with every frame in Magic history. Start with this reproducible loop:

```text
forge init
forge import csv --set examples/demo-set
forge assets sync --source mana --source keyrune --source user-local-pack
forge validate --set DEMO
forge render --set DEMO --profile cockatrice
forge export cockatrice --set DEMO --zip
forge editor --set DEMO
```

The first visible render can use a user-supplied frame pack or a very plain debug frame. The debug frame exists only to test layout; production-looking frame assets should come from asset packs.

## Current vertical slice

This packet now includes a working TypeScript workspace under `packages/forge`:

- loads `sets/DEMO/*.csv`,
- parses simple card XML into the same card/face shape,
- validates records with Zod,
- renders cards through Playwright to PNG using local asset-pack frame/icon image inputs,
- maps Kyle's Basic M15 MSE frame folder as `assets/packs/basic-m15-local`,
- keeps Kyle's GenevensiS and Figma asset folders available as fallback/reference packs,
- writes individual PNGs under `output/<SET>/images/`,
- writes Cockatrice XML, custom images, and a ZIP under `output/<SET>/cockatrice/`.

On this Mac, bootstrap local pnpm first because there is no global npm/pnpm:

```bash
./scripts/bootstrap-pnpm.sh
node .tools/pnpm/bin/pnpm.cjs install
```

Then run the shipped loop:

```bash
node .tools/pnpm/bin/pnpm.cjs lint
node .tools/pnpm/bin/pnpm.cjs typecheck
node .tools/pnpm/bin/pnpm.cjs test
node .tools/pnpm/bin/pnpm.cjs build
PATH="$PWD/node_modules/.bin:$PATH" forge validate --set DEMO
PATH="$PWD/node_modules/.bin:$PATH" forge assets check --pack basic-m15-local --strict
PATH="$PWD/node_modules/.bin:$PATH" forge render --set DEMO --profile review_png
PATH="$PWD/node_modules/.bin:$PATH" forge export cockatrice --set DEMO --zip
```

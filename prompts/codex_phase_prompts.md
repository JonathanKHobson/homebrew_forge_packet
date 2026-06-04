# Codex Phase Prompts

## Phase 0 — Scaffold

Create the Homebrew Forge pnpm monorepo. Add packages for schema, core, renderer, CLI, assets, importers, exporters, reference, rules-lint, and test fixtures. Add Vitest, TypeScript, and basic scripts: `lint`, `typecheck`, `test`, `build`. Add AGENTS.md and a small DEMO set under `sets/DEMO`.

Acceptance:

- `pnpm install` works.
- `pnpm typecheck` works.
- `pnpm test` runs at least one placeholder test.
- `forge --help` works via the CLI package.

## Phase 1 — Schema and CSV

Implement Zod schemas and CSV parsing/writing for sets, cards, card faces, art manifests, export profiles, and asset packs. Implement `forge validate --set DEMO`.

Acceptance:

- Demo CSV rows parse.
- Invalid rows produce readable validation errors.
- Validation can output text and JSON.
- Tests cover required fields and common card types.

## Phase 2 — Asset pack core

Implement `AssetPack` and `AssetSourcePlugin` contracts. Add a debug asset pack for tests only. Add local-directory import and asset audit. Add config loading from `asset_sources.yaml`.

Acceptance:

- `forge assets list` works.
- `forge assets audit --pack debug` works.
- Missing assets are reported clearly.
- License/source metadata is required for non-debug packs.

## Phase 3 — Renderer MVP

Create a React card renderer that uses CardRecord, CardFaceRecord, ArtManifest, AssetPack, and ExportProfile. Render a normal card using the debug frame. Implement mana-symbol fallback rendering. Use Playwright to export PNG/JPG.

Acceptance:

- `forge render --set DEMO --profile cockatrice` creates images.
- Re-running skips unchanged cards via hash cache.
- Missing art can use placeholder only if profile allows it.
- Tests include a render smoke test.

## Phase 4 — Cockatrice export

Implement Cockatrice XML generation, image folder creation, install README, and ZIP packaging.

Acceptance:

- `forge export cockatrice --set DEMO --zip` creates XML, images, and ZIP.
- XML parses in tests.
- All card images referenced by XML exist.

## Phase 5 — Local editor

Implement `forge editor --set DEMO`. Build React pages for dashboard, card list, card preview, and single-card edit form. Save changes back to CSV.

Acceptance:

- Local server opens.
- Demo set loads.
- Editing a card changes CSV.
- Preview updates.
- Validation errors show in UI.

## Phase 6 — Import old CSV

Implement a column-mapping CSV importer for older user sets.

Acceptance:

- `forge import csv --from imports/raw.csv --map import_map.csv --set SG1 --dry-run` shows mapped output.
- Non-dry-run writes normalized files.
- Art URL fields are converted into art manifest rows.

## Phase 7 — Reference layer

Implement MTGJSON/Scryfall cache interfaces and source-card import.

Acceptance:

- Reference sync can be disabled/offline.
- Named-card lookup fills source metadata.
- Compare command shows mana cost/type/text comparison.

## Phase 8 — Advanced assets and layouts

Add support for additional asset-pack layout maps and advanced card layouts: planeswalker, saga, battle, vehicle, equipment, DFC, split, adventure.

Acceptance:

- Each new layout has fixture rows.
- Unsupported asset pack layouts fail with actionable messages.
- Visual tests cover each layout in debug mode.

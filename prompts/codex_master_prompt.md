# Codex Master Prompt — Homebrew Forge

You are working in a new repository called `homebrew-forge`.

Build a general-purpose, local, spreadsheet-first Magic-style card creation workflow. This is not a Black Panther/Wakanda/Shuri project and must not hard-code any one setting, deck, IP, or theme. The tool should support any custom set or deck, including migration of older sets the user has already made.

## Product goal

Create a TypeScript/React + Node CLI app that turns local CSV/YAML card data plus local art plus pluggable visual asset packs into rendered card images, Cockatrice exports, and optional print outputs.

## Core loop

```text
sets/<SET_CODE>/cards.csv
sets/<SET_CODE>/card_faces.csv
sets/<SET_CODE>/art_manifest.csv
sets/<SET_CODE>/set.yaml
assets/packs/<PACK>/manifest.yaml
        ↓
forge validate --set <SET_CODE>
forge render --set <SET_CODE> --profile cockatrice
forge export cockatrice --set <SET_CODE> --zip
forge editor --set <SET_CODE>
```

## Architecture requirements

Use a pnpm monorepo:

```text
apps/editor
packages/schema
packages/core
packages/renderer
packages/cli
packages/assets
packages/importers
packages/exporters
packages/reference
packages/rules-lint
packages/test-fixtures
```

Use TypeScript throughout. Use React/Vite for the local editor. Use Zod for schemas. Use Playwright for headless rendering. Use Sharp for image postprocessing if needed. Use Vitest for tests.

## Source of truth requirements

- CSV/YAML/JSON files are the source of truth.
- Rendered images, XML, PDFs, and ZIPs are generated artifacts.
- Do not create a hidden canonical database.
- A temporary cache is allowed only if it can be rebuilt from files.

## Asset requirements

Do **not** create production card frames inside the codebase.
Do **not** embed copyrighted official frames/assets in the repository.
Do **not** scrape MTG.design or any site without explicit permission/API/terms.

Instead implement a pluggable asset-pack system:

- `AssetPack` manifest loader.
- `AssetSourcePlugin` interface.
- Local directory importer.
- Package/GitHub source adapters when configured and license-reviewed.
- Asset audit with source URL, license, checksum, and redistribution flags.
- A minimal debug frame only for smoke tests, visibly marked as debug.

The app should be able to import user-supplied frame packs from local folders. It can sync open-source/licensed symbol packages such as mana-font/Keyrune when configured.

## Reference data requirements

Implement reference-cache interfaces for Scryfall and MTGJSON, but do not make rendering depend on internet access. Reference data helps with:

- source-card imports,
- wording comparisons,
- color identity checks,
- official rules text examples,
- reskin workflows.

## Export requirements

MVP target is Cockatrice:

```text
output/<SET>/cockatrice/<SET>.xml
output/<SET>/cockatrice/pics/CUSTOM/<SET>/*.jpg
output/<SET>/cockatrice/<SET>-cockatrice.zip
```

Also support individual PNG/JPG image exports.

## Import/migration requirements

Support importing existing user CSVs with a mapping file. Later adapters may import Cockatrice XML, Magic Set Editor sets, and exported MTG.design images/data, but do not scrape private account pages.

## Validation requirements

Implement layered validation:

1. schema validation,
2. card-type component validation,
3. asset/path validation,
4. rules-text linting,
5. export validation.

Use warning/error severities and allow waivers.

## Default safety behavior

Default export profiles should mark cards as:

```text
CUSTOM PLAYTEST — NOT FOR SALE
```

Do not implement features intended to create counterfeits or pass cards off as official.

## First deliverable

Build the smallest working skeleton:

1. Create pnpm workspace and packages.
2. Add Zod schemas for set/card/card_face/art_manifest/export_profile/asset_pack.
3. Add CSV parser/writer.
4. Add `forge validate`.
5. Add a demo set with generic sample cards.
6. Add debug asset pack.
7. Add simple renderer with Playwright screenshot export.
8. Add Cockatrice XML/image ZIP export.
9. Add tests for schema, CSV, render smoke, and XML parsing.

Do not spend time perfecting every frame or layout until the data/render/export loop works.

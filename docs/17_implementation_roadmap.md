# Implementation Roadmap

## Phase 0 — Repo scaffold

- pnpm workspace,
- TypeScript config,
- lint/test setup,
- AGENTS.md,
- example DEMO set,
- package structure.

## Phase 1 — Schema and CSV

- Zod schemas,
- CSV parser/writer,
- set folder loader,
- validation report,
- JSON Schema export,
- `forge validate`.

## Phase 2 — Asset pack core

- `AssetPack` interface,
- `AssetSourcePlugin` interface,
- local-directory importer,
- `mana-font`/Keyrune package adapters,
- asset audit,
- debug asset pack.

## Phase 3 — Renderer smoke MVP

- React card component,
- debug frame support,
- text zones,
- mana-symbol rendering,
- art placement,
- Playwright headless render,
- PNG/JPG output.

## Phase 4 — Cockatrice export

- XML writer,
- image folder output,
- ZIP package,
- generated install README,
- parser tests.

## Phase 5 — Local editor

- set dashboard,
- card list,
- preview,
- card edit form,
- CSV save,
- validation panel.

## Phase 6 — Importers/migration

- old CSV mapping importer,
- Cockatrice importer,
- MSE importer investigation,
- MTG.design exported-image/import notes.

## Phase 7 — Reference cache

- MTGJSON sync,
- Scryfall sync/named lookup,
- source-card import,
- wording search,
- compare tool.

## Phase 8 — Advanced layouts

- planeswalkers,
- sagas,
- battles,
- DFCs,
- split/adventure.

## Phase 9 — Polish

- visual regression tests,
- crop editor,
- asset manager UI,
- print PDFs,
- custom symbols.

## Phase 10 — Codex skill

Package a Homebrew Forge Codex skill for repeated tasks:

- add cards from prompt,
- import old CSV,
- validate templating,
- update asset source,
- render/export changed cards.

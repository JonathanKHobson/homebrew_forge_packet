---
status: archived
lane: ui
type: plan
archived: 2026-06-09
---
> **ARCHIVED 2026-06-09 (implemented-plans sweep)** — original path: `docs/69_deck_builder_export_preview_repair_plan.md`
> Reason: implemented planning artifact, archived per Kyle's 2026-06-09 directive (all plans implemented; no live backlog).
> Index: `docs/cowork/02_repo_archive_manifest.md` + `docs/64_repo_cleanup_archive_index.md`.

# Deck Builder Export and Preview Repair Plan

🗄️ `[status: archived]` `[lane: ui]` `[type: plan]`

Status: verified  
Owner surface: Decks, Transfer Dialog, Focused Layouts, References, shared card-list controls

## Priority

Make Deck Builder feel trustworthy again. The deliverable is a verified repair lane where File > Export respects the active deck and active deck variant, Focused Card Preview opens from the current workspace instead of falling back to Focus Maker, deck add/swap flows are source-aware, and card-list controls use one consistent icon and interaction pattern.

## Scope

- File > Export defaults to the active Decks workspace deck and deck variant.
- Deck export accepts an optional `deckVariantId` in editor client, runtime API, and Forge export code.
- Export UI identifies the deck, variant, format, commander/partner slots, Main/Side/Maybe counts, candidate/cut/unresolved counts, and advisory warnings before export.
- Focused Card Preview becomes contextual for Maker, Decks, Collections, Binders, Lists, Sets, Projects, Gallery, and References.
- Deck add/swap uses one lean source-aware picker with preview, source filters, non-blocking legality warnings, and persistent row warning flags after confirm.
- Deck rows gain checkbox multi-select, shift-click range selection, selected-count actions, and icon-only row tools.
- References official-card view controls use the same icon-only segmented control pattern and ordering as Decks/Collections: Table, Grid, List, Single.
- `Icon.tsx` owns table and mana icons so Table does not use the eye icon and Mana does not use settings.
- Mana cost, color identity, and mana value displays use shared symbol/badge components where those values appear in repaired surfaces.

## Explicit Non-Goals

- Dashboard donut redesign.
- Drag/drop or manual deck ordering.
- A full blocking legality engine.
- Remote asset downloads.
- Official symbol asset imports without a reviewed source and license path.
- Copyrighted MTG symbols, logos, frames, or official art in core repo assets.

## Implementation Slices

1. Planning and tracking: create this doc, update `docs/project-map.md`, and add a Phase 13 tracker row in `docs/47_forge_ui_phase_tracker.md`.
2. Variant-aware deck export: thread active deck/variant context from Decks workspace to File > Export, extend editor/runtime/Forge export APIs, and add focused tests.
3. Icon and References control cleanup: add table/mana icons and normalize References official-card view controls.
4. Contextual Focused Card Preview: route preview requests to the active workspace source rather than Focus Maker.
5. Deck add/swap and list controls: add a source-aware picker, swap action, advisory warnings, row flags, checkboxes, range selection, bulk actions, and grid/list/single polish.
6. Verification: run Forge/editor tests, typecheck/build, UX gate, visual QA at desktop and 390px, and the launcher health hook.

## Verification Evidence

- Forge tests: `node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/forge test`
- Editor tests: `node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor test`
- Root typecheck: `node .tools/pnpm/bin/pnpm.cjs typecheck`
- Root build: `node .tools/pnpm/bin/pnpm.cjs build`
- UX gate: `node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor run test:ux-gate`
- Visual QA: `output/playwright/forge-ui-phase-deck-builder-export-preview-repair/qa-results.json`

## Verification Targets

- `node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/forge test`
- `node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor test`
- `node .tools/pnpm/bin/pnpm.cjs typecheck`
- `node .tools/pnpm/bin/pnpm.cjs build`
- `node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor run test:ux-gate`
- `node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor run visual:forge-ui -- --phase deck-builder-export-preview-repair`
- `scripts/codex/homebrew-forge-launcher-health-hook.sh`

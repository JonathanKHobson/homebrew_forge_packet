---
status: active
lane: ui
type: reference
---
# Forge UI Global CSS Exceptions

🟢 `[status: active]` `[lane: ui]` `[type: reference]`

Date: 2026-06-07

Purpose: document what remains in the legacy editor stylesheet after the North
Star pass, and prevent new Forge UI work from expanding the same global tangle.

## Current Style Entry Order

`packages/editor/src/main.tsx` imports styles in this order:

1. `packages/editor/src/styles.css`
2. `packages/editor/src/styles/forge-ui-craft.css`
3. `packages/editor/src/styles/forge-ui-shell.css`

`styles.css` is the compatibility layer. The Forge UI layers are late, smaller,
theme-aware overrides.

## Remaining Legacy Exceptions

Keep these in `styles.css` until their owners are migrated behind stable Forge UI
components:

- broad editor layout, panel grid, and responsive breakpoint rules
- historical create/import/export overlay layout rules
- workspace-specific Decks, Collections, Gallery, References, and Settings rules
- card preview/canvas sizing rules and rendered-card adjacency rules
- table/list row contracts that are still consumed by large workspace components
- one-off dark-mode patches that predate the tokenized Forge UI layers

## Migration Rule

New visual work should not add fresh feature styling to `styles.css` unless it is
fixing a regression in an existing legacy selector. Prefer a small owner file in
`packages/editor/src/styles/`, then import it after the layer it depends on.

## Split Completed In Phase 8

- `forge-ui-craft.css` owns the general tokenized craft/depth/focus layer.
- `forge-ui-shell.css` owns command palette, Workspace Health, status-strip
  health controls, and shared shell utilities.

## Reopen Tailwind/shadcn Gate After

- the remaining legacy workspace rules have smaller owner files or documented
  exceptions
- shell/workspace overlays import Forge UI adapters rather than legacy class
  recipes
- the full visual QA lane passes after a temporary Tailwind import spike

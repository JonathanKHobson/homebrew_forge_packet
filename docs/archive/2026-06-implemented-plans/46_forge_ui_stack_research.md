---
status: archived
lane: ui
type: research
archived: 2026-06-09
---
> **ARCHIVED 2026-06-09 (implemented-plans sweep)** — original path: `docs/46_forge_ui_stack_research.md`
> Reason: implemented planning artifact, archived per Kyle's 2026-06-09 directive (all plans implemented; no live backlog).
> Index: `docs/cowork/02_repo_archive_manifest.md` + `docs/64_repo_cleanup_archive_index.md`.

# Forge UI Stack Research

🗄️ `[status: archived]` `[lane: ui]` `[type: research]`

This research fixes the stack decision for the North Star migration: stabilize Forge UI through repo-native tokens and components first, then run a bounded Tailwind/shadcn adoption gate after component boundaries are cleaner.

## Current Repo Facts

- Editor package: `packages/editor`.
- Runtime: React 19.2.6, Vite 4.5.5, TypeScript 6.0.3.
- Styling: one imported global stylesheet, `packages/editor/src/styles.css`.
- No current Tailwind config, PostCSS config, shadcn `components.json`, or generated shadcn UI folder.
- Large current edit surfaces:
  - `packages/editor/src/styles.css` is over 10k lines.
  - `packages/editor/src/App.tsx` owns shell/layout orchestration.
  - `packages/editor/src/components/WorkspaceView.tsx` owns many management workspaces.
  - Dashboard, Card Browser, create overlays, print, filters, and deck/collection overlays already have separate component lanes.

## External Stack Notes

### shadcn/ui

The Vite setup path currently assumes Tailwind v4, a Vite Tailwind plugin, TypeScript path aliases, and a CLI-generated `components.json` plus generated source components. That is compatible as a future target, but it is not a low-risk first slice in this repo because the current editor has large global CSS and no path alias convention yet.

Source: https://v3.shadcn.com/docs/installation/vite

### Tailwind CSS

The current Tailwind Vite path installs `tailwindcss` and `@tailwindcss/vite`, adds the Tailwind Vite plugin, and imports Tailwind from CSS. This can coexist with Vite, but it changes global CSS behavior and must be tested against existing token overrides and legacy selectors.

Source: https://tailwindcss.com/docs/installation/using-vite

### Radix Primitives

Radix is the safest primitive layer after the foundation phase because it is unstyled, accessible, customizable, and can be adopted incrementally. It is a better match for dialogs, dropdown menus, tabs, popovers, tooltips, and command/search interactions than hand-rolling those behaviors.

Source: https://www.radix-ui.com/primitives/docs/overview/introduction

### Lucide React

Lucide React is the lowest-risk visual dependency because icons are imported as standalone typed SVG components and only imported icons are included in the build output. Use it through the existing `Icon.tsx` compatibility wrapper after an icon inventory, not through direct imports everywhere.

Source: https://lucide.dev/guide/react

## Decision

Use staged CSS/component-first migration now:

1. Phase 1 keeps current dependencies and splits the style system into maintainable layers.
2. Phase 2 creates repo-native Forge UI primitives.
3. Phase 6 runs the Tailwind/shadcn adoption gate after component boundaries exist.

## Dependency Defaults

- Phase 1: no new dependencies.
- Phase 2: `lucide-react` is allowed only after the icon map is finalized.
- Phase 6: Tailwind, shadcn, and Radix are allowed only after the adoption gate passes.
- Fontsource and Motion stay deferred until typography or motion acceptance criteria require them.

## Adoption Gate Criteria

Tailwind/shadcn may be added only when all are true:

- Forge UI primitives exist and own common button, status, surface, header, table shell, empty state, and validation summary patterns.
- The stylesheet has a token/layer structure, not one uncontrolled global file.
- A one-slice spike proves Tailwind output does not regress light/dark/parchment contrast.
- shadcn components are wrapped in Forge UI adapters rather than imported throughout feature code.
- Typecheck, build, UX gate, and visual QA pass.

If the spike fails, continue with Radix primitives plus Forge UI CSS tokens.

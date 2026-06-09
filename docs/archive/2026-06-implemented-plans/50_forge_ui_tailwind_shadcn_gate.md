---
status: archived
lane: ui
type: report
archived: 2026-06-09
---
> **ARCHIVED 2026-06-09 (implemented-plans sweep)** — original path: `docs/50_forge_ui_tailwind_shadcn_gate.md`
> Reason: implemented planning artifact, archived per Kyle's 2026-06-09 directive (all plans implemented; no live backlog).
> Index: `docs/cowork/02_repo_archive_manifest.md` + `docs/64_repo_cleanup_archive_index.md`.

# Forge UI Tailwind/shadcn Adoption Gate

🗄️ `[status: archived]` `[lane: ui]` `[type: report]`

Date: 2026-06-07

Decision: do not install Tailwind/shadcn in the editor yet. Continue with Forge UI primitives, existing CSS tokens, Lucide through `Icon.tsx`, and Radix-compatible component boundaries.

## Gate Inputs

- Current editor runtime: React 19.2.6, Vite 4.5.5, TypeScript, pnpm workspace.
- Current CSS imports: `packages/editor/src/styles.css` plus `packages/editor/src/styles/forge-ui-craft.css`.
- Current global CSS size: over 11k lines across the compatibility stylesheet and craft layer.
- Current Vite config has React plus the local editor API plugin. It does not include `@tailwindcss/vite`.
- Current TypeScript config does not define the `@/*` alias expected by the shadcn Vite path.
- Forge UI primitives now exist under `packages/editor/src/components/forge-ui/`.
- Shell, workspace row states, overlays, and visual QA are already using the repo-native primitive layer.

## External Requirements Checked

- shadcn Vite setup is Tailwind v4 based and expects Tailwind, the Vite Tailwind plugin, TypeScript path aliases, `components.json`, and generated components.
- Tailwind's Vite setup expects `tailwindcss`, `@tailwindcss/vite`, the Vite plugin, and an `@import "tailwindcss"` CSS entry.
- Radix primitives remain the safer incremental path for future dialog, dropdown, popover, tabs, tooltip, and command/menu behavior because they can be styled with Forge UI tokens.
- Lucide React was approved and installed earlier because it is already isolated behind `Icon.tsx`.

## Gate Result

Tailwind/shadcn is not approved for production migration yet.

Reasons:

- Importing Tailwind's base layer into the current editor would introduce global CSS effects before the legacy stylesheet is sufficiently modularized.
- shadcn's Vite path requires alias/config changes that would create repo-wide conventions before the editor has finished moving major shell/workspace concerns out of legacy owners.
- A generated shadcn component would need a Forge UI adapter immediately, but current repo-native `Button`, `StatusPill`, `Surface`, `EmptyState`, `WorkspaceHeader`, `InspectorPanel`, `ValidationSummary`, and `DataTableShell` already cover the active Phase 3-5 needs.
- The current verification lane is green without Tailwind/shadcn, so adding them now increases migration risk without unlocking a required North Star surface.

## Approved Fallback

Continue with:

- Forge UI primitives in `packages/editor/src/components/forge-ui/`.
- Shell primitives in `packages/editor/src/components/shell/`.
- Lucide through `packages/editor/src/components/Icon.tsx`.
- Existing CSS token layers in `packages/editor/src/styles/`.
- Radix-compatible APIs for future overlays, popovers, command palette, tooltips, and tabs when a specific widget needs stronger accessibility behavior than the repo-native component provides.

## Reopen Criteria

Reopen Tailwind/shadcn adoption only after:

- `styles.css` has been split into smaller owned layers, with durable exceptions documented.
- Shell/workspace/overlay components import Forge UI adapters instead of legacy class recipes.
- A temporary Tailwind import spike can pass typecheck, build, UX gate, and visual QA across light, dark, parchment, overlays, mobile, and focused layouts.
- Generated shadcn components are wrapped in Forge UI adapters and not imported directly by feature code.

## Verification Evidence

The gate was evaluated after these slices were green:

- Phase 3 shell extraction: `output/playwright/forge-ui-phase-3/qa-results.json`.
- Phase 4 workspace source/status visuals: `output/playwright/forge-ui-phase-4/qa-results.json`.
- Phase 5 overlay/dialog visuals: `output/playwright/forge-ui-phase-5/qa-results.json`.

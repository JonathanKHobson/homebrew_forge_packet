---
status: active
lane: qa
type: reference
pin: hard-ref
---
# Homebrew Forge UX Quality Gate

🟢 `[status: active]` `[lane: qa]` `[type: reference]` `[pin: hard-ref]`

Use this before changing Homebrew Forge UI, UX, accessibility, onboarding, dialogs, navigation, responsive layout, or visible copy.

Full audit source: `docs/38_ux_audit_issue_catalog.md`, `docs/39_ux_audit_priority_matrix.md`, `docs/40_ux_audit_phase_slice_roadmap.md`, and `docs/41_ux_audit_implementation_tracker.md`.

## What We Learned

Homebrew Forge needs quiet, dense, scan-friendly product UI. Users are usually editing, reviewing, importing, exporting, or printing local card data, not reading a marketing page.

The app must preserve its object model in the interface: Maker authors card records; Cards catalogs app card rows; Sets own authored records; Projects group sets; Decks are playable/export lists; Collections are isolated card lists; Gallery stores assets; References store rules and terms; Frames and Layouts are visual configuration, not card identity.

Orientation belongs in first-run, empty, and help states. It should not permanently occupy the editor or compete with active work.

Hidden state breaks trust. Search stays visible, active filters show counts, reset is easy, and filter-heavy work uses the shared browse/filter overlay pattern.

Responsive behavior is product behavior. At narrow widths, rail destinations must stay reachable and list/preview/inspector surfaces need explicit switching or an equivalent single-task layout.

Accessibility is part of the component contract. Tabs, menus, dialogs, icon buttons, destructive actions, and status messages need semantics, labels, keyboard behavior, focus order, and visible recovery paths.

Dialogs need hierarchy. Each dialog section should have one clear primary action, secondary exits, and tertiary utility/help links.

Status and validation need local recovery. Field errors, progress, retry, disabled-state honesty, and app-shell status should make the next action clear without relying on console output.

## Pre-Code Check

- Name the user job and the visible surface being changed.
- Identify the owning component or helper before editing. Avoid adding large UI blocks to `App.tsx` or `WorkspaceView.tsx` when a focused component is the right home.
- Confirm which domain objects are involved and keep their labels distinct.
- Decide the states before coding: default, loading, empty, error, disabled, focused, narrow viewport, and long-content cases.
- Choose the existing pattern first: `OverlayShell`, browse/filter overlays, inspector tabs, app status strip, shared create/import/export components, count helper, panel collapse controls.
- Define the visual density target. Operational editor surfaces should be compact and work-focused.

## Pre-Handoff Check

- Keyboard path works for changed controls, including tabs, menus, dialogs, and destructive actions.
- Icon-only controls have accessible labels and visible focus.
- Dialogs have one primary action per section and predictable Close/Cancel behavior.
- Search/filter changes keep search visible, active filters counted, and reset easy.
- First-run or empty-state guidance disappears or gives way when active work exists.
- Narrow viewport QA covers 390px width or the smallest affected breakpoint.
- No horizontal overflow, clipped rail destinations, or stacked controls blocking core work.
- Counts use `formatCount()` or equivalent pluralization.
- Status, loading, error, and validation messages state what happened and what to do next.
- Run the relevant verification lane and capture evidence in the final response.

## Code Owners

- App shell, onboarding layout, panel visibility, narrow Maker switcher: `packages/editor/src/App.tsx`, `packages/editor/src/components/FirstRunOrientation.tsx`, `packages/editor/src/styles.css`.
- Maker card-list search/filter/list behavior: `packages/editor/src/components/CardList.tsx`.
- Card preview tabs and canvas: `packages/editor/src/components/CardTabs.tsx`, `packages/editor/src/components/CardPreview.tsx`.
- Card inspector tabs and field groups: `packages/editor/src/components/Inspector.tsx`.
- Menus, toolbar actions, shortcuts, panel toggles: `packages/editor/src/components/EditorToolbar.tsx`.
- Projects, Sets, Decks, Collections, Gallery, References workspaces: `packages/editor/src/components/WorkspaceView.tsx`.
- Shared browse/filter overlays: `packages/editor/src/components/filters/` and `packages/editor/src/components/overlays/OverlayShell.tsx`.
- Import/export dialogs: `packages/editor/src/components/TransferDialog.tsx`, import panels, and export panels.
- Print flow: `packages/editor/src/components/print/`.
- Help and support concepts: `packages/editor/src/components/HelpDialog.tsx`.
- UI text helpers: `packages/editor/src/domain/uiText.ts`.

## Standard Verification

Run at least:

```bash
node .tools/pnpm/bin/pnpm.cjs typecheck
node .tools/pnpm/bin/pnpm.cjs build
```

For UI changes, also run:

```bash
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor run test:ux-gate
```

If the changed surface is not covered by the smoke gate, do a targeted browser or Playwright QA pass and note the viewport, flow, and evidence.

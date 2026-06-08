# Forge Bench Phase 1 Parallel Prep

Date: 2026-06-06

Source direction: Claude Direction A, "Forge Bench", plus the generated North
Star image:
`/Users/kyle/.codex/generated_images/019e9d36-acb1-74b0-a2d9-2bcceac85d04/ig_06d5b6560a5c4dcd016a2430a35c248198b153486a359df9ec.png`

## Coordination Rules

Claude is expected to implement the Phase 1 visual spike. Codex should not edit
Claude-owned visual files during that pass unless explicitly asked to merge or
harden Claude's changes.

Likely Claude-owned files:

- `packages/editor/src/styles.css`
- `packages/editor/src/App.tsx`
- `packages/editor/src/components/SideRail.tsx`
- `packages/editor/src/components/Inspector.tsx`
- `packages/editor/src/components/CardList.tsx`
- `packages/editor/src/components/CardPreview.tsx`
- `packages/editor/src/components/FirstRunOrientation.tsx`
- `packages/editor/src/components/Icon.tsx`

Codex's parallel lane is documentation, QA scaffolding, inventory, and
post-Claude hardening prep.

## Phase 1 Scope

Phase 1 is the first real Forge Bench implementation pass, not a planning-only
stage. It should ship a meaningful design-system hardening slice:

- Add or refine a Forge Bench CSS token layer.
- Map Maker workspace and editor-shell selectors to tokens.
- Make the top chrome more compact and continuous.
- Make the side rail quieter and more subordinate.
- Make Maker list selection calmer.
- Make the preview canvas frame the card as the hero.
- Make inspector tabs, sections, labels, and controls denser.
- Make inputs/selects/textareas feel recessed into the panel.
- Reduce rounded web-card modules inside panes.
- Fix onboarding so populated sets do not show a full-canvas takeover.
- Normalize low-risk caret/icon oddities.

The pilot surface is the Maker workspace, but shared primitives may improve
nearby workspaces if they consume the same classes.

## Acceptance Criteria

- A populated Maker workspace opens into the editor, not a full-canvas onboarding
  takeover.
- The card preview is the brightest, highest-contrast object on the page.
- Chrome recedes into compact neutral editor surfaces.
- Pane separators carry the structure more than rounded cards or shadows.
- Inputs look embedded or recessed, not like bright web-form boxes.
- The side rail is compact, calm, and still understandable.
- Selected rows and tabs use a calm tint plus marker, not saturated blue blocks.
- The preview canvas has one restrained craft/glow moment and no gimmicky theme.
- Existing first-time support remains available through zero-state, strip,
  tooltips, help, or guided mode.
- The prior UX remediation is not regressed, especially accessibility,
  learnability, and status feedback.

## Visual QA Workflow

Launch command:

```bash
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor dev
```

The editor dev server is Vite-hosted on `127.0.0.1`; use the printed port.
Root alias:

```bash
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor dev
# or
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor run dev
```

Suggested screenshot output root:

```text
reports/visual-qa/forge-bench-phase1/<date-time>/
```

Target viewports:

- `1440x900`: primary desktop review.
- `1280x800`: laptop fold and inspector density review.
- `390x844`: narrow layout smoke check.

Minimum screenshots after Claude's pass:

- Maker workspace, populated set, first load.
- Maker workspace with a selected card and inspector visible.
- Maker workspace with card list row selection visible.
- Maker workspace narrow view with List/Preview/Inspector switching visible.
- Zero-card or empty-state Maker view if an empty set is available.
- Decks workspace smoke if shared rail/button/input selectors changed.
- Collections workspace smoke if shared table/row selectors changed.
- Dashboard smoke if global `button`, `input`, `select`, or surface selectors
  changed.

Visual QA checklist:

- No full-canvas onboarding takeover when cards exist.
- No horizontal overflow at `390x844`.
- Top chrome is not taller than necessary.
- App status is visible and not competing with content.
- The card preview is not double-rounded by shell CSS.
- The hero card uses the strongest shadow; shell modules do not.
- Focus rings remain visible and keyboard-safe.
- Menus, inspector tabs, and icon-only controls retain accessible names.

## Baseline Command Findings

The worktree is already heavily dirty. Claude-owned files are among the current
modified/untracked files, so post-Claude review must inspect the exact diff
before assuming ownership.

Root scripts from `package.json`:

```bash
node .tools/pnpm/bin/pnpm.cjs -r build
node .tools/pnpm/bin/pnpm.cjs -r typecheck
node .tools/pnpm/bin/pnpm.cjs -r lint
node .tools/pnpm/bin/pnpm.cjs -r test
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor run test:ux-gate
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor dev
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/forge run cli
```

Editor-local scripts from `packages/editor/package.json`:

```bash
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor run dev
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor run build
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor run typecheck
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor run lint
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor run test
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor run test:ux-gate
```

Do not treat a failed post-Claude check as solely Claude's regression until the
dirty baseline is understood.

## Risk List

- `styles.css` has global `button`, `input`, `select`, `textarea`,
  `.primary-button`, `.secondary-button`, and `.icon-button` rules. Changes can
  affect overlays, imports, dashboard, print, and create flows.
- Dashboard has its own token block, but still consumes global primitives in
  places. Global form/button changes need a dashboard smoke check.
- The status region is currently near the top of the shell. Moving it to a
  bottom status bar may require layout changes in `App.tsx`, not only CSS.
- Onboarding behavior depends on `showMakerOnboarding`, localStorage dismissal,
  active workspace, cards count, focused mode, browser mode, and dashboard mode.
- `body` uses `overflow: hidden` and a wide `min-width`; narrow viewport fixes
  can regress easily.
- Select and caret styling is mixed between native selects, text glyphs, and
  custom SVG icons.
- Shared section/card patterns appear across inspector, create overlays,
  workspace views, deck/collection screens, and dashboard widgets.

## Post-Claude Hardening Checklist

After Claude lands Phase 1:

- Review `git diff -- packages/editor/src/styles.css` for overbroad selectors.
- Review `git diff` for React changes to onboarding, status, rail, icons, and
  inspector wiring.
- Identify new literal colors, radii, heights, shadows, and transitions that
  should become tokens.
- Confirm tokens are named by semantic role, not by one screen.
- Remove one-off CSS if the same pattern can use a shared token or primitive.
- Check Maker, Decks, Collections, Sets, and Dashboard for shared-selector bleed.
- Verify populated-set onboarding gate and dismissal persistence.
- Verify zero-card/empty-state behavior if an empty set is available.
- Run editor typecheck and build.
- Run editor tests and `test:ux-gate` if the current baseline allows it.
- Capture visual QA screenshots at the target viewports.
- Create a Phase 2 punch list for extending Forge Bench beyond Maker.

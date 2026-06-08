# UX Consistency Phase Tracker

North Star: Homebrew Forge should feel like a premium local-first creative tool that follows familiar desktop/editor conventions without becoming a clone of another app.

## Phase 0: Audit And Convention Rules

Status: complete.

Evidence:
- UXHC H04 terminology finding stress-tested.
- App chrome audited across File/Edit/View/Tools, command toolbar, card preview, and layout overlay.
- Audit documented in `docs/55_ux_consistency_conventions_audit.md`.

Verification:
- Passed 2026-06-07: `node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor typecheck`
- Passed 2026-06-07: `node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor build`
- Passed 2026-06-07: `node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor run test:ux-gate`
- Passed 2026-06-07: `node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor exec node scripts/forge-ui-visual-qa.mjs --phase ux-consistency`
- Screenshot and contrast evidence: `output/playwright/forge-ui-phase-ux-consistency/qa-results.json`

## Phase 1: Main Editor Chrome

Status: complete.

Slices:
- Rename surface tools from overloaded preview/edit terms to Zoom, Artwork, Text, and Layout.
- Rename Tools submenu from Preview Tools to Card Tools.
- Shorten visual aid labels to Guides, Safe area, and Card grid.
- Add fast command-row tooltips and keyboard shortcut metadata.
- Rename command palette action to Open larger preview.

## Phase 2: Card Preview Affordances

Status: complete.

Slices:
- Use Open larger preview for preview action buttons.
- Keep the direct card-click zoom behavior under the Zoom tool.
- Clarify artwork mode labels and reset affordance.
- Make layout zone hitboxes selectable rather than implying unsupported dragging.

## Phase 3: App-Wide Follow-Up Backlog

Status: shipped current convention slice; remaining feature requests queued.

Completed slices:
- Standardized create overlay primary actions by object type instead of generic Create Draft.
- Standardized dry-run/proof/copy labels in import/export and collection workflows.

Slices:
- Section-level zoom/inspection.
- Direct manipulation for name/type-line position only after the layout data model is designed.
- Broader tooltip treatment outside the main command row.
- Overlay action-language cleanup after create/import/export flows stabilize.
- Optional command palette grouping pass for destructive versus non-destructive actions.

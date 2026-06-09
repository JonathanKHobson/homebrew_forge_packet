---
status: archived
lane: ui
type: tracker
archived: 2026-06-09
---
> **ARCHIVED 2026-06-09 (implemented-plans sweep)** — original path: `docs/52_editor_review_issue_catalog.md`
> Reason: implemented planning artifact, archived per Kyle's 2026-06-09 directive (all plans implemented; no live backlog).
> Index: `docs/cowork/02_repo_archive_manifest.md` + `docs/64_repo_cleanup_archive_index.md`.

# Editor Review Issue Catalog

🗄️ `[status: archived]` `[lane: ui]` `[type: tracker]`

Date: 2026-06-07

This catalog tracks the laptop review pass from Kyle's screenshots and spoken
notes. The goal is to keep core card editing trustworthy: the app must fit the
available window, the rendered card must show readable text, and card-surface
tools should use familiar editing conventions.

## Evidence

- Screenshot: `/Users/kyle/Desktop/Screenshot 2026-06-07 at 8.47.39 AM.png`
- Screenshot: `/var/folders/gp/kqjp5j9d04x35kk_0sc7pcj00000gn/T/TemporaryItems/NSIRD_screencaptureui_yJrX1p/Screenshot 2026-06-07 at 8.49.31 AM.png`
- Screenshot: `/var/folders/gp/kqjp5j9d04x35kk_0sc7pcj00000gn/T/TemporaryItems/NSIRD_screencaptureui_zqqvne/Screenshot 2026-06-07 at 9.00.00 AM.png`

## Bugs And Usability Issues

| ID | Type | Severity | Surface | Finding | Expected behavior | Initial disposition |
| --- | --- | --- | --- | --- | --- | --- |
| ER-001 | Bug | Critical | Maker shell | Fixed panel widths and toolbar controls can push the right inspector and project/work-mode context outside the visible laptop window. | Maker workspace must adapt to the current viewport with no horizontal cut-off; panels and toolbar controls compact before clipping. | Shipped: adaptive panel widths, laptop toolbar compaction, visual QA clipping scan. |
| ER-002 | Bug | Critical | Card renderer | Rules text auto-sizing is too conservative on cards with plenty of rules-box space, visible on Clockwork Relic and Hidden Orchard. | Auto rules text should use the largest readable font that fits the rules box. | Shipped: compact rules max increased and fitter uses finer steps. |
| ER-003 | Bug | Critical | Card renderer | Mixed text and mana-symbol lines collapse spacing, for example `Add {C}.` appears too tight. | Inline mana symbols should preserve surrounding spaces and never visually touch adjacent words. | Shipped: segmented SVG text preserves spaces and adds symbol gaps. |
| ER-004 | Usability | High | Toolbar and preview | Expand preview appears in too many locations, including a toolbar button that duplicates the preview header and View menu. | Keep expand in the preview space and View menu; keep the Preview tool, but remove the duplicate toolbar expand button. | Shipped: duplicate toolbar expand button removed. |
| ER-005 | Usability | High | Layout tool | Layout padding tool always presents rules padding; name and type-line zones cannot be selected or isolated. | Layout tool should let users select name, type line, or rules zones; controls/readout should appear only for the selected zone. | Shipped scoped V1: selectable zones and isolated readout; persistent positioning remains ER-007 backlog. |
| ER-006 | Feature request | Medium | Preview tool | Preview tool opens the whole card but does not zoom card sections independently. | Preview tool should use familiar magnifier behavior and eventually support section-level zoom. | Backlog as a renderer/lightbox slice. |
| ER-007 | Feature request | Medium | Text/layout editing | User wants direct drag positioning/manual overrides for name, type line, and body text, using Figma/Photoshop-like conventions. | Text zones should have explicit capabilities, handles, and saved manual overrides when schema support exists. | Backlog as a data-model and renderer slice. |
| ER-008 | Usability | Medium | Toolbar/tooltips | Native hover tooltips feel delayed and some labels/tool names are still app-specific rather than standard. | Tool affordances should use standard icons/names and fast accessible labels where custom tips are needed. | Backlog consistency pass; remove worst duplication now. |

## Non-Goals For This Pass

- No Tailwind/shadcn migration.
- No new backend service or remote asset dependency.
- No copyrighted Magic assets.
- No broad rewrite of App.tsx or the renderer.
- No hidden schema change for name/type positioning without CSV and validation planning.

## Verification Evidence

- Renderer regression: `node --import tsx --test tests/render.test.ts`
- Editor typecheck: `node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor typecheck`
- Editor build: `node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor build`
- UX gate: `node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor run test:ux-gate`
- Visual QA evidence: `output/playwright/forge-ui-phase-review-pass/`

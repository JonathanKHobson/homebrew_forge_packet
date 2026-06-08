# Editor Review Phase Tracker

Date: 2026-06-07

| Phase | Slice | Issues | Status | Owner surface | Verification |
| --- | --- | --- | --- | --- | --- |
| 0 | Catalog review findings and priorities | ER-001..ER-008 | Complete | `docs/52_*`, `docs/53_*`, `docs/54_*`, `docs/project-map.md` | Docs created and project map updated. |
| 1 | Responsive shell fit | ER-001 | Complete | `packages/editor/src/App.tsx`, `packages/editor/src/styles.css`, visual QA script | Editor typecheck/build, UX gate, laptop visual QA no horizontal overflow. |
| 2 | Renderer text readability | ER-002, ER-003 | Complete | `packages/forge/src/renderer/CardSvg.tsx`, renderer tests | Forge renderer tests plus editor preview visual QA. |
| 3 | Preview affordance cleanup | ER-004 | Complete | `packages/editor/src/components/EditorToolbar.tsx` | Toolbar no longer shows duplicate expand button; View menu and preview header still expand. |
| 4 | Layout tool zone selection | ER-005 | Complete | `packages/editor/src/components/CardPreview.tsx`, `packages/editor/src/styles.css` | Layout mode can select Name, Type Line, and Rules; only selected zone shows readout/handles. |
| 5 | Visual QA expansion and final consistency pass | ER-001..ER-008 | Complete | `packages/editor/scripts/forge-ui-visual-qa.mjs`, docs | Screenshot evidence under `output/playwright/forge-ui-phase-review-pass/`. |
| Backlog | Section zoom in Preview tool | ER-006 | Backlogged | `CardPreview`, `ImageLightbox`, renderer crop helpers | Needs section crop model and keyboard-accessible section picker. |
| Backlog | Persistent manual text-zone positioning | ER-007 | Backlogged | CSV schema, `CardDraft`, renderer layout options, inspector/layout controls | Needs schema migration plan and renderer fixtures for name/type/rules overrides. |
| Backlog | Standard convention naming/icon pass | ER-008 | Backlogged | Toolbar, menus, preview tools, custom tooltip layer | Needs component inventory and acceptance examples from common creator tools. |

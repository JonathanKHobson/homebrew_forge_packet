# UX Audit Issue Catalog

Source: `reports/ux-audit/homebrew-forge-full-uxhc-2026-06-05/`

Claude's UXHC audit found 22 issues across accessibility, orientation,
information architecture, dialog hierarchy, responsive behavior, error
prevention, help, and polish. This catalog is the source-of-truth remediation
list for the audit lane. Treat every row as a real product issue unless a fresh
reproduction proves it obsolete.

## Scope Rules

- Fix audit-backed issues before adding unrelated new features.
- Preserve Homebrew Forge's domain distinctions: Maker/Cards/Sets/Projects, Decks,
  Collections, Gallery, References, card, variant, frame, and layout.
- Keep source changes modular. Do not add large one-off UI blobs to `App.tsx` or
  `WorkspaceView.tsx` when a component/helper is the right home.
- Validate with `typecheck`, `build`, targeted tests, and browser visual QA for
  changed screens.

## Catalog

| ID | Pri | Sev | Area | Issue | Fix Recommendation | Primary Owners | Phase/Slice |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| HF-UX-001 | P1 | 3 | Accessibility | Menus, inspector tabs, and focused-layout exits lack accessible semantics. | Add tab roles/selection/controls, arrow-key tab handling, menu keyboard support or a documented disclosure pattern, and accessible labels for icon-only exits. | `EditorToolbar.tsx`, `Inspector.tsx`, `App.tsx`, focused layout controls | 1.1 |
| HF-UX-002 | P1 | 2 | Orientation | No first-run orientation or clear start point. | Add dismissible first-run welcome, purpose copy, and primary first action. | `App.tsx`, new orientation component, styles | 1.2 |
| HF-UX-003 | P1 | 2 | IA consistency | Right panel uses five naming patterns. | Standardize on an inspector/detail heading pattern across Maker, Decks, Collections, Sets, and Projects. | `WorkspaceView.tsx`, inspector/detail panel components | 1.4 |
| HF-UX-008 | P1 | 2 | Responsive/accessibility | Narrow viewport rail clips items; preview/inspector fall far below fold. | Add reachable rail behavior and narrow pane switching or compact layout for list/preview/inspector. | `SideRail.tsx`, `App.tsx`, `styles.css` | 1.3 |
| HF-UX-004 | P2 | 2 | UX writing | Singular counts render as plural, such as `1 sets`. | Add pluralization helper and apply to counts. | shared UI helper, workspace count strings | 2.1 |
| HF-UX-005 | P2 | 2 | Dialog hierarchy | Dialog action rows are flat and equal-weight. | Use one primary action, secondary actions, and tertiary/help links per dialog section. | `TransferDialog.tsx`, `ImportExportPanel.tsx`, `PrintDialog.tsx`, styles | 2.2 |
| HF-UX-006 | P2 | 2 | Print flow | Print labels are ambiguous and proof build can appear stuck. | Rename actions by outcome; add progress, retry, and error copy for print proof state. | `PrintDialog.tsx`, print API state handling | 2.3 |
| HF-UX-007 | P2 | 2 | Import/export IA | Import and Export default to different tabs and reuse rail labels as a second navigation. | Default to active workspace entity and label transfer tabs as transfer scope. | transfer dialog state, `EditorToolbar.tsx`, `ImportExportPanel.tsx` | 2.4 |
| HF-UX-009 | P2 | 2 | Error prevention | Delete Unsaved Draft destroys work without confirmation. | Add confirmation or make the action undoable; match tab-close protection. | `EditorToolbar.tsx`, `App.tsx`, confirmation overlay | 2.5 |
| HF-UX-010 | P2 | 2 | User control | Undo/Redo are visible but non-functional for edits. | Implement field undo/redo or hide/tooltip disabled controls honestly. | editor draft state, toolbar | 2.6 |
| HF-UX-011 | P2 | 2 | Form relevance | Create-card overlay shows planeswalker fields for creature defaults. | Gate stat/loyalty/ability fields by selected card type in create overlay and inspector. | `CreateCardOverlay.tsx`, `Inspector.tsx`, type helpers | 2.7 |
| HF-UX-012 | P2 | 2 | Settings/content | Settings exposes internal roadmap copy and hides Collections rail toggle there. | Replace with user-facing settings copy; surface Collections toggle in View > Panels too. | settings workspace, `EditorToolbar.tsx` | 2.8 |
| HF-UX-013 | P2 | 2 | Feedback consistency | Status messages move around across workspaces. | Promote status to app-shell-level region and use consistently. | `App.tsx`, workspace components, styles | 2.9 |
| HF-UX-014 | P2 | 2 | Help/documentation | No in-app explanation of Projects/Sets/Cards, Maker, Decks, Collections, Gallery, References, or variants. | Add Help > Concepts and brief workspace help/empty-state explainers. | `EditorToolbar.tsx`, Help/concepts component, workspace copy | 3.1 |
| HF-UX-017 | P2 | 2 | Density | Important Maker editor controls fall below the fold at common heights. | Compact/collapsible command bar and tune inspector spacing. | toolbar, inspector, styles | 3.2 |
| HF-UX-015 | P3 | 2 | Affordance | Static stat/KPI tiles look clickable. | Make tiles clearly static or provide drill-down interactions. | dashboard/deck/collection stat components | 3.3 |
| HF-UX-016 | P3 | 1 | Recognition | Window title does not reflect active workspace. | Set `document.title` from workspace, set, and mode. | `App.tsx` | 3.4 |
| HF-UX-018 | P3 | 1 | Orientation | Maker workspace lacks a title/purpose statement. | Add Maker header/purpose, aligned with first-run orientation. | Maker workspace header | 1.2 |
| HF-UX-019 | P3 | 1 | Validation | Create/import forms lack inline field-level validation guidance. | Add field errors and hints on create/import forms. | create overlays, import panels | 3.5 |
| HF-UX-020 | P3 | 1 | Engineering hygiene | Transient 400 Bad Request logged during navigation. | Reproduce and guard preview/render calls for incomplete drafts. | editor API calls, preview/render endpoints | 3.6 |
| HF-UX-021 | P3 | 2 | Support | No in-product support or feedback path. | Add Help menu feedback/support action and issue-report guidance. | Help menu, concepts component | 3.1 |
| HF-UX-022 | P3 | 1 | Recognition | Rail icons are visually similar. | Differentiate Sets, Projects, Gallery, and Collections icons or add stronger labels/tooltips. | `Icon.tsx`, `SideRail.tsx` | 3.7 |

## Cross-Cutting Recommendations

- Use one shared count/pluralization helper across workspace summaries.
- Prefer shared shell components for inspector headers, status feedback, and
  dialog action rows.
- Keep Help content short and task-oriented. It should clarify the object model,
  not become a documentation dump.
- Re-audit against the same source manifest after Wave 1 and after final polish.

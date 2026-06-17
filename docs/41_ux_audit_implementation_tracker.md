# UX Audit Implementation Tracker

Source audit: `reports/ux-audit/homebrew-forge-full-uxhc-2026-06-05/`

Status key: `backlog`, `in_progress`, `implemented`, `verified`, `deferred`.

| Slice | Issues | Status | Verification | Notes |
| --- | --- | --- | --- | --- |
| 0.1 Audit catalog docs | all | verified | Docs created and project map linked | `38`-`41` docs added. |
| 1.1 Accessible menus, tabs, exits | HF-UX-001 | verified | Typecheck; browser DOM role check; 1440 screenshot | Menubar roles/keyboard handling, inspector tab semantics, visible focused exit label. |
| 1.2 First-run and Maker orientation | HF-UX-002, HF-UX-018 | verified | Browser QA at 1292 and 390; zero-card mocked project QA | Onboarding now appears only on first run or when Maker has no rows; while active it suppresses the card list, inspector, collapsed strips, and narrow panel switcher. |
| 1.3 Narrow viewport reachability | HF-UX-008 | verified | Browser QA at 390x844 | Wrapped rail and List/Preview/Inspector narrow switcher; no horizontal overflow. |
| 1.4 Inspector/detail naming | HF-UX-003 | verified | Typecheck and desktop browser spot check | Right panel labels normalized to entity inspector language. |
| 2.1 Count text helper | HF-UX-004 | verified | Search and typecheck | `formatCount()` applied across major count labels. |
| 2.2 Dialog action hierarchy | HF-UX-005 | verified | Browser Import/Print QA | Commit actions promoted; CSV/template utilities demoted to tertiary links. |
| 2.3 Print outcome clarity | HF-UX-006 | verified | Browser Print QA | Print/export labels now identify proof download vs browser print. |
| 2.4 Import/export defaults | HF-UX-007 | verified | Browser Import QA | Transfer scope defaults to current workspace and has a distinct scope label. |
| 2.5 Draft delete protection | HF-UX-009 | verified | Typecheck and overlay wiring | Delete Unsaved Draft now opens a confirmation dialog. |
| 2.6 Undo/redo and revert recovery | HF-UX-010 | verified | Typecheck; Playwright edit recovery QA | Undo/redo now work per selected draft, keyboard shortcuts are wired, and Revert to Last Saved restores the selected saved variant without trapping unsaved duplicate variants. |
| 2.7 Type-relevant create fields | HF-UX-011 | verified | Browser Create Card QA | P/T and loyalty/abilities are gated by card type. |
| 2.8 Settings and panels copy | HF-UX-012 | verified | Typecheck and toolbar/settings wiring | Settings copy is user-facing; Collections toggle also lives in View > Panels. |
| 2.9 Consistent status feedback | HF-UX-013 | verified | Browser QA | Shared app status strip added below runtime banner. |
| 3.1 Concepts and support help | HF-UX-014, HF-UX-021 | verified | Browser Help QA | Help dialog includes concepts and a bug-report template action. |
| 3.2 Core editor density | HF-UX-017 | verified | Browser QA at 390x844 | Narrow switcher/status relocation reduces stacked Maker editor pressure; onboarding is no longer an always-on preview-column intro. |
| 3.3 Static tile affordance | HF-UX-015 | verified | Typecheck and CSS review | Passive dashboard KPI/chart hover motion removed. |
| 3.4 Dynamic document title | HF-UX-016 | verified | Browser QA | Title now reflects workspace and active set. |
| 3.5 Inline validation | HF-UX-019 | verified | Browser Import/Create QA | Shared field errors added for New Card and major import forms. |
| 4.1 Console 400 reproduction | HF-UX-020 | verified | Browser console check during desktop/narrow/dialog QA | Empty deck/collection id calls are guarded before request; no browser error logs observed. |
| 4.2 Rail icon differentiation | HF-UX-022 | verified | Browser narrow rail screenshot | Deck and Collection glyphs are now more distinct. |
| 4.3 UXHC compare audit | all | deferred | Compare against baseline run | Full UXHC re-audit not run in this implementation pass; browser QA and tests passed. |

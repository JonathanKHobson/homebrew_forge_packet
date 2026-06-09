---
status: archived
lane: research
type: backlog
archived: 2026-06-09
---
> **ARCHIVED 2026-06-09 (implemented-plans sweep)** — original path: `docs/58_external_research_next_version_backlog.md`
> Reason: implemented planning artifact, archived per Kyle's 2026-06-09 directive (all plans implemented; no live backlog).
> Index: `docs/cowork/02_repo_archive_manifest.md` + `docs/64_repo_cleanup_archive_index.md`.

# External Research Next-Version Backlog

🗄️ `[status: archived]` `[lane: research]` `[type: backlog]`

Status: Claude's resumed advanced UXHC audit is merged. The active implementation lane is the UXHC remediation sequence for HF-201 through HF-211 before returning to broader external-research/NVR future features.

Sources:
- `external research/01_product_landscape_matrix.md`
- `external research/02_findings_gaps_recommendations.md`
- `external research/03_research_bug_report_and_risk.md`
- `external research/04_swot_and_positioning.md`
- `reports/ux-audit/advanced-ux-bug-report.md`
- `reports/ux-audit/ux-audit-recommendations.md`
- `reports/ux-audit/research-synthesis.md`
- `reports/ux-audit/focus-group-summary.md`
- `reports/ux-audit/human-checkpoint-notes.md`

## North Star Filter

Homebrew Forge should become a local-first production studio for custom Magic-style cards, sets, decks, collection/reference workflows, and private playtest exports. It should not try to beat every specialized product in its own lane.

Defend:
- Local source-of-truth and versionable CSV/YAML/JSON data.
- Explicit import/export and review states instead of hidden sync.
- Asset/legal safety as visible product state.
- Clear object boundaries: Projects group, Sets own authored cards, Maker authors cards, Decks export lists, Collections isolate inventory/list rows, Gallery owns assets, References own rules/help data.
- Desktop creative-tool conventions that reduce relearning.

Avoid:
- Fake disabled features or buttons to nowhere.
- Native scanner, marketplace, live-pricing, social-gallery, or SaaS claims before the local pipeline is stable.
- Official-frame shortcuts, scraping, hidden canonical databases, or counterfeit-like output.
- UI chrome that competes with the work.

## Immediate Audit-Unblock Intake

| ID | Issue | Status | Evidence | Follow-up |
| --- | --- | --- | --- | --- |
| P0-AUDIT-001 | Startup showed `Loading DEMO... / No project loaded` long enough for Claude to classify data load as blocked. | Fixed in current slice | Single startup project request verified; status now says `Project loading` while loading and renders 10 cards after load. | Claude should rerun populated audit and update if any true data-drop remains. |
| P0-AUDIT-002 | Sets workspace crashed on null `project.drafts`. | Fixed in current slice | Explicit `project && selectedSet` guards plus rail-tour UX gate. | Keep rail-tour smoke as recurrence coverage. |
| P0-AUDIT-003 | Silent load errors lacked retry. | Partial | Visible app-level load failure panel with Retry was added for initial load failures. | Add API-kill/failure fixture if Claude still observes silent terminal loaders. |

## Claude UXHC Resumed Findings Intake

Source: `reports/ux-audit/advanced-ux-bug-report.md`, `reports/ux-audit/ux-audit-prioritization-matrix.md`, `reports/ux-audit/uxhc-resumed-report.html`, and populated evidence under `reports/ux-audit/screens-populated/`.

Overall UXHC score: B- (69.7%). Strongest heuristic: H04 Consistency A (86.9%). Weakest heuristic: H11 Accessibility C- (50%). Top finding: H08 page clutter competing with primary actions.

| ID | Finding | Priority | Status | Evidence | Implementation slice |
| --- | --- | --- | --- | --- | --- |
| HF-201 | Slow project/workspace loads leave `Project loading` visible long enough to feel broken. | P1 | verified | Claude measured ~6.5s to populated Maker rows; workspace data 1-4s. | Added explicit initial-load pending skeleton and retained retry failure path; deeper performance profiling remains NVR follow-up. |
| HF-202 | Maker preview can sit on `Rendering preview` without timeout, error, or retry. | P1 | verified | `screens-populated/hero-maker-1440.png`. | Added preview timeout/error/retry using existing `/api/preview` flow. |
| HF-203 | Decks shows `1 of 3 decks` because project scope hides global decks without chip/reset. | P1 | verified | `/api/decks` returns 3; UI shows 1. | Decks defaults to all projects; optional project filter shows chip, hidden count, and one-click `Show all`; UX gate asserts `3 of 3 decks`. |
| HF-204 | Page clutter/over-density competes with primary tasks. | P1 | verified | Collections stat tiles, repeated Reference labels, Deck metadata stack. | Collapsed collection-family stats, removed repeated Reference labels, and moved deck commander/cover metadata to inspector. |
| HF-205 | Deck builder lacks live deck stats. | P1 | verified | Deck tiles are metadata, not curve/color/type/availability. | Added compact active-variant stats for curve, color, type, sections, unresolved refs, duplicate checks, and local owned availability. |
| HF-206 | Narrow Decks clips key labels at 390px. | P2 | verified | Populated scan reports Decks clip count around 10. | Deck board labels wrap/stack at narrow widths; UXHC visual QA reports 0 clipped elements on dark-mobile-decks. |
| HF-207 | Accessibility surface gaps; H11 is the weakest heuristic. | P1 | verified | New Decks/Collections/Binders/Lists keyboard/labels/contrast not fully verified. | Changed controls keep labels/roles and UX/visual QA passed contrast/focusable surface smoke; deeper keyboard-only conformance remains NVR-004. |
| HF-208 | No concept help for the expanded object model. | P2 | verified | Rail surfaces overlap conceptually: Maker/Sets/Decks/Collections/Binders/Lists/Gallery/References. | Expanded Help concepts for the full object model without persistent onboarding clutter. |
| HF-209 | Static stat tiles look clickable. | P2 | verified | Collection/Deck stat tiles use card-like affordance. | Static summaries are compact non-button surfaces; drill-down behavior remains deferred until filtering semantics are explicit. |
| HF-210 | Unexplained jargon: Binders, Lists, build, bracket, variant. | P3 | verified | Claude H14 finding. | Help concepts now define Binders, Lists, build, bracket, and variant. |
| HF-211 | Document title does not reflect current workspace/selection enough. | P3 | verified | Claude H6 finding. | Document title includes active workspace and selected Maker card; workspace object callbacks can deepen Deck/Collection selection titles later. |

## Backlog

Priority meanings:
- `P0`: blocks trust, release, or audit completion.
- `P1`: next shippable trust builder.
- `P2`: strong usability/productivity improvement.
- `P3`: strategic bet; do not start until foundations are stable.

Status meanings:
- `done`: implemented and verified.
- `validate`: likely partially implemented, needs Claude/in-app confirmation.
- `planned`: not started.
- `defer`: intentionally out of the next implementation lane.

| ID | Backlog item | Priority | Status | Research driver | Product risk addressed | First slice |
| --- | --- | --- | --- | --- | --- | --- |
| NVR-001 | Shared create overlay contract for every plus button. | P0 | validate | HBF-UX-001/002; overlay plan | Accidental objects and inconsistent creation mental models. | Audit each plus button, normalize action copy/states, add UX gate coverage. |
| NVR-002 | Import/export hubs with honest staged states. | P0 | validate | HBF-UX-003; external research quick wins | Overpromising unsupported flows. | Add `Available now`, `Planned`, `Requires review`, `Unsupported` states and disabled explanations. |
| NVR-003 | Local file/source-of-truth conflict indicators. | P0 | planned | HBF-UX-004; local-editor spec | Data loss or silent overwrite in a local-first app. | Show file path, last saved, dirty state, external-change warning; design conflict prompt. |
| NVR-004 | Overlay keyboard/focus/escape/focus-return test matrix. | P0 | validate | HBF-UX-009; UX Quality Gate | Accessibility failures in overlay-heavy workflows. | Add per-overlay keyboard smoke coverage before expanding dialogs. |
| NVR-005 | Initial load and workspace data error/retry states. | P0 | done | BUG-001/004 | Silent terminal spinners and audit-blocking ambiguity. | Initial load now has explicit pending, error, and retry states; workspace-level loaders stay in the Browse Toolbar hardening lane if new gaps appear. |
| NVR-006 | One Browse Toolbar contract across list surfaces. | P1 | validate | HBF-UX-005; Google Sheets/Deckbox | Users relearn search/filter/sort in every workspace. | Inventory all list surfaces and enforce search, sort, filters, chips, reset, count, empty state. |
| NVR-007 | Saved filter views. | P2 | planned | Google Sheets filter-view pattern | Repeated deck/collection/card tasks require rework. | Local settings-backed saved views for Cards, Collections, References first. |
| NVR-008 | Collection import review queue. | P1 | planned | HBF-UX-006; Deckbox/ManaBox/TCGplayer | Wrong print/finish/condition/quantity corrupts collection trust. | Needs-review queue with confidence, variant selector, and unresolved filter. |
| NVR-009 | Collection bulk correction. | P1 | planned | Collection Manager gaps | Import cleanup is too slow row by row. | Bulk quantity, finish, condition, language, location, owner, tags where safe. |
| NVR-010 | Deck intelligence v1. | P1 | done | HBF-UX-007; Moxfield/Archidekt/TappedOut | Decks feel shallow or misleading without basic signals. | Live Decks stats now cover counts, sections, unresolved refs, duplicate/singleton warnings, curve, colors, and type mix. |
| NVR-011 | Collection availability in Decks. | P2 | validate | Deckbox/ManaBox benchmark | Deck builders cannot see missing/owned cards. | Decks now shows local owned availability summary; row-level availability badges remain the next refinement. |
| NVR-012 | Frame/layout support badges. | P1 | planned | HBF-UX-008 | Registered-but-unsupported frames look broken. | Mark Supported, Experimental, Registered only, Missing asset pack, Not in this build. |
| NVR-013 | Asset-pack health panel. | P2 | planned | Asset/legal safety SWOT | Safe asset constraints read as missing functionality. | Installed packs, role coverage, missing fonts/symbols, license/checksum/source status. |
| NVR-014 | Validation issue drawer by severity. | P1 | planned | HBF-UX-017; validation spec | Linting feels noisy or punitive. | Group errors, warnings, notes, waived; include fix direction and waiver reason. |
| NVR-015 | Reference syntax discoverability. | P2 | planned | HBF-UX-010 | Power syntax remains invisible. | Inline helper for `@`, `#`, `:`, `!`, braced symbols, `~`, italics, forced lines. |
| NVR-016 | Object-boundary onboarding/source badges. | P1 | planned | HBF-UX-018/012 | Users blur collection rows, authored cards, and deck entries. | Empty-state/source badge language for every workspace and copy action. |
| NVR-017 | First-run lane chooser. | P2 | planned | Research quick wins; onboarding gap | New users do not know whether to make cards, build decks, import collections, or manage assets. | Full-screen first-run only, with demo/load choices and no persistent strip. |
| NVR-018 | Print/export readiness labels. | P1 | planned | HBF-UX-013 | Users overtrust prototype output for print-shop use. | Label Prototype, Print-preflight, Print-shop-ready unavailable; show resolution/bleed/crop checks. |
| NVR-019 | Static share/playtest bundle. | P2 | planned | HBF-UX-014 | Public sharing is deferred but handoff still matters. | Local HTML/ZIP bundle with manifest, disclaimers, cards, decklists, import instructions. |
| NVR-020 | Adapter recipes for scanner/deck/playtest tools. | P2 | planned | Adapter strategy | HBF should interoperate instead of cloning incumbents. | Document/test generic CSV, scanner CSV, Cockatrice, Deckbox-like CSV; keep live APIs out. |
| NVR-021 | Local project package format. | P3 | planned | Strategic differentiation | Moving a full local project across machines/playtesters is manual. | Versioned manifest for sets, decks, collections, references, assets, validation report. |
| NVR-022 | Print-preflight mode. | P3 | planned | Print production benchmark | Print workflows lack confidence and safety. | Bleed, crop, safe zone, resolution, calibration, watermark profiles. |
| NVR-023 | Reference-powered design assistant. | P3 | planned | Unique advantage opportunity | Validation can become helpful design guidance. | Explainable suggestions with source labels and waiver paths; no unsourced AI judgment. |
| NVR-024 | Live pricing/trading policy. | P3 | defer | Collector/trader benchmark | Scope can drift into marketplace/pricing. | Decide: excluded, adapter-only, or strategic before any implementation. |

## Priority Matrix

| Priority | Items | Why this level |
| --- | --- | --- |
| P0 | P0-AUDIT-001, P0-AUDIT-002, P0-AUDIT-003 | Historical audit blockers; keep regression coverage active. |
| P1 | HF-203, HF-204, HF-202, HF-201, HF-205, HF-207, NVR-001, NVR-002, NVR-003, NVR-004, NVR-005, NVR-006, NVR-010 | Current task-completion, trust, and accessibility lane. |
| P2 | HF-206, HF-208, HF-209, NVR-007, NVR-008, NVR-009, NVR-011, NVR-012, NVR-013, NVR-014, NVR-015, NVR-016, NVR-017, NVR-018, NVR-019, NVR-020 | Strong usability/productivity work after P1 is stable. |
| P3 | HF-210, HF-211, NVR-021, NVR-022, NVR-023, NVR-024 | Polish, strategic bets, or policy decisions after the current UXHC remediation lane. |

## Claude Audit Merge Gate

Claude's resumed UXHC artifacts are merged. Recurrence rule:
1. If a later Claude or UXHC pass finds a duplicate, add evidence to the existing HF/NVR item instead of creating a parallel row.
2. Re-score only with evidence: severity, persona impact, repro, screenshot/video, viewport, and affected workflow.
3. Do not start broad NVR P2/P3 future features until HF-201 through HF-211 are implemented or explicitly blocked with evidence.
4. Keep `docs/59_next_version_phase_roadmap.md` and `docs/47_forge_ui_phase_tracker.md` synchronized with active implementation status.

## Open Validation Questions

- Which persona becomes the first complete next-version golden path: Deck Builder, Card Maker, or Collection Manager?
- Which deck format profile gets warnings first: Commander, 60-card casual, cube/playtest, or custom-only?
- Which scanner CSVs become official fixtures first?
- What visual fidelity threshold is enough for a beta where legal asset safety remains visible?
- Is static share/playtest export enough for now, or is hosted sharing a future product commitment?

---
status: active
lane: docs
type: reference
---
# Repo Cleanup And Archive Index

🟢 `[status: active]` `[lane: docs]` `[type: reference]`

Status: Phase 0 triage document. This is not a deletion list.

Rule: do not delete old docs or generated-looking files blindly. Archive only after a doc is classified as superseded and cross-links are updated.

## Dirty Tree Triage From Original Web Lane

Captured from `/Users/kyle/Documents/My Games/Magic The Gathering/homebrew_forge_packet` before desktop implementation.

| Bucket | Paths | Action |
|---|---|---|
| User data/content | `collections/*`, `decks/signs-of-assassins/*`, `sets/library.json` | Preserve. Treat as user/app data, not cleanup noise. |
| UX/source work | `packages/editor/src/*`, editor styles, visual QA, editor tests | Preserve in web lane; merge deliberately only after review. |
| Official-card work | `packages/forge/src/officialCards/*`, official-card tests | Preserve in web lane; merge only if runtime work needs it. |
| Launcher work | `scripts/launch-homebrew-forge-app.sh`, install shortcut, health hook | Preserve as fallback until desktop green-pass cutover. |
| Planning docs | docs 58-60, shared-delivery plan, research packet, external research | Move/copy into migration lane and keep visible. |
| Generated/system noise | `.DS_Store`, logs, build output, `node_modules`, package `dist` | Exclude from backups where possible; remove from tracked status only if tracked. |

## Active Docs To Keep Visible

> **2026-06-09 note:** the list below predates the implemented-plans sweep. Docs 58, 59, 60, 62, 63, 66 and the superpowers plans listed here are now archived under `docs/archive/2026-06-implemented-plans/` per Kyle's directive (all plans implemented). The current live surface is defined by `docs/README.md`.

- `AGENTS.md`
- `docs/project-map.md`
- `docs/45_forge_ui_north_star.md`
- `docs/47_forge_ui_phase_tracker.md`
- `docs/58_external_research_next_version_backlog.md`
- `docs/59_next_version_phase_roadmap.md`
- `docs/60_desktop_delivery_tooling_prep.md`
- `docs/61_runtime_service_route_inventory.md`
- `docs/62_shared_desktop_delivery_final_roadmap.md`
- `docs/63_shared_desktop_delivery_phase_tracker.md`
- `docs/64_repo_cleanup_archive_index.md`
- `docs/65_runtime_parity_test_matrix.md`
- `docs/66_desktop_cutover_checklist.md`
- `docs/superpowers/plans/2026-06-08-shared-delivery-modes.md`
- `docs/superpowers/plans/homebrew_forge_desktop_delivery_research_packet/`

## Archive Candidates

These candidates can be moved later to `docs/archive/2026-06-desktop-prep/` only after references are checked.

| Candidate | Reason | Status |
|---|---|---|
| Older one-off implementation roadmaps whose work is fully represented in current trackers | Reduce planning clutter | Not moved |
| Superseded desktop draft notes after final roadmap is committed | Avoid competing source-of-truth docs | Not moved |
| Completed UX phase slices with no active checklist items | Keep project map shorter | Not moved |

## Planning Doc Lifecycle (standing workflow, 2026-06-09)

All future planning artifacts follow this loop so the live surface never re-accumulates clutter:

1. **Create** new plans/roadmaps/matrices/backlogs/trackers in `docs/plans/` named `YYYY-MM-DD-topic.md`, with YAML frontmatter (`status: active`, `lane`, `type`) and the emoji tag line.
2. **Work** the plan from there. `docs/` top level stays specs/standards/references/navigation only — never park planning docs there.
3. **Retire** when implemented: move to `docs/archive/<YYYY-MM>-implemented-plans/`, flip frontmatter to `status: archived`, prepend the ARCHIVED redirect header, add a ledger row here and in `docs/cowork/02_repo_archive_manifest.md`.
4. **Never delete.** Restores follow `docs/cowork/02_repo_archive_manifest.md#how-to-restore`.

Finder color legend (applied as real macOS tags): 🟢 green = live/work-here · 🟠 orange = pinned, do not move · 🔵 blue = app code/infrastructure · 🟣 purple = user data + source libraries · 🟡 yellow = action needed · ⚪ gray = archive/backups/generated.

## Archive Procedure

1. Search references with `rg "<doc-name>" docs AGENTS.md skills packages scripts`.
2. If referenced, update the pointer to the active roadmap or archive index.
3. Move the doc into `docs/archive/<date-topic>/`.
4. Add an entry to the archive folder index with original path, new path, and reason.
5. Run docs grep again to confirm no broken planning pointers.

## Current Decision

No archive moves happen before runtime-service Phase 1. The immediate cleanup is classification, not deletion.

## Moves Performed (2026-06-09 co-work organizing pass)

Precondition satisfied: runtime-service extraction and desktop cutover are complete (`docs/63_shared_desktop_delivery_phase_tracker.md`, `docs/66_desktop_cutover_checklist.md` macOS approved), so the Phase 1 gate above no longer blocks archive moves.

| Old path | New path | Reason |
|---|---|---|
| `docs/43_forge_bench_phase1_parallel_prep.md` | `docs/archive/2026-06-forge-bench-prep/43_forge_bench_phase1_parallel_prep.md` | One-off Phase 1 coordination doc; phases 0–13 verified in `docs/47_forge_ui_phase_tracker.md`; zero inbound references (verified by grep 2026-06-09) |
| `docs/44_forge_bench_styling_risk_inventory.md` | `docs/archive/2026-06-forge-bench-prep/44_forge_bench_styling_risk_inventory.md` | Read-only pre-Phase-1 CSS snapshot, superseded by shipped Forge UI migration; zero inbound references (verified by grep 2026-06-09) |
| `docs/20_commander_token_print_manifest.md` | `docs/archive/2026-06-packet-era/20_commander_token_print_manifest.md` | One-off print manifest, aids delivered; project-map pointer updated before move |
| `prompts/codex_first_task_prompt.md` | `docs/archive/2026-06-packet-era/codex_first_task_prompt.md` | Era Codex prompt, work shipped; README listing annotated |
| `prompts/codex_phase_prompts.md` | `docs/archive/2026-06-packet-era/codex_phase_prompts.md` | Era Codex prompt, work shipped; README listing annotated |
| `prompts/codex_asset_pack_prompt.md` | `docs/archive/2026-06-packet-era/codex_asset_pack_prompt.md` | Era Codex prompt, work shipped; README listing annotated |
| `prompts/codex_importer_prompt.md` | `docs/archive/2026-06-packet-era/codex_importer_prompt.md` | Era Codex prompt, work shipped; README listing annotated |

Each archived file carries an `ARCHIVED` redirect header pointing back here. The full machine-readable manifest lives in `docs/cowork/02_repo_archive_manifest.md`.

### 2026-06-09 implemented-plans sweep (Kyle directive: all plans implemented, no live backlog)

| Old path | New path | Reason |
|---|---|---|
| `docs/00_decision_summary.md` | `docs/archive/2026-06-implemented-plans/00_decision_summary.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/01_research_summary.md` | `docs/archive/2026-06-implemented-plans/01_research_summary.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/05_asset_source_matrix.md` | `docs/archive/2026-06-implemented-plans/05_asset_source_matrix.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/17_implementation_roadmap.md` | `docs/archive/2026-06-implemented-plans/17_implementation_roadmap.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/18_repo_issue_backlog.md` | `docs/archive/2026-06-implemented-plans/18_repo_issue_backlog.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/21_create_import_export_overlay_plan.md` | `docs/archive/2026-06-implemented-plans/21_create_import_export_overlay_plan.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/22_create_import_export_priority_matrix.md` | `docs/archive/2026-06-implemented-plans/22_create_import_export_priority_matrix.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/23_reference_sync_rules_update_plan.md` | `docs/archive/2026-06-implemented-plans/23_reference_sync_rules_update_plan.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/24_browse_filter_overlay_plan.md` | `docs/archive/2026-06-implemented-plans/24_browse_filter_overlay_plan.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/26_card_variant_lifecycle_plan.md` | `docs/archive/2026-06-implemented-plans/26_card_variant_lifecycle_plan.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/27_import_export_full_app_polish_plan.md` | `docs/archive/2026-06-implemented-plans/27_import_export_full_app_polish_plan.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/28_collection_deck_workspace_polish_plan.md` | `docs/archive/2026-06-implemented-plans/28_collection_deck_workspace_polish_plan.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/29_collection_deck_workspace_priority_matrix.md` | `docs/archive/2026-06-implemented-plans/29_collection_deck_workspace_priority_matrix.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/30_deck_metadata_format_upgrade_plan.md` | `docs/archive/2026-06-implemented-plans/30_deck_metadata_format_upgrade_plan.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/31_deck_stats_research_notes.md` | `docs/archive/2026-06-implemented-plans/31_deck_stats_research_notes.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/32_card_dashboard_research_plan.md` | `docs/archive/2026-06-implemented-plans/32_card_dashboard_research_plan.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/33_card_dashboard_priority_matrix.md` | `docs/archive/2026-06-implemented-plans/33_card_dashboard_priority_matrix.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/34_work_modes_research.md` | `docs/archive/2026-06-implemented-plans/34_work_modes_research.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/36_work_modes_priority_matrix.md` | `docs/archive/2026-06-implemented-plans/36_work_modes_priority_matrix.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/37_print_export_research_and_roadmap.md` | `docs/archive/2026-06-implemented-plans/37_print_export_research_and_roadmap.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/46_forge_ui_stack_research.md` | `docs/archive/2026-06-implemented-plans/46_forge_ui_stack_research.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/49_list_controls_focus_layout_backlog.md` | `docs/archive/2026-06-implemented-plans/49_list_controls_focus_layout_backlog.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/50_forge_ui_tailwind_shadcn_gate.md` | `docs/archive/2026-06-implemented-plans/50_forge_ui_tailwind_shadcn_gate.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/52_editor_review_issue_catalog.md` | `docs/archive/2026-06-implemented-plans/52_editor_review_issue_catalog.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/53_editor_review_priority_matrix.md` | `docs/archive/2026-06-implemented-plans/53_editor_review_priority_matrix.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/54_editor_review_phase_tracker.md` | `docs/archive/2026-06-implemented-plans/54_editor_review_phase_tracker.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/55_ux_consistency_conventions_audit.md` | `docs/archive/2026-06-implemented-plans/55_ux_consistency_conventions_audit.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/56_ux_consistency_phase_tracker.md` | `docs/archive/2026-06-implemented-plans/56_ux_consistency_phase_tracker.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/57_collections_manager_v1_5_plan.md` | `docs/archive/2026-06-implemented-plans/57_collections_manager_v1_5_plan.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/58_external_research_next_version_backlog.md` | `docs/archive/2026-06-implemented-plans/58_external_research_next_version_backlog.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/59_next_version_phase_roadmap.md` | `docs/archive/2026-06-implemented-plans/59_next_version_phase_roadmap.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/60_desktop_delivery_tooling_prep.md` | `docs/archive/2026-06-implemented-plans/60_desktop_delivery_tooling_prep.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/62_shared_desktop_delivery_final_roadmap.md` | `docs/archive/2026-06-implemented-plans/62_shared_desktop_delivery_final_roadmap.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/63_shared_desktop_delivery_phase_tracker.md` | `docs/archive/2026-06-implemented-plans/63_shared_desktop_delivery_phase_tracker.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/66_desktop_cutover_checklist.md` | `docs/archive/2026-06-implemented-plans/66_desktop_cutover_checklist.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/69_deck_builder_export_preview_repair_plan.md` | `docs/archive/2026-06-implemented-plans/69_deck_builder_export_preview_repair_plan.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/70_usability_trust_standards_roadmap.md` | `docs/archive/2026-06-implemented-plans/70_usability_trust_standards_roadmap.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/71_usability_trust_standards_backlog.md` | `docs/archive/2026-06-implemented-plans/71_usability_trust_standards_backlog.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/frame-support-roadmap.md` | `docs/archive/2026-06-implemented-plans/frame-support-roadmap.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/external_research/01_product_landscape_matrix.md` | `docs/archive/2026-06-implemented-plans/external_research/01_product_landscape_matrix.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/external_research/02_findings_gaps_recommendations.md` | `docs/archive/2026-06-implemented-plans/external_research/02_findings_gaps_recommendations.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/external_research/03_research_bug_report_and_risk.md` | `docs/archive/2026-06-implemented-plans/external_research/03_research_bug_report_and_risk.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/external_research/04_swot_and_positioning.md` | `docs/archive/2026-06-implemented-plans/external_research/04_swot_and_positioning.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/external_research/README.md` | `docs/archive/2026-06-implemented-plans/external_research/README.md` | implemented planning artifact (2026-06-09 directive) |
| `external research/01_product_landscape_matrix.md` | `docs/archive/2026-06-implemented-plans/external-research-legacy/01_product_landscape_matrix.md` | implemented planning artifact (2026-06-09 directive) |
| `external research/02_findings_gaps_recommendations.md` | `docs/archive/2026-06-implemented-plans/external-research-legacy/02_findings_gaps_recommendations.md` | implemented planning artifact (2026-06-09 directive) |
| `external research/03_research_bug_report_and_risk.md` | `docs/archive/2026-06-implemented-plans/external-research-legacy/03_research_bug_report_and_risk.md` | implemented planning artifact (2026-06-09 directive) |
| `external research/04_swot_and_positioning.md` | `docs/archive/2026-06-implemented-plans/external-research-legacy/04_swot_and_positioning.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/superpowers/plans/2026-06-05-work-modes-v1.md` | `docs/archive/2026-06-implemented-plans/superpowers-plans/2026-06-05-work-modes-v1.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/superpowers/plans/2026-06-08-shared-delivery-modes.md` | `docs/archive/2026-06-implemented-plans/superpowers-plans/2026-06-08-shared-delivery-modes.md` | implemented planning artifact (2026-06-09 directive) |
| `docs/superpowers/plans/homebrew_forge_desktop_delivery_research_packet/` (9 files) | `docs/archive/2026-06-implemented-plans/superpowers-plans/homebrew_forge_desktop_delivery_research_packet/` | completed research packet (2026-06-09 directive) |

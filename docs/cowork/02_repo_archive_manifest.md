---
status: active
lane: docs
type: index
---
# Repo Archive Manifest (Co-Work)

🟢 `[status: active]` `[lane: docs]` `[type: index]`

Generated: 2026-06-09 | Status: active ledger (append-only)
When to use this doc: you need to find an archived doc, verify why it moved, or perform a new archive move.
Who should read this: agents before moving/deleting any doc; humans auditing cleanup history.

Policy: archiving is never deletion. Every move requires: (1) inbound-reference grep, (2) reference updates, (3) move to `docs/archive/<date-topic>/`, (4) `ARCHIVED` redirect header in the moved file, (5) an entry here and in `docs/64_repo_cleanup_archive_index.md`, (6) re-grep to confirm no broken pointers.

## moves-performed

### 2026-06-09 co-work organizing pass

Gate check: `docs/64` required runtime-service Phase 1 before moves; phases 0–6 of the delivery tracker are done and the macOS cutover is approved (`docs/63`, `docs/66`), so the gate is satisfied.

| # | Old path | New path | Reason | Safety evidence |
|---|---|---|---|---|
| 1 | `docs/43_forge_bench_phase1_parallel_prep.md` | `docs/archive/2026-06-forge-bench-prep/43_forge_bench_phase1_parallel_prep.md` | One-off coordination doc for Forge Bench Phase 1; work verified complete (`docs/47` phases 0–13) | Zero inbound references (grep across docs, AGENTS.md, README, skills, scripts, prompts, packages, .claude, .codex on 2026-06-09); redirect header added |
| 2 | `docs/44_forge_bench_styling_risk_inventory.md` | `docs/archive/2026-06-forge-bench-prep/44_forge_bench_styling_risk_inventory.md` | Read-only pre-migration CSS snapshot, superseded by shipped Forge UI migration | Zero inbound references (same grep); redirect header added |

### 2026-06-09 pass 4 (visible-cleanup continuation, per Kyle's instruction)

| # | Old path | New path | Reason | Safety evidence |
|---|---|---|---|---|
| 3 | `docs/20_commander_token_print_manifest.md` | `docs/archive/2026-06-packet-era/20_commander_token_print_manifest.md` | One-off Commander token/tracker print manifest; aids delivered; future print work lives in docs/37 | Single live pointer (project-map) updated before move; redirect header + 🗄️ tag; re-grep clean |
| 4 | `prompts/codex_first_task_prompt.md` | `docs/archive/2026-06-packet-era/codex_first_task_prompt.md` | Era prompt; first vertical slice shipped long ago | Only README/PACKET_MANIFEST era listings referenced it; README annotated; manifest kept as historical record; re-grep clean |
| 5 | `prompts/codex_phase_prompts.md` | `docs/archive/2026-06-packet-era/codex_phase_prompts.md` | Era prompt; packet phases shipped | Same evidence chain as #4 |
| 6 | `prompts/codex_asset_pack_prompt.md` | `docs/archive/2026-06-packet-era/codex_asset_pack_prompt.md` | Era prompt; asset-pack system shipped | Same evidence chain as #4 |
| 7 | `prompts/codex_importer_prompt.md` | `docs/archive/2026-06-packet-era/codex_importer_prompt.md` | Era prompt; importers shipped | Same evidence chain as #4 |

## explicit-do-not-archive (updated 2026-06-09 after implemented-plans sweep)

| Doc | Why it stays |
|---|---|
| docs/38–41 (UXHC audit set) | Hard-keep + pinned by `skills/homebrew-forge/references/ux-quality-gate.md` |
| docs/03_data_model_and_csv_schema.md | Hard-keep + linked from app code (`ImportExportPanel.tsx` API href) |
| docs/45, 47, 67, 68, project-map.md, docs/README.md, docs/64, docs/cowork/* | Kyle's hard-keep set (2026-06-09 directive) |
| Live specs/standards/references (see `docs/README.md`) | Behavior contracts and operational references, not planning artifacts |
| reports/ux-audit/* | Immutable audit evidence; indexed by `reports/ux-audit/README.md`, never moved |

Earlier keep-reasons for docs 21/22, 49-list-controls, 50, 52–56, 69, superpowers plans were superseded by the 2026-06-09 directive; those files are now archived (entries 8–58 below).

## remaining-manual-decisions (none blocking)

| Item | Status |
|---|---|
| reports/ux-audit/homebrew-forge-full-uxhc-2026-06-05/ | Superseded evidence kept in place per evidence policy; say the word and it moves to an archive bucket |
| docs/superpowers/ (now empty except `.DS_Store`) | Folder left in place; deleting the `.DS_Store` is a hard delete and needs Kyle's hand |

## how-to-restore

Move the file back to its original path, delete the `ARCHIVED` header block, and append a "restored" note to the relevant entry above. Never delete archive entries; strike through and annotate instead.

### 2026-06-09 implemented-plans sweep (entries 8–58)

Directive: treat every planning artifact as implemented; archive all plan/roadmap/matrix/priority/backlog/tracker/research/report docs not hard-kept or pinned. Each file: 🗄️ tag + redirect header; references in live surface updated before/with move; re-grep verified.

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

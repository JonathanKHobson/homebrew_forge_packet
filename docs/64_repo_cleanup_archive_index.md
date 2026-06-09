# Repo Cleanup And Archive Index

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

## Archive Procedure

1. Search references with `rg "<doc-name>" docs AGENTS.md skills packages scripts`.
2. If referenced, update the pointer to the active roadmap or archive index.
3. Move the doc into `docs/archive/<date-topic>/`.
4. Add an entry to the archive folder index with original path, new path, and reason.
5. Run docs grep again to confirm no broken planning pointers.

## Current Decision

No archive moves happen before runtime-service Phase 1. The immediate cleanup is classification, not deletion.

# Shared Desktop Delivery Phase Tracker

Status: active tracker. Update this after each slice.

Evidence root: `output/playwright/desktop-delivery/` for visual/browser evidence and `reports/desktop-delivery/` for command logs when needed.

| Phase | Slice | Status | Owner surface | Verification | Evidence |
|---:|---|---|---|---|---|
| 0 | Local backup, Git bundle, diff/status packet, pushed backup branch | Done | original web repo | backup branch `backup/pre-desktop-delivery-20260608-132519` | backups folder |
| 0 | Migration worktree isolation | Done | `homebrew_forge_packet_desktop_migration` | `git status --short` clean before docs | worktree list |
| 0 | Research packet copied into migration lane | Done | docs | packet present under `docs/superpowers/plans/` | git status |
| 0 | Final roadmap/tracker/test/cutover docs | In progress | docs | docs added and project map updated | this file |
| 0 | Dirty tree triage and archive index | In progress | docs/data/source/scripts | `docs/64_repo_cleanup_archive_index.md` | pending |
| 1 | Full route inventory | In progress | `editorApiPlugin.ts` | inventory seeded; acceptance checks listed | `docs/61_runtime_service_route_inventory.md` |
| 1 | Runtime baseline measurements | Pending | current web/runtime | health, project load, preview timings | pending |
| 2 | Runtime-service package scaffold | Pending | `packages/runtime-service` | typecheck/build | pending |
| 2 | Host-neutral API route registration | Pending | runtime-service/editor adapter | API smoke | pending |
| 3 | Vite adapter preservation | Pending | `packages/editor/src/server` | web dev and API parity | pending |
| 4 | Port fallback and process metadata | Pending | runtime-service/scripts | busy-5177 smoke | pending |
| 4 | Shutdown cleanup and retry/error state | Pending | runtime-service/desktop | orphan listener smoke | pending |
| 5 | Electron shell package | Pending | `packages/desktop` | shell typecheck/build | pending |
| 5 | Electron security/static tests | Pending | desktop window/preload/ipc | no Node renderer, sandbox, origin lock | pending |
| 6 | macOS local app replacement | Pending | app shortcut/scripts | real app opens without Chrome | pending |
| 7 | Windows parity | Pending | desktop/runtime config | `windows-latest` smoke | pending |
| 8 | Packaged runtime | Pending | runtime-service/desktop build | no Vite dev dependency | pending |
| 9 | Packaging and release channel | Pending | electron-builder/release docs | manual release artifact smoke | pending |

## Current Blockers

- Runtime extraction should not begin until Phase 0 docs are committed in the migration lane.
- Electron dependencies should not be installed until route inventory and runtime-service proof are complete.
- Current web checkout remains dirty and must not be used as the desktop implementation lane.

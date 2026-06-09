---
status: archived
lane: desktop
type: tracker
archived: 2026-06-09
---
> **ARCHIVED 2026-06-09 (implemented-plans sweep)** — original path: `docs/63_shared_desktop_delivery_phase_tracker.md`
> Reason: implemented planning artifact, archived per Kyle's 2026-06-09 directive (all plans implemented; no live backlog).
> Index: `docs/cowork/02_repo_archive_manifest.md` + `docs/64_repo_cleanup_archive_index.md`.

# Shared Desktop Delivery Phase Tracker

🗄️ `[status: archived]` `[lane: desktop]` `[type: tracker]`

Status: active tracker. Update this after each slice.

Evidence root: `output/playwright/desktop-delivery/` and
`output/playwright/desktop-cutover/` for visual/browser evidence and
`reports/desktop-delivery/` for command logs when needed.

| Phase | Slice | Status | Owner surface | Verification | Evidence |
|---:|---|---|---|---|---|
| 0 | Local backup, Git bundle, diff/status packet, pushed backup branch | Done | primary repo | backup branch `backup/pre-desktop-cutover-20260608-165539` | `homebrew_forge_packet_backups/desktop-cutover-20260608-165539` |
| 0 | Migration worktree isolation | Done | `homebrew_forge_packet_desktop_migration` | `git status --short` clean before docs | worktree list |
| 0 | Research packet copied into migration lane | Done | docs | packet present under `docs/superpowers/plans/` | git status |
| 0 | Finished primary-tree deck-building changes imported | Done | data/editor/scripts | typecheck, build, UX gate, runtime-service tests | local command output |
| 0 | Final roadmap/tracker/test/cutover docs | Done | docs | docs added and project map updated | this file + `docs/66_desktop_cutover_checklist.md` |
| 0 | Dirty tree triage and archive index | Done | docs/data/source/scripts | `docs/64_repo_cleanup_archive_index.md` | backup packet + preservation commit |
| 1 | Full route inventory | In progress | `editorApiPlugin.ts` | inventory seeded; acceptance checks listed | `docs/61_runtime_service_route_inventory.md` |
| 1 | Runtime baseline measurements | Pending | current web/runtime | health, project load, preview timings | pending |
| 2 | Runtime-service package scaffold | Done | `packages/runtime-service` | runtime-service build/test, repo typecheck/build | local command output |
| 2 | Health/version/port fallback skeleton | Done | `packages/runtime-service` | runtime smoke tests for health, version, busy port | local command output |
| 2 | Runtime `/api/library` extraction | Done | `packages/runtime-service/src/routes/library.ts` | runtime-service typecheck/build/test | local command output |
| 2 | Runtime read routes for decks and collections | Done | `packages/runtime-service/src/createRuntimeServer.ts` | runtime-service typecheck/build/test | local command output |
| 2 | Runtime read routes for references and official cards | Done | `packages/runtime-service/src/routes/` | runtime-service typecheck/build/test | local command output |
| 2 | Runtime asset and mana-symbol routes | Done | `packages/runtime-service/src/routes/assets.ts` | runtime-service typecheck/build/test | local command output |
| 2 | Runtime deck and collection write routes | Done | `packages/runtime-service/src/routes/` | runtime-service typecheck/build/test | local command output |
| 2 | Runtime official-card add-to-deck/collection routes | Done | `packages/runtime-service/src/routes/officialCards.ts` | runtime-service typecheck/build/test | local command output |
| 2 | Runtime collection price routes | Done | `packages/runtime-service/src/routes/collections.ts` | runtime-service typecheck/build/test | local command output |
| 2 | Shared editor project contract package | Done | `packages/editor-core` | editor-core typecheck/build | local command output |
| 2 | Runtime `/api/project` extraction | Done | `packages/runtime-service/src/createRuntimeServer.ts` + `@homebrew-forge/editor-core/projectAdapter` | runtime-service typecheck/build/test | local command output |
| 3 | Web `/api/version` parity endpoint | Done | `packages/editor/src/server` | editor tests, typecheck, build, Vite `/api/version` smoke | local command output |
| 2 | Host-neutral API route registration | Pending | runtime-service/editor adapter | API smoke | pending |
| 3 | Vite adapter preservation | Pending | `packages/editor/src/server` | web dev and API parity | pending |
| 4 | Port fallback and process metadata | Done | runtime-service/scripts | runtime-service tests plus desktop port 5187 health | local command output |
| 4 | Shutdown cleanup and retry/error state | Pending | runtime-service/desktop | orphan listener smoke | pending |
| 5 | Electron shell package | Done | `packages/desktop` | desktop typecheck/build/test | local command output |
| 5 | Electron secure window and navigation guard | Done | `packages/desktop/src/main.ts` | desktop shell tests; process inspection shows sandboxed renderer | local command output |
| 5 | Vite-backed desktop dev launch | Done | `packages/desktop`, `scripts/launch-homebrew-forge-desktop-dev.sh` | `/api/health` on port 5187; DEMO project loads 10 cards / 22 drafts | `output/playwright/desktop-delivery/electron-dev-screen.png` |
| 6 | macOS desktop dev app installed | Done | `/Applications/Homebrew Forge Desktop Dev.app` | LaunchServices app opens without Chrome and owns Electron + Vite child | local command output |
| 6 | macOS default app replacement | Done | `/Applications/Homebrew Forge.app` | `open /Applications/Homebrew Forge.app`, `/api/health`, duplicate-open process count | `output/playwright/desktop-cutover/homebrew-forge-default-app.png` |
| 7 | Windows parity | Pending | desktop/runtime config | `windows-latest` smoke | pending |
| 8 | Packaged runtime | Pending | runtime-service/desktop build | no Vite dev dependency | pending |
| 9 | Packaging and release channel | Pending | electron-builder/release docs | manual release artifact smoke | pending |

## Current Blockers

- None for local macOS default-app cutover.
- Windows parity, Apple Silicon smoke, packaged runtime mode, signing/notarization, and public release artifacts remain pending.
- The legacy web/Chrome launcher remains as a fallback script, but the default human-review path is `/Applications/Homebrew Forge.app`.

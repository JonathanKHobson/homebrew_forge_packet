---
status: archived
lane: desktop
type: plan
archived: 2026-06-09
---
> **ARCHIVED 2026-06-09 (implemented-plans sweep)** — original path: `docs/62_shared_desktop_delivery_final_roadmap.md`
> Reason: implemented planning artifact, archived per Kyle's 2026-06-09 directive (all plans implemented; no live backlog).
> Index: `docs/cowork/02_repo_archive_manifest.md` + `docs/64_repo_cleanup_archive_index.md`.

# Shared Desktop Delivery Final Roadmap

🗄️ `[status: archived]` `[lane: desktop]` `[type: plan]`

Status: active implementation roadmap for web, macOS, and Windows shared delivery.

North Star: `packages/editor` is the product UI. Web, macOS desktop, and Windows desktop consume that same editor surface, so product fixes land once and ship everywhere after rebuild or relaunch.

## Decisions

- Use Electron first, after runtime extraction, because Homebrew Forge is already React, TypeScript, Node, and local file backed.
- Do not create a separate Swift product UI for this migration. Swift/Xcode remains a later native-only spike if a separate product decision is made.
- Keep the current web app as the working app until green-pass cutover.
- Treat the first desktop milestone as repo-required local-dev mode. User-data project mode is a later productization phase.
- Serve the built editor SPA and `/api/*` from one local runtime origin: `http://127.0.0.1:<selected-port>/`.
- Never load the packaged editor through `file://`.

## Phase Roadmap

| Phase | Goal | Exit gate |
|---:|---|---|
| 0 | Preservation, cleanup, final docs, and implementation lane setup | Backup exists, migration worktree is active, tracker/docs are current |
| 1 | Runtime route inventory | `docs/61_runtime_service_route_inventory.md` is complete enough to drive tests |
| 2 | Runtime service extraction | Standalone runtime serves health/version/library/project routes outside Vite |
| 3 | Web preservation | Vite dev uses the shared route registration or adapter with no API drift |
| 4 | Runtime resilience | Port fallback, startup metadata, shutdown cleanup, stale/version detection, retry/error behavior pass |
| 5 | Electron shell | Desktop opens shared editor origin without Chrome and owns only shell concerns |
| 6 | macOS local app | `/Applications/Homebrew Forge Desktop Dev.app` opens the Electron dev app; `/Applications/Homebrew Forge.app` changes only after manual green pass |
| 7 | Windows parity | Windows runtime and Electron smoke pass with paths containing spaces |
| 8 | Packaged runtime | Built editor and `/api/*` run from one local runtime origin without Vite dev |
| 9 | Packaging and updates | Manual GitHub Releases first; signing, notarization, and auto-update later |

## Package Boundaries

```text
packages/editor
  Shared React/Vite product UI. No desktop-only product forks.

packages/forge
  Domain, data, renderer, import, export, validation, and local storage logic.

packages/runtime-service
  Local HTTP runtime, /api routes, static editor serving, health/version, port/process ownership.

packages/desktop
  Electron shell only: lifecycle, window, menus, config paths, runtime child, preload IPC, packaging. Current first milestone supports a Vite-backed dev app for full API parity while packaged runtime extraction continues.
```

## Green-Pass Cutover

Desktop cannot become the default launcher until:

- web mode still launches and passes baseline checks;
- runtime service passes route smoke, save round trip, port collision, shutdown cleanup, and path-with-spaces tests;
- Electron shell opens one desktop window without Chrome and loads the shared editor origin;
- the Vite-backed desktop dev app has been reviewed separately from the future packaged runtime app;
- macOS Intel and Apple Silicon smoke are green or split artifacts are explicitly accepted;
- Windows runtime and Electron smoke pass or the deferral is documented and approved;
- Kyle manually opens and reviews the desktop app successfully.

## Non-Goals

- No product UI in `packages/desktop`.
- No duplicated routes or direct desktop-only data model.
- No remote services, live sync, or remote asset dependencies.
- No auto-update until signed packaging is proven.
- No deletion of the existing web launcher before cutover.

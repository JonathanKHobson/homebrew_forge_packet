---
status: archived
lane: desktop
type: research
archived: 2026-06-09
---
> **ARCHIVED 2026-06-09 (implemented-plans sweep)** — original path: `docs/superpowers/plans/homebrew_forge_desktop_delivery_research_packet/02_revised_architecture_delivery_model.md`
> Reason: completed desktop-delivery research packet; delivery shipped (cutover 2026-06-08).
> Index: `docs/cowork/02_repo_archive_manifest.md` + `docs/64_repo_cleanup_archive_index.md`.

# 02 — Revised Architecture and Delivery Model

Generated date: 2026-06-08
Research horizon: External technical/product research and branch review for Homebrew Forge desktop delivery as of 2026-06-08.
Repository freshness caveat: Primary repo evidence comes from `https://github.com/JonathanKHobson/homebrew_forge_packet/tree/codex/shared-delivery-runtime`. Local code may be ahead; treat file-target guidance as branch-grounded, not a guarantee of local state.
Scope: No implementation, no local machine access, no code changes. This packet critiques architecture, runtime, packaging, CI, security, and migration safety for preserving one shared Homebrew Forge product UI across web, macOS desktop, and Windows desktop.
Confidence summary: High on architecture gates, Electron security posture, Vite middleware limitation, packaging/signing sequencing, and CI categories. Medium on exact package-version behavior until clean installs run on macOS x64/arm64 and Windows. Low on long-term user-data project migration until product-owner decisions are made.


## 1. Revised architecture diagram

```text
                         ┌──────────────────────────────────────────┐
                         │ packages/editor                           │
                         │ Shared React/Vite SPA product UI          │
                         │ Maker, Decks, Collections, References,    │
                         │ Gallery, Settings, command palette        │
                         └───────────────────────┬──────────────────┘
                                                 │ relative fetch('/api/*')
                                                 │ same-origin only
┌──────────────────────────────┐                 ▼
│ Web/dev mode                  │   ┌────────────────────────────────────────┐
│ Vite dev server               │   │ packages/runtime-service                │
│ - HMR/dev transforms          │──▶│ Embeddable Node HTTP runtime            │
│ - mounts/proxies same routes  │   │ - serves built SPA in packaged mode     │
│ - no product-only API logic   │   │ - owns /api/* contract                  │
└──────────────────────────────┘   │ - /api/health + /api/version            │
                                   │ - selected port + process metadata       │
                                   │ - 127.0.0.1 only                         │
                                   └───────────────┬────────────────────────┘
                                                   │ calls domain/data services
                                                   ▼
                                   ┌────────────────────────────────────────┐
                                   │ packages/forge                          │
                                   │ Domain/data/render/import/export logic   │
                                   │ CSV/YAML/JSON, cards, decks, collections│
                                   │ references, official-card cache, exports │
                                   └────────────────────────────────────────┘

┌──────────────────────────────┐
│ packages/desktop              │
│ Electron shell only            │
│ - app lifecycle                │
│ - starts runtime child         │
│ - discovers selected port      │
│ - BrowserWindow loads          │
│   http://127.0.0.1:<port>/     │
│ - native menus via shared      │
│   command registry             │
│ - typed IPC for OS dialogs only│
│ - packaging/update later       │
└──────────────────────────────┘
```

## 2. Architecture verdict

The plan should be revised from “add Electron shell” to **“extract a runtime-service, then add Electron as one consumer.”** Electron should never be the API owner and never the product UI owner.

### Known repo facts

- The branch’s delivery-mode plan says `packages/editor` remains the only product UI source of truth and `packages/forge` remains the domain/data/runtime source.
- The branch identifies the current `/api/*` implementation in `packages/editor/src/server/editorApiPlugin.ts` as Vite middleware.
- The branch proposes `packages/runtime-service` for an embeddable local HTTP service and `packages/desktop` for shell-only Electron concerns.
- The branch already plans one local runtime origin: `http://127.0.0.1:<selected-port>/` for both SPA and `/api/*`.

### External facts

- Vite v4’s `configureServer` hook is specifically for configuring the dev server and adding custom middleware to its internal Connect app; Vite notes this hook is not called in production builds. Source: https://v4.vitejs.dev/guide/api-plugin.html
- Electron’s security checklist includes disabling Node integration, enabling context isolation, enabling sandboxing, restricting navigation/window creation, validating IPC senders, and avoiding `file://`. Source: https://www.electronjs.org/docs/latest/tutorial/security
- Node’s `server.listen(0)` behavior lets the operating system assign an unused port, and `EADDRINUSE` is a common listen error. Source: https://nodejs.org/api/net.html
- Playwright supports experimental Electron automation and can launch Electron apps, inspect windows, screenshot, and close the app. Source: https://playwright.dev/docs/api/class-electron

## 3. Runtime-service contract

### Must own

| Runtime concern | Required behavior | Confidence |
|---|---|---:|
| Static SPA serving | In packaged mode, serve `packages/editor/dist` from the same origin as `/api/*`. | High |
| API route contract | Preserve existing API paths and request/response shapes. | High |
| Health | `/api/health` reports runtime label, delivery mode, repo/project root, selected port, PID, startedAt, stale status, and ownership metadata. | High |
| Version | `/api/version` reports `apiContractVersion`, editor build hash, forge build hash, runtime build hash, desktop shell build hash when present. | High |
| Port strategy | Prefer 5177; if occupied by a non-owned process, select a free port and communicate it to Electron. | High |
| File writes | Same save/import/export path as web mode. | High |
| Shutdown | Parent process owns child process and confirms no listener remains after quit. | High |
| Security | Bind to `127.0.0.1`; consider a random per-session API token before user-data distribution. | Medium-high |

### Should not own

- Product screens.
- CSS.
- Command labels.
- Menu copy.
- Workspace behavior.
- Renderer UI state.
- Desktop-only routes that bypass the shared UI.

## 4. Vite extraction pattern

### Current branch state

`packages/editor/vite.config.ts` registers `editorApiPlugin({ repoRoot, defaultSetCode: 'DEMO' })`, and `editorApiPlugin.ts` contains a large set of `/api/*` route handlers. This works in dev, but it couples the product API to Vite’s dev server.

### Recommended extraction pattern

```text
packages/runtime-service/src/
  createRuntimeServer.ts
  registerApiRoutes.ts
  routes/
    health.ts
    library.ts
    project.ts
    decks.ts
    collections.ts
    officialCards.ts
    assets.ts
    importsExports.ts
  static/
    serveEditorDist.ts
  health/
    buildRuntimeHealth.ts
    buildRuntimeVersion.ts

packages/editor/src/server/
  editorApiPlugin.ts
    imports registerApiRoutes()
    adapts Vite Connect middleware only

packages/desktop/src/main/
  runtime.ts
    starts runtime-service child
    waits for /api/health
    gets selected origin
```

## 5. Electron vs Tauri critique

| Criterion | Electron-first | Tauri-first | Recommendation |
|---|---|---|---|
| Existing Node/TypeScript runtime | Strong fit; Electron already embeds Node in main process while renderer can remain sandboxed. | Requires Rust commands or sidecar strategy around Node runtime. | Electron first. |
| Shared React UI | Strong, if BrowserWindow loads the same editor SPA. | Strong, because Tauri also uses web frontend. | Tie. |
| Product mismatch risk | Medium if native menus/IPC drift; manageable with shared command registry. | Medium if Rust commands evolve separately from web API. | Electron lower initial risk. |
| App footprint | Larger due to Chromium. | Smaller because it uses platform webviews. | Tauri later as optimization. |
| Security posture | Strong if Electron checklist is followed; high risk if Node leaks into renderer. | Strong default trust-boundary model via capabilities/IPC. | Electron acceptable with strict gates. |
| Windows parity | Mature and direct with electron-builder/NSIS. | Also cross-platform, but sidecar packaging for Node runtime adds complexity. | Electron first. |
| Native packaging complexity | Known path with electron-builder; signing/notarization still required. | Different Rust/toolchain/capability model. | Electron first. |
| Long-term optionality | Runtime-service extraction improves future Tauri feasibility. | Tauri-first before extraction would force decisions too early. | Extract runtime first either way. |

### Verdict on Tauri

**Do not spike Tauri before runtime extraction.** Tauri is worth revisiting only after the runtime-service contract is explicit, because Tauri commands are Rust functions invoked from the frontend and sidecars require per-target binaries. Sources: https://v2.tauri.app/develop/calling-rust/ and https://v2.tauri.app/develop/sidecar/

## 6. Security envelope

| Layer | Required rule | Source |
|---|---|---|
| BrowserWindow | `contextIsolation:true`, `nodeIntegration:false`, `sandbox:true`. | https://www.electronjs.org/docs/latest/tutorial/security |
| Navigation | Lock to selected local runtime origin; external links open in OS browser only after allowlist. | https://www.electronjs.org/docs/latest/tutorial/security |
| Local content | Do not load packaged SPA through `file://`; serve from local runtime origin. | https://www.electronjs.org/docs/latest/tutorial/security |
| IPC | Typed preload only; validate payloads and IPC sender. | https://www.electronjs.org/docs/latest/tutorial/security |
| API binding | Bind to `127.0.0.1`, not `0.0.0.0`. | Architecture inference from local-first security goal; validate in implementation. |
| File access | Desktop native dialogs call main process; renderer never receives unrestricted filesystem APIs. | Electron security guidance + repo non-negotiable. |

## 7. Data model

| Model | Description | Use now? | Risk |
|---|---|---:|---|
| Repo-required local-dev app | Desktop points at checked-out repo; source data stays under `sets/`, `decks/`, `collections/`, `reference/`, `assets/`, and outputs. | Yes, M0-M3. | Not a polished distribution model. |
| User-data project app | Desktop creates/imports projects under OS user-data locations, with repo-independent project roots. | No, separate productization phase. | Larger migration; path schema and backup/export UX needed. |

Recommendation: **keep Option A for the first desktop migration and label it plainly.** Do not imply a consumer-grade project model until project-root migration is designed and validated.


## Top 5 action items

1. Freeze the Chrome shim as fallback; do not delete or redefine it until desktop green-pass cutover.
2. Create the route inventory and extract `/api/*` behind an embeddable runtime-service before Electron product work.
3. Add health/version/port/process ownership tests before packaging.
4. Add a shared command registry before native menus, shortcuts, or command palette expansion.
5. Keep packaging, signing, notarization, and auto-update behind explicit release gates.

## What needs product-owner validation

- Whether M0-M3 is explicitly a repo-required local-dev app or whether a user-data project model must be designed now.
- Whether the first macOS artifact should be universal or split x64/arm64.
- What minimum Windows proof is required before Mac launcher replacement becomes the default.
- What release/update channel is acceptable: manual GitHub Releases first, signed auto-update later, or no updater.
- Whether runtime access should require a random per-session token even when bound to `127.0.0.1`.

## Research gaps that should be tested in-editor later

- First-launch runtime failure messaging and retry UX.
- Save round-trip parity across Maker, Decks, Collections, References, and Gallery.
- Native menu and command palette behavior parity.
- Path-with-spaces coverage on macOS and Windows.
- Actual startup latency, preview latency, and shutdown/orphan-process behavior on both Mac architectures and Windows.



## Source links

### Repository / branch evidence

- Homebrew Forge branch: https://github.com/JonathanKHobson/homebrew_forge_packet/tree/codex/shared-delivery-runtime
- AGENTS.md: https://github.com/JonathanKHobson/homebrew_forge_packet/blob/codex/shared-delivery-runtime/AGENTS.md
- docs/project-map.md: https://github.com/JonathanKHobson/homebrew_forge_packet/blob/codex/shared-delivery-runtime/docs/project-map.md
- Shared delivery modes plan: https://github.com/JonathanKHobson/homebrew_forge_packet/blob/codex/shared-delivery-runtime/docs/superpowers/plans/2026-06-08-shared-delivery-modes.md
- Desktop delivery tooling prep: https://github.com/JonathanKHobson/homebrew_forge_packet/blob/codex/shared-delivery-runtime/docs/60_desktop_delivery_tooling_prep.md
- package.json: https://github.com/JonathanKHobson/homebrew_forge_packet/blob/codex/shared-delivery-runtime/package.json
- pnpm-workspace.yaml: https://github.com/JonathanKHobson/homebrew_forge_packet/blob/codex/shared-delivery-runtime/pnpm-workspace.yaml
- packages/editor/vite.config.ts: https://github.com/JonathanKHobson/homebrew_forge_packet/blob/codex/shared-delivery-runtime/packages/editor/vite.config.ts
- packages/editor/src/server/editorApiPlugin.ts: https://github.com/JonathanKHobson/homebrew_forge_packet/blob/codex/shared-delivery-runtime/packages/editor/src/server/editorApiPlugin.ts
- packages/editor/src/server/runtimeHealth.mjs: https://github.com/JonathanKHobson/homebrew_forge_packet/blob/codex/shared-delivery-runtime/packages/editor/src/server/runtimeHealth.mjs
- scripts/run-homebrew-forge-editor.mjs: https://github.com/JonathanKHobson/homebrew_forge_packet/blob/codex/shared-delivery-runtime/scripts/run-homebrew-forge-editor.mjs
- scripts/launch-homebrew-forge-app.sh: https://github.com/JonathanKHobson/homebrew_forge_packet/blob/codex/shared-delivery-runtime/scripts/launch-homebrew-forge-app.sh
- scripts/install-homebrew-forge-app-shortcut.sh: https://github.com/JonathanKHobson/homebrew_forge_packet/blob/codex/shared-delivery-runtime/scripts/install-homebrew-forge-app-shortcut.sh
- scripts/codex/homebrew-forge-launcher-health-hook.sh: https://github.com/JonathanKHobson/homebrew_forge_packet/blob/codex/shared-delivery-runtime/scripts/codex/homebrew-forge-launcher-health-hook.sh

### External technical sources

- Electron security checklist: https://www.electronjs.org/docs/latest/tutorial/security
- Electron code signing: https://www.electronjs.org/docs/latest/tutorial/code-signing
- Electron minimal repro repository: https://github.com/electron/minimal-repro
- electron-builder repository: https://github.com/electron-userland/electron-builder
- electron-builder multi-platform build: https://www.electron.build/multi-platform-build.html
- electron-builder auto-update: https://www.electron.build/auto-update.html
- electron-builder NSIS: https://www.electron.build/nsis.html
- Apple Developer ID and notarization overview: https://developer.apple.com/developer-id/
- Vite v4 plugin API: https://v4.vitejs.dev/guide/api-plugin.html
- Vite v4 server-side rendering / middleware mode: https://v4.vitejs.dev/guide/ssr.html
- Node `net` API: https://nodejs.org/api/net.html
- Node `child_process` API: https://nodejs.org/api/child_process.html
- Tauri architecture: https://v2.tauri.app/concept/architecture/
- Tauri commands / frontend-to-Rust IPC: https://v2.tauri.app/develop/calling-rust/
- Tauri sidecars: https://v2.tauri.app/develop/sidecar/
- Tauri security: https://v2.tauri.app/security/
- Tauri repository: https://github.com/tauri-apps/tauri
- Tauri examples: https://github.com/tauri-apps/tauri/tree/dev/examples
- GitHub-hosted runners reference: https://docs.github.com/en/actions/reference/runners/github-hosted-runners
- Playwright Electron automation: https://playwright.dev/docs/api/class-electron
- pnpm approve-builds: https://pnpm.io/cli/approve-builds
- pnpm settings / allowBuilds: https://pnpm.io/settings
- electron-vite repository: https://github.com/alex8088/electron-vite
- secure-electron-template repository: https://github.com/reZach/secure-electron-template

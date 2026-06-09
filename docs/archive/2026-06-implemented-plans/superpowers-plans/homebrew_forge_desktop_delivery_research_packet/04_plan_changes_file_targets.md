---
status: archived
lane: desktop
type: research
archived: 2026-06-09
---
> **ARCHIVED 2026-06-09 (implemented-plans sweep)** — original path: `docs/superpowers/plans/homebrew_forge_desktop_delivery_research_packet/04_plan_changes_file_targets.md`
> Reason: completed desktop-delivery research packet; delivery shipped (cutover 2026-06-08).
> Index: `docs/cowork/02_repo_archive_manifest.md` + `docs/64_repo_cleanup_archive_index.md`.

# 04 — Specific Plan Changes with File Targets

Generated date: 2026-06-08
Research horizon: External technical/product research and branch review for Homebrew Forge desktop delivery as of 2026-06-08.
Repository freshness caveat: Primary repo evidence comes from `https://github.com/JonathanKHobson/homebrew_forge_packet/tree/codex/shared-delivery-runtime`. Local code may be ahead; treat file-target guidance as branch-grounded, not a guarantee of local state.
Scope: No implementation, no local machine access, no code changes. This packet critiques architecture, runtime, packaging, CI, security, and migration safety for preserving one shared Homebrew Forge product UI across web, macOS desktop, and Windows desktop.
Confidence summary: High on architecture gates, Electron security posture, Vite middleware limitation, packaging/signing sequencing, and CI categories. Medium on exact package-version behavior until clean installs run on macOS x64/arm64 and Windows. Low on long-term user-data project migration until product-owner decisions are made.


## 1. Summary of required changes

The current plan is good but should be tightened around concrete file ownership. The main shift is to make `editorApiPlugin.ts` a thin Vite adapter, not the permanent API owner.

## 2. File/package target table

| Target | Change | Why | Phase | Confidence |
|---|---|---|---:|---:|
| `docs/61_runtime_service_route_inventory.md` | Add route inventory before extraction. | Prevent invisible Vite coupling and save/export regressions. | 1 | High |
| `packages/runtime-service/package.json` | New workspace package for runtime service. | Creates API owner outside Vite and outside Electron. | 2 | High |
| `packages/runtime-service/src/createRuntimeServer.ts` | Start standalone local HTTP server, serve static editor assets in packaged mode, register API routes. | Load-bearing runtime layer. | 2 | High |
| `packages/runtime-service/src/registerApiRoutes.ts` | Host-neutral registration for `/api/*` route handlers. | Lets Vite dev and desktop share same API contract. | 2 | High |
| `packages/runtime-service/src/routes/*` | Split current monolithic API routes by domain. | Makes route tests, ownership, and security review possible. | 2 | High |
| `packages/runtime-service/src/health/*` | Move/extend health and version metadata. | Health must distinguish dev vs packaged and detect contract drift. | 2 | High |
| `packages/editor/src/server/editorApiPlugin.ts` | Replace route implementations with thin adapter that calls runtime-service route registration. | Vite should host dev middleware only. | 2–3 | High |
| `packages/editor/src/server/runtimeHealth.mjs` | Either move to runtime-service or re-export from it; add `/api/version` semantics. | Prevent duplicated health logic. | 2 | High |
| `packages/editor/vite.config.ts` | Keep Vite dev mode; mount/proxy same runtime routes; avoid production-only assumptions. | Preserve web mode. | 3 | High |
| `scripts/run-homebrew-forge-editor.mjs` | Consume runtime-service or same shared route adapter; report selected port; stop hard-failing on 5177 in desktop path. | Port resilience and parity. | 3–4 | High |
| `packages/editor/src/domain/commands.ts` | New shared command registry. | Prevent web menu/native menu/shortcut/command palette drift. | 4–5 | High |
| `packages/desktop/package.json` | Add only after runtime proof; Electron dependencies live here, not in editor. | Keeps desktop shell isolated. | 5 | High |
| `packages/desktop/src/main/main.ts` | App lifecycle only. | Prevent desktop UI/API growth. | 5 | High |
| `packages/desktop/src/main/runtime.ts` | Start/check/stop runtime child. | Clear process ownership; no LaunchAgent dependency. | 5 | High |
| `packages/desktop/src/main/window.ts` | BrowserWindow creation, loading/retry/error state, origin lock. | Shell owns windowing only. | 5 | High |
| `packages/desktop/src/main/menu.ts` | Map shared command IDs to native menu items. | Prevent product mismatch. | 5 | High |
| `packages/desktop/src/main/config.ts` | OS-specific config path and repoRoot/projectRoot. | Avoid hard-coded Mac path; support Windows. | 5–7 | High |
| `packages/desktop/src/preload.ts` | Narrow typed IPC bridge for desktop shell features only. | Security requirement. | 5 | High |
| `scripts/install-homebrew-forge-app-shortcut.sh` | After green-pass, install real Electron app instead of zsh/Chrome shim. | Replace unreliable launcher without removing fallback prematurely. | 6 | High |
| `scripts/codex/homebrew-forge-launcher-health-hook.sh` | After cutover, verify desktop process/runtime health, not Chrome process count. | Current hook treats Chrome as success. | 6 | High |
| `AGENTS.md` | After cutover, update hook instructions to desktop-aware health, not Chrome. | Prevent future agents reinforcing old launcher architecture. | 6 | High |
| `package.json` | Add additive desktop scripts only after package exists. | Preserve `editor` script. | 5 | High |
| `pnpm-workspace.yaml` | Explicitly add approved Electron build scripts when dependencies are installed. | pnpm v11 uses `allowBuilds`; current file only has `esbuild: true`. | 5 | High |
| `.github/workflows/desktop-runtime-parity.yml` | Add CI matrix for web/runtime/desktop smoke. | Prevent OS drift. | 4–8 | High |

## 3. Route extraction target shape

### Before

```text
packages/editor/src/server/editorApiPlugin.ts
  Vite plugin
  route definitions
  JSON body parsing
  filesystem writes
  asset serving
  calls packages/forge
  runtime health
```

### After

```text
packages/runtime-service/src/registerApiRoutes.ts
  owns API route registration

packages/runtime-service/src/routes/*.ts
  owns route handler functions

packages/editor/src/server/editorApiPlugin.ts
  imports registerApiRoutes()
  adapts Vite's Connect server only

packages/desktop/src/main/runtime.ts
  starts standalone runtime-service child
```

## 4. API inventory expectations

Create `docs/61_runtime_service_route_inventory.md` with at least this table shape:

| Route | Method | Current owner | Dependencies | Classification | File writes | Fixture | Extraction risk | Acceptance check |
|---|---|---|---|---|---|---|---|---|
| `/api/health` | GET | `editorApiPlugin.ts` | `runtimeHealth.mjs` | pure-fs / health | No | n/a | Medium | Status + selected port + mode |
| `/api/library` | GET | `editorApiPlugin.ts` | repo files | pure-fs | No | DEMO | Low | Includes expected projects/sets |
| `/api/project` | GET | `editorApiPlugin.ts` | `loadForgeProject` | pure-fs | No | DEMO | Medium | Cards and variants load |
| `/api/save-deck` | POST | `editorApiPlugin.ts` | `saveDeck` | pure-fs write | Yes | demo deck | High | Save/read diff round-trip |
| `/api/asset` | GET | `editorApiPlugin.ts` | file path guard | security-sensitive | No | DEMO art | High | Blocks outside-root path |

## 5. Command registry target

Recommended command definition shape:

```ts
type ForgeCommandId =
  | 'file.save'
  | 'file.import'
  | 'file.export'
  | 'view.commandPalette'
  | 'tools.artworkMode'
  | 'tools.textMode'
  | 'deck.save'
  | 'collection.save';

interface ForgeCommandDefinition {
  id: ForgeCommandId;
  label: string;
  menuPath: string[];
  defaultShortcut?: string;
  destructive?: boolean;
  requiresDirtyState?: boolean;
  availability: 'web' | 'desktop' | 'all';
}
```

Rules:

- Labels, shortcuts, destructive semantics, and availability live in `packages/editor/src/domain/commands.ts`.
- Desktop menu maps command IDs to native menu templates.
- Web command palette and app menu use the same IDs.
- Any desktop-only native dialog must provide a web-safe equivalent or staged unavailable state.

## 6. Runtime health/version target

Add `/api/version`:

```json
{
  "app": "Homebrew Forge",
  "deliveryMode": "web-dev | desktop-dev | mac-desktop | win-desktop | packaged",
  "apiContractVersion": "runtime-api-v1",
  "editorBuild": "<hash>",
  "forgeBuild": "<hash>",
  "runtimeBuild": "<hash>",
  "desktopBuild": "<hash-or-null>",
  "repoRoot": "<absolute path when local-dev>",
  "projectRoot": "<future user-data root or null>",
  "selectedPort": 5177,
  "processId": 12345,
  "parentProcessId": 12300,
  "startedAt": "ISO-8601"
}
```

Why: the current `runtimeHealth.mjs` already fingerprints watched repo files and reports stale state, but packaged mode needs build-hash and contract-version semantics rather than source mtime alone.

## 7. Security file targets

| Target | Required test/check |
|---|---|
| `packages/desktop/src/main/window.ts` | Static assertion that BrowserWindow uses `contextIsolation:true`, `nodeIntegration:false`, `sandbox:true`. |
| `packages/desktop/src/main/window.ts` | Navigation handler allows only selected `http://127.0.0.1:<port>/` origin. |
| `packages/desktop/src/preload.ts` | Only typed methods exposed; no raw `ipcRenderer`, no filesystem module. |
| `packages/desktop/src/main/ipc.ts` | Validate payloads and sender origin before action. |
| `packages/runtime-service/src/createRuntimeServer.ts` | Bind host `127.0.0.1`; optional token validation decision documented. |

## 8. Plan changes I would make before implementation

1. **Add `docs/61_runtime_service_route_inventory.md` as a hard gate.** Do not start extraction without it.
2. **Add `/api/version` before Electron.** Health alone tells “alive”; version tells “compatible.”
3. **Define a machine-readable runtime startup line** for Electron and scripts: `{ origin, port, pid, mode }`.
4. **Add port collision fallback before Electron shell work.** The shell should never hard-code 5177 as the only valid port.
5. **Require a product-UI absence test for `packages/desktop`.** A simple grep/static test is cheap insurance.
6. **Replace “strict Electron security” with testable assertions.** Make security defaults fail CI if changed.
7. **Make Windows parity a gate before Mac default cutover.** Do not let Windows become a “later maybe.”
8. **Keep auto-update entirely out of implementation scope until packaging/signing is real.**


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

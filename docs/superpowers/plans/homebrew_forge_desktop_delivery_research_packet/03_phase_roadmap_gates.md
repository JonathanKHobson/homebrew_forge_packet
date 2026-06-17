# 03 — Recommended Phase Roadmap with Gates

Generated date: 2026-06-08
Research horizon: External technical/product research and branch review for Homebrew Forge desktop delivery as of 2026-06-08.
Repository freshness caveat: Primary repo evidence comes from `https://github.com/JonathanKHobson/homebrew_forge_packet/tree/codex/shared-delivery-runtime`. Local code may be ahead; treat file-target guidance as branch-grounded, not a guarantee of local state.
Scope: No implementation, no local machine access, no code changes. This packet critiques architecture, runtime, packaging, CI, security, and migration safety for preserving one shared Homebrew Forge product UI across web, macOS desktop, and Windows desktop.
Confidence summary: High on architecture gates, Electron security posture, Vite middleware limitation, packaging/signing sequencing, and CI categories. Medium on exact package-version behavior until clean installs run on macOS x64/arm64 and Windows. Low on long-term user-data project migration until product-owner decisions are made.


## 1. Roadmap principle

Ship the migration in reversible layers. The desktop app should become the default only after the runtime-service, web parity, Mac x64/arm64 smoke, Windows smoke, and manual user confirmation all pass from the same commit.

## 2. Phase roadmap

| Phase | Name | Goal | Exit gate | Blocks if failed |
|---:|---|---|---|---|
| 0 | Preservation and preflight | Back up local/online, create migration worktree, prove current web mode still works. | Backup exists; branch/worktree exists; editor typecheck/build/dev passes. | All desktop work. |
| 1 | Route inventory | Catalog every `/api/*` route in `editorApiPlugin.ts` by method, dependencies, Vite coupling, file writes, render coupling, and fixture. | `docs/61_runtime_service_route_inventory.md` complete; boot/preview baseline recorded. | Runtime extraction. |
| 2 | Runtime-service extraction | Move route registration into embeddable Node runtime while preserving API contract. | Standalone runtime serves `/api/health`, `/api/version`, `/api/library`, `/api/project?set=DEMO`. | Electron shell. |
| 3 | Web preservation adapter | Vite dev mode uses the same runtime route registration or proxies to runtime. | Existing root/editor scripts still work; no API drift. | Desktop parity claims. |
| 4 | Runtime resilience | Add selected port, health/version metadata, child ownership contract, shutdown cleanup. | Busy-5177 test passes; app selects fallback port; close leaves no listener. | Desktop default. |
| 5 | Electron dev shell | Add shell-only `packages/desktop`; load shared editor origin; strict security defaults; native loading/error state. | Electron smoke opens shared editor, not Chrome; no product UI in desktop package. | Mac replacement. |
| 6 | macOS local-dev app replacement | Replace `/Applications/Homebrew Forge.app` shortcut with real Electron app only in migration lane. | Intel x64 and Apple Silicon arm64 smoke pass, or explicit split artifact test plan accepted. | Default launcher cutover. |
| 7 | Windows parity | Add Windows config/path/process tests and Windows Electron smoke. | `windows-latest` runner passes runtime + desktop smoke; path-with-spaces fixture passes. | Packaging claims. |
| 8 | Packaged runtime | Build editor SPA, serve assets and `/api/*` from one runtime-service origin. | Packaged local app works offline against DEMO and repo data; no Vite dev dependency. | Signing/update. |
| 9 | Packaging, signing, update | Produce macOS/Windows artifacts; sign/notarize; add explicit update channel. | Signed artifacts from same commit; release metadata valid; manual install/update tests pass. | Public/partner distribution. |

## 3. Gate details

### Phase 0 — Preservation and preflight

Required checks:

```bash
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor typecheck
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor build
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor dev
```

Decision gate: **do not install Electron before this passes.** The branch already states Phase 0 must not install Electron or create desktop source files.

### Phase 1 — Route inventory

Required inventory fields:

| Field | Purpose |
|---|---|
| Route path + method | Preserve public API contract. |
| Owner function | Make extraction target explicit. |
| Dependencies | Identify `packages/forge`, editor domain, filesystem, Vite server, render coupling. |
| Data writes | Flag corruption or save round-trip risk. |
| Classification | `pure-fs`, `vite-coupled`, `render-coupled`, `security-sensitive`, `long-running`. |
| Fixture | DEMO/SQM/deck/collection/reference data used by smoke test. |
| Acceptance check | Route-specific test, not just “loads.” |

Minimum route groups to classify from `editorApiPlugin.ts`:

- Health/restart/library/reference.
- Official card catalog status/search/sync/add-to-collection/add-to-deck/add-to-set.
- Deck list/read/create/save/import/export.
- Collection list/read/create/save/import/export/price refresh.
- Asset and mana-symbol serving.
- Project/set/library asset create/update.
- Card import/export/sync Cockatrice.
- Preview/render routes if present below branch excerpts.

### Phase 2 — Runtime-service extraction

Runtime package should expose two surfaces:

```ts
createRuntimeServer(options)
registerApiRoutes(adapter, options)
```

The adapter should hide whether the host is Vite Connect middleware or a standalone Node HTTP server. The route handlers should not depend on Vite’s module graph, dev server, or HMR.

External support: Vite v4 explicitly describes `configureServer` as dev-server middleware and notes it is not called during production build. Source: https://v4.vitejs.dev/guide/api-plugin.html

### Phase 3 — Web preservation

Web mode must continue to run from the original repo path while desktop work happens elsewhere. The existing root `editor` script should remain. New desktop scripts should be additive.

Pass criteria:

- Browser loads the same editor UI.
- `/api/health` and `/api/version` identify delivery mode.
- Save round-trip writes to the same file-backed data path as before.
- No new CORS requirements appear in web mode.

### Phase 4 — Runtime resilience

Pass criteria:

| Test | Expected |
|---|---|
| 5177 free | Runtime binds 5177. |
| 5177 occupied by foreign process | Runtime selects free fallback port and tells shell. |
| Runtime child killed | Desktop shows retry/error state, not blank UI. |
| App quit | Runtime child terminates; no local listener remains. |
| Source changed in dev | Health reports stale or mismatch clearly. |
| Packaged mismatch | `/api/version` fails loudly on editor/runtime/API mismatch. |

Node supports OS-assigned unused ports when port is omitted or `0`, and documents `EADDRINUSE` as a common listen failure. Source: https://nodejs.org/api/net.html

### Phase 5 — Electron dev shell

Shell requirements:

```ts
webPreferences: {
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true
}
```

Additional gates:

- Lock navigation to selected local origin.
- Block or externalize non-local URLs.
- Validate IPC sender.
- Typed IPC only for native dialogs and app-shell capabilities.
- No product screen components in `packages/desktop`.
- No desktop-specific CSS or workspace copy.

Electron’s official security checklist supports these requirements. Source: https://www.electronjs.org/docs/latest/tutorial/security

### Phase 6 — macOS local-dev app replacement

Pass criteria:

- `/Applications/Homebrew Forge.app` opens Electron, not Chrome.
- Chrome shim still exists as fallback.
- Intel x64 and Apple Silicon arm64 are tested or explicitly split with owner approval.
- Config goes under `~/Library/Application Support/Homebrew Forge`.
- Logs go under `~/Library/Logs/Homebrew Forge`.
- Current repo path remains configurable.
- Current hard-coded repo path is not baked into packaged runtime.

### Phase 7 — Windows parity

Pass criteria:

- `%APPDATA%/Homebrew Forge/desktop-config.json` is used for config.
- `%LOCALAPPDATA%/Homebrew Forge/Logs` or equivalent is used for logs.
- Paths with spaces are tested.
- Runtime launcher uses Node cross-platform path, not PowerShell-only divergence.
- Windows smoke runs on `windows-latest`.
- Native installer packaging is deferred until runtime smoke is green.

GitHub-hosted runners include Windows and macOS labels, including Windows x64 and macOS Intel/arm64 runners depending on repo type and plan. Source: https://docs.github.com/en/actions/reference/runners/github-hosted-runners

### Phase 8 — Packaged runtime

Pass criteria:

- Build `packages/editor/dist`.
- Runtime serves built assets and `/api/*` from one origin.
- Electron loads runtime origin, not Vite dev and not `file://`.
- Offline DEMO load passes.
- File save/import/export writes expected repo data.
- Build metadata matches across editor/runtime/forge/desktop.

Electron security docs advise avoiding `file://` and serving local pages through safer alternatives/custom protocols; Homebrew Forge’s localhost runtime origin is the better fit for preserving relative API calls and sandboxing. Source: https://www.electronjs.org/docs/latest/tutorial/security

### Phase 9 — Packaging, signing, update

Pass criteria:

- `electron-builder` packaging config exists.
- macOS signed/notarized artifacts are produced only with approved Developer ID credentials.
- Windows NSIS installer is produced and later signed.
- Update metadata is generated from the same commit as the artifacts.
- Auto-update is opt-in/manual-first until signed release flow is proven.

electron-builder documents `electron-updater` metadata flow and auto-updatable targets; macOS auto-update requires signing and Windows auto-update target is NSIS. Source: https://www.electron.build/auto-update.html

## 4. Reversibility rules

- Keep the current web app usable from the original repo path through Phase 8.
- Keep Chrome shim as fallback until Kyle manually confirms desktop stability.
- Do not move source data out of repo-owned paths without a separate migration.
- Do not let desktop become default if Windows parity is untested or explicitly blocked.
- Do not package unsigned artifacts as a normal user release.


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

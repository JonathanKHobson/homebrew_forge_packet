# 05 — CI and Smoke Test Matrix

Generated date: 2026-06-08
Research horizon: External technical/product research and branch review for Homebrew Forge desktop delivery as of 2026-06-08.
Repository freshness caveat: Primary repo evidence comes from `https://github.com/JonathanKHobson/homebrew_forge_packet/tree/codex/shared-delivery-runtime`. Local code may be ahead; treat file-target guidance as branch-grounded, not a guarantee of local state.
Scope: No implementation, no local machine access, no code changes. This packet critiques architecture, runtime, packaging, CI, security, and migration safety for preserving one shared Homebrew Forge product UI across web, macOS desktop, and Windows desktop.
Confidence summary: High on architecture gates, Electron security posture, Vite middleware limitation, packaging/signing sequencing, and CI categories. Medium on exact package-version behavior until clean installs run on macOS x64/arm64 and Windows. Low on long-term user-data project migration until product-owner decisions are made.


## 1. Test strategy

The CI strategy should prove three things:

1. **Shared product UI:** web and desktop load the same `packages/editor` app.
2. **Shared runtime contract:** `/api/*` behaves identically through Vite dev and standalone runtime-service.
3. **Platform resilience:** macOS Intel, macOS Apple Silicon, and Windows can launch, read/write local data, survive port collision, and shut down cleanly.

## 2. Runner matrix

GitHub-hosted runner docs list Windows, macOS Intel, and macOS arm64 labels; available specs can vary by public/private repo and plan. Source: https://docs.github.com/en/actions/reference/runners/github-hosted-runners

| Lane | Runner | Purpose | Required before cutover? |
|---|---|---|---:|
| Web baseline | `ubuntu-latest` | Fast install/typecheck/build/test/runtime smoke. | Yes |
| Web Windows install | `windows-latest` | pnpm install, TypeScript, path handling, runtime smoke. | Yes |
| macOS Intel | `macos-15-intel` or available Intel label | x64 launch/build smoke. | Yes for Intel support |
| macOS arm64 | `macos-latest` / arm64 label available to repo | Apple Silicon smoke. | Yes for arm64 support |
| Windows desktop | `windows-latest` | Electron launch smoke, runtime child, save round-trip. | Yes before Windows parity claim |
| Packaging later | macOS + Windows | DMG/ZIP/NSIS artifact production. | Later |

## 3. CI stages

### Stage A — Dependency and supply-chain gate

| Check | Command / behavior | Why |
|---|---|---|
| Lockfile/install | `node .tools/pnpm/bin/pnpm.cjs install --frozen-lockfile` | Prove clean install. |
| pnpm build scripts | Verify `allowBuilds` explicitly lists approved native/script packages only. | pnpm v11 uses `allowBuilds`; avoid blanket script execution. Source: https://pnpm.io/cli/approve-builds |
| No blanket build approval | Fail if `dangerouslyAllowAllBuilds` appears. | pnpm warns this runs all current/future dependency install scripts. Source: https://pnpm.io/settings |
| TypeScript portability | `pnpm exec tsc --version` and repo typecheck on Windows/macOS. | Repo pins TypeScript `6.0.3`; verify clean-platform resolution. |
| Electron dependency gate | Only after approval: verify Electron binary resolves under `packages/desktop`. | Avoid unreviewed postinstall/download surprises. |

### Stage B — Existing app baseline

| Check | Command | Required |
|---|---|---:|
| Root build | `node .tools/pnpm/bin/pnpm.cjs build` | Yes |
| Root typecheck | `node .tools/pnpm/bin/pnpm.cjs typecheck` | Yes |
| Root test | `node .tools/pnpm/bin/pnpm.cjs test` | Yes |
| UX gate | `node .tools/pnpm/bin/pnpm.cjs test:ux-gate` | Yes if UI touched |
| Editor build | `node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor build` | Yes |
| Editor test | `node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor test` | Yes |

### Stage C — Runtime-service smoke

| Test ID | Test | Expected |
|---|---|---|
| RT-001 | Standalone runtime boots | Process starts on 127.0.0.1. |
| RT-002 | `/api/health` | Returns app label, delivery mode, repo/project root, port, PID, startedAt. |
| RT-003 | `/api/version` | Returns matching API/editor/forge/runtime build IDs. |
| RT-004 | `/api/library` | Returns expected DEMO/SQM/project data. |
| RT-005 | `/api/project?set=DEMO` | Returns card data and variant structure. |
| RT-006 | Save round-trip | Modify fixture copy, save, reload, diff expected CSV/JSON. |
| RT-007 | Port collision | Occupy 5177; runtime selects another port and reports it. |
| RT-008 | Shutdown cleanup | Stop process; confirm no listener remains. |
| RT-009 | Path-with-spaces | Run fixture repo path containing spaces. |
| RT-010 | Outside asset path | `/api/asset` refuses path outside project/root. |

Node docs support testing `EADDRINUSE` and OS-selected unused ports via `server.listen(0)`. Source: https://nodejs.org/api/net.html

### Stage D — Web parity

| Test ID | Test | Expected |
|---|---|---|
| WEB-001 | Vite dev starts | Existing editor dev path still works. |
| WEB-002 | Same API contract | Same route fixtures pass through Vite adapter. |
| WEB-003 | Relative API calls | No hard-coded port or origin in UI fetches. |
| WEB-004 | Save round-trip | Web save writes same files as runtime-service. |
| WEB-005 | HMR/dev unchanged | Vite dev remains fast and usable. |

### Stage E — Electron shell smoke

Playwright has experimental Electron automation support and can launch an Electron app, get the first window, evaluate main-process state, screenshot, interact, and close. Source: https://playwright.dev/docs/api/class-electron

| Test ID | Test | Expected |
|---|---|---|
| EL-001 | Launch Electron | App opens one BrowserWindow. |
| EL-002 | Loads selected runtime origin | Window URL is `http://127.0.0.1:<selected-port>/`. |
| EL-003 | No Chrome | No Chrome app-mode process used as success proof. |
| EL-004 | Runtime child owned | Desktop health includes child PID/parent PID. |
| EL-005 | Security prefs | BrowserWindow uses context isolation, no Node integration, sandbox. |
| EL-006 | Navigation lock | Attempts to navigate external URL are blocked or externalized. |
| EL-007 | Native menu registry | Native menu IDs match shared command registry IDs. |
| EL-008 | Save round-trip | Same save fixture passes in desktop. |
| EL-009 | Child killed | Window shows retry/error, not blank screen. |
| EL-010 | App quit cleanup | Runtime child stops; no listener remains. |

### Stage F — Packaging smoke later

| Platform | Artifact | Smoke |
|---|---|---|
| macOS x64 | DMG/ZIP or unpacked app | Launch, `/api/health`, DEMO load, save fixture, quit cleanup. |
| macOS arm64 | DMG/ZIP or unpacked app | Same as x64. |
| Windows x64 | NSIS/unpacked app | Install/unpack, launch, APPDATA config, save fixture, quit cleanup. |

## 4. Workflow proposal

```yaml
name: desktop-runtime-parity

on:
  pull_request:
  push:
    branches:
      - codex/shared-delivery-runtime

jobs:
  web-runtime:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - checkout
      - setup-node
      - pnpm install --frozen-lockfile
      - pnpm typecheck
      - pnpm build
      - pnpm test
      - runtime smoke

  mac-desktop-smoke:
    strategy:
      matrix:
        os: [macos-15-intel, macos-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - checkout
      - setup-node
      - pnpm install --frozen-lockfile
      - desktop typecheck/build
      - electron smoke

  win-desktop-smoke:
    runs-on: windows-latest
    steps:
      - checkout
      - setup-node
      - pnpm install --frozen-lockfile
      - desktop typecheck/build
      - electron smoke
```

## 5. Smoke-fixture design

Use a copied fixture directory instead of live repo data:

```text
tmp/forge-ci-fixture path with spaces/
  sets/DEMO/
  decks/demo-showcase/
  collections/demo-reference/
  reference/
  assets/
```

Why: CI must prove saves/exports without mutating tracked data.

## 6. No-drift tests

| Test | Mechanism |
|---|---|
| No product UI in desktop | Fail if `packages/desktop` imports `packages/editor/src/components`, CSS, workspace views, or renderer components. |
| Shared commands | Snapshot command registry and compare web menu/native menu IDs. |
| API parity | Run same route fixture suite against Vite adapter and standalone runtime. |
| Security preferences | Static test BrowserWindow config and runtime navigation guard. |
| No `file://` | E2E asserts window URL starts with selected `http://127.0.0.1:` origin. |
| No hard-coded Mac path | Test config with temporary repo root and Windows-style path fixture. |


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

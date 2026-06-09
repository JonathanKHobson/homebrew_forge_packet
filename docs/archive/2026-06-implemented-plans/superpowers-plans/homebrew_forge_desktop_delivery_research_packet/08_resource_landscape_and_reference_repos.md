---
status: archived
lane: desktop
type: research
archived: 2026-06-09
---
> **ARCHIVED 2026-06-09 (implemented-plans sweep)** — original path: `docs/superpowers/plans/homebrew_forge_desktop_delivery_research_packet/08_resource_landscape_and_reference_repos.md`
> Reason: completed desktop-delivery research packet; delivery shipped (cutover 2026-06-08).
> Index: `docs/cowork/02_repo_archive_manifest.md` + `docs/64_repo_cleanup_archive_index.md`.

# 08 — Resource Landscape and Reference Repos

Generated date: 2026-06-08
Research horizon: External technical/product research and branch review for Homebrew Forge desktop delivery as of 2026-06-08.
Repository freshness caveat: Primary repo evidence comes from `https://github.com/JonathanKHobson/homebrew_forge_packet/tree/codex/shared-delivery-runtime`. Local code may be ahead; treat file-target guidance as branch-grounded, not a guarantee of local state.
Scope: No implementation, no local machine access, no code changes. This packet critiques architecture, runtime, packaging, CI, security, and migration safety for preserving one shared Homebrew Forge product UI across web, macOS desktop, and Windows desktop.
Confidence summary: High on architecture gates, Electron security posture, Vite middleware limitation, packaging/signing sequencing, and CI categories. Medium on exact package-version behavior until clean installs run on macOS x64/arm64 and Windows. Low on long-term user-data project migration until product-owner decisions are made.


## 1. Purpose

This file collects free, public sources, repositories, tools, and scripts that can speed the Homebrew Forge desktop transition without cloning a mismatched product architecture. Treat these as references and inspiration, not templates to copy wholesale.

## 2. External technical landscape

| Resource | Category | Use for Homebrew Forge | Adopt / adapt / avoid | Confidence |
|---|---|---|---|---:|
| Electron security checklist | Official docs | Security baseline for BrowserWindow, IPC, navigation, local content, and renderer isolation. | Copy requirements. | High |
| Electron code signing docs | Official docs | Clarifies signing expectations for distributed Electron apps. | Adopt later. | High |
| Vite v4 plugin API | Official docs | Evidence that `configureServer` is dev-server-specific and not production build API. | Copy lesson: extract runtime. | High |
| Vite middleware mode / SSR docs | Official docs | Shows Vite can be used as middleware in dev, which supports adapter architecture. | Adapt. | High |
| Node `net` API | Official docs | Port resilience, `EADDRINUSE`, OS-assigned free ports. | Adopt. | High |
| Node `child_process` API | Official docs | Runtime child process ownership and shutdown behavior. | Adopt carefully. | High |
| electron-builder docs/repo | Packaging tool | macOS/Windows/Linux packaging, NSIS, update metadata. | Adopt later. | High |
| Apple Developer ID | Official docs | macOS signing/notarization requirements. | Adopt in packaging phase. | High |
| GitHub-hosted runners | Official docs | macOS Intel/arm64 and Windows CI matrix design. | Adopt. | High |
| Playwright Electron | Official docs | Electron smoke tests; launch, inspect first window, screenshot, close. | Adapt; note experimental. | Medium-high |
| pnpm approve-builds/settings | Official docs | Manage Electron postinstall/build-script approval. | Copy safety posture. | High |
| Tauri architecture/commands/sidecars/security | Official docs | Later shell alternative evaluation. | Defer; use as comparator. | Medium |

## 3. Helpful free repositories

| Repository | What it offers | How to use it | What not to copy |
|---|---|---|---|
| `electron/minimal-repro` | Official minimal Electron repro template; shows basic main/renderer/preload structure. Source: https://github.com/electron/minimal-repro | Use for tiny reproductions of Electron lifecycle/security issues. | Do not use as product architecture; it is intentionally minimal. |
| `electron-userland/electron-builder` | Packaging and update tooling for Electron apps on macOS/Windows/Linux. Source: https://github.com/electron-userland/electron-builder | Use docs/config examples after runtime is stable. | Do not start packaging before runtime extraction. |
| `alex8088/electron-vite` | Electron build tooling based on Vite with defaults for main/preload/renderer. Source: https://github.com/alex8088/electron-vite | Inspect for build-pipeline inspiration if desktop package build becomes awkward. | Do not replace Homebrew Forge’s runtime-service architecture or move product UI. |
| `reZach/secure-electron-template` | Security-oriented Electron template. Source: https://github.com/reZach/secure-electron-template | Inspect preload/IPC/security patterns and docs. | Do not import its Redux/webpack/product structure. |
| `tauri-apps/tauri` | Rust/WebView desktop framework. Source: https://github.com/tauri-apps/tauri | Keep as future shell alternative after runtime-service contract exists. | Do not rewrite runtime into Rust during first migration. |
| `tauri-apps/tauri/examples` | Examples for commands, isolation, multiwindow, resources, splashscreen, state. Source: https://github.com/tauri-apps/tauri/tree/dev/examples | Use later if a Tauri spike is approved. | Do not let examples define current Node API architecture. |

## 4. Product/architecture analogs

| Analog | Useful pattern | Homebrew Forge mapping |
|---|---|---|
| VS Code / Electron-style IDEs | Web UI inside desktop shell, command palette, native menus, extension/runtime separation. | Shared command registry; shell owns native concerns only. |
| Figma-like creator tools | One product model across web/desktop, command palette, canvas-first workflows. | Editor SPA remains product source; desktop is delivery shell. |
| Google Docs/Sheets-style local web app mode | Browser-first productivity with reliable save/status indicators. | Preserve web mode and relative API contract. |
| Photoshop-style pro editors | Native-feeling shell with dense panels, tool modes, keyboard shortcuts. | Use native menus only through shared commands; no separate desktop UI. |
| Local-first developer tools | Runtime service + local data + status health panels. | `/api/health`, `/api/version`, Workspace Health, logs, recovery. |

## 5. Free scripts/tools to coalesce

| Tool/script idea | Source/inspiration | How it helps |
|---|---|---|
| `desktop-delivery-toolchain-check.mjs` | Already in branch docs. | Keep; extend to CI-friendly JSON output. |
| Runtime route inventory generator | Repo route inventory plan + `editorApiPlugin.ts`. | Speeds extraction; flags file writes/security-sensitive routes. |
| Port collision smoke | Node `net` API docs. | Proves busy 5177 does not brick app. |
| Orphan process smoke | Node `child_process` docs. | Proves Electron quits runtime child. |
| Electron security static check | Electron security checklist. | Fails CI on unsafe BrowserWindow config. |
| Command registry snapshot | Repo shared-command requirement. | Prevents menu/shortcut drift. |
| Playwright Electron smoke | Playwright Electron docs. | Launch window, assert URL/title, screenshot, close. |
| pnpm approve-builds audit | pnpm docs. | Keeps Electron postinstall approvals explicit. |
| GitHub Actions runner matrix | GitHub runner docs. | Proves macOS x64, macOS arm64, Windows lanes separately. |
| Release artifact hash manifest | electron-builder update metadata concept. | Ensures Mac/Windows artifacts map to one commit. |

## 6. Adopt / adapt / avoid

### Copy directly

- Electron security checklist items: no Node integration, context isolation, sandbox, validated IPC, navigation lock, no `file://`.
- Vite lesson: dev middleware is not production runtime.
- pnpm rule: approve build scripts explicitly.
- CI rule: test on actual OS runner, especially Windows.
- Runtime health/version concept: make compatibility visible and machine-readable.

### Adapt

- electron-builder packaging examples.
- electron-vite build separation for main/preload/renderer, if useful.
- secure-electron-template preload/IPC guard patterns.
- Tauri command/sidecar concepts for future alternative shell evaluation.
- Electron minimal repros for isolated bug reports.

### Avoid

- Copying a desktop boilerplate into `packages/editor`.
- Moving product UI into `packages/desktop`.
- Replacing the runtime-service plan with a bundler template.
- Loading packaged SPA through `file://`.
- Using `dangerouslyAllowAllBuilds`.
- Treating unsigned/unnotarized builds as normal user releases.
- Making Windows support a documentation promise without CI smoke.

## 7. Tauri as future option

Tauri’s strengths are real: smaller apps, OS WebView usage, and a strong permission/capability model. Tauri docs describe a Rust core with frontend calls into Rust commands and sidecar binaries that must be target-triple suffixed for each architecture. That makes it a poor first move while Homebrew Forge still needs to extract a large Node/TypeScript API from Vite. Sources: https://v2.tauri.app/concept/architecture/, https://v2.tauri.app/develop/calling-rust/, https://v2.tauri.app/develop/sidecar/

Recommendation: **treat runtime-service extraction as shell-agnostic groundwork.** After that, a Tauri spike can compare: app footprint, sidecar complexity, Windows behavior, command parity, and packaging effort.

## 8. Electron as first shell

Electron’s strengths for this repo:

- It fits the existing TypeScript/Node/React stack.
- It can own only app lifecycle/window/menu/runtime process while the editor UI stays shared.
- It can launch a local runtime child process and load `http://127.0.0.1:<port>/`.
- electron-builder has direct macOS and Windows packaging paths.
- Playwright can smoke-test Electron windows.

Electron’s main costs:

- Larger app footprint.
- Security foot-guns if Node leaks into renderer.
- Signing/notarization/update complexity.
- Need for strict CI to prevent desktop-specific UI drift.

Recommendation: **Electron first, shell-only, after runtime-service proof.**

## 9. Resource shortlist for dev handoff

1. Read Electron security checklist before creating `BrowserWindow`: https://www.electronjs.org/docs/latest/tutorial/security
2. Read Vite v4 `configureServer` docs before extracting routes: https://v4.vitejs.dev/guide/api-plugin.html
3. Use Node `net` docs for port fallback: https://nodejs.org/api/net.html
4. Use Node `child_process` docs for runtime ownership: https://nodejs.org/api/child_process.html
5. Use Playwright Electron docs for smoke tests: https://playwright.dev/docs/api/class-electron
6. Use pnpm approve-builds before Electron install: https://pnpm.io/cli/approve-builds
7. Use GitHub runner docs for OS matrix: https://docs.github.com/en/actions/reference/runners/github-hosted-runners
8. Use electron-builder multi-platform/update docs after runtime green: https://www.electron.build/multi-platform-build.html and https://www.electron.build/auto-update.html
9. Use Apple Developer ID docs before distribution: https://developer.apple.com/developer-id/
10. Keep Tauri docs as later comparator: https://v2.tauri.app/


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

---
status: archived
lane: desktop
type: research
archived: 2026-06-09
---
> **ARCHIVED 2026-06-09 (implemented-plans sweep)** — original path: `docs/superpowers/plans/homebrew_forge_desktop_delivery_research_packet/00_packet_index.md`
> Reason: completed desktop-delivery research packet; delivery shipped (cutover 2026-06-08).
> Index: `docs/cowork/02_repo_archive_manifest.md` + `docs/64_repo_cleanup_archive_index.md`.

# Homebrew Forge Desktop Delivery Research Packet

Generated date: 2026-06-08
Research horizon: External technical/product research and branch review for Homebrew Forge desktop delivery as of 2026-06-08.
Repository freshness caveat: Primary repo evidence comes from `https://github.com/JonathanKHobson/homebrew_forge_packet/tree/codex/shared-delivery-runtime`. Local code may be ahead; treat file-target guidance as branch-grounded, not a guarantee of local state.
Scope: No implementation, no local machine access, no code changes. This packet critiques architecture, runtime, packaging, CI, security, and migration safety for preserving one shared Homebrew Forge product UI across web, macOS desktop, and Windows desktop.
Confidence summary: High on architecture gates, Electron security posture, Vite middleware limitation, packaging/signing sequencing, and CI categories. Medium on exact package-version behavior until clean installs run on macOS x64/arm64 and Windows. Low on long-term user-data project migration until product-owner decisions are made.


## Packet contents

| File | Purpose |
|---|---|
| `01_executive_verdict_risks.md` | Verdict, ranked risks, and go/no-go conditions. |
| `02_revised_architecture_delivery_model.md` | Proposed runtime + desktop architecture, single-origin model, and Electron vs Tauri critique. |
| `03_phase_roadmap_gates.md` | Migration roadmap with gates and reversible cutover logic. |
| `04_plan_changes_file_targets.md` | Concrete modifications by repo file/package target. |
| `05_ci_test_matrix.md` | CI and smoke matrix for web, macOS x64, macOS arm64, and Windows. |
| `06_packaging_signing_update_strategy.md` | macOS/Windows packaging, signing, notarization, and future update strategy. |
| `07_open_decisions.md` | Human approval decisions required before implementation and cutover. |
| `08_resource_landscape_and_reference_repos.md` | External product/technical landscape, free repos, sources, and tools to speed the transition. |

## Executive verdict

**Conditional approve.** The proposed plan is directionally right and unusually well-defended against product mismatch: `packages/editor` stays the only product UI, `packages/forge` stays the domain/data/runtime source, web mode remains usable, desktop work happens in a separate worktree, and the Chrome shim remains a fallback. The condition is strict: **do not scaffold or package Electron as a “real app” until `/api/*` has an embeddable runtime-service home outside Vite middleware.**

## Decision summary

- **Approve** Phase 0 planning, backups, route inventory, runtime extraction, and parity test design.
- **Approve** Electron-first as the first desktop shell for this repo, because the current app is already TypeScript/Node/React and has local file-backed API routes.
- **Defer** Tauri to a later architecture spike after runtime extraction, not before, because Tauri would add a Rust boundary/sidecars around a Node-heavy local runtime.
- **Block** installer, signing, auto-update, and Chrome-shim replacement until runtime health, port resilience, save round-trip, shutdown cleanup, and web/desktop parity pass.

## Explicit facts vs inferences

**Known repo facts:** The branch documents one shared UI for web/macOS/Windows, identifies Vite-owned `/api/*` as the first gate, and preserves Chrome as fallback until green-pass cutover.

**External facts:** Electron’s security guidance recommends disabling Node integration, enabling context isolation and sandboxing, limiting navigation, validating IPC senders, and avoiding `file://` for local content. Vite v4’s `configureServer` hook is dev-server-specific and is not called in production builds. electron-builder supports macOS/Windows/Linux packaging and auto-update metadata; macOS auto-update requires signed apps; Windows auto-updatable default target is NSIS.

**Inferences:** Electron is the best first shell only if it remains a shell, not a second UI or API owner. A user-data project model is strategically better but should not be smuggled into the first local-dev desktop milestone.


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

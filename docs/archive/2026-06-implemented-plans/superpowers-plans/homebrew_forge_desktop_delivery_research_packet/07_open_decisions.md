---
status: archived
lane: desktop
type: research
archived: 2026-06-09
---
> **ARCHIVED 2026-06-09 (implemented-plans sweep)** — original path: `docs/superpowers/plans/homebrew_forge_desktop_delivery_research_packet/07_open_decisions.md`
> Reason: completed desktop-delivery research packet; delivery shipped (cutover 2026-06-08).
> Index: `docs/cowork/02_repo_archive_manifest.md` + `docs/64_repo_cleanup_archive_index.md`.

# 07 — Open Decisions Requiring Human Approval

Generated date: 2026-06-08
Research horizon: External technical/product research and branch review for Homebrew Forge desktop delivery as of 2026-06-08.
Repository freshness caveat: Primary repo evidence comes from `https://github.com/JonathanKHobson/homebrew_forge_packet/tree/codex/shared-delivery-runtime`. Local code may be ahead; treat file-target guidance as branch-grounded, not a guarantee of local state.
Scope: No implementation, no local machine access, no code changes. This packet critiques architecture, runtime, packaging, CI, security, and migration safety for preserving one shared Homebrew Forge product UI across web, macOS desktop, and Windows desktop.
Confidence summary: High on architecture gates, Electron security posture, Vite middleware limitation, packaging/signing sequencing, and CI categories. Medium on exact package-version behavior until clean installs run on macOS x64/arm64 and Windows. Low on long-term user-data project migration until product-owner decisions are made.


## 1. Decisions before implementation

| ID | Decision | Recommendation | Why it matters | Approval needed from | Confidence |
|---|---|---|---|---|---:|
| D-01 | Is M0-M3 explicitly repo-required local-dev mode? | Yes. Label it clearly. | Prevents accidental promise of non-technical redistributable app. | Product owner | High |
| D-02 | Should user-data project mode be designed now? | No; defer to productization phase. | Avoids path/data migration during runtime extraction. | Product owner | Medium-high |
| D-03 | Is Electron-first approved after runtime extraction? | Yes, conditional. | Best short-term fit for Node/React app; Tauri later. | Product owner + engineering | Medium-high |
| D-04 | Should Tauri get a pre-Electron spike? | No, not before runtime-service proof. | Adds Rust/sidecar boundary before API is extracted. | Product owner + engineering | Medium |
| D-05 | Should runtime require per-session token? | Decide before partner preview. | Localhost is safer than LAN binding, but other local processes can still make requests. | Product owner + engineering | Medium |
| D-06 | What counts as Windows parity? | Clean install + runtime smoke + Electron smoke + save round-trip + path-with-spaces. | Partner uses Windows; parity must be proved, not assumed. | Product owner | High |
| D-07 | macOS artifacts: universal or split? | Split first, universal later if both arch lanes pass. | Isolates architecture failures. | Product owner + engineering | Medium-high |
| D-08 | Signing/notarization account | Defer until packaging phase; keep credentials out of repo. | Required for trustworthy distribution. | Product owner | High |
| D-09 | Update channel | Manual GitHub Releases first; auto-update later. | Avoid bricking local app during migration. | Product owner | High |
| D-10 | Default launcher cutover | Only after Kyle manual confirmation and CI green gates. | Preserves working app. | Product owner | High |

## 2. Decisions before Electron dependency install

| Decision | Needed evidence | Blocker if unresolved |
|---|---|---|
| Approved Electron version | Registry probe, security status, compatibility with Node/React/Vite setup. | Do not install Electron. |
| Approved electron-builder version | Registry probe and packaging target fit. | Do not add packaging config. |
| pnpm allowBuilds entries | `pnpm approve-builds` output reviewed. | Clean installs may fail or unsafe scripts may run. |
| TypeScript pin portability | `typescript@6.0.3` resolves on macOS and Windows clean install. | Windows packaging claims blocked. |
| Runtime-service route inventory | All routes cataloged and fixture-mapped. | Do not scaffold desktop shell. |

pnpm docs say `pnpm approve-builds` adds approved packages to `allowBuilds`, and pnpm warns against enabling all build scripts with `dangerouslyAllowAllBuilds`. Sources: https://pnpm.io/cli/approve-builds and https://pnpm.io/settings

## 3. Decisions before Chrome shim replacement

| Decision | Recommended criterion |
|---|---|
| Web fallback health | Existing `editor` script still works in original repo path. |
| Runtime health | `/api/health` and `/api/version` pass in runtime-service and desktop. |
| Port resilience | Busy 5177 fallback works. |
| Process ownership | Electron quit cleans runtime child. |
| macOS x64 | Intel smoke passed. |
| macOS arm64 | Apple Silicon smoke passed. |
| Windows | `windows-latest` runtime + desktop smoke passed or explicit deferral accepted. |
| Manual confirmation | Kyle has opened and used desktop mode successfully. |

## 4. Decisions before packaging

| Decision | Recommendation |
|---|---|
| Packaging target | macOS DMG/ZIP, Windows NSIS. |
| Artifact architecture | Split x64/arm64 first; universal after confidence. |
| Signing | Developer ID for macOS; Windows signing later before broad distribution. |
| Notarization | Required before normal Mac distribution. |
| Update metadata | Only from same commit as artifacts. |
| Release notes | Required for partner-preview and stable. |
| Rollback | Preserve manual download path and prior artifact link. |

Apple says Gatekeeper checks Developer ID for apps outside the Mac App Store and that notarization scans Developer ID-signed software. Source: https://developer.apple.com/developer-id/

## 5. Decisions before auto-update

| Decision | Recommendation |
|---|---|
| Release provider | GitHub Releases unless a different explicit signed channel is chosen. |
| Update UX | Manual “Check for updates” first; background auto-download later. |
| Update scope | Desktop shell, runtime, editor, forge must update as one versioned unit. |
| Rollback UX | Keep old artifact available and document downgrade steps. |
| Channel names | `partner-preview`, `signed-preview`, `stable`. |
| Secrets | Signing/update secrets stay in CI secrets, never in repo. |

electron-builder auto-update requires release metadata and macOS signing for auto-update; Windows auto-updatable target is NSIS. Source: https://www.electron.build/auto-update.html

## 6. Skeptical questions to answer before code

1. Which routes in `editorApiPlugin.ts` are truly pure runtime routes and which depend on Vite dev assumptions?
2. What route currently causes the most preview/render latency, and will extraction improve or worsen it?
3. If 5177 is occupied, is it better UX to auto-select a free port or ask the user? Recommendation: auto-select and show status.
4. Should `/api/*` accept requests only with a runtime token? Recommendation: yes before partner-preview if feasible.
5. How should desktop choose a repo root on first launch? Recommendation: config file plus “Choose repo” native dialog later.
6. What happens when the repo path moves? Recommendation: detect missing repoRoot and show recovery UI.
7. What does “same UI” mean mechanically? Recommendation: no components/CSS/routes in desktop; command registry snapshot parity test.
8. Is Windows support a release gate or a documented deferral? Recommendation: gate before replacing Chrome as default.


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

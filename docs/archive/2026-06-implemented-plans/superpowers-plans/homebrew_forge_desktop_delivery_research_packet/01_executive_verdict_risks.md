---
status: archived
lane: desktop
type: research
archived: 2026-06-09
---
> **ARCHIVED 2026-06-09 (implemented-plans sweep)** — original path: `docs/superpowers/plans/homebrew_forge_desktop_delivery_research_packet/01_executive_verdict_risks.md`
> Reason: completed desktop-delivery research packet; delivery shipped (cutover 2026-06-08).
> Index: `docs/cowork/02_repo_archive_manifest.md` + `docs/64_repo_cleanup_archive_index.md`.

# 01 — Executive Verdict and Ranked Risks

Generated date: 2026-06-08
Research horizon: External technical/product research and branch review for Homebrew Forge desktop delivery as of 2026-06-08.
Repository freshness caveat: Primary repo evidence comes from `https://github.com/JonathanKHobson/homebrew_forge_packet/tree/codex/shared-delivery-runtime`. Local code may be ahead; treat file-target guidance as branch-grounded, not a guarantee of local state.
Scope: No implementation, no local machine access, no code changes. This packet critiques architecture, runtime, packaging, CI, security, and migration safety for preserving one shared Homebrew Forge product UI across web, macOS desktop, and Windows desktop.
Confidence summary: High on architecture gates, Electron security posture, Vite middleware limitation, packaging/signing sequencing, and CI categories. Medium on exact package-version behavior until clean installs run on macOS x64/arm64 and Windows. Low on long-term user-data project migration until product-owner decisions are made.


## 1. Executive verdict

**Conditional approve.**

Approve the current migration plan only through the runtime/API extraction and bounded Electron proof-of-concept. **Do not treat the desktop app as real, distributable, or ready to replace the Chrome shim until the runtime-service can serve both the built editor SPA and `/api/*` from one local origin, outside Vite dev mode.**

### Why this is the right verdict

| Evidence type | Finding | Confidence |
|---|---|---:|
| Repo fact | The branch already states `packages/editor` is the shared product UI for web, macOS, and Windows, while desktop may own only shell concerns. | High |
| Repo fact | The branch explicitly says `/api/*` currently lives in Vite middleware and packaged desktop is not real until an embeddable runtime service exists. | High |
| External fact | Vite v4 says `configureServer` is for adding middlewares to the dev server and is **not called during production build**. This supports the plan’s “extract before desktop” gate. Source: https://v4.vitejs.dev/guide/api-plugin.html | High |
| External fact | Electron security guidance recommends `contextIsolation`, `nodeIntegration: false`, sandboxing, restricted navigation, validated IPC, and avoiding `file://`. Source: https://www.electronjs.org/docs/latest/tutorial/security | High |
| Inference | Electron is the best first shell for this repo because it can preserve the existing TypeScript/Node runtime boundary with less rewrite risk than Tauri. | Medium-high |
| Inference | Tauri may become attractive later for smaller app footprint, but only after the Node runtime boundary is explicit enough to wrap as commands or sidecars. | Medium |

## 2. Go / no-go decision

| Area | Decision | Rationale | Confidence |
|---|---|---|---:|
| Runtime extraction | **Go** | Required before packaged desktop; branch already identifies this as the load-bearing gate. | High |
| Electron-first shell | **Go, after runtime-service proof** | Best fit for Node-heavy local runtime and shared React UI, provided Electron stays shell-only. | Medium-high |
| Tauri-first rewrite | **No-go now** | Tauri uses a Rust core and frontend-to-Rust command IPC; sidecar binaries must be target-triple suffixed per architecture, increasing complexity for a Node-first codebase. Sources: https://v2.tauri.app/develop/calling-rust/ and https://v2.tauri.app/develop/sidecar/ | Medium |
| Chrome shim removal | **No-go until green-pass cutover** | Current fallback protects the working web app; branch requires Chrome fallback until desktop is proven stable. | High |
| Packaging/signing/auto-update | **No-go until M5+** | Apple/Electron docs show signing/notarization and updater metadata are distribution concerns, not runtime-spike prerequisites. Sources: https://developer.apple.com/developer-id/ and https://www.electron.build/auto-update.html | High |

## 3. Top risks ranked by severity and probability

| Rank | Risk | Severity 1–5 | Probability 1–5 | Why it matters | Mitigation / gate | Confidence |
|---:|---|---:|---:|---|---|---:|
| 1 | Vite middleware remains the hidden API owner | 5 | 4 | Packaged desktop cannot rely on `configureServer`; production build will not call that hook. | Create route inventory; extract handlers into `packages/runtime-service`; keep Vite as an adapter only. | High |
| 2 | Product UI drift between web and desktop | 5 | 3 | Separate menus, commands, native dialogs, or desktop-only screens would violate the non-negotiable shared UI contract. | Shared command registry; `packages/desktop` static test forbidding product screens/CSS/routes. | High |
| 3 | Port collision bricks app or opens wrong server | 5 | 3 | Current launcher can exit if port 5177 is occupied; Node docs identify `EADDRINUSE` as common and port 0 can request an arbitrary unused port. Source: https://nodejs.org/api/net.html | Prefer 5177; fallback to selected free port; reflect selected port in `/api/health`; load renderer from selected origin. | High |
| 4 | Orphan runtime process after Electron quit | 5 | 3 | A local-first app with file writes must not leave stale API listeners or stale data writes after quit. | Electron owns child process; shutdown test verifies no listener remains; use `child_process.spawn`/kill semantics deliberately. Source: https://nodejs.org/api/child_process.html | High |
| 5 | Security regression from “quick” native file access | 5 | 3 | Enabling Node in renderer would turn every UI bug into local filesystem risk. | `contextIsolation:true`, `nodeIntegration:false`, `sandbox:true`; typed preload/IPC only; validate IPC sender. Source: https://www.electronjs.org/docs/latest/tutorial/security | High |
| 6 | Data model ambiguity blocks real distribution | 4 | 4 | A desktop app requiring a checked-out repo is useful for Kyle/local dev, but not a polished app for non-technical users. | Explicitly label M0-M3 as repo-required local-dev mode; defer user-data project model to productization phase. | High |
| 7 | Windows parity is asserted but not tested | 4 | 3 | macOS cannot prove Windows path, installer, process, and file-system behavior. | `windows-latest` CI; Windows path-with-spaces fixture; NSIS packaging dry run later. Source: https://docs.github.com/en/actions/reference/runners/github-hosted-runners | High |
| 8 | macOS x64/arm64 coverage is hand-waved | 4 | 3 | Partner machines include Intel and Apple Silicon; universal artifacts may hide arch-specific failures. | Test both GitHub macOS Intel and arm64 runners; choose universal only after split artifacts pass. Source: https://docs.github.com/en/actions/reference/runners/github-hosted-runners | High |
| 9 | pnpm install scripts blocked or over-approved | 4 | 3 | `pnpm-workspace.yaml` currently allowlists only `esbuild`; Electron packages often require install/build scripts. | Use `pnpm approve-builds`; explicitly allow only approved packages; never set `dangerouslyAllowAllBuilds`. Source: https://pnpm.io/cli/approve-builds and https://pnpm.io/settings | High |
| 10 | Auto-update before signing/release discipline | 4 | 2 | Updaters require metadata and signed macOS artifacts; premature auto-update creates support risk. | Manual release artifacts first; signed GitHub Releases channel later; build Mac/Windows from same commit. Source: https://www.electron.build/auto-update.html | High |
| 11 | `file://` temptation during packaged build | 4 | 2 | Electron docs warn against `file://`; same-origin localhost avoids CORS/CSP drift and keeps navigation lockable. | Serve built SPA and `/api/*` from `http://127.0.0.1:<selected-port>/`; no `file://`. Source: https://www.electronjs.org/docs/latest/tutorial/security | High |
| 12 | “Boilerplate copy” overwhelms existing architecture | 3 | 3 | electron-vite, Electron Forge, and secure templates are useful references but can introduce second UI/build assumptions. | Treat them as reference repos only; keep `packages/editor`/`packages/forge` ownership unchanged. | Medium-high |

## 4. Critical critique of the current proposed plan

### What is strong

- The plan correctly identifies runtime/API extraction as the first implementation gate.
- The plan protects current web usability through backups, a separate worktree, and Chrome fallback.
- The plan’s Electron security defaults match official Electron guidance.
- The one-origin strategy directly reduces CORS/CSP/API-client drift.
- The shared command registry is the right anti-drift mechanism for menus, shortcuts, command palette, and native menus.

### What is under-specified

- The route inventory needs to be mandatory and test-backed, not a documentation nicety.
- `/api/version` needs an API contract version, editor build hash, forge build hash, runtime build hash, delivery mode, repoRoot/projectRoot, selected port, and parent/child process metadata.
- The local API should likely require a random per-session token or equivalent localhost-origin guard before desktop becomes more than local-dev mode.
- The Windows gate should include path-with-spaces and process-cleanup tests before Mac replacement becomes default.
- Electron package install must be gated by pnpm allowBuilds review.

### What must not happen

- Do not create a desktop-specific product UI.
- Do not load the built SPA with `file://`.
- Do not let Electron renderer access Node directly.
- Do not make signing, notarization, or updater work part of the runtime extraction spike.
- Do not treat a Chrome process as proof that the app is healthy after desktop replacement.

## 5. Segment impact

| User segment | Positive impact if plan succeeds | Harm if plan fails |
|---|---|---|
| Card Maker | Reliable local authoring, preview, save, render, export without browser launcher fragility. | Lost edits, stuck preview, “app opens but API is stale.” |
| Deck Builder | Same Decks workspace across web and desktop; no divergent shortcuts or menus. | Deck save/export mismatch across delivery modes. |
| Collection Manager | Local file-backed collection and price snapshot workflows remain intact. | Path/data-root mistakes can corrupt or hide collection rows. |
| Partner on Windows | Shared product UI and behavior on Windows. | Mac-only assumptions create product mismatch and support burden. |


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

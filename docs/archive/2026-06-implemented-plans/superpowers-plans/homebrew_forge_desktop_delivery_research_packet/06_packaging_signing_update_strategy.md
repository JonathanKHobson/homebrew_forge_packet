---
status: archived
lane: desktop
type: research
archived: 2026-06-09
---
> **ARCHIVED 2026-06-09 (implemented-plans sweep)** — original path: `docs/superpowers/plans/homebrew_forge_desktop_delivery_research_packet/06_packaging_signing_update_strategy.md`
> Reason: completed desktop-delivery research packet; delivery shipped (cutover 2026-06-08).
> Index: `docs/cowork/02_repo_archive_manifest.md` + `docs/64_repo_cleanup_archive_index.md`.

# 06 — Packaging, Signing, and Update Recommendations

Generated date: 2026-06-08
Research horizon: External technical/product research and branch review for Homebrew Forge desktop delivery as of 2026-06-08.
Repository freshness caveat: Primary repo evidence comes from `https://github.com/JonathanKHobson/homebrew_forge_packet/tree/codex/shared-delivery-runtime`. Local code may be ahead; treat file-target guidance as branch-grounded, not a guarantee of local state.
Scope: No implementation, no local machine access, no code changes. This packet critiques architecture, runtime, packaging, CI, security, and migration safety for preserving one shared Homebrew Forge product UI across web, macOS desktop, and Windows desktop.
Confidence summary: High on architecture gates, Electron security posture, Vite middleware limitation, packaging/signing sequencing, and CI categories. Medium on exact package-version behavior until clean installs run on macOS x64/arm64 and Windows. Low on long-term user-data project migration until product-owner decisions are made.


## 1. Packaging verdict

Packaging is a **later phase**, not a proof-of-concept phase. The first credible desktop milestone is a shell that starts the runtime-service, loads the shared editor from one local origin, preserves web mode, and cleans up its runtime child. Packaging should not begin until that works on macOS and Windows smoke lanes.

## 2. macOS packaging

### Recommendation

Start with **split x64 and arm64 artifacts** for smoke testing. Move to a universal artifact only after both architecture-specific outputs pass launch, runtime, save, and shutdown checks.

| Choice | Pros | Cons | Recommendation |
|---|---|---|---|
| Split x64 + arm64 | Easier to isolate arch failures; smaller per-download; clear test result. | Two artifacts to manage. | Best first packaging lane. |
| Universal | Simpler user-facing artifact. | Can hide arch-specific failure until runtime; larger. | Use later if feasible. |

### Signing and notarization

- Local ad-hoc signing is acceptable only for local dev proof.
- Distributed macOS artifacts should be Developer ID signed and notarized.
- Apple states Gatekeeper checks Developer ID for apps distributed outside the Mac App Store and that notarization gives users more confidence by scanning Developer ID-signed software and assigning a notarization ticket. Source: https://developer.apple.com/developer-id/
- Electron also says macOS release builds require code signing and notarization. Source: https://www.electronjs.org/docs/latest/tutorial/code-signing

### macOS gates

| Gate | Required proof |
|---|---|
| M6 local app | Real Electron app opens; no Chrome; repoRoot configurable. |
| M8 packaged runtime | App runs without Vite dev server; built editor and `/api/*` from one origin. |
| M9 signing | Developer ID cert available; hardened runtime/entitlements reviewed; notarization passes. |
| M9 release | DMG/ZIP artifact from same commit as Windows release metadata. |

## 3. Windows packaging

### Recommendation

Use **electron-builder with NSIS** after runtime and desktop smoke are green.

- electron-builder describes itself as a packaging solution for Electron apps on macOS, Windows, and Linux with auto-update support. Source: https://github.com/electron-userland/electron-builder
- electron-builder’s auto-update docs list Windows NSIS as an auto-updatable target. Source: https://www.electron.build/auto-update.html
- Build and smoke on `windows-latest`; do not assume macOS-built Windows artifacts prove Windows runtime behavior. GitHub-hosted runner docs list Windows runners and macOS runners separately. Source: https://docs.github.com/en/actions/reference/runners/github-hosted-runners

### Windows gates

| Gate | Required proof |
|---|---|
| Runtime path | `%APPDATA%/Homebrew Forge/desktop-config.json` works. |
| Logs | `%LOCALAPPDATA%/Homebrew Forge/Logs` or chosen path works. |
| Installer | NSIS artifact installs/uninstalls cleanly. |
| Runtime | `/api/health`, `/api/version`, DEMO load, save round-trip pass. |
| Quit | Runtime child process stops; no orphan listener. |
| Signing later | Windows signing certificate and process chosen before external distribution. |

## 4. electron-builder usage

### Adopt

- Use `packages/desktop` as the package boundary.
- Keep packaging config close to `packages/desktop/package.json` or a dedicated `electron-builder.yml`.
- Produce artifacts from CI, not manual ad-hoc machines, once the architecture stabilizes.
- Cache Electron/electron-builder downloads in CI only after clean install works.
- Keep Mac and Windows release artifacts tied to one commit.

### Avoid

- Packaging while runtime still depends on Vite dev.
- Moving Electron dependencies into `packages/editor`.
- Signing/notarization secrets in repo.
- Auto-update without signing.
- Treating an unsigned app as a normal release artifact.

electron-builder warns not to expect reliable all-platform builds from one platform, especially with native dependencies; macOS code signing works only on macOS. Source: https://www.electron.build/multi-platform-build.html

## 5. Auto-update strategy

### Recommendation

Use **manual GitHub Releases first**, then add **signed GitHub Releases auto-update** after packaging and signing are proven.

| Stage | Behavior | Rationale |
|---|---|---|
| Stage 0 | No auto-update. | Avoid update failures during runtime migration. |
| Stage 1 | Manual GitHub Release downloads. | Human-controlled install; good for partner testing. |
| Stage 2 | Signed release channel with update metadata. | Only after macOS signing/notarization and Windows installer signing are stable. |
| Stage 3 | Optional staged rollout channel. | Only after support/rollback procedures exist. |

electron-builder auto-update works by building release metadata such as `latest.yml`, uploading release targets and metadata, and having the app query the publish server; macOS auto-update requires signed apps. Source: https://www.electron.build/auto-update.html

## 6. Package-manager concerns

| Concern | Branch evidence | External evidence | Recommendation |
|---|---|---|---|
| pnpm version | Repo pins `pnpm@11.5.0`. | pnpm v11 replaced older build-script settings with `allowBuilds`. | Use `pnpm approve-builds`; explicitly allow Electron packages only after review. |
| Current allowBuilds | Branch `pnpm-workspace.yaml` allowlists only `esbuild: true`. | pnpm says approved dependencies are added to `allowBuilds`. | Expect Electron install to need an allowBuilds update. |
| Dangerous build scripts | n/a | pnpm warns `dangerouslyAllowAllBuilds` lets all current/future dependencies run install scripts and recommends explicit review. | Never set `dangerouslyAllowAllBuilds`. |
| TypeScript pin | Repo pins `typescript: 6.0.3`. | No reliable external verification was obtained in this pass. | Verify `pnpm view typescript@6.0.3 version --silent` on macOS and Windows before packaging claims. |
| Electron postinstall/binaries | Repo has not installed Electron yet. | Electron packages require binary resolution/download in normal workflows. | Install only under `packages/desktop`, in migration branch, after route extraction proof. |
| Windows clean installs | Not yet proven. | Windows runner is available; Windows shell/path semantics differ. | Run clean install on `windows-latest`; test path with spaces. |

Sources: https://pnpm.io/cli/approve-builds and https://pnpm.io/settings

## 7. Data storage recommendation

### M0-M3: repo-required local-dev mode

Keep source-of-truth data in repo folders:

```text
sets/
decks/
collections/
reference/
assets/
output/
```

Use OS app-data only for desktop shell config, cache, logs, and updates:

```text
macOS:
~/Library/Application Support/Homebrew Forge/
~/Library/Logs/Homebrew Forge/

Windows:
%APPDATA%/Homebrew Forge/
%LOCALAPPDATA%/Homebrew Forge/
```

### Future: user-data project mode

Design later:

```text
Homebrew Forge Projects/
  <project>.forge/
    sets/
    decks/
    collections/
    reference/
    assets/
```

Do not move to this model without product-owner approval, migration tooling, backup/export semantics, and in-editor validation.

## 8. Release channel recommendation

| Channel | When | Notes |
|---|---|---|
| `local-dev` | M0-M6 | Repo-required; no signing required except local ad-hoc. |
| `partner-preview` | After M7 Windows smoke | Manual download/install; explicit risk label. |
| `signed-preview` | After M9 signing | Signed/notarized Mac, signed Windows if available. |
| `stable` | After repeated successful updates | Requires rollback docs and release notes discipline. |


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

# Shared Delivery Modes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert Homebrew Forge from a browser/Chrome-shim workflow into one shared local app delivered through web, macOS, and Windows modes without product mismatch.

**Architecture:** `packages/editor` remains the only product UI source of truth. `packages/forge` remains the domain/data/runtime source of truth. A future desktop package owns only desktop concerns: windows, menus, app lifecycle, local runtime startup, OS paths, packaging, and updates. Claude's pre-flight review identified the missing load-bearing layer: the local `/api/*` runtime must be extracted from Vite middleware before packaged desktop can be called real.

**Tech Stack:** React/Vite/TypeScript editor, Forge TypeScript domain package, Electron-first desktop shell for macOS and Windows, electron-builder for packaging after the shell proves stable. Tauri can be revisited later only if it preserves the shared UI/runtime contract with less maintenance cost.

---

## Claude Preflight Correction

**Verdict:** Conditional approve.

Approve planning and a bounded proof-of-concept only. Do not proceed to a real
Mac/Windows app replacement until the runtime/API ownership questions below are
answered with working code and tests.

### Do-Not-Proceed-Past-Phase-1 Blockers

1. **The local API currently has no home outside Vite dev.**
   `/api/*` routes are implemented through
   `packages/editor/src/server/editorApiPlugin.ts`, which is Vite middleware.
   A packaged desktop app cannot depend on Vite dev mode as its long-term API
   host. The runtime must become an embeddable local HTTP service that can run
   in both web/dev and desktop/packaged modes.

2. **Runtime ownership and port strategy are undefined.**
   `scripts/run-homebrew-forge-editor.mjs` currently uses preferred port `5177`
   with `strictPort: true`. The desktop architecture must define who owns the
   runtime process, how stale child processes are cleaned up, what happens when
   `5177` is busy, and how the renderer learns the selected port.

3. **The packaged-app data model is undecided.**
   Today, source data lives in the repo working tree: sets, decks, collections,
   references, and exports are file-first repo data. A packaged desktop app that
   still requires `repoRoot` is a local developer app, not a redistributable app
   for non-technical users. This must be explicit until a user-data project
   model is designed.

### Corrected Architecture Map

```text
packages/editor
  Product UI only. Shared by web, macOS desktop, and Windows desktop.

packages/forge
  Domain/data logic. CSV/YAML/JSON parsing, validation, renderer, exports,
  deck/collection/reference services.

packages/runtime-service        # planned extraction
  Embeddable local HTTP service for /api/* plus health/runtime metadata.
  Must run with Vite during web/dev and under desktop ownership in packaged mode.

packages/desktop
  Electron shell only. Owns window, app lifecycle, menu, runtime child process,
  OS paths, packaging, updates, and platform-specific shell behavior.
```

The desktop shell must not directly grow product UI or duplicate API logic.

### Revised Milestone Sequence

1. **M0: Runtime/API extraction spike.**
   Extract the Vite-coupled API into an embeddable service while preserving the
   existing `/api/*` contract. This is the critical-path prerequisite.

2. **M1: Electron local-dev shell.**
   Load the shared editor through the runtime service, show native loading/retry
   states, disable Chrome, auto-pick a port when `5177` is busy, and prove web
   mode still works.

3. **M2: macOS app replacement.**
   Replace the Chrome shim only after M1 proves the same editor opens in the
   desktop shell. The Codex stop hook becomes an optional repair/open helper,
   not the launcher architecture.

4. **M3: Packaged runtime.**
   Bundle built editor assets plus the embeddable runtime. Prove offline
   `/api/health`, `/api/library`, and `/api/project/DEMO`.

5. **M4: Windows parity.**
   Add Windows config/path handling and verify on a real `windows-latest` CI
   runner. Do not rely on macOS to produce trustworthy Windows artifacts.

6. **M5: Signing, notarization, installer, and auto-update.**
   Only after Mac and Windows packaged apps are stable from the same commit.

### Shared Command Registry Requirement

Menus, shortcuts, command palette actions, and native desktop menu items must
consume a shared command registry. Without that, Mac/Windows native menus will
drift from the web menu and recreate product mismatch.

Planned shared-command location:

```text
packages/editor/src/domain/commands.ts
```

Desktop `menu.ts` may map command IDs to native menus, but command labels,
enabled/disabled rules, destructive-action semantics, and keyboard shortcuts
must remain shared.

## Continuity, Backup, And Rollback Requirements

This migration must not block Kyle from using the current web app.

Before any runtime extraction or desktop implementation starts:

1. Create a local source/data backup.
2. Create an online GitHub backup branch or tag.
3. Move desktop/runtime work into a separate worktree or branch lane.
4. Keep the existing web launcher usable from the current repo path until the
   new desktop delivery passes the green-pass gates.

### Local Backup

Create a timestamped local backup outside the repo:

```bash
BACKUP_ROOT="/Users/kyle/Documents/My Games/Magic The Gathering/backups"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_ROOT"
rsync -a --delete \
  --exclude ".git" \
  --exclude "node_modules" \
  --exclude "packages/*/node_modules" \
  --exclude "output" \
  --exclude "output-live" \
  "/Users/kyle/Documents/My Games/Magic The Gathering/homebrew_forge_packet/" \
  "$BACKUP_ROOT/homebrew_forge_packet-pre-desktop-$STAMP/"
```

Also create a Git bundle of tracked history:

```bash
git bundle create "$BACKUP_ROOT/homebrew_forge_packet-pre-desktop-$STAMP.bundle" --all
```

### Online Backup

After reviewing the dirty tree and confirming no secrets or unwanted generated
files are being pushed, create and push a backup branch:

```bash
git switch -c "backup/pre-desktop-delivery-$STAMP"
git push origin "backup/pre-desktop-delivery-$STAMP"
```

If the dirty tree is not ready to push, create a patch bundle first and do not
push until the user approves the staged content:

```bash
git diff > "$BACKUP_ROOT/homebrew_forge_packet-pre-desktop-$STAMP.diff"
git diff --cached > "$BACKUP_ROOT/homebrew_forge_packet-pre-desktop-$STAMP-staged.diff"
git status --short > "$BACKUP_ROOT/homebrew_forge_packet-pre-desktop-$STAMP-status.txt"
```

### Parallel Work Lane

Desktop/runtime implementation should happen in a separate worktree:

```bash
git worktree add \
  "/Users/kyle/Documents/My Games/Magic The Gathering/homebrew_forge_packet_desktop_migration" \
  -b "codex/shared-delivery-runtime"
```

The current repo path remains available for web use:

```bash
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor dev
```

The existing web launcher and Chrome shim stay as a fallback until Phase 4
passes. They may be repaired, but not deleted, during M0-M1.

### Cutover Rule

Do not make desktop the default human-review launcher until:

- web mode still passes its checks
- runtime-service passes boot, port-collision, and save round-trip tests
- desktop app passes macOS Intel and Apple Silicon smoke checks
- Windows runtime/path behavior is verified in CI or explicitly deferred with a
  documented blocker
- Kyle has manually opened and used the desktop app successfully

Until that point, the current web app remains the working app.

## Single-Origin Runtime Decision

Serve the built editor SPA and `/api/*` from the same runtime-service origin in
both dev and packaged modes:

```text
http://127.0.0.1:<selected-port>/
http://127.0.0.1:<selected-port>/api/*
```

Do not load the packaged editor through `file://`.

Reason:
- keeps the API client relative
- avoids CORS/cookie/CSP drift
- keeps Electron `sandbox:true` viable
- makes web/desktop parity easier to test
- lets navigation be locked to one local origin

In dev/web mode, Vite can still participate, but the long-term packaged desktop
contract is one local runtime origin for static editor assets and APIs.

## North Star Rule

`packages/editor` is the product.

Web, Mac, and Windows all consume the same editor app. When contrast, Decks UX, Card Browser, renderer behavior, accessibility, or copy changes, the change lands once in `packages/editor` and appears in every delivery mode after rebuild/relaunch.

Desktop code must not duplicate product screens, workspace components, CSS, routes, domain model, card rendering, deck UI, collection UI, or dashboard UI.

## Non-Goals

- Do not keep the Chrome app shim as the primary app experience.
- Do not make a Swift-only app if Windows parity is required.
- Do not fork the UI into separate Mac and Windows product implementations.
- Do not remove web mode.
- Do not replace the editor with a desktop template.
- Do not introduce live/cloud services, remote asset dependencies, or external sync.
- Do not hide delivery-mode divergence behind undocumented scripts.

## Delivery Model

### Web Mode

Existing mode remains:

```bash
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor dev
```

Responsibility:
- local browser development
- Claude/Codex/Playwright audits
- fastest UI iteration
- backwards-compatible user fallback

### macOS Desktop Mode

Electron app shell loads the shared editor and owns:
- native app window
- app menu
- launch/reopen behavior
- local runtime startup
- runtime health/retry messaging
- local config under `~/Library/Application Support/Homebrew Forge`
- eventual signing/notarization

The macOS app must not open Chrome.

### Windows Desktop Mode

Electron app shell loads the same shared editor and owns:
- Windows app window
- Windows app data config under `%APPDATA%/Homebrew Forge`
- Node-based runtime startup path shared with macOS where possible
- packaged runtime/resource paths
- eventual Windows installer/update channel

Windows parity is scoped from the start even if Windows packaging lands after macOS.

## File Structure

Planned additions:

```text
packages/
  runtime-service/         # planned before true packaged desktop
    package.json
    src/
      createRuntimeServer.ts
      routes/
      health/
  desktop/
    package.json
    tsconfig.json
    src/
      main/
        main.ts              # Electron app entry; thin lifecycle orchestration
        config.ts            # OS-specific config paths and repo/runtime config
        runtime.ts           # Starts/checks Homebrew Forge local runtime
        window.ts            # BrowserWindow creation and loading states
        menu.ts              # Native app menu and shared commands
    scripts/
      install-local-mac-app.mjs
      package-local.mjs
docs/
  superpowers/plans/
    2026-06-08-shared-delivery-modes.md
```

Planned modifications:

```text
AGENTS.md
pnpm-workspace.yaml
package.json
docs/project-map.md
packages/editor/vite.config.ts
packages/editor/src/server/editorApiPlugin.ts
packages/editor/src/server/runtimeHealth.mjs
scripts/install-homebrew-forge-app-shortcut.sh
scripts/codex/homebrew-forge-launcher-health-hook.sh
```

## Phase 0: Architecture And Dependency Gate

Phase 0 is planning and verification only. It must not install Electron or
create desktop source files.

- [ ] **Step 0: Preserve current web usability**

Before changing runtime or desktop code:

```bash
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor typecheck
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor build
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor dev
```

Expected:
- current web mode still launches
- the current web launcher remains available as the user-facing fallback
- any browser/Playwright limitation is logged separately from web app health

- [ ] **Step 0.1: Create local and online backups**

Complete the local backup, Git bundle, and online backup branch steps from
`Continuity, Backup, And Rollback Requirements`.

Expected:
- a timestamped local backup exists under
  `/Users/kyle/Documents/My Games/Magic The Gathering/backups/`
- a Git bundle exists
- either a GitHub backup branch exists or a staged/pending diff backup exists
  with user approval required before pushing

- [ ] **Step 0.2: Create separate implementation worktree**

Run desktop/runtime implementation from:

```text
/Users/kyle/Documents/My Games/Magic The Gathering/homebrew_forge_packet_desktop_migration
```

Expected:
- the current repo path can keep running the web app
- migration work cannot accidentally make the working web app unavailable

- [ ] **Step 1: Confirm desktop stack**

Decision: use Electron first.

Reason:
- same TypeScript/Node ecosystem as current repo
- easiest macOS + Windows parity
- can manage the existing local runtime without a full backend rewrite
- keeps the React editor shared
- avoids Swift-only Windows dead end

Tauri remains a future evaluation only after Electron proves the delivery model.

- [ ] **Step 2: Add dependency review note before install**

Inspect before installing:

```bash
node .tools/pnpm/bin/pnpm.cjs view electron version --silent
node .tools/pnpm/bin/pnpm.cjs view electron-builder version --silent
```

Expected:
- Electron official npm package version resolves
- electron-builder official npm package version resolves

Do not install unrelated desktop frameworks.

- [ ] **Step 3: Verify pnpm build-script allowlist risk**

Before installing Electron, inspect whether pnpm's build allowlist will block
Electron or electron-builder postinstall scripts.

Run:

```bash
sed -n '1,80p' pnpm-workspace.yaml
node .tools/pnpm/bin/pnpm.cjs view electron version --silent
node .tools/pnpm/bin/pnpm.cjs view electron-builder version --silent
```

Expected:
- `pnpm-workspace.yaml` currently allowlists only existing native build needs.
- Electron versions resolve from the registry.
- Implementation plan explicitly updates the allowlist only for approved
  Electron packages.

- [ ] **Step 4: Verify TypeScript portability**

The repo currently pins `typescript@6.0.3`. Verify that this resolves on the
local machine and on a clean Windows runner before treating Windows packaging as
available.

Expected:
- local install/build resolves the pinned TypeScript version
- Windows CI or a documented clean Windows check resolves the same pin
- if the pin is not portable, stop and decide whether to keep the pin or change
  the repo-wide TypeScript version deliberately

- [ ] **Step 5: Decide the desktop data model**

Choose explicitly before packaged desktop work:

Option A: `repo-required local-dev app`
- desktop app points at a checked-out `homebrew_forge_packet` repo
- safest short-term path for Kyle and collaborators
- not a polished non-technical distribution model

Option B: `user-data project app`
- desktop app creates/imports user projects under OS app-data folders
- better long-term product model
- larger migration because sets/decks/collections/reference paths need project
  roots independent from the repo

Default for M0-M1:
- Option A, explicitly documented as local-dev mode
- Option B stays a future productization phase unless approved

Expected:
- no one describes the M0-M1 desktop shell as a finished redistributable app
- the runtime config makes `repoRoot` explicit
- the future user-data project model remains planned, not silently implied

- [ ] **Step 6: Update project map**

Add a `Delivery modes` section to `docs/project-map.md` stating:

```markdown
Delivery-mode planning lives in
`docs/superpowers/plans/2026-06-08-shared-delivery-modes.md`.
`packages/editor` is the shared product UI for web, macOS, and Windows.
Desktop shells may own windowing, menus, runtime startup, OS paths, packaging,
and updates, but must not fork product screens or CSS.
```

## Phase 1: Runtime/API Extraction Spike

This phase must happen before claiming packaged desktop support.

- [ ] **Step 1: Classify every `/api/*` route**

Before extracting anything, catalog each route in
`packages/editor/src/server/editorApiPlugin.ts`.

Classification:
- `pure-fs`: reads/writes repo files or calls `packages/forge` logic without Vite
- `vite-coupled`: depends on Vite server behavior, transforms, module graph, dev
  middleware, or browser-only assumptions
- `render-coupled`: preview/render route that may explain HF-202 stuck preview
  or slow first-preview behavior

Deliverable:

```text
docs/61_runtime_service_route_inventory.md
```

The inventory must include:
- route path
- method
- owner function
- dependencies
- classification
- extraction risk
- test fixture or acceptance check

- [ ] **Step 2: Measure current boot and preview baseline**

Measure before extraction:
- time to `/api/health`
- time to loaded editor with DEMO project
- time to first successful card preview

Expected:
- baseline numbers are recorded in the route inventory or tracker
- M0 can tell whether runtime extraction improves or worsens HF-201/HF-202

- [ ] **Step 3: Extract API route registration from Vite middleware**

Create a reusable runtime-service module that can register the same `/api/*`
routes in Vite dev mode and in a standalone local HTTP server.

Source owner:

```text
packages/editor/src/server/editorApiPlugin.ts
```

Target owner:

```text
packages/runtime-service/src/createRuntimeServer.ts
packages/runtime-service/src/routes/
```

Expected behavior:
- existing web/dev API behavior is preserved
- `/api/health` still reports runtime freshness
- `/api/library` and `/api/project/DEMO` still load populated data
- no product UI moves into the runtime package

- [ ] **Step 4: Add runtime health/version semantics**

Dev mode health:
- source freshness can continue comparing repo source fingerprints
- stale source should still warn the user

Packaged mode health:
- compare editor build hash, forge build hash, runtime build hash, and API
  contract version
- source mtime is not the primary packaged-app freshness signal

Add or define:

```text
/api/version
```

Expected:
- mismatched editor/runtime/API versions fail loudly
- no silent "empty project" state when contracts drift
- web and desktop report their delivery mode explicitly

- [ ] **Step 5: Add port resilience**

Preferred port stays `5177`, but the runtime must be able to select a free port
when `5177` is occupied. The selected port must be passed to the desktop shell
and reflected in `/api/health`.

Acceptance test:

```bash
node -e "require('node:net').createServer().listen(5177, '127.0.0.1', () => setInterval(() => {}, 1000))"
```

Then launch desktop runtime.

Expected:
- desktop runtime does not hard-fail
- selected fallback port is logged
- renderer loads the selected port

- [ ] **Step 6: Define runtime ownership**

For desktop mode, Electron owns the runtime child process. LaunchAgent and
Chrome process counting must not be the primary lifecycle model.

Expected:
- app quit stops the runtime child it owns
- killing the runtime child produces retry UI
- no orphan listener remains after quit

- [ ] **Step 7: Add runtime smoke tests**

Create:

```text
packages/runtime-service/test/runtime.smoke.mjs
```

Required tests:
- standalone runtime boots
- `/api/health` responds
- `/api/version` responds
- `/api/library` returns expected project/set data
- `/api/project/DEMO` returns cards
- busy `5177` falls back to another port
- save round-trip writes through the same data path expected by web mode

## Phase 2: Desktop Shell Scaffold

- [ ] **Step 1: Create `packages/desktop/package.json`**

Package scripts:

```json
{
  "name": "@homebrew-forge/desktop",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/main/main.js",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "dev": "node scripts/dev.mjs",
    "start": "electron ."
  },
  "dependencies": {},
  "devDependencies": {
    "electron": "<approved-version>",
    "electron-builder": "<approved-version>",
    "typescript": "6.0.3"
  }
}
```

- [ ] **Step 2: Create focused main-process modules**

Responsibilities:
- `main.ts`: app lifecycle only
- `config.ts`: repo/config path detection only
- `runtime.ts`: starts/checks runtime only
- `window.ts`: creates/reopens BrowserWindow only
- `menu.ts`: app menu only

No product UI components belong in `packages/desktop`.

- [ ] **Step 3: Load the shared editor**

Desktop shell should:
1. show a native loading window immediately
2. start/check the local runtime without opening Chrome
3. load `http://127.0.0.1:5177/`
4. show a clear retry/error state if the runtime fails

- [ ] **Step 4: Apply Electron security defaults**

BrowserWindow must use:

```ts
webPreferences: {
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true
}
```

Navigation must be locked to the local runtime origin. External links must open
through the OS browser only after explicit allowlisting.

- [ ] **Step 5: Define typed IPC for native file dialogs**

Do not relax Electron security to make file access easy.

If desktop needs native file open/save dialogs, define a typed IPC contract in
the desktop shell and expose it through shared command IDs.

Expected:
- renderer cannot access Node directly
- native dialogs are invoked from Electron main
- web mode has equivalent in-app/browser-safe command behavior
- command definitions remain shared through
  `packages/editor/src/domain/commands.ts`

- [ ] **Step 6: Verify Electron starts on a clean install**

Acceptance:

```bash
node .tools/pnpm/bin/pnpm.cjs install
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/desktop start
```

Expected:
- Electron binary resolves through vendored pnpm
- desktop shell launches
- no product UI is duplicated in `packages/desktop`

## Phase 3: Preserve Web Mode

- [ ] **Step 1: Keep existing editor scripts unchanged**

These must keep working:

```bash
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor dev
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor build
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor typecheck
```

- [ ] **Step 2: Add root scripts without replacing web scripts**

Add:

```json
{
  "desktop": "node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/desktop dev",
  "desktop:build": "node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/desktop build",
  "desktop:typecheck": "node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/desktop typecheck"
}
```

Keep:

```json
{
  "editor": "node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor dev"
}
```

## Phase 4: macOS App Replacement

- [ ] **Step 1: Replace Chrome shim installer**

`scripts/install-homebrew-forge-app-shortcut.sh` should install the desktop app, not a Chrome-launching script app.

The installed `/Applications/Homebrew Forge.app` must:
- open a native Electron window
- not open a blank Chrome tab
- not depend on Chrome app mode
- store local config in Application Support
- keep the current repo path configurable
- run on Intel Mac and Apple Silicon Mac

Mac architecture support:
- Intel laptop: `x64`
- M2 Mac mini: `arm64`
- packaged target should be universal if feasible, or produce explicit `x64`
  and `arm64` artifacts from the same commit

- [ ] **Step 2: Update launcher health hook**

`scripts/codex/homebrew-forge-launcher-health-hook.sh` should:
- repair/reinstall the desktop app if stale
- open `/Applications/Homebrew Forge.app`
- verify the server is fresh
- verify a Homebrew Forge desktop app process exists
- no longer treat a Chrome process as proof of success

- [ ] **Step 3: Update AGENTS.md launcher instruction**

After desktop replacement passes, update the project launcher instruction:

Current hook behavior should become:
- optional Codex convenience
- repairs/opens the chosen delivery mode
- never treats Chrome as proof of app success

Do not leave AGENTS.md requiring the old Chrome-launcher health path as the
definition of "open the app."

## Phase 5: Windows Scope And Parity

- [ ] **Step 1: Add Windows config contract**

Windows desktop mode uses:

```text
%APPDATA%/Homebrew Forge/desktop-config.json
```

Config fields:

```json
{
  "repoRoot": "absolute path to homebrew_forge_packet",
  "port": 5177,
  "mode": "local-dev"
}
```

- [ ] **Step 2: Add Windows runtime launcher path**

Use a Node-based cross-platform runtime starter shared by macOS and Windows.
Do not fork the runtime into a separate PowerShell-first implementation unless
the Node path is proven impossible and the divergence is explicitly approved.

Avoid separate Windows product UI.

- [ ] **Step 3: Add Windows package target**

Use electron-builder after macOS local app works:

```bash
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/desktop run package:win
```

Expected:
- Windows packaging is verified on a real Windows runner such as GitHub Actions
  `windows-latest`.
- macOS is not treated as the source of truth for Windows artifacts.
- If blocked by signing, NSIS, or Wine, log the blocker and keep the Windows
  runtime contract in place.

## Phase 6: Packaged Runtime

- [ ] **Step 1: Remove dev-server dependence for packaged apps**

Packaged desktop apps should not rely on Vite dev mode forever.

Target:
- build `packages/editor/dist`
- serve built editor assets from the runtime-service origin
- expose local API/runtime through the same runtime-service origin
- keep renderer API calls relative

- [ ] **Step 2: Keep web mode separate**

Web mode can continue using Vite dev/build. Packaged desktop can use built assets.

The UI source remains shared.

- [ ] **Step 3: Document app footprint tradeoff**

Electron is expected to be much larger than the current Chrome shim. Document:
- expected installed app size
- why Electron is still the right first desktop shell for Windows parity
- why Tauri remains a later evaluation after M3 rather than the first move

## Phase 7: Updates And Versioning

- [ ] **Step 1: Add shared build metadata**

Expose one build/version identity across delivery modes:

```json
{
  "version": "0.1.0",
  "editorBuild": "<hash>",
  "forgeBuild": "<hash>",
  "deliveryMode": "web | mac-desktop | win-desktop"
}
```

- [ ] **Step 2: Add mismatch warning**

If desktop shell and editor/runtime hashes do not match, show:

```text
Homebrew Forge needs to refresh its local app runtime.
```

- [ ] **Step 3: Scope auto-update**

Auto-update is a packaging phase, not Phase 1.

Future desktop auto-update source:
- signed GitHub releases or another explicit release channel
- macOS and Windows artifacts built from the same commit
- no silent feature divergence per OS

## Acceptance Gates

Before implementation is considered complete:

- [ ] Local backup, Git bundle, and online backup branch/patch exist before code migration.
- [ ] Migration work happens in a separate worktree until green-pass cutover.
- [ ] Current web app remains usable from the original repo path during M0-M3.
- [ ] Runtime/API service runs without Vite dev mode.
- [ ] Preferred port `5177` works, but a busy `5177` does not brick the app.
- [ ] Desktop app owns its runtime child process and cleans it up on quit.
- [ ] Built editor SPA and `/api/*` are served from the same local runtime origin.
- [ ] Web mode launches and loads the same UI.
- [ ] macOS desktop launches without Chrome.
- [ ] macOS desktop is verified on Intel `x64` and Apple Silicon `arm64`, or artifacts are clearly split and tested.
- [ ] Windows desktop architecture is documented and has a runnable/packaging path.
- [ ] `packages/desktop` contains no product screen components.
- [ ] `packages/editor` remains the only place for visible app UI.
- [ ] Shared command registry prevents web/desktop menu and shortcut drift.
- [ ] Root scripts expose both `editor` and `desktop`.
- [ ] Launcher health hook verifies the desktop app, not Chrome.
- [ ] Typecheck/build pass for editor and desktop.
- [ ] Visual QA is run against the shared editor UI.
- [ ] App process and runtime health are both verified before handoff.
- [ ] Electron BrowserWindow uses `contextIsolation:true`, `nodeIntegration:false`, and `sandbox:true`.
- [ ] Paths with spaces, including this repo path under `My Games/Magic The Gathering`, are covered by automated or scripted verification.
- [ ] Packaged app data model is explicit: either repo-required local-dev mode or a designed user-data project directory.
- [ ] Kyle manually confirms desktop mode is stable before default launcher cutover.

## Implementation Stop Conditions

Stop and ask before proceeding if:

- A local and online backup cannot be created safely.
- Electron install introduces unexpected lifecycle scripts or dependency risk.
- The runtime cannot be extracted from Vite without a larger API redesign.
- The desktop shell needs to duplicate editor UI to proceed.
- Windows support requires a separate product code path.
- Packaging requires signing/notarization decisions not yet approved.
- The local API/runtime cannot be shared without a larger backend redesign.
- The migration work would prevent the current web app from being used.

## Recommended Execution

Start with Phase 0 only, then implement Phase 1 as a runtime/API extraction
spike before installing or scaffolding the desktop shell.

Reason:
- the Chrome shim is bad, but the deeper blocker is Vite-owned `/api/*`
- packaged desktop is not real until the API can run outside Vite dev
- web mode must stay safe while the runtime is extracted
- Electron install and packaging should not begin until the runtime ownership
  and port strategy are explicit

Do not begin desktop shell implementation until Phase 1 proves the same
`/api/*` contract works through an embeddable runtime service.

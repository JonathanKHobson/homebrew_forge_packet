---
status: archived
lane: desktop
type: reference
archived: 2026-06-09
---
> **ARCHIVED 2026-06-09 (implemented-plans sweep)** — original path: `docs/60_desktop_delivery_tooling_prep.md`
> Reason: implemented planning artifact, archived per Kyle's 2026-06-09 directive (all plans implemented; no live backlog).
> Index: `docs/cowork/02_repo_archive_manifest.md` + `docs/64_repo_cleanup_archive_index.md`.

# Desktop Delivery Tooling Prep

🗄️ `[status: archived]` `[lane: desktop]` `[type: reference]`

This doc prepares Homebrew Forge for shared web, macOS desktop, and Windows
desktop delivery while Claude reviews the delivery-mode plan.

## Current Decision

`packages/editor` remains the shared product UI source of truth. Web, macOS,
and Windows delivery modes must consume the same editor surface. Desktop code
may own windowing, native menus, runtime startup, app paths, packaging, signing,
and updates, but it must not fork product screens, CSS, renderer behavior, or
workspace flows.

Primary implementation plan:

- `docs/superpowers/plans/2026-06-08-shared-delivery-modes.md`

## Local Toolchain Snapshot

Generated with:

```bash
node scripts/codex/desktop-delivery-toolchain-check.mjs --with-registry
```

Current state on this Mac:

| Tool | Status | Notes |
|---|---:|---|
| Node.js | OK | `v24.14.0`; enough for editor runtime and Electron tooling |
| Repo pnpm | OK | `11.5.0`; use `.tools/pnpm/bin/pnpm.cjs` |
| Git | OK | Apple Git available |
| Python 3 | OK | System Python is `3.9.6`; use Codex bundled Python for UXHC work needing 3.10+ |
| Command Line Tools | OK | Active developer directory is `/Library/Developer/CommandLineTools` |
| Swift | OK | Swift `6.3.2` available from Command Line Tools |
| codesign | OK | Present at `/usr/bin/codesign` |
| notarytool | OK | Present under Command Line Tools |
| pkgbuild | OK | Present at `/usr/bin/pkgbuild` |
| Xcode.app / xcodebuild | Missing | Full Xcode is not installed; `xcodebuild` requires Xcode.app |

Immediate implication:

- Electron desktop prep can proceed without full Xcode.
- Full Xcode becomes a later gate for native Swift/Xcode work, deeper Apple
  packaging workflows, or GUI developer tooling.
- macOS signing/notarization command-line tools are already available, but
  Developer ID credentials and notarization profile setup are separate future
  tasks.

## Package Candidates

Registry probes:

| Package | Candidate | Purpose |
|---|---:|---|
| `electron` | `42.3.3` | Cross-platform desktop shell |
| `electron-builder` | `26.15.2` | macOS and Windows packaging |
| `electron-updater` | `6.8.9` | Future desktop auto-update |

Do not add these dependencies until Claude's review either accepts the
Electron-first plan or asks for a different stack. Once approved, add them under
`packages/desktop`, not in `packages/editor`.

## Official Research Notes

### Electron

Use Electron only as a delivery shell, not a second product UI.

Security requirements from Electron's official security guidance:

- keep `contextIsolation` enabled;
- disable Node integration in renderer windows;
- use a preload bridge only for narrow, audited desktop APIs;
- validate all IPC payloads;
- avoid loading untrusted remote content;
- keep desktop shell responsibilities separate from product UI.

Distribution notes from Electron's official docs:

- packaged apps must include their resources/assets in an executable app bundle;
- code signing is part of the distribution path;
- delivery targets differ per operating system.

### electron-builder

Use electron-builder after the desktop shell proves stable.

Relevant target/update notes:

- Windows default target should be NSIS for a normal installable app and
  electron-updater support.
- macOS updater support requires signed artifacts.
- Update metadata and release artifacts must be produced from the same commit
  so Mac and Windows do not drift.

### Apple / Xcode

Apple's command-line tool reference confirms that some tools require the full
Xcode app and an active Xcode developer directory. This machine currently has
Command Line Tools, not Xcode.app.

For this project:

- install full Xcode only when the implementation actually needs `xcodebuild`,
  native Swift/Xcode project builds, or GUI Apple tooling;
- keep Apple signing identities, notary credentials, and team IDs out of the
  repo;
- document signing/notarization as a packaging phase, not a Phase 1 shell
  scaffold requirement.

## Information Architecture

### Source Of Truth

```text
packages/editor/       # Product UI: one shared editor for web, Mac, Windows
packages/forge/        # Domain/data/render/import/export logic
packages/desktop/      # Future desktop shell only; no product screens
```

### First Architecture Gate

The current editor API is served through Vite middleware in
`packages/editor/src/server/editorApiPlugin.ts`. A packaged desktop app is not
real until that API can run outside the Vite dev server.

First implementation gate:

```text
packages/editor/src/server/editorApiPlugin.ts
  extract API handlers that are reusable outside Vite

packages/editor/src/server/
  create an embeddable local runtime/service wrapper

scripts/run-homebrew-forge-editor.mjs
  becomes one consumer of the shared runtime, not the only place the API exists

packages/desktop/
  starts/checks the shared runtime and loads the shared editor UI
```

This prevents another launcher shell that only works while a dev server happens
to be alive.

### Delivery Mode Boundaries

```text
Web mode:
  packages/editor + Vite dev/build

Desktop mode:
  packages/desktop shell
  loads packages/editor output or local editor runtime
  delegates data/domain work to packages/forge and existing API contract
```

### App Data Paths

macOS:

```text
~/Library/Application Support/Homebrew Forge/
  desktop-config.json
  runtime/
  cache/
  updates/

~/Library/Logs/Homebrew Forge/
  desktop.log
  runtime.log
```

Windows:

```text
%APPDATA%/Homebrew Forge/
  desktop-config.json
  runtime/
  updates/

%LOCALAPPDATA%/Homebrew Forge/
  Cache/
  Logs/
```

Repo-owned data remains in the repo:

```text
sets/
decks/
collections/
reference/
assets/
output/
```

Do not move source-of-truth card/deck/collection data into OS app-data folders
without a separate migration plan.

## Script And Tooling Prep

Added:

- `scripts/codex/desktop-delivery-toolchain-check.mjs`

Use:

```bash
node scripts/codex/desktop-delivery-toolchain-check.mjs
node scripts/codex/desktop-delivery-toolchain-check.mjs --with-registry
```

Purpose:

- verify local Node/pnpm/Git/Python/Apple tool availability;
- report whether full Xcode is installed;
- verify current Electron package candidates without changing dependencies.

## Install Gates

### Gate 1: Electron Dependencies

Install only after Claude approves Electron-first or the plan is amended.

Expected command:

```bash
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/desktop add -D electron electron-builder electron-updater
```

Precondition:

- `packages/desktop/package.json` exists.

### Gate 2: Full Xcode

Install full Xcode only if one of these becomes true:

- we create a native Swift/Xcode project;
- `xcodebuild` is needed for a packaging workflow;
- Claude recommends a Mac-native spike that cannot be done with Command Line
  Tools;
- signing/notarization setup requires Xcode GUI workflows.

Current machine state:

- `/Applications/Xcode.app` is not present.
- `xcodebuild -version` fails because the active developer directory is Command
  Line Tools.

### Gate 3: Auto-Update

Do not implement auto-update in the first shell scaffold.

Auto-update needs:

- signed macOS artifacts;
- Windows installer target;
- one release source for Mac and Windows;
- release metadata generated from the same commit;
- an explicit update UX in the desktop shell.

## Open Questions For Claude

- Does Electron remain the best first shell, or should we spike Tauri before
  committing?
- Should Phase 1 load the Vite dev server, built editor assets, or both behind
  a mode flag?
- Should the packaged desktop app bundle Node and the local API runtime, or use
  a local service process first?
- What is the minimum Windows parity test before macOS replacement proceeds?
- What should count as proof that no product mismatch has been introduced?

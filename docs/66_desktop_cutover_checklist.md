# Desktop Cutover Checklist

Status: approved for local macOS default-app cutover.

The current primary repo path is now the working app lane. `/Applications/Homebrew Forge.app`
opens the shared `packages/editor` UI through the desktop shell. The legacy web
launcher remains available as a fallback script, but it is no longer the default
human-review app.

## Preservation

- [x] Local backup created for current repo.
- [x] Git bundle created.
- [x] Dirty-tree diff/status packet created.
- [x] Online backup branch pushed: `backup/pre-desktop-cutover-20260608-165539`.
- [x] Desktop migration worktree exists at `/Users/kyle/Documents/My Games/Magic The Gathering/homebrew_forge_packet_desktop_migration`.
- [x] Desktop app health verified immediately before cutover on port `5187`.

## Runtime Service

- [x] Route inventory complete enough for local runtime extraction tracking.
- [x] `packages/runtime-service` exists and builds.
- [x] Standalone runtime serves `/api/health`.
- [x] Standalone runtime serves `/api/version`.
- [x] Standalone runtime serves `/api/library`.
- [x] Desktop/Vite runtime serves `/api/project?set=DEMO`.
- [x] Runtime save round-trip passes in fixture tests.
- [x] Runtime rejects outside-root asset paths in smoke tests.
- [x] Runtime handles busy preferred ports with fallback tests.
- [ ] Runtime shutdown leaves no listener.

## Web Preservation

- [x] Existing web scripts remain in repo as fallback.
- [ ] Vite/web route responses match standalone runtime fixtures.
- [x] Web mode remains available as fallback.
- [x] Chrome shim is retained as fallback, not deleted.

## Desktop Shell

- [x] `packages/desktop` exists and builds.
- [x] Electron app opens without Chrome.
- [x] Electron loads `http://127.0.0.1:5187/`.
- [x] BrowserWindow has secure prefs.
- [x] Native navigation is locked to the selected local origin.
- [x] Preload exposes no raw filesystem or raw IPC.
- [ ] Native menus use shared command registry IDs.
- [x] Runtime child is owned and cleaned up by desktop app.
- [ ] Runtime crash shows retry/error state.

## Platform Proof

- [x] macOS Intel smoke passes.
- [ ] macOS Apple Silicon smoke passes.
- [ ] Windows runtime smoke passes.
- [ ] Windows Electron smoke passes.
- [x] Path-with-spaces fixture passes on macOS local app path.

## Human Green Pass

- [x] Kyle opens the desktop app.
- [ ] Kyle verifies Maker, Decks, Collections, References, and Card Browser still use the same product UI.
- [x] `/Applications/Homebrew Forge.app` has been replaced by the desktop app and the old app bundle was archived under `~/Library/Application Support/Homebrew Forge/App Backups/`.
- [x] Release/cutover commit is pushed.

## Explicit Deferrals

- User-data project mode is deferred.
- Signing/notarization is deferred until packaging phase.
- Auto-update is deferred until signed release flow is proven.
- Public packaged Windows/macOS release artifacts remain deferred; this cutover is the local default development app.

# Desktop Cutover Checklist

Status: not approved for cutover.

The current web app remains the working app until every required item is checked.

## Preservation

- [x] Local backup created for current repo.
- [x] Git bundle created.
- [x] Dirty-tree diff/status packet created.
- [x] Online backup branch pushed: `backup/pre-desktop-delivery-20260608-132519`.
- [x] Desktop migration worktree exists at `/Users/kyle/Documents/My Games/Magic The Gathering/homebrew_forge_packet_desktop_migration`.
- [ ] Current web app health verified immediately before cutover.

## Runtime Service

- [ ] Route inventory complete.
- [x] `packages/runtime-service` exists and builds.
- [x] Standalone runtime serves `/api/health`.
- [x] Standalone runtime serves `/api/version`.
- [ ] Standalone runtime serves `/api/library`.
- [ ] Standalone runtime serves `/api/project?set=DEMO`.
- [ ] Runtime save round-trip passes in fixture copy.
- [ ] Runtime rejects outside-root asset paths.
- [ ] Runtime handles busy `5177` with fallback port.
- [ ] Runtime shutdown leaves no listener.

## Web Preservation

- [ ] Existing `pnpm editor` or equivalent web script still works.
- [ ] Vite/web route responses match standalone runtime fixtures.
- [ ] Web mode remains available as fallback.
- [ ] Chrome shim is repaired only as fallback, not deleted.

## Desktop Shell

- [ ] `packages/desktop` exists and builds.
- [ ] Electron app opens without Chrome.
- [ ] Electron loads `http://127.0.0.1:<selected-port>/`.
- [ ] BrowserWindow has secure prefs.
- [ ] Native navigation is locked to the selected local origin.
- [ ] Preload exposes no raw filesystem or raw IPC.
- [ ] Native menus use shared command registry IDs.
- [ ] Runtime child is owned and cleaned up by desktop app.
- [ ] Runtime crash shows retry/error state.

## Platform Proof

- [ ] macOS Intel smoke passes.
- [ ] macOS Apple Silicon smoke passes.
- [ ] Windows runtime smoke passes.
- [ ] Windows Electron smoke passes.
- [ ] Path-with-spaces fixture passes on macOS and Windows.

## Human Green Pass

- [ ] Kyle opens the desktop app.
- [ ] Kyle verifies Maker, Decks, Collections, References, and Card Browser still use the same product UI.
- [ ] Kyle confirms the app can replace `/Applications/Homebrew Forge.app`.
- [ ] Release/cutover commit is pushed.

## Explicit Deferrals

- User-data project mode is deferred.
- Signing/notarization is deferred until packaging phase.
- Auto-update is deferred until signed release flow is proven.

---
status: active
lane: runtime
type: spec
---
# Runtime Parity Test Matrix

🟢 `[status: active]` `[lane: runtime]` `[type: spec]`

Status: active test design for shared web, runtime-service, macOS desktop, and Windows desktop delivery.

## Baseline Commands

```bash
node .tools/pnpm/bin/pnpm.cjs typecheck
node .tools/pnpm/bin/pnpm.cjs build
node .tools/pnpm/bin/pnpm.cjs test
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor run test:ux-gate
```

## Runtime Smoke

| ID | Scenario | Expected |
|---|---|---|
| RT-001 | Standalone runtime boots on `127.0.0.1` | health URL reachable |
| RT-002 | `/api/health` | app label, delivery mode, repo root, port, PID, startedAt |
| RT-003 | `/api/version` | API/editor/forge/runtime build IDs and contract version |
| RT-004 | `/api/library` | expected DEMO/SQM/SOA library data |
| RT-005 | `/api/project?set=DEMO` | populated card/project payload |
| RT-006 | Save card/deck/collection round trip in fixture copy | writes expected CSV/JSON diff only in fixture |
| RT-007 | Port `5177` occupied | selects fallback port and reports it |
| RT-008 | Shutdown cleanup | no runtime listener remains |
| RT-009 | Path with spaces | fixture repo path works on macOS and Windows |
| RT-010 | Asset path traversal | outside-root path rejected |

## Web Parity

| ID | Scenario | Expected |
|---|---|---|
| WEB-001 | Existing root/editor script starts | web app remains usable |
| WEB-002 | Vite adapter routes match runtime-service routes | same fixture responses |
| WEB-003 | UI uses relative `/api/*` calls | no hard-coded selected port |
| WEB-004 | Save round trip through web mode | same files as runtime-service |
| WEB-005 | Dev/HMR remains usable | UI work is not slowed by desktop migration |

## Electron Smoke

| ID | Scenario | Expected |
|---|---|---|
| EL-001 | Launch app | one Electron BrowserWindow opens |
| EL-002 | Window URL | `http://127.0.0.1:<selected-port>/` |
| EL-003 | Chrome independence | no Chrome app-mode process is required |
| EL-004 | Runtime child ownership | child PID and parent PID visible |
| EL-005 | Security prefs | context isolation, no Node integration, sandbox |
| EL-006 | Navigation lock | external URLs blocked or opened externally |
| EL-007 | Shared commands | native menu IDs map to shared command registry |
| EL-008 | Save round trip | desktop writes same fixture files |
| EL-009 | Runtime child killed | retry/error state, not blank screen |
| EL-010 | Quit cleanup | runtime child exits and listener is gone |

## CI Matrix

| Lane | Runner | Required before cutover |
|---|---|---:|
| Web/runtime baseline | `ubuntu-latest` | Yes |
| Windows web/runtime | `windows-latest` | Yes |
| macOS Intel smoke | Intel macOS runner where available | Yes |
| macOS Apple Silicon smoke | arm64 macOS runner where available | Yes |
| Windows desktop smoke | `windows-latest` | Yes before Windows parity claim |
| Packaging | macOS and Windows | Later |

## Fixture Rule

All write tests must run against a copied fixture directory with spaces in the path. No runtime parity test may mutate the live repo data folders.

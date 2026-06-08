# Runtime Service Route Inventory

Status: Phase 1 seed inventory for extracting the editor API out of Vite middleware.

Source owner today: `packages/editor/src/server/editorApiPlugin.ts`

Target owner: `packages/runtime-service`

Rule: runtime extraction cannot begin until each route has an acceptance check. This first inventory captures the routes currently registered by the Vite plugin and classifies extraction risk.

## Route Groups

| Route | Method | Current dependency shape | Writes | Risk | Fixture | Acceptance check |
|---|---|---|---:|---|---|---|
| `/api/health` | GET | `runtimeHealth.mjs`, repo fingerprint, Forge dist freshness | No | Medium | repo root | Reports app label, repo root, port, PID, stale state |
| `/api/restart` | POST | Vite/server process lifecycle | No | High | local dev | Remains dev-only or becomes explicit unsupported runtime action |
| `/api/library` | GET | `sets/library.json`, discovered set folders, default set | No | Low | DEMO/SQM/SOA | Extracted to runtime-service; lists expected projects and set summaries |
| `/api/reference` | GET/POST | reference catalog and custom reference creation | POST | Medium | reference/custom | GET extracted to runtime-service; POST write route deferred with explicit 501 |
| `/api/official-cards/status` | GET | official-card cache status | No | Low | reference/official | Extracted to runtime-service; returns sync/cache status |
| `/api/official-cards/search` | GET | local official-card cache query | No | Medium | official cache | Extracted to runtime-service; prints/oracle/unique searches return stable rows |
| `/api/official-cards/variants` | GET | official-card print variant lookup | No | Medium | official cache | Extracted to runtime-service; variant query returns stable print variants |
| `/api/official-cards/sync` | POST | official-card cache sync | Yes | High | temp official cache | Sync writes only fixture cache and reports status |
| `/api/official-cards/add-to-collection` | POST | official card to collection row service | Yes | High | temp collection | Adds row, reloads collection, no schema drift |
| `/api/official-cards/add-to-deck` | POST | official card to deck entry service | Yes | High | temp deck | Adds entry, reloads deck, active variant intact |
| `/api/official-cards/add-to-set` | POST | official card to authored set import | Yes | High | temp set | Adds authored row and reloads project |
| `/api/import-collection-to-set` | POST | collection-to-set copy workflow | Yes | High | temp collection/set | Copies selected rows, preserves collection isolation |
| `/api/decks` | GET | deck storage list | No | Low | demo decks | Extracted to runtime-service; lists fixture and demo deck summaries |
| `/api/deck` | GET | deck storage read | No | Medium | demo-showcase | Extracted to runtime-service; missing id is 400; valid id loads variants and entries |
| `/api/create-deck` | POST | deck create service | Yes | High | temp decks | Extracted to runtime-service; creates deck folder in fixture and relists decks |
| `/api/save-deck` | POST | deck save service | Yes | High | temp deck | Extracted to runtime-service; save/read round trip preserves variant entries |
| `/api/export-deck` | POST | text/Cockatrice deck export | Yes | High | temp output | Extracted to runtime-service; returns expected export artifact |
| `/api/import-deck` | POST | deck import service | Yes | High | temp decks | Extracted to runtime-service; imports fixture CSV/text without live data mutation |
| `/api/collections` | GET | collection storage list | No | Low | demo collections | Extracted to runtime-service; lists fixture and default collection summaries |
| `/api/collection` | GET | collection storage read | No | Medium | demo-reference | Extracted to runtime-service; missing id is 400; valid id loads entries |
| `/api/create-collection` | POST | collection create service | Yes | High | temp collections | Extracted to runtime-service; creates collection folder and relists |
| `/api/save-collection` | POST | collection save service | Yes | High | temp collection | Extracted to runtime-service; save/read round trip preserves row metadata |
| `/api/import-collection` | POST | scanner/generic collection import | Yes | High | temp collections | Extracted to runtime-service; imports CSV fixture and reports summary |
| `/api/collection-prices/refresh` | POST | local price refresh/snapshot | Yes | High | temp collection | Refresh writes only fixture snapshot |
| `/api/collection-prices/import` | POST | price CSV import | Yes | High | temp collection | Imports fixture price rows and relists |
| `/api/export-collection` | POST | CSV/text/Cockatrice collection export | Yes | High | temp output | Extracted to runtime-service; returns expected export artifact |
| `/api/mana-symbol` | GET | asset-pack mana symbol read | No | Medium | DEMO asset pack | Extracted to runtime-service; serves known symbol, 404s missing symbol |
| `/api/asset` | GET | repo-root path guard and file serving | No | High | DEMO art | Extracted to runtime-service; serves inside-root asset, rejects outside-root traversal |
| `/api/project` | GET | `loadForgeProject`, editor draft normalization | No | High | DEMO/SOA | DEMO returns populated cards; invalid set errors visibly |
| `/api/preview` | POST | render preview pipeline | No | High | DEMO draft | Returns preview image or structured render error in timeout window |
| `/api/print-export` | POST | print/PDF/export pipeline | Yes | High | temp output | Writes expected print export to fixture output |
| `/api/save-card` | POST | card/set CSV save pipeline | Yes | High | temp set | Save/read reloads same draft and variants |
| `/api/create-set` | POST | set/library create service | Yes | High | temp library/set | Creates set, updates library, relists project |
| `/api/create-library-asset` | POST | upload/url/local asset creation | Yes | High | temp set/art | Writes asset row and optional assignment |
| `/api/create-universe` | POST | project/library create service | Yes | High | temp library | Creates project without changing real library |
| `/api/update-universe` | POST | project/library update service | Yes | High | temp library | Updates project metadata and relists |
| `/api/update-set` | POST | set/library update service | Yes | High | temp library/set | Updates set summary and relists |
| `/api/export-source` | POST | source export workflow | Yes | High | temp output | Writes expected source artifact |
| `/api/import-cards` | POST | CSV/XML/card import workflow | Yes | High | temp set | Imports rows, reloads project, reports summary |
| `/api/sync-cockatrice` | POST | Cockatrice package sync | Yes | High | temp output | Writes package for active set only |

## Extraction Classes

- `pure-fs`: route reads local repo data and can move first once adapter plumbing exists.
- `write-sensitive`: route mutates CSV/JSON/output and must run against copied fixtures in tests.
- `security-sensitive`: route serves files, accepts upload data, or writes from user-supplied paths.
- `render-coupled`: route can block on preview/render/export and needs timeout/retry behavior.
- `vite-coupled`: route currently depends on Vite middleware shape or dev-only process semantics.

## First Extraction Order

1. Health/version/library routes.
2. Read-only project, deck, collection, reference, and official-card routes.
3. Asset and mana-symbol routes with path-guard tests.
4. Save/import/export write routes against fixture copies.
5. Preview/print/render routes with timeout and structured error checks.
6. Dev-only restart route after an explicit product decision.

## Open Risks

- `editorApiPlugin.ts` mixes route registration, body parsing, path guards, write helpers, preview rendering, and editor domain conversion in one file.
- `/api/project` depends on editor-domain normalization (`draftFromRecords`, frame registry, `EditorProject`, and library asset summaries). Extract it through a shared adapter module before runtime-service owns the route; do not copy/paste the conversion logic into a second source of truth.
- The current `/api/restart` route is dev-lifecycle behavior; desktop runtime should not inherit it blindly.
- Preview and print routes can create false "app is broken" states if they hang without timeout or retry.
- Save/import/export tests must never mutate live repo data.

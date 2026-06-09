---
status: archived
lane: ui
type: backlog
archived: 2026-06-09
---
> **ARCHIVED 2026-06-09 (implemented-plans sweep)** — original path: `docs/71_usability_trust_standards_backlog.md`
> Reason: implemented planning artifact, archived per Kyle's 2026-06-09 directive (all plans implemented; no live backlog).
> Index: `docs/cowork/02_repo_archive_manifest.md` + `docs/64_repo_cleanup_archive_index.md`.

# Usability Trust And Standards Backlog

🗄️ `[status: archived]` `[lane: ui]` `[type: backlog]`

Date: 2026-06-08

Use this backlog for the trust-and-standards lane. Do not mix in live pricing,
legality engines, playtest simulation, or unrelated renderer redesign.

## P0 Trust And Convention Fixes

| Item | Surface | Requirement | Status |
| --- | --- | --- | --- |
| Dropdown arrow spacing | App-wide selects | Add right padding and a shared arrow affordance that cannot clip into the border. | planned |
| Literal caret cleanup | Project and Work Mode chips | Replace text `v` with shared icon-layer arrow. | planned |
| Sorting convention | Shared `SortMenu` | Use one sort option select plus a separate direction toggle. | planned |
| Loading reassurance | Initial load and card surfaces | Show local-data loading copy before any empty-card messaging appears. | planned |
| Empty project/set recovery | Maker/Card list | Say the current project/set has no cards and expose View other projects. | planned |

## P1 Navigation And Startup

| Item | Surface | Requirement | Status |
| --- | --- | --- | --- |
| Home workspace | Rail and workspace frame | Add Home as a permanent launch/orientation workspace. | planned |
| Startup defaults | Settings | Let users choose startup workspace, Work Mode, and project. | planned |
| Rail lock rules | Side rail | Keep Home first and Settings last in every mode. | planned |
| Rail editing | Settings | Reorder and hide non-locked rail pages per Work Mode. | planned |

## P2 Custom Work Modes

| Item | Surface | Requirement | Status |
| --- | --- | --- | --- |
| Custom mode creation | Settings | Add custom local Work Mode with name, tag, and default workspace. | planned |
| Custom mode rail config | Settings | Choose visible pages and order for each custom mode. | planned |
| Default mode toggle | Settings | Mark a built-in or custom Work Mode as startup default. | planned |
| Reset preferences | Settings | Reset local Work Mode and rail preferences without touching app data. | planned |

## QA Targets

- Home, Maker, Cards, Decks, Collections, Projects, References, and Settings at
  desktop size.
- Maker and Decks at 390px narrow viewport.
- Dropdown padding, clipping, overflow, rail reachability, and empty/loading
  states in visual QA.
- Dark, light, and parchment theme checks when global control CSS changes.

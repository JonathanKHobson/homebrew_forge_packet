---
status: active
lane: docs
type: index
---
# Repo Orientation Packet (Co-Work)

🟢 `[status: active]` `[lane: docs]` `[type: index]`

When to use this doc: first stop for any new human or AI session in this repo.

## one-hop-entry-points

| You are | Start here | Then |
|---|---|---|
| Any agent, any task | `AGENTS.md` | `docs/project-map.md` |
| Resuming an older conversation | `docs/67_primary_repo_cutover_notice.md` | `docs/68_dev_relocation_handoff_prompt.md` |
| Doing UI/UX work | `docs/45_forge_ui_north_star.md` | `docs/47_forge_ui_phase_tracker.md` |
| Browsing the docs folder | `docs/README.md` (status-coded master index) | `docs/cowork/03_working_index_and_navigation.md` |
| Looking for a past plan/roadmap/tracker | `docs/archive/2026-06-implemented-plans/` | ledger: `docs/cowork/02_repo_archive_manifest.md` |

## ground-truth-facts

- Primary repo: `/Users/kyle/Documents/My Games/Magic The Gathering/homebrew_forge_packet` (cutover 2026-06-08, `docs/67_primary_repo_cutover_notice.md`).
- Default human-review app: `/Applications/Homebrew Forge.app` (Electron desktop shell, port 5187).
- Do NOT use: `homebrew_forge_packet_desktop_migration` (expired worktree).
- Git origin: `https://github.com/JonathanKHobson/homebrew_forge_packet.git`.
- One shared product UI: `packages/editor` serves web + macOS + future Windows; `packages/desktop` must not fork product screens.
- Health hook before finishing work: `scripts/codex/homebrew-forge-launcher-health-hook.sh` (passive by default).
- As of 2026-06-09 (Kyle directive): all planning artifacts are implemented; plans/roadmaps/matrices/backlogs/trackers/research/reports are archived. The live doc surface is specs, standards, references, and navigation only.

## repo-topology

```text
homebrew_forge_packet/
├── AGENTS.md               # Agent entry point — read first
├── README.md               # Human overview + Navigation section
├── docs/                   # Live surface: specs, standards, references, navigation (~39 docs)
│   ├── README.md           # Status-coded master index
│   ├── archive/            # ALL retired planning artifacts (3 buckets, ledger-tracked)
│   └── cowork/             # Orientation, inventory, archive ledger, task map (this packet)
├── packages/               # editor / editor-core / forge / runtime-service / desktop (code — untouched)
├── assets/                 # Icons, packs, source licenses, generated catalog (do not hand-edit catalog)
├── sets/ decks/ collections/ reference/   # USER DATA — never reorganize
├── scripts/                # Launchers, codex hooks, macOS launcher, asset-catalog MCP
├── prompts/                # Active Codex master prompt + index (era prompts archived)
├── reports/ux-audit/       # Immutable audit evidence + README index
├── skills/homebrew-forge/  # Repo skill + ux-quality-gate (pinned)
└── output*/ .tmp/          # Generated noise — never file these
```

## do-not-edit (without explicit instruction)

`sets/`, `decks/`, `collections/`, `reference/` (user data) · `assets/catalog/current/` (generated) · `reports/` content (evidence; index README only) · `PACKET_MANIFEST.json` (historical checksums) · `output*/`, `.tmp/`, `dist/`, `node_modules/` · anything under `packages/*/src`.

## safe-to-edit (organizing/navigation work)

`docs/cowork/*` · `docs/README.md` · `docs/64_repo_cleanup_archive_index.md` (append move records) · additive tag/label lines on docs · `docs/project-map.md` (AGENTS.md requires keeping it current).

## preflight-for-heavy-organizing

Before any future reorganization pass: confirm no `assets/catalog/current/asset-catalog.sqlite.tmp` (or `.tmp-journal`) exists and `asset-catalog.sqlite` mtime is stable.

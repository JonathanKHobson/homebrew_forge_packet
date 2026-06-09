---
status: active
lane: docs
type: index
---
# Repo File Inventory (Co-Work)

🟢 `[status: active]` `[lane: docs]` `[type: index]`

When to use this doc: you need the status or move-safety of any doc/prompt file. Updated 2026-06-09 after the implemented-plans sweep. Per-file purposes live in each file's own tag line + `docs/README.md`; the full move history lives in `docs/cowork/02_repo_archive_manifest.md`. This file intentionally stays small to avoid maintenance drift.

## live-surface (39 docs + indexes)

| Group | Files | Status |
|---|---|---|
| Navigation | docs/README.md, project-map.md 📌, cowork/00–03 + latest packet, 64 | 🟢 |
| Specs | 02, 03 📌, 04, 06, 07, 08, 09, 10, 11, 12, 13, 14, 16, 25, 35, 61, 72 | 🟢 |
| UI standards | 45 📌, 47 📌, 48, 51 | 🟢 |
| QA standards | 38–41 📌 (✅ standing records), 42, 15, 49_forge_ui_visual_qa_checklist, 65, visual-qa-reference-guide | 🟢/✅ |
| Frames + reference | frame-taxonomy, frame-asset-inventory, frame-licensing-ledger, 19_glossary | 🟢 |
| Cutover | 67 📌, 68 | 🟢 |
| Prompts | prompts/codex_master_prompt.md + prompts/README.md | 🟢 |
| Skills/MCP | skills/homebrew-forge/SKILL.md 📌, references/ux-quality-gate.md 📌, scripts/mcp/asset-catalog/README.md | 🟢 |

📌 = `[pin: hard-ref]` — referenced from code, skills, or AGENTS.md. Never move without updating those references first.

## archived (58 files, never deleted)

| Bucket | Contents |
|---|---|
| `docs/archive/2026-06-implemented-plans/` | 39 numbered planning docs + frame-support-roadmap + `external_research/` (5) + `external-research-legacy/` (4, was top-level "external research") + `superpowers-plans/` (2 plans + 9-file research packet) |
| `docs/archive/2026-06-packet-era/` | doc 20 + four era Codex prompts |
| `docs/archive/2026-06-forge-bench-prep/` | docs 43, 44 |

Old path → new path for every file: `docs/cowork/02_repo_archive_manifest.md` and `docs/64_repo_cleanup_archive_index.md`.

## data-and-generated (annotate only, never reorganize)

`sets/`, `decks/`, `collections/`, `reference/` (user data) · `assets/catalog/current/` (generated index) · `output*/`, `.tmp/` (noise) · `reports/ux-audit/` (immutable evidence, indexed by its README) · `csv_templates/`, `schemas/`, `config_examples/`, `examples/`, `src_contracts/` (templates/contracts) · `PACKET_MANIFEST.json` (historical checksum record).

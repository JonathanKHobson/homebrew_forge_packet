---
status: archived
lane: data
type: plan
archived: 2026-06-09
---
> **ARCHIVED 2026-06-09 (implemented-plans sweep)** — original path: `docs/23_reference_sync_rules_update_plan.md`
> Reason: implemented planning artifact, archived per Kyle's 2026-06-09 directive (all plans implemented; no live backlog).
> Index: `docs/cowork/02_repo_archive_manifest.md` + `docs/64_repo_cleanup_archive_index.md`.

# Reference Sync, Rules Wiki, And Versioned Updates

🗄️ `[status: archived]` `[lane: data]` `[type: plan]`

## Goal

Create a self-maintaining reference lane that keeps Homebrew Forge current with
official Magic terms without making normal editor use depend on live network
access.

The sequence is:

1. Sync audit for official terms, token templates, and counter candidates.
2. Rules wiki parsing for the Comprehensive Rules.
3. Reviewed update and promotion flow with archived historical versions.

## Source Boundaries

- Scryfall catalogs are the primary source for current official supertypes,
  card types, subtypes, keyword abilities, keyword actions, and ability words.
- Scryfall token cards and MTGJSON token models are source material for token
  templates. Token entries must preserve type line, colors, power/toughness,
  Oracle text, source set, and aliases when the same token name has multiple
  characteristics.
- Wizards Comprehensive Rules TXT is the source for rule sections, glossary
  entries, predefined token rules, counter rules, and rule-number references.
- `mtg-oracle` is an optional research adapter only. Forge must not require an
  MCP server or `mtg-oracle` process during editor startup, rendering, export,
  or validation.

## Local Data Shape

```text
reference/
  custom/
    references.json
  official/
    current/
      catalog.json
      rules.json
      update-status.json
    history/
      <timestamp>/
        catalog.json
        rules.json
    reports/
      <timestamp>-reference-sync.json
      <timestamp>-reference-sync.md
      <timestamp>-rules-sync.json
      <timestamp>-rules-sync.md
```

`reference/custom/references.json` remains user-created and homebrew-owned.
Generated official data lives under `reference/official/`.

## CLI

- `forge reference audit --source scryfall --json`
  reports current included/project reference counts and available upstream
  source counts without writing.
- `forge reference sync --source scryfall --dry-run --report <path>`
  fetches source data, builds a proposed official catalog snapshot, and writes a
  diff report. Without `--dry-run`, it writes `reference/official/current`.
- `forge reference rules sync --dry-run --report <path>`
  fetches/parses the Comprehensive Rules TXT and writes a rules report. Without
  `--dry-run`, it writes `reference/official/current/rules.json`.
- `forge reference update --check`
  compares stored source metadata with upstream metadata and writes update
  status. It does not mutate current catalog/rules data.

## Versioning Rules

- Every official snapshot records source URL, fetched time, upstream timestamp
  or effective date where available, and a content hash.
- When a term changes, the previous definition/reminder/details are copied into
  the term's `versions` array before the current version is replaced.
- Promotion archives the previous `current` files under `history/<timestamp>/`
  before writing the new current files.
- Historical wording should be backfilled only from available source snapshots
  or official archived rules/docs. Do not invent old wording.

## Editor Behavior

- The References workspace keeps Terms and Rules as modes inside the existing
  workspace.
- Terms mode keeps the existing category list and term detail panel.
- Rules mode lists parsed rule sections and glossary entries, supports search,
  and shows rule number, title, effective date, source URL, related terms, and
  section text in the detail panel.
- The editor reads local snapshots through `/api/reference`. It does not perform
  network sync on startup.

## Verification

- Forge unit tests cover Scryfall catalog parsing, token canonicalization,
  counter candidate extraction, rules TXT parsing, diff generation, custom term
  merge behavior, and promotion archiving.
- Full handoff requires Forge tests, root typecheck/build, editor build, and
  visual QA of the References Terms and Rules views.
- Advanced References filters live in the editor layer. Source/rules snapshots
  stay deterministic, while active-set/card usage filters are computed from the
  currently loaded editor project.

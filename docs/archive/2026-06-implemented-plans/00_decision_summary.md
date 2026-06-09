---
status: archived
lane: docs
type: plan
archived: 2026-06-09
---
> **ARCHIVED 2026-06-09 (implemented-plans sweep)** — original path: `docs/00_decision_summary.md`
> Reason: implemented planning artifact, archived per Kyle's 2026-06-09 directive (all plans implemented; no live backlog).
> Index: `docs/cowork/02_repo_archive_manifest.md` + `docs/64_repo_cleanup_archive_index.md`.

# Decision Summary

🗄️ `[status: archived]` `[lane: docs]` `[type: plan]`

## Product name

**Homebrew Forge**

## One-sentence purpose

A local, spreadsheet-first Magic-style card production system for any custom set or deck.

## Chosen route

Use a **TypeScript/React + Node CLI app**.

Reasons:

1. The same renderer can power both a local editor and batch exports.
2. CSV/JSON/YAML data remains the source of truth.
3. React/SVG is better than browser automation for predictable rendering.
4. Node is a natural fit for CLI tooling, Playwright screenshots, Sharp image processing, and local dev servers.
5. Codex can work well on a repo with clear AGENTS.md guidance, TypeScript contracts, tests, and phase prompts.

## Non-goals

- Do not create a Black Panther-specific app.
- Do not use MTG.design as a database or hidden backend.
- Do not require Magic Set Editor for day-to-day editing.
- Do not include copyrighted frame assets in the repo.
- Do not scrape websites that do not clearly permit automated copying.
- Do not make “realistic counterfeits.” Add visible private-playtest markings in export profiles.

## Core principle

```text
Source of truth: set CSV/JSON/YAML + local art + asset manifests
Generated output: disposable PNG/JPG/PDF/XML files
External card data: reference/cache only
External editors: import/export adapters only
```

## Recommended MVP

MVP should support:

- set folders,
- CSV import,
- card schema validation,
- local art manifest,
- asset pack manifest,
- normal single-faced cards,
- creature/noncreature/land/artifact/enchantment/instant/sorcery/planeswalker layouts,
- basic mana and tap symbols,
- PNG/JPG export,
- Cockatrice XML/image ZIP,
- local web editor with live preview,
- changed-card-only rendering.

Defer:

- all showcase frames,
- every exotic frame variant,
- full DFC/split/adventure/saga/battle perfection,
- AI-assisted card design inside the app,
- public sharing/gallery functions,
- print-shop-ready outputs.

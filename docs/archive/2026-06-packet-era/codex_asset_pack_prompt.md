---
status: archived
lane: codex
archived: 2026-06-09
---
🗄️ `[status: archived]` `[lane: codex]` `[archived: 2026-06-09]`

> **ARCHIVED 2026-06-09** — original path: `prompts/codex_asset_pack_prompt.md`
> Reason: era-specific Codex prompt; the work it directed has shipped. Current agent instructions: `AGENTS.md` + `skills/homebrew-forge/SKILL.md`; active system prompt: `prompts/codex_master_prompt.md`.
> Index: `docs/cowork/02_repo_archive_manifest.md` + `docs/64_repo_cleanup_archive_index.md`.

# Codex Prompt — Asset Pack System

Implement the Homebrew Forge asset-pack system.

Important constraints:

- Do not include official/copyrighted frame images in the repository.
- Do not scrape websites by default.
- Do not fetch from MTG.design.
- Do not fetch Card Conjurer assets remotely.
- Implement local import first.
- Implement remote/package adapters only when the source config includes license metadata.

## Required files/contracts

Create:

- `packages/assets/src/AssetPack.ts`
- `packages/assets/src/AssetSourcePlugin.ts`
- `packages/assets/src/loadAssetPack.ts`
- `packages/assets/src/auditAssetPack.ts`
- `packages/assets/src/sources/localDirectory.ts`
- `packages/assets/src/sources/npmPackage.ts`
- `packages/assets/src/sources/githubRelease.ts`

## Required manifest fields

- `pack_id`
- `name`
- `version`
- `source_summary`
- `licenses`
- `redistribution_allowed`
- `commit_allowed`
- `supported_layouts`
- `roles`
- `fonts`
- `symbols`
- `layout_maps`

## CLI commands

Add:

```bash
forge assets list
forge assets audit --pack <pack-id>
forge assets import-local --pack <pack-id> --path <path>
forge assets sync --source <source-id>
```

## Safety checks

Fail if:

- license metadata missing,
- source disabled,
- required role missing,
- file hash changed unexpectedly,
- source wants to write into an existing pack without dry-run/confirmation.

## Debug pack

Create a minimal debug asset pack with a plain placeholder frame for tests only. It must render a visible “DEBUG FRAME / CUSTOM PLAYTEST” marking.

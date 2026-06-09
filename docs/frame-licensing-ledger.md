---
status: active
lane: data
type: reference
---
# Frame Licensing Ledger

🟢 `[status: active]` `[lane: data]` `[type: reference]`

Do not add third-party frame art to the repo unless this ledger has enough
provenance to justify the use.

## Rules

- Local private assets may be used for Kyle's local workflow when their manifest says `commit_allowed: false`.
- Online assets are reference-only unless Kyle supplies them or the license explicitly permits the intended use.
- Do not copy official card images, logos, symbols, or proprietary frame art into committed assets.
- Homage frames must be visually distinct and original or licensed.

## Ledger Fields

| Field | Meaning |
| --- | --- |
| Asset name | Human-readable asset or pack name. |
| File path | Local path or manifest path. |
| Creator/source | Known creator, project, or source. |
| License | Private, MIT, Apache, CC, permission-needed, unknown, etc. |
| Redistribution allowed | Whether assets can be committed/shared. |
| Commercial use allowed | Whether exported/public use is allowed. |
| Derivative use allowed | Whether modifications are allowed. |
| Attribution required | Required credit text. |
| Contains WotC IP | Whether it contains official Magic trade dress or marks. |
| Safe to commit | Yes/no. |
| Safe to export | Yes/no. |
| Notes | Permission proof, uncertainty, or blocked status. |

## Current Ledger

| Asset | Path | License status | Safe to commit | Safe to export | Notes |
| --- | --- | --- | --- | --- | --- |
| Basic M15 Local MSE Pack | `assets/packs/basic-m15-local/manifest.yaml` | user supplied private use | no | local only | Manifest marks redistribution and commit disallowed. |
| Figma MTG Card Assets | `assets/packs/figma-mtg-card-assets/manifest.yaml` | user supplied private use | no | local only | Local SVG export, not a repo asset source. |
| GenevensiS Local Frames | `assets/packs/genevensis-local/manifest.yaml` | user supplied private use | no | local only | Local frame and symbol assets. |
| Private MTG-Style Pack | `assets/packs/private-mtg-style/manifest.yaml` | user supplied private use | no | local only | Placeholder manifest and private local assets. |

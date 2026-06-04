# Asset Source Matrix

This matrix is for planning asset ingestion. It is not legal advice. Codex should implement source adapters only after license/terms metadata is captured in `asset_sources.yaml`.

| Source | Use | Recommended role | Risk | Implementation |
|---|---|---|---|---|
| Local user folder | User-owned frames/art/templates | Primary frame source | Depends on user rights | `local_directory` adapter |
| Commissioned/user art | Card art | Primary art source | Low if permission documented | `art_manifest.csv` |
| Generated/personal art | Card art/placeholders | Primary/secondary art source | Depends on model/tool/license | `art_manifest.csv` |
| `mana-font` | Mana/tap/card symbols | Inline symbols | WotC symbol copyright remains | npm/package adapter |
| Keyrune | Set symbols | Set-symbol font | WotC set-symbol trademark/copyright remains | npm/package adapter |
| `mtg-vectors` | Set/watermark/misc SVGs | Vector symbols/watermarks | WotC IP still relevant | GitHub release adapter |
| Scryfall | Existing card data/images/art crops | Reference/reskin/import aid | Images/mana symbols are WotC IP; follow Scryfall terms | API/cache adapter with rate limits |
| MTGJSON | Existing card metadata | Reference cache | Data only, no frames | file download/cache adapter |
| Card Conjurer local copy | Existing local templates/assets | Optional local import | Repository history includes WotC C&D; use caution | local-only importer, disabled by default |
| MTG.design | Existing user-created cards | UI inspiration/import exported images only | No public asset repo/API found | do not scrape; manual export/import only |
| Magic Set Editor | Existing `.mse-set` projects/templates | Migration/adapter | Template assets may have mixed rights | importer/exporter only |
| Proxyshop/Photoshop templates | High-fidelity renders | Optional external pipeline | Photoshop dependency + asset rights | external tool adapter, not MVP |

## Practical recommendation

For MVP:

1. Implement `mana-font`, Keyrune, and local asset folder ingestion.
2. Implement MTGJSON/Scryfall reference cache.
3. Implement Cockatrice output.
4. Add `mtg-vectors` ingestion for set/watermark symbols.
5. Add Card Conjurer local asset importer only if needed.
6. Do not scrape MTG.design.

## Source checks for adapters

Every remote source adapter must record:

- source URL,
- license URL or license file,
- date fetched,
- file checksums,
- whether redistribution is allowed,
- whether files may be committed,
- whether only local cache use is allowed,
- attribution text.

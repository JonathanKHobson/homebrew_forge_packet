---
status: archived
lane: docs
type: research
archived: 2026-06-09
---
> **ARCHIVED 2026-06-09 (implemented-plans sweep)** — original path: `docs/01_research_summary.md`
> Reason: implemented planning artifact, archived per Kyle's 2026-06-09 directive (all plans implemented; no live backlog).
> Index: `docs/cowork/02_repo_archive_manifest.md` + `docs/64_repo_cleanup_archive_index.md`.

# Research Summary

🗄️ `[status: archived]` `[lane: docs]` `[type: research]`

This packet is based on a survey of current tools and public references relevant to a local Magic-style card workflow.

## MTG.design

MTG.design advertises browser-based card creation, saving, sharing, and local export. It is excellent as a low-friction UI model, but its account/editor-centered workflow is exactly the issue for bulk reproducibility. It should be treated as UI inspiration and possible import target, not the backend.

Source: https://mtg.design/

## Card Conjurer

Card Conjurer has public local/offline repositories and is useful as a reference for how a mature custom-card editor handles frame templates, art, and local use. However, the public repository itself notes that the original webhost was taken down after Wizards of the Coast sent cease-and-desist paperwork. Therefore, this workflow should not make Card Conjurer a required dependency or remotely scrape it. At most, support an optional **local-directory asset importer** where the user points Homebrew Forge to a copy/assets they are allowed to use.

Source: https://github.com/Investigamer/cardconjurer

## React/SVG renderers

Existing React/SVG projects demonstrate that rendering Magic-style cards in the browser with SVG layers, CSS custom properties, inline symbols, and a single React component is practical. This supports the chosen TypeScript/React architecture.

Source: https://github.com/FeSens/mtg-card

## MTG.design resources

A historical forum post described an MTG.design vector-based renderer with separate components, recipes, and rendering files. However, the MTG-Design GitHub organization currently shows no public repositories. Treat this as a useful design pattern, not as a dependable asset source.

Sources:
- https://slightlymagic.net/forum/viewtopic.php?f=30&t=31118
- https://github.com/MTG-Design

## Mana symbols

The `mana-font` project provides mana, tap, and card-type symbols as a font and CSS/Sass package. It is useful for inline mana costs and rules text. Its documentation says the font is SIL OFL 1.1 and the CSS/LESS/Sass are MIT, while the underlying Magic symbols are Wizards IP.

Sources:
- https://github.com/andrewgioia/mana
- https://mana.andrewgioia.com/

## Set symbols and watermarks

Keyrune provides set symbols as a pictographic font. It is useful for set-symbol display if the project follows its license and Fan Content restrictions. `mtg-vectors` provides SVG files for set, watermark, and miscellaneous symbols under MPL-2.0 and may be useful for vector symbol assets.

Sources:
- https://github.com/andrewgioia/keyrune
- https://keyrune4.andrewgioia.com/docs/
- https://github.com/Investigamer/mtg-vectors

## Reference card data

Scryfall provides a REST-like API and daily bulk exports. MTGJSON provides portable MTG data in formats including JSON, CSV, SQL, SQLite, Parquet, and compressed files. These are strong candidates for local reference/cache layers used for wording comparison, importing existing card metadata, and reskin workflows.

Sources:
- https://scryfall.com/docs/api
- https://scryfall.com/docs/api/bulk-data
- https://mtgjson.com/getting-started/
- https://mtgjson.com/

## Cockatrice

The MSE-to-Cockatrice exporter is a helpful reference for custom-set output shape: XML plus associated image files. Its README says card images go under `Cockatrice/pics/CUSTOM/<set code>` and the XML goes in the `customsets` folder.

Source: https://github.com/normaldream/mse-cockatrice-v4-exporter/blob/main/data/magic-cockatrice-database-v4.mse-export-template/README.md

## Codex project guidance

OpenAI's Codex documentation says Codex reads `AGENTS.md` files before work, and project-level instructions help create consistent behavior. This packet includes an AGENTS.md tailored for Homebrew Forge.

Source: https://developers.openai.com/codex/guides/agents-md

## Legal / safety baseline

Wizards' Fan Content Policy says fan content must be unofficial, should not remove legal notices, and does not include verbatim copying/reposting of Wizards IP or counterfeit/proxy Magic cards. Wizards' proxy policy post distinguishes personal, non-commercial playtest cards from counterfeits and official sanctioned-event cards.

Sources:
- https://company.wizards.com/en/legal/fancontentpolicy
- https://magic.wizards.com/en/news/announcements/proxies-policy-and-communication-2016-01-14

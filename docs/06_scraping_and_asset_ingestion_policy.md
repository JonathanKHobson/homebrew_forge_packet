---
status: active
lane: data
type: spec
---
# Scraping and Asset Ingestion Policy

🟢 `[status: active]` `[lane: data]` `[type: spec]`

## Position

Homebrew Forge should support **asset ingestion**, not reckless scraping.

The user goal is valid: stop manually re-uploading art URLs and stop remaking frames by hand. The correct engineering pattern is a manifest-driven asset cache with adapters for allowed sources.

## Allowed ingestion patterns

Allowed by design:

1. **Local directory import**
   - User points the app at a folder.
   - The app indexes files, hashes them, and creates an asset manifest.

2. **Package manager import**
   - Example: install `mana-font` or Keyrune from npm.
   - The app copies/links only needed files and records license metadata.

3. **GitHub release/repository import**
   - Only for public repositories with license metadata.
   - The app stores commit/release tag and license text.
   - The app does not imply all assets are safe for commercial redistribution.

4. **API-based reference cache**
   - Example: Scryfall/MTGJSON for card data.
   - Respect documented rate limits and terms.

5. **Manual URL import for art**
   - User supplies a URL.
   - The app downloads once, stores the file locally, stores source URL and checksum.
   - Future rendering uses the local file, not the live URL.

## Disallowed ingestion patterns

Do not implement:

- bypassing login/account walls,
- bypassing paywalls,
- scraping sites that prohibit automated downloading,
- removing copyright/legal notices,
- stripping artist credits from images,
- cloning private asset libraries,
- scraping MTG.design account data without an explicit export/API,
- packaging or distributing copyrighted frame assets as part of the repo,
- generating cards meant to pass as official/counterfeit Magic cards.

## Adapter guardrails

Each `AssetSourcePlugin` must:

- have an explicit `source_id`,
- load a source config from `asset_sources.yaml`,
- require a `license_review` block,
- write a fetch log,
- hash all files,
- refuse to run if `enabled: false`,
- refuse to commit files marked `redistribution_allowed: false`,
- support dry-run mode,
- never overwrite user-edited files without confirmation.

## Recommended asset CLI

```bash
forge assets list-sources
forge assets sync --source mana
forge assets sync --source keyrune
forge assets sync --source mtg-vectors
forge assets import-local --pack my-modern-pack --path ~/CardAssets/modern
forge assets audit --pack my-modern-pack
forge assets verify --set SG1
```

## Why this is better than browser scraping

Browser scraping MTG.design or other editors preserves the exact failure mode you are trying to escape: hidden state, fragile UI behavior, URLs that can rot, and nondeterministic export behavior. Asset ingestion turns assets into versioned, local files with checksums and manifests.

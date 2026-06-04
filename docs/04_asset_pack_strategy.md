# Asset Pack Strategy

## Goal

Separate the card data engine from visual assets.

Homebrew Forge should not “know” where the modern frame, saga frame, planeswalker frame, mana icons, or set symbols came from. It should only know how to load an installed asset pack whose manifest declares the layers and coordinates.

## Asset pack shape

```text
assets/packs/<pack-id>/
  manifest.yaml
  LICENSES/
    source-1.txt
    source-2.txt
  fonts/
  symbols/
  frames/
    normal/
    planeswalker/
    saga/
    battle/
    token/
  layout-maps/
    normal.yaml
    creature.yaml
    planeswalker.yaml
    saga.yaml
  styles/
    colors.css
    typography.css
```

## Manifest responsibilities

An asset-pack manifest must declare:

- pack ID/version,
- source URLs,
- license summary,
- attribution requirements,
- redistribution permission,
- whether assets may be committed to Git,
- frame roles,
- layout maps,
- fonts,
- symbol providers,
- default text boxes,
- art crop masks,
- known supported layouts.

## Asset roles

Use role names rather than file names hard-coded into renderer code:

- `frame.background`
- `frame.border`
- `frame.pinlines`
- `frame.title_box`
- `frame.type_box`
- `frame.rules_box`
- `frame.pt_box`
- `frame.loyalty_box`
- `frame.defense_box`
- `frame.saga_chapter_icon`
- `symbol.mana`
- `symbol.tap`
- `symbol.untap`
- `symbol.chaos`
- `symbol.set`
- `symbol.watermark`
- `font.title`
- `font.rules`
- `font.symbols`

## The renderer contract

The renderer asks:

```ts
assetPack.resolve({ role: 'frame.title_box', layout: 'normal', color: 'W' })
```

It should not ask:

```ts
assets/modern/w/title_box_official_2023.png
```

## Debug frame

A tiny built-in debug frame is acceptable for development and testing:

- plain boxes,
- no official styling,
- visible “DEBUG FRAME” watermark,
- not intended for final exports.

This keeps tests functional before a user installs an asset pack.

## Production frame assets

Production-looking frame assets should come from:

- local asset packs supplied by the user,
- openly licensed asset packs,
- permitted GitHub repositories with license review,
- custom/private asset packs.

Do not embed official or third-party copyrighted assets in the Homebrew Forge repo.

# Renderer Engine Spec

## Goal

Render card records into images using the same React components in the editor and the CLI.

## Rendering pipeline

```text
CardRecord + CardFaces + ArtManifest + AssetPack + ExportProfile
  -> normalize symbols/text
  -> resolve frame/layout map
  -> render React component
  -> capture via Playwright
  -> postprocess via Sharp
  -> write image + render metadata
```

## Core React component

```tsx
<MtgCardRender
  card={cardRecord}
  faces={cardFaces}
  art={resolvedArt}
  assetPack={assetPack}
  exportProfile={profile}
/>
```

## Layout maps

Each layout map defines zones:

```yaml
layout: normal-creature
canvas:
  width: 744
  height: 1039
zones:
  name:
    x: 62
    y: 48
    w: 470
    h: 44
  mana_cost:
    x: 535
    y: 48
    w: 145
    h: 44
  art:
    x: 67
    y: 105
    w: 610
    h: 445
  type_line:
    x: 62
    y: 562
    w: 620
    h: 42
  rules_text:
    x: 77
    y: 630
    w: 585
    h: 245
  pt:
    x: 570
    y: 882
    w: 95
    h: 45
```

## Supported layouts by phase

### Phase 1

- normal creature
- normal noncreature
- artifact
- enchantment
- instant
- sorcery
- land
- token

### Phase 2

- planeswalker
- saga
- vehicle
- equipment
- aura
- battle

### Phase 3

- double-faced card
- modal DFC
- split card
- adventure
- aftermath
- case/class/room variants
- plane/scheme/phenomenon/vanguard/dungeon

## Text handling

Renderer must support:

- auto-fit rules text,
- flavor text italicization,
- em dash bullets,
- line breaks from CSV `\n`,
- mana symbol parsing from `{W}`, `{U}`, `{B}`, `{R}`, `{G}`, `{C}`, `{1}`, `{X}`, `{T}`, `{Q}`, hybrid, Phyrexian, snow, energy, ticket,
- custom symbols from asset packs,
- fallback text if a symbol is missing.

## Export profiles

Export profiles control:

- pixel size,
- image format,
- bleed/crop margins,
- watermark/playtest marking,
- color mode,
- compression quality,
- Cockatrice naming,
- whether to include artist/source credits.

## Changed-card rendering

Use a hash over:

- card row,
- face rows,
- art file checksum,
- asset pack manifest checksum,
- export profile,
- renderer version.

If unchanged, skip rendering.

## Debug mode

Every render should emit a JSON sidecar:

```json
{
  "card_id": "DEMO-001",
  "rendered_at": "2026-06-01T00:00:00Z",
  "hash": "...",
  "asset_pack": "debug@0.1.0",
  "warnings": []
}
```

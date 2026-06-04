# Validation and Rules Linting

## Layers

### 1. Schema validation

Checks data shape:

- required fields,
- enum values,
- valid IDs,
- valid file paths,
- face count for layout.

### 2. Layout validation

Checks visual/render requirements:

- art exists,
- selected asset pack supports layout,
- text zones exist,
- special values like P/T/loyalty/defense have zones.

### 3. Magic templating lint

Checks rules text quality:

- official action words,
- consistent triggers: When/Whenever/At,
- `until end of turn`,
- target wording,
- keyword spelling,
- token names,
- cost formatting.

### 4. Color-pie/design lint

Warns about potential color-pie mismatch using reference data and a local mechanics guide.

### 5. Export validation

Checks output:

- image generated,
- image dimensions match profile,
- XML parses,
- no duplicate filenames,
- ZIP contains expected files.

## Severity levels

- `error`: cannot render/export.
- `warning`: likely issue; user can continue.
- `note`: design suggestion.
- `ignored`: explicitly waived by user.

## Waivers

Allow waivers in CSV/YAML:

```yaml
waivers:
  - card_id: DEMO-012
    rule: color-pie-direct-damage-white
    reason: intentionally expensive off-color color-pie break
```

## Useful validators

- `card-type-components`
- `mana-cost-parser`
- `keyword-known`
- `action-known`
- `token-known`
- `counter-known`
- `aura-has-enchant`
- `equipment-has-equip`
- `vehicle-has-crew`
- `planeswalker-has-loyalty`
- `battle-has-defense`
- `land-cost-check`
- `render-zone-support`
- `missing-art`
- `missing-asset`

## Built-in mechanics guide

The app should keep a local mechanics reference file for known keywords, actions, tokens, counters, card types, and color-pie notes. This supports lints and Codex prompts.

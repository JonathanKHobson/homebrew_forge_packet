---
status: active
lane: data
type: spec
---
# Cockatrice Export Spec

🟢 `[status: active]` `[lane: data]` `[type: spec]`

## Output shape

Homebrew Forge should generate:

```text
output/<SET>/cockatrice/
  <SET>.xml
  pics/
    CUSTOM/
      <SET>/
        Card Name.jpg
        Another Card.jpg
  <SET>-cockatrice.zip
```

The ZIP should preserve this structure or include a README with exact install paths.

## Install paths

Common Cockatrice custom-set layout:

```text
Cockatrice/customsets/<SET>.xml
Cockatrice/pics/CUSTOM/<SET>/<card images>
```

## Card XML requirements

For each card include as available:

- name,
- set code,
- color identity/colors,
- mana cost,
- type line,
- oracle text,
- power/toughness,
- loyalty/defense where applicable,
- side/layout metadata if useful,
- `picURL` or local image mapping if supported.

## Tokens

Tokens can be:

- included in same XML,
- included in separate token XML if the profile asks,
- named with set-code prefix to avoid collisions.

## Image filenames

Use deterministic safe filenames. Avoid raw punctuation issues.

Recommended:

```text
<collector_number>_<slugified-card-name>.jpg
```

Then reference those files in XML where possible.

## Validation

`forge export cockatrice` should fail if:

- a final card lacks rendered image,
- duplicate card names collide unexpectedly,
- XML cannot be parsed after generation,
- required set metadata is missing.

## README for generated ZIP

Generated ZIP should include:

```text
INSTALL_COCKATRICE.md
```

with:

1. copy XML to `customsets`,
2. copy images folder to `pics/CUSTOM/<SET>`,
3. restart Cockatrice,
4. check one card image.

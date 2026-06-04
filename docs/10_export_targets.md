# Export Targets

## Individual images

Targets:

```text
output/<SET>/images/png/<card-id>.png
output/<SET>/images/jpg/<card-id>.jpg
```

Options:

- format: PNG/JPG/WebP,
- resolution: low/medium/high/custom,
- include bleed,
- include crop marks,
- include playtest watermark,
- side/front/back naming.

## Cockatrice

Output:

```text
output/<SET>/cockatrice/<SET>.xml
output/<SET>/cockatrice/pics/CUSTOM/<SET>/*.jpg
output/<SET>/cockatrice/<SET>-cockatrice.zip
```

## Decklists

Output:

```text
<deck-id>.txt
<deck-id>.cod
```

Plain text decklists group entries as Main, Sideboard, and Maybeboard.
Cockatrice `.cod` deck export writes the Main and Side zones; Maybeboard stays
inside Homebrew Forge for planning and appears in the plain text export.

Deck export does not replace the custom set package export. Cockatrice still
needs the relevant custom set XML/images from `output/<SET>/cockatrice/` when a
deck references homebrew cards.

## Print PDF

Output:

```text
output/<SET>/print/<SET>-letter-9up.pdf
output/<SET>/print/<SET>-a4-9up.pdf
```

MVP can assemble already-rendered card images. Later versions can support bleed/crop marks and printer calibration.

## Web gallery

Optional later:

```text
output/<SET>/gallery/index.html
```

Use this for browsing and sharing with playtesters, but avoid public distribution of copyrighted assets unless permissions are clear.

## Tabletop Simulator / other clients

Future adapters:

- Tabletop Simulator sheets,
- Untap.in exports,
- Moxfield-style decklists for reskins,
- Draftmancer custom set JSON,
- LackeyCCG.

## Export profile example

```yaml
profiles:
  cockatrice:
    image_format: jpg
    width_px: 488
    height_px: 680
    quality: 86
    include_playtest_watermark: true
    watermark_text: "CUSTOM PLAYTEST — NOT FOR SALE"
    include_bleed: false
    filename_template: "{{safe_name}}.jpg"
  print:
    image_format: png
    width_px: 744
    height_px: 1039
    include_playtest_watermark: true
    include_bleed: true
    bleed_px: 36
```

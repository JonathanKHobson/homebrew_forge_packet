# Frame Taxonomy

Homebrew Forge frame support separates rules identity from visual presentation.
Do not collapse these concepts into one `frameType`.

## Concepts

- Card type: rules type from the type line, such as Creature, Artifact, Battle, Dungeon, Kindred, Plane, or Vanguard.
- Subtype: type-line detail that may drive validation or layout, such as Saga, Class, Case, Room, Vehicle, Equipment, Aura, Omen, Adventure, Siege, Attraction, Role, or Spacecraft.
- Layout: geometry of the card or object, such as normal, token, saga, class, case, battle, adventure, split, transform, modal DFC, plane, scheme, dungeon, or vanguard.
- Frame style: visual skin, such as M15/default modern, altered, borderless, classic, GenevensiS, Figma, or private MTG-style.
- Treatment: collector or special presentation layered over a style, such as full art, extended art, showcase, miracle, tombstone, devoid, or legendary crown.
- Border color: print/export border choice, such as black, white, silver, gold, borderless, or none.
- Game object: non-normal card object such as token, emblem, sticker sheet, dungeon, plane, scheme, attraction, or conspiracy.

## Naming Rules

- Use `Kindred` internally for the current card type, and preserve `Tribal` only as an import alias.
- Use `prepare` or `preparation` for the frame/layout family.
- Use `prepared` only for the in-game designation/state from the mechanic.
- Use `modal_dfc` internally, with import aliases for `modal-dfc`, `mdfc`, and `double-faced`.
- Use subtype inference for Vehicle, Equipment, Aura, Saga, Class, Case, Room, Omen, Adventure, and Siege.

## Support States

- `renderable`: editor preview, SVG render, PNG export, and QA snapshots work.
- `registered-only`: metadata is recognized and preserved, but rendering falls back.
- `asset-present-unwired`: local assets exist but the renderer does not yet use them.
- `partial-renderer`: renders but lacks validation, dense-text handling, or full QA.
- `reference-only`: online/rules reference exists but no local licensed asset is wired.
- `needs-assets`: no confirmed local or licensed asset source.
- `blocked-license-review`: asset exists but provenance is not cleared.
- `out-of-scope-for-now`: intentionally deferred.

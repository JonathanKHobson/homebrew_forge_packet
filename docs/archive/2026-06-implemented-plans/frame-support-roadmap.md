---
status: archived
lane: runtime
type: plan
archived: 2026-06-09
---
> **ARCHIVED 2026-06-09 (implemented-plans sweep)** — original path: `docs/frame-support-roadmap.md`
> Reason: implemented planning artifact, archived per Kyle's 2026-06-09 directive (all plans implemented; no live backlog).
> Index: `docs/cowork/02_repo_archive_manifest.md` + `docs/64_repo_cleanup_archive_index.md`.

# Frame Support Roadmap

🗄️ `[status: archived]` `[lane: runtime]` `[type: plan]`

This is the durable implementation map for expanding card type, subtype, layout,
frame style, treatment, and border support.

## Current Foundation

- Source type/subtype options from `reference/official/current/catalog.json`.
- Current snapshot baseline: `2026-06-04T00:42:45.295Z`.
- Compose frame support from registries under `packages/editor/src/domain/`.
- Keep `packages/editor/src/domain/frameRegistry.ts` as the compatibility facade for existing callers.

## Card Types

All current catalog card types are recognized as support scope:

Artifact, Battle, Boss, Conspiracy, Creature, Dungeon, Emblem, Enchantment,
Event, Hero, Instant, Kindred, Land, Phenomenon, Plane, Planeswalker, Scheme,
Sorcery, Vanguard.

Renderable today: normal creature/spell, artifact, land, planeswalker, token,
and full-art token. Vehicle currently resolves through the artifact frame as a
partial renderer until a dedicated vehicle asset is wired.

Registered or fallback today: Battle, Boss, Conspiracy, Dungeon, Emblem, Event,
Hero, Kindred-specific presentation, Phenomenon, Plane, Scheme, Vanguard.

## Subtype-Driven Support

Special subtype inference exists or is mapped for:

Saga, Class, Case, Room, Vehicle, Equipment, Aura, Omen, Adventure, Lesson,
Siege, Attraction, Spacecraft, Role, Food, Clue, Treasure, Blood, Map,
Powerstone, and Incubator.

All other catalog subtypes remain selectable/searchable through the reference
catalog and should round-trip without forcing a unique renderer.

## Slice Order

1. Taxonomy, support contracts, and asset inventory.
2. Core normal frames and mixed type-line inference.
3. Border colors, frame styles, and treatments.
4. Saga, Class, Case, and Room.
5. Vehicle, Equipment, Aura, Prototype, Leveler, and Station.
6. Adventure, Omen, and Prepare/Preparation.
7. Split, Fuse, Aftermath, Flip, DFC, and Meld.
8. Battle, Plane, Phenomenon, Scheme, Vanguard, Dungeon, Conspiracy, and Emblem.
9. Tokens, Attractions, Stickers, and un-set objects.
10. Third-party and original frame packs.

## Demo Rule

Every new frame-support demo card must be squirrel-themed and tagged:

- `frame-support-squirrel-lab`
- `frame-support-slice-<slice-name>`
- `human-review-needed`

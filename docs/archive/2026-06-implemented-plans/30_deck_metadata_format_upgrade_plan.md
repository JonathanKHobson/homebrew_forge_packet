---
status: archived
lane: ui
type: plan
archived: 2026-06-09
---
> **ARCHIVED 2026-06-09 (implemented-plans sweep)** — original path: `docs/30_deck_metadata_format_upgrade_plan.md`
> Reason: implemented planning artifact, archived per Kyle's 2026-06-09 directive (all plans implemented; no live backlog).
> Index: `docs/cowork/02_repo_archive_manifest.md` + `docs/64_repo_cleanup_archive_index.md`.

# Deck Metadata and Format Upgrade Plan

🗄️ `[status: archived]` `[lane: ui]` `[type: plan]`

## Current Priority

Ship a deck workspace that lets a player communicate what the deck is for before
we add legality engines or stats dashboards.

This slice upgrades metadata and preview behavior. It does not attempt format
legality enforcement, automated Commander validation, draw simulation, price
tracking, collection ownership math, or deck-stat visualizations.

## Research Signals

- Wizards' formats hub separates format from strategy. It lists deck formats
  such as Commander, Standard, Pioneer, Modern, Draft, Sealed, Alchemy,
  Historic, Timeless, Pauper, Brawl, Legacy, Vintage, Planechase, Archenemy,
  Oathbreaker, Freeform, Momir Basic, and Commander 1v1.
  Source: https://magic.wizards.com/en/formats
- Wizards' Commander page makes commander, color identity, command zone, and
  Commander bracket metadata first-class for Commander deck conversation.
  Source: https://magic.wizards.com/en/formats/commander
- Cockatrice's visual deck editor treats deck name, comments, banner card, and
  deck tags as editable deck attributes; tags are used for filtering in visual
  deck storage.
  Source: https://cockatrice.github.io/docs/de/d6e/editing_decks_visual.html
- ManaBox creation starts with name plus format, and commander formats expose a
  Commander section with partner support.
  Source: https://www.manabox.app/guides/decks/getting-started/
- Archidekt exposes a large public deck-tag vocabulary that mixes strategic
  archetypes, mechanics, themes, and format/casual labels. The app should not
  force all of those into a single flat "deck tags" field.
  Source: https://websockets.archidekt.com/tags
- Scryfall/MTGJSON-style legality vocabularies include official, digital, and
  popular community formats such as Explorer, Historic Brawl, Standard Brawl,
  Pauper Commander, Duel Commander, Penny Dreadful, Old School, Premodern, and
  PreDH. These are useful suggestions, but Homebrew Forge still needs free-text
  support for local homebrew formats.
  Source: https://mtgjson.com/data-models/legalities/

## Metadata Model

Deck metadata should distinguish:

- `format`: the game format/rules target, with suggestions but free text
  allowed.
- `playStyleTags`: strategic/archetype tags such as Aggro, Control, Combo,
  Midrange, Tempo, Ramp, Tokens, Voltron, Aristocrats, Reanimator, Stax,
  Spellslinger, Toolbox, and Rule Zero.
- `colorIdentity`: deck color identity, stored as Magic color symbols.
- `commander`: the primary commander card reference.
- `partnerCommanders`: optional second/partner commanders.
- `coverCard`: card reference used for deck artwork. Defaults to commander
  behavior in the UI when a commander exists.
- `commanderBracket`: optional Commander bracket label.
- `tags`: generic project/workflow labels, not the main play-style vocabulary.

## Workspace Contract

- Left panel: list and filter decks only.
- Center panel: edit deck card contents by Main, Sideboard, and Maybeboard.
- Right panel: edit selected deck metadata when no card row is selected; edit
  selected deck-entry count/board/variant when a row is selected.
- Card row view icon: open an overlay preview first. Only show a direct edit
  action when the row resolves to an authored card.

## Priority Matrix

| Phase | Priority | Slice | Ship This | Do Not Touch Yet | Verification |
| --- | --- | --- | --- | --- | --- |
| 1 | P0 | Metadata persistence | Store format, play styles, color identity, commander, partner commander, cover card, and Commander bracket without breaking old deck files. | Legality checking and migrations. | Deck test round-trips new metadata. |
| 2 | P0 | Metadata UI | Add create/edit controls in the existing deck inspector pattern. | New deck dashboard. | Typecheck and visual QA confirm controls fit. |
| 3 | P1 | Deck row preview | Add view icon and overlay; keep edit jump only for authored cards. | Auto-copy collection-only cards into sets. | Preview authored and unresolved rows. |
| 4 | P1 | Browse/filter expansion | Filter decks by play style, color identity, Commander bracket, and commander. | Advanced saved searches. | Filter overlay finds known seeded deck metadata. |
| 5 | P2 | Cover presentation | Use cover card/commander artwork in deck list and deck header. | Remote art lookup as a hard dependency. | Deck with commander shows expected local cover. |
| 6 | P2 | Commander-specific boards | Add Commander and Partner board/slots while preserving Main, Side, Maybe. | Automated Commander legality. | Commander deck can save commander slots and export normal list. |
| 7 | P3 | Legality rules | Optional validation warnings for official formats. | Blocking saves on invalid decks. | Warnings are explainable and non-destructive. |
| 8 | P3 | Stats research | Document possible mana curve, card type mix, color pip mix, ramp/removal/card draw counts, threat density, average mana value, land count, price, and bracket indicators. | Stats dashboard implementation. | Research notes only. |

## First Stop Condition

This pass is done when metadata fields persist, the deck create/edit UI exposes
them, deck rows have preview overlays, and the existing typecheck/build/test
lane is run.

## Shipped Continuation

- Phase 4 shipped deck browse filters for play style, color identity,
  Commander bracket, and commander text.
- Phase 5 shipped cover/commander presentation in the deck list and deck
  header, with local authored art when available.
- Phase 6 shipped Commander, Partner, and Cover slots in the center deck space
  without changing Main, Sideboard, or Maybeboard deck-entry storage.
- Phase 7 shipped warning-only legality checks for common constructed, limited,
  Commander-style, Brawl-style, sideboard, commander, and color-identity issues.
- Phase 8 shipped research notes in `docs/31_deck_stats_research_notes.md`
  without adding a stats dashboard.

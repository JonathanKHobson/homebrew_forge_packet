# Deck Stats Research Notes

## Decision

Do not build a deck stats dashboard yet.

The current app can collect enough structured data to support useful deck
statistics later, but this phase should remain research and field inventory.
The immediate deck-builder lane is metadata, card rows, cover/commander slots,
and warning-only format checks.

## Stats Already Possible From Current Data

These can be computed from `DeckState.entries`, resolved `DeckCardOption`
records, and deck metadata:

- Board counts: Main, Sideboard, Maybeboard, Commander, Partner, and Cover slot.
- Total copies by board.
- Resolved vs unresolved deck rows.
- Card type mix from `typeLine`: creature, instant, sorcery, artifact,
  enchantment, planeswalker, battle, land, token.
- Color identity mix from `card.colorIdentity` and deck `colorIdentity`.
- Rarity mix.
- Mana value approximation from `manaCost` once a parser is added.
- Land count and nonland count.
- Creature count and rough threat count.
- Rules-text keyword/theme counts using the local reference catalog.
- Tag overlap between card tags and deck play-style tags.
- Commander-style identity warnings from resolved card identities.
- Variant usage: primary vs alternate variants in the list.

## Stats That Need New Source Data

These should not be promised until the app has the right data source:

- Price, owned quantity, and acquisition status require collection/market data.
- Official format legality requires official card legality data or an explicit
  homebrew legality registry.
- Mana curve should use a reliable mana-value parser rather than text guessing.
- Ramp/removal/card-draw counts require either curated tags, reference rules
  categories, or user overrides.
- Win-rate, matchup, and playtest notes need a playtest log model.
- Commander bracket scoring needs a local policy model; do not infer it from
  raw card text alone.

## Future Dashboard Candidate Panels

When the dashboard phase starts, useful panels would be:

1. Mana curve and land count.
2. Type mix.
3. Color identity and pip mix.
4. Ramp, draw, removal, protection, and win condition counts.
5. Commander bracket indicators.
6. Format warning summary.
7. Collection availability and missing-card list.
8. Variant and print-choice review list.

## Stop Line

For now, expose only warning strips that prevent obvious mistakes. Do not add a
stats dashboard, chart grid, price display, or playtest analytics panel in the
deck metadata upgrade lane.

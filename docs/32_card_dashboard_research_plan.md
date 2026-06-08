# Card Dashboard View Research Plan

Date: 2026-06-05

Status: Phase 0 research and product definition. This document does not implement the dashboard.

## One priority

Build a source-aware dashboard view that helps two different users answer useful questions quickly:

- A homebrew author asks, "What have I made, what patterns am I overusing, and what design gaps exist in this project, set, or card pool?"
- A player or collector asks, "What is in this deck or collection, how likely is it to function, and what should I check before playing or organizing it?"

The dashboard must preserve Homebrew Forge's core distinctions: authored Cards/Sets, Projects, Decks, Collections, and ungrouped cards are related, but they are not the same object.

## Non-goals for this lane

- Do not change the deck metadata schema. Another lane owns deck metadata upgrades.
- Do not change frame registry or frame inference files.
- Do not require live Scryfall, MTGJSON, or other network access for the dashboard to open.
- Do not ship hard-coded "expert advice" without showing the source, assumptions, and adjustable thresholds.
- Do not start with draggable widget editing. First ship a useful fixed dashboard, then make it configurable.

## External research findings

Existing MTG deck and collection tools converge around a small set of useful analytics:

| Source | What it exposes | Dashboard implication |
| --- | --- | --- |
| [CardCastle deck statistics](https://support.cardcastle.co/en/articles/2010489-deck-statistics) | Live card-type breakdown, mana-symbol breakdown, mana curve, and turn probabilities grouped by card, type, or mana cost. | The first player dashboard should include type mix, color/pip mix, curve, and draw odds. |
| [Deckstats.net](https://deckstats.net/index.php?lng=en) and its [deck tools notes](https://deckstats.net/forum/index.php?topic=55002.0) | Mana curve, type distribution, mana-symbol distribution, mana-source distribution, probabilities, sample hands, and collection/deck tracking. | Homebrew Forge should combine deck stats with source-aware collection/deck/card provenance instead of only copying deck charts. |
| [Wizards: How to Build a Mana Curve](https://magic.wizards.com/en/news/feature/how-build-mana-curve-2017-05-18) | Mana curve is about expected play turns and deck plan, not only raw mana value. | Curve widgets should eventually allow "expected cast turn" or category overrides for cards with alternate costs, cycling, X costs, ramp roles, and situational spells. |
| [Wizards: The Basics of Mana](https://magic.wizards.com/en/news/feature/basics-mana-2014-08-18) | Mana base and mana curve are foundational deck-building concepts; rough land guidelines are starting points. | Recommendation cards should say "starting point" and show why a deck may deviate. |
| [Command Zone template summary](https://commanderdeckmaker.com/learn/deckbuilding/command-zone-template) | Commander baselines such as lands, ramp, draw, removal, board wipes, and strategy cards. | Commander widgets should focus on role coverage and should expose the template used. |
| [ScrollVault mana-base calculator](https://scrollvault.net/tools/manabase/) | Frank Karsten-style colored source math, cast-rate estimates, deck imports, and format-specific assumptions. | Advanced deck widgets should model colored source pressure and draw/cast probability with visible assumptions. |
| [MTGJSON](https://mtgjson.net/) | Portable Magic data files, daily updates, TypeScript-facing model documentation, and direct downloads. | MTGJSON is useful as an optional reference dataset for official-card enrichment, not as a required runtime dependency. |
| [Scryfall API overview](https://openpublicapis.com/api/scryfall) and [Scryfall docs](https://scryfall.com/docs/api) | Card search, collections, sets, bulk data, and public JSON endpoints. | Scryfall can supplement official card facts, names, images, keywords, and identities, but local dashboard metrics should run from Homebrew Forge data first. |

## Audience needs

### Homebrew author

Primary questions:

- How many cards are in this project, set, deck, collection, or custom selection?
- Which card types, subtypes, colors, mana values, rarities, tags, frames, layouts, and statuses dominate?
- Which keyword abilities, keyword actions, ability words, counters, tokens, and rules references are overused or underused?
- Which custom mechanics appear only once, appear too often, or lack reference definitions?
- Which cards have missing art, unresolved reference terms, unsupported frame/layout choices, weak validation confidence, or power-estimate coverage gaps?
- Does this set feel balanced across colors, archetypes, costs, rarities, and intended play styles?

Best initial widgets:

- Card count by source and status.
- Color and color-identity mix.
- Card type and subtype distribution.
- Mana value histogram.
- Keyword/mechanic frequency.
- Reference coverage and unresolved terms.
- Power estimate distribution.
- Frame/layout/treatment coverage.
- Missing-art and missing-metadata checklist.

### Player or deck builder

Primary questions:

- Does this deck have enough lands and mana sources for its curve?
- Does the deck have too many creatures, too many noncreature spells, or too little interaction?
- What are my odds of drawing a card, category, land, color source, or package by a given turn?
- How balanced are color requirements versus mana production?
- For Commander, do I have enough ramp, draw, removal, board wipes, protection, recursion, tutors, finishers, and strategy pieces?
- Are there cards that appear powerful but not castable on time?

Best initial widgets:

- Deck composition strip: total, main, sideboard, maybeboard, commander if present.
- Land / creature / other ratio.
- Type mix and instant/sorcery/enchantment/artifact mix.
- Mana curve with color overlays.
- Color pips versus color sources.
- Opening hand and by-turn draw probability for cards, types, and tags.
- Commander role coverage if deck taxonomy data is available.
- Recommendation cards with visible assumptions.

### Collector or library manager

Primary questions:

- What do I own, what is unresolved, and what needs review?
- Which cards are in decks, collections, authored sets, or only in imported scanner rows?
- What is missing set/collector identity, finish, condition, language, location, or quantity?
- Which collection rows can be copied into authored cards or added to decks?

Best initial widgets:

- Matched / needs review / unresolved collection rows.
- Quantity and unique-card counts.
- Finish, condition, language, location, and source distribution.
- Collection rows already used in decks.
- Cards missing print identity.

## Metric taxonomy

### Composition metrics

- Total cards, unique cards, variants, faces, and source rows.
- Source kind: authored card, set card, deck entry, collection row, ungrouped card, custom selection.
- Project, set, deck, collection, and tag membership.
- Card type, supertype, subtype, color, color identity, rarity, mana value, mana cost, power/toughness/loyalty.
- Layout, frame, border, treatment, finish, variant status, primary/default export status.

### Mechanics and reference metrics

- Keyword abilities.
- Keyword actions.
- Ability words.
- Counters, tokens, card-name references, and glossary/rules references.
- Homebrew mechanics and custom reference definitions.
- Unresolved, duplicate, stale, or coverage-gap reference terms.
- Rule text length and reminder-text expansion pressure.

### Deck health metrics

- Land count and land percentage.
- Creature / noncreature / other ratios.
- Mana curve by mana value and expected cast turn.
- Color-pip demand versus color-source production.
- Draw odds by card, type, tag, package, or custom group.
- Commander role coverage: ramp, draw, targeted removal, board wipes, interaction, protection, recursion, tutors, finishers, enablers, payoffs, enhancers.
- Sideboard and maybeboard composition.
- Format/style warning cards, once stable deck metadata is available.

### Collection health metrics

- Matched, ambiguous, needs-review, and unresolved rows.
- Quantity, finish, condition, language, location, and import source.
- Rows used in decks.
- Rows copied into authored card/set data.
- Duplicate print identities and uncertain print identity clusters.

### Design-health metrics

- Power estimate distribution.
- Power confidence distribution.
- Cards with high score and low confidence.
- Cards with unsupported terms or formula coverage gaps.
- Color-pie concentration and repeated effect patterns.
- Keyword/mechanic density by color, type, rarity, project, or set.

## Visualization patterns

Use varied visuals, but each visual needs a question it answers.

| Pattern | Use when | Avoid when |
| --- | --- | --- |
| KPI strip | The user needs a fast dashboard headline. | The number has no decision attached. |
| Stacked bar | Comparing composition across sources, colors, types, or roles. | More than roughly 8 categories need precise comparison. |
| Horizontal ranked bar | Showing top keywords, subtypes, tags, missing fields, or role counts. | The category list is tiny. |
| Histogram | Showing mana value, power estimate, text length, or confidence distributions. | The values are nominal categories. |
| Heatmap | Crossing two dimensions, such as color by mana value or type by rarity. | Labels would be unreadable. |
| Donut / pie | Showing a simple part-of-whole snapshot such as card type or review state. | The chart has many similar slices. |
| Timeline | Showing card creation, edits, imports, or set progress over time. | There is no durable timestamp data. |
| Radar | Comparing one deck against a role template. | The exact quantities matter more than shape. |
| Probability table + line | Showing by-turn odds for cards, lands, roles, or packages. | The math assumptions are hidden. |
| 3D view | Only for an explorable analytical cube, such as source x type x color, where the third axis carries real meaning. | It is decorative, harder to read, or slows the first useful release. |

## Dashboard scope model

The dashboard should not start by asking "which chart?" It should start by asking "what card universe is being summarized?"

Suggested scope shape:

```ts
type DashboardScopeKind =
  | "all_cards"
  | "project"
  | "set"
  | "deck"
  | "collection"
  | "ungrouped"
  | "custom_selection";

interface DashboardScope {
  kind: DashboardScopeKind;
  id?: string;
  label: string;
  includeDeckSections?: Array<"main" | "sideboard" | "maybeboard">;
  includeCollectionRows?: "all" | "matched" | "needs_review" | "unresolved";
  cardIds?: string[];
  tagFilters?: string[];
}
```

The scope selector should support:

- All authored cards.
- One project.
- One set.
- Ungrouped authored cards.
- One deck, with section filters.
- One collection, with review-state filters.
- A custom card group assembled from the dashboard card list.

## Card fact model

The dashboard should normalize cards and rows into facts rather than forcing every source into authored-card shape.

```ts
interface DashboardCardFact {
  sourceKind: "authored_card" | "deck_entry" | "collection_row";
  sourceId: string;
  projectId?: string;
  setCode?: string;
  deckId?: string;
  collectionId?: string;
  cardId?: string;
  variantId?: string;
  name: string;
  quantity: number;
  section?: "main" | "sideboard" | "maybeboard";
  colors: string[];
  colorIdentity: string[];
  manaValue?: number;
  manaCost?: string;
  supertypes: string[];
  cardTypes: string[];
  subtypes: string[];
  keywords: string[];
  tags: string[];
  frame?: string;
  layout?: string;
  rarity?: string;
  reviewStatus?: string;
  powerEstimate?: number;
  confidence?: number;
}
```

The first implementation can compute many fields from existing authored card data and leave official-card enrichment as optional.

## Widget model

Start with a metric registry and a widget registry. Do not bake every chart into one dashboard component.

```ts
interface DashboardMetricDefinition {
  id: string;
  label: string;
  audience: Array<"author" | "player" | "collector">;
  requiredFields: string[];
  compute: "local";
  assumptionNotes?: string[];
}

interface DashboardWidgetDefinition {
  id: string;
  label: string;
  metricIds: string[];
  defaultVisualization: "kpi" | "bar" | "stacked_bar" | "histogram" | "heatmap" | "donut" | "radar" | "table";
  alternateVisualizations: string[];
  sourceKinds: Array<"authored_card" | "deck_entry" | "collection_row">;
}
```

This lets the dashboard add edit mode later without rewriting the metrics.

## View layout proposal

Initial dashboard view:

- Full-screen-capable alternate view launched from the View menu as "Dashboard View" or "Card Dashboard".
- Top dashboard chrome inside the view: title, scope selector, edit-mode toggle, fullscreen button, exit button.
- Collapsible left rail for source filters and scoped card list.
- Main dashboard canvas with fixed widget cards in V1.
- Widget cards show an insight title, chart/table, compact annotation, source/assumption text, and a "view cards" drilldown action.
- Edit mode in a later slice allows add/remove/reorder/configure widgets.

Recommended default order:

- Snapshot KPIs.
- Source composition.
- Type mix.
- Mana curve or design curve.
- Color demand/source mix.
- Keyword/mechanic frequency.
- Deck or collection health cards when the selected scope supports them.
- Recommendation and review checklist.

## Recommendation rules

Recommendation cards should be transparent and adjustable.

Each recommendation should show:

- Metric observed.
- Baseline used.
- Source or rationale.
- Scope it applies to.
- Confidence level.
- Caveat for archetype, format, homebrew intent, or missing metadata.
- Direct action: filter cards, open card, open deck, open collection row, or edit metadata.

Examples:

- "This Commander deck is below the selected land baseline."
- "White pip demand is higher than visible white source production."
- "This set has a large concentration of combat keywords in one color."
- "Several collection rows are unresolved and excluded from deck-castability metrics."
- "Power estimates are low-confidence for cards using unresolved custom terms."

## Implementation sequence recommendation

Ship the fixed, source-aware dashboard before dashboard customization.

Recommended sequence:

- Phase 1: local card fact aggregation and scope model.
- Phase 2: fixed default dashboard with source-aware widgets.
- Phase 3: recommendation cards with visible assumptions.
- Phase 4: dashboard edit mode and saved layouts.
- Phase 5: probability simulator and custom card groups.
- Phase 6: advanced/3D visualization experiments only if they answer a real question better than 2D views.

## Open product questions

- Should the menu label be "Dashboard View", "Card Dashboard", "Stats Dashboard", or "Analysis View"?
- Should the first visible scope default to all authored cards, the active project/set, or the current workspace selection?
- Should collection-only scopes hide deck-health widgets by default, or show unavailable cards explaining why?
- Should dashboard layout presets be per user, per project, or global?
- Should card roles for Commander be manually tagged first, inferred later, or both?
- Should recommendations support multiple templates, such as Limited, 60-card Constructed, Commander casual, Commander high-power, and set-design balance?

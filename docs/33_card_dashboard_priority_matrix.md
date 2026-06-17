# Card Dashboard Priority Matrix and Roadmap

Date: 2026-06-05

Companion research: `docs/32_card_dashboard_research_plan.md`

## Stop condition for this planning loop

This lane is ready for implementation when the repo has:

- A source-aware dashboard research plan.
- A priority matrix that keeps the first implementation small.
- A roadmap that explicitly avoids deck metadata schema work and frame registry work.

## Priority rule

The first useful dashboard should answer real questions from local data before it becomes customizable, animated, or 3D.

Order of importance:

1. Correct source scope.
2. Correct local metrics.
3. Useful fixed dashboard.
4. Clear recommendations and assumptions.
5. Configurable widgets.
6. Advanced visuals.

## Implementation phases

| Phase | Slice | User value | Complexity | Dependencies | Risk | Done condition |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Research and roadmap | Defines the dashboard without colliding with other lanes. | Low | Online research, existing project map. | Scope creep. | `docs/32_card_dashboard_research_plan.md`, this matrix, and `docs/project-map.md` are updated. |
| 1 | Source-aware fact foundation | Dashboard can summarize all/project/set/deck/collection scopes from one normalized fact layer. | Medium | Existing project, set, deck, and collection data loaders. | Flattening collections/decks into authored cards. | A local aggregator returns `DashboardCardFact[]` for at least all cards, one set, one deck, and one collection. |
| 2 | Fixed default dashboard view | Users get immediate useful analytics without configuration. | Medium | Phase 1. | Too many widgets at once. | View menu opens Dashboard View with exit/fullscreen, scope selector, fixed widgets, and responsive layout. |
| 3 | Recommendation cards | Dashboard starts giving useful interpretation, not just charts. | Medium | Phase 2, visible baseline definitions. | False authority from generic rules. | Recommendations show metric, baseline, caveat, confidence, and source/assumption. |
| 4 | Edit mode and widget registry | Users can choose which dashboard cards matter to them. | High | Phase 2 widget boundaries. | Drag/reorder work delays useful analytics. | Edit mode can add/remove/reorder widgets and persists layout locally. |
| 5 | Probability and custom card groups | Deck builders can ask scenario questions. | High | Phase 1 facts, deck section filters, tags/roles. | Misleading math if assumptions are hidden. | Users can compute by-turn odds for cards, types, tags, and custom groups with assumptions visible. |
| 6 | Advanced and 3D visualization lab | Explores memorable high-signal visuals after the dashboard is useful. | High | Stable metrics and performance budget. | Decorative charts reduce clarity. | Any 3D/advanced visual must beat a simpler 2D view for a named question. |

## Prioritization matrix

| Item | Impact | Effort | Risk | Priority | Notes |
| --- | --- | --- | --- | --- | --- |
| Dashboard scope model | High | Medium | Medium | P0 | Required to keep cards, sets, projects, decks, and collections distinct. |
| Dashboard card fact aggregator | High | Medium | Medium | P0 | Foundation for every widget. Must preserve source kind and quantity. |
| View menu entry + dashboard shell | High | Medium | Low | P0 | Should match existing alternate-view patterns: exit, fullscreen, isolated chrome. |
| Fixed KPI strip | High | Low | Low | P0 | Fast orientation: total cards, unique cards, variants/rows, source count, review count. |
| Type mix widget | High | Low | Low | P0 | Useful for authors and players. |
| Mana curve widget | High | Low | Medium | P0 | Useful immediately, but caveat alternate costs and expected cast turn. |
| Color mix widget | High | Medium | Medium | P0 | Start with color and pip demand. Source production can follow. |
| Keyword/mechanic frequency widget | High | Medium | Medium | P0 | Strong differentiator for homebrew authors. |
| Collection review-state widget | Medium | Low | Low | P0 | Useful when scope includes collection rows. |
| Deck land/type ratio widget | High | Low | Low | P0 | Useful for deck scopes without needing advanced metadata. |
| Recommendation cards | High | Medium | High | P1 | Needs transparent source assumptions and adjustable thresholds. |
| Commander role coverage | High | Medium | High | P1 | Depends on stable role tags or deck metadata. Consume that lane, do not own it. |
| Draw probability widget | High | Medium | Medium | P1 | Hypergeometric basics are valuable, but assumptions must be visible. |
| Color source/castability widget | High | High | High | P1 | Needs reliable source detection and format assumptions. |
| Power estimate distribution | Medium | Medium | Medium | P1 | Useful for authored cards once score/confidence facts are available. |
| Dashboard edit mode | Medium | High | Medium | P2 | Important, but not before the fixed dashboard proves useful. |
| Alternate visualization variants | Medium | Medium | Medium | P2 | Let users switch chart types after metrics are stable. |
| Saved dashboard presets | Medium | Medium | Medium | P2 | Decide global versus project-level persistence before implementation. |
| Custom card group builder | Medium | High | Medium | P2 | Useful for "what if" analysis, but should reuse filters/list patterns. |
| Timeline charts | Low | Medium | Medium | P3 | Needs durable timestamps. |
| 3D analytical cube | Low | High | High | P3 | Only if there is a real third-axis question. |
| Export/share dashboard | Low | Medium | Medium | P3 | Later public-output feature, not first dashboard. |

## V1 fixed dashboard widget set

The first implementation should include only these widgets:

| Widget | Applies to | Visualization | Why it ships first |
| --- | --- | --- | --- |
| Scope snapshot | All scopes | KPI strip | Establishes what data is being summarized. |
| Source composition | Mixed scopes | Stacked bar or cards | Prevents authored cards, deck entries, and collection rows from being collapsed. |
| Card type mix | Author/player scopes | Horizontal bar or donut | Core MTG composition signal. |
| Mana curve | Author/player/deck scopes | Histogram | Core deck and set-shape signal. |
| Color/pip mix | Author/player/deck scopes | Stacked bar | Shows color concentration and future castability path. |
| Keyword/mechanic frequency | Author scopes | Ranked horizontal bar | Homebrew-specific value. |
| Deck ratio | Deck scopes | Segmented bar | Fast land/creature/other read. |
| Collection review state | Collection scopes | Donut or KPI cards | Makes scanner/import cleanup visible. |
| Review checklist | All scopes | Insight cards | Turns stats into actions without overclaiming. |

## P1 recommendation set

After V1, add recommendation cards in this order:

| Recommendation | Baseline source | Caveat |
| --- | --- | --- |
| Land count starting point | Wizards mana basics and selected format assumptions. | Land count changes with curve, ramp, draw, archetype, and format. |
| Mana curve concentration | Wizards mana-curve guidance. | Aggro, control, ramp, combo, and Limited curves intentionally differ. |
| Commander role coverage | Command Zone-style template selected by the user. | Role overlap and commander text can reduce required slots. |
| Draw probability | Hypergeometric model with deck size, copies, cards seen, and mulligan setting shown. | Card draw, tutors, surveil, scry, ramp, and mulligans change real-game odds. |
| Color source pressure | Karsten-style source math if source data exists. | Untapped timing, dual lands, rocks, treasures, dorks, and MDFCs need assumptions. |
| Homebrew mechanic overuse | Project/set historical distribution. | Deliberate themes should be marked as intentional, not bad. |
| Reference coverage gap | Local reference/power audit data. | A gap is a review task, not necessarily a design flaw. |

## Suggested implementation structure

Use a small modular structure when implementation starts:

```text
packages/editor/src/domain/dashboardScope.ts
packages/editor/src/domain/dashboardFacts.ts
packages/editor/src/domain/dashboardMetrics.ts
packages/editor/src/domain/dashboardRecommendations.ts
packages/editor/src/components/dashboard/DashboardView.tsx
packages/editor/src/components/dashboard/DashboardScopeRail.tsx
packages/editor/src/components/dashboard/DashboardWidgetCard.tsx
packages/editor/src/components/dashboard/widgets/
```

Do not put the full dashboard, metric engine, recommendation rules, and widget registry into `App.tsx`.

## First implementation acceptance criteria

The first implementation slice is complete when:

- View menu opens the dashboard view.
- Dashboard view has internal exit and fullscreen controls.
- It can switch at least between all authored cards, active set, one deck, and one collection if those records exist.
- It shows the V1 fixed widget set for the current scope.
- Widgets clearly show when data is unavailable for the selected source.
- Collection rows remain collection rows; deck entries remain deck entries; authored cards remain authored cards.
- No deck metadata schema changes are included.
- No frame registry changes are included.
- The implementation passes editor typecheck.
- Visual QA confirms the dashboard is usable on desktop and mobile-width layouts.

## QA plan for future implementation

Minimum checks:

- Typecheck the editor package.
- Open the app and enter Dashboard View from the View menu.
- Confirm exit returns to the normal editor.
- Confirm fullscreen control uses the same user expectations as the focused editor/card browser views.
- Compare visible dashboard totals against known local fixtures.
- Switch scope between all cards, a set, a deck, and a collection.
- Confirm unavailable widgets fail closed with readable empty states.
- Confirm charts do not overflow on narrow widths.

## Parallel-lane guardrails

- Deck metadata lane: this dashboard may consume stable deck metadata later, but it must not define, migrate, or mutate that schema in this lane.
- Frame lane: this dashboard may count frame/layout facts from existing data, but it must not edit `frameRegistry.ts` or frame support contracts.
- Collection lane: collection rows should stay reviewable metadata rows unless explicitly copied into authored Cards/Sets by existing import flows.
- Import/export lane: dashboard export/share is later; do not expand File > Export during the first dashboard slice.

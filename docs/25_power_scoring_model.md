---
status: active
lane: runtime
type: spec
---
# Power Scoring Model

🟢 `[status: active]` `[lane: runtime]` `[type: spec]`

Homebrew Forge power scoring is a design assistant, not a rules authority. It estimates card efficiency relative to mana value and rarity, then explains the estimate so a designer can adjust the card intentionally.

## Model

The model compares effect value against allowed budget:

```text
balance delta = effect value - allowed budget
```

- Allowed budget comes from mana value, rarity headroom, colored-pip restriction, distinct colors, and hybrid ease.
- Effect value comes from raw stats, weighted keyword abilities, parsed keyword actions, card-advantage patterns, interaction patterns, token/counter patterns, and drawbacks.
- The visible score is a 0-100 estimate derived from the balance delta.
- Low confidence or unreviewed recognized terms can force `Needs Review`.

## Term Treatments

Power treatments live under `reference/power/` instead of the reference catalog:

- `direct`: a term has a reviewed numeric value.
- `formula`: a term is scored by a pattern such as `Ward {N}` or `Scry N`.
- `contextual`: a term matters only when card text creates, grants, removes, or uses it.
- `neutral`: a term is intentionally reference-only for standalone power.
- `needs-review`: the term is recognized but should not affect score until reviewed.

Every catalog term must have one of those treatments through either a term-specific entry or an explicit category policy. Run:

```bash
node .tools/pnpm/bin/pnpm.cjs forge power audit
```

Use `--json` for structured output or `--report reference/power/coverage-report.json` to write a local coverage report.

## Current Seed Coverage

The first seed uses Jonathan Kyle Hobson's earlier weight table for mana budget, rarity headroom, stats, evergreen keyword weights, common action values, gates/drawbacks, and house mechanics. It also includes explicit category policies so all reference terms are accountable without pretending every term deserves a number.

Future expansion should review `needs-review` terms, add parameterized patterns for scalable mechanics, then calibrate against Scryfall bulk data offline.

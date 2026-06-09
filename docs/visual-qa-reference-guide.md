---
status: active
lane: qa
type: reference
---
# Visual QA Reference Guide

🟢 `[status: active]` `[lane: qa]` `[type: reference]`

Use references to verify frame geometry and text behavior. Do not store copied
official or third-party card images in the repo unless license review allows it.

## Reference-Only Sources

- Wizards mechanics articles and card image galleries.
- Gatherer card text and rulings.
- Scryfall searches for layout taxonomy and examples.
- Local MSE exports generated from Kyle-supplied local assets.
- Local Figma or screenshot references supplied by Kyle.

## QA Checklist

Each frame slice must verify:

- Editor preview opens without a blank screen.
- SVG render completes.
- PNG export completes.
- Short, medium, and dense rules text fit.
- Long names and long type lines do not overlap.
- Mana, tap, hybrid, Phyrexian, loyalty, defense, and P/T symbols are legible.
- Unsupported options are preserved but clearly marked.
- Browser automation is fully handed back after visual QA.

## Frame Lab Routes

Future Playwright fixture pages should use these route names:

- `/frame-lab/core`
- `/frame-lab/enchantments`
- `/frame-lab/two-part`
- `/frame-lab/multiface`
- `/frame-lab/oversized`
- `/frame-lab/tokens`
- `/frame-lab/treatments`
- `/frame-lab/third-party`

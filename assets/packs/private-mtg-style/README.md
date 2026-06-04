# Private MTG-Style Asset Pack

This pack is the local input slot for recreating an MTG.Design-style renderer.
Homebrew Forge does not draw these frames itself. It loads composited frame and
symbol image files from this folder when they exist.

Place your private files in the paths listed by `manifest.yaml`, then run:

```bash
PATH="$PWD/node_modules/.bin:$PATH" forge assets check --pack private-mtg-style
```

## Expected Model

- `frame.full_card`: full-card transparent or opaque frame image for one layout/color.
- `mask.art`: optional art-window overlay/mask for the layout.
- `symbol.mana`: individual mana/icon images used in costs and rules text.
- `symbol.set`: set-symbol image keyed by set code.

The current renderer supports full-card frame compositing first. Fallback drawing
exists only so tests and empty packs still render.


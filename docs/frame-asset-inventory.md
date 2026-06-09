---
status: active
lane: data
type: reference
---
# Frame Asset Inventory

🟢 `[status: active]` `[lane: data]` `[type: reference]`

This inventory records what can be rendered, what is present but unwired, and
what is reference-only.

## Local Sources

| Source | Status | Notes |
| --- | --- | --- |
| `assets/packs/basic-m15-local/manifest.yaml` | renderable / partial | Normal creature/spell, artifact, land, token, full-art token, planeswalker. Points to Kyle's local Basic M15 and Full Magic Pack checkout. |
| `assets/packs/figma-mtg-card-assets/manifest.yaml` | partial-renderer | Local Figma exports declare normal, token, adventure, saga, and vehicle support, but only some roles are wired. |
| `assets/packs/genevensis-local/manifest.yaml` | partial-renderer | Alternative local frame family for normal, artifact, land, and token layouts. |
| `assets/packs/private-mtg-style/manifest.yaml` | partial-renderer | Private pack declares saga, battle, vehicle, equipment, and aura support, but roles are not complete for every declared layout. |
| `assets/packs/modern-magic-like/manifest.yaml` | needs-assets | Placeholder for user-supplied modern-like assets. |
| `assets/packs/old-border-like/manifest.yaml` | needs-assets | Placeholder for user-supplied old-border-like assets. |
| Local `magic-m15-saga.mse-style` | asset-present-unwired | Saga/class pieces, chapter numerals, bookmarks, masks, and level-like assets exist locally. |
| Local `magic-m15-altered.mse-style` | asset-present-unwired | Altered, borderless, DKA-like, FNM-like, devoid, miracle, frame masks, image masks, and treatment pieces exist locally. |
| Local `magic-m15-adventure.mse-style` | asset-present-unwired | Adventure-like two-part layout assets exist locally. |
| Local `magic-m15-mainframe-dfc.mse-style` | asset-present-unwired | DFC and level-related assets exist locally. |

## First Wiring Targets

1. Border capability gating in the editor.
2. Vehicle subtype support through artifact rendering.
3. Saga/class/case/room vertical layout renderer.
4. Two-part adventure/omen/prepare renderer.

## Border Findings

| Asset source | Candidate | Status | Notes |
| --- | --- | --- | --- |
| Basic M15 | `data/magic-m15.mse-style/border_mask.png` | renderable | Main normal-card MSE border mask. Produces selected MSE border paint on the top/sides while preserving the black footer/bottom. Exposed as `white-mse` / `white (MSE footer)`; also used for MSE-backed gold and silver when this mask is available. |
| Basic M15 | Full white border frame | needs-assets | No true full-white normal-card frame asset was found in the Basic M15 pack. The editor disables `white (full asset missing)` and the renderer does not use a clipped-matte fallback. |
| Basic M15 altered | `data/magic-m15-altered.mse-style/border_masks/*.png` | asset-present-unwired | Contains altered, crown, puma, and silver mask variants. These should become treatment/style masks, not generic border colors. |
| Basic M15 saga/adventure/token/DFC | `*/border_mask*.png` | asset-present-unwired | Layout-specific masks exist and should be wired with their matching layout renderers instead of being applied to normal cards. |
| Figma MTG assets | `Card Components/**/Color=White*.svg`, `Color=Gold-3+*.svg` | asset-present-unwired | True full-frame white and gold SVG frame art exists for creature, noncreature, saga, vehicle, adventure, land, and legendary variants. This belongs in the Figma frame-style lane, separate from the M15 border toggle. |
| GenevensiS | `magic-genevensis-00-main.mse-style/borders/*_border.png` | asset-present-unwired | Large library of component border pieces for class, saga, leveler, adventure, battle, plane, and prototype layouts. Needs frame-style/layout adapters before exposing broad UI options. |

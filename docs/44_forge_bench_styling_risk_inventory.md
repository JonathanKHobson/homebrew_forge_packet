# Forge Bench Styling Risk Inventory

Date: 2026-06-06

Scope: read-only inventory of styling risk before Claude's Forge Bench Phase 1
visual spike. No implementation files were edited for this inventory.

## Current CSS Shape

`packages/editor/src/styles.css` is the effective design system. It is a large
hand-written stylesheet with global primitives, app shell, Maker workspace,
dashboard, overlays, deck/collection screens, print, and shared form styling in
one file.

There is a small dashboard token block around the dashboard section, but the
main app shell does not have a full semantic token layer yet.

## Repeated Literals

Top repeated color literals in `styles.css`:

| Count | Color | Risk |
| ---: | --- | --- |
| 76 | `#ffffff` | Pure-white panels and controls may compete with the card hero. |
| 46 | `#d9e0ea` | Common separator color; good token candidate. |
| 36 | `#243044` | Common dark text/chrome color. |
| 32 | `#f8fafc` | Common soft surface. |
| 31 | `#17202c` | Primary text. |
| 30 | `#526176` | Muted text/label. |
| 24 | `#d2dbe8` | Border/surface line. |
| 23 | `#607086` | Muted label text. |
| 22 | `#66758a` | Muted text/icon. |
| 18 | `#2f66c7` | Saturated primary blue. |
| 15 | `#2459b2` | Saturated hover/action blue. |
| 10 | `#c8d1de` | Border. |
| 10 | `#8ba4c7` | Hover/focus border. |
| 9 | `#e9f1ff` | Active/selected blue tint. |

Top repeated radii:

| Count | Radius | Risk |
| ---: | --- | --- |
| 42 | `7px` | Default card/module feel. |
| 33 | `6px` | Default control/card radius. |
| 31 | `8px` | Larger card/module radius. |
| 15 | `999px` | Pills and badges. |
| 10 | `5px` | Menus/smaller buttons. |
| 8 | `50%` | Circular affordances. |
| 4 | `12px` | Large rounded card/preview treatment. |
| 3 | `16px` | Dashboard/web-card feel. |

Density values repeated or strategically important:

- Top chrome uses `38px` and `54px` band heights.
- Several controls use `30px`, `32px`, and `34px` heights.
- Rail buttons use `58px` minimum height.
- Panel/preview headers use larger rhythms around the Maker shell.
- Field gaps and margins commonly use `10px`.

## Global Primitive Selectors

These selectors can affect many workspaces and should be reviewed carefully if
Claude changes them:

- `:root`
- `body`
- `button, input, select, textarea`
- `.primary-button`
- `.secondary-button`
- `.icon-button`
- `.field`
- `.field > label`
- `.field small`
- `input, select, textarea`
- focus and invalid field states

Hardening note: if Phase 1 lowers contrast or embeds inputs, preserve visible
focus, invalid state, disabled state, and touch/click target legibility.

## App Shell Selectors

Likely shell selectors involved in Forge Bench:

- `.editor-shell`
- `.app-chrome`
- `.menu-row`
- `.command-row`
- `.runtime-status-region`
- `.runtime-status-banner`
- `.app-status-strip`
- `.workbench`
- `.collapsed-panel-strip`
- resize handles and panel strips if visually touched

Hardening note: status placement may require structural review. CSS-only
movement may be fragile if the shell grid still reserves top rows.

## Maker Workspace Selectors

High-value Phase 1 selectors:

- `.side-rail`
- `.rail-button`
- `.rail-button.active`
- `.rail-status`
- `.maker-context`
- `.card-list`
- `.card-list-tools`
- `.card-list-scroll`
- `.card-row`
- `.card-row:hover`
- `.card-row.selected`
- `.card-row.dirty`
- `.preview-column`
- `.preview-header`
- `.preview-header-badges`
- `.card-canvas`
- `.render-frame`
- `.render-frame img`
- `.maker-orientation`
- `.maker-onboarding-stage`
- `.inspector`
- `.inspector .panel-heading`
- `.inspector-tabs`
- `.inspector-tabs button`
- `.inspector-tabs button.active`
- `.status-strip`

Hardening note: keep Maker as the proof surface, but watch shared class names
such as `.status-strip`, `.panel-heading`, `.primary-button`, and `.field`.

## Dashboard And Global Areas To Protect

The dashboard has a distinct surface system and many visual affordances:

- `.dashboard-view`
- `.dashboard-rail`
- `.dashboard-topbar`
- `.dashboard-widget-card`
- `.dashboard-widget-card:hover`
- `.dashboard-kpi`
- `.dashboard-filter-button`
- `.dashboard-topbar-controls select`
- `.dashboard-overlay-result-row`
- `.dashboard-memory-bar`

Dashboard currently has its own variables around the dashboard section. A Forge
Bench pass can still bleed into it through global button, select, input, focus,
shadow, or radius changes. Take at least one dashboard smoke screenshot after
Claude's pass.

## Cross-Workspace Areas To Smoke Check

If global primitives change, smoke check:

- Create overlays.
- Import/export transfer dialog.
- Print dialog.
- Decks workspace rows and inspector.
- Collections table rows and row actions.
- Sets and Projects workspace summary/detail panels.
- References workspace fields and overlays.
- Card Browser and Dashboard modes.

## Token Groups To Expect

A production-safe Forge Bench token layer should include semantic groups rather
than screen-specific names:

- Surfaces: app background, chrome, panel, inset control, canvas, floating.
- Lines: separator, strong pane edge, control border, focus border.
- Text: primary, muted, label, disabled.
- Accent: primary action, selected marker, selected fill, focus ring.
- Craft: gold accent, glow, saved/forge moment.
- Radii: pane, control, floating, hero.
- Density: menu row, toolbar, tab, control, row, rail, panel padding.
- Depth: floating shadow, hero shadow, no shell module shadow.

## Post-Spike Review Questions

- Did any new literal color or radius appear more than once?
- Did token names describe visual role rather than component location?
- Did global primitive changes unintentionally restyle dashboard or dialogs?
- Did the shell become more compact without losing legibility?
- Does the card preview clearly outrank the UI chrome?
- Did onboarding remain helpful without taking over populated projects?
- Are focus, disabled, invalid, selected, hover, and dirty states all visible?
- Are narrow layouts still reachable and free of horizontal overflow?

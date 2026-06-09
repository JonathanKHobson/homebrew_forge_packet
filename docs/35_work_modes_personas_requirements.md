---
status: active
lane: ui
type: spec
---
# Work Modes Personas and Requirements

🟢 `[status: active]` `[lane: ui]` `[type: spec]`

Date: 2026-06-05

## Product Decision

The View menu gets a new submenu named Work Modes.

Work Modes are task presets. They choose the user's working stance, then set the
default workspace, visible navigation, panel emphasis, and read/write posture.
They do not replace the manual Panels submenu.

## Mode Communication Requirements

Users must always know which Work Mode they are in.

Required signals:

- View > Work Modes shows the active mode.
- Toolbar shows a compact Work Mode chip next to the active project/set context.
- The Side Rail may be filtered or reordered, but the active mode must explain
  why fewer sections are visible.
- Workspace headers may include short mode-aware copy when behavior changes.
- Empty states should say what the current mode is optimized for.

The chip should be interactive in a later slice, but V1 can use View > Work
Modes as the primary switcher.

## Page Keying Decision

Do not duplicate pages per mode in V1.

Use one global `workMode` key for UI state and mode presets:

- default workspace
- side rail visibility/filtering
- left/center/right panel defaults
- inspector posture
- dashboard scope defaults
- mode copy

Maker, Decks, Collections, and Dashboard remain canonical pages. They become
mode-aware only where the same page needs different emphasis. This avoids
parallel implementations such as `DeckBuilderMakerPage` or
`CollectionManagerDashboardPage`.

## Full Studio

Persona:

- Power user who wants the whole Homebrew Forge surface.
- Likely the current user, an advanced homebrewer, or someone moving between
  cards, decks, collections, references, imports, and exports.

Needs:

- All side rail sections.
- Current Maker workspace behavior.
- Decks, Collections, Sets, Projects, Gallery, References, Settings.
- Manual panel toggles.
- Focused Layouts and Dashboard.
- Import/export access.
- Active project/set context.

Wants:

- Better workspace polish that comes from the other modes.
- Collection value and review summaries.
- Deck availability and stats.
- Faster transitions between authoring, deckbuilding, and collection review.

Default mode behavior:

- Keep current broad app experience.
- Use the current Maker workspace as default.
- Do not hide any major rail item.
- Show Work Mode chip as "Full Studio."

## Card Maker

Persona:

- Homebrewer creating custom cards.
- Professional or semi-professional card author designing cards, sets,
  mechanics, frames, variants, and print/export assets.

Needs:

- Maker workspace.
- Active project and set context.
- Card list.
- Card preview.
- Inspector editing tabs: Card, Frame, Layout, Preview.
- Save, Save As, duplicate, variant handling.
- Preview mode, safe area, guides, zoom.
- References/rules helpers.
- Power estimate, complexity, and recommendation signals.
- Set/project export path.

Wants:

- Mechanic frequency and set-shape dashboard access.
- Art/library tools.
- Frame/layout support visibility.
- Import from collection as draft templates.
- Quick focused editor transition.

Should de-emphasize:

- Collection value.
- Physical storage/location.
- Deck ownership math.
- Price and trade flows.

Default mode behavior:

- Open Maker.
- Show side rail but emphasize Maker, Sets, Gallery, References.
- Keep Preview and Inspector visible.
- Keep card list visible.
- Use comfortable card list density.
- Default dashboard scope, when opened, should prefer active set/project.

## Deck Builder

Persona:

- Casual or veteran Magic player building and tuning playable decks.
- Optimizes for a play style, theme, fun experience, or competitive shape.
- May not author custom cards at all.

Needs:

- Decks workspace.
- Main/Side/Maybe sections.
- Add-cards overlay.
- Card search/browser.
- Read-only card preview.
- Collection availability.
- Unresolved card warnings.
- Export to plain text and Cockatrice.
- Deck stats: land count, type mix, mana curve, color/pip mix, deck size,
  section counts, unresolved count.

Wants:

- "Can I build this from my collection?"
- Variant/print selection when a collection owns multiple versions.
- Basic legality and format signals.
- Draw probability and playtest prep later.
- Dashboard scoped to selected deck.

Should de-emphasize:

- Full card authoring inspector.
- Frame/layout editing.
- Set/project management unless needed to choose custom cards.
- Collection valuation as the primary task.

Default mode behavior:

- Open Decks.
- Show side rail but emphasize Decks, Collections, Card Browser/Dashboard.
- Right panel should read as deck/deck-entry inspector, not a card editor.
- Card preview should be read-only by default.
- Dashboard, when opened, should prefer deck scope.

## Collection Manager

Persona:

- Avid collector, trader, or inventory-focused player.
- Wants to know what cards they own, where they are, what condition they are in,
  what duplicates they have, what is valuable, and what needs review.
- Includes the collector booster or premium-card buyer who cares about finish,
  condition, rarity, and value.

Needs:

- Collections workspace.
- Collection import/review flow.
- Print identity, set, collector number, finish, condition, language.
- Location/storage fields.
- Quantity and duplicate visibility.
- Matched/unresolved review status.
- Collection-level and row-level save.
- Export as CSV, text, and Cockatrice.
- Read-only card preview.
- Collection summary stats.
- Value fields where available from imported/source data.

Wants:

- Estimated total value.
- Per-row price estimate and price source.
- Condition-adjusted value.
- Rarity breakdown.
- Duplicate report.
- Missing/owned relationship to decks.
- Dashboard scoped to selected collection.
- Market price refresh later, after source/API policy is decided.

Should de-emphasize:

- Card authoring.
- Frame/layout editing.
- Set export.
- Playtest controls.

Default mode behavior:

- Open Collections.
- Show side rail but emphasize Collections, Decks, Dashboard.
- Right panel should read as collection row details/review, not card editing.
- Dashboard, when opened, should prefer collection scope.
- Full Studio should inherit collection value/stat improvements.

## Workspace Change Matrix

| Workspace | Full Studio | Card Maker | Deck Builder | Collection Manager |
| --- | --- | --- | --- | --- |
| Maker | Full editor | Primary authoring surface | Search/read-only preview support | Search/read-only preview support |
| Decks | Available | Secondary test/export support | Primary surface | Secondary ownership/deck relationship |
| Collections | Available | Import/staging support | Availability support | Primary inventory surface |
| Sets | Available | Important | Hidden or secondary | Hidden or secondary |
| Projects | Available | Important | Secondary | Secondary |
| Gallery | Available | Important for art | Hidden or secondary | Hidden or secondary |
| References | Available | Important for rules | Hidden or secondary | Hidden or secondary |
| Dashboard | Available | Set/project diagnostics | Deck diagnostics | Collection diagnostics |

## Missing Full Studio Requirements Exposed By Modes

Card Maker reveals:

- Need clearer set/project context.
- Need stronger mechanic/reference coverage.
- Need less friction between card list, preview, inspector, and dashboard.

Deck Builder reveals:

- Need deck stats and source-aware dashboard defaults.
- Need collection-backed availability in deck rows.
- Need read-only card preview that does not expose authoring controls.
- Need clearer deck-entry right panel labels.

Collection Manager reveals:

- Need collection value fields.
- Need duplicate/rarity/condition summaries.
- Need row review to be faster and clearer.
- Need collection dashboard scope to feel first-class.

## V1 Acceptance Criteria

- Work Modes submenu exists under View.
- Full Studio, Card Maker, Deck Builder, and Collection Manager are selectable.
- Active mode is visible in the toolbar.
- Active mode is checkmarked in View > Work Modes.
- Selecting a mode applies a default workspace and panel/rail preset.
- Manual Panels controls still work after selecting a mode.
- Maker, Decks, Collections, and Dashboard do not duplicate data models.
- Card Maker can author cards without collection/deck clutter.
- Deck Builder can build/export decks without full card authoring clutter.
- Collection Manager can review collection rows and see collection stats plus
  either source-derived value estimates or an explicit unavailable value state.
- Full Studio remains the broad current app surface.

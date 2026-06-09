---
status: archived
lane: ui
type: research
archived: 2026-06-09
---
> **ARCHIVED 2026-06-09 (implemented-plans sweep)** — original path: `docs/34_work_modes_research.md`
> Reason: implemented planning artifact, archived per Kyle's 2026-06-09 directive (all plans implemented; no live backlog).
> Index: `docs/cowork/02_repo_archive_manifest.md` + `docs/64_repo_cleanup_archive_index.md`.

# Work Modes Phase 0 Research

🗄️ `[status: archived]` `[lane: ui]` `[type: research]`

Date: 2026-06-05

## Research Goal

Work Modes should make Homebrew Forge less overwhelming by choosing a task-shaped
interface preset. They are not the same thing as manual panel toggles, and they
are not the same thing as the very narrow Focused Layouts.

V1 modes:

- Full Studio
- Card Maker
- Deck Builder
- Collection Manager

Later modes:

- Review & Analytics
- Playtest Prep

## Local Product Context

Homebrew Forge already separates its major domains:

- Cards and Sets are authored records for rendering and set export.
- Decks are play/export lists that can draw from any set or project.
- Collections are ownership, inspiration, scanner import, research, and staging
  lists that remain isolated unless copied into Cards/Sets or added to Decks.
- Card Dashboard already uses source-aware facts so authored cards, deck
  entries, and collection rows do not collapse into one generic card bucket.

The current Full Studio experience is powerful but crowded. Focused Layouts are
useful, but too narrow for users who need a lean working surface with several
related tools. Work Modes should sit between those extremes.

## External Product Patterns

### Task Workspaces

Adobe Lightroom Classic organizes the app into workflow modules: an intake/browse module for
importing, organizing, comparing, and selecting photos; Develop for adjusting
photos; and presentation modules for output. It also lets users hide panels to
maximize the photo display. Source:
https://helpx.adobe.com/uk/lightroom-classic/help/workspace-basics.html

Photoshop has workspaces for specific creative tasks such as Painting and
Photography, and users can create custom workspaces. Source:
https://helpx.adobe.com/photoshop/desktop/get-started/learn-the-basics/switch-workspaces.html

Blender uses workspaces as top-level task tabs such as Layout, Modeling,
Sculpting, UV Editing, Shading, Animation, Rendering, Compositing, Geometry
Nodes, and Scripting. Source:
https://docs.blender.org/manual/en/latest/interface/window_system/workspaces.html

Implication: Work Modes should be named after the job the user is doing, not the
panels being moved. "Card Maker" and "Deck Builder" are stronger than "Cards
Layout" or "Deck Layout."

### Persistent Profile Signals

VS Code Profiles can store settings, extensions, and UI layout changes. VS Code
also makes the active profile visible in the title bar, Manage button hover, and
badges/icons. Source:
https://code.visualstudio.com/docs/configure/profiles

Implication: Homebrew Forge should communicate the active Work Mode in more than
one place. A toolbar chip alone is not enough; View > Work Modes should show the
active mode, and mode-specific copy should appear in workspace headers or empty
states where the layout changes materially.

### Read-Only Role Modes

Figma Dev Mode is a developer-focused interface for inspecting designs and
transforming them into code without changing the design file. It changes the
navigation and right-panel emphasis around ready-for-development items, specs,
annotations, and implementation resources. Source:
https://help.figma.com/hc/en-us/articles/15023124644247-Guide-to-Dev-Mode

Implication: Deck Builder and Collection Manager can use read-only card preview
surfaces without exposing full card authoring controls. The same card data can
be visible, but the editing affordances should be reduced or removed.

### Deck and Collection Tools

Archidekt describes itself as a visual deckbuilder for new and veteran Magic
players with deckbuilding, playtesting, and collection management. Source:
https://archidekt.com/landing

ManaBox separates collection Binders from Lists. Binders mirror physical card
storage and are considered when checking whether a deck can be built; Lists are
for wishlists, buylists, and other non-owned tracking lists. Source:
https://manabox.app/guides/collection/getting-started/

ManaBox deck integration can look for needed deck cards in the collection and
show where cards are located, with options for exact versions, other registered
decks, and basic lands. Source:
https://manabox.app/guides/decks/collection-decks/

TCGplayer Collection Tracker emphasizes gaming inventory, current pricing on
collection value, and sharing Have/Wants/Trades. Source:
https://store.tcgplayer.com/collection

The TCGplayer App FAQ says scanned cards can show Market Price, Listed Median,
and Most Recent Sale, and scanned cards can be saved to lists/collections.
Source:
https://help.tcgplayer.com/hc/en-us/articles/115009506407-TCGplayer-App-FAQ

Implication: Collection Manager needs collection value, print identity, finish,
condition, location, duplicates, unresolved review, and ownership/deck
availability. Deck Builder needs deck sections, card search, collection
availability, mana curve/color/type information, export, and read-only card
inspection.

### Card Authoring Tools

MTG.Design focuses on creating, saving, sharing, and exporting custom Magic
cards from a browser. Source:
https://mtg.design/

Magic Set Editor positions itself as a full desktop environment for designing,
managing, and rendering custom trading card expansions, including WYSIWYG card
editing, frames, templates, and set-level work. Source:
https://magicseteditor.com/

Wizards deckbuilding guidance emphasizes mana curve, mana base, colored symbol
requirements, and the deck plan. Sources:
https://magic.wizards.com/en/news/feature/building-your-first-deck-2006-10-28
https://magic.wizards.com/en/news/feature/how-build-mana-curve-2017-05-18

Mark Rosewater's New World Order article frames complexity as something that
must be managed by audience and rarity, not simply removed. Source:
https://magic.wizards.com/en/news/making-magic/new-world-order-2011-12-05

Implication: Card Maker needs authoring, preview, set context, frame/layout,
rules/reference assistance, power/complexity checks, and export. It should not
force collection value or deck inventory concepts into the default card-making
surface.

## Pattern Synthesis

Work Modes should:

- Be task-named.
- Be visible in the toolbar and View menu.
- Change defaults without hiding manual override controls.
- Prefer existing workspaces over duplicating pages.
- Avoid changing persistence semantics in V1.
- Keep card authoring separate from deck/collection read-only card inspection.
- Let each mode improve its underlying workspace for Full Studio too.

Work Modes should not:

- Become another data model.
- Replace the side rail.
- Hide the user's data.
- Make imported collection rows become authored cards.
- Require live market APIs before Collection Manager is useful.
- Add legality, play simulation, or price automation before the core mode
  contract is stable.

## Research Takeaways For V1

1. Add a global Work Mode state and mode registry.
2. Add View > Work Modes with active checkmarks.
3. Add a visible Work Mode chip near the toolbar project/set context.
4. Let modes apply workspace, rail, and panel presets.
5. Preserve Panels as manual overrides.
6. Add mode-aware workspace header copy where the same page behaves differently.
7. Start with source-local collection value fields before live pricing.
8. Treat dashboard access as a mode support surface, not a separate V1 mode.

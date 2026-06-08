# UX Consistency And Conventions Audit

Date: 2026-06-07

Scope: app-wide expectation alignment for Homebrew Forge as a desktop creative tool. The goal is not to copy Figma, Photoshop, Google Docs, or Word. The goal is to use conventions people already know: File/Edit/View/Tools menus, clear tool modes, icon buttons with fast explanations, visible selected states, standard undo/redo/save/revert language, and predictable panel/view ownership.

## UXHC Lens

Lead heuristic: H04 Consistency and Standards.

Supporting heuristics:
- H02 Match between system and real world: use familiar desktop/editor language.
- H03 User control and freedom: keep undo, redo, revert, close, cancel, and view recovery visible.
- H06 Recognition rather than recall: expose tools and states with labels, tooltips, and selected states.
- H07 Flexibility and efficiency: preserve command palette and keyboard shortcuts.
- H08 Aesthetic and minimalist design: reduce duplicate or competing labels.
- H14 Help and documentation: use concise, specific action labels.

## Prioritization Matrix

| Priority | Issue | Impact | Decision |
| --- | --- | --- | --- |
| P0 | Editing conventions must be understandable without relearning | Card editing is the core workflow | Keep conventional File/Edit/View/Tools menu ownership and rename confusing tools |
| P0 | Preview terminology overloaded | Users saw Preview tool, Preview mode, Expanded Preview, and preview buttons competing | Rename surface tool to Zoom tool and keep preview mode as view/review state |
| P1 | Toolbar checkbox labels were too long | Small screens and dark mode made toolbar harder to scan | Shorten visible toggles to Guides, Safe area, Card grid |
| P1 | Native title tooltips feel slow | Tool discovery matters in icon-heavy chrome | Add immediate CSS tooltips to command-row and preview action buttons |
| P1 | Layout zone affordance implied dragging where only selection was available | False affordance creates broken-feeling interactions | Use pointer cursor for selectable zones and leave drag/resize cursors to handles |
| P2 | Section-level zoom and richer card-region inspection | Valuable, but not required for this conventions pass | Backlog as a focused feature after core chrome consistency |
| P2 | Universal transform/direct manipulation tool | Potentially useful, but could add mode confusion | Backlog until name/type/type-line/manual positioning model is designed |

## Conventions Applied

- File menu keeps standard file verbs: Save, Save as..., Open Set..., Import..., Export..., Print....
- Edit menu owns Undo, Redo, Revert to Last Saved, duplicate, and delete unsaved draft.
- View menu owns themes, panels, focused layouts, preview modes, card-list density, and project switching.
- Tools menu owns card-surface tools and visual aids.
- Card-surface tools now use familiar creative-editor language:
  - Zoom tool: click the rendered card to open a larger preview.
  - Artwork tool: move and crop artwork.
  - Text tool: edit card text directly on the preview.
  - Layout tool: select text zones and adjust rules padding.
- Toolbar visual aids now use compact nouns: Guides, Safe area, Card grid.
- Command palette label now uses Open larger preview instead of another competing expand phrase.
- Main toolbar buttons expose shortcut metadata for command palette, save, undo, and redo.
- Create/import overlays use object-specific primary actions: Create set, Create deck, Create project, Create collection, Create asset, or Create draft for cards.
- Import/export workflow labels use sentence-case action language such as Dry run, Print proof..., and Copy to active set.

## Backlog

- Add section-level zoom/inspection for name, art, type line, rules box, and stats.
- Add manual name/type-line position controls only after the layout model is designed across renderer, inspector, and preview overlay.
- Consider a single direct-manipulation "select" tool only if it reduces modes instead of adding another one.
- Extend immediate tooltip treatment beyond the main toolbar when surfaces stabilize.
- Continue aligning overlay primary/secondary actions after import/export and create flows settle.

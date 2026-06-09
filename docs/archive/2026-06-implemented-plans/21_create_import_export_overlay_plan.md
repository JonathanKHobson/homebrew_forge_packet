---
status: archived
lane: ui
type: plan
archived: 2026-06-09
---
> **ARCHIVED 2026-06-09 (implemented-plans sweep)** — original path: `docs/21_create_import_export_overlay_plan.md`
> Reason: implemented planning artifact, archived per Kyle's 2026-06-09 directive (all plans implemented; no live backlog).
> Index: `docs/cowork/02_repo_archive_manifest.md` + `docs/64_repo_cleanup_archive_index.md`.

# Create, Import, and Export Overlay Plan

🗄️ `[status: archived]` `[lane: ui]` `[type: plan]`

## Purpose

Homebrew Forge should use one predictable interaction model for creating,
importing, and exporting work. The plus button should always open a focused
creation overlay. File > Import and File > Export should always open broad
transfer hubs. Workspace panels should return to browsing, selecting, editing,
and inspecting existing objects.

This plan is the source of truth for future work on:

- plus-button creation overlays for Cards, Decks, Sets, Projects, and Gallery,
- File > Import and File > Export transfer hubs,
- ungrouped holding areas for cards, sets, and projects,
- Reference alignment after the separate Reference upgrade lands.

Do not add another inline create form to `WorkspaceView.tsx`. New create and
transfer flows should live in dedicated overlay components and small domain
helpers.

## Current Problems

- Cards creates a blank unsaved draft immediately and opens it in the editing
  surface.
- Decks opens a compact create form inside the left list panel.
- Sets, Projects, and Gallery open create prompts inside the right inspector
  panel.
- Reference has a plus button placeholder in this branch and is being upgraded
  separately.
- File > Import and File > Export currently use broad labels, but the dialog
  content still mostly reflects set/card export slices.

The result is that each plus button behaves differently, and the app splits the
user's mental model between create, edit, browse, inspect, import, and export.

## Product Principle

Creation is not editing. Creation is for capturing what the user already knows
with as much focused real estate as possible. Editing is for preview, layout,
fine tuning, and iterative review.

Import and export are transfer workflows. They should live under File and
support cards, decks, sets, projects, gallery assets, and references over time.

## Shared Overlay Contract

All create and transfer overlays should use the same shell:

- full-screen overlay with the current workspace dimmed behind it,
- visible title, entity label, and close button,
- scrollable content area,
- footer with Cancel and primary action,
- dirty-state close confirmation,
- Escape closes only when clean or after confirmation,
- focus moves into the overlay when opened and returns to the triggering plus
  button or menu item when closed,
- states for idle, dirty, saving, saved, error, and empty.

The primary create action defaults to `Create Draft`. If Settings later changes
the user's default status, the overlay should still expose `Save as Draft` when
the default is not draft.

## Plus Button Behavior

Cards:

- Opens a Card creation overlay instead of immediately creating an unsaved tab.
- Captures identity, name/mana, type line, rules, flavor, stats/loyalty, frame
  choice, art source, finish/status, and notes.
- Excludes live-preview-only controls such as rules text padding, exact text
  sizing, crop, art transform, and detailed layout tuning.
- After `Create Draft`, saves the draft and opens it in the Cards editing
  workspace.
- Includes a single-card import affordance for CSV/XML text or file input.

Decks:

- Opens a Deck creation overlay instead of the left-panel mini form.
- Captures name, description, format, linked project, linked set, status, and
  notes.
- Includes a card-add table for Main, Sideboard, and Maybeboard.
- Uses the existing deck storage model under `decks/<deck-id>/`.
- After `Create Draft`, opens the deck in the Decks workspace.

Sets:

- Opens a Set creation overlay instead of the right-panel form.
- Captures set code, set name, project, author/designer, status, and notes.
- Stages future controls for moving or assigning existing cards into the new
  set.
- After `Create Draft`, creates the set folder and opens it in Sets/Cards as
  the existing set creation flow already does.

Projects:

- Opens a Project creation overlay instead of the right-panel form.
- Captures project name, description, status/default grouping notes, and future
  hooks for grouping sets, cards, and decks.
- After `Create Draft`, creates the project and selects it.

Gallery:

- Opens a Gallery asset creation/import overlay instead of the right-panel
  prompt.
- Supports upload, URL, source note, asset type, artist/source metadata, and
  optional card assignment.
- Bulk asset CSV and multi-file import are future slices; this first overlay
  should make the future path obvious without pretending unsupported behavior
  works.

Reference:

- Reference is the first concrete implementation of the shared overlay shell.
- The Reference plus button opens a focused create/import-one overlay, saves
  local custom terms under `reference/custom/references.json`, and refreshes the
  catalog after save.
- Future rules-text typeahead creation should reuse the same Reference overlay
  prefilled from the trigger and typed text.

## File Import Hub

File > Import should open a broad import hub with entity choices:

- Cards,
- Decks,
- Sets,
- Projects,
- Gallery,
- References.

The first implementation should wire only existing supported behavior and show
clear staged states for unsupported slices.

Current supported behavior to preserve:

- set/card CSV import into the active set,
- Cockatrice/MTG.design XML import into the active set,
- Planesculptors TXT import into the active set,
- dry-run audit and real import modes,
- Cockatrice sync after real import.

Future behavior:

- card import as single or bulk,
- deck import from `.cod`, XML, text, or Markdown,
- set import to new or existing set,
- project import as a grouped collection of sets/cards/decks,
- gallery asset import from files, URLs, or CSV metadata,
- reference import from CSV or other structured reference sources.

## File Export Hub

File > Export should mirror the import hub:

- Cards,
- Decks,
- Sets,
- Projects,
- Gallery,
- References.

Current supported behavior to preserve:

- current card PNG export,
- set CSV source exports,
- Cockatrice XML export,
- Cockatrice ZIP export,
- deck plain text export,
- deck `.cod` export.

Future behavior:

- choose current card or another card before exporting,
- bulk export cards independent of set package export,
- export a deck from File even when the Decks workspace is not active,
- export a project as a grouped package of its sets, decks, cards, library
  assets, and references,
- export gallery assets with metadata,
- export reference data.

## Ungrouped Holding Areas

Do not introduce a separate global card database in the first implementation.
Use holding groups that remain compatible with the current project/set model.

- Add an Ungrouped project/group visible at the top of relevant left panels.
- Use an Ungrouped set/holding set for cards that are not assigned to a real
  set yet.
- Treat ungrouped as a first-class UI grouping, not as missing data.
- Keep the holding model file-backed and explicit so future exports can include
  or exclude it deliberately.

## Component Architecture

Create small, reusable overlay files instead of expanding `WorkspaceView.tsx`.
Recommended implementation shape:

```text
packages/editor/src/components/overlays/
  OverlayShell.tsx
  DirtyCloseConfirm.tsx
  ReferenceCreateOverlay.tsx
packages/editor/src/components/create/
  CreateCardOverlay.tsx
  CreateDeckOverlay.tsx
  CreateSetOverlay.tsx
  CreateProjectOverlay.tsx
  CreateLibraryAssetOverlay.tsx
packages/editor/src/components/
  TransferDialog.tsx
packages/editor/src/domain/
  createFlowTypes.ts
  transferFlowTypes.ts
```

`App.tsx` should orchestrate which overlay is open. Workspace components should
only request an overlay through callbacks such as `onCreateCard`,
`onCreateDeck`, `onCreateSet`, `onCreateProject`, and `onCreateLibraryAsset`.

## Acceptance Criteria

- Cards, Decks, Sets, Projects, and Gallery plus buttons all open the same
  overlay pattern.
- No plus button silently creates an object before the user confirms.
- Dirty overlays ask before closing.
- File Import/Export remain broad labels and show entity choices.
- Existing import/export behavior remains available.
- `WorkspaceView.tsx` stops receiving new large create forms.
- Reference is documented as aligned future work, not modified in this slice.

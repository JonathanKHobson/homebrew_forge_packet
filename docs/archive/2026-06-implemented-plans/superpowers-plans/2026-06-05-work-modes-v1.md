---
status: archived
lane: ui
type: plan
archived: 2026-06-09
---
> **ARCHIVED 2026-06-09 (implemented-plans sweep)** — original path: `docs/superpowers/plans/2026-06-05-work-modes-v1.md`
> Reason: implemented planning artifact, archived per Kyle's 2026-06-09 directive (all plans implemented; no live backlog).
> Index: `docs/cowork/02_repo_archive_manifest.md` + `docs/64_repo_cleanup_archive_index.md`.

# Work Modes V1 Implementation Plan

🗄️ `[status: archived]` `[lane: ui]` `[type: plan]`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement and QA the V1 Work Modes upgrade for Full Studio, Card Maker, Deck Builder, and Collection Manager.

**Architecture:** Keep one canonical app surface with a global work mode key. Work modes apply task-shaped defaults for workspace, rail filtering, panel visibility, and explanatory copy. They do not duplicate Cards, Decks, Collections, or Dashboard pages.

**Tech Stack:** TypeScript, React, Vite editor, local Forge/editor domain helpers, CSS.

---

## Research Inputs

- `docs/34_work_modes_research.md`
- `docs/35_work_modes_personas_requirements.md`
- `docs/36_work_modes_priority_matrix.md`
- `docs/project-map.md`

## Constraints

- Preserve Cards vs Sets vs Projects vs Decks vs Collections.
- Preserve Card vs Frame vs Layout distinctions.
- Work Modes are presets; Panels remain manual overrides.
- Focused Layouts remain single-purpose deep views.
- No live pricing integration in V1.
- No legality enforcement, draw simulation, or Playtest Prep mode in V1.
- Do not stage or commit in this dirty repo unless Kyle explicitly asks.

## Slice 1: Core Mode Registry

- [x] Add `packages/editor/src/domain/workModes.ts`.
- [x] Define `WorkModeId` for `full-studio`, `card-maker`, `deck-builder`, and `collection-manager`.
- [x] Define labels, short labels, descriptions, default workspace, visible rail sections, and panel presets.
- [x] Export helpers for looking up modes and checking section visibility.
- [x] Verify editor typecheck.

## Slice 2: App State and Preset Application

- [x] Add `workMode` state to `App.tsx`.
- [x] Add a mode selection handler that exits focused/card-browser/dashboard layouts, applies workspace and panel presets, preserves selected data, and posts a status message.
- [x] Use the active mode to filter the side rail.
- [x] Ensure manual panel toggles do not change `workMode`.
- [x] Verify editor typecheck.

## Slice 3: View Menu and Toolbar Signal

- [x] Add `View > Work Modes` submenu to `EditorToolbar.tsx`.
- [x] Checkmark the active mode in the submenu.
- [x] Add a visible active-mode chip near the project/set context.
- [x] Keep the chip compact and non-confusing on narrow layouts.
- [x] Verify browser QA confirms the active mode is visible and updates.

## Slice 4: Side Rail Mode Awareness

- [x] Update `SideRail.tsx` to accept the active mode and visible sections.
- [x] Keep Full Studio showing all sections.
- [x] Make Card Maker emphasize cards, sets, library, references, projects, and settings.
- [x] Make Deck Builder emphasize decks, collections, projects, settings, and add-card/browser pathways.
- [x] Make Collection Manager emphasize collections, decks, projects, settings, and dashboard/browser pathways.
- [x] Ensure the active workspace remains reachable even if it is not normally visible in a mode.
- [x] Add a short rail status label explaining the current mode.

## Slice 5: Workspace Mode Copy

- [x] Pass `workMode` into `WorkspaceView.tsx`.
- [x] Add concise mode-aware copy to Decks and Collections headers.
- [x] Add concise mode-aware copy to Projects/Sets/Gallery/References only if needed for clarity.
- [x] Do not add instructional feature tours or marketing copy.
- [x] Verify desktop and narrow layouts do not overflow.

## Slice 6: Deck Builder Polish

- [x] Surface existing deck stats more clearly in Deck Builder mode.
- [x] Keep export actions visible.
- [x] Keep deck row/right-panel labels deck-oriented.
- [x] Avoid schema, legality, or playtest changes.
- [x] Verify deck list viewing still works.

## Slice 7: Collection Manager Polish

- [x] Surface collection review, duplicate, finish, condition, and quantity summaries where local data supports them.
- [x] Add explicit value-unavailable/value-source wording instead of implying live prices.
- [x] Keep row review/save/export actions visible.
- [x] Avoid live market or account integrations.
- [x] Verify collection viewing and save/reload behavior still works.

## Slice 8: Full Studio Integration

- [x] Confirm Full Studio exposes all current sections and broad editor behavior.
- [x] Confirm Full Studio inherits useful Decks/Collections workspace polish without hiding tools.
- [x] Confirm mode chip says Full Studio.

## Slice 9: Verification and QA

- [x] Run editor typecheck.
- [x] Run repo build or available editor build.
- [x] Run relevant Forge/editor tests if available.
- [x] Run browser visual QA for Full Studio, Card Maker, Deck Builder, and Collection Manager on desktop.
- [x] Run narrow viewport visual QA for the Work Modes menu/chip/rail.
- [x] Clean up automation-owned browser sessions before signoff.

## Done

Work Modes V1 is done when all four V1 modes can be selected from View, each applies the right default workspace and rail/panel posture, active mode is visibly communicated, relevant workspace copy/stat polish is present, and type/build/browser QA pass.

# Browse And Filter Overlay Plan

## Purpose

Homebrew Forge should make list narrowing visible, reversible, and consistent.
Search stays visible in each workspace. Filters open a dedicated browse/filter
overlay with matching results on one side and filter controls on the other.

This plan is the source of truth for future filter work on Cards, Decks,
Collections, Sets, Projects, Library, and Reference.

## Phase Checklist

1. Shared foundation
   - Add editor filter helpers for active-count, tag parsing, text matching,
     and numeric text matching.
   - Add reusable filter button, overlay, and filtered-empty-state components.
   - Count only non-search filters in the badge.

2. Cards
   - Keep card search visible in the Cards list.
   - Replace inline card filters with the shared overlay.
   - Filter cards by rarity, status, tags, color identity, mana cost text, type
     terms, frame, review state, oracle text, flavor text, power, and toughness.
   - Let the Inspector Preview tab edit card status, tags, and notes.

3. Metadata
   - Preserve existing card status and tags.
   - Add tags to deck metadata.
   - Add tags to set CSV/schema/template handling.
   - Add project status and tags to the library JSON model.
   - Keep older files valid when tags or project status are missing.

4. Management workspaces
   - Keep search visible in every left panel.
   - Make the filter button open the shared overlay for Decks, Collections,
     Sets, Projects, Library, and Reference.
   - Show a badge whenever non-search filters are active.
   - Show reset actions in overlays and empty states.

5. Verification
   - Run typecheck, build, and Forge tests after data model changes.
   - Visually QA the editor at desktop and mobile widths.
   - Confirm browser automation is handed back before signoff.

## Acceptance Criteria

- Every workspace has visible search without clicking the filter button.
- Every filter button opens an overlay, not an inline hidden panel.
- Active non-search filters show a numeric badge on the filter button.
- Reset filters never clears the search field; clear search never resets filters.
- Empty results explain whether search or filters are hiding rows and provide a
  recovery action.
- Official-only filters such as edition, official format legality, and mana
  production are not shown until Homebrew Forge has reliable official-card data.

## Stop Conditions

Split the work before continuing if:

- a filter component grows past roughly 500 lines,
- a workspace needs a new persistence model not listed here,
- official-card search or legality enforcement becomes required,
- `WorkspaceView.tsx` grows with large reusable UI that belongs in
  `components/filters/`.

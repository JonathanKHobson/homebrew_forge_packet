# Forge UI Visual QA Checklist

Use this checklist for every Forge UI visual slice.

## Required Views

- Desktop 1440x900: Cards
- Desktop 1440x900: Decks
- Desktop 1440x900: Collections
- Desktop 1440x900: Card Dashboard
- Desktop 1440x900: Card List Browser
- Mobile 390x844: Cards
- Mobile 390x844: Decks
- Shell overlay 1440x900: Command Palette
- Shell overlay 1440x900: Workspace Health

## Required States

- Default loaded state
- Selected row/tab state
- Hover/focus where changed
- Empty state where available
- Runtime freshness warning if present
- Dialog/overlay state if the slice changes overlays
- Command palette search/focus state if the slice changes global commands
- Workspace Health panel if the slice changes status/runtime/source feedback
- Disabled and dirty/unsaved states if controls are affected

## Theme Checks

- Light contrast scan
- Dark contrast scan
- Parchment contrast scan when the slice touches tokens or global colors
- Dark-mode light-surface leak scan

## Pass Criteria

- No computed text contrast failures in scanned visible UI text.
- No unintended light surfaces in dark mode outside rendered card images.
- No horizontal overflow at 390px.
- Core rail destinations remain reachable.
- Runtime warning remains readable.
- Focus rings are visible on changed controls.
- Screenshots are saved under `output/playwright/forge-ui-phase-<phase>/`.

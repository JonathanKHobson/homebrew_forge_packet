# Work Modes Priority Matrix and Roadmap

Date: 2026-06-05

Companion docs:

- `docs/34_work_modes_research.md`
- `docs/35_work_modes_personas_requirements.md`

## Stop Condition

The Work Modes upgrade is complete when these V1 modes are implemented and QAed:

- Full Studio
- Card Maker
- Deck Builder
- Collection Manager

Each mode must have:

- a View > Work Modes menu item,
- active-mode signaling,
- default workspace/panel/rail behavior,
- mode-aware workspace copy where behavior changes,
- manual panel override compatibility,
- desktop and narrow visual QA.

## Priority Rule

Ship mode clarity before mode sophistication.

Order of importance:

1. Mode identity is visible and understandable.
2. Mode switch applies predictable defaults.
3. Existing workspaces improve without data-model drift.
4. Deck/collection/card authoring boundaries stay intact.
5. Mode-specific stats and value surfaces are added where local data supports
   them.
6. Later live market, legality, and playtest features stay out of V1.

## Phase Roadmap

| Phase | Slice | User Value | Complexity | Risk | Done Condition |
| --- | --- | --- | --- | --- | --- |
| 0 | Research | Defines personas, external patterns, requirements, and product boundaries. | Low | Scope creep. | Research, persona, and roadmap docs exist. |
| 0.5 | Architecture plan | Defines work mode registry, state ownership, and UI surfaces before runtime edits. | Low | Over-abstracting. | Implementation targets are named and scoped. |
| 1 | Core Work Mode system | Users can choose Full Studio, Card Maker, Deck Builder, and Collection Manager. | Medium | Layout state collisions. | View submenu, active chip, mode registry, and presets pass QA. |
| 2 | Card Maker mode | Authors get a cleaner card-making surface. | Medium | Hiding useful set/reference tools. | Card Maker opens Cards with authoring panels and clear mode signaling. |
| 3 | Deck Builder mode | Players can build/export decks without card-authoring clutter. | Medium | Deck workspace role drift. | Deck Builder opens Decks with read-only card preview posture and deck stats emphasis. |
| 4 | Collection Manager mode | Collectors can review inventory and value-related information faster. | High | Live price scope creep. | Collection Manager opens Collections with stats, source/local value fields, and review emphasis. |
| 5 | Full Studio integration | Broad mode inherits useful improvements from specific modes. | Medium | Full Studio becoming busier. | Full Studio still exposes everything and gains improved workspace summaries. |
| 6 | QA and polish | Modes feel deliberate on desktop and narrow layouts. | Medium | Visual regressions. | Typecheck/build plus visual QA for all four modes. |

## Implementation Structure

Use small additions instead of expanding `App.tsx` and `WorkspaceView.tsx` into
larger monoliths.

Recommended files:

```text
packages/editor/src/domain/workModes.ts
packages/editor/src/components/WorkModeChip.tsx
packages/editor/src/domain/workModePresets.ts
```

Possible later split if mode-specific copy grows:

```text
packages/editor/src/domain/workModeCopy.ts
```

Responsibilities:

- `workModes.ts`: mode ids, labels, descriptions, rail visibility, default
  workspace, and panel presets.
- `workModePresets.ts`: pure helpers for applying mode presets safely.
- `WorkModeChip.tsx`: compact active-mode signal in app chrome.
- `EditorToolbar.tsx`: View > Work Modes submenu and active mode wiring.
- `SideRail.tsx`: optional mode-aware rail filtering and explanation.
- `WorkspaceView.tsx`: mode-aware copy/labels only where needed.

## Phase 0.5 Architecture Decisions

Work mode state should live in `App.tsx` because App owns workspace, panel, rail,
focused layout, and dashboard state.

Work mode definitions should not live in `App.tsx`; they should live in a domain
registry.

Selecting a mode should:

1. exit Focused Card, Card Browser, and Dashboard modes unless the target mode
   explicitly opens Dashboard later,
2. set active workspace,
3. set panel visibility,
4. set side rail visibility/filtering,
5. preserve unsaved card drafts,
6. preserve selected project/set/card/deck/collection when possible,
7. show a status message.

Manual panel toggles should not change the selected Work Mode. They are
overrides within the active mode.

## Prioritization Matrix

| Item | Impact | Effort | Risk | Priority | Notes |
| --- | --- | --- | --- | --- | --- |
| Work mode type/registry | High | Low | Low | P0 | Required foundation. |
| View > Work Modes submenu | High | Low | Low | P0 | Primary selection surface. |
| Active Work Mode chip | High | Low | Low | P0 | Prevents confusion after layout changes. |
| Mode preset application helper | High | Medium | Medium | P0 | Avoids scattered state changes. |
| Side rail mode filtering | High | Medium | Medium | P0 | Main newcomer simplification. |
| Full Studio preset | High | Low | Low | P0 | Must preserve current broad app. |
| Card Maker preset | High | Low | Low | P0 | First authoring value. |
| Deck Builder preset | High | Medium | Medium | P0 | First player value. |
| Collection Manager preset | High | Medium | Medium | P0 | First collector value. |
| Mode-aware workspace header copy | Medium | Low | Low | P1 | Helps explain changed layouts. |
| Dashboard default scope by mode | Medium | Medium | Medium | P1 | Useful, but should not block core mode switching. |
| Deck stats emphasis | High | Medium | Medium | P1 | Uses existing dashboard/stats where possible. |
| Collection value source fields | High | Medium | High | P1 | Start local/source-derived; defer live market sync. |
| Duplicate and rarity collection summaries | Medium | Medium | Medium | P1 | Strong collector value after core mode works. |
| Read-only card preview surface | High | High | Medium | P1 | May reuse Card Browser and overlays. |
| Live pricing integration | High | High | High | P3 | Needs source/API policy and possibly credentials. |
| Playtest Prep mode | Medium | High | High | P3 | Later mode, not V1. |
| Review & Analytics mode | Medium | Medium | Medium | P3 | Later mode; Dashboard already covers much of it. |

## Slice Plan

### Slice 1: Core Mode Registry

Ship:

- Add `WorkModeId`.
- Add V1 mode definitions.
- Add mode default workspace and panel presets.
- Add active mode state in App.

Do not touch:

- Deck data model.
- Collection data model.
- Dashboard widget model.

Verification:

- Editor typecheck.

### Slice 2: View Menu and Mode Chip

Ship:

- Add View > Work Modes submenu.
- Checkmark active mode.
- Add toolbar mode chip next to project/set context.
- Add status message on mode switch.

Verification:

- Browser QA confirms active mode is visible and menu updates.

### Slice 3: Mode Presets

Ship:

- Full Studio applies current default.
- Card Maker opens Cards with card list, preview, inspector, side rail.
- Deck Builder opens Decks with deck/collection/card browser emphasis.
- Collection Manager opens Collections with collection review emphasis.
- Manual Panels submenu still works after a preset.

Verification:

- Browser QA for mode switching.
- Desktop and narrow screenshots.

### Slice 4: Mode-Aware Side Rail

Ship:

- Full Studio shows all rail items.
- Card Maker emphasizes Cards, Sets, Gallery, References, Projects, and Settings.
- Deck Builder emphasizes Decks, Collections, Projects, Settings, and card
  browser/add-card pathways where available.
- Collection Manager emphasizes Collections, Decks, Projects, Settings, and
  dashboard/browser pathways where available.
- Hidden/secondary sections remain reachable through Full Studio.

Verification:

- Rail item counts and labels are correct in all modes.
- Active workspace never disappears without a fallback.

### Slice 5: Deck Builder Workspace Polish

Ship:

- Header copy clarifies Deck Builder mode.
- Deck workspace right panel labels stay deck/deck-entry oriented.
- Add visible deck stat emphasis from existing local deck fields.
- Keep export actions prominent.

Do not touch:

- Legality engine expansion.
- Draw simulation.
- Playtest mode.

Verification:

- Add/open deck path still works.
- Export actions remain visible.

### Slice 6: Collection Manager Workspace Polish

Ship:

- Header copy clarifies Collection Manager mode.
- Add explicit unavailable value states or source-derived value display where
  data already exists.
- Add duplicate, finish, condition, and review summary emphasis.
- Keep collection row review/save/export prominent.

Do not touch:

- Live market price sync.
- Marketplace account integrations.
- Automatic valuation claims without a source.

Verification:

- Collection rows save/reload.
- Value fields fail closed when no price source exists.

### Slice 7: Card Maker Workspace Polish

Ship:

- Header/mode copy clarifies Card Maker mode.
- Keep authoring inspector prominent.
- Keep References and Gallery reachable.
- Keep Dashboard useful for active set/project diagnostics.

Do not touch:

- New card frame families.
- Renderer changes unrelated to mode clarity.

Verification:

- Existing card edit/save/preview path still works.

### Slice 8: Full Studio Integration

Ship:

- Full Studio exposes all workspaces.
- Full Studio inherits Decks/Collections/Card polish without mode lock-in.
- Mode chip says Full Studio.

Verification:

- Current broad workflow remains intact.

### Slice 9: Full QA Pass

Ship:

- Typecheck.
- Build.
- Relevant Forge tests.
- Browser visual QA for each V1 mode on desktop and narrow viewport.
- Browser handoff cleanup.

## Out Of Scope For V1

- Review & Analytics as its own Work Mode.
- Playtest Prep as its own Work Mode.
- Live pricing API integration.
- Market account login.
- Format legality enforcement.
- Draw simulation.
- New deck metadata schema.
- New frame/layout registry work.
- Turning collection rows into authored cards automatically.

## V1 Completion Checklist

- Full Studio implemented and QAed.
- Card Maker implemented and QAed.
- Deck Builder implemented and QAed.
- Collection Manager implemented and QAed.
- Work Modes research docs complete.
- Work Modes roadmap complete.
- Project map points to Work Modes docs.

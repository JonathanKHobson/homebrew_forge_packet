# Editor Review Priority Matrix

Date: 2026-06-07

Priority is based on user impact, frequency, reversibility, and implementation
risk. Core authoring trust wins over visual nicety.

| Priority | Issue IDs | Why |
| --- | --- | --- |
| P0 | ER-001, ER-002, ER-003 | The app currently clips important controls at laptop size, and the renderer misrepresents authored card text. These break core editing trust. |
| P1 | ER-004, ER-005 | Duplicate preview affordances and always-on layout handles make the new tool system feel less intentional. These are visible, contained UI fixes. |
| P2 | ER-006, ER-008 | Section zoom and naming/icon convention cleanup improve learnability, but they do not block saving or rendering. |
| P3 | ER-007 | Full manual text-zone positioning needs schema, CSV, renderer, inspector, migration, and validation work. It should be designed as its own slice. |

## Immediate Implementation Order

1. Make shell panel widths and the command row responsive at laptop widths.
2. Remove the duplicate toolbar expand button.
3. Repair renderer auto text sizing and segmented mana/text spacing.
4. Add layout-zone selection so name/type/rules can be inspected in isolation.
5. Extend visual QA to include a laptop/compact viewport and horizontal overflow check.
6. Backlog section zoom, persistent name/type positioning, and standard-convention polish with clear acceptance criteria.

## Acceptance Bar

- Maker workspace has no horizontal overflow at desktop, laptop, and mobile QA widths.
- Right inspector remains reachable at laptop widths.
- Toolbar compacts without hiding the active project/set context.
- Clockwork Relic renders readable rules text and visible spacing around `{C}`.
- Layout tool shows controls only for the selected zone.
- Verification commands pass or failures are documented with exact causes.

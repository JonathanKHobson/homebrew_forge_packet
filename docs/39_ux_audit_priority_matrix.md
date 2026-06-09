---
status: completed
lane: qa
type: matrix
pin: hard-ref
---
# UX Audit Prioritization Matrix

✅ `[status: completed]` `[lane: qa]` `[type: matrix]` `[pin: hard-ref]`

Source: Claude UXHC audit, 2026-06-05. Overall grade was B- / 69.22%; the
weakest area was H11 Accessibility at D / 43.75%.

## Priority Logic

| Priority | Definition | Ship Rule |
| --- | --- | --- |
| P1 | Systemic access, first-impression, or cross-workspace IA risk. | Fix before broad polish. These items affect basic use or many workflows. |
| P2 | Important flow clarity, error-prevention, or content consistency issue. | Fix after P1 in small slices with focused validation. |
| P3 | Polish, recognition, validation, support, and hygiene. | Batch only when the shared code owner is the same. |

## Impact / Effort Matrix

| Effort | High Impact | Medium Impact | Low Impact |
| --- | --- | --- | --- |
| Small | HF-UX-003 right-panel naming; HF-UX-004 pluralization; HF-UX-007 transfer defaults; HF-UX-009 draft delete confirmation; HF-UX-012 settings copy; HF-UX-013 status location; HF-UX-018 Maker title; HF-UX-016 document title | HF-UX-021 support path; HF-UX-022 icon differentiation; HF-UX-015 static tile affordance | HF-UX-020 transient console 400 if easy to reproduce |
| Medium | HF-UX-001 a11y semantics; HF-UX-002 first-run orientation; HF-UX-008 narrow layout; HF-UX-005 dialog hierarchy; HF-UX-006 print labels/progress; HF-UX-011 type-gated fields; HF-UX-014 concepts help; HF-UX-017 core editor density | HF-UX-010 undo/redo honesty or implementation; HF-UX-019 inline validation | - |
| Large | None as a first pass. Escalate only if HF-UX-010 becomes full undo history or HF-UX-008 requires structural mobile navigation. | - | - |

## Wave Plan

| Wave | Purpose | Issues |
| --- | --- | --- |
| Wave 1 | Remove access barriers and first-use confusion. | HF-UX-001, HF-UX-002, HF-UX-003, HF-UX-008, HF-UX-018 |
| Wave 2 | Clarify high-friction flows and protect user work. | HF-UX-004, HF-UX-005, HF-UX-006, HF-UX-007, HF-UX-009, HF-UX-010, HF-UX-011, HF-UX-012, HF-UX-013 |
| Wave 3 | Teach the product model and reduce recurring confusion. | HF-UX-014, HF-UX-017, HF-UX-019, HF-UX-021 |
| Wave 4 | Polish recognition and engineering hygiene. | HF-UX-015, HF-UX-016, HF-UX-020, HF-UX-022 |

## First Stop Condition

Wave 1 is done when:

- Keyboard users can operate inspector tabs and the top menu model without
  losing focus.
- Icon-only focused-layout exits have accessible names.
- First launch and Maker workspace explain what Homebrew Forge is and what to
  do next.
- Narrow width keeps rail destinations reachable and exposes card list, preview,
  and inspector through a clear mobile/narrow control.
- Right/detail panel naming is consistent across major workspaces.

## Verification Matrix

| Verification | Applies To |
| --- | --- |
| `node .tools/pnpm/bin/pnpm.cjs typecheck` | Every wave |
| `node .tools/pnpm/bin/pnpm.cjs build` | Every wave |
| `node .tools/pnpm/bin/pnpm.cjs test` | Every wave unless a narrow test command is justified first |
| Browser QA at 1440x900 | Every visual wave |
| Browser QA at 390x844 | HF-UX-008 and any layout-affecting wave |
| Keyboard traversal check | HF-UX-001, HF-UX-009, HF-UX-014 |
| Re-audit or compare against UXHC baseline | End of Wave 1 and end of Wave 4 |

---
status: completed
lane: qa
type: plan
pin: hard-ref
---
# UX Audit Phase And Slice Roadmap

✅ `[status: completed]` `[lane: qa]` `[type: plan]` `[pin: hard-ref]`

This roadmap turns the 2026-06-05 UXHC audit into implementation slices. It is
ordered to ship the highest-confidence product fixes first and avoid spreading
work across unrelated features.

## Phase 0 — Audit Intake And Planning

Status: verified through implementation, typecheck, build, test, and browser QA.

| Slice | Issues | Deliverable | Acceptance |
| --- | --- | --- | --- |
| 0.1 Catalog audit findings | all | Issue catalog, priority matrix, roadmap, tracker | Every Claude issue is represented once with owner and phase. |
| 0.2 Identify shared components | all | Code-owner map | No fix starts without a code owner and validation path. |

## Phase 1 — Accessibility, Orientation, And IA Foundations

Goal: lift the lowest-scoring heuristic and remove the first-use cliff.

| Slice | Issues | Deliverable | Primary Files | Acceptance |
| --- | --- | --- | --- | --- |
| 1.1 Accessible menus, tabs, and exits | HF-UX-001 | Inspector tabs use tab semantics and arrow keys; menu model has keyboard support; icon exits are labeled. | `EditorToolbar.tsx`, `Inspector.tsx`, `App.tsx`, styles | Manual keyboard pass works at desktop; screen-reader roles are exposed by DOM. |
| 1.2 First-run and Maker orientation | HF-UX-002, HF-UX-018 | Dismissible welcome; Maker header/purpose; clear primary first action. | New orientation component, `WorkspaceView.tsx` or Maker shell, `App.tsx` | New user can identify app purpose and first action from the UI. |
| 1.3 Narrow viewport reachability | HF-UX-008 | Rail destinations stay reachable; narrow Maker layout has clear List/Preview/Inspector switching. | `SideRail.tsx`, `App.tsx`, `styles.css` | 390x844 screenshot shows reachable navigation and no clipped Gallery label. |
| 1.4 Inspector/detail naming | HF-UX-003 | One naming pattern for detail panels. | `WorkspaceView.tsx`, inspector/detail components | Maker, Decks, Collections, Sets, Projects share a consistent heading pattern. |

## Phase 2 — Flow Clarity And Error Prevention

Goal: make high-use dialogs and destructive actions safer and clearer.

| Slice | Issues | Deliverable | Primary Files | Acceptance |
| --- | --- | --- | --- | --- |
| 2.1 Count text helper | HF-UX-004 | Shared pluralization helper applied to workspace counts. | UI helper, workspace components | No `1 sets` style strings remain in visible UI. |
| 2.2 Dialog action hierarchy | HF-UX-005 | Primary/secondary/tertiary action styling in transfer and print dialogs. | transfer and print components, styles | Each dialog section has one visually dominant commit action. |
| 2.3 Print outcome clarity | HF-UX-006 | Outcome labels and proof progress/error/retry copy. | `PrintDialog.tsx`, print state | User can predict print vs PDF outcome from labels. |
| 2.4 Import/export defaults | HF-UX-007 | Transfer scope defaults to active entity; scope tabs are labeled distinctly. | transfer dialog state | Import and Export open on consistent context. |
| 2.5 Draft delete protection | HF-UX-009 | Confirm destructive draft deletion. | `EditorToolbar.tsx`, `App.tsx`, overlay | Delete Unsaved Draft cannot destroy work in one click. |
| 2.6 Undo/redo honesty | HF-UX-010 | Either implement field history or make unavailable state explicit with tooltip/copy. | editor state, toolbar | Controls no longer promise a safety net that does not exist. |
| 2.7 Type-relevant create fields | HF-UX-011 | Hide irrelevant loyalty/P/T fields based on selected type. | `CreateCardOverlay.tsx`, `Inspector.tsx` | Creature default does not show planeswalker loyalty fields. |
| 2.8 Settings and panels copy | HF-UX-012 | User-facing Settings copy; Collections toggle also appears in View > Panels. | settings workspace, toolbar | Settings no longer exposes internal roadmap language. |
| 2.9 Consistent status feedback | HF-UX-013 | Shared app-shell status region. | `App.tsx`, workspace components | Feedback appears in one predictable place. |

## Phase 3 — Help, Density, Validation, And Support

Goal: teach the product model and reduce routine form friction.

| Slice | Issues | Deliverable | Acceptance |
| --- | --- | --- | --- |
| 3.1 Concepts and support help | HF-UX-014, HF-UX-021 | Help menu links to Concepts, top flows, shortcuts, and feedback guidance. | User can explain Project/Set/Card, Deck, Collection, Gallery, Reference, and Variant from in-app help. |
| 3.2 Core editor density | HF-UX-017 | Compact/collapsible toolbar or spacing adjustments. | Main card edit controls fit better at 1280x800. |
| 3.3 Static tile affordance | HF-UX-015 | Static tiles look static or become useful drilldowns. | Dashboard/deck/collection stat tiles no longer look like dead buttons. |
| 3.4 Dynamic document title | HF-UX-016 | Window title reflects workspace and active set. | Browser title updates when workspace changes. |
| 3.5 Inline validation | HF-UX-019 | Create/import form validation communicates field-level errors. | Invalid fields get local guidance without relying only on final status. |

## Phase 4 — Recognition Polish And Hygiene

Goal: close low-risk polish and verify no regressions.

| Slice | Issues | Deliverable | Acceptance |
| --- | --- | --- | --- |
| 4.1 Console 400 reproduction | HF-UX-020 | Guard or fix incomplete preview/render requests. | No transient 400 appears during audited navigation path. |
| 4.2 Rail icon differentiation | HF-UX-022 | More distinct rail icons or labels/tooltips. | Sets, Projects, Gallery, Collections are easier to distinguish at a glance. |
| 4.3 UXHC compare audit | all | Re-run/compare UXHC audit against baseline. | Fixed/new/unresolved deltas are documented. |

## Implementation Rule

Move slice by slice. A slice is complete only when code is changed, checks pass,
and visual QA covers the affected viewports.

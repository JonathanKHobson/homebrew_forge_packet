---
status: archived
lane: ui
type: plan
archived: 2026-06-09
---
> **ARCHIVED 2026-06-09 (implemented-plans sweep)** — original path: `docs/59_next_version_phase_roadmap.md`
> Reason: implemented planning artifact, archived per Kyle's 2026-06-09 directive (all plans implemented; no live backlog).
> Index: `docs/cowork/02_repo_archive_manifest.md` + `docs/64_repo_cleanup_archive_index.md`.

# Next-Version Phase Roadmap

🗄️ `[status: archived]` `[lane: ui]` `[type: plan]`

Status: UXHC remediation verified through HF-201 to HF-211. Claude's resumed UXHC findings are merged; broader external-research/NVR future features resume after the verified remediation evidence is reviewed.

Source backlog: `docs/58_external_research_next_version_backlog.md`.

## Product Direction

Position Homebrew Forge as:

> A local-first production studio for custom Magic-style cards, sets, decks, and collection/reference workflows, built around editable source files, validated renders, safe asset packs, and reliable export packages for private playtesting.

Roadmap filter:
- Ship trust before breadth.
- Prefer interoperability adapters over cloning specialized tools.
- Prefer shared UI contracts over page-specific fixes.
- Keep local data boundaries visible.
- Avoid scanner, marketplace, live-pricing, and social-gallery scope until explicitly approved.

## Phase 0: Audit Unblock And Evidence Intake

Goal: restore a working app so Claude can resume the full UXHC audit and every future item has evidence.

Status: in progress / partially complete.

Slices:
1. Fix initial DEMO load ambiguity and duplicate startup requests.
   - Status: complete in current slice.
   - Evidence: one `/api/project?set=DEMO` request, 10 Maker cards rendered, status no longer says `No project loaded` during loading.
2. Fix Sets null-project crash.
   - Status: complete in current slice.
   - Evidence: Sets rail click no longer throws `project.drafts`; UX gate rail tour added.
3. Add visible initial-load error + retry.
   - Status: complete for initial load; validate workspace-level loaders after Claude resumes.
4. Resume Claude UXHC audit and merge findings.
   - Status: complete.
   - Evidence: `reports/ux-audit/advanced-ux-bug-report.md`, `ux-audit-prioritization-matrix.md`, `uxhc-resumed-report.html`.

Exit criteria:
- Claude can run populated Maker, Decks, Collections, Card Browser, References, overlays, and mobile/laptop flows.
- P0/P1 Claude findings are merged into the backlog.
- Implementation proceeds through the UXHC remediation phases below.

## Active UXHC Remediation Sequence

Goal: raise task completion and perceived quality by clearing Claude's HF-201 through HF-211 findings in order of persona impact.

### Phase UXHC-1: Deck Visibility

Findings: HF-203.

Status: verified in remediation slice.

Slices:
1. Make Decks default to global `All projects`.
2. Add visible project-scope chip only when the user chooses a project filter.
3. Include hidden-count and one-click `Show all`.
4. Add smoke coverage that default Decks shows all 3 seeded decks.

Exit criteria:
- Decks is a top-level cross-set workspace by default.
- Users can recover from project filtering in one click.

### Phase UXHC-2: Density And Affordance Cleanup

Findings: HF-204, HF-209.

Status: verified in remediation slice.

Slices:
1. Collapse Collections/Binders/Lists stat tiles into compact summaries and suppress zero-value noise.
2. Remove repeated Reference term category labels where the active category already communicates context.
3. Move Deck metadata away from the primary board stack and make board/search/add/stats dominant.
4. Style static summaries as non-interactive unless they drill down or filter.

Exit criteria:
- Primary task is visible above the fold in Decks, Collections, Binders, Lists, and References.
- Uppercase/repeated label count materially drops in populated visual QA.

### Phase UXHC-3: Preview And Load Confidence

Findings: HF-201, HF-202.

Status: verified in remediation slice for initial load and Maker preview recovery; deeper performance profiling remains a Trust Foundation follow-up.

Slices:
1. Add Maker preview timeout, error, and retry using the existing `/api/preview` path.
2. Add workspace skeleton/loading states so slow fetches do not present false empty counts.
3. Profile initial project load enough to identify likely client normalization/render cost.

Exit criteria:
- Preview renders or shows actionable retry rather than indefinite `Rendering preview`.
- Workspace navigation shows structure immediately while data loads.

### Phase UXHC-4: Deck Builder Intelligence

Findings: HF-205.

Status: verified in remediation slice.

Slices:
1. Add compact live stats from active variant entries: curve, colors, type counts, sections, unresolved refs, duplicates/singleton warnings.
2. Add local collection availability where collection rows are already available.
3. Keep all stats derived editor-side from existing `DeckState` and collection summaries/entries.

Exit criteria:
- Deck Builder can see basic curve/color/type/availability signals without leaving the workspace.

### Phase UXHC-5: Accessibility And Responsive Hardening

Findings: HF-206, HF-207.

Status: verified in remediation slice for changed surfaces; deeper keyboard-only conformance remains in Phase 1/NVR-004.

Slices:
1. Add or repair labels, roles, and focus states for changed icon buttons, tabs, segmented controls, rows, and dialogs.
2. Keyboard-tour Decks, Collections, Binders, Lists, References, and focused layouts.
3. Stack/wrap Deck labels and controls at 360-414px so key labels are not lost to ellipsis.

Exit criteria:
- UX gate and targeted keyboard smoke pass.
- Populated 390px Decks scan has no key-label clipping.

### Phase UXHC-6: Concepts, Terminology, And Title Polish

Findings: HF-208, HF-210, HF-211.

Status: verified in remediation slice; selected Deck/Collection document-title deepening remains optional follow-up.

Slices:
1. Add Concepts help for Maker, Sets, Projects, Decks, Collections, Binders, Lists, Gallery, References.
2. Add concise tooltips/help definitions for build, bracket, variant, Binders, and Lists.
3. Make document title reflect active workspace plus selected project/set/deck/collection where available.

Exit criteria:
- Larger object model is discoverable without permanent onboarding clutter.
- Jargon is explained in context.

## Phase 1: Trust Foundation

Goal: make the local-first editor safe, honest, and recoverable before widening features.

Backlog items: NVR-001, NVR-002, NVR-003, NVR-004, NVR-005.

Slices:
1. Create overlay contract audit.
   - Verify every plus button opens the right overlay and does not create objects before confirmation.
   - Normalize action copy, dirty state, save/error state, cancel behavior, and focus return.
2. Import/export staged-state audit.
   - Add or validate `Available now`, `Planned`, `Requires review`, and `Unsupported in this build` labels.
   - Remove or disable any action that implies unsupported functionality.
3. Local file trust indicators.
   - Add current source file/path visibility where useful.
   - Add last-saved/dirty state and plan external-change warnings before overwrite behavior changes.
4. Overlay accessibility gate.
   - Expand keyboard smoke tests for open, tab order, Escape, dirty close, Cancel, primary action, screen-reader labels, and focus return.
5. Workspace load-state cleanup.
   - Extend loading/error/retry patterns beyond initial project boot if Claude confirms hidden terminal loaders.

Exit criteria:
- No silent terminal spinner in core app load or changed workspace fetches.
- Every dialog/overlay changed in this phase has keyboard/focus evidence.
- Import/export and create flows do not overpromise.

## Phase 2: Shared Browse And List System

Goal: every browsable card/list surface uses the same visible search, sort, filter, reset, result count, empty-state, and saved-view language.

Backlog items: NVR-006, NVR-007.

Slices:
1. List-surface inventory.
   - Maker, Card Browser, Decks, Collections, Binders, Lists, References, Projects, Sets, Gallery.
   - Mark each as complete, partial, or missing against the shared Browse Toolbar contract.
2. Browse Toolbar hardening.
   - Consolidate labels, sort menus, filter buttons, active chips, reset behavior, and result summaries.
3. Saved views v1.
   - Start with local app settings for Cards, Collections, and References.
   - Do not add sync/collaboration.
4. Visual QA pass.
   - Desktop, laptop, mobile where relevant.
   - Confirm no fake filter controls, no overflow, and no disabled pseudo-controls.

Exit criteria:
- A user can learn search/filter/sort once and reuse it across list workspaces.
- Claude's over-communication/crowding findings are rechecked on populated data.

## Phase 3: Card Maker Credibility

Goal: make card creation and editing feel fast, familiar, and trustworthy while preserving source control and asset safety.

Backlog items: NVR-012, NVR-013, NVR-014, NVR-015, NVR-017.

Slices:
1. Time-to-first-card and first-run lane chooser.
   - Full-screen first-run only, no persistent compact strip.
   - Demo/load choices should not count sample cards as authored user content.
2. Frame/layout support badges.
   - Supported, Experimental, Registered only, Missing asset pack, Not in this build.
3. Asset-pack health panel.
   - Installed packs, missing roles, license/source/checksum state, active set usage.
4. Validation issue drawer.
   - Errors, warnings, notes, waived.
   - Include fix direction and waiver path.
5. Reference syntax helper.
   - Make `@`, `#`, `:`, `!`, braced symbols, `~`, italics, and forced lines discoverable.

Exit criteria:
- Creating or editing a card has immediate preview payoff.
- Unsupported frames/assets/readiness states are honest and visible.
- Validation helps without feeling punitive.

## Phase 4: Deck Builder Golden Path

Goal: make the owner's highest-priority persona credible: build/tune a deck with enough intelligence to avoid obvious mistakes and export confidently.

Backlog items: NVR-010, NVR-011, NVR-018.

Slices:
1. Deck intelligence v1.
   - Counts, sections, invalid references, duplicate/singleton warnings, color identity estimate.
2. Deck card search/add refinement.
   - Search custom/authored and local official-card catalog where supported.
   - Preserve unresolved/ambiguous states.
3. Collection availability badges.
   - Local collection ownership/availability only; no live pricing.
4. Export confidence.
   - Export readiness labels and dry-run summary for text and `.cod`.

Exit criteria:
- Deck Builder route: search/add -> board sections -> stats/availability -> export.
- No live-market or legality-engine overclaiming.

## Phase 5: Collection Manager Review And Exactness

Goal: make imported collection/list data trustworthy and fast to correct.

Backlog items: NVR-008, NVR-009, NVR-016.

Slices:
1. Needs-review queue.
   - Match confidence, unresolved filter, exact-print state.
2. Variant/finish/condition correction.
   - Row-level correction first.
3. Bulk correction.
   - Quantity, finish, condition, language, location, owner, tags where safe.
4. Copy collection row to authored draft.
   - Clear "copy" semantics, source badge, original row link, no-live-link warning.

Exit criteria:
- Scanner CSV imports do not silently guess.
- Users can correct common import errors without row-by-row exhaustion.

## Phase 6: Interoperability And Share

Goal: make import/export the strategic spine without turning Homebrew Forge into a marketplace or SaaS gallery.

Backlog items: NVR-019, NVR-020, NVR-021.

Slices:
1. Adapter recipes.
   - Generic CSV, scanner CSV, Cockatrice, Deckbox-like CSV, playtest/export targets.
2. Static share/playtest bundle.
   - Local HTML/ZIP with cards, decklists, manifest, disclaimers, import instructions.
3. Local project package.
   - Versioned manifest for sets, decks, collections, references, asset manifests, validation report.

Exit criteria:
- Users can move work to playtesters/tools with clear manifests and no hidden sync.
- Hosted/social sharing remains explicitly out of scope unless reapproved.

## Phase 7: Advanced Studio Capabilities

Goal: add deeper production and guidance only after core trust and workflow foundations are stable.

Backlog items: NVR-022, NVR-023, NVR-024.

Slices:
1. Print-preflight mode.
   - Bleed, crop, safe zone, resolution, calibration, watermark profiles.
2. Reference-powered design assistant.
   - Explainable suggestions with source labels and waiver paths.
3. Live pricing/trading decision.
   - Decide excluded, adapter-only, or strategic before any implementation.

Exit criteria:
- Advanced guidance is evidence-backed.
- Print and trading/pricing language does not overpromise.

## Claude Merge Procedure

When Claude finishes the resumed UXHC audit:
1. Add each confirmed issue to `docs/58_external_research_next_version_backlog.md`.
2. If an issue duplicates an NVR item, add the Claude evidence to that item instead of creating a new row.
3. Re-score priorities using severity, persona impact, reproducibility, and screenshots/video evidence.
4. Update this roadmap's phase contents and exit criteria.
5. Choose exactly one implementation phase and slice.

## Verification Baseline For Any Implementation Slice

Run:

```bash
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor typecheck
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor build
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor run test:ux-gate
```

For visual/UI slices, also run:

```bash
node packages/editor/scripts/forge-ui-visual-qa.mjs --phase <phase-name>
```

Before handoff, run:

```bash
scripts/codex/homebrew-forge-launcher-health-hook.sh
```

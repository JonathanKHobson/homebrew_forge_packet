---
status: active
lane: qa
type: reference
---
# UX Learning System

🟢 `[status: active]` `[lane: qa]` `[type: reference]`

Purpose: keep the 2026-06-05 UXHC audit lessons active during future Homebrew Forge UI work without turning every task into a report-reading exercise.

## Phase 1: Lightweight Gate

Status: implemented.

- Root routing lives in `AGENTS.md`.
- Repo workflow lives in `skills/homebrew-forge/SKILL.md`.
- UX heuristics and recurring audit lessons live in `skills/homebrew-forge/references/ux-quality-gate.md`.
- Full audit evidence remains in `docs/38` through `docs/41` and `reports/ux-audit/homebrew-forge-full-uxhc-2026-06-05/`.

## Phase 2: Apply The Gate

Status: implemented for the first follow-up UI correction.

The gate was applied to the Maker onboarding correction after the audit remediation pass:

- Onboarding appears only on first run or when Maker has no rows.
- While onboarding is active, Maker hides the left list, right inspector, collapsed strips, and narrow panel switcher.
- With zero cards, Dismiss is unavailable so users cannot escape into an empty editor.
- After dismissal with existing cards, the dense editor returns.

Evidence:

- `node .tools/pnpm/bin/pnpm.cjs typecheck`
- `node .tools/pnpm/bin/pnpm.cjs build`
- Playwright screenshots under `output/playwright/`
- `docs/41_ux_audit_implementation_tracker.md` slice 1.2 and 3.2 notes

## Phase 3: Automate Stable Risks

Status: implemented as a smoke gate.

Run:

```bash
node .tools/pnpm/bin/pnpm.cjs --filter @homebrew-forge/editor run test:ux-gate
```

Current coverage:

- First-run Maker onboarding hides side panels and shows a focused start state.
- Dismissed onboarding restores the normal Maker editor.
- Zero-card Maker state shows onboarding even after first-run dismissal, without a Dismiss button.
- Narrow viewport keeps navigation reachable, avoids horizontal overflow, and uses one active Maker panel at a time.
- Inspector tabs expose tab semantics and arrow-key navigation.
- Import and Export dialogs expose transfer-scope navigation and a single Close footer action.

## Maintenance Rule

When a future UI issue repeats a UXHC failure, update `skills/homebrew-forge/references/ux-quality-gate.md` with the reusable lesson and add or extend a smoke assertion only after the pattern is stable.

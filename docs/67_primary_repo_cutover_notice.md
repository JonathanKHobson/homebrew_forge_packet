---
status: active
lane: desktop
type: reference
pin: hard-ref
---
# Homebrew Forge Primary Repo Cutover Notice

🟢 `[status: active]` `[lane: desktop]` `[type: reference]` `[pin: hard-ref]`

*When to use: resuming any older conversation or verifying which repo/app is primary. Audience: all agents and humans.*

Status: active as of 2026-06-08.

## Current Primary Working Location

Use this folder for all new Homebrew Forge work:

```text
/Users/kyle/Documents/My Games/Magic The Gathering/homebrew_forge_packet
```

This repo is now the default development lane and the source of truth for the
shared product UI. It runs the default desktop app at:

```text
/Applications/Homebrew Forge.app
```

The current active branch at cutover was:

```text
codex/card-variant-lifecycle
```

The default app launches the shared `packages/editor` UI through
`packages/desktop` and the local runtime on port `5187`.

## Expired Migration Worktree

Do not start new work in this folder:

```text
/Users/kyle/Documents/My Games/Magic The Gathering/homebrew_forge_packet_desktop_migration
```

That worktree was a temporary desktop/runtime migration lane. Its useful work
has been merged into the primary repo. It should be treated as archived context,
not a current implementation target.

## What Future Agents Should Do

- Start in `/Users/kyle/Documents/My Games/Magic The Gathering/homebrew_forge_packet`.
- Read `AGENTS.md`, `skills/homebrew-forge/SKILL.md`, and this notice before
  editing.
- Use `docs/68_dev_relocation_handoff_prompt.md` when redirecting older AI/dev
  conversations to the current repo.
- Keep `packages/editor` as the shared product UI for web, macOS, and future
  Windows delivery.
- Use `/Applications/Homebrew Forge.app` for human review.
- Run `scripts/codex/homebrew-forge-launcher-health-hook.sh` before finishing
  Homebrew Forge work unless Kyle explicitly asks not to. The hook is passive
  by default; use `HOMEBREW_FORGE_STOP_HOOK_MODE=repair` only when the app
  bundle or launcher needs repair.

## Fallbacks And Deferrals

The legacy web/Chrome launcher remains available as a fallback script and has
not been deleted. It is no longer the default human-review path.

Remaining desktop-delivery work is future packaging/productization, not a reason
to work in the expired migration worktree:

- Apple Silicon smoke.
- Windows parity.
- Packaged runtime mode.
- Signing/notarization.
- Public release artifacts and auto-update.

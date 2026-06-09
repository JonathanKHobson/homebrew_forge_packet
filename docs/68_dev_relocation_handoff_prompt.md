# Dev Handoff Prompt: Homebrew Forge Repo Relocation

Paste this into older AI/dev conversations before they resume Homebrew Forge
work:

```text
Important Homebrew Forge repo update: the active working folder has changed.
Do not work in the old migration worktree:
/Users/kyle/Documents/My Games/Magic The Gathering/homebrew_forge_packet_desktop_migration

Use the current primary repo:
/Users/kyle/Documents/My Games/Magic The Gathering/homebrew_forge_packet

Before editing, read AGENTS.md and docs/67_primary_repo_cutover_notice.md.
The default human-review app is now /Applications/Homebrew Forge.app, which
launches the shared packages/editor UI through the desktop shell on port 5187.
The legacy web/Chrome launcher is fallback only. Preserve packages/editor as
the single product UI source of truth for web, macOS, and future Windows
delivery. Before finishing, run:
scripts/codex/homebrew-forge-launcher-health-hook.sh
That hook is passive by default. Use
HOMEBREW_FORGE_STOP_HOOK_MODE=repair scripts/codex/homebrew-forge-launcher-health-hook.sh
only if the installed app/launcher is stale, missing, or failing.
```

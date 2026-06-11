---
status: draft
lane: shareable
type: guide
pin: false
---
# Homebrew Forge Public Alpha Install Guide

Homebrew Forge is currently a source-alpha project. The cleanest install path
is to clone the repository, bootstrap local pnpm, install dependencies, and let
Codex or another local coding agent help verify the environment.

```bash
git clone https://github.com/JonathanKHobson/homebrew_forge_packet.git
cd homebrew_forge_packet
./scripts/bootstrap-pnpm.sh
node .tools/pnpm/bin/pnpm.cjs install
node .tools/pnpm/bin/pnpm.cjs typecheck
node .tools/pnpm/bin/pnpm.cjs build
```

For local desktop review on macOS, the current development app is installed as
`/Applications/Homebrew Forge.app`. Public release packaging, notarization, and
Windows parity are still future work.

## Codex Handoff Prompt

Paste this after cloning the repo:

```text
You are working in the Homebrew Forge repository. Read AGENTS.md,
skills/homebrew-forge/SKILL.md, docs/67_primary_repo_cutover_notice.md, and
docs/project-map.md first. Then verify the environment with typecheck, build,
and the UX gate. Do not add copyrighted Magic assets. Preserve the distinction
between Maker, Cards, Sets, Projects, Decks, Collections, Gallery, References,
frames, and layouts. Treat the project as a local-first source-alpha card
production tool.
```


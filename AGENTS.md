# Agent Guide

This public repository contains the Homebrew Forge TypeScript source workspace and planning packet. It is distinct from the similarly named empty private hyphenated repository.

- Read `README.md` and `docs/project-map.md`. `packages/forge/src/cli.ts` is the CLI entry; `packages/editor/src/` is the local editor. `sets/`, `decks/`, `collections/`, and `reference/` hold editable data. `docs/shareables/` holds published Pages artifacts.
- `.tools/pnpm/` is created by `scripts/bootstrap-pnpm.sh` and is not tracked. Bootstrap before using the repo-local commands in the README. `output/` is generated and ignored.
- The declared checks are `node .tools/pnpm/bin/pnpm.cjs lint`, `typecheck`, `test`, and `build` after bootstrap and install. Use the focused CLI loop in the README for relevant behavior changes.
- Preserve asset/license provenance and keep user-supplied or official art out of public commits unless its distribution rights are clear.

# AGENTS.md — Homebrew Forge

## Project purpose

Homebrew Forge is a general-purpose local workflow for making Magic-style homebrew cards from CSV/YAML data, local art, and pluggable asset packs. Do not specialize the app to any single set, IP, theme, or deck.

## Setup commands

- Install dependencies: `pnpm install`
- Run tests: `pnpm test`
- Typecheck: `pnpm typecheck`
- Lint: `pnpm lint`
- Build: `pnpm build`
- Validate demo set: `pnpm forge validate --set DEMO`

## Architecture rules

- CSV/YAML/JSON files are the source of truth.
- Rendered images/XML/PDF/ZIP files are generated artifacts.
- Do not create a hidden canonical database.
- Keep renderer logic shared between the local editor and the CLI.
- Use TypeScript and Zod for typed schemas.
- Prefer pure functions and deterministic outputs.
- Add tests for new parser/exporter behavior.

## Asset rules

- Do not commit official or copyrighted Magic frames/art/assets.
- Do not scrape websites by default.
- Do not bypass logins, anti-bot systems, rate limits, or terms.
- Asset ingestion must be manifest-driven and license-aware.
- Local user-supplied asset folders are allowed.
- A debug frame may exist only for tests and must be visibly unofficial.

## Export rules

- Default outputs must be marked as custom/private playtest cards.
- Do not implement features intended to create counterfeits.
- Cockatrice export must include XML, images, and install instructions.

## Coding style

- Keep packages small and documented.
- Avoid large untested rewrites.
- Update docs when behavior changes.
- Do not add production dependencies without a short reason in the commit/PR notes.
- Run tests/typecheck after code changes.

## User workflow priorities

Prioritize:

1. importing old CSVs,
2. validating data,
3. rendering only changed cards,
4. caching art locally,
5. exporting to Cockatrice,
6. making manual edits in a local UI.

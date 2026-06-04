# Homebrew Forge Codex Skill

Use this skill when working on the Homebrew Forge repository.

## Workflow

1. Read `AGENTS.md`.
2. Identify the set folder being modified.
3. Treat CSV/YAML/JSON as source of truth.
4. Run validation after changing card data.
5. Render only changed cards unless asked otherwise.
6. Export Cockatrice package when requested.
7. Do not add production frame assets or copyrighted art to the repo.
8. Do not scrape external websites unless there is an explicit source adapter with license/terms review.

## Common commands

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm lint
pnpm forge validate --set DEMO
pnpm forge render --set DEMO --profile cockatrice
pnpm forge export cockatrice --set DEMO --zip
```

## Common tasks

### Add card rows

- Update `cards.csv` and `card_faces.csv`.
- Add art to `art_manifest.csv` if needed.
- Run validation.

### Migrate old set

- Put source CSV under `imports/`.
- Create/update `import_map.csv`.
- Run importer in dry-run mode.
- Fix mapping warnings.
- Run real import.
- Validate and render.

### Add asset source

- Add source to `asset_sources.yaml`.
- Include license review fields.
- Run asset audit.
- Do not commit non-redistributable assets.

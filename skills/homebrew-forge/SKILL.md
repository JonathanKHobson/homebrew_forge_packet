# Homebrew Forge Codex Skill

Use this skill when working on the Homebrew Forge repository.

## Workflow

1. Read `AGENTS.md`.
2. Identify the feature surface and source owner before editing.
3. Identify the set folder being modified when card data changes.
4. Treat CSV/YAML/JSON as source of truth.
5. Run validation after changing card data.
6. Render only changed cards unless asked otherwise.
7. Export Cockatrice package when requested.
8. Do not add production frame assets or copyrighted art to the repo.
9. Do not scrape external websites unless there is an explicit source adapter with license/terms review.

## UI/UX work

Before changing UI, UX, accessibility, onboarding, dialogs, navigation,
responsive layout, or visible copy, read
`skills/homebrew-forge/references/ux-quality-gate.md`.

Use the gate to preserve the lessons from the 2026-06-05 UXHC audit:

- keep Maker, Cards, Sets, Projects, Decks, Collections, Gallery, References, cards,
  variants, frames, and layouts distinct in labels and flows;
- prefer existing shells and patterns before adding new UI structures;
- treat empty, loading, error, disabled, keyboard, and narrow viewport states as
  required behavior;
- verify changed UI with typecheck/build plus browser or Playwright QA.

## Common commands

```bash
pnpm install
pnpm test
pnpm test:ux-gate
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

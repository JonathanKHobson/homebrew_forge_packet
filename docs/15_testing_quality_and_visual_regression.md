# Testing, Quality, and Visual Regression

## Test types

### Unit tests

- mana parser,
- symbol parser,
- CSV parser,
- schema validation,
- asset manifest loading,
- filename slugging,
- hash/change detection,
- Cockatrice XML writer.

### Integration tests

- import demo CSV,
- validate demo set,
- render with debug asset pack,
- export Cockatrice ZIP,
- parse generated XML,
- verify all referenced images exist.

### Visual regression tests

Use Playwright screenshots or image snapshots.

Keep fixture outputs under:

```text
packages/test-fixtures/snapshots/
```

Use a threshold because font rendering may vary by OS.

### Asset audit tests

- every asset path exists,
- each asset has a source entry,
- each source has a license/notes field,
- assets marked non-redistributable are ignored by packaging commands,
- local-only assets are not included in public packaging commands.

## Quality gates

CI should run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:render-smoke
```

Before a release:

```bash
pnpm test:visual
pnpm test:export
forge doctor
```

## Manual QA checklist

- Can edit CSV externally and re-render.
- Can edit a card in local UI and see CSV change.
- Can import old CSV with mapped columns.
- Can cache art locally and render without internet.
- Can render only changed cards.
- Can build and install Cockatrice ZIP.
- Can swap asset packs without changing card data.
- Can run with no reference cache.
- Can run with no internet after initial asset/reference sync.

# Forge UI Style Layers

`styles.css` remains the legacy compatibility stylesheet imported by
`main.tsx`. New Forge UI work should move into small layer files in this folder
and be imported after the legacy stylesheet so source order stays explicit.

Current layers:

- `forge-ui-craft.css`: late visual-system overrides for tokenized depth,
  focus-visible rings, selected row treatment, and theme-safe contrast fixes.
- `forge-ui-shell.css`: shell-owned command palette, Workspace Health panel,
  status strip health button, and shared shell utilities such as `sr-only`.

Remaining global exceptions:

- `../styles.css` is still the compatibility layer for legacy workspace,
  overlay, form, and responsive rules. Keep it imported first.
- Add new Forge UI surfaces to small owned files here instead of growing
  `styles.css`.
- Move legacy selectors only after the owning component has a stable Forge UI
  wrapper and the visual QA script covers that surface.

Layer rules:

- Keep design tokens semantic and theme-aware.
- Prefer component role names over page-specific selectors.
- Avoid hard-coded light/dark colors in late overrides.
- Preserve reduced-motion behavior.
- Run the Forge UI visual QA script after changing any layer.

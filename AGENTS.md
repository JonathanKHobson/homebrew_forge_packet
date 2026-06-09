# Homebrew Forge Agent Notes

## Expired Worktree Warning

Do not start new work in this folder.

This path is expired:

`/Users/kyle/Documents/My Games/Magic The Gathering/homebrew_forge_packet_desktop_migration`

Use the current primary repo instead:

`/Users/kyle/Documents/My Games/Magic The Gathering/homebrew_forge_packet`

The useful desktop/runtime migration work from this folder has already been
merged. If you are resuming an older conversation, stop and restart from the
primary repo. The default human-review app is `/Applications/Homebrew Forge.app`.

Homebrew Forge is a local TypeScript workspace for authoring Magic-style homebrew cards, sets, decks, collections, gallery assets, references, and print/export workflows.

Before changing repo behavior, read `skills/homebrew-forge/SKILL.md`.

Before changing UI, UX, accessibility, onboarding, dialogs, navigation, responsive layout, or visible copy, also read `skills/homebrew-forge/references/ux-quality-gate.md`.

Use `docs/project-map.md` for the current code-owner map and roadmap pointers. Update it when adding durable docs, tests, workflows, or major behavior.

Keep fixes modular, preserve Maker/Cards/Sets/Projects/Decks/Collections distinctions, and verify changed UI with typecheck/build plus browser or Playwright QA.

Before finishing Homebrew Forge work, run
`scripts/codex/homebrew-forge-launcher-health-hook.sh` unless Kyle explicitly
asks not to open the app. The project-scoped Codex Stop hook mirrors this check:
it repairs a stale `/Applications/Homebrew Forge.app` shortcut, refreshes the
support launcher when repo code changed, and opens one current app window for
human review.

## Homebrew Forge UI / Design System Rules

When modifying `packages/editor`, follow the Forge UI North Star in
`docs/45_forge_ui_north_star.md`.

- Product identity: Arcane Workshop / premium local-first creator tool.
- The editor should feel polished, data-dense, trustworthy, dark-friendly, and
  subtly arcane without becoming generic SaaS or childish fantasy UI.
- Do not use copyrighted Magic: The Gathering assets, card frames, mana
  symbols, logos, or art.
- Prefer reusable design tokens and Forge UI components over one-off CSS.
- Use semantic tokens for surfaces, text, borders, accents, validation states,
  dirty/unsaved states, export states, and local/reference sync states.
- Maintain accessibility: keyboard navigation, focus rings, contrast,
  screen-reader labels, and reduced-motion support.
- Use icons consistently. Keep `Icon.tsx` as the compatibility layer until the
  icon migration is explicitly approved.
- Use self-hosted fonts only after the dependency is approved. Inter/system UI
  remains the default; decorative display fonts are rare product-mark accents
  only.
- Preserve local-first behavior. Do not add remote asset dependencies for core
  UI.
- Every new major UI surface should include loading, empty, error, success, and
  disabled states where relevant.
- Before large visual refactors, inspect existing components and use
  `docs/47_forge_ui_phase_tracker.md` to mark the current phase/slice.

---
status: active
lane: ui
type: spec
pin: hard-ref
---
# Forge UI North Star

🟢 `[status: active]` `[lane: ui]` `[type: spec]` `[pin: hard-ref]`

*When to use: before any visual, styling, or UI-primitive change in `packages/editor`. Audience: UI agents and humans doing design work.*

Homebrew Forge should feel like an Arcane Workshop: a premium local-first creator tool for authoring, validating, previewing, collecting, deck-building, importing, exporting, and printing custom Magic-style cards.

This is not a fantasy game menu, a generic SaaS dashboard, or a corporate admin panel. The product should feel serious, crafted, data-dense, source-controlled, and trustworthy, with enough arcane material language to feel specific to Homebrew Forge.

## Visual Thesis

Forge UI uses Apple-like restraint and Google-like system flexibility:

- Content and work stay central.
- Navigation and chrome recede.
- Active state, validation state, file state, and source context are visible.
- The interface adapts across Maker, Cards catalog, Decks, Collections, Dashboard, Card Browser, overlays, and mobile without changing interaction language.
- Dark mode is first-class, not an afterthought.

## Identity Rules

- Use warm obsidian, charcoal, parchment, brass, muted blue, teal, emerald, amber, and crimson as semantic materials.
- Keep typography dense and readable. Inter/system UI remains the default until a font dependency is explicitly approved.
- Use decorative type only for rare product-mark moments, not body text, controls, tables, or metadata.
- Use icons semantically: Maker, Cards, Sets, Projects, Decks, Collections, Gallery, References, Import, Export, Preview, Validate, Warning, Error, Local file, Sync/reference, Dirty/unsaved, Renderer/output.
- Use subtle surface depth through tokenized borders, gradients, shadows, and focus rings. Avoid glows, decorative blobs, and random SVG ornaments.
- Use cards sparingly. Repeated items, modals, and true framed tools can be cards; page sections should not become nested card stacks.

## Product Rules

- Preserve Homebrew Forge domain distinctions: Maker authors card records; Cards catalogs app card rows; Sets own authored records; Projects group sets; Decks are playable/export lists; Collections are isolated card/reference lists; Gallery stores assets; References store terms/rules; Frames and Layouts are visual configuration.
- Preserve local-first behavior. Do not add remote UI assets, backend services, remote font fetching, or copyrighted Magic assets.
- Every major surface needs default, loading, empty, error, success, disabled, focused, selected, and narrow states when those states are possible.
- Search remains visible in browse/list workspaces. Filters show active counts and reset paths.
- Runtime freshness, validation, unresolved rows, dirty state, and export state should be treated as first-class product feedback, not console-only diagnostics.

## Accessibility Bar

- Visible focus rings on buttons, tabs, menu items, rows, dialogs, command/search controls, and source selectors.
- WCAG-readable contrast for light, dark, and parchment themes.
- Keyboard access for menus, dialogs, tabs, overlays, list selections, and destructive/recovery actions.
- Icon-only controls need accessible labels and tooltips/title text where useful.
- Motion must respect `prefers-reduced-motion`.

## Done When

- The editor has a reusable Forge UI system instead of page-by-page ad hoc CSS.
- Major workspaces use shared tokens and primitives or document why they are exceptions.
- The UI feels deliberate across Maker, Cards catalog, Decks, Collections, Dashboard, Card Browser, import/export, print, and overlays.
- The app still builds and runs through the existing pnpm/Vite workflow.
- Typecheck, build, UX gate, and rendered visual QA pass.
- The phase tracker in `docs/47_forge_ui_phase_tracker.md` marks every North Star phase complete or explicitly blocked with evidence.

## Non-Goals

- No immediate Tailwind/shadcn migration before the adoption gate.
- No React, Vite, or TypeScript upgrades for visual polish.
- No forge domain schema/API changes unless a later phase documents a concrete need.
- No copyrighted MTG card frames, mana symbols, logos, or art.
- No full app replacement with a template.

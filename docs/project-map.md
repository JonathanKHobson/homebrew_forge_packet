# Project Map

Homebrew Forge is scaffolded as an expandable TypeScript workspace. The current lane is the first vertical slice plus a local editor MVP: CSV/XML input, Zod validation, asset-backed React/SVG rendering, PNG export, Cockatrice XML/ZIP export, browser-based CSV card editing, bulk CSV/XML import into the active set, cross-set decklist building, isolated card collection/reference intake, a local Magic reference catalog, and a lightweight Project > Set workspace layer inside a desktop-style editor shell.

The project also keeps small planning manifests for practical tabletop print
aids, such as `docs/20_commander_token_print_manifest.md`. These manifests are
planning inputs for future set data and print-sheet work; they are not asset
downloads and should not commit official card/token images.

Creation, import, and export workflow planning now lives in
`docs/21_create_import_export_overlay_plan.md` and
`docs/22_create_import_export_priority_matrix.md`. Use those docs before
changing plus-button behavior, File > Import, File > Export, ungrouped holding
areas, or create/import/export component structure.

## Repo Layout

```text
assets/
  packs/                 # Asset-pack manifests and future user-supplied assets
  sources/               # Source/license metadata for downloaded, npm, and GitHub assets
scripts/
  bootstrap-pnpm.sh       # Installs the repo-local pnpm wrapper for first-time setup
  launch-homebrew-forge-app.sh
                          # Starts the local editor on a stable port and opens the Chrome app-style window
docs/
  shareables/             # Published GitHub Pages artifacts, including public Homebrew Forge and collection shareables
printables/
  commander-token-table-aids/
                          # Editable HTML/CSS source for private print-light token and tracker sheets
sets/
  library.json           # Editor workspace index: projects and their sets; storage currently uses the legacy `universes` key
  UNGRP/                 # Empty holding set for unassigned/ungrouped cards and library assets
  DEMO/                  # Demo set used by tests and CLI smoke commands
decks/
  demo-showcase/         # Seeded deck for checking the Decks workspace with populated Main/Side/Maybe sections
  <deck-id>/             # Cross-set deck metadata and entries; references cards by setCode + cardId
collections/
  demo-reference/        # Seeded Demo Project collection with one matched row and one review row
  <collection-id>/       # Isolated card-list metadata and normalized scanner/reference CSV entries
packages/
  forge/                 # CLI and core implementation
    src/
      assets/            # Asset pack manifest loader and role resolution
      collections/        # Scanner CSV normalization, collection metadata, review status, and CSV/text/.cod exports
      data/              # CSV/XML parsing and project loading
      decks/             # Deck metadata, entry storage, cross-set resolution, and text/.cod exports
      domain/            # Zod schemas and TypeScript types
      exporters/         # Cockatrice XML and ZIP export
      power/             # Card design-assistant scoring, term treatment coverage, and audit reports
      reference/          # Shared Magic terms catalog, official sync snapshots, local custom reference storage, rules wiki parsing, typeahead terms, and rules linting
      renderer/          # React/SVG card component and image rendering
      validation/        # Cross-record validation
      utils/             # Filename, filesystem, and small shared helpers
    tests/               # Vertical-slice tests
  editor/                # Vite/React local editor for selecting cards, editing fields, and previewing frames
    src/
      api/               # Browser client calls into the Vite dev API
      components/        # Toolbar/menu shell, rail, workspace views, overlays, collection import panel, deck builder, management lists, card list, preview, inspector, tabs, and field controls
      domain/            # Editor draft model, Magic terms, and frame registry
      server/            # Vite middleware for project load, preview render, CSV save/import, and Cockatrice sync
output/                  # Generated renders and Cockatrice packages, ignored by Git
reference/
  custom/                 # User-created and homebrew reference terms
  official/               # Reviewed official catalog/rules snapshots, history, and sync reports
  power/                  # Reviewed power-score term treatments and formula patterns, separate from reference definitions
```

## Current Slice

- Load `sets.csv`, `cards.csv`, `card_faces.csv`, `art_manifest.csv`, and `export_profiles.csv`.
- Parse simple card XML into the same record shape.
- Validate records with Zod plus cross-record checks.
- Render asset-backed normal, planeswalker, text-token, and full-art-token cards from React/SVG to PNG.
- Use the DEMO set as a practical baseline fixture for creature, artifact, land, enchantment, instant, sorcery, 3-ability planeswalker, 4-ability planeswalker, text token, and full-art token templates.
- Prefer the local Basic M15 MSE pack via `assets/packs/basic-m15-local`.
- Keep `assets/packs/genevensis-local` and `assets/packs/figma-mtg-card-assets` as fallback/reference packs, not the active visual lane.
- Run a local editor with `pnpm editor` to load the DEMO set, edit core card fields, preview renderable frames, and save back to CSV.
- Use the editor's Project > Set model to separate work such as Stargate and Black Panther. `sets/library.json` stores only workspace grouping; each set still owns its own CSV files.
- Use the left rail to switch between Cards, Decks, Collections, Sets, Projects, Library, References, and Settings.
- Use File > Import and File > Export for transfer workflows. These open overlay dialogs so future card, set, deck, and batch flows can live under broad Import/Export actions instead of a single side-rail workspace.
- Cards, Decks, Collections, Sets, Projects, and Library plus buttons route through shared create overlays in `packages/editor/src/components/create/`. Do not add more inline create forms to `WorkspaceView.tsx`.
- Use the Decks workspace to create cross-set decklists independent from project/set ownership. Decks may link to a project or set for organization, but entries can reference cards from any discovered set.
- Store decks under `decks/<deck-id>/metadata.json` and `decks/<deck-id>/entries.csv`. Entries use Main, Sideboard, and Maybeboard sections and resolve cards by `setCode + cardId`.
- Export decklists as grouped plain text and Cockatrice `.cod` files. Maybe entries are preserved in Homebrew Forge and plain text exports; Cockatrice `.cod` export writes Main and Side zones only.
- Keep deck V1 focused on decklists. Do not enforce format legality, Commander singleton/color identity rules, sideboard limits, draw simulation, or collection tracking in this slice.
- Collections are independent card-reference/list layers for ownership, inspiration, research, staging, physical print runs, and mixed lists. They do not automatically create authored Cards, Sets, Decks, or ungrouped records.
- Cards/Sets are editable authored card records used for rendering and set export. Decks are play/export lists. Collections are isolated card lists; a collection row appears nowhere else unless explicitly copied into Cards/Sets or added to a Deck.
- Import collection CSVs exported by scanner apps such as ManaBox, TCGplayer, Dragon Shield, Delver Lens, or generic list tools. Store collections under `collections/<collection-id>/metadata.json` and `collections/<collection-id>/entries.csv`.
- Collection metadata includes `linkedUniverseId`, `gameId`, and `purpose` (`owned`, `inspiration`, `homebrew_print_run`, `research`, or `mixed`) so future official/homebrew/game views do not collapse into one unclear space.
- Normalize collection rows into quantity, card name, set code/name, collector number, Scryfall id, finish, condition, language, location, source row, match strategy, and review status. Preserve uncertain rows with `needs_review`; never silently guess missing print identity.
- Match collection rows by Scryfall id first, then card name + set code + collector number, then card name + set code. Rows without enough identity stay unresolved for review.
- Export collections as normalized CSV, plain text, or Cockatrice `.cod` list files. Cockatrice export writes matched rows only into the Main zone.
- Use the Collections plus button to open the `CreateCollectionOverlay`; the Collections right panel is for selected collection details, row preview, review count, and export actions.
- Cards/Sets File > Import includes an explicit "Import from Collection" flow. It copies selected collection rows into the active set as editable draft templates and leaves the original collection rows unchanged.
- Deck creation and deck editing can add collection rows as deck entries with a name snapshot. This does not require those rows to exist as authored Cards or Sets.
- Treat `mtg-oracle` as an optional future review accelerator for unresolved or ambiguous collection rows. Homebrew Forge must not require that MCP to import, save, validate, or export collections.
- Create projects from the Projects workspace and create sets from the Sets workspace. The Cards workspace intentionally hides the project/set selector so card editing stays focused.
- Create a new set from the editor. The server creates `sets/<SET>/sets.csv`, empty card/face/art CSVs, default export profiles, and a library entry.
- Start a new card with the Cards workspace plus button. It opens the card creation overlay and does not create a card until `Create Draft` is confirmed.
- Keep several cards open with preview tabs above the card canvas.
- Use the application menu for File/Edit/View/Tools/Help actions. The toolbar stays focused on open/save, undo/redo, preview mode, guides, safe area, and zoom.
- Use the View menu for shared layout toggles such as toolbar, side rail, center preview, card-list density, guides, safe area, and zoom. The local left and right panels own their own collapse controls, and Cards, Projects, Sets, and Library share the same resizable left/right panel widths via `PanelResizeHandle`.
- Keep normal card editing in the Card inspector tab: identity, name/mana, fill-or-choose Supertype/Card type/Subtype controls, frame basics, art source, rules/flavor, power/toughness or loyalty, and advanced symbol/watermark fields. The Frame tab owns frame source overrides; the Layout tab repeats art source access and owns art transform plus finish controls.
- Use the shared reference catalog to power supertype/card-type/subtype dropdowns, rules-text typeahead triggers, linked-reference chips in the Inspector, and the References workspace. Current triggers: `@` for keyword abilities/ability words/homebrew mechanics, `#` for keyword actions/phrases, `:` for type-line terms/tokens/counters, and `!` for active-set card names.
- Let the renderer use linked reference terms as optional reminder text on normal and token rules boxes. The saved rules text stays clean; the SVG render tests a reminder-expanded candidate once and keeps it only when the rules box remains readable.
- Keep card-text syntax visible from the Inspector Rules section. Rules/flavor text uses braced symbols such as `{T}`, `{2/W}`, and `{G/P}`; `~` renders as the current card name; `<i>...</i>` and parenthetical text render as italics; flavor `*...*` de-emphasizes text; and `\\` forces a new rendered line. Mana cost fields may use compact costs such as `2WU` without braces, but rules/flavor should require braces so ordinary letters are not interpreted as mana.
- Keep References workspace content local and source-labeled. Kyle's Drive sheet seeds definitions; Scryfall catalog values broaden current term coverage; local Stargate/Cockatrice mechanics seed homebrew terms; user-created references are saved under `reference/custom/references.json`.
- Use `forge reference` commands to audit, sync, archive, and promote official reference snapshots. The editor reads `reference/official/current/` when present and falls back to the bundled catalog when no official snapshot has been promoted.
- Use `forge power audit` to verify every reference term has an explicit power treatment path. Term treatments live in `reference/power/` and are separate from reference definitions; not every term gets a numeric value.
- The editor preview response includes a deterministic Power Estimate: score, confidence, budget/effect delta, recommendations, contribution breakdown, and coverage gaps for terms that need review.
- Keep the References workspace split into Terms and Rules modes. Terms mode owns type/keyword/token/counter/homebrew entries; Rules mode owns parsed Comprehensive Rules sections and glossary entries.
- Keep References filtering helper-backed in `packages/editor/src/domain/referenceFilters.ts` and UI controls in `packages/editor/src/components/reference/`. Terms filtering covers category, lifecycle/workflow, origin, source, system, tags, color, parent/type, rule/source-set/type-line metadata, text/version presence, and active-set/card usage. Rules filtering covers kind, number/prefix, title, text, related term, effective date, source, and related-term presence.
- Treat deck/collection/project-wide reference usage and the MTG Oracle-backed MCP as the next lane; the current shipped usage index is active-set and selected-card scoped.
- Use the References plus button as the first shipped shared overlay pattern: it opens a focused creation/import-one flow, supports draft/final workflow status, and refreshes/selects the new reference after save.
- Treat art position/scale as the default center-canvas artwork edit mode. Crop values are separate and should change only from explicit crop controls or crop mode.
- Use management-list workspaces for Projects, Sets, and Library. Each has its own search/filter area and plus button instead of global project/set dropdowns.
- Keep ordinary search visible in every browse/list workspace. Filter buttons open shared browse/filter overlays from `packages/editor/src/components/filters/`, with active filter badges and reset controls. Do not add new large inline filter panels to `WorkspaceView.tsx`.
- Import AI-friendly flat CSV or XML/Cockatrice XML into the active set from the editor. Imported rows normalize missing defaults into `cards.csv`, `card_faces.csv`, and `art_manifest.csv` where possible.
- Export from File > Export: card PNG from current/selected active-set card, source CSVs, Cockatrice XML, Cockatrice ZIP, deck text, deck `.cod`, collection CSV/text/`.cod`, and the active set art manifest.
- On save/import/manual sync, refresh `output-live/<SET>/cockatrice/` with XML, PNGs, and a ZIP package. Stale custom image files are cleared before each sync.
- Register core Magic frame families in the editor up front: color/multicolor normal cards, artifact, land, text token, full-art token, planeswalker, saga, modal DFC, and battle. Complex registered frames may appear before their dedicated renderer slice is implemented.
- Keep the inspector in tabs plus collapsible groups: Card, Frame, Layout, and Preview.
- Export Cockatrice XML, images under `pics/CUSTOM/<SET>/`, and a ZIP package.

## Not In This Slice

- Production frame fidelity.
- Live website scraping.
- Old-set importers beyond the small XML parser.
- Scryfall or MTGJSON fetches as rendering dependencies.
- Silent automatic online reference refresh. `forge reference update --check` may detect pending upstream changes, but promotion remains explicit and archives previous snapshots.
- Custom iOS camera/scanner app work or Xcode setup for collection intake. Use scanner CSV import first.
- Direct writes from MCP lookups into collection storage. Review acceleration must update local CSV-backed rows and pass validation.

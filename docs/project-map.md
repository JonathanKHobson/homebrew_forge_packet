# Project Map

Homebrew Forge is scaffolded as an expandable TypeScript workspace. The current lane is the first vertical slice plus a local editor MVP: CSV/XML input, Zod validation, asset-backed React/SVG rendering, PNG export, Cockatrice XML/ZIP export, browser-based CSV card editing, card variant lifecycle management, bulk CSV/XML import into the active set, cross-set decklist building with deck variants/candidate pools/role metadata, isolated card collection/reference intake with binders and list organizers, collection owner metadata and filters, collection price snapshots, explicit collection-to-set copy workflows, a local Magic reference catalog, an opt-in local official-card catalog for Scryfall print/Oracle search, and a lightweight Project > Set workspace layer inside a desktop-style editor shell.

UX audit remediation from the 2026-06-05 UXHC audit lives in
`docs/38_ux_audit_issue_catalog.md`,
`docs/39_ux_audit_priority_matrix.md`,
`docs/40_ux_audit_phase_slice_roadmap.md`, and
`docs/41_ux_audit_implementation_tracker.md`. Use these docs before changing
accessibility semantics, first-run orientation, narrow viewport layout,
right-panel naming, dialog action hierarchy, Help/Concepts content, or other
Claude audit findings.

The lightweight UX learning system lives in `AGENTS.md`,
`skills/homebrew-forge/SKILL.md`,
`skills/homebrew-forge/references/ux-quality-gate.md`, and
`docs/42_ux_learning_system.md`. For future UI work, run the UX gate before
coding and `node .tools/pnpm/bin/pnpm.cjs test:ux-gate` before handoff when the
changed surface touches Maker onboarding, narrow layout, inspector tabs, or
transfer dialogs.

Forge UI North Star planning lives in `docs/45_forge_ui_north_star.md`,
`docs/46_forge_ui_stack_research.md`,
`docs/47_forge_ui_phase_tracker.md`, and
`docs/48_forge_ui_component_inventory.md`. The Tailwind/shadcn adoption gate
result lives in `docs/50_forge_ui_tailwind_shadcn_gate.md`. Remaining global CSS
exceptions live in `docs/51_forge_ui_global_css_exceptions.md`. Visual QA expectations live in
`docs/49_forge_ui_visual_qa_checklist.md`, with the runnable screenshot/contrast
script at `packages/editor/scripts/forge-ui-visual-qa.mjs`. Use these docs
before introducing new visual primitives, moving CSS layers, adding UI
dependencies, or changing the editor shell/workspace chrome. The current
decision is CSS/component-first: defer Tailwind/shadcn until the adoption gate
passes, keep local-first behavior, and preserve
Maker/Cards/Sets/Projects/Decks/Collections/Gallery/References distinctions.
List-control and focused-layout cleanup lives in
`docs/49_list_controls_focus_layout_backlog.md`; it is the source of truth for
the shared search/sort/filter row-control pattern across Maker, Card Browser,
Decks, Collections, Binders, and Lists.
The Phase 3 shell extraction now lives in
`packages/editor/src/components/shell/`: `AppShell`, `TopCommandBar`,
`SidebarNav`, `WorkspaceFrame`, `CommandPalette`, and Workspace Health/status
components. Keep new shell chrome in that folder rather than growing `App.tsx`.
The Phase 7 command palette is a non-destructive global action surface opened
from the toolbar or `Cmd/Ctrl+K`; the Workspace Health panel is opened from the
status strip and uses existing local runtime/source/preview/reference state.
References Official Cards now uses the local Scryfall-backed official-card cache
as a full browser surface: advanced local query/filter/sort logic, Unique
mechanical-card grouping, and exact print variant lookup live in
`packages/forge/src/officialCards/`; editor-side browser settings live in
`packages/editor/src/domain/officialCardBrowser.ts`; and sync cadence/manual
sync settings live in `packages/editor/src/domain/officialCardSyncSettings.ts`
plus Settings > Official Card Catalog. Keep future official-card search UI in
References/Card Browser wired to this local cache contract rather than adding
live Scryfall requests to the UI.

The 2026-06-07 editor review pass lives in
`docs/52_editor_review_issue_catalog.md`,
`docs/53_editor_review_priority_matrix.md`, and
`docs/54_editor_review_phase_tracker.md`. Use these docs before changing laptop
responsive behavior, Maker toolbar compaction, renderer rules-text auto-sizing,
inline mana/text spacing, preview-expand affordances, or layout text-zone
controls. The current implementation lane fixes clipping and renderer
readability first, then ships scoped layout-zone selection while leaving
section-level zoom and persistent name/type positioning in the backlog until
their renderer/schema contracts are designed.

External competitive/product research for the next-version planning lane lives
in `external research/` and has been distilled into
`docs/58_external_research_next_version_backlog.md` and
`docs/59_next_version_phase_roadmap.md`. These are planning inputs only until
Claude's resumed UXHC audit is merged. Use them to prioritize trust,
import/export clarity, browse/list consistency, deck intelligence, collection
review, asset/legal safety, and local share/package work; do not use them as a
blanket authorization to implement P2/P3 strategic bets.

Delivery-mode planning lives in
`docs/superpowers/plans/2026-06-08-shared-delivery-modes.md`; tooling prep and
storage/path decisions live in `docs/60_desktop_delivery_tooling_prep.md`. The
final active roadmap now lives in
`docs/62_shared_desktop_delivery_final_roadmap.md`; route extraction is tracked
in `docs/61_runtime_service_route_inventory.md`; phase status lives in
`docs/63_shared_desktop_delivery_phase_tracker.md`; cleanup/archive rules live
in `docs/64_repo_cleanup_archive_index.md`; runtime parity testing lives in
`docs/65_runtime_parity_test_matrix.md`; and cutover approval lives in
`docs/66_desktop_cutover_checklist.md`. The completed external research packet
is preserved at
`docs/superpowers/plans/homebrew_forge_desktop_delivery_research_packet/`. The
current decision is one shared product UI with multiple delivery shells:
`packages/editor` remains the shared source of truth for web, macOS desktop,
and Windows desktop. Desktop code may own windowing, menus, local runtime
startup, OS paths, packaging, and updates, but must not fork product screens,
CSS, renderer behavior, workspaces, or app copy. Claude's pre-flight review
promoted the runtime/API extraction to the first implementation gate: `/api/*`
currently lives in Vite middleware, so a packaged desktop app is not real until
that API is available through an embeddable local runtime service with explicit
process ownership, port resilience, and repo/user-data model decisions. Before
desktop/runtime implementation begins, create local and online backups and move
the migration into a separate worktree so the current web app remains usable
from this repo path. The planned desktop architecture serves the built editor
SPA and `/api/*` from one local runtime origin, keeps the Chrome shim as fallback
until green-pass cutover, and must verify macOS Intel plus Apple Silicon and
Windows parity without forking the product UI. Use
`scripts/codex/desktop-delivery-toolchain-check.mjs` to verify local desktop
tool readiness before installing or packaging desktop dependencies.

The project also keeps small planning manifests for practical tabletop print
aids, such as `docs/20_commander_token_print_manifest.md`. These manifests are
planning inputs for future set data and print-sheet work; they are not asset
downloads and should not commit official card/token images.

Creation, import, and export workflow planning now lives in
`docs/21_create_import_export_overlay_plan.md` and
`docs/22_create_import_export_priority_matrix.md`. Full-app import/export
polish, variant-aware CSV intake, deck/set/collection/library/reference import
phases, and project package staging live in
`docs/27_import_export_full_app_polish_plan.md`. Use those docs before
changing plus-button behavior, File > Import, File > Export, ungrouped holding
areas, or create/import/export component structure.

Print export research and staged implementation live in
`docs/37_print_export_research_and_roadmap.md`. Use the shared Forge print
sheet exporter plus `packages/editor/src/components/print/` before adding new
print buttons, source pickers, ink modes, or print-shop presets.

Collections and Decks workspace polish lives in
`docs/28_collection_deck_workspace_polish_plan.md` and
`docs/29_collection_deck_workspace_priority_matrix.md`. Use those docs before
changing collection row editing, collection card preview, deck add-card
browsing, deck entry inspection, or the left/center/right workspace contract.
Collections Manager V1.5 planning lives in
`docs/57_collections_manager_v1_5_plan.md`; use it before changing collection
bulk edits, binder metadata, collection row ownership fields, collection view
modes, source-backed value summaries, provider price snapshot imports,
collection-to-set transfer, or the Decks/Sets view-mode follow-through.

Card Dashboard view planning lives in
`docs/32_card_dashboard_research_plan.md` and
`docs/33_card_dashboard_priority_matrix.md`. Use those docs before adding
dashboard widgets, card/deck/collection statistics, probability widgets,
recommendation cards, dashboard edit mode, or card-dashboard View menu
behavior. Keep this lane source-aware and do not use it to change deck
metadata schemas or frame registry contracts.

Work Modes planning lives in `docs/34_work_modes_research.md`,
`docs/35_work_modes_personas_requirements.md`, and
`docs/36_work_modes_priority_matrix.md`. V1 Work Modes are Full Studio, Card
Maker, Deck Builder, and Collection Manager. Work Modes are task presets in the
View menu; Panels remain manual visibility toggles and Focused Layouts remain
single-purpose deep views.

Frame, card-type, subtype, border, and treatment expansion lives in
`docs/frame-taxonomy.md`, `docs/frame-support-roadmap.md`,
`docs/frame-asset-inventory.md`, `docs/frame-licensing-ledger.md`, and
`docs/visual-qa-reference-guide.md`. Use the modular registries under
`packages/editor/src/domain/` plus the shared Forge contract at
`packages/forge/src/domain/frameSupport.ts` before adding new frame inference,
schema, import, validation, or renderer options; keep `frameRegistry.ts` as a
compatibility facade instead of turning it into a single giant frame table.

## Repo Layout

```text
assets/
  packs/                 # Asset-pack manifests and future user-supplied assets
  sources/               # Source/license metadata for downloaded, npm, and GitHub assets
scripts/
  bootstrap-pnpm.sh       # Installs the repo-local pnpm wrapper for first-time setup
  launch-homebrew-forge-app.sh
                          # Starts the local editor on a stable port; desktop delivery should avoid Chrome app mode
  install-homebrew-forge-app-shortcut.sh
                          # Installs the /Applications Homebrew Forge launcher; planned desktop replacement should open the shared editor in a real app shell
  run-homebrew-forge-editor.mjs
                          # Runs the Vite editor as a launcher-owned service process
  codex/
    homebrew-forge-launcher-health-hook.sh
                          # Codex Stop hook target: repairs stale shortcut/support launcher and opens the current app for review; planned desktop replacement should verify app process, not Chrome process
    desktop-delivery-toolchain-check.mjs
                          # Dependency-free desktop delivery readiness check for Node, pnpm, Apple tools, Xcode.app, and Electron package candidates
    import-signs-of-assassins.ts
                          # Deterministic Assassin import: owned ledger, batch-002 incoming orders, flags, recommendations, SOA shell, and six deck variants
    qa-signs-of-assassins.mjs
                          # Playwright visual QA for the Signs of Assassins project, deck variants, Maybeboard rows, binder/list rows, ghost styling, and dashboard filters
.codex/
  config.toml             # Project-scoped Codex Stop hook wiring for launcher health
printables/
  commander-token-table-aids/
                          # Editable HTML/CSS source for private print-light token and tracker sheets
sets/
  library.json           # Editor workspace index: projects and their sets; storage currently uses the legacy `universes` key
  UNGRP/                 # Empty holding set for unassigned/ungrouped cards and gallery assets
  DEMO/                  # Demo set used by tests and CLI smoke commands
  SQM/                   # Squirrel Mania set for the Squirrel Far Away playtest project
  SOA/                   # Empty authored shell for the Signs of Assassins official-card deck-building project
decks/
  demo-showcase/         # Seeded deck for checking the Decks workspace with populated Main/Side/Maybe sections
  squirrel-away/         # Partner Squirrel Away deck with CSV mainboard entries and Whisperglide variants in Maybe
  signs-of-assassins/    # Altaïr Commander deck family with six variants and collection/recommendation-backed official card rows
  <deck-id>/             # Cross-set deck metadata, variants, candidate/role-rich entries; references cards by setCode + cardId
collections/
  demo-reference/        # Seeded Demo Project collection with one matched row and one review row
  squirrel-away/         # Partner modified Squirrel Away CSV owned by Eleni, enriched with Scryfall IDs, print metadata, and image URI references
  assassin-candidate-binder/
                          # User-facing Assassin's Ledger binder for Kyle's batch-001 ManaBox import plus batch-002 delivery-pending online orders
  recommendations/       # Global recommendation list; includes Signs of Assassins ghost/unowned gap-filler rows
  flagged/               # Global flagged list; includes Signs of Assassins duplicate/off-color review rows
  <collection-id>/       # Isolated binder/list metadata and normalized scanner/reference CSV entries
packages/
  forge/                 # CLI and core implementation
    src/
      assets/            # Asset pack manifest loader and role resolution
      collections/        # Scanner CSV normalization, collection metadata, person-owner rows, review status, price snapshots, price refresh/import, and CSV/text/.cod exports
      data/              # CSV/XML parsing and project loading
      decks/             # Deck metadata, variant/candidate/role entry storage, cross-set resolution, role inference, and text/.cod exports
      domain/            # Zod schemas and TypeScript types
      exporters/         # Cockatrice XML and ZIP export
      officialCards/     # Scryfall bulk-data cache, print/Oracle search, sync status, and collection add helpers
      power/             # Card design-assistant scoring, term treatment coverage, and audit reports
      reference/          # Shared Magic terms catalog, official sync snapshots, local custom reference storage, rules wiki parsing, typeahead terms, and rules linting
      renderer/          # React/SVG card component and image rendering
      validation/        # Cross-record validation
      utils/             # Filename, filesystem, and small shared helpers
    tests/               # Vertical-slice tests
  editor-core/           # Shared editor contract and adapter logic consumed by web and standalone runtime
    src/
      editorTypes.ts      # Editor-facing project, draft, runtime, deck, collection, print, and official-card types
      cardDraft.ts        # CSV/domain record to editable card draft conversion
      projectAdapter.ts   # ForgeProject to EditorProject conversion used by Vite and runtime-service
      frameRegistry.ts    # Shared frame option registry consumed by editor project payloads
  editor/                # Vite/React local editor for selecting cards, editing fields, and previewing frames
    src/
      api/               # Browser client calls into the Vite dev API
      components/        # Toolbar/menu shell, rail, workspace views, overlays, image lightbox, Cockatrice-style card browser, collection import/price/transfer panels, deck builder, management lists, card list, preview, inspector, tabs, and field controls
        shell/            # App shell wrappers, workspace frame, sidebar nav, top command bar, and workspace health/status chrome
        forge-ui/         # Dependency-free Forge UI primitives used during the CSS/component-first migration
        print/            # File > Print overlay and print settings surface
      domain/            # Editor-only domain helpers plus compatibility facades for shared editor-core modules
      server/            # Vite middleware plus runtime health/fingerprint checks for project load, preview render, CSV save/import, and Cockatrice sync
    tests/               # Editor structural tests plus UX quality-gate Playwright smoke coverage
  runtime-service/       # Embeddable local HTTP runtime for shared web/desktop delivery
    src/
      createRuntimeServer.ts
                          # Starts a 127.0.0.1 runtime with selected-port fallback, health/version routes, and optional built-editor static serving
      runtimeHealth.ts    # Runtime freshness, /api/health, /api/version, source fingerprint, and Forge dist freshness helpers
      cli.ts              # Local runtime process entry for future desktop ownership
    tests/                # Runtime smoke tests for health, version, and port fallback
output/                  # Generated renders and Cockatrice packages, ignored by Git
reference/
  custom/                 # User-created and homebrew reference terms
  official/               # Reviewed official catalog/rules snapshots, history, and sync reports
  power/                  # Reviewed power-score term treatments and formula patterns, separate from reference definitions
```

## Current Slice

- Load `sets.csv`, `cards.csv`, `card_faces.csv`, `art_manifest.csv`, and `export_profiles.csv`.
- Load `card_variants.csv` and `card_variant_faces.csv` when present. When they
  are missing, synthesize one primary `Variant 1` per card from `cards.csv` and
  `card_faces.csv`.
- Parse simple card XML into the same record shape.
- Validate records with Zod plus cross-record checks.
- Render asset-backed normal, planeswalker, text-token, and full-art-token cards from React/SVG to PNG.
- Use the DEMO set as a practical baseline fixture for creature, artifact, land, enchantment, instant, sorcery, 3-ability planeswalker, 4-ability planeswalker, text token, and full-art token templates.
- Use the SQM set as the Squirrel Far Away/Squirrel Mania seed: one authored Whisperglide Dreywarden card with two rule variants, linked to the Squirrel Away collection and deck.
- Prefer the local Basic M15 MSE pack via `assets/packs/basic-m15-local`.
- Keep `assets/packs/genevensis-local` and `assets/packs/figma-mtg-card-assets` as fallback/reference packs, not the active visual lane.
- Run a local editor with `pnpm editor` to load the DEMO set, edit core card fields, preview renderable frames, and save back to CSV.
- Use the editor's Project > Set model to separate work such as Stargate and Black Panther. `sets/library.json` stores only workspace grouping; each set still owns its own CSV files.
- Use the left rail to switch between Maker, Sets, Decks, Collections, Binders, Lists, Projects, Gallery, References, and Settings. The app-card catalog workspace is labeled Cards and is opt-in from View > Panels or Settings.
- Use File > Import and File > Export for transfer workflows. These open overlay dialogs so future card, set, deck, and batch flows can live under broad Import/Export actions instead of a single side-rail workspace.
- Maker, Decks, Collections, Sets, Projects, and Gallery plus buttons route through shared create overlays in `packages/editor/src/components/create/`. Do not add more inline create forms to `WorkspaceView.tsx`.
- Use the Decks workspace to create cross-set decklists independent from project/set ownership. Decks may link to a project or set for organization, but entries can reference cards from any discovered set.
- Store decks under `decks/<deck-id>/metadata.json` and `decks/<deck-id>/entries.csv`. Metadata owns deck variants and the active variant; entries use Main, Sideboard, and Maybeboard sections plus `deck_variant_id`, candidate status, roles, ratings, entry tags, flags, notes, star, and delete-marker fields.
- Export decklists as grouped plain text and Cockatrice `.cod` files from the active variant only. Candidate, cut, and delete-marked entries stay in Homebrew Forge as experiment/pool rows and do not leak into exports.
- Deck role inference lives in `packages/forge/src/decks/deckRoles.ts`: manual roles win, `reference/deck_roles.csv` can provide local external mappings, and built-in seed/heuristic roles fill obvious cards. The editable import shape is documented by `csv_templates/deck_roles_template.csv`.
- Deck metadata upgrade planning lives in `docs/30_deck_metadata_format_upgrade_plan.md`; deck stats research lives in `docs/31_deck_stats_research_notes.md`; reusable editor suggestions for formats, play styles, and Commander brackets live in `packages/editor/src/domain/deckTaxonomy.ts`. Deck cover presentation lives in `packages/editor/src/components/decks/DeckCoverBadge.tsx`, and warning-only Commander/format checks live in `packages/editor/src/domain/deckLegality.ts`.
- Deck legality remains warn-only. Commander-style checks flag missing commander, missing identity, off-identity active-variant entries, commander identity mismatch, expected deck size, and singleton duplicates outside basic-land or any-number exceptions.
- Collections are independent card-reference/list layers for ownership, inspiration, research, staging, physical print runs, and mixed lists. They do not automatically create authored Cards, Sets, Decks, or ungrouped records.
- Cards/Sets are editable authored card records used for rendering and set export. Decks are play/export lists. Collections are isolated card lists; a collection row appears nowhere else unless explicitly copied into Cards/Sets or added to a Deck.
- Collection metadata has a `kind`: `binder` for binder organization, or `list` for wish lists, recommendations, starred, flagged, gift, and other quick-reference groups. Lists may contain owned or unowned rows and can apply default row metadata such as wanted/recommended/reference ownership, default tags, starred, flagged, proxy, or homebrew-unprinted markers.
- Default list folders are created lazily: `wish-list`, `recommendations`, `starred`, `flagged`, and `gift-list`. They remain ordinary collection storage folders with `kind: list`.
- Import collection CSVs exported by scanner apps such as ManaBox, TCGplayer, Dragon Shield, Delver Lens, or generic list tools. Store collections under `collections/<collection-id>/metadata.json` and `collections/<collection-id>/entries.csv`.
- Import collections from scanner/generic CSV, plain text lists, or Cockatrice
  `.cod`/XML. Text and Cockatrice rows use the same review model as generic
  CSV when set/collector identity is missing.
- Collection metadata includes `linkedUniverseId`, `gameId`, and `purpose` (`owned`, `inspiration`, `homebrew_print_run`, `research`, or `mixed`) so future official/homebrew/game views do not collapse into one unclear space.
- Lists default to global collection organizers, but `linkedUniverseId` can attach a list to a specific project when a project-scoped wish list, recommendation list, or test pool is useful.
- Normalize collection rows into quantity, person owner, ownership status, card name, set code/name, collector number, Scryfall id, finish, condition, language, location, source row, match strategy, review status, tags, notes, price snapshots, and row markers. Preserve uncertain rows with `needs_review`; never silently guess missing print identity.
- Match collection rows by Scryfall id first, then card name + set code + collector number, then card name + set code. Rows without enough identity stay unresolved for review.
- Export collections as normalized CSV, plain text, or Cockatrice `.cod` list files. Cockatrice export writes matched rows only into the Main zone.
- Use the Collections plus button to open the `CreateCollectionOverlay`; the Collections right panel is for selected collection details, row preview, review count, and export actions.
- Collection row owner names are plain display strings. Legacy or blank rows default to `Kyle`; saved/imported `owner`, `owner_name`, `owned_by`, and `card_owner` aliases feed owner suggestions. Collections browse, Card Browser, and Dashboard filters expose owner, ownership status, tags/markers, and stored purchase/market value states where collection rows are in scope.
- Collections include an explicit "Add to set" flow. It copies all or selected matched collection rows into a chosen set as editable imported card drafts and leaves the original collection rows unchanged.
- Collection price tools refresh source-backed value snapshots from the local official-card cache or import licensed/manual provider CSV snapshots. Do not scrape marketplace pages or imply unauthenticated TCGplayer live access.
- Deck creation and deck editing can add collection rows as deck entries with a name snapshot. This includes list rows such as wishlist/recommendation candidates and does not require those rows to exist as authored Cards or Sets.
- Deck resolution indexes authored set cards first, then collection-backed official prints by `set_code + scryfall_id`. Collection-backed deck rows should render images/metadata and not emit unresolved warning spam.
- Deck and collection official-card display reads Scryfall enrichment from collection `source_row` via `packages/editor/src/domain/officialCardMetadata.ts`. Keep source-row JSON newline-safe because the shared CSV parser normalizes `\\n` sequences.
- Treat `mtg-oracle` as an optional future review accelerator for unresolved or ambiguous collection rows. Homebrew Forge must not require that MCP to import, save, validate, or export collections.
- Create projects from the Projects workspace and create sets from the Sets workspace. The Maker workspace intentionally hides the project/set selector so card editing stays focused.
- The active project is global context for Maker, Sets, and Decks. Selecting a project loads that project's first set when one exists; Collections remain global and should not silently follow the active project.
- Projects can summarize linked official-card decks, binders, and lists in addition to authored sets. Keep this as a project overview bridge; do not convert official collection/deck rows into authored set card rows just to make a project look populated.
- Create a new set from the editor. The server creates `sets/<SET>/sets.csv`, empty card/face/art CSVs, default export profiles, and a library entry.
- Start a new card with the Maker workspace plus button. It opens the card creation overlay and does not create a card until `Create Draft` is confirmed.
- Keep several cards open with preview tabs above the card canvas.
- Treat variants as child records under one authored card. The card list stays
  parent-card based; the Preview header and Inspector Preview tab own variant
  switching, metadata, archive/restore, and primary selection.
- Use File > Save to overwrite the active variant. Use File > Save as... for
  creating a new card, new variant, or history/snapshot variant.
- Use File > Print for selected-card, active-set, deck, collection, and project
  print sheets. Current print modes support Letter, A4, and 4x6 glossy photo
  paper; 1-up or 9-up layout; PDF or PNG proof/export output; full-color,
  low-ink, grayscale, wireframe, and text-only output with crop marks and
  optional cut lines. The rendered card slot remains the standard 2.5 x 3.5 in
  Magic-size card on every paper.
- Use the application menu for File/Edit/View/Tools/Help actions. The toolbar stays focused on open/save, undo/redo, preview mode, Guides, Safe area, Card grid, zoom, and project context. `Command+S`/`Ctrl+S` routes to the active editable workspace save action: Maker, Sets, Projects, Decks, or Collections.
- Use the View menu for shared layout toggles such as toolbar, side rail, center preview, card-list density, focused layouts, preview modes, optional Cards catalog rail visibility, and quick project switching. Use the Tools menu for card-surface tools and visual aids such as the Zoom/Artwork/Text/Layout modes, Guides, Safe area, Card grid, and zoom level. The toolbar must keep a visible active project/set context chip plus compact card-tool buttons. The local left and right panels own their own collapse controls, and Maker, Projects, Sets, and Gallery share the same resizable left/right panel widths via `PanelResizeHandle`.
- Keep card-surface tool modes in `packages/editor/src/components/CardPreview.tsx`: Zoom opens the larger preview on card click, Artwork owns artwork move/crop, Text owns direct edits to name/type/rules/flavor/stat fields, and Layout V1 owns rules-text padding handles plus text-zone selection. Broader name/type/text-box positioning is future work, not part of the shipped V1. UX consistency audit and tracker live in `docs/55_ux_consistency_conventions_audit.md` and `docs/56_ux_consistency_phase_tracker.md`.
- Keep card draft recovery separate from explicit save. Unsaved card edits are debounced into local browser storage through `packages/editor/src/domain/draftRecovery.ts`, restored into the dirty draft cache after reload, and written to CSV only when the normal card save flow runs.
- Use the optional Cards workspace for a normal-chrome catalog of cards already present in the app across authored sets, decks, collections, binders, and lists. It reuses `packages/editor/src/components/CardBrowserView.tsx`, keeps filter and detail panels collapsed by default, and opens authored rows in Maker.
- Use View > Card List Browser for the Cockatrice-style focused three-pane card browser. It owns `packages/editor/src/components/CardBrowserView.tsx`, lists authored cards plus deck and collection rows, keeps cards/sets/decks/collections/binders/lists distinct in filters, supports read-only two-source-row comparison through `packages/editor/src/domain/cardBrowserCompare.ts`, shows card preview or artwork in the upper-right pane, and uses the lower-right pane for normal card inspector edits or collection row metadata edits depending on the selected source.
- Use View > Card Dashboard for the source-aware analytics dashboard. It owns `packages/editor/src/components/dashboard/` plus `packages/editor/src/domain/dashboardFacts.ts` and `packages/editor/src/domain/dashboardSettings.ts`, keeps authored cards, deck entries, binder rows, and list rows distinct, supports all/project/set/deck/collection/binder/list/custom scopes plus advanced ownership/list filters, saves autosaved and named dashboard views locally, and ships fixed widgets, recommendations, probability cards, widget edit mode, and an advanced color-by-type matrix without changing deck metadata or frame registries.
- Keep normal card editing in the Card inspector tab: identity, name/mana, fill-or-choose Supertype/Card type/Subtype controls, frame basics, art source, rules/flavor, power/toughness or loyalty, and advanced symbol/watermark fields. The Frame tab owns frame source overrides; the Layout tab repeats art source access and owns art transform plus finish controls.
- Use the shared reference catalog to power supertype/card-type/subtype dropdowns, rules-text typeahead triggers, linked-reference chips in the Inspector Preview tab, and the References workspace. Current triggers: `@` for keyword abilities/ability words/homebrew mechanics, `#` for keyword actions/phrases, `:` for type-line terms/tokens/counters, and `!` for active-set card names.
- Use chip-based tag editing with typeahead suggestions for card and variant metadata; prefer existing project tags first, then allow a new tag only when the typed value has no useful match.
- Let the renderer use linked reference terms as optional reminder text on normal and token rules boxes. The saved rules text stays clean; the SVG render tests a reminder-expanded candidate once and keeps it only when the rules box remains readable.
- Keep card-text syntax visible from the Inspector Rules section. Rules/flavor text uses braced symbols such as `{T}`, `{2/W}`, and `{G/P}`; `~` renders as the current card name; `<i>...</i>` and parenthetical text render as italics; flavor `*...*` de-emphasizes text; and `\\` forces a new rendered line. Mana cost fields may use compact costs such as `2WU` without braces, but rules/flavor should require braces so ordinary letters are not interpreted as mana.
- Keep References workspace content local and source-labeled. Kyle's Drive sheet seeds definitions; Scryfall catalog values broaden current term coverage; local Stargate/Cockatrice mechanics seed homebrew terms; user-created references are saved under `reference/custom/references.json`.
- Use References > Official Cards and View > Card List Browser > Official catalog for opt-in local Scryfall-backed card lookup. Prints mode is for exact collection identity and Add to Collection, Unique mode collapses reprints/basic lands by mechanical card with variant counts and an exact-print variants browser, and Oracle mode is read-only design/reference lookup. Official card images stay remote reference URLs and are not downloaded into repo source.
- Import local custom/homebrew references from File > Import > References as CSV.
  Imports skip duplicates and do not write directly into official reference
  snapshots.
- Use `forge reference` commands to audit, sync, archive, and promote official reference snapshots. The editor reads `reference/official/current/` when present and falls back to the binderd catalog when no official snapshot has been promoted.
- Use `forge power audit` to verify every reference term has an explicit power treatment path. Term treatments live in `reference/power/` and are separate from reference definitions; not every term gets a numeric value.
- The editor preview response includes a deterministic Power Estimate: score, confidence, budget/effect delta, recommendations, contribution breakdown, and coverage gaps for terms that need review.
- Keep the References workspace split into Terms and Rules modes. Terms mode owns type/keyword/token/counter/homebrew entries; Rules mode owns parsed Comprehensive Rules sections and glossary entries.
- Keep References filtering helper-backed in `packages/editor/src/domain/referenceFilters.ts` and UI controls in `packages/editor/src/components/reference/`. Terms filtering covers category, lifecycle/workflow, origin, source, system, tags, color, parent/type, rule/source-set/type-line metadata, text/version presence, and active-set/card usage. Rules filtering covers kind, number/prefix, title, text, related term, effective date, source, and related-term presence.
- Treat deck/collection/project-wide reference usage and the MTG Oracle-backed MCP as the next lane; the current shipped usage index is active-set and selected-card scoped.
- Use the References plus button as the first shipped shared overlay pattern: it opens a focused creation/import-one flow, supports draft/final workflow status, and refreshes/selects the new reference after save.
- Treat art position/scale as the default center-canvas artwork edit mode. Crop values are separate and should change only from explicit crop controls or crop mode.
- Use management-list workspaces for Projects, Sets, and Gallery. Each has its own search/filter area and plus button instead of global project/set dropdowns.
- Keep ordinary search visible in every browse/list workspace. Filter buttons open shared browse/filter overlays from `packages/editor/src/components/filters/`, with active filter badges and reset controls. Do not add new large inline filter panels to `WorkspaceView.tsx`.
- Import AI-friendly flat CSV or XML/Cockatrice XML into the active set from the editor. Imported rows normalize missing defaults into `cards.csv`, `card_faces.csv`, `card_variants.csv`, `card_variant_faces.csv`, and `art_manifest.csv` where possible.
- Import Gallery asset CSV from File > Import > Gallery. Rows upsert `art_manifest.csv` entries and can assign art to primary card faces or specific variant faces.
- Import decklists from plain text, Markdown, Cockatrice `.cod`/XML, or app-native deck CSV. Deck CSV preserves optional `variant_id`, and unresolved imported rows stay in the deck with warnings.
- Import a new set from File > Import > Sets by providing set code, set name,
  project, status, metadata, and a card import file. This creates the set shell
  before importing cards into that new set.
- Export from File > Export: card PNG from current/selected active-set card, source CSVs, Cockatrice XML, Cockatrice ZIP, deck text, deck `.cod`, collection CSV/text/`.cod`, and the active set art manifest.
- File > Export Cards and Sets also route to File > Print for print-ready PDF/PNG output instead of burying print settings inside source exports.
- Current-card PNG export uses the active variant. Full set/project exports ask
  how variants should be included: primary only, default export variants, all
  active variants, or all variants including archived.
- Deck entries can store an optional `variant_id`; deck export resolves that
  variant first and falls back to the card primary variant with a warning.
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

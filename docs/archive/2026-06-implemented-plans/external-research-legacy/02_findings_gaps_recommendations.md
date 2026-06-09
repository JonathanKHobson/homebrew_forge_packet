---
status: archived
lane: research
type: research
archived: 2026-06-09
---
> **ARCHIVED 2026-06-09 (implemented-plans sweep)** — original path: `external research/02_findings_gaps_recommendations.md`
> Reason: implemented planning artifact, archived per Kyle's 2026-06-09 directive (all plans implemented; no live backlog).
> Index: `docs/cowork/02_repo_archive_manifest.md` + `docs/64_repo_cleanup_archive_index.md`.

# 02 Findings, Gaps, and Recommendations — Homebrew Forge

- **Generated date:** 2026-06-08
- **Research horizon:** Public sources and repo docs checked during this pass. Pricing/features should be re-verified before roadmap/public copy decisions.
- **Repository freshness caveat:** GitHub may lag local code. The public GitHub URL was not accessible in normal web browsing during this pass; repo facts came from a GitHub connector with repository access plus owner-provided research context. Links may require repo permission.
- **Scope:** External-only competitive/product analysis. No local runtime, no code changes, no hands-on UX test, no heuristic-agent usability run.
- **Confidence summary:** **High** for repo-grounded priorities and public official pages. **Medium** for product-landscape fit judgments and effort estimates. **Low** for inaccessible/JavaScript-gated products or features not visible in public docs.

## Evidence framing

### Explicit facts

- Homebrew Forge is a local, spreadsheet-first Magic-style card production system using CSV/JSON/YAML + local art + asset manifests as source of truth. Sources: [README](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/README.md#L3-L23), [Decision Summary](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/00_decision_summary.md#L34-L41). **Confidence: high.**
- Current/product-map scope includes card editing, set/project organization, Decks, Collections, Library, References, Settings, import/export overlays, cross-set decklists, collection scanner CSV imports, and reference/typeahead/lint workflows. Source: [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L69-L125). **Confidence: high.**
- The repo explicitly identifies inconsistent creation behaviors and defines a shared overlay model for plus-button creation and File > Import / File > Export hubs. Source: [Create/Import/Export Overlay Plan](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/21_create_import_export_overlay_plan.md#L24-L65). **Confidence: high.**
- Deck V1 is focused on decklists and does not enforce format legality, Commander singleton/color identity rules, sideboard limits, draw simulation, or collection tracking. Source: [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L83-L87). **Confidence: high.**
- Collections import scanner-app CSVs and preserve uncertain rows for review rather than silently guessing print identity. Source: [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L87-L97). **Confidence: high.**

### Inferences

- **Inference:** Homebrew Forge should prioritize “workflow trust” before expanding competitive feature breadth.
- **Inference:** Search/filter/sort, import/export clarity, and review queues are the highest-impact shared patterns because they cut across Cards, Decks, Collections, References, and Library.
- **Inference:** Live marketplace/trade/pricing is a dangerous near-term scope trap; compatibility and import/export are safer strategic moves.

---

## Top 10 findings

### 1. Homebrew Forge’s winning wedge is local workflow integration, not single-lane feature parity.

- **Impact statement:** Competing head-on with MTG.design, Archidekt, ManaBox, Deckbox, and Figma at once would over-scope the product. Homebrew Forge is strongest where those lanes intersect: custom card data → validated render → deck package → collection/reference context → local exports.
- **Segment:** Full Studio, Card Maker-Pro, Deck Builder, Collection Manager.
- **Evidence:** HBF defines local source files and generated outputs as the core principle; product map links Cards, Decks, Collections, References, Projects/Sets, and Import/Export surfaces. Sources: [Decision Summary](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/00_decision_summary.md#L34-L58), [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L69-L125).
- **Recommendation implication:** Roadmap messaging should say “local custom-card production studio” rather than “better web card generator” or “better deck site.”
- **Confidence:** High.
- **Next validation:** Product owner should choose the default onboarding lane and one-sentence positioning statement.

### 2. First-card creation must feel as fast as web card makers even if the underlying architecture is richer.

- **Impact statement:** MTG.design, MTG Cardsmith, and MTGCardBuilder set user expectations for immediate preview, easy editing, gallery/share, frame options, and quick visual payoff. HBF’s source-of-truth strength will not matter if creating the first card feels like data-entry overhead.
- **Segment:** Card Maker.
- **Evidence:** MTG.design promotes create/save/share and high-quality browser rendering; MTG Cardsmith promotes live preview, HD frames, AI image, and prints; MTGCardBuilder promotes free editing, many frames, set-symbol controls, and high-resolution output. Sources: [MTG.design](https://mtg.design/), [MTG Cardsmith](https://mtgcardsmith.com/), [MTGCardBuilder](https://mtgcardbuilder.com/).
- **Recommendation implication:** Card creation overlay should capture only essentials, then land users in a preview-first editing surface.
- **Confidence:** High.
- **Next validation:** Time a first-card task manually in-editor after overlays ship.

### 3. Import/export should be treated as a product surface, not a utilities menu.

- **Impact statement:** Homebrew Forge’s core value depends on safe movement between CSV/XML/Cockatrice/images/decks/collections/assets/references. Confusing or incomplete import/export flows threaten the whole value proposition.
- **Segment:** All personas.
- **Evidence:** Repo plans broad File > Import and File > Export hubs with entity choices and staged unsupported slices; export targets include image, Cockatrice, decklist, print, and future adapters. Sources: [Overlay Plan](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/21_create_import_export_overlay_plan.md#L123-L183), [Export Targets](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/10_export_targets.md).
- **Recommendation implication:** Every import/export action needs scope, source, target, dry-run/preview, validation output, and clear unsupported-state labeling.
- **Confidence:** High.
- **Next validation:** Product owner should approve the first complete import/export object model: cards, decks, sets, collections, references, or project package.

### 4. Search/filter/sort consistency is a shared infrastructure priority, not polish.

- **Impact statement:** Cards, Decks, Collections, References, Library, Projects, and Sets all become hard to use if filtering is inconsistent. This is especially dangerous for spreadsheet-first users who expect predictable table behavior.
- **Segment:** All personas, especially Collection Manager and Deck Builder.
- **Evidence:** HBF project map says ordinary search should be visible in every browse/list workspace and filter buttons should open shared overlays; Google Sheets docs anchor user expectations for sort/filter/filter views; Deckbox explicitly describes inventory browse/sort/filter. Sources: [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L117-L118), [Google Sheets sort/filter](https://support.google.com/docs/answer/3540681), [Deckbox](https://deckbox.org/).
- **Recommendation implication:** Build a single browse-toolbar contract before adding workspace-specific filters.
- **Confidence:** High.
- **Next validation:** Inventory all current list surfaces and compare controls/labels/states.

### 5. Deck users will expect legality, stats, playtest, and collection availability—even if HBF V1 intentionally defers them.

- **Impact statement:** The Decks workspace can be useful with text/`.cod` export, but users accustomed to Archidekt, TappedOut, Moxfield, ManaBox, or Deckbox may perceive missing deck intelligence as broken or incomplete.
- **Segment:** Deck Builder.
- **Evidence:** HBF V1 defers legality and draw simulation; Archidekt exposes deck compare/sandbox/playtest/open actions; TappedOut highlights deck builder, advanced deck search, inventory matching, and format lanes; ManaBox includes deck builder/simulator and prices. Sources: [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L83-L87), [Archidekt](https://archidekt.com/), [TappedOut](https://tappedout.net/mtg-deck-builder/), [ManaBox](https://manabox.app/).
- **Recommendation implication:** Add basic deck intelligence as staged warnings, not full legality engine: counts, zones, missing references, color identity estimate, duplicate/singleton warning, collection availability.
- **Confidence:** Medium-high.
- **Next validation:** Product owner should choose whether Commander is the first legality profile.

### 6. Collection Manager value depends on exact-printing confidence and bulk correction.

- **Impact statement:** Scanner/import workflows fail when the app guesses variants, quantities, finishes, or conditions incorrectly without review. HBF’s “needs_review” model is right; the UI must make it fast.
- **Segment:** Collection Manager.
- **Evidence:** HBF imports scanner CSVs and preserves unresolved rows; Dragon Shield and ManaBox emphasize scanning/value; TCGplayer app public reviews include scanner/list-management friction signals. Sources: [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L87-L97), [Dragon Shield](https://www.dragonshield.com/card-manager), [ManaBox](https://manabox.app/), [TCGplayer App Store](https://apps.apple.com/us/app/tcgplayer/id1247645833).
- **Recommendation implication:** Ship a collection review queue with match confidence, variant/finish/condition/quantity bulk edits, and “do not silently guess” copy.
- **Confidence:** High.
- **Next validation:** Test with real CSVs from at least two scanner apps.

### 7. Asset/legal safety is a product feature, but only if it is visible and legible.

- **Impact statement:** HBF’s refusal to embed copyrighted production frames or scrape sites is a strength, but users may interpret missing official-looking frames as product weakness unless asset-pack status, licensing, and debug-frame intent are visible.
- **Segment:** Card Maker, Full Studio.
- **Evidence:** README and Codex prompt ban copyrighted assets/scraping and require asset source/license/checksum metadata; card-design competitors market HD/many frames. Sources: [README](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/README.md#L33-L43), [Codex Master Prompt](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/prompts/codex_master_prompt.md#L55-L70), [MTG Cardsmith](https://mtgcardsmith.com/), [MTGCardBuilder](https://mtgcardbuilder.com/).
- **Recommendation implication:** Add asset-pack health/status UI and plain-language safety copy: “debug frame,” “local licensed pack,” “missing role,” “non-redistributable,” “not included.”
- **Confidence:** High.
- **Next validation:** Product owner should define acceptable default frame aesthetics for beta.

### 8. Reference catalog and rules linting can become a unique advantage if surfaced as help, not scolding.

- **Impact statement:** HBF has stronger rules/templating/reference ambition than most visual card generators, but validators can feel punitive unless organized by severity, waiver, and fix direction.
- **Segment:** Card Maker-Pro, Card Maker.
- **Evidence:** Validation layers include schema, layout, Magic templating, color-pie/design lint, export validation, severity levels, and waivers. Source: [Validation and Rules Linting](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/14_validation_and_rules_linting.md).
- **Recommendation implication:** Use a persistent issue drawer with “must fix,” “should review,” and “design note,” plus card-specific waiver history.
- **Confidence:** High.
- **Next validation:** Review 20 generated warnings with a card maker and label confusing/annoying messages.

### 9. Productivity/editor standards are more important than category novelty.

- **Impact statement:** Figma, Google Sheets, and Photoshop have trained users to expect stable menus, canvas/inspector separation, visible selections, keyboard support, undo/redo, filters, save/export clarity, and workspace panels. HBF should follow these conventions unless MTG-specific behavior clearly requires a deviation.
- **Segment:** All personas.
- **Evidence:** HBF already uses app menus, toolbar, panels, inspector tabs, View menu toggles, and shared overlays; Figma/Google/Photoshop expose the relevant standards. Sources: [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L101-L105), [Figma](https://www.figma.com/pricing/), [Google Sheets sort/filter](https://support.google.com/docs/answer/3540681), [Photoshop toolbar help](https://helpx.adobe.com/photoshop/desktop/get-started/set-up-toolbars-panels/customize-the-toolbar.html).
- **Recommendation implication:** Build a UI convention checklist and require each new workspace/control to map to one convention.
- **Confidence:** High.
- **Next validation:** Create a component inventory and mark every control with source convention: Figma-like, Google-like, Photoshop-like, MTG-domain, or custom.

### 10. Public sharing/community is not required now, but shareable export packages are.

- **Impact statement:** Card creators and deck sites use community/network effects heavily. HBF does not need a SaaS gallery now, but users still need to hand off cards/decks/sets to playtesters cleanly.
- **Segment:** Card Maker, Deck Builder, Full Studio.
- **Evidence:** MTG.design and MTG Cardsmith emphasize sharing/community; HBF defers public sharing/gallery but already exports Cockatrice packages and future web gallery. Sources: [MTG.design](https://mtg.design/), [MTG Cardsmith](https://mtgcardsmith.com/), [Decision Summary](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/00_decision_summary.md#L60-L67), [Export Targets](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/10_export_targets.md#L61-L79).
- **Recommendation implication:** Prioritize local/static share packages and playtest exports over hosted public gallery.
- **Confidence:** High.
- **Next validation:** Product owner should choose “Cockatrice ZIP,” “static gallery,” or “print PDF” as the first share-ready artifact.

---

## Prioritized recommendations

### Quick Wins — low effort / high impact

1. **Standardize create overlay copy and states.**
   - Primary action: `Create Draft`.
   - States: idle, dirty, saving, saved, error, unsupported.
   - Evidence: [Overlay contract](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/21_create_import_export_overlay_plan.md#L48-L65).
   - **Confidence: high.**

2. **Create one Browse Toolbar contract.**
   - Required controls: search, filter, sort, active chips, reset, result count, empty state, saved-view placeholder.
   - Evidence: [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L117-L118), [Google Sheets sort/filter](https://support.google.com/docs/answer/3540681).
   - **Confidence: high.**

3. **Add unsupported/staged-state labels to import/export hubs.**
   - Copy pattern: “Available now,” “Planned,” “Requires review,” “Unsupported in this build.”
   - Evidence: [Overlay Plan](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/21_create_import_export_overlay_plan.md#L123-L183), [Priority Matrix stop conditions](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/22_create_import_export_priority_matrix.md#L97-L105).
   - **Confidence: high.**

4. **Add file-source and dirty-state indicators.**
   - Show current set/project/deck/collection file path, last saved, unsaved changes, external change warning.
   - Evidence: [Local Editor Spec](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/08_local_editor_spec.md#L77-L99).
   - **Confidence: high.**

5. **Create first-run lane chooser.**
   - Choices: Make cards, build deck, import collection, manage references/assets.
   - Evidence: HBF personas/workspaces from [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L80-L125); simple entry points align with low-friction creators like [MTG.design](https://mtg.design/).
   - **Confidence: medium-high.**

6. **Add validation issue drawer with severity grouping.**
   - Group errors, warnings, notes, waived.
   - Evidence: [Validation and Rules Linting](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/14_validation_and_rules_linting.md#L52-L68).
   - **Confidence: high.**

### Build Next — medium effort

1. **Complete collection import review queue.**
   - Include match confidence, variant selector, bulk quantity/finish/condition/location edits, unresolved filter.
   - Evidence: [Project Map collection import model](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L87-L97).
   - **Confidence: high.**

2. **Add deck intelligence v1.**
   - Counts, zones, invalid refs, duplicate detection, commander color identity estimate, missing-from-collection indicator.
   - Evidence: [Project Map deck V1 limitations](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L83-L87), [Archidekt](https://archidekt.com/), [TappedOut](https://tappedout.net/mtg-deck-builder/), [Deckbox](https://deckbox.org/).
   - **Confidence: medium-high.**

3. **Build asset-pack health panel.**
   - Show installed packs, supported layouts, missing frames/symbols/fonts, license state, checksum status, active set usage.
   - Evidence: [Architecture asset strategy](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/02_architecture_overview.md#L90-L101), [Local Editor asset manager spec](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/08_local_editor_spec.md#L51-L57).
   - **Confidence: high.**

4. **Finish import/export dry-run reports.**
   - Counts, created/updated/skipped rows, unresolved warnings, output paths, required follow-ups.
   - Evidence: [Importers and Migration](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/12_importers_and_migration.md#L73-L84), [Overlay Plan](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/21_create_import_export_overlay_plan.md).
   - **Confidence: high.**

5. **Saved views for Cards, Collections, References.**
   - Start with local app settings or project metadata; avoid overbuilding collaboration.
   - Evidence: [Google Sheets filter views](https://support.google.com/docs/answer/3540681), [Project Map filters](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L113-L118).
   - **Confidence: high.**

6. **Reference-trigger onboarding.**
   - Add visible cheat sheet for `@`, `#`, `:`, `!`, braced symbols, `~`, italic syntax, and forced line breaks.
   - Evidence: [Project Map rules/reference syntax](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L105-L107).
   - **Confidence: high.**

### Strategic Bets — high effort / high impact

1. **Local project package format.**
   - Export/import a project bundle containing sets, decks, collection rows, references, local asset manifests, and validation reports.
   - Evidence: [Export Targets](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/10_export_targets.md), [Overlay Plan project export future](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/21_create_import_export_overlay_plan.md#L174-L183).
   - **Confidence: high.**

2. **Adapter strategy instead of marketplace strategy.**
   - Build documented adapter recipes for Cockatrice, Tabletop Simulator, Deckbox-style CSV, ManaBox/Dragon Shield/Delver Lens scanner CSV, and general CSV.
   - Evidence: [Importers and Migration](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/12_importers_and_migration.md), [Tabletop Simulator custom deck docs](https://kb.tabletopsimulator.com/custom-content/custom-deck/), [Deckbox help](https://deckbox.org/).
   - **Confidence: high.**

3. **Print-preflight mode.**
   - Bleed, crop marks, safe zone, resolution profile, watermark, calibration note, and “not print-shop-ready” vs “print-preflight-passed.”
   - Evidence: [Export Targets](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/10_export_targets.md#L50-L60), [The Game Crafter](https://www.thegamecrafter.com/).
   - **Confidence: medium-high.**

4. **Reference-powered design assistant.**
   - Move beyond linting into explainable suggestions: wording examples, color-pie note, estimated power budget, term coverage gaps, deck fit, collection availability.
   - Evidence: [Project Map power estimate/reference usage](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L108-L114), [Validation and Rules Linting](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/14_validation_and_rules_linting.md).
   - **Confidence: medium.**

5. **Static share gallery / playtest bundle.**
   - Generate local HTML gallery or ZIP with cards, decklists, disclaimers, manifest, and import instructions.
   - Evidence: [Export Targets web gallery future](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/10_export_targets.md#L61-L69), [MTG.design sharing](https://mtg.design/).
   - **Confidence: medium-high.**

---

## Prioritized table

Priority score = **Impact / Effort**. Ties should be broken by dependency order and risk reduction.

| Recommendation | User impact | Impact 1–5 | Effort 1–5 | Priority score | Confidence | Dependencies / risks |
|---|---|---:|---:|---:|---|---|
| Standardize create overlay contract across all plus buttons | Prevents accidental objects, reduces mode confusion, creates predictable workflow | 5 | 1 | 5.00 | High | Requires all workspaces to use same shell/copy/state names |
| Add unsupported/staged states to Import/Export hubs | Prevents false expectations and broken trust | 5 | 1 | 5.00 | High | Requires product owner to approve staged copy |
| One Browse Toolbar contract | Reduces cross-workspace friction; helps every persona | 5 | 2 | 2.50 | High | Needs current list/control inventory |
| Dirty-state and external-file-change indicators | Reduces data-loss risk in local-first tool | 5 | 2 | 2.50 | High | Needs file watcher/conflict model validation |
| Validation issue drawer grouped by severity | Converts validation from noise into action | 4 | 2 | 2.00 | High | Needs message taxonomy and waiver visibility |
| First-run lane chooser | Lowers onboarding friction for non-technical users | 4 | 2 | 2.00 | Medium-high | Needs agreed positioning and default demo content |
| Reference-trigger cheat sheet | Makes advanced syntax discoverable | 3 | 1 | 3.00 | High | Needs exact trigger syntax finalized |
| Collection import review queue | Prevents wrong variants/conditions/quantities from corrupting collection data | 5 | 3 | 1.67 | High | Needs real scanner CSV fixtures and match-confidence model |
| Import/export dry-run reports | Makes migration/export trustworthy and debuggable | 5 | 3 | 1.67 | High | Depends on stable importer/exporter domain events |
| Asset-pack health panel | Turns legal/asset constraints into understandable product state | 4 | 3 | 1.33 | High | Needs asset role taxonomy and license metadata completeness |
| Deck intelligence v1 | Makes Decks workspace feel credible against deck-builder norms | 4 | 3 | 1.33 | Medium-high | Commander legality scope must be validated |
| Saved filter views | Power-user productivity boost across Cards/Collections/References | 4 | 3 | 1.33 | High | Needs stable filter schema and local settings strategy |
| Local project package format | Enables share/reimport/backup/playtest handoff; strategic differentiator | 5 | 5 | 1.00 | High | Requires stable manifest and versioning strategy |
| Print-preflight mode | Makes print/export promises safer and clearer | 4 | 4 | 1.00 | Medium-high | Requires renderer fidelity and profile standards |
| Adapter recipes for scanner/deck/playtest tools | Lets HBF coexist with best-in-class tools instead of replacing them | 5 | 4 | 1.25 | High | Requires format docs, test fixtures, and support boundaries |
| Reference-powered design assistant | Differentiates HBF for serious homebrew design | 4 | 5 | 0.80 | Medium | Risk of overpromising AI/design judgment; needs evidence-backed explanations |
| Static share gallery/playtest bundle | Addresses sharing gap without SaaS backend | 4 | 4 | 1.00 | Medium-high | Requires asset licensing guardrails and export manifest |

---

## Persona gaps

### Card Maker

#### Current strengths

- File-backed card and face model supports complex Magic-style layouts. Source: [Data Model](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/03_data_model_and_csv_schema.md#L53-L63). **Confidence: high.**
- Editor spec includes live preview, face tabs, lint warnings, art picker, and source-card comparison. Source: [Local Editor Spec](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/08_local_editor_spec.md#L34-L42). **Confidence: high.**
- Validation/linting is deeper than most pure visual card generators. Source: [Validation and Rules Linting](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/14_validation_and_rules_linting.md). **Confidence: high.**

#### Gaps

- **First-card speed:** Needs MTG.design-like speed to preview/export. Source benchmark: [MTG.design](https://mtg.design/). **Confidence: high.**
- **Visual fidelity:** Production frames/showcase/exotic layouts are deferred, while competitors market HD/many frames. Sources: [Decision Summary](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/00_decision_summary.md#L60-L67), [MTGCardBuilder](https://mtgcardbuilder.com/). **Confidence: high.**
- **Art controls:** Crop/art transform workflows must distinguish position/scale from crop mode to prevent destructive confusion. Source: [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L116-L116). **Confidence: high.**
- **Syntax discoverability:** `@`, `#`, `:`, `!`, braced symbols, `~`, italics, and forced line breaks need visible help. Source: [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L105-L107). **Confidence: high.**
- **Share/print expectation:** Public sharing/gallery and print-shop-ready output are deferred. Sources: [Decision Summary](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/00_decision_summary.md#L60-L67), [Export Targets](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/10_export_targets.md#L50-L69). **Confidence: high.**

### Deck Builder

#### Current strengths

- Decks live outside set folders and can reference cards across sets/projects. Source: [Data Model](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/03_data_model_and_csv_schema.md#L21-L52). **Confidence: high.**
- Decks support Main, Sideboard, and Maybeboard; export as grouped text and Cockatrice `.cod`. Sources: [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L83-L86), [Export Targets](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/10_export_targets.md#L33-L49). **Confidence: high.**

#### Gaps

- **Legality and format rules:** Explicitly not V1. Source: [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L83-L87). **Confidence: high.**
- **Stats/playtest:** Competitors expose deck sandbox/playtest/simulation expectations; HBF does not evidence these currently. Sources: [Archidekt](https://archidekt.com/), [TappedOut](https://tappedout.net/mtg-deck-builder/), [ManaBox](https://manabox.app/). **Confidence: medium-high.**
- **Collection availability:** Deckbox-style missing-card and inventory/wishlist linkage is not evidenced as current HBF deck behavior. Source benchmark: [Deckbox](https://deckbox.org/). **Confidence: medium-high.**
- **Search-add flow:** Needs card search across custom and reference catalogs with visible unresolved/ambiguous states. Source: [Local Editor Spec decks](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/08_local_editor_spec.md#L68-L76). **Confidence: high.**

### Collection Manager

#### Current strengths

- Collections are isolated card-reference/list layers separate from authored Cards/Sets and Decks. Source: [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L87-L98). **Confidence: high.**
- Collection rows normalize quantity, card name, set, collector number, Scryfall id, finish, condition, language, location, source row, match strategy, and review status. Source: [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L89-L93). **Confidence: high.**
- Scanner CSV import targets known scanner apps and generic list tools. Source: [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L87-L90). **Confidence: high.**

#### Gaps

- **Native scanner:** Not in scope; scanner CSV import first. Source: [Project Map not-in-slice](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L126-L134). **Confidence: high.**
- **Live pricing/value:** Competitors make pricing central; HBF has no current live market evidence. Sources: [ManaBox](https://manabox.app/), [Dragon Shield](https://www.dragonshield.com/card-manager), [TCGplayer App Store](https://apps.apple.com/us/app/tcgplayer/id1247645833), [Collectr](https://www.getcollectr.com/). **Confidence: medium-high.**
- **Trade/social:** Deckbox/Cardsphere/Dragon Shield provide trading/social collection patterns; HBF should avoid marketplace replication until core import/review is stable. Sources: [Deckbox](https://deckbox.org/), [Cardsphere](https://www.cardsphere.com/), [Dragon Shield](https://www.dragonshield.com/card-manager). **Confidence: high.**
- **Bulk correction:** High priority for quantity/condition/finish/language/location and wrong-variant fixes. Evidence: HBF review rows + TCGplayer app review friction. Sources: [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L87-L97), [TCGplayer App Store](https://apps.apple.com/us/app/tcgplayer/id1247645833). **Confidence: medium-high.**

---

## Standards to adopt

### 3-month track — consistency foundation

1. Shared overlay shell for create/import/export with dirty close, focus return, and consistent state names. Source: [Overlay Plan](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/21_create_import_export_overlay_plan.md#L48-L65). **Confidence: high.**
2. Shared Browse Toolbar contract: search, filters, sort, active chips, reset, count, empty state. Sources: [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L117-L118), [Google Sheets sort/filter](https://support.google.com/docs/answer/3540681). **Confidence: high.**
3. Persistent validation issue drawer by severity. Source: [Validation and Rules Linting](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/14_validation_and_rules_linting.md#L52-L68). **Confidence: high.**
4. Clear unsupported/staged states in Import/Export hubs. Source: [Priority Matrix](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/22_create_import_export_priority_matrix.md#L97-L105). **Confidence: high.**
5. Keyboard/focus smoke checklist for overlays, menus, panels, tabs, and list navigation. Source: [Overlay Plan focus requirements](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/21_create_import_export_overlay_plan.md#L52-L60). **Confidence: high.**

### 6-month track — workflow completeness

1. Collection import review queue with match confidence and bulk corrections.
2. Import/export dry-run reports across cards, decks, sets, collections, and references.
3. Deck intelligence v1: counts, missing refs, duplicate/singleton warnings, color identity estimate, collection availability.
4. Asset-pack health panel: missing roles, license status, layout support, checksum/source metadata.
5. Saved views for repeated filters in Cards, Collections, References, and Decks.

### 12-month track — strategic differentiation

1. Local project package format for moving a full project across machines/playtesters.
2. Print-preflight mode with bleed/crop/safe-zone/watermark profiles.
3. Tabletop Simulator/custom playtest export adapter after Cockatrice stability.
4. Reference-powered design assistant that explains suggestions with source labels and waiver paths.
5. Optional static gallery/share bundle, not a full SaaS backend, unless product owner deliberately changes strategy.

---

## Assumptions

1. Effort scores are product/research-level estimates, not engineering estimates.
2. Priorities assume Homebrew Forge’s near-term value is local creation/export integrity rather than public social growth.
3. Deck legality should begin with lightweight warnings before a full rules engine.
4. Live pricing/trading is treated as future-adapter territory unless product owner reclassifies it as strategic core.
5. Inaccessible or JavaScript-gated competitor pages are not used for detailed feature claims.

## Top-risk notes

- **Risk: feature gravity.** The product can be pulled into card creator, deck site, collection scanner, trading marketplace, print shop, and pro editor at once.
- **Risk: data loss.** Local-first editing requires conflict protection and backups.
- **Risk: legality/IP confusion.** Asset-pack flexibility must be framed carefully.
- **Risk: power-user overload.** Reference/typeahead/lint features need progressive disclosure.
- **Risk: false completeness.** Hubs and menus must not imply unsupported functions are done.

---

## References

- [Homebrew Forge README](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/README.md)
- [Decision Summary](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/00_decision_summary.md)
- [Architecture Overview](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/02_architecture_overview.md)
- [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md)
- [Data Model and CSV Schema](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/03_data_model_and_csv_schema.md)
- [Local Editor Spec](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/08_local_editor_spec.md)
- [Export Targets](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/10_export_targets.md)
- [Importers and Migration](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/12_importers_and_migration.md)
- [Validation and Rules Linting](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/14_validation_and_rules_linting.md)
- [Create, Import, and Export Overlay Plan](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/21_create_import_export_overlay_plan.md)
- [Create, Import, and Export Priority Matrix](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/22_create_import_export_priority_matrix.md)
- [MTG.design](https://mtg.design/)
- [MTG Cardsmith](https://mtgcardsmith.com/)
- [MTGCardBuilder](https://mtgcardbuilder.com/)
- [Archidekt](https://archidekt.com/)
- [TappedOut](https://tappedout.net/mtg-deck-builder/)
- [MTGGoldfish Premium](https://www.mtggoldfish.com/premium)
- [AetherHub](https://aetherhub.com/)
- [ManaBox](https://manabox.app/)
- [Dragon Shield Card Manager](https://www.dragonshield.com/card-manager)
- [TCGplayer App Store](https://apps.apple.com/us/app/tcgplayer/id1247645833)
- [Deckbox](https://deckbox.org/)
- [Cardsphere](https://www.cardsphere.com/)
- [Figma pricing/features](https://www.figma.com/pricing/)
- [Google Sheets sort/filter](https://support.google.com/docs/answer/3540681)
- [Photoshop toolbar help](https://helpx.adobe.com/photoshop/desktop/get-started/set-up-toolbars-panels/customize-the-toolbar.html)
- [Tabletop Simulator custom deck docs](https://kb.tabletopsimulator.com/custom-content/custom-deck/)
- [The Game Crafter](https://www.thegamecrafter.com/)

---

## Top 5 action items

1. Approve one positioning statement and default first-run lane.
2. Freeze shared overlay and browse-toolbar contracts before adding new workspace-specific UI.
3. Build import/export dry-run reports and staged-state copy.
4. Ship collection review queue with match confidence and bulk corrections.
5. Add deck intelligence v1 after deck list/export basics are stable.

## What needs product-owner validation

- Which persona gets the first complete “golden path.”
- Which deck format profile matters first: Commander, casual 60-card, cube/playtest, or custom-only.
- Whether pricing/live market/trading is explicitly out of scope.
- Whether “static share gallery” is an acceptable substitute for community/social features.
- What visual fidelity threshold makes the editor credible for beta.

## What still needs in-editor validation

- Time-to-first-card.
- Import/export comprehension and trust.
- Collection import review speed on real scanner CSVs.
- Keyboard/focus handling in overlays, menus, tabs, and filter dialogs.
- Whether users understand the difference between collection rows, authored cards, deck entries, references, and library assets.

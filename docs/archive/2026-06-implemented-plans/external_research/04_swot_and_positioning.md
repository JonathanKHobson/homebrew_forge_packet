---
status: archived
lane: research
type: research
archived: 2026-06-09
---
> **ARCHIVED 2026-06-09 (implemented-plans sweep)** — original path: `docs/external_research/04_swot_and_positioning.md`
> Reason: implemented planning artifact, archived per Kyle's 2026-06-09 directive (all plans implemented; no live backlog).
> Index: `docs/cowork/02_repo_archive_manifest.md` + `docs/64_repo_cleanup_archive_index.md`.

# 04 SWOT and Positioning Appendix — Homebrew Forge

🗄️ `[status: archived]` `[lane: research]` `[type: research]`

- **Generated date:** 2026-06-08
- **Research horizon:** Repo docs and public product/benchmark sources checked during this pass. Current pricing/features should be verified before public/roadmap claims.
- **Repository freshness caveat:** GitHub may lag local code. The public GitHub URL was inaccessible in normal web browsing during this pass; repo evidence came from GitHub connector access plus owner-provided context. Links may require repo permission.
- **Scope:** External-only SWOT and positioning synthesis. No local files were read, no code was changed, and no hands-on UX test was performed.
- **Confidence summary:** **High** for repo-level facts and broad benchmark-class patterns. **Medium** for positioning implications and strategic opportunity sizing. **Low** for products whose source pages were inaccessible or JavaScript-gated.

## Evidence framing

### Explicit facts

- Homebrew Forge centers local CSV/YAML/JSON, local art, and asset packs as source of truth, while exported images/XML/PDF/ZIP files are generated artifacts. Sources: [README](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/README.md#L3-L23), [Decision Summary](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/00_decision_summary.md#L34-L41). **Confidence: high.**
- The repo includes/plans Cards, Decks, Collections, Sets, Projects, Library, References, Settings, import/export overlays, cross-set decks, collection imports, and local reference catalog workflows. Source: [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L69-L125). **Confidence: high.**
- The repo explicitly avoids copyrighted production frame assets, improper scraping, hidden canonical databases, and counterfeit-like exports. Sources: [README](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/README.md#L33-L43), [Decision Summary](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/00_decision_summary.md#L25-L32), [Codex Master Prompt](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/prompts/codex_master_prompt.md#L110-L118). **Confidence: high.**

### Inferences

- **Inference:** Homebrew Forge should position as “local custom-card production studio” rather than a direct replacement for visual card generators, deck sites, scanner apps, marketplaces, or pro design tools.
- **Inference:** The strongest product defense is cross-lane interoperability: card creation ↔ set/project management ↔ deck/export ↔ collection/reference.
- **Inference:** The highest risk is scope dilution across specialized competitor categories.

---

## Homebrew Forge SWOT

| Strengths | Evidence | Confidence |
|---|---|---|
| Local-first, file-backed source of truth with versionable CSV/YAML/JSON and local assets | [README](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/README.md#L11-L23), [Decision Summary](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/00_decision_summary.md#L34-L41) | High |
| Shared renderer/editor/batch-export architecture reduces duplicate rendering logic | [Architecture Overview](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/02_architecture_overview.md#L78-L88) | High |
| Multi-workflow model: Cards, Decks, Collections, References, Projects/Sets, Library, Settings | [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L69-L125) | High |
| Strong validation architecture: schema, layout, templating, color-pie/design lint, export validation, waivers | [Validation and Rules Linting](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/14_validation_and_rules_linting.md) | High |
| Legal/asset safety designed in: no bundled copyrighted production frames, manifest/license/checksum-driven assets, playtest markings | [README](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/README.md#L33-L43), [Codex Master Prompt](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/prompts/codex_master_prompt.md#L55-L70) | High |
| Cockatrice-oriented custom-set export aligns with a real playtest ecosystem | [Export Targets](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/10_export_targets.md#L23-L49), [Cockatrice](https://cockatrice.github.io/) | High |
| Collection import model preserves uncertain rows rather than silently guessing | [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L87-L97) | High |

| Weaknesses | Evidence | Confidence |
|---|---|---|
| Public repo access was not available during normal web browsing, limiting external auditability | Observed during research; repo connector access required | High |
| Production frame fidelity, showcase/exotic frames, full complex layouts, public sharing/gallery, AI design, and print-shop-ready output are deferred | [Decision Summary](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/00_decision_summary.md#L60-L67) | High |
| Deck V1 intentionally lacks legality, Commander rules, sideboard limits, draw simulation, and collection tracking | [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L83-L87) | High |
| Native scanner/mobile app is not in current slice | [Project Map not-in-slice](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L126-L134) | High |
| Live pricing, portfolio valuation, and trade marketplace features are not evidenced | Benchmark contrast: [ManaBox](https://manabox.app/), [Dragon Shield](https://www.dragonshield.com/card-manager), [Deckbox](https://deckbox.org/), [Cardsphere](https://www.cardsphere.com/) | Medium-high |
| Workflow consistency is a known issue requiring overlay/search/filter standardization | [Overlay Plan](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/21_create_import_export_overlay_plan.md#L24-L38) | High |
| Some requested planning docs were not found on the GitHub default branch during this pass | GitHub connector fetch/search results; verify local branch | Medium-high |

| Opportunities | Evidence | Confidence |
|---|---|---|
| Own the “custom-card production pipeline” niche between quick visual card creators and deck/collection tools | Synthesized from HBF repo scope plus competitor specialization | High |
| Turn import/export into a strategic product surface with dry-runs, review states, and adapters | [Importers and Migration](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/12_importers_and_migration.md), [Export Targets](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/10_export_targets.md) | High |
| Add local project package export/import for share, backup, and playtest handoff | [Overlay Plan future project export](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/21_create_import_export_overlay_plan.md#L174-L183) | High |
| Make reference/rules lint into explainable design assistance | [Project Map reference/power audit](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L108-L114), [Validation and Rules Linting](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/14_validation_and_rules_linting.md) | Medium-high |
| Adopt Figma/Google/Photoshop conventions without full SaaS/pro-tool complexity | [Figma](https://www.figma.com/pricing/), [Google Sheets sort/filter](https://support.google.com/docs/answer/3540681), [Photoshop toolbar help](https://helpx.adobe.com/photoshop/desktop/get-started/set-up-toolbars-panels/customize-the-toolbar.html) | High |
| Expand beyond MTG-style cards into broader TCG/TTRPG/game-card workflows once schema/adapters stabilize | Benchmark analogs: [Card Creator](https://store.steampowered.com/app/523600/Card_Creator/), [Squib](https://github.com/andymeneely/squib), [The Game Crafter](https://www.thegamecrafter.com/) | Medium |

| Threats | Evidence | Confidence |
|---|---|---|
| Specialized tools will remain better at their lanes: quick card visuals, social deck building, mobile scanning, trade marketplaces, pro graphics | Benchmarks: [MTG.design](https://mtg.design/), [Archidekt](https://archidekt.com/), [ManaBox](https://manabox.app/), [Cardsphere](https://www.cardsphere.com/), [Figma](https://www.figma.com/pricing/) | High |
| User expectations from polished card creators can make debug/local-safe frames look unfinished | [MTG Cardsmith](https://mtgcardsmith.com/), [MTGCardBuilder](https://mtgcardbuilder.com/), [HBF deferred frames](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/00_decision_summary.md#L60-L67) | High |
| Local-first model creates data-loss/conflict risks if file change handling is weak | [Local Editor Spec](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/08_local_editor_spec.md#L92-L99) | High |
| Legal/IP misunderstanding could push users toward unsafe asset behavior | [README asset note](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/README.md#L33-L43) | High |
| Scope creep can produce a cluttered UI before any workflow feels complete | [Overlay Plan current problems](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/21_create_import_export_overlay_plan.md#L24-L38) | High |

---

## Benchmark-class SWOTs

### MTG design tools

Representative anchors: [MTG.design](https://mtg.design/), [MTG Cardsmith](https://mtgcardsmith.com/), [MTGCardBuilder](https://mtgcardbuilder.com/), [Magic Set Editor](https://github.com/twanvl/MagicSetEditor2), [MTGNexus Custom Cards](https://mtgnexus.com/customcards/).

| Strengths | Weaknesses |
|---|---|
| Fast first-card creation and immediate visual payoff. | Often siloed around image/card output rather than durable local project data. |
| Strong frame/fidelity and gallery/share expectations. | Deck, collection, reference, and migration workflows are often secondary or absent. |
| Community browsing, duplicate/edit, contests, and social publishing create network effects. | Source-of-truth/version-control and batch validation are generally weaker than HBF’s intended architecture. |
| Magic Set Editor gives a proven offline card/set editor precedent. | Older/offline tools can feel dated relative to modern web editor conventions. |

| Opportunities for HBF | Threats to HBF |
|---|---|
| Offer a modern local set studio that preserves data, validates cards, and exports playtest packages. | Card makers may judge HBF primarily by frame fidelity and speed before appreciating local pipeline value. |
| Import/export from creator tools when safe and user-controlled. | Creator tools can keep users in lightweight, low-friction workflows. |
| Provide local share bundles without building a full social network. | Community platforms have discovery/network advantages HBF will not match early. |

**Confidence:** High for broad patterns; Medium for product-specific hidden feature gaps.

### MTG deck-building tools

Representative anchors: [Moxfield](https://www.moxfield.com/), [Archidekt](https://archidekt.com/), [TappedOut](https://tappedout.net/mtg-deck-builder/), [MTGGoldfish](https://www.mtggoldfish.com/premium), [AetherHub](https://aetherhub.com/), [EDHREC](https://edhrec.com/).

| Strengths | Weaknesses |
|---|---|
| Strong deck-specific UX: search/add, sections, views, tags, compare, sandbox/playtest, social deck pages. | Usually optimized for official card databases, not custom authoring and local custom set packages. |
| Legality, stats, metagame, price, and recommendation workflows are mature in several tools. | Local source control and custom render pipelines are not central. |
| Social discovery and Commander recommendation ecosystems create habit loops. | Moving custom cards/decks/collections across tools can be manual or format-dependent. |

| Opportunities for HBF | Threats to HBF |
|---|---|
| Be the custom-card-aware deck tool that understands homebrew set IDs, Cockatrice packages, collection availability, and reference rows. | Users expect deck intelligence even in early V1. |
| Add lightweight legality/count/missing-card warnings without reproducing full deck-site depth. | Dedicated deck tools will stay better for public deck sharing and meta analysis. |
| Export to deck/playtest systems rather than replace them. | Integrating with external deck tools may require ongoing format maintenance. |

**Confidence:** Medium-high; Moxfield details source-limited.

### Collector/trader tools

Representative anchors: [ManaBox](https://manabox.app/), [Dragon Shield Card Manager](https://www.dragonshield.com/card-manager), [TCGplayer App](https://apps.apple.com/us/app/tcgplayer/id1247645833), [Deckbox](https://deckbox.org/), [Cardsphere](https://www.cardsphere.com/), [Collectr](https://www.getcollectr.com/), [Ludex](https://www.ludex.com/).

| Strengths | Weaknesses |
|---|---|
| Mobile scanning, market price, exact printing, collection value, wishlist/tradelist, and trade workflows are strong category norms. | They rarely support authoring and rendering custom homebrew cards as a local source-of-truth workflow. |
| Scanner and marketplace ecosystems reduce manual entry for official cards. | Live market/pricing dependencies add external-data complexity and licensing/business constraints. |
| Deckbox/Cardsphere-style tags, saved filters, trade tools, and ledger downloads are strong collection workflow references. | Custom/homebrew collection semantics can be awkward in official-card-first systems. |

| Opportunities for HBF | Threats to HBF |
|---|---|
| Ingest scanner CSVs from best-in-class mobile apps and preserve uncertain rows for review. | Users may expect native scanning and live pricing, not just import. |
| Bridge collection rows to authored draft cards with clear copy semantics. | Wrong-variant/quantity/condition imports can undermine trust quickly. |
| Use local tags, saved filters, and binder/list purposes instead of trying to build a marketplace. | Live trade/social features are expensive to maintain and hard to match. |

**Confidence:** High for source-verified tools; Low for Delver Lens specifics due source access.

### General creator/productivity stack

Representative anchors: [Figma](https://www.figma.com/pricing/), [Google Sheets](https://support.google.com/docs/answer/3540681), [Photoshop](https://www.adobe.com/products/photoshop.html), [Component.Studio](https://component.studio/help), [Squib](https://github.com/andymeneely/squib), [The Game Crafter](https://www.thegamecrafter.com/), [Tabletop Simulator](https://store.steampowered.com/app/286160/Tabletop_Simulator/), [Card Creator](https://store.steampowered.com/app/523600/Card_Creator/).

| Strengths | Weaknesses |
|---|---|
| Mature conventions for canvas/inspector, layers, panels, libraries, filters, saved views, export, keyboard shortcuts, and dirty state. | Not Magic-domain-specific and often too broad/complex for HBF’s MVP. |
| Figma and Photoshop prove users can learn powerful editors when controls are stable and discoverable. | Over-copying pro editor patterns can bury the simple card/deck/collection tasks. |
| Google Sheets proves table filters/sort/filter views are familiar to spreadsheet-first users. | Raw spreadsheet mental models can intimidate visual creators if exposed too early. |
| Squib/Card Creator prove data-driven card creation has a market. | Developer-centric or generic-card tools lack HBF’s MTG-specific reference/rules/deck nuance. |

| Opportunities for HBF | Threats to HBF |
|---|---|
| Adopt conventions selectively: Figma for asset packs/libraries, Google for filters, Photoshop for panels/toolbars/export. | Too many pro-editor controls can create cognitive overload. |
| Keep spreadsheet-first data power while making visual workflows primary. | If UI feels like a thin CSV editor, non-technical users may reject it. |
| Export to production/playtest systems rather than replace them. | General creator tools may be “good enough” for non-MTG-specific use cases. |

**Confidence:** High for Figma/Google/Photoshop/Squib/Card Creator; Medium for Component.Studio due partial source access.

---

## Cross-SWOT synthesis

### What Homebrew Forge should defend

1. **Local source-of-truth and versionable data.** This is the strongest positioning difference versus web creators and mobile apps. Sources: [README](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/README.md#L11-L23), [Decision Summary](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/00_decision_summary.md#L34-L41). **Confidence: high.**
2. **Interoperability through explicit import/export, not hidden sync.** Cockatrice, CSV/XML, collection imports, and future adapters are the strategic spine. Sources: [Importers and Migration](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/12_importers_and_migration.md), [Export Targets](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/10_export_targets.md). **Confidence: high.**
3. **Review-first data integrity.** Unresolved rows, validation severities, waivers, and dry-runs should be visible product features. Sources: [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L87-L97), [Validation and Rules Linting](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/14_validation_and_rules_linting.md). **Confidence: high.**
4. **Asset/legal safety.** The product should be proud of safe asset ingestion and playtest markings rather than apologizing for not bundling official-looking frames. Sources: [README](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/README.md#L33-L43), [Codex Master Prompt](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/prompts/codex_master_prompt.md#L55-L70). **Confidence: high.**
5. **Mode boundaries.** Cards/Sets, Decks, Collections, Library, and References must stay distinct in labels, empty states, and copy/link semantics. Source: [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L87-L98). **Confidence: high.**

### What Homebrew Forge should adopt

1. **MTG creator speed:** direct card creation, live preview, visual-first editing. Sources: [MTG.design](https://mtg.design/), [MTG Cardsmith](https://mtgcardsmith.com/). **Confidence: high.**
2. **Deck-builder intelligence:** counts, zones, missing refs, legality hints, collection availability, export confidence. Sources: [Archidekt](https://archidekt.com/), [TappedOut](https://tappedout.net/mtg-deck-builder/), [Deckbox](https://deckbox.org/). **Confidence: medium-high.**
3. **Collector exactness:** exact printing, finish, condition, language, location, source row, match confidence, bulk correction. Sources: [Project Map collection model](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L89-L93), [Dragon Shield](https://www.dragonshield.com/card-manager), [TCGplayer App](https://apps.apple.com/us/app/tcgplayer/id1247645833). **Confidence: high.**
4. **Google-style filter views:** saved views, active chips, reset, result counts. Source: [Google Sheets sort/filter](https://support.google.com/docs/answer/3540681). **Confidence: high.**
5. **Figma-style libraries/components:** asset packs, frame families, reusable reference snippets, status badges. Source: [Figma](https://www.figma.com/pricing/). **Confidence: high.**
6. **Photoshop-style panel ownership:** menu/toolbar/panel/inspector roles should be stable and not duplicate every command. Source: [Photoshop toolbar help](https://helpx.adobe.com/photoshop/desktop/get-started/set-up-toolbars-panels/customize-the-toolbar.html). **Confidence: high.**

### What Homebrew Forge should avoid

1. **Avoid becoming a marketplace.** Export/import trade lists or collection data; do not replicate Cardsphere/Deckbox marketplaces before local workflow trust. Sources: [Cardsphere](https://www.cardsphere.com/), [Deckbox](https://deckbox.org/). **Confidence: high.**
2. **Avoid claiming native scan capabilities.** Say “Import scanner CSV” unless a real scanner exists. Sources: [Project Map not-in-slice](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L126-L134), [ManaBox](https://manabox.app/), [Dragon Shield](https://www.dragonshield.com/card-manager). **Confidence: high.**
3. **Avoid hidden databases and silent sync.** Source-of-truth clarity is central. Source: [Local Editor Spec](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/08_local_editor_spec.md#L77-L90). **Confidence: high.**
4. **Avoid official-frame shortcuts or scraping.** Source: [README asset note](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/README.md#L33-L43). **Confidence: high.**
5. **Avoid fake disabled features.** Staged unsupported states must be explicit. Source: [Priority Matrix stop conditions](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/22_create_import_export_priority_matrix.md#L97-L105). **Confidence: high.**
6. **Avoid overloading novices with pro-editor controls.** Use progressive disclosure: creation overlay first, inspector tabs next, advanced frame/layout controls later. Source: [Overlay Plan creation principle](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/21_create_import_export_overlay_plan.md#L39-L47). **Confidence: high.**

---

## Positioning recommendation

### Recommended positioning statement

**Homebrew Forge is a local-first production studio for custom Magic-style cards, sets, decks, and collection/reference workflows—built around editable source files, validated renders, safe asset packs, and reliable export packages for private playtesting.**

### Why this works

- It does not claim to beat MTG.design or MTGCardBuilder at instant visual card creation.
- It does not claim to beat Archidekt or Moxfield at public deck-site features.
- It does not claim to beat ManaBox, Dragon Shield, or TCGplayer at mobile scanning.
- It does not claim to beat Deckbox or Cardsphere at trading marketplaces.
- It makes Homebrew Forge’s integration and local control the product’s reason to exist.

### Anti-positioning

Do not position as:

- “The best MTG card maker.”
- “The best MTG deck builder.”
- “The best collection scanner.”
- “A marketplace/trading app.”
- “A Photoshop/Figma replacement.”
- “A way to make realistic counterfeits.”

---

## Assumptions

1. SWOTs are product strategy tools, not quantitative market-size estimates.
2. Competitor class strengths are based on public product pages and official docs, not private account testing.
3. Homebrew Forge’s local branch may already address some weaknesses; treat these as validation prompts.
4. “Adopt” means adapt conventions, not clone full feature sets.
5. Public sharing remains intentionally deferred unless product owner changes strategy.

## Top-risk notes

- **Positioning drift:** If messaging tries to be the best at every adjacent category, Homebrew Forge becomes impossible to evaluate.
- **UI drift:** Each workspace can accumulate unique controls unless shared patterns are enforced.
- **Import/export trust:** One bad import or overwrite can permanently damage trust in local source-of-truth.
- **Visual perception:** Users may compare visual fidelity before understanding data/export strength.
- **Compliance clarity:** Safe asset behavior must be product-visible, not hidden in docs.

---

## References

- [Homebrew Forge README](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/README.md)
- [Decision Summary](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/00_decision_summary.md)
- [Architecture Overview](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/02_architecture_overview.md)
- [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md)
- [Local Editor Spec](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/08_local_editor_spec.md)
- [Export Targets](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/10_export_targets.md)
- [Importers and Migration](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/12_importers_and_migration.md)
- [Validation and Rules Linting](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/14_validation_and_rules_linting.md)
- [Create, Import, and Export Overlay Plan](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/21_create_import_export_overlay_plan.md)
- [Create, Import, and Export Priority Matrix](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/22_create_import_export_priority_matrix.md)
- [MTG.design](https://mtg.design/)
- [MTG Cardsmith](https://mtgcardsmith.com/)
- [MTGCardBuilder](https://mtgcardbuilder.com/)
- [Magic Set Editor GitHub](https://github.com/twanvl/MagicSetEditor2)
- [Archidekt](https://archidekt.com/)
- [TappedOut](https://tappedout.net/mtg-deck-builder/)
- [MTGGoldfish Premium](https://www.mtggoldfish.com/premium)
- [AetherHub](https://aetherhub.com/)
- [EDHREC](https://edhrec.com/)
- [ManaBox](https://manabox.app/)
- [Dragon Shield Card Manager](https://www.dragonshield.com/card-manager)
- [TCGplayer App Store](https://apps.apple.com/us/app/tcgplayer/id1247645833)
- [Deckbox](https://deckbox.org/)
- [Cardsphere](https://www.cardsphere.com/)
- [Collectr](https://www.getcollectr.com/)
- [Ludex](https://www.ludex.com/)
- [Figma pricing/features](https://www.figma.com/pricing/)
- [Google Sheets sort/filter](https://support.google.com/docs/answer/3540681)
- [Adobe Photoshop](https://www.adobe.com/products/photoshop.html)
- [Photoshop toolbar help](https://helpx.adobe.com/photoshop/desktop/get-started/set-up-toolbars-panels/customize-the-toolbar.html)
- [Squib GitHub](https://github.com/andymeneely/squib)
- [Card Creator Steam](https://store.steampowered.com/app/523600/Card_Creator/)
- [The Game Crafter](https://www.thegamecrafter.com/)
- [Tabletop Simulator custom deck docs](https://kb.tabletopsimulator.com/custom-content/custom-deck/)

---

## Top 5 action items

1. Use the recommended positioning statement as a roadmap filter.
2. Defend local source-of-truth, import/export integrity, and asset/legal safety.
3. Adopt shared UI conventions from Figma/Google/Photoshop only where they reduce workflow friction.
4. Build interoperability adapters instead of marketplace/social/scanner parity.
5. Validate the first complete cross-lane workflow: create card → validate/render → add to deck → export Cockatrice package → import/review collection context.

## What needs product-owner validation

- Final positioning statement and anti-positioning list.
- Whether public/static sharing is a near-term requirement.
- Whether live pricing/trading is excluded, adapter-only, or strategic.
- Which export/playtest target matters after Cockatrice.
- What level of visual frame fidelity is required to support external beta.

## What still needs in-editor validation

- Whether users understand the local-first value proposition during onboarding.
- Whether workspace boundaries remain clear under real tasks.
- Whether import/export hubs feel like trustworthy product surfaces.
- Whether asset-pack/legal status is understandable to non-technical card makers.
- Whether the UI can support Card Maker, Deck Builder, and Collection Manager without becoming cluttered.

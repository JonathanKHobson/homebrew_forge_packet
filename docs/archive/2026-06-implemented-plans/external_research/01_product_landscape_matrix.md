---
status: archived
lane: research
type: research
archived: 2026-06-09
---
> **ARCHIVED 2026-06-09 (implemented-plans sweep)** — original path: `docs/external_research/01_product_landscape_matrix.md`
> Reason: implemented planning artifact, archived per Kyle's 2026-06-09 directive (all plans implemented; no live backlog).
> Index: `docs/cowork/02_repo_archive_manifest.md` + `docs/64_repo_cleanup_archive_index.md`.

# 01 Product Landscape Matrix — Homebrew Forge

🗄️ `[status: archived]` `[lane: research]` `[type: research]`

- **Generated date:** 2026-06-08
- **Research horizon:** Public product/source pages, app-store pages, GitHub repositories, and Homebrew Forge GitHub docs checked during this pass. Pricing, release state, and app-store claims can change; treat dated claims as “verify before roadmap commitment.”
- **Repository freshness caveat:** The owner states GitHub may be slightly behind local code. The public GitHub URL returned 404 in normal web access during this pass; repository evidence came from a GitHub connector with repo access plus the owner-provided research context. GitHub links may require repo permission.
- **Scope:** External-only landscape and repo-document inference. No local files were read. No implementation changes were run. No hands-on/agent-style usability test was performed.
- **Confidence summary:** **High** for Homebrew Forge repo intent/architecture and official product claims that were directly available. **Medium** for comparative feature ratings derived from public marketing/help pages rather than full account access. **Low** where product pages were JavaScript-gated, inaccessible, or did not expose pricing/feature detail.

## Evidence framing

### Explicit repo facts used

- Homebrew Forge is positioned as a reusable, local, spreadsheet-first Magic-style homebrew card set/deck workflow, with local CSV/art/asset packs as source and generated exports as disposable outputs. Source: [Homebrew Forge README](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/README.md#L3-L23).
- The chosen route is a TypeScript/React + Node CLI app with CSV/JSON/YAML as source of truth, local editor preview, validation, PNG/JPG exports, and Cockatrice package export. Source: [Decision Summary](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/00_decision_summary.md#L9-L58).
- The architecture separates editor, schema/core/render/CLI/assets/importers/exporters/reference/rules-lint packages and uses Scryfall/MTGJSON as optional reference/cache data rather than required rendering dependencies. Source: [Architecture Overview](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/02_architecture_overview.md#L5-L114).
- The current product map includes Cards, Decks, Collections, Sets, Projects, Library, References, Settings, shared import/export overlays, cross-set decks, scanner-CSV collection import, local references, and shared filter overlays. Source: [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L69-L125).

### Inferences used

- **Inference:** Homebrew Forge’s strongest differentiated wedge is not “prettiest web card generator,” “best social deck site,” or “best live-price scanner,” but an interoperable local studio connecting authoring, set/deck export, and collection/reference workflows.
- **Inference:** Product risk increases when Homebrew Forge attempts to match specialized SaaS products feature-for-feature instead of adopting their conventions selectively.
- **Inference:** The highest-leverage near-term UX work is consistency infrastructure: predictable creation overlays, visible search/filter/sort patterns, staged import/export states, and review queues.

## Rating key

- **Strong:** First-class, visible, and central to the product’s core workflow.
- **Partial:** Supported, but limited, secondary, unclear, or dependent on manual/adapter workflows.
- **Missing:** No public evidence of meaningful support, or explicitly out of current scope.
- **Unknown:** Not source-verifiable during this pass.
- **Confidence:** High / Medium / Low based on source quality and whether feature claims came from official docs, app-store pages, public GitHub repos, or inference.

---

## Executive summary

1. **Homebrew Forge’s defensible position is local-first interoperability.** Most benchmark products specialize in one lane: card image creation, deck construction, card inventory, trading, printing, or pro creative editing. Homebrew Forge is unusually broad because it treats local data, card variants, decks, collections, references, asset packs, and exports as one file-backed workspace. Sources: [README](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/README.md#L3-L23), [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L69-L125). **Confidence: high.**

2. **The MTG card-design market optimizes for instant visual output.** MTG.design emphasizes create/save/share and high-quality custom rendering; MTG Cardsmith emphasizes live preview, HD frames, AI image generation, community contests, and prints; MTGCardBuilder emphasizes free editing, many frames, high-resolution output, gallery duplicate/edit, and fast text controls. Sources: [MTG.design](https://mtg.design/), [MTG Cardsmith](https://mtgcardsmith.com/), [MTGCardBuilder](https://mtgcardbuilder.com/). **Confidence: high.**

3. **Homebrew Forge is stronger than typical web card creators on source control, validation, batch export, and migration, but weaker on quick-start delight and visible frame fidelity.** The repo explicitly defers showcase/exotic frames and print-shop-ready outputs while prioritizing file-backed validation and Cockatrice export. Sources: [Decision Summary](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/00_decision_summary.md#L43-L67), [Export Targets](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/10_export_targets.md). **Confidence: high.**

4. **MTG deck builders set expectations that Homebrew Forge does not yet meet in V1:** legality, format helpers, deck stats, search-driven adding, sandbox/playtest views, collection missing-card feedback, and social discovery. Archidekt exposes deck search/sandbox/compare/playtest affordances; TappedOut highlights advanced deck search and inventory matching; MTGGoldfish premium includes tracking, price alerts, collection import, and SuperBrew. Sources: [Archidekt](https://archidekt.com/), [TappedOut deck builder](https://tappedout.net/mtg-deck-builder/), [MTGGoldfish Premium](https://www.mtggoldfish.com/premium). **Confidence: medium-high.**

5. **Collector/trading apps make exact-printing and review workflows table stakes.** ManaBox, Dragon Shield, TCGplayer App, Deckbox, and Cardsphere all emphasize collection/trade/price, scanning/import, and marketplace-style workflows. Homebrew Forge’s scanner-CSV import and unresolved-row review model align with this class, but live pricing/trade matching are not evidenced as current scope. Sources: [ManaBox](https://manabox.app/), [Dragon Shield Card Manager](https://www.dragonshield.com/card-manager), [TCGplayer App Store](https://apps.apple.com/us/app/tcgplayer/id1247645833), [Deckbox](https://deckbox.org/), [Cardsphere](https://www.cardsphere.com/). **Confidence: high.**

6. **General creative/productivity tools provide the convention map Homebrew Forge should copy or adapt.** Figma anchors canvas + inspector + reusable components/libraries; Google Sheets anchors stable sort/filter/filter-view behavior; Photoshop anchors toolbars, panels, layers, save/export, and workspace customization; Component.Studio/Squib anchor data-driven card-generation systems. Sources: [Figma pricing/features](https://www.figma.com/pricing/), [Google Sheets sort/filter help](https://support.google.com/docs/answer/3540681), [Photoshop](https://www.adobe.com/products/photoshop.html), [Photoshop toolbar help](https://helpx.adobe.com/photoshop/desktop/get-started/set-up-toolbars-panels/customize-the-toolbar.html), [Squib GitHub](https://github.com/andymeneely/squib). **Confidence: high.**

7. **The biggest product gap is not one missing feature; it is workflow consistency across modes.** The repo already identifies inconsistent plus-button behavior and splits between create/edit/browse/inspect/import/export, then proposes shared overlay contracts and phased implementation. Source: [Create/Import/Export Overlay Plan](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/21_create_import_export_overlay_plan.md#L24-L65). **Confidence: high.**

8. **Import/export is the strategic spine.** Competitors win by reducing friction inside their lane; Homebrew Forge can win by moving cards, decks, collections, references, and assets between lanes with explicit source, validation, and review states. Sources: [Importers and Migration](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/12_importers_and_migration.md), [Export Targets](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/10_export_targets.md). **Confidence: high.**

9. **Avoid pricing/feature overclaiming.** Several competitor pages expose free/premium affordances without complete tier detail, and some pages were inaccessible or JavaScript-gated. These are marked “Unknown / verify.” **Confidence: high.**

---

## Research set used

### MTG-specific / MTG-adjacent products profiled: 20 rows including Homebrew Forge baseline

| App | Category | Source link | Source quality | Confidence |
|---|---|---:|---|---|
| Homebrew Forge | Baseline / local MTG studio | [README](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/README.md), [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md) | Repo docs via connector | High |
| MTG.design | MTG card design | [Official site](https://mtg.design/) | Official page | High |
| MTG Cardsmith | MTG card design/community/prints | [Official site](https://mtgcardsmith.com/) | Official page | High |
| MTGCardBuilder | MTG card design/community | [Official site](https://mtgcardbuilder.com/) | Official page | High |
| Card Conjurer | MTG card design | Source unavailable during pass / verify | Inaccessible / uncertain official source | Low |
| Magic Set Editor | Offline TCG card/set editor | [GitHub repo](https://github.com/twanvl/MagicSetEditor2) | Public GitHub | Medium-high |
| MTGNexus Custom Cards | MTG custom card/set community | [Custom Cards area](https://mtgnexus.com/customcards/) | Public site, partial fetch | Medium |
| Cockatrice | Open tabletop/card-game client | [Official site](https://cockatrice.github.io/) | Official page | High |
| Moxfield | MTG deck builder | [Official site](https://www.moxfield.com/) | JS-gated / limited text | Low-medium |
| Archidekt | MTG deck builder | [Official site](https://archidekt.com/) | Official page | High |
| TappedOut | MTG deck builder/community | [Deck builder](https://tappedout.net/mtg-deck-builder/) | Official page | High |
| MTGGoldfish | Deck/meta/price/collection | [Premium page](https://www.mtggoldfish.com/premium) | Official page | High |
| AetherHub | Decks, collection, database, MTGA tools | [Official site](https://aetherhub.com/) | Official page | Medium-high |
| EDHREC | Commander recommendation/meta | [Official site](https://edhrec.com/) | Official page | High |
| ManaBox | MTG mobile scanner/deck/collection | [Official site](https://manabox.app/) | Official page | High |
| Dragon Shield Card Manager | TCG scanner/collection/social | [Official site](https://www.dragonshield.com/card-manager) | Official page | High |
| Delver Lens | MTG scanner/collection/export | [Official site](https://delverlab.com/) | Source inaccessible during pass | Low |
| TCGplayer App | Scanner/collection/marketplace | [App Store listing](https://apps.apple.com/us/app/tcgplayer/id1247645833) | App-store page + public reviews | Medium-high |
| Deckbox | Collection/deck/trading | [Official site](https://deckbox.org/), [Premium](https://deckbox.org/premium) | Official pages | High |
| Cardsphere | MTG trading marketplace | [Official site](https://www.cardsphere.com/), [Premium](https://www.cardsphere.com/premium) | Official pages | High |

### General / design / trading / production archetypes profiled: 10 rows

| App | Category | Source link | Source quality | Confidence |
|---|---|---:|---|---|
| Figma | Design/collaboration/pro editor anchor | [Pricing/features](https://www.figma.com/pricing/) | Official page | High |
| Google Sheets | Spreadsheet productivity anchor | [Sort/filter help](https://support.google.com/docs/answer/3540681), [FILTER function](https://support.google.com/docs/answer/3093197) | Official docs | High |
| Adobe Photoshop | Photoshop-style pro editor anchor | [Product page](https://www.adobe.com/products/photoshop.html), [Toolbar help](https://helpx.adobe.com/photoshop/desktop/get-started/set-up-toolbars-panels/customize-the-toolbar.html) | Official pages | High |
| Component.Studio | Data-driven game card creator | [Help](https://component.studio/help), [FAQ](https://component.studio/faq) | Official pages, partial fetch | Medium |
| The Game Crafter | Print-on-demand game production | [Official site](https://www.thegamecrafter.com/) | Official page | High |
| Squib | Programmatic card-game prototyping | [GitHub repo](https://github.com/andymeneely/squib) | Public GitHub | High |
| Tabletop Simulator | Playtest/simulation/custom deck export target | [Steam](https://store.steampowered.com/app/286160/Tabletop_Simulator/), [Custom deck docs](https://kb.tabletopsimulator.com/custom-content/custom-deck/) | Official/Steam/docs | High |
| Collectr | TCG/sports portfolio tracker | [Official site](https://www.getcollectr.com/) | Official page | Medium |
| Ludex | Sports/TCG scanner + price guide | [Official site](https://www.ludex.com/) | Official page | Medium-high |
| Card Creator | General card editor | [Steam listing](https://store.steampowered.com/app/523600/Card_Creator/) | Steam product page | High |

---

## App-by-app profile

| App | Segment | Core workflow coverage | Pricing model | Strengths vs Homebrew Forge | Limitations / Homebrew Forge opportunity | Confidence |
|---|---|---|---|---|---|---|
| Homebrew Forge | Card Maker / Deck Builder / Collection Manager / Full Studio | Local card authoring, sets/projects, decklists, collection import, references, validation, renderer/export pipeline | Not a commercial product in repo; Unknown / verify | Local source-of-truth, versionable data, validation, asset-pack policy, Cockatrice export | Must earn usability trust; less quick visual delight than web card creators; no live market/trading/scanning app evidenced | High |
| MTG.design | Casual/custom card creators | Browser custom card creation, account save, share/export | Free/open beta + Patreon; exact paid tier Unknown / verify | Fast browser creation; save/share; high-quality renderer | Not positioned as local file-backed set/deck/collection pipeline | High |
| MTG Cardsmith | Casual/community creators | Live card editor, HD frames, AI image, gallery/contests, print ordering | Free card design; premium link; exact premium details Unknown / verify | Strong community/gallery/print loop | Less evidence of local source control, schemas, deck/collection integration | High |
| MTGCardBuilder | Casual/proxy creators | Free editor, many frames, high DPI, duplicate/edit gallery, set symbol controls | Free editor; premium link; exact tier Unknown / verify | Strong visual customization and print-resolution promise | Less evidence of deck/collection/source-data workflows | High |
| Card Conjurer | MTG card creators | Custom MTG card editor historically associated with advanced frame options | Unknown / verify | Important category memory among users | Official/current source not verified in this pass; do not assume availability/features | Low |
| Magic Set Editor | Offline card/set creators | Desktop program for trading-card design, image/export, set editing | Free/open-source evidence via GitHub; verify current distributions | Offline set-editor precedent; export-oriented workflow | Older UX/tech; not modern React/local-file studio; deck/collection workflow unclear | Medium-high |
| MTGNexus Custom Cards | Community designers | Browse/search custom cards and sets, creator/community pages | Free/community; Unknown / verify | Strong community and discovery layer | Not a local authoring/export/collection pipeline | Medium |
| Cockatrice | Players/playtesters/custom-set users | Cross-platform card-game client, deck import/build/playtest, custom XML/image packages | Free/open-source | High-value export target; supports playtesting custom card packages | Not a card creator or collection manager | High |
| Moxfield | Deck builders | Modern web deck builder, deck sharing/community | Free/Unknown premium details from accessible source | Strong deck UX expectation anchor | Source page text limited; custom-card/local pipeline unclear | Low-medium |
| Archidekt | Deck builders | Deck search, deck pages, sandbox, compare, playtest/open actions, commander/deck browsing | Free with Patreon/support signals; exact paid tier Unknown / verify | Strong deck browsing and deck interaction conventions | Not custom-card authoring/source package tool | High |
| TappedOut | Deck builders/community | Deck builder, advanced deck search, formats, inventory match, deck creation/import | Free + subscriptions/ads Unknown / verify | Deep community deck-building expectations | Less local data ownership; custom-card source workflow unclear | High |
| MTGGoldfish | Meta/price/deck/collection users | Decks, price deck, collection tracking, premium tools, SuperBrew, alerts | Premium page says $6/month; free content also present | Strong price/meta/collection intelligence | Not custom card authoring; external service dependency | High |
| AetherHub | Deck/database/collection/MTGA users | Decks, builder, metagame, draft trainer, binder/collection, database, MTGA assistant | Free/Unknown paid details | Broad MTG workflow hub | Not local custom-card pipeline | Medium-high |
| EDHREC | Commander deckbuilders | Commander/card recommendation and trend/meta discovery | Free/ads/Unknown premium if any | Strong recommendation/data patterns | Not an authoring/editor/export tool | High |
| ManaBox | Mobile MTG users | Card database/search, scanner, collection, deck builder, prices, trade fairness, rules | Free app; in-app purchase details Unknown / verify | Excellent mobile collection/deck/search expectations | Not custom homebrew authoring/local render pipeline | High |
| Dragon Shield Card Manager | TCG collectors/traders | Scan/translate, track collection value, friends/share collections/wishlists/tradelists, news | Free download/use with some in-app purchases | Strong scanner, social collection/trade expectations | Not local custom card production | High |
| Delver Lens | MTG collectors | Scanner, collection, export/import into other services | Unknown / verify due source access issues | Strong scanner/export category anchor | Feature claims require verification; not an authoring studio | Low |
| TCGplayer App | Sellers/collectors | Scan cards, track market prices, access collection, list/shop | Free app per listing; marketplace economics external | Real-world scanner and seller workflow evidence; app reviews expose friction patterns | Not custom card authoring; scanner friction is warning for HBF imports | Medium-high |
| Deckbox | Collectors/traders/deckbuilders | Inventory, tradelist, wishlist, spreadsheet import, trading, deckbuilder, missing-card workflows | Free + premium; premium page shows $47.88/year or $5.99/month | Strong exact-card collection/trade/deck bridge | Not local custom card renderer; trade/pricing scope may be too large for HBF | High |
| Cardsphere | MTG traders | Trade marketplace, wants/haves, tags, ledger downloads, private trade mode | Premium page says $6/month or less | Strong trading specialization | HBF should integrate/export, not replicate marketplace | High |
| Figma | Pro creator teams | Canvas, layers, components, libraries, variables, asset export, comments, branching | Free Starter; paid seats published | Best convention anchor for reusable components/assets and inspector/canvas patterns | Too broad/collaborative for HBF MVP; adapt selectively | High |
| Google Sheets | Spreadsheet users | Sort/filter/filter views, formulas, shared spreadsheet workflows | Free/Workspace; exact plan not needed | Best anchor for table/list manipulation, visible filters, saved filter views | Not domain-specific; HBF should keep spreadsheet familiarity without exposing raw CSV everywhere | High |
| Photoshop | Pro creative editors | Toolbars, panels, image manipulation, layers, save/export, workspaces | Published Photoshop plan pricing available; verify at purchase time | Best anchor for pro-editor panels/tools/export expectations | Too complex for HBF; avoid overloading novice workflows | High |
| Component.Studio | Board/card-game designers | Templates, image manager, templating language, style tags, data-driven creation | FAQ source partially accessible; prior public pricing needs verify | Useful card-template/data-driven reference | Feature/pricing claims should be verified before use | Medium |
| The Game Crafter | Board/card-game producers | Upload artwork/rules, choose parts/box, buy one copy, self-publish | Print-on-demand; per-product pricing varies | Print-production workflow anchor | Not an editor; HBF can export to print-ready handoff later | High |
| Squib | Technical card-game designers | Ruby DSL, CSV/XLSX data, YAML layouts, PNG/PDF/SVG output | Open-source | Strong data-driven generation analogy to HBF | Developer-centric; not casual UI | High |
| Tabletop Simulator | Playtesters | Custom decks, Workshop, custom assets, multiplayer sandbox | Steam price shown on product page; verify current local currency | Good future export/playtest target | Not an authoring/data-quality system | High |
| Collectr | Collectors/investors | Portfolio tracking, value trends, multi-category collecting | Free/Unknown monetization from source | Portfolio/value UX anchor | Not custom authoring; price data dependency risk | Medium |
| Ludex | Collectors/scanners | Scan/manage/buy/sell/trends, price guide | Free scans claim; monetization details Unknown / verify | Scanner/value expectation anchor | Not custom authoring; source claims need validation | Medium-high |
| Card Creator | Game designers/fans | WYSIWYG card editor, templates/blueprints, collection management, Excel/CSV import/export, print-and-play PDF/PNG/JPG | Steam listing shows one-time price; verify current sale/currency | Strong general-card editor benchmark with data import/export | Not MTG-domain-specific; reviews are mixed | High |

---

## Feature matrix

### MTG card design and custom-card anchors

| App | Category | User segment | Pricing | Card workflow depth | Set/project context | Deck/collection support | Import/export breadth | Search/filter/sort consistency | UX convention quality | Standards alignment | Homebrew Forge gaps |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Homebrew Forge | Baseline / local studio | Card Maker + deck/collection hybrid | Unknown / verify | **Strong** — schema-backed authoring, live preview, renderer/export pipeline | **Strong** — projects, sets, card variants, ungrouped holding set evidenced | **Partial** — decks/collections present; legality/price/trade not V1 | **Strong** — CSV/XML/Cockatrice/image/deck/collection export planned/evidenced | **Partial** — shared filters planned; consistency still a product risk | **Partial** — menus/overlays/panels planned; needs in-editor validation | **Partial** — aligns with desktop/productivity patterns but not yet benchmark-proven | Must prove low-friction first-card flow, visual fidelity, and consistent controls |
| MTG.design | MTG design anchor | Casual/custom card creators | Free/open beta + Patreon; exact paid features Unknown / verify | **Strong** — create/save/share, high-quality custom renderer | **Partial** — account-saved cards/community; set/project depth Unknown | **Missing** — no public deck/collection focus | **Partial** — export locally/share; import breadth Unknown | **Partial** — browse/share; detailed filter controls Unknown | **Strong** — low-cognitive-load browser creator | **Partial** — web app conventions; less spreadsheet/pro editor | HBF lacks same instant browser/mobile creation and public sharing polish |
| MTG Cardsmith | MTG design/community | Casual/community creators | Free design; premium/print commerce; exact premium Unknown / verify | **Strong** — live editor, HD frames, AI image, print ordering | **Partial** — gallery/community; set/project data Unknown | **Missing** — no evidence of deck/collection core | **Partial** — print/order/share; structured import Unknown | **Partial** — gallery/popular/recent; filters Unknown | **Strong** — creator/gallery loop | **Partial** — community web conventions more than pro editor | HBF weaker on gallery/contest/print-commerce delight |
| MTGCardBuilder | MTG design/community | Casual/proxy designers | Free editor; premium Unknown / verify | **Strong** — many frame controls, text controls, 1200 DPI claim | **Partial** — gallery duplicate/edit; set project depth Unknown | **Missing** — no evidence of deck/collection core | **Partial** — image output implied; structured export Unknown | **Partial** — gallery; controls present | **Strong** — direct manipulation and fast edit controls | **Partial** — web creator conventions | HBF must close perceived frame/fidelity and quick-edit gap |
| Card Conjurer | MTG design | Custom-card power users | Unknown / verify | **Unknown** — source unavailable during pass | **Unknown** | **Unknown** | **Unknown** | **Unknown** | **Unknown** | **Unknown** | Treat as competitive memory; verify before making claims |
| Magic Set Editor | Offline card/set editor | Power users / set creators | Free/open-source evidence; verify packaging | **Strong** — desktop trading-card design/export precedent | **Strong** — set-file mental model | **Partial** — export formats; deck/collection unclear | **Strong** — images, HTML, Apprentice/Lackey evidence | **Partial** — older desktop conventions | **Partial** — established but older UX | **Partial** — desktop editor but not modern Figma/Google patterns | HBF can modernize MSE-like local power without inheriting old UX |
| MTGNexus Custom Cards | Community creator/browse | Community designers | Unknown / verify | **Partial** — custom card/set community | **Partial** — custom sets/cycles/browse | **Partial** — collection tracker site area exists; integration Unknown | **Unknown** | **Partial** — browse/search pages | **Partial** — forum/community conventions | **Missing** — not pro editor/productivity anchor | HBF lacks public community discovery by design; export/share can compensate |

### MTG deck, playtest, reference, and meta anchors

| App | Category | User segment | Pricing | Card workflow depth | Set/project context | Deck/collection support | Import/export breadth | Search/filter/sort consistency | UX convention quality | Standards alignment | Homebrew Forge gaps |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Cockatrice | Playtest/client | Multiplayer/playtest/custom set users | Free/open-source | **Missing** — not authoring-focused | **Partial** — custom set XML/image package model | **Strong** — deck import/build/playtest | **Strong** — custom XML/images/deck import target | **Partial** — deck/card database search | **Partial** — desktop Qt/card-game client conventions | **Partial** — open-source desktop app, not modern creator UI | HBF already targets Cockatrice; should preserve package quality and diagnostics |
| Moxfield | Deck builder | Deckbuilders/social | Free/Unknown paid features | **Missing** — official deck focus | **Partial** — decks/folders/tags Unknown from source | **Strong** — deck builder core | **Partial** — deck import/export likely; verify exact formats | **Unknown** — source limited | **Strong** — modern web deck-builder reputation, source-limited | **Partial** | HBF needs deck UI quality and import/export parity before claiming deck-builder competitiveness |
| Archidekt | Deck builder | Deckbuilders/Commander | Free + support/Unknown paid tiers | **Missing** | **Partial** — decks, tags, commanders | **Strong** — deck browsing, sandbox, compare/playtest actions | **Partial** — import/export likely; verify exact formats | **Strong** — deck search/browse conventions visible | **Strong** — deck-specific interactions | **Partial** — web productivity within deck lane | HBF lacks legality/stats/playtest/sandbox expectations |
| TappedOut | Deck builder/community | Deckbuilders/community | Unknown / verify | **Missing** | **Partial** — decks by format/tags | **Strong** — deck builder, inventory matching, formats | **Partial** — paste deck/create sealed; exact export verify | **Strong** — advanced deck search called out | **Partial** — mature community conventions | **Partial** | HBF needs advanced deck search and inventory-aware deck building |
| MTGGoldfish | Meta/price/deck/collection | Deckbuilders, finance-aware collectors | Free + Premium $6/mo page | **Missing** | **Partial** — decks/metagame/events | **Strong** — deck/price/collection tracking | **Strong** — price deck, collection import, downloads in premium | **Strong** — cards/decks/tools navigation | **Strong** — data-heavy MTG conventions | **Partial** | HBF should not replicate price/meta; can import/export and display source labels |
| AetherHub | Deck/database/collection/MTGA | Deckbuilders, Arena users | Unknown / verify | **Missing** | **Partial** — user decks, deck writeups, database | **Strong** — deck builder + collection/binder areas | **Partial** — converter/apps visible; exact breadth verify | **Strong** — navigation across database/decks/collection | **Partial** — broad MTG web portal | **Partial** | HBF needs clearer mode-switching to avoid portal-like sprawl |
| EDHREC | Commander recommendations | Commander players | Unknown / verify | **Missing** | **Partial** — commander/set/tag/data pages | **Partial** — recommendations; no collection manager core evidenced | **Missing** — not export-focused | **Strong** — commander/card/category browsing | **Strong** — recommendation discovery model | **Partial** | HBF can adopt recommendation explainability without becoming a meta site |

### MTG/TCG collection and trading anchors

| App | Category | User segment | Pricing | Card workflow depth | Set/project context | Deck/collection support | Import/export breadth | Search/filter/sort consistency | UX convention quality | Standards alignment | Homebrew Forge gaps |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ManaBox | MTG mobile suite | Mobile deck/collection users | Free app; paid details Unknown / verify | **Missing** — official-card tool, not custom authoring | **Partial** — decks/collections, not authoring projects | **Strong** — scanner, deck builder, collection, prices/trade fairness | **Partial** — app export/import likely; verify exact formats | **Strong** — offline search/filter claims | **Strong** — mobile collection/deck conventions | **Partial** — mobile-first not desktop editor | HBF lacks native scanning, mobile UX, live market/trade depth |
| Dragon Shield Card Manager | TCG collection/social | TCG collectors/traders | Free download/use + in-app purchases | **Missing** | **Partial** — collections/wishlists/tradelists/social | **Strong** — scan/translate/value/friends/share/trade lists | **Partial** — app workflows; structured export Unknown | **Partial** — scanner/social browse; detailed filters Unknown | **Strong** — mobile scanner/social collection | **Partial** | HBF should import scanner CSV, not imply native scan/social parity |
| Delver Lens | MTG scanner/collection | MTG collectors | Unknown / verify | **Missing** | **Missing** | **Strong** — category reputation for scan/collection/export; source not verified | **Unknown** — source inaccessible | **Unknown** | **Unknown** | **Unknown** | Treat as import-source target only after source verification |
| TCGplayer App | Scanner/marketplace | Sellers/collectors | Free app listing | **Missing** | **Missing** | **Strong** — scan cards, market prices, collection/shop access | **Partial** — marketplace/list workflows; export specifics verify | **Partial** — app-store reviews mention search/list management friction | **Partial** — seller workflow specialized | **Partial** | HBF import review should prevent wrong-variant and quantity friction |
| Deckbox | Collection/deck/trade | Collectors, deckbuilders, traders | Free + premium $47.88/year or $5.99/month page | **Missing** | **Partial** — decks/inventory folders/tags | **Strong** — inventory, tradelist, wishlist, trading, deck missing-card workflows | **Strong** — spreadsheet import/paste, downloads/premium tools | **Strong** — browse/sort/filter and saved filters/premium tags | **Strong** — collection/trade workflow conventions | **Partial** | HBF lacks live trade/missing-card automation; should copy exact-printing and saved-filter patterns |
| Cardsphere | Trading marketplace | MTG traders | Premium $6/month or less page; core trade model verify | **Missing** | **Missing** | **Strong** — trade marketplace/wants/haves/tags/private trade/ledger downloads | **Partial** — text importer/CSV ledger downloads | **Partial** — marketplace filters/tags | **Strong** — trade-specific conventions | **Missing** | HBF should avoid becoming marketplace; export compatible trade lists instead |

### General/design/trading archetypes

| App | Category | User segment | Pricing | Card workflow depth | Set/project context | Deck/collection support | Import/export breadth | Search/filter/sort consistency | UX convention quality | Standards alignment | Homebrew Forge gaps |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Figma | Figma-like convention anchor | Designers/teams | Free Starter; Professional/Org/Enterprise seat pricing published | **Partial** — not card-specific; strong visual object editing | **Strong** — files/projects/libraries/components | **Missing** | **Strong** — asset export/plugins/dev handoff | **Partial** — layers/assets search; not spreadsheet filters | **Strong** — canvas/inspector/layers/prototype overlays | **Strong** | HBF should adopt reusable asset-pack/library and inspector conventions without collaboration sprawl |
| Google Sheets | Google-style productivity anchor | Spreadsheet/data users | Free/Workspace; exact Workspace not needed | **Missing** | **Partial** — spreadsheets/workbooks metaphor | **Partial** — lists/tables, not domain deck/collection | **Strong** — CSV-friendly mental model | **Strong** — sort/filter/filter views are core docs | **Strong** — table manipulation conventions | **Strong** | HBF should make CSV-backed data feel familiar while hiding raw complexity |
| Adobe Photoshop | Photoshop-style pro editor anchor | Creative professionals | Photoshop plan pricing published; verify at purchase | **Partial** — image/layout editing, not card domain | **Partial** — workspaces/libraries/files | **Missing** | **Strong** — save/export/workspace tooling | **Partial** — layers/panels not spreadsheet filtering | **Strong** — toolbar/panels/layers/workspaces | **Strong** | HBF should adopt tool/panel/export conventions but avoid Photoshop-level overload |
| Component.Studio | Data-driven card creator | Board/card designers | Unknown / verify | **Strong** — templates, images, text layers, variables, style tags | **Partial** — projects/templates | **Missing** | **Partial** — card design generation; exact export verify | **Partial** | **Partial** — creator-specific but source-limited | **Partial** | HBF can beat it on MTG-domain validation and local repo workflow |
| The Game Crafter | Print production | Game creators/publishers | Per-product print pricing; no minimum-order claim needs quote verification at checkout | **Partial** — upload art/rules, not editor core | **Partial** — game/project production | **Missing** | **Strong** — production/print handoff | **Missing** | **Strong** — production checkout conventions | **Partial** | HBF should prepare clean print handoffs, not become POD storefront |
| Squib | Programmatic card generator | Technical game designers | Open-source | **Strong** — data-driven card generation DSL | **Partial** — project folders/YAML layouts | **Missing** | **Strong** — CSV/XLSX input, PNG/PDF/SVG output | **Missing** — code/data tool | **Partial** — developer conventions | **Partial** | HBF should preserve data-driven power while adding friendly UI |
| Tabletop Simulator | Playtest/simulation | Tabletop playtesters | Steam product price visible; verify local sale/currency | **Missing** — not authoring | **Partial** — custom objects/decks | **Strong** — playtest/multiplayer sandbox | **Strong** — custom deck sheets/assets | **Partial** — object browser/workshop | **Partial** — simulation conventions | **Partial** | HBF opportunity: export card sheets/assets for TTS later |
| Collectr | Portfolio tracker | Collectors/investors | Unknown / verify | **Missing** | **Missing** | **Strong** — portfolio/value trend tracking | **Partial** — API/product details; export unknown | **Partial** — product search/value dashboards | **Strong** — portfolio/valuation conventions | **Partial** | HBF should avoid live valuation unless source/license stable |
| Ludex | Scanner/price guide | Sports/TCG collectors | Free scans claim; monetization Unknown / verify | **Missing** | **Missing** | **Strong** — scan/manage/buy/sell/trends | **Partial** — export unknown | **Partial** | **Strong** — scanner/price conventions | **Partial** | HBF should label scanner CSV import clearly and avoid native-scan promises |
| Card Creator | General game card editor | Game designers/fans | Steam one-time purchase visible; verify current price | **Strong** — WYSIWYG, blueprints/templates, import/export Excel/CSV | **Partial** — collection/project management | **Partial** — collection management but not MTG deck legality | **Strong** — Excel/CSV/JSON/PNG/JPG/PDF print-and-play | **Partial** — editor/library UX; exact filters verify | **Strong** — general card-editor conventions | **Partial** | HBF can differentiate via MTG domain, local schemas, validation, Cockatrice/custom-set exports |

---

## Open conventions list

### Copy directly

1. **Create/edit separation.** Keep plus buttons focused on creation overlays, not accidental blank objects. Source: [Homebrew Forge overlay plan](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/21_create_import_export_overlay_plan.md#L39-L65). **Confidence: high.**
2. **Visible dirty state and focus return for overlays.** Preserve Escape behavior, dirty-close confirmation, and return focus to the triggering control. Source: [Overlay contract](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/21_create_import_export_overlay_plan.md#L48-L65). **Confidence: high.**
3. **Always-visible search/filter/sort in browse/list workspaces.** Google Sheets makes sort/filter/filter views explicit and reusable; Deckbox and ManaBox reinforce collection/deck list filtering expectations. Sources: [Google Sheets sort/filter](https://support.google.com/docs/answer/3540681), [Deckbox](https://deckbox.org/), [ManaBox](https://manabox.app/). **Confidence: high.**
4. **Explicit review states for uncertain imports.** Homebrew Forge already preserves unresolved collection rows with `needs_review`; this should become a first-class UI queue. Source: [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L87-L97). **Confidence: high.**
5. **Entity-aware File > Import and File > Export hubs.** Keep broad hubs, but label supported/staged options honestly. Source: [Overlay plan](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/21_create_import_export_overlay_plan.md#L123-L183). **Confidence: high.**
6. **Source/license/checksum asset metadata.** Homebrew Forge should keep asset safety visible rather than buried. Sources: [README asset note](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/README.md#L33-L43), [Codex master prompt](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/prompts/codex_master_prompt.md#L55-L70). **Confidence: high.**

### Adapt

1. **Figma components/libraries → asset packs, frame families, symbol packs, reference snippets.** Do not copy Figma collaboration scope; copy reusable-component clarity. Source: [Figma features](https://www.figma.com/pricing/). **Confidence: high.**
2. **Google Sheets filter views → saved browse presets for Cards, Decks, Collections, References.** Store as local settings/project metadata. Source: [Google Sheets filter views](https://support.google.com/docs/answer/3540681). **Confidence: high.**
3. **Photoshop panels/workspaces → Card / Frame / Layout / Preview inspectors.** Keep panel behavior predictable without adding pro-editor overload. Sources: [Photoshop product](https://www.adobe.com/products/photoshop.html), [Photoshop toolbar/panel help](https://helpx.adobe.com/photoshop/desktop/get-started/set-up-toolbars-panels/customize-the-toolbar.html). **Confidence: high.**
4. **Deckbox inventory/wishlist/tradelist patterns → local collection purposes and missing-card views.** Do not replicate marketplace trading; copy exact-printing and saved-filter rigor. Sources: [Deckbox](https://deckbox.org/), [Deckbox Premium](https://deckbox.org/premium). **Confidence: high.**
5. **Card Creator and Squib data-driven creation → schema-backed template/generation workflow.** Use HBF’s MTG-specific validation to make data-driven creation approachable. Sources: [Card Creator Steam](https://store.steampowered.com/app/523600/Card_Creator/), [Squib GitHub](https://github.com/andymeneely/squib). **Confidence: high.**
6. **Tabletop Simulator custom-deck export → later adapter, not MVP core.** Source: [TTS custom deck docs](https://kb.tabletopsimulator.com/custom-content/custom-deck/). **Confidence: high.**

### Avoid

1. **Do not fake unsupported importer/exporter flows.** Staged states are safer than “button to nowhere.” Source: [Priority matrix stop conditions](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/22_create_import_export_priority_matrix.md#L97-L105). **Confidence: high.**
2. **Do not embed copyrighted official frames/assets or scrape without explicit permission.** Source: [README asset note](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/README.md#L33-L43). **Confidence: high.**
3. **Do not compete head-on with mobile scanner/marketplace apps until the local pipeline is stable.** ManaBox, Dragon Shield, TCGplayer, Deckbox, and Cardsphere are specialized in those workflows. Sources: [ManaBox](https://manabox.app/), [Dragon Shield](https://www.dragonshield.com/card-manager), [TCGplayer App](https://apps.apple.com/us/app/tcgplayer/id1247645833), [Deckbox](https://deckbox.org/), [Cardsphere](https://www.cardsphere.com/). **Confidence: high.**
4. **Do not turn every advanced validator into a modal warning.** Use error/warning/note/ignored severities and waivers. Source: [Validation and Rules Linting](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/14_validation_and_rules_linting.md#L52-L68). **Confidence: high.**
5. **Do not make a hidden canonical database.** The product promise depends on files as source of truth. Sources: [Decision Summary](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/00_decision_summary.md#L34-L41), [Local Editor Spec](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/08_local_editor_spec.md#L77-L90). **Confidence: high.**

---

## Where Homebrew Forge is currently strong / weak

### Strong

- **Local source-of-truth:** CSV/YAML/JSON, local art, and asset manifests are explicit canonical data rather than hidden app state. Sources: [README](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/README.md#L11-L23), [Decision Summary](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/00_decision_summary.md#L34-L41). **Confidence: high.**
- **Architecture fit:** A shared React/SVG renderer powering both editor preview and batch export reduces duplicate rendering logic. Source: [Architecture Overview](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/02_architecture_overview.md#L78-L88). **Confidence: high.**
- **Interoperability:** Current/planned exports include PNG/JPG/WebP, Cockatrice XML/images/ZIP, deck text, deck `.cod`, collection CSV/text/`.cod`, and future print/web/TTS-style targets. Source: [Export Targets](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/10_export_targets.md). **Confidence: high.**
- **Data quality:** Zod validation, cross-record checks, layout validation, rules text lint, color-pie/design lint, export validation, and waivers are explicitly specified. Source: [Validation and Rules Linting](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/14_validation_and_rules_linting.md). **Confidence: high.**
- **Legal/asset discipline:** The repo avoids copyrighted production frame assets and makes asset ingestion manifest/license/checksum-driven. Sources: [README](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/README.md#L33-L43), [Codex Master Prompt](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/prompts/codex_master_prompt.md#L55-L70). **Confidence: high.**
- **Multi-workflow model:** Cards, decks, collections, references, projects, sets, and library assets are modeled as distinct surfaces, not collapsed into one ambiguous list. Source: [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L80-L125). **Confidence: high.**

### Weak

- **Perceived visual polish risk:** Competitors lead with polished frames, gallery sharing, and print claims; Homebrew Forge explicitly defers production frame fidelity and exotic frames. Sources: [MTG Cardsmith](https://mtgcardsmith.com/), [MTGCardBuilder](https://mtgcardbuilder.com/), [Decision Summary](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/00_decision_summary.md#L60-L67). **Confidence: high.**
- **Deck-builder gap:** V1 does not enforce format legality, Commander singleton/color identity, sideboard limits, draw simulation, or collection tracking in decks. Source: [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L83-L87). **Confidence: high.**
- **Collection/trade gap:** Scanner CSV import is supported, but native scanning, live pricing, friend sharing, and marketplace trading are not evidenced as in scope. Sources: [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L87-L97), [ManaBox](https://manabox.app/), [Dragon Shield](https://www.dragonshield.com/card-manager), [Deckbox](https://deckbox.org/). **Confidence: high.**
- **Workflow consistency still needs validation:** The repo identifies inconsistent creation flows and proposes fixes; public evidence does not prove the final UI is coherent in-editor. Source: [Overlay Plan](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/21_create_import_export_overlay_plan.md#L24-L38). **Confidence: high.**
- **Public/community layer deferred:** Public sharing/gallery functions are explicitly deferred in the decision summary, while creator competitors emphasize community galleries/sharing. Sources: [Decision Summary](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/00_decision_summary.md#L60-L67), [MTG.design](https://mtg.design/), [MTG Cardsmith](https://mtgcardsmith.com/). **Confidence: high.**

### Poorly / not evidenced publicly

- **Native mobile scanning:** No current native scanner app; repo says use scanner CSV import first. Source: [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L126-L134). **Confidence: high.**
- **Live market pricing/trading:** No evidence of live marketplace, trade matching, or portfolio valuation. Sources for benchmark expectation: [TCGplayer App](https://apps.apple.com/us/app/tcgplayer/id1247645833), [Cardsphere](https://www.cardsphere.com/), [Collectr](https://www.getcollectr.com/). **Confidence: medium-high.**
- **Collaborative web sharing:** Not evidenced in current scope and public gallery is deferred. Source: [Decision Summary](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/00_decision_summary.md#L60-L67). **Confidence: high.**
- **Print-shop-ready output:** Explicitly deferred; print PDF can assemble already-rendered images and later versions can support bleed/crop marks/calibration. Source: [Export Targets](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/10_export_targets.md#L50-L60). **Confidence: high.**

---

## Assumptions

1. Product pages are treated as directional evidence, not proof of hidden/account-gated workflows.
2. “Pricing” reflects only what could be verified from public source pages during this pass. If a page exposed free/premium links without exact tier terms, it is marked **Unknown / verify**.
3. Matrix ratings compare product fit to Homebrew Forge’s target workflow, not product quality in isolation.
4. Homebrew Forge source links may require repo access because the public URL was inaccessible in normal browsing during this pass.
5. Card Conjurer and Delver Lens are included as important category anchors but are low-confidence because source access was insufficient.

## Top-risk notes

- **Scope risk:** Deck, collection, reference, print, and card-authoring ambitions can sprawl into five products. Defend the local file-backed workflow and adapters first.
- **Perception risk:** Users may judge Homebrew Forge against polished web card creators before understanding the local pipeline value.
- **Data-loss risk:** Local file editing plus UI editing requires strong dirty-state, external-change, diff/merge, and backup behaviors.
- **Legal/asset risk:** Asset-pack flexibility must never look like an official-frame downloader.
- **Adoption risk:** If onboarding starts with schema concepts instead of user goals, non-technical card makers may bounce.

---

## References

### Homebrew Forge repo evidence

- [README](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/README.md)
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
- [Codex Master Prompt](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/prompts/codex_master_prompt.md)
- [Homebrew Forge Skill](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/skills/homebrew-forge/SKILL.md)

### Competitive / benchmark sources

- [MTG.design](https://mtg.design/)
- [MTG Cardsmith](https://mtgcardsmith.com/)
- [MTGCardBuilder](https://mtgcardbuilder.com/)
- [Magic Set Editor GitHub](https://github.com/twanvl/MagicSetEditor2)
- [MTGNexus Custom Cards](https://mtgnexus.com/customcards/)
- [Cockatrice](https://cockatrice.github.io/)
- [Moxfield](https://www.moxfield.com/)
- [Archidekt](https://archidekt.com/)
- [TappedOut Deck Builder](https://tappedout.net/mtg-deck-builder/)
- [MTGGoldfish Premium](https://www.mtggoldfish.com/premium)
- [AetherHub](https://aetherhub.com/)
- [EDHREC](https://edhrec.com/)
- [ManaBox](https://manabox.app/)
- [Dragon Shield Card Manager](https://www.dragonshield.com/card-manager)
- [Delver Lens](https://delverlab.com/)
- [TCGplayer App Store](https://apps.apple.com/us/app/tcgplayer/id1247645833)
- [Deckbox](https://deckbox.org/)
- [Deckbox Premium](https://deckbox.org/premium)
- [Cardsphere](https://www.cardsphere.com/)
- [Cardsphere Premium](https://www.cardsphere.com/premium)
- [Figma pricing/features](https://www.figma.com/pricing/)
- [Google Sheets sort/filter help](https://support.google.com/docs/answer/3540681)
- [Google Sheets FILTER function](https://support.google.com/docs/answer/3093197)
- [Adobe Photoshop](https://www.adobe.com/products/photoshop.html)
- [Photoshop toolbar help](https://helpx.adobe.com/photoshop/desktop/get-started/set-up-toolbars-panels/customize-the-toolbar.html)
- [Component.Studio help](https://component.studio/help)
- [Component.Studio FAQ](https://component.studio/faq)
- [The Game Crafter](https://www.thegamecrafter.com/)
- [Squib GitHub](https://github.com/andymeneely/squib)
- [Tabletop Simulator Steam](https://store.steampowered.com/app/286160/Tabletop_Simulator/)
- [Tabletop Simulator custom deck docs](https://kb.tabletopsimulator.com/custom-content/custom-deck/)
- [Collectr](https://www.getcollectr.com/)
- [Ludex](https://www.ludex.com/)
- [Card Creator on Steam](https://store.steampowered.com/app/523600/Card_Creator/)

---

## Top 5 action items

1. Ship and verify the shared creation overlay contract across Cards, Decks, Sets, Projects, Library, and References.
2. Define one search/filter/sort component contract for every browse/list workspace, including result counts, active chips, reset, and saved views.
3. Complete import/export hubs with honest staged states, dry-run summaries, and no fake unsupported behavior.
4. Turn collection import uncertainty into a first-class review queue with match confidence, variant correction, and bulk edit.
5. Add “workflow lane” onboarding: Make a card, build a deck, import a collection, manage references/assets.

## What needs product-owner validation

- Which benchmark lane should define the first impression: “quick card creator,” “local set studio,” “deck workspace,” or “collection import/review.”
- Whether live pricing/trade features are explicitly out of scope, future-adapter-only, or a strategic long-term bet.
- Which export target is highest-value after Cockatrice: print preflight, Tabletop Simulator sheets, Draftmancer-style custom sets, or deck-site-compatible lists.
- How much visual fidelity is required before public/beta use.
- Whether public sharing/gallery remains deferred or needs a local/static-gallery compromise.

## What still needs in-editor validation

- Whether create overlays actually return focus correctly, preserve dirty state, and avoid accidental object creation.
- Whether card/deck/collection/reference search/filter/sort patterns feel consistent and fast on real data volumes.
- Whether users understand the distinction between Cards/Sets, Decks, Collections, Library assets, and References.
- Whether import/export staged states prevent false expectations.
- Whether validation warnings help rather than overwhelm during normal card-making.

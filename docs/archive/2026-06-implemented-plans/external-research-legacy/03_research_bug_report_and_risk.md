---
status: archived
lane: research
type: research
archived: 2026-06-09
---
> **ARCHIVED 2026-06-09 (implemented-plans sweep)** — original path: `external research/03_research_bug_report_and_risk.md`
> Reason: implemented planning artifact, archived per Kyle's 2026-06-09 directive (all plans implemented; no live backlog).
> Index: `docs/cowork/02_repo_archive_manifest.md` + `docs/64_repo_cleanup_archive_index.md`.

# 03 Research Bug Report and Risk — Homebrew Forge

- **Generated date:** 2026-06-08
- **Research horizon:** Repo docs and public benchmark sources checked during this pass. Product pages, pricing, and public reviews should be re-verified before final release planning.
- **Repository freshness caveat:** GitHub may lag local code. The public GitHub URL was inaccessible in normal web browsing during this pass; repo evidence came from GitHub connector access plus owner-provided context. Links may require repo permission.
- **Scope:** External-only usability-risk bug list from repo-level inference and public benchmark evidence. No local files were read, no code was changed, no browser automation was run, and no in-editor UX heuristic test was performed.
- **Confidence summary:** **High** where repo docs explicitly name a problem or acceptance criterion. **Medium** where issue is inferred from competitor norms and repo scope. **Low** where source access was incomplete or user frequency is unknown.

## What this report is / is not

### This report is

- A decision-ready usability-risk backlog grounded in Homebrew Forge repo docs, public competitor/benchmark evidence, and product-level inference.
- A list of usability issues treated as bug candidates because they can cause failed tasks, data loss, misinterpretation, or lost trust.
- A bridge to downstream in-editor validation: each issue includes likely harm, fix direction, and confidence.

### This report is not

- Not a hands-on usability test.
- Not an accessibility conformance audit.
- Not a code audit.
- Not a runtime bug report.
- Not proof that every issue exists in the current local build.
- Not a pricing/features claim beyond available public evidence.

## Severity scale

| Severity | Meaning |
|---:|---|
| 5 | High likelihood of data loss, blocked core workflow, severe trust failure, or major accessibility risk |
| 4 | Frequent core-workflow friction likely to cause abandonment or repeated errors |
| 3 | Meaningful usability friction or expectation mismatch, but workaround likely exists |
| 2 | Localized friction, minor learnability issue, or lower-frequency bug candidate |
| 1 | Cosmetic or low-risk consistency issue |

## Bug taxonomy

| Taxonomy | Definition |
|---|---|
| Usability | Users can technically complete the action, but the interaction is confusing, slow, misleading, or hard to recover from |
| Information architecture | Objects, modes, navigation, or labels make it unclear where work lives or what state it is in |
| Workflow friction | Multi-step task breaks continuity, hides next actions, or forces unnecessary re-entry/manual correction |
| Accessibility-risk | Keyboard/focus/label/contrast/state behavior could block users, especially in overlays, dialogs, panels, and dense tables |
| Convention inconsistency | Behavior conflicts across surfaces or diverges from strong external standards without clear reason |

---

## Bug candidates

| ID | Title | Severity | Taxonomy | Affected area | Evidence/source link | Likely user harm | Suggested fix direction | Confidence |
|---|---|---:|---|---|---|---|---|---|
| HBF-UX-001 | Plus buttons create inconsistent mental models | 5 | Convention inconsistency / workflow friction | Cards, Decks, Sets, Projects, Library, References | Repo says Cards created blank unsaved draft immediately, Decks used compact left-panel create form, Sets/Projects/Library used right-inspector prompts, producing inconsistent plus behavior. Source: [Overlay Plan](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/21_create_import_export_overlay_plan.md#L24-L38). | Users cannot predict whether plus means create immediately, open a prompt, edit an existing object, or stage a draft; accidental objects and cleanup likely. | Enforce shared overlay shell; no object exists until `Create Draft`; return to target workspace after save. | High |
| HBF-UX-002 | Accidental blank-card creation before known data is captured | 5 | Workflow friction / usability | Cards workspace | Priority matrix calls Cards the clearest UX problem because it creates an object immediately and moves the user into editing before known data is captured. Source: [Priority Matrix](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/22_create_import_export_priority_matrix.md#L61-L63). | Users create junk rows/tabs, lose confidence in source-of-truth integrity, or abandon card creation. | Card plus opens focused creation overlay; create draft only after confirmation; support cancel without side effects. | High |
| HBF-UX-003 | Import/Export hubs may overpromise unsupported actions | 5 | Usability / workflow friction | File > Import, File > Export | Repo requires broad hubs but says unsupported slices should show staged states and stop if fake behavior would be needed. Sources: [Overlay Plan](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/21_create_import_export_overlay_plan.md#L123-L183), [Priority Matrix stop conditions](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/22_create_import_export_priority_matrix.md#L97-L105). | Users click export/import options expecting completion, then hit missing internals; trust in migration/export safety drops. | Add availability badges: Available, Planned, Requires setup, Unsupported; include dry-run summaries and disabled-state explanations. | High |
| HBF-UX-004 | Local file/source-of-truth edits can be overwritten without robust conflict handling | 5 | Usability / data-loss risk | Editor save behavior, CSV/YAML storage | Local editor spec says external CSV edits should trigger reload/merge prompt and avoid overwriting newer changes. Source: [Local Editor Spec](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/08_local_editor_spec.md#L92-L99). | Data loss or silent overwrite undermines the core local-first value proposition. | Show current file path, last-saved timestamp, dirty state, external-change alert, diff/merge prompt, and backup before overwrite. | High |
| HBF-UX-005 | Search/filter/sort may diverge across list workspaces | 4 | Convention inconsistency / IA | Cards, Decks, Collections, References, Library, Sets, Projects | Repo says ordinary search should be visible in every browse/list workspace and filters should use shared overlays; Google Sheets makes sort/filter/filter views a standard expectation. Sources: [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L117-L118), [Google Sheets sort/filter](https://support.google.com/docs/answer/3540681). | Users relearn controls in every mode, miss filtered-out items, or lose confidence in browse results. | Create one Browse Toolbar component contract: search, sort, filter, active chips, reset, result count, empty state, saved views. | High |
| HBF-UX-006 | Collection import can preserve wrong or ambiguous card variants without fast review tools | 4 | Workflow friction / usability | Collections import/review | HBF imports scanner CSVs and stores match strategy/review status; TCGplayer App reviews reveal scanner/list friction around wrong variants, exact search, and quantity/listing workflows. Sources: [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L87-L97), [TCGplayer App Store](https://apps.apple.com/us/app/tcgplayer/id1247645833). | Collection data becomes untrustworthy; users spend more time correcting than importing. | Add review queue with match confidence, unresolved filter, variant selector, bulk edit for quantity/finish/condition/language/location, and “do not silently guess” copy. | Medium-high |
| HBF-UX-007 | Deck workspace may feel incomplete without legality, stats, playtest, or collection availability signals | 4 | Usability / expectation mismatch | Decks workspace | Repo explicitly defers format legality, Commander rules, sideboard limits, draw simulation, and collection tracking in V1; deck competitors expose deck search/playtest/sandbox/inventory patterns. Sources: [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L83-L87), [Archidekt](https://archidekt.com/), [TappedOut](https://tappedout.net/mtg-deck-builder/), [Deckbox](https://deckbox.org/). | Deck Builder users may assume missing warnings mean valid decks, or judge Decks as too shallow for serious use. | Add deck intelligence v1: counts, invalid refs, section summaries, duplicate/singleton warnings, color identity estimate, collection missing-card indicator. | Medium-high |
| HBF-UX-008 | Complex frame registration before renderer support can look like broken rendering | 4 | Usability / expectation mismatch | Card preview, frame selector, renderer coverage | Project map says complex registered frames may appear before dedicated renderer slices are implemented; decision summary defers showcase/exotic frames and complex layouts. Sources: [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L122-L122), [Decision Summary](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/00_decision_summary.md#L60-L67). | Users select a frame/layout expecting output and perceive failures as bugs rather than staged support. | Add frame/layout coverage badges: Supported, Experimental, Registered only, Missing asset pack, Not in this build. | High |
| HBF-UX-009 | Overlay focus and Escape behavior are accessibility-critical but unverified externally | 5 | Accessibility-risk | All overlays/dialogs | Overlay contract requires focus movement into overlay, Escape rules, dirty-close confirmation, and focus return to trigger. Source: [Overlay Plan](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/21_create_import_export_overlay_plan.md#L48-L65). | Keyboard users can become trapped, lose context, or accidentally discard unsaved work. | Add keyboard/focus smoke tests: open, tab order, Escape clean/dirty, close button, Cancel, primary action, focus return, screen-reader label coverage. | High |
| HBF-UX-010 | Reference/typeahead syntax is powerful but likely undiscoverable | 3 | Usability / learnability | Inspector rules text, References | Project map defines triggers `@`, `#`, `:`, `!`, braced symbols, `~`, italics, flavor syntax, and forced lines. Source: [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L105-L107). | Users miss a major power feature or enter syntax incorrectly, creating avoidable validation errors. | Add inline syntax helper, example drawer, autocomplete hint chips, and “insert symbol/term” menu. | High |
| HBF-UX-011 | Asset/legal safety may read as missing feature instead of intentional guardrail | 3 | Information architecture / expectation mismatch | Asset manager, frame picker, onboarding | Repo prohibits copyrighted assets and scraping; competitors market HD/many official-like frames and print visuals. Sources: [README](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/README.md#L33-L43), [MTG Cardsmith](https://mtgcardsmith.com/), [MTGCardBuilder](https://mtgcardbuilder.com/). | Card makers think HBF is visually underpowered or broken, rather than intentionally safe/local. | Label debug frames, local pack status, missing assets, license state, and “bring your own licensed pack” flow plainly. | High |
| HBF-UX-012 | Collection row → authored card copy may blur data boundaries | 4 | Information architecture | Collections, Cards/Sets import from collection | Project map says collection rows are isolated and copy into active set as editable draft templates while originals remain unchanged. Source: [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L87-L98). | Users may think imported collection rows are still linked to collection ownership or official card identity; edits could be misinterpreted. | Add clear copy semantics: “Create authored draft from collection row,” source badge, original row link, and no-live-link warning. | High |
| HBF-UX-013 | Print/export labels could imply print-shop readiness too early | 4 | Usability / expectation mismatch | Export hub, print/export profiles | Print PDF is MVP/future and later versions can support bleed/crop marks/printer calibration; print-shop-ready output is deferred. Sources: [Export Targets](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/10_export_targets.md#L50-L60), [Decision Summary](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/00_decision_summary.md#L60-L67). | Users send prototype output to print expecting professional tolerances, then blame HBF for poor physical results. | Use labels: Prototype print sheet, Print-preflight, Print-shop-ready unavailable; show resolution/bleed/crop/watermark checks. | High |
| HBF-UX-014 | Public sharing/community absence may feel like missing “save/share” capability | 3 | Expectation mismatch | Export/share, onboarding | MTG.design and MTG Cardsmith emphasize community/save/share; HBF defers public sharing/gallery. Sources: [MTG.design](https://mtg.design/), [MTG Cardsmith](https://mtgcardsmith.com/), [Decision Summary](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/00_decision_summary.md#L60-L67). | Casual card makers may not understand how to share playtest cards without a gallery/account system. | Provide local share bundle/static gallery export with manifest, disclaimers, and import instructions before SaaS sharing. | Medium-high |
| HBF-UX-015 | Native scanning is out of scope but scanner-app language can confuse users | 3 | IA / expectation mismatch | Collections import | Project map imports scanner CSVs and says custom iOS camera/scanner app is not in slice; benchmark apps make native scanning central. Sources: [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L87-L97), [Project Map not-in-slice](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L126-L134), [ManaBox](https://manabox.app/), [Dragon Shield](https://www.dragonshield.com/card-manager). | Users expect to scan cards inside HBF and treat CSV import as a missing/broken scanner. | Label as “Import scanner CSV” and list supported external apps; do not use “scan cards” as action copy. | High |
| HBF-UX-016 | Toolbar/menu density may hide global actions | 3 | Convention inconsistency | App shell, toolbar, File/Edit/View/Tools/Help | Project map assigns File/Edit/View/Tools/Help and toolbar responsibilities; Figma/Photoshop anchor predictable pro editor menus/toolbars. Sources: [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L101-L104), [Figma](https://www.figma.com/pricing/), [Photoshop toolbar help](https://helpx.adobe.com/photoshop/desktop/get-started/set-up-toolbars-panels/customize-the-toolbar.html). | Users may hunt for import/export/view toggles or duplicate controls across menu, toolbar, panel, and inspector. | Create menu/toolbar ownership map: global vs workspace vs selected-object action; add command palette later if action count grows. | Medium |
| HBF-UX-017 | Rules/design lint may overwhelm if warnings lack actionability | 4 | Usability | Validation panel, card editor | Validation spec includes schema/layout/Magic templating/color-pie/export validation with severities and waivers. Source: [Validation and Rules Linting](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/14_validation_and_rules_linting.md). | Users ignore warnings, overfix intentional design choices, or feel the tool is judging creativity rather than helping. | Group by severity, show fix examples, allow waivers with reason, and separate “cannot export” from “design suggestion.” | High |
| HBF-UX-018 | Hidden object boundary between Project, Set, Deck, Collection, Library, Reference can confuse new users | 4 | Information architecture | Left rail and workspace navigation | Project map uses distinct workspaces and says Cards/Sets are editable authored records, Decks are play/export lists, Collections are isolated card lists. Source: [Project Map](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L80-L98). | Users place data in the wrong workspace or expect automatic sync between collection rows, authored cards, and deck entries. | Add lane onboarding, object-boundary cards, “what this workspace owns” empty states, and source badges. | High |
| HBF-UX-019 | Missing old-set importer support beyond small XML can frustrate migration users | 3 | Workflow friction | Import/migration | Repo says old-set importers beyond small XML parser are not in current slice; Magic Set Editor importer is future. Sources: [Project Map not-in-slice](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/project-map.md#L126-L134), [Importers and Migration](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/12_importers_and_migration.md#L44-L62). | Users with existing MSE or legacy sets may expect migration to “just work” and stall. | Provide migration wizard that starts with generic CSV/XML; label MSE importer as planned; document manual map path. | High |
| HBF-UX-020 | Registered future adapters can create roadmap confusion | 2 | Expectation mismatch | Export settings, docs, import/export hub | Export docs list future adapters such as Tabletop Simulator, Untap.in, Moxfield-style decklists, Draftmancer, LackeyCCG. Source: [Export Targets](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/10_export_targets.md#L71-L79). | Users may assume future adapters are current features. | Use “Future target” labels in docs/UI and do not show disabled adapters without explanation. | High |

---

## Priority clustering

### P0 / block-release risks

- HBF-UX-001 — inconsistent plus-button behavior.
- HBF-UX-002 — accidental blank object creation.
- HBF-UX-003 — import/export overpromising.
- HBF-UX-004 — local file overwrite/conflict.
- HBF-UX-009 — overlay focus/accessibility risk.

### P1 / next shippable trust builders

- HBF-UX-005 — shared search/filter/sort.
- HBF-UX-006 — collection import review.
- HBF-UX-007 — deck intelligence expectation.
- HBF-UX-008 — frame support clarity.
- HBF-UX-012 — collection row vs authored card boundary.
- HBF-UX-013 — print/export readiness labels.
- HBF-UX-017 — actionable validation warnings.
- HBF-UX-018 — object-boundary onboarding.

### P2 / polish and expansion

- HBF-UX-010 — reference syntax discoverability.
- HBF-UX-011 — asset/legal safety framing.
- HBF-UX-014 — sharing/community absence.
- HBF-UX-015 — scanner import labeling.
- HBF-UX-016 — menu/toolbar ownership.
- HBF-UX-019 — old-set importer expectation.
- HBF-UX-020 — future-adapter roadmap labels.

---

## Assumptions

1. Severity estimates reflect likely user harm, not observed frequency.
2. “Bug” here includes usability and expectation failures that can prevent successful use.
3. Repo docs may already be ahead/behind current local implementation; each issue should be revalidated in the editor before engineering assignment.
4. External benchmarks define user expectations; they do not mean Homebrew Forge should copy every feature.
5. App-store review evidence is directional and should not be treated as representative quantitative data.

## Top-risk notes

- **Data integrity:** Local-first means overwrites, stale files, and unclear copy/link behavior are severe.
- **Expectation mismatch:** Users moving from polished web card creators or mobile scanners may misread intentionally deferred features as broken.
- **Accessibility:** Overlay-heavy design is risky without verified focus, Escape, labels, and keyboard paths.
- **Terminology:** Project, Set, Card variant, Deck variant, Collection, Binder/List, Reference, and Library must not blur.
- **Validation tone:** Linting must support creative intent with waivers rather than acting as a hard judge.

---

## References

- [Homebrew Forge README](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/README.md)
- [Decision Summary](https://github.com/JonathanKHobson/homebrew_forge_packet/blob/main/docs/00_decision_summary.md)
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
- [ManaBox](https://manabox.app/)
- [Dragon Shield Card Manager](https://www.dragonshield.com/card-manager)
- [TCGplayer App Store](https://apps.apple.com/us/app/tcgplayer/id1247645833)
- [Deckbox](https://deckbox.org/)
- [Figma pricing/features](https://www.figma.com/pricing/)
- [Google Sheets sort/filter](https://support.google.com/docs/answer/3540681)
- [Photoshop toolbar help](https://helpx.adobe.com/photoshop/desktop/get-started/set-up-toolbars-panels/customize-the-toolbar.html)

---

## Top 5 action items

1. Treat overlay consistency, staged import/export states, and local file conflict handling as P0.
2. Build a shared Browse Toolbar contract before adding more workspace-specific filters.
3. Create a collection import review queue with bulk correction and match confidence.
4. Add frame/layout support badges so “registered but unsupported” never looks like broken rendering.
5. Add keyboard/focus validation for every overlay and dialog.

## What needs product-owner validation

- Which P0 issues block a beta/demo release.
- Whether deck legality warnings belong in V1 or V2.
- Which scanner app CSV formats should become official fixtures first.
- What terms should be used for “copy collection row into authored card draft.”
- What “print-ready” language is allowed before print-preflight exists.

## What still needs in-editor validation

- Actual plus-button behavior in every workspace.
- Actual File > Import / File > Export states and disabled/staged copy.
- Actual keyboard and focus behavior in overlays.
- Search/filter/sort consistency across all list surfaces.
- User comprehension of object boundaries across Cards, Decks, Collections, References, Library, Projects, and Sets.

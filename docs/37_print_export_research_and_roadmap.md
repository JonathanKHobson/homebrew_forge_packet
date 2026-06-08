# Print Export Research And Roadmap

## Research Notes

- Traditional Magic card print size is approximately 2.5in by 3.5in, matching the app's existing card slot geometry.
- Browser/PDF print output should use CSS paged media with explicit `@page` size and zero app margins; PDF generation should prefer CSS page size and print backgrounds.
- Home printing needs 1-up card output for cardstock, 9-up sheets for playtest runs, crop marks, optional cut lines, and output files that can be printed by the OS dialog.
- Low-ink needs more than grayscale filters. The print system should support full-color renders, filtered image modes, and text/wireframe modes that avoid dense art and frame ink.
- Print-shop bleed is separate from home-print cardstock. Current print sheets use final 2.5in by 3.5in slots; true bleed/trim-box exports should be a later print-shop preset.

## Personas

- Partner gift printer: one card, good-looking color, home printer, cardstock, easy PDF.
- Playtester: many cards, fast 9-up sheets, low ink, visible cut marks.
- Rules tester: one or more variants, wireframe or text-only, minimal art ink.
- Set author: active-set export with variant policy and repeatable layout settings.
- Future deck/collection printer: selected deck or collection source, quantity filtering, official image/proxy fallback.

## Slices

1. Current-card print sheet: File > Print, selected draft source, Letter/A4, 1-up/9-up, PDF/PNG, full-color/low-ink/grayscale/wireframe/text-only, crop and cut guides.
2. Active-set print sheet: use the same exporter for set PDF runs with variant policy and 9-up defaults.
3. Export integration: expose Print from File > Export cards and sets so print is findable from the export workflow.
4. Deck/collection/project sources: add source pickers and filters once deck/collection card-image resolution is stable enough to avoid missing art surprises.
5. Print-shop presets: add bleed-sized cards, trim/bleed boxes, commercial crop mark offsets, and preflight warnings.

## Acceptance Criteria

- A selected homebrew card can export a Letter 1-up PDF for cardstock printing.
- The same selected card can export wireframe or text-only low-ink sheets.
- Active set PDF export remains available and keeps the existing 9-up behavior.
- File > Print and File > Export both make the print path discoverable.
- Build, tests, and visual QA cover the print overlay and at least one generated PDF.

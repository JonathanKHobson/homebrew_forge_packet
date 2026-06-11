---
status: draft
lane: shareable
type: workflow-packet
pin: false
---
# AI Asset Workflow Packet

Use this packet to reproduce the Homebrew Forge Shareable workflow on another
public site or portfolio case study. The pattern is simple: design the story
first, reserve every image slot, generate or capture assets intentionally, then
visually QA the rendered page before calling it finished.

## What Worked

- Start with a clear visual North Star. For Homebrew Forge, that was a parchment
  and dark-forge landing page with visible custom cards, strong product CTAs,
  textured backgrounds, generated icons, and a public case-study rhythm.
- Build the full page once with numbered image placeholders. Each placeholder
  should include the slot ID, intended purpose, aspect ratio, and an exact prompt
  paragraph before any final image is generated.
- Replace slots in a second pass with the right asset type: product screenshot,
  generated brand/icon art, generated atmospheric background, product composite,
  or polished infographic.
- Generate logos and small icons on a bright chroma background when transparent
  generation is unreliable. Remove the chroma color afterward with Python/Pillow
  and inspect the cleaned edge on both dark and parchment backgrounds.
- Let images carry the mood. Keep the first reading pass light, then progressively
  reveal process, code, AI workflow, roadmap, and install/source details.
- Do not hide product visuals by default. If a real secret, API key, password, or
  credential appears, recapture a safer app state instead of covering the UI.
- Treat rendered QA as part of the design process. Contrast, hover states,
  mobile layout, font size, clipped text, and broken image references are ship
  blockers for a public page.

## Recommended Folder Shape

```text
site-or-case-study/
  index.html
  styles.css
  script.js
  README.md
  assets/
    generated/
    screenshots/
    favicon/
    image-slots.json
  reports/
    qa/
    uxhc/
```

For an existing app, adapt the folder names to the local framework, but keep the
asset inventory and QA evidence close enough that the next developer can find
them.

## Image Slot Pass

Create `assets/image-slots.json` or `assets/image-slots.md` before generating
the final assets. Each slot should include:

- `id`: a short stable ID such as `G1`, `S1`, or `I4`.
- `purpose`: what the asset proves or makes the reader feel.
- `placement`: where it appears on the page.
- `aspect_ratio`: the layout constraint the page expects.
- `prompt`: the direct image-generation prompt.
- `source_type`: `generated`, `screenshot`, `composite`, or `diagram`.
- `status`: `placeholder`, `generated`, `captured`, `integrated`, or `verified`.
- `final_path`: the checked-in path used by the page.

Use placeholders in the first complete draft. Do not leave placeholders in the
final public page.

## Chroma-Key Icon Workflow

Use this for crests, small icons, and marks where transparent generation is
unreliable:

1. Prompt the image generator for the mark on a pure chroma background, usually
   `#00ff00` or `#0080ff`.
2. Ask for a centered object, clean silhouette, strong edge separation, no drop
   shadow, no text unless the text is absolutely required, and no watermark.
3. Remove the chroma background with Python/Pillow by converting pixels near the
   chroma key to alpha and preserving anti-aliased edges.
4. Export the cleaned PNG, then test it on dark and light backgrounds.
5. Generate favicon sizes from the cleaned source mark, not from a screenshot.

## Screenshot And Composite Rules

- Use real product screenshots when the page is making a product-truth claim.
- Use generated product composites when the page needs a cleaner public-facing
  staging image than the current app state can provide.
- Show the product clearly. Avoid unnecessary blur, hidden details, tiny app frames, or
  cropped-off core UI.
- If confidential data appears, change the underlying state and recapture.
- Keep fictional/homebrew card content original. Do not use official MTG logos,
  mana symbols, card frames, or art.

## Rendered QA Gate

Before handoff, run at least:

- Desktop, laptop, tablet, and mobile screenshots.
- No horizontal overflow.
- No clipped text or text-image overlap.
- Body and important labels at `16px` or larger.
- Visible hover and focus states on CTAs.
- Favicon loads.
- Reduced-motion behavior is respected.
- Static scan for broken asset references and unwanted hidden-content copy.
- UXHC or equivalent heuristic pass focused on hierarchy, contrast, accessibility,
  progressive disclosure, and CTA clarity.

## Ready-To-Paste Prompt For Another AI Dev

```text
You are improving an existing portfolio website with the same image-led workflow
used on the Homebrew Forge Shareable. Do not start by polishing random CSS.

First inspect the current site structure, content, visual direction, and asset
folders. Create a numbered image-slot inventory before generating final assets.
Each slot must include the slot ID, page placement, intended reader effect,
aspect ratio, source type, and a direct image-generation prompt paragraph.

Build a complete draft with visible placeholders first. Then fill every slot in
a second pass:
- use real screenshots where the site needs proof of actual work;
- use generated atmospheric backgrounds where the page needs mood and texture;
- use generated icons/marks on a bright green or bright blue chroma-key
  background when transparent generation is unreliable, then remove the chroma
  background with Python/Pillow;
- use polished visual diagrams instead of cramped flat SVGs when explaining a
  process, workflow, roadmap, or system.

The final site should be image-led, readable, and public-ready. Do not hide or
cover normal product visuals. If an actual secret, API key, password, or private
credential appears, recapture a different state instead of covering the UI after
capture.
Avoid copyrighted logos, official card frames, official symbols, third-party art,
or unlicensed brand assets unless the project already has permission to use them.

After integration, run visual QA at desktop, laptop, tablet, and mobile widths.
Fix contrast issues, clipped text, text over busy images, tiny type, broken
images, hover/focus states, favicon issues, and horizontal overflow before
calling the site complete. Save screenshots and a short QA report with the final
handoff.
```

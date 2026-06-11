---
status: draft
lane: shareable
type: public-artifact
pin: false
---
# Homebrew Forge Current Condition Shareable

This folder contains the local, GitHub Pages-ready Shareable for Homebrew Forge.
It presents the project as a public landing page and case study: mythic at the
top, progressively more technical as the reader moves down the page.

Publication is intentionally deferred until Jonathan reviews this local draft.

## Files

- `index.html` - static landing/case-study page.
- `styles.css` - parchment, brass, obsidian, and forge-surface visual system.
- `script.js` - scroll progress, active navigation, reveal behavior, and image
  zoom.
- `install-guide.md` - short source-alpha install and Codex handoff guide.
- `ai-asset-workflow-packet.md` - reusable image-slot, chroma-key asset, and
  portfolio-site handoff workflow.
- `shareable-spec.json` - Shareables-style route, source, asset, and QA
  contract.
- `assets/generated/` - generated crest, icons, card art, parchment art, forge
  backgrounds, and proof images.
- `assets/source-screenshots/` - fully visible product screenshots/product evidence.
- `assets/favicon/` - favicon and Apple touch icon generated from the cleaned
  chroma-key crest.
- `assets/image-slots.json` - slot inventory, prompts, final paths, and status.

## Public Boundary

The final page should show Homebrew Forge clearly. Product visuals stay fully
visible. The only public boundary is practical: do not deliberately publish
secrets, API keys, passwords, or private credentials. If a credential appears in
a capture, recapture a different app state.

Generated visuals use original fantasy/forge art and fictional card content.
Do not add official Magic: The Gathering logos, mana symbols, official card
frames, official card art, or third-party IP art.

## Local Preview

Open `index.html` directly, or serve from this folder:

```bash
python3 -m http.server 8111
```

Then open `http://127.0.0.1:8111/`.

## Review Gates

- Browser screenshots at desktop, laptop, tablet, and mobile sizes.
- UXHC audit with report output under
  `reports/shareables/homebrew-forge-current-condition/uxhc/`.
- Static checks for broken image references, text size, contrast, public
  vocabulary, and JSON validity.
- Workflow capture: keep the image-slot inventory and AI asset workflow packet
  current when the visual production process changes.
- Repo checks before public publishing: typecheck, build, UX gate, launcher
  health hook, and safe dirty-tree classification.

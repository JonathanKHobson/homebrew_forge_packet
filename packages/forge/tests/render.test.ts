import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadAssetPack } from '../src/assets/assetPack.js';
import { loadForgeProject } from '../src/data/loadProject.js';
import { buildReferenceCatalog } from '../src/reference/catalog.js';
import { loadProjectReferenceCatalog } from '../src/reference/referenceStore.js';
import { CardSvg } from '../src/renderer/CardSvg.js';
import { renderCardImage } from '../src/renderer/renderCard.js';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const rendererReminderTerms = [{ name: 'Vigilance', category: 'keyword-ability' as const, status: 'current' as const, reminderText: "Attacking doesn't cause this creature to tap." }];

describe('React/SVG renderer', () => {
  it('renders a normal placeholder card to PNG at the export profile size', async () => {
    const project = await loadForgeProject({ rootDir: repoRoot, setCode: 'DEMO' });
    const card = project.cards.find((candidate) => candidate.cardId === 'DEMO-001');
    const profile = project.exportProfiles.find((candidate) => candidate.profileId === 'review_png');
    const assetPack = await loadAssetPack({ rootDir: repoRoot, packId: 'debug' });
    const outDir = await mkdtemp(join(tmpdir(), 'homebrew-forge-render-'));

    if (!card || !profile) {
      throw new Error('Missing DEMO card or review profile fixture.');
    }

    const result = await renderCardImage({
      card,
      faces: project.faces.filter((face) => face.cardId === card.cardId),
      art: project.art,
      assetPack,
      exportProfile: profile,
      outDir
    });
    const png = PNG.sync.read(await readFile(result.outputPath));

    assert.deepEqual(result.warnings, []);
    assert.equal(png.width, 744);
    assert.equal(png.height, 1039);
  });

  it('renders linked reference reminders only when the rules box remains readable', async () => {
    const project = await loadForgeProject({ rootDir: repoRoot, setCode: 'DEMO' });
    const card = project.cards.find((candidate) => candidate.cardId === 'DEMO-001');
    const face = project.faces.find((candidate) => candidate.cardId === 'DEMO-001');
    const profile = project.exportProfiles.find((candidate) => candidate.profileId === 'review_png');
    const assetPack = await loadAssetPack({ rootDir: repoRoot, packId: 'debug' });
    const referenceCatalog = buildReferenceCatalog({ homebrewTerms: rendererReminderTerms });

    if (!card || !face || !profile) {
      throw new Error('Missing DEMO renderer reminder fixtures.');
    }

    const spaciousSvg = renderToStaticMarkup(
      React.createElement(CardSvg, {
        card,
        face: { ...face, oracleText: 'Vigilance', flavorText: '', rulesTextSizeHint: 'auto' },
        assetPack,
        exportProfile: profile,
        referenceCatalog
      })
    );
    const constrainedSvg = renderToStaticMarkup(
      React.createElement(CardSvg, {
        card,
        face: { ...face, oracleText: 'Vigilance', flavorText: '', rulesTextSizeHint: '16' },
        assetPack,
        exportProfile: profile,
        referenceCatalog
      })
    );
    const disabledSvg = renderToStaticMarkup(
      React.createElement(CardSvg, {
        card,
        face: { ...face, oracleText: 'Vigilance', flavorText: '', rulesTextSizeHint: 'auto', rulesTextReminderMode: 'off' },
        assetPack,
        exportProfile: profile,
        referenceCatalog
      })
    );

    assert.match(spaciousSvg, /Attacking/);
    assert.match(spaciousSvg, /creature to tap/);
    assert.match(spaciousSvg, /font-style="italic"/);
    assert.doesNotMatch(constrainedSvg, /Attacking/);
    assert.doesNotMatch(disabledSvg, /Attacking/);
  });

  it('keeps symbol-led artifact rules text clear of the type line', async () => {
    const project = await loadForgeProject({ rootDir: repoRoot, setCode: 'DEMO' });
    const card = project.cards.find((candidate) => candidate.cardId === 'DEMO-002');
    const face = project.faces.find((candidate) => candidate.cardId === 'DEMO-002');
    const profile = project.exportProfiles.find((candidate) => candidate.profileId === 'review_png');
    const assetPack = await loadAssetPack({ rootDir: repoRoot, packId: 'debug' });
    const referenceCatalog = loadProjectReferenceCatalog(repoRoot);

    if (!card || !face || !profile) {
      throw new Error('Missing DEMO artifact renderer fixture.');
    }

    const svg = renderToStaticMarkup(
      React.createElement(CardSvg, {
        card,
        face,
        assetPack,
        exportProfile: profile,
        referenceCatalog
      })
    );
    const ruleSymbolTops = [...svg.matchAll(/<circle[^>]*cy="([0-9.]+)"[^>]*r="([0-9.]+)"/g)]
      .map((match) => Number(match[1]) - Number(match[2]))
      .filter((top) => top > 320);

    assert.ok(ruleSymbolTops.length >= 1);
    assert.ok(Math.min(...ruleSymbolTops) >= 342);
  });
});

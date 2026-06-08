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
import { loadProjectReferenceCatalog } from '../src/reference/referenceStore.js';
import { CardSvg } from '../src/renderer/CardSvg.js';
import { renderCardImage } from '../src/renderer/renderCard.js';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

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

  it('renders only reminder text authored into the card rules text', async () => {
    const project = await loadForgeProject({ rootDir: repoRoot, setCode: 'DEMO' });
    const card = project.cards.find((candidate) => candidate.cardId === 'DEMO-001');
    const face = project.faces.find((candidate) => candidate.cardId === 'DEMO-001');
    const aegisCard = project.cards.find((candidate) => candidate.cardId === 'DEMO-004');
    const aegisFace = project.faces.find((candidate) => candidate.cardId === 'DEMO-004');
    const profile = project.exportProfiles.find((candidate) => candidate.profileId === 'review_png');
    const assetPack = await loadAssetPack({ rootDir: repoRoot, packId: 'debug' });
    const referenceCatalog = loadProjectReferenceCatalog(repoRoot);

    if (!card || !face || !aegisCard || !aegisFace || !profile) {
      throw new Error('Missing DEMO renderer reminder fixtures.');
    }

    const linkedOnlySvg = renderToStaticMarkup(
      React.createElement(CardSvg, {
        card,
        face: { ...face, oracleText: 'Vigilance', flavorText: '', rulesTextSizeHint: 'auto' },
        assetPack,
        exportProfile: profile,
      })
    );
    const explicitSvg = renderToStaticMarkup(
      React.createElement(CardSvg, {
        card,
        face: { ...face, oracleText: "Vigilance (Attacking doesn't cause this creature to tap.)", flavorText: '', rulesTextSizeHint: 'auto' },
        assetPack,
        exportProfile: profile
      })
    );
    const aegisSvg = renderToStaticMarkup(
      React.createElement(CardSvg, {
        card: aegisCard,
        face: aegisFace,
        assetPack,
        exportProfile: profile,
        referenceCatalog
      })
    );

    assert.doesNotMatch(linkedOnlySvg, /Attacking/);
    assert.match(explicitSvg, /Attacking/);
    assert.match(explicitSvg, /creature[\s\S]*to tap/);
    assert.match(explicitSvg, /font-style="italic"/);
    assert.doesNotMatch(aegisSvg, /Look at the top/);
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

  it('keeps simple artifact rules text large with readable inline mana spacing', async () => {
    const project = await loadForgeProject({ rootDir: repoRoot, setCode: 'DEMO' });
    const card = project.cards.find((candidate) => candidate.cardId === 'DEMO-002');
    const face = project.faces.find((candidate) => candidate.cardId === 'DEMO-002');
    const profile = project.exportProfiles.find((candidate) => candidate.profileId === 'review_png');
    const assetPack = await loadAssetPack({ rootDir: repoRoot, packId: 'basic-m15-local' });

    if (!card || !face || !profile) {
      throw new Error('Missing DEMO artifact renderer fixture.');
    }

    const svg = renderToStaticMarkup(
      React.createElement(CardSvg, {
        card,
        face,
        assetPack,
        exportProfile: profile
      })
    );

    const renderedRulesText = [...svg.matchAll(/<text[^>]*font-size="([0-9.]+)"[^>]*>([\s\S]*?)<\/text>/g)].filter((match) =>
      match[0].includes('MPlantinForge')
    );
    const smallestRulesFontSize = Math.min(...renderedRulesText.map((match) => Number(match[1])));

    assert.ok(renderedRulesText.length >= 3);
    assert.ok(smallestRulesFontSize >= 14.2);
    assert.match(svg, /xml:space="preserve"[^>]*>: Add /);
    assert.doesNotMatch(svg, /font-size="9\.[0-9]+"/);
  });

  it('packs rich normal-card rules text without shrinking away readable space', async () => {
    const project = await loadForgeProject({ rootDir: repoRoot, setCode: 'SQM' });
    const card = project.cards.find((candidate) => candidate.cardId === 'SQM-001');
    const face = project.faces.find((candidate) => candidate.cardId === 'SQM-001');
    const profile = project.exportProfiles.find((candidate) => candidate.profileId === 'review_png');
    const assetPack = await loadAssetPack({ rootDir: repoRoot, packId: 'basic-m15-local' });

    if (!card || !face || !profile) {
      throw new Error('Missing SQM renderer rules-text fixture.');
    }

    const svg = renderToStaticMarkup(
      React.createElement(CardSvg, {
        card,
        face,
        assetPack,
        exportProfile: profile
      })
    );

    assert.match(svg, /Whenever one or more Squirrels/);
    assert.match(svg, /triggers only once each turn/);
    assert.match(svg, /The safest burrow is sometimes/);
    assert.doesNotMatch(svg, /font-size="7\.[0-9]+"/);
    assert.match(svg, /<tspan[^>]*font-weight="700"[^>]*>Flying<\/tspan>/);
    assert.doesNotMatch(svg, /font-style="italic"[^>]*>[^<]*flying/i);
    assert.match(svg, /font-style="italic"[^>]*>The safest burrow is sometimes/);

    const renderedRulesText = [...svg.matchAll(/<text[^>]*font-size="([0-9.]+)"[^>]*>([\s\S]*?)<\/text>/g)].filter((match) =>
      match[0].includes('MPlantinForge')
    );
    const renderedRulesLines = renderedRulesText.map((match) => match[0].replace(/<[^>]+>/g, ''));
    const smallestRulesFontSize = Math.min(...renderedRulesText.map((match) => Number(match[1])));
    assert.ok(smallestRulesFontSize >= 12);
    assert.match(svg, /<text x="40"/);
    assert.ok(renderedRulesLines.some((line) => line === 'until end of turn.'));
    assert.ok(!renderedRulesLines.some((line) => line.includes('choose up to two')));

    const typeLineMatch = svg.match(/<text x="38" y="([0-9.]+)"[^>]*>Creature - Flying Squirrel<\/text>/);
    assert.ok(typeLineMatch);
    assert.ok(Number(typeLineMatch[1]) >= 311);
  });

  it('renders registered non-default layouts through fallback geometry', async () => {
    const project = await loadForgeProject({ rootDir: repoRoot, setCode: 'DEMO' });
    const baseCard = project.cards.find((candidate) => candidate.cardId === 'DEMO-001');
    const baseFace = project.faces.find((candidate) => candidate.cardId === 'DEMO-001');
    const profile = project.exportProfiles.find((candidate) => candidate.profileId === 'review_png');
    const assetPack = await loadAssetPack({ rootDir: repoRoot, packId: 'debug' });
    const outDir = await mkdtemp(join(tmpdir(), 'homebrew-forge-saga-render-'));

    if (!baseCard || !baseFace || !profile) {
      throw new Error('Missing DEMO renderer fallback fixtures.');
    }

    const result = await renderCardImage({
      card: { ...baseCard, cardId: 'DEMO-SAGA-FALLBACK', layout: 'saga' },
      faces: [{ ...baseFace, cardId: 'DEMO-SAGA-FALLBACK', frameType: 'saga', typeLine: 'Enchantment - Saga' }],
      art: project.art,
      assetPack,
      exportProfile: profile,
      outDir
    });

    const png = PNG.sync.read(await readFile(result.outputPath));
    assert.equal(png.width, 744);
    assert.equal(png.height, 1039);
    assert.ok(result.warnings.some((warning) => warning.includes('Layout saga uses partial-renderer support')));
  });

  it('renders selected border colors from layout variant metadata', async () => {
    const project = await loadForgeProject({ rootDir: repoRoot, setCode: 'DEMO' });
    const card = project.cards.find((candidate) => candidate.cardId === 'DEMO-001');
    const face = project.faces.find((candidate) => candidate.cardId === 'DEMO-001');
    const profile = project.exportProfiles.find((candidate) => candidate.profileId === 'review_png');
    const assetPack = await loadAssetPack({ rootDir: repoRoot, packId: 'basic-m15-local' });
    const outDir = await mkdtemp(join(tmpdir(), 'homebrew-forge-border-render-'));

    if (!card || !face || !profile) {
      throw new Error('Missing DEMO border renderer fixture.');
    }

    const svg = renderToStaticMarkup(
      React.createElement(CardSvg, {
        card,
        face: { ...face, layoutVariant: 'normal;border=gold' },
        assetPack,
        exportProfile: profile
      })
    );

    assert.match(svg, /data-frame-border-color="gold"/);
    assert.match(svg, /data-frame-border-mode="mse-border-mask"/);
    assert.doesNotMatch(svg, /data-border-color=/);

    const goldResult = await renderCardImage({
      card: { ...card, cardId: 'DEMO-BORDER-GOLD' },
      faces: [{ ...face, cardId: 'DEMO-BORDER-GOLD', layoutVariant: 'normal;border=gold' }],
      art: project.art,
      assetPack,
      exportProfile: profile,
      outDir
    });
    const goldPng = PNG.sync.read(await readFile(goldResult.outputPath));
    const goldLeftBorder = rgbaAt(goldPng, 8, 120);
    const goldBottomFooter = rgbaAt(goldPng, 120, goldPng.height - 8);
    assert.ok(goldLeftBorder.r >= 150, `Expected gold left border red channel, got ${goldLeftBorder.r}.`);
    assert.ok(goldLeftBorder.g >= 105, `Expected gold left border green channel, got ${goldLeftBorder.g}.`);
    assert.ok(goldLeftBorder.b <= 145, `Expected gold left border blue channel, got ${goldLeftBorder.b}.`);
    assert.ok(goldBottomFooter.r <= 45, `Expected gold MSE black footer red channel, got ${goldBottomFooter.r}.`);
    assert.ok(goldBottomFooter.g <= 45, `Expected gold MSE black footer green channel, got ${goldBottomFooter.g}.`);
    assert.ok(goldBottomFooter.b <= 45, `Expected gold MSE black footer blue channel, got ${goldBottomFooter.b}.`);

    const unsupportedFullWhiteSvg = renderToStaticMarkup(
      React.createElement(CardSvg, {
        card,
        face: { ...face, layoutVariant: 'normal;border=white' },
        assetPack,
        exportProfile: profile
      })
    );
    assert.match(unsupportedFullWhiteSvg, /data-frame-border-color="white"/);
    assert.match(unsupportedFullWhiteSvg, /data-frame-border-mode="unsupported-source"/);
    assert.doesNotMatch(unsupportedFullWhiteSvg, /data-frame-border-mode="clipped-frame"/);

    const mseWhiteSvg = renderToStaticMarkup(
      React.createElement(CardSvg, {
        card,
        face: { ...face, layoutVariant: 'normal;border=white-mse' },
        assetPack,
        exportProfile: profile
      })
    );
    assert.match(mseWhiteSvg, /data-frame-border-color="white-mse"/);
    assert.match(mseWhiteSvg, /data-frame-border-mode="mse-border-mask"/);

    const mseResult = await renderCardImage({
      card: { ...card, cardId: 'DEMO-BORDER-WHITE-MSE' },
      faces: [{ ...face, cardId: 'DEMO-BORDER-WHITE-MSE', layoutVariant: 'normal;border=white-mse' }],
      art: project.art,
      assetPack,
      exportProfile: profile,
      outDir
    });
    const msePng = PNG.sync.read(await readFile(mseResult.outputPath));
    const mseLeftBorder = rgbaAt(msePng, 8, 120);
    const mseBottomFooter = rgbaAt(msePng, 120, msePng.height - 8);
    assert.ok(mseLeftBorder.r >= 220, `Expected MSE white left border red channel, got ${mseLeftBorder.r}.`);
    assert.ok(mseLeftBorder.g >= 220, `Expected MSE white left border green channel, got ${mseLeftBorder.g}.`);
    assert.ok(mseLeftBorder.b >= 205, `Expected MSE white left border blue channel, got ${mseLeftBorder.b}.`);
    assert.ok(mseBottomFooter.r <= 40, `Expected MSE black footer red channel, got ${mseBottomFooter.r}.`);
    assert.ok(mseBottomFooter.g <= 40, `Expected MSE black footer green channel, got ${mseBottomFooter.g}.`);
    assert.ok(mseBottomFooter.b <= 40, `Expected MSE black footer blue channel, got ${mseBottomFooter.b}.`);
  });
});

function rgbaAt(png: PNG, x: number, y: number): { r: number; g: number; b: number; a: number } {
  const index = (png.width * y + x) << 2;
  return {
    r: png.data[index] ?? 0,
    g: png.data[index + 1] ?? 0,
    b: png.data[index + 2] ?? 0,
    a: png.data[index + 3] ?? 0
  };
}

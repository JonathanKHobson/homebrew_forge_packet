import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadForgeProject } from '../src/data/loadProject.js';
import { exportPrintPdf, exportPrintSheet } from '../src/exporters/printPdfExporter.js';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

describe('Print PDF export', () => {
  it('writes a front-side 9-up playtest PDF for a set', async () => {
    const project = await loadForgeProject({ rootDir: repoRoot, setCode: 'DEMO' });
    const outputRoot = await mkdtemp(join(tmpdir(), 'homebrew-forge-print-'));

    const result = await exportPrintPdf({
      project,
      rootDir: repoRoot,
      setCode: 'DEMO',
      outputRoot,
      paper: 'letter',
      cardsPerPage: 9
    });
    const pdf = await readFile(result.pdfPath);
    const pdfInfo = await stat(result.pdfPath);

    assert.equal(result.cardCount, 16);
    assert.equal(result.pageCount, 2);
    assert.equal(result.profileId, 'print_letter_9up');
    assert.ok(result.imagePaths.some((path) => path.endsWith('001_example-vanguard.png')));
    assert.ok(pdfInfo.size > 1000);
    assert.equal(pdf.subarray(0, 4).toString('utf8'), '%PDF');
    assert.match(pdf.subarray(-2048).toString('latin1'), /%%EOF/);
  });

  it('writes a one-card low-ink wireframe PDF sheet', async () => {
    const project = await loadForgeProject({ rootDir: repoRoot, setCode: 'DEMO' });
    const outputRoot = await mkdtemp(join(tmpdir(), 'homebrew-forge-print-single-'));
    const card = project.cards[0];
    assert.ok(card);
    const face = project.faces.find((candidate) => candidate.cardId === card.cardId);
    assert.ok(face);

    const result = await exportPrintSheet({
      slots: [{ card, face }],
      outputPath: join(outputRoot, 'single-wireframe.pdf'),
      outputFormat: 'pdf',
      paper: 'letter',
      layout: 'single_card',
      inkMode: 'wireframe',
      includeCropMarks: true,
      includeCutLines: true
    });
    const pdf = await readFile(result.outputPath);

    assert.equal(result.cardCount, 1);
    assert.equal(result.pageCount, 1);
    assert.equal(result.layout, 'single_card');
    assert.equal(result.inkMode, 'wireframe');
    assert.equal(pdf.subarray(0, 4).toString('utf8'), '%PDF');
    assert.match(pdf.subarray(-2048).toString('latin1'), /%%EOF/);
  });

  it('writes a one-page text-only print PNG sheet', async () => {
    const project = await loadForgeProject({ rootDir: repoRoot, setCode: 'DEMO' });
    const outputRoot = await mkdtemp(join(tmpdir(), 'homebrew-forge-print-png-'));
    const card = project.cards[0];
    assert.ok(card);
    const face = project.faces.find((candidate) => candidate.cardId === card.cardId);
    assert.ok(face);

    const result = await exportPrintSheet({
      slots: [{ card, face }],
      outputPath: join(outputRoot, 'single-text-only.png'),
      outputFormat: 'png',
      paper: 'letter',
      layout: 'single_card',
      inkMode: 'text_only',
      includeCropMarks: true
    });
    const png = await readFile(result.outputPath);
    const pngInfo = await stat(result.outputPath);

    assert.equal(result.cardCount, 1);
    assert.equal(result.pageCount, 1);
    assert.ok(pngInfo.size > 1000);
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  });

  it('writes multi-page PNG print proofs as a stacked page image', async () => {
    const project = await loadForgeProject({ rootDir: repoRoot, setCode: 'DEMO' });
    const outputRoot = await mkdtemp(join(tmpdir(), 'homebrew-forge-print-png-stack-'));
    const card = project.cards[0];
    assert.ok(card);
    const face = project.faces.find((candidate) => candidate.cardId === card.cardId);
    assert.ok(face);

    const result = await exportPrintSheet({
      slots: Array.from({ length: 10 }, () => ({ card, face })),
      outputPath: join(outputRoot, 'stacked-wireframe.png'),
      outputFormat: 'png',
      paper: 'letter',
      layout: 'nine_up',
      inkMode: 'wireframe',
      includeCropMarks: true
    });
    const png = await readFile(result.outputPath);
    const pngInfo = await stat(result.outputPath);

    assert.equal(result.cardCount, 10);
    assert.equal(result.pageCount, 2);
    assert.ok(pngInfo.size > 1000);
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  });

  it('writes a true 4x6 photo-paper sheet with a standard-size card slot', async () => {
    const project = await loadForgeProject({ rootDir: repoRoot, setCode: 'DEMO' });
    const outputRoot = await mkdtemp(join(tmpdir(), 'homebrew-forge-print-photo-'));
    const card = project.cards[0];
    assert.ok(card);
    const face = project.faces.find((candidate) => candidate.cardId === card.cardId);
    assert.ok(face);

    const result = await exportPrintSheet({
      slots: [{ card, face }],
      outputPath: join(outputRoot, 'single-photo-4x6.png'),
      outputFormat: 'png',
      paper: 'photo_4x6',
      layout: 'single_card',
      inkMode: 'wireframe',
      includeCropMarks: true,
      includeCutLines: true
    });
    const png = await readFile(result.outputPath);
    const dimensions = pngDimensions(png);

    assert.equal(result.paper, 'photo_4x6');
    assert.equal(result.cardsPerPage, 1);
    assert.equal(result.cardCount, 1);
    assert.deepEqual(dimensions, { width: 768, height: 1152 });
  });

  it('supports printer scale correction on 4x6 photo-paper sheets', async () => {
    const project = await loadForgeProject({ rootDir: repoRoot, setCode: 'DEMO' });
    const outputRoot = await mkdtemp(join(tmpdir(), 'homebrew-forge-print-photo-scale-'));
    const card = project.cards[0];
    assert.ok(card);
    const face = project.faces.find((candidate) => candidate.cardId === card.cardId);
    assert.ok(face);

    const result = await exportPrintSheet({
      slots: [{ card, face }],
      outputPath: join(outputRoot, 'single-photo-4x6-110.png'),
      outputFormat: 'png',
      paper: 'photo_4x6',
      layout: 'single_card',
      inkMode: 'wireframe',
      scalePercent: 110,
      includeCropMarks: true,
      includeCutLines: true
    });
    const png = await readFile(result.outputPath);
    const dimensions = pngDimensions(png);

    assert.equal(result.paper, 'photo_4x6');
    assert.equal(result.scalePercent, 110);
    assert.equal(result.cardCount, 1);
    assert.deepEqual(dimensions, { width: 768, height: 1152 });
  });
});

function pngDimensions(png: Buffer): { width: number; height: number } {
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20)
  };
}

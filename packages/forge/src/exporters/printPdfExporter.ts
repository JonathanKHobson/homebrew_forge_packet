import { readFile, rm } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { chromium, type Browser } from 'playwright';
import { loadAssetPack } from '../assets/assetPack.js';
import type { CardRecord, ExportProfile, ForgeProject } from '../domain/schemas.js';
import { loadProjectReferenceCatalog } from '../reference/referenceStore.js';
import { renderSetImages, type RenderCardImageResult } from '../renderer/renderCard.js';
import { ensureDir } from '../utils/fs.js';

export type PrintPaper = 'letter' | 'a4';

export interface ExportPrintPdfRequest {
  project: ForgeProject;
  rootDir: string;
  setCode: string;
  outputRoot: string;
  paper?: PrintPaper;
  cardsPerPage?: number;
  profileId?: string;
}

export interface ExportPrintPdfResult {
  pdfPath: string;
  imagePaths: string[];
  warnings: string[];
  cardCount: number;
  pageCount: number;
  paper: PrintPaper;
  cardsPerPage: number;
  profileId: string;
}

interface PaperSpec {
  id: PrintPaper;
  cssSize: string;
  widthIn: number;
  heightIn: number;
}

interface PrintSlot {
  card: CardRecord;
  imagePath: string;
}

const CARD_WIDTH_IN = 2.5;
const CARD_HEIGHT_IN = 3.5;

const PAPER_SPECS: Record<PrintPaper, PaperSpec> = {
  letter: { id: 'letter', cssSize: 'letter', widthIn: 8.5, heightIn: 11 },
  a4: { id: 'a4', cssSize: 'A4', widthIn: 8.27, heightIn: 11.69 }
};

export async function exportPrintPdf(request: ExportPrintPdfRequest): Promise<ExportPrintPdfResult> {
  const paper = request.paper ?? 'letter';
  const cardsPerPage = request.cardsPerPage ?? 9;
  const paperSpec = PAPER_SPECS[paper];
  if (!paperSpec) {
    throw new Error(`Unsupported paper ${paper}.`);
  }
  if (cardsPerPage !== 9) {
    throw new Error('Phase 1 print PDF export supports 9 cards per page.');
  }

  const profile = printProfileForProject(request.project, request.profileId);
  const printableCards = request.project.cards.filter((card) => card.status !== 'cut' && card.printCount > 0);
  if (!printableCards.length) {
    throw new Error(`No printable cards found for ${request.setCode}.`);
  }

  const assetPack = await loadAssetPack({
    rootDir: request.rootDir,
    packId: request.project.set.defaultAssetPack ?? 'debug'
  });
  const referenceCatalog = loadProjectReferenceCatalog(request.rootDir);
  const printDir = join(request.outputRoot, request.setCode, 'print');
  const imagesDir = join(printDir, 'images');
  await rm(imagesDir, { recursive: true, force: true });
  await ensureDir(imagesDir);

  const renderResults = await renderSetImages({
    cards: printableCards,
    faces: request.project.faces,
    art: request.project.art,
    assetPack,
    exportProfile: profile,
    outDir: imagesDir,
    referenceCatalog
  });
  const imagePathsByCardId = new Map(renderResults.map((result) => [result.cardId, result.outputPath]));
  const slots = buildPrintSlots(printableCards, imagePathsByCardId);
  const pdfPath = join(printDir, `${request.setCode}-${paper}-${cardsPerPage}up.pdf`);

  await ensureDir(printDir);
  await renderPdf({
    pdfPath,
    paper: paperSpec,
    cardsPerPage,
    includeCropMarks: profile.includeCropMarks,
    slots
  });

  return {
    pdfPath,
    imagePaths: renderResults.map((result) => result.outputPath),
    warnings: collectWarnings(renderResults, profile),
    cardCount: slots.length,
    pageCount: Math.ceil(slots.length / cardsPerPage),
    paper,
    cardsPerPage,
    profileId: profile.profileId
  };
}

export function printProfileForProject(project: ForgeProject, profileId?: string): ExportProfile {
  if (profileId) {
    const explicit = project.exportProfiles.find((candidate) => candidate.profileId === profileId);
    if (!explicit) {
      throw new Error(`Unknown export profile ${profileId}.`);
    }
    if (explicit.target !== 'print_pdf') {
      throw new Error(`Export profile ${profileId} targets ${explicit.target}, not print_pdf.`);
    }
    return explicit;
  }

  return (
    project.exportProfiles.find((candidate) => candidate.profileId === 'print_letter_9up') ??
    project.exportProfiles.find((candidate) => candidate.target === 'print_pdf') ??
    defaultPrintProfile()
  );
}

function defaultPrintProfile(): ExportProfile {
  return {
    profileId: 'print_letter_9up',
    target: 'print_pdf',
    imageFormat: 'png',
    widthPx: 744,
    heightPx: 1039,
    quality: undefined,
    includeBleed: false,
    bleedPx: 0,
    includeCropMarks: true,
    includePlaytestWatermark: true,
    watermarkText: 'CUSTOM PLAYTEST - NOT FOR SALE',
    allowPlaceholderArt: false,
    filenameTemplate: '{{collector_number}}_{{slug_name}}.png'
  };
}

function buildPrintSlots(cards: CardRecord[], imagePathsByCardId: Map<string, string>): PrintSlot[] {
  const slots: PrintSlot[] = [];
  for (const card of cards) {
    const imagePath = imagePathsByCardId.get(card.cardId);
    if (!imagePath) {
      throw new Error(`Card ${card.cardId} was not rendered for print export.`);
    }
    for (let index = 0; index < card.printCount; index += 1) {
      slots.push({ card, imagePath });
    }
  }
  return slots;
}

function collectWarnings(renderResults: RenderCardImageResult[], profile: ExportProfile): string[] {
  const warnings = renderResults.flatMap((result) => result.warnings);
  if (profile.includeBleed) {
    warnings.push('Bleed is recorded in the export profile, but Phase 1 PDF assembly uses 2.5in x 3.5in card slots. True print-shop bleed presets are Phase 2.');
  }
  return warnings;
}

async function renderPdf({
  pdfPath,
  paper,
  cardsPerPage,
  includeCropMarks,
  slots
}: {
  pdfPath: string;
  paper: PaperSpec;
  cardsPerPage: number;
  includeCropMarks: boolean;
  slots: PrintSlot[];
}): Promise<void> {
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(await buildPrintHtml({ paper, cardsPerPage, includeCropMarks, slots }), { waitUntil: 'load' });
    await page.emulateMedia({ media: 'print' });
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({
      path: pdfPath,
      printBackground: true,
      preferCSSPageSize: true,
      width: `${paper.widthIn}in`,
      height: `${paper.heightIn}in`,
      margin: { top: '0in', right: '0in', bottom: '0in', left: '0in' }
    });
    await page.close();
  } finally {
    await browser?.close();
  }
}

async function buildPrintHtml({
  paper,
  cardsPerPage,
  includeCropMarks,
  slots
}: {
  paper: PaperSpec;
  cardsPerPage: number;
  includeCropMarks: boolean;
  slots: PrintSlot[];
}): Promise<string> {
  const pages = chunk(slots, cardsPerPage);
  const pageMarkup: string[] = [];
  for (const pageSlots of pages) {
    pageMarkup.push(`<section class="sheet">${await slotMarkup(pageSlots, paper, includeCropMarks)}</section>`);
  }
  return [
    '<!doctype html>',
    '<html>',
    '<head>',
    '<meta charset="utf-8">',
    '<style>',
    printCss(paper),
    '</style>',
    '</head>',
    '<body>',
    pageMarkup.join('\n'),
    '</body>',
    '</html>'
  ].join('\n');
}

async function slotMarkup(slots: PrintSlot[], paper: PaperSpec, includeCropMarks: boolean): Promise<string> {
  const columns = 3;
  const xMargin = (paper.widthIn - columns * CARD_WIDTH_IN) / 2;
  const yMargin = (paper.heightIn - columns * CARD_HEIGHT_IN) / 2;
  const markup: string[] = [];
  for (let index = 0; index < slots.length; index += 1) {
    const slot = slots[index];
    const column = index % columns;
    const row = Math.floor(index / columns);
    const left = xMargin + column * CARD_WIDTH_IN;
    const top = yMargin + row * CARD_HEIGHT_IN;
    markup.push(
      [
        `<div class="card-slot" data-card-id="${escapeHtml(slot.card.cardId)}" style="left:${left.toFixed(3)}in;top:${top.toFixed(3)}in">`,
        includeCropMarks ? cropMarksMarkup() : '',
        `<img src="${await imageDataUri(slot.imagePath)}" alt="${escapeHtml(slot.card.name)}">`,
        '</div>'
      ].join('')
    );
  }
  return markup.join('\n');
}

function printCss(paper: PaperSpec): string {
  return `
    @page { size: ${paper.cssSize}; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #ffffff; }
    body { font-family: Arial, sans-serif; }
    .sheet {
      width: ${paper.widthIn}in;
      height: ${paper.heightIn}in;
      position: relative;
      overflow: hidden;
      page-break-after: always;
      background: #ffffff;
    }
    .sheet:last-child { page-break-after: auto; }
    .card-slot {
      position: absolute;
      width: ${CARD_WIDTH_IN}in;
      height: ${CARD_HEIGHT_IN}in;
      overflow: visible;
    }
    .card-slot img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: fill;
    }
    .crop-mark {
      position: absolute;
      background: #111111;
      z-index: 2;
      pointer-events: none;
    }
    .crop-mark.h { width: 0.14in; height: 0.006in; }
    .crop-mark.v { width: 0.006in; height: 0.14in; }
    .crop-mark.top { top: -0.045in; }
    .crop-mark.bottom { bottom: -0.045in; }
    .crop-mark.left { left: -0.045in; }
    .crop-mark.right { right: -0.045in; }
    .crop-mark.h.left { left: 0; }
    .crop-mark.h.right { right: 0; }
    .crop-mark.v.top { top: 0; }
    .crop-mark.v.bottom { bottom: 0; }
  `;
}

function cropMarksMarkup(): string {
  return [
    '<span class="crop-mark h top left"></span>',
    '<span class="crop-mark v top left"></span>',
    '<span class="crop-mark h top right"></span>',
    '<span class="crop-mark v top right"></span>',
    '<span class="crop-mark h bottom left"></span>',
    '<span class="crop-mark v bottom left"></span>',
    '<span class="crop-mark h bottom right"></span>',
    '<span class="crop-mark v bottom right"></span>'
  ].join('');
}

async function imageDataUri(path: string): Promise<string> {
  const data = await readFile(path);
  return `data:${imageMimeType(path)};base64,${data.toString('base64')}`;
}

function imageMimeType(path: string): string {
  switch (extname(path).toLowerCase()) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    default:
      return 'image/png';
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

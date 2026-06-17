import { readFile, rm } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { chromium, type Browser } from 'playwright';
import { loadAssetPack } from '../assets/assetPack.js';
import type { CardFaceRecord, CardRecord, ExportProfile, ForgeProject } from '../domain/schemas.js';
import { loadProjectReferenceCatalog } from '../reference/referenceStore.js';
import { renderSetImages, type RenderCardImageResult } from '../renderer/renderCard.js';
import { ensureDir } from '../utils/fs.js';
import { variantExportCards, type CardVariantExportMode } from '../variants/cardVariants.js';

export type PrintPaper = 'letter' | 'a4' | 'photo_4x6';
export type PrintLayout = 'single_card' | 'nine_up';
export type PrintInkMode = 'full_color' | 'low_ink' | 'grayscale' | 'wireframe' | 'text_only';
export type PrintOutputFormat = 'pdf' | 'png';

export interface ExportPrintPdfRequest {
  project: ForgeProject;
  rootDir: string;
  setCode: string;
  outputRoot: string;
  paper?: PrintPaper;
  cardsPerPage?: number;
  profileId?: string;
  variantMode?: CardVariantExportMode;
  layout?: PrintLayout;
  inkMode?: PrintInkMode;
  outputFormat?: PrintOutputFormat;
  copies?: number;
  includeCropMarks?: boolean;
  includeCutLines?: boolean;
  scalePercent?: number;
}

export interface ExportPrintPdfResult {
  pdfPath: string;
  outputPath: string;
  outputFormat: PrintOutputFormat;
  imagePaths: string[];
  warnings: string[];
  cardCount: number;
  pageCount: number;
  paper: PrintPaper;
  cardsPerPage: number;
  profileId: string;
  layout: PrintLayout;
  inkMode: PrintInkMode;
  scalePercent: number;
}

export interface PrintSheetSlotInput {
  card: CardRecord;
  face?: CardFaceRecord;
  imagePath?: string;
  imageSrc?: string;
  copies?: number;
}

export interface ExportPrintSheetRequest {
  slots: PrintSheetSlotInput[];
  outputPath: string;
  outputFormat?: PrintOutputFormat;
  paper?: PrintPaper;
  layout?: PrintLayout;
  inkMode?: PrintInkMode;
  includeCropMarks?: boolean;
  includeCutLines?: boolean;
  scalePercent?: number;
  title?: string;
}

export interface ExportPrintSheetResult {
  outputPath: string;
  outputFormat: PrintOutputFormat;
  warnings: string[];
  cardCount: number;
  pageCount: number;
  paper: PrintPaper;
  cardsPerPage: number;
  layout: PrintLayout;
  inkMode: PrintInkMode;
  scalePercent: number;
}

interface PaperSpec {
  id: PrintPaper;
  cssSize: string;
  widthIn: number;
  heightIn: number;
}

interface PrintLayoutSpec {
  id: PrintLayout;
  label: string;
  columns: number;
  rows: number;
}

interface PrintSlot {
  card: CardRecord;
  face?: CardFaceRecord;
  imagePath?: string;
  imageSrc?: string;
}

const MM_PER_IN = 25.4;
const CARD_WIDTH_MM = 63;
const CARD_HEIGHT_MM = 88;
const CARD_WIDTH_IN = CARD_WIDTH_MM / MM_PER_IN;
const CARD_HEIGHT_IN = CARD_HEIGHT_MM / MM_PER_IN;
const SCREEN_PX_PER_IN = 96;
const PRINT_CARD_WIDTH_PX = 1500;
const PRINT_CARD_HEIGHT_PX = 2100;

const PAPER_SPECS: Record<PrintPaper, PaperSpec> = {
  letter: { id: 'letter', cssSize: 'letter', widthIn: 8.5, heightIn: 11 },
  a4: { id: 'a4', cssSize: 'A4', widthIn: 8.27, heightIn: 11.69 },
  photo_4x6: { id: 'photo_4x6', cssSize: '4in 6in', widthIn: 4, heightIn: 6 }
};

const LAYOUT_SPECS: Record<PrintLayout, PrintLayoutSpec> = {
  single_card: { id: 'single_card', label: '1-up', columns: 1, rows: 1 },
  nine_up: { id: 'nine_up', label: '9-up', columns: 3, rows: 3 }
};

export async function exportPrintPdf(request: ExportPrintPdfRequest): Promise<ExportPrintPdfResult> {
  const paper = normalizePaper(request.paper);
  const layout = normalizeLayout(request.layout ?? layoutFromCardsPerPage(request.cardsPerPage ?? 9));
  const scalePercent = normalizeScalePercent(request.scalePercent);
  validateLayoutFitsPaper(PAPER_SPECS[paper], layout, scaledCardSize(scalePercent));
  const cardsPerPage = cardsPerPageForLayout(layout);
  if (request.cardsPerPage !== undefined && request.cardsPerPage !== cardsPerPage) {
    throw new Error(`${LAYOUT_SPECS[layout].label} print layout requires ${cardsPerPage} card${cardsPerPage === 1 ? '' : 's'} per page.`);
  }

  const profile = printProfileForProject(request.project, request.profileId);
  const outputFormat = normalizeOutputFormat(request.outputFormat);
  const inkMode = normalizeInkMode(request.inkMode);
  const variantCards = variantExportCards(request.project, request.variantMode ?? 'primary');
  const printableEntries = variantCards.filter((entry) => entry.card.status !== 'cut' && entry.card.status !== 'archived' && entry.card.printCount > 0);
  if (!printableEntries.length) {
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
    cards: printableEntries.map((entry) => entry.card),
    faces: printableEntries.map((entry) => entry.face),
    art: request.project.art,
    assetPack,
    exportProfile: profile,
    outDir: imagesDir,
    referenceCatalog
  });
  const imagePathsByCardId = new Map(renderResults.map((result) => [result.cardId, result.outputPath]));
  const facesByCardId = new Map(printableEntries.map((entry) => [entry.card.cardId, entry.face]));
  const slots = buildPrintSlots(
    printableEntries.map((entry) => entry.card),
    facesByCardId,
    imagePathsByCardId,
    request.copies
  );
  const outputPath = join(printDir, printFilename(request.setCode, paper, layout, inkMode, outputFormat, scalePercent));

  const sheet = await exportPrintSheet({
    slots,
    outputPath,
    outputFormat,
    paper,
    layout,
    inkMode,
    scalePercent,
    includeCropMarks: request.includeCropMarks ?? profile.includeCropMarks,
    includeCutLines: request.includeCutLines
  });

  return {
    ...sheet,
    pdfPath: outputPath,
    imagePaths: renderResults.map((result) => result.outputPath),
    warnings: collectWarnings(renderResults, profile, sheet.warnings),
    profileId: profile.profileId
  };
}

export async function exportPrintSheet(request: ExportPrintSheetRequest): Promise<ExportPrintSheetResult> {
  const paper = normalizePaper(request.paper);
  const paperSpec = PAPER_SPECS[paper];
  const layout = normalizeLayout(request.layout ?? 'single_card');
  const scalePercent = normalizeScalePercent(request.scalePercent);
  const cardSize = scaledCardSize(scalePercent);
  validateLayoutFitsPaper(paperSpec, layout, cardSize);
  const outputFormat = normalizeOutputFormat(request.outputFormat);
  const inkMode = normalizeInkMode(request.inkMode);
  const cardsPerPage = cardsPerPageForLayout(layout);
  const slots = normalizeSheetSlots(request.slots, inkMode);
  if (!slots.length) {
    throw new Error('No printable cards were provided.');
  }
  const pageCount = Math.ceil(slots.length / cardsPerPage);
  await ensureDir(dirname(request.outputPath));
  await renderSheet({
    outputPath: request.outputPath,
    outputFormat,
    paper: paperSpec,
    layout,
    cardSize,
    inkMode,
    includeCropMarks: request.includeCropMarks ?? true,
    includeCutLines: request.includeCutLines ?? false,
    slots,
    title: request.title
  });
  return {
    outputPath: request.outputPath,
    outputFormat,
    warnings: [],
    cardCount: slots.length,
    pageCount,
    paper,
    cardsPerPage,
    layout,
    inkMode,
    scalePercent
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

  return project.exportProfiles.find((candidate) => candidate.profileId === 'print_letter_9up') ?? project.exportProfiles.find((candidate) => candidate.target === 'print_pdf') ?? defaultPrintProfile();
}

function defaultPrintProfile(): ExportProfile {
  return {
    profileId: 'print_letter_9up',
    target: 'print_pdf',
    imageFormat: 'png',
    widthPx: PRINT_CARD_WIDTH_PX,
    heightPx: PRINT_CARD_HEIGHT_PX,
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

function buildPrintSlots(cards: CardRecord[], facesByCardId: Map<string, CardFaceRecord>, imagePathsByCardId: Map<string, string>, requestedCopies?: number): PrintSheetSlotInput[] {
  const slots: PrintSheetSlotInput[] = [];
  const copyMultiplier = positiveInteger(requestedCopies, 1);
  for (const card of cards) {
    const imagePath = imagePathsByCardId.get(card.cardId);
    if (!imagePath) {
      throw new Error(`Card ${card.cardId} was not rendered for print export.`);
    }
    slots.push({
      card,
      face: facesByCardId.get(card.cardId),
      imagePath,
      copies: card.printCount * copyMultiplier
    });
  }
  return slots;
}

function normalizeSheetSlots(inputs: PrintSheetSlotInput[], inkMode: PrintInkMode): PrintSlot[] {
  const slots: PrintSlot[] = [];
  for (const input of inputs) {
    if (inkMode !== 'wireframe' && inkMode !== 'text_only' && !input.imagePath && !input.imageSrc) {
      throw new Error(`Card ${input.card.cardId} needs a rendered image for ${inkMode} print mode.`);
    }
    const copies = positiveInteger(input.copies, 1);
    for (let index = 0; index < copies; index += 1) {
      slots.push({
        card: input.card,
        face: input.face,
        imagePath: input.imagePath,
        imageSrc: input.imageSrc
      });
    }
  }
  return slots;
}

function collectWarnings(renderResults: RenderCardImageResult[], profile: ExportProfile, sheetWarnings: string[]): string[] {
  const warnings = [...sheetWarnings, ...renderResults.flatMap((result) => result.warnings)];
  if (profile.includeBleed) {
    warnings.push('Bleed is recorded in the export profile, but this PDF assembly uses final 2.5in x 3.5in card slots. Print-shop bleed presets need a separate oversized-card layout.');
  }
  return warnings;
}

async function renderSheet({
  outputPath,
  outputFormat,
  paper,
  layout,
  cardSize,
  inkMode,
  includeCropMarks,
  includeCutLines,
  slots,
  title
}: {
  outputPath: string;
  outputFormat: PrintOutputFormat;
  paper: PaperSpec;
  layout: PrintLayout;
  cardSize: CardSize;
  inkMode: PrintInkMode;
  includeCropMarks: boolean;
  includeCutLines: boolean;
  slots: PrintSlot[];
  title?: string;
}): Promise<void> {
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({ headless: true, args: ['--single-process'] });
    const page = await browser.newPage({
      viewport: {
        width: Math.ceil(paper.widthIn * SCREEN_PX_PER_IN),
        height: Math.ceil(paper.heightIn * SCREEN_PX_PER_IN)
      },
      deviceScaleFactor: outputFormat === 'png' ? 2 : 1
    });
    await page.setContent(await buildPrintHtml({ paper, layout, cardSize, inkMode, includeCropMarks, includeCutLines, slots, title }), { waitUntil: 'load' });
    await page.emulateMedia({ media: 'print' });
    await page.evaluate(() => document.fonts.ready);
    if (outputFormat === 'pdf') {
      await page.pdf({
        path: outputPath,
        printBackground: true,
        preferCSSPageSize: true,
        width: `${paper.widthIn}in`,
        height: `${paper.heightIn}in`,
        margin: { top: '0in', right: '0in', bottom: '0in', left: '0in' }
      });
    } else {
      await page.screenshot({
        path: outputPath,
        type: 'png',
        fullPage: true,
        omitBackground: false
      });
    }
    await page.close();
  } finally {
    await browser?.close();
  }
}

async function buildPrintHtml({
  paper,
  layout,
  cardSize,
  inkMode,
  includeCropMarks,
  includeCutLines,
  slots,
  title
}: {
  paper: PaperSpec;
  layout: PrintLayout;
  cardSize: CardSize;
  inkMode: PrintInkMode;
  includeCropMarks: boolean;
  includeCutLines: boolean;
  slots: PrintSlot[];
  title?: string;
}): Promise<string> {
  const cardsPerPage = cardsPerPageForLayout(layout);
  const pages = chunk(slots, cardsPerPage);
  const pageMarkup: string[] = [];
  for (const pageSlots of pages) {
    pageMarkup.push(`<section class="sheet ink-${inkMode} paper-${paper.id}">${title ? `<div class="sheet-title">${escapeHtml(title)}</div>` : ''}${await slotMarkup(pageSlots, paper, layout, cardSize, inkMode, includeCropMarks, includeCutLines)}</section>`);
  }
  return [
    '<!doctype html>',
    '<html>',
    '<head>',
    '<meta charset="utf-8">',
    '<style>',
    printCss(paper, layout, cardSize),
    '</style>',
    '</head>',
    '<body>',
    pageMarkup.join('\n'),
    '</body>',
    '</html>'
  ].join('\n');
}

async function slotMarkup(slots: PrintSlot[], paper: PaperSpec, layout: PrintLayout, cardSize: CardSize, inkMode: PrintInkMode, includeCropMarks: boolean, includeCutLines: boolean): Promise<string> {
  const layoutSpec = LAYOUT_SPECS[layout];
  const gridWidth = layoutSpec.columns * cardSize.widthIn;
  const gridHeight = layoutSpec.rows * cardSize.heightIn;
  const xMargin = (paper.widthIn - gridWidth) / 2;
  const yMargin = (paper.heightIn - gridHeight) / 2;
  const markup: string[] = [];
  for (let index = 0; index < slots.length; index += 1) {
    const slot = slots[index];
    const column = index % layoutSpec.columns;
    const row = Math.floor(index / layoutSpec.columns);
    const left = xMargin + column * cardSize.widthIn;
    const top = yMargin + row * cardSize.heightIn;
    const slotClasses = ['card-slot'];
    if (includeCutLines) {
      slotClasses.push('with-cut-line');
    }
    markup.push(
      [
        `<div class="${slotClasses.join(' ')}" data-card-id="${escapeHtml(slot.card.cardId)}" style="left:${left.toFixed(3)}in;top:${top.toFixed(3)}in">`,
        includeCropMarks ? cropMarksMarkup() : '',
        await cardMarkup(slot, inkMode),
        '</div>'
      ].join('')
    );
  }
  return markup.join('\n');
}

async function cardMarkup(slot: PrintSlot, inkMode: PrintInkMode): Promise<string> {
  if (inkMode === 'wireframe' || inkMode === 'text_only') {
    return proxyCardMarkup(slot, inkMode);
  }
  const src = slot.imageSrc ?? (slot.imagePath ? await imageDataUri(slot.imagePath) : '');
  return `<img class="rendered-card ${inkModeClass(inkMode)}" src="${escapeHtml(src)}" alt="${escapeHtml(slot.card.name)}">`;
}

function proxyCardMarkup(slot: PrintSlot, inkMode: PrintInkMode): string {
  const face = slot.face;
  const powerToughness = [face?.power, face?.toughness].filter(Boolean).join('/');
  const showArt = inkMode === 'wireframe';
  return [
    `<div class="proxy-card proxy-${inkMode}">`,
    '<header class="proxy-header">',
    `<strong>${escapeHtml(slot.card.name)}</strong>`,
    `<span>${escapeHtml(face?.manaCost ?? '')}</span>`,
    '</header>',
    showArt ? '<div class="proxy-art">Artwork area</div>' : '',
    `<div class="proxy-type">${escapeHtml(face?.typeLine ?? '')}</div>`,
    '<div class="proxy-text">',
    textBlock(face?.oracleText ?? ''),
    face?.flavorText ? `<div class="proxy-divider"></div>${textBlock(face.flavorText, 'flavor')}` : '',
    '</div>',
    '<footer class="proxy-footer">',
    `<span>${escapeHtml(`${slot.card.collectorNumber} ${slot.card.setCode}`)}</span>`,
    powerToughness ? `<strong>${escapeHtml(powerToughness)}</strong>` : '',
    '</footer>',
    '</div>'
  ].join('');
}

function textBlock(value: string, className = ''): string {
  const normalized = value.trim();
  if (!normalized) {
    return '';
  }
  return normalized
    .split(/\n\s*\n/g)
    .map((paragraph) => `<p${className ? ` class="${className}"` : ''}>${inlineText(paragraph)}</p>`)
    .join('');
}

function inlineText(value: string): string {
  return escapeHtml(value)
    .replaceAll('&lt;i&gt;', '<em>')
    .replaceAll('&lt;/i&gt;', '</em>')
    .split('\n')
    .join('<br>');
}

function printCss(paper: PaperSpec, layout: PrintLayout, cardSize: CardSize): string {
  return `
    @page { size: ${paper.cssSize}; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #ffffff; }
    body { font-family: Arial, Helvetica, sans-serif; }
    .sheet {
      width: ${paper.widthIn}in;
      height: ${paper.heightIn}in;
      position: relative;
      overflow: hidden;
      page-break-after: always;
      background: #ffffff;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
    .sheet:last-child { page-break-after: auto; }
    .sheet-title {
      position: absolute;
      left: 0.25in;
      top: 0.16in;
      color: #64748b;
      font-size: 0.09in;
      font-weight: 700;
      letter-spacing: 0;
    }
    .card-slot {
      position: absolute;
      width: ${cardSize.widthIn}in;
      height: ${cardSize.heightIn}in;
      overflow: visible;
    }
    .card-slot.with-cut-line::after {
      content: "";
      position: absolute;
      inset: 0;
      border: 0.006in dashed rgba(71, 85, 105, 0.78);
      pointer-events: none;
    }
    .rendered-card {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: fill;
    }
    .rendered-card.full-color { filter: saturate(1.04) contrast(1.04) brightness(0.99); }
    .paper-photo_4x6 .rendered-card.full-color { filter: saturate(1.08) contrast(1.06) brightness(0.99); }
    .rendered-card.low-ink { filter: saturate(0.72) brightness(1.08) contrast(0.92); }
    .rendered-card.grayscale { filter: grayscale(1) brightness(1.08) contrast(0.94); }
    .proxy-card {
      width: 100%;
      height: 100%;
      display: grid;
      grid-template-rows: auto ${layout === 'single_card' ? '1.42in' : '1.32in'} auto minmax(0, 1fr) auto;
      gap: 0.045in;
      padding: 0.12in;
      border: 0.012in solid #566070;
      border-radius: 0.12in;
      color: #1f2937;
      background: #ffffff;
      font-family: Georgia, "Times New Roman", serif;
    }
    .proxy-text_only {
      grid-template-rows: auto auto minmax(0, 1fr) auto;
      border-color: #7a8494;
    }
    .proxy-header,
    .proxy-footer {
      min-width: 0;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 0.05in;
    }
    .proxy-header {
      padding-bottom: 0.035in;
      border-bottom: 0.007in solid #8b95a3;
      font-size: 0.14in;
      line-height: 1.08;
    }
    .proxy-header span,
    .proxy-footer span {
      color: #4b5563;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 0.075in;
      font-weight: 700;
    }
    .proxy-art {
      display: grid;
      place-items: center;
      border: 0.008in solid #a5afbd;
      background: repeating-linear-gradient(135deg, #ffffff 0, #ffffff 0.08in, #eef2f7 0.08in, #eef2f7 0.16in);
      color: #6b7280;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 0.085in;
      font-weight: 800;
      text-transform: uppercase;
    }
    .proxy-type {
      padding: 0.035in 0.045in;
      border: 0.008in solid #8b95a3;
      background: #f8fafc;
      font-size: 0.095in;
      font-weight: 700;
      line-height: 1.05;
    }
    .proxy-text {
      min-height: 0;
      overflow: hidden;
      padding: 0.035in 0.025in 0;
      font-size: 0.079in;
      line-height: 1.18;
    }
    .proxy-text p {
      margin: 0 0 0.055in;
    }
    .proxy-text p.flavor {
      color: #4b5563;
      font-style: italic;
    }
    .proxy-text em {
      font-style: italic;
    }
    .proxy-divider {
      height: 0;
      margin: 0.04in 0 0.055in;
      border-top: 0.006in solid #a5afbd;
    }
    .proxy-footer {
      padding-top: 0.035in;
      border-top: 0.007in solid #8b95a3;
      font-size: 0.12in;
    }
    .crop-mark {
      position: absolute;
      background: #111111;
      z-index: 2;
      pointer-events: none;
    }
    .ink-low_ink .crop-mark,
    .ink-grayscale .crop-mark,
    .ink-wireframe .crop-mark,
    .ink-text_only .crop-mark {
      background: #566070;
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

function printFilename(setCode: string, paper: PrintPaper, layout: PrintLayout, inkMode: PrintInkMode, outputFormat: PrintOutputFormat, scalePercent: number): string {
  const scaleSuffix = scalePercent === 100 ? '' : `-${scalePercent}pct`;
  if (layout === 'nine_up' && inkMode === 'full_color' && outputFormat === 'pdf') {
    return `${setCode}-${printToken(paper)}-9up${scaleSuffix}.pdf`;
  }
  return `${setCode}-${printToken(paper)}-${printToken(layout)}-${printToken(inkMode)}${scaleSuffix}.${outputFormat}`;
}

function layoutFromCardsPerPage(cardsPerPage: number): PrintLayout {
  if (cardsPerPage === 1) {
    return 'single_card';
  }
  if (cardsPerPage === 9) {
    return 'nine_up';
  }
  throw new Error('Print export supports 1-up single-card sheets and 9-up playtest sheets.');
}

function cardsPerPageForLayout(layout: PrintLayout): number {
  const spec = LAYOUT_SPECS[layout];
  return spec.columns * spec.rows;
}

function normalizePaper(value: PrintPaper | undefined): PrintPaper {
  const paper = value ?? 'letter';
  if (!PAPER_SPECS[paper]) {
    throw new Error(`Unsupported paper ${paper}.`);
  }
  return paper;
}

interface CardSize {
  widthIn: number;
  heightIn: number;
  widthMm: number;
  heightMm: number;
}

function scaledCardSize(scalePercent: number): CardSize {
  const scale = scalePercent / 100;
  return {
    widthIn: CARD_WIDTH_IN * scale,
    heightIn: CARD_HEIGHT_IN * scale,
    widthMm: CARD_WIDTH_MM * scale,
    heightMm: CARD_HEIGHT_MM * scale
  };
}

function validateLayoutFitsPaper(paper: PaperSpec, layout: PrintLayout, cardSize: CardSize): void {
  const layoutSpec = LAYOUT_SPECS[layout];
  const gridWidth = layoutSpec.columns * cardSize.widthIn;
  const gridHeight = layoutSpec.rows * cardSize.heightIn;
  if (gridWidth > paper.widthIn || gridHeight > paper.heightIn) {
    throw new Error(`${LAYOUT_SPECS[layout].label} layout does not fit on ${paperLabel(paper.id)}. Use 1-up card layout for this paper.`);
  }
}

function normalizeScalePercent(value: number | undefined): number {
  if (value === undefined) {
    return 100;
  }
  if (!Number.isFinite(value)) {
    return 100;
  }
  return Math.min(125, Math.max(90, Math.round(value)));
}

function paperLabel(paper: PrintPaper): string {
  if (paper === 'photo_4x6') {
    return '4x6 photo paper';
  }
  return paper.toUpperCase();
}

function normalizeLayout(value: PrintLayout): PrintLayout {
  if (!LAYOUT_SPECS[value]) {
    throw new Error(`Unsupported print layout ${value}.`);
  }
  return value;
}

function normalizeInkMode(value: PrintInkMode | undefined): PrintInkMode {
  const inkMode = value ?? 'full_color';
  if (!['full_color', 'low_ink', 'grayscale', 'wireframe', 'text_only'].includes(inkMode)) {
    throw new Error(`Unsupported print ink mode ${inkMode}.`);
  }
  return inkMode;
}

function normalizeOutputFormat(value: PrintOutputFormat | undefined): PrintOutputFormat {
  const outputFormat = value ?? 'pdf';
  if (outputFormat !== 'pdf' && outputFormat !== 'png') {
    throw new Error(`Unsupported print output format ${outputFormat}.`);
  }
  return outputFormat;
}

function inkModeClass(inkMode: PrintInkMode): string {
  return inkMode.replace('_', '-');
}

function printToken(value: string): string {
  return value.replaceAll('_', '-');
}

function positiveInteger(value: number | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }
  return Number.isInteger(value) && value > 0 ? value : fallback;
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

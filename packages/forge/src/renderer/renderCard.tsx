import { createHash } from 'node:crypto';
import { access, readFile, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { chromium, type Browser } from 'playwright';
import { renderToStaticMarkup } from 'react-dom/server';
import { CardSvg } from './CardSvg.js';
import type { AssetPack } from '../assets/assetPack.js';
import type { ArtManifestRecord, CardFaceRecord, CardRecord, ExportProfile } from '../domain/schemas.js';
import type { ReferenceCatalog } from '../reference/catalog.js';
import { ensureDir } from '../utils/fs.js';
import { renderFilenameTemplate } from '../utils/slug.js';

export interface RenderCardImageRequest {
  card: CardRecord;
  faces: CardFaceRecord[];
  art: Record<string, ArtManifestRecord>;
  assetPack: AssetPack;
  exportProfile: ExportProfile;
  outDir: string;
  referenceCatalog?: ReferenceCatalog;
}

export interface RenderCardImageResult {
  cardId: string;
  outputPath: string;
  hash: string;
  warnings: string[];
}

export async function renderCardImage(request: RenderCardImageRequest): Promise<RenderCardImageResult> {
  const face = [...request.faces].sort((a, b) => a.faceIndex - b.faceIndex)[0];
  if (!face) {
    throw new Error(`Card ${request.card.cardId} has no faces to render.`);
  }
  const art = face.artId ? request.art[face.artId] : undefined;
  const warnings: string[] = [];
  const hasArtFile = await fileExists(art?.absolutePath);
  const hasInlineArt = Boolean((art as ArtManifestRecord & { dataUri?: string } | undefined)?.dataUri);
  if (face.artId && !hasArtFile && !hasInlineArt) {
    if (!request.exportProfile.allowPlaceholderArt) {
      throw new Error(`Card ${request.card.cardId} requires art ${face.artId}, but placeholder art is not allowed.`);
    }
    warnings.push(`Using quiet missing-art fill for ${face.artId}.`);
  }
  const renderableArt = hasArtFile && art?.absolutePath ? { ...art, dataUri: await readImageDataUri(art.absolutePath) } : art;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>${renderToStaticMarkup(
    <CardSvg card={request.card} face={face} art={renderableArt} assetPack={request.assetPack} exportProfile={request.exportProfile} referenceCatalog={request.referenceCatalog} />
  )}`;
  const hash = createHash('sha256')
    .update(JSON.stringify({ card: request.card, face, art, profile: request.exportProfile, assetPack: request.assetPack.manifest, referenceCatalog: referenceCatalogHashInput(request.referenceCatalog) }))
    .digest('hex');
  const filename = renderFilenameTemplate(request.exportProfile.filenameTemplate, request.card);
  const outputPath = join(request.outDir, filename);
  await ensureDir(request.outDir);

  await writeFile(`${outputPath}.svg`, svg, 'utf8');
  await screenshotSvg(svg, outputPath, request.exportProfile);
  await writeFile(`${outputPath}.render.json`, JSON.stringify({ card_id: request.card.cardId, hash, warnings }, null, 2));

  return {
    cardId: request.card.cardId,
    outputPath,
    hash,
    warnings
  };
}

async function screenshotSvg(svg: string, outputPath: string, profile: ExportProfile): Promise<void> {
  if (profile.imageFormat === 'webp') {
    throw new Error('WebP export needs a postprocessor and is not supported in the first vertical slice.');
  }
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await screenshotSvgOnce(svg, outputPath, profile);
      return;
    } catch (error) {
      lastError = error;
      await delay(150 * attempt);
    }
  }
  throw lastError;
}

async function screenshotSvgOnce(svg: string, outputPath: string, profile: ExportProfile): Promise<void> {
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: profile.widthPx, height: profile.heightPx },
      deviceScaleFactor: 1
    });
    await page.setContent(
      [
        '<!doctype html>',
        '<html>',
        '<head>',
        '<style>',
        'html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent;}',
        'svg{display:block;width:100vw;height:100vh;}',
        '</style>',
        '</head>',
        '<body>',
        svg,
        '</body>',
        '</html>'
      ].join(''),
      { waitUntil: 'load' }
    );
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined))));
    await page.screenshot({
      path: outputPath,
      type: profile.imageFormat === 'png' ? 'png' : 'jpeg',
      quality: profile.imageFormat === 'png' ? undefined : profile.quality ?? 86,
      omitBackground: false
    });
    await page.close();
  } finally {
    await browser?.close();
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function renderSetImages(args: {
  cards: CardRecord[];
  faces: CardFaceRecord[];
  art: Record<string, ArtManifestRecord>;
  assetPack: AssetPack;
  exportProfile: ExportProfile;
  outDir: string;
  referenceCatalog?: ReferenceCatalog;
}): Promise<RenderCardImageResult[]> {
  const results: RenderCardImageResult[] = [];
  for (const card of args.cards) {
    results.push(
      await renderCardImage({
        card,
        faces: args.faces.filter((face) => face.cardId === card.cardId),
        art: args.art,
        assetPack: args.assetPack,
        exportProfile: args.exportProfile,
        outDir: args.outDir,
        referenceCatalog: args.referenceCatalog
      })
    );
  }
  return results;
}

function referenceCatalogHashInput(catalog: ReferenceCatalog | undefined): unknown {
  if (!catalog) {
    return undefined;
  }
  return {
    updatedAt: catalog.updatedAt,
    terms: catalog.terms.map((term) => ({
      id: term.id,
      category: term.category,
      name: term.name,
      definition: term.definition,
      reminderText: term.reminderText,
      workflowStatus: term.workflowStatus,
      updatedAt: term.updatedAt
    }))
  };
}

async function fileExists(path?: string): Promise<boolean> {
  if (!path) {
    return false;
  }
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readImageDataUri(path: string): Promise<string> {
  const data = await readFile(path);
  return `data:${imageMimeType(path)};base64,${data.toString('base64')}`;
}

function imageMimeType(path: string): string {
  switch (extname(path).toLowerCase()) {
    case '.svg':
      return 'image/svg+xml';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    default:
      return 'image/png';
  }
}

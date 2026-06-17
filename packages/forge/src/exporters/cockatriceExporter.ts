import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import JSZip from 'jszip';
import { loadAssetPack } from '../assets/assetPack.js';
import type { ForgeProject } from '../domain/schemas.js';
import { loadProjectReferenceCatalog } from '../reference/referenceStore.js';
import { renderSetImages } from '../renderer/renderCard.js';
import { ensureDir } from '../utils/fs.js';
import { variantExportCards, type CardVariantExportMode } from '../variants/cardVariants.js';
import { buildCockatriceXml } from './cockatriceXml.js';

export interface ExportCockatricePackageRequest {
  project: ForgeProject;
  rootDir: string;
  setCode: string;
  outputRoot: string;
  zip?: boolean;
  variantMode?: CardVariantExportMode;
}

export interface ExportCockatricePackageResult {
  xmlPath: string;
  zipPath?: string;
  imagePaths: string[];
  warnings: string[];
}

export async function exportCockatricePackage(request: ExportCockatricePackageRequest): Promise<ExportCockatricePackageResult> {
  const profile = request.project.exportProfiles.find((candidate) => candidate.target === 'cockatrice');
  if (!profile) {
    throw new Error(`No Cockatrice export profile found for ${request.setCode}.`);
  }
  const assetPack = await loadAssetPack({
    rootDir: request.rootDir,
    packId: request.project.set.defaultAssetPack ?? 'debug'
  });
  const referenceCatalog = loadProjectReferenceCatalog(request.rootDir);
  const variantCards = variantExportCards(request.project, request.variantMode ?? 'primary');
  const exportProject = {
    ...request.project,
    cards: variantCards.map((entry) => entry.card),
    faces: variantCards.map((entry) => entry.face)
  };
  const cockatriceDir = join(request.outputRoot, request.setCode, 'cockatrice');
  const picsDir = join(cockatriceDir, 'pics', 'CUSTOM', request.setCode);
  await rm(picsDir, { recursive: true, force: true });
  await ensureDir(picsDir);

  const renderResults = await renderSetImages({
    cards: exportProject.cards,
    faces: exportProject.faces,
    art: request.project.art,
    assetPack,
    exportProfile: profile,
    outDir: picsDir,
    referenceCatalog
  });
  const imagePathsByCardId = new Map(renderResults.map((result) => [result.cardId, result.outputPath]));
  const xml = buildCockatriceXml(exportProject, imagePathsByCardId);
  const xmlPath = join(cockatriceDir, `${request.setCode}.xml`);
  const readmePath = join(cockatriceDir, 'INSTALL_COCKATRICE.md');
  await ensureDir(cockatriceDir);
  await writeFile(xmlPath, xml, 'utf8');
  await writeFile(
    readmePath,
    [
      `# Install ${request.setCode} in Cockatrice`,
      '',
      `1. Copy ${request.setCode}.xml to Cockatrice/customsets/.`,
      `2. Copy pics/CUSTOM/${request.setCode}/ to Cockatrice/pics/CUSTOM/${request.setCode}/.`,
      '3. Restart Cockatrice.',
      '4. Open one card from the custom set and confirm the image appears.',
      ''
    ].join('\n'),
    'utf8'
  );

  let zipPath: string | undefined;
  if (request.zip) {
    zipPath = join(cockatriceDir, `${request.setCode}-cockatrice.zip`);
    const zip = new JSZip();
    zip.file(`${request.setCode}.xml`, xml);
    zip.file('INSTALL_COCKATRICE.md', await readFile(readmePath, 'utf8'));
    for (const imagePath of renderResults.map((result) => result.outputPath)) {
      const imageName = imagePath.split('/').pop();
      if (imageName) {
        zip.file(`pics/CUSTOM/${request.setCode}/${imageName}`, await readFile(imagePath));
      }
    }
    await writeFile(zipPath, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
  }

  return {
    xmlPath,
    zipPath,
    imagePaths: renderResults.map((result) => result.outputPath),
    warnings: renderResults.flatMap((result) => result.warnings)
  };
}

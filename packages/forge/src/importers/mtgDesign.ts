import { access, copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import JSZip from 'jszip';
import { parseCsvRecords, type CsvRow, writeCsvRecords } from '../data/csv.js';
import { isKnownLayout, layoutSupportFor, normalizeLayoutId, RENDERABLE_LAYOUTS } from '../domain/frameSupport.js';
import { normalizeManaCost } from '../domain/mana.js';
import {
  frameTypeFor,
  inferLayout,
  normalizeColors,
  normalizeRarity,
  parseCardsXml,
  safeCardId
} from '../data/xml.js';

export type MtgDesignImportFormat = 'csv' | 'xml' | 'cockatrice' | 'planesculptors';
export type ImportMode = 'append' | 'replace';
export type ImportWarningSeverity = 'warning' | 'note';

export interface ImportAuditWarning {
  code: string;
  severity: ImportWarningSeverity;
  cardId?: string;
  collectorNumber?: string;
  name?: string;
  message: string;
}

export interface ImportAudit {
  setCode: string;
  sourceFormat: MtgDesignImportFormat;
  rawSourcePath?: string;
  importedCards: number;
  importedFaces: number;
  importedVariants: number;
  importedVariantFaces: number;
  artReferences: number;
  missingArt: number;
  legacyRenderReferences: number;
  editableArtNeeded: number;
  parsedTokens: number;
  parsedSagas: number;
  possibleTransformCards: number;
  unsupportedLayouts: Array<{ layout: string; count: number }>;
  duplicates: Array<{ collectorNumber: string; cardIds: string[] }>;
  warnings: ImportAuditWarning[];
  markdownSummary: string;
}

export interface AnalyzedImport {
  cards: CsvRow[];
  faces: CsvRow[];
  variants: CsvRow[];
  variantFaces: CsvRow[];
  art: CsvRow[];
  audit: ImportAudit;
}

type ImportRecordSet = Pick<AnalyzedImport, 'cards' | 'faces' | 'variants' | 'variantFaces' | 'art'>;

export interface AnalyzeMtgDesignImportOptions {
  setCode: string;
  format: MtgDesignImportFormat;
  content: string;
  inputPath?: string;
}

export interface ApplyImportedRowsOptions {
  repoRoot: string;
  setCode: string;
  imported: AnalyzedImport;
  mode: ImportMode;
  dryRun?: boolean;
}

export interface ImportApplySummary extends ImportAudit {
  mode: ImportMode;
  dryRun: boolean;
  reportPath?: string;
}

export const CARD_HEADERS = [
  'card_id',
  'set_code',
  'collector_number',
  'name',
  'layout',
  'mode',
  'source_card_name',
  'source_set_code',
  'rarity',
  'color_identity',
  'tags',
  'status',
  'print_count',
  'export_name_override',
  'notes'
];

export const FACE_HEADERS = [
  'card_id',
  'face_index',
  'face_name',
  'mana_cost',
  'type_line',
  'oracle_text',
  'flavor_text',
  'power',
  'toughness',
  'loyalty',
  'defense',
  'colors',
  'frame_type',
  'art_id',
  'artist_display',
  'watermark',
  'rules_text_size_hint',
  'rules_text_padding_top',
  'rules_text_padding_right',
  'rules_text_padding_bottom',
  'rules_text_padding_left',
  'rules_text_reminder_mode',
  'layout_variant'
];

export const VARIANT_HEADERS = [
  'variant_id',
  'card_id',
  'display_name',
  'kind',
  'status',
  'is_primary',
  'export_policy',
  'tags',
  'notes',
  'created_at',
  'updated_at'
];

export const VARIANT_FACE_HEADERS = [
  'variant_id',
  'card_id',
  'face_index',
  'face_name',
  'mana_cost',
  'type_line',
  'oracle_text',
  'flavor_text',
  'power',
  'toughness',
  'loyalty',
  'defense',
  'colors',
  'frame_type',
  'art_id',
  'artist_display',
  'watermark',
  'rules_text_size_hint',
  'rules_text_padding_top',
  'rules_text_padding_right',
  'rules_text_padding_bottom',
  'rules_text_padding_left',
  'rules_text_reminder_mode',
  'layout_variant'
];

export const ART_HEADERS = [
  'art_id',
  'file_path',
  'source_url',
  'source_type',
  'artist',
  'license',
  'permission_status',
  'checksum_sha256',
  'position_x',
  'position_y',
  'scale',
  'crop_x',
  'crop_y',
  'crop_w',
  'crop_h',
  'notes'
];

export const SET_HEADERS = [
  'set_code',
  'set_name',
  'set_type',
  'version',
  'default_language',
  'default_asset_pack',
  'default_export_profile',
  'author',
  'status',
  'notes'
];

export const EXPORT_PROFILE_HEADERS = [
  'profile_id',
  'target',
  'image_format',
  'width_px',
  'height_px',
  'quality',
  'include_bleed',
  'bleed_px',
  'include_crop_marks',
  'include_playtest_watermark',
  'watermark_text',
  'allow_placeholder_art',
  'filename_template'
];

export function analyzeMtgDesignImport(options: AnalyzeMtgDesignImportOptions): AnalyzedImport {
  const format = options.format === 'xml' ? 'cockatrice' : options.format;
  const parsed =
    format === 'planesculptors'
      ? parsePlanesculptorsText(options.content, { setCode: options.setCode, inputPath: options.inputPath })
      : format === 'csv'
        ? normalizeImportedRows(parseCsvRecords(options.content), [], [], options.setCode, format)
        : normalizeImportedRowsFromXml(options.content, options.setCode, format);
  const withLocalArt = attachLocalImageCandidates(parsed, options.inputPath, options.setCode);
  const audit = buildImportAudit({
    setCode: options.setCode,
    sourceFormat: options.format,
    rawSourcePath: options.inputPath,
    ...withLocalArt
  });
  return { ...withLocalArt, audit };
}

export function parsePlanesculptorsText(content: string, options: { setCode: string; inputPath?: string }): ImportRecordSet {
  const chunks = content.split('===========').filter((chunk) => chunk.trim());
  const cards: CsvRow[] = [];
  const faces: CsvRow[] = [];
  const art: CsvRow[] = [];

  for (const [index, chunk] of chunks.entries()) {
    const rawLines = chunk.split(/\r?\n/);
    const layoutIndex = rawLines.findIndex((line) => /^(normal|token|split|transform|modal_dfc|saga|planeswalker)$/i.test(line.trim()));
    if (layoutIndex < 0) {
      continue;
    }
    const lines = rawLines.slice(layoutIndex).map((line) => line.trimEnd());
    const rawLayout = clean(lines[0]);
    const collectorRaw = clean(lines[1]) || String(index + 1).padStart(3, '0');
    const collectorNumber = cleanCollectorNumber(collectorRaw);
    const rarity = normalizeRarity(clean(lines[3])) as string;
    const name = clean(lines[4]) || `Imported Card ${index + 1}`;
    const colorText = clean(lines[5]);
    const manaCost = manaCostFromHtml(clean(lines[6]));
    const typeLine = clean(lines[7]) || 'Creature';
    const power = clean(lines[8]);
    const toughness = clean(lines[9]);
    const oracleText = textFromPlanesculptorsHtml(lines[10] ?? '');
    const flavorText = stripOuterItalic(textFromPlanesculptorsHtml(lines[11] ?? ''));
    const artist = clean(lines[12]);
    const layout = normalizeLayout(rawLayout, typeLine);
    const cardId = safeCardId(`${options.setCode}-${collectorNumber || index + 1}`);
    const colors = normalizeColors(colorText || manaCost);

    cards.push({
      card_id: cardId,
      set_code: options.setCode,
      collector_number: collectorNumber,
      name,
      layout,
      mode: layout === 'token' ? 'token' : 'imported',
      source_card_name: '',
      source_set_code: '',
      rarity,
      color_identity: colors,
      tags: importTags(typeLine, layout),
      status: statusForLayout(layout),
      print_count: '1',
      export_name_override: '',
      notes: 'Imported from Planesculptors text.'
    });

    faces.push({
      card_id: cardId,
      face_index: '0',
      face_name: name,
      mana_cost: manaCost,
      type_line: typeLine,
      oracle_text: oracleText,
      flavor_text: flavorText,
      power,
      toughness,
      loyalty: '',
      defense: '',
      colors,
      frame_type: frameTypeFor(typeLine, layout),
      art_id: '',
      artist_display: artist,
      watermark: '',
      rules_text_size_hint: 'auto',
      rules_text_padding_top: '',
      rules_text_padding_right: '',
      rules_text_padding_bottom: '',
      rules_text_padding_left: '',
      rules_text_reminder_mode: 'auto',
      layout_variant: 'normal'
    });
  }

  return attachLocalImageCandidates(withPrimaryVariants({ cards, faces, art }), options.inputPath, options.setCode);
}

export async function readMtgDesignInput(inputPath: string, format: MtgDesignImportFormat): Promise<{ content: string; inputPath: string }> {
  const resolved = resolve(inputPath);
  const info = await stat(resolved);
  if (info.isDirectory()) {
    const file = await findImportFile(resolved, format);
    return { content: await readFile(file, 'utf8'), inputPath: file };
  }
  if (resolved.toLowerCase().endsWith('.zip')) {
    const content = await readFromZip(resolved, format);
    return { content, inputPath: resolved };
  }
  return { content: await readFile(resolved, 'utf8'), inputPath: resolved };
}

export async function applyImportedRows(options: ApplyImportedRowsOptions): Promise<ImportApplySummary> {
  const summary: ImportApplySummary = {
    ...options.imported.audit,
    mode: options.mode,
    dryRun: Boolean(options.dryRun)
  };
  if (options.dryRun) {
    return summary;
  }

  const setDir = join(options.repoRoot, 'sets', options.setCode);
  await ensureSetScaffold(options.repoRoot, options.setCode);
  const cardsPath = join(setDir, 'cards.csv');
  const facesPath = join(setDir, 'card_faces.csv');
  const variantsPath = join(setDir, 'card_variants.csv');
  const variantFacesPath = join(setDir, 'card_variant_faces.csv');
  const artPath = join(setDir, 'art_manifest.csv');
  const cards = options.mode === 'replace' ? [] : await readCsvIfExists(cardsPath);
  const faces = options.mode === 'replace' ? [] : await readCsvIfExists(facesPath);
  const variants = options.mode === 'replace' ? [] : await readCsvIfExists(variantsPath);
  const variantFaces = options.mode === 'replace' ? [] : await readCsvIfExists(variantFacesPath);
  const artRows = options.mode === 'replace' ? [] : await readCsvIfExists(artPath);
  const copiedArt = await prepareArtRowsForWrite(options.repoRoot, options.setCode, options.imported.art);
  const artIdMap = new Map(copiedArt.map((row) => [row.art_id, row]));

  for (const card of options.imported.cards) {
    upsertRowByKeys(cards, ['card_id'], card);
  }
  for (const face of options.imported.faces) {
    const artId = face.art_id;
    upsertRowByKeys(faces, ['card_id', 'face_index'], artId && artIdMap.has(artId) ? face : { ...face, art_id: artId ?? '' });
  }
  for (const variant of options.imported.variants) {
    upsertRowByKeys(variants, ['variant_id'], variant);
  }
  for (const face of options.imported.variantFaces) {
    const artId = face.art_id;
    upsertRowByKeys(variantFaces, ['variant_id', 'card_id', 'face_index'], artId && artIdMap.has(artId) ? face : { ...face, art_id: artId ?? '' });
  }
  for (const art of copiedArt) {
    upsertRowByKeys(artRows, ['art_id'], art);
  }

  enforcePrimaryVariantRows(variants, options.imported.variants);
  await writeFile(cardsPath, `${writeCsvRecords(cards, CARD_HEADERS)}\n`, 'utf8');
  await writeFile(facesPath, `${writeCsvRecords(faces, FACE_HEADERS)}\n`, 'utf8');
  await writeFile(variantsPath, `${writeCsvRecords(variants, VARIANT_HEADERS)}\n`, 'utf8');
  await writeFile(variantFacesPath, `${writeCsvRecords(variantFaces, VARIANT_FACE_HEADERS)}\n`, 'utf8');
  await writeFile(artPath, `${writeCsvRecords(artRows, ART_HEADERS)}\n`, 'utf8');

  return summary;
}

export function upsertRowByKeys(rows: CsvRow[], keys: string[], next: CsvRow): void {
  const index = rows.findIndex((row) => keys.every((key) => clean(row[key]) === clean(next[key])));
  if (index >= 0) {
    rows[index] = { ...rows[index], ...next };
    return;
  }
  rows.push(next);
}

export async function writeImportReports(reportPath: string, summary: ImportApplySummary | ImportAudit): Promise<void> {
  const jsonPath = reportPath;
  await mkdir(dirname(jsonPath), { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  const markdownPath = jsonPath.replace(/\.json$/i, '.md');
  await writeFile(markdownPath, `${summary.markdownSummary}\n`, 'utf8');
}

function normalizeImportedRowsFromXml(content: string, setCode: string, format: MtgDesignImportFormat): ImportRecordSet {
  const parsed = parseCardsXml(content);
  return normalizeImportedRows(parsed.cards, parsed.faces, parsed.art ?? [], setCode, format);
}

function normalizeImportedRows(sourceCards: CsvRow[], sourceFaces: CsvRow[], sourceArt: CsvRow[], setCode: string, format: MtgDesignImportFormat): ImportRecordSet {
  const facesByCardId = new Map<string, CsvRow[]>();
  for (const face of sourceFaces) {
    facesByCardId.set(face.card_id, [...(facesByCardId.get(face.card_id) ?? []), face]);
  }
  const artById = new Map(sourceArt.map((row) => [row.art_id, row]));
  const cards: CsvRow[] = [];
  const variants: CsvRow[] = [];
  const variantFaces: CsvRow[] = [];
  const art: CsvRow[] = [];
  const variantIdsByCardKey = new Map<string, string>();

  for (const [index, row] of sourceCards.entries()) {
    const collectorNumber = clean(row.collector_number || row.number || row.collector || String(index + 1).padStart(3, '0'));
    const cardId = safeCardId(row.card_id || `${setCode}-${collectorNumber}`);
    const sourceFaceRows = facesByCardId.get(row.card_id) ?? [row];
    const primaryFace = sourceFaceRows[0] ?? row;
    const name = clean(row.name || primaryFace.face_name || `Imported Card ${index + 1}`);
    const primaryTypeLine = clean(primaryFace.type_line || row.type_line || row.type || row.card_type || 'Creature');
    const layout = normalizeLayout(clean(row.layout || inferLayout(primaryTypeLine)), primaryTypeLine);
    const colors = normalizeColors(clean(row.color_identity || primaryFace.colors || row.colors) || clean(primaryFace.mana_cost || row.mana_cost || row.manacost));

    upsertRowByKeys(cards, ['card_id'], {
      card_id: cardId,
      set_code: setCode,
      collector_number: collectorNumber,
      name,
      layout,
      mode: clean(row.mode) || (layout === 'token' ? 'token' : 'imported'),
      source_card_name: clean(row.source_card_name),
      source_set_code: clean(row.source_set_code),
      rarity: normalizeRarity(clean(row.rarity)),
      color_identity: colors,
      tags: mergeTags(row.tags, importTags(primaryTypeLine, layout)),
      status: clean(row.status) || statusForLayout(layout),
      print_count: clean(row.print_count) || '1',
      export_name_override: clean(row.export_name_override),
      notes: clean(row.notes || `Imported from ${importSourceLabel(format)}.`)
    });

    const variantKey = variantIdentityKey(row);
    const variantMapKey = `${cardId}\u0000${variantKey}`;
    const existingVariantId = variantIdsByCardKey.get(variantMapKey);
    const variantIndex = existingVariantId ? variantOrdinal(existingVariantId) : [...variantIdsByCardKey.keys()].filter((key) => key.startsWith(`${cardId}\u0000`)).length + 1;
    const variantId = clean(row.variant_id) || existingVariantId || safeCardId(`${cardId}-V${variantIndex}`);
    variantIdsByCardKey.set(variantMapKey, variantId);
    const existingVariant = variants.find((variant) => variant.variant_id === variantId);
    const rawKind = clean(row.variant_kind || row.kind);
    const rawStatus = clean(row.variant_status);
    const rawExportPolicy = clean(row.variant_export_policy || row.export_policy);
    upsertRowByKeys(variants, ['variant_id'], {
      variant_id: variantId,
      card_id: cardId,
      display_name: clean(row.variant_display_name || row.variant_name || row.display_name) || existingVariant?.display_name || `Variant ${variantIndex}`,
      kind: rawKind ? normalizeVariantKind(rawKind) : existingVariant?.kind || 'mechanics_test',
      status: rawStatus ? normalizeVariantStatus(rawStatus) : existingVariant?.status || 'active',
      is_primary: clean(row.variant_is_primary || row.is_primary) ? normalizeBooleanCell(row.variant_is_primary || row.is_primary) : existingVariant?.is_primary || 'false',
      export_policy: rawExportPolicy ? normalizeVariantExportPolicy(rawExportPolicy) : existingVariant?.export_policy || 'default',
      tags: clean(row.variant_tags) || existingVariant?.tags || '',
      notes: clean(row.variant_notes) || existingVariant?.notes || '',
      created_at: clean(row.variant_created_at || row.created_at) || existingVariant?.created_at || '',
      updated_at: clean(row.variant_updated_at || row.updated_at) || existingVariant?.updated_at || ''
    });

    for (const [faceOffset, face] of sourceFaceRows.entries()) {
      const typeLine = clean(face.type_line || row.type_line || row.type || row.card_type || primaryTypeLine);
      const faceArtId = clean(face.art_id || row.art_id);
      const sourceArtRow = faceArtId ? artById.get(faceArtId) : undefined;
      const artReference = clean(row.art_url || row.source_url || sourceArtRow?.source_url);
      const importedArtId = faceArtId || (artReference ? (variantId.endsWith('-V1') ? `${cardId}-ART` : `${variantId}-ART`) : '');
      variantFaces.push({
        variant_id: variantId,
        card_id: cardId,
        face_index: clean(face.face_index) || String(faceOffset),
        face_name: clean(face.face_name) || name,
        mana_cost: normalizeManaCost(clean(face.mana_cost || row.mana_cost || row.manacost)),
        type_line: typeLine,
        oracle_text: clean(face.oracle_text || row.oracle_text || row.rules_text || row.text),
        flavor_text: clean(face.flavor_text || row.flavor_text),
        power: clean(face.power || row.power),
        toughness: clean(face.toughness || row.toughness),
        loyalty: clean(face.loyalty || row.loyalty),
        defense: clean(face.defense || row.defense),
        colors: normalizeColors(clean(face.colors || row.colors || row.color_identity) || clean(face.mana_cost || row.mana_cost || row.manacost)),
        frame_type: clean(face.frame_type || row.frame_type) || frameTypeFor(typeLine, layout),
        art_id: importedArtId,
        artist_display: clean(face.artist_display || row.artist_display || row.artist),
        watermark: clean(face.watermark || row.watermark),
        rules_text_size_hint: clean(face.rules_text_size_hint || row.rules_text_size_hint) || 'auto',
        rules_text_padding_top: clean(face.rules_text_padding_top || row.rules_text_padding_top),
        rules_text_padding_right: clean(face.rules_text_padding_right || row.rules_text_padding_right),
        rules_text_padding_bottom: clean(face.rules_text_padding_bottom || row.rules_text_padding_bottom),
        rules_text_padding_left: clean(face.rules_text_padding_left || row.rules_text_padding_left),
        rules_text_reminder_mode: clean(face.rules_text_reminder_mode || row.rules_text_reminder_mode) || 'auto',
        layout_variant: clean(face.layout_variant || row.layout_variant) || 'normal'
      });

      if (importedArtId) {
        art.push({
          art_id: importedArtId,
          file_path: clean(sourceArtRow?.file_path || row.art_file_path || row.file_path),
          source_url: clean(sourceArtRow?.source_url || row.art_url || row.source_url),
          source_type: clean(sourceArtRow?.source_type || row.source_type) || 'mtgdesign_reference',
          artist: clean(sourceArtRow?.artist || row.artist),
          license: clean(sourceArtRow?.license || row.license) || 'private reference',
          permission_status: clean(sourceArtRow?.permission_status || row.permission_status) || 'user_supplied_private_use',
          checksum_sha256: clean(sourceArtRow?.checksum_sha256 || row.checksum_sha256),
          position_x: clean(row.position_x || row.art_position_x),
          position_y: clean(row.position_y || row.art_position_y),
          scale: clean(row.scale || row.art_scale),
          crop_x: clean(row.crop_x),
          crop_y: clean(row.crop_y),
          crop_w: clean(row.crop_w),
          crop_h: clean(row.crop_h),
          notes: clean(sourceArtRow?.notes || row.art_notes) || 'legacy-render-reference; needs-editable-art-source'
        });
      }
    }
  }

  const normalizedVariants = normalizeImportedVariantPrimaries(cards, variants);
  const faces = primaryFacesFromImportedVariants(cards, normalizedVariants, variantFaces);
  return { cards, faces, variants: normalizedVariants, variantFaces, art: dedupeRows(art, 'art_id') };
}

function attachLocalImageCandidates(imported: ImportRecordSet, inputPath: string | undefined, setCode: string): ImportRecordSet {
  if (!inputPath || inputPath.toLowerCase().endsWith('.zip')) {
    return imported;
  }
  const imageMap = buildImageCandidateMap(inputPath, setCode);
  if (imageMap.size === 0) {
    return imported;
  }
  const cardById = new Map(imported.cards.map((card) => [card.card_id, card]));
  const art = imported.art.map((row) => {
    if (clean(row.file_path)) {
      return row;
    }
    const face = imported.faces.find((candidate) => candidate.art_id === row.art_id);
    const card = face ? cardById.get(face.card_id) : undefined;
    const image = card ? imageMap.get(normalizeNameForMatch(card.name)) : undefined;
    return image ? { ...row, file_path: '', notes: mergeNote(row.notes, `local-full-card-render=${image}`) } : row;
  });
  return { ...imported, art };
}

function withPrimaryVariants(imported: Pick<AnalyzedImport, 'cards' | 'faces' | 'art'>): ImportRecordSet {
  const variants = imported.cards.map((card) => ({
    variant_id: safeCardId(`${card.card_id}-V1`),
    card_id: card.card_id,
    display_name: 'Variant 1',
    kind: 'mechanics_test',
    status: clean(card.status) === 'final' ? 'final' : 'active',
    is_primary: 'true',
    export_policy: 'default',
    tags: '',
    notes: '',
    created_at: '',
    updated_at: ''
  }));
  const variantFaces = imported.faces.map((face) => ({
    variant_id: safeCardId(`${face.card_id}-V1`),
    ...face
  }));
  return { ...imported, variants, variantFaces };
}

function variantIdentityKey(row: CsvRow): string {
  if (clean(row.variant_id)) {
    return `id:${clean(row.variant_id)}`;
  }
  const explicit = [
    row.variant_display_name,
    row.variant_name,
    row.display_name,
    row.variant_kind,
    row.kind,
    row.variant_status,
    row.variant_export_policy,
    row.export_policy,
    row.variant_tags,
    row.variant_notes
  ].map(clean).filter(Boolean);
  return explicit.length ? `variant:${explicit.join('|')}` : 'primary';
}

function normalizeImportedVariantPrimaries(cards: CsvRow[], variants: CsvRow[]): CsvRow[] {
  const normalized: CsvRow[] = [];
  for (const card of cards) {
    const cardVariants = variants.filter((variant) => variant.card_id === card.card_id);
    if (!cardVariants.length) {
      continue;
    }
    const preferredIndex = cardVariants.findIndex((variant) => isTruthyCell(variant.is_primary) && clean(variant.status) !== 'archived');
    const fallbackIndex = cardVariants.findIndex((variant) => clean(variant.status) !== 'archived');
    const primaryIndex = preferredIndex >= 0 ? preferredIndex : fallbackIndex >= 0 ? fallbackIndex : 0;
    normalized.push(...cardVariants.map((variant, index) => ({ ...variant, is_primary: index === primaryIndex ? 'true' : 'false' })));
  }
  return normalized;
}

function primaryFacesFromImportedVariants(cards: CsvRow[], variants: CsvRow[], variantFaces: CsvRow[]): CsvRow[] {
  const faces: CsvRow[] = [];
  for (const card of cards) {
    const primary = variants.find((variant) => variant.card_id === card.card_id && isTruthyCell(variant.is_primary));
    if (!primary) {
      continue;
    }
    const rows = variantFaces
      .filter((face) => face.variant_id === primary.variant_id)
      .sort((left, right) => Number(clean(left.face_index) || 0) - Number(clean(right.face_index) || 0));
    for (const row of rows) {
      const { variant_id: _variantId, ...face } = row;
      faces.push(face);
    }
  }
  return faces;
}

function enforcePrimaryVariantRows(allVariants: CsvRow[], importedVariants: CsvRow[]): void {
  const importedPrimaryByCard = new Map<string, string>();
  for (const variant of importedVariants) {
    if (isTruthyCell(variant.is_primary)) {
      importedPrimaryByCard.set(variant.card_id, variant.variant_id);
    }
  }

  for (const [cardId, primaryVariantId] of importedPrimaryByCard) {
    for (const variant of allVariants) {
      if (variant.card_id === cardId) {
        variant.is_primary = variant.variant_id === primaryVariantId ? 'true' : 'false';
      }
    }
  }

  const variantsByCard = new Map<string, CsvRow[]>();
  for (const variant of allVariants) {
    variantsByCard.set(variant.card_id, [...(variantsByCard.get(variant.card_id) ?? []), variant]);
  }
  for (const variants of variantsByCard.values()) {
    if (variants.some((variant) => isTruthyCell(variant.is_primary))) {
      continue;
    }
    const fallback = variants.find((variant) => clean(variant.status) !== 'archived') ?? variants[0];
    if (fallback) {
      fallback.is_primary = 'true';
    }
  }
}

const VARIANT_KINDS = new Set(['mechanics_test', 'wording_test', 'visual_alternate', 'finish_alternate', 'print_alternate', 'history_snapshot']);
const VARIANT_STATUSES = new Set(['active', 'testing', 'final', 'archived']);
const VARIANT_EXPORT_POLICIES = new Set(['default', 'optional', 'excluded']);

function normalizeVariantKind(value: string): string {
  const normalized = normalizeVariantEnum(value);
  return VARIANT_KINDS.has(normalized) ? normalized : 'mechanics_test';
}

function normalizeVariantStatus(value: string): string {
  const normalized = normalizeVariantEnum(value);
  return VARIANT_STATUSES.has(normalized) ? normalized : 'active';
}

function normalizeVariantExportPolicy(value: string): string {
  const normalized = normalizeVariantEnum(value);
  return VARIANT_EXPORT_POLICIES.has(normalized) ? normalized : 'default';
}

function normalizeVariantEnum(value: string): string {
  return clean(value).toLowerCase().replace(/[\s-]+/g, '_');
}

function variantOrdinal(variantId: string): number {
  const match = variantId.match(/-V(\d+)$/i);
  return match ? Math.max(1, Number(match[1]) || 1) : 1;
}

function normalizeBooleanCell(value: unknown): string {
  return clean(value) ? (isTruthyCell(value) ? 'true' : 'false') : 'false';
}

function isTruthyCell(value: unknown): boolean {
  return ['true', '1', 'yes', 'y'].includes(clean(value).toLowerCase());
}

function buildImportAudit(args: ImportRecordSet & { setCode: string; sourceFormat: MtgDesignImportFormat; rawSourcePath?: string }): ImportAudit {
  const warnings: ImportAuditWarning[] = [];
  const unsupported = new Map<string, number>();
  const collectors = new Map<string, string[]>();
  let parsedTokens = 0;
  let parsedSagas = 0;
  let possibleTransformCards = 0;

  const facesByCard = new Map<string, CsvRow[]>();
  for (const face of args.faces) {
    facesByCard.set(face.card_id, [...(facesByCard.get(face.card_id) ?? []), face]);
  }

  for (const card of args.cards) {
    collectors.set(card.collector_number, [...(collectors.get(card.collector_number) ?? []), card.card_id]);
    const faces = facesByCard.get(card.card_id) ?? [];
    const text = faces.map((face) => `${face.type_line} ${face.oracle_text}`).join('\n');
    if (card.layout === 'token') {
      parsedTokens += 1;
    }
    if (card.layout === 'saga' || /\bsaga\b/i.test(text)) {
      parsedSagas += 1;
    }
    if (/\btransform(s|ed|ing)?\b/i.test(text)) {
      possibleTransformCards += 1;
      warnings.push({
        code: 'possible-transform',
        severity: 'warning',
        cardId: card.card_id,
        collectorNumber: card.collector_number,
        name: card.name,
        message: `${card.name} mentions transform but was imported as ${card.layout}.`
      });
    }
    if (!isKnownLayout(card.layout) || !RENDERABLE_LAYOUTS.has(card.layout)) {
      const layoutSupport = layoutSupportFor(card.layout);
      unsupported.set(card.layout, (unsupported.get(card.layout) ?? 0) + 1);
      warnings.push({
        code: isKnownLayout(card.layout) ? 'registered-layout-fallback' : 'unknown-layout',
        severity: 'warning',
        cardId: card.card_id,
        collectorNumber: card.collector_number,
        name: card.name,
        message: `${card.name} uses ${isKnownLayout(card.layout) ? `${layoutSupport.supportState} layout` : 'unknown layout'} ${card.layout}; data was preserved and ${layoutSupport.fallbackLayout} fallback rendering will be used.`
      });
    }
  }

  const duplicates = [...collectors.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([collectorNumber, cardIds]) => ({ collectorNumber, cardIds }));
  for (const duplicate of duplicates) {
    warnings.push({
      code: 'duplicate-collector',
      severity: 'warning',
      collectorNumber: duplicate.collectorNumber,
      message: `Collector number ${duplicate.collectorNumber} appears on ${duplicate.cardIds.length} imported cards.`
    });
  }

  const legacyRenderReferences = args.art.filter((row) => isLegacyRenderReference(row)).length;
  const editableArtNeeded = args.cards.filter((card) => {
    const faces = facesByCard.get(card.card_id) ?? [];
    return faces.some((face) => {
      const artRow = args.art.find((row) => row.art_id === face.art_id);
      return !artRow || isLegacyRenderReference(artRow) || !clean(artRow.file_path);
    });
  }).length;
  const missingArt = editableArtNeeded;
  if (editableArtNeeded) {
    warnings.push({
      code: 'needs-editable-art',
      severity: 'note',
      message: `${editableArtNeeded} cards need editable/source art. MTG.design card-render URLs were preserved as references only.`
    });
  }

  const unsupportedLayouts = [...unsupported.entries()].map(([layout, count]) => ({ layout, count }));
  const auditWithoutMarkdown = {
    setCode: args.setCode,
    sourceFormat: args.sourceFormat,
    rawSourcePath: args.rawSourcePath,
    importedCards: args.cards.length,
    importedFaces: args.faces.length,
    importedVariants: args.variants.length,
    importedVariantFaces: args.variantFaces.length,
    artReferences: args.art.length,
    missingArt,
    legacyRenderReferences,
    editableArtNeeded,
    parsedTokens,
    parsedSagas,
    possibleTransformCards,
    unsupportedLayouts,
    duplicates,
    warnings
  };
  return {
    ...auditWithoutMarkdown,
    markdownSummary: markdownSummary(auditWithoutMarkdown)
  };
}

function markdownSummary(audit: Omit<ImportAudit, 'markdownSummary'>): string {
  return [
    `# Import Audit: ${audit.setCode}`,
    '',
    `- Source: ${audit.sourceFormat}${audit.rawSourcePath ? ` (${audit.rawSourcePath})` : ''}`,
    `- Cards: ${audit.importedCards}`,
    `- Faces: ${audit.importedFaces}`,
    `- Variants: ${audit.importedVariants}`,
    `- Variant faces: ${audit.importedVariantFaces}`,
    `- Art references: ${audit.artReferences}`,
    `- Legacy full-card render references: ${audit.legacyRenderReferences}`,
    `- Needs editable/source art: ${audit.editableArtNeeded}`,
    `- Tokens: ${audit.parsedTokens}`,
    `- Sagas: ${audit.parsedSagas}`,
    `- Possible transform cards: ${audit.possibleTransformCards}`,
    `- Layouts needing fallback: ${audit.unsupportedLayouts.map((item) => `${item.layout}=${item.count}`).join(', ') || 'none'}`,
    `- Duplicate collector numbers: ${audit.duplicates.length}`,
    `- Warnings: ${audit.warnings.length}`
  ].join('\n');
}

async function ensureSetScaffold(repoRoot: string, setCode: string): Promise<void> {
  const setDir = join(repoRoot, 'sets', setCode);
  await mkdir(setDir, { recursive: true });
  await writeIfMissing(join(setDir, 'sets.csv'), [
    SET_HEADERS,
    [
      setCode,
      setCode,
      'custom',
      '0.1.0',
      'en',
      'basic-m15-local',
      'cockatrice',
      'Jonathan Kyle Hobson',
      'draft',
      'Created by MTG.design import.'
    ]
  ]);
  await writeIfMissing(join(setDir, 'cards.csv'), [CARD_HEADERS]);
  await writeIfMissing(join(setDir, 'card_faces.csv'), [FACE_HEADERS]);
  await writeIfMissing(join(setDir, 'card_variants.csv'), [VARIANT_HEADERS]);
  await writeIfMissing(join(setDir, 'card_variant_faces.csv'), [VARIANT_FACE_HEADERS]);
  await writeIfMissing(join(setDir, 'art_manifest.csv'), [ART_HEADERS]);
  await writeIfMissing(join(setDir, 'export_profiles.csv'), [
    EXPORT_PROFILE_HEADERS,
    ['cockatrice', 'cockatrice', 'png', '744', '1039', '', 'false', '0', 'false', 'false', 'Not For Sale', 'true', '{collector_number}_{slug}.{ext}']
  ]);
}

async function writeIfMissing(path: string, rows: string[][]): Promise<void> {
  if (await fileExists(path)) {
    return;
  }
  await writeFile(path, `${rows.map((row) => row.join(',')).join('\n')}\n`, 'utf8');
}

async function readCsvIfExists(path: string): Promise<CsvRow[]> {
  if (!(await fileExists(path))) {
    return [];
  }
  return parseCsvRecords(await readFile(path, 'utf8'));
}

async function prepareArtRowsForWrite(repoRoot: string, setCode: string, rows: CsvRow[]): Promise<CsvRow[]> {
  const outDir = join(repoRoot, 'sets', setCode, 'art', 'imported');
  const result: CsvRow[] = [];
  for (const row of rows) {
    const filePath = clean(row.file_path);
    if (isLegacyRenderReference(row)) {
      result.push({ ...row, file_path: '', notes: mergeNote(row.notes, 'not-used-as-render-art') });
      continue;
    }
    if (filePath && (await fileExists(filePath))) {
      await mkdir(outDir, { recursive: true });
      const outputName = `${safeFileStem(row.art_id)}${extname(filePath).toLowerCase() || '.jpg'}`;
      const outputPath = join(outDir, outputName);
      await copyFile(filePath, outputPath);
      result.push({ ...row, file_path: relative(repoRoot, outputPath), notes: mergeNote(row.notes, 'copied-local-reference-image') });
      continue;
    }
    result.push({ ...row, file_path: filePath && !isAbsolute(filePath) ? filePath : '' });
  }
  return dedupeRows(result, 'art_id');
}

function isLegacyRenderReference(row: CsvRow): boolean {
  const notes = clean(row.notes).toLowerCase();
  const sourceType = clean(row.source_type).toLowerCase();
  return sourceType === 'mtgdesign_reference' || notes.includes('legacy-render-reference') || notes.includes('full-card-render');
}

async function findImportFile(directory: string, format: MtgDesignImportFormat): Promise<string> {
  const candidates = await readdir(directory, { recursive: true });
  const extensions = format === 'planesculptors' ? ['.txt'] : format === 'csv' ? ['.csv'] : ['.xml'];
  const match = candidates
    .map((entry) => join(directory, String(entry)))
    .find((entry) => extensions.includes(extname(entry).toLowerCase()));
  if (!match) {
    throw new Error(`No ${format} import file found in ${directory}.`);
  }
  return match;
}

async function readFromZip(inputPath: string, format: MtgDesignImportFormat): Promise<string> {
  const zip = await JSZip.loadAsync(await readFile(inputPath));
  const extensions = format === 'planesculptors' ? ['.txt'] : format === 'csv' ? ['.csv'] : ['.xml'];
  const entry = Object.values(zip.files).find((file) => !file.dir && extensions.includes(extname(file.name).toLowerCase()));
  if (!entry) {
    throw new Error(`No ${format} import file found in ${inputPath}.`);
  }
  return entry.async('string');
}

function buildImageCandidateMap(inputPath: string, setCode: string): Map<string, string> {
  const baseDir = existsSync(inputPath) && !extname(inputPath) ? inputPath : dirname(inputPath);
  const dirs = [baseDir, join(baseDir, setCode), join(baseDir, 'images')];
  const map = new Map<string, string>();
  for (const dir of dirs) {
    if (!existsSync(dir)) {
      continue;
    }
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile() || !['.png', '.jpg', '.jpeg', '.webp'].includes(extname(entry.name).toLowerCase())) {
        continue;
      }
      map.set(normalizeNameForMatch(basename(entry.name, extname(entry.name))), join(dir, entry.name));
    }
  }
  return map;
}

function normalizeLayout(value: string, typeLine: string): string {
  const layout = value === 'xml' ? inferLayout(typeLine) : value || inferLayout(typeLine);
  const rawNormalized = layout.trim().toLowerCase().replace(/[-\s]+/g, '_');
  const aliasNormalized = normalizeLayoutId(rawNormalized);
  if (isKnownLayout(rawNormalized)) {
    return aliasNormalized;
  }
  if (rawNormalized && aliasNormalized !== 'normal') {
    return aliasNormalized;
  }
  return inferLayout(typeLine);
}

function importTags(typeLine: string, layout: string): string {
  const tags = ['imported:mtgdesign'];
  if (layout === 'token') {
    tags.push('token');
  }
  if (!isKnownLayout(layout) || !RENDERABLE_LAYOUTS.has(layout)) {
    tags.push('needs_review', `registered_layout:${layout}`);
  }
  if (/\btransform(s|ed|ing)?\b/i.test(typeLine)) {
    tags.push('possible_transform');
  }
  return tags.join(';');
}

function importSourceLabel(format: MtgDesignImportFormat): string {
  if (format === 'csv') {
    return 'Homebrew Forge CSV';
  }
  if (format === 'planesculptors') {
    return 'Planesculptors text';
  }
  if (format === 'xml') {
    return 'generic XML';
  }
  return 'Cockatrice XML';
}

function statusForLayout(layout: string): string {
  return isKnownLayout(layout) && RENDERABLE_LAYOUTS.has(layout) ? 'draft' : 'review';
}

function mergeTags(...values: Array<string | undefined>): string {
  return [...new Set(values.flatMap((value) => clean(value).split(';').map((tag) => tag.trim()).filter(Boolean)))].join(';');
}

function dedupeRows(rows: CsvRow[], key: string): CsvRow[] {
  const byKey = new Map<string, CsvRow>();
  for (const row of rows) {
    byKey.set(row[key], { ...(byKey.get(row[key]) ?? {}), ...row });
  }
  return [...byKey.values()];
}

function clean(value: unknown): string {
  return String(value ?? '').trim();
}

function cleanCollectorNumber(value: string): string {
  return value.split('/')[0]?.trim() || value.trim();
}

function manaCostFromHtml(value: string): string {
  const alts = [...value.matchAll(/alt=['"]([^'"]+)['"]/gi)].map((match) => match[1] ?? '').filter(Boolean);
  if (alts.length) {
    return alts.map((token) => `{${token}}`).join('');
  }
  return normalizeManaCost(value);
}

function textFromPlanesculptorsHtml(value: string): string {
  return value
    .replace(/<br>\s*\/\/\/br\/\/\/\s*<br>\s*\/\/\/br\/\/\//gi, '\n\n')
    .replace(/\/\/\/br\/\/\//g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<img[^>]*alt=['"]([^'"]+)['"][^>]*>/gi, '{$1}')
    .replace(/<\/?i>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripOuterItalic(value: string): string {
  return value.trim();
}

function normalizeNameForMatch(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function mergeNote(existing: unknown, next: string): string {
  const current = clean(existing);
  return current.includes(next) ? current : [current, next].filter(Boolean).join('; ');
}

function safeFileStem(value: string): string {
  return safeCardId(value).toLowerCase();
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseCsvRecords, writeCsvRecords, type CsvRow } from '../data/csv.js';
import {
  COLLECTION_ENTRY_HEADERS,
  collectionEntrySchema,
  collectionImportModeSchema,
  collectionMetadataSchema,
  collectionPurposeSchema,
  type CreateCollectionRequest,
  type CollectionEntry,
  type CollectionExportResult,
  type CollectionImportMode,
  type CollectionImportRequest,
  type CollectionImportResult,
  type CollectionImportSummary,
  type CollectionMatchStrategy,
  type CollectionMetadata,
  type CollectionReviewStatus,
  type CollectionSourcePreset,
  type CollectionState,
  type CollectionSummary
} from './collectionModel.js';

interface NormalizedScannerRow {
  quantity: number;
  cardName: string;
  setCode?: string;
  setName?: string;
  collectorNumber?: string;
  scryfallId?: string;
  finish?: string;
  condition?: string;
  language?: string;
  location?: string;
  sourceRow: string;
  warnings: string[];
}

export async function listCollections(rootDir: string): Promise<CollectionSummary[]> {
  const collections = await readAllCollections(rootDir);
  return collections.map(({ metadata, entries }) => summarizeCollection(metadata, entries)).sort((left, right) => left.name.localeCompare(right.name));
}

export async function readCollectionState(rootDir: string, collectionId: string): Promise<CollectionState> {
  const metadata = await readCollectionMetadata(rootDir, collectionId);
  const entries = await readCollectionEntries(rootDir, metadata.collectionId);
  return {
    metadata,
    entries,
    warnings: entries.filter((entry) => entry.reviewStatus === 'needs_review').map((entry) => reviewMessage(entry))
  };
}

export async function createCollection(rootDir: string, request: CreateCollectionRequest): Promise<CollectionState> {
  const name = clean(request.name);
  if (!name) {
    throw new Error('Collection name is required.');
  }
  const collectionId = await uniqueCollectionId(rootDir, slugify(request.collectionId || name));
  const now = new Date().toISOString();
  const metadata = collectionMetadataSchema.parse({
    collectionId,
    name,
    description: clean(request.description) || undefined,
    linkedUniverseId: normalizeOptionalId(request.linkedUniverseId),
    gameId: normalizeGameId(request.gameId),
    purpose: normalizePurpose(request.purpose),
    source: normalizeSourcePreset(request.source ?? 'generic'),
    createdAt: now,
    updatedAt: now
  });
  await writeCollection(rootDir, { metadata, entries: [] });
  return readCollectionState(rootDir, collectionId);
}

export async function importCollectionCsv(rootDir: string, request: CollectionImportRequest): Promise<CollectionImportResult> {
  const collectionId = slugify(request.collectionId);
  if (!collectionId) {
    throw new Error('Collection id is required.');
  }
  const source = normalizeSourcePreset(request.source);
  const mode = collectionImportModeSchema.parse(request.mode ?? 'append');
  const rows = parseCsvRecords(request.content);
  const warnings: string[] = [];
  const importedEntries = rows.map((row, index) => scannerRowToEntry(collectionId, source, row, index, warnings));
  const existing = await readExistingCollection(rootDir, collectionId);
  const now = new Date().toISOString();
  const metadata = collectionMetadataSchema.parse({
    collectionId,
    name: clean(request.name) || existing?.metadata.name || titleFromId(collectionId),
    description: clean(request.description) || existing?.metadata.description || undefined,
    linkedUniverseId: normalizeOptionalId(request.linkedUniverseId) || existing?.metadata.linkedUniverseId || undefined,
    gameId: normalizeGameId(request.gameId || existing?.metadata.gameId),
    purpose: normalizePurpose(request.purpose ?? existing?.metadata.purpose),
    source,
    createdAt: existing?.metadata.createdAt ?? now,
    updatedAt: now
  });
  const entries = mode === 'replace' ? importedEntries : mergeEntries(existing?.entries ?? [], importedEntries);
  const collection: CollectionState = {
    metadata,
    entries,
    warnings: entries.filter((entry) => entry.reviewStatus === 'needs_review').map((entry) => reviewMessage(entry))
  };
  const summary = summarizeImport(collectionId, source, mode, Boolean(request.dryRun), rows.length, entries.length, importedEntries, warnings);

  if (!request.dryRun) {
    await writeCollection(rootDir, { metadata, entries });
  }

  return { collection, summary };
}

export async function exportCollectionCsv(rootDir: string, collectionId: string): Promise<CollectionExportResult> {
  const collection = await readCollectionState(rootDir, collectionId);
  return {
    filename: `${collection.metadata.collectionId}.csv`,
    mimeType: 'text/csv',
    content: `${writeCsvRecords(collection.entries.map(collectionEntryToRow), COLLECTION_ENTRY_HEADERS)}\n`
  };
}

export async function exportCollectionPlainText(rootDir: string, collectionId: string): Promise<CollectionExportResult> {
  const collection = await readCollectionState(rootDir, collectionId);
  return {
    filename: `${collection.metadata.collectionId}.txt`,
    mimeType: 'text/plain',
    content: buildPlainTextCollection(collection)
  };
}

export async function exportCollectionCockatrice(rootDir: string, collectionId: string): Promise<CollectionExportResult> {
  const collection = await readCollectionState(rootDir, collectionId);
  return {
    filename: `${collection.metadata.collectionId}.cod`,
    mimeType: 'application/xml',
    content: buildCockatriceCollection(collection)
  };
}

export function buildPlainTextCollection(collection: CollectionState): string {
  const lines = [`# ${collection.metadata.name}`, `# ${collection.entries.reduce((total, entry) => total + entry.quantity, 0)} cards`, ''];
  const matchedEntries = collection.entries.filter((entry) => entry.reviewStatus === 'matched');
  const reviewEntries = collection.entries.filter((entry) => entry.reviewStatus === 'needs_review');

  for (const entry of matchedEntries) {
    lines.push(`${entry.quantity} ${entry.cardName}${collectionEntryDetail(entry)}`);
  }

  if (reviewEntries.length > 0) {
    lines.push('', '# Needs Review');
    for (const entry of reviewEntries) {
      lines.push(`${entry.quantity} ${entry.cardName}${collectionEntryDetail(entry)}${entry.reviewNotes ? ` - ${entry.reviewNotes}` : ''}`);
    }
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

export function buildCockatriceCollection(collection: CollectionState): string {
  const entries = collection.entries.filter((entry) => entry.reviewStatus === 'matched');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<cockatrice_deck version="1">',
    `  <deckname>${escapeXml(collection.metadata.name)}</deckname>`,
    '  <comments></comments>',
    '  <zone name="main">',
    ...entries.map((entry) => `    <card number="${entry.quantity}" name="${escapeXml(entry.cardName)}"/>`),
    '  </zone>',
    '  <zone name="side">',
    '  </zone>',
    '</cockatrice_deck>',
    ''
  ].join('\n');
}

async function readAllCollections(rootDir: string): Promise<Array<{ metadata: CollectionMetadata; entries: CollectionEntry[] }>> {
  const root = collectionsRoot(rootDir);
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }
  const collections: Array<{ metadata: CollectionMetadata; entries: CollectionEntry[] }> = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) {
      continue;
    }
    try {
      collections.push({
        metadata: await readCollectionMetadata(rootDir, entry.name),
        entries: await readCollectionEntries(rootDir, entry.name)
      });
    } catch {
      // Ignore incomplete collection folders so one bad import does not break the workspace.
    }
  }
  return collections;
}

async function readExistingCollection(rootDir: string, collectionId: string): Promise<{ metadata: CollectionMetadata; entries: CollectionEntry[] } | undefined> {
  try {
    return {
      metadata: await readCollectionMetadata(rootDir, collectionId),
      entries: await readCollectionEntries(rootDir, collectionId)
    };
  } catch {
    return undefined;
  }
}

async function readCollectionMetadata(rootDir: string, collectionId: string): Promise<CollectionMetadata> {
  const id = slugify(collectionId);
  const content = await readFile(join(collectionDir(rootDir, id), 'metadata.json'), 'utf8');
  return collectionMetadataSchema.parse(JSON.parse(content));
}

async function readCollectionEntries(rootDir: string, collectionId: string): Promise<CollectionEntry[]> {
  try {
    const id = slugify(collectionId);
    const rows = parseCsvRecords(await readFile(join(collectionDir(rootDir, id), 'entries.csv'), 'utf8'));
    return rows.map(rowToCollectionEntry);
  } catch {
    return [];
  }
}

async function writeCollection(rootDir: string, collection: { metadata: CollectionMetadata; entries: CollectionEntry[] }): Promise<void> {
  const dir = collectionDir(rootDir, collection.metadata.collectionId);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'metadata.json'), `${JSON.stringify(collection.metadata, null, 2)}\n`, 'utf8');
  await writeFile(join(dir, 'entries.csv'), `${writeCsvRecords(collection.entries.map(collectionEntryToRow), COLLECTION_ENTRY_HEADERS)}\n`, 'utf8');
}

function scannerRowToEntry(collectionId: string, source: CollectionSourcePreset, row: CsvRow, index: number, warnings: string[]): CollectionEntry {
  const normalized = normalizeScannerRow(row);
  if (!normalized.cardName) {
    normalized.cardName = `Unknown card ${index + 1}`;
    normalized.warnings.push(`Row ${index + 1} is missing a card name.`);
  }
  warnings.push(...normalized.warnings);
  const match = matchInfo(normalized);
  return collectionEntrySchema.parse({
    collectionId,
    entryId: entryIdFor(source, index, normalized),
    quantity: normalized.quantity,
    cardName: normalized.cardName,
    setCode: normalized.setCode,
    setName: normalized.setName,
    collectorNumber: normalized.collectorNumber,
    scryfallId: normalized.scryfallId,
    finish: normalized.finish,
    condition: normalized.condition,
    language: normalized.language,
    location: normalized.location,
    source,
    sourceRow: normalized.sourceRow,
    matchKey: match.matchKey,
    matchStrategy: match.matchStrategy,
    reviewStatus: match.reviewStatus,
    reviewNotes: match.reviewNotes
  });
}

function normalizeScannerRow(row: CsvRow): NormalizedScannerRow {
  const cardName = valueFor(row, ['cardname', 'name', 'card', 'productname', 'product', 'title']);
  const rawSetCode = valueFor(row, ['setcode', 'set', 'editioncode', 'expansioncode']);
  const explicitSetName = valueFor(row, ['setname', 'edition', 'expansion', 'setfullname']);
  const rawScryfallId = clean(valueFor(row, ['scryfallid', 'scryfall']));
  const scryfallId = normalizeScryfallId(rawScryfallId);
  const normalizedSetCode = normalizeSetCode(rawSetCode);
  const setName = clean(explicitSetName || (normalizedSetCode ? '' : rawSetCode)) || undefined;
  const quantity = normalizeQuantity(valueFor(row, ['quantity', 'qty', 'count', 'copies', 'amount', 'owned', 'totalquantity']));
  const warnings: string[] = [];
  if (!cardName) {
    warnings.push('A source row was missing card name.');
  }
  if (rawScryfallId && !scryfallId) {
    warnings.push(`${cardName || 'A source row'} had an invalid Scryfall id.`);
  }
  return {
    quantity,
    cardName,
    setCode: normalizedSetCode || undefined,
    setName,
    collectorNumber: clean(valueFor(row, ['collectornumber', 'collector', 'number', 'cardnumber', 'no', 'cn'])) || undefined,
    scryfallId: scryfallId || undefined,
    finish: normalizeFinish(valueFor(row, ['finish', 'foil', 'foiling', 'printing', 'variant'])) || undefined,
    condition: clean(valueFor(row, ['condition', 'cardcondition'])) || undefined,
    language: clean(valueFor(row, ['language', 'lang'])) || undefined,
    location: clean(valueFor(row, ['location', 'binder', 'folder', 'list', 'collection', 'collectionname'])) || undefined,
    sourceRow: JSON.stringify(row),
    warnings
  };
}

function matchInfo(row: NormalizedScannerRow): {
  matchKey?: string;
  matchStrategy: CollectionMatchStrategy;
  reviewStatus: CollectionReviewStatus;
  reviewNotes?: string;
} {
  if (row.scryfallId) {
    return {
      matchKey: row.scryfallId,
      matchStrategy: 'scryfall_id',
      reviewStatus: 'matched'
    };
  }
  if (row.cardName && row.setCode && row.collectorNumber) {
    return {
      matchKey: `${row.cardName}::${row.setCode}::${row.collectorNumber}`,
      matchStrategy: 'set_number',
      reviewStatus: 'matched'
    };
  }
  if (row.cardName && row.setCode) {
    return {
      matchKey: `${row.cardName}::${row.setCode}`,
      matchStrategy: 'set_name',
      reviewStatus: 'matched',
      reviewNotes: 'Collector number missing; verify exact print if needed.'
    };
  }
  return {
    matchStrategy: 'unresolved',
    reviewStatus: 'needs_review',
    reviewNotes: row.cardName ? 'Missing set code or Scryfall id.' : 'Missing card name.'
  };
}

function mergeEntries(existing: CollectionEntry[], imported: CollectionEntry[]): CollectionEntry[] {
  const entriesById = new Map(existing.map((entry) => [entry.entryId, entry]));
  for (const entry of imported) {
    entriesById.set(entry.entryId, entry);
  }
  return [...entriesById.values()];
}

function summarizeImport(
  collectionId: string,
  source: CollectionSourcePreset,
  mode: CollectionImportMode,
  dryRun: boolean,
  importedRows: number,
  writtenRows: number,
  importedEntries: CollectionEntry[],
  warnings: string[]
): CollectionImportSummary {
  return {
    collectionId,
    source,
    mode,
    dryRun,
    importedRows,
    writtenRows,
    matchedRows: importedEntries.filter((entry) => entry.reviewStatus === 'matched').length,
    reviewRows: importedEntries.filter((entry) => entry.reviewStatus === 'needs_review').length,
    scryfallIdMatches: importedEntries.filter((entry) => entry.matchStrategy === 'scryfall_id').length,
    setNumberMatches: importedEntries.filter((entry) => entry.matchStrategy === 'set_number').length,
    setNameMatches: importedEntries.filter((entry) => entry.matchStrategy === 'set_name').length,
    unresolvedRows: importedEntries.filter((entry) => entry.matchStrategy === 'unresolved').length,
    warnings: [...new Set(warnings)]
  };
}

function summarizeCollection(metadata: CollectionMetadata, entries: CollectionEntry[]): CollectionSummary {
  return {
    ...metadata,
    entryCount: entries.length,
    cardCount: entries.reduce((total, entry) => total + entry.quantity, 0),
    matchedCount: entries.filter((entry) => entry.reviewStatus === 'matched').length,
    reviewCount: entries.filter((entry) => entry.reviewStatus === 'needs_review').length,
    sourceCount: new Set(entries.map((entry) => entry.source)).size
  };
}

function rowToCollectionEntry(row: CsvRow): CollectionEntry {
  return collectionEntrySchema.parse({
    collectionId: clean(row.collection_id),
    entryId: clean(row.entry_id),
    quantity: Math.max(1, Number(row.quantity) || 1),
    cardName: clean(row.card_name),
    setCode: clean(row.set_code) || undefined,
    setName: clean(row.set_name) || undefined,
    collectorNumber: clean(row.collector_number) || undefined,
    scryfallId: clean(row.scryfall_id) || undefined,
    finish: clean(row.finish) || undefined,
    condition: clean(row.condition) || undefined,
    language: clean(row.language) || undefined,
    location: clean(row.location) || undefined,
    source: normalizeSourcePreset(clean(row.source) || 'generic'),
    sourceRow: clean(row.source_row) || undefined,
    matchKey: clean(row.match_key) || undefined,
    matchStrategy: clean(row.match_strategy) || 'unresolved',
    reviewStatus: clean(row.review_status) || 'needs_review',
    reviewNotes: clean(row.review_notes) || undefined
  });
}

function collectionEntryToRow(entry: CollectionEntry): CsvRow {
  return {
    collection_id: entry.collectionId,
    entry_id: entry.entryId,
    quantity: String(entry.quantity),
    card_name: entry.cardName,
    set_code: entry.setCode ?? '',
    set_name: entry.setName ?? '',
    collector_number: entry.collectorNumber ?? '',
    scryfall_id: entry.scryfallId ?? '',
    finish: entry.finish ?? '',
    condition: entry.condition ?? '',
    language: entry.language ?? '',
    location: entry.location ?? '',
    source: entry.source,
    source_row: entry.sourceRow ?? '',
    match_key: entry.matchKey ?? '',
    match_strategy: entry.matchStrategy,
    review_status: entry.reviewStatus,
    review_notes: entry.reviewNotes ?? ''
  };
}

function valueFor(row: CsvRow, aliases: string[]): string {
  const normalizedAliases = new Set(aliases);
  for (const [key, value] of Object.entries(row)) {
    if (normalizedAliases.has(normalizeHeader(key))) {
      return clean(value);
    }
  }
  return '';
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeQuantity(value: string): number {
  const parsed = Number(value || 1);
  return Number.isFinite(parsed) && parsed > 0 ? Math.max(1, Math.floor(parsed)) : 1;
}

function normalizeSetCode(value: string): string {
  const cleaned = clean(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
  return cleaned && cleaned.length <= 8 ? cleaned : '';
}

function normalizeScryfallId(value: string): string {
  const cleaned = clean(value).toLowerCase();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(cleaned) ? cleaned : '';
}

function normalizeFinish(value: string): string {
  const cleaned = clean(value);
  if (!cleaned) {
    return '';
  }
  if (/^(true|yes|foil)$/i.test(cleaned)) {
    return 'foil';
  }
  if (/^(false|no|normal|nonfoil|non-foil)$/i.test(cleaned)) {
    return 'nonfoil';
  }
  return cleaned;
}

function normalizeSourcePreset(value: string): CollectionSourcePreset {
  return ['manabox', 'tcgplayer', 'dragonshield', 'delver', 'generic'].includes(value) ? (value as CollectionSourcePreset) : 'generic';
}

function normalizePurpose(value: unknown): string {
  const normalized = clean(value || 'mixed').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return collectionPurposeSchema.safeParse(normalized).success ? normalized : 'mixed';
}

function normalizeGameId(value: unknown): string {
  return clean(value || 'mtg').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'mtg';
}

function normalizeOptionalId(value: unknown): string | undefined {
  return clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || undefined;
}

async function uniqueCollectionId(rootDir: string, baseId: string): Promise<string> {
  const base = baseId || 'collection';
  let candidate = base;
  let index = 2;
  while (await collectionExists(rootDir, candidate)) {
    candidate = `${base}-${index}`;
    index += 1;
  }
  return candidate;
}

async function collectionExists(rootDir: string, collectionId: string): Promise<boolean> {
  try {
    await readFile(join(collectionDir(rootDir, collectionId), 'metadata.json'), 'utf8');
    return true;
  } catch {
    return false;
  }
}

function entryIdFor(source: CollectionSourcePreset, index: number, row: NormalizedScannerRow): string {
  const digest = createHash('sha1')
    .update(`${source}|${index}|${row.cardName}|${row.setCode ?? ''}|${row.collectorNumber ?? ''}|${row.scryfallId ?? ''}|${row.sourceRow}`)
    .digest('hex')
    .slice(0, 12);
  return `entry-${digest}`;
}

function reviewMessage(entry: CollectionEntry): string {
  return `${entry.cardName}: ${entry.reviewNotes ?? 'Needs review.'}`;
}

function collectionEntryDetail(entry: CollectionEntry): string {
  const detail = [entry.setCode, entry.collectorNumber].filter(Boolean).join(' ');
  return detail ? ` (${detail})` : '';
}

function collectionsRoot(rootDir: string): string {
  return join(rootDir, 'collections');
}

function collectionDir(rootDir: string, collectionId: string): string {
  return join(collectionsRoot(rootDir), slugify(collectionId));
}

function titleFromId(value: string): string {
  return value
    .split(/[-_]+/g)
    .filter(Boolean)
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

function slugify(value: string): string {
  return clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function clean(value: unknown): string {
  return String(value ?? '').trim();
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import { parseCsvRecords, writeCsvRecords, type CsvRow } from '../data/csv.js';
import { findOfficialCardPrint, findOfficialCardPrintByPrintKey, officialCardEntryId } from '../officialCards/officialCardStore.js';
import type { AddOfficialCardToCollectionRequest, OfficialCardPrint } from '../officialCards/officialCardModel.js';
import {
  COLLECTION_ENTRY_HEADERS,
  DEFAULT_COLLECTION_OWNER_NAME,
  collectionEntrySchema,
  collectionImportModeSchema,
  collectionListCategorySchema,
  collectionMetadataSchema,
  collectionOwnershipStatusSchema,
  collectionPreviewArtSourceSchema,
  collectionPurposeSchema,
  type CollectionKind,
  type CreateCollectionRequest,
  type CollectionEntry,
  type CollectionImportContentFormat,
  type CollectionExportResult,
  type CollectionImportMode,
  type CollectionImportRequest,
  type CollectionImportResult,
  type CollectionImportSummary,
  type CollectionMatchStrategy,
  type CollectionMetadata,
  type CollectionOwnershipStatus,
  type CollectionPriceImportRequest,
  type CollectionPriceRefreshRequest,
  type CollectionPriceRefreshResult,
  type CollectionPriceRefreshSummary,
  type SaveCollectionRequest,
  type CollectionReviewStatus,
  type CollectionSourcePreset,
  type CollectionState,
  type CollectionSummary
} from './collectionModel.js';

interface NormalizedScannerRow {
  quantity: number;
  ownershipStatus?: CollectionOwnershipStatus;
  ownerName?: string;
  cardName: string;
  setCode?: string;
  setName?: string;
  collectorNumber?: string;
  scryfallId?: string;
  finish?: string;
  condition?: string;
  language?: string;
  location?: string;
  purchasePrice?: number;
  purchaseCurrency?: string;
  purchaseDate?: string;
  estimatedMarketPrice?: number;
  estimatedMarketCurrency?: string;
  marketPriceSource?: string;
  marketPriceUpdatedAt?: string;
  tags: string[];
  notes?: string;
  starred: boolean;
  flagged: boolean;
  altered: boolean;
  misprint: boolean;
  proxy: boolean;
  homebrew: boolean;
  markedForDeletion: boolean;
  sourceRow: string;
  warnings: string[];
}

interface NormalizedPriceRow {
  cardName?: string;
  setCode?: string;
  collectorNumber?: string;
  scryfallId?: string;
  finish?: string;
  price?: number;
  currency?: string;
  source?: string;
  updatedAt?: string;
  sourceRow: string;
  warnings: string[];
}

interface PriceSnapshot {
  amount: number;
  currency: string;
  source: string;
  updatedAt: string;
}

const DEFAULT_COLLECTION_LISTS: Array<
  Pick<
    CollectionMetadata,
    | 'collectionId'
    | 'name'
    | 'description'
    | 'purpose'
    | 'source'
    | 'kind'
    | 'listCategory'
    | 'tags'
    | 'defaultEntryTags'
    | 'defaultOwnershipStatus'
    | 'defaultStarred'
    | 'defaultFlagged'
    | 'defaultProxy'
    | 'defaultHomebrew'
  >
> = [
  {
    collectionId: 'wish-list',
    name: 'Wish List',
    description: 'Cards wanted but not currently owned.',
    purpose: 'research',
    source: 'generic',
    kind: 'list',
    listCategory: 'wishlist',
    tags: ['wishlist'],
    defaultEntryTags: ['wishlist'],
    defaultOwnershipStatus: 'wanted',
    defaultStarred: false,
    defaultFlagged: false,
    defaultProxy: false,
    defaultHomebrew: false
  },
  {
    collectionId: 'recommendations',
    name: 'Recommendations',
    description: 'Cards recommended for future deck or collection decisions.',
    purpose: 'research',
    source: 'generic',
    kind: 'list',
    listCategory: 'recommendation',
    tags: ['recommendations'],
    defaultEntryTags: ['recommended'],
    defaultOwnershipStatus: 'recommended',
    defaultStarred: false,
    defaultFlagged: false,
    defaultProxy: false,
    defaultHomebrew: false
  },
  {
    collectionId: 'starred',
    name: 'Starred',
    description: 'Favorite cards and rows gathered across collection work.',
    purpose: 'mixed',
    source: 'generic',
    kind: 'list',
    listCategory: 'starred',
    tags: ['starred'],
    defaultEntryTags: ['starred'],
    defaultOwnershipStatus: 'reference',
    defaultStarred: true,
    defaultFlagged: false,
    defaultProxy: false,
    defaultHomebrew: false
  },
  {
    collectionId: 'flagged',
    name: 'Flagged',
    description: 'Cards needing attention, review, or follow-up.',
    purpose: 'mixed',
    source: 'generic',
    kind: 'list',
    listCategory: 'flagged',
    tags: ['flagged'],
    defaultEntryTags: ['flagged'],
    defaultOwnershipStatus: 'reference',
    defaultStarred: false,
    defaultFlagged: true,
    defaultProxy: false,
    defaultHomebrew: false
  },
  {
    collectionId: 'gift-list',
    name: 'Gift List',
    description: 'Cards to buy, gift, or request from someone else.',
    purpose: 'research',
    source: 'generic',
    kind: 'list',
    listCategory: 'gift',
    tags: ['gift'],
    defaultEntryTags: ['gift'],
    defaultOwnershipStatus: 'wanted',
    defaultStarred: false,
    defaultFlagged: false,
    defaultProxy: false,
    defaultHomebrew: false
  }
];

export async function listCollections(rootDir: string): Promise<CollectionSummary[]> {
  await ensureDefaultCollectionLists(rootDir);
  const collections = await readAllCollections(rootDir);
  return collections.map(({ metadata, entries }) => summarizeCollection(metadata, entries)).sort((left, right) => left.name.localeCompare(right.name));
}

export async function readCollectionState(rootDir: string, collectionId: string): Promise<CollectionState> {
  await ensureDefaultCollectionLists(rootDir);
  const metadata = await readCollectionMetadata(rootDir, collectionId);
  const entries = await readCollectionEntries(rootDir, metadata.collectionId, metadata);
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
    kind: normalizeCollectionKind(request.kind ?? request.purpose),
    listCategory: normalizeListCategory(request.listCategory),
    tags: [],
    defaultEntryTags: normalizeTags(request.defaultEntryTags),
    defaultOwnershipStatus: normalizeDefaultOwnershipStatus(request.defaultOwnershipStatus, normalizeCollectionKind(request.kind ?? request.purpose), normalizeListCategory(request.listCategory)),
    defaultStarred: Boolean(request.defaultStarred),
    defaultFlagged: Boolean(request.defaultFlagged),
    defaultProxy: Boolean(request.defaultProxy),
    defaultHomebrew: Boolean(request.defaultHomebrew),
    createdAt: now,
    updatedAt: now
  });
  await writeCollection(rootDir, { metadata, entries: [] });
  return readCollectionState(rootDir, collectionId);
}

export async function saveCollection(rootDir: string, request: SaveCollectionRequest): Promise<CollectionState> {
  const now = new Date().toISOString();
  const metadata = collectionMetadataSchema.parse({
    ...request.metadata,
    name: clean(request.metadata.name),
    description: clean(request.metadata.description) || undefined,
    linkedUniverseId: normalizeOptionalId(request.metadata.linkedUniverseId),
    gameId: normalizeGameId(request.metadata.gameId),
    purpose: normalizePurpose(request.metadata.purpose),
    source: normalizeSourcePreset(request.metadata.source ?? 'generic'),
    kind: normalizeCollectionKind(request.metadata.kind ?? request.metadata.purpose),
    listCategory: normalizeListCategory(request.metadata.listCategory),
    tags: normalizeTags(request.metadata.tags),
    defaultEntryTags: normalizeTags(request.metadata.defaultEntryTags),
    defaultOwnershipStatus: normalizeDefaultOwnershipStatus(request.metadata.defaultOwnershipStatus, normalizeCollectionKind(request.metadata.kind ?? request.metadata.purpose), normalizeListCategory(request.metadata.listCategory)),
    defaultStarred: Boolean(request.metadata.defaultStarred),
    defaultFlagged: Boolean(request.metadata.defaultFlagged),
    defaultProxy: Boolean(request.metadata.defaultProxy),
    defaultHomebrew: Boolean(request.metadata.defaultHomebrew),
    accentColor: clean(request.metadata.accentColor) || undefined,
    coverImageRef: clean(request.metadata.coverImageRef) || undefined,
    linkedSetCodes: normalizeLinkedSetCodes(request.metadata.linkedSetCodes),
    acquisitionNotes: clean(request.metadata.acquisitionNotes) || undefined,
    purchaseTotal: normalizeOptionalNumber(request.metadata.purchaseTotal),
    purchaseCurrency: normalizeCurrency(request.metadata.purchaseCurrency),
    purchaseDate: clean(request.metadata.purchaseDate) || undefined,
    updatedAt: now
  });
  if (!metadata.name) {
    throw new Error('Collection name is required.');
  }
  const entries = request.entries.map((entry, index) => normalizeCollectionEntry(metadata, entry, index));
  await writeCollection(rootDir, { metadata, entries });
  return readCollectionState(rootDir, metadata.collectionId);
}

export async function importCollectionCsv(rootDir: string, request: CollectionImportRequest): Promise<CollectionImportResult> {
  const collectionId = slugify(request.collectionId);
  if (!collectionId) {
    throw new Error('Collection id is required.');
  }
  const source = normalizeSourcePreset(request.source);
  const mode = collectionImportModeSchema.parse(request.mode ?? 'append');
  const contentFormat = normalizeContentFormat(request.contentFormat);
  const rows = parseCollectionImportRows(request.content, contentFormat);
  const warnings: string[] = [];
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
    kind: normalizeCollectionKind(request.kind ?? existing?.metadata.kind ?? request.purpose ?? existing?.metadata.purpose),
    listCategory: normalizeListCategory(request.listCategory ?? existing?.metadata.listCategory),
    tags: existing?.metadata.tags ?? [],
    defaultEntryTags: normalizeTags(request.defaultEntryTags ?? existing?.metadata.defaultEntryTags),
    defaultOwnershipStatus: normalizeDefaultOwnershipStatus(request.defaultOwnershipStatus ?? existing?.metadata.defaultOwnershipStatus, normalizeCollectionKind(request.kind ?? existing?.metadata.kind ?? request.purpose ?? existing?.metadata.purpose), normalizeListCategory(request.listCategory ?? existing?.metadata.listCategory)),
    defaultStarred: Boolean(request.defaultStarred ?? existing?.metadata.defaultStarred),
    defaultFlagged: Boolean(request.defaultFlagged ?? existing?.metadata.defaultFlagged),
    defaultProxy: Boolean(request.defaultProxy ?? existing?.metadata.defaultProxy),
    defaultHomebrew: Boolean(request.defaultHomebrew ?? existing?.metadata.defaultHomebrew),
    accentColor: existing?.metadata.accentColor,
    coverImageRef: existing?.metadata.coverImageRef,
    linkedSetCodes: existing?.metadata.linkedSetCodes ?? [],
    acquisitionNotes: existing?.metadata.acquisitionNotes,
    purchaseTotal: existing?.metadata.purchaseTotal,
    purchaseCurrency: existing?.metadata.purchaseCurrency,
    purchaseDate: existing?.metadata.purchaseDate,
    createdAt: existing?.metadata.createdAt ?? now,
    updatedAt: now
  });
  const importedEntries = rows.map((row, index) => scannerRowToEntry(metadata, source, row, index, warnings));
  const entries = (mode === 'replace' ? importedEntries : mergeEntries(existing?.entries ?? [], importedEntries)).map((entry, index) => normalizeCollectionEntry(metadata, entry, index));
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

export async function addOfficialCardToCollection(rootDir: string, request: AddOfficialCardToCollectionRequest): Promise<CollectionState> {
  await ensureDefaultCollectionLists(rootDir);
  const card = await findOfficialCardPrint(rootDir, request.cardId);
  if (!card) {
    throw new Error('Official card print was not found in the local catalog. Sync Official Cards first.');
  }
  const collectionId = slugify(request.collectionId ?? request.collectionName ?? 'official-cards');
  if (!collectionId) {
    throw new Error('Collection id is required.');
  }
  const existing = await readExistingCollection(rootDir, collectionId);
  const now = new Date().toISOString();
  const metadata = collectionMetadataSchema.parse({
    collectionId,
    name: clean(request.collectionName) || existing?.metadata.name || titleFromId(collectionId),
    description: existing?.metadata.description || undefined,
    linkedUniverseId: normalizeOptionalId(request.linkedUniverseId) || existing?.metadata.linkedUniverseId || undefined,
    gameId: existing?.metadata.gameId ?? 'mtg',
    purpose: existing?.metadata.purpose ?? 'owned',
    source: 'scryfall',
    kind: normalizeCollectionKind(request.kind ?? existing?.metadata.kind ?? 'binder'),
    listCategory: normalizeListCategory(request.listCategory ?? existing?.metadata.listCategory),
    tags: existing?.metadata.tags ?? [],
    defaultEntryTags: normalizeTags(existing?.metadata.defaultEntryTags),
    defaultOwnershipStatus: normalizeDefaultOwnershipStatus(existing?.metadata.defaultOwnershipStatus, normalizeCollectionKind(request.kind ?? existing?.metadata.kind ?? 'binder'), normalizeListCategory(request.listCategory ?? existing?.metadata.listCategory)),
    defaultStarred: Boolean(existing?.metadata.defaultStarred),
    defaultFlagged: Boolean(existing?.metadata.defaultFlagged),
    defaultProxy: Boolean(existing?.metadata.defaultProxy),
    defaultHomebrew: Boolean(existing?.metadata.defaultHomebrew),
    accentColor: existing?.metadata.accentColor,
    coverImageRef: existing?.metadata.coverImageRef,
    linkedSetCodes: existing?.metadata.linkedSetCodes ?? [],
    acquisitionNotes: existing?.metadata.acquisitionNotes,
    purchaseTotal: existing?.metadata.purchaseTotal,
    purchaseCurrency: existing?.metadata.purchaseCurrency,
    purchaseDate: existing?.metadata.purchaseDate,
    createdAt: existing?.metadata.createdAt ?? now,
    updatedAt: now
  });
  const officialEntry = collectionEntrySchema.parse({
    collectionId: metadata.collectionId,
    entryId: officialCardEntryId(card),
    quantity: normalizeQuantity(String(request.quantity ?? 1)),
    ownershipStatus: normalizeOwnershipStatus(request.ownershipStatus) ?? ownershipStatusForMetadata(metadata),
    ownerName: normalizeOwnerName(request.ownerName),
    cardName: card.name,
    setCode: card.setCode,
    setName: card.setName,
    collectorNumber: card.collectorNumber,
    scryfallId: card.id,
    finish: clean(request.finish) || undefined,
    condition: clean(request.condition) || undefined,
    language: clean(request.language) || languageLabel(card.lang),
    location: clean(request.location) || undefined,
    source: 'scryfall',
    sourceRow: JSON.stringify({ source: 'scryfall', scryfall: card }),
    matchKey: card.id,
    matchStrategy: 'scryfall_id',
    reviewStatus: 'matched',
    estimatedMarketPrice: priceForFinish(card, request.finish),
    estimatedMarketCurrency: 'USD',
    marketPriceSource: 'scryfall',
    marketPriceUpdatedAt: now,
    tags: normalizeTags(request.tags),
    starred: Boolean(request.starred),
    flagged: Boolean(request.flagged),
    proxy: Boolean(request.proxy),
    homebrew: Boolean(request.homebrew)
  });
  const entries = upsertOfficialEntry(existing?.entries ?? [], normalizeCollectionEntry(metadata, officialEntry, existing?.entries.length ?? 0));
  await writeCollection(rootDir, { metadata, entries });
  return readCollectionState(rootDir, metadata.collectionId);
}

export async function refreshCollectionMarketPrices(rootDir: string, request: CollectionPriceRefreshRequest): Promise<CollectionPriceRefreshResult> {
  const collection = await readCollectionState(rootDir, request.collectionId);
  const updatedAt = request.updatedAt ?? new Date().toISOString();
  const onlyMissing = Boolean(request.onlyMissing);
  const warnings: string[] = [];
  let updatedRows = 0;
  let unchangedRows = 0;
  let missingRows = 0;
  let matchedByScryfallId = 0;
  let matchedByPrint = 0;

  const entries: CollectionEntry[] = [];
  for (const entry of collection.entries) {
    const match = await officialPrintForEntry(rootDir, entry);
    if (!match.card) {
      missingRows += 1;
      warnings.push(`${entry.cardName}: no matching official print in local catalog.`);
      entries.push(entry);
      continue;
    }
    if (match.kind === 'scryfall_id') {
      matchedByScryfallId += 1;
    } else {
      matchedByPrint += 1;
    }
    const snapshot = marketSnapshotForPrint(match.card, entry.finish, updatedAt, 'scryfall');
    if (!snapshot) {
      missingRows += 1;
      warnings.push(`${entry.cardName}: official print has no usable market price.`);
      entries.push(entry);
      continue;
    }
    if (onlyMissing && entry.estimatedMarketPrice !== undefined) {
      unchangedRows += 1;
      entries.push(entry);
      continue;
    }
    const nextEntry = collectionEntrySchema.parse({
      ...entry,
      estimatedMarketPrice: snapshot.amount,
      estimatedMarketCurrency: snapshot.currency,
      marketPriceSource: snapshot.source,
      marketPriceUpdatedAt: snapshot.updatedAt,
      sourceRow: sourceRowWithPriceRefresh(entry.sourceRow, match.card, snapshot)
    });
    if (priceFieldsEqual(entry, nextEntry)) {
      unchangedRows += 1;
    } else {
      updatedRows += 1;
    }
    entries.push(nextEntry);
  }

  const nextCollection: CollectionState = {
    metadata: collectionMetadataSchema.parse({ ...collection.metadata, updatedAt }),
    entries,
    warnings: entries.filter((entry) => entry.reviewStatus === 'needs_review').map((entry) => reviewMessage(entry))
  };
  const summary: CollectionPriceRefreshSummary = {
    collectionId: collection.metadata.collectionId,
    source: request.source ?? 'scryfall',
    dryRun: Boolean(request.dryRun),
    checkedRows: collection.entries.length,
    updatedRows,
    unchangedRows,
    missingRows,
    matchedByScryfallId,
    matchedByPrint,
    updatedAt,
    warnings: [...new Set(warnings)]
  };
  if (!request.dryRun) {
    await writeCollection(rootDir, nextCollection);
    return { collection: await readCollectionState(rootDir, collection.metadata.collectionId), summary };
  }
  return { collection: nextCollection, summary };
}

export async function importCollectionPriceCsv(rootDir: string, request: CollectionPriceImportRequest): Promise<CollectionPriceRefreshResult> {
  const collection = await readCollectionState(rootDir, request.collectionId);
  const updatedAt = request.updatedAt ?? new Date().toISOString();
  const source = clean(request.source) || 'price_csv';
  const priceRows = parseCsvRecords(request.content).map((row) => normalizePriceRow(row, source, updatedAt));
  const warnings = priceRows.flatMap((row) => row.warnings);
  let updatedRows = 0;
  let unchangedRows = 0;
  let missingRows = 0;
  let matchedByScryfallId = 0;
  let matchedByPrint = 0;

  const entries = collection.entries.map((entry): CollectionEntry => {
    const match = bestPriceRowForEntry(entry, priceRows);
    if (!match || match.price === undefined) {
      missingRows += 1;
      warnings.push(`${entry.cardName}: no matching price row.`);
      return entry;
    }
    if (match.scryfallId && entry.scryfallId && match.scryfallId === entry.scryfallId) {
      matchedByScryfallId += 1;
    } else {
      matchedByPrint += 1;
    }
    const nextEntry = collectionEntrySchema.parse({
      ...entry,
      estimatedMarketPrice: match.price,
      estimatedMarketCurrency: match.currency ?? 'USD',
      marketPriceSource: match.source ?? source,
      marketPriceUpdatedAt: match.updatedAt ?? updatedAt,
      sourceRow: sourceRowWithImportedPrice(entry.sourceRow, match)
    });
    if (priceFieldsEqual(entry, nextEntry)) {
      unchangedRows += 1;
    } else {
      updatedRows += 1;
    }
    return nextEntry;
  });

  const nextCollection: CollectionState = {
    metadata: collectionMetadataSchema.parse({ ...collection.metadata, updatedAt }),
    entries,
    warnings: entries.filter((entry) => entry.reviewStatus === 'needs_review').map((entry) => reviewMessage(entry))
  };
  const summary: CollectionPriceRefreshSummary = {
    collectionId: collection.metadata.collectionId,
    source,
    dryRun: Boolean(request.dryRun),
    checkedRows: collection.entries.length,
    updatedRows,
    unchangedRows,
    missingRows,
    matchedByScryfallId,
    matchedByPrint,
    updatedAt,
    warnings: [...new Set(warnings)]
  };
  if (!request.dryRun) {
    await writeCollection(rootDir, nextCollection);
    return { collection: await readCollectionState(rootDir, collection.metadata.collectionId), summary };
  }
  return { collection: nextCollection, summary };
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
      const metadata = await readCollectionMetadata(rootDir, entry.name);
      collections.push({
        metadata,
        entries: await readCollectionEntries(rootDir, entry.name, metadata)
      });
    } catch {
      // Ignore incomplete collection folders so one bad import does not break the workspace.
    }
  }
  return collections;
}

async function readExistingCollection(rootDir: string, collectionId: string): Promise<{ metadata: CollectionMetadata; entries: CollectionEntry[] } | undefined> {
  try {
    const metadata = await readCollectionMetadata(rootDir, collectionId);
    return {
      metadata,
      entries: await readCollectionEntries(rootDir, collectionId, metadata)
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

async function readCollectionEntries(rootDir: string, collectionId: string, metadata?: CollectionMetadata): Promise<CollectionEntry[]> {
  try {
    const id = slugify(collectionId);
    const rows = parseCsvRecords(await readFile(join(collectionDir(rootDir, id), 'entries.csv'), 'utf8'));
    const entries = rows.map(rowToCollectionEntry);
    return metadata ? entries.map((entry, index) => normalizeCollectionEntry(metadata, entry, index)) : entries;
  } catch {
    return [];
  }
}

async function writeCollection(rootDir: string, collection: { metadata: CollectionMetadata; entries: CollectionEntry[] }): Promise<void> {
  const dir = collectionDir(rootDir, collection.metadata.collectionId);
  const entries = collection.entries.map((entry, index) => normalizeCollectionEntry(collection.metadata, entry, index));
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'metadata.json'), `${JSON.stringify(collection.metadata, null, 2)}\n`, 'utf8');
  await writeFile(join(dir, 'entries.csv'), `${writeCsvRecords(entries.map(collectionEntryToRow), COLLECTION_ENTRY_HEADERS)}\n`, 'utf8');
}

function scannerRowToEntry(metadata: CollectionMetadata, source: CollectionSourcePreset, row: CsvRow, index: number, warnings: string[]): CollectionEntry {
  const normalized = normalizeScannerRow(row);
  if (!normalized.cardName) {
    normalized.cardName = `Unknown card ${index + 1}`;
    normalized.warnings.push(`Row ${index + 1} is missing a card name.`);
  }
  warnings.push(...normalized.warnings);
  const match = matchInfo(normalized);
  return collectionEntrySchema.parse({
    collectionId: metadata.collectionId,
    entryId: entryIdFor(source, index, normalized),
    quantity: normalized.quantity,
    ownershipStatus: normalized.ownershipStatus ?? ownershipStatusForMetadata(metadata),
    ownerName: normalized.ownerName,
    cardName: normalized.cardName,
    setCode: normalized.setCode,
    setName: normalized.setName,
    collectorNumber: normalized.collectorNumber,
    scryfallId: normalized.scryfallId,
    finish: normalized.finish,
    condition: normalized.condition,
    language: normalized.language,
    location: normalized.location,
    purchasePrice: normalized.purchasePrice,
    purchaseCurrency: normalized.purchaseCurrency,
    purchaseDate: normalized.purchaseDate,
    estimatedMarketPrice: normalized.estimatedMarketPrice,
    estimatedMarketCurrency: normalized.estimatedMarketCurrency,
    marketPriceSource: normalized.marketPriceSource,
    marketPriceUpdatedAt: normalized.marketPriceUpdatedAt,
    tags: normalized.tags,
    notes: normalized.notes,
    starred: normalized.starred,
    flagged: normalized.flagged,
    altered: normalized.altered,
    misprint: normalized.misprint,
    proxy: normalized.proxy,
    homebrew: normalized.homebrew,
    markedForDeletion: normalized.markedForDeletion,
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
  const purchasePrice = normalizeOptionalNumber(valueFor(row, ['purchaseprice', 'purchase', 'paid', 'paidprice', 'cost', 'acquisitionprice']));
  const estimatedMarketPrice = normalizeOptionalNumber(valueFor(row, ['marketprice', 'tcgmarketprice', 'listedmedian', 'estimatedmarketprice', 'estimatedvalue', 'value', 'price']));
  const purchaseCurrency = normalizeCurrency(valueFor(row, ['purchasecurrency', 'paidcurrency', 'currency']));
  const estimatedMarketCurrency = normalizeCurrency(valueFor(row, ['marketcurrency', 'estimatedmarketcurrency', 'valuecurrency', 'currency']));
  const marketPriceSource = clean(valueFor(row, ['marketpricesource', 'pricesource', 'sourcepriceprovider']));
  const tags = normalizeTags(valueFor(row, ['tags', 'tag', 'labels']));
  const ownershipStatus = normalizeOwnershipStatus(valueFor(row, ['ownershipstatus', 'ownership', 'ownedstatus', 'wantedstatus']));
  const ownerName = normalizeOwnerName(valueFor(row, ['owner', 'ownername', 'ownedby', 'cardowner']));
  const warnings: string[] = [];
  if (!cardName) {
    warnings.push('A source row was missing card name.');
  }
  if (rawScryfallId && !scryfallId) {
    warnings.push(`${cardName || 'A source row'} had an invalid Scryfall id.`);
  }
  return {
    quantity,
    ownershipStatus,
    ownerName,
    cardName,
    setCode: normalizedSetCode || undefined,
    setName,
    collectorNumber: clean(valueFor(row, ['collectornumber', 'collector', 'number', 'cardnumber', 'no', 'cn'])) || undefined,
    scryfallId: scryfallId || undefined,
    finish: normalizeFinish(valueFor(row, ['finish', 'foil', 'foiling', 'printing', 'variant'])) || undefined,
    condition: clean(valueFor(row, ['condition', 'cardcondition'])) || undefined,
    language: clean(valueFor(row, ['language', 'lang'])) || undefined,
    location: clean(valueFor(row, ['location', 'binder', 'folder', 'list', 'collection', 'collectionname'])) || undefined,
    purchasePrice,
    purchaseCurrency,
    purchaseDate: clean(valueFor(row, ['purchasedate', 'datepurchased', 'acquisitiondate'])) || undefined,
    estimatedMarketPrice,
    estimatedMarketCurrency,
    marketPriceSource: marketPriceSource || (estimatedMarketPrice !== undefined ? sourceNameFromCsv(row) : undefined),
    marketPriceUpdatedAt: clean(valueFor(row, ['marketpriceupdatedat', 'priceupdatedat', 'pricedate'])) || undefined,
    tags,
    notes: clean(valueFor(row, ['notes', 'note', 'comments', 'comment'])) || undefined,
    starred: normalizeBoolean(valueFor(row, ['starred', 'favorite', 'favourite'])),
    flagged: normalizeBoolean(valueFor(row, ['flagged', 'flag'])),
    altered: normalizeBoolean(valueFor(row, ['altered', 'alter'])),
    misprint: normalizeBoolean(valueFor(row, ['misprint', 'miscut'])),
    proxy: normalizeBoolean(valueFor(row, ['proxy', 'playtestcard'])),
    homebrew: normalizeBoolean(valueFor(row, ['homebrew', 'customcard'])),
    markedForDeletion: normalizeBoolean(valueFor(row, ['markedfordeletion', 'delete', 'trash'])),
    sourceRow: JSON.stringify(row),
    warnings
  };
}

function parseCollectionImportRows(content: string, format: CollectionImportContentFormat): CsvRow[] {
  if (format === 'text') {
    return parseCollectionTextRows(content);
  }
  if (format === 'cockatrice') {
    return parseCollectionCockatriceRows(content);
  }
  return parseCsvRecords(content);
}

function parseCollectionTextRows(content: string): CsvRow[] {
  const rows: CsvRow[] = [];
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || /^#|^\/\//.test(line) || maybeListHeading(line)) {
      continue;
    }
    const match = line.match(/^(\d+)\s*x?\s+(.+)$/i);
    if (!match) {
      continue;
    }
    const parsed = parseCollectionNameReference(clean(match[2]));
    rows.push({
      Quantity: clean(match[1]),
      Name: parsed.name,
      'Set Code': parsed.setCode ?? '',
      'Collector Number': parsed.collectorNumber ?? ''
    });
  }
  return rows;
}

function parseCollectionCockatriceRows(content: string): CsvRow[] {
  const parsed = new XMLParser({ ignoreAttributes: false }).parse(content);
  const deckNode = parsed?.cockatrice_deck ?? parsed?.deck ?? {};
  const rows: CsvRow[] = [];
  for (const zone of asArray(deckNode.zone)) {
    for (const card of asArray(zone?.card)) {
      const name = clean(card?.['@_name'] || card?.name);
      if (!name) {
        continue;
      }
      rows.push({
        Quantity: clean(card?.['@_number'] || card?.number || card?.count) || '1',
        Name: name
      });
    }
  }
  return rows;
}

function parseCollectionNameReference(value: string): { name: string; setCode?: string; collectorNumber?: string } {
  const bracketed = value.match(/^(.*)\s+\[([A-Za-z0-9]{2,8})\](?:\s+([A-Za-z0-9\-]+))?$/);
  if (bracketed) {
    return { name: clean(bracketed[1]), setCode: clean(bracketed[2]).toUpperCase(), collectorNumber: clean(bracketed[3]) || undefined };
  }
  const parenthetical = value.match(/^(.*)\s+\(([A-Z0-9]{2,8})\)(?:\s+([A-Za-z0-9\-]+))?$/);
  if (parenthetical) {
    return { name: clean(parenthetical[1]), setCode: clean(parenthetical[2]).toUpperCase(), collectorNumber: clean(parenthetical[3]) || undefined };
  }
  return { name: value };
}

function maybeListHeading(value: string): boolean {
  return ['main', 'mainboard', 'side', 'sideboard', 'maybe', 'maybeboard', 'collection', 'cards'].includes(value.toLowerCase().replace(/[^a-z]/g, ''));
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
    sourceCount: new Set(entries.map((entry) => entry.source)).size,
    ownerNames: ownerNamesForEntries(entries)
  };
}

function rowToCollectionEntry(row: CsvRow): CollectionEntry {
  return collectionEntrySchema.parse({
    collectionId: clean(row.collection_id),
    entryId: clean(row.entry_id),
    quantity: Math.max(1, Number(row.quantity) || 1),
    ownershipStatus: normalizeOwnershipStatus(row.ownership_status) ?? 'owned',
    ownerName: normalizeOwnerName(valueFor(row, ['ownername', 'owner', 'ownedby', 'cardowner'])),
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
    reviewNotes: clean(row.review_notes) || undefined,
    linkedSetCode: clean(row.linked_set_code).toUpperCase() || undefined,
    linkedCardId: clean(row.linked_card_id) || undefined,
    linkedVariantId: clean(row.linked_variant_id) || undefined,
    previewArtSource: normalizePreviewArtSource(row.preview_art_source),
    purchasePrice: normalizeOptionalNumber(row.purchase_price),
    purchaseCurrency: normalizeCurrency(row.purchase_currency),
    purchaseDate: clean(row.purchase_date) || undefined,
    estimatedMarketPrice: normalizeOptionalNumber(row.estimated_market_price),
    estimatedMarketCurrency: normalizeCurrency(row.estimated_market_currency),
    marketPriceSource: clean(row.market_price_source) || undefined,
    marketPriceUpdatedAt: clean(row.market_price_updated_at) || undefined,
    tags: normalizeTags(row.tags),
    notes: clean(row.notes) || undefined,
    starred: normalizeBoolean(row.starred),
    flagged: normalizeBoolean(row.flagged),
    altered: normalizeBoolean(row.altered),
    misprint: normalizeBoolean(row.misprint),
    proxy: normalizeBoolean(row.proxy),
    homebrew: normalizeBoolean(row.homebrew),
    markedForDeletion: normalizeBoolean(row.marked_for_deletion)
  });
}

function collectionEntryToRow(entry: CollectionEntry): CsvRow {
  return {
    collection_id: entry.collectionId,
    entry_id: entry.entryId,
    quantity: String(entry.quantity),
    ownership_status: entry.ownershipStatus,
    owner_name: normalizeOwnerName(entry.ownerName),
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
    review_notes: entry.reviewNotes ?? '',
    linked_set_code: entry.linkedSetCode ?? '',
    linked_card_id: entry.linkedCardId ?? '',
    linked_variant_id: entry.linkedVariantId ?? '',
    preview_art_source: entry.previewArtSource ?? 'auto',
    purchase_price: entry.purchasePrice === undefined ? '' : String(entry.purchasePrice),
    purchase_currency: entry.purchaseCurrency ?? '',
    purchase_date: entry.purchaseDate ?? '',
    estimated_market_price: entry.estimatedMarketPrice === undefined ? '' : String(entry.estimatedMarketPrice),
    estimated_market_currency: entry.estimatedMarketCurrency ?? '',
    market_price_source: entry.marketPriceSource ?? '',
    market_price_updated_at: entry.marketPriceUpdatedAt ?? '',
    tags: (entry.tags ?? []).join(';'),
    notes: entry.notes ?? '',
    starred: entry.starred ? 'true' : '',
    flagged: entry.flagged ? 'true' : '',
    altered: entry.altered ? 'true' : '',
    misprint: entry.misprint ? 'true' : '',
    proxy: entry.proxy ? 'true' : '',
    homebrew: entry.homebrew ? 'true' : '',
    marked_for_deletion: entry.markedForDeletion ? 'true' : ''
  };
}

function normalizeCollectionEntry(metadata: CollectionMetadata, entry: CollectionEntry, index: number): CollectionEntry {
  const normalizedTags = normalizeTags([...(entry.tags ?? []), ...tagsForMetadata(metadata)]);
  return collectionEntrySchema.parse({
    collectionId: metadata.collectionId,
    entryId: clean(entry.entryId) || `entry-manual-${index + 1}`,
    quantity: Math.max(1, Math.floor(Number(entry.quantity) || 1)),
    ownershipStatus: normalizeOwnershipStatus(entry.ownershipStatus) ?? ownershipStatusForMetadata(metadata),
    ownerName: normalizeOwnerName(entry.ownerName),
    cardName: clean(entry.cardName) || `Unknown card ${index + 1}`,
    setCode: clean(entry.setCode).toUpperCase() || undefined,
    setName: clean(entry.setName) || undefined,
    collectorNumber: clean(entry.collectorNumber) || undefined,
    scryfallId: normalizeScryfallId(entry.scryfallId ?? '') || undefined,
    finish: clean(entry.finish) || undefined,
    condition: clean(entry.condition) || undefined,
    language: clean(entry.language) || undefined,
    location: clean(entry.location) || undefined,
    source: normalizeSourcePreset(entry.source ?? 'generic'),
    sourceRow: clean(entry.sourceRow) || undefined,
    matchKey: clean(entry.matchKey) || undefined,
    matchStrategy: entry.matchStrategy || 'unresolved',
    reviewStatus: entry.reviewStatus || 'needs_review',
    reviewNotes: clean(entry.reviewNotes) || undefined,
    linkedSetCode: clean(entry.linkedSetCode).toUpperCase() || undefined,
    linkedCardId: clean(entry.linkedCardId) || undefined,
    linkedVariantId: clean(entry.linkedVariantId) || undefined,
    previewArtSource: normalizePreviewArtSource(entry.previewArtSource),
    purchasePrice: normalizeOptionalNumber(entry.purchasePrice),
    purchaseCurrency: normalizeCurrency(entry.purchaseCurrency),
    purchaseDate: clean(entry.purchaseDate) || undefined,
    estimatedMarketPrice: normalizeOptionalNumber(entry.estimatedMarketPrice),
    estimatedMarketCurrency: normalizeCurrency(entry.estimatedMarketCurrency),
    marketPriceSource: clean(entry.marketPriceSource) || undefined,
    marketPriceUpdatedAt: clean(entry.marketPriceUpdatedAt) || undefined,
    tags: normalizedTags,
    notes: clean(entry.notes) || undefined,
    starred: Boolean(entry.starred || metadata.defaultStarred),
    flagged: Boolean(entry.flagged || metadata.defaultFlagged),
    altered: Boolean(entry.altered),
    misprint: Boolean(entry.misprint),
    proxy: Boolean(entry.proxy || metadata.defaultProxy || entry.ownershipStatus === 'proxy'),
    homebrew: Boolean(entry.homebrew || metadata.defaultHomebrew || entry.ownershipStatus === 'homebrew_unprinted'),
    markedForDeletion: Boolean(entry.markedForDeletion)
  });
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

function normalizeOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const cleaned = typeof value === 'string' ? value.replace(/[$,]/g, '').trim() : value;
  if (cleaned === '') {
    return undefined;
  }
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function normalizeCurrency(value: unknown): string | undefined {
  const cleaned = clean(value).toUpperCase().replace(/[^A-Z]/g, '');
  return cleaned && cleaned.length <= 4 ? cleaned : undefined;
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return [...new Set(value.map((tag) => clean(tag)).filter(Boolean))];
  }
  return [...new Set(clean(value).split(';').map((tag) => tag.trim()).filter(Boolean))];
}

function normalizeOwnerName(value: unknown): string {
  return clean(value) || DEFAULT_COLLECTION_OWNER_NAME;
}

function ownerNamesForEntries(entries: CollectionEntry[]): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const name of [DEFAULT_COLLECTION_OWNER_NAME, ...entries.map((entry) => normalizeOwnerName(entry.ownerName))]) {
    const key = name.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    names.push(name);
  }
  return names;
}

function normalizeLinkedSetCodes(value: unknown): string[] {
  return normalizeTags(value).map((setCode) => clean(setCode).toUpperCase()).filter(Boolean);
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  const cleaned = clean(value).toLowerCase();
  return ['true', '1', 'yes', 'y', 'starred', 'flagged'].includes(cleaned);
}

function normalizeCollectionKind(value: unknown): 'binder' | 'list' {
  const normalized = clean(value).toLowerCase();
  if (normalized === 'binder' || normalized === 'owned') {
    return 'binder';
  }
  if (normalized === 'list' || normalized === 'wishlist' || normalized === 'wish_list' || normalized === 'recommendation' || normalized === 'starred' || normalized === 'flagged' || normalized === 'gift') {
    return 'list';
  }
  return 'binder';
}

function normalizeListCategory(value: unknown): CollectionMetadata['listCategory'] {
  const normalized = clean(value).toLowerCase().replace(/[\s_-]+/g, '_');
  if (normalized === 'wish' || normalized === 'wish_list') {
    return 'wishlist';
  }
  if (normalized === 'recommendations' || normalized === 'recommended') {
    return 'recommendation';
  }
  const parsed = collectionListCategorySchema.safeParse(normalized);
  return parsed.success ? parsed.data : 'general';
}

function normalizeOwnershipStatus(value: unknown): CollectionOwnershipStatus | undefined {
  const normalized = clean(value).toLowerCase().replace(/[\s_-]+/g, '_');
  if (!normalized) {
    return undefined;
  }
  if (normalized === 'want' || normalized === 'wishlist' || normalized === 'wish_list' || normalized === 'unowned') {
    return 'wanted';
  }
  if (normalized === 'recommendation') {
    return 'recommended';
  }
  if (normalized === 'homebrew' || normalized === 'unprinted') {
    return 'homebrew_unprinted';
  }
  const parsed = collectionOwnershipStatusSchema.safeParse(normalized);
  return parsed.success ? parsed.data : undefined;
}

function normalizeDefaultOwnershipStatus(value: unknown, kind: CollectionKind, category: CollectionMetadata['listCategory']): CollectionOwnershipStatus | undefined {
  const explicit = normalizeOwnershipStatus(value);
  if (explicit) {
    return explicit;
  }
  if (kind === 'binder') {
    return 'owned';
  }
  if (category === 'wishlist' || category === 'gift') {
    return 'wanted';
  }
  if (category === 'recommendation') {
    return 'recommended';
  }
  return 'reference';
}

function ownershipStatusForMetadata(metadata: CollectionMetadata): CollectionOwnershipStatus {
  return metadata.defaultOwnershipStatus ?? normalizeDefaultOwnershipStatus(undefined, metadata.kind, metadata.listCategory) ?? 'owned';
}

function tagsForMetadata(metadata: CollectionMetadata): string[] {
  return metadata.kind === 'list' ? normalizeTags([...(metadata.defaultEntryTags ?? []), metadata.listCategory !== 'general' ? metadata.listCategory : '']) : [];
}

async function ensureDefaultCollectionLists(rootDir: string): Promise<void> {
  const now = new Date().toISOString();
  for (const definition of DEFAULT_COLLECTION_LISTS) {
    try {
      await readCollectionMetadata(rootDir, definition.collectionId);
      continue;
    } catch {
      const metadata = collectionMetadataSchema.parse({
        ...definition,
        linkedSetCodes: [],
        createdAt: now,
        updatedAt: now
      });
      await writeCollection(rootDir, { metadata, entries: [] });
    }
  }
}

function sourceNameFromCsv(row: CsvRow): string {
  return clean(valueFor(row, ['source', 'marketpricesource', 'pricesource', 'provider'])) || 'csv';
}

function priceForFinish(card: unknown, finish: string | undefined): number | undefined {
  return marketSnapshotForPrint(card as OfficialCardPrint, finish, new Date().toISOString(), 'scryfall')?.amount;
}

async function officialPrintForEntry(rootDir: string, entry: CollectionEntry): Promise<{ card?: OfficialCardPrint; kind?: 'scryfall_id' | 'print_key' }> {
  if (entry.scryfallId) {
    const card = await findOfficialCardPrint(rootDir, entry.scryfallId);
    if (card) {
      return { card, kind: 'scryfall_id' };
    }
  }
  const card = await findOfficialCardPrintByPrintKey(rootDir, {
    name: entry.cardName,
    setCode: entry.setCode,
    collectorNumber: entry.collectorNumber
  });
  return card ? { card, kind: 'print_key' } : {};
}

function marketSnapshotForPrint(card: OfficialCardPrint | undefined, finish: string | undefined, updatedAt: string, source: string): PriceSnapshot | undefined {
  if (!card) {
    return undefined;
  }
  const cardRecord = objectValue(card);
  const prices = objectValue(cardRecord?.prices) ?? cardRecord;
  const preferredKeys = isPremiumFinish(finish) ? ['usdFoil', 'usd_foil', 'foil', 'foil_price'] : ['usd', 'usd_regular', 'market_price'];
  for (const key of [...preferredKeys, 'usd', 'usdFoil', 'usd_foil', 'eur', 'eurFoil', 'eur_foil', 'tix']) {
    const amount = normalizeOptionalNumber(prices?.[key]);
    if (amount !== undefined) {
      return {
        amount,
        currency: currencyForPriceKey(key),
        source,
        updatedAt
      };
    }
  }
  return undefined;
}

function isPremiumFinish(value: string | undefined): boolean {
  const normalized = normalizeFinish(value ?? '').toLowerCase();
  return normalized === 'foil' || normalized.includes('etched');
}

function normalizePriceRow(row: CsvRow, defaultSource: string, defaultUpdatedAt: string): NormalizedPriceRow {
  const rawScryfallId = valueFor(row, ['scryfallid', 'scryfall']);
  const scryfallId = normalizeScryfallId(rawScryfallId);
  const price = normalizeOptionalNumber(valueFor(row, ['marketprice', 'tcgmarketprice', 'listedmedian', 'estimatedmarketprice', 'estimatedvalue', 'value', 'price', 'usd', 'usdfoil', 'usdregular']));
  const cardName = valueFor(row, ['cardname', 'name', 'card', 'productname', 'product', 'title']);
  const warnings: string[] = [];
  if (rawScryfallId && !scryfallId) {
    warnings.push(`${cardName || 'A price row'} had an invalid Scryfall id.`);
  }
  if (price === undefined) {
    warnings.push(`${cardName || rawScryfallId || 'A price row'} had no usable price.`);
  }
  return {
    cardName: cardName || undefined,
    setCode: normalizeSetCode(valueFor(row, ['setcode', 'set', 'editioncode', 'expansioncode'])) || undefined,
    collectorNumber: clean(valueFor(row, ['collectornumber', 'collector', 'number', 'cardnumber', 'no', 'cn'])) || undefined,
    scryfallId: scryfallId || undefined,
    finish: normalizeFinish(valueFor(row, ['finish', 'foil', 'foiling', 'printing', 'variant'])) || undefined,
    price,
    currency: normalizeCurrency(valueFor(row, ['marketcurrency', 'estimatedmarketcurrency', 'valuecurrency', 'currency'])) ?? 'USD',
    source: clean(valueFor(row, ['marketpricesource', 'pricesource', 'sourcepriceprovider', 'provider', 'source'])) || defaultSource,
    updatedAt: clean(valueFor(row, ['marketpriceupdatedat', 'priceupdatedat', 'pricedate', 'date'])) || defaultUpdatedAt,
    sourceRow: JSON.stringify(row),
    warnings
  };
}

function bestPriceRowForEntry(entry: CollectionEntry, rows: NormalizedPriceRow[]): NormalizedPriceRow | undefined {
  let best: { row: NormalizedPriceRow; score: number } | undefined;
  for (const row of rows) {
    if (row.price === undefined) {
      continue;
    }
    const score = priceRowMatchScore(entry, row);
    if (score <= 0) {
      continue;
    }
    if (!best || score > best.score) {
      best = { row, score };
    }
  }
  return best?.row;
}

function priceRowMatchScore(entry: CollectionEntry, row: NormalizedPriceRow): number {
  if (!finishMatches(entry.finish, row.finish)) {
    return 0;
  }
  if (entry.scryfallId && row.scryfallId && entry.scryfallId === row.scryfallId) {
    return 100;
  }
  const entryName = clean(entry.cardName).toLowerCase();
  const rowName = clean(row.cardName).toLowerCase();
  const entrySet = clean(entry.setCode).toUpperCase();
  const rowSet = clean(row.setCode).toUpperCase();
  const entryCollector = clean(entry.collectorNumber).toLowerCase();
  const rowCollector = clean(row.collectorNumber).toLowerCase();
  if (entryName && rowName && entryName !== rowName) {
    return 0;
  }
  if (entrySet && rowSet && entrySet !== rowSet) {
    return 0;
  }
  if (entryCollector && rowCollector && entryCollector !== rowCollector) {
    return 0;
  }
  if (entryName && rowName && entrySet && rowSet && entryCollector && rowCollector) {
    return 90;
  }
  if (entrySet && rowSet && entryCollector && rowCollector) {
    return 78;
  }
  if (entryName && rowName && entrySet && rowSet) {
    return 64;
  }
  if (entryName && rowName) {
    return 35;
  }
  return 0;
}

function finishMatches(entryFinish: string | undefined, rowFinish: string | undefined): boolean {
  if (!rowFinish || !entryFinish) {
    return true;
  }
  return normalizeFinish(entryFinish).toLowerCase() === normalizeFinish(rowFinish).toLowerCase();
}

function currencyForPriceKey(key: string): string {
  const normalized = key.toLowerCase();
  if (normalized.includes('eur')) {
    return 'EUR';
  }
  if (normalized.includes('tix')) {
    return 'TIX';
  }
  return 'USD';
}

function priceFieldsEqual(left: CollectionEntry, right: CollectionEntry): boolean {
  return (
    left.estimatedMarketPrice === right.estimatedMarketPrice &&
    left.estimatedMarketCurrency === right.estimatedMarketCurrency &&
    left.marketPriceSource === right.marketPriceSource &&
    left.marketPriceUpdatedAt === right.marketPriceUpdatedAt
  );
}

function sourceRowWithPriceRefresh(sourceRow: string | undefined, card: OfficialCardPrint, snapshot: PriceSnapshot): string {
  const source = parseSourceRowObject(sourceRow);
  return JSON.stringify({
    ...source,
    priceRefresh: {
      provider: snapshot.source,
      updatedAt: snapshot.updatedAt,
      cardId: card.id,
      price: snapshot.amount,
      currency: snapshot.currency
    }
  });
}

function sourceRowWithImportedPrice(sourceRow: string | undefined, row: NormalizedPriceRow): string {
  const source = parseSourceRowObject(sourceRow);
  return JSON.stringify({
    ...source,
    priceImport: {
      provider: row.source,
      updatedAt: row.updatedAt,
      price: row.price,
      currency: row.currency,
      row: row.sourceRow
    }
  });
}

function parseSourceRowObject(sourceRow: string | undefined): Record<string, unknown> {
  if (!sourceRow) {
    return {};
  }
  try {
    return objectValue(JSON.parse(sourceRow)) ?? {};
  } catch {
    return { rawSourceRow: sourceRow };
  }
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function normalizeSourcePreset(value: string): CollectionSourcePreset {
  return ['manabox', 'tcgplayer', 'dragonshield', 'delver', 'generic', 'scryfall'].includes(value) ? (value as CollectionSourcePreset) : 'generic';
}

function normalizeContentFormat(value: unknown): CollectionImportContentFormat {
  const normalized = clean(value || 'csv').toLowerCase();
  return ['csv', 'text', 'cockatrice'].includes(normalized) ? (normalized as CollectionImportContentFormat) : 'csv';
}

function normalizePurpose(value: unknown): string {
  const normalized = clean(value || 'mixed').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return collectionPurposeSchema.safeParse(normalized).success ? normalized : 'mixed';
}

function normalizePreviewArtSource(value: unknown): string {
  const normalized = clean(value || 'auto').toLowerCase();
  return collectionPreviewArtSourceSchema.safeParse(normalized).success ? normalized : 'auto';
}

function normalizeGameId(value: unknown): string {
  return clean(value || 'mtg').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'mtg';
}

function normalizeOptionalId(value: unknown): string | undefined {
  return clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || undefined;
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
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

function upsertOfficialEntry(entries: CollectionEntry[], entry: CollectionEntry): CollectionEntry[] {
  const next = [...entries];
  const existingIndex = next.findIndex((candidate) => candidate.entryId === entry.entryId || (entry.scryfallId && candidate.scryfallId === entry.scryfallId));
  if (existingIndex === -1) {
    return [...next, entry];
  }
  const existing = next[existingIndex]!;
  next[existingIndex] = collectionEntrySchema.parse({
    ...existing,
    ...entry,
    quantity: existing.quantity + entry.quantity,
    finish: entry.finish ?? existing.finish,
    condition: entry.condition ?? existing.condition,
    language: entry.language ?? existing.language,
    location: entry.location ?? existing.location,
    ownerName: entry.ownerName === DEFAULT_COLLECTION_OWNER_NAME && existing.ownerName !== DEFAULT_COLLECTION_OWNER_NAME ? existing.ownerName : entry.ownerName
  });
  return next;
}

function languageLabel(lang: string | undefined): string | undefined {
  if (!lang || lang === 'en') {
    return 'English';
  }
  return lang;
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

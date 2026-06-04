import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseCsvRecords, writeCsvRecords, type CsvRow } from '../data/csv.js';
import { loadForgeProject } from '../data/loadProject.js';
import type { CardFaceRecord, CardRecord } from '../domain/schemas.js';
import {
  DECK_ENTRY_HEADERS,
  DECK_SECTIONS,
  deckEntrySchema,
  deckMetadataSchema,
  type CreateDeckRequest,
  type DeckCardOption,
  type DeckEntry,
  type DeckExportResult,
  type DeckMetadata,
  type DeckSection,
  type DeckState,
  type DeckSummary,
  type ResolvedDeckEntry,
  type SaveDeckRequest
} from './deckModel.js';

export async function listDecks(rootDir: string): Promise<DeckSummary[]> {
  const decks = await readAllDecks(rootDir);
  const cardCatalog = await readCardCatalog(rootDir);
  return decks
    .map(({ metadata, entries }) => summarizeDeck(metadata, entries, cardCatalog.cardsByKey))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function readDeckState(rootDir: string, deckId: string): Promise<DeckState> {
  const metadata = await readDeckMetadata(rootDir, deckId);
  const entries = await readDeckEntries(rootDir, deckId);
  const cardCatalog = await readCardCatalog(rootDir);
  const resolved = resolveEntries(entries, cardCatalog.cardsByKey);
  return {
    metadata,
    entries: resolved,
    availableCards: cardCatalog.cards,
    warnings: resolved.flatMap((entry) => (entry.warning ? [entry.warning] : []))
  };
}

export async function createDeck(rootDir: string, request: CreateDeckRequest): Promise<DeckState> {
  const name = clean(request.name);
  if (!name) {
    throw new Error('Deck name is required.');
  }
  const now = new Date().toISOString();
  const deckId = await uniqueDeckId(rootDir, slugify(name));
  const metadata: DeckMetadata = deckMetadataSchema.parse({
    deckId,
    name,
    description: clean(request.description) || undefined,
    linkedUniverseId: clean(request.linkedUniverseId) || undefined,
    linkedSetCode: clean(request.linkedSetCode).toUpperCase() || undefined,
    format: clean(request.format) || undefined,
    status: request.status ?? 'draft',
    tags: cleanTags(request.tags),
    notes: clean(request.notes) || undefined,
    createdAt: now,
    updatedAt: now
  });
  await writeDeck(rootDir, { metadata, entries: [] });
  return readDeckState(rootDir, deckId);
}

export async function saveDeck(rootDir: string, request: SaveDeckRequest): Promise<DeckState> {
  const now = new Date().toISOString();
  const metadata = deckMetadataSchema.parse({
    ...request.metadata,
    name: clean(request.metadata.name),
    linkedSetCode: clean(request.metadata.linkedSetCode).toUpperCase() || undefined,
    status: request.metadata.status || 'draft',
    tags: cleanTags(request.metadata.tags),
    updatedAt: now
  });
  const entries = normalizeEntries(metadata.deckId, request.entries);
  await writeDeck(rootDir, { metadata, entries });
  return readDeckState(rootDir, metadata.deckId);
}

export async function exportDeckPlainText(rootDir: string, deckId: string): Promise<DeckExportResult> {
  const deck = await readDeckState(rootDir, deckId);
  return {
    filename: `${deck.metadata.deckId}.txt`,
    mimeType: 'text/plain',
    content: buildPlainTextDeck(deck)
  };
}

export async function exportDeckCockatrice(rootDir: string, deckId: string): Promise<DeckExportResult> {
  const deck = await readDeckState(rootDir, deckId);
  return {
    filename: `${deck.metadata.deckId}.cod`,
    mimeType: 'application/xml',
    content: buildCockatriceDeck(deck)
  };
}

export function buildPlainTextDeck(deck: DeckState): string {
  const lines = [`# ${deck.metadata.name}`];
  if (deck.metadata.description) {
    lines.push(`# ${deck.metadata.description}`);
  }
  lines.push('');

  for (const section of DECK_SECTIONS) {
    const entries = entriesForSection(deck.entries, section);
    if (entries.length === 0) {
      continue;
    }
    lines.push(sectionHeading(section));
    for (const entry of entries) {
      lines.push(`${entry.count} ${entry.card?.name ?? entry.nameSnapshot ?? entry.cardId}`);
    }
    lines.push('');
  }

  if (deck.warnings.length > 0) {
    lines.push('# Warnings');
    for (const warning of deck.warnings) {
      lines.push(`# ${warning}`);
    }
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

export function buildCockatriceDeck(deck: DeckState): string {
  const mainCards = entriesForSection(deck.entries, 'main');
  const sideCards = entriesForSection(deck.entries, 'side');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<cockatrice_deck version="1">',
    `  <deckname>${escapeXml(deck.metadata.name)}</deckname>`,
    '  <comments></comments>',
    '  <zone name="main">',
    ...mainCards.map((entry) => `    <card number="${entry.count}" name="${escapeXml(entry.card?.name ?? entry.nameSnapshot ?? entry.cardId)}"/>`),
    '  </zone>',
    '  <zone name="side">',
    ...sideCards.map((entry) => `    <card number="${entry.count}" name="${escapeXml(entry.card?.name ?? entry.nameSnapshot ?? entry.cardId)}"/>`),
    '  </zone>',
    '</cockatrice_deck>',
    ''
  ].join('\n');
}

async function readAllDecks(rootDir: string): Promise<Array<{ metadata: DeckMetadata; entries: DeckEntry[] }>> {
  const root = decksRoot(rootDir);
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }
  const decks: Array<{ metadata: DeckMetadata; entries: DeckEntry[] }> = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) {
      continue;
    }
    try {
      decks.push({
        metadata: await readDeckMetadata(rootDir, entry.name),
        entries: await readDeckEntries(rootDir, entry.name)
      });
    } catch {
      // Ignore incomplete deck folders so one bad draft does not break the workspace.
    }
  }
  return decks;
}

async function readDeckMetadata(rootDir: string, deckId: string): Promise<DeckMetadata> {
  const content = await readFile(join(deckDir(rootDir, deckId), 'metadata.json'), 'utf8');
  return deckMetadataSchema.parse(JSON.parse(content));
}

async function readDeckEntries(rootDir: string, deckId: string): Promise<DeckEntry[]> {
  try {
    const rows = parseCsvRecords(await readFile(join(deckDir(rootDir, deckId), 'entries.csv'), 'utf8'));
    return normalizeEntries(deckId, rows.map(rowToDeckEntry));
  } catch {
    return [];
  }
}

async function writeDeck(rootDir: string, deck: SaveDeckRequest): Promise<void> {
  const dir = deckDir(rootDir, deck.metadata.deckId);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'metadata.json'), `${JSON.stringify(deck.metadata, null, 2)}\n`, 'utf8');
  await writeFile(join(dir, 'entries.csv'), `${writeCsvRecords(deck.entries.map(deckEntryToRow), DECK_ENTRY_HEADERS)}\n`, 'utf8');
}

async function readCardCatalog(rootDir: string): Promise<{ cards: DeckCardOption[]; cardsByKey: Map<string, DeckCardOption> }> {
  const setCodes = await discoverSetCodes(rootDir);
  const cards: DeckCardOption[] = [];
  for (const setCode of setCodes) {
    try {
      const project = await loadForgeProject({ rootDir, setCode });
      const facesByCardId = new Map<string, CardFaceRecord[]>();
      for (const face of project.faces) {
        facesByCardId.set(face.cardId, [...(facesByCardId.get(face.cardId) ?? []), face]);
      }
      for (const card of project.cards) {
        cards.push(cardOptionFromRecord(project.set.setName, card, facesByCardId.get(card.cardId)?.sort((left, right) => left.faceIndex - right.faceIndex)[0]));
      }
    } catch {
      // Broken sets are surfaced elsewhere; decks should still open with what can be resolved.
    }
  }
  const cardsByKey = new Map(cards.map((card) => [cardKey(card.setCode, card.cardId), card]));
  return { cards: cards.sort((left, right) => left.setCode.localeCompare(right.setCode) || left.collectorNumber.localeCompare(right.collectorNumber)), cardsByKey };
}

async function discoverSetCodes(rootDir: string): Promise<string[]> {
  try {
    const entries = await readdir(join(rootDir, 'sets'), { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith('.') && !entry.name.startsWith('_')).map((entry) => entry.name.toUpperCase()).sort();
  } catch {
    return [];
  }
}

function normalizeEntries(deckId: string, entries: DeckEntry[]): DeckEntry[] {
  return entries
    .map((entry) =>
      deckEntrySchema.parse({
        deckId,
        section: DECK_SECTIONS.includes(entry.section) ? entry.section : 'main',
        count: Math.max(1, Number(entry.count) || 1),
        setCode: clean(entry.setCode).toUpperCase(),
        cardId: clean(entry.cardId),
        nameSnapshot: clean(entry.nameSnapshot) || undefined
      })
    )
    .filter((entry) => entry.setCode && entry.cardId);
}

function resolveEntries(entries: DeckEntry[], cardsByKey: Map<string, DeckCardOption>): ResolvedDeckEntry[] {
  return entries.map((entry) => {
    const card = cardsByKey.get(cardKey(entry.setCode, entry.cardId));
    return card
      ? { ...entry, card, nameSnapshot: entry.nameSnapshot ?? card.name }
      : {
          ...entry,
          warning: `Could not resolve ${entry.setCode}/${entry.cardId}; keeping the deck entry.`
        };
  });
}

function summarizeDeck(metadata: DeckMetadata, entries: DeckEntry[], cardsByKey: Map<string, DeckCardOption>): DeckSummary {
  const resolved = resolveEntries(entries, cardsByKey);
  return {
    ...metadata,
    cardCount: entries.reduce((total, entry) => total + entry.count, 0),
    mainCount: countSection(entries, 'main'),
    sideCount: countSection(entries, 'side'),
    maybeCount: countSection(entries, 'maybe'),
    unresolvedCount: resolved.filter((entry) => entry.warning).length
  };
}

function countSection(entries: DeckEntry[], section: DeckSection): number {
  return entries.filter((entry) => entry.section === section).reduce((total, entry) => total + entry.count, 0);
}

function entriesForSection(entries: ResolvedDeckEntry[], section: DeckSection): ResolvedDeckEntry[] {
  return entries.filter((entry) => entry.section === section);
}

function cardOptionFromRecord(setName: string, card: CardRecord, face?: CardFaceRecord): DeckCardOption {
  return {
    setCode: card.setCode,
    setName,
    cardId: card.cardId,
    collectorNumber: card.collectorNumber,
    name: card.name,
    typeLine: face?.typeLine ?? '',
    rarity: card.rarity,
    colors: face?.colors ?? card.colorIdentity ?? '',
    manaCost: face?.manaCost ?? '',
    colorIdentity: card.colorIdentity ?? face?.colors ?? '',
    oracleText: face?.oracleText ?? '',
    flavorText: face?.flavorText ?? '',
    power: face?.power ?? '',
    toughness: face?.toughness ?? '',
    status: card.status,
    tags: card.tags
  };
}

function rowToDeckEntry(row: CsvRow): DeckEntry {
  return {
    deckId: clean(row.deck_id),
    section: clean(row.section) as DeckSection,
    count: Number(row.count),
    setCode: clean(row.set_code),
    cardId: clean(row.card_id),
    nameSnapshot: clean(row.name_snapshot) || undefined
  };
}

function deckEntryToRow(entry: DeckEntry): CsvRow {
  return {
    deck_id: entry.deckId,
    section: entry.section,
    count: String(entry.count),
    set_code: entry.setCode,
    card_id: entry.cardId,
    name_snapshot: entry.nameSnapshot ?? ''
  };
}

async function uniqueDeckId(rootDir: string, baseId: string): Promise<string> {
  const base = baseId || 'deck';
  let candidate = base;
  let index = 2;
  while (await deckExists(rootDir, candidate)) {
    candidate = `${base}-${index}`;
    index += 1;
  }
  return candidate;
}

async function deckExists(rootDir: string, deckId: string): Promise<boolean> {
  try {
    await readFile(join(deckDir(rootDir, deckId), 'metadata.json'), 'utf8');
    return true;
  } catch {
    return false;
  }
}

function decksRoot(rootDir: string): string {
  return join(rootDir, 'decks');
}

function deckDir(rootDir: string, deckId: string): string {
  return join(decksRoot(rootDir), slugify(deckId));
}

function cardKey(setCode: string, cardId: string): string {
  return `${setCode.toUpperCase()}::${cardId}`;
}

function sectionHeading(section: DeckSection): string {
  if (section === 'side') {
    return 'Sideboard';
  }
  if (section === 'maybe') {
    return 'Maybeboard';
  }
  return 'Main';
}

function slugify(value: string): string {
  return clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'deck';
}

function clean(value: unknown): string {
  return String(value ?? '').trim();
}

function cleanTags(values: unknown): string[] {
  const raw = Array.isArray(values) ? values : String(values ?? '').split(/[,;\n]+/);
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const value of raw) {
    const tag = clean(value);
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) {
      continue;
    }
    seen.add(key);
    tags.push(tag);
  }
  return tags;
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

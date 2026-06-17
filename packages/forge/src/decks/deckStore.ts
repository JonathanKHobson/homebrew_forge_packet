import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import { parseCsvRecords, writeCsvRecords, type CsvRow } from '../data/csv.js';
import { loadForgeProject } from '../data/loadProject.js';
import type { CardFaceRecord, CardRecord, CardVariantRecord } from '../domain/schemas.js';
import { addOfficialCardToCollection } from '../collections/collectionStore.js';
import {
  collectionEntrySchema,
  collectionMetadataSchema,
  type CollectionEntry,
  type CollectionMetadata
} from '../collections/collectionModel.js';
import { findOfficialCardPrint } from '../officialCards/officialCardStore.js';
import type { AddOfficialCardToDeckRequest } from '../officialCards/officialCardModel.js';
import { applyDeckRoleInference, readDeckRoleDataset } from './deckRoles.js';
import {
  DECK_ENTRY_HEADERS,
  DECK_SECTIONS,
  deckEntrySchema,
  deckMetadataSchema,
  deckVariantSchema,
  type CreateDeckRequest,
  type DeckCardOption,
  type DeckCardReference,
  type DeckEntry,
  type DeckExportResult,
  type DeckImportMode,
  type DeckImportResult,
  type DeckImportSummary,
  type DeckMetadata,
  type DeckSection,
  type DeckState,
  type DeckSummary,
  type DeckVariant,
  type ImportDeckRequest,
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
  const activeVariant = activeVariantForMetadata(metadata);
  const entries = await readDeckEntries(rootDir, deckId, activeVariant.variantId);
  const cardCatalog = await readCardCatalog(rootDir);
  const roleDataset = await readDeckRoleDataset(rootDir);
  const resolved = resolveEntries(entries, cardCatalog.cardsByKey).map((entry) => applyDeckRoleInference(entry, roleDataset));
  return {
    metadata,
    variants: metadata.variants,
    activeVariantId: activeVariant.variantId,
    activeVariant,
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
  const defaultVariant = createDefaultDeckVariant(deckId, name, now, request);
  const metadata: DeckMetadata = deckMetadataSchema.parse({
    deckId,
    name,
    description: clean(request.description) || undefined,
    linkedUniverseId: clean(request.linkedUniverseId) || undefined,
    linkedSetCode: clean(request.linkedSetCode).toUpperCase() || undefined,
    format: clean(request.format) || undefined,
    playStyleTags: cleanTags(request.playStyleTags),
    colorIdentity: cleanColorIdentity(request.colorIdentity) || undefined,
    commander: normalizeDeckCardReference(request.commander),
    partnerCommanders: normalizeDeckCardReferences(request.partnerCommanders),
    coverCard: normalizeDeckCardReference(request.coverCard ?? request.commander),
    commanderBracket: clean(request.commanderBracket) || undefined,
    status: request.status ?? 'draft',
    activeVariantId: defaultVariant.variantId,
    variants: [defaultVariant],
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
  const variants = normalizeDeckVariants(request.metadata.deckId, request.metadata.variants, now, request.metadata);
  const activeVariantId = clean(request.metadata.activeVariantId) || variants[0]?.variantId || 'default';
  const metadata = deckMetadataSchema.parse({
    ...request.metadata,
    name: clean(request.metadata.name),
    linkedSetCode: clean(request.metadata.linkedSetCode).toUpperCase() || undefined,
    format: clean(request.metadata.format) || undefined,
    playStyleTags: cleanTags(request.metadata.playStyleTags),
    colorIdentity: cleanColorIdentity(request.metadata.colorIdentity) || undefined,
    commander: normalizeDeckCardReference(request.metadata.commander),
    partnerCommanders: normalizeDeckCardReferences(request.metadata.partnerCommanders),
    coverCard: normalizeDeckCardReference(request.metadata.coverCard),
    commanderBracket: clean(request.metadata.commanderBracket) || undefined,
    status: request.metadata.status || 'draft',
    activeVariantId: variants.some((variant) => variant.variantId === activeVariantId) ? activeVariantId : variants[0]?.variantId,
    variants,
    tags: cleanTags(request.metadata.tags),
    updatedAt: now
  });
  const entries = normalizeEntries(metadata.deckId, request.entries, metadata.activeVariantId || variants[0]?.variantId || 'default');
  await writeDeck(rootDir, { metadata, entries });
  return readDeckState(rootDir, metadata.deckId);
}

export async function addOfficialCardToDeck(rootDir: string, request: AddOfficialCardToDeckRequest): Promise<DeckState> {
  const deckId = clean(request.deckId);
  if (!deckId) {
    throw new Error('Deck id is required.');
  }
  const card = await findOfficialCardPrint(rootDir, request.cardId);
  if (!card) {
    throw new Error('Official card print was not found in the local catalog. Sync Official Cards first.');
  }
  const setCode = clean(card.setCode).toUpperCase();
  if (!setCode) {
    throw new Error('Official card print is missing a set code.');
  }

  await addOfficialCardToCollection(rootDir, {
    cardId: card.id,
    collectionId: request.collectionId ?? 'official-cards',
    collectionName: request.collectionName ?? 'Official Cards',
    linkedUniverseId: request.linkedUniverseId,
    quantity: 1,
    finish: request.finish,
    condition: request.condition,
    language: request.language,
    location: request.location
  });

  const deck = await readDeckState(rootDir, deckId);
  const section = normalizeDeckSection(request.section);
  const count = Math.max(1, Math.floor(Number(request.quantity ?? 1)) || 1);
  const entries: DeckEntry[] = deck.entries.map((entry) => stripResolvedEntry(entry));
  const activeVariantId = deck.activeVariantId;
  const existing = entries.find((entry) => entry.deckVariantId === activeVariantId && entry.section === section && entry.setCode === setCode && entry.cardId === card.id && entry.variantId === 'official-print');
  if (existing) {
    existing.count += count;
  } else {
    entries.push(
      deckEntrySchema.parse({
        deckId,
        deckVariantId: activeVariantId,
        section,
        count,
        setCode,
        cardId: card.id,
        variantId: 'official-print',
        nameSnapshot: card.name
      })
    );
  }
  return saveDeck(rootDir, { metadata: deck.metadata, entries });
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

export async function importDeck(rootDir: string, request: ImportDeckRequest): Promise<DeckImportResult> {
  const content = clean(request.content);
  if (!content) {
    throw new Error('Deck import content is empty.');
  }
  const mode: DeckImportMode = request.mode ?? 'create';
  const cardCatalog = await readCardCatalog(rootDir);
  const parsed = parseDeckImportContent(request, cardCatalog);
  const name = clean(request.name) || parsed.name || 'Imported Deck';
  const deckId = clean(request.deckId) || slugify(name);
  const importedEntries = parsed.entries.map((entry) => ({ ...entry, deckId }));
  const unresolvedCount = importedEntries.filter((entry) => !cardCatalog.cardsByKey.has(cardKey(entry.setCode, entry.cardId))).length;
  const summary: DeckImportSummary = {
    deckId,
    name,
    sourceFormat: request.sourceFormat,
    mode,
    dryRun: Boolean(request.dryRun),
    importedEntries: importedEntries.length,
    mainCount: countSection(importedEntries, 'main'),
    sideCount: countSection(importedEntries, 'side'),
    maybeCount: countSection(importedEntries, 'maybe'),
    unresolvedCount,
    warnings: [...parsed.warnings]
  };
  if (unresolvedCount) {
    summary.warnings.push(`${unresolvedCount} imported deck entries could not be matched to authored cards and were preserved as unresolved rows.`);
  }
  if (request.dryRun) {
    return { summary };
  }

  const now = new Date().toISOString();
  const existing = mode === 'create' ? undefined : await readExistingDeckState(rootDir, deckId);
  const metadata = deckMetadataSchema.parse({
    deckId: existing?.metadata.deckId ?? (await uniqueDeckId(rootDir, deckId)),
    name: clean(request.name) || parsed.name || existing?.metadata.name || 'Imported Deck',
    description: clean(request.description) || existing?.metadata.description || undefined,
    linkedUniverseId: clean(request.linkedUniverseId) || existing?.metadata.linkedUniverseId || undefined,
    linkedSetCode: clean(request.linkedSetCode).toUpperCase() || existing?.metadata.linkedSetCode || undefined,
    format: clean(request.format) || existing?.metadata.format || undefined,
    playStyleTags: cleanTags(request.playStyleTags?.length ? request.playStyleTags : existing?.metadata.playStyleTags ?? []),
    colorIdentity: cleanColorIdentity(request.colorIdentity) || existing?.metadata.colorIdentity || undefined,
    commander: normalizeDeckCardReference(request.commander ?? existing?.metadata.commander),
    partnerCommanders: normalizeDeckCardReferences(request.partnerCommanders?.length ? request.partnerCommanders : existing?.metadata.partnerCommanders ?? []),
    coverCard: normalizeDeckCardReference(request.coverCard ?? existing?.metadata.coverCard ?? request.commander ?? existing?.metadata.commander),
    commanderBracket: clean(request.commanderBracket) || existing?.metadata.commanderBracket || undefined,
    status: request.status ?? existing?.metadata.status ?? 'draft',
    tags: cleanTags(request.tags?.length ? request.tags : existing?.metadata.tags ?? []),
    notes: clean(request.notes) || existing?.metadata.notes || undefined,
    createdAt: existing?.metadata.createdAt ?? now,
    updatedAt: now
  });
  const entries = mode === 'append' && existing ? [...existing.entries, ...importedEntries] : importedEntries;
  const deck = await saveDeck(rootDir, { metadata, entries });
  return { summary: { ...summary, deckId: deck.metadata.deckId, name: deck.metadata.name }, deck };
}

interface ParsedDeckImport {
  name?: string;
  entries: DeckEntry[];
  warnings: string[];
}

function parseDeckImportContent(request: ImportDeckRequest, cardCatalog: { cards: DeckCardOption[]; cardsByKey: Map<string, DeckCardOption> }): ParsedDeckImport {
  if (request.sourceFormat === 'csv') {
    return parseDeckCsvImport(request.content, cardCatalog, request.linkedSetCode);
  }
  if (request.sourceFormat === 'cockatrice') {
    return parseCockatriceDeckImport(request.content, cardCatalog, request.linkedSetCode);
  }
  return parseTextDeckImport(request.content, cardCatalog, request.linkedSetCode);
}

function parseDeckCsvImport(content: string, cardCatalog: { cards: DeckCardOption[]; cardsByKey: Map<string, DeckCardOption> }, preferredSetCode?: string): ParsedDeckImport {
  const entries: DeckEntry[] = [];
  const warnings: string[] = [];
  for (const [index, row] of parseCsvRecords(content).entries()) {
    const count = Math.max(1, Number(row.count || row.qty || row.quantity) || 1);
    const section = normalizeDeckSection(row.section || row.zone || row.board);
    const name = clean(row.name_snapshot || row.name || row.card_name);
    const explicitSetCode = clean(row.set_code || row.set || row.edition || preferredSetCode).toUpperCase();
    const explicitCardId = clean(row.card_id);
    const explicitVariantId = clean(row.variant_id) || undefined;
    const resolved = explicitCardId
      ? { setCode: explicitSetCode || 'UNRESOLVED', cardId: explicitCardId, variantId: explicitVariantId, nameSnapshot: name || explicitCardId, resolved: true }
      : resolveDeckCardReference(name, cardCatalog, explicitSetCode, explicitVariantId);
    if (!resolved.resolved) {
      warnings.push(`CSV row ${index + 2}: could not match "${name || explicitCardId}" to an authored card.`);
    }
    entries.push({
      deckId: clean(row.deck_id) || 'imported-deck',
      entryId: clean(row.entry_id) || undefined,
      deckVariantId: clean(row.deck_variant_id) || undefined,
      section,
      count,
      setCode: resolved.setCode,
      cardId: resolved.cardId,
      variantId: resolved.variantId,
      nameSnapshot: resolved.nameSnapshot,
      candidateStatus: normalizeCandidateStatus(row.candidate_status),
      roles: cleanTags(row.roles),
      roleSource: normalizeRoleSource(row.role_source),
      roleConfidence: normalizedConfidence(row.role_confidence),
      impactRating: normalizedRating(row.impact_rating),
      synergyRating: normalizedRating(row.synergy_rating),
      qualityRating: normalizedRating(row.quality_rating),
      entryTags: cleanTags(row.entry_tags),
      entryNotes: clean(row.entry_notes) || undefined,
      flags: cleanTags(row.flags),
      starred: isTruthyCell(row.starred),
      markedForDeletion: isTruthyCell(row.marked_for_deletion)
    });
  }
  return { entries, warnings };
}

function parseCockatriceDeckImport(content: string, cardCatalog: { cards: DeckCardOption[]; cardsByKey: Map<string, DeckCardOption> }, preferredSetCode?: string): ParsedDeckImport {
  const parsed = new XMLParser({ ignoreAttributes: false }).parse(content);
  const deckNode = parsed?.cockatrice_deck ?? parsed?.deck ?? {};
  const name = clean(deckNode.deckname || deckNode.name);
  const zones = asArray(deckNode.zone);
  const entries: DeckEntry[] = [];
  const warnings: string[] = [];
  for (const zone of zones) {
    const section = normalizeDeckSection(zone?.['@_name'] || zone?.name);
    for (const card of asArray(zone?.card)) {
      const count = Math.max(1, Number(card?.['@_number'] || card?.number || card?.count) || 1);
      const cardName = clean(card?.['@_name'] || card?.name);
      if (!cardName) {
        continue;
      }
      const resolved = resolveDeckCardReference(cardName, cardCatalog, preferredSetCode);
      if (!resolved.resolved) {
        warnings.push(`Could not match "${cardName}" to an authored card.`);
      }
      entries.push({
        deckId: 'imported-deck',
        section,
        count,
        setCode: resolved.setCode,
        cardId: resolved.cardId,
        variantId: resolved.variantId,
        nameSnapshot: resolved.nameSnapshot
      });
    }
  }
  return { name, entries, warnings };
}

function parseTextDeckImport(content: string, cardCatalog: { cards: DeckCardOption[]; cardsByKey: Map<string, DeckCardOption> }, preferredSetCode?: string): ParsedDeckImport {
  const entries: DeckEntry[] = [];
  const warnings: string[] = [];
  let name = '';
  let currentSection: DeckSection = 'main';

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }
    const markdownHeading = line.match(/^#{1,6}\s+(.+)$/);
    if (markdownHeading) {
      const heading = clean(markdownHeading[1]);
      const section = maybeDeckSection(heading);
      if (section) {
        currentSection = section;
      } else if (!name) {
        name = heading;
      }
      continue;
    }
    const section = maybeDeckSection(line.replace(/:$/, ''));
    if (section) {
      currentSection = section;
      continue;
    }
    if (/^\/\//.test(line) || (/^#/.test(line) && !markdownHeading)) {
      continue;
    }
    const sideboardPrefixed = line.match(/^(?:sb|sideboard)\s*[:\-]\s*(.+)$/i);
    const cardLine = sideboardPrefixed?.[1] ?? line;
    const match = cardLine.match(/^(\d+)\s*x?\s+(.+)$/i);
    if (!match) {
      if (!name && entries.length === 0) {
        name = line;
      }
      continue;
    }
    const count = Math.max(1, Number(match[1]) || 1);
    const rawName = clean(match[2]);
    const sectionForLine = sideboardPrefixed ? 'side' : currentSection;
    const resolved = resolveDeckCardReference(rawName, cardCatalog, preferredSetCode);
    if (!resolved.resolved) {
      warnings.push(`Could not match "${rawName}" to an authored card.`);
    }
    entries.push({
      deckId: 'imported-deck',
      section: sectionForLine,
      count,
      setCode: resolved.setCode,
      cardId: resolved.cardId,
      variantId: resolved.variantId,
      nameSnapshot: resolved.nameSnapshot
    });
  }

  return { name, entries, warnings };
}

interface ResolvedDeckReference {
  setCode: string;
  cardId: string;
  variantId?: string;
  nameSnapshot: string;
  resolved: boolean;
}

function resolveDeckCardReference(
  rawName: string,
  cardCatalog: { cards: DeckCardOption[]; cardsByKey: Map<string, DeckCardOption> },
  preferredSetCode?: string,
  explicitVariantId?: string
): ResolvedDeckReference {
  const parsed = parseDeckNameReference(rawName);
  const preferred = clean(preferredSetCode || parsed.setCode).toUpperCase();
  const normalizedName = normalizeDeckName(parsed.name);
  const matches = cardCatalog.cards
    .flatMap((card) => {
      const variantMatches = card.variants.map((variant) => ({
        card,
        variantId: variant.variantId,
        displayName: `${card.name} (${variant.displayName})`
      }));
      return [{ card, variantId: undefined, displayName: card.name }, ...variantMatches];
    })
    .filter((candidate) => (!preferred || candidate.card.setCode === preferred) && normalizeDeckName(candidate.displayName) === normalizedName);
  const match = matches[0];
  if (match) {
    const variantId = explicitVariantId || match.variantId;
    return {
      setCode: match.card.setCode,
      cardId: match.card.cardId,
      variantId,
      nameSnapshot: match.card.name,
      resolved: true
    };
  }
  return {
    setCode: preferred || 'UNRESOLVED',
    cardId: slugify(parsed.name),
    variantId: explicitVariantId,
    nameSnapshot: parsed.name,
    resolved: false
  };
}

function parseDeckNameReference(value: string): { name: string; setCode?: string } {
  const bracketed = value.match(/^(.*)\s+\[([A-Za-z0-9]{2,8})\]$/);
  if (bracketed) {
    return { name: clean(bracketed[1]), setCode: clean(bracketed[2]).toUpperCase() };
  }
  const parentheticalSet = value.match(/^(.*)\s+\(([A-Z0-9]{2,8})\)$/);
  if (parentheticalSet) {
    return { name: clean(parentheticalSet[1]), setCode: clean(parentheticalSet[2]).toUpperCase() };
  }
  return { name: clean(value) };
}

function normalizeDeckName(value: string): string {
  return clean(value).toLowerCase().replace(/\s+/g, ' ');
}

function normalizeDeckSection(value: unknown): DeckSection {
  return maybeDeckSection(clean(value)) ?? 'main';
}

function maybeDeckSection(value: string): DeckSection | undefined {
  const normalized = clean(value).toLowerCase().replace(/[^a-z]/g, '');
  if (['main', 'mainboard', 'maindeck'].includes(normalized)) {
    return 'main';
  }
  if (['side', 'sideboard'].includes(normalized)) {
    return 'side';
  }
  if (['maybe', 'maybeboard', 'considering'].includes(normalized)) {
    return 'maybe';
  }
  return undefined;
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

export function buildPlainTextDeck(deck: DeckState): string {
  const lines = [`# ${deck.metadata.name}`];
  if (deck.metadata.description) {
    lines.push(`# ${deck.metadata.description}`);
  }
  lines.push('');

  for (const section of DECK_SECTIONS) {
    const entries = entriesForSection(deck.entries, section, deck.activeVariantId);
    if (entries.length === 0) {
      continue;
    }
    lines.push(sectionHeading(section));
    for (const entry of entries) {
      lines.push(`${entry.count} ${entryDisplayName(entry)}`);
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
  const mainCards = entriesForSection(deck.entries, 'main', deck.activeVariantId);
  const sideCards = entriesForSection(deck.entries, 'side', deck.activeVariantId);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<cockatrice_deck version="1">',
    `  <deckname>${escapeXml(deck.metadata.name)}</deckname>`,
    '  <comments></comments>',
    '  <zone name="main">',
    ...mainCards.map((entry) => `    <card number="${entry.count}" name="${escapeXml(entryDisplayName(entry))}"/>`),
    '  </zone>',
    '  <zone name="side">',
    ...sideCards.map((entry) => `    <card number="${entry.count}" name="${escapeXml(entryDisplayName(entry))}"/>`),
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
      const metadata = await readDeckMetadata(rootDir, entry.name);
      decks.push({
        metadata,
        entries: await readDeckEntries(rootDir, entry.name, activeVariantForMetadata(metadata).variantId)
      });
    } catch {
      // Ignore incomplete deck folders so one bad draft does not break the workspace.
    }
  }
  return decks;
}

async function readDeckMetadata(rootDir: string, deckId: string): Promise<DeckMetadata> {
  const content = await readFile(join(deckDir(rootDir, deckId), 'metadata.json'), 'utf8');
  return normalizeDeckMetadata(JSON.parse(content));
}

async function readDeckEntries(rootDir: string, deckId: string, defaultVariantId = 'default'): Promise<DeckEntry[]> {
  try {
    const rows = parseCsvRecords(await readFile(join(deckDir(rootDir, deckId), 'entries.csv'), 'utf8'));
    return normalizeEntries(deckId, rows.map(rowToDeckEntry), defaultVariantId);
  } catch {
    return [];
  }
}

async function readExistingDeckState(rootDir: string, deckId: string): Promise<DeckState | undefined> {
  try {
    return await readDeckState(rootDir, deckId);
  } catch {
    return undefined;
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
        cards.push(
          cardOptionFromRecord(
            project.set.setName,
            card,
            facesByCardId.get(card.cardId)?.sort((left, right) => left.faceIndex - right.faceIndex)[0],
            project.variants.filter((variant) => variant.cardId === card.cardId)
          )
        );
      }
    } catch {
      // Broken sets are surfaced elsewhere; decks should still open with what can be resolved.
    }
  }
  const collectionCards = await readCollectionCardOptions(rootDir);
  const cardsByKey = new Map<string, DeckCardOption>();
  for (const card of cards) {
    cardsByKey.set(cardKey(card.setCode, card.cardId), card);
  }
  for (const card of collectionCards) {
    const key = cardKey(card.setCode, card.cardId);
    if (!cardsByKey.has(key)) {
      cardsByKey.set(key, card);
      cards.push(card);
    }
  }
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

async function readCollectionCardOptions(rootDir: string): Promise<DeckCardOption[]> {
  const root = join(rootDir, 'collections');
  const cardsByKey = new Map<string, DeckCardOption>();
  let collectionDirs;
  try {
    collectionDirs = await readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }
  for (const collectionDir of collectionDirs) {
    if (!collectionDir.isDirectory() || collectionDir.name.startsWith('.')) {
      continue;
    }
    try {
      const metadata = collectionMetadataSchema.parse(JSON.parse(await readFile(join(root, collectionDir.name, 'metadata.json'), 'utf8')));
      const rows = parseCsvRecords(await readFile(join(root, collectionDir.name, 'entries.csv'), 'utf8'));
      for (const row of rows) {
        const entry = collectionRowToEntry(row);
        const card = cardOptionFromCollectionEntry(entry, metadata);
        if (!card) {
          continue;
        }
        const key = cardKey(card.setCode, card.cardId);
        if (!cardsByKey.has(key)) {
          cardsByKey.set(key, card);
        }
      }
    } catch {
      // Collection display errors should not make the deck workspace unusable.
    }
  }
  return [...cardsByKey.values()];
}

function collectionRowToEntry(row: CsvRow): CollectionEntry {
  return collectionEntrySchema.parse({
    collectionId: clean(row.collection_id),
    entryId: clean(row.entry_id),
    quantity: Math.max(1, Number(row.quantity) || 1),
    ownershipStatus: clean(row.ownership_status) || undefined,
    ownerName: clean(row.owner_name) || undefined,
    cardName: clean(row.card_name),
    setCode: clean(row.set_code) || undefined,
    setName: clean(row.set_name) || undefined,
    collectorNumber: clean(row.collector_number) || undefined,
    scryfallId: clean(row.scryfall_id) || undefined,
    finish: clean(row.finish) || undefined,
    condition: clean(row.condition) || undefined,
    language: clean(row.language) || undefined,
    location: clean(row.location) || undefined,
    source: clean(row.source) || 'generic',
    sourceRow: clean(row.source_row) || undefined,
    matchKey: clean(row.match_key) || undefined,
    matchStrategy: clean(row.match_strategy) || 'unresolved',
    reviewStatus: clean(row.review_status) || 'needs_review',
    reviewNotes: clean(row.review_notes) || undefined,
    linkedSetCode: clean(row.linked_set_code) || undefined,
    linkedCardId: clean(row.linked_card_id) || undefined,
    linkedVariantId: clean(row.linked_variant_id) || undefined,
    previewArtSource: clean(row.preview_art_source) || 'auto',
    purchasePrice: row.purchase_price === undefined || row.purchase_price === '' ? undefined : Number(row.purchase_price),
    purchaseCurrency: clean(row.purchase_currency) || undefined,
    purchaseDate: clean(row.purchase_date) || undefined,
    estimatedMarketPrice: row.estimated_market_price === undefined || row.estimated_market_price === '' ? undefined : Number(row.estimated_market_price),
    estimatedMarketCurrency: clean(row.estimated_market_currency) || undefined,
    marketPriceSource: clean(row.market_price_source) || undefined,
    marketPriceUpdatedAt: clean(row.market_price_updated_at) || undefined,
    tags: cleanTags(row.tags),
    notes: clean(row.notes) || undefined,
    starred: isTruthyCell(row.starred),
    flagged: isTruthyCell(row.flagged),
    altered: isTruthyCell(row.altered),
    misprint: isTruthyCell(row.misprint),
    proxy: isTruthyCell(row.proxy),
    homebrew: isTruthyCell(row.homebrew),
    markedForDeletion: isTruthyCell(row.marked_for_deletion)
  });
}

function normalizeDeckMetadata(value: unknown): DeckMetadata {
  const raw = value && typeof value === 'object' ? (value as Partial<DeckMetadata>) : {};
  const deckId = clean(raw.deckId);
  const now = clean(raw.updatedAt) || clean(raw.createdAt) || new Date().toISOString();
  const variants = normalizeDeckVariants(deckId, raw.variants, now, raw);
  const activeVariantId = clean(raw.activeVariantId) || variants[0]?.variantId || 'default';
  return deckMetadataSchema.parse({
    ...raw,
    deckId,
    name: clean(raw.name) || deckId || 'Untitled Deck',
    linkedSetCode: clean(raw.linkedSetCode).toUpperCase() || undefined,
    format: clean(raw.format) || undefined,
    playStyleTags: cleanTags(raw.playStyleTags),
    colorIdentity: cleanColorIdentity(raw.colorIdentity) || undefined,
    commander: normalizeDeckCardReference(raw.commander),
    partnerCommanders: normalizeDeckCardReferences(raw.partnerCommanders),
    coverCard: normalizeDeckCardReference(raw.coverCard ?? raw.commander),
    commanderBracket: clean(raw.commanderBracket) || undefined,
    status: raw.status || 'draft',
    activeVariantId: variants.some((variant) => variant.variantId === activeVariantId) ? activeVariantId : variants[0]?.variantId,
    variants,
    tags: cleanTags(raw.tags),
    notes: clean(raw.notes) || undefined
  });
}

function normalizeDeckVariants(deckId: string, values: unknown, now: string, metadataFallback: Partial<DeckMetadata>): DeckVariant[] {
  const rawVariants = Array.isArray(values) ? values : [];
  const variants = rawVariants
    .flatMap((value, index) => {
      if (!value || typeof value !== 'object') {
        return [];
      }
      const raw = value as Partial<DeckVariant>;
      const variantId = clean(raw.variantId) || (index === 0 ? 'default' : slugify(raw.name || `variant-${index + 1}`));
      const variant = {
        deckId,
        variantId,
        name: clean(raw.name) || (index === 0 ? 'Default Build' : `Variant ${index + 1}`),
        description: clean(raw.description) || undefined,
        status: raw.status || 'draft',
        colorIdentity: cleanColorIdentity(raw.colorIdentity) || undefined,
        commander: normalizeDeckCardReference(raw.commander),
        partnerCommanders: normalizeDeckCardReferences(raw.partnerCommanders),
        tags: cleanTags(raw.tags),
        notes: clean(raw.notes) || undefined,
        createdAt: clean(raw.createdAt) || now,
        updatedAt: now
      };
      return deckVariantSchemaSafe(variant);
    });
  if (variants.length) {
    return uniqueVariants(variants);
  }
  return [
    createDefaultDeckVariant(deckId, clean(metadataFallback.name) || 'Default Build', now, {
      format: metadataFallback.format,
      colorIdentity: metadataFallback.colorIdentity,
      commander: metadataFallback.commander,
      partnerCommanders: metadataFallback.partnerCommanders,
      tags: metadataFallback.tags,
      notes: metadataFallback.notes
    })
  ];
}

function deckVariantSchemaSafe(variant: unknown): DeckVariant[] {
  try {
    return [deckVariantSchema.parse(variant)];
  } catch {
    return [];
  }
}

function createDefaultDeckVariant(deckId: string, deckName: string, now: string, source: Partial<CreateDeckRequest & DeckMetadata>): DeckVariant {
  return {
    deckId,
    variantId: 'default',
    name: 'Default Build',
    description: deckName ? `${deckName} starting build` : undefined,
    status: 'draft',
    colorIdentity: cleanColorIdentity(source.colorIdentity) || undefined,
    commander: normalizeDeckCardReference(source.commander),
    partnerCommanders: normalizeDeckCardReferences(source.partnerCommanders),
    tags: cleanTags(source.tags),
    notes: clean(source.notes) || undefined,
    createdAt: now,
    updatedAt: now
  };
}

function uniqueVariants(variants: DeckVariant[]): DeckVariant[] {
  const seen = new Set<string>();
  const unique: DeckVariant[] = [];
  for (const variant of variants) {
    if (seen.has(variant.variantId)) {
      continue;
    }
    seen.add(variant.variantId);
    unique.push(variant);
  }
  return unique;
}

function activeVariantForMetadata(metadata: DeckMetadata): DeckVariant {
  return metadata.variants.find((variant) => variant.variantId === metadata.activeVariantId) ?? metadata.variants[0] ?? createDefaultDeckVariant(metadata.deckId, metadata.name, new Date().toISOString(), metadata);
}

function normalizeEntries(deckId: string, entries: Array<Partial<DeckEntry>>, defaultVariantId = 'default'): DeckEntry[] {
  return entries
    .map((entry, index) =>
      deckEntrySchema.parse({
        deckId,
        entryId: clean(entry.entryId) || stableDeckEntryId(entry, index),
        deckVariantId: clean(entry.deckVariantId) || defaultVariantId,
        section: normalizeDeckSection(entry.section),
        count: Math.max(1, Number(entry.count) || 1),
        setCode: clean(entry.setCode).toUpperCase(),
        cardId: clean(entry.cardId),
        variantId: clean(entry.variantId) || undefined,
        nameSnapshot: clean(entry.nameSnapshot) || undefined,
        candidateStatus: normalizeCandidateStatus(entry.candidateStatus),
        roles: cleanTags(entry.roles),
        roleSource: normalizeRoleSource(entry.roleSource),
        roleConfidence: normalizedConfidence(entry.roleConfidence),
        impactRating: normalizedRating(entry.impactRating),
        synergyRating: normalizedRating(entry.synergyRating),
        qualityRating: normalizedRating(entry.qualityRating),
        entryTags: cleanTags(entry.entryTags),
        entryNotes: clean(entry.entryNotes) || undefined,
        flags: cleanTags(entry.flags),
        starred: Boolean(entry.starred),
        markedForDeletion: Boolean(entry.markedForDeletion)
      })
    )
    .filter((entry) => entry.setCode && entry.cardId);
}

function stableDeckEntryId(entry: Partial<DeckEntry>, index: number): string {
  return slugify([entry.deckVariantId, entry.section, entry.setCode, entry.cardId, entry.variantId, index + 1].filter(Boolean).join('-')) || `entry-${index + 1}`;
}

function normalizeCandidateStatus(value: unknown): DeckEntry['candidateStatus'] {
  const normalized = clean(value).toLowerCase().replace(/[\s_-]+/g, '_');
  if (normalized === 'candidate' || normalized === 'testing' || normalized === 'locked' || normalized === 'cut') {
    return normalized;
  }
  return 'active';
}

function normalizeRoleSource(value: unknown): DeckEntry['roleSource'] {
  const normalized = clean(value).toLowerCase().replace(/[\s-]+/g, '_');
  if (normalized === 'manual' || normalized === 'heuristic' || normalized === 'external_dataset') {
    return normalized;
  }
  return 'none';
}

function normalizedConfidence(value: unknown): number | undefined {
  if (value === undefined || value === null || clean(value) === '') {
    return undefined;
  }
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return undefined;
  }
  return Math.max(0, Math.min(1, number));
}

function normalizedRating(value: unknown): number | undefined {
  if (value === undefined || value === null || clean(value) === '') {
    return undefined;
  }
  const number = Math.round(Number(value));
  if (!Number.isFinite(number)) {
    return undefined;
  }
  return Math.max(0, Math.min(5, number));
}

function resolveEntries(entries: DeckEntry[], cardsByKey: Map<string, DeckCardOption>): ResolvedDeckEntry[] {
  return entries.map((entry) => {
    const card = cardsByKey.get(cardKey(entry.setCode, entry.cardId));
    const selectedVariant = entry.variantId ? card?.variants.find((variant) => variant.variantId === entry.variantId) : undefined;
    const fallbackVariant = card?.variants.find((variant) => variant.isPrimary);
    const warning = entry.variantId && !selectedVariant ? `Variant ${entry.variantId} was not found; using primary variant.` : undefined;
    return card
      ? { ...entry, variantId: selectedVariant?.variantId ?? fallbackVariant?.variantId, card, nameSnapshot: entry.nameSnapshot ?? card.name, warning }
      : {
          ...entry,
          warning: `Could not resolve ${entry.nameSnapshot ? `${entry.nameSnapshot} ` : ''}(${entry.setCode}/${entry.cardId}); keeping the deck entry.`
        };
  });
}

function summarizeDeck(metadata: DeckMetadata, entries: DeckEntry[], cardsByKey: Map<string, DeckCardOption>): DeckSummary {
  const resolved = resolveEntries(entries, cardsByKey);
  const activeVariant = activeVariantForMetadata(metadata);
  const activeEntries = entries.filter((entry) => entry.deckVariantId === activeVariant.variantId && isExportableDeckEntry(entry));
  const coverReference = metadata.coverCard ?? metadata.commander;
  const coverCard = coverReference ? cardsByKey.get(cardKey(coverReference.setCode, coverReference.cardId)) : undefined;
  return {
    ...metadata,
    cardCount: activeEntries.reduce((total, entry) => total + entry.count, 0),
    mainCount: countSection(activeEntries, 'main'),
    sideCount: countSection(activeEntries, 'side'),
    maybeCount: countSection(activeEntries, 'maybe'),
    variantCount: metadata.variants.length,
    activeVariantId: activeVariant.variantId,
    activeVariantName: activeVariant.name,
    candidateCount: entries.filter((entry) => entry.candidateStatus === 'candidate' || entry.candidateStatus === 'testing').reduce((total, entry) => total + entry.count, 0),
    cutCount: entries.filter((entry) => entry.candidateStatus === 'cut' || entry.markedForDeletion).reduce((total, entry) => total + entry.count, 0),
    unresolvedCount: resolved.filter((entry) => entry.warning).length,
    coverImageUrl: coverCardImageUrl(coverCard)
  };
}

function countSection(entries: DeckEntry[], section: DeckSection): number {
  return entries.filter((entry) => entry.section === section).reduce((total, entry) => total + entry.count, 0);
}

function entriesForSection(entries: ResolvedDeckEntry[], section: DeckSection, activeVariantId: string): ResolvedDeckEntry[] {
  return entries.filter((entry) => entry.deckVariantId === activeVariantId && entry.section === section && isExportableDeckEntry(entry));
}

function isExportableDeckEntry(entry: Pick<DeckEntry, 'candidateStatus' | 'markedForDeletion'>): boolean {
  return !entry.markedForDeletion && entry.candidateStatus !== 'candidate' && entry.candidateStatus !== 'cut';
}

function stripResolvedEntry(entry: ResolvedDeckEntry): DeckEntry {
  return {
    deckId: entry.deckId,
    entryId: entry.entryId,
    deckVariantId: entry.deckVariantId,
    section: entry.section,
    count: entry.count,
    setCode: entry.setCode,
    cardId: entry.cardId,
    variantId: entry.variantId,
    nameSnapshot: entry.nameSnapshot ?? entry.card?.name,
    candidateStatus: entry.candidateStatus ?? 'active',
    roles: entry.roles ?? [],
    roleSource: entry.roleSource ?? 'none',
    roleConfidence: entry.roleConfidence,
    impactRating: entry.impactRating,
    synergyRating: entry.synergyRating,
    qualityRating: entry.qualityRating,
    entryTags: entry.entryTags ?? [],
    entryNotes: entry.entryNotes,
    flags: entry.flags ?? [],
    starred: Boolean(entry.starred),
    markedForDeletion: Boolean(entry.markedForDeletion)
  };
}

function entryDisplayName(entry: ResolvedDeckEntry): string {
  const cardName = entry.card?.name ?? entry.nameSnapshot ?? entry.cardId;
  const variant = entry.variantId ? entry.card?.variants.find((candidate) => candidate.variantId === entry.variantId) : undefined;
  if (!variant || variant.isPrimary) {
    return cardName;
  }
  return `${cardName} (${variant.displayName})`;
}

function cardOptionFromRecord(setName: string, card: CardRecord, face: CardFaceRecord | undefined, variants: CardVariantRecord[]): DeckCardOption {
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
    tags: card.tags,
    source: 'authored',
    variants: variants.map((variant) => ({
      variantId: variant.variantId,
      displayName: variant.displayName,
      kind: variant.kind,
      status: variant.status,
      isPrimary: variant.isPrimary
    }))
  };
}

function cardOptionFromCollectionEntry(entry: CollectionEntry, metadata: CollectionMetadata): DeckCardOption | undefined {
  const source = officialSourceFromCollectionEntry(entry);
  const firstFace = firstCardFace(source);
  const setCode = clean(entry.setCode).toUpperCase();
  const cardId = clean(entry.scryfallId || entry.linkedCardId || entry.entryId);
  if (!setCode || !cardId || !entry.cardName) {
    return undefined;
  }
  return {
    setCode,
    setName: entry.setName ?? setCode,
    cardId,
    collectorNumber: entry.collectorNumber ?? '',
    name: textValue(source?.name) || entry.cardName,
    typeLine: textValue(source?.type_line) || textValue(source?.typeLine) || textValue(firstFace?.type_line) || textValue(firstFace?.typeLine) || '',
    rarity: normalizeRarity(textValue(source?.rarity)),
    colors: colorsValue(source?.colors) || colorsValue(firstFace?.colors) || '',
    manaCost: textValue(source?.mana_cost) || textValue(source?.manaCost) || textValue(firstFace?.mana_cost) || textValue(firstFace?.manaCost) || '',
    manaValue: numberValue(source?.mana_value) ?? numberValue(source?.manaValue) ?? numberValue(source?.cmc) ?? numberValue(firstFace?.mana_value) ?? numberValue(firstFace?.manaValue) ?? numberValue(firstFace?.cmc),
    colorIdentity: colorsValue(source?.color_identity) || colorsValue(source?.colorIdentity) || colorsValue(firstFace?.color_identity) || colorsValue(firstFace?.colorIdentity) || '',
    oracleText: textValue(source?.oracle_text) || textValue(source?.oracleText) || faceText(source, 'oracle_text', 'oracleText') || '',
    flavorText: textValue(source?.flavor_text) || textValue(source?.flavorText) || faceText(source, 'flavor_text', 'flavorText') || '',
    power: textValue(source?.power) || textValue(firstFace?.power) || '',
    toughness: textValue(source?.toughness) || textValue(firstFace?.toughness) || '',
    status: 'final',
    tags: [
      'collection',
      entry.collectionId,
      metadata.kind,
      metadata.kind === 'list' ? metadata.listCategory : '',
      entry.ownershipStatus === 'owned' ? '' : entry.ownershipStatus,
      ...entry.tags
    ].filter(Boolean),
    source: 'collection',
    sourceUri: textValue(source?.scryfall_uri) || textValue(source?.scryfallUri),
    collectionId: entry.collectionId,
    collectionKind: metadata.kind,
    collectionListCategory: metadata.listCategory,
    ownershipStatus: entry.ownershipStatus,
    ownerName: entry.ownerName,
    imageUris: imageUrisFrom(source) ?? imageUrisFrom(firstFace),
    variants: [
      {
        variantId: 'official-print',
        displayName: 'Official print',
        kind: 'print_alternate',
        status: 'final',
        isPrimary: true
      }
    ]
  };
}

function officialSourceFromCollectionEntry(entry: CollectionEntry): Record<string, unknown> | undefined {
  if (!entry.sourceRow) {
    return undefined;
  }
  try {
    const parsed = objectValue(JSON.parse(entry.sourceRow));
    return objectValue(parsed?.enrichment) ?? objectValue(parsed?.scryfall) ?? parsed;
  } catch {
    try {
      const parsed = objectValue(JSON.parse(entry.sourceRow.replace(/\r?\n/g, '\\n')));
      return objectValue(parsed?.enrichment) ?? objectValue(parsed?.scryfall) ?? parsed;
    } catch {
      return undefined;
    }
  }
}

function firstCardFace(value: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  const faces = value?.card_faces ?? value?.cardFaces;
  return Array.isArray(faces) ? objectValue(faces[0]) : undefined;
}

function faceText(value: Record<string, unknown> | undefined, snakeKey: 'oracle_text' | 'flavor_text', camelKey: 'oracleText' | 'flavorText'): string | undefined {
  const faces = value?.card_faces ?? value?.cardFaces;
  if (!Array.isArray(faces)) {
    return undefined;
  }
  const parts = faces
    .map((face) => {
      const faceObject = objectValue(face);
      const text = textValue(faceObject?.[snakeKey]) || textValue(faceObject?.[camelKey]);
      if (!text) {
        return '';
      }
      const name = textValue(faceObject?.name);
      return name ? `${name}: ${text}` : text;
    })
    .filter(Boolean);
  return parts.length ? parts.join('\n\n') : undefined;
}

function imageUrisFrom(value: Record<string, unknown> | undefined): DeckCardOption['imageUris'] | undefined {
  const raw = objectValue(value?.image_uris) ?? objectValue(value?.imageUris);
  if (!raw) {
    return undefined;
  }
  const imageUris = {
    small: textValue(raw.small),
    normal: textValue(raw.normal),
    large: textValue(raw.large),
    png: textValue(raw.png),
    artCrop: textValue(raw.art_crop) || textValue(raw.artCrop),
    borderCrop: textValue(raw.border_crop) || textValue(raw.borderCrop)
  };
  return Object.values(imageUris).some(Boolean) ? imageUris : undefined;
}

function coverCardImageUrl(card: DeckCardOption | undefined): string | undefined {
  return card?.imageUris?.normal ?? card?.imageUris?.large ?? card?.imageUris?.png ?? card?.imageUris?.small;
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function textValue(value: unknown): string | undefined {
  const text = clean(value);
  return text || undefined;
}

function numberValue(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function colorsValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    const colors = value.map((item) => clean(item)).filter(Boolean).join('');
    return colors || undefined;
  }
  return textValue(value);
}

function normalizeRarity(value: string | undefined): CardRecord['rarity'] {
  const rarity = clean(value).toLowerCase();
  if (rarity === 'common' || rarity === 'uncommon' || rarity === 'rare' || rarity === 'mythic' || rarity === 'special' || rarity === 'bonus' || rarity === 'token') {
    return rarity;
  }
  return 'special';
}

function rowToDeckEntry(row: CsvRow): Partial<DeckEntry> {
  return {
    deckId: clean(row.deck_id),
    entryId: clean(row.entry_id) || undefined,
    deckVariantId: clean(row.deck_variant_id) || undefined,
    section: clean(row.section) as DeckSection,
    count: Number(row.count),
    setCode: clean(row.set_code),
    cardId: clean(row.card_id),
    variantId: clean(row.variant_id) || undefined,
    nameSnapshot: clean(row.name_snapshot) || undefined,
    candidateStatus: clean(row.candidate_status) as DeckEntry['candidateStatus'],
    roles: cleanTags(row.roles),
    roleSource: clean(row.role_source) as DeckEntry['roleSource'],
    roleConfidence: row.role_confidence === undefined || row.role_confidence === '' ? undefined : Number(row.role_confidence),
    impactRating: row.impact_rating === undefined || row.impact_rating === '' ? undefined : Number(row.impact_rating),
    synergyRating: row.synergy_rating === undefined || row.synergy_rating === '' ? undefined : Number(row.synergy_rating),
    qualityRating: row.quality_rating === undefined || row.quality_rating === '' ? undefined : Number(row.quality_rating),
    entryTags: cleanTags(row.entry_tags),
    entryNotes: clean(row.entry_notes) || undefined,
    flags: cleanTags(row.flags),
    starred: isTruthyCell(row.starred),
    markedForDeletion: isTruthyCell(row.marked_for_deletion)
  };
}

function deckEntryToRow(entry: DeckEntry): CsvRow {
  return {
    deck_id: entry.deckId,
    entry_id: entry.entryId ?? '',
    deck_variant_id: entry.deckVariantId ?? '',
    section: entry.section,
    count: String(entry.count),
    set_code: entry.setCode,
    card_id: entry.cardId,
    variant_id: entry.variantId ?? '',
    name_snapshot: entry.nameSnapshot ?? '',
    candidate_status: entry.candidateStatus ?? 'active',
    roles: (entry.roles ?? []).join('|'),
    role_source: entry.roleSource ?? 'none',
    role_confidence: entry.roleConfidence === undefined ? '' : String(entry.roleConfidence),
    impact_rating: entry.impactRating === undefined ? '' : String(entry.impactRating),
    synergy_rating: entry.synergyRating === undefined ? '' : String(entry.synergyRating),
    quality_rating: entry.qualityRating === undefined ? '' : String(entry.qualityRating),
    entry_tags: (entry.entryTags ?? []).join('|'),
    entry_notes: entry.entryNotes ?? '',
    flags: (entry.flags ?? []).join('|'),
    starred: entry.starred ? 'true' : 'false',
    marked_for_deletion: entry.markedForDeletion ? 'true' : 'false'
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
  const raw = Array.isArray(values) ? values : String(values ?? '').split(/[,;|\n]+/);
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

function isTruthyCell(value: unknown): boolean {
  return ['true', '1', 'yes', 'y', 'on'].includes(clean(value).toLowerCase());
}

function cleanColorIdentity(value: unknown): string {
  const normalized = clean(value).toUpperCase().replace(/[\s_-]+/g, '');
  if (!normalized) {
    return '';
  }
  if (normalized === 'COLORLESS') {
    return 'C';
  }
  if (normalized === 'FIVECOLOR' || normalized === 'FIVECOLOUR') {
    return 'WUBRG';
  }
  if (!/^[WUBRGC]+$/.test(normalized)) {
    return '';
  }
  return [...new Set(normalized.split(''))].join('');
}

function normalizeDeckCardReferences(values: unknown): DeckCardReference[] {
  if (!Array.isArray(values)) {
    return [];
  }
  return values.flatMap((value) => {
    const reference = normalizeDeckCardReference(value);
    return reference ? [reference] : [];
  });
}

function normalizeDeckCardReference(value: unknown): DeckCardReference | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const candidate = value as Partial<DeckCardReference>;
  const setCode = clean(candidate.setCode).toUpperCase();
  const cardId = clean(candidate.cardId);
  if (!setCode || !cardId) {
    return undefined;
  }
  return {
    setCode,
    cardId,
    variantId: clean(candidate.variantId) || undefined,
    nameSnapshot: clean(candidate.nameSnapshot) || undefined
  };
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

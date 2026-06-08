import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fetchScryfallBulkData, type ScryfallBulkDataResponse } from '../reference/scryfallSync.js';
import type {
  OfficialCardBase,
  OfficialCardCatalogStatus,
  OfficialCardCatalogView,
  OfficialCardFace,
  OfficialCardImageUris,
  OfficialCardOracle,
  OfficialCardPrices,
  OfficialCardPriceCurrency,
  OfficialCardPrint,
  OfficialCardSearchCard,
  OfficialCardSearchFilters,
  OfficialCardSearchResult,
  OfficialCardSortDirection,
  OfficialCardSortKey,
  OfficialCardSyncOptions
} from './officialCardModel.js';

const OFFICIAL_CARD_CACHE_VERSION = 1;
const OFFICIAL_CARD_CACHE_DIR = join('.tmp', 'official-cards');
const OFFICIAL_PRINTS_FILE = 'prints.json';
const OFFICIAL_ORACLE_FILE = 'oracle.json';
const OFFICIAL_STATUS_FILE = 'status.json';
const DEFAULT_SEARCH_LIMIT = 80;
const MAX_SEARCH_LIMIT = 240;
const SEARCH_FETCH_TIMEOUT_MS = 240_000;
const BULK_DOWNLOAD_TIMEOUT_MS = 900_000;
const NATURAL_COLLATOR = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
const DEFAULT_PRICE_CURRENCY: OfficialCardPriceCurrency = 'usd';

interface ParsedOfficialCardQuery {
  freeTerms: string[];
  rankTerms: string[];
  clauses: OfficialCardQueryClause[];
  unsupportedQueryTerms: string[];
}

interface OfficialCardQueryClause {
  raw: string;
  field: OfficialCardQueryField;
  operator: QueryOperator;
  value: string;
  negated: boolean;
}

type OfficialCardQueryField =
  | 'name'
  | 'oracle'
  | 'type'
  | 'set'
  | 'rarity'
  | 'lang'
  | 'finish'
  | 'layout'
  | 'colors'
  | 'identity'
  | 'manaValue'
  | 'power'
  | 'toughness'
  | 'usd'
  | 'eur'
  | 'tix'
  | 'year'
  | 'date'
  | 'has'
  | 'is';

type QueryOperator = ':' | '=' | '<' | '<=' | '>' | '>=';

interface CacheFile<TCard extends OfficialCardSearchCard> {
  version: 1;
  view: TCard['view'];
  syncedAt: string;
  upstreamUpdatedAt?: string;
  downloadUri?: string;
  count: number;
  cards: TCard[];
}

interface MemoryCacheEntry<TCard extends OfficialCardSearchCard> {
  mtimeMs: number;
  file: CacheFile<TCard>;
}

interface ScryfallBulkCard {
  id?: string;
  oracle_id?: string;
  name?: string;
  mana_cost?: string;
  cmc?: number;
  mana_value?: number;
  type_line?: string;
  oracle_text?: string;
  flavor_text?: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
  defense?: string;
  colors?: string[];
  color_identity?: string[];
  layout?: string;
  set?: string;
  set_name?: string;
  collector_number?: string;
  rarity?: string;
  released_at?: string;
  finishes?: string[];
  lang?: string;
  prices?: Record<string, unknown>;
  scryfall_uri?: string;
  prints_search_uri?: string;
  image_uris?: Record<string, unknown>;
  card_faces?: Array<{
    name?: string;
    mana_cost?: string;
    type_line?: string;
    oracle_text?: string;
    flavor_text?: string;
    power?: string;
    toughness?: string;
    loyalty?: string;
    defense?: string;
    colors?: string[];
    image_uris?: Record<string, unknown>;
  }>;
}

const memoryCache = new Map<string, MemoryCacheEntry<OfficialCardSearchCard>>();

export function officialCardsCacheDir(rootDir: string): string {
  return join(rootDir, OFFICIAL_CARD_CACHE_DIR);
}

export async function officialCardCatalogStatus(rootDir: string): Promise<OfficialCardCatalogStatus> {
  return buildStatus(rootDir);
}

export async function searchOfficialCards(rootDir: string, filters: OfficialCardSearchFilters = {}): Promise<OfficialCardSearchResult> {
  const view = normalizeView(filters.view);
  const limit = clampNumber(filters.limit ?? DEFAULT_SEARCH_LIMIT, 1, MAX_SEARCH_LIMIT);
  const offset = Math.max(0, Math.floor(filters.offset ?? 0));
  const query = clean(filters.query);
  const parsedQuery = parseOfficialCardQuery(query);
  const sort = normalizeSort(filters.sort, parsedQuery);
  const sortDirection = normalizeSortDirection(filters.sortDirection, sort);
  const file = await readCacheFileForView(rootDir, view);
  const allCards = file?.cards ?? [];
  const filtered = allCards.filter((card) => officialCardMatches(card, filters, parsedQuery));
  filtered.sort((left, right) => compareOfficialCards(left, right, { sort, sortDirection, query: rankQueryForParsedQuery(parsedQuery), priceCurrency: normalizePriceCurrency(filters.priceCurrency) }));
  const cards = filtered.slice(offset, offset + limit);
  return {
    view,
    query,
    total: filtered.length,
    limit,
    offset,
    sort,
    sortDirection,
    unsupportedQueryTerms: parsedQuery.unsupportedQueryTerms,
    cards,
    status: await buildStatus(rootDir)
  };
}

export async function findOfficialCardPrint(rootDir: string, cardId: string): Promise<OfficialCardPrint | undefined> {
  const file = await readPrintCacheFile(rootDir);
  const id = clean(cardId).toLowerCase();
  return file?.cards.find((card) => card.id.toLowerCase() === id);
}

export async function findOfficialCardPrintByPrintKey(
  rootDir: string,
  args: { name?: string; setCode?: string; collectorNumber?: string }
): Promise<OfficialCardPrint | undefined> {
  const file = await readPrintCacheFile(rootDir);
  const name = clean(args.name).toLowerCase();
  const setCode = clean(args.setCode).toUpperCase();
  const collectorNumber = clean(args.collectorNumber).toLowerCase();
  if (!file || !name) {
    return undefined;
  }
  return file.cards.find((card) => {
    const matchesName = card.name.toLowerCase() === name;
    const matchesSet = !setCode || card.setCode === setCode;
    const matchesCollector = !collectorNumber || clean(card.collectorNumber).toLowerCase() === collectorNumber;
    return matchesName && matchesSet && matchesCollector;
  });
}

export async function syncOfficialCards(rootDir: string, options: OfficialCardSyncOptions = {}): Promise<OfficialCardCatalogStatus> {
  const syncedAt = options.syncedAt ?? new Date().toISOString();
  const view = options.view ?? 'both';
  const fetchImpl = options.fetchImpl ?? fetch;
  const bulk = await fetchScryfallBulkData(fetchImpl);
  const targets = bulkTargets(bulk, view);
  try {
    await mkdir(officialCardsCacheDir(rootDir), { recursive: true });
    for (const target of targets) {
      const rawCards = await fetchScryfallBulkCards(fetchImpl, target);
      if (target.view === 'prints') {
        const cards = rawCards.map(printFromScryfall).filter((card): card is OfficialCardPrint => Boolean(card));
        await writeCacheFile(rootDir, 'prints', {
          version: OFFICIAL_CARD_CACHE_VERSION,
          view: 'prints',
          syncedAt,
          upstreamUpdatedAt: target.updated_at,
          downloadUri: target.download_uri,
          count: cards.length,
          cards
        });
      } else {
        const cards = rawCards.map(oracleFromScryfall).filter((card): card is OfficialCardOracle => Boolean(card));
        await writeCacheFile(rootDir, 'oracle', {
          version: OFFICIAL_CARD_CACHE_VERSION,
          view: 'oracle',
          syncedAt,
          upstreamUpdatedAt: target.updated_at,
          downloadUri: target.download_uri,
          count: cards.length,
          cards
        });
      }
    }
    const status = { ...(await buildStatus(rootDir)), lastError: undefined };
    await writeStatus(rootDir, status);
    return status;
  } catch (error) {
    const status = {
      ...(await buildStatus(rootDir)),
      lastError: error instanceof Error ? error.message : String(error)
    };
    await writeStatus(rootDir, status);
    throw error;
  }
}

export async function writeOfficialCardCacheForTest(rootDir: string, args: { prints?: OfficialCardPrint[]; oracle?: OfficialCardOracle[]; syncedAt?: string }): Promise<void> {
  const syncedAt = args.syncedAt ?? new Date().toISOString();
  await mkdir(officialCardsCacheDir(rootDir), { recursive: true });
  if (args.prints) {
    await writeCacheFile(rootDir, 'prints', { version: 1, view: 'prints', syncedAt, count: args.prints.length, cards: args.prints });
  }
  if (args.oracle) {
    await writeCacheFile(rootDir, 'oracle', { version: 1, view: 'oracle', syncedAt, count: args.oracle.length, cards: args.oracle });
  }
  await writeStatus(rootDir, await buildStatus(rootDir));
}

function bulkTargets(bulk: ScryfallBulkDataResponse, view: OfficialCardCatalogView | 'both'): Array<ScryfallBulkDataResponse['data'][number] & { view: OfficialCardCatalogView }> {
  const targets: Array<ScryfallBulkDataResponse['data'][number] & { view: OfficialCardCatalogView }> = [];
  if (view === 'prints' || view === 'both') {
    const prints = bulk.data.find((item) => item.type === 'default_cards');
    if (!prints) {
      throw new Error('Scryfall default_cards bulk data was not available.');
    }
    targets.push({ ...prints, view: 'prints' });
  }
  if (view === 'oracle' || view === 'both') {
    const oracle = bulk.data.find((item) => item.type === 'oracle_cards');
    if (!oracle) {
      throw new Error('Scryfall oracle_cards bulk data was not available.');
    }
    targets.push({ ...oracle, view: 'oracle' });
  }
  return targets;
}

async function fetchScryfallBulkCards(fetchImpl: typeof fetch, target: ScryfallBulkDataResponse['data'][number]): Promise<ScryfallBulkCard[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BULK_DOWNLOAD_TIMEOUT_MS);
  try {
    const response = await fetchImpl(target.download_uri, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'HomebrewForge/0.1 official-card-sync'
      },
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`Official card source request failed ${response.status}: ${target.download_uri}`);
    }
    if (!response.body) {
      return (await response.json()) as ScryfallBulkCard[];
    }
    return await parseScryfallBulkCardStream(response.body);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Official card source request timed out after ${BULK_DOWNLOAD_TIMEOUT_MS / 1000}s: ${target.download_uri}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function parseScryfallBulkCardStream(body: ReadableStream<Uint8Array>): Promise<ScryfallBulkCard[]> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const cards: ScryfallBulkCard[] = [];
  let buffer = '';
  let objectDepth = 0;
  let inString = false;
  let escaped = false;

  function consume(text: string) {
    for (const character of text) {
      if (!buffer) {
        if (character === '{') {
          buffer = character;
          objectDepth = 1;
          inString = false;
          escaped = false;
        }
        continue;
      }

      buffer += character;
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (character === '\\') {
          escaped = true;
        } else if (character === '"') {
          inString = false;
        }
        continue;
      }

      if (character === '"') {
        inString = true;
      } else if (character === '{') {
        objectDepth += 1;
      } else if (character === '}') {
        objectDepth -= 1;
        if (objectDepth === 0) {
          cards.push(JSON.parse(buffer) as ScryfallBulkCard);
          buffer = '';
        }
      }
    }
  }

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      consume(decoder.decode(value, { stream: true }));
    }
    consume(decoder.decode());
  } finally {
    reader.releaseLock();
  }

  if (buffer) {
    throw new Error('Official card source returned an incomplete card object.');
  }
  return cards;
}

function printFromScryfall(card: ScryfallBulkCard): OfficialCardPrint | undefined {
  const base = baseCardFromScryfall(card);
  if (!base) {
    return undefined;
  }
  return {
    ...base,
    view: 'prints',
    setCode: clean(card.set).toUpperCase() || undefined,
    setName: clean(card.set_name) || undefined,
    collectorNumber: clean(card.collector_number) || undefined,
    rarity: clean(card.rarity) || undefined,
    releasedAt: clean(card.released_at) || undefined,
    finishes: Array.isArray(card.finishes) ? card.finishes.map(clean).filter(Boolean) : [],
    lang: clean(card.lang) || undefined,
    prices: pricesFromScryfall(card.prices)
  };
}

function oracleFromScryfall(card: ScryfallBulkCard): OfficialCardOracle | undefined {
  const base = baseCardFromScryfall(card);
  if (!base) {
    return undefined;
  }
  return {
    ...base,
    view: 'oracle',
    printSearchUri: clean(card.prints_search_uri) || undefined
  };
}

function baseCardFromScryfall(card: ScryfallBulkCard): OfficialCardBase | undefined {
  const id = clean(card.id);
  const name = clean(card.name);
  if (!id || !name) {
    return undefined;
  }
  const faces = Array.isArray(card.card_faces) ? card.card_faces.map(faceFromScryfall).filter((face) => Object.values(face).some(Boolean)) : undefined;
  const firstFace = faces?.[0];
  return {
    id,
    oracleId: clean(card.oracle_id) || undefined,
    name,
    manaCost: clean(card.mana_cost) || firstFace?.manaCost,
    manaValue: numberValue(card.mana_value) ?? numberValue(card.cmc),
    typeLine: clean(card.type_line) || firstFace?.typeLine,
    oracleText: clean(card.oracle_text) || joinedFaceText(faces, 'oracleText'),
    flavorText: clean(card.flavor_text) || joinedFaceText(faces, 'flavorText'),
    power: clean(card.power) || firstFace?.power,
    toughness: clean(card.toughness) || firstFace?.toughness,
    loyalty: clean(card.loyalty) || firstFace?.loyalty,
    defense: clean(card.defense) || firstFace?.defense,
    colors: stringArray(card.colors),
    colorIdentity: stringArray(card.color_identity),
    layout: clean(card.layout) || undefined,
    scryfallUri: clean(card.scryfall_uri) || undefined,
    imageUris: imageUrisFrom(card.image_uris) ?? firstFace?.imageUris,
    cardFaces: faces?.length ? faces : undefined
  };
}

function faceFromScryfall(face: NonNullable<ScryfallBulkCard['card_faces']>[number]): OfficialCardFace {
  return {
    name: clean(face.name) || undefined,
    manaCost: clean(face.mana_cost) || undefined,
    typeLine: clean(face.type_line) || undefined,
    oracleText: clean(face.oracle_text) || undefined,
    flavorText: clean(face.flavor_text) || undefined,
    power: clean(face.power) || undefined,
    toughness: clean(face.toughness) || undefined,
    loyalty: clean(face.loyalty) || undefined,
    defense: clean(face.defense) || undefined,
    colors: stringArray(face.colors),
    imageUris: imageUrisFrom(face.image_uris)
  };
}

function imageUrisFrom(raw: Record<string, unknown> | undefined): OfficialCardImageUris | undefined {
  if (!raw) {
    return undefined;
  }
  const images: OfficialCardImageUris = {
    small: clean(raw.small) || undefined,
    normal: clean(raw.normal) || undefined,
    large: clean(raw.large) || undefined,
    png: clean(raw.png) || undefined,
    artCrop: clean(raw.art_crop) || undefined,
    borderCrop: clean(raw.border_crop) || undefined
  };
  return Object.values(images).some(Boolean) ? images : undefined;
}

function pricesFromScryfall(raw: Record<string, unknown> | undefined): OfficialCardPrices | undefined {
  if (!raw) {
    return undefined;
  }
  const prices: OfficialCardPrices = {
    usd: clean(raw.usd) || undefined,
    usdFoil: clean(raw.usd_foil) || undefined,
    eur: clean(raw.eur) || undefined,
    eurFoil: clean(raw.eur_foil) || undefined,
    tix: clean(raw.tix) || undefined
  };
  return Object.values(prices).some(Boolean) ? prices : undefined;
}

async function readCacheFileForView(rootDir: string, view: OfficialCardCatalogView): Promise<CacheFile<OfficialCardSearchCard> | undefined> {
  const path = cachePath(rootDir, view);
  if (!existsSync(path)) {
    return undefined;
  }
  const fileStat = await stat(path);
  const cached = memoryCache.get(path);
  if (cached && cached.mtimeMs === fileStat.mtimeMs) {
    return cached.file;
  }
  const parsed = JSON.parse(await readFile(path, 'utf8')) as CacheFile<OfficialCardSearchCard>;
  memoryCache.set(path, { mtimeMs: fileStat.mtimeMs, file: parsed });
  return parsed;
}

async function readPrintCacheFile(rootDir: string): Promise<CacheFile<OfficialCardPrint> | undefined> {
  return (await readCacheFileForView(rootDir, 'prints')) as CacheFile<OfficialCardPrint> | undefined;
}

async function writeCacheFile<TCard extends OfficialCardSearchCard>(rootDir: string, view: OfficialCardCatalogView, file: CacheFile<TCard>): Promise<void> {
  const path = cachePath(rootDir, view);
  await writeFile(path, `${JSON.stringify(file)}\n`, 'utf8');
  memoryCache.delete(path);
}

async function buildStatus(rootDir: string): Promise<OfficialCardCatalogStatus> {
  const [prints, oracle, stored] = await Promise.all([sourceStatus(rootDir, 'prints'), sourceStatus(rootDir, 'oracle'), readStoredStatus(rootDir)]);
  return {
    version: 1,
    cacheDir: officialCardsCacheDir(rootDir),
    checkedAt: new Date().toISOString(),
    prints,
    oracle,
    lastError: stored?.lastError
  };
}

async function sourceStatus(rootDir: string, view: OfficialCardCatalogView) {
  const file = await readCacheFileForView(rootDir, view);
  return {
    available: Boolean(file),
    count: file?.count ?? 0,
    syncedAt: file?.syncedAt,
    upstreamUpdatedAt: file?.upstreamUpdatedAt,
    downloadUri: file?.downloadUri
  };
}

async function readStoredStatus(rootDir: string): Promise<OfficialCardCatalogStatus | undefined> {
  try {
    return JSON.parse(await readFile(join(officialCardsCacheDir(rootDir), OFFICIAL_STATUS_FILE), 'utf8')) as OfficialCardCatalogStatus;
  } catch {
    return undefined;
  }
}

async function writeStatus(rootDir: string, status: OfficialCardCatalogStatus): Promise<void> {
  await mkdir(officialCardsCacheDir(rootDir), { recursive: true });
  await writeFile(join(officialCardsCacheDir(rootDir), OFFICIAL_STATUS_FILE), `${JSON.stringify(status, null, 2)}\n`, 'utf8');
}

function officialCardMatches(card: OfficialCardSearchCard, filters: OfficialCardSearchFilters, parsedQuery: ParsedOfficialCardQuery): boolean {
  if (filters.setCode && (card.view !== 'prints' || card.setCode?.toLowerCase() !== filters.setCode.toLowerCase())) {
    return false;
  }
  if (filters.rarity && (card.view !== 'prints' || card.rarity !== filters.rarity)) {
    return false;
  }
  if (filters.colorIdentity && !colorIdentityMatches(card.colorIdentity, filters.colorIdentity)) {
    return false;
  }
  if (filters.typeLine && !(card.typeLine ?? '').toLowerCase().includes(filters.typeLine.toLowerCase())) {
    return false;
  }
  if (filters.layout && (card.layout ?? '').toLowerCase() !== filters.layout.toLowerCase()) {
    return false;
  }
  if (filters.finish && (card.view !== 'prints' || !card.finishes.some((finish) => finish.toLowerCase() === filters.finish?.toLowerCase()))) {
    return false;
  }
  if (filters.lang && (card.view !== 'prints' || card.lang?.toLowerCase() !== filters.lang.toLowerCase())) {
    return false;
  }
  if (!numberFilterMatches(card.manaValue, filters.manaValueMin, filters.manaValueMax)) {
    return false;
  }
  if (!numberFilterMatches(priceForCard(card, normalizePriceCurrency(filters.priceCurrency)), filters.priceMin, filters.priceMax)) {
    return false;
  }
  if (filters.releasedAfter && (card.view !== 'prints' || !dateFilterMatches(card.releasedAt, filters.releasedAfter, '>='))) {
    return false;
  }
  if (filters.releasedBefore && (card.view !== 'prints' || !dateFilterMatches(card.releasedAt, filters.releasedBefore, '<='))) {
    return false;
  }
  if (filters.year && (card.view !== 'prints' || !clean(card.releasedAt).startsWith(clean(filters.year)))) {
    return false;
  }
  if (filters.hasImage === 'yes' && !officialCardImageUrl(card)) {
    return false;
  }
  if (filters.hasImage === 'no' && officialCardImageUrl(card)) {
    return false;
  }
  if (filters.cardCategory && officialCardCategory(card) !== filters.cardCategory) {
    return false;
  }
  if (parsedQuery.freeTerms.length) {
    const haystack = searchText(card);
    if (!parsedQuery.freeTerms.every((term) => haystack.includes(term))) {
      return false;
    }
  }
  return parsedQuery.clauses.every((clause) => officialQueryClauseMatches(card, clause));
}

function searchText(card: OfficialCardSearchCard): string {
  const printParts = card.view === 'prints' ? [card.setCode, card.setName, card.collectorNumber, card.rarity, card.lang] : [];
  return [
    card.name,
    card.manaCost,
    card.typeLine,
    card.oracleText,
    card.flavorText,
    card.layout,
    card.colors.join(''),
    card.colorIdentity.join(''),
    ...printParts,
    ...(card.cardFaces ?? []).flatMap((face) => [face.name, face.typeLine, face.oracleText, face.flavorText])
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function compareOfficialCardSearchRank(left: OfficialCardSearchCard, right: OfficialCardSearchCard, query: string): number {
  return officialCardSearchRank(left, query) - officialCardSearchRank(right, query) || left.name.localeCompare(right.name) || officialCardPrintSortKey(left).localeCompare(officialCardPrintSortKey(right));
}

function officialCardSearchRank(card: OfficialCardSearchCard, query: string): number {
  const needle = query.toLowerCase();
  const name = card.name.toLowerCase();
  const faceNames = (card.cardFaces ?? []).map((face) => clean(face.name).toLowerCase()).filter(Boolean);
  const printIdentity = card.view === 'prints' ? [card.setCode, card.collectorNumber].filter(Boolean).join(' ').toLowerCase() : '';
  if (name === needle) {
    return 0;
  }
  if (faceNames.some((faceName) => faceName === needle)) {
    return 1;
  }
  if (name.startsWith(needle)) {
    return 2;
  }
  if (faceNames.some((faceName) => faceName.startsWith(needle))) {
    return 3;
  }
  if (name.includes(needle)) {
    return 4;
  }
  if (faceNames.some((faceName) => faceName.includes(needle))) {
    return 5;
  }
  if (printIdentity && printIdentity.includes(needle)) {
    return 6;
  }
  if ((card.typeLine ?? '').toLowerCase().includes(needle)) {
    return 10;
  }
  if ((card.oracleText ?? '').toLowerCase().includes(needle)) {
    return 20;
  }
  return 40;
}

function officialCardPrintSortKey(card: OfficialCardSearchCard): string {
  if (card.view !== 'prints') {
    return '';
  }
  return [card.releasedAt, card.setCode, card.collectorNumber].filter(Boolean).join(':');
}

function parseOfficialCardQuery(query: string): ParsedOfficialCardQuery {
  const parsed: ParsedOfficialCardQuery = { freeTerms: [], rankTerms: [], clauses: [], unsupportedQueryTerms: [] };
  for (const rawToken of tokenizeOfficialQuery(query)) {
    const raw = clean(rawToken);
    if (!raw) {
      continue;
    }
    const negated = raw.startsWith('-');
    const token = negated ? raw.slice(1) : raw;
    const match = token.match(/^([a-z_]+)(:|<=|>=|<|>|=)(.+)$/i);
    if (!match) {
      parsed.freeTerms.push(unquote(token).toLowerCase());
      parsed.rankTerms.push(unquote(token));
      continue;
    }
    const alias = normalizeQueryField(match[1] ?? '');
    if (!alias) {
      parsed.unsupportedQueryTerms.push(raw);
      continue;
    }
    const valueWithOperator = splitQueryValueOperator(match[2] as QueryOperator, match[3] ?? '');
    const value = unquote(valueWithOperator.value);
    if (!value) {
      parsed.unsupportedQueryTerms.push(raw);
      continue;
    }
    parsed.clauses.push({ raw, field: alias, operator: valueWithOperator.operator, value, negated });
    parsed.rankTerms.push(value);
  }
  return parsed;
}

function tokenizeOfficialQuery(query: string): string[] {
  return clean(query).match(/"[^"]+"|\S+/g) ?? [];
}

function normalizeQueryField(field: string): OfficialCardQueryField | '' {
  const normalized = field.toLowerCase();
  const aliases: Record<string, OfficialCardQueryField> = {
    n: 'name',
    name: 'name',
    o: 'oracle',
    oracle: 'oracle',
    t: 'type',
    type: 'type',
    set: 'set',
    r: 'rarity',
    rarity: 'rarity',
    lang: 'lang',
    finish: 'finish',
    layout: 'layout',
    c: 'colors',
    color: 'colors',
    id: 'identity',
    identity: 'identity',
    mv: 'manaValue',
    cmc: 'manaValue',
    pow: 'power',
    power: 'power',
    tou: 'toughness',
    toughness: 'toughness',
    usd: 'usd',
    eur: 'eur',
    tix: 'tix',
    year: 'year',
    date: 'date',
    has: 'has',
    is: 'is'
  };
  return aliases[normalized] ?? '';
}

function splitQueryValueOperator(operator: QueryOperator, value: string): { operator: QueryOperator; value: string } {
  if (operator === ':' || operator === '=') {
    const nested = clean(value).match(/^(<=|>=|<|>|=)(.+)$/);
    if (nested) {
      return { operator: nested[1] as QueryOperator, value: nested[2] ?? '' };
    }
  }
  return { operator, value };
}

function unquote(value: string): string {
  const cleaned = clean(value);
  return cleaned.startsWith('"') && cleaned.endsWith('"') ? cleaned.slice(1, -1).trim() : cleaned;
}

function officialQueryClauseMatches(card: OfficialCardSearchCard, clause: OfficialCardQueryClause): boolean {
  const matches = officialQueryClauseMatchesUnnegated(card, clause);
  return clause.negated ? !matches : matches;
}

function officialQueryClauseMatchesUnnegated(card: OfficialCardSearchCard, clause: OfficialCardQueryClause): boolean {
  switch (clause.field) {
    case 'name':
      return textMatches([card.name, ...(card.cardFaces ?? []).map((face) => face.name)], clause.value);
    case 'oracle':
      return textMatches([card.oracleText, ...(card.cardFaces ?? []).map((face) => face.oracleText)], clause.value);
    case 'type':
      return textMatches([card.typeLine, ...(card.cardFaces ?? []).map((face) => face.typeLine)], clause.value);
    case 'set':
      return card.view === 'prints' && stringCompare(card.setCode, clause.value, clause.operator);
    case 'rarity':
      return card.view === 'prints' && stringCompare(card.rarity, clause.value, clause.operator);
    case 'lang':
      return card.view === 'prints' && stringCompare(card.lang, clause.value, clause.operator);
    case 'finish':
      return card.view === 'prints' && card.finishes.some((finish) => stringCompare(finish, clause.value, clause.operator));
    case 'layout':
      return stringCompare(card.layout, clause.value, clause.operator);
    case 'colors':
      return colorListMatches(card.colors, clause.value, clause.operator);
    case 'identity':
      return colorListMatches(card.colorIdentity, clause.value, clause.operator);
    case 'manaValue':
      return numericCompare(card.manaValue, numberFromString(clause.value), clause.operator);
    case 'power':
      return numericCompare(numberFromString(card.power), numberFromString(clause.value), clause.operator);
    case 'toughness':
      return numericCompare(numberFromString(card.toughness), numberFromString(clause.value), clause.operator);
    case 'usd':
      return numericCompare(priceForCard(card, 'usd'), numberFromString(clause.value), clause.operator);
    case 'eur':
      return numericCompare(priceForCard(card, 'eur'), numberFromString(clause.value), clause.operator);
    case 'tix':
      return numericCompare(priceForCard(card, 'tix'), numberFromString(clause.value), clause.operator);
    case 'year':
      return card.view === 'prints' && numericCompare(numberFromString(card.releasedAt?.slice(0, 4)), numberFromString(clause.value), clause.operator);
    case 'date':
      return card.view === 'prints' && dateFilterMatches(card.releasedAt, clause.value, clause.operator);
    case 'has':
      return clause.value.toLowerCase() === 'image' ? Boolean(officialCardImageUrl(card)) : false;
    case 'is':
      return officialCardCategory(card) === normalizeQueryCategory(clause.value);
  }
}

function compareOfficialCards(
  left: OfficialCardSearchCard,
  right: OfficialCardSearchCard,
  args: { sort: OfficialCardSortKey; sortDirection: OfficialCardSortDirection; query: string; priceCurrency: OfficialCardPriceCurrency }
): number {
  const sort = args.sort === 'auto' ? (args.query ? 'relevance' : 'name') : args.sort;
  const primary =
    sort === 'relevance'
      ? compareOfficialCardSearchRank(left, right, args.query)
      : sort === 'released'
        ? compareNullableString(left.view === 'prints' ? left.releasedAt : undefined, right.view === 'prints' ? right.releasedAt : undefined, args.sortDirection)
        : sort === 'price'
          ? compareNullableNumber(priceForCard(left, args.priceCurrency), priceForCard(right, args.priceCurrency), args.sortDirection)
          : sort === 'manaValue'
            ? compareNullableNumber(left.manaValue, right.manaValue, args.sortDirection)
            : sort === 'rarity'
              ? compareNullableNumber(rarityRank(left), rarityRank(right), args.sortDirection)
              : sort === 'set'
                ? compareSetPrint(left, right, args.sortDirection)
                : sort === 'colorIdentity'
                  ? compareNullableString(left.colorIdentity.join('') || 'C', right.colorIdentity.join('') || 'C', args.sortDirection)
                  : sort === 'type'
                    ? compareNullableString(left.typeLine, right.typeLine, args.sortDirection)
                    : compareNullableString(left.name, right.name, args.sortDirection);
  return primary || left.name.localeCompare(right.name) || officialCardPrintSortKey(left).localeCompare(officialCardPrintSortKey(right));
}

function normalizeSort(sort: OfficialCardSortKey | undefined, parsedQuery: ParsedOfficialCardQuery): OfficialCardSortKey {
  const supported = new Set<OfficialCardSortKey>(['auto', 'relevance', 'name', 'released', 'price', 'manaValue', 'rarity', 'set', 'colorIdentity', 'type']);
  if (sort && supported.has(sort)) {
    return sort;
  }
  return parsedQuery.freeTerms.length || parsedQuery.clauses.length ? 'auto' : 'name';
}

function normalizeSortDirection(direction: OfficialCardSortDirection | undefined, sort: OfficialCardSortKey): OfficialCardSortDirection {
  if (direction === 'desc' || direction === 'asc') {
    return direction;
  }
  return sort === 'released' ? 'desc' : 'asc';
}

function rankQueryForParsedQuery(parsedQuery: ParsedOfficialCardQuery): string {
  return parsedQuery.rankTerms.map((term) => term.toLowerCase()).join(' ').trim();
}

function normalizePriceCurrency(currency: OfficialCardPriceCurrency | undefined): OfficialCardPriceCurrency {
  return currency === 'usdFoil' || currency === 'eur' || currency === 'eurFoil' || currency === 'tix' ? currency : DEFAULT_PRICE_CURRENCY;
}

function priceForCard(card: OfficialCardSearchCard, currency: OfficialCardPriceCurrency): number | undefined {
  if (card.view !== 'prints') {
    return undefined;
  }
  return numberFromString(card.prices?.[currency]);
}

function officialCardImageUrl(card: OfficialCardSearchCard): string {
  const images = card.imageUris ?? card.cardFaces?.find((face) => face.imageUris)?.imageUris;
  return images?.normal ?? images?.large ?? images?.png ?? images?.small ?? images?.artCrop ?? images?.borderCrop ?? '';
}

function officialCardCategory(card: OfficialCardSearchCard): 'normal' | 'token' | 'art' | 'extra' | 'funny' {
  const layout = clean(card.layout).toLowerCase();
  const typeLine = clean(card.typeLine).toLowerCase();
  if (layout === 'art_series') {
    return 'art';
  }
  if (layout === 'token' || typeLine.includes('token')) {
    return 'token';
  }
  if (['plane', 'planar', 'scheme', 'vanguard', 'emblem'].includes(layout) || /\b(plane|scheme|vanguard|emblem|phenomenon)\b/.test(typeLine)) {
    return 'extra';
  }
  if (['funny', 'augment', 'host'].includes(layout)) {
    return 'funny';
  }
  return 'normal';
}

function normalizeQueryCategory(value: string): 'normal' | 'token' | 'art' | 'extra' | 'funny' | '' {
  const normalized = value.toLowerCase();
  if (normalized === 'token') {
    return 'token';
  }
  if (normalized === 'art' || normalized === 'art_series') {
    return 'art';
  }
  if (normalized === 'extra' || normalized === 'plane' || normalized === 'scheme' || normalized === 'emblem') {
    return 'extra';
  }
  if (normalized === 'funny') {
    return 'funny';
  }
  if (normalized === 'normal') {
    return 'normal';
  }
  return '';
}

function textMatches(values: Array<string | undefined>, value: string): boolean {
  const needle = value.toLowerCase();
  return values.some((candidate) => clean(candidate).toLowerCase().includes(needle));
}

function stringCompare(actual: string | undefined, expected: string, operator: QueryOperator): boolean {
  const left = clean(actual).toLowerCase();
  const right = clean(expected).toLowerCase();
  if (!left) {
    return false;
  }
  if (operator === ':' || operator === '=') {
    return left === right || left.includes(right);
  }
  const compared = NATURAL_COLLATOR.compare(left, right);
  return operator === '<' ? compared < 0 : operator === '<=' ? compared <= 0 : operator === '>' ? compared > 0 : compared >= 0;
}

function colorListMatches(colors: string[], expected: string, operator: QueryOperator): boolean {
  const normalized = clean(expected).toUpperCase();
  const actual = colors.map((color) => color.toUpperCase()).sort().join('');
  if (normalized === 'C') {
    return colors.length === 0;
  }
  const expectedColors = normalized.split('').filter(Boolean).sort().join('');
  if (operator === '=') {
    return actual === expectedColors;
  }
  return expectedColors.split('').every((color) => actual.includes(color));
}

function numberFilterMatches(value: number | undefined, min: number | undefined, max: number | undefined): boolean {
  if (min === undefined && max === undefined) {
    return true;
  }
  if (value === undefined) {
    return false;
  }
  if (min !== undefined && value < min) {
    return false;
  }
  if (max !== undefined && value > max) {
    return false;
  }
  return true;
}

function numericCompare(actual: number | undefined, expected: number | undefined, operator: QueryOperator): boolean {
  if (actual === undefined || expected === undefined) {
    return false;
  }
  if (operator === '<') {
    return actual < expected;
  }
  if (operator === '<=') {
    return actual <= expected;
  }
  if (operator === '>') {
    return actual > expected;
  }
  if (operator === '>=') {
    return actual >= expected;
  }
  return actual === expected;
}

function dateFilterMatches(actual: string | undefined, expected: string, operator: QueryOperator): boolean {
  const left = clean(actual);
  const right = clean(expected);
  if (!left || !right) {
    return false;
  }
  if (operator === ':' || operator === '=') {
    return left.startsWith(right);
  }
  return operator === '<' ? left < right : operator === '<=' ? left <= right : operator === '>' ? left > right : left >= right;
}

function compareNullableString(left: string | undefined, right: string | undefined, direction: OfficialCardSortDirection): number {
  const leftValue = clean(left);
  const rightValue = clean(right);
  if (!leftValue && !rightValue) {
    return 0;
  }
  if (!leftValue) {
    return 1;
  }
  if (!rightValue) {
    return -1;
  }
  const compared = NATURAL_COLLATOR.compare(leftValue, rightValue);
  return direction === 'desc' ? -compared : compared;
}

function compareNullableNumber(left: number | undefined, right: number | undefined, direction: OfficialCardSortDirection): number {
  if (left === undefined && right === undefined) {
    return 0;
  }
  if (left === undefined) {
    return 1;
  }
  if (right === undefined) {
    return -1;
  }
  const compared = left - right;
  return direction === 'desc' ? -compared : compared;
}

function compareSetPrint(left: OfficialCardSearchCard, right: OfficialCardSearchCard, direction: OfficialCardSortDirection): number {
  const setCompared = compareNullableString(left.view === 'prints' ? left.setCode : undefined, right.view === 'prints' ? right.setCode : undefined, direction);
  if (setCompared) {
    return setCompared;
  }
  return compareNullableString(left.view === 'prints' ? left.collectorNumber : undefined, right.view === 'prints' ? right.collectorNumber : undefined, direction);
}

function rarityRank(card: OfficialCardSearchCard): number | undefined {
  if (card.view !== 'prints' || !card.rarity) {
    return undefined;
  }
  const ranks = new Map([
    ['common', 1],
    ['uncommon', 2],
    ['rare', 3],
    ['mythic', 4],
    ['special', 5],
    ['bonus', 6]
  ]);
  return ranks.get(card.rarity.toLowerCase()) ?? 10;
}

function numberFromString(value: unknown): number | undefined {
  const number = Number(clean(value).replace(/^\$/, ''));
  return Number.isFinite(number) ? number : undefined;
}

function colorIdentityMatches(identity: string[], filter: string): boolean {
  const normalized = clean(filter).toUpperCase();
  if (!normalized || normalized === 'ALL') {
    return true;
  }
  if (normalized === 'C') {
    return identity.length === 0;
  }
  return normalized.split('').every((color) => identity.includes(color));
}

function cachePath(rootDir: string, view: OfficialCardCatalogView): string {
  return join(officialCardsCacheDir(rootDir), view === 'prints' ? OFFICIAL_PRINTS_FILE : OFFICIAL_ORACLE_FILE);
}

function normalizeView(view: unknown): OfficialCardCatalogView {
  return view === 'oracle' ? 'oracle' : 'prints';
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(clean).filter(Boolean) : [];
}

function joinedFaceText(faces: OfficialCardFace[] | undefined, key: 'oracleText' | 'flavorText'): string | undefined {
  const text = (faces ?? []).map((face) => face[key]).filter(Boolean).join('\n\n');
  return text || undefined;
}

function numberValue(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function clean(value: unknown): string {
  return String(value ?? '').trim();
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function officialCardEntryId(card: Pick<OfficialCardPrint, 'id'>): string {
  return `scryfall-${createHash('sha1').update(card.id).digest('hex').slice(0, 16)}`;
}

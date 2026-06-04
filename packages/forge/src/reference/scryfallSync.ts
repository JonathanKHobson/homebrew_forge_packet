import {
  buildReferenceCatalog,
  createReferenceTermFromRequest,
  referenceTermId,
  type ReferenceCatalog,
  type ReferenceCategory,
  type ReferenceRuleEntry,
  type ReferenceSourceSnapshot,
  type ReferenceTerm,
  type ScryfallCatalogSeed
} from './catalog.js';
import { addVersionHistory, hashContent, sourceSnapshotId, type OfficialReferenceSnapshot } from './officialStore.js';
import { extractCounterNamesFromText, termsFromRulesCatalog, type ParseRulesOptions } from './rulesParser.js';
import type { ReferenceRulesCatalog } from './catalog.js';

export type ScryfallCatalogKey = keyof Required<ScryfallCatalogSeed>;

export interface ScryfallCatalogResponse {
  object: 'catalog';
  uri: string;
  total_values: number;
  data: string[];
}

export interface ScryfallBulkDataResponse {
  object: 'list';
  data: Array<{
    type: string;
    name: string;
    updated_at: string;
    download_uri: string;
  }>;
}

export interface ScryfallCard {
  id?: string;
  name: string;
  type_line?: string;
  oracle_text?: string;
  colors?: string[];
  color_identity?: string[];
  power?: string;
  toughness?: string;
  layout?: string;
  set?: string;
  set_name?: string;
  released_at?: string;
  uri?: string;
  scryfall_uri?: string;
  card_faces?: Array<{
    name?: string;
    type_line?: string;
    oracle_text?: string;
    colors?: string[];
    power?: string;
    toughness?: string;
  }>;
}

export interface PrintedTextCard {
  name: string;
  text: string;
  set?: string;
  source?: 'mtgjson' | 'test';
}

interface MtgJsonAtomicCardsResponse {
  meta?: {
    date?: string;
    version?: string;
  };
  data?: Record<string, MtgJsonAtomicCard[]>;
}

interface MtgJsonAtomicCard {
  name?: string;
  faceName?: string;
  text?: string;
  originalText?: string;
  printings?: string[];
}

export interface ScryfallReferenceInputs {
  fetchedAt: string;
  catalogSeed: ScryfallCatalogSeed;
  printedTextCards?: PrintedTextCard[];
  tokenCards: ScryfallCard[];
  counterCards: ScryfallCard[];
  sourceSnapshots: ReferenceSourceSnapshot[];
}

export interface FetchScryfallReferenceOptions {
  fetchImpl?: typeof fetch;
  fetchedAt?: string;
  includePrintedTextCards?: boolean;
  includeTokenCards?: boolean;
  includeCounterCards?: boolean;
}

const SCRYFALL_CATALOG_ENDPOINTS: Array<{ key: ScryfallCatalogKey; path: string }> = [
  { key: 'supertypes', path: 'supertypes' },
  { key: 'cardTypes', path: 'card-types' },
  { key: 'artifactTypes', path: 'artifact-types' },
  { key: 'battleTypes', path: 'battle-types' },
  { key: 'creatureTypes', path: 'creature-types' },
  { key: 'enchantmentTypes', path: 'enchantment-types' },
  { key: 'landTypes', path: 'land-types' },
  { key: 'planeswalkerTypes', path: 'planeswalker-types' },
  { key: 'spellTypes', path: 'spell-types' },
  { key: 'keywordAbilities', path: 'keyword-abilities' },
  { key: 'keywordActions', path: 'keyword-actions' },
  { key: 'abilityWords', path: 'ability-words' }
];

const SCRYFALL_API_ROOT = 'https://api.scryfall.com';
const MTGJSON_ATOMIC_CARDS_URL = 'https://mtgjson.com/api/v5/AtomicCards.json';
const REFERENCE_FETCH_TIMEOUT_MS = 180_000;

export async function fetchScryfallReferenceInputs(options: FetchScryfallReferenceOptions = {}): Promise<ScryfallReferenceInputs> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const fetchedAt = options.fetchedAt ?? new Date().toISOString();
  const catalogSeed: ScryfallCatalogSeed = {};
  const sourceSnapshots: ReferenceSourceSnapshot[] = [];

  for (const endpoint of SCRYFALL_CATALOG_ENDPOINTS) {
    const url = `${SCRYFALL_API_ROOT}/catalog/${endpoint.path}`;
    const { json, raw } = await fetchJson<ScryfallCatalogResponse>(fetchImpl, url);
    catalogSeed[endpoint.key] = json.data;
    sourceSnapshots.push({
      id: sourceSnapshotId('scryfall-catalog', endpoint.path, raw),
      source: 'scryfall-catalog',
      kind: endpoint.path,
      url,
      fetchedAt,
      contentHash: hashContent(raw),
      count: json.total_values
    });
  }

  const bulk = await fetchScryfallBulkData(fetchImpl);
  const oracleBulk = bulk.data.find((item) => item.type === 'oracle_cards');
  if (oracleBulk) {
    sourceSnapshots.push({
      id: sourceSnapshotId('scryfall-oracle', 'oracle-cards', oracleBulk.updated_at),
      source: 'scryfall-oracle',
      kind: 'oracle-cards',
      url: oracleBulk.download_uri,
      fetchedAt,
      upstreamUpdatedAt: oracleBulk.updated_at,
      contentHash: hashContent(oracleBulk.updated_at)
    });
  }

  const printedTextCards = options.includePrintedTextCards === false ? { cards: [] } : await fetchMtgJsonPrintedTextCards(fetchImpl, fetchedAt);
  if (printedTextCards.snapshot) {
    sourceSnapshots.push(printedTextCards.snapshot);
  }

  const tokenCards = options.includeTokenCards === false ? [] : await fetchScryfallSearchCards(fetchImpl, 'layout:token -type:Card');
  if (tokenCards.length) {
    sourceSnapshots.push(snapshotForCards('scryfall-token', 'token-cards', 'https://api.scryfall.com/cards/search?q=layout%3Atoken+-type%3ACard', tokenCards, fetchedAt));
  }

  const counterCards = options.includeCounterCards === false ? [] : await fetchScryfallSearchCards(fetchImpl, 'o:/\\bcounters?\\b/');
  if (counterCards.length) {
    sourceSnapshots.push(snapshotForCards('scryfall-oracle', 'counter-oracle-search', 'https://api.scryfall.com/cards/search?q=o%3A%2F%5Cbcounters%3F%5Cb%2F', counterCards, fetchedAt));
  }

  return { fetchedAt, catalogSeed, printedTextCards: printedTextCards.cards, tokenCards, counterCards, sourceSnapshots };
}

export function buildOfficialReferenceSnapshotFromScryfall(args: {
  inputs: ScryfallReferenceInputs;
  currentTerms?: ReferenceTerm[];
  rulesCatalog?: ReferenceRulesCatalog;
  generatedAt?: string;
}): OfficialReferenceSnapshot {
  const generatedAt = args.generatedAt ?? args.inputs.fetchedAt;
  const catalogTerms = termsFromScryfallCatalogSeed(args.inputs.catalogSeed, generatedAt);
  const tokenTerms = tokenTermsFromScryfallCards(args.inputs.tokenCards, generatedAt);
  const counterTerms = counterTermsFromOracleCards(args.inputs.counterCards, generatedAt);
  const rulesTerms = args.rulesCatalog ? [...termsFromRulesCatalog(args.rulesCatalog, generatedAt), ...termsFromCurrentRules(args.rulesCatalog, [...catalogTerms, ...(args.currentTerms ?? [])], generatedAt)] : [];
  const sourceSnapshots = [...args.inputs.sourceSnapshots, ...(args.rulesCatalog?.sourceSnapshot ? [args.rulesCatalog.sourceSnapshot] : [])];
  const sourceSnapshotIdForVersions = sourceSnapshots.at(-1)?.id;
  const terms = fillMissingOfficialMetadata(applyPrintedReminderText(mergeTerms([...catalogTerms, ...tokenTerms, ...counterTerms, ...rulesTerms]), args.inputs.printedTextCards ?? []), args.currentTerms ?? []);
  return {
    version: 1,
    updatedAt: generatedAt,
    generatedAt,
    sourceSnapshots,
    terms: addVersionHistory(args.currentTerms ?? [], terms, generatedAt, sourceSnapshotIdForVersions)
  };
}

export function termsFromScryfallCatalogSeed(seed: ScryfallCatalogSeed, timestamp: string): ReferenceTerm[] {
  return buildReferenceCatalog({ scryfall: seed }).terms
    .filter((term) => term.source === 'scryfall-catalog')
    .map((term) => ({
      ...term,
      origin: 'official',
      system: 'magic',
      workflowStatus: 'final',
      createdAt: timestamp,
      updatedAt: timestamp
    }));
}

export function tokenTermsFromScryfallCards(cards: ScryfallCard[], timestamp: string): ReferenceTerm[] {
  const groups = new Map<string, ScryfallCard[]>();
  for (const card of cards.filter((candidate) => candidate.layout === 'token' || (candidate.type_line ?? '').startsWith('Token'))) {
    const key = tokenKey(card);
    groups.set(key, [...(groups.get(key) ?? []), card]);
  }
  const byBaseName = new Map<string, string[]>();
  for (const [key, group] of groups) {
    const baseName = cleanName(group[0]?.name ?? key);
    byBaseName.set(baseName, [...(byBaseName.get(baseName) ?? []), key]);
  }

  return [...groups.entries()]
    .map(([key, group]) => {
      const first = group[0];
      const baseName = cleanName(first.name);
      const duplicateName = (byBaseName.get(baseName)?.length ?? 0) > 1;
      const setCodes = unique(group.map((card) => card.set?.toUpperCase() ?? '').filter(Boolean)).sort();
      const name = duplicateName ? `${baseName} (${setCodes[0] ?? hashContent(key).slice(0, 6)})` : baseName;
      const colors = tokenColors(first);
      const typeLine = tokenTypeLine(first);
      const oracleText = tokenOracleText(first);
      const power = first.power ?? first.card_faces?.[0]?.power;
      const toughness = first.toughness ?? first.card_faces?.[0]?.toughness;
      const pt = power || toughness ? ` ${power ?? '*'}/${toughness ?? '*'}` : '';
      return createReferenceTermFromRequest(
        {
          name,
          category: 'token',
          status: 'current',
          source: 'scryfall-token',
          system: 'magic',
          origin: 'official',
          workflowStatus: 'final',
          definition: [typeLine, pt.trim(), oracleText].filter(Boolean).join('. '),
          typicalColors: colors,
          aliases: unique([baseName, typeLine, ...setCodes]).filter(Boolean),
          tags: ['token', 'scryfall-token', ...typeTags(typeLine)],
          sourceNotes: `Scryfall token cards: ${setCodes.join(', ') || 'unknown set'}`,
          details: {
            parentType: parentTypeFromTypeLine(typeLine),
            sourceSet: setCodes.join(', '),
            components: canonicalTokenSummary(first),
            typeLine,
            power,
            toughness,
            sourceUrl: first.scryfall_uri ?? first.uri
          }
        },
        timestamp
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function counterTermsFromOracleCards(cards: ScryfallCard[], timestamp: string): ReferenceTerm[] {
  const seen = new Map<string, { name: string; cards: ScryfallCard[] }>();
  for (const card of cards) {
    for (const name of extractCounterNamesFromText(tokenOracleText(card))) {
      const id = referenceTermId('counter', name);
      const entry = seen.get(id) ?? { name, cards: [] };
      entry.cards.push(card);
      seen.set(id, entry);
    }
  }

  return [...seen.entries()]
    .map(([id, entry]) => {
      const examples = entry.cards.slice(0, 5).map((card) => card.name);
      const sets = unique(entry.cards.map((card) => card.set?.toUpperCase() ?? '').filter(Boolean)).sort();
      return createReferenceTermFromRequest(
        {
          name: entry.name,
          category: 'counter',
          status: 'current',
          source: 'scryfall-oracle',
          system: 'magic',
          origin: 'official',
          workflowStatus: 'draft',
          definition: `Counter candidate found in Oracle text. Review examples: ${examples.join(', ')}.`,
          aliases: [entry.name.toLowerCase(), ...sets],
          tags: ['counter', 'oracle-scan', 'review-needed'],
          sourceNotes: `${entry.cards.length} Scryfall card examples`,
          details: {
            sourceSet: sets.join(', '),
            components: examples.join(', ')
          }
        },
        timestamp
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchScryfallBulkData(fetchImpl: typeof fetch = fetch): Promise<ScryfallBulkDataResponse> {
  return (await fetchJson<ScryfallBulkDataResponse>(fetchImpl, `${SCRYFALL_API_ROOT}/bulk-data`)).json;
}

async function fetchMtgJsonPrintedTextCards(fetchImpl: typeof fetch, fetchedAt: string): Promise<{ cards: PrintedTextCard[]; snapshot?: ReferenceSourceSnapshot }> {
  const { json, raw } = await fetchJson<MtgJsonAtomicCardsResponse>(fetchImpl, MTGJSON_ATOMIC_CARDS_URL);
  const cards = Object.values(json.data ?? {})
    .flat()
    .map((card) => printedTextCardFromMtgJson(card))
    .filter((card): card is PrintedTextCard => Boolean(card));
  const contentHash = hashContent(raw);
  return {
    cards,
    snapshot: {
      id: sourceSnapshotId('mtgjson', 'atomic-cards-printed-text', raw),
      source: 'mtgjson',
      kind: 'atomic-cards-printed-text',
      url: MTGJSON_ATOMIC_CARDS_URL,
      fetchedAt,
      upstreamUpdatedAt: json.meta?.date,
      contentHash,
      count: cards.length
    }
  };
}

function printedTextCardFromMtgJson(card: MtgJsonAtomicCard): PrintedTextCard | undefined {
  const text = cleanName(card.originalText ?? card.text);
  if (!text.includes('(')) {
    return undefined;
  }
  const name = cleanName(card.name ?? card.faceName);
  if (!name) {
    return undefined;
  }
  return {
    name,
    text,
    set: card.printings?.join(', '),
    source: 'mtgjson'
  };
}

async function fetchScryfallSearchCards(fetchImpl: typeof fetch, query: string): Promise<ScryfallCard[]> {
  const cards: ScryfallCard[] = [];
  let nextUrl = `${SCRYFALL_API_ROOT}/cards/search?${new URLSearchParams({ q: query, unique: 'cards', order: 'name' }).toString()}`;
  while (nextUrl) {
    const { json } = await fetchJson<{ data?: ScryfallCard[]; has_more?: boolean; next_page?: string }>(fetchImpl, nextUrl);
    cards.push(...(json.data ?? []));
    nextUrl = json.has_more && json.next_page ? json.next_page : '';
    if (nextUrl) {
      await sleep(150);
    }
  }
  return cards;
}

async function fetchJson<T>(fetchImpl: typeof fetch, url: string, attempt = 0): Promise<{ json: T; raw: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REFERENCE_FETCH_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'HomebrewForge/0.1 reference-sync'
      },
      signal: controller.signal
    });
    if ((response.status === 429 || response.status === 503) && attempt < 5) {
      const retryAfter = Number(response.headers.get('retry-after'));
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : (attempt + 1) * 1500);
      return fetchJson<T>(fetchImpl, url, attempt + 1);
    }
    if (!response.ok) {
      throw new Error(`Reference source request failed ${response.status}: ${url}`);
    }
    const raw = await response.text();
    return { json: JSON.parse(raw) as T, raw };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Reference source request timed out after ${REFERENCE_FETCH_TIMEOUT_MS / 1000}s: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function termsFromCurrentRules(catalog: ReferenceRulesCatalog, currentTerms: ReferenceTerm[], timestamp: string): ReferenceTerm[] {
  if (!currentTerms.length) {
    return [];
  }
  const glossaryByTitle = new Map(
    catalog.entries
      .filter((entry) => entry.kind === 'glossary')
      .map((entry) => [normalizeRuleKey(entry.title), entry])
  );
  const numberedByTitle = new Map(
    catalog.entries
      .filter((entry) => entry.number && (entry.kind === 'keyword-action' || entry.kind === 'keyword-ability'))
      .map((entry) => [normalizeRuleKey(entry.title), entry])
  );
  const enriched: ReferenceTerm[] = [];

  for (const term of currentTerms) {
    const key = normalizeRuleKey(term.name);
    const entry = glossaryByTitle.get(key) ?? numberedByTitle.get(key);
    if (!entry?.text) {
      continue;
    }
    const ruleNumber = ruleNumberForEntry(entry, numberedByTitle.get(key));
    enriched.push({
      ...term,
      status: 'current',
      source: 'wizards-rules',
      system: 'magic',
      origin: 'official',
      workflowStatus: 'final',
      definition: entry.text,
      sourceNotes: `Comprehensive Rules ${ruleNumber ?? entry.number ?? entry.title}`,
      details: {
        ...term.details,
        ruleNumber: ruleNumber ?? term.details?.ruleNumber,
        sourceUrl: entry.sourceUrl
      },
      createdAt: term.createdAt ?? timestamp,
      updatedAt: timestamp,
      aliases: unique([...term.aliases, entry.number ?? '', ruleNumber ?? ''].filter(Boolean)),
      tags: unique([...term.tags, 'rules'])
    });
  }

  return enriched;
}

function ruleNumberForEntry(entry: ReferenceRuleEntry, relatedRule: ReferenceRuleEntry | undefined): string | undefined {
  return entry.number ?? entry.text.match(/\brule\s+([0-9]+(?:\.[0-9]+)*[a-z]?)/i)?.[1] ?? relatedRule?.number;
}

function normalizeRuleKey(value: string | undefined): string {
  return cleanName(value)
    .toLowerCase()
    .replace(/\s+\[[^\]]+\]/g, '')
    .replace(/\s+n\b/g, '')
    .replace(/\s+x\b/g, '')
    .replace(/[^a-z0-9+/-]+/g, ' ')
    .trim();
}

function mergeTerms(terms: ReferenceTerm[]): ReferenceTerm[] {
  const merged = new Map<string, ReferenceTerm>();
  for (const term of terms) {
    const existing = merged.get(term.id);
    merged.set(
      term.id,
      existing
        ? {
            ...existing,
            ...term,
            definition: term.definition ?? existing.definition,
            reminderText: term.reminderText ?? existing.reminderText,
            typicalColors: term.typicalColors?.length ? term.typicalColors : existing.typicalColors,
            sourceNotes: term.sourceNotes ?? existing.sourceNotes,
            details: mergeDetails(existing.details, term.details),
            aliases: unique([...existing.aliases, ...term.aliases]),
            tags: unique([...existing.tags, ...term.tags]),
            versions: [...(existing.versions ?? []), ...(term.versions ?? [])]
          }
        : term
    );
  }
  return [...merged.values()].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

const REMINDER_TEXT_CATEGORIES: ReferenceCategory[] = ['keyword-ability', 'keyword-action', 'token', 'counter'];

function applyPrintedReminderText(terms: ReferenceTerm[], cards: PrintedTextCard[]): ReferenceTerm[] {
  if (!cards.length) {
    return terms;
  }
  const reminderTextByTerm = collectPrintedReminderText(terms, cards);
  if (!reminderTextByTerm.size) {
    return terms;
  }
  return terms.map((term) => {
    const reminderText = reminderTextByTerm.get(term.id);
    if (!reminderText || term.reminderText) {
      return term;
    }
    return {
      ...term,
      reminderText,
      tags: unique([...term.tags, 'reminder-text', 'mtgjson-reminder-text'])
    };
  });
}

function collectPrintedReminderText(terms: ReferenceTerm[], cards: PrintedTextCard[]): Map<string, string> {
  const { aliases, maxAliasWords } = buildReminderAliasIndex(terms);
  const counts = new Map<string, Map<string, number>>();

  for (const card of cards) {
    const text = printedCardText(card);
    if (!text.includes('(')) {
      continue;
    }
    const parentheticalPattern = /\(([^()]*)\)/g;
    let match: RegExpExecArray | null;
    while ((match = parentheticalPattern.exec(text))) {
      const reminderText = cleanName(match[1]);
      if (!reminderText || reminderText.length < 8) {
        continue;
      }
      const prefix = stripPrintedReminderPrefix(text.slice(Math.max(0, match.index - 180), match.index));
      for (const alias of reminderPrefixCandidates(prefix, maxAliasWords)) {
        for (const term of aliases.get(alias) ?? []) {
          const termCounts = counts.get(term.id) ?? new Map<string, number>();
          termCounts.set(reminderText, (termCounts.get(reminderText) ?? 0) + 1);
          counts.set(term.id, termCounts);
        }
      }
    }
  }

  const reminders = new Map<string, string>();
  for (const [termId, termCounts] of counts) {
    const [best] = [...termCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length || a[0].localeCompare(b[0]));
    if (best?.[0]) {
      reminders.set(termId, best[0]);
    }
  }
  return reminders;
}

function printedCardText(card: PrintedTextCard): string {
  return cleanName(card.text);
}

function buildReminderAliasIndex(terms: ReferenceTerm[]): { aliases: Map<string, ReferenceTerm[]>; maxAliasWords: number } {
  const aliases = new Map<string, ReferenceTerm[]>();
  let maxAliasWords = 1;
  for (const term of terms.filter((candidate) => REMINDER_TEXT_CATEGORIES.includes(candidate.category))) {
    for (const alias of reminderAliasesForTerm(term)) {
      const normalized = normalizeReminderAlias(alias);
      if (!normalized) {
        continue;
      }
      aliases.set(normalized, unique([...(aliases.get(normalized) ?? []), term]));
      maxAliasWords = Math.max(maxAliasWords, normalized.split(/\s+/).length);
    }
  }
  return { aliases, maxAliasWords };
}

function reminderAliasesForTerm(term: ReferenceTerm): string[] {
  const aliases = unique([term.name, ...term.aliases]);
  const trimmedAliases =
    term.category === 'counter' || term.category === 'token'
      ? aliases.map((alias) => alias.replace(/\s+(?:counters?|tokens?)$/i, '').trim())
      : [];
  return unique([...aliases, ...trimmedAliases])
    .map((alias) => cleanName(alias))
    .filter((alias) => /[A-Za-z]/.test(alias) && alias.length >= 3 && !/^[A-Z0-9]{2,6}$/.test(alias))
    .sort((a, b) => b.length - a.length);
}

function stripPrintedReminderPrefix(value: string): string {
  let prefix = normalizeReminderAlias(value)
    .replace(/\b(?:counters?|tokens?)\b.*$/i, '')
    .replace(/\b(?:card|cards)\b.*$/i, '')
    .trim();
  let previous = '';
  while (prefix && prefix !== previous) {
    previous = prefix;
    prefix = prefix
      .replace(/\s+(?:x|\d+|\[[^\]]+\]|\{[^}]+\})$/i, '')
      .replace(/\s+(?:a|an|the|this|that|these|those)$/i, '')
      .replace(/\s+(?:-|and|or|\/)$/i, '')
      .trim();
  }
  return prefix;
}

function reminderPrefixCandidates(prefix: string, maxAliasWords: number): string[] {
  const words = prefix.split(/\s+/).filter(Boolean);
  const candidates: string[] = [];
  for (let length = Math.min(maxAliasWords, words.length); length >= 1; length -= 1) {
    candidates.push(words.slice(words.length - length).join(' '));
  }
  return unique(candidates);
}

function normalizeReminderAlias(value: string | undefined): string {
  return cleanName(value)
    .toLowerCase()
    .replace(/[^a-z0-9+/-]+/g, ' ')
    .trim();
}

function fillMissingOfficialMetadata(terms: ReferenceTerm[], currentTerms: ReferenceTerm[]): ReferenceTerm[] {
  const currentById = new Map(currentTerms.map((term) => [term.id, term]));
  return terms.map((term) => {
    const current = currentById.get(term.id);
    const parentType = term.details?.parentType ?? current?.details?.parentType ?? parentTypeFromTags(term.tags);
    const details = mergeDetails(current?.details, {
      ...term.details,
      parentType
    });
    const generatedDefinition = generatedDefinitionForTerm(term, parentType);
    const currentDefinition =
      current?.tags.includes('metadata-derived') && generatedDefinition ? generatedDefinition : current?.definition;
    return {
      ...term,
      definition: term.definition ?? currentDefinition ?? generatedDefinition,
      reminderText: term.reminderText ?? current?.reminderText,
      typicalColors: term.typicalColors?.length ? term.typicalColors : current?.typicalColors,
      sourceNotes: term.sourceNotes ?? current?.sourceNotes,
      details,
      aliases: unique([...(current?.aliases ?? []), ...term.aliases, current?.name ?? '', term.name].filter(Boolean)),
      tags: unique([...(current?.tags ?? []), ...term.tags, term.definition || current?.definition ? 'metadata-filled' : 'metadata-derived'])
    };
  });
}

function generatedDefinitionForTerm(term: ReferenceTerm, parentType: string | undefined): string | undefined {
  if (term.category === 'ability-word') {
    return 'An ability word. Ability words have no rules meaning; they group cards with similar functionality.';
  }
  if (term.category === 'subtype') {
    return parentType ? `${indefiniteArticle(parentType)} ${parentType.toLowerCase()} subtype.` : 'A Magic subtype.';
  }
  if (term.category === 'supertype') {
    return 'A Magic supertype.';
  }
  if (term.category === 'card-type') {
    return 'A Magic card type.';
  }
  if (term.category === 'keyword-ability') {
    return 'A Magic keyword ability.';
  }
  if (term.category === 'keyword-action') {
    return 'A Magic keyword action.';
  }
  if (term.category === 'counter') {
    return 'A counter type used by Magic cards or rules.';
  }
  if (term.category === 'token') {
    return 'A token template used by Magic cards or rules.';
  }
  return undefined;
}

function indefiniteArticle(value: string): 'A' | 'An' {
  return /^[aeiou]/i.test(value.trim()) ? 'An' : 'A';
}

function parentTypeFromTags(tags: string[]): string | undefined {
  const parent = tags.find((tag) => ['artifact', 'battle', 'creature', 'enchantment', 'land', 'planeswalker', 'spell'].includes(tag));
  return parent ? parent[0].toUpperCase() + parent.slice(1) : undefined;
}

function mergeDetails(existing: ReferenceTerm['details'], next: ReferenceTerm['details']): ReferenceTerm['details'] {
  if (!existing && !next) {
    return undefined;
  }
  return {
    parentType: next?.parentType ?? existing?.parentType,
    ruleNumber: next?.ruleNumber ?? existing?.ruleNumber,
    sourceSet: next?.sourceSet ?? existing?.sourceSet,
    components: next?.components ?? existing?.components,
    designNotes: next?.designNotes ?? existing?.designNotes,
    typeLine: next?.typeLine ?? existing?.typeLine,
    power: next?.power ?? existing?.power,
    toughness: next?.toughness ?? existing?.toughness,
    sourceUrl: next?.sourceUrl ?? existing?.sourceUrl
  };
}

function tokenKey(card: ScryfallCard): string {
  return [cleanName(card.name), tokenTypeLine(card), tokenOracleText(card), tokenColors(card).join(''), card.power ?? '', card.toughness ?? ''].join('|').toLowerCase();
}

function tokenTypeLine(card: ScryfallCard): string {
  return cleanName(card.type_line ?? card.card_faces?.map((face) => face.type_line).filter(Boolean).join(' // ') ?? '');
}

function tokenOracleText(card: ScryfallCard): string {
  return cleanName(card.oracle_text ?? card.card_faces?.map((face) => face.oracle_text).filter(Boolean).join('\n') ?? '');
}

function tokenColors(card: ScryfallCard): string[] {
  return unique([...(card.colors ?? []), ...(card.card_faces?.flatMap((face) => face.colors ?? []) ?? []), ...(card.color_identity ?? [])])
    .map((color) => color.toUpperCase())
    .filter((color) => ['W', 'U', 'B', 'R', 'G', 'C'].includes(color));
}

function canonicalTokenSummary(card: ScryfallCard): string {
  return [tokenColors(card).join('') || 'colorless', tokenTypeLine(card), card.power || card.toughness ? `${card.power ?? '*'}/${card.toughness ?? '*'}` : '', tokenOracleText(card)]
    .filter(Boolean)
    .join(' | ');
}

function parentTypeFromTypeLine(typeLine: string): string | undefined {
  const left = typeLine.replace(/^Token\s+/, '').split(/[—-]/)[0]?.trim();
  return left || undefined;
}

function typeTags(typeLine: string): string[] {
  return typeLine
    .toLowerCase()
    .replace(/^token\s+/, '')
    .split(/[^a-z0-9]+/)
    .filter((value) => value.length > 2)
    .slice(0, 8);
}

function snapshotForCards(source: 'scryfall-token' | 'scryfall-oracle', kind: string, url: string, cards: ScryfallCard[], fetchedAt: string): ReferenceSourceSnapshot {
  const raw = JSON.stringify(cards.map((card) => [card.id, card.name, card.type_line, card.oracle_text, card.set]));
  return {
    id: sourceSnapshotId(source, kind, raw),
    source,
    kind,
    url,
    fetchedAt,
    contentHash: hashContent(raw),
    count: cards.length
  };
}

function cleanName(value: string | undefined): string {
  return String(value ?? '').replace(/[‐‑‒–—]/g, '-').replace(/\s+/g, ' ').trim();
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

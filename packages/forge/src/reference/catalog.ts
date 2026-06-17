export const REFERENCE_CATEGORIES = [
  'supertype',
  'card-type',
  'subtype',
  'keyword-ability',
  'ability-word',
  'keyword-action',
  'action-phrase',
  'token',
  'counter',
  'mana-color',
  'frame',
  'homebrew'
] as const;

export type ReferenceCategory = (typeof REFERENCE_CATEGORIES)[number];
export type ReferenceStatus = 'current' | 'legacy' | 'retired' | 'casual' | 'homebrew';
export type ReferenceSource =
  | 'drive-sheet'
  | 'scryfall-catalog'
  | 'scryfall-token'
  | 'scryfall-oracle'
  | 'wizards-rules'
  | 'mtgjson'
  | 'official-snapshot'
  | 'homebrew-forge'
  | 'cockatrice-customset'
  | 'local-custom';
export type ReferenceSystem = 'magic' | 'homebrew' | (string & {});
export type ReferenceOrigin = 'official' | 'homebrew';
export type ReferenceWorkflowStatus = 'draft' | 'final';

export interface ReferenceTermDetails {
  parentType?: string;
  ruleNumber?: string;
  sourceSet?: string;
  components?: string;
  designNotes?: string;
  typeLine?: string;
  power?: string;
  toughness?: string;
  sourceUrl?: string;
}

export interface ReferenceTermVersion {
  changedAt: string;
  source: ReferenceSource;
  sourceSnapshotId?: string;
  status?: ReferenceStatus;
  definition?: string;
  reminderText?: string;
  details?: ReferenceTermDetails;
}

export interface ReferenceSourceSnapshot {
  id: string;
  source: ReferenceSource | (string & {});
  kind: string;
  url: string;
  fetchedAt: string;
  upstreamUpdatedAt?: string;
  effectiveDate?: string;
  contentHash?: string;
  count?: number;
}

export type ReferenceRuleKind = 'section' | 'keyword-action' | 'keyword-ability' | 'predefined-token' | 'counter-rule' | 'glossary';

export interface ReferenceRuleEntry {
  id: string;
  kind: ReferenceRuleKind;
  number?: string;
  title: string;
  text: string;
  sourceUrl: string;
  effectiveDate?: string;
  relatedTermIds: string[];
}

export interface ReferenceRulesCatalog {
  version: 1;
  updatedAt: string;
  effectiveDate?: string;
  sourceUrl: string;
  sourceSnapshot?: ReferenceSourceSnapshot;
  entries: ReferenceRuleEntry[];
}

export interface ReferenceTerm {
  id: string;
  name: string;
  category: ReferenceCategory;
  status: ReferenceStatus;
  source: ReferenceSource;
  system: ReferenceSystem;
  origin: ReferenceOrigin;
  workflowStatus: ReferenceWorkflowStatus;
  definition?: string;
  reminderText?: string;
  typicalColors?: string[];
  sourceNotes?: string;
  details?: ReferenceTermDetails;
  createdAt?: string;
  updatedAt?: string;
  versions?: ReferenceTermVersion[];
  aliases: string[];
  tags: string[];
}

export interface ReferenceCatalog {
  terms: ReferenceTerm[];
  updatedAt: string;
  sources: Array<{ id: ReferenceSource; label: string; url?: string }>;
  sourceSnapshots?: ReferenceSourceSnapshot[];
  rules?: ReferenceRulesCatalog;
}

export interface CreateReferenceRequest {
  name?: string;
  category?: ReferenceCategory;
  status?: ReferenceStatus;
  source?: ReferenceSource;
  system?: ReferenceSystem;
  origin?: ReferenceOrigin;
  workflowStatus?: ReferenceWorkflowStatus;
  definition?: string;
  reminderText?: string;
  typicalColors?: string[];
  aliases?: string[];
  tags?: string[];
  sourceNotes?: string;
  details?: ReferenceTermDetails;
  versions?: ReferenceTermVersion[];
}

export interface CreateReferenceResult {
  term: ReferenceTerm;
  catalog: ReferenceCatalog;
}

export interface ReferenceSeedRow {
  sheet: string;
  values: Record<string, string | undefined>;
}

export interface ScryfallCatalogSeed {
  supertypes?: string[];
  cardTypes?: string[];
  artifactTypes?: string[];
  battleTypes?: string[];
  creatureTypes?: string[];
  enchantmentTypes?: string[];
  landTypes?: string[];
  planeswalkerTypes?: string[];
  spellTypes?: string[];
  keywordAbilities?: string[];
  keywordActions?: string[];
  abilityWords?: string[];
}

type ReferenceTermSeedInput = Omit<ReferenceTerm, 'id' | 'aliases' | 'tags' | 'system' | 'origin' | 'workflowStatus'> &
  Partial<Pick<ReferenceTerm, 'system' | 'origin' | 'workflowStatus'>> & {
    aliases?: string[];
    tags?: string[];
  };

export interface ReferenceSearchFilters {
  categories?: ReferenceCategory[];
  limit?: number;
}

export interface RulesLintSubject {
  name: string;
  typeLine: string;
  cardTypes: string[];
  subtypes: string;
  oracleText: string;
}

export interface RulesLintFinding {
  ruleId: string;
  severity: 'warning' | 'note';
  message: string;
  term?: string;
}

export function loadReferenceCatalog(_rootDir?: string): ReferenceCatalog {
  return defaultReferenceCatalog();
}

export function defaultReferenceCatalog(): ReferenceCatalog {
  return buildReferenceCatalog({
    seedRows: DEFAULT_DRIVE_SEED_ROWS,
    scryfall: DEFAULT_SCRYFALL_CATALOG,
    homebrewTerms: DEFAULT_HOMEBREW_TERMS
  });
}

export function buildReferenceCatalog(args: {
  seedRows?: ReferenceSeedRow[];
  scryfall?: ScryfallCatalogSeed;
  homebrewTerms?: Array<Pick<ReferenceTerm, 'name' | 'category' | 'definition' | 'status'> & Partial<ReferenceTerm>>;
}): ReferenceCatalog {
  const terms = new Map<string, ReferenceTerm>();
  const add = (term: ReferenceTermSeedInput) => {
    const normalizedName = cleanName(term.name);
    if (!normalizedName) {
      return;
    }
    const category = term.category;
    const id = referenceTermId(category, normalizedName);
    const existing = terms.get(id);
    const template = existing ?? findAliasEquivalentTerm(terms, category, normalizedName);
    const incomingDefinition = cleanOptional(term.definition);
    const incomingReminderText = cleanOptional(term.reminderText);
    const incomingSourceNotes = cleanOptional(term.sourceNotes);
    const incomingDetails = cleanReferenceDetails(term.details);
    const details = incomingDetails ?? template?.details;
    const source = existing && !(incomingDefinition || incomingReminderText || incomingDetails) ? existing.source : term.source;
    const next: ReferenceTerm = {
      id,
      name: normalizedName,
      category,
      status: term.status,
      source,
      system: term.system ?? defaultSystemFor(term),
      origin: term.origin ?? defaultOriginFor(term),
      workflowStatus: term.workflowStatus ?? 'final',
      definition: incomingDefinition ?? template?.definition,
      reminderText: incomingReminderText ?? template?.reminderText,
      typicalColors: term.typicalColors?.length ? term.typicalColors : template?.typicalColors,
      sourceNotes: incomingSourceNotes ?? template?.sourceNotes,
      details,
      createdAt: cleanOptional(term.createdAt),
      updatedAt: cleanOptional(term.updatedAt),
      versions: cleanReferenceVersions(term.versions) ?? template?.versions,
      aliases: unique([...(template?.aliases ?? []), ...(term.aliases ?? []), ...aliasesForName(normalizedName)]),
      tags: unique([...(template?.tags ?? []), ...(term.tags ?? [])])
    };
    terms.set(id, existing ? mergeReferenceTermRecords(existing, next) : next);
  };

  for (const row of args.seedRows ?? []) {
    const term = termFromSeedRow(row);
    if (term) {
      add(term);
    }
  }

  addCatalogValues(add, args.scryfall ?? {});

  for (const term of args.homebrewTerms ?? []) {
    add({
      name: term.name,
      category: term.category,
      status: term.status ?? 'homebrew',
      source: term.source ?? 'homebrew-forge',
      definition: term.definition,
      reminderText: term.reminderText,
      typicalColors: term.typicalColors,
      aliases: term.aliases,
      tags: ['homebrew', ...(term.tags ?? [])]
    });
  }

  return {
    terms: [...terms.values()],
    updatedAt: '2026-06-02',
    sources: [
      {
        id: 'drive-sheet',
        label: 'Official Magic the Gathering Resources and Referances',
        url: 'https://docs.google.com/spreadsheets/d/1F4APCAvs_3LpuEVTFaTORQ0G_SJyIMHMf5GxP_8ezyk/edit'
      },
      { id: 'scryfall-catalog', label: 'Official Magic catalog', url: 'https://scryfall.com/docs/api/catalogs' },
      { id: 'scryfall-token', label: 'Scryfall token cards', url: 'https://scryfall.com/search?q=layout%3Atoken' },
      { id: 'scryfall-oracle', label: 'Scryfall Oracle search', url: 'https://scryfall.com/docs/api/cards/search' },
      { id: 'wizards-rules', label: 'Wizards Comprehensive Rules', url: 'https://magic.wizards.com/rules' },
      { id: 'mtgjson', label: 'MTGJSON data files', url: 'https://mtgjson.com' },
      { id: 'official-snapshot', label: 'Reviewed official Homebrew Forge snapshot' },
      { id: 'homebrew-forge', label: 'Homebrew Forge included reference' },
      { id: 'cockatrice-customset', label: 'Local Cockatrice custom sets' },
      { id: 'local-custom', label: 'Local custom references' }
    ]
  };
}

export function createReferenceTermFromRequest(request: CreateReferenceRequest, timestamp = new Date().toISOString()): ReferenceTerm {
  const name = cleanName(request.name);
  if (!name) {
    throw new Error('Reference name is required.');
  }
  const category = request.category;
  if (!category || !isReferenceCategory(category)) {
    throw new Error('Choose a valid reference category.');
  }
  const origin = request.origin ?? 'homebrew';
  const system = request.system ?? (origin === 'homebrew' ? 'homebrew' : 'magic');
  const status = request.status ?? (origin === 'homebrew' ? 'homebrew' : 'current');
  const workflowStatus = request.workflowStatus ?? 'draft';
  const tags = unique([
    ...cleanList(request.tags),
    origin,
    system === 'homebrew' ? 'homebrew' : ''
  ].filter(Boolean));
  return {
    id: referenceTermId(category, name),
    name,
    category,
    status,
    source: request.source ?? 'local-custom',
    system,
    origin,
    workflowStatus,
    definition: cleanOptional(request.definition),
    reminderText: cleanOptional(request.reminderText),
    typicalColors: cleanColors(request.typicalColors),
    sourceNotes: cleanOptional(request.sourceNotes),
    details: cleanReferenceDetails(request.details),
    createdAt: timestamp,
    updatedAt: timestamp,
    versions: cleanReferenceVersions(request.versions),
    aliases: unique([...cleanList(request.aliases), ...aliasesForName(name)]),
    tags
  };
}

export function mergeReferenceCatalogs(base: ReferenceCatalog, incoming: ReferenceCatalog, updatedAt = incoming.updatedAt): ReferenceCatalog {
  const terms = new Map(base.terms.map((term) => [term.id, term]));
  for (const term of incoming.terms) {
    const normalized = createReferenceTermFromRequest(term, term.updatedAt ?? updatedAt);
    const existing = terms.get(normalized.id);
    terms.set(
      normalized.id,
      existing
        ? mergeReferenceTermRecords(existing, normalized)
        : normalized
    );
  }

  const sources = new Map<ReferenceSource, { id: ReferenceSource; label: string; url?: string }>();
  for (const source of [...base.sources, ...incoming.sources]) {
    sources.set(source.id, source);
  }

  return {
    ...base,
    terms: [...terms.values()],
    updatedAt,
    sources: [...sources.values()],
    sourceSnapshots: [...(base.sourceSnapshots ?? []), ...(incoming.sourceSnapshots ?? [])],
    rules: incoming.rules ?? base.rules
  };
}

export function mergeReferenceTerms(catalog: ReferenceCatalog, customTerms: ReferenceTerm[], updatedAt = new Date().toISOString()): ReferenceCatalog {
  if (!customTerms.length) {
    return catalog;
  }
  const terms = new Map(catalog.terms.map((term) => [term.id, term]));
  for (const term of customTerms) {
    const normalized = createReferenceTermFromRequest(term, term.updatedAt ?? updatedAt);
    const next = {
      ...normalized,
      createdAt: term.createdAt ?? normalized.createdAt,
      updatedAt: term.updatedAt ?? normalized.updatedAt
    };
    const existing = terms.get(normalized.id);
    terms.set(normalized.id, existing ? mergeReferenceTermRecords(existing, next) : next);
  }
  return {
    ...catalog,
    terms: [...terms.values()],
    updatedAt,
    sources: catalog.sources.some((source) => source.id === 'local-custom')
      ? catalog.sources
      : [...catalog.sources, { id: 'local-custom', label: 'Local custom references' }]
  };
}

export function isReferenceCategory(value: string): value is ReferenceCategory {
  return (REFERENCE_CATEGORIES as readonly string[]).includes(value);
}

export function referenceTermId(category: ReferenceCategory, name: string): string {
  return `${category}:${normalizeSearch(canonicalReferenceNameForId(name)).replace(/\s+/g, '-')}`;
}

export function referenceOptionsForCategory(catalog: ReferenceCatalog, category: ReferenceCategory): string[] {
  return catalog.terms.filter((term) => term.category === category).map((term) => term.name);
}

export function searchReferenceTerms(catalog: ReferenceCatalog, query: string, filters: ReferenceSearchFilters = {}): ReferenceTerm[] {
  const needle = normalizeSearch(query);
  const categories = filters.categories ? new Set(filters.categories) : undefined;
  const scored = catalog.terms
    .filter((term) => !categories || categories.has(term.category))
    .map((term) => ({ term, score: scoreTerm(term, needle) }))
    .filter((item) => item.score > 0 || !needle)
    .sort((a, b) => b.score - a.score || categoryWeight(a.term.category) - categoryWeight(b.term.category) || a.term.name.localeCompare(b.term.name));
  return scored.slice(0, filters.limit ?? 40).map((item) => item.term);
}

export function termsForTrigger(catalog: ReferenceCatalog, trigger: string, query: string): ReferenceTerm[] {
  const categories = triggerCategories(trigger);
  if (!categories.length) {
    return [];
  }
  const results = searchReferenceTerms(catalog, query, { categories, limit: 16 });
  const needle = normalizeSearch(query);
  const templateMatches = results.filter((term) => term.source === 'drive-sheet' && term.aliases.some((alias) => normalizeSearch(alias) === needle));
  return templateMatches.length ? templateMatches : results;
}

export function triggerCategories(trigger: string): ReferenceCategory[] {
  if (trigger === '@') {
    return ['keyword-ability', 'ability-word', 'homebrew'];
  }
  if (trigger === '#') {
    return ['keyword-action', 'action-phrase'];
  }
  if (trigger === ':') {
    return ['supertype', 'card-type', 'subtype', 'token', 'counter'];
  }
  return [];
}

export type ReferenceLinkField = 'oracleText' | 'flavorText' | 'typeLine' | 'manaCost';

export interface ReferenceCardLinkCandidate {
  id: string;
  name: string;
  typeLine?: string;
  setCode?: string;
}

export interface ExtractedReferenceLink {
  id: string;
  kind: 'reference-term' | 'card';
  label: string;
  category: ReferenceCategory | 'card';
  sourceField: ReferenceLinkField;
  matchedText: string;
  start: number;
  end: number;
  status?: ReferenceTerm['status'];
  workflowStatus?: ReferenceTerm['workflowStatus'];
  source?: ReferenceTerm['source'];
}

export function extractReferenceLinks(args: {
  catalog: ReferenceCatalog;
  textByField: Partial<Record<ReferenceLinkField, string>>;
  cards?: ReferenceCardLinkCandidate[];
  categories?: ReferenceCategory[];
  limit?: number;
}): ExtractedReferenceLink[] {
  const categories = new Set(args.categories ?? ['keyword-ability', 'ability-word', 'keyword-action', 'action-phrase', 'supertype', 'card-type', 'subtype', 'token', 'counter', 'homebrew']);
  const links: ExtractedReferenceLink[] = [];
  const seen = new Set<string>();
  const fields = Object.entries(args.textByField) as Array<[ReferenceLinkField, string | undefined]>;
  const terms = args.catalog.terms
    .filter((term) => categories.has(term.category))
    .map((term) => ({ term, aliases: usableLinkAliasesForTerm(term) }))
    .filter((matcher) => matcher.aliases.length)
    .sort((a, b) => longestAlias(b.aliases) - longestAlias(a.aliases));
  const cards = usableCardLinkCandidates(args.cards ?? []);

  for (const [sourceField, text] of fields) {
    const sourceText = String(text ?? '');
    if (!sourceText.trim()) {
      continue;
    }
    for (const { term, aliases } of terms) {
      const match = findFirstAliasMatch(sourceText, aliases);
      if (!match) {
        continue;
      }
      const key = `reference-term:${term.id}:${sourceField}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      links.push({
        id: term.id,
        kind: 'reference-term',
        label: term.name,
        category: term.category,
        sourceField,
        matchedText: match.text,
        start: match.start,
        end: match.end,
        status: term.status,
        workflowStatus: term.workflowStatus,
        source: term.source
      });
    }
    for (const card of cards) {
      const match = findFirstAliasMatch(sourceText, [card.name]);
      if (!match) {
        continue;
      }
      const key = `card:${card.id}:${sourceField}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      links.push({
        id: card.id,
        kind: 'card',
        label: card.name,
        category: 'card',
        sourceField,
        matchedText: match.text,
        start: match.start,
        end: match.end
      });
    }
  }

  return links.sort((a, b) => fieldWeight(a.sourceField) - fieldWeight(b.sourceField) || a.start - b.start || a.label.localeCompare(b.label)).slice(0, args.limit ?? 24);
}

export function lintRulesText(subject: RulesLintSubject, catalog: ReferenceCatalog): RulesLintFinding[] {
  const findings: RulesLintFinding[] = [];
  const subtypes = wordSet(subject.subtypes);
  const text = subject.oracleText.toLowerCase();

  if (subtypes.has('aura') && !/\benchant\b/i.test(subject.oracleText)) {
    findings.push({ ruleId: 'aura-has-enchant', severity: 'warning', message: 'Aura cards usually need an "Enchant ..." line.' });
  }
  if ((subtypes.has('equipment') || subtypes.has('fortification')) && !/\b(equip|reconfigure|fortify|attach|for mirrodin)\b/i.test(subject.oracleText)) {
    findings.push({ ruleId: 'equipment-has-attachment', severity: 'warning', message: 'Equipment and Fortifications usually need equip, reconfigure, fortify, attach, or token-attach text.' });
  }
  if ((subtypes.has('vehicle') || subtypes.has('mount')) && !/\b(crew|saddle|living metal)\b/i.test(subject.oracleText)) {
    findings.push({ ruleId: 'vehicle-has-crew', severity: 'warning', message: 'Vehicles and Mounts usually need crew, saddle, or an equivalent animation rule.' });
  }
  if (subject.cardTypes.includes('Battle') && !/\b(defense|defeated|protects|siege)\b/i.test(subject.oracleText)) {
    findings.push({ ruleId: 'battle-has-defense', severity: 'note', message: 'Battles usually need clear defense/protection or defeat handling.' });
  }

  for (const term of catalog.terms) {
    if ((term.status === 'legacy' || term.status === 'retired') && text.includes(term.name.toLowerCase())) {
      findings.push({ ruleId: 'legacy-term', severity: 'note', message: `${term.name} is marked ${term.status}; keep it only if intentional.`, term: term.name });
    }
  }

  return findings;
}

function addCatalogValues(add: (term: ReferenceTermSeedInput) => void, catalog: ScryfallCatalogSeed): void {
  addValues(add, catalog.supertypes, 'supertype', ['type-line']);
  addValues(add, catalog.cardTypes, 'card-type', ['type-line']);
  addValues(add, catalog.artifactTypes, 'subtype', ['artifact']);
  addValues(add, catalog.battleTypes, 'subtype', ['battle']);
  addValues(add, catalog.creatureTypes, 'subtype', ['creature']);
  addValues(add, catalog.enchantmentTypes, 'subtype', ['enchantment']);
  addValues(add, catalog.landTypes, 'subtype', ['land']);
  addValues(add, catalog.planeswalkerTypes, 'subtype', ['planeswalker']);
  addValues(add, catalog.spellTypes, 'subtype', ['spell']);
  addValues(add, catalog.keywordAbilities, 'keyword-ability', ['keyword']);
  addValues(add, catalog.keywordActions, 'keyword-action', ['action']);
  addValues(add, catalog.abilityWords, 'ability-word', ['ability-word']);
}

function addValues(
  add: (term: ReferenceTermSeedInput) => void,
  values: string[] | undefined,
  category: ReferenceCategory,
  tags: string[]
): void {
  const parentType = parentTypeFromCatalogTags(tags);
  const definition = fallbackDefinitionForCatalogTerm(category, parentType);
  for (const name of values ?? []) {
    add({
      name,
      category,
      status: currentStatusFor(name),
      source: 'scryfall-catalog',
      definition,
      details: parentType ? { parentType } : undefined,
      tags: definition ? [...tags, 'metadata-derived'] : tags
    });
  }
}

function fallbackDefinitionForCatalogTerm(category: ReferenceCategory, parentType: string | undefined): string | undefined {
  if (category === 'subtype') {
    return parentType ? `${indefiniteArticle(parentType)} ${parentType.toLowerCase()} subtype.` : 'A Magic subtype.';
  }
  if (category === 'supertype') {
    return 'A Magic supertype.';
  }
  if (category === 'card-type') {
    return 'A Magic card type.';
  }
  if (category === 'keyword-ability') {
    return 'A Magic keyword ability.';
  }
  if (category === 'keyword-action') {
    return 'A Magic keyword action.';
  }
  if (category === 'ability-word') {
    return 'An ability word. Ability words have no rules meaning; they group cards with similar functionality.';
  }
  return undefined;
}

function parentTypeFromCatalogTags(tags: string[]): string | undefined {
  const parent = tags.find((tag) => ['artifact', 'battle', 'creature', 'enchantment', 'land', 'planeswalker', 'spell'].includes(tag));
  return parent ? parent[0].toUpperCase() + parent.slice(1) : undefined;
}

function indefiniteArticle(value: string): 'A' | 'An' {
  return /^[aeiou]/i.test(value.trim()) ? 'An' : 'A';
}

function termFromSeedRow(row: ReferenceSeedRow): ReferenceTermSeedInput | undefined {
  const sheet = row.sheet.toLowerCase();
  const values = row.values;
  if (sheet.includes('keyword abilities')) {
    const name = values.Keyword;
    return name ? seedTerm(name, 'keyword-ability', values.Definition, values['Typical Colors'], values.Number, ['keyword']) : undefined;
  }
  if (sheet.includes('keyword actions')) {
    const name = values.Keyword;
    return name ? seedTerm(name, 'keyword-action', values.Definition, values['Typical Colors'], values.Number, ['action']) : undefined;
  }
  if (sheet.includes('card types')) {
    const name = values['Card Type'];
    return name ? seedTerm(name, 'card-type', values['One-Sentence Definition'], undefined, undefined, ['type-line']) : undefined;
  }
  if (sheet.includes('subtypes')) {
    const name = values.Subtype;
    return name
      ? seedTerm(name, 'subtype', values['Short description'], values['Common colors'] ?? values['Typical color identity'], undefined, [cleanName(values['Main type'] ?? '').toLowerCase()].filter(Boolean), {
          parentType: values['Main type']
        })
      : undefined;
  }
  if (sheet.includes('token')) {
    const name = values.Token;
    return name ? seedTerm(name, 'token', values.Definition, values['Typical Colors'], undefined, ['token']) : undefined;
  }
  if (sheet.includes('counter')) {
    const name = values.Counter;
    return name ? seedTerm(name, 'counter', values.Definition, values['Typical Colors'], undefined, ['counter']) : undefined;
  }
  if (sheet.includes('mana')) {
    const name = values.Color;
    return name ? seedTerm(name, 'mana-color', values['One-Sentence Identity'], undefined, undefined, ['mana']) : undefined;
  }
  return undefined;
}

function seedTerm(
  name: string,
  category: ReferenceCategory,
  definition?: string,
  colors?: string,
  ruleNumber?: string,
  tags: string[] = [],
  details?: ReferenceTermDetails
): ReferenceTermSeedInput {
  return {
    name,
    category,
    status: currentStatusFor(name),
    source: 'drive-sheet',
    definition,
    typicalColors: parseColors(colors),
    details: ruleNumber ? { ...details, ruleNumber } : details,
    aliases: ruleNumber ? [ruleNumber] : [],
    tags
  };
}

function scoreTerm(term: ReferenceTerm, needle: string): number {
  if (!needle) {
    return 1;
  }
  const name = normalizeSearch(term.name);
  if (name === needle) {
    return 100;
  }
  if (name.startsWith(needle)) {
    return 75;
  }
  if (name.includes(needle)) {
    return 50;
  }
  if (term.aliases.some((alias) => normalizeSearch(alias).includes(needle))) {
    return 35;
  }
  if (term.definition && normalizeSearch(term.definition).includes(needle)) {
    return 15;
  }
  return 0;
}

function categoryWeight(category: ReferenceCategory): number {
  return ['keyword-ability', 'ability-word', 'keyword-action', 'card-type', 'subtype', 'token', 'counter', 'supertype', 'homebrew', 'mana-color', 'frame', 'action-phrase'].indexOf(category);
}

function cleanName(value: string | undefined): string {
  return String(value ?? '').replace(/[‐‑‒–—]/g, '-').replace(/\s+/g, ' ').trim();
}

function cleanOptional(value: string | undefined): string | undefined {
  const cleaned = cleanName(value);
  return cleaned || undefined;
}

function normalizeSearch(value: string): string {
  return cleanName(value).toLowerCase().replace(/[^a-z0-9{}+/-]+/g, ' ').trim();
}

function aliasesForName(name: string): string[] {
  const aliases = [name.toLowerCase()];
  const canonical = canonicalReferenceNameForId(name);
  if (canonical !== name) {
    aliases.push(canonical.toLowerCase());
  }
  const bracketless = name.replace(/\s+\[[^\]]+\]/g, '').replace(/\s+N\b/g, '').trim();
  if (bracketless !== name) {
    aliases.push(bracketless);
  }
  return aliases;
}

function canonicalReferenceNameForId(name: string): string {
  return cleanName(name)
    .replace(/\s+\[[^\]]+\]/g, '')
    .replace(/\s+\{[^}]+\}/g, '')
    .replace(/\s+\([^)]*cost[^)]*\)/gi, '')
    .replace(/\s+N\b/g, '')
    .replace(/\s+X\b/g, '')
    .trim();
}

function mergeReferenceTermRecords(existing: ReferenceTerm, next: ReferenceTerm): ReferenceTerm {
  const nextHasDerivedDefinition = next.tags.includes('metadata-derived');
  const nextHasDefinition = Boolean(next.definition || next.reminderText || next.details);
  return {
    ...existing,
    ...next,
    name: preferredDisplayName(existing.name, next.name),
    source: nextHasDefinition && (!nextHasDerivedDefinition || !existing.definition) ? next.source : existing.source,
    definition: next.definition && !nextHasDerivedDefinition ? next.definition : existing.definition ?? next.definition,
    reminderText: next.reminderText ?? existing.reminderText,
    typicalColors: next.typicalColors?.length ? next.typicalColors : existing.typicalColors,
    sourceNotes: next.sourceNotes ?? existing.sourceNotes,
    details: mergeReferenceDetails(existing.details, next.details),
    aliases: unique([...existing.aliases, ...next.aliases, existing.name, next.name]),
    tags: unique([...existing.tags, ...next.tags]),
    versions: uniqueVersions([...(existing.versions ?? []), ...(next.versions ?? [])])
  };
}

function mergeReferenceDetails(existing: ReferenceTermDetails | undefined, next: ReferenceTermDetails | undefined): ReferenceTermDetails | undefined {
  if (!existing && !next) {
    return undefined;
  }
  return cleanReferenceDetails({
    parentType: next?.parentType ?? existing?.parentType,
    ruleNumber: next?.ruleNumber ?? existing?.ruleNumber,
    sourceSet: next?.sourceSet ?? existing?.sourceSet,
    components: next?.components ?? existing?.components,
    designNotes: next?.designNotes ?? existing?.designNotes,
    typeLine: next?.typeLine ?? existing?.typeLine,
    power: next?.power ?? existing?.power,
    toughness: next?.toughness ?? existing?.toughness,
    sourceUrl: next?.sourceUrl ?? existing?.sourceUrl
  });
}

function preferredDisplayName(existingName: string, nextName: string): string {
  const canonical = canonicalReferenceNameForId(existingName);
  return normalizeSearch(nextName) === normalizeSearch(canonical) && normalizeSearch(existingName) !== normalizeSearch(canonical) ? nextName : existingName;
}

function usableLinkAliases(values: string[]): string[] {
  const seen = new Set<string>();
  const aliases: string[] = [];
  for (const value of values) {
    const cleaned = cleanName(value);
    const normalized = normalizeSearch(cleaned);
    if (!cleaned || normalized.length < 2 || seen.has(normalized) || isSetCodeAlias(cleaned) || LINK_ALIAS_STOP_WORDS.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    aliases.push(cleaned);
  }
  return aliases.sort((a, b) => b.length - a.length);
}

function usableLinkAliasesForTerm(term: ReferenceTerm): string[] {
  const generated = [term.name, ...aliasesForName(term.name)];
  const explicit = term.source === 'local-custom' || term.source === 'homebrew-forge' || term.source === 'drive-sheet' || term.category === 'homebrew' ? term.aliases : [];
  return usableLinkAliases([...generated, ...explicit]);
}

const LINK_ALIAS_STOP_WORDS = new Set(['all', 'who', 'the', 'and', 'you', 'your', 'for', 'with', 'from']);

function isSetCodeAlias(value: string): boolean {
  return /^[A-Z0-9]{2,6}$/.test(value);
}

function findAliasEquivalentTerm(terms: Map<string, ReferenceTerm>, category: ReferenceCategory, name: string): ReferenceTerm | undefined {
  const needle = normalizeSearch(name);
  if (!needle) {
    return undefined;
  }
  return [...terms.values()].find((term) => term.category === category && term.aliases.some((alias) => normalizeSearch(alias) === needle));
}

function usableCardLinkCandidates(cards: ReferenceCardLinkCandidate[]): ReferenceCardLinkCandidate[] {
  const seen = new Set<string>();
  const candidates: ReferenceCardLinkCandidate[] = [];
  for (const card of cards) {
    const name = cleanName(card.name);
    const id = cleanName(card.id);
    const key = `${id}:${normalizeSearch(name)}`;
    if (!id || !name || normalizeSearch(name).length < 3 || seen.has(key)) {
      continue;
    }
    seen.add(key);
    candidates.push({ ...card, id, name });
  }
  return candidates.sort((a, b) => b.name.length - a.name.length);
}

function findFirstAliasMatch(text: string, aliases: string[]): { text: string; start: number; end: number } | undefined {
  let best: { text: string; start: number; end: number } | undefined;
  for (const alias of aliases) {
    const pattern = new RegExp(`(^|[^A-Za-z0-9+/-])(${escapeRegExp(alias).replace(/\s+/g, '\\s+')})(?=$|[^A-Za-z0-9+/-])`, 'i');
    const match = pattern.exec(text);
    if (!match || match.index === undefined) {
      continue;
    }
    const prefix = match[1] ?? '';
    const matchedText = match[2] ?? '';
    const start = match.index + prefix.length;
    const candidate = { text: matchedText, start, end: start + matchedText.length };
    if (!best || candidate.start < best.start || (candidate.start === best.start && candidate.text.length > best.text.length)) {
      best = candidate;
    }
  }
  return best;
}

function longestAlias(aliases: string[]): number {
  return aliases.reduce((length, alias) => Math.max(length, alias.length), 0);
}

function fieldWeight(field: ReferenceLinkField): number {
  return ['oracleText', 'flavorText', 'typeLine', 'manaCost'].indexOf(field);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function defaultSystemFor(term: Pick<ReferenceTerm, 'source' | 'status'>): ReferenceSystem {
  return term.source === 'cockatrice-customset' || term.status === 'homebrew' ? 'homebrew' : 'magic';
}

function defaultOriginFor(term: Pick<ReferenceTerm, 'source' | 'status'>): ReferenceOrigin {
  return term.source === 'cockatrice-customset' || term.status === 'homebrew' ? 'homebrew' : 'official';
}

function cleanList(values: string[] | undefined): string[] {
  return unique((values ?? []).map((value) => cleanName(value)).filter(Boolean));
}

function cleanColors(values: string[] | undefined): string[] | undefined {
  const cleaned = cleanList(values).map((value) => value.toUpperCase()).filter((value) => ['W', 'U', 'B', 'R', 'G', 'C'].includes(value));
  return cleaned.length ? cleaned : undefined;
}

function cleanReferenceDetails(details: ReferenceTermDetails | undefined): ReferenceTermDetails | undefined {
  if (!details) {
    return undefined;
  }
  const cleaned: ReferenceTermDetails = {
    parentType: cleanOptional(details.parentType),
    ruleNumber: cleanOptional(details.ruleNumber),
    sourceSet: cleanOptional(details.sourceSet),
    components: cleanOptional(details.components),
    designNotes: cleanOptional(details.designNotes),
    typeLine: cleanOptional(details.typeLine),
    power: cleanOptional(details.power),
    toughness: cleanOptional(details.toughness),
    sourceUrl: cleanOptional(details.sourceUrl)
  };
  return Object.values(cleaned).some(Boolean) ? cleaned : undefined;
}

function cleanReferenceVersions(versions: ReferenceTermVersion[] | undefined): ReferenceTermVersion[] | undefined {
  const cleaned = (versions ?? [])
    .map((version) => ({
      changedAt: cleanName(version.changedAt),
      source: version.source,
      sourceSnapshotId: cleanOptional(version.sourceSnapshotId),
      status: version.status,
      definition: cleanVersionDefinition(version.definition),
      reminderText: cleanOptional(version.reminderText),
      details: cleanReferenceDetails(version.details)
    }))
    .filter((version) => version.changedAt);
  return cleaned.length ? cleaned : undefined;
}

function cleanVersionDefinition(definition: string | undefined): string | undefined {
  return cleanOptional(definition)?.replace(/\bA\s+artifact subtype\./g, 'An artifact subtype.');
}

function uniqueVersions(versions: ReferenceTermVersion[]): ReferenceTermVersion[] | undefined {
  const seen = new Set<string>();
  const uniqueItems: ReferenceTermVersion[] = [];
  for (const version of versions) {
    const key = `${version.changedAt}|${version.source}|${version.sourceSnapshotId ?? ''}|${version.definition ?? ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueItems.push(version);
    }
  }
  return uniqueItems.length ? uniqueItems : undefined;
}

function parseColors(value: string | undefined): string[] | undefined {
  const cleaned = cleanName(value);
  if (!cleaned) {
    return undefined;
  }
  if (cleaned.toLowerCase() === 'all') {
    return ['W', 'U', 'B', 'R', 'G'];
  }
  return cleaned
    .split(/[,/ ]+/)
    .map((item) => item.trim().toUpperCase())
    .filter((item) => ['W', 'U', 'B', 'R', 'G', 'C'].includes(item));
}

function currentStatusFor(name: string): ReferenceStatus {
  const normalized = cleanName(name).toLowerCase();
  if (LEGACY_TERMS.has(normalized)) {
    return 'legacy';
  }
  if (CASUAL_TERMS.has(normalized)) {
    return 'casual';
  }
  return 'current';
}

function wordSet(value: string): Set<string> {
  return new Set(value.toLowerCase().split(/[^a-z0-9'-]+/).filter(Boolean));
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

const LEGACY_TERMS = new Set(['banding', 'fear', 'intimidate', 'landwalk', 'shroud', 'phasing', 'rampage n', 'flanking', 'horsemanship', 'fading n']);
const CASUAL_TERMS = new Set(['augment', 'contraption', 'attraction', 'visit', 'assemble', 'open an attraction', 'roll to visit your attractions', 'hero', 'event']);

const DEFAULT_DRIVE_SEED_ROWS: ReferenceSeedRow[] = [
  { sheet: 'Keyword Abilities', values: { Number: '702.2', Keyword: 'Deathtouch', Type: 'Ability', Definition: 'Any amount of damage this deals to a creature is lethal.', 'Typical Colors': 'B, G' } },
  { sheet: 'Keyword Abilities', values: { Number: '702.3', Keyword: 'Defender', Type: 'Ability', Definition: "This creature can't attack.", 'Typical Colors': 'W, U' } },
  { sheet: 'Keyword Abilities', values: { Number: '702.4', Keyword: 'Double strike', Type: 'Ability', Definition: 'Deals both first-strike and regular combat damage.', 'Typical Colors': 'R, W' } },
  { sheet: 'Keyword Abilities', values: { Number: '702.5', Keyword: 'Enchant', Type: 'Ability', Definition: 'Enchant [quality] restricts what an Aura can target and attach to.', 'Typical Colors': 'W, G, U' } },
  { sheet: 'Keyword Abilities', values: { Number: '702.6', Keyword: 'Equip', Type: 'Ability', Definition: '{cost}: Attach this Equipment to a creature you control. Activate only as a sorcery.', 'Typical Colors': 'W, R, C' } },
  { sheet: 'Keyword Abilities', values: { Number: '702.7', Keyword: 'First strike', Type: 'Ability', Definition: 'Deals combat damage before creatures without first strike or double strike.', 'Typical Colors': 'W, R' } },
  { sheet: 'Keyword Abilities', values: { Number: '702.8', Keyword: 'Flash', Type: 'Ability', Definition: 'You may cast this spell any time you could cast an instant.', 'Typical Colors': 'U, G' } },
  { sheet: 'Keyword Abilities', values: { Number: '702.9', Keyword: 'Flying', Type: 'Ability', Definition: 'Can be blocked only by creatures with flying or reach.', 'Typical Colors': 'U, W, B' } },
  { sheet: 'Keyword Abilities', values: { Number: '702.10', Keyword: 'Haste', Type: 'Ability', Definition: 'Can attack and use tap abilities the turn it comes under your control.', 'Typical Colors': 'R, B' } },
  { sheet: 'Keyword Abilities', values: { Number: '702.11', Keyword: 'Hexproof', Type: 'Ability', Definition: "Can't be the target of opponents' spells or abilities.", 'Typical Colors': 'G, U' } },
  { sheet: 'Keyword Abilities', values: { Number: '702.12', Keyword: 'Indestructible', Type: 'Ability', Definition: "Can't be destroyed by damage or effects that say destroy.", 'Typical Colors': 'W, G' } },
  { sheet: 'Keyword Abilities', values: { Number: '702.15', Keyword: 'Lifelink', Type: 'Ability', Definition: 'Damage dealt by this source also causes you to gain that much life.', 'Typical Colors': 'W, B' } },
  { sheet: 'Keyword Abilities', values: { Number: '702.17', Keyword: 'Reach', Type: 'Ability', Definition: 'Can block creatures with flying.', 'Typical Colors': 'G' } },
  { sheet: 'Keyword Abilities', values: { Number: '702.19', Keyword: 'Trample', Type: 'Ability', Definition: 'Excess combat damage can be assigned to the defending player, planeswalker, or battle.', 'Typical Colors': 'G, R' } },
  { sheet: 'Keyword Abilities', values: { Number: '702.20', Keyword: 'Vigilance', Type: 'Ability', Definition: "Attacking doesn't cause this creature to tap.", 'Typical Colors': 'W, G' } },
  { sheet: 'Keyword Abilities', values: { Number: '702.21', Keyword: 'Ward', Type: 'Ability', Definition: "When it becomes the target of an opponent's spell or ability, counter it unless that player pays the ward cost.", 'Typical Colors': 'U, W' } },
  { sheet: 'Keyword Abilities', values: { Number: '702.33', Keyword: 'Kicker [cost]', Type: 'Ability', Definition: 'Optional additional cost that gives an extra effect if paid.', 'Typical Colors': 'All' } },
  { sheet: 'Keyword Abilities', values: { Number: '702.79', Keyword: 'Persist', Type: 'Ability', Definition: 'When this dies, if it had no -1/-1 counters, return it with a -1/-1 counter.', 'Typical Colors': 'B, G' } },
  { sheet: 'Keyword Abilities', values: { Number: '702.122', Keyword: 'Crew N', Type: 'Ability', Definition: 'Tap creatures with total power N or more: this Vehicle becomes an artifact creature until end of turn.', 'Typical Colors': 'C' } },
  { sheet: 'Keyword Actions', values: { Number: '701.3', Keyword: 'Attach', Type: 'Action', Definition: 'Move an Aura, Equipment, or Fortification onto a legal object or permanent.', 'Typical Colors': 'All' } },
  { sheet: 'Keyword Actions', values: { Number: '701.6', Keyword: 'Create', Type: 'Action', Definition: 'Put a token onto the battlefield.', 'Typical Colors': 'All' } },
  { sheet: 'Keyword Actions', values: { Number: '701.13', Keyword: 'Mill N', Type: 'Action', Definition: "Put the top N cards of a library into its owner's graveyard.", 'Typical Colors': 'U, B' } },
  { sheet: 'Keyword Actions', values: { Number: '701.18', Keyword: 'Scry N', Type: 'Action', Definition: 'Look at the top N cards of your library; put any number on the bottom and the rest on top in any order.', 'Typical Colors': 'U' } },
  { sheet: 'Keyword Actions', values: { Number: '701.27', Keyword: 'Proliferate', Type: 'Action', Definition: 'Choose any number of players and permanents with counters; give each another counter of each kind already there.', 'Typical Colors': 'U, G, B' } },
  { sheet: 'Keyword Actions', values: { Number: '701.36', Keyword: 'Investigate', Type: 'Action', Definition: 'Create a Clue token.', 'Typical Colors': 'W, U' } },
  { sheet: 'Keyword Actions', values: { Number: '701.46', Keyword: 'Venture into the dungeon', Type: 'Action', Definition: 'Start or advance in a Dungeon, triggering its room ability.', 'Typical Colors': 'W, B' } },
  { sheet: 'Keyword Actions', values: { Number: '701.51', Keyword: 'Incubate N', Type: 'Action', Definition: 'Create an Incubator artifact token with N +1/+1 counters and "{2}: Transform this artifact."', 'Typical Colors': 'W, B' } },
  { sheet: 'Card Types', values: { 'Card Type': 'Artifact', 'One-Sentence Definition': 'A colorless-leaning permanent type representing objects; some have subtypes like Equipment or Vehicle.' } },
  { sheet: 'Card Types', values: { 'Card Type': 'Battle', 'One-Sentence Definition': 'A permanent that enters with a defense value and special rules.' } },
  { sheet: 'Card Types', values: { 'Card Type': 'Creature', 'One-Sentence Definition': 'A permanent that can attack and block and has power and toughness.' } },
  { sheet: 'Card Types', values: { 'Card Type': 'Enchantment', 'One-Sentence Definition': 'A permanent representing ongoing magic; includes Auras, Sagas, Classes, Cases, and Roles.' } },
  { sheet: 'Card Types', values: { 'Card Type': 'Instant', 'One-Sentence Definition': 'A spell you cast any time you have priority; never a permanent.' } },
  { sheet: 'Card Types', values: { 'Card Type': 'Kindred', 'One-Sentence Definition': 'Pairs creature-type subtypes with noncreature card types.' } },
  { sheet: 'Card Types', values: { 'Card Type': 'Land', 'One-Sentence Definition': 'A permanent you play, not cast, that often produces mana.' } },
  { sheet: 'Card Types', values: { 'Card Type': 'Planeswalker', 'One-Sentence Definition': 'A permanent with loyalty counters and loyalty abilities.' } },
  { sheet: 'Card Types', values: { 'Card Type': 'Sorcery', 'One-Sentence Definition': 'A spell cast only during your main phase with an empty stack; never a permanent.' } },
  { sheet: 'Card SubTypes', values: { Subtype: 'Equipment', 'Main type': 'Artifact', 'Short description': 'Attaches to creatures via equip.', 'Common colors': 'W, R' } },
  { sheet: 'Card SubTypes', values: { Subtype: 'Vehicle', 'Main type': 'Artifact', 'Short description': 'Becomes a creature with crew or similar rules.', 'Common colors': 'W, U, R' } },
  { sheet: 'Card SubTypes', values: { Subtype: 'Aura', 'Main type': 'Enchantment', 'Short description': 'Attaches to a thing and needs an Enchant line.', 'Common colors': 'All' } },
  { sheet: 'Card SubTypes', values: { Subtype: 'Saga', 'Main type': 'Enchantment', 'Short description': 'Chaptered story enchantment with lore counters.', 'Common colors': 'All' } },
  { sheet: 'Card SubTypes', values: { Subtype: 'Siege', 'Main type': 'Battle', 'Short description': 'Battle subtype that an opponent protects until defeated.', 'Common colors': 'All' } },
  { sheet: 'Token Types', values: { Token: 'Treasure', Definition: 'Colorless artifact token with "{T}, Sacrifice this artifact: Add one mana of any color."', 'Typical Colors': 'All' } },
  { sheet: 'Token Types', values: { Token: 'Food', Definition: 'Colorless artifact token with "{2}, {T}, Sacrifice this artifact: You gain 3 life."', 'Typical Colors': 'G, W, B' } },
  { sheet: 'Token Types', values: { Token: 'Clue', Definition: 'Colorless artifact token with "{2}, Sacrifice this artifact: Draw a card."', 'Typical Colors': 'U, W, G' } },
  { sheet: 'Token Types', values: { Token: 'Blood', Definition: 'Colorless artifact token with "{1}, {T}, Discard a card, Sacrifice this artifact: Draw a card."', 'Typical Colors': 'B, R' } },
  { sheet: 'Token Types', values: { Token: 'Incubator / Phyrexian', Definition: 'Transforming token whose front is an Incubator artifact and back is a 0/0 Phyrexian artifact creature.', 'Typical Colors': 'W, U, B' } },
  { sheet: 'Counter Types', values: { Counter: '+1/+1 counters', Definition: "Modify a creature's power/toughness.", 'Typical Colors': 'G, W' } },
  { sheet: 'Counter Types', values: { Counter: 'Shield counters', Definition: 'If it would be destroyed or dealt damage, instead remove one and prevent that damage.', 'Typical Colors': 'W, G' } },
  { sheet: 'Counter Types', values: { Counter: 'Stun counters', Definition: 'If a permanent with a stun counter would untap, instead remove one from it.', 'Typical Colors': 'U, R' } },
  { sheet: 'Counter Types', values: { Counter: 'Loyalty counters', Definition: "Track a planeswalker's loyalty.", 'Typical Colors': 'All' } },
  { sheet: 'Counter Types', values: { Counter: 'Poison counters', Definition: 'A player with ten or more poison counters loses the game.', 'Typical Colors': 'B, G' } },
  { sheet: 'Counter Types', values: { Counter: 'Lore counters', Definition: 'Advance Sagas.', 'Typical Colors': 'All' } },
  { sheet: 'Mana Colors', values: { Color: 'White ({W})', 'One-Sentence Identity': 'Order, protection, and teamwork; basic land: Plains.' } },
  { sheet: 'Mana Colors', values: { Color: 'Blue ({U})', 'One-Sentence Identity': 'Knowledge, manipulation, and tempo; basic land: Island.' } },
  { sheet: 'Mana Colors', values: { Color: 'Black ({B})', 'One-Sentence Identity': 'Ambition, recursion, and resource-for-power trades; basic land: Swamp.' } },
  { sheet: 'Mana Colors', values: { Color: 'Red ({R})', 'One-Sentence Identity': 'Emotion, speed, and direct damage; basic land: Mountain.' } },
  { sheet: 'Mana Colors', values: { Color: 'Green ({G})', 'One-Sentence Identity': 'Growth, big creatures, and ramp; basic land: Forest.' } },
  { sheet: 'Mana Colors', values: { Color: 'Colorless ({C})', 'One-Sentence Identity': 'Not a color; used in colorless costs and produced by Wastes and artifacts.' } }
];

const DEFAULT_HOMEBREW_TERMS: Array<Pick<ReferenceTerm, 'name' | 'category' | 'definition' | 'status'> & Partial<ReferenceTerm>> = [
  {
    name: 'Metallivory',
    category: 'homebrew',
    status: 'homebrew',
    definition: 'If this creature would deal damage to a player, that player may sacrifice an artifact they control to prevent that damage.',
    source: 'cockatrice-customset',
    tags: ['stargate', 'replicators', 'keyword-ability']
  },
  {
    name: 'Metal-Focused',
    category: 'homebrew',
    status: 'homebrew',
    definition: 'Replicator faction marker used by local Stargate custom cards.',
    source: 'cockatrice-customset',
    tags: ['stargate', 'replicators', 'ability-word']
  },
  {
    name: 'Tetonin',
    category: 'homebrew',
    status: 'homebrew',
    definition: 'You may cast this spell for its Tetonin cost. If you do, it enters with a -1/-1 counter on it and is not an Incubator and cannot have growth counters.',
    source: 'cockatrice-customset',
    tags: ['stargate', "goa'uld", 'keyword-ability']
  },
  {
    name: 'Hibernate',
    category: 'homebrew',
    status: 'homebrew',
    definition: 'Wraith custom action used to exile a target creature card from a graveyard face down.',
    source: 'cockatrice-customset',
    tags: ['stargate', 'wraith', 'keyword-action']
  }
];

const DEFAULT_SCRYFALL_CATALOG: ScryfallCatalogSeed = {
  supertypes: ['Basic', 'Elite', 'Legendary', 'Ongoing', 'Snow', 'Token', 'World'],
  cardTypes: ['Artifact', 'Battle', 'Boss', 'Conspiracy', 'Creature', 'Dungeon', 'Emblem', 'Enchantment', 'Event', 'Hero', 'Instant', 'Kindred', 'Land', 'Phenomenon', 'Plane', 'Planeswalker', 'Scheme', 'Sorcery', 'Vanguard'],
  artifactTypes: ['Attraction', 'Blood', 'Bobblehead', 'Book', 'Clue', 'Contraption', 'Equipment', 'Food', 'Fortification', 'Gold', 'Incubator', 'Infinity', 'Junk', 'Map', 'Powerstone', 'Stone', 'Terminus', 'Treasure', 'Vehicle', 'Spacecraft'],
  battleTypes: ['Siege'],
  enchantmentTypes: ['Aura', 'Background', 'Cartouche', 'Case', 'Class', 'Curse', 'Role', 'Room', 'Rune', 'Saga', 'Shard', 'Shrine'],
  landTypes: ['Cave', 'Cloud', 'Desert', 'Forest', 'Gate', 'Island', 'Lair', 'Locus', 'Mine', 'Mountain', 'Sphere', 'Plains', 'Planet', 'Power-Plant', 'Swamp', 'Tower', 'Town', "Urza's"],
  planeswalkerTypes: ['Ajani', 'Aminatou', 'Angrath', 'Arlinn', 'Ashiok', 'Bolas', 'Chandra', 'Dack', 'Daretti', 'Davriel', 'Domri', 'Dovin', 'Elspeth', 'Freyalise', 'Garruk', 'Gideon', 'Huatli', 'Jace', 'Karn', 'Kaya', 'Kiora', 'Koth', 'Liliana', 'Nahiri', 'Narset', 'Nicol Bolas', 'Niko', 'Nissa', 'Oko', 'Ral', 'Rowan', 'Saheeli', 'Sarkhan', 'Serra', 'Sorin', 'Tamiyo', 'Teferi', 'Tezzeret', 'Tibalt', 'Tyvar', 'Ugin', 'Urza', 'Venser', 'Vivien', 'Vraska', 'Wanderer', 'Will', 'Windgrace', 'Wrenn', 'Xenagos'],
  spellTypes: ['Adventure', 'Arcane', 'Chorus', 'Lesson', 'Omen', 'Trap'],
  creatureTypes: [
    'Advisor', 'Aetherborn', 'Alien', 'Ally', 'Angel', 'Antelope', 'Ape', 'Archer', 'Archon', 'Army', 'Artificer', 'Assassin', 'Assembly-Worker', 'Astartes', 'Atog', 'Aurochs', 'Automaton', 'Avatar', 'Azra', 'Badger', 'Barbarian', 'Bard', 'Basilisk', 'Bat', 'Bear', 'Beast', 'Beaver', 'Beeble', 'Beholder', 'Berserker', 'Bird', 'Bison', 'Blinkmoth', 'Boar', 'Brainiac', 'Bringer', 'Brushwagg', "C'tan", 'Camarid', 'Camel', 'Caribou', 'Carrier', 'Cat', 'Centaur', 'Child', 'Chimera', 'Citizen', 'Cleric', 'Clown', 'Cockatrice', 'Construct', 'Coward', 'Crab', 'Crocodile', 'Cyberman', 'Cyclops', 'Dalek', 'Dauthi', 'Demigod', 'Demon', 'Deserter', 'Detective', 'Devil', 'Dinosaur', 'Djinn', 'Doctor', 'Dog', 'Dragon', 'Drake', 'Dreadnought', 'Drone', 'Druid', 'Dryad', 'Dwarf', 'Efreet', 'Egg', 'Elder', 'Eldrazi', 'Elemental', 'Elephant', 'Elf', 'Elk', 'Eye', 'Faerie', 'Ferret', 'Fish', 'Flagbearer', 'Fox', 'Fractal', 'Frog', 'Fungus', 'Gamer', 'Gargoyle', 'Germ', 'Giant', 'Gith', 'Glimmer', 'Gnome', 'Goat', 'Goblin', 'God', 'Golem', 'Gorgon', 'Graveborn', 'Gremlin', 'Griffin', 'Guest', 'Hag', 'Halfling', 'Harpy', 'Hellion', 'Hero', 'Hippo', 'Hippogriff', 'Homarid', 'Homunculus', 'Horror', 'Horse', 'Human', 'Hydra', 'Hyena', 'Illusion', 'Imp', 'Incarnation', 'Inkling', 'Inquisitor', 'Insect', 'Jackal', 'Jellyfish', 'Juggernaut', 'Kavu', 'Kirin', 'Kithkin', 'Knight', 'Kobold', 'Kor', 'Kraken', 'Lamia', 'Leech', 'Leviathan', 'Lhurgoyf', 'Licid', 'Lizard', 'Manticore', 'Masticore', 'Mercenary', 'Merfolk', 'Metathran', 'Minion', 'Minotaur', 'Mite', 'Mole', 'Monger', 'Mongoose', 'Monk', 'Monkey', 'Moonfolk', 'Mount', 'Mouse', 'Mutant', 'Myr', 'Mystic', 'Naga', 'Nautilus', 'Necron', 'Nephilim', 'Nightmare', 'Nightstalker', 'Ninja', 'Noble', 'Noggle', 'Nomad', 'Nymph', 'Octopus', 'Officer', 'Ogre', 'Ooze', 'Orb', 'Orc', 'Orgg', 'Otter', 'Ouphe', 'Ox', 'Oyster', 'Peasant', 'Pegasus', 'Pentavite', 'Performer', 'Pest', 'Phelddagrif', 'Phoenix', 'Phyrexian', 'Pilot', 'Pincher', 'Pirate', 'Plant', 'Praetor', 'Primarch', 'Prism', 'Processor', 'Rabbit', 'Ranger', 'Rat', 'Rebel', 'Reflection', 'Reveler', 'Rhino', 'Rigger', 'Robot', 'Rogue', 'Rukh', 'Sable', 'Salamander', 'Samurai', 'Saproling', 'Satyr', 'Scarecrow', 'Scientist', 'Scion', 'Scorpion', 'Scout', 'Sculpture', 'Serf', 'Serpent', 'Servo', 'Shade', 'Shaman', 'Shapeshifter', 'Shark', 'Siren', 'Skeleton', 'Slith', 'Sliver', 'Slug', 'Snake', 'Soldier', 'Soltari', 'Sorcerer', 'Spawn', 'Specter', 'Spellshaper', 'Sphinx', 'Spider', 'Spike', 'Spirit', 'Splinter', 'Sponge', 'Spy', 'Squid', 'Squirrel', 'Starfish', 'Surrakar', 'Survivor', 'Symbiote', 'Synth', 'Tentacle', 'Tetravite', 'Thalakos', 'Thopter', 'Thrull', 'Tiefling', 'Time Lord', 'Toy', 'Treefolk', 'Trilobite', 'Triskelavite', 'Troll', 'Turtle', 'Tyranid', 'Unicorn', 'Urzan', 'Vampire', 'Varmint', 'Vedalken', 'Villain', 'Volver', 'Wall', 'Warlock', 'Warrior', 'Weird', 'Werewolf', 'Whale', 'Wizard', 'Wolf', 'Wolverine', 'Wombat', 'Worm', 'Wraith', 'Wurm', 'Yeti', 'Zombie', 'Zubera'
  ],
  keywordAbilities: ['Living weapon', 'Jump-start', 'Commander ninjutsu', 'Megamorph', 'Haunt', 'Forecast', 'Graft', 'Fortify', 'Frenzy', 'Gravestorm', 'Hideaway', 'Level Up', 'Infect', 'Reach', 'Rampage', 'Phasing', 'Multikicker', 'Morph', 'Provoke', 'Modular', 'Ninjutsu', 'Replicate', 'Recover', 'Poisonous', 'Reinforce', 'Persist', 'Retrace', 'Rebound', 'Miracle', 'Overload', 'Outlast', 'Prowess', 'Renown', 'Myriad', 'Shroud', 'Trample', 'Vigilance', 'Storm', 'Soulshift', 'Splice', 'Transmute', 'Ripple', 'Suspend', 'Vanishing', 'Transfigure', 'Wither', 'Undying', 'Soulbond', 'Unleash', 'Ascend', 'Assist', 'Afterlife', 'Companion', 'Fabricate', 'Embalm', 'Escape', 'Fuse', 'Menace', 'Ingest', 'Melee', 'Improvise', 'Mentor', 'Partner', 'Mutate', 'Tribute', 'Surge', 'Skulk', 'Riot', 'Spectacle', 'Double strike', 'Cumulative upkeep', 'First strike', 'Scavenge', 'Encore', 'Deathtouch', 'Defender', 'Amplify', 'Affinity', 'Bushido', 'Convoke', 'Bloodthirst', 'Absorb', 'Aura Swap', 'Changeling', 'Conspire', 'Cascade', 'Annihilator', 'Battle Cry', 'Cipher', 'Bestow', 'Dash', 'Awaken', 'Crew', 'Aftermath', 'Afflict', 'Flanking', 'Foretell', 'Fading', 'Eternalize', 'Entwine', 'Epic', 'Dredge', 'Delve', 'Evoke', 'Exalted', 'Evolve', 'Extort', 'Dethrone', 'Exploit', 'Devoid', 'Emerge', 'Escalate', 'Flying', 'Haste', 'Hexproof', 'Indestructible', 'Intimidate', 'Lifelink', 'Horsemanship', 'Kicker', 'Madness', 'Craft', 'Split second', 'Reconfigure', 'Ward', 'Partner with', 'Daybound', 'Nightbound', 'Decayed', 'Disturb', 'Squad', 'Enlist', 'Read Ahead', 'Ravenous', 'Blitz', 'Offering', 'Living metal', 'Backup', 'Banding', 'For Mirrodin!', 'Casualty', 'Protection', 'Compleated', 'Enchant', 'Flash', 'Boast', 'Demonstrate', 'Sunburst', 'Flashback', 'Cycling', 'Equip', 'Buyback', 'Cleave', 'Champion', 'Training', 'Prototype', 'Toxic', 'Unearth', 'Bargain', 'Echo', 'Disguise', 'Landwalk', 'Umbra armor', 'Freerunning', 'Spree', 'Saddle', 'Shadow', 'Station', 'Devour', 'Undaunted', 'Offspring', 'Impending', 'Gift', 'Harmonize', 'Exhaust', 'Max speed', 'Fear', 'Mobilize', 'Prowl', 'Solved', 'Web-slinging'],
  keywordActions: ['Scry', 'Seek', 'Activate', 'Attach', 'Cast', 'Counter', 'Create', 'Destroy', 'Discard', 'Exchange', 'Exile', 'Adapt', 'Support', 'Play', 'Regenerate', 'Reveal', 'Sacrifice', 'Shuffle', 'Tap', 'Untap', 'Vote', 'Time Travel', 'Goad', 'Transform', 'Surveil', 'Planeswalk', 'Mill', 'Learn', 'Connive', 'Venture into the dungeon', 'Exert', 'Open an Attraction', 'Discover', 'Abandon', 'Explore', 'Roll to Visit Your Attractions', 'Set in motion', 'Fateseal', 'Manifest', 'Populate', 'Detain', 'Investigate', 'Monstrosity', 'Clash', 'Incubate', 'Proliferate', 'Meld', 'Convert', 'Fight', 'Bolster', 'Assemble', 'Amass', 'Cloak', 'Suspect', 'Collect evidence', 'Plot', 'Forage', 'Manifest dread', 'Endure', 'Double', 'Triple'],
  abilityWords: ['Eerie', 'Battalion', 'Bloodrush', 'Channel', 'Chroma', 'Cohort', 'Constellation', 'Converge', 'Delirium', 'Domain', 'Fateful hour', 'Ferocious', 'Formidable', 'Grandeur', 'Hellbent', 'Heroic', 'Imprint', 'Inspired', 'Join forces', 'Kinship', 'Landfall', 'Lieutenant', 'Metalcraft', 'Morbid', 'Parley', 'Radiance', 'Raid', 'Rally', 'Spell mastery', 'Strive', 'Sweep', 'Tempting offer', 'Threshold', 'Will of the council', 'Adamant', 'Addendum', "Council's dilemma", 'Eminence', 'Enrage', "Hero's Reward", 'Landship', 'Legacy', 'Revolt', 'Undergrowth', 'Void', 'Descend', 'Fathomless descent', 'Magecraft', 'Teamwork', 'Pack tactics', 'Coven', 'Alliance', 'Corrupted', 'Celebration', 'Survival', 'Flurry', 'Valiant', 'Start your engines!', 'Renew', 'Vivid']
};

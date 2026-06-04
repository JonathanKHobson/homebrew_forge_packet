import type { ReferenceCategory, ReferenceRuleEntry, ReferenceRuleKind, ReferenceTerm } from '@homebrew-forge/forge';
import type { CardDraft, CardSummary, EditorProject, LibraryState } from './editorTypes.js';
import { countActiveFilters, includesAnyFilterText, includesFilterText, matchesTagFilter, normalizeFilterText } from './filterTypes.js';

export type ReferencePresenceFilter = 'all' | 'has' | 'missing';
export type ReferenceUsageScope = 'all' | 'used-active-set' | 'unused-active-set' | 'used-active-card' | 'unused-active-card';
export type ReferenceRelatedTermsFilter = 'all' | 'has' | 'missing';

export interface ReferenceTermFilters {
  status: string;
  workflowStatus: string;
  origin: string;
  source: string;
  system: string;
  tag: string;
  color: string;
  parentType: string;
  ruleNumber: string;
  sourceSet: string;
  typeLine: string;
  definitionPresence: ReferencePresenceFilter;
  reminderPresence: ReferencePresenceFilter;
  versionPresence: ReferencePresenceFilter;
  usageScope: ReferenceUsageScope;
  cardId: string;
}

export interface ReferenceRuleFilters {
  number: string;
  title: string;
  text: string;
  relatedTerm: string;
  effectiveDate: string;
  sourceUrl: string;
  relatedTerms: ReferenceRelatedTermsFilter;
}

export interface ReferenceUsageMatch {
  cardId: string;
  cardName: string;
  setCode: string;
  setName?: string;
  projectId?: string;
  projectName?: string;
  matchedText: string;
}

export interface ReferenceUsageIndex {
  activeCardId: string;
  setCode: string;
  setName: string;
  projectId: string;
  projectName: string;
  cardOptions: Array<{ value: string; label: string }>;
  usageByTermId: Map<string, ReferenceUsageMatch[]>;
}

export interface ReferenceFilterOption {
  value: string;
  label: string;
}

export interface ReferenceTermFilterOptions {
  sources: ReferenceFilterOption[];
  systems: ReferenceFilterOption[];
  colors: ReferenceFilterOption[];
  parentTypes: ReferenceFilterOption[];
  sourceSets: ReferenceFilterOption[];
  cards: ReferenceFilterOption[];
}

export interface ReferenceRuleFilterOptions {
  effectiveDates: ReferenceFilterOption[];
  sources: ReferenceFilterOption[];
}

export const defaultReferenceTermFilters: ReferenceTermFilters = {
  status: 'all',
  workflowStatus: 'all',
  origin: 'all',
  source: 'all',
  system: 'all',
  tag: '',
  color: 'all',
  parentType: '',
  ruleNumber: '',
  sourceSet: '',
  typeLine: '',
  definitionPresence: 'all',
  reminderPresence: 'all',
  versionPresence: 'all',
  usageScope: 'all',
  cardId: 'all'
};

export const defaultReferenceRuleFilters: ReferenceRuleFilters = {
  number: '',
  title: '',
  text: '',
  relatedTerm: '',
  effectiveDate: 'all',
  sourceUrl: '',
  relatedTerms: 'all'
};

export function activeReferenceTermFilterCount(category: ReferenceCategory | 'all', filters: ReferenceTermFilters): number {
  return countActiveFilters([
    { value: category, defaultValue: 'all' },
    { value: filters.status, defaultValue: defaultReferenceTermFilters.status },
    { value: filters.workflowStatus, defaultValue: defaultReferenceTermFilters.workflowStatus },
    { value: filters.origin, defaultValue: defaultReferenceTermFilters.origin },
    { value: filters.source, defaultValue: defaultReferenceTermFilters.source },
    { value: filters.system, defaultValue: defaultReferenceTermFilters.system },
    { value: filters.tag, defaultValue: defaultReferenceTermFilters.tag },
    { value: filters.color, defaultValue: defaultReferenceTermFilters.color },
    { value: filters.parentType, defaultValue: defaultReferenceTermFilters.parentType },
    { value: filters.ruleNumber, defaultValue: defaultReferenceTermFilters.ruleNumber },
    { value: filters.sourceSet, defaultValue: defaultReferenceTermFilters.sourceSet },
    { value: filters.typeLine, defaultValue: defaultReferenceTermFilters.typeLine },
    { value: filters.definitionPresence, defaultValue: defaultReferenceTermFilters.definitionPresence },
    { value: filters.reminderPresence, defaultValue: defaultReferenceTermFilters.reminderPresence },
    { value: filters.versionPresence, defaultValue: defaultReferenceTermFilters.versionPresence },
    { value: filters.usageScope, defaultValue: defaultReferenceTermFilters.usageScope },
    { value: filters.cardId, defaultValue: defaultReferenceTermFilters.cardId }
  ]);
}

export function activeReferenceRuleFilterCount(ruleKind: ReferenceRuleKind | 'all', filters: ReferenceRuleFilters): number {
  return countActiveFilters([
    { value: ruleKind, defaultValue: 'all' },
    { value: filters.number, defaultValue: defaultReferenceRuleFilters.number },
    { value: filters.title, defaultValue: defaultReferenceRuleFilters.title },
    { value: filters.text, defaultValue: defaultReferenceRuleFilters.text },
    { value: filters.relatedTerm, defaultValue: defaultReferenceRuleFilters.relatedTerm },
    { value: filters.effectiveDate, defaultValue: defaultReferenceRuleFilters.effectiveDate },
    { value: filters.sourceUrl, defaultValue: defaultReferenceRuleFilters.sourceUrl },
    { value: filters.relatedTerms, defaultValue: defaultReferenceRuleFilters.relatedTerms }
  ]);
}

export function buildReferenceUsageIndex(args: {
  terms: ReferenceTerm[];
  project: EditorProject | null;
  library: LibraryState | null;
  activeCardId: string;
}): ReferenceUsageIndex {
  const { terms, project, library, activeCardId } = args;
  const setSummary = library?.sets.find((set) => set.setCode === project?.setCode);
  const projectSummary = library?.universes.find((universe) => universe.id === setSummary?.universeId);
  const usageByTermId = new Map<string, ReferenceUsageMatch[]>();
  const cards = projectCardsForReferenceUsage(project);
  const termMatchers = terms.map((term) => ({
    term,
    aliases: usableTermAliases(term)
  }));

  for (const card of cards) {
    const haystack = searchableCardText(card);
    for (const matcher of termMatchers) {
      const matchedText = matcher.aliases.find((alias) => normalizedWordContains(haystack, alias));
      if (!matchedText) {
        continue;
      }
      const current = usageByTermId.get(matcher.term.id) ?? [];
      current.push({
        cardId: card.cardId,
        cardName: card.name,
        setCode: project?.setCode ?? card.setCode ?? '',
        setName: project?.setName,
        projectId: projectSummary?.id,
        projectName: projectSummary?.name,
        matchedText
      });
      usageByTermId.set(matcher.term.id, current);
    }
  }

  return {
    activeCardId,
    setCode: project?.setCode ?? '',
    setName: project?.setName ?? '',
    projectId: projectSummary?.id ?? '',
    projectName: projectSummary?.name ?? '',
    cardOptions: cards.map((card) => ({ value: card.cardId, label: `${card.collectorNumber ? `${card.collectorNumber} - ` : ''}${card.name}` })),
    usageByTermId
  };
}

export function buildReferenceTermFilterOptions(terms: ReferenceTerm[], usageIndex: ReferenceUsageIndex): ReferenceTermFilterOptions {
  return {
    sources: optionsFromValues(terms.map((term) => term.source)),
    systems: optionsFromValues(terms.map((term) => term.system)),
    colors: [
      { value: 'white', label: 'White' },
      { value: 'blue', label: 'Blue' },
      { value: 'black', label: 'Black' },
      { value: 'red', label: 'Red' },
      { value: 'green', label: 'Green' },
      { value: 'colorless', label: 'Colorless' },
      { value: 'multicolor', label: 'Multicolor' },
      { value: 'none', label: 'No color tag' }
    ],
    parentTypes: optionsFromValues(terms.map((term) => term.details?.parentType)),
    sourceSets: optionsFromValues(terms.map((term) => term.details?.sourceSet)),
    cards: usageIndex.cardOptions
  };
}

export function buildReferenceRuleFilterOptions(rules: ReferenceRuleEntry[]): ReferenceRuleFilterOptions {
  return {
    effectiveDates: optionsFromValues(rules.map((rule) => rule.effectiveDate)),
    sources: optionsFromValues(rules.map((rule) => rule.sourceUrl))
  };
}

export function filterReferenceTerms(args: {
  terms: ReferenceTerm[];
  category: ReferenceCategory | 'all';
  query: string;
  filters: ReferenceTermFilters;
  usageIndex: ReferenceUsageIndex;
}): ReferenceTerm[] {
  const { terms, category, query, filters, usageIndex } = args;
  return terms.filter((term) => {
    if (category !== 'all' && term.category !== category) {
      return false;
    }
    if (filters.status !== 'all' && term.status !== filters.status) {
      return false;
    }
    if (filters.workflowStatus !== 'all' && term.workflowStatus !== filters.workflowStatus) {
      return false;
    }
    if (filters.origin !== 'all' && term.origin !== filters.origin) {
      return false;
    }
    if (filters.source !== 'all' && term.source !== filters.source) {
      return false;
    }
    if (filters.system !== 'all' && term.system !== filters.system) {
      return false;
    }
    if (!matchesTagFilter(term.tags, filters.tag)) {
      return false;
    }
    if (!matchesColorFilter(term, filters.color)) {
      return false;
    }
    if (!includesFilterText(term.details?.parentType, filters.parentType)) {
      return false;
    }
    if (!includesFilterText(term.details?.ruleNumber, filters.ruleNumber)) {
      return false;
    }
    if (!includesFilterText(term.details?.sourceSet, filters.sourceSet)) {
      return false;
    }
    if (!includesFilterText(term.details?.typeLine, filters.typeLine)) {
      return false;
    }
    if (!matchesPresence(term.definition, filters.definitionPresence)) {
      return false;
    }
    if (!matchesPresence(term.reminderText, filters.reminderPresence)) {
      return false;
    }
    if (!matchesPresence(term.versions, filters.versionPresence)) {
      return false;
    }
    if (!matchesUsageFilter(term.id, filters, usageIndex)) {
      return false;
    }
    return termMatchesQuery(term, query);
  });
}

export function filterReferenceRules(args: {
  rules: ReferenceRuleEntry[];
  ruleKind: ReferenceRuleKind | 'all';
  query: string;
  filters: ReferenceRuleFilters;
  termById: Map<string, ReferenceTerm>;
}): ReferenceRuleEntry[] {
  const { rules, ruleKind, query, filters, termById } = args;
  return rules.filter((rule) => {
    const relatedNames = relatedTermNames(rule, termById);
    if (ruleKind !== 'all' && rule.kind !== ruleKind) {
      return false;
    }
    if (!matchesRuleNumber(rule.number, filters.number)) {
      return false;
    }
    if (!includesFilterText(rule.title, filters.title)) {
      return false;
    }
    if (!includesFilterText(rule.text, filters.text)) {
      return false;
    }
    if (!includesAnyFilterText([...relatedNames, ...rule.relatedTermIds], filters.relatedTerm)) {
      return false;
    }
    if (filters.effectiveDate !== 'all' && rule.effectiveDate !== filters.effectiveDate) {
      return false;
    }
    if (!includesFilterText(rule.sourceUrl, filters.sourceUrl)) {
      return false;
    }
    if (filters.relatedTerms === 'has' && !rule.relatedTermIds.length) {
      return false;
    }
    if (filters.relatedTerms === 'missing' && rule.relatedTermIds.length) {
      return false;
    }
    return ruleMatchesQuery(rule, query, relatedNames);
  });
}

export function termUsageMatches(termId: string, usageIndex: ReferenceUsageIndex): ReferenceUsageMatch[] {
  return usageIndex.usageByTermId.get(termId) ?? [];
}

export function termMatchesQuery(term: ReferenceTerm, query: string): boolean {
  return includesAnyFilterText(
    [
      term.name,
      term.category,
      term.status,
      term.workflowStatus,
      term.origin,
      term.source,
      term.system,
      term.definition,
      term.reminderText,
      term.sourceNotes,
      term.aliases.join(' '),
      term.tags.join(' '),
      term.typicalColors?.join(' '),
      term.details?.parentType,
      term.details?.ruleNumber,
      term.details?.sourceSet,
      term.details?.components,
      term.details?.designNotes,
      term.details?.typeLine,
      term.details?.power,
      term.details?.toughness,
      term.details?.sourceUrl,
      ...(term.versions ?? []).flatMap((version) => [version.definition, version.reminderText, version.status, version.details?.ruleNumber])
    ],
    query
  );
}

export function ruleMatchesQuery(rule: ReferenceRuleEntry, query: string, relatedNames: string[] = []): boolean {
  return includesAnyFilterText([rule.number, rule.title, rule.text, rule.kind, rule.effectiveDate, rule.sourceUrl, relatedNames.join(' ')], query);
}

function projectCardsForReferenceUsage(project: EditorProject | null): Array<CardSummary & Partial<CardDraft>> {
  if (!project) {
    return [];
  }
  const cardsById = new Map<string, CardSummary & Partial<CardDraft>>();
  for (const card of project.cards) {
    cardsById.set(card.cardId, card);
  }
  for (const draft of project.drafts) {
    cardsById.set(draft.cardId, {
      ...cardsById.get(draft.cardId),
      ...draft,
      hasArt: cardsById.get(draft.cardId)?.hasArt ?? Boolean(draft.artId || draft.artFilePath || draft.artUrl),
      needsReview: cardsById.get(draft.cardId)?.needsReview ?? false
    } as CardSummary & Partial<CardDraft>);
  }
  return [...cardsById.values()].sort((a, b) => String(a.collectorNumber).localeCompare(String(b.collectorNumber), undefined, { numeric: true }));
}

function searchableCardText(card: CardSummary & Partial<CardDraft>): string {
  return normalizedSearchIndex([
    card.collectorNumber,
    card.name,
    card.typeLine,
    card.oracleText,
    card.flavorText,
    card.notes,
    card.manaCost,
    card.colors,
    card.colorIdentity,
    card.status,
    card.rarity,
    card.frameType,
    card.cardTypes?.join(' '),
    card.supertypes?.join(' '),
    card.subtypes,
    card.tags?.join(' ')
  ]);
}

function usableTermAliases(term: ReferenceTerm): string[] {
  const values = [term.name, ...term.aliases].map((value) => normalizeFilterText(value)).filter(Boolean);
  const seen = new Set<string>();
  const aliases: string[] = [];
  for (const value of values) {
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    if (value.length < 2) {
      continue;
    }
    aliases.push(value);
  }
  return aliases;
}

function normalizedSearchIndex(values: unknown[]): string {
  return ` ${values.map((value) => normalizeFilterText(value)).join(' ').replace(/[^a-z0-9+/.-]+/g, ' ')} `;
}

function normalizedWordContains(haystack: string, alias: string): boolean {
  const normalizedAlias = normalizedSearchIndex([alias]).trim();
  if (!normalizedAlias) {
    return false;
  }
  if (normalizedAlias.length <= 3) {
    return haystack.includes(` ${normalizedAlias} `);
  }
  return haystack.includes(` ${normalizedAlias} `);
}

function matchesColorFilter(term: ReferenceTerm, color: string): boolean {
  if (color === 'all') {
    return true;
  }
  const colors = (term.typicalColors ?? []).map((value) => normalizeFilterText(value));
  if (color === 'none') {
    return colors.length === 0;
  }
  if (color === 'multicolor') {
    return colors.length > 1;
  }
  if (color === 'colorless') {
    return colors.some((value) => ['colorless', 'c'].includes(value));
  }
  const aliases: Record<string, string[]> = {
    white: ['white', 'w'],
    blue: ['blue', 'u'],
    black: ['black', 'b'],
    red: ['red', 'r'],
    green: ['green', 'g']
  };
  return colors.some((value) => (aliases[color] ?? [color]).includes(value));
}

function matchesPresence(value: unknown, filter: ReferencePresenceFilter): boolean {
  if (filter === 'all') {
    return true;
  }
  const hasValue = Array.isArray(value) ? value.length > 0 : Boolean(String(value ?? '').trim());
  return filter === 'has' ? hasValue : !hasValue;
}

function matchesUsageFilter(termId: string, filters: ReferenceTermFilters, usageIndex: ReferenceUsageIndex): boolean {
  const usage = usageIndex.usageByTermId.get(termId) ?? [];
  if (filters.cardId !== 'all' && !usage.some((item) => item.cardId === filters.cardId)) {
    return false;
  }
  if (filters.usageScope === 'used-active-set') {
    return usage.length > 0;
  }
  if (filters.usageScope === 'unused-active-set') {
    return usage.length === 0;
  }
  if (filters.usageScope === 'used-active-card') {
    return Boolean(usageIndex.activeCardId) && usage.some((item) => item.cardId === usageIndex.activeCardId);
  }
  if (filters.usageScope === 'unused-active-card') {
    return Boolean(usageIndex.activeCardId) && !usage.some((item) => item.cardId === usageIndex.activeCardId);
  }
  return true;
}

function matchesRuleNumber(number: string | undefined, query: string): boolean {
  const needle = normalizeFilterText(query);
  if (!needle) {
    return true;
  }
  const value = normalizeFilterText(number);
  if (!value) {
    return false;
  }
  if (needle.endsWith('*')) {
    return value.startsWith(needle.slice(0, -1));
  }
  return value.startsWith(needle) || value.includes(needle);
}

function relatedTermNames(rule: ReferenceRuleEntry, termById: Map<string, ReferenceTerm>): string[] {
  return rule.relatedTermIds.map((id) => termById.get(id)?.name ?? '').filter(Boolean);
}

function optionsFromValues(values: Array<string | undefined>): ReferenceFilterOption[] {
  const seen = new Set<string>();
  const options: ReferenceFilterOption[] = [];
  for (const raw of values) {
    const label = String(raw ?? '').trim();
    const value = normalizeFilterText(label);
    if (!label || seen.has(value)) {
      continue;
    }
    seen.add(value);
    options.push({ value: label, label });
  }
  return options.sort((a, b) => a.label.localeCompare(b.label));
}

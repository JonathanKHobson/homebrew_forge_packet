import {
  referenceTermId,
  type ReferenceRuleEntry,
  type ReferenceRuleKind,
  type ReferenceRulesCatalog,
  type ReferenceSourceSnapshot,
  type ReferenceTerm
} from './catalog.js';
import { hashContent, sourceSnapshotId } from './officialStore.js';

export const DEFAULT_RULES_TXT_URL = 'https://media.wizards.com/2026/downloads/MagicCompRules%2020260417.txt';

export interface ParseRulesOptions {
  sourceUrl?: string;
  fetchedAt?: string;
  relatedTerms?: ReferenceTerm[];
}

export function parseComprehensiveRulesText(text: string, options: ParseRulesOptions = {}): ReferenceRulesCatalog {
  const sourceUrl = options.sourceUrl ?? DEFAULT_RULES_TXT_URL;
  const fetchedAt = options.fetchedAt ?? new Date().toISOString();
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const effectiveDate = normalized.match(/These rules are effective as of ([^.]+)\./)?.[1];
  const sourceSnapshot: ReferenceSourceSnapshot = {
    id: sourceSnapshotId('wizards-rules', 'comprehensive-rules', normalized),
    source: 'wizards-rules',
    kind: 'comprehensive-rules',
    url: sourceUrl,
    fetchedAt,
    effectiveDate,
    contentHash: hashContent(normalized)
  };

  const contentsIndex = lines.findIndex((line) => line.trim() === 'Contents');
  const contentsCreditsIndex = lines.findIndex((line, index) => index > contentsIndex && line.trim() === 'Credits');
  const glossaryStart = lines.findIndex((line, index) => index > contentsCreditsIndex && line.trim() === 'Glossary');
  const bodyLines = lines.slice(Math.max(0, contentsCreditsIndex + 1), glossaryStart > 0 ? glossaryStart : undefined);
  const glossaryCreditsIndex = lines.findIndex((line, index) => index > glossaryStart && line.trim() === 'Credits');
  const glossaryLines = glossaryStart >= 0 ? lines.slice(glossaryStart + 1, glossaryCreditsIndex > 0 ? glossaryCreditsIndex : undefined) : [];

  const entries = [
    ...parseNumberedRules(bodyLines, sourceUrl, effectiveDate, options.relatedTerms),
    ...parseGlossary(glossaryLines, sourceUrl, effectiveDate, options.relatedTerms)
  ];

  return {
    version: 1,
    updatedAt: fetchedAt,
    effectiveDate,
    sourceUrl,
    sourceSnapshot: { ...sourceSnapshot, count: entries.length },
    entries
  };
}

export function termsFromRulesCatalog(catalog: ReferenceRulesCatalog, timestamp = catalog.updatedAt): ReferenceTerm[] {
  const terms = new Map<string, ReferenceTerm>();
  const add = (term: ReferenceTerm) => terms.set(term.id, term);

  for (const entry of catalog.entries) {
    if (entry.kind === 'predefined-token') {
      const token = predefinedTokenTerm(entry, timestamp);
      if (token) {
        add(token);
      }
    }
    if (entry.kind === 'counter-rule') {
      for (const name of extractCounterNamesFromText(entry.text)) {
        const id = referenceTermId('counter', name);
        add({
          id,
          name,
          category: 'counter',
          status: 'current',
          source: 'wizards-rules',
          system: 'magic',
          origin: 'official',
          workflowStatus: 'final',
          definition: entry.text,
          sourceNotes: `Comprehensive Rules ${entry.number ?? entry.title}`,
          details: { ruleNumber: entry.number, sourceUrl: entry.sourceUrl },
          createdAt: timestamp,
          updatedAt: timestamp,
          aliases: [name.toLowerCase(), entry.number ?? ''].filter(Boolean),
          tags: ['counter', 'rules']
        });
      }
    }
  }

  return [...terms.values()];
}

export function extractCounterNamesFromText(text: string): string[] {
  const names = new Set<string>();
  for (const match of text.matchAll(/([+-]\d+\/[+-]\d+) counters?/gi)) {
    names.add(`${match[1]} counters`);
  }
  for (const match of text.matchAll(/\b([A-Za-z][A-Za-z' -]{1,40}?) counters?\b/g)) {
    const cleaned = normalizeCounterPhrase(match[1]);
    if (cleaned) {
      names.add(`${titleCase(cleaned)} counters`);
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

function parseNumberedRules(lines: string[], sourceUrl: string, effectiveDate: string | undefined, relatedTerms: ReferenceTerm[] | undefined): ReferenceRuleEntry[] {
  const entries: ReferenceRuleEntry[] = [];
  let current: { number: string; title: string; parts: string[] } | undefined;
  const push = () => {
    if (!current) {
      return;
    }
    const text = cleanText(current.parts.join('\n'));
    if (!text) {
      return;
    }
    const kind = kindForRuleNumber(current.number);
    entries.push({
      id: `rule:${current.number}`,
      number: current.number,
      kind,
      title: current.title,
      text,
      sourceUrl,
      effectiveDate,
      relatedTermIds: relatedTermIdsFor(`${current.title} ${text}`, relatedTerms)
    });
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const heading = trimmed.match(/^(\d{1,3}(?:\.\d+)?[a-z]?)\.?\s+(.+)$/);
    if (heading) {
      push();
      const number = heading[1];
      const title = deriveRuleTitle(heading[2]);
      current = { number, title, parts: [heading[2]] };
      continue;
    }
    current?.parts.push(trimmed);
  }
  push();
  return entries;
}

function parseGlossary(lines: string[], sourceUrl: string, effectiveDate: string | undefined, relatedTerms: ReferenceTerm[] | undefined): ReferenceRuleEntry[] {
  const entries: ReferenceRuleEntry[] = [];
  let title = '';
  let parts: string[] = [];
  const push = () => {
    const text = cleanText(parts.join('\n'));
    if (!title || !text) {
      return;
    }
    entries.push({
      id: `glossary:${slug(title)}`,
      kind: 'glossary',
      title,
      text,
      sourceUrl,
      effectiveDate,
      relatedTermIds: relatedTermIdsFor(`${title} ${text}`, relatedTerms)
    });
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      push();
      title = '';
      parts = [];
      continue;
    }
    if (!title) {
      title = trimmed;
    } else {
      parts.push(trimmed);
    }
  }
  push();
  return entries;
}

function predefinedTokenTerm(entry: ReferenceRuleEntry, timestamp: string): ReferenceTerm | undefined {
  const match = entry.text.match(/^(?:A|An) ([^.]+?) token is (.+)$/i);
  if (!match) {
    return undefined;
  }
  const name = cleanTokenName(match[1]);
  const id = referenceTermId('token', name);
  return {
    id,
    name,
    category: 'token',
    status: 'current',
    source: 'wizards-rules',
    system: 'magic',
    origin: 'official',
    workflowStatus: 'final',
    definition: entry.text,
    sourceNotes: `Predefined token rule ${entry.number}`,
    details: {
      ruleNumber: entry.number,
      sourceUrl: entry.sourceUrl,
      components: match[2]
    },
    createdAt: timestamp,
    updatedAt: timestamp,
    aliases: [name.toLowerCase(), entry.number ?? ''].filter(Boolean),
    tags: ['token', 'predefined-token', 'rules']
  };
}

function kindForRuleNumber(number: string): ReferenceRuleKind {
  if (number.startsWith('111.10')) {
    return 'predefined-token';
  }
  if (number.startsWith('122.')) {
    return 'counter-rule';
  }
  if (number.startsWith('701.')) {
    return 'keyword-action';
  }
  if (number.startsWith('702.')) {
    return 'keyword-ability';
  }
  return 'section';
}

function deriveRuleTitle(value: string): string {
  const beforeSubrule = value.replace(/\s+\d{3}\.\d+[a-z]\s+[\s\S]*$/, '').trim();
  const firstSentence = beforeSubrule.split('. ')[0]?.trim() || beforeSubrule;
  return firstSentence.length > 90 ? `${firstSentence.slice(0, 87)}...` : firstSentence;
}

function relatedTermIdsFor(text: string, terms: ReferenceTerm[] | undefined): string[] {
  if (!terms?.length) {
    return [];
  }
  const haystack = normalizeSearchText(text);
  return terms
    .filter((term) => term.name.length > 2 && haystack.includes(normalizeSearchText(term.name)))
    .slice(0, 24)
    .map((term) => term.id);
}

function normalizeCounterPhrase(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/\b(put|puts|placing|place|placed|and|or|one|two|three|four|five|six|seven|eight|nine|ten|one or more|same number of each kind of|number of|additional|that many|those|these|that|this|the|a|an|each|all|more|fewer|nth|n|x)\b/g, ' ')
    .replace(/[^a-z' -]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned || cleaned.length < 3 || STOP_COUNTER_PHRASES.has(cleaned)) {
    return '';
  }
  return cleaned;
}

function cleanTokenName(value: string): string {
  return value.replace(/\bcolorless\b/gi, '').replace(/\s+/g, ' ').trim();
}

function cleanText(value: string): string {
  return value.replace(/\n{3,}/g, '\n\n').trim();
}

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9+/-]+/g, ' ').trim();
}

function titleCase(value: string): string {
  if (/^[+-]\d+\/[+-]\d+$/.test(value)) {
    return value;
  }
  return value.replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

function slug(value: string): string {
  return normalizeSearchText(value).replace(/\s+/g, '-');
}

const STOP_COUNTER_PHRASES = new Set(['counter', 'kind', 'spell', 'ability', 'permanent', 'object', 'player', 'creature', 'card']);

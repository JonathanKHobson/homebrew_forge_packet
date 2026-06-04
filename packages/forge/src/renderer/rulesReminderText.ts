import {
  extractReferenceLinks,
  type ExtractedReferenceLink,
  type ReferenceCatalog,
  type ReferenceCategory,
  type ReferenceTerm
} from '../reference/catalog.js';

const DEFAULT_REMINDER_CATEGORIES: ReferenceCategory[] = ['keyword-ability', 'ability-word', 'keyword-action', 'action-phrase', 'token', 'counter', 'homebrew'];
const DEFAULT_MAX_REMINDERS = 3;
const DEFAULT_MAX_REMINDER_CHARACTERS = 190;

export interface ReferenceReminderInsertion {
  termId: string;
  label: string;
  category: ReferenceCategory;
  matchedText: string;
  reminderText: string;
  start: number;
  end: number;
  insertionIndex: number;
}

export interface ReferenceReminderTextResult {
  text: string;
  insertions: ReferenceReminderInsertion[];
}

export interface AddReferenceReminderTextOptions {
  categories?: ReferenceCategory[];
  maxReminders?: number;
  maxReminderCharacters?: number;
}

export function addReferenceReminderText(
  oracleText: string | undefined,
  catalog: ReferenceCatalog | undefined,
  options: AddReferenceReminderTextOptions = {}
): ReferenceReminderTextResult {
  const sourceText = String(oracleText ?? '');
  if (!catalog || !sourceText.trim()) {
    return { text: sourceText, insertions: [] };
  }

  const termById = new Map(catalog.terms.map((term) => [term.id, term]));
  const maxReminders = options.maxReminders ?? DEFAULT_MAX_REMINDERS;
  const links = extractReferenceLinks({
    catalog,
    textByField: { oracleText: sourceText },
    categories: options.categories ?? DEFAULT_REMINDER_CATEGORIES,
    limit: catalog.terms.length
  }).filter((link) => link.kind === 'reference-term' && link.sourceField === 'oracleText');

  const insertions: ReferenceReminderInsertion[] = [];
  const occupiedRanges: Array<{ start: number; end: number }> = [];

  for (const link of links) {
    if (insertions.length >= maxReminders) {
      break;
    }
    const term = termById.get(link.id);
    if (!term || rangeOverlaps(link, occupiedRanges)) {
      continue;
    }
    const reminderText = printableReminderText(term, options.maxReminderCharacters ?? DEFAULT_MAX_REMINDER_CHARACTERS);
    if (!reminderText) {
      continue;
    }
    const insertionIndex = reminderInsertionIndex(sourceText, link, term);
    if (hasExplicitReminderAfter(sourceText, insertionIndex)) {
      continue;
    }
    insertions.push({
      termId: term.id,
      label: term.name,
      category: term.category,
      matchedText: link.matchedText,
      reminderText: parenthesizeReminderText(reminderText),
      start: link.start,
      end: link.end,
      insertionIndex
    });
    occupiedRanges.push({ start: link.start, end: insertionIndex });
  }

  if (!insertions.length) {
    return { text: sourceText, insertions };
  }

  const text = [...insertions]
    .sort((a, b) => b.insertionIndex - a.insertionIndex)
    .reduce((result, insertion) => `${result.slice(0, insertion.insertionIndex)} ${insertion.reminderText}${result.slice(insertion.insertionIndex)}`, sourceText);

  return { text, insertions };
}

function printableReminderText(term: ReferenceTerm, maxReminderCharacters: number): string | undefined {
  const raw = term.reminderText;
  const cleaned = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return undefined;
  }
  if (cleaned.length > maxReminderCharacters) {
    return undefined;
  }
  return cleaned;
}

function parenthesizeReminderText(value: string): string {
  const cleaned = value.trim();
  return cleaned.startsWith('(') && cleaned.endsWith(')') ? cleaned : `(${cleaned})`;
}

function reminderInsertionIndex(text: string, link: ExtractedReferenceLink, term: ReferenceTerm): number {
  let end = link.end;
  const after = text.slice(end);
  if (term.category === 'keyword-action') {
    const count = /^(\s+(?:X|\d+))\b/i.exec(after);
    if (count?.[1]) {
      end += count[1].length;
    }
  }
  if (term.category === 'token') {
    const tokenPhrase = /^(\s+(?:(?:artifact|creature|enchantment)\s+)?tokens?\b)/i.exec(text.slice(end));
    if (tokenPhrase?.[1]) {
      end += tokenPhrase[1].length;
    }
  }
  if (term.category === 'counter') {
    const counterPhrase = /^(\s+counters?\b)/i.exec(text.slice(end));
    if (counterPhrase?.[1]) {
      end += counterPhrase[1].length;
    }
  }
  return end;
}

function hasExplicitReminderAfter(text: string, insertionIndex: number): boolean {
  return /^\s*\(/.test(text.slice(insertionIndex));
}

function rangeOverlaps(link: ExtractedReferenceLink, ranges: Array<{ start: number; end: number }>): boolean {
  return ranges.some((range) => link.start < range.end && link.end > range.start);
}

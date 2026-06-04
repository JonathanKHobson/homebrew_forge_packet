import type { ExtractedReferenceLink, ReferenceLinkField, ReferenceTerm } from '@homebrew-forge/forge/reference';

export interface LinkedTextSelection {
  sourceField: ReferenceLinkField;
  selectionStart: number;
  selectionEnd: number;
}

export type ReminderInsertResult =
  | { status: 'inserted'; text: string; insertionIndex: number; insertedText: string }
  | { status: 'missing-reminder' }
  | { status: 'already-present' };

export function linkKey(link: ExtractedReferenceLink): string {
  return `${link.kind}-${link.id}-${link.sourceField}-${link.start}-${link.end}`;
}

export function findLinkAtSelection(links: ExtractedReferenceLink[], selection: LinkedTextSelection): ExtractedReferenceLink | null {
  const fieldLinks = links
    .filter((link) => link.sourceField === selection.sourceField)
    .sort((a, b) => a.start - b.start || b.end - a.end);
  const start = Math.min(selection.selectionStart, selection.selectionEnd);
  const end = Math.max(selection.selectionStart, selection.selectionEnd);

  for (const link of fieldLinks) {
    if (end > start) {
      if (start < link.end && end > link.start) {
        return link;
      }
      continue;
    }
    if (start >= link.start && start <= link.end) {
      return link;
    }
  }
  return null;
}

export function insertReferenceReminderText(sourceText: string, link: ExtractedReferenceLink, term: ReferenceTerm | undefined): ReminderInsertResult {
  const reminderText = formatReminderText(term?.reminderText);
  if (!reminderText || link.kind !== 'reference-term' || !term) {
    return { status: 'missing-reminder' };
  }

  const insertionIndex = reminderInsertionIndex(sourceText, link, term);
  if (hasExplicitReminderAfter(sourceText, insertionIndex)) {
    return { status: 'already-present' };
  }

  return {
    status: 'inserted',
    insertionIndex,
    insertedText: reminderText,
    text: `${sourceText.slice(0, insertionIndex)} ${reminderText}${sourceText.slice(insertionIndex)}`
  };
}

export function formatReminderText(value: string | undefined): string | undefined {
  const cleaned = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return undefined;
  }
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

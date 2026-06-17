import type { DeckCardOption, DeckMetadata, DeckState } from './editorTypes.js';

export interface DeckLegalityIssue {
  severity: 'warning' | 'info';
  title: string;
  detail: string;
}

const CONSTRUCTED_60_FORMATS = new Set(['standard', 'pioneer', 'modern', 'legacy', 'vintage', 'pauper', 'alchemy', 'historic', 'timeless', 'explorer']);
const LIMITED_40_FORMATS = new Set(['booster draft', 'pick-two draft', 'sealed deck', 'team booster draft', 'team sealed deck', 'draft', 'sealed']);
const COMMANDER_99_FORMATS = new Set(['commander', 'commander 1v1', 'duel commander', 'pauper commander', 'predh']);
const BRAWL_59_FORMATS = new Set(['brawl', 'standard brawl', 'historic brawl']);

export function assessDeckLegality(deck: DeckState): DeckLegalityIssue[] {
  const format = normalizeFormat(deck.metadata.format);
  if (!format) {
    return [];
  }

  const issues: DeckLegalityIssue[] = [];
  const activeEntries = activeDeckEntries(deck);
  const mainCount = countSection(activeEntries, 'main');
  const sideCount = countSection(activeEntries, 'side');

  if (CONSTRUCTED_60_FORMATS.has(format) && mainCount < 60) {
    issues.push({
      severity: 'warning',
      title: 'Main deck below 60',
      detail: `${deck.metadata.format} decks usually need at least 60 main-deck cards.`
    });
  }

  if (LIMITED_40_FORMATS.has(format) && mainCount < 40) {
    issues.push({
      severity: 'warning',
      title: 'Main deck below 40',
      detail: `${deck.metadata.format} decks usually need at least 40 main-deck cards.`
    });
  }

  if ((CONSTRUCTED_60_FORMATS.has(format) || LIMITED_40_FORMATS.has(format)) && sideCount > 15) {
    issues.push({
      severity: 'warning',
      title: 'Large sideboard',
      detail: 'Most constructed and limited formats cap sideboards at 15 cards.'
    });
  }

  if (COMMANDER_99_FORMATS.has(format) || BRAWL_59_FORMATS.has(format) || format === 'oathbreaker') {
    const commander = activeCommander(deck);
    if (!commander) {
      issues.push({
        severity: 'warning',
        title: 'Commander not set',
        detail: `${deck.metadata.format} needs an explicit commander or leader slot for table communication.`
      });
    }
    if (!activeDeckColorIdentity(deck)) {
      issues.push({
        severity: 'info',
        title: 'Color identity not set',
        detail: 'Set color identity before doing Commander-style color checks.'
      });
    }
  }

  const expectedCommanderMainCount = COMMANDER_99_FORMATS.has(format) ? 99 : BRAWL_59_FORMATS.has(format) ? 59 : undefined;
  if (expectedCommanderMainCount && mainCount !== expectedCommanderMainCount) {
    issues.push({
      severity: 'info',
      title: `${expectedCommanderMainCount} main-deck cards expected`,
      detail: `${deck.metadata.format} usually uses ${expectedCommanderMainCount} main-deck cards plus the commander slot.`
    });
  }

  const deckColorIdentity = activeDeckColorIdentity(deck);
  if (deckColorIdentity) {
    const offIdentity = activeEntries.filter((entry) => entry.card && !isColorIdentitySubset(entry.card.colorIdentity || entry.card.colors, deckColorIdentity));
    if (offIdentity.length) {
      issues.push({
        severity: 'warning',
        title: 'Off-identity cards',
        detail: `${offIdentity.length} resolved deck row${offIdentity.length === 1 ? '' : 's'} use colors outside ${deckColorIdentity}.`
      });
    }
  }

  if (COMMANDER_99_FORMATS.has(format) || BRAWL_59_FORMATS.has(format) || format === 'oathbreaker') {
    const commanderIdentity = combinedCommanderIdentity(deck);
    if (deckColorIdentity && commanderIdentity && !isColorIdentitySubset(deckColorIdentity, commanderIdentity)) {
      issues.push({
        severity: 'warning',
        title: 'Commander identity mismatch',
        detail: `The deck identity ${deckColorIdentity} includes colors not present in the selected commander identity ${commanderIdentity || 'C'}.`
      });
    }

    const duplicates = duplicateCommanderRows(activeEntries);
    if (duplicates.length) {
      issues.push({
        severity: 'warning',
        title: 'Commander singleton duplicates',
        detail: `${duplicates.slice(0, 4).join(', ')} ${duplicates.length === 1 ? 'appears' : 'appear'} more than once outside basic-land or any-number exceptions.`
      });
    }
  }

  return issues;
}

function activeDeckEntries(deck: DeckState): DeckState['entries'] {
  const activeVariantId = deck.activeVariantId || deck.metadata.activeVariantId || deck.metadata.variants[0]?.variantId;
  return deck.entries.filter((entry) => {
    const inActiveVariant = !activeVariantId || !entry.deckVariantId || entry.deckVariantId === activeVariantId;
    const status = entry.candidateStatus ?? 'active';
    return inActiveVariant && !entry.markedForDeletion && status !== 'candidate' && status !== 'cut';
  });
}

function countSection(entries: DeckState['entries'], section: DeckState['entries'][number]['section']): number {
  return entries.filter((entry) => entry.section === section).reduce((total, entry) => total + entry.count, 0);
}

function normalizeFormat(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function isColorIdentitySubset(cardIdentity: string | undefined, deckIdentity: string): boolean {
  const deckColors = new Set(deckIdentity.replace(/C/g, '').split('').filter(Boolean));
  const cardColors = cardIdentity?.replace(/C/g, '').split('').filter(Boolean) ?? [];
  return cardColors.every((color) => deckColors.has(color));
}

function activeVariant(deck: DeckState): DeckState['activeVariant'] | undefined {
  return deck.activeVariant ?? deck.metadata.variants.find((variant) => variant.variantId === (deck.activeVariantId || deck.metadata.activeVariantId)) ?? deck.metadata.variants[0];
}

function activeDeckColorIdentity(deck: DeckState): string | undefined {
  return normalizeIdentity(activeVariant(deck)?.colorIdentity) || normalizeIdentity(deck.metadata.colorIdentity) || combinedCommanderIdentity(deck) || undefined;
}

function activeCommander(deck: DeckState): DeckMetadata['commander'] | undefined {
  return activeVariant(deck)?.commander ?? deck.metadata.commander;
}

function activePartnerCommanders(deck: DeckState): DeckMetadata['partnerCommanders'] {
  return activeVariant(deck)?.partnerCommanders?.length ? activeVariant(deck)?.partnerCommanders ?? [] : deck.metadata.partnerCommanders ?? [];
}

function combinedCommanderIdentity(deck: DeckState): string | undefined {
  const references = [activeCommander(deck), ...activePartnerCommanders(deck)].filter(Boolean) as NonNullable<DeckMetadata['commander']>[];
  if (!references.length) {
    return undefined;
  }
  const cards = references.flatMap((reference) => {
    const card = deck.availableCards.find((candidate) => candidate.setCode === reference.setCode && candidate.cardId === reference.cardId);
    return card ? [card] : [];
  });
  const identity = cards.flatMap((card) => normalizeIdentity(card.colorIdentity || card.colors).split('')).filter(Boolean);
  return [...new Set(identity)].join('');
}

function duplicateCommanderRows(entries: DeckState['entries']): string[] {
  const counts = new Map<string, { name: string; count: number; card?: DeckCardOption }>();
  for (const entry of entries) {
    const name = entry.card?.name ?? entry.nameSnapshot ?? entry.cardId;
    const key = normalizeName(name);
    const current = counts.get(key) ?? { name, count: 0, card: entry.card };
    counts.set(key, { ...current, count: current.count + entry.count, card: current.card ?? entry.card });
  }
  return [...counts.values()]
    .filter((row) => row.count > 1 && !isCommanderDuplicateException(row.card))
    .map((row) => row.name);
}

function isCommanderDuplicateException(card: DeckCardOption | undefined): boolean {
  if (!card) {
    return false;
  }
  const name = normalizeName(card.name);
  if (['plains', 'island', 'swamp', 'mountain', 'forest', 'wastes'].includes(name)) {
    return true;
  }
  const typeLine = card.typeLine.toLowerCase();
  if (typeLine.includes('basic') && typeLine.includes('land')) {
    return true;
  }
  return /deck can have any number|a deck can have any number|any number of cards named/i.test(card.oracleText);
}

function normalizeIdentity(value: unknown): string {
  const normalized = String(value ?? '').toUpperCase().replace(/[^WUBRGC]/g, '');
  if (!normalized) {
    return '';
  }
  if (normalized === 'C') {
    return 'C';
  }
  return [...new Set(normalized.replace(/C/g, '').split(''))].join('');
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

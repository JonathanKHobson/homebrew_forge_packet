import type { CardDraft, CollectionEntry, CollectionState, EditorProject, OfficialCardSearchCard } from './editorTypes.js';

export type CardBrowserCompareSourceKind = 'set' | 'deck' | 'collection' | 'official';

export interface CardBrowserCompareRow {
  key: string;
  sourceKind: CardBrowserCompareSourceKind;
  sourceId: string;
  sourceName: string;
  projectId?: string;
  setCode?: string;
  setName?: string;
  cardId?: string;
  variantId?: string;
  collectionEntryId?: string;
  officialCard?: OfficialCardSearchCard;
  name: string;
  typeLine: string;
  manaCost: string;
  colors: string;
  status: string;
  tags: string[];
  quantity?: number;
  deckSection?: string;
  reviewStatus?: CollectionEntry['reviewStatus'];
}

export interface CardBrowserCompareContext {
  projectsBySet: Record<string, EditorProject>;
  currentProject: EditorProject | null;
  collectionStates: Record<string, CollectionState>;
}

export interface CardBrowserCompareItem {
  key: string;
  row: CardBrowserCompareRow;
  draft: CardDraft | null;
  collectionEntry?: CollectionEntry;
  renderUnavailableReason: string;
}

export interface CardBrowserCompareDetail {
  label: string;
  value: string;
}

export function buildCardBrowserCompareItem(row: CardBrowserCompareRow, context: CardBrowserCompareContext): CardBrowserCompareItem {
  const draft = findSavedDraftForCompareRow(row, context);
  const collectionEntry = row.sourceKind === 'collection' ? findCollectionEntryForRow(row, context.collectionStates) : undefined;
  return {
    key: row.key,
    row,
    draft,
    collectionEntry,
    renderUnavailableReason: draft
      ? ''
      : row.sourceKind === 'collection'
        ? 'No linked authored card render is available for this collection row.'
        : row.sourceKind === 'official'
          ? 'Official catalog rows are reference records until they are added to a collection or copied into an authored set.'
          : 'No saved authored card render is available for this source row.'
  };
}

export function findSavedDraftForCompareRow(row: CardBrowserCompareRow, context: CardBrowserCompareContext): CardDraft | null {
  if (!row.setCode || !row.cardId) {
    return null;
  }
  const project = context.projectsBySet[row.setCode] ?? (context.currentProject?.setCode === row.setCode ? context.currentProject : undefined);
  const drafts = project?.drafts ?? [];
  if (!drafts.length) {
    return null;
  }
  if (row.variantId) {
    const variantDraft = drafts.find((draft) => draft.cardId === row.cardId && draft.variantId === row.variantId);
    if (variantDraft) {
      return variantDraft;
    }
  }
  return drafts.find((draft) => draft.cardId === row.cardId && draft.variantIsPrimary) ?? drafts.find((draft) => draft.cardId === row.cardId) ?? null;
}

export function cardBrowserCompareDetailsForItem(item: CardBrowserCompareItem): CardBrowserCompareDetail[] {
  const draft = item.draft;
  const row = item.row;
  const entry = item.collectionEntry;
  const official = row.officialCard;
  const manaCost = draft?.manaCost || official?.manaCost || row.manaCost;
  return [
    { label: 'Name', value: draft?.name || official?.name || row.name },
    { label: 'Source', value: cardBrowserCompareSourceLabel(row) },
    { label: 'Set', value: setLabel(draft, row, entry, official) },
    { label: 'Mana cost', value: valueOrDash(manaCost) },
    { label: 'Mana value', value: manaValueLabel(manaCost, entry, official) },
    { label: 'Colors', value: valueOrDash(draft?.colors || official?.colorIdentity.join('') || row.colors) },
    { label: 'Type line', value: valueOrDash(draft?.typeLine || official?.typeLine || row.typeLine) },
    { label: 'Oracle text', value: valueOrDash(draft?.oracleText || official?.oracleText || officialJoinedFaceText(official, 'oracleText')) },
    { label: 'Power / Toughness / Loyalty', value: statsLabel(draft, official) },
    { label: 'Rarity', value: valueOrDash(draft?.rarity || (official?.view === 'prints' ? official.rarity : undefined)) },
    { label: 'Status', value: valueOrDash(draft?.status || row.status) },
    { label: 'Tags', value: tagsLabel(draft?.tags.length ? draft.tags : row.tags) },
    { label: 'Quantity', value: row.quantity === undefined ? '-' : String(row.quantity) },
    { label: 'Deck section', value: deckSectionLabel(row.deckSection) },
    { label: 'Collection print', value: entry ? collectionPrintLabel(entry) : '-' },
    { label: 'Finish', value: valueOrDash(entry?.finish) },
    { label: 'Condition', value: valueOrDash(entry?.condition) },
    { label: 'Language', value: valueOrDash(entry?.language) },
    { label: 'Location', value: valueOrDash(entry?.location) },
    { label: 'Review', value: valueOrDash(entry?.reviewStatus ?? row.reviewStatus) },
    { label: 'Scryfall', value: valueOrDash(official?.scryfallUri) }
  ];
}

export function cardBrowserCompareSourceLabel(row: CardBrowserCompareRow): string {
  if (row.sourceKind === 'set') {
    return `Set card - ${row.sourceName}`;
  }
  if (row.sourceKind === 'deck') {
    return `${deckSectionLabel(row.deckSection)} - ${row.sourceName}`;
  }
  if (row.sourceKind === 'official') {
    return `Official catalog - ${row.sourceName}`;
  }
  return `Collection row - ${row.sourceName}`;
}

export function comparePreviewKeyForDraft(draft: CardDraft): string {
  return `${draft.setCode}:${draft.cardId}:${draft.variantId || 'primary'}`;
}

function findCollectionEntryForRow(row: CardBrowserCompareRow, collectionStates: Record<string, CollectionState>): CollectionEntry | undefined {
  if (!row.collectionEntryId) {
    return undefined;
  }
  return collectionStates[row.sourceId]?.entries.find((entry) => entry.entryId === row.collectionEntryId);
}

function setLabel(draft: CardDraft | null, row: CardBrowserCompareRow, entry: CollectionEntry | undefined, official: OfficialCardSearchCard | undefined): string {
  const code = draft?.setCode || row.setCode || entry?.linkedSetCode || entry?.setCode || (official?.view === 'prints' ? official.setCode : undefined);
  const name = draft?.setName || row.setName || entry?.setName || (official?.view === 'prints' ? official.setName : undefined);
  return [code, name].filter(Boolean).join(' - ') || '-';
}

function manaValueLabel(manaCost: string, entry: CollectionEntry | undefined, official: OfficialCardSearchCard | undefined): string {
  if (official?.manaValue !== undefined) {
    return String(official.manaValue);
  }
  const parsed = parseManaValue(manaCost);
  if (parsed !== undefined) {
    return String(parsed);
  }
  const sourceValue = sourceRowNumber(entry?.sourceRow, ['mana_value', 'cmc']);
  return sourceValue === undefined ? '-' : String(sourceValue);
}

function statsLabel(draft: CardDraft | null, official: OfficialCardSearchCard | undefined): string {
  if (!draft) {
    if (official?.loyalty) {
      return official.loyalty;
    }
    if (official?.defense) {
      return official.defense;
    }
    return [official?.power, official?.toughness].filter(Boolean).join(' / ') || '-';
  }
  if (draft.loyalty) {
    return draft.loyalty;
  }
  return [draft.power, draft.toughness].filter(Boolean).join(' / ') || '-';
}

function officialJoinedFaceText(card: OfficialCardSearchCard | undefined, key: 'oracleText' | 'flavorText'): string {
  return (card?.cardFaces ?? [])
    .map((face) => {
      const text = valueOrDash(face[key]);
      if (text === '-') {
        return '';
      }
      return face.name ? `${face.name}: ${text}` : text;
    })
    .filter(Boolean)
    .join('\n\n');
}

function deckSectionLabel(section: string | undefined): string {
  if (section === 'side') {
    return 'Sideboard';
  }
  if (section === 'maybe') {
    return 'Maybeboard';
  }
  if (section === 'main') {
    return 'Main deck';
  }
  return '-';
}

function collectionPrintLabel(entry: CollectionEntry): string {
  return [entry.setCode, entry.collectorNumber].filter(Boolean).join(' ') || entry.setName || '-';
}

function tagsLabel(tags: string[]): string {
  return tags.length ? tags.join(', ') : '-';
}

function valueOrDash(value: string | undefined): string {
  const text = String(value ?? '').trim();
  return text || '-';
}

function parseManaValue(manaCost: string): number | undefined {
  const trimmed = manaCost.trim();
  if (!trimmed) {
    return undefined;
  }
  const symbolMatches = trimmed.match(/\{[^}]+\}/g);
  if (symbolMatches?.length) {
    return symbolMatches.reduce((total, symbol) => total + manaSymbolValue(symbol.replace(/[{}]/g, '')), 0);
  }
  let total = 0;
  const compact = trimmed.toUpperCase();
  const numbers = compact.match(/\d+/g) ?? [];
  for (const number of numbers) {
    total += Number(number) || 0;
  }
  total += compact
    .replace(/\d+/g, '')
    .split('')
    .filter((char) => 'WUBRGCXYZ'.includes(char) && char !== 'X' && char !== 'Y' && char !== 'Z').length;
  return total;
}

function manaSymbolValue(symbol: string): number {
  if (/^\d+$/.test(symbol)) {
    return Number(symbol);
  }
  if (symbol.includes('/')) {
    return 1;
  }
  if (symbol.toUpperCase() === 'X' || symbol.toUpperCase() === 'Y' || symbol.toUpperCase() === 'Z') {
    return 0;
  }
  return 1;
}

function sourceRowNumber(sourceRow: string | undefined, keys: string[]): number | undefined {
  if (!sourceRow) {
    return undefined;
  }
  try {
    const source = JSON.parse(sourceRow.replace(/\r?\n/g, '\\n')) as Record<string, unknown>;
    const firstFace = Array.isArray(source.card_faces) ? objectValue(source.card_faces[0]) : undefined;
    const records = [source, objectValue(source.enrichment), objectValue(source.scryfall), firstFace].filter(Boolean) as Array<Record<string, unknown>>;
    for (const key of keys) {
      for (const record of records) {
        const number = Number(record[key]);
        if (Number.isFinite(number)) {
          return number;
        }
      }
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

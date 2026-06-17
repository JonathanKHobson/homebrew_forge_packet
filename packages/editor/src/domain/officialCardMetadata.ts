import type { CollectionEntry, DeckCardOption } from './editorTypes.js';

export interface CardImageUris {
  small?: string;
  normal?: string;
  large?: string;
  png?: string;
  artCrop?: string;
  borderCrop?: string;
}

export interface OfficialCardMetadata {
  name: string;
  setCode?: string;
  setName?: string;
  collectorNumber?: string;
  manaCost?: string;
  manaValue?: number;
  typeLine?: string;
  oracleText?: string;
  flavorText?: string;
  colors?: string;
  colorIdentity?: string;
  rarity?: string;
  scryfallUri?: string;
  imageUris?: CardImageUris;
}

export interface CollectionValueEstimate {
  amount: number;
  currency: string;
  source: string;
}

export const FINISH_OPTIONS = [
  { value: '', label: 'Unknown' },
  { value: 'Nonfoil', label: 'Nonfoil' },
  { value: 'Foil', label: 'Foil' },
  { value: 'Etched', label: 'Etched foil' }
] as const;

export const CONDITION_OPTIONS = [
  { value: '', label: 'Unknown' },
  { value: 'Near Mint', label: 'Near Mint' },
  { value: 'Lightly Played', label: 'Lightly Played' },
  { value: 'Moderately Played', label: 'Moderately Played' },
  { value: 'Heavily Played', label: 'Heavily Played' },
  { value: 'Damaged', label: 'Damaged' }
] as const;

export const LANGUAGE_OPTIONS = [
  { value: '', label: 'Unknown' },
  { value: 'English', label: 'English' },
  { value: 'Japanese', label: 'Japanese' },
  { value: 'Spanish', label: 'Spanish' },
  { value: 'French', label: 'French' },
  { value: 'German', label: 'German' },
  { value: 'Italian', label: 'Italian' },
  { value: 'Portuguese', label: 'Portuguese' },
  { value: 'Korean', label: 'Korean' },
  { value: 'Chinese Simplified', label: 'Chinese Simplified' },
  { value: 'Chinese Traditional', label: 'Chinese Traditional' },
  { value: 'Russian', label: 'Russian' }
] as const;

export function metadataFromCollectionEntry(entry: CollectionEntry): OfficialCardMetadata {
  const source = parseSourceRow(entry.sourceRow);
  const enrichment = objectValue(source?.enrichment) ?? objectValue(source?.scryfall) ?? objectValue(source);
  const firstFace = firstCardFace(enrichment);
  return {
    name: textValue(enrichment?.name) || entry.cardName,
    setCode: entry.setCode,
    setName: entry.setName,
    collectorNumber: entry.collectorNumber,
    manaCost: textValue(enrichment?.mana_cost) || textValue(firstFace?.mana_cost),
    manaValue: numberValue(enrichment?.mana_value) ?? numberValue(enrichment?.cmc) ?? numberValue(firstFace?.mana_value) ?? numberValue(firstFace?.cmc),
    typeLine: textValue(enrichment?.type_line) || textValue(firstFace?.type_line),
    oracleText: textValue(enrichment?.oracle_text) || faceText(enrichment, 'oracle_text'),
    flavorText: textValue(enrichment?.flavor_text) || faceText(enrichment, 'flavor_text'),
    colors: colorsValue(enrichment?.colors) || colorsValue(firstFace?.colors),
    colorIdentity: colorsValue(enrichment?.color_identity) || colorsValue(firstFace?.color_identity),
    rarity: textValue(enrichment?.rarity),
    scryfallUri: textValue(enrichment?.scryfall_uri),
    imageUris: imageUrisFrom(enrichment) ?? imageUrisFrom(firstFace)
  };
}

export function metadataFromDeckCard(card: DeckCardOption | undefined): OfficialCardMetadata | null {
  if (!card) {
    return null;
  }
  return {
    name: card.name,
    setCode: card.setCode,
    setName: card.setName,
    collectorNumber: card.collectorNumber,
    manaCost: card.manaCost,
    manaValue: card.manaValue,
    typeLine: card.typeLine,
    oracleText: card.oracleText,
    flavorText: card.flavorText,
    colors: card.colors,
    colorIdentity: card.colorIdentity,
    rarity: card.rarity,
    scryfallUri: card.sourceUri,
    imageUris: card.imageUris
  };
}

export function imageUrlForMetadata(metadata: OfficialCardMetadata | null | undefined, preference: keyof CardImageUris = 'normal'): string {
  const images = metadata?.imageUris;
  if (!images) {
    return '';
  }
  return images[preference] ?? images.normal ?? images.large ?? images.png ?? images.small ?? images.artCrop ?? images.borderCrop ?? '';
}

export function printLabelForMetadata(metadata: OfficialCardMetadata | null | undefined): string {
  if (!metadata) {
    return '-';
  }
  return [metadata.setCode, metadata.collectorNumber].filter(Boolean).join(' ') || metadata.setName || '-';
}

export function collectionValueEstimateFromEntry(entry: CollectionEntry): CollectionValueEstimate | null {
  if (entry.estimatedMarketPrice !== undefined) {
    return {
      amount: entry.estimatedMarketPrice,
      currency: entry.estimatedMarketCurrency ?? 'USD',
      source: entry.marketPriceSource ?? 'local snapshot'
    };
  }
  const source = parseSourceRow(entry.sourceRow);
  if (!source) {
    return null;
  }
  const enrichment = objectValue(source.enrichment) ?? objectValue(source.scryfall);
  const csv = objectValue(source.csv);
  const records = [source, enrichment, objectValue(enrichment?.prices), objectValue(enrichment?.pricing), csv].filter(Boolean) as Array<Record<string, unknown>>;
  const preferredKeys = isPremiumFinish(entry.finish) ? ['usd_foil', 'usdFoil', 'foil', 'foil_price', 'Foil Price'] : ['usd', 'usd_regular', 'market_price', 'Market Price', 'TCG Market Price', 'Listed Median'];
  const fallbackKeys = ['usd', 'usd_foil', 'eur', 'tix', 'price', 'market', 'median', 'low', 'mid', 'high'];
  for (const key of [...preferredKeys, ...fallbackKeys]) {
    for (const record of records) {
      const amount = moneyValue(record[key]);
      if (amount !== undefined) {
        return {
          amount,
          currency: key.toLowerCase().includes('eur') ? 'EUR' : key.toLowerCase().includes('tix') ? 'TIX' : 'USD',
          source: textValue(record.source) ?? textValue(enrichment?.source) ?? entry.source
        };
      }
    }
  }
  return null;
}

function isPremiumFinish(value: string | undefined): boolean {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === 'foil' || normalized.includes('etched');
}

function parseSourceRow(value: string | undefined): Record<string, unknown> | undefined {
  if (!value) {
    return undefined;
  }
  try {
    return objectValue(JSON.parse(value));
  } catch {
    try {
      return objectValue(JSON.parse(value.replace(/\r?\n/g, '\\n')));
    } catch {
      return undefined;
    }
  }
}

function firstCardFace(value: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  const faces = value?.card_faces;
  return Array.isArray(faces) ? objectValue(faces[0]) : undefined;
}

function faceText(value: Record<string, unknown> | undefined, key: 'oracle_text' | 'flavor_text'): string | undefined {
  const faces = value?.card_faces;
  if (!Array.isArray(faces)) {
    return undefined;
  }
  const lines = faces
    .map((face) => {
      const faceObject = objectValue(face);
      const text = textValue(faceObject?.[key]);
      if (!text) {
        return '';
      }
      const name = textValue(faceObject?.name);
      return name ? `${name}: ${text}` : text;
    })
    .filter(Boolean);
  return lines.length ? lines.join('\n\n') : undefined;
}

function imageUrisFrom(value: Record<string, unknown> | undefined): CardImageUris | undefined {
  const raw = objectValue(value?.image_uris) ?? objectValue(value?.imageUris);
  if (!raw) {
    return undefined;
  }
  const images: CardImageUris = {
    small: textValue(raw.small),
    normal: textValue(raw.normal),
    large: textValue(raw.large),
    png: textValue(raw.png),
    artCrop: textValue(raw.art_crop) || textValue(raw.artCrop),
    borderCrop: textValue(raw.border_crop) || textValue(raw.borderCrop)
  };
  return Object.values(images).some(Boolean) ? images : undefined;
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function textValue(value: unknown): string | undefined {
  const text = String(value ?? '').trim();
  return text || undefined;
}

function numberValue(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function moneyValue(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : undefined;
  }
  const cleaned = String(value ?? '').replace(/[$,\s]/g, '');
  if (!cleaned) {
    return undefined;
  }
  const number = Number(cleaned);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function colorsValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? '').trim()).filter(Boolean).join('');
  }
  return textValue(value);
}

import { z } from 'zod';

export const collectionSourcePresetSchema = z.enum(['manabox', 'tcgplayer', 'dragonshield', 'delver', 'generic', 'scryfall']);
export const collectionImportContentFormatSchema = z.enum(['csv', 'text', 'cockatrice']);
export const collectionImportModeSchema = z.enum(['append', 'replace']);
export const collectionMatchStrategySchema = z.enum(['scryfall_id', 'set_number', 'set_name', 'unresolved']);
export const collectionReviewStatusSchema = z.enum(['matched', 'needs_review']);
export const collectionPurposeSchema = z.enum(['owned', 'inspiration', 'homebrew_print_run', 'research', 'mixed']);
export const collectionPreviewArtSourceSchema = z.enum(['auto', 'local', 'scryfall', 'none']);
export const collectionKindSchema = z.enum(['binder', 'list']);
export const collectionListCategorySchema = z.enum(['general', 'wishlist', 'recommendation', 'starred', 'flagged', 'gift']);
export const collectionOwnershipStatusSchema = z.enum(['owned', 'wanted', 'recommended', 'reference', 'proxy', 'homebrew_unprinted']);
export const DEFAULT_COLLECTION_OWNER_NAME = 'Kyle';

const optionalNumber = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}, z.number().min(0).optional());

const booleanCell = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') {
    return false;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  return ['true', '1', 'yes', 'y'].includes(String(value).toLowerCase());
}, z.boolean());

const stringArray = z.preprocess((value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (value === undefined || value === null || value === '') {
    return [];
  }
  return String(value)
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean);
}, z.array(z.string()).default([]));

export const collectionMetadataSchema = z.object({
  collectionId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  linkedUniverseId: z.string().optional(),
  gameId: z.string().default('mtg'),
  purpose: collectionPurposeSchema.default('mixed'),
  source: collectionSourcePresetSchema.default('generic'),
  kind: collectionKindSchema.default('binder'),
  listCategory: collectionListCategorySchema.default('general'),
  tags: stringArray,
  defaultEntryTags: stringArray,
  defaultOwnershipStatus: collectionOwnershipStatusSchema.optional(),
  defaultStarred: booleanCell.default(false),
  defaultFlagged: booleanCell.default(false),
  defaultProxy: booleanCell.default(false),
  defaultHomebrew: booleanCell.default(false),
  accentColor: z.string().optional(),
  coverImageRef: z.string().optional(),
  linkedSetCodes: stringArray,
  acquisitionNotes: z.string().optional(),
  purchaseTotal: optionalNumber,
  purchaseCurrency: z.string().optional(),
  purchaseDate: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export const collectionEntrySchema = z.object({
  collectionId: z.string().min(1),
  entryId: z.string().min(1),
  quantity: z.number().int().positive(),
  ownershipStatus: collectionOwnershipStatusSchema.default('owned'),
  ownerName: z.string().default(DEFAULT_COLLECTION_OWNER_NAME),
  cardName: z.string().min(1),
  setCode: z.string().optional(),
  setName: z.string().optional(),
  collectorNumber: z.string().optional(),
  scryfallId: z.string().optional(),
  finish: z.string().optional(),
  condition: z.string().optional(),
  language: z.string().optional(),
  location: z.string().optional(),
  source: collectionSourcePresetSchema.default('generic'),
  sourceRow: z.string().optional(),
  matchKey: z.string().optional(),
  matchStrategy: collectionMatchStrategySchema,
  reviewStatus: collectionReviewStatusSchema,
  reviewNotes: z.string().optional(),
  linkedSetCode: z.string().optional(),
  linkedCardId: z.string().optional(),
  linkedVariantId: z.string().optional(),
  previewArtSource: collectionPreviewArtSourceSchema.default('auto'),
  purchasePrice: optionalNumber,
  purchaseCurrency: z.string().optional(),
  purchaseDate: z.string().optional(),
  estimatedMarketPrice: optionalNumber,
  estimatedMarketCurrency: z.string().optional(),
  marketPriceSource: z.string().optional(),
  marketPriceUpdatedAt: z.string().optional(),
  tags: stringArray,
  notes: z.string().optional(),
  starred: booleanCell.default(false),
  flagged: booleanCell.default(false),
  altered: booleanCell.default(false),
  misprint: booleanCell.default(false),
  proxy: booleanCell.default(false),
  homebrew: booleanCell.default(false),
  markedForDeletion: booleanCell.default(false)
});

export type CollectionSourcePreset = z.output<typeof collectionSourcePresetSchema>;
export type CollectionImportContentFormat = z.output<typeof collectionImportContentFormatSchema>;
export type CollectionImportMode = z.output<typeof collectionImportModeSchema>;
export type CollectionMatchStrategy = z.output<typeof collectionMatchStrategySchema>;
export type CollectionReviewStatus = z.output<typeof collectionReviewStatusSchema>;
export type CollectionPurpose = z.output<typeof collectionPurposeSchema>;
export type CollectionPreviewArtSource = z.output<typeof collectionPreviewArtSourceSchema>;
export type CollectionKind = z.output<typeof collectionKindSchema>;
export type CollectionListCategory = z.output<typeof collectionListCategorySchema>;
export type CollectionOwnershipStatus = z.output<typeof collectionOwnershipStatusSchema>;
export type CollectionMetadata = z.output<typeof collectionMetadataSchema>;
export type CollectionEntry = z.output<typeof collectionEntrySchema>;

export interface CollectionSummary extends CollectionMetadata {
  entryCount: number;
  cardCount: number;
  matchedCount: number;
  reviewCount: number;
  sourceCount: number;
  ownerNames: string[];
}

export interface CollectionState {
  metadata: CollectionMetadata;
  entries: CollectionEntry[];
  warnings: string[];
}

export interface CollectionImportRequest {
  collectionId: string;
  name?: string;
  description?: string;
  linkedUniverseId?: string;
  gameId?: string;
  purpose?: CollectionPurpose;
  kind?: CollectionKind;
  listCategory?: CollectionListCategory;
  defaultOwnershipStatus?: CollectionOwnershipStatus;
  defaultEntryTags?: string[];
  defaultStarred?: boolean;
  defaultFlagged?: boolean;
  defaultProxy?: boolean;
  defaultHomebrew?: boolean;
  source: CollectionSourcePreset;
  contentFormat?: CollectionImportContentFormat;
  content: string;
  mode?: CollectionImportMode;
  dryRun?: boolean;
}

export interface CreateCollectionRequest {
  collectionId?: string;
  name: string;
  description?: string;
  linkedUniverseId?: string;
  gameId?: string;
  purpose?: CollectionPurpose;
  kind?: CollectionKind;
  listCategory?: CollectionListCategory;
  defaultOwnershipStatus?: CollectionOwnershipStatus;
  defaultEntryTags?: string[];
  defaultStarred?: boolean;
  defaultFlagged?: boolean;
  defaultProxy?: boolean;
  defaultHomebrew?: boolean;
  source?: CollectionSourcePreset;
}

export interface SaveCollectionRequest {
  metadata: CollectionMetadata;
  entries: CollectionEntry[];
}

export interface CollectionImportSummary {
  collectionId: string;
  source: CollectionSourcePreset;
  mode: CollectionImportMode;
  dryRun: boolean;
  importedRows: number;
  writtenRows: number;
  matchedRows: number;
  reviewRows: number;
  scryfallIdMatches: number;
  setNumberMatches: number;
  setNameMatches: number;
  unresolvedRows: number;
  warnings: string[];
}

export interface CollectionImportResult {
  collection: CollectionState;
  summary: CollectionImportSummary;
}

export interface CollectionPriceRefreshRequest {
  collectionId: string;
  source?: 'scryfall';
  onlyMissing?: boolean;
  dryRun?: boolean;
  updatedAt?: string;
}

export interface CollectionPriceImportRequest {
  collectionId: string;
  source?: string;
  content: string;
  dryRun?: boolean;
  updatedAt?: string;
}

export interface CollectionPriceRefreshSummary {
  collectionId: string;
  source: string;
  dryRun: boolean;
  checkedRows: number;
  updatedRows: number;
  unchangedRows: number;
  missingRows: number;
  matchedByScryfallId: number;
  matchedByPrint: number;
  updatedAt: string;
  warnings: string[];
}

export interface CollectionPriceRefreshResult {
  collection: CollectionState;
  summary: CollectionPriceRefreshSummary;
}

export type CollectionExportTarget = 'csv' | 'text' | 'cockatrice';

export interface CollectionExportResult {
  filename: string;
  mimeType: string;
  content: string;
}

export const COLLECTION_ENTRY_HEADERS = [
  'collection_id',
  'entry_id',
  'quantity',
  'ownership_status',
  'owner_name',
  'card_name',
  'set_code',
  'set_name',
  'collector_number',
  'scryfall_id',
  'finish',
  'condition',
  'language',
  'location',
  'source',
  'source_row',
  'match_key',
  'match_strategy',
  'review_status',
  'review_notes',
  'linked_set_code',
  'linked_card_id',
  'linked_variant_id',
  'preview_art_source',
  'purchase_price',
  'purchase_currency',
  'purchase_date',
  'estimated_market_price',
  'estimated_market_currency',
  'market_price_source',
  'market_price_updated_at',
  'tags',
  'notes',
  'starred',
  'flagged',
  'altered',
  'misprint',
  'proxy',
  'homebrew',
  'marked_for_deletion'
];

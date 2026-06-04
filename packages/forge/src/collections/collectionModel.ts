import { z } from 'zod';

export const collectionSourcePresetSchema = z.enum(['manabox', 'tcgplayer', 'dragonshield', 'delver', 'generic']);
export const collectionImportModeSchema = z.enum(['append', 'replace']);
export const collectionMatchStrategySchema = z.enum(['scryfall_id', 'set_number', 'set_name', 'unresolved']);
export const collectionReviewStatusSchema = z.enum(['matched', 'needs_review']);
export const collectionPurposeSchema = z.enum(['owned', 'inspiration', 'homebrew_print_run', 'research', 'mixed']);

export const collectionMetadataSchema = z.object({
  collectionId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  linkedUniverseId: z.string().optional(),
  gameId: z.string().default('mtg'),
  purpose: collectionPurposeSchema.default('mixed'),
  source: collectionSourcePresetSchema.default('generic'),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export const collectionEntrySchema = z.object({
  collectionId: z.string().min(1),
  entryId: z.string().min(1),
  quantity: z.number().int().positive(),
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
  reviewNotes: z.string().optional()
});

export type CollectionSourcePreset = z.output<typeof collectionSourcePresetSchema>;
export type CollectionImportMode = z.output<typeof collectionImportModeSchema>;
export type CollectionMatchStrategy = z.output<typeof collectionMatchStrategySchema>;
export type CollectionReviewStatus = z.output<typeof collectionReviewStatusSchema>;
export type CollectionPurpose = z.output<typeof collectionPurposeSchema>;
export type CollectionMetadata = z.output<typeof collectionMetadataSchema>;
export type CollectionEntry = z.output<typeof collectionEntrySchema>;

export interface CollectionSummary extends CollectionMetadata {
  entryCount: number;
  cardCount: number;
  matchedCount: number;
  reviewCount: number;
  sourceCount: number;
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
  source: CollectionSourcePreset;
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
  source?: CollectionSourcePreset;
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
  'review_notes'
];

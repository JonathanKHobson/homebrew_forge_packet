import { z } from 'zod';
import type { CollectionKind, CollectionListCategory, CollectionOwnershipStatus } from '../collections/collectionModel.js';
import type { CardRecord } from '../domain/schemas.js';

export const deckSectionSchema = z.enum(['main', 'side', 'maybe']);
export const deckStatusSchema = z.enum(['idea', 'draft', 'playtest', 'final', 'archived']);
export const deckVariantStatusSchema = z.enum(['draft', 'testing', 'locked', 'final', 'archived']);
export const deckCandidateStatusSchema = z.enum(['active', 'candidate', 'testing', 'locked', 'cut']);
export const deckRoleSourceSchema = z.enum(['manual', 'heuristic', 'external_dataset', 'none']);

export const deckCardReferenceSchema = z.object({
  setCode: z.string().min(1),
  cardId: z.string().min(1),
  variantId: z.string().optional(),
  nameSnapshot: z.string().optional()
});

export const deckVariantSchema = z.object({
  deckId: z.string().min(1),
  variantId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  status: deckVariantStatusSchema.default('draft'),
  colorIdentity: z.string().optional(),
  commander: deckCardReferenceSchema.optional(),
  partnerCommanders: z.array(deckCardReferenceSchema).default([]),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export const deckMetadataSchema = z.object({
  deckId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  linkedUniverseId: z.string().optional(),
  linkedSetCode: z.string().optional(),
  format: z.string().optional(),
  playStyleTags: z.array(z.string()).default([]),
  colorIdentity: z.string().optional(),
  commander: deckCardReferenceSchema.optional(),
  partnerCommanders: z.array(deckCardReferenceSchema).default([]),
  coverCard: deckCardReferenceSchema.optional(),
  commanderBracket: z.string().optional(),
  status: deckStatusSchema.default('draft'),
  activeVariantId: z.string().optional(),
  variants: z.array(deckVariantSchema).default([]),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export const deckEntrySchema = z.object({
  deckId: z.string().min(1),
  entryId: z.string().optional(),
  deckVariantId: z.string().optional(),
  section: deckSectionSchema,
  count: z.number().int().positive(),
  setCode: z.string().min(1),
  cardId: z.string().min(1),
  variantId: z.string().optional(),
  nameSnapshot: z.string().optional(),
  candidateStatus: deckCandidateStatusSchema.optional(),
  roles: z.array(z.string()).optional(),
  roleSource: deckRoleSourceSchema.optional(),
  roleConfidence: z.number().min(0).max(1).optional(),
  impactRating: z.number().int().min(0).max(5).optional(),
  synergyRating: z.number().int().min(0).max(5).optional(),
  qualityRating: z.number().int().min(0).max(5).optional(),
  entryTags: z.array(z.string()).optional(),
  entryNotes: z.string().optional(),
  flags: z.array(z.string()).optional(),
  starred: z.boolean().optional(),
  markedForDeletion: z.boolean().optional()
});

export type DeckSection = z.output<typeof deckSectionSchema>;
export type DeckStatus = z.output<typeof deckStatusSchema>;
export type DeckVariantStatus = z.output<typeof deckVariantStatusSchema>;
export type DeckCandidateStatus = z.output<typeof deckCandidateStatusSchema>;
export type DeckRoleSource = z.output<typeof deckRoleSourceSchema>;
export type DeckCardReference = z.output<typeof deckCardReferenceSchema>;
export type DeckVariant = z.output<typeof deckVariantSchema>;
export type DeckMetadata = z.output<typeof deckMetadataSchema>;
export type DeckEntry = z.output<typeof deckEntrySchema>;

export interface DeckSummary extends DeckMetadata {
  cardCount: number;
  mainCount: number;
  sideCount: number;
  maybeCount: number;
  variantCount: number;
  activeVariantId: string;
  activeVariantName: string;
  candidateCount: number;
  cutCount: number;
  unresolvedCount: number;
  coverImageUrl?: string;
}

export interface DeckCardOption {
  setCode: string;
  setName: string;
  cardId: string;
  collectorNumber: string;
  name: string;
  typeLine: string;
  rarity: CardRecord['rarity'];
  colors: string;
  manaCost: string;
  manaValue?: number;
  colorIdentity: string;
  oracleText: string;
  flavorText: string;
  power: string;
  toughness: string;
  status: CardRecord['status'];
  tags: string[];
  source?: 'authored' | 'collection';
  sourceUri?: string;
  collectionId?: string;
  collectionKind?: CollectionKind;
  collectionListCategory?: CollectionListCategory;
  ownershipStatus?: CollectionOwnershipStatus;
  ownerName?: string;
  imageUris?: {
    small?: string;
    normal?: string;
    large?: string;
    png?: string;
    artCrop?: string;
    borderCrop?: string;
  };
  variants: Array<{
    variantId: string;
    displayName: string;
    kind: string;
    status: string;
    isPrimary: boolean;
  }>;
}

export interface ResolvedDeckEntry extends DeckEntry {
  card?: DeckCardOption;
  warning?: string;
}

export interface DeckState {
  metadata: DeckMetadata;
  variants: DeckVariant[];
  activeVariantId: string;
  activeVariant: DeckVariant;
  entries: ResolvedDeckEntry[];
  availableCards: DeckCardOption[];
  warnings: string[];
}

export interface CreateDeckRequest {
  name: string;
  description?: string;
  linkedUniverseId?: string;
  linkedSetCode?: string;
  format?: string;
  playStyleTags?: string[];
  colorIdentity?: string;
  commander?: DeckCardReference;
  partnerCommanders?: DeckCardReference[];
  coverCard?: DeckCardReference;
  commanderBracket?: string;
  status?: DeckStatus;
  tags?: string[];
  notes?: string;
}

export interface SaveDeckRequest {
  metadata: DeckMetadata;
  entries: DeckEntry[];
}

export interface DeckExportResult {
  filename: string;
  mimeType: string;
  content: string;
}

export type DeckImportSourceFormat = 'text' | 'markdown' | 'cockatrice' | 'csv';
export type DeckImportMode = 'create' | 'append' | 'replace';

export interface ImportDeckRequest {
  deckId?: string;
  name?: string;
  description?: string;
  linkedUniverseId?: string;
  linkedSetCode?: string;
  format?: string;
  playStyleTags?: string[];
  colorIdentity?: string;
  commander?: DeckCardReference;
  partnerCommanders?: DeckCardReference[];
  coverCard?: DeckCardReference;
  commanderBracket?: string;
  status?: DeckStatus;
  tags?: string[];
  notes?: string;
  sourceFormat: DeckImportSourceFormat;
  mode?: DeckImportMode;
  content: string;
  dryRun?: boolean;
}

export interface DeckImportSummary {
  deckId?: string;
  name: string;
  sourceFormat: DeckImportSourceFormat;
  mode: DeckImportMode;
  dryRun: boolean;
  importedEntries: number;
  mainCount: number;
  sideCount: number;
  maybeCount: number;
  unresolvedCount: number;
  warnings: string[];
}

export interface DeckImportResult {
  summary: DeckImportSummary;
  deck?: DeckState;
}

export const DECK_ENTRY_HEADERS = [
  'deck_id',
  'entry_id',
  'deck_variant_id',
  'section',
  'count',
  'set_code',
  'card_id',
  'variant_id',
  'name_snapshot',
  'candidate_status',
  'roles',
  'role_source',
  'role_confidence',
  'impact_rating',
  'synergy_rating',
  'quality_rating',
  'entry_tags',
  'entry_notes',
  'flags',
  'starred',
  'marked_for_deletion'
];

export const DECK_SECTIONS: DeckSection[] = ['main', 'side', 'maybe'];

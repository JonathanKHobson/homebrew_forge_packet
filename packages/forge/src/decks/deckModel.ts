import { z } from 'zod';
import type { CardRecord } from '../domain/schemas.js';

export const deckSectionSchema = z.enum(['main', 'side', 'maybe']);
export const deckStatusSchema = z.enum(['idea', 'draft', 'playtest', 'final', 'archived']);

export const deckMetadataSchema = z.object({
  deckId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  linkedUniverseId: z.string().optional(),
  linkedSetCode: z.string().optional(),
  format: z.string().optional(),
  status: deckStatusSchema.default('draft'),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export const deckEntrySchema = z.object({
  deckId: z.string().min(1),
  section: deckSectionSchema,
  count: z.number().int().positive(),
  setCode: z.string().min(1),
  cardId: z.string().min(1),
  nameSnapshot: z.string().optional()
});

export type DeckSection = z.output<typeof deckSectionSchema>;
export type DeckStatus = z.output<typeof deckStatusSchema>;
export type DeckMetadata = z.output<typeof deckMetadataSchema>;
export type DeckEntry = z.output<typeof deckEntrySchema>;

export interface DeckSummary extends DeckMetadata {
  cardCount: number;
  mainCount: number;
  sideCount: number;
  maybeCount: number;
  unresolvedCount: number;
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
  colorIdentity: string;
  oracleText: string;
  flavorText: string;
  power: string;
  toughness: string;
  status: CardRecord['status'];
  tags: string[];
}

export interface ResolvedDeckEntry extends DeckEntry {
  card?: DeckCardOption;
  warning?: string;
}

export interface DeckState {
  metadata: DeckMetadata;
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

export const DECK_ENTRY_HEADERS = ['deck_id', 'section', 'count', 'set_code', 'card_id', 'name_snapshot'];

export const DECK_SECTIONS: DeckSection[] = ['main', 'side', 'maybe'];

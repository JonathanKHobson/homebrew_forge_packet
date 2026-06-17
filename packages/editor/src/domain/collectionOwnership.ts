import type { CollectionEntry, CollectionState } from './editorTypes.js';
import { collectionValueEstimateFromEntry } from './officialCardMetadata.js';

export const DEFAULT_COLLECTION_OWNER_NAME = 'Kyle';
export type CollectionViewMode = 'table' | 'grid' | 'list' | 'single';
export type BulkTextMode = 'ignore' | 'replace' | 'append';
export type BulkTagMode = 'ignore' | 'replace' | 'add';

export interface CollectionBulkEditPatch {
  fields: Partial<CollectionEntry>;
  tagMode: BulkTagMode;
  tags: string[];
  noteMode: BulkTextMode;
  notes?: string;
}

export interface CollectionOwnershipSummary {
  totalCards: number;
  duplicateCopies: number;
  premiumCopies: number;
  knownConditionCopies: number;
  reviewCopies: number;
  starredCopies: number;
  flaggedCopies: number;
  deletionCopies: number;
  valueSourceRows: number;
  estimatedValue: number;
  valueCurrency: string;
  purchaseRows: number;
  purchaseTotal: number;
  purchaseCurrency: string;
  gainLoss: number | null;
}

export function summarizeCollectionOwnership(collection: CollectionState | null): CollectionOwnershipSummary {
  const entries = collection?.entries ?? [];
  const totalCards = entries.reduce((total, entry) => total + entry.quantity, 0);
  const uniquePrints = new Set(entries.map((entry) => `${entry.cardName.toLowerCase()}::${entry.setCode ?? ''}::${entry.collectorNumber ?? ''}`));
  const valueEstimates = entries
    .map((entry) => ({ entry, estimate: collectionValueEstimateFromEntry(entry) }))
    .filter((candidate): candidate is { entry: CollectionEntry; estimate: NonNullable<ReturnType<typeof collectionValueEstimateFromEntry>> } => Boolean(candidate.estimate));
  const rowPurchaseTotal = entries.reduce((total, entry) => total + (entry.purchasePrice ?? 0) * entry.quantity, 0);
  const purchaseRows = entries.filter((entry) => entry.purchasePrice !== undefined).length;
  const metadataPurchaseTotal = collection?.metadata.purchaseTotal;
  const purchaseTotal = metadataPurchaseTotal ?? rowPurchaseTotal;
  const estimatedValue = valueEstimates.reduce((total, { entry, estimate }) => total + estimate.amount * entry.quantity, 0);

  return {
    totalCards,
    duplicateCopies: Math.max(0, totalCards - uniquePrints.size),
    premiumCopies: entries.filter((entry) => /foil|etched/i.test(entry.finish ?? '')).reduce((total, entry) => total + entry.quantity, 0),
    knownConditionCopies: entries.filter((entry) => entry.condition && entry.condition !== 'Unknown').reduce((total, entry) => total + entry.quantity, 0),
    reviewCopies: entries.filter((entry) => entry.reviewStatus === 'needs_review').reduce((total, entry) => total + entry.quantity, 0),
    starredCopies: entries.filter((entry) => entry.starred).reduce((total, entry) => total + entry.quantity, 0),
    flaggedCopies: entries.filter((entry) => entry.flagged).reduce((total, entry) => total + entry.quantity, 0),
    deletionCopies: entries.filter((entry) => entry.markedForDeletion).reduce((total, entry) => total + entry.quantity, 0),
    valueSourceRows: valueEstimates.length,
    estimatedValue,
    valueCurrency: valueEstimates[0]?.estimate.currency ?? collection?.metadata.purchaseCurrency ?? 'USD',
    purchaseRows: metadataPurchaseTotal !== undefined ? entries.length : purchaseRows,
    purchaseTotal,
    purchaseCurrency: collection?.metadata.purchaseCurrency ?? entries.find((entry) => entry.purchaseCurrency)?.purchaseCurrency ?? 'USD',
    gainLoss: valueEstimates.length && purchaseTotal ? estimatedValue - purchaseTotal : null
  };
}

export function normalizeCollectionTags(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value : String(value ?? '').split(';');
  return [...new Set(raw.map((tag) => tag.trim()).filter(Boolean))];
}

export function normalizeCollectionOwnerName(value: string | undefined): string {
  return value?.trim() || DEFAULT_COLLECTION_OWNER_NAME;
}

export function collectionOwnerSuggestions(...sources: Array<Array<string | undefined> | undefined>): string[] {
  const names = [DEFAULT_COLLECTION_OWNER_NAME, ...sources.flatMap((source) => source ?? [])].map(normalizeCollectionOwnerName);
  const seen = new Set<string>();
  return names.filter((name) => {
    const key = name.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function applyCollectionBulkEdit(entry: CollectionEntry, patch: CollectionBulkEditPatch): CollectionEntry {
  const next: CollectionEntry = {
    ...entry,
    ...patch.fields
  };
  if (patch.tagMode === 'replace') {
    next.tags = patch.tags;
  } else if (patch.tagMode === 'add') {
    next.tags = normalizeCollectionTags([...(entry.tags ?? []), ...patch.tags]);
  }
  if (patch.noteMode === 'replace') {
    next.notes = patch.notes?.trim() || undefined;
  } else if (patch.noteMode === 'append' && patch.notes?.trim()) {
    next.notes = [entry.notes, patch.notes.trim()].filter(Boolean).join('\n');
  }
  return {
    ...next,
    ownerName: normalizeCollectionOwnerName(next.ownerName),
    quantity: Math.max(1, Number(next.quantity) || 1)
  };
}

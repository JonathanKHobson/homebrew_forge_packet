import type {
  CardDraft,
  CockatriceSyncResult,
  AddOfficialCardToSetResult,
  CollectionExportResult,
  CollectionExportTarget,
  CollectionImportContentFormat,
  CollectionImportMode,
  CollectionImportSummary,
  CollectionPriceImportRequest,
  CollectionPriceRefreshRequest,
  CollectionPriceRefreshResult,
  CollectionSourcePreset,
  CollectionState,
  CollectionSummary,
  CreateCollectionRequest,
  CreateDeckRequest,
  CreateLibraryAssetRequest,
  CreateSetRequest,
  CreateUniverseRequest,
  DeckExportResult,
  DeckImportResult,
  DeckState,
  DeckSummary,
  EditorProject,
  ExportSourceRequest,
  ExportSourceResult,
  ImportCardsRequest,
  ImportCardsSummary,
  ImportCollectionToSetRequest,
  ImportCollectionToSetResult,
  ImportDeckRequest,
  LibraryState,
  OfficialCardCatalogStatus,
  OfficialCardSearchFilters,
  OfficialCardSearchResult,
  PrintExportRequest,
  PrintExportResult,
  PreviewResponse,
  RuntimeHealth,
  SaveCollectionRequest,
  UpdateSetRequest,
  UpdateUniverseRequest
} from '../domain/editorTypes.js';
import type { AddOfficialCardToCollectionRequest, AddOfficialCardToDeckRequest, AddOfficialCardToSetRequest } from '@homebrew-forge/forge';
import type { CreateReferenceRequest, CreateReferenceResult, ReferenceCatalog } from '@homebrew-forge/forge';

export async function fetchLibrary(): Promise<LibraryState> {
  return fetchJson<LibraryState>('/api/library');
}

export async function fetchHealth(): Promise<RuntimeHealth> {
  return fetchJson<RuntimeHealth>('/api/health');
}

export async function restartApp(): Promise<{ restarting: boolean }> {
  return postJson<{ restarting: boolean }>('/api/restart', {});
}

export async function fetchReference(): Promise<ReferenceCatalog> {
  return fetchJson<ReferenceCatalog>('/api/reference');
}

export async function createReference(request: CreateReferenceRequest): Promise<CreateReferenceResult> {
  return postJson<CreateReferenceResult>('/api/reference', request);
}

export async function fetchOfficialCardStatus(): Promise<OfficialCardCatalogStatus> {
  return fetchJson<OfficialCardCatalogStatus>('/api/official-cards/status');
}

export async function searchOfficialCardCatalog(filters: OfficialCardSearchFilters): Promise<OfficialCardSearchResult> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  }
  return fetchJson<OfficialCardSearchResult>(`/api/official-cards/search?${params.toString()}`);
}

export async function syncOfficialCardCatalog(view: 'prints' | 'oracle' | 'both' = 'both'): Promise<OfficialCardCatalogStatus> {
  return postJson<OfficialCardCatalogStatus>('/api/official-cards/sync', { view });
}

export async function addOfficialCardToCollection(request: AddOfficialCardToCollectionRequest): Promise<{ collections: CollectionSummary[]; collection: CollectionState }> {
  return postJson<{ collections: CollectionSummary[]; collection: CollectionState }>('/api/official-cards/add-to-collection', request);
}

export async function addOfficialCardToDeck(request: AddOfficialCardToDeckRequest): Promise<{ decks: DeckSummary[]; deck: DeckState }> {
  return postJson<{ decks: DeckSummary[]; deck: DeckState }>('/api/official-cards/add-to-deck', request);
}

export async function addOfficialCardToSet(request: AddOfficialCardToSetRequest): Promise<AddOfficialCardToSetResult> {
  return postJson<AddOfficialCardToSetResult>('/api/official-cards/add-to-set', request);
}

export async function fetchProject(setCode = 'DEMO'): Promise<EditorProject> {
  return fetchJson<EditorProject>(`/api/project?set=${encodeURIComponent(setCode)}`);
}

export async function fetchDecks(): Promise<DeckSummary[]> {
  return fetchJson<DeckSummary[]>('/api/decks');
}

export async function fetchDeck(deckId: string): Promise<DeckState> {
  if (!deckId.trim()) {
    throw new Error('Choose a deck first.');
  }
  return fetchJson<DeckState>(`/api/deck?id=${encodeURIComponent(deckId)}`);
}

export async function createDeck(request: CreateDeckRequest): Promise<{ decks: DeckSummary[]; deck: DeckState }> {
  return postJson<{ decks: DeckSummary[]; deck: DeckState }>('/api/create-deck', request);
}

export async function saveDeck(deck: DeckState): Promise<{ decks: DeckSummary[]; deck: DeckState }> {
  return postJson<{ decks: DeckSummary[]; deck: DeckState }>('/api/save-deck', {
    metadata: deck.metadata,
    entries: deck.entries.map((entry) => ({
      deckId: entry.deckId,
      entryId: entry.entryId,
      deckVariantId: entry.deckVariantId,
      section: entry.section,
      count: entry.count,
      setCode: entry.setCode,
      cardId: entry.cardId,
      variantId: entry.variantId,
      nameSnapshot: entry.nameSnapshot ?? entry.card?.name,
      candidateStatus: entry.candidateStatus,
      roles: entry.roles,
      roleSource: entry.roleSource,
      roleConfidence: entry.roleConfidence,
      impactRating: entry.impactRating,
      synergyRating: entry.synergyRating,
      qualityRating: entry.qualityRating,
      entryTags: entry.entryTags,
      entryNotes: entry.entryNotes,
      flags: entry.flags,
      starred: entry.starred,
      markedForDeletion: entry.markedForDeletion
    }))
  });
}

export async function exportDeck(deckId: string, target: 'text' | 'cockatrice'): Promise<DeckExportResult> {
  if (!deckId.trim()) {
    throw new Error('Choose a deck first.');
  }
  return postJson<DeckExportResult>('/api/export-deck', { deckId, target });
}

export async function importDeck(request: ImportDeckRequest): Promise<{ decks: DeckSummary[]; result: DeckImportResult }> {
  return postJson<{ decks: DeckSummary[]; result: DeckImportResult }>('/api/import-deck', request);
}

export async function fetchCollections(): Promise<CollectionSummary[]> {
  return fetchJson<CollectionSummary[]>('/api/collections');
}

export async function fetchCollection(collectionId: string): Promise<CollectionState> {
  if (!collectionId.trim()) {
    throw new Error('Choose a collection first.');
  }
  return fetchJson<CollectionState>(`/api/collection?id=${encodeURIComponent(collectionId)}`);
}

export async function createCollection(request: CreateCollectionRequest): Promise<{ collections: CollectionSummary[]; collection: CollectionState }> {
  return postJson<{ collections: CollectionSummary[]; collection: CollectionState }>('/api/create-collection', request);
}

export async function saveCollection(collection: CollectionState): Promise<{ collections: CollectionSummary[]; collection: CollectionState }> {
  const request: SaveCollectionRequest = {
    metadata: collection.metadata,
    entries: collection.entries
  };
  return postJson<{ collections: CollectionSummary[]; collection: CollectionState }>('/api/save-collection', request);
}

export async function importCollection(request: {
  collectionId: string;
  name?: string;
  description?: string;
  linkedUniverseId?: string;
  gameId?: string;
  purpose?: CollectionState['metadata']['purpose'];
  kind?: CollectionState['metadata']['kind'];
  listCategory?: CollectionState['metadata']['listCategory'];
  defaultOwnershipStatus?: CollectionState['metadata']['defaultOwnershipStatus'];
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
}): Promise<{ collections: CollectionSummary[]; collection: CollectionState; summary: CollectionImportSummary }> {
  return postJson<{ collections: CollectionSummary[]; collection: CollectionState; summary: CollectionImportSummary }>('/api/import-collection', request);
}

export async function exportCollection(collectionId: string, target: CollectionExportTarget): Promise<CollectionExportResult> {
  if (!collectionId.trim()) {
    throw new Error('Choose a collection first.');
  }
  return postJson<CollectionExportResult>('/api/export-collection', { collectionId, target });
}

export async function refreshCollectionPrices(request: CollectionPriceRefreshRequest): Promise<{ collections: CollectionSummary[]; result: CollectionPriceRefreshResult }> {
  return postJson<{ collections: CollectionSummary[]; result: CollectionPriceRefreshResult }>('/api/collection-prices/refresh', request);
}

export async function importCollectionPrices(request: CollectionPriceImportRequest): Promise<{ collections: CollectionSummary[]; result: CollectionPriceRefreshResult }> {
  return postJson<{ collections: CollectionSummary[]; result: CollectionPriceRefreshResult }>('/api/collection-prices/import', request);
}

export async function importCollectionToSet(request: ImportCollectionToSetRequest): Promise<ImportCollectionToSetResult> {
  return postJson<ImportCollectionToSetResult>('/api/import-collection-to-set', request);
}

export async function fetchPreview(draft: CardDraft): Promise<PreviewResponse> {
  return postJson<PreviewResponse>('/api/preview', draft);
}

export async function saveCard(draft: CardDraft): Promise<EditorProject> {
  return postJson<EditorProject>('/api/save-card', draft);
}

export async function importCards(request: ImportCardsRequest): Promise<{ project: EditorProject; summary: ImportCardsSummary }> {
  return postJson<{ project: EditorProject; summary: ImportCardsSummary }>('/api/import-cards', request);
}

export async function syncCockatrice(setCode = 'DEMO'): Promise<CockatriceSyncResult> {
  return postJson<CockatriceSyncResult>('/api/sync-cockatrice', { setCode });
}

export async function createSet(request: CreateSetRequest): Promise<{ library: LibraryState; project: EditorProject }> {
  return postJson<{ library: LibraryState; project: EditorProject }>('/api/create-set', request);
}

export async function createUniverse(request: CreateUniverseRequest): Promise<LibraryState> {
  return postJson<LibraryState>('/api/create-universe', request);
}

export async function createLibraryAsset(request: CreateLibraryAssetRequest): Promise<EditorProject> {
  return postJson<EditorProject>('/api/create-library-asset', request);
}

export async function updateUniverse(request: UpdateUniverseRequest): Promise<LibraryState> {
  return postJson<LibraryState>('/api/update-universe', request);
}

export async function updateSet(request: UpdateSetRequest): Promise<{ library: LibraryState; project: EditorProject }> {
  return postJson<{ library: LibraryState; project: EditorProject }>('/api/update-set', request);
}

export async function exportSource(request: ExportSourceRequest): Promise<ExportSourceResult> {
  return postJson<ExportSourceResult>('/api/export-source', request);
}

export async function exportPrint(request: PrintExportRequest): Promise<PrintExportResult> {
  return postJson<PrintExportResult>('/api/print-export', request);
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(await errorText(response));
  }
  return (await response.json()) as T;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(await errorText(response));
  }
  return (await response.json()) as T;
}

async function errorText(response: Response): Promise<string> {
  try {
    const json = (await response.json()) as { error?: string };
    return json.error ?? response.statusText;
  } catch {
    return response.statusText;
  }
}

import type {
  CardDraft,
  CockatriceSyncResult,
  CollectionExportResult,
  CollectionExportTarget,
  CollectionImportMode,
  CollectionImportSummary,
  CollectionSourcePreset,
  CollectionState,
  CollectionSummary,
  CreateCollectionRequest,
  CreateDeckRequest,
  CreateLibraryAssetRequest,
  CreateSetRequest,
  CreateUniverseRequest,
  DeckExportResult,
  DeckState,
  DeckSummary,
  EditorProject,
  ExportSourceRequest,
  ExportSourceResult,
  ImportCardsRequest,
  ImportCardsSummary,
  LibraryState,
  PreviewResponse,
  UpdateSetRequest,
  UpdateUniverseRequest
} from '../domain/editorTypes.js';
import type { CreateReferenceRequest, CreateReferenceResult, ReferenceCatalog } from '@homebrew-forge/forge';

export async function fetchLibrary(): Promise<LibraryState> {
  return fetchJson<LibraryState>('/api/library');
}

export async function fetchReference(): Promise<ReferenceCatalog> {
  return fetchJson<ReferenceCatalog>('/api/reference');
}

export async function createReference(request: CreateReferenceRequest): Promise<CreateReferenceResult> {
  return postJson<CreateReferenceResult>('/api/reference', request);
}

export async function fetchProject(setCode = 'DEMO'): Promise<EditorProject> {
  return fetchJson<EditorProject>(`/api/project?set=${encodeURIComponent(setCode)}`);
}

export async function fetchDecks(): Promise<DeckSummary[]> {
  return fetchJson<DeckSummary[]>('/api/decks');
}

export async function fetchDeck(deckId: string): Promise<DeckState> {
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
      section: entry.section,
      count: entry.count,
      setCode: entry.setCode,
      cardId: entry.cardId,
      nameSnapshot: entry.nameSnapshot ?? entry.card?.name
    }))
  });
}

export async function exportDeck(deckId: string, target: 'text' | 'cockatrice'): Promise<DeckExportResult> {
  return postJson<DeckExportResult>('/api/export-deck', { deckId, target });
}

export async function fetchCollections(): Promise<CollectionSummary[]> {
  return fetchJson<CollectionSummary[]>('/api/collections');
}

export async function fetchCollection(collectionId: string): Promise<CollectionState> {
  return fetchJson<CollectionState>(`/api/collection?id=${encodeURIComponent(collectionId)}`);
}

export async function createCollection(request: CreateCollectionRequest): Promise<{ collections: CollectionSummary[]; collection: CollectionState }> {
  return postJson<{ collections: CollectionSummary[]; collection: CollectionState }>('/api/create-collection', request);
}

export async function importCollection(request: {
  collectionId: string;
  name?: string;
  description?: string;
  linkedUniverseId?: string;
  gameId?: string;
  purpose?: CollectionState['metadata']['purpose'];
  source: CollectionSourcePreset;
  content: string;
  mode?: CollectionImportMode;
  dryRun?: boolean;
}): Promise<{ collections: CollectionSummary[]; collection: CollectionState; summary: CollectionImportSummary }> {
  return postJson<{ collections: CollectionSummary[]; collection: CollectionState; summary: CollectionImportSummary }>('/api/import-collection', request);
}

export async function exportCollection(collectionId: string, target: CollectionExportTarget): Promise<CollectionExportResult> {
  return postJson<CollectionExportResult>('/api/export-collection', { collectionId, target });
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

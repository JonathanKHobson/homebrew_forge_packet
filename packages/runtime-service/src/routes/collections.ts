import {
  createCollection,
  exportCollectionCockatrice,
  exportCollectionCsv,
  exportCollectionPlainText,
  importCollectionCsv,
  importCollectionPriceCsv,
  listCollections,
  refreshCollectionMarketPrices,
  saveCollection,
  type CollectionExportTarget,
  type CollectionImportRequest,
  type CollectionPriceImportRequest,
  type CollectionPriceRefreshRequest,
  type CreateCollectionRequest,
  type SaveCollectionRequest
} from '@homebrew-forge/forge';
import { RuntimeRouteError } from './errors.js';

export async function createRuntimeCollection(repoRoot: string, request: CreateCollectionRequest) {
  const collection = await createCollection(repoRoot, request);
  return { collections: await listCollections(repoRoot), collection };
}

export async function saveRuntimeCollection(repoRoot: string, request: SaveCollectionRequest) {
  const collection = await saveCollection(repoRoot, request);
  return { collections: await listCollections(repoRoot), collection };
}

export async function importRuntimeCollection(repoRoot: string, request: CollectionImportRequest) {
  const result = await importCollectionCsv(repoRoot, request);
  return {
    collections: await listCollections(repoRoot),
    collection: result.collection,
    summary: result.summary
  };
}

export async function exportRuntimeCollection(repoRoot: string, request: { collectionId?: string; target?: CollectionExportTarget }) {
  if (!request.collectionId) {
    throw new RuntimeRouteError(400, 'Missing collection id.');
  }
  return request.target === 'cockatrice'
    ? exportCollectionCockatrice(repoRoot, request.collectionId)
    : request.target === 'text'
      ? exportCollectionPlainText(repoRoot, request.collectionId)
      : exportCollectionCsv(repoRoot, request.collectionId);
}

export async function refreshRuntimeCollectionPrices(repoRoot: string, request: CollectionPriceRefreshRequest) {
  const result = await refreshCollectionMarketPrices(repoRoot, request);
  return { collections: await listCollections(repoRoot), result };
}

export async function importRuntimeCollectionPrices(repoRoot: string, request: CollectionPriceImportRequest) {
  const result = await importCollectionPriceCsv(repoRoot, request);
  return { collections: await listCollections(repoRoot), result };
}

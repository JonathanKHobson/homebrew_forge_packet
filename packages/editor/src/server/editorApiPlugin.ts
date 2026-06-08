import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, basename, extname, isAbsolute, join, resolve, sep } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import {
  createCollection,
  addOfficialCardToDeck,
  addOfficialCardToCollection,
  importCollectionCsv,
  importCollectionPriceCsv,
  exportCollectionCockatrice,
  exportCollectionCsv,
  exportCollectionPlainText,
  listCollections,
  readCollectionState,
  refreshCollectionMarketPrices,
  saveCollection,
  createDeck,
  importDeck,
  analyzeMtgDesignImport,
  applyImportedRows,
  exportDeckCockatrice,
  exportDeckPlainText,
  exportCockatricePackage,
  exportPrintPdf,
  exportPrintSheet,
  printProfileForProject,
  assessCardPower,
  loadAssetPack,
  loadForgeProject,
  createProjectReference,
  cardFaceFromVariantFace,
  loadProjectReferenceCatalog,
  officialCardCatalogStatus,
  findOfficialCardPrint,
  loadProjectPowerConfig,
  listDecks,
  parseCsvRecords,
  findOfficialCardPrintByPrintKey,
  searchOfficialCards,
  readDeckState,
  renderCardImage,
  renderSetImages,
  saveDeck,
  syncOfficialCards,
  upsertRowByKeys,
  variantExportCards,
  writeCsvRecords,
  type ArtManifestRecord,
  type CardFaceRecord,
  type CardRecord,
  type CardVariantFaceRecord,
  type CardVariantRecord,
  type CollectionEntry,
  type CreateReferenceRequest,
  type CreateDeckRequest,
  type CsvRow,
  type DeckCardOption,
  type CollectionExportTarget,
  type CollectionExportResult,
  type CollectionImportRequest,
  type CollectionPriceImportRequest,
  type CollectionPriceRefreshRequest,
  type CreateCollectionRequest,
  type DeckExportResult,
  type ExportCockatricePackageResult,
  type ExportProfile,
  type ForgeProject,
  type PrintSheetSlotInput,
  type ResolvedDeckEntry,
  type SaveDeckRequest
} from '@homebrew-forge/forge';
import type { AddOfficialCardToCollectionRequest, AddOfficialCardToDeckRequest, AddOfficialCardToSetRequest, OfficialCardPrint, OfficialCardSearchFilters } from '@homebrew-forge/forge';
import { draftFromRecords, previewProfile, recordsFromDraft } from '../domain/cardDraft.js';
import { CORE_FRAMES, inferFrame } from '../domain/frameRegistry.js';
import type {
  CardDraft,
  CockatriceSyncResult,
  CreateLibraryAssetRequest,
  CreateSetRequest,
  CreateUniverseRequest,
  EditorProject,
  ExportSourceRequest,
  ExportSourceResult,
  ImportCardsRequest,
  ImportCardsSummary,
  ImportCollectionToSetRequest,
  ImportCollectionToSetResult,
  ImportDeckRequest,
  AddOfficialCardToSetResult,
  LibraryAssetSummary,
  LibraryState,
  PrintExportRequest,
  PrintExportResult,
  PreviewResponse,
  SetSummary,
  UpdateSetRequest,
  UpdateUniverseRequest,
  UniverseSummary
} from '../domain/editorTypes.js';
import { buildRuntimeHealth, createSourceFingerprint } from './runtimeHealth.mjs';

interface EditorApiPluginOptions {
  repoRoot: string;
  defaultSetCode: string;
}

const CARD_HEADERS = [
  'card_id',
  'set_code',
  'collector_number',
  'name',
  'layout',
  'mode',
  'source_card_name',
  'source_set_code',
  'rarity',
  'color_identity',
  'tags',
  'status',
  'print_count',
  'export_name_override',
  'notes'
];

const FACE_HEADERS = [
  'card_id',
  'face_index',
  'face_name',
  'mana_cost',
  'type_line',
  'oracle_text',
  'flavor_text',
  'power',
  'toughness',
  'loyalty',
  'defense',
  'colors',
  'frame_type',
  'art_id',
  'artist_display',
  'watermark',
  'rules_text_size_hint',
  'rules_text_padding_top',
  'rules_text_padding_right',
  'rules_text_padding_bottom',
  'rules_text_padding_left',
  'rules_text_reminder_mode',
  'layout_variant'
];

const VARIANT_HEADERS = [
  'variant_id',
  'card_id',
  'display_name',
  'kind',
  'status',
  'is_primary',
  'export_policy',
  'tags',
  'notes',
  'created_at',
  'updated_at'
];

const VARIANT_FACE_HEADERS = [
  'variant_id',
  'card_id',
  'face_index',
  'face_name',
  'mana_cost',
  'type_line',
  'oracle_text',
  'flavor_text',
  'power',
  'toughness',
  'loyalty',
  'defense',
  'colors',
  'frame_type',
  'art_id',
  'artist_display',
  'watermark',
  'rules_text_size_hint',
  'rules_text_padding_top',
  'rules_text_padding_right',
  'rules_text_padding_bottom',
  'rules_text_padding_left',
  'rules_text_reminder_mode',
  'layout_variant'
];

const ART_HEADERS = [
  'art_id',
  'file_path',
  'source_url',
  'source_type',
  'artist',
  'license',
  'permission_status',
  'checksum_sha256',
  'position_x',
  'position_y',
  'scale',
  'crop_x',
  'crop_y',
  'crop_w',
  'crop_h',
  'notes'
];

const SET_HEADERS = [
  'set_code',
  'set_name',
  'set_type',
  'version',
  'default_language',
  'default_asset_pack',
  'default_export_profile',
  'author',
  'status',
  'tags',
  'notes'
];

const EXPORT_PROFILE_HEADERS = [
  'profile_id',
  'target',
  'image_format',
  'width_px',
  'height_px',
  'quality',
  'include_bleed',
  'bleed_px',
  'include_crop_marks',
  'include_playtest_watermark',
  'watermark_text',
  'allow_placeholder_art',
  'filename_template'
];

interface LibraryFile {
  universes: UniverseSummary[];
  sets: Array<{ setCode: string; universeId: string; sortOrder?: number }>;
}

function buildLibraryAssets(project: ForgeProject, drafts: CardDraft[]): LibraryAssetSummary[] {
  const assignedByArtId = new Map<string, Array<{ cardId: string; name: string }>>();
  for (const draft of drafts) {
    if (!draft.artId) {
      continue;
    }
    assignedByArtId.set(draft.artId, [...(assignedByArtId.get(draft.artId) ?? []), { cardId: draft.cardId, name: draft.name }]);
  }
  return Object.values(project.art)
    .map((asset) => {
      const [sourceMode = asset.sourceType, assetType = 'art'] = asset.sourceType.split(':', 2);
      return {
        artId: asset.artId,
        name: asset.artId,
        assetType,
        filePath: asset.filePath,
        sourceUrl: asset.sourceUrl ?? '',
        sourceType: sourceMode,
        artist: asset.artist ?? '',
        license: asset.license ?? '',
        permissionStatus: asset.permissionStatus,
        notes: asset.notes ?? '',
        assignedCards: assignedByArtId.get(asset.artId) ?? []
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

async function createLibraryAsset(repoRoot: string, request: CreateLibraryAssetRequest): Promise<void> {
  const setCode = normalizeSetCode(request.setCode);
  const setDir = join(repoRoot, 'sets', setCode);
  const artId = normalizeAssetId(request.artId || request.filename || request.sourceUrl || 'library-asset');
  const assetType = normalizeAssetType(request.assetType || 'art');
  const sourceMode = request.sourceMode;
  let filePath = clean(request.filePath);
  let sourceUrl = clean(request.sourceUrl);

  if (sourceMode === 'upload') {
    if (!request.dataUri) {
      throw new Error('Upload asset is missing file data.');
    }
    const decoded = decodeDataUri(request.dataUri);
    const extension = extensionFromMime(decoded.mimeType, request.filename);
    const relativePath = `sets/${setCode}/art/library/${artId}.${extension}`;
    await mkdir(join(repoRoot, 'sets', setCode, 'art', 'library'), { recursive: true });
    await writeFile(join(repoRoot, relativePath), decoded.buffer);
    filePath = relativePath;
    sourceUrl = '';
  }

  if (sourceMode === 'url' && !sourceUrl) {
    throw new Error('URL asset is missing a source URL.');
  }
  if (sourceMode === 'local' && !filePath) {
    throw new Error('Local asset is missing a file path.');
  }

  const artPath = join(setDir, 'art_manifest.csv');
  const facesPath = join(setDir, 'card_faces.csv');
  const artRows = parseCsvRecords(await readFile(artPath, 'utf8'));
  upsertRow(artRows, 'art_id', artId, {
    art_id: artId,
    file_path: filePath,
    source_url: sourceUrl,
    source_type: `${sourceMode}:${assetType}`,
    artist: clean(request.artist),
    license: clean(request.license) || 'private reference',
    permission_status: clean(request.permissionStatus) || 'needs_review',
    checksum_sha256: filePath ? createHash('sha256').update(`${filePath}|${sourceUrl}`).digest('hex') : '',
    position_x: '',
    position_y: '',
    scale: '',
    crop_x: '',
    crop_y: '',
    crop_w: '',
    crop_h: '',
    notes: clean(request.notes)
  });
  await writeFile(artPath, `${writeCsvRecords(artRows, ART_HEADERS)}\n`, 'utf8');

  const assignedCardIds = new Set((request.assignedCardIds ?? []).map(clean).filter(Boolean));
  if (assignedCardIds.size > 0) {
    const faces = parseCsvRecords(await readFile(facesPath, 'utf8'));
    const updatedFaces = faces.map((face) => (assignedCardIds.has(clean(face.card_id)) && (clean(face.face_index) === '' || clean(face.face_index) === '0') ? { ...face, art_id: artId } : face));
    await writeFile(facesPath, `${writeCsvRecords(updatedFaces, FACE_HEADERS)}\n`, 'utf8');
  }
  const requestedVariantIds = new Set((request.assignedVariantIds ?? []).map(clean).filter(Boolean));
  if (assignedCardIds.size > 0 || requestedVariantIds.size > 0) {
    const cardsPath = join(setDir, 'cards.csv');
    const variantsPath = join(setDir, 'card_variants.csv');
    const variantFacesPath = join(setDir, 'card_variant_faces.csv');
    const cards = parseCsvRecords(await readFile(cardsPath, 'utf8'));
    const faces = parseCsvRecords(await readFile(facesPath, 'utf8'));
    const variants = await readVariantRowsForSave(variantsPath, cards, faces);
    const variantFaces = await readVariantFaceRowsForSave(variantFacesPath, variants, faces);
    const assignedVariantIds = new Set(requestedVariantIds);
    for (const variant of variants) {
      if (assignedCardIds.has(clean(variant.card_id)) && isTruthy(variant.is_primary)) {
        assignedVariantIds.add(clean(variant.variant_id));
      }
    }
    if (assignedVariantIds.size > 0) {
      const updatedVariantFaces = variantFaces.map((face) =>
        assignedVariantIds.has(clean(face.variant_id)) && (clean(face.face_index) === '' || clean(face.face_index) === '0') ? { ...face, art_id: artId } : face
      );
      await writeFile(variantFacesPath, `${writeCsvRecords(updatedVariantFaces, VARIANT_FACE_HEADERS)}\n`, 'utf8');
    }
  }
}

export function editorApiPlugin(options: EditorApiPluginOptions): Plugin {
  const startedAt = new Date().toISOString();
  const startupFingerprintPromise = createSourceFingerprint(options.repoRoot);

  return {
    name: 'homebrew-forge-editor-api',
    configureServer(server) {
      server.middlewares.use('/api/health', async (req, res) => {
        if (req.method !== 'GET') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          sendJson(
            res,
            200,
            await buildRuntimeHealth({
              repoRoot: options.repoRoot,
              processId: process.pid,
              startedAt,
              port: serverPort(server, configuredPort()),
              startupFingerprint: await startupFingerprintPromise
            })
          );
        } catch (error) {
          sendJson(res, 500, { error: errorMessage(error) });
        }
      });

      server.middlewares.use('/api/restart', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          scheduleEditorRestart(options.repoRoot);
          sendJson(res, 202, { restarting: true });
        } catch (error) {
          sendJson(res, 500, { error: errorMessage(error) });
        }
      });

      server.middlewares.use('/api/library', async (req, res) => {
        if (req.method !== 'GET') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          sendJson(res, 200, await readLibrary(options.repoRoot, options.defaultSetCode));
        } catch (error) {
          sendJson(res, 500, { error: errorMessage(error) });
        }
      });

      server.middlewares.use('/api/reference', async (req, res) => {
        if (req.method === 'GET') {
          try {
            sendJson(res, 200, loadProjectReferenceCatalog(options.repoRoot));
          } catch (error) {
            sendJson(res, 500, { error: errorMessage(error) });
          }
          return;
        }
        if (req.method === 'POST') {
          try {
            const request = await readJsonBody<CreateReferenceRequest>(req);
            sendJson(res, 200, await createProjectReference(options.repoRoot, request));
          } catch (error) {
            sendJson(res, 500, { error: errorMessage(error) });
          }
          return;
        }
        sendJson(res, 405, { error: 'Method not allowed' });
      });

      server.middlewares.use('/api/official-cards/status', async (req, res) => {
        if (req.method !== 'GET') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          sendJson(res, 200, await officialCardCatalogStatus(options.repoRoot));
        } catch (error) {
          sendJson(res, 500, { error: errorMessage(error) });
        }
      });

      server.middlewares.use('/api/official-cards/search', async (req, res) => {
        if (req.method !== 'GET') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          const params = new URL(req.url ?? '', 'http://editor.local').searchParams;
          const filters: OfficialCardSearchFilters = {
            view: params.get('view') === 'oracle' ? 'oracle' : 'prints',
            query: params.get('query') ?? '',
            setCode: params.get('setCode') ?? undefined,
            rarity: params.get('rarity') ?? undefined,
            colorIdentity: params.get('colorIdentity') ?? undefined,
            typeLine: params.get('typeLine') ?? undefined,
            layout: params.get('layout') ?? undefined,
            finish: params.get('finish') ?? undefined,
            lang: params.get('lang') ?? undefined,
            manaValueMin: numberParam(params.get('manaValueMin')),
            manaValueMax: numberParam(params.get('manaValueMax')),
            priceCurrency: officialPriceCurrencyParam(params.get('priceCurrency')),
            priceMin: numberParam(params.get('priceMin')),
            priceMax: numberParam(params.get('priceMax')),
            releasedAfter: params.get('releasedAfter') ?? undefined,
            releasedBefore: params.get('releasedBefore') ?? undefined,
            year: params.get('year') ?? undefined,
            hasImage: officialImageFilterParam(params.get('hasImage')),
            cardCategory: officialCardCategoryParam(params.get('cardCategory')),
            sort: officialCardSortParam(params.get('sort')),
            sortDirection: params.get('sortDirection') === 'desc' ? 'desc' : params.get('sortDirection') === 'asc' ? 'asc' : undefined,
            limit: numberParam(params.get('limit')),
            offset: numberParam(params.get('offset'))
          };
          sendJson(res, 200, await searchOfficialCards(options.repoRoot, filters));
        } catch (error) {
          sendJson(res, 500, { error: errorMessage(error) });
        }
      });

      server.middlewares.use('/api/official-cards/sync', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          const { view } = await readJsonBody<{ view?: 'prints' | 'oracle' | 'both' }>(req);
          sendJson(res, 200, await syncOfficialCards(options.repoRoot, { view: view ?? 'both' }));
        } catch (error) {
          sendJson(res, 500, { error: errorMessage(error) });
        }
      });

      server.middlewares.use('/api/official-cards/add-to-collection', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          const request = await readJsonBody<AddOfficialCardToCollectionRequest>(req);
          const collection = await addOfficialCardToCollection(options.repoRoot, request);
          sendJson(res, 200, { collections: await listCollections(options.repoRoot), collection });
        } catch (error) {
          sendJson(res, 500, { error: errorMessage(error) });
        }
      });

      server.middlewares.use('/api/official-cards/add-to-deck', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          const request = await readJsonBody<AddOfficialCardToDeckRequest>(req);
          const deck = await addOfficialCardToDeck(options.repoRoot, request);
          sendJson(res, 200, { decks: await listDecks(options.repoRoot), deck });
        } catch (error) {
          sendJson(res, 500, { error: errorMessage(error) });
        }
      });

      server.middlewares.use('/api/official-cards/add-to-set', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          const request = await readJsonBody<AddOfficialCardToSetRequest>(req);
          sendJson(res, 200, await addOfficialCardPrintToSet(options.repoRoot, request));
        } catch (error) {
          sendJson(res, 500, { error: errorMessage(error) });
        }
      });

      server.middlewares.use('/api/import-collection-to-set', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          const request = await readJsonBody<ImportCollectionToSetRequest>(req);
          sendJson(res, 200, await importCollectionRowsToSet(options.repoRoot, request));
        } catch (error) {
          sendJson(res, 500, { error: errorMessage(error) });
        }
      });

      server.middlewares.use('/api/decks', async (req, res) => {
        if (req.method !== 'GET') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          sendJson(res, 200, await listDecks(options.repoRoot));
        } catch (error) {
          sendJson(res, 500, { error: errorMessage(error) });
        }
      });

      server.middlewares.use('/api/deck', async (req, res) => {
        if (req.method !== 'GET') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          const deckId = new URL(req.url ?? '', 'http://editor.local').searchParams.get('id');
          if (!deckId) {
            sendJson(res, 400, { error: 'Missing deck id.' });
            return;
          }
          sendJson(res, 200, await readDeckState(options.repoRoot, deckId));
        } catch (error) {
          sendJson(res, 500, { error: errorMessage(error) });
        }
      });

      server.middlewares.use('/api/create-deck', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          const request = await readJsonBody<CreateDeckRequest>(req);
          const deck = await createDeck(options.repoRoot, request);
          sendJson(res, 200, { decks: await listDecks(options.repoRoot), deck });
        } catch (error) {
          sendJson(res, 500, { error: errorMessage(error) });
        }
      });

      server.middlewares.use('/api/save-deck', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          const deck = await saveDeck(options.repoRoot, await readJsonBody(req));
          sendJson(res, 200, { decks: await listDecks(options.repoRoot), deck });
        } catch (error) {
          sendJson(res, 500, { error: errorMessage(error) });
        }
      });

      server.middlewares.use('/api/export-deck', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          const request = await readJsonBody<{ deckId?: string; target?: 'text' | 'cockatrice' }>(req);
          if (!request.deckId) {
            sendJson(res, 400, { error: 'Missing deck id.' });
            return;
          }
          const result: DeckExportResult =
            request.target === 'cockatrice'
              ? await exportDeckCockatrice(options.repoRoot, request.deckId)
              : await exportDeckPlainText(options.repoRoot, request.deckId);
          sendJson(res, 200, result);
        } catch (error) {
          sendJson(res, 500, { error: errorMessage(error) });
        }
      });

      server.middlewares.use('/api/import-deck', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          const request = await readJsonBody<ImportDeckRequest>(req);
          const result = await importDeck(options.repoRoot, request);
          sendJson(res, 200, { decks: await listDecks(options.repoRoot), result });
        } catch (error) {
          sendJson(res, 500, { error: errorMessage(error) });
        }
      });

      server.middlewares.use('/api/collections', async (req, res) => {
        if (req.method !== 'GET') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          sendJson(res, 200, await listCollections(options.repoRoot));
        } catch (error) {
          sendJson(res, 500, { error: errorMessage(error) });
        }
      });

      server.middlewares.use('/api/collection', async (req, res) => {
        if (req.method !== 'GET') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          const collectionId = new URL(req.url ?? '', 'http://editor.local').searchParams.get('id');
          if (!collectionId) {
            sendJson(res, 400, { error: 'Missing collection id.' });
            return;
          }
          sendJson(res, 200, await readCollectionState(options.repoRoot, collectionId));
        } catch (error) {
          sendJson(res, 500, { error: errorMessage(error) });
        }
      });

      server.middlewares.use('/api/create-collection', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          const request = await readJsonBody<CreateCollectionRequest>(req);
          const collection = await createCollection(options.repoRoot, request);
          sendJson(res, 200, { collections: await listCollections(options.repoRoot), collection });
        } catch (error) {
          sendJson(res, 500, { error: errorMessage(error) });
        }
      });

      server.middlewares.use('/api/save-collection', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          const collection = await saveCollection(options.repoRoot, await readJsonBody(req));
          sendJson(res, 200, { collections: await listCollections(options.repoRoot), collection });
        } catch (error) {
          sendJson(res, 500, { error: errorMessage(error) });
        }
      });

      server.middlewares.use('/api/import-collection', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          const request = await readJsonBody<CollectionImportRequest>(req);
          const result = await importCollectionCsv(options.repoRoot, request);
          sendJson(res, 200, {
            collections: await listCollections(options.repoRoot),
            collection: result.collection,
            summary: result.summary
          });
        } catch (error) {
          sendJson(res, 500, { error: errorMessage(error) });
        }
      });

      server.middlewares.use('/api/collection-prices/refresh', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          const request = await readJsonBody<CollectionPriceRefreshRequest>(req);
          const result = await refreshCollectionMarketPrices(options.repoRoot, request);
          sendJson(res, 200, { collections: await listCollections(options.repoRoot), result });
        } catch (error) {
          sendJson(res, 500, { error: errorMessage(error) });
        }
      });

      server.middlewares.use('/api/collection-prices/import', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          const request = await readJsonBody<CollectionPriceImportRequest>(req);
          const result = await importCollectionPriceCsv(options.repoRoot, request);
          sendJson(res, 200, { collections: await listCollections(options.repoRoot), result });
        } catch (error) {
          sendJson(res, 500, { error: errorMessage(error) });
        }
      });

      server.middlewares.use('/api/export-collection', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          const request = await readJsonBody<{ collectionId?: string; target?: CollectionExportTarget }>(req);
          if (!request.collectionId) {
            sendJson(res, 400, { error: 'Missing collection id.' });
            return;
          }
          const result: CollectionExportResult =
            request.target === 'cockatrice'
              ? await exportCollectionCockatrice(options.repoRoot, request.collectionId)
              : request.target === 'text'
                ? await exportCollectionPlainText(options.repoRoot, request.collectionId)
                : await exportCollectionCsv(options.repoRoot, request.collectionId);
          sendJson(res, 200, result);
        } catch (error) {
          sendJson(res, 500, { error: errorMessage(error) });
        }
      });

      server.middlewares.use('/api/mana-symbol', async (req, res) => {
        if (req.method !== 'GET') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          const symbol = new URL(req.url ?? '', 'http://editor.local').searchParams.get('symbol') ?? '';
          const candidates = await manaSymbolCandidatePaths(options.repoRoot, symbol);
          for (const candidate of candidates) {
            try {
              const data = await readFile(candidate);
              res.statusCode = 200;
              res.setHeader('Content-Type', mimeTypeForAsset(candidate));
              res.end(data);
              return;
            } catch {
              // Try the next declared asset-pack candidate.
            }
          }
          sendJson(res, 404, { error: `Missing mana symbol ${symbol}.` });
        } catch (error) {
          sendJson(res, 404, { error: errorMessage(error) });
        }
      });

      server.middlewares.use('/api/asset', async (req, res) => {
        if (req.method !== 'GET') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          const assetPath = new URL(req.url ?? '', 'http://editor.local').searchParams.get('path');
          if (!assetPath) {
            sendJson(res, 400, { error: 'Missing asset path.' });
            return;
          }
          const absolutePath = isAbsolute(assetPath) ? assetPath : resolve(options.repoRoot, assetPath);
          const repoRoot = resolve(options.repoRoot);
          if (!(await isAllowedEditorAssetPath(repoRoot, absolutePath))) {
            sendJson(res, 403, { error: 'Asset path is outside the project.' });
            return;
          }
          res.statusCode = 200;
          res.setHeader('Content-Type', mimeTypeForAsset(absolutePath));
          res.end(await readFile(absolutePath));
        } catch (error) {
          sendJson(res, 404, { error: errorMessage(error) });
        }
      });

      server.middlewares.use('/api/project', async (req, res) => {
        if (req.method !== 'GET') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          const setCode = new URL(req.url ?? '', 'http://editor.local').searchParams.get('set') ?? options.defaultSetCode;
          const project = await loadForgeProject({ rootDir: options.repoRoot, setCode });
          sendJson(res, 200, await editorProjectFromForge(options.repoRoot, project));
        } catch (error) {
          sendJson(res, 500, { error: errorMessage(error) });
        }
      });

      server.middlewares.use('/api/preview', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          const draft = await readJsonBody<CardDraft>(req);
          sendJson(res, 200, await renderPreview(options.repoRoot, draft));
        } catch (error) {
          sendJson(res, 500, { error: errorMessage(error) });
        }
      });

      server.middlewares.use('/api/print-export', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          const request = await readJsonBody<PrintExportRequest>(req);
          sendJson(res, 200, await exportPrintFile(options.repoRoot, request));
        } catch (error) {
          sendJson(res, 500, { error: errorMessage(error) });
        }
      });

      server.middlewares.use('/api/save-card', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          const draft = await readJsonBody<CardDraft>(req);
          await saveDraft(options.repoRoot, draft);
          const sync = await syncCockatricePackage(options.repoRoot, draft.setCode);
          const project = await loadForgeProject({ rootDir: options.repoRoot, setCode: draft.setCode });
          sendJson(res, 200, await editorProjectFromForge(options.repoRoot, project, sync));
        } catch (error) {
          sendJson(res, 500, { error: errorMessage(error) });
        }
      });

      server.middlewares.use('/api/create-set', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          const request = await readJsonBody<CreateSetRequest>(req);
          const setCode = await createSetFolder(options.repoRoot, request);
          const project = await loadForgeProject({ rootDir: options.repoRoot, setCode });
          sendJson(res, 200, {
            library: await readLibrary(options.repoRoot, setCode),
            project: await editorProjectFromForge(options.repoRoot, project)
          });
        } catch (error) {
          sendJson(res, 500, { error: errorMessage(error) });
        }
      });

      server.middlewares.use('/api/create-library-asset', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          const request = await readJsonBody<CreateLibraryAssetRequest>(req);
          await createLibraryAsset(options.repoRoot, request);
          const project = await loadForgeProject({ rootDir: options.repoRoot, setCode: normalizeSetCode(request.setCode) });
          sendJson(res, 200, await editorProjectFromForge(options.repoRoot, project));
        } catch (error) {
          sendJson(res, 500, { error: errorMessage(error) });
        }
      });

      server.middlewares.use('/api/create-universe', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          const request = await readJsonBody<CreateUniverseRequest>(req);
          sendJson(res, 200, await createUniverse(options.repoRoot, request, options.defaultSetCode));
        } catch (error) {
          sendJson(res, 500, { error: errorMessage(error) });
        }
      });

      server.middlewares.use('/api/update-universe', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          const request = await readJsonBody<UpdateUniverseRequest>(req);
          sendJson(res, 200, await updateUniverse(options.repoRoot, request, options.defaultSetCode));
        } catch (error) {
          sendJson(res, 500, { error: errorMessage(error) });
        }
      });

      server.middlewares.use('/api/update-set', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          const request = await readJsonBody<UpdateSetRequest>(req);
          const setCode = await updateSet(options.repoRoot, request);
          const project = await loadForgeProject({ rootDir: options.repoRoot, setCode });
          sendJson(res, 200, {
            library: await readLibrary(options.repoRoot, setCode),
            project: await editorProjectFromForge(options.repoRoot, project)
          });
        } catch (error) {
          sendJson(res, 500, { error: errorMessage(error) });
        }
      });

      server.middlewares.use('/api/export-source', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          const request = await readJsonBody<ExportSourceRequest>(req);
          sendJson(res, 200, await exportSourceFile(options.repoRoot, request));
        } catch (error) {
          sendJson(res, 500, { error: errorMessage(error) });
        }
      });

      server.middlewares.use('/api/import-cards', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          const request = await readJsonBody<ImportCardsRequest>(req);
          const summary = await importCards(options.repoRoot, request);
          const sync = request.dryRun ? undefined : await syncCockatricePackage(options.repoRoot, request.setCode);
          const project = await loadForgeProject({ rootDir: options.repoRoot, setCode: request.setCode });
          sendJson(res, 200, { project: await editorProjectFromForge(options.repoRoot, project, sync), summary });
        } catch (error) {
          sendJson(res, 500, { error: errorMessage(error) });
        }
      });

      server.middlewares.use('/api/sync-cockatrice', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          const { setCode } = await readJsonBody<{ setCode?: string }>(req);
          sendJson(res, 200, await syncCockatricePackage(options.repoRoot, setCode ?? options.defaultSetCode));
        } catch (error) {
          sendJson(res, 500, { error: errorMessage(error) });
        }
      });
    }
  };
}

async function addOfficialCardPrintToSet(repoRoot: string, request: AddOfficialCardToSetRequest): Promise<AddOfficialCardToSetResult> {
  const setCode = normalizeSetCode(request.setCode);
  const card = await findOfficialCardPrint(repoRoot, request.cardId);
  if (!card) {
    throw new Error('Official card print was not found in the local catalog. Sync Official Cards first.');
  }
  const projectBefore = await loadForgeProject({ rootDir: repoRoot, setCode });
  const draft = officialCardDraftForSet(card, projectBefore, request);
  await saveDraft(repoRoot, draft);
  const sync = await syncCockatricePackage(repoRoot, setCode);
  const project = await loadForgeProject({ rootDir: repoRoot, setCode });
  return {
    project: await editorProjectFromForge(repoRoot, project, sync),
    summary: {
      setCode,
      cardId: draft.cardId,
      name: draft.name,
      collectorNumber: draft.collectorNumber,
      sourceSetCode: card.setCode,
      sourceCollectorNumber: card.collectorNumber
    }
  };
}

async function importCollectionRowsToSet(repoRoot: string, request: ImportCollectionToSetRequest): Promise<ImportCollectionToSetResult> {
  const collection = await readCollectionState(repoRoot, request.collectionId);
  const setCode = normalizeSetCode(request.setCode);
  if (!setCode) {
    throw new Error('Choose a target set.');
  }
  const requestedIds = new Set((request.entryIds ?? []).map(clean).filter(Boolean));
  const rows = requestedIds.size ? collection.entries.filter((entry) => requestedIds.has(entry.entryId)) : collection.entries;
  const warnings: string[] = [];
  const importedNames: string[] = [];
  let projectResult: AddOfficialCardToSetResult | undefined;

  for (const entry of rows) {
    const card = await officialCardForCollectionEntry(repoRoot, entry);
    if (!card) {
      warnings.push(`${entry.cardName}: no matching official print in the local catalog.`);
      continue;
    }
    try {
      projectResult = await addOfficialCardPrintToSet(repoRoot, {
        cardId: card.id,
        setCode,
        status: request.status ?? 'draft'
      });
      importedNames.push(projectResult.summary.name);
    } catch (error) {
      warnings.push(`${entry.cardName}: ${errorMessage(error)}`);
    }
  }

  const project =
    projectResult?.project ??
    (await editorProjectFromForge(repoRoot, await loadForgeProject({ rootDir: repoRoot, setCode })));

  return {
    project,
    summary: {
      collectionId: collection.metadata.collectionId,
      setCode,
      requestedRows: rows.length,
      importedRows: importedNames.length,
      skippedRows: rows.length - importedNames.length,
      warnings: [...new Set(warnings)],
      importedNames
    }
  };
}

async function officialCardForCollectionEntry(repoRoot: string, entry: CollectionEntry): Promise<OfficialCardPrint | undefined> {
  if (entry.scryfallId) {
    const card = await findOfficialCardPrint(repoRoot, entry.scryfallId);
    if (card) {
      return card;
    }
  }
  return findOfficialCardPrintByPrintKey(repoRoot, {
    name: entry.cardName,
    setCode: entry.setCode,
    collectorNumber: entry.collectorNumber
  });
}

function officialCardDraftForSet(card: OfficialCardPrint, project: ForgeProject, request: AddOfficialCardToSetRequest): CardDraft {
  const typeParts = typePartsFromOfficialTypeLine(card.typeLine ?? '');
  const cardId = officialImportCardId(card, request.cardIdOverride);
  const collectorNumber = uniqueOfficialCollectorNumber(project, request.collectorNumber || officialCollectorNumber(card), cardId);
  const firstFace = card.cardFaces?.[0];
  const manaCost = card.manaCost ?? firstFace?.manaCost ?? '';
  const typeLine = card.typeLine ?? firstFace?.typeLine ?? 'Card';
  const oracleText = card.oracleText ?? officialJoinedFaceText(card, 'oracleText');
  const flavorText = card.flavorText ?? officialJoinedFaceText(card, 'flavorText');
  const rarity = normalizeOfficialRarity(card.rarity);
  const colorIdentity = card.colorIdentity.join('');
  const sourceUri = card.scryfallUri ? ` Source: ${card.scryfallUri}` : '';
  const sourcePrint = [card.setCode, card.collectorNumber].filter(Boolean).join(' #');
  const notes = `Imported from official ${sourcePrint || 'Magic'} print via Scryfall.${sourceUri}`.trim();
  const sourceCard: CardRecord = {
    cardId,
    setCode: project.set.setCode,
    collectorNumber,
    name: card.name,
    layout: 'normal',
    mode: 'imported',
    sourceCardName: card.name,
    sourceSetCode: card.setCode,
    rarity,
    colorIdentity,
    tags: ['official-import', 'scryfall'].filter(Boolean),
    status: request.status ?? 'draft',
    printCount: 1,
    exportNameOverride: undefined,
    notes
  };
  const sourceFace: CardFaceRecord = {
    cardId,
    faceIndex: 0,
    faceName: firstFace?.name ?? card.name,
    manaCost,
    typeLine,
    oracleText,
    flavorText,
    power: card.power ?? firstFace?.power ?? '',
    toughness: card.toughness ?? firstFace?.toughness ?? '',
    loyalty: card.loyalty ?? firstFace?.loyalty ?? '',
    defense: card.defense ?? firstFace?.defense ?? '',
    colors: (card.colors.length ? card.colors : firstFace?.colors ?? []).join(''),
    frameType: 'normal_creature',
    artId: undefined,
    artistDisplay: undefined,
    watermark: undefined,
    rulesTextSizeHint: 'auto',
    rulesTextPaddingTop: undefined,
    rulesTextPaddingRight: undefined,
    rulesTextPaddingBottom: undefined,
    rulesTextPaddingLeft: undefined,
    rulesTextReminderMode: 'auto',
    layoutVariant: 'normal'
  };
  return {
    cardId,
    setCode: project.set.setCode,
    setName: project.set.setName,
    collectorNumber,
    setTotal: '',
    language: (card.lang ?? project.set.defaultLanguage ?? 'en').toUpperCase(),
    designer: project.set.author ?? '',
    name: card.name,
    manaCost,
    rarity,
    layout: 'normal',
    mode: 'imported',
    frameType: 'normal_creature',
    frameOverrideId: 'auto',
    supertypes: typeParts.supertypes,
    cardTypes: typeParts.cardTypes,
    subtypes: typeParts.subtypes,
    typeLine,
    oracleText,
    flavorText,
    rulesTextSize: '',
    rulesTextPaddingTop: '',
    rulesTextPaddingRight: '',
    rulesTextPaddingBottom: '',
    rulesTextPaddingLeft: '',
    rulesTextReminderMode: 'auto',
    power: sourceFace.power ?? '',
    toughness: sourceFace.toughness ?? '',
    loyalty: sourceFace.loyalty ?? '',
    planeswalkerAbilityCount: '3',
    planeswalkerAbility1Cost: '+1',
    planeswalkerAbility1Text: '',
    planeswalkerAbility2Cost: '-2',
    planeswalkerAbility2Text: '',
    planeswalkerAbility3Cost: '-7',
    planeswalkerAbility3Text: '',
    planeswalkerAbility4Cost: '',
    planeswalkerAbility4Text: '',
    colors: sourceFace.colors ?? '',
    colorIndicator: '',
    borderColor: 'black',
    foilTreatment: 'none',
    artId: '',
    artFilePath: '',
    artUrl: '',
    artPositionX: '',
    artPositionY: '',
    artScale: '',
    artCropX: '',
    artCropY: '',
    artCropW: '',
    artCropH: '',
    artist: '',
    setSymbolPath: '',
    setSymbolUrl: '',
    watermark: '',
    status: request.status ?? 'draft',
    tags: ['official-import', 'scryfall', card.setCode ? `source-${card.setCode}` : ''].filter(Boolean),
    notes,
    variantId: `${cardId}-V1`,
    variantDisplayName: 'Official text import',
    variantKind: 'print_alternate',
    variantStatus: 'active',
    variantIsPrimary: true,
    variantExportPolicy: 'default',
    variantTags: ['official-import'],
    variantNotes: notes,
    variantSummaries: [],
    creationStatus: request.status ?? 'draft',
    creationNotes: notes,
    sourceCard,
    sourceFace
  };
}

function officialImportCardId(card: OfficialCardPrint, override: string | undefined): string {
  const normalizedOverride = clean(override)
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  if (normalizedOverride) {
    return normalizedOverride;
  }
  return `official-${createHash('sha1').update(card.id).digest('hex').slice(0, 12)}`;
}

function officialCollectorNumber(card: OfficialCardPrint): string {
  const setCode = clean(card.setCode).toUpperCase();
  const collectorNumber = clean(card.collectorNumber).replace(/\s+/g, '');
  return [setCode || 'OFF', collectorNumber || createHash('sha1').update(card.id).digest('hex').slice(0, 6)].filter(Boolean).join('-');
}

function uniqueOfficialCollectorNumber(project: ForgeProject, preferred: string, cardId: string): string {
  const base = clean(preferred) || 'OFF';
  const used = new Set(project.cards.filter((card) => card.cardId !== cardId).map((card) => clean(card.collectorNumber)));
  if (!used.has(base)) {
    return base;
  }
  let index = 2;
  while (used.has(`${base}-${index}`)) {
    index += 1;
  }
  return `${base}-${index}`;
}

function normalizeOfficialRarity(value: string | undefined): CardRecord['rarity'] {
  const rarity = clean(value).toLowerCase();
  if (rarity === 'common' || rarity === 'uncommon' || rarity === 'rare' || rarity === 'mythic' || rarity === 'special' || rarity === 'bonus' || rarity === 'token') {
    return rarity;
  }
  return 'special';
}

function officialJoinedFaceText(card: OfficialCardPrint, key: 'oracleText' | 'flavorText'): string {
  return (card.cardFaces ?? [])
    .map((face) => {
      const text = clean(face[key]);
      if (!text) {
        return '';
      }
      return face.name ? `${face.name}: ${text}` : text;
    })
    .filter(Boolean)
    .join('\n\n');
}

function typePartsFromOfficialTypeLine(typeLine: string): { supertypes: string[]; cardTypes: string[]; subtypes: string } {
  const [left = '', right = ''] = clean(typeLine).replace(/\s+[—–]\s+/, ' - ').split(/\s+-\s+/, 2);
  const supertypes: string[] = [];
  const cardTypes: string[] = [];
  const supertypeNames = new Map(['Basic', 'Legendary', 'Ongoing', 'Snow', 'World'].map((name) => [name.toLowerCase(), name]));
  const cardTypeNames = new Map(
    ['Artifact', 'Battle', 'Conspiracy', 'Creature', 'Dungeon', 'Emblem', 'Enchantment', 'Instant', 'Kindred', 'Land', 'Phenomenon', 'Plane', 'Planeswalker', 'Scheme', 'Sorcery', 'Tribal', 'Vanguard'].map((name) => [
      name.toLowerCase(),
      name
    ])
  );
  for (const word of left.split(/\s+/).map((part) => part.replace(/[^A-Za-z]/g, '')).filter(Boolean)) {
    const supertype = supertypeNames.get(word.toLowerCase());
    const cardType = cardTypeNames.get(word.toLowerCase());
    if (supertype) {
      supertypes.push(supertype);
    } else if (cardType) {
      cardTypes.push(cardType);
    }
  }
  return {
    supertypes,
    cardTypes,
    subtypes: right.trim()
  };
}

async function editorProjectFromForge(repoRoot: string, project: ForgeProject, lastCockatriceSync?: CockatriceSyncResult): Promise<EditorProject> {
  const variantsByCard = new Map<string, CardVariantRecord[]>();
  for (const variant of project.variants) {
    variantsByCard.set(variant.cardId, [...(variantsByCard.get(variant.cardId) ?? []), variant]);
  }
  const variantFacesByVariant = new Map<string, CardVariantFaceRecord[]>();
  for (const face of project.variantFaces) {
    variantFacesByVariant.set(face.variantId, [...(variantFacesByVariant.get(face.variantId) ?? []), face]);
  }
  const drafts = project.cards.flatMap((card) => {
    const variants = variantsByCard.get(card.cardId) ?? [];
    return variants.flatMap((variant) => {
      const variantFace = [...(variantFacesByVariant.get(variant.variantId) ?? [])].sort((left, right) => left.faceIndex - right.faceIndex)[0];
      if (!variantFace) {
        return [];
      }
      const face = cardFaceFromVariantFace(variantFace, card.cardId);
      return [
        draftFromRecords({
          card,
          face,
          variant,
          variantFace,
          art: face.artId ? project.art[face.artId] : undefined,
          setName: project.set.setName,
          language: project.set.defaultLanguage?.toUpperCase() ?? 'EN',
          designer: project.set.author
        })
      ];
    });
  });
  const variantSummariesByCard = new Map<string, EditorProject['cards'][number]['variants']>();
  for (const draft of drafts) {
    const summary = variantSummaryFromDraft(draft);
    variantSummariesByCard.set(draft.cardId, [...(variantSummariesByCard.get(draft.cardId) ?? []), summary]);
  }
  const draftsWithVariantSummaries = drafts.map((draft) => ({
    ...draft,
    variantSummaries: variantSummariesByCard.get(draft.cardId) ?? []
  }));

  return {
    setCode: project.setCode,
    setName: project.set.setName,
    language: project.set.defaultLanguage?.toUpperCase() ?? 'EN',
    designer: project.set.author ?? '',
    assetPackId: project.set.defaultAssetPack ?? 'debug',
    cards: project.cards.flatMap((card) => {
      const cardDrafts = draftsWithVariantSummaries.filter((draft) => draft.cardId === card.cardId);
      const draft = cardDrafts.find((candidate) => candidate.variantIsPrimary) ?? cardDrafts[0];
      if (!draft) {
        return [];
      }
      const variants = variantSummariesByCard.get(card.cardId) ?? [];
      return [{
      cardId: draft.cardId,
      collectorNumber: draft.collectorNumber,
      name: draft.name,
      typeLine: draft.typeLine,
      rarity: draft.rarity,
      colors: draft.colors,
      layout: draft.layout,
      frameType: draft.frameType,
      status: draft.status,
      tags: draft.tags,
      notes: draft.notes,
      manaCost: draft.manaCost,
      colorIdentity: draft.colorIndicator || draft.colors,
      oracleText: draft.oracleText,
      flavorText: draft.flavorText,
      power: draft.power,
      toughness: draft.toughness,
      hasArt: Boolean(draft.artId && project.art[draft.artId]),
        needsReview: draft.status === 'review' || draft.status === 'idea' || draft.tags.some((tag) => tag === 'needs_review' || tag.startsWith('unsupported_layout:') || tag.startsWith('registered_layout:')),
        primaryVariantId: variants.find((variant) => variant.isPrimary)?.variantId ?? draft.variantId,
        variantCount: variants.length,
        variants
      }];
    }),
    drafts: draftsWithVariantSummaries,
    libraryAssets: buildLibraryAssets(project, draftsWithVariantSummaries),
    frames: CORE_FRAMES,
    discoveredFrameFamilies: await discoverFullPackFrameFamilies(repoRoot),
    lastCockatriceSync
  };
}

function variantSummaryFromDraft(draft: CardDraft): EditorProject['cards'][number]['variants'][number] {
  return {
    variantId: draft.variantId,
    cardId: draft.cardId,
    displayName: draft.variantDisplayName,
    kind: draft.variantKind,
    status: draft.variantStatus,
    isPrimary: draft.variantIsPrimary,
    exportPolicy: draft.variantExportPolicy,
    tags: draft.variantTags,
    notes: draft.variantNotes,
    searchText: [
      draft.variantDisplayName,
      draft.variantKind,
      draft.variantStatus,
      draft.variantExportPolicy,
      draft.variantTags.join(' '),
      draft.variantNotes,
      draft.name,
      draft.manaCost,
      draft.typeLine,
      draft.oracleText,
      draft.flavorText
    ].join(' ')
  };
}

async function readLibrary(repoRoot: string, selectedSetCode: string): Promise<LibraryState> {
  const discoveredSets = await discoverSets(repoRoot);
  const persisted = await readLibraryFile(repoRoot);
  const fallbackUniverse: UniverseSummary = {
    id: 'demo',
    name: 'Demo Project',
    description: 'Sample cards and renderer checks'
  };
  const universes = normalizeUniverses(persisted?.universes ?? [fallbackUniverse]);
  const defaultUniverseId = universes[0]?.id ?? fallbackUniverse.id;
  const persistedBySet = new Map((persisted?.sets ?? []).map((set) => [set.setCode.toUpperCase(), set]));

  const sets = discoveredSets
    .map((set, index) => {
      const persistedSet = persistedBySet.get(set.setCode);
      return {
        ...set,
        universeId: persistedSet?.universeId ?? defaultUniverseId,
        sortOrder: persistedSet?.sortOrder ?? index + 1
      };
    })
    .sort((left, right) => left.universeId.localeCompare(right.universeId) || left.sortOrder - right.sortOrder || left.setCode.localeCompare(right.setCode));

  for (const set of sets) {
    if (!universes.some((universe) => universe.id === set.universeId)) {
      universes.push({ id: set.universeId, name: titleFromId(set.universeId) });
    }
  }

  const selected = sets.find((set) => set.setCode === selectedSetCode.toUpperCase()) ?? sets[0];
  return {
    universes,
    sets,
    selectedUniverseId: selected?.universeId ?? universes[0]?.id ?? fallbackUniverse.id,
    selectedSetCode: selected?.setCode ?? selectedSetCode.toUpperCase()
  };
}

async function createSetFolder(repoRoot: string, request: CreateSetRequest): Promise<string> {
  const setCode = normalizeSetCode(request.setCode);
  const setName = clean(request.setName);
  if (!setName) {
    throw new Error('Set name is required.');
  }

  const universeId = normalizeUniverseId(request.universeId || request.universeName || 'custom');
  const universeName = clean(request.universeName) || titleFromId(universeId);
  const setDir = join(repoRoot, 'sets', setCode);
  await mkdir(setDir);

  await writeFile(
    join(setDir, 'sets.csv'),
    `${writeCsvRecords(
      [
        {
          set_code: setCode,
          set_name: setName,
          set_type: 'custom',
          version: '0.1.0',
          default_language: 'en',
          default_asset_pack: 'basic-m15-local',
          default_export_profile: 'cockatrice',
          author: clean(request.author) || 'Jonathan Kyle Hobson',
          status: normalizeSetStatus(request.status ?? 'draft'),
          tags: cleanTags(request.tags).join(';'),
          notes: clean(request.notes) || `Created in Homebrew Forge for ${universeName}.`
        }
      ],
      SET_HEADERS
    )}\n`,
    'utf8'
  );
  await writeFile(join(setDir, 'cards.csv'), `${CARD_HEADERS.join(',')}\n`, 'utf8');
  await writeFile(join(setDir, 'card_faces.csv'), `${FACE_HEADERS.join(',')}\n`, 'utf8');
  await writeFile(join(setDir, 'card_variants.csv'), `${VARIANT_HEADERS.join(',')}\n`, 'utf8');
  await writeFile(join(setDir, 'card_variant_faces.csv'), `${VARIANT_FACE_HEADERS.join(',')}\n`, 'utf8');
  await writeFile(join(setDir, 'art_manifest.csv'), `${ART_HEADERS.join(',')}\n`, 'utf8');
  await writeFile(
    join(setDir, 'export_profiles.csv'),
    `${writeCsvRecords(
      [
        {
          profile_id: 'cockatrice',
          target: 'cockatrice',
          image_format: 'png',
          width_px: '488',
          height_px: '680',
          quality: '',
          include_bleed: 'false',
          bleed_px: '0',
          include_crop_marks: 'false',
          include_playtest_watermark: 'false',
          watermark_text: 'Not For Sale',
          allow_placeholder_art: 'true',
          filename_template: '{{collector_number}}_{{slug_name}}.png'
        },
        {
          profile_id: 'review_png',
          target: 'images',
          image_format: 'png',
          width_px: '744',
          height_px: '1039',
          quality: '',
          include_bleed: 'false',
          bleed_px: '0',
          include_crop_marks: 'false',
          watermark_text: 'Not For Sale',
          allow_placeholder_art: 'true',
          filename_template: '{{card_id}}.png'
        }
      ],
      EXPORT_PROFILE_HEADERS
    )}\n`,
    'utf8'
  );

  const library = await readLibrary(repoRoot, setCode);
  const universes = upsertUniverse(library.universes, { id: universeId, name: universeName });
  const nextSortOrder = Math.max(0, ...library.sets.filter((set) => set.universeId === universeId).map((set) => set.sortOrder)) + 1;
  const sets = library.sets.map((set) =>
    set.setCode === setCode
      ? {
          setCode,
          universeId,
          sortOrder: nextSortOrder
        }
      : {
          setCode: set.setCode,
          universeId: set.universeId,
          sortOrder: set.sortOrder
        }
  );
  await writeLibraryFile(repoRoot, { universes, sets });
  return setCode;
}

async function createUniverse(repoRoot: string, request: CreateUniverseRequest, selectedSetCode: string): Promise<LibraryState> {
  const name = clean(request.name);
  if (!name) {
    throw new Error('Project name is required.');
  }
  const library = await readLibrary(repoRoot, selectedSetCode);
  const universes = upsertUniverse(library.universes, {
    id: normalizeUniverseId(name),
    name,
    description: clean(request.description) || undefined,
    status: clean(request.status) || 'draft',
    tags: cleanTags(request.tags)
  });
  await writeLibraryFile(repoRoot, {
    universes,
    sets: library.sets.map((set) => ({
      setCode: set.setCode,
      universeId: set.universeId,
      sortOrder: set.sortOrder
    }))
  });
  return readLibrary(repoRoot, selectedSetCode);
}

async function updateUniverse(repoRoot: string, request: UpdateUniverseRequest, selectedSetCode: string): Promise<LibraryState> {
  const universeId = normalizeUniverseId(request.universeId);
  const name = clean(request.name);
  if (!name) {
    throw new Error('Project name is required.');
  }
  const library = await readLibrary(repoRoot, selectedSetCode);
  if (!library.universes.some((universe) => universe.id === universeId)) {
    throw new Error(`Project ${universeId} was not found.`);
  }
  await writeLibraryFile(repoRoot, {
    universes: library.universes.map((universe) =>
      universe.id === universeId
        ? {
            ...universe,
            name,
            description: clean(request.description) || undefined,
            status: clean(request.status) || universe.status || 'draft',
            tags: cleanTags(request.tags)
          }
        : universe
    ),
    sets: library.sets.map((set) => ({
      setCode: set.setCode,
      universeId: set.universeId,
      sortOrder: set.sortOrder
    }))
  });
  return readLibrary(repoRoot, selectedSetCode);
}

async function updateSet(repoRoot: string, request: UpdateSetRequest): Promise<string> {
  const setCode = normalizeSetCode(request.setCode);
  const setName = clean(request.setName);
  if (!setName) {
    throw new Error('Set name is required.');
  }
  const universeId = normalizeUniverseId(request.universeId);
  const library = await readLibrary(repoRoot, setCode);
  if (!library.universes.some((universe) => universe.id === universeId)) {
    throw new Error(`Project ${universeId} was not found.`);
  }

  const setPath = join(repoRoot, 'sets', setCode, 'sets.csv');
  const setRows = parseCsvRecords(await readFile(setPath, 'utf8'));
  const existing = setRows[0] ?? {};
  setRows[0] = {
    ...existing,
    set_code: setCode,
    set_name: setName,
    set_type: clean(existing.set_type) || 'custom',
    version: clean(existing.version) || '0.1.0',
    default_language: clean(existing.default_language) || 'en',
    default_asset_pack: clean(existing.default_asset_pack) || 'basic-m15-local',
    default_export_profile: clean(existing.default_export_profile) || 'cockatrice',
    author: clean(existing.author) || 'Jonathan Kyle Hobson',
    status: normalizeSetStatus(request.status),
    tags: cleanTags(request.tags).join(';'),
    notes: clean(existing.notes)
  };
  await writeFile(setPath, `${writeCsvRecords(setRows, SET_HEADERS)}\n`, 'utf8');

  await writeLibraryFile(repoRoot, {
    universes: library.universes,
    sets: library.sets.map((set) => ({
      setCode: set.setCode,
      universeId: set.setCode === setCode ? universeId : set.universeId,
      sortOrder: set.sortOrder
    }))
  });
  return setCode;
}

async function exportSourceFile(repoRoot: string, request: ExportSourceRequest): Promise<ExportSourceResult> {
  const setCode = normalizeSetCode(request.setCode);
  const setDir = join(repoRoot, 'sets', setCode);
  const textTargets: Record<Exclude<ExportSourceRequest['target'], 'cockatrice_xml' | 'cockatrice_zip' | 'print_pdf'>, { path: string; filename: string; mimeType: string }> = {
    set_csv: { path: join(setDir, 'sets.csv'), filename: `${setCode}-sets.csv`, mimeType: 'text/csv' },
    cards_csv: { path: join(setDir, 'cards.csv'), filename: `${setCode}-cards.csv`, mimeType: 'text/csv' },
    faces_csv: { path: join(setDir, 'card_faces.csv'), filename: `${setCode}-card-faces.csv`, mimeType: 'text/csv' },
    art_csv: { path: join(setDir, 'art_manifest.csv'), filename: `${setCode}-art-manifest.csv`, mimeType: 'text/csv' },
    profiles_csv: { path: join(setDir, 'export_profiles.csv'), filename: `${setCode}-export-profiles.csv`, mimeType: 'text/csv' }
  };

  if (request.target === 'cockatrice_xml') {
    const sync = await syncCockatricePackage(repoRoot, setCode, request.variantMode);
    return {
      filename: `${setCode}.xml`,
      mimeType: 'application/xml',
      encoding: 'text',
      content: await readFile(sync.xmlPath, 'utf8'),
      sync
    };
  }
  if (request.target === 'cockatrice_zip') {
    const sync = await syncCockatricePackage(repoRoot, setCode, request.variantMode);
    if (!sync.zipPath) {
      throw new Error('Cockatrice ZIP was not generated.');
    }
    return {
      filename: `${setCode}-cockatrice.zip`,
      mimeType: 'application/zip',
      encoding: 'base64',
      content: (await readFile(sync.zipPath)).toString('base64'),
      sync
    };
  }
  if (request.target === 'print_pdf') {
    const project = await loadForgeProject({ rootDir: repoRoot, setCode });
    const result = await exportPrintPdf({
      project,
      rootDir: repoRoot,
      setCode,
      outputRoot: join(repoRoot, 'output-live'),
      paper: 'letter',
      cardsPerPage: 9,
      variantMode: request.variantMode
    });
    return {
      filename: `${setCode}-letter-9up.pdf`,
      mimeType: 'application/pdf',
      encoding: 'base64',
      content: (await readFile(result.pdfPath)).toString('base64')
    };
  }

  const target = textTargets[request.target];
  return {
    filename: target.filename,
    mimeType: target.mimeType,
    encoding: 'text',
    content: await readFile(target.path, 'utf8')
  };
}

async function exportPrintFile(repoRoot: string, request: PrintExportRequest): Promise<PrintExportResult> {
  const slotGroup = await printSlotsForRequest(repoRoot, request);
  const scalePercent = clampPrintScalePercent(request.scalePercent);
  const scaleSuffix = scalePercent === 100 ? '' : `-${scalePercent}pct`;
  const outputPath = join(repoRoot, 'output-live', 'print', request.sourceKind, `${printSafeName(`${slotGroup.label}-${request.paper}-${request.layout}-${request.inkMode}${scaleSuffix}`)}.${request.outputFormat}`);
  const sheet = await exportPrintSheet({
    slots: slotGroup.slots,
    outputPath,
    outputFormat: request.outputFormat,
    paper: request.paper,
    layout: request.layout,
    inkMode: request.inkMode,
    scalePercent,
    includeCropMarks: request.includeCropMarks,
    includeCutLines: request.includeCutLines,
    title: slotGroup.title
  });
  return printResultFromFile({
    sourceKind: request.sourceKind,
    filename: basename(outputPath),
    outputPath,
    outputFormat: request.outputFormat,
    warnings: [...slotGroup.warnings, ...sheet.warnings],
    cardCount: sheet.cardCount,
    pageCount: sheet.pageCount,
    paper: sheet.paper,
    layout: sheet.layout,
    inkMode: sheet.inkMode,
    scalePercent: sheet.scalePercent
  });
}

async function printSlotsForRequest(repoRoot: string, request: PrintExportRequest): Promise<{ slots: PrintSheetSlotInput[]; warnings: string[]; label: string; title: string }> {
  const copies = clampPrintCopies(request.copies);
  if (request.sourceKind === 'current_card') {
    if (!request.draft) {
      throw new Error('Choose a card before exporting a current-card print sheet.');
    }
    const draft = request.draft;
    const setCode = normalizeSetCode(draft.setCode);
    const project = await loadForgeProject({ rootDir: repoRoot, setCode });
    const { card, face } = recordsFromDraft(draft);
    const needsImage = printNeedsRenderedImage(request);
    const warnings: string[] = [];
    let imagePath: string | undefined;
    if (needsImage) {
      const assetPack = await loadAssetPack({ rootDir: repoRoot, packId: project.set.defaultAssetPack ?? 'basic-m15-local' });
      const art = buildPreviewArt(repoRoot, draft, project);
      const referenceCatalog = loadProjectReferenceCatalog(repoRoot);
      const imageRoot = join(repoRoot, 'output-live', setCode, 'print', 'current-card', 'images', createHash('sha1').update(JSON.stringify(draft)).digest('hex').slice(0, 12));
      const imageResult = await renderCardImage({
        card,
        faces: [face],
        art,
        assetPack,
        exportProfile: editorPrintProfile(),
        outDir: imageRoot,
        referenceCatalog
      });
      imagePath = imageResult.outputPath;
      warnings.push(...imageResult.warnings);
    }
    return {
      slots: [{ card, face, imagePath, copies }],
      warnings,
      label: `${draft.collectorNumber}-${draft.name}-${draft.variantDisplayName}`,
      title: `${draft.name} / ${draft.variantDisplayName}`
    };
  }

  if (request.sourceKind === 'active_set') {
    const setCode = normalizeSetCode(request.setCode ?? request.draft?.setCode ?? 'DEMO');
    const project = await loadForgeProject({ rootDir: repoRoot, setCode });
    const slotGroup = await authoredProjectPrintSlots(repoRoot, project, request, copies, `set-${setCode}`);
    return { ...slotGroup, label: `${setCode}-set`, title: `${project.set.setName} (${setCode})` };
  }

  if (request.sourceKind === 'project') {
    const library = await readLibrary(repoRoot, request.setCode ?? request.draft?.setCode ?? 'DEMO');
    const universeId = request.universeId || library.selectedUniverseId;
    const universe = library.universes.find((candidate) => candidate.id === universeId);
    if (!universe) {
      throw new Error('Choose a project before printing.');
    }
    const setCodes = library.sets.filter((set) => set.universeId === universeId).map((set) => set.setCode);
    const slotGroups = await Promise.all(
      setCodes.map(async (setCode) => authoredProjectPrintSlots(repoRoot, await loadForgeProject({ rootDir: repoRoot, setCode }), request, copies, `project-${universeId}-${setCode}`))
    );
    const slots = slotGroups.flatMap((slotGroup) => slotGroup.slots);
    if (!slots.length) {
      throw new Error(`No printable authored cards found for ${universe.name}.`);
    }
    return {
      slots,
      warnings: slotGroups.flatMap((slotGroup) => slotGroup.warnings),
      label: universe.name,
      title: `${universe.name} project`
    };
  }

  if (request.sourceKind === 'deck') {
    if (!request.deckId) {
      throw new Error('Choose a deck before printing.');
    }
    const deck = await readDeckState(repoRoot, request.deckId);
    const slots = await deckPrintSlots(repoRoot, deck.entries, request, copies);
    if (!slots.length) {
      throw new Error(`No printable cards found in ${deck.metadata.name}.`);
    }
    return {
      slots,
      warnings: deck.warnings,
      label: deck.metadata.name,
      title: `${deck.metadata.name} deck`
    };
  }

  if (request.sourceKind === 'collection') {
    if (!request.collectionId) {
      throw new Error('Choose a collection before printing.');
    }
    const collection = await readCollectionState(repoRoot, request.collectionId);
    const slots = collection.entries.map((entry) => collectionEntryPrintSlot(entry, copies));
    if (!slots.length) {
      throw new Error(`No printable cards found in ${collection.metadata.name}.`);
    }
    return {
      slots,
      warnings: collection.warnings,
      label: collection.metadata.name,
      title: `${collection.metadata.name} collection`
    };
  }

  throw new Error(`Unsupported print source ${request.sourceKind}.`);
}

async function authoredProjectPrintSlots(repoRoot: string, project: ForgeProject, request: PrintExportRequest, copies: number, cacheKey: string): Promise<{ slots: PrintSheetSlotInput[]; warnings: string[]; label: string; title: string }> {
  const entries = variantExportCards(project, request.variantMode ?? 'primary').filter((entry) => entry.card.status !== 'cut' && entry.card.status !== 'archived' && entry.card.printCount > 0);
  if (!entries.length) {
    return { slots: [], warnings: [], label: project.set.setCode, title: project.set.setName };
  }
  const warnings: string[] = [];
  const imagePathsByCardId = new Map<string, string>();
  if (printNeedsRenderedImage(request)) {
    const assetPack = await loadAssetPack({ rootDir: repoRoot, packId: project.set.defaultAssetPack ?? 'basic-m15-local' });
    const referenceCatalog = loadProjectReferenceCatalog(repoRoot);
    const imageRoot = join(repoRoot, 'output-live', project.set.setCode, 'print', 'images', printSafeName(cacheKey));
    const renderResults = await renderSetImages({
      cards: entries.map((entry) => entry.card),
      faces: entries.map((entry) => entry.face),
      art: project.art,
      assetPack,
      exportProfile: printProfileForProject(project),
      outDir: imageRoot,
      referenceCatalog
    });
    for (const result of renderResults) {
      imagePathsByCardId.set(result.cardId, result.outputPath);
      warnings.push(...result.warnings);
    }
  }
  return {
    slots: entries.map((entry) => ({
      card: entry.card,
      face: entry.face,
      imagePath: imagePathsByCardId.get(entry.card.cardId),
      copies: Math.max(1, entry.card.printCount) * copies
    })),
    warnings,
    label: project.set.setCode,
    title: project.set.setName
  };
}

async function deckPrintSlots(repoRoot: string, entries: ResolvedDeckEntry[], request: PrintExportRequest, copies: number): Promise<PrintSheetSlotInput[]> {
  const slots: PrintSheetSlotInput[] = [];
  const authoredBySet = new Map<string, ResolvedDeckEntry[]>();
  for (const entry of entries) {
    if (entry.card?.source === 'collection') {
      slots.push(cardOptionPrintSlot(entry.card, entry.count * copies, entry.nameSnapshot));
      continue;
    }
    const setEntries = authoredBySet.get(entry.setCode) ?? [];
    setEntries.push(entry);
    authoredBySet.set(entry.setCode, setEntries);
  }

  for (const [setCode, setEntries] of authoredBySet) {
    const project = await loadForgeProject({ rootDir: repoRoot, setCode });
    const exportEntries = variantExportCards(project, 'all');
    const selected = setEntries
      .map((entry) => {
        const match =
          exportEntries.find((candidate) => candidate.parentCard.cardId === entry.cardId && entry.variantId && candidate.variant.variantId === entry.variantId) ??
          exportEntries.find((candidate) => candidate.parentCard.cardId === entry.cardId && candidate.variant.isPrimary) ??
          exportEntries.find((candidate) => candidate.parentCard.cardId === entry.cardId);
        return match ? { entry, match } : undefined;
      })
      .filter((value): value is { entry: ResolvedDeckEntry; match: ReturnType<typeof variantExportCards>[number] } => Boolean(value));
    if (!selected.length) {
      continue;
    }
    const imagePathsByCardId = new Map<string, string>();
    if (printNeedsRenderedImage(request)) {
      const assetPack = await loadAssetPack({ rootDir: repoRoot, packId: project.set.defaultAssetPack ?? 'basic-m15-local' });
      const imageRoot = join(repoRoot, 'output-live', setCode, 'print', 'images', `deck-${printSafeName(request.deckId ?? 'deck')}`);
      const rendered = await renderSetImages({
        cards: selected.map((item) => item.match.card),
        faces: selected.map((item) => item.match.face),
        art: project.art,
        assetPack,
        exportProfile: printProfileForProject(project),
        outDir: imageRoot,
        referenceCatalog: loadProjectReferenceCatalog(repoRoot)
      });
      for (const result of rendered) {
        imagePathsByCardId.set(result.cardId, result.outputPath);
      }
    }
    for (const item of selected) {
      slots.push({
        card: item.match.card,
        face: item.match.face,
        imagePath: imagePathsByCardId.get(item.match.card.cardId),
        copies: item.entry.count * copies
      });
    }
  }
  return slots;
}

function cardOptionPrintSlot(card: DeckCardOption, copies: number, fallbackName?: string): PrintSheetSlotInput {
  return {
    card: proxyCardRecord({
      cardId: card.cardId,
      setCode: card.setCode,
      collectorNumber: card.collectorNumber,
      name: card.name || fallbackName || 'Card',
      colorIdentity: card.colorIdentity,
      tags: card.tags
    }),
    face: proxyFaceRecord({
      cardId: card.cardId,
      name: card.name || fallbackName || 'Card',
      manaCost: card.manaCost,
      typeLine: card.typeLine,
      oracleText: card.oracleText,
      flavorText: card.flavorText,
      power: card.power,
      toughness: card.toughness,
      colors: card.colors
    }),
    imageSrc: card.imageUris?.normal ?? card.imageUris?.large ?? card.imageUris?.png ?? card.imageUris?.small,
    copies
  };
}

function collectionEntryPrintSlot(entry: CollectionEntry, copies: number): PrintSheetSlotInput {
  const imageSrc = imageUrlFromCollectionEntry(entry);
  return {
    card: proxyCardRecord({
      cardId: entry.linkedCardId || entry.scryfallId || entry.entryId,
      setCode: entry.setCode || entry.linkedSetCode || 'COLL',
      collectorNumber: entry.collectorNumber || entry.entryId,
      name: entry.cardName,
      colorIdentity: '',
      tags: []
    }),
    face: proxyFaceRecord({
      cardId: entry.linkedCardId || entry.scryfallId || entry.entryId,
      name: entry.cardName,
      manaCost: '',
      typeLine: entry.setName ? `${entry.setName} print` : 'Collection print',
      oracleText: [entry.condition ? `Condition: ${entry.condition}` : '', entry.finish ? `Finish: ${entry.finish}` : '', entry.location ? `Location: ${entry.location}` : ''].filter(Boolean).join('\n'),
      flavorText: entry.reviewStatus === 'needs_review' ? 'Needs review before final printing.' : '',
      power: '',
      toughness: '',
      colors: ''
    }),
    imageSrc,
    copies: entry.quantity * copies
  };
}

function proxyCardRecord(args: { cardId: string; setCode: string; collectorNumber: string; name: string; colorIdentity?: string; tags?: string[] }): CardRecord {
  return {
    cardId: printSafeName(args.cardId) || 'proxy-card',
    setCode: args.setCode || 'PRX',
    collectorNumber: args.collectorNumber || '000',
    name: args.name,
    layout: 'normal',
    mode: 'imported',
    sourceCardName: args.name,
    sourceSetCode: args.setCode,
    rarity: 'common',
    colorIdentity: args.colorIdentity ?? '',
    tags: args.tags ?? [],
    status: 'playtest',
    printCount: 1,
    exportNameOverride: undefined,
    notes: undefined
  };
}

function proxyFaceRecord(args: { cardId: string; name: string; manaCost: string; typeLine: string; oracleText: string; flavorText: string; power: string; toughness: string; colors: string }): CardFaceRecord {
  return {
    cardId: printSafeName(args.cardId) || 'proxy-card',
    faceIndex: 0,
    faceName: args.name,
    manaCost: args.manaCost,
    typeLine: args.typeLine,
    oracleText: args.oracleText,
    flavorText: args.flavorText,
    power: args.power,
    toughness: args.toughness,
    loyalty: '',
    defense: undefined,
    colors: args.colors,
    frameType: 'normal_creature',
    artId: '',
    artistDisplay: '',
    watermark: '',
    rulesTextSizeHint: 'auto',
    rulesTextPaddingTop: undefined,
    rulesTextPaddingRight: undefined,
    rulesTextPaddingBottom: undefined,
    rulesTextPaddingLeft: undefined,
    rulesTextReminderMode: 'auto',
    layoutVariant: 'normal'
  };
}

function imageUrlFromCollectionEntry(entry: CollectionEntry): string | undefined {
  const source = parseJsonObject(entry.sourceRow);
  const enrichment = objectValue(source?.enrichment) ?? objectValue(source?.scryfall) ?? source;
  const images = objectValue(enrichment?.image_uris) ?? objectValue(enrichment?.imageUris) ?? objectValue(objectValue(Array.isArray(enrichment?.card_faces) ? enrichment.card_faces[0] : undefined)?.image_uris);
  return textValue(images?.normal) || textValue(images?.large) || textValue(images?.png) || textValue(images?.small) || undefined;
}

function parseJsonObject(value: string | undefined): Record<string, unknown> | undefined {
  if (!value?.trim()) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(value);
    return objectValue(parsed);
  } catch {
    return undefined;
  }
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function textValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function printNeedsRenderedImage(request: PrintExportRequest): boolean {
  return request.inkMode !== 'wireframe' && request.inkMode !== 'text_only';
}

async function printResultFromFile(args: {
  sourceKind: PrintExportRequest['sourceKind'];
  filename: string;
  outputPath: string;
  outputFormat: PrintExportRequest['outputFormat'];
  warnings: string[];
  cardCount: number;
  pageCount: number;
  paper: PrintExportRequest['paper'];
  layout: PrintExportRequest['layout'];
  inkMode: PrintExportRequest['inkMode'];
  scalePercent: number;
}): Promise<PrintExportResult> {
  return {
    filename: args.filename,
    mimeType: args.outputFormat === 'pdf' ? 'application/pdf' : 'image/png',
    encoding: 'base64',
    content: (await readFile(args.outputPath)).toString('base64'),
    warnings: args.warnings,
    summary: {
      sourceKind: args.sourceKind,
      cardCount: args.cardCount,
      pageCount: args.pageCount,
      paper: args.paper,
      layout: args.layout,
      inkMode: args.inkMode,
      outputFormat: args.outputFormat,
      scalePercent: args.scalePercent
    }
  };
}

function editorPrintProfile(): ExportProfile {
  return {
    ...previewProfile(),
    profileId: 'editor_print_current_card',
    target: 'print_pdf',
    widthPx: 1500,
    heightPx: 2100,
    includePlaytestWatermark: true,
    watermarkText: 'CUSTOM PLAYTEST - NOT FOR SALE',
    filenameTemplate: '{{collector_number}}_{{slug_name}}.png'
  };
}

function clampPrintCopies(value: number): number {
  return Number.isInteger(value) ? Math.min(99, Math.max(1, value)) : 1;
}

function clampPrintScalePercent(value: number): number {
  return Number.isFinite(value) ? Math.min(125, Math.max(90, Math.round(value))) : 100;
}

function printSafeName(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 96) || 'print-sheet'
  );
}

async function renderPreview(repoRoot: string, draft: CardDraft): Promise<PreviewResponse> {
  const inferredFrame = inferFrame(draft, CORE_FRAMES);
  const project = await loadForgeProject({ rootDir: repoRoot, setCode: draft.setCode });
  const { card, face } = recordsFromDraft(draft);
  const assetPack = await loadAssetPack({ rootDir: repoRoot, packId: project.set.defaultAssetPack ?? 'basic-m15-local' });
  const art = buildPreviewArt(repoRoot, draft, project);
  const referenceCatalog = loadProjectReferenceCatalog(repoRoot);
  const previewRoot = join(repoRoot, '.tmp', 'editor-preview', createHash('sha1').update(JSON.stringify(draft)).digest('hex').slice(0, 12));
  const result = await renderCardImage({
    card,
    faces: [face],
    art,
    assetPack,
    exportProfile: previewProfile(),
    outDir: previewRoot,
    referenceCatalog
  });
  const image = await readFile(result.outputPath);
  const supportWarnings = inferredFrame.renderable
    ? []
    : [`${inferredFrame.label} is ${inferredFrame.supportState ?? 'registered-only'} and is previewing with fallback geometry.`];
  return {
    imageDataUri: `data:image/png;base64,${image.toString('base64')}`,
    warnings: [...supportWarnings, ...result.warnings],
    inferredFrame,
    powerAssessment: assessCardPower({
      card,
      face,
      referenceCatalog,
      config: loadProjectPowerConfig(repoRoot)
    })
  };
}

function buildPreviewArt(repoRoot: string, draft: CardDraft, project: ForgeProject): Record<string, ArtManifestRecord> {
  const art = { ...project.art };
  if (draft.artId && (draft.artFilePath || draft.artUrl || draft.artDataUri)) {
    art[draft.artId] = {
      artId: draft.artId,
      filePath: draft.artFilePath,
      absolutePath: draft.artFilePath ? join(repoRoot, draft.artFilePath) : undefined,
      sourceUrl: draft.artUrl || undefined,
      sourceType: draft.artUrl ? 'url' : 'local',
      artist: draft.artist,
      license: 'private placeholder',
      permissionStatus: 'owned',
      checksumSha256: undefined,
      transform: transformFromDraft(draft),
      crop: cropFromDraft(draft),
      notes: undefined
    } as ArtManifestRecord & { dataUri?: string };
    if (draft.artDataUri) {
      (art[draft.artId] as ArtManifestRecord & { dataUri?: string }).dataUri = draft.artDataUri;
    }
  }
  return art;
}

function cropFromDraft(draft: CardDraft): { x: number; y: number; w: number; h: number } | undefined {
  const x = optionalNumber(draft.artCropX);
  const y = optionalNumber(draft.artCropY);
  const w = optionalNumber(draft.artCropW);
  const h = optionalNumber(draft.artCropH);
  return x === undefined || y === undefined || w === undefined || h === undefined ? undefined : { x, y, w, h };
}

function transformFromDraft(draft: CardDraft): { x: number; y: number; scale: number } | undefined {
  const x = optionalNumber(draft.artPositionX);
  const y = optionalNumber(draft.artPositionY);
  const scale = optionalNumber(draft.artScale);
  return x === undefined && y === undefined && scale === undefined ? undefined : { x: x ?? 0, y: y ?? 0, scale: scale === undefined ? 100 : Math.max(100, scale) };
}

function optionalNumber(value: string): number | undefined {
  if (value.trim() === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizedScaleCell(value: string): string {
  const parsed = optionalNumber(value);
  return parsed === undefined || parsed <= 100 ? '' : String(parsed);
}

async function discoverSets(repoRoot: string): Promise<Omit<SetSummary, 'universeId' | 'sortOrder'>[]> {
  const setsRoot = join(repoRoot, 'sets');
  const entries = await readdir(setsRoot, { withFileTypes: true });
  const summaries: Omit<SetSummary, 'universeId' | 'sortOrder'>[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name.startsWith('_')) {
      continue;
    }
    const setCode = entry.name.toUpperCase();
    const setRows = await tryReadCsv(join(setsRoot, entry.name, 'sets.csv'));
    const cardRows = await tryReadCsv(join(setsRoot, entry.name, 'cards.csv'));
    const setRow = setRows.find((row) => clean(row.set_code).toUpperCase() === setCode) ?? setRows[0];
    summaries.push({
      setCode,
      setName: clean(setRow?.set_name) || setCode,
      status: clean(setRow?.status) || 'draft',
      tags: cleanTags(setRow?.tags),
      cardCount: cardRows.length
    });
  }
  return summaries.sort((left, right) => left.setCode.localeCompare(right.setCode));
}

async function readLibraryFile(repoRoot: string): Promise<LibraryFile | undefined> {
  try {
    const content = await readFile(libraryPath(repoRoot), 'utf8');
    const parsed = JSON.parse(content) as Partial<LibraryFile>;
    return {
      universes: normalizeUniverses(parsed.universes ?? []),
      sets: (parsed.sets ?? [])
        .map((set) => ({
          setCode: clean(set.setCode).toUpperCase(),
          universeId: normalizeUniverseId(set.universeId),
          sortOrder: Number(set.sortOrder ?? 0) || undefined
        }))
        .filter((set) => set.setCode && set.universeId)
    };
  } catch {
    return undefined;
  }
}

async function writeLibraryFile(repoRoot: string, file: LibraryFile): Promise<void> {
  const content = `${JSON.stringify(
    {
      universes: normalizeUniverses(file.universes),
      sets: file.sets
        .map((set, index) => ({
          setCode: normalizeSetCode(set.setCode),
          universeId: normalizeUniverseId(set.universeId),
          sortOrder: set.sortOrder ?? index + 1
        }))
        .sort((left, right) => left.universeId.localeCompare(right.universeId) || left.sortOrder - right.sortOrder || left.setCode.localeCompare(right.setCode))
    },
    null,
    2
  )}\n`;
  await writeFile(libraryPath(repoRoot), content, 'utf8');
}

function libraryPath(repoRoot: string): string {
  return join(repoRoot, 'sets', 'library.json');
}

async function tryReadCsv(path: string): Promise<CsvRow[]> {
  try {
    return parseCsvRecords(await readFile(path, 'utf8'));
  } catch {
    return [];
  }
}

function normalizeUniverses(universes: UniverseSummary[]): UniverseSummary[] {
  const seen = new Set<string>();
  return universes
    .map((universe) => ({
      id: normalizeUniverseId(universe.id || universe.name),
      name: clean(universe.name) || titleFromId(universe.id),
      description: clean(universe.description) || undefined,
      status: clean(universe.status) || 'draft',
      tags: cleanTags(universe.tags),
      coverImageUrl: clean(universe.coverImageUrl) || undefined
    }))
    .filter((universe) => {
      if (!universe.id || seen.has(universe.id)) {
        return false;
      }
      seen.add(universe.id);
      return true;
    });
}

function upsertUniverse(universes: UniverseSummary[], next: UniverseSummary): UniverseSummary[] {
  const normalized = normalizeUniverses([next])[0] ?? { id: 'custom', name: 'Custom' };
  if (universes.some((universe) => universe.id === normalized.id)) {
    return universes.map((universe) => (universe.id === normalized.id ? { ...universe, ...normalized, name: normalized.name || universe.name } : universe));
  }
  return [...universes, normalized];
}

function normalizeSetCode(value: string): string {
  const setCode = clean(value).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  if (!/^[A-Z0-9]{2,6}$/.test(setCode)) {
    throw new Error('Set code must be 2-6 letters or numbers.');
  }
  return setCode;
}

function normalizeSetStatus(value: string): string {
  const status = clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  return status || 'draft';
}

function normalizeAssetId(value: string): string {
  return clean(value)
    .replace(/\.[a-z0-9]+$/i, '')
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'LIBRARY-ASSET';
}

function normalizeAssetType(value: string): string {
  return clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'art';
}

function decodeDataUri(dataUri: string): { mimeType: string; buffer: Buffer } {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Upload asset must be a base64 data URI.');
  }
  return {
    mimeType: match[1] ?? 'application/octet-stream',
    buffer: Buffer.from(match[2] ?? '', 'base64')
  };
}

function extensionFromMime(mimeType: string, filename: string | undefined): string {
  const explicit = clean(filename).match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  if (explicit) {
    return explicit;
  }
  if (mimeType === 'image/png') {
    return 'png';
  }
  if (mimeType === 'image/jpeg') {
    return 'jpg';
  }
  if (mimeType === 'image/webp') {
    return 'webp';
  }
  if (mimeType === 'image/svg+xml') {
    return 'svg';
  }
  return 'bin';
}

function normalizeUniverseId(value: string): string {
  return clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'custom';
}

function titleFromId(value: string): string {
  return normalizeUniverseId(value)
    .split('-')
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

async function saveDraft(repoRoot: string, draft: CardDraft): Promise<void> {
  const setDir = join(repoRoot, 'sets', draft.setCode);
  const { card, face, variant, variantFace } = recordsFromDraft(draft);
  const cardsPath = join(setDir, 'cards.csv');
  const facesPath = join(setDir, 'card_faces.csv');
  const variantsPath = join(setDir, 'card_variants.csv');
  const variantFacesPath = join(setDir, 'card_variant_faces.csv');
  const artPath = join(setDir, 'art_manifest.csv');
  const cards = parseCsvRecords(await readFile(cardsPath, 'utf8'));
  const faces = parseCsvRecords(await readFile(facesPath, 'utf8'));
  const variants = await readVariantRowsForSave(variantsPath, cards, faces);
  const variantFaces = await readVariantFaceRowsForSave(variantFacesPath, variants, faces);
  const artRows = parseCsvRecords(await readFile(artPath, 'utf8'));
  upsertRow(cards, 'card_id', card.cardId, cardToRow(card));
  upsertRow(variants, 'variant_id', variant.variantId, variantToRow(variant));
  upsertRowByKeys(variantFaces, ['variant_id', 'face_index'], variantFaceToRow(variantFace));
  normalizePrimaryVariantRows(variants, variant.cardId);
  const primaryVariant = variants.find((row) => clean(row.card_id) === card.cardId && isTruthy(row.is_primary));
  const primaryVariantFace = primaryVariant ? variantFaces.find((row) => clean(row.variant_id) === clean(primaryVariant.variant_id) && clean(row.face_index || '0') === '0') : undefined;
  upsertRowByKeys(faces, ['card_id', 'face_index'], primaryVariantFace ? variantFaceRowToFaceRow(primaryVariantFace) : faceToRow(face));
  if (draft.artId && draft.artFilePath) {
    upsertRow(artRows, 'art_id', draft.artId, {
      art_id: draft.artId,
      file_path: draft.artFilePath,
      source_url: draft.artUrl,
      source_type: draft.artUrl ? 'url' : 'local',
      artist: draft.artist,
      license: 'private placeholder',
      permission_status: 'owned',
      checksum_sha256: '',
      position_x: draft.artPositionX,
      position_y: draft.artPositionY,
      scale: normalizedScaleCell(draft.artScale),
      crop_x: draft.artCropX,
      crop_y: draft.artCropY,
      crop_w: draft.artCropW,
      crop_h: draft.artCropH,
      notes: 'Saved from the local editor.'
    });
  }
  await writeFile(cardsPath, `${writeCsvRecords(cards, CARD_HEADERS)}\n`, 'utf8');
  await writeFile(facesPath, `${writeCsvRecords(faces, FACE_HEADERS)}\n`, 'utf8');
  await writeFile(variantsPath, `${writeCsvRecords(variants, VARIANT_HEADERS)}\n`, 'utf8');
  await writeFile(variantFacesPath, `${writeCsvRecords(variantFaces, VARIANT_FACE_HEADERS)}\n`, 'utf8');
  await writeFile(artPath, `${writeCsvRecords(artRows, ART_HEADERS)}\n`, 'utf8');
}

async function readVariantRowsForSave(path: string, cards: CsvRow[], faces: CsvRow[]): Promise<CsvRow[]> {
  const existing = await tryReadCsv(path);
  if (existing.length) {
    return existing;
  }
  return cards.map((card, index) => ({
    variant_id: `${clean(card.card_id)}-V1`,
    card_id: clean(card.card_id),
    display_name: 'Variant 1',
    kind: 'mechanics_test',
    status: clean(card.status) === 'final' ? 'final' : 'active',
    is_primary: 'true',
    export_policy: 'default',
    tags: '',
    notes: clean(card.notes),
    created_at: '',
    updated_at: ''
  })).filter((row) => row.card_id && faces.some((face) => clean(face.card_id) === row.card_id));
}

async function readVariantFaceRowsForSave(path: string, variants: CsvRow[], faces: CsvRow[]): Promise<CsvRow[]> {
  const existing = await tryReadCsv(path);
  if (existing.length) {
    return existing;
  }
  return variants.flatMap((variant) => {
    const face = faces.find((candidate) => clean(candidate.card_id) === clean(variant.card_id) && clean(candidate.face_index || '0') === '0');
    return face ? [{ ...face, variant_id: clean(variant.variant_id), card_id: clean(variant.card_id) }] : [];
  });
}

function normalizePrimaryVariantRows(rows: CsvRow[], cardId: string): void {
  const cardRows = rows.filter((row) => clean(row.card_id) === cardId);
  if (!cardRows.length) {
    return;
  }
  const nonArchived = cardRows.filter((row) => clean(row.status) !== 'archived');
  if (!nonArchived.length) {
    throw new Error('A card must keep at least one non-archived variant.');
  }
  const primary = nonArchived.find((row) => isTruthy(row.is_primary)) ?? nonArchived[0];
  for (const row of cardRows) {
    row.is_primary = row.variant_id === primary.variant_id ? 'true' : 'false';
  }
}

function variantToRow(variant: CardVariantRecord): CsvRow {
  return {
    variant_id: variant.variantId,
    card_id: variant.cardId,
    display_name: variant.displayName,
    kind: variant.kind,
    status: variant.status,
    is_primary: variant.isPrimary ? 'true' : 'false',
    export_policy: variant.exportPolicy,
    tags: variant.tags.join(';'),
    notes: variant.notes ?? '',
    created_at: variant.createdAt ?? '',
    updated_at: variant.updatedAt ?? ''
  };
}

function variantFaceToRow(face: CardVariantFaceRecord): CsvRow {
  return {
    variant_id: face.variantId,
    card_id: face.cardId,
    face_index: String(face.faceIndex),
    face_name: face.faceName,
    mana_cost: face.manaCost ?? '',
    type_line: face.typeLine,
    oracle_text: face.oracleText ?? '',
    flavor_text: face.flavorText ?? '',
    power: face.power ?? '',
    toughness: face.toughness ?? '',
    loyalty: face.loyalty ?? '',
    defense: face.defense ?? '',
    colors: face.colors ?? '',
    frame_type: face.frameType,
    art_id: face.artId ?? '',
    artist_display: face.artistDisplay ?? '',
    watermark: face.watermark ?? '',
    rules_text_size_hint: face.rulesTextSizeHint,
    rules_text_padding_top: numberCell(face.rulesTextPaddingTop),
    rules_text_padding_right: numberCell(face.rulesTextPaddingRight),
    rules_text_padding_bottom: numberCell(face.rulesTextPaddingBottom),
    rules_text_padding_left: numberCell(face.rulesTextPaddingLeft),
    rules_text_reminder_mode: face.rulesTextReminderMode ?? 'auto',
    layout_variant: face.layoutVariant ?? 'normal'
  };
}

function variantFaceRowToFaceRow(row: CsvRow): CsvRow {
  return {
    card_id: clean(row.card_id),
    face_index: clean(row.face_index || '0'),
    face_name: clean(row.face_name),
    mana_cost: clean(row.mana_cost),
    type_line: clean(row.type_line),
    oracle_text: clean(row.oracle_text),
    flavor_text: clean(row.flavor_text),
    power: clean(row.power),
    toughness: clean(row.toughness),
    loyalty: clean(row.loyalty),
    defense: clean(row.defense),
    colors: clean(row.colors),
    frame_type: clean(row.frame_type),
    art_id: clean(row.art_id),
    artist_display: clean(row.artist_display),
    watermark: clean(row.watermark),
    rules_text_size_hint: clean(row.rules_text_size_hint) || 'auto',
    rules_text_padding_top: clean(row.rules_text_padding_top),
    rules_text_padding_right: clean(row.rules_text_padding_right),
    rules_text_padding_bottom: clean(row.rules_text_padding_bottom),
    rules_text_padding_left: clean(row.rules_text_padding_left),
    rules_text_reminder_mode: clean(row.rules_text_reminder_mode) || 'auto',
    layout_variant: clean(row.layout_variant) || 'normal'
  };
}

function isTruthy(value: unknown): boolean {
  return ['true', '1', 'yes', 'y'].includes(clean(value).toLowerCase());
}

async function importCards(repoRoot: string, request: ImportCardsRequest): Promise<ImportCardsSummary> {
  const content = request.content.trim();
  if (!content) {
    throw new Error('Import content is empty.');
  }
  const imported = analyzeMtgDesignImport({
    setCode: request.setCode,
    format: request.format,
    content
  });
  if (imported.cards.length === 0) {
    throw new Error('No cards were found in the import.');
  }
  return applyImportedRows({
    repoRoot,
    setCode: request.setCode,
    imported,
    mode: request.mode,
    dryRun: Boolean(request.dryRun)
  });
}

async function syncCockatricePackage(repoRoot: string, setCode: string, variantMode?: ExportSourceRequest['variantMode']): Promise<CockatriceSyncResult> {
  const project = await loadForgeProject({ rootDir: repoRoot, setCode });
  const result: ExportCockatricePackageResult = await exportCockatricePackage({
    project,
    rootDir: repoRoot,
    setCode,
    outputRoot: join(repoRoot, 'output-live'),
    zip: true,
    variantMode
  });
  return {
    xmlPath: result.xmlPath,
    zipPath: result.zipPath,
    imageCount: result.imagePaths.length,
    warnings: result.warnings
  };
}

function upsertRow(rows: Record<string, string>[], key: string, value: string, next: Record<string, string>): void {
  const index = rows.findIndex((row) => row[key] === value);
  if (index >= 0) {
    rows[index] = { ...rows[index], ...next };
    return;
  }
  rows.push(next);
}

function cardToRow(card: CardRecord): Record<string, string> {
  return {
    card_id: card.cardId,
    set_code: card.setCode,
    collector_number: card.collectorNumber,
    name: card.name,
    layout: card.layout,
    mode: card.mode,
    source_card_name: card.sourceCardName ?? '',
    source_set_code: card.sourceSetCode ?? '',
    rarity: card.rarity,
    color_identity: card.colorIdentity ?? '',
    tags: card.tags.join(';'),
    status: card.status,
    print_count: String(card.printCount),
    export_name_override: card.exportNameOverride ?? '',
    notes: card.notes ?? ''
  };
}

function faceToRow(face: CardFaceRecord): Record<string, string> {
  return {
    card_id: face.cardId,
    face_index: String(face.faceIndex),
    face_name: face.faceName,
    mana_cost: face.manaCost ?? '',
    type_line: face.typeLine,
    oracle_text: face.oracleText ?? '',
    flavor_text: face.flavorText ?? '',
    power: face.power ?? '',
    toughness: face.toughness ?? '',
    loyalty: face.loyalty ?? '',
    defense: face.defense ?? '',
    colors: face.colors ?? '',
    frame_type: face.frameType,
    art_id: face.artId ?? '',
    artist_display: face.artistDisplay ?? '',
    watermark: face.watermark ?? '',
    rules_text_size_hint: face.rulesTextSizeHint,
    rules_text_padding_top: numberCell(face.rulesTextPaddingTop),
    rules_text_padding_right: numberCell(face.rulesTextPaddingRight),
    rules_text_padding_bottom: numberCell(face.rulesTextPaddingBottom),
    rules_text_padding_left: numberCell(face.rulesTextPaddingLeft),
    rules_text_reminder_mode: face.rulesTextReminderMode ?? 'auto',
    layout_variant: face.layoutVariant ?? 'normal'
  };
}

function numberCell(value: number | undefined): string {
  return value === undefined ? '' : String(value);
}

function clean(value: unknown): string {
  return String(value ?? '').trim();
}

function cleanTags(values: unknown): string[] {
  const raw = Array.isArray(values) ? values : String(values ?? '').split(/[,;\n]+/);
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const value of raw) {
    const tag = clean(value);
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) {
      continue;
    }
    seen.add(key);
    tags.push(tag);
  }
  return tags;
}

async function discoverFullPackFrameFamilies(repoRoot: string): Promise<string[]> {
  const dataDir = join(
    repoRoot,
    '..',
    'Basic-M15-Magic-Pack-main',
    'Full-Magic-Pack-main',
    'data'
  );
  try {
    const entries = await readdir(dataDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && entry.name.endsWith('.mse-style'))
      .map((entry) => entry.name.replace(/\.mse-style$/, ''))
      .filter((name) => /magic-m15|planeswalker|token|saga|battle|dfc|split/i.test(name))
      .sort();
  } catch {
    return [];
  }
}

function readJsonBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')) as T);
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function numberParam(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function officialPriceCurrencyParam(value: string | null): OfficialCardSearchFilters['priceCurrency'] {
  return value === 'usdFoil' || value === 'eur' || value === 'eurFoil' || value === 'tix' ? value : value === 'usd' ? 'usd' : undefined;
}

function officialImageFilterParam(value: string | null): OfficialCardSearchFilters['hasImage'] {
  return value === 'yes' || value === 'no' ? value : undefined;
}

function officialCardCategoryParam(value: string | null): OfficialCardSearchFilters['cardCategory'] {
  return value === 'normal' || value === 'token' || value === 'art' || value === 'extra' || value === 'funny' ? value : undefined;
}

function officialCardSortParam(value: string | null): OfficialCardSearchFilters['sort'] {
  return value === 'auto' ||
    value === 'relevance' ||
    value === 'name' ||
    value === 'released' ||
    value === 'price' ||
    value === 'manaValue' ||
    value === 'rarity' ||
    value === 'set' ||
    value === 'colorIdentity' ||
    value === 'type'
    ? value
    : undefined;
}

function configuredPort(): number {
  const rawPort = Number.parseInt(process.env.HOMEBREW_FORGE_PORT ?? process.env.PORT ?? '5177', 10);
  return Number.isFinite(rawPort) ? rawPort : 5177;
}

function serverPort(server: { httpServer?: { address: () => string | { port?: number } | null } | null }, fallback: number): number {
  const address = server.httpServer?.address();
  if (address && typeof address === 'object' && typeof address.port === 'number') {
    return address.port;
  }
  return fallback;
}

function scheduleEditorRestart(repoRoot: string): void {
  const launcher = join(repoRoot, 'scripts', 'launch-homebrew-forge-app.sh');
  const child = spawn('/bin/zsh', [launcher], {
    detached: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      HOMEBREW_FORGE_FORCE_RESTART: '1',
      HOMEBREW_FORGE_OPEN_CHROME: '0'
    }
  });
  child.unref();
  setTimeout(() => {
    try {
      process.kill(process.pid, 'SIGTERM');
    } catch {
      process.exit(0);
    }
  }, 500);
}

async function isAllowedEditorAssetPath(repoRoot: string, absolutePath: string): Promise<boolean> {
  if (isPathInside(absolutePath, repoRoot)) {
    return true;
  }
  try {
    const packDirs = await readdir(join(repoRoot, 'assets', 'packs'), { withFileTypes: true });
    for (const entry of packDirs) {
      if (!entry.isDirectory()) {
        continue;
      }
      const pack = await loadAssetPack({ rootDir: repoRoot, packId: entry.name }).catch(() => null);
      if (!pack) {
        continue;
      }
      const allowedRoots = new Set(pack.roles.filter((role) => role.exists).map((role) => dirname(role.absolutePath)));
      for (const role of pack.roles) {
        if (role.absolutePath === absolutePath) {
          return true;
        }
      }
      for (const root of allowedRoots) {
        if (isPathInside(absolutePath, root)) {
          return true;
        }
      }
    }
  } catch {
    return false;
  }
  return false;
}

async function manaSymbolCandidatePaths(repoRoot: string, rawSymbol: string): Promise<string[]> {
  const symbol = normalizeManaSymbolKey(rawSymbol);
  if (!symbol) {
    return [];
  }

  const fileNames = manaSymbolFileNames(symbol);
  const candidates: string[] = [];
  const packIds = await orderedAssetPackIds(repoRoot);
  for (const packId of packIds) {
    const pack = await loadAssetPack({ rootDir: repoRoot, packId }).catch(() => null);
    if (!pack) {
      continue;
    }
    const declared = pack.resolveRole({ role: 'symbol.mana', symbol });
    if (declared?.exists) {
      candidates.push(declared.absolutePath);
    }

    const symbolRoots = new Set(pack.roles.filter((role) => role.role === 'symbol.mana' && role.exists).map((role) => dirname(role.absolutePath)));
    for (const root of symbolRoots) {
      for (const fileName of fileNames) {
        candidates.push(join(root, fileName));
      }
    }
  }

  return [...new Set(candidates)];
}

async function orderedAssetPackIds(repoRoot: string): Promise<string[]> {
  const entries = await readdir(join(repoRoot, 'assets', 'packs'), { withFileTypes: true }).catch(() => []);
  const ids = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  const preferred = ['genevensis-local', 'figma-mtg-card-assets', 'basic-m15-local', 'private-mtg-style'];
  return [...preferred.filter((id) => ids.includes(id)), ...ids.filter((id) => !preferred.includes(id))];
}

function normalizeManaSymbolKey(value: string): string {
  const cleaned = value.trim().replace(/^\{/, '').replace(/\}$/, '').toLowerCase().replace(/\s+/g, '');
  const aliases: Record<string, string> = {
    white: 'w',
    blue: 'u',
    black: 'b',
    red: 'r',
    green: 'g',
    colorless: 'c',
    tap: 't'
  };
  return aliases[cleaned] ?? cleaned;
}

function manaSymbolFileNames(symbol: string): string[] {
  const simple: Record<string, string> = {
    w: 'mana_sol_w.png',
    u: 'mana_sol_u.png',
    b: 'mana_sol_b.png',
    r: 'mana_sol_r.png',
    g: 'mana_sol_g.png',
    c: 'mana_sol_c.png',
    t: 'tap.png'
  };
  if (simple[symbol]) {
    return [simple[symbol]];
  }
  if (/^\d+$/.test(symbol)) {
    return [`mana_${symbol}.png`];
  }

  const compact = symbol.replace(/\//g, '').replace(/-/g, '');
  if (/^[wubrgcsp]{2}$/.test(compact)) {
    const reversed = compact.split('').reverse().join('');
    return [
      `mana_bi_${compact}.png`,
      `mana_bi_${reversed}.png`,
      `mana_h_${compact}.png`,
      `mana_h_${reversed}.png`,
      `mana_d_${compact}.png`,
      `mana_d_${reversed}.png`,
      `mana_f_${compact}.png`,
      `mana_f_${reversed}.png`
    ];
  }

  return [`mana_${compact}.png`];
}

function isPathInside(path: string, root: string): boolean {
  const resolvedPath = resolve(path);
  const resolvedRoot = resolve(root);
  return resolvedPath === resolvedRoot || resolvedPath.startsWith(`${resolvedRoot}${sep}`);
}

function mimeTypeForAsset(path: string): string {
  switch (extname(path).toLowerCase()) {
    case '.csv':
      return 'text/csv; charset=utf-8';
    case '.md':
      return 'text/markdown; charset=utf-8';
    case '.txt':
      return 'text/plain; charset=utf-8';
    case '.xml':
      return 'application/xml; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    default:
      return 'image/png';
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

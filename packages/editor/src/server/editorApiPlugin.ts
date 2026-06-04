import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { extname, isAbsolute, join, resolve } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import {
  createCollection,
  importCollectionCsv,
  exportCollectionCockatrice,
  exportCollectionCsv,
  exportCollectionPlainText,
  listCollections,
  readCollectionState,
  createDeck,
  analyzeMtgDesignImport,
  applyImportedRows,
  exportDeckCockatrice,
  exportDeckPlainText,
  exportCockatricePackage,
  exportPrintPdf,
  assessCardPower,
  loadAssetPack,
  loadForgeProject,
  createProjectReference,
  loadProjectReferenceCatalog,
  loadProjectPowerConfig,
  listDecks,
  parseCsvRecords,
  readDeckState,
  renderCardImage,
  saveDeck,
  upsertRowByKeys,
  writeCsvRecords,
  type ArtManifestRecord,
  type CardFaceRecord,
  type CardRecord,
  type CreateReferenceRequest,
  type CreateDeckRequest,
  type CsvRow,
  type CollectionExportTarget,
  type CollectionExportResult,
  type CollectionImportRequest,
  type CreateCollectionRequest,
  type DeckExportResult,
  type ExportCockatricePackageResult,
  type ForgeProject,
  type SaveDeckRequest
} from '@homebrew-forge/forge';
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
  LibraryAssetSummary,
  LibraryState,
  PreviewResponse,
  SetSummary,
  UpdateSetRequest,
  UpdateUniverseRequest,
  UniverseSummary
} from '../domain/editorTypes.js';

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
}

export function editorApiPlugin(options: EditorApiPluginOptions): Plugin {
  return {
    name: 'homebrew-forge-editor-api',
    configureServer(server) {
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
          if (!absolutePath.startsWith(repoRoot)) {
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

async function editorProjectFromForge(repoRoot: string, project: ForgeProject, lastCockatriceSync?: CockatriceSyncResult): Promise<EditorProject> {
  const facesByCard = new Map<string, CardFaceRecord[]>();
  for (const face of project.faces) {
    facesByCard.set(face.cardId, [...(facesByCard.get(face.cardId) ?? []), face]);
  }
  const drafts = project.cards.flatMap((card) => {
    const face = [...(facesByCard.get(card.cardId) ?? [])].sort((left, right) => left.faceIndex - right.faceIndex)[0];
    if (!face) {
      return [];
    }
    return [
      draftFromRecords({
        card,
        face,
        art: face.artId ? project.art[face.artId] : undefined,
        setName: project.set.setName,
        language: project.set.defaultLanguage?.toUpperCase() ?? 'EN',
        designer: project.set.author
      })
    ];
  });

  return {
    setCode: project.setCode,
    setName: project.set.setName,
    language: project.set.defaultLanguage?.toUpperCase() ?? 'EN',
    designer: project.set.author ?? '',
    assetPackId: project.set.defaultAssetPack ?? 'debug',
    cards: drafts.map((draft) => ({
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
      needsReview: draft.status === 'review' || draft.status === 'idea' || draft.tags.some((tag) => tag === 'needs_review' || tag.startsWith('unsupported_layout:'))
    })),
    drafts,
    libraryAssets: buildLibraryAssets(project, drafts),
    frames: CORE_FRAMES,
    discoveredFrameFamilies: await discoverFullPackFrameFamilies(repoRoot),
    lastCockatriceSync
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
    const sync = await syncCockatricePackage(repoRoot, setCode);
    return {
      filename: `${setCode}.xml`,
      mimeType: 'application/xml',
      encoding: 'text',
      content: await readFile(sync.xmlPath, 'utf8'),
      sync
    };
  }
  if (request.target === 'cockatrice_zip') {
    const sync = await syncCockatricePackage(repoRoot, setCode);
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
      cardsPerPage: 9
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

async function renderPreview(repoRoot: string, draft: CardDraft): Promise<PreviewResponse> {
  const inferredFrame = inferFrame(draft, CORE_FRAMES);
  if (!inferredFrame.renderable) {
    const { card, face } = recordsFromDraft(draft);
    const referenceCatalog = loadProjectReferenceCatalog(repoRoot);
    return {
      warnings: [`${inferredFrame.label} is registered, but its renderer slice is not implemented yet.`],
      inferredFrame,
      powerAssessment: assessCardPower({
        card,
        face,
        referenceCatalog,
        config: loadProjectPowerConfig(repoRoot)
      })
    };
  }

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
  return {
    imageDataUri: `data:image/png;base64,${image.toString('base64')}`,
    warnings: result.warnings,
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
      tags: cleanTags(universe.tags)
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
  const { card, face } = recordsFromDraft(draft);
  const cardsPath = join(setDir, 'cards.csv');
  const facesPath = join(setDir, 'card_faces.csv');
  const artPath = join(setDir, 'art_manifest.csv');
  const cards = parseCsvRecords(await readFile(cardsPath, 'utf8'));
  const faces = parseCsvRecords(await readFile(facesPath, 'utf8'));
  const artRows = parseCsvRecords(await readFile(artPath, 'utf8'));
  upsertRow(cards, 'card_id', card.cardId, cardToRow(card));
  upsertRowByKeys(faces, ['card_id', 'face_index'], faceToRow(face));
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
  await writeFile(artPath, `${writeCsvRecords(artRows, ART_HEADERS)}\n`, 'utf8');
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

async function syncCockatricePackage(repoRoot: string, setCode: string): Promise<CockatriceSyncResult> {
  const project = await loadForgeProject({ rootDir: repoRoot, setCode });
  const result: ExportCockatricePackageResult = await exportCockatricePackage({
    project,
    rootDir: repoRoot,
    setCode,
    outputRoot: join(repoRoot, 'output-live'),
    zip: true
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

function mimeTypeForAsset(path: string): string {
  switch (extname(path).toLowerCase()) {
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

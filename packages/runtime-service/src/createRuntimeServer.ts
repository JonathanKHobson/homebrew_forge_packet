import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';
import { listCollections, listDecks, loadForgeProject, readCollectionState, readDeckState } from '@homebrew-forge/forge';
import { editorProjectFromForge } from '@homebrew-forge/editor-core/projectAdapter';
import {
  APP_LABEL,
  DEFAULT_PORT,
  buildRuntimeHealth,
  buildRuntimeVersion,
  createSourceFingerprint,
  type RuntimeDeliveryMode
} from './runtimeHealth.js';
import { RuntimeAssetError, readRuntimeAsset, readRuntimeManaSymbol } from './routes/assets.js';
import {
  createRuntimeCollection,
  exportRuntimeCollection,
  importRuntimeCollection,
  importRuntimeCollectionPrices,
  refreshRuntimeCollectionPrices,
  saveRuntimeCollection
} from './routes/collections.js';
import { createRuntimeDeck, exportRuntimeDeck, importRuntimeDeck, saveRuntimeDeck } from './routes/decks.js';
import { RuntimeRouteError } from './routes/errors.js';
import { readRuntimeLibrary } from './routes/library.js';
import {
  addRuntimeOfficialCardToCollection,
  addRuntimeOfficialCardToDeck,
  listRuntimeOfficialCardPrintVariants,
  readRuntimeOfficialCardStatus,
  searchRuntimeOfficialCards
} from './routes/officialCards.js';
import { readRuntimeReferenceCatalog } from './routes/reference.js';

export interface RuntimeServerOptions {
  repoRoot: string;
  host?: string;
  preferredPort?: number;
  deliveryMode?: RuntimeDeliveryMode;
  editorDistDir?: string;
  projectRoot?: string | null;
  appLabel?: string;
  defaultSetCode?: string;
}

export interface StartedRuntimeServer {
  server: Server;
  host: string;
  port: number;
  origin: string;
  healthUrl: string;
  versionUrl: string;
  startedAt: string;
  startupFingerprint: string;
  close: () => Promise<void>;
}

interface RuntimeRequestState {
  repoRoot: string;
  host: string;
  port: number;
  deliveryMode: RuntimeDeliveryMode;
  editorDistDir: string | null;
  projectRoot: string | null;
  appLabel: string;
  defaultSetCode: string;
  startedAt: string;
  startupFingerprint: string;
}

export async function startRuntimeServer(options: RuntimeServerOptions): Promise<StartedRuntimeServer> {
  const host = options.host ?? '127.0.0.1';
  const preferredPort = Number(options.preferredPort || DEFAULT_PORT);
  const repoRoot = resolve(options.repoRoot);
  const startedAt = new Date().toISOString();
  const startupFingerprint = await createSourceFingerprint(repoRoot);
  const baseState = {
    repoRoot,
    host,
    deliveryMode: options.deliveryMode ?? 'runtime-dev',
    editorDistDir: options.editorDistDir ? resolve(options.editorDistDir) : null,
    projectRoot: options.projectRoot ?? null,
    appLabel: options.appLabel ?? APP_LABEL,
    defaultSetCode: options.defaultSetCode ?? 'DEMO',
    startedAt,
    startupFingerprint
  };

  const firstAttempt = await tryListen({ ...baseState, port: preferredPort });
  const started = firstAttempt.ok ? firstAttempt : await tryListen({ ...baseState, port: 0 });
  if (!started.ok) {
    throw started.error;
  }

  const origin = `http://${host}:${started.port}`;
  return {
    server: started.server,
    host,
    port: started.port,
    origin,
    healthUrl: `${origin}/api/health`,
    versionUrl: `${origin}/api/version`,
    startedAt,
    startupFingerprint,
    close: () => closeServer(started.server)
  };
}

async function tryListen(state: RuntimeRequestState): Promise<{ ok: true; server: Server; port: number } | { ok: false; error: Error }> {
  const listenState = { ...state };
  const server = createServer((req, res) => {
    void handleRequest(req, res, listenState);
  });

  return new Promise((resolveResult) => {
    const onError = (error: NodeJS.ErrnoException) => {
      server.off('listening', onListening);
      resolveResult({ ok: false, error });
    };
    const onListening = () => {
      server.off('error', onError);
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : state.port;
      listenState.port = port;
      resolveResult({ ok: true, server, port });
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(state.port, state.host);
  });
}

async function handleRequest(req: IncomingMessage, res: ServerResponse, state: RuntimeRequestState): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${state.host}:${state.port}`);

  if (req.method === 'GET' && url.pathname === '/api/health') {
    sendJson(
      res,
      200,
      await buildRuntimeHealth({
        repoRoot: state.repoRoot,
        deliveryMode: state.deliveryMode,
        projectRoot: state.projectRoot,
        processId: process.pid,
        parentProcessId: process.ppid,
        startedAt: state.startedAt,
        port: state.port,
        appLabel: state.appLabel,
        startupFingerprint: state.startupFingerprint
      })
    );
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/version') {
    sendJson(
      res,
      200,
      buildRuntimeVersion({
        repoRoot: state.repoRoot,
        deliveryMode: state.deliveryMode,
        projectRoot: state.projectRoot,
        selectedPort: state.port,
        processId: process.pid,
        parentProcessId: process.ppid,
        startedAt: state.startedAt
      })
    );
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/library') {
    try {
      sendJson(res, 200, await readRuntimeLibrary(state.repoRoot, url.searchParams.get('set') ?? state.defaultSetCode));
    } catch (error) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/project') {
    try {
      const setCode = url.searchParams.get('set') ?? state.defaultSetCode;
      const project = await loadForgeProject({ rootDir: state.repoRoot, setCode });
      sendJson(res, 200, await editorProjectFromForge(state.repoRoot, project));
    } catch (error) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
    }
    return;
  }

  if (url.pathname === '/api/mana-symbol') {
    if (req.method !== 'GET') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }
    try {
      sendAsset(res, await readRuntimeManaSymbol(state.repoRoot, url.searchParams.get('symbol') ?? ''));
    } catch (error) {
      sendJson(res, error instanceof RuntimeAssetError ? error.statusCode : 404, { error: error instanceof Error ? error.message : String(error) });
    }
    return;
  }

  if (url.pathname === '/api/asset') {
    if (req.method !== 'GET') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }
    try {
      sendAsset(res, await readRuntimeAsset(state.repoRoot, url.searchParams.get('path')));
    } catch (error) {
      sendJson(res, error instanceof RuntimeAssetError ? error.statusCode : 404, { error: error instanceof Error ? error.message : String(error) });
    }
    return;
  }

  if (url.pathname === '/api/reference') {
    if (req.method === 'GET') {
      try {
        sendJson(res, 200, readRuntimeReferenceCatalog(state.repoRoot));
      } catch (error) {
        sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
      }
      return;
    }
    if (req.method === 'POST') {
      sendJson(res, 501, { error: 'Runtime route POST /api/reference has not been extracted yet.' });
      return;
    }
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  if (url.pathname === '/api/official-cards/status') {
    if (req.method !== 'GET') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }
    try {
      sendJson(res, 200, await readRuntimeOfficialCardStatus(state.repoRoot));
    } catch (error) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
    }
    return;
  }

  if (url.pathname === '/api/official-cards/search') {
    if (req.method !== 'GET') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }
    try {
      sendJson(res, 200, await searchRuntimeOfficialCards(state.repoRoot, url.searchParams));
    } catch (error) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
    }
    return;
  }

  if (url.pathname === '/api/official-cards/variants') {
    if (req.method !== 'GET') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }
    try {
      sendJson(res, 200, await listRuntimeOfficialCardPrintVariants(state.repoRoot, url.searchParams));
    } catch (error) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
    }
    return;
  }

  if (url.pathname === '/api/official-cards/add-to-collection') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }
    try {
      sendJson(res, 200, await addRuntimeOfficialCardToCollection(state.repoRoot, await readJsonBody(req)));
    } catch (error) {
      sendRouteErrorJson(res, error);
    }
    return;
  }

  if (url.pathname === '/api/official-cards/add-to-deck') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }
    try {
      sendJson(res, 200, await addRuntimeOfficialCardToDeck(state.repoRoot, await readJsonBody(req)));
    } catch (error) {
      sendRouteErrorJson(res, error);
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/decks') {
    try {
      sendJson(res, 200, await listDecks(state.repoRoot));
    } catch (error) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/deck') {
    const deckId = url.searchParams.get('id') ?? '';
    if (!deckId.trim()) {
      sendJson(res, 400, { error: 'Missing deck id.' });
      return;
    }
    try {
      sendJson(res, 200, await readDeckState(state.repoRoot, deckId));
    } catch (error) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
    }
    return;
  }

  if (url.pathname === '/api/create-deck') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }
    try {
      sendJson(res, 200, await createRuntimeDeck(state.repoRoot, await readJsonBody(req)));
    } catch (error) {
      sendRouteErrorJson(res, error);
    }
    return;
  }

  if (url.pathname === '/api/save-deck') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }
    try {
      sendJson(res, 200, await saveRuntimeDeck(state.repoRoot, await readJsonBody(req)));
    } catch (error) {
      sendRouteErrorJson(res, error);
    }
    return;
  }

  if (url.pathname === '/api/export-deck') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }
    try {
      sendJson(res, 200, await exportRuntimeDeck(state.repoRoot, await readJsonBody(req)));
    } catch (error) {
      sendRouteErrorJson(res, error);
    }
    return;
  }

  if (url.pathname === '/api/import-deck') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }
    try {
      sendJson(res, 200, await importRuntimeDeck(state.repoRoot, await readJsonBody(req)));
    } catch (error) {
      sendRouteErrorJson(res, error);
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/collections') {
    try {
      sendJson(res, 200, await listCollections(state.repoRoot));
    } catch (error) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/collection') {
    const collectionId = url.searchParams.get('id') ?? '';
    if (!collectionId.trim()) {
      sendJson(res, 400, { error: 'Missing collection id.' });
      return;
    }
    try {
      sendJson(res, 200, await readCollectionState(state.repoRoot, collectionId));
    } catch (error) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
    }
    return;
  }

  if (url.pathname === '/api/create-collection') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }
    try {
      sendJson(res, 200, await createRuntimeCollection(state.repoRoot, await readJsonBody(req)));
    } catch (error) {
      sendRouteErrorJson(res, error);
    }
    return;
  }

  if (url.pathname === '/api/save-collection') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }
    try {
      sendJson(res, 200, await saveRuntimeCollection(state.repoRoot, await readJsonBody(req)));
    } catch (error) {
      sendRouteErrorJson(res, error);
    }
    return;
  }

  if (url.pathname === '/api/import-collection') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }
    try {
      sendJson(res, 200, await importRuntimeCollection(state.repoRoot, await readJsonBody(req)));
    } catch (error) {
      sendRouteErrorJson(res, error);
    }
    return;
  }

  if (url.pathname === '/api/collection-prices/refresh') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }
    try {
      sendJson(res, 200, await refreshRuntimeCollectionPrices(state.repoRoot, await readJsonBody(req)));
    } catch (error) {
      sendRouteErrorJson(res, error);
    }
    return;
  }

  if (url.pathname === '/api/collection-prices/import') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }
    try {
      sendJson(res, 200, await importRuntimeCollectionPrices(state.repoRoot, await readJsonBody(req)));
    } catch (error) {
      sendRouteErrorJson(res, error);
    }
    return;
  }

  if (url.pathname === '/api/export-collection') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }
    try {
      sendJson(res, 200, await exportRuntimeCollection(state.repoRoot, await readJsonBody(req)));
    } catch (error) {
      sendRouteErrorJson(res, error);
    }
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    sendJson(res, 404, { error: `Runtime route ${url.pathname} has not been extracted yet.` });
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  if (state.editorDistDir) {
    await serveStaticEditor(req, res, state.editorDistDir, url.pathname);
    return;
  }

  sendJson(res, 404, { error: 'Runtime service is running; no editor dist directory is configured.' });
}

async function serveStaticEditor(req: IncomingMessage, res: ServerResponse, editorDistDir: string, pathname: string): Promise<void> {
  const root = resolve(editorDistDir);
  const requestedPath = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.replace(/^\/+/, ''));
  const absolutePath = resolve(root, requestedPath);
  if (!isInsideRoot(root, absolutePath)) {
    sendJson(res, 403, { error: 'Static asset path is outside the editor dist directory.' });
    return;
  }

  let targetPath = absolutePath;
  try {
    const info = await stat(targetPath);
    if (info.isDirectory()) {
      targetPath = join(targetPath, 'index.html');
    }
  } catch {
    targetPath = join(root, 'index.html');
  }

  try {
    const body = await readFile(targetPath);
    res.statusCode = 200;
    res.setHeader('Content-Type', contentTypeFor(targetPath));
    res.setHeader('Cache-Control', targetPath.endsWith('index.html') ? 'no-store' : 'public, max-age=31536000, immutable');
    if (req.method !== 'HEAD') {
      res.end(body);
    } else {
      res.end();
    }
  } catch {
    sendJson(res, 404, { error: 'Editor asset not found.' });
  }
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function sendAsset(res: ServerResponse, asset: { body: Buffer; contentType: string }): void {
  res.statusCode = 200;
  res.setHeader('Content-Type', asset.contentType);
  res.end(asset.body);
}

function sendRouteErrorJson(res: ServerResponse, error: unknown): void {
  sendJson(res, error instanceof RuntimeRouteError ? error.statusCode : 500, { error: error instanceof Error ? error.message : String(error) });
}

function readJsonBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolveBody, rejectBody) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => {
      try {
        resolveBody(JSON.parse(Buffer.concat(chunks).toString('utf8')) as T);
      } catch (error) {
        rejectBody(error);
      }
    });
    req.on('error', rejectBody);
  });
}

function contentTypeFor(path: string): string {
  switch (extname(path)) {
    case '.css':
      return 'text/css; charset=utf-8';
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
      return 'text/javascript; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.png':
      return 'image/png';
    case '.svg':
      return 'image/svg+xml';
    case '.webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

function isInsideRoot(root: string, candidate: string): boolean {
  const relativePath = relative(root, candidate);
  return relativePath === '' || (!relativePath.startsWith('..') && !relativePath.split(sep).includes('..'));
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolveClose, rejectClose) => {
    server.close((error) => {
      if (error) {
        rejectClose(error);
        return;
      }
      resolveClose();
    });
  });
}

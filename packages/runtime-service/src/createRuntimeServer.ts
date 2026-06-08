import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';
import {
  APP_LABEL,
  DEFAULT_PORT,
  buildRuntimeHealth,
  buildRuntimeVersion,
  createSourceFingerprint,
  type RuntimeDeliveryMode
} from './runtimeHealth.js';
import { readRuntimeLibrary } from './routes/library.js';

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

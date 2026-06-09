import { spawn, type ChildProcessByStdio } from 'node:child_process';
import { once } from 'node:events';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, shell } from 'electron';
import { startRuntimeServer, type StartedRuntimeServer } from '@homebrew-forge/runtime-service/server';

type DesktopBackend = 'vite' | 'runtime';

interface RuntimeInfo {
  backend: DesktopBackend;
  origin: string;
  port: number;
  repoRoot: string;
  processId: number;
  startedAt: string;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_VITE_PORT = 5187;
const DEFAULT_RUNTIME_PORT = 5197;

let mainWindow: BrowserWindow | null = null;
let viteProcess: ChildProcessByStdio<null, Readable, Readable> | null = null;
let runtimeServer: StartedRuntimeServer | null = null;
let runtimeInfo: RuntimeInfo | null = null;

function desktopLogPath(): string {
  return join(app.getPath('logs'), 'desktop-main.log');
}

function logDesktop(message: string): void {
  try {
    mkdirSync(app.getPath('logs'), { recursive: true });
    appendFileSync(desktopLogPath(), `[${new Date().toISOString()}] ${message}\n`);
  } catch {
    // Logging must never prevent the app from booting.
  }
}

function repoRootFromEnvironment(): string {
  const configured = process.env.HOMEBREW_FORGE_REPO_ROOT;
  if (configured) {
    return resolve(configured);
  }
  const resourceRepoRoot = join(process.resourcesPath, 'homebrew-forge-repo-root.txt');
  if (existsSync(resourceRepoRoot)) {
    const configuredRepoRoot = readFileSync(resourceRepoRoot, 'utf8').trim();
    if (configuredRepoRoot) {
      return resolve(configuredRepoRoot);
    }
  }
  return resolve(__dirname, '../../..');
}

function desktopBackend(): DesktopBackend {
  return process.env.HOMEBREW_FORGE_DESKTOP_BACKEND === 'runtime' ? 'runtime' : 'vite';
}

function desktopIconPath(): string | null {
  const candidates = [
    join(process.resourcesPath, 'HomebrewForge.png'),
    join(process.resourcesPath, 'HomebrewForge.icns'),
    join(process.resourcesPath, 'electron.icns')
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function applyDockIcon(context: string): void {
  const iconPath = desktopIconPath();
  if (iconPath && process.platform === 'darwin') {
    const icon = nativeImage.createFromPath(iconPath);
    if (!icon.isEmpty()) {
      app.dock?.setIcon(icon);
      logDesktop(`Applied dock icon context=${context} path=${iconPath}`);
      app.setAboutPanelOptions({
        applicationName: 'Homebrew Forge',
        applicationVersion: app.getVersion(),
        iconPath,
        credits: 'A local-first magical card authoring workbench.'
      });
      return;
    }
    logDesktop(`Dock icon image was empty context=${context} path=${iconPath}`);
    return;
  }
  logDesktop(`Dock icon not applied context=${context} path=${iconPath ?? 'missing'} platform=${process.platform}`);
}

function configureAppIdentity(): void {
  app.name = 'Homebrew Forge';
  app.setName('Homebrew Forge');
  applyDockIcon('configure-app-identity');
}

function nodeExecutable(): string {
  const candidates = [
    process.env.HOMEBREW_FORGE_NODE_EXECUTABLE,
    process.env.npm_node_execpath,
    '/Applications/Codex.app/Contents/Resources/node',
    '/opt/homebrew/bin/node',
    '/usr/local/bin/node',
    '/usr/bin/node'
  ].filter(Boolean) as string[];
  return candidates.find((candidate) => existsSync(candidate)) ?? process.execPath;
}

function pathWithNode(nodeBin: string): string {
  const nodeDir = dirname(nodeBin);
  const existingPath = process.env.PATH ?? '';
  return [nodeDir, '/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin', '/usr/sbin', '/sbin', existingPath].filter(Boolean).join(':');
}

async function startDesktopRuntime(repoRoot: string, backend: DesktopBackend): Promise<RuntimeInfo> {
  logDesktop(`Starting desktop runtime backend=${backend} repoRoot=${repoRoot}`);
  if (backend === 'runtime') {
    const editorDistDir = resolve(repoRoot, 'packages/editor/dist');
    if (!existsSync(join(editorDistDir, 'index.html'))) {
      throw new Error(`Editor dist is missing at ${editorDistDir}. Run the editor build first.`);
    }
    runtimeServer = await startRuntimeServer({
      repoRoot,
      preferredPort: Number(process.env.HOMEBREW_FORGE_DESKTOP_PORT ?? DEFAULT_RUNTIME_PORT),
      editorDistDir,
      deliveryMode: 'desktop-dev',
      appLabel: 'Homebrew Forge Desktop'
    });
    return {
      backend,
      origin: runtimeServer.origin,
      port: runtimeServer.port,
      repoRoot,
      processId: process.pid,
      startedAt: runtimeServer.startedAt
    };
  }

  const port = Number(process.env.HOMEBREW_FORGE_DESKTOP_PORT ?? DEFAULT_VITE_PORT);
  const pnpmScript = resolve(repoRoot, '.tools/pnpm/bin/pnpm.cjs');
  if (!existsSync(pnpmScript)) {
    throw new Error(`Repo pnpm wrapper is missing at ${pnpmScript}.`);
  }

  const nodeBin = nodeExecutable();
  logDesktop(`Spawning Vite runtime with node=${nodeBin} port=${port}`);
  const child = spawn(nodeBin, [pnpmScript, '--filter', '@homebrew-forge/editor', 'exec', 'vite', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: repoRoot,
    env: { ...process.env, BROWSER: 'none', HOMEBREW_FORGE_NODE_EXECUTABLE: nodeBin, PATH: pathWithNode(nodeBin) },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  viteProcess = child;

  child.stdout.on('data', (chunk) => logDesktop(`[homebrew-forge-vite] ${String(chunk).trimEnd()}`));
  child.stderr.on('data', (chunk) => logDesktop(`[homebrew-forge-vite] ${String(chunk).trimEnd()}`));

  const origin = `http://127.0.0.1:${port}`;
  const exitPromise = once(child, 'exit').then(([code]) => {
    logDesktop(`Vite runtime exited before ready code=${String(code)}`);
    throw new Error(`Vite editor server exited before becoming ready. Exit code: ${String(code)}`);
  });
  await Promise.race([waitForHealth(`${origin}/api/health`, 30000), exitPromise]);
  logDesktop(`Vite runtime ready at ${origin}`);
  return {
    backend,
    origin,
    port,
    repoRoot,
    processId: child.pid ?? process.pid,
    startedAt: new Date().toISOString()
  };
}

async function waitForHealth(healthUrl: string, timeoutMs: number): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(healthUrl, { signal: AbortSignal.timeout(1500) });
      if (response.ok) {
        return;
      }
    } catch {
      // Wait and retry until the runtime has had a fair chance to boot.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 300));
  }
  throw new Error(`Homebrew Forge desktop runtime did not become ready at ${healthUrl}.`);
}

function createApplicationMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'quit' }]
    },
    {
      label: 'File',
      submenu: [{ role: 'close' }]
    },
    {
      label: 'Edit',
      submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }]
    },
    {
      label: 'View',
      submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }]
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'front' }]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Open Runtime Health',
          click: () => {
            if (runtimeInfo) {
              void shell.openExternal(`${runtimeInfo.origin}/api/health`);
            }
          }
        }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createMainWindow(origin: string): BrowserWindow {
  const iconPath = desktopIconPath();
  const windowIcon = iconPath ? nativeImage.createFromPath(iconPath) : null;
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 960,
    minHeight: 700,
    title: 'Homebrew Forge',
    backgroundColor: '#10151d',
    show: false,
    ...(windowIcon && !windowIcon.isEmpty() ? { icon: windowIcon } : {}),
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });

  window.once('ready-to-show', () => {
    applyDockIcon('ready-to-show');
    window.show();
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(origin)) {
      return { action: 'allow' };
    }
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  window.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(origin)) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  void window.loadURL(origin);
  return window;
}

async function stopRuntime(): Promise<void> {
  if (runtimeServer) {
    await runtimeServer.close();
    runtimeServer = null;
  }
  if (viteProcess) {
    const child = viteProcess;
    viteProcess = null;
    child.kill('SIGTERM');
    await Promise.race([once(child, 'exit'), new Promise((resolveWait) => setTimeout(resolveWait, 1500))]);
    if (!child.killed) {
      child.kill('SIGKILL');
    }
  }
}

async function boot(): Promise<void> {
  configureAppIdentity();
  logDesktop('Boot start');
  createApplicationMenu();

  const repoRoot = repoRootFromEnvironment();
  const backend = desktopBackend();
  runtimeInfo = await startDesktopRuntime(repoRoot, backend);
  logDesktop(`Runtime info ${JSON.stringify(runtimeInfo)}`);
  mainWindow = createMainWindow(runtimeInfo.origin);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.handle('desktop:get-runtime-info', () => runtimeInfo);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (!mainWindow && runtimeInfo) {
    mainWindow = createMainWindow(runtimeInfo.origin);
  }
});

app.once('before-quit', () => {
  void stopRuntime();
});

void app.whenReady().then(boot).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  logDesktop(`Boot failed: ${message}`);
  dialog.showErrorBox('Homebrew Forge failed to start', message);
  app.quit();
});

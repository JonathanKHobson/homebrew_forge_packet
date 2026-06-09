import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import test from 'node:test';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

test('desktop shell uses secure BrowserWindow defaults', async () => {
  const main = await read('packages/desktop/src/main.ts');
  assert.match(main, /contextIsolation:\s*true/);
  assert.match(main, /nodeIntegration:\s*false/);
  assert.match(main, /sandbox:\s*true/);
  assert.match(main, /webSecurity:\s*true/);
  assert.match(main, /setWindowOpenHandler/);
  assert.match(main, /will-navigate/);
});

test('desktop shell owns only shell/runtime concerns', async () => {
  const main = await read('packages/desktop/src/main.ts');
  assert.match(main, /HOMEBREW_FORGE_DESKTOP_BACKEND/);
  assert.match(main, /startRuntimeServer/);
  assert.match(main, /@homebrew-forge\/editor/);
  assert.doesNotMatch(main, /CardPreview|WorkspaceView|Inspector|DashboardView/);
});

async function read(relativePath) {
  return readFile(join(repoRoot, relativePath), 'utf8');
}

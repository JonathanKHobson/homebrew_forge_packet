import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  buildRuntimeHealth,
  buildRuntimeVersion,
  createSourceFingerprint,
  inspectForgeDistFreshness
} from '../src/server/runtimeHealth.mjs';

test('source fingerprint is stable and changes with watched content', async () => {
  const root = await makeRepo();
  try {
    const watchedPaths = ['packages/editor/src', 'packages/forge/src'];
    const first = await createSourceFingerprint(root, { watchedPaths });
    const second = await createSourceFingerprint(root, { watchedPaths });
    assert.equal(first, second);

    await writeFile(join(root, 'packages/editor/src/App.tsx'), 'export const value = 2;\n');
    const changed = await createSourceFingerprint(root, { watchedPaths });
    assert.notEqual(changed, first);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('forge dist freshness detects missing and older dist output', async () => {
  const root = await makeRepo();
  try {
    await rm(join(root, 'packages/forge/dist'), { recursive: true, force: true });
    assert.equal((await inspectForgeDistFreshness(root)).stale, true);

    await mkdir(join(root, 'packages/forge/dist'), { recursive: true });
    await writeFile(join(root, 'packages/forge/dist/index.js'), 'export const value = 1;\n');
    await setTime(join(root, 'packages/forge/src/index.ts'), new Date('2026-01-02T00:00:00Z'));
    await setTime(join(root, 'packages/forge/dist/index.js'), new Date('2026-01-01T00:00:00Z'));
    const older = await inspectForgeDistFreshness(root);
    assert.equal(older.stale, true);
    assert.equal(older.reason, 'source-newer-than-dist');

    await setTime(join(root, 'packages/forge/dist/index.js'), new Date('2026-01-03T00:00:00Z'));
    assert.equal((await inspectForgeDistFreshness(root)).stale, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runtime health reports stale when source changes after startup', async () => {
  const root = await makeRepo();
  try {
    const watchedPaths = ['packages/editor/src'];
    const startupFingerprint = await createSourceFingerprint(root, { watchedPaths });
    await writeFile(join(root, 'packages/editor/src/App.tsx'), 'export const value = 3;\n');
    const health = await buildRuntimeHealth({
      repoRoot: root,
      processId: 123,
      startedAt: '2026-06-04T00:00:00.000Z',
      port: 5177,
      startupFingerprint,
      watchedPaths
    });
    assert.equal(health.stale, true);
    assert.match(health.staleReasons.join(','), /source-changed-since-start/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runtime version exposes delivery mode and contract metadata', async () => {
  const root = await makeRepo();
  try {
    const version = buildRuntimeVersion({
      repoRoot: root,
      deliveryMode: 'web-dev',
      selectedPort: 5177,
      processId: 123,
      parentProcessId: 456,
      startedAt: '2026-06-08T00:00:00.000Z'
    });

    assert.equal(version.app, 'Homebrew Forge');
    assert.equal(version.deliveryMode, 'web-dev');
    assert.equal(version.apiContractVersion, 'runtime-api-v1');
    assert.equal(version.selectedPort, 5177);
    assert.equal(version.processId, 123);
    assert.equal(version.parentProcessId, 456);
    assert.equal(version.projectRoot, null);
    assert.equal(version.desktopBuild, null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function makeRepo() {
  const root = await mkdtemp(join(tmpdir(), 'homebrew-forge-health-'));
  await mkdir(join(root, 'packages/editor/src'), { recursive: true });
  await mkdir(join(root, 'packages/forge/src'), { recursive: true });
  await mkdir(join(root, 'packages/forge/dist'), { recursive: true });
  await writeFile(join(root, 'packages/editor/src/App.tsx'), 'export const value = 1;\n');
  await writeFile(join(root, 'packages/forge/src/index.ts'), 'export const value = 1;\n');
  await writeFile(join(root, 'packages/forge/dist/index.js'), 'export const value = 1;\n');
  return root;
}

async function setTime(path, date) {
  const content = await readFile(path);
  await writeFile(path, content);
  await utimes(path, date, date);
}

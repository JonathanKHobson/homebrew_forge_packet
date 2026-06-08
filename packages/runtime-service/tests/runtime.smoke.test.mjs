import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { test } from 'node:test';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { startRuntimeServer } from '../dist/createRuntimeServer.js';

async function makeFixtureRepo() {
  const root = await mkdtemp(join(tmpdir(), 'homebrew forge runtime fixture '));
  await mkdir(join(root, 'packages/forge/src'), { recursive: true });
  await mkdir(join(root, 'packages/forge/dist'), { recursive: true });
  await mkdir(join(root, 'packages/runtime-service/src'), { recursive: true });
  await mkdir(join(root, 'packages/editor/src'), { recursive: true });
  await mkdir(join(root, 'sets/DEMO'), { recursive: true });
  await mkdir(join(root, 'sets/SOA'), { recursive: true });
  await writeFile(join(root, 'package.json'), '{"name":"fixture"}\n');
  await writeFile(join(root, 'pnpm-workspace.yaml'), 'packages: []\n');
  await writeFile(join(root, 'tsconfig.base.json'), '{}\n');
  await writeFile(join(root, 'packages/forge/src/index.ts'), 'export const value = 1;\n');
  await writeFile(join(root, 'packages/forge/dist/index.js'), 'export const value = 1;\n');
  await writeFile(join(root, 'packages/forge/dist/index.d.ts'), 'export declare const value = 1;\n');
  await writeFile(join(root, 'packages/runtime-service/src/index.ts'), 'export const runtime = true;\n');
  await writeFile(join(root, 'packages/editor/src/main.ts'), 'console.log("editor");\n');
  await writeFile(
    join(root, 'sets/library.json'),
    `${JSON.stringify(
      {
        universes: [
          { id: 'demo', name: 'Demo Project', description: 'Fixture project' },
          { id: 'assassins', name: 'Assassins Project' }
        ],
        sets: [
          { setCode: 'DEMO', universeId: 'demo', sortOrder: 1 },
          { setCode: 'SOA', universeId: 'assassins', sortOrder: 1 }
        ]
      },
      null,
      2
    )}\n`
  );
  await writeFile(join(root, 'sets/DEMO/sets.csv'), 'set_code,set_name,status,tags\nDEMO,Demo Set,draft,playtest\n');
  await writeFile(join(root, 'sets/DEMO/cards.csv'), 'card_id,name\ncard-001,Example Vanguard\ncard-002,Clockwork Relic\n');
  await writeFile(join(root, 'sets/SOA/sets.csv'), 'set_code,set_name,status,tags\nSOA,Signs of Assassins,playtest,commander\n');
  await writeFile(join(root, 'sets/SOA/cards.csv'), 'card_id,name\nsoa-001,Assassin One\n');
  return root;
}

test('runtime service serves health and version', async () => {
  const repoRoot = await makeFixtureRepo();
  const runtime = await startRuntimeServer({ repoRoot, preferredPort: 0, deliveryMode: 'runtime-dev' });
  try {
    const health = await (await fetch(runtime.healthUrl)).json();
    assert.equal(health.appLabel, 'Homebrew Forge Editor');
    assert.equal(health.repoRoot, repoRoot);
    assert.equal(health.port, runtime.port);
    assert.equal(health.deliveryMode, 'runtime-dev');

    const version = await (await fetch(runtime.versionUrl)).json();
    assert.equal(version.app, 'Homebrew Forge');
    assert.equal(version.apiContractVersion, 'runtime-api-v1');
    assert.equal(version.selectedPort, runtime.port);
  } finally {
    await runtime.close();
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test('runtime service serves discovered library state', async () => {
  const repoRoot = await makeFixtureRepo();
  const runtime = await startRuntimeServer({ repoRoot, preferredPort: 0, deliveryMode: 'runtime-dev', defaultSetCode: 'SOA' });
  try {
    const library = await (await fetch(`${runtime.origin}/api/library`)).json();
    assert.equal(library.selectedSetCode, 'SOA');
    assert.equal(library.selectedUniverseId, 'assassins');
    assert.deepEqual(
      library.sets.map((set) => [set.setCode, set.setName, set.cardCount, set.universeId]),
      [
        ['SOA', 'Signs of Assassins', 1, 'assassins'],
        ['DEMO', 'Demo Set', 2, 'demo']
      ]
    );
  } finally {
    await runtime.close();
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test('runtime service falls back when preferred port is busy', async () => {
  const repoRoot = await makeFixtureRepo();
  const blocker = createServer();
  await new Promise((resolve) => blocker.listen(0, '127.0.0.1', resolve));
  const address = blocker.address();
  assert.equal(typeof address, 'object');
  const busyPort = address.port;

  const runtime = await startRuntimeServer({ repoRoot, preferredPort: busyPort, deliveryMode: 'runtime-dev' });
  try {
    assert.notEqual(runtime.port, busyPort);
    const health = await (await fetch(runtime.healthUrl)).json();
    assert.equal(health.port, runtime.port);
  } finally {
    await runtime.close();
    await new Promise((resolve) => blocker.close(resolve));
    await rm(repoRoot, { recursive: true, force: true });
  }
});

import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { test } from 'node:test';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createCollection, createDeck, officialCardsCacheDir } from '@homebrew-forge/forge';
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

async function writeOfficialCardFixture(root) {
  const cacheDir = officialCardsCacheDir(root);
  await mkdir(cacheDir, { recursive: true });
  const syncedAt = '2026-06-08T00:00:00.000Z';
  const prints = [
    {
      view: 'prints',
      id: 'runtime-print-001',
      oracleId: 'runtime-oracle-001',
      name: 'Runtime Bolt',
      manaCost: '{R}',
      manaValue: 1,
      typeLine: 'Instant',
      oracleText: 'Runtime Bolt deals 3 damage to any target.',
      colors: ['R'],
      colorIdentity: ['R'],
      layout: 'normal',
      setCode: 'RUN',
      setName: 'Runtime Fixtures',
      collectorNumber: '1',
      rarity: 'common',
      releasedAt: '2026-01-01',
      finishes: ['nonfoil'],
      lang: 'en',
      prices: { usd: '0.10' }
    },
    {
      view: 'prints',
      id: 'runtime-print-002',
      oracleId: 'runtime-oracle-001',
      name: 'Runtime Bolt',
      manaCost: '{R}',
      manaValue: 1,
      typeLine: 'Instant',
      oracleText: 'Runtime Bolt deals 3 damage to any target.',
      colors: ['R'],
      colorIdentity: ['R'],
      layout: 'normal',
      setCode: 'ALT',
      setName: 'Alternate Runtime Fixtures',
      collectorNumber: '5',
      rarity: 'uncommon',
      releasedAt: '2026-02-01',
      finishes: ['nonfoil', 'foil'],
      lang: 'en',
      prices: { usd: '0.25' }
    }
  ];
  const oracle = [
    {
      view: 'oracle',
      id: 'runtime-oracle-card-001',
      oracleId: 'runtime-oracle-001',
      name: 'Runtime Bolt',
      manaCost: '{R}',
      manaValue: 1,
      typeLine: 'Instant',
      oracleText: 'Runtime Bolt deals 3 damage to any target.',
      colors: ['R'],
      colorIdentity: ['R'],
      layout: 'normal'
    }
  ];
  await writeFile(join(cacheDir, 'prints.json'), `${JSON.stringify({ version: 1, view: 'prints', syncedAt, count: prints.length, cards: prints })}\n`);
  await writeFile(join(cacheDir, 'oracle.json'), `${JSON.stringify({ version: 1, view: 'oracle', syncedAt, count: oracle.length, cards: oracle })}\n`);
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

test('runtime service serves deck and collection read routes', async () => {
  const repoRoot = await makeFixtureRepo();
  const deck = await createDeck(repoRoot, {
    name: 'Runtime Deck',
    linkedUniverseId: 'demo',
    linkedSetCode: 'DEMO',
    format: 'commander',
    tags: ['runtime-smoke']
  });
  const collection = await createCollection(repoRoot, {
    collectionId: 'runtime-binder',
    name: 'Runtime Binder',
    linkedUniverseId: 'demo',
    kind: 'binder',
    purpose: 'owned',
    source: 'generic',
    defaultOwnershipStatus: 'owned'
  });
  const runtime = await startRuntimeServer({ repoRoot, preferredPort: 0, deliveryMode: 'runtime-dev' });
  try {
    const decks = await (await fetch(`${runtime.origin}/api/decks`)).json();
    assert.ok(decks.some((summary) => summary.deckId === deck.metadata.deckId && summary.name === 'Runtime Deck'));

    const deckState = await (await fetch(`${runtime.origin}/api/deck?id=${encodeURIComponent(deck.metadata.deckId)}`)).json();
    assert.equal(deckState.metadata.deckId, deck.metadata.deckId);
    assert.equal(deckState.activeVariantId, deck.activeVariantId);

    const collections = await (await fetch(`${runtime.origin}/api/collections`)).json();
    assert.ok(collections.some((summary) => summary.collectionId === collection.metadata.collectionId && summary.name === 'Runtime Binder'));

    const collectionState = await (await fetch(`${runtime.origin}/api/collection?id=${encodeURIComponent(collection.metadata.collectionId)}`)).json();
    assert.equal(collectionState.metadata.collectionId, collection.metadata.collectionId);
    assert.deepEqual(collectionState.entries, []);
  } finally {
    await runtime.close();
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test('runtime service serves reference and official-card read routes', async () => {
  const repoRoot = await makeFixtureRepo();
  await writeOfficialCardFixture(repoRoot);
  const runtime = await startRuntimeServer({ repoRoot, preferredPort: 0, deliveryMode: 'runtime-dev' });
  try {
    const reference = await (await fetch(`${runtime.origin}/api/reference`)).json();
    assert.ok(reference.terms.some((term) => term.category === 'keyword-ability'));

    const referenceWrite = await fetch(`${runtime.origin}/api/reference`, { method: 'POST', body: '{}' });
    assert.equal(referenceWrite.status, 501);

    const status = await (await fetch(`${runtime.origin}/api/official-cards/status`)).json();
    assert.equal(status.prints.available, true);
    assert.equal(status.prints.count, 2);
    assert.equal(status.oracle.available, true);
    assert.equal(status.oracle.count, 1);

    const search = await (await fetch(`${runtime.origin}/api/official-cards/search?query=runtime&limit=1&sort=name`)).json();
    assert.equal(search.view, 'prints');
    assert.equal(search.total, 2);
    assert.equal(search.cards.length, 1);
    assert.equal(search.cards[0].name, 'Runtime Bolt');

    const unique = await (await fetch(`${runtime.origin}/api/official-cards/search?view=unique&query=Runtime%20Bolt`)).json();
    assert.equal(unique.view, 'unique');
    assert.equal(unique.total, 1);
    assert.equal(unique.cards[0].variantCount, 2);

    const variants = await (await fetch(`${runtime.origin}/api/official-cards/variants?oracleId=runtime-oracle-001`)).json();
    assert.equal(variants.total, 2);
    assert.deepEqual(
      variants.cards.map((card) => card.id),
      ['runtime-print-002', 'runtime-print-001']
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

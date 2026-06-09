import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { test } from 'node:test';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createCollection, createDeck, officialCardsCacheDir } from '@homebrew-forge/forge';
import { startRuntimeServer } from '../dist/createRuntimeServer.js';

const OFFICIAL_PRINT_ONE_ID = '00000000-0000-4000-8000-000000000001';
const OFFICIAL_PRINT_TWO_ID = '00000000-0000-4000-8000-000000000002';
const OFFICIAL_ORACLE_ID = '10000000-0000-4000-8000-000000000001';

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
  await writeFile(
    join(root, 'sets/DEMO/sets.csv'),
    `set_code,set_name,set_type,version,default_language,default_asset_pack,default_export_profile,author,status,tags,notes
DEMO,Demo Set,custom,0.1.0,en,basic-m15-local,cockatrice,Runtime Fixture,draft,playtest,Runtime fixture set
`
  );
  await writeFile(
    join(root, 'sets/DEMO/cards.csv'),
    `card_id,set_code,collector_number,name,layout,mode,source_card_name,source_set_code,rarity,color_identity,tags,status,print_count,export_name_override,notes
DEMO-001,DEMO,001,Example Vanguard,normal,custom,,,rare,W,creature,review,1,,Runtime fixture card
DEMO-002,DEMO,002,Clockwork Relic,normal,custom,,,uncommon,C,artifact,draft,1,,Runtime fixture artifact
`
  );
  await writeFile(
    join(root, 'sets/DEMO/card_faces.csv'),
    `card_id,face_index,face_name,mana_cost,type_line,oracle_text,flavor_text,power,toughness,loyalty,defense,colors,frame_type,art_id,artist_display,watermark,rules_text_size_hint,rules_text_padding_top,rules_text_padding_right,rules_text_padding_bottom,rules_text_padding_left,rules_text_reminder_mode,layout_variant
DEMO-001,0,Example Vanguard,{1}{W},Creature - Human Soldier,Vigilance.,Test flavor.,2,2,,,W,standard,ART-001,Fixture Artist,,,,,,,,
DEMO-002,0,Clockwork Relic,{2},Artifact,{T}: Add {C}.,, ,,,,,standard,ART-002,Fixture Artist,,,,,,,,
`
  );
  await writeFile(
    join(root, 'sets/DEMO/card_variants.csv'),
    `variant_id,card_id,display_name,kind,status,is_primary,export_policy,tags,notes,created_at,updated_at
DEMO-001-V1,DEMO-001,Primary,mechanics_test,active,true,default,,,2026-06-08T00:00:00.000Z,2026-06-08T00:00:00.000Z
DEMO-002-V1,DEMO-002,Primary,mechanics_test,active,true,default,,,2026-06-08T00:00:00.000Z,2026-06-08T00:00:00.000Z
`
  );
  await writeFile(
    join(root, 'sets/DEMO/card_variant_faces.csv'),
    `variant_id,card_id,face_index,face_name,mana_cost,type_line,oracle_text,flavor_text,power,toughness,loyalty,defense,colors,frame_type,art_id,artist_display,watermark,rules_text_size_hint,rules_text_padding_top,rules_text_padding_right,rules_text_padding_bottom,rules_text_padding_left,rules_text_reminder_mode,layout_variant
DEMO-001-V1,DEMO-001,0,Example Vanguard,{1}{W},Creature - Human Soldier,Vigilance.,Test flavor.,2,2,,,W,standard,ART-001,Fixture Artist,,,,,,,,
DEMO-002-V1,DEMO-002,0,Clockwork Relic,{2},Artifact,{T}: Add {C}.,, ,,,,,standard,ART-002,Fixture Artist,,,,,,,,
`
  );
  await writeFile(
    join(root, 'sets/DEMO/art_manifest.csv'),
    `art_id,file_path,source_url,source_type,artist,license,permission_status,checksum_sha256,position_x,position_y,scale,crop_x,crop_y,crop_w,crop_h,notes
ART-001,sets/DEMO/art/runtime-art.png,,local,Fixture Artist,private,owned,,,,,,,,,Runtime fixture art
ART-002,sets/DEMO/art/runtime-art-2.png,,local,Fixture Artist,private,owned,,,,,,,,,Runtime fixture art
`
  );
  await writeFile(
    join(root, 'sets/DEMO/export_profiles.csv'),
    `profile_id,target,image_format,width_px,height_px,quality,include_bleed,bleed_px,include_crop_marks,include_playtest_watermark,watermark_text,allow_placeholder_art,filename_template
cockatrice,cockatrice,png,745,1040,92,true,40,false,true,PLAYTEST,true,{set_code}-{collector_number}-{name}
`
  );
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
      id: OFFICIAL_PRINT_ONE_ID,
      oracleId: OFFICIAL_ORACLE_ID,
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
      id: OFFICIAL_PRINT_TWO_ID,
      oracleId: OFFICIAL_ORACLE_ID,
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
      oracleId: OFFICIAL_ORACLE_ID,
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

async function writeAssetFixture(root) {
  const packRoot = join(root, 'assets/packs/basic-m15-local');
  await mkdir(join(packRoot, 'symbols'), { recursive: true });
  await mkdir(join(root, 'sets/DEMO/art'), { recursive: true });
  await writeFile(join(packRoot, 'symbols/mana_sol_w.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  await writeFile(join(root, 'sets/DEMO/art/runtime-art.png'), Buffer.from([0x72, 0x75, 0x6e]));
  await writeFile(
    join(packRoot, 'manifest.yaml'),
    `pack_id: basic-m15-local
name: Runtime Asset Fixture
version: 0.1.0
source_summary: Test-only runtime fixture.
license_status: local_test_fixture
redistribution_allowed: false
commit_allowed: false
supported_layouts: []
roles:
  - id: mana-w
    role: symbol.mana
    symbol: w
    required: true
    path: symbols/mana_sol_w.png
layout_maps: []
`
  );
}

function postJson(origin, pathname, body) {
  return fetch(`${origin}${pathname}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
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

test('runtime service serves editor project state through shared adapter', async () => {
  const repoRoot = await makeFixtureRepo();
  const runtime = await startRuntimeServer({ repoRoot, preferredPort: 0, deliveryMode: 'runtime-dev' });
  try {
    const response = await fetch(`${runtime.origin}/api/project?set=DEMO`);
    assert.equal(response.status, 200);
    const project = await response.json();
    assert.equal(project.setCode, 'DEMO');
    assert.equal(project.setName, 'Demo Set');
    assert.equal(project.cards.length, 2);
    assert.equal(project.drafts.length, 2);
    assert.equal(project.cards[0].variants.length, 1);
    assert.ok(project.libraryAssets.some((asset) => asset.artId === 'ART-001'));
    assert.ok(project.frames.length > 0);
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

test('runtime service writes deck routes against fixture data', async () => {
  const repoRoot = await makeFixtureRepo();
  const runtime = await startRuntimeServer({ repoRoot, preferredPort: 0, deliveryMode: 'runtime-dev' });
  try {
    const created = await (await postJson(runtime.origin, '/api/create-deck', {
      name: 'Runtime API Deck',
      linkedUniverseId: 'demo',
      linkedSetCode: 'DEMO',
      tags: ['runtime-api']
    })).json();
    assert.equal(created.deck.metadata.name, 'Runtime API Deck');
    assert.ok(created.decks.some((summary) => summary.deckId === created.deck.metadata.deckId));

    const saved = await (await postJson(runtime.origin, '/api/save-deck', {
      metadata: { ...created.deck.metadata, name: 'Runtime API Deck Saved' },
      entries: created.deck.entries
    })).json();
    assert.equal(saved.deck.metadata.name, 'Runtime API Deck Saved');

    const exported = await (await postJson(runtime.origin, '/api/export-deck', {
      deckId: saved.deck.metadata.deckId,
      target: 'text'
    })).json();
    assert.equal(exported.mimeType, 'text/plain');
    assert.ok(exported.filename.endsWith('.txt'));

    const imported = await (await postJson(runtime.origin, '/api/import-deck', {
      deckId: 'runtime-imported-deck',
      name: 'Runtime Imported Deck',
      linkedUniverseId: 'demo',
      linkedSetCode: 'DEMO',
      sourceFormat: 'csv',
      content: 'count,section,set_code,card_id,name\n1,main,DEMO,card-001,Example Vanguard\n'
    })).json();
    assert.equal(imported.result.summary.importedEntries, 1);
    assert.equal(imported.result.deck.metadata.name, 'Runtime Imported Deck');
    assert.ok(imported.decks.some((summary) => summary.deckId === imported.result.deck.metadata.deckId));
  } finally {
    await runtime.close();
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test('runtime service writes collection routes against fixture data', async () => {
  const repoRoot = await makeFixtureRepo();
  const runtime = await startRuntimeServer({ repoRoot, preferredPort: 0, deliveryMode: 'runtime-dev' });
  try {
    const created = await (await postJson(runtime.origin, '/api/create-collection', {
      collectionId: 'runtime-api-binder',
      name: 'Runtime API Binder',
      linkedUniverseId: 'demo',
      kind: 'binder',
      purpose: 'owned',
      source: 'generic'
    })).json();
    assert.equal(created.collection.metadata.name, 'Runtime API Binder');
    assert.ok(created.collections.some((summary) => summary.collectionId === created.collection.metadata.collectionId));

    const saved = await (await postJson(runtime.origin, '/api/save-collection', {
      metadata: { ...created.collection.metadata, description: 'Saved through runtime.' },
      entries: created.collection.entries
    })).json();
    assert.equal(saved.collection.metadata.description, 'Saved through runtime.');

    const imported = await (await postJson(runtime.origin, '/api/import-collection', {
      collectionId: 'runtime-api-binder',
      name: 'Runtime API Binder',
      source: 'generic',
      contentFormat: 'csv',
      mode: 'replace',
      content: 'quantity,card_name,set_code,collector_number\n2,Example Vanguard,DEMO,001\n'
    })).json();
    assert.equal(imported.summary.importedRows, 1);
    assert.equal(imported.collection.entries[0].quantity, 2);
    assert.ok(imported.collections.some((summary) => summary.collectionId === imported.collection.metadata.collectionId));

    const exported = await (await postJson(runtime.origin, '/api/export-collection', {
      collectionId: imported.collection.metadata.collectionId,
      target: 'csv'
    })).json();
    assert.equal(exported.mimeType, 'text/csv');
    assert.ok(exported.filename.endsWith('.csv'));
    assert.match(exported.content, /Example Vanguard/);
  } finally {
    await runtime.close();
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test('runtime service refreshes and imports collection prices against fixture data', async () => {
  const repoRoot = await makeFixtureRepo();
  await writeOfficialCardFixture(repoRoot);
  const runtime = await startRuntimeServer({ repoRoot, preferredPort: 0, deliveryMode: 'runtime-dev' });
  try {
    const imported = await (await postJson(runtime.origin, '/api/import-collection', {
      collectionId: 'runtime-price-binder',
      name: 'Runtime Price Binder',
      source: 'generic',
      contentFormat: 'csv',
      mode: 'replace',
      content: `quantity,card_name,scryfall_id\n1,Runtime Bolt,${OFFICIAL_PRINT_ONE_ID}\n`
    })).json();
    assert.equal(imported.collection.entries[0].scryfallId, OFFICIAL_PRINT_ONE_ID);

    const refreshed = await (await postJson(runtime.origin, '/api/collection-prices/refresh', {
      collectionId: imported.collection.metadata.collectionId,
      updatedAt: '2026-06-08T12:00:00.000Z'
    })).json();
    assert.equal(refreshed.result.summary.updatedRows, 1);
    assert.equal(refreshed.result.collection.entries[0].estimatedMarketPrice, 0.1);
    assert.equal(refreshed.result.collection.entries[0].estimatedMarketCurrency, 'USD');

    const priceImport = await (await postJson(runtime.origin, '/api/collection-prices/import', {
      collectionId: imported.collection.metadata.collectionId,
      source: 'runtime_csv',
      updatedAt: '2026-06-08T13:00:00.000Z',
      content: 'card_name,price,currency\nRuntime Bolt,0.33,USD\n'
    })).json();
    assert.equal(priceImport.result.summary.updatedRows, 1);
    assert.equal(priceImport.result.collection.entries[0].estimatedMarketPrice, 0.33);
    assert.ok(priceImport.collections.some((summary) => summary.collectionId === imported.collection.metadata.collectionId));
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

    const variants = await (await fetch(`${runtime.origin}/api/official-cards/variants?oracleId=${OFFICIAL_ORACLE_ID}`)).json();
    assert.equal(variants.total, 2);
    assert.deepEqual(
      variants.cards.map((card) => card.id),
      [OFFICIAL_PRINT_TWO_ID, OFFICIAL_PRINT_ONE_ID]
    );
  } finally {
    await runtime.close();
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test('runtime service adds official cards to collections and decks', async () => {
  const repoRoot = await makeFixtureRepo();
  await writeOfficialCardFixture(repoRoot);
  const deck = await createDeck(repoRoot, {
    name: 'Official Route Deck',
    linkedUniverseId: 'demo',
    linkedSetCode: 'DEMO'
  });
  const runtime = await startRuntimeServer({ repoRoot, preferredPort: 0, deliveryMode: 'runtime-dev' });
  try {
    const collectionResult = await (await postJson(runtime.origin, '/api/official-cards/add-to-collection', {
      cardId: OFFICIAL_PRINT_ONE_ID,
      collectionId: 'official-route-binder',
      collectionName: 'Official Route Binder',
      linkedUniverseId: 'demo',
      quantity: 2,
      condition: 'NM',
      language: 'EN'
    })).json();
    assert.equal(collectionResult.collection.metadata.collectionId, 'official-route-binder');
    assert.equal(collectionResult.collection.entries[0].quantity, 2);
    assert.equal(collectionResult.collection.entries[0].cardName, 'Runtime Bolt');
    assert.ok(collectionResult.collections.some((summary) => summary.collectionId === 'official-route-binder'));

    const deckResult = await (await postJson(runtime.origin, '/api/official-cards/add-to-deck', {
      cardId: OFFICIAL_PRINT_ONE_ID,
      deckId: deck.metadata.deckId,
      section: 'main',
      quantity: 1,
      linkedUniverseId: 'demo'
    })).json();
    assert.equal(deckResult.deck.metadata.deckId, deck.metadata.deckId);
    assert.equal(deckResult.deck.entries.length, 1);
    assert.equal(deckResult.deck.entries[0].cardId, OFFICIAL_PRINT_ONE_ID);
    assert.ok(deckResult.decks.some((summary) => summary.deckId === deck.metadata.deckId));
  } finally {
    await runtime.close();
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test('runtime service serves local assets with path guards', async () => {
  const repoRoot = await makeFixtureRepo();
  await writeAssetFixture(repoRoot);
  const runtime = await startRuntimeServer({ repoRoot, preferredPort: 0, deliveryMode: 'runtime-dev' });
  try {
    const manaSymbol = await fetch(`${runtime.origin}/api/mana-symbol?symbol=%7BW%7D`);
    assert.equal(manaSymbol.status, 200);
    assert.equal(manaSymbol.headers.get('content-type'), 'image/png');
    assert.deepEqual([...new Uint8Array(await manaSymbol.arrayBuffer())], [0x89, 0x50, 0x4e, 0x47]);

    const asset = await fetch(`${runtime.origin}/api/asset?path=${encodeURIComponent('sets/DEMO/art/runtime-art.png')}`);
    assert.equal(asset.status, 200);
    assert.equal(asset.headers.get('content-type'), 'image/png');
    assert.deepEqual([...new Uint8Array(await asset.arrayBuffer())], [0x72, 0x75, 0x6e]);

    const missingPath = await fetch(`${runtime.origin}/api/asset`);
    assert.equal(missingPath.status, 400);

    const traversal = await fetch(`${runtime.origin}/api/asset?path=${encodeURIComponent('../outside.png')}`);
    assert.equal(traversal.status, 403);
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

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import { parseCsvRecords } from '../src/data/csv.js';
import {
  exportCollectionCockatrice,
  exportCollectionCsv,
  exportCollectionPlainText,
  addOfficialCardToCollection,
  createCollection,
  importCollectionCsv,
  importCollectionPriceCsv,
  listCollections,
  readCollectionState,
  refreshCollectionMarketPrices,
  saveCollection
} from '../src/collections/collectionStore.js';
import { writeOfficialCardCacheForTest } from '../src/officialCards/officialCardStore.js';
import type { OfficialCardPrint } from '../src/officialCards/officialCardModel.js';

describe('Collection scanner import and export', () => {
  it('creates an empty project-linked collection with game and purpose metadata', async () => {
    const rootDir = await createFixtureRoot();
    const created = await createCollection(rootDir, {
      name: 'Demo Inspiration',
      linkedUniverseId: 'demo',
      gameId: 'mtg',
      purpose: 'inspiration',
      source: 'generic'
    });
    const metadata = JSON.parse(await readFile(join(rootDir, 'collections', created.metadata.collectionId, 'metadata.json'), 'utf8')) as Record<string, string>;

    assert.equal(created.metadata.collectionId, 'demo-inspiration');
    assert.equal(created.metadata.linkedUniverseId, 'demo');
    assert.equal(created.metadata.gameId, 'mtg');
    assert.equal(created.metadata.purpose, 'inspiration');
    assert.equal(created.entries.length, 0);
    assert.equal(metadata.purpose, 'inspiration');
  });

  it('creates starter lists for wishlist, recommendations, starred, flagged, and gifts', async () => {
    const rootDir = await createFixtureRoot();
    const summaries = await listCollections(rootDir);
    const summariesById = new Map(summaries.map((summary) => [summary.collectionId, summary]));

    assert.equal(summariesById.get('wish-list')?.kind, 'list');
    assert.equal(summariesById.get('wish-list')?.listCategory, 'wishlist');
    assert.equal(summariesById.get('wish-list')?.defaultOwnershipStatus, 'wanted');
    assert.equal(summariesById.get('recommendations')?.listCategory, 'recommendation');
    assert.equal(summariesById.get('starred')?.defaultStarred, true);
    assert.equal(summariesById.get('flagged')?.defaultFlagged, true);
    assert.equal(summariesById.get('gift-list')?.listCategory, 'gift');
    assert.deepEqual(summariesById.get('wish-list')?.ownerNames, ['Kyle']);
  });

  it('applies list defaults to imported rows', async () => {
    const rootDir = await createFixtureRoot();
    const result = await importCollectionCsv(rootDir, {
      collectionId: 'upgrade-wishlist',
      name: 'Upgrade Wishlist',
      source: 'generic',
      mode: 'replace',
      kind: 'list',
      listCategory: 'wishlist',
      defaultEntryTags: ['commander-upgrade'],
      defaultStarred: true,
      content: ['Count,Product Name,Owner', '1,Ancient Tomb,Alex'].join('\n'),
      dryRun: false
    });
    const collection = await readCollectionState(rootDir, 'upgrade-wishlist');
    const csv = await exportCollectionCsv(rootDir, 'upgrade-wishlist');
    const rows = parseCsvRecords(csv.content);

    assert.equal(result.collection.metadata.kind, 'list');
    assert.equal(collection.metadata.listCategory, 'wishlist');
    assert.equal(collection.entries[0]?.ownershipStatus, 'wanted');
    assert.equal(collection.entries[0]?.ownerName, 'Alex');
    assert.equal(collection.entries[0]?.starred, true);
    assert.deepEqual(collection.entries[0]?.tags, ['commander-upgrade', 'wishlist']);
    assert.equal(rows[0]?.ownership_status, 'wanted');
    assert.equal(rows[0]?.owner_name, 'Alex');
  });

  it('adds official prints to default lists with list ownership defaults', async () => {
    const rootDir = await createFixtureRoot();
    await writeOfficialCardCacheForTest(rootDir, {
      syncedAt: '2026-06-07T12:00:00.000Z',
      prints: [
        officialPrint({
          id: '22222222-2222-4222-8222-222222222222',
          name: 'Command Tower',
          setCode: 'CMM',
          setName: 'Commander Masters',
          collectorNumber: '1018',
          prices: { usd: '0.40' }
        })
      ]
    });

    const collection = await addOfficialCardToCollection(rootDir, {
      cardId: '22222222-2222-4222-8222-222222222222',
      collectionId: 'wish-list',
      quantity: 1
    });

    assert.equal(collection.metadata.kind, 'list');
    assert.equal(collection.metadata.listCategory, 'wishlist');
    assert.equal(collection.entries[0]?.ownershipStatus, 'wanted');
    assert.equal(collection.entries[0]?.ownerName, 'Kyle');
    assert.deepEqual(collection.entries[0]?.tags, ['wishlist']);
  });

  it('imports ManaBox-style CSV rows and writes collection files', async () => {
    const rootDir = await createFixtureRoot();
    const result = await importCollectionCsv(rootDir, {
      collectionId: 'house-binder',
      name: 'House Binder',
      linkedUniverseId: 'demo',
      gameId: 'mtg',
      purpose: 'owned',
      source: 'manabox',
      mode: 'replace',
      content: manaboxCsv(),
      dryRun: false
    });

    const collection = await readCollectionState(rootDir, 'house-binder');
    const entriesCsv = await readFile(join(rootDir, 'collections', 'house-binder', 'entries.csv'), 'utf8');

    assert.equal(result.summary.importedRows, 2);
    assert.equal(result.summary.scryfallIdMatches, 1);
    assert.equal(result.summary.setNumberMatches, 1);
    assert.equal(result.summary.reviewRows, 0);
    assert.equal(collection.entries.length, 2);
    assert.equal(collection.metadata.linkedUniverseId, 'demo');
    assert.equal(collection.metadata.gameId, 'mtg');
    assert.equal(collection.metadata.purpose, 'owned');
    assert.equal(collection.entries[0]?.quantity, 2);
    assert.equal(collection.entries[0]?.ownerName, 'Kyle');
    assert.equal(collection.entries[0]?.finish, 'nonfoil');
    assert.match(entriesCsv, /collection_id,entry_id,quantity,ownership_status,owner_name,card_name,set_code/);
    assert.match(entriesCsv, /Sol Ring/);
  });

  it('dry-runs without writing collection files', async () => {
    const rootDir = await createFixtureRoot();
    const result = await importCollectionCsv(rootDir, {
      collectionId: 'dry-run-binder',
      source: 'manabox',
      mode: 'replace',
      content: manaboxCsv(),
      dryRun: true
    });

    await assert.rejects(() => stat(join(rootDir, 'collections', 'dry-run-binder', 'entries.csv')));
    assert.equal(result.summary.dryRun, true);
    assert.equal(result.summary.importedRows, 2);
  });

  it('loads old metadata without project, game, or purpose fields', async () => {
    const rootDir = await createFixtureRoot();
    await importCollectionCsv(rootDir, {
      collectionId: 'legacy-binder',
      name: 'Legacy Binder',
      source: 'generic',
      mode: 'replace',
      content: ['Count,Product Name', '1,Legacy Card'].join('\n'),
      dryRun: false
    });
    const metadataPath = join(rootDir, 'collections', 'legacy-binder', 'metadata.json');
    await writeFile(
      metadataPath,
      `${JSON.stringify(
        {
          collectionId: 'legacy-binder',
          name: 'Legacy Binder',
          source: 'generic'
        },
        null,
        2
      )}\n`,
      'utf8'
    );

    const collection = await readCollectionState(rootDir, 'legacy-binder');

    assert.equal(collection.metadata.gameId, 'mtg');
    assert.equal(collection.metadata.purpose, 'mixed');
    assert.equal(collection.metadata.kind, 'binder');
    assert.deepEqual(collection.metadata.tags, []);
    assert.deepEqual(collection.metadata.linkedSetCodes, []);
    assert.equal(collection.metadata.linkedUniverseId, undefined);
  });

  it('loads legacy collection rows with default preview fields', async () => {
    const rootDir = await createFixtureRoot();
    await importCollectionCsv(rootDir, {
      collectionId: 'legacy-preview-fields',
      name: 'Legacy Preview Fields',
      source: 'generic',
      mode: 'replace',
      content: ['Count,Product Name,Set Code,Collector Number', '1,Legacy Card,DEM,001'].join('\n'),
      dryRun: false
    });

    const collection = await readCollectionState(rootDir, 'legacy-preview-fields');

    assert.equal(collection.entries[0]?.previewArtSource, 'auto');
    assert.equal(collection.entries[0]?.ownerName, 'Kyle');
    assert.equal(collection.entries[0]?.linkedSetCode, undefined);
    assert.equal(collection.entries[0]?.linkedCardId, undefined);
    assert.equal(collection.entries[0]?.linkedVariantId, undefined);
    assert.deepEqual(collection.entries[0]?.tags, []);
    assert.equal(collection.entries[0]?.starred, false);
    assert.equal(collection.entries[0]?.flagged, false);
    assert.equal(collection.entries[0]?.markedForDeletion, false);
  });

  it('saves collection metadata and editable row preview fields', async () => {
    const rootDir = await createFixtureRoot();
    await importCollectionCsv(rootDir, {
      collectionId: 'save-binder',
      name: 'Save Binder',
      source: 'manabox',
      mode: 'replace',
      content: manaboxCsv(),
      dryRun: false
    });
    const collection = await readCollectionState(rootDir, 'save-binder');
    const saved = await saveCollection(rootDir, {
      metadata: {
        ...collection.metadata,
        name: 'Saved Binder',
        purpose: 'owned',
        description: 'Edited through the workspace.',
        kind: 'binder',
        tags: ['commander', 'trade'],
        accentColor: '#7c3aed',
        coverImageRef: 'assets/covers/house-binder.png',
        linkedSetCodes: ['DEMO', 'SQM'],
        acquisitionNotes: 'Bought as a binder.',
        purchaseTotal: 120,
        purchaseCurrency: 'USD',
        purchaseDate: '2026-06-07'
      },
      entries: collection.entries.map((entry, index) =>
        index === 0
          ? {
              ...entry,
              quantity: 4,
              ownerName: 'Eleni',
              condition: 'Played',
              language: 'Japanese',
              location: 'Binder 2',
              reviewStatus: 'needs_review',
              reviewNotes: 'Verify signed copy.',
              linkedSetCode: 'DEMO',
              linkedCardId: 'demo-sol-ring',
              linkedVariantId: 'demo-sol-ring-V2',
              previewArtSource: 'local',
              purchasePrice: 4.25,
              purchaseCurrency: 'USD',
              purchaseDate: '2026-06-07',
              estimatedMarketPrice: 5.5,
              estimatedMarketCurrency: 'USD',
              marketPriceSource: 'scryfall',
              marketPriceUpdatedAt: '2026-06-07T12:00:00.000Z',
              tags: ['commander', 'artifact'],
              notes: 'Signed copy is in the front page.',
              starred: true,
              flagged: true,
              altered: true,
              misprint: true,
              proxy: true,
              homebrew: true,
              markedForDeletion: true
            }
          : entry
      )
    });
    const csv = await exportCollectionCsv(rootDir, 'save-binder');
    const rows = parseCsvRecords(csv.content);

    assert.equal(saved.metadata.name, 'Saved Binder');
    assert.equal(saved.metadata.kind, 'binder');
    assert.deepEqual(saved.metadata.tags, ['commander', 'trade']);
    assert.equal(saved.metadata.accentColor, '#7c3aed');
    assert.equal(saved.metadata.coverImageRef, 'assets/covers/house-binder.png');
    assert.deepEqual(saved.metadata.linkedSetCodes, ['DEMO', 'SQM']);
    assert.equal(saved.metadata.acquisitionNotes, 'Bought as a binder.');
    assert.equal(saved.metadata.purchaseTotal, 120);
    assert.equal(saved.metadata.purchaseCurrency, 'USD');
    assert.equal(saved.metadata.purchaseDate, '2026-06-07');
    assert.equal(saved.entries[0]?.quantity, 4);
    assert.equal(saved.entries[0]?.ownerName, 'Eleni');
    assert.equal(saved.entries[0]?.condition, 'Played');
    assert.equal(saved.entries[0]?.language, 'Japanese');
    assert.equal(saved.entries[0]?.location, 'Binder 2');
    assert.equal(saved.entries[0]?.reviewStatus, 'needs_review');
    assert.equal(saved.entries[0]?.linkedSetCode, 'DEMO');
    assert.equal(saved.entries[0]?.linkedCardId, 'demo-sol-ring');
    assert.equal(saved.entries[0]?.linkedVariantId, 'demo-sol-ring-V2');
    assert.equal(saved.entries[0]?.previewArtSource, 'local');
    assert.equal(saved.entries[0]?.purchasePrice, 4.25);
    assert.equal(saved.entries[0]?.estimatedMarketPrice, 5.5);
    assert.equal(saved.entries[0]?.marketPriceSource, 'scryfall');
    assert.deepEqual(saved.entries[0]?.tags, ['commander', 'artifact']);
    assert.equal(saved.entries[0]?.notes, 'Signed copy is in the front page.');
    assert.equal(saved.entries[0]?.starred, true);
    assert.equal(saved.entries[0]?.flagged, true);
    assert.equal(saved.entries[0]?.altered, true);
    assert.equal(saved.entries[0]?.misprint, true);
    assert.equal(saved.entries[0]?.proxy, true);
    assert.equal(saved.entries[0]?.homebrew, true);
    assert.equal(saved.entries[0]?.markedForDeletion, true);
    assert.equal(rows[0]?.linked_set_code, 'DEMO');
    assert.equal(rows[0]?.owner_name, 'Eleni');
    assert.equal(rows[0]?.linked_card_id, 'demo-sol-ring');
    assert.equal(rows[0]?.linked_variant_id, 'demo-sol-ring-V2');
    assert.equal(rows[0]?.preview_art_source, 'local');
    assert.equal(rows[0]?.purchase_price, '4.25');
    assert.equal(rows[0]?.estimated_market_price, '5.5');
    assert.equal(rows[0]?.tags, 'commander;artifact');
    assert.equal(rows[0]?.starred, 'true');
    assert.equal(rows[0]?.marked_for_deletion, 'true');
  });

  it('refreshes collection market prices from the local official card cache', async () => {
    const rootDir = await createFixtureRoot();
    await writeOfficialCardCacheForTest(rootDir, {
      syncedAt: '2026-06-07T12:00:00.000Z',
      prints: [
        officialPrint({
          id: '0f57f2f4-c8d7-4fbc-8d70-f5d4bd8d0590',
          name: 'Sol Ring',
          setCode: 'CMM',
          collectorNumber: '703',
          prices: { usd: '1.25', usdFoil: '2.5' }
        }),
        officialPrint({
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Lightning Bolt',
          setCode: 'CLU',
          collectorNumber: '141',
          prices: { usd: '0.35', usdFoil: '1.1' }
        })
      ]
    });
    await importCollectionCsv(rootDir, {
      collectionId: 'price-refresh',
      name: 'Price Refresh',
      source: 'manabox',
      mode: 'replace',
      content: manaboxCsv(),
      dryRun: false
    });

    const result = await refreshCollectionMarketPrices(rootDir, {
      collectionId: 'price-refresh',
      updatedAt: '2026-06-07T18:00:00.000Z'
    });
    const collection = await readCollectionState(rootDir, 'price-refresh');

    assert.equal(result.summary.checkedRows, 2);
    assert.equal(result.summary.updatedRows, 2);
    assert.equal(result.summary.matchedByScryfallId, 1);
    assert.equal(result.summary.matchedByPrint, 1);
    assert.equal(collection.entries[0]?.estimatedMarketPrice, 1.25);
    assert.equal(collection.entries[0]?.estimatedMarketCurrency, 'USD');
    assert.equal(collection.entries[0]?.marketPriceSource, 'scryfall');
    assert.equal(collection.entries[1]?.estimatedMarketPrice, 1.1);
    assert.equal(collection.entries[1]?.marketPriceUpdatedAt, '2026-06-07T18:00:00.000Z');
  });

  it('imports provider price snapshots into existing collection rows', async () => {
    const rootDir = await createFixtureRoot();
    await importCollectionCsv(rootDir, {
      collectionId: 'tcg-prices',
      name: 'TCG Prices',
      source: 'manabox',
      mode: 'replace',
      content: manaboxCsv(),
      dryRun: false
    });

    const result = await importCollectionPriceCsv(rootDir, {
      collectionId: 'tcg-prices',
      source: 'tcgplayer',
      updatedAt: '2026-06-07T19:00:00.000Z',
      content: [
        'Name,Set Code,Collector Number,Finish,TCG Market Price,Currency,Price Date',
        'Sol Ring,CMM,703,Nonfoil,1.40,USD,2026-06-07T19:00:00.000Z',
        'Lightning Bolt,CLU,141,Foil,2.25,USD,2026-06-07T19:00:00.000Z'
      ].join('\n')
    });
    const collection = await readCollectionState(rootDir, 'tcg-prices');

    assert.equal(result.summary.updatedRows, 2);
    assert.equal(result.summary.matchedByPrint, 2);
    assert.equal(collection.entries[0]?.estimatedMarketPrice, 1.4);
    assert.equal(collection.entries[0]?.marketPriceSource, 'tcgplayer');
    assert.equal(collection.entries[1]?.estimatedMarketPrice, 2.25);
    assert.match(collection.entries[1]?.sourceRow ?? '', /priceImport/);
  });

  it('preserves unresolved generic scanner rows for review', async () => {
    const rootDir = await createFixtureRoot();
    await importCollectionCsv(rootDir, {
      collectionId: 'review-stack',
      source: 'generic',
      mode: 'replace',
      content: ['Count,Product Name,Condition', '1,Mystery Booster Test Card,Near Mint'].join('\n'),
      dryRun: false
    });

    const collection = await readCollectionState(rootDir, 'review-stack');
    const csv = await exportCollectionCsv(rootDir, 'review-stack');
    const rows = parseCsvRecords(csv.content);

    assert.equal(collection.entries[0]?.reviewStatus, 'needs_review');
    assert.equal(collection.entries[0]?.matchStrategy, 'unresolved');
    assert.match(collection.entries[0]?.reviewNotes ?? '', /Missing set code/);
    assert.equal(rows[0]?.review_status, 'needs_review');
    assert.equal(rows[0]?.card_name, 'Mystery Booster Test Card');
  });

  it('keeps invalid Scryfall ids in review instead of treating them as matches', async () => {
    const rootDir = await createFixtureRoot();
    const result = await importCollectionCsv(rootDir, {
      collectionId: 'bad-scryfall',
      source: 'manabox',
      mode: 'replace',
      content: ['Quantity,Name,Scryfall ID', '1,Mystery Card,Foil'].join('\n'),
      dryRun: false
    });
    const collection = await readCollectionState(rootDir, 'bad-scryfall');

    assert.equal(result.summary.scryfallIdMatches, 0);
    assert.equal(result.summary.reviewRows, 1);
    assert.match(result.summary.warnings[0] ?? '', /invalid Scryfall id/);
    assert.equal(collection.entries[0]?.reviewStatus, 'needs_review');
  });

  it('exports collection CSV, text, and Cockatrice list formats', async () => {
    const rootDir = await createFixtureRoot();
    await importCollectionCsv(rootDir, {
      collectionId: 'exports',
      name: 'Exports',
      source: 'manabox',
      mode: 'replace',
      content: manaboxCsv(),
      dryRun: false
    });

    const csv = await exportCollectionCsv(rootDir, 'exports');
    const text = await exportCollectionPlainText(rootDir, 'exports');
    const cockatrice = await exportCollectionCockatrice(rootDir, 'exports');
    const parsed = new XMLParser({ ignoreAttributes: false }).parse(cockatrice.content);
    const cards = Array.isArray(parsed.cockatrice_deck.zone[0].card) ? parsed.cockatrice_deck.zone[0].card : [parsed.cockatrice_deck.zone[0].card];

    assert.equal(csv.filename, 'exports.csv');
    assert.match(csv.content, /Lightning Bolt/);
    assert.equal(text.filename, 'exports.txt');
    assert.match(text.content, /2 Sol Ring \(CMM 703\)/);
    assert.equal(cockatrice.filename, 'exports.cod');
    assert.equal(parsed.cockatrice_deck.deckname, 'Exports');
    assert.equal(cards[0]['@_number'], '2');
    assert.equal(cards[0]['@_name'], 'Sol Ring');
  });

  it('imports plain text collection lists through the generic review model', async () => {
    const rootDir = await createFixtureRoot();
    const result = await importCollectionCsv(rootDir, {
      collectionId: 'text-list',
      name: 'Text List',
      source: 'generic',
      contentFormat: 'text',
      mode: 'replace',
      content: ['# Binder', '2 Sol Ring [CMM] 703', '1 Mystery Card'].join('\n'),
      dryRun: false
    });
    const collection = await readCollectionState(rootDir, 'text-list');

    assert.equal(result.summary.importedRows, 2);
    assert.equal(result.summary.setNumberMatches, 1);
    assert.equal(result.summary.reviewRows, 1);
    assert.equal(collection.entries[0]?.cardName, 'Sol Ring');
    assert.equal(collection.entries[0]?.collectorNumber, '703');
    assert.equal(collection.entries[1]?.reviewStatus, 'needs_review');
  });

  it('imports Cockatrice collection XML without dropping rows', async () => {
    const rootDir = await createFixtureRoot();
    const result = await importCollectionCsv(rootDir, {
      collectionId: 'cod-list',
      name: 'COD List',
      source: 'generic',
      contentFormat: 'cockatrice',
      mode: 'replace',
      content: [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<cockatrice_deck version="1">',
        '  <deckname>COD List</deckname>',
        '  <zone name="main">',
        '    <card number="3" name="Lightning Bolt"/>',
        '  </zone>',
        '</cockatrice_deck>'
      ].join('\n'),
      dryRun: false
    });
    const collection = await readCollectionState(rootDir, 'cod-list');

    assert.equal(result.summary.importedRows, 1);
    assert.equal(collection.entries[0]?.quantity, 3);
    assert.equal(collection.entries[0]?.cardName, 'Lightning Bolt');
    assert.equal(collection.entries[0]?.reviewStatus, 'needs_review');
  });
});

async function createFixtureRoot(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'homebrew-forge-collections-'));
}

function manaboxCsv(): string {
  return [
    'Quantity,Name,Set Code,Set Name,Collector Number,Scryfall ID,Foil,Condition,Language',
    '2,Sol Ring,CMM,Commander Masters,703,0f57f2f4-c8d7-4fbc-8d70-f5d4bd8d0590,Normal,Near Mint,English',
    '1,Lightning Bolt,CLU,Ravnica Clue Edition,141,,Foil,Lightly Played,English'
  ].join('\n');
}

function officialPrint(overrides: Partial<OfficialCardPrint> & Pick<OfficialCardPrint, 'id' | 'name'>): OfficialCardPrint {
  return {
    id: overrides.id,
    name: overrides.name,
    view: 'prints',
    colors: [],
    colorIdentity: [],
    finishes: [],
    ...overrides
  };
}

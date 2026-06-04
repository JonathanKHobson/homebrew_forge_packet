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
  createCollection,
  importCollectionCsv,
  readCollectionState
} from '../src/collections/collectionStore.js';

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
    assert.equal(collection.entries[0]?.finish, 'nonfoil');
    assert.match(entriesCsv, /collection_id,entry_id,quantity,card_name,set_code/);
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
    assert.equal(collection.metadata.linkedUniverseId, undefined);
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

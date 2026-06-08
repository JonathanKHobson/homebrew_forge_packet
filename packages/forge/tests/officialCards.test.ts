import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { addOfficialCardToCollection, readCollectionState } from '../src/collections/collectionStore.js';
import { addOfficialCardToDeck, createDeck } from '../src/decks/deckStore.js';
import { listOfficialCardPrintVariants, searchOfficialCards, syncOfficialCards, writeOfficialCardCacheForTest } from '../src/officialCards/officialCardStore.js';
import type { OfficialCardOracle, OfficialCardPrint } from '../src/officialCards/officialCardModel.js';

describe('Official card catalog', () => {
  it('searches cached print rows by name, set, collector number, and rules text', async () => {
    const rootDir = await createFixtureRoot();
    await writeOfficialCardCacheForTest(rootDir, {
      prints: [
        officialPrint({
          id: '11111111-1111-1111-1111-111111111111',
          name: 'Sol Ring',
          typeLine: 'Artifact',
          oracleText: '{T}: Add {C}{C}.',
          setCode: 'WHO',
          setName: 'Doctor Who',
          collectorNumber: '245'
        }),
        officialPrint({
          id: '22222222-2222-2222-2222-222222222222',
          name: 'Arcane Signet',
          typeLine: 'Artifact',
          oracleText: '{T}: Add one mana of any color in your commander identity.',
          setCode: 'CMM',
          setName: 'Commander Masters',
          collectorNumber: '368'
        })
      ]
    });

    const byName = await searchOfficialCards(rootDir, { view: 'prints', query: 'sol ring', limit: 10 });
    const bySetNumber = await searchOfficialCards(rootDir, { view: 'prints', query: 'who 245', limit: 10 });
    const byRules = await searchOfficialCards(rootDir, { view: 'prints', query: 'commander identity', limit: 10 });

    assert.equal(byName.total, 1);
    assert.equal(byName.cards[0]?.name, 'Sol Ring');
    assert.equal(bySetNumber.cards[0]?.id, '11111111-1111-1111-1111-111111111111');
    assert.equal(byRules.cards[0]?.name, 'Arcane Signet');
  });

  it('keeps oracle and print views separate', async () => {
    const rootDir = await createFixtureRoot();
    await writeOfficialCardCacheForTest(rootDir, {
      prints: [officialPrint({ id: '33333333-3333-3333-3333-333333333333', name: 'Lightning Bolt', setCode: 'SLD', collectorNumber: '123' })],
      oracle: [officialOracle({ id: '44444444-4444-4444-4444-444444444444', name: 'Lightning Bolt' })]
    });

    const prints = await searchOfficialCards(rootDir, { view: 'prints', query: 'lightning bolt' });
    const oracle = await searchOfficialCards(rootDir, { view: 'oracle', query: 'lightning bolt' });

    assert.equal(prints.cards[0]?.view, 'prints');
    assert.equal(oracle.cards[0]?.view, 'oracle');
    assert.equal(prints.cards[0]?.id, '33333333-3333-3333-3333-333333333333');
    assert.equal(oracle.cards[0]?.id, '44444444-4444-4444-4444-444444444444');
  });

  it('collapses reprints into unique mechanical card rows with variant counts', async () => {
    const rootDir = await createFixtureRoot();
    await writeOfficialCardCacheForTest(rootDir, {
      prints: [
        officialPrint({
          id: '10101010-1010-4010-8010-101010101010',
          oracleId: 'sol-ring-oracle',
          name: 'Sol Ring',
          setCode: 'LEA',
          collectorNumber: '269',
          releasedAt: '1993-08-05'
        }),
        officialPrint({
          id: '20202020-2020-4020-8020-202020202020',
          oracleId: 'sol-ring-oracle',
          name: 'Sol Ring',
          setCode: 'LCC',
          collectorNumber: '310',
          releasedAt: '2023-11-17',
          imageUris: { normal: 'https://img.example/sol-ring-new.jpg' }
        }),
        officialPrint({
          id: '30303030-3030-4030-8030-303030303030',
          oracleId: 'forest-oracle',
          name: 'Forest',
          typeLine: 'Basic Land - Forest',
          setCode: 'LTR',
          collectorNumber: '271',
          releasedAt: '2023-06-23'
        }),
        officialPrint({
          id: '40404040-4040-4040-8040-404040404040',
          oracleId: 'forest-oracle',
          name: 'Forest',
          typeLine: 'Basic Land - Forest',
          setCode: 'WHO',
          collectorNumber: '199',
          releasedAt: '2023-10-13'
        }),
        officialPrint({
          id: '45454545-4545-4045-8045-454545454545',
          oracleId: 'ring-story-oracle',
          name: 'Ring Story',
          oracleText: 'Search your library for a card named Sol Ring.',
          setCode: 'TST',
          collectorNumber: '99',
          releasedAt: '2026-01-01'
        })
      ]
    });

    const solRing = await searchOfficialCards(rootDir, { view: 'unique', query: 'sol ring', limit: 10 });
    const forest = await searchOfficialCards(rootDir, { view: 'unique', query: 'forest', limit: 10 });

    assert.equal(solRing.total, 1);
    assert.equal(solRing.cards[0]?.id, '20202020-2020-4020-8020-202020202020');
    assert.equal(solRing.cards[0]?.variantCount, 2);
    assert.equal(solRing.cards[0]?.filteredVariantCount, 2);
    assert.equal(forest.total, 1);
    assert.equal(forest.cards[0]?.name, 'Forest');
    assert.equal(forest.cards[0]?.variantCount, 2);
  });

  it('lists exact print variants for a unique official card', async () => {
    const rootDir = await createFixtureRoot();
    await writeOfficialCardCacheForTest(rootDir, {
      prints: [
        officialPrint({
          id: '50505050-5050-4050-8050-505050505050',
          oracleId: 'bolt-oracle',
          name: 'Lightning Bolt',
          setCode: 'LEA',
          collectorNumber: '161',
          releasedAt: '1993-08-05'
        }),
        officialPrint({
          id: '60606060-6060-4060-8060-606060606060',
          oracleId: 'bolt-oracle',
          name: 'Lightning Bolt',
          setCode: 'STA',
          collectorNumber: '42',
          releasedAt: '2021-04-23',
          lang: 'ja'
        }),
        officialPrint({
          id: '70707070-7070-4070-8070-707070707070',
          oracleId: 'bolt-oracle',
          name: 'Lightning Bolt',
          setCode: 'SLD',
          collectorNumber: '675',
          releasedAt: '2024-02-01'
        })
      ]
    });

    const variants = await listOfficialCardPrintVariants(rootDir, {
      cardId: '50505050-5050-4050-8050-505050505050',
      limit: 2,
      offset: 0
    });
    const secondPage = await listOfficialCardPrintVariants(rootDir, {
      oracleId: 'bolt-oracle',
      limit: 2,
      offset: 2
    });
    const filtered = await listOfficialCardPrintVariants(rootDir, {
      oracleId: 'bolt-oracle',
      query: 'sld 675',
      limit: 10
    });

    assert.equal(variants.total, 3);
    assert.equal(variants.cards[0]?.id, '70707070-7070-4070-8070-707070707070');
    assert.equal(variants.cards[0]?.variantCount, 3);
    assert.equal(secondPage.cards.length, 1);
    assert.equal(secondPage.cards[0]?.id, '60606060-6060-4060-8060-606060606060');
    assert.equal(filtered.total, 1);
    assert.equal(filtered.cards[0]?.id, '70707070-7070-4070-8070-707070707070');
  });

  it('ranks exact official card names before broad rules-text matches', async () => {
    const rootDir = await createFixtureRoot();
    await writeOfficialCardCacheForTest(rootDir, {
      prints: [
        officialPrint({
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          name: 'Faramir, Field Commander',
          oracleText: 'Whenever one or more Soldiers and the Ring tempt you, draw a card.'
        }),
        officialPrint({
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          name: 'Sol Ring',
          typeLine: 'Artifact',
          oracleText: '{T}: Add {C}{C}.'
        })
      ]
    });

    const result = await searchOfficialCards(rootDir, { view: 'prints', query: 'sol ring', limit: 10 });

    assert.equal(result.total, 2);
    assert.equal(result.cards[0]?.name, 'Sol Ring');
  });

  it('ranks whole-card exact names before matching split-card face names', async () => {
    const rootDir = await createFixtureRoot();
    await writeOfficialCardCacheForTest(rootDir, {
      oracle: [
        officialOracle({
          id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          name: 'Emeritus of Conflict // Lightning Bolt',
          cardFaces: [{ name: 'Lightning Bolt', typeLine: 'Instant', oracleText: 'Lightning Bolt deals 3 damage to any target.' }]
        }),
        officialOracle({
          id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
          name: 'Lightning Bolt',
          typeLine: 'Instant',
          oracleText: 'Lightning Bolt deals 3 damage to any target.'
        })
      ]
    });

    const result = await searchOfficialCards(rootDir, { view: 'oracle', query: 'lightning bolt', limit: 10 });

    assert.equal(result.total, 2);
    assert.equal(result.cards[0]?.name, 'Lightning Bolt');
  });

  it('filters cached cards with local Scryfall-like tokens and reports unsupported tokens', async () => {
    const rootDir = await createFixtureRoot();
    await writeOfficialCardCacheForTest(rootDir, {
      prints: [
        officialPrint({
          id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
          name: 'Verdant Growth',
          manaCost: '{2}{G}',
          manaValue: 3,
          typeLine: 'Enchantment',
          oracleText: 'Whenever a land enters, draw a card.',
          colorIdentity: ['G'],
          setCode: 'TST',
          rarity: 'rare',
          releasedAt: '2024-05-01',
          finishes: ['nonfoil', 'foil'],
          prices: { usd: '3.25' }
        }),
        officialPrint({
          id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
          name: 'Verdant Token',
          manaValue: 0,
          typeLine: 'Token Creature - Plant',
          oracleText: 'A token fixture.',
          colorIdentity: ['G'],
          layout: 'token',
          setCode: 'TST',
          rarity: 'common',
          releasedAt: '2024-05-01',
          finishes: ['nonfoil'],
          prices: { usd: '0.10' }
        })
      ]
    });

    const result = await searchOfficialCards(rootDir, {
      view: 'prints',
      query: 'name:Verdant o:draw mv>=3 usd<5 madeup:ignored -is:token',
      limit: 10
    });

    assert.equal(result.total, 1);
    assert.equal(result.cards[0]?.name, 'Verdant Growth');
    assert.deepEqual(result.unsupportedQueryTerms, ['madeup:ignored']);
  });

  it('sorts the full filtered result before pagination', async () => {
    const rootDir = await createFixtureRoot();
    await writeOfficialCardCacheForTest(rootDir, {
      prints: [
        officialPrint({ id: '11111111-aaaa-4aaa-8aaa-111111111111', name: 'High Price', prices: { usd: '9.00' } }),
        officialPrint({ id: '22222222-aaaa-4aaa-8aaa-222222222222', name: 'Low Price', prices: { usd: '1.00' } }),
        officialPrint({ id: '33333333-aaaa-4aaa-8aaa-333333333333', name: 'Mid Price', prices: { usd: '5.00' } })
      ]
    });

    const firstPage = await searchOfficialCards(rootDir, { view: 'prints', sort: 'price', sortDirection: 'asc', limit: 1, offset: 0 });
    const secondPage = await searchOfficialCards(rootDir, { view: 'prints', sort: 'price', sortDirection: 'asc', limit: 1, offset: 1 });

    assert.equal(firstPage.cards[0]?.name, 'Low Price');
    assert.equal(secondPage.cards[0]?.name, 'Mid Price');
  });

  it('syncs official cards by stream-parsing Scryfall bulk downloads', async () => {
    const rootDir = await createFixtureRoot();
    const calls: string[] = [];
    const fetchImpl = async (input: string | URL | Request) => {
      const url = String(input);
      calls.push(url);
      if (url.endsWith('/bulk-data')) {
        return jsonResponse({
          object: 'list',
          data: [
            { type: 'default_cards', name: 'Default Cards', updated_at: '2026-01-01T00:00:00.000Z', download_uri: 'https://example.test/default-cards.json' },
            { type: 'oracle_cards', name: 'Oracle Cards', updated_at: '2026-01-02T00:00:00.000Z', download_uri: 'https://example.test/oracle-cards.json' }
          ]
        });
      }
      if (url === 'https://example.test/default-cards.json') {
        return streamJsonResponse([
          scryfallCard({ id: '77777777-7777-4777-8777-777777777777', name: 'Streamed Print One', set: 'AAA', collector_number: '1' }),
          scryfallCard({ id: '88888888-8888-4888-8888-888888888888', name: 'Streamed Print Two', set: 'BBB', collector_number: '2' })
        ]);
      }
      if (url === 'https://example.test/oracle-cards.json') {
        return streamJsonResponse([
          scryfallCard({ id: '99999999-9999-4999-8999-999999999999', name: 'Streamed Oracle Card', prints_search_uri: 'https://example.test/prints' })
        ]);
      }
      throw new Error(`Unexpected fetch: ${url}`);
    };

    const status = await syncOfficialCards(rootDir, { view: 'both', fetchImpl: fetchImpl as typeof fetch, syncedAt: '2026-01-03T00:00:00.000Z' });
    const prints = await searchOfficialCards(rootDir, { view: 'prints', query: 'streamed print' });
    const oracle = await searchOfficialCards(rootDir, { view: 'oracle', query: 'streamed oracle' });

    assert.equal(status.prints.count, 2);
    assert.equal(status.oracle.count, 1);
    assert.equal(prints.total, 2);
    assert.equal(oracle.total, 1);
    assert.equal(calls.includes('https://example.test/default-cards.json'), true);
    assert.equal(calls.includes('https://example.test/oracle-cards.json'), true);
  });

  it('adds official print rows to collections by Scryfall id', async () => {
    const rootDir = await createFixtureRoot();
    await writeOfficialCardCacheForTest(rootDir, {
      prints: [
        officialPrint({
          id: '55555555-5555-5555-5555-555555555555',
          name: 'Command Tower',
          setCode: 'CMM',
          setName: 'Commander Masters',
          collectorNumber: '1025'
        })
      ]
    });

    await addOfficialCardToCollection(rootDir, {
      cardId: '55555555-5555-5555-5555-555555555555',
      collectionId: 'official-adds',
      collectionName: 'Official Adds',
      quantity: 2,
      ownerName: 'Eleni',
      finish: 'Nonfoil'
    });
    const updated = await addOfficialCardToCollection(rootDir, {
      cardId: '55555555-5555-5555-5555-555555555555',
      collectionId: 'official-adds',
      quantity: 1
    });
    const collection = await readCollectionState(rootDir, 'official-adds');

    assert.equal(updated.entries.length, 1);
    assert.equal(collection.metadata.source, 'scryfall');
    assert.equal(collection.entries[0]?.quantity, 3);
    assert.equal(collection.entries[0]?.ownerName, 'Eleni');
    assert.equal(collection.entries[0]?.scryfallId, '55555555-5555-5555-5555-555555555555');
    assert.equal(collection.entries[0]?.matchStrategy, 'scryfall_id');
    assert.equal(collection.entries[0]?.reviewStatus, 'matched');
    assert.match(collection.entries[0]?.sourceRow ?? '', /"source":"scryfall"/);
  });

  it('adds official print rows to decks through the official backing collection', async () => {
    const rootDir = await createFixtureRoot();
    await writeOfficialCardCacheForTest(rootDir, {
      prints: [
        officialPrint({
          id: '66666666-6666-6666-6666-666666666666',
          name: 'Swords to Plowshares',
          manaCost: '{W}',
          manaValue: 1,
          typeLine: 'Instant',
          oracleText: 'Exile target creature.',
          colors: ['W'],
          colorIdentity: ['W'],
          setCode: 'BRC',
          setName: 'The Brothers War Commander',
          collectorNumber: '90'
        })
      ]
    });
    const created = await createDeck(rootDir, { name: 'Official Test Deck' });

    const first = await addOfficialCardToDeck(rootDir, {
      cardId: '66666666-6666-6666-6666-666666666666',
      deckId: created.metadata.deckId,
      section: 'main',
      quantity: 2
    });
    const updated = await addOfficialCardToDeck(rootDir, {
      cardId: '66666666-6666-6666-6666-666666666666',
      deckId: created.metadata.deckId,
      section: 'main',
      quantity: 1
    });

    assert.equal(first.entries[0]?.card?.name, 'Swords to Plowshares');
    assert.equal(first.entries[0]?.card?.oracleText, 'Exile target creature.');
    assert.equal(updated.entries.length, 1);
    assert.equal(updated.entries[0]?.count, 3);
    assert.equal(updated.entries[0]?.variantId, 'official-print');
    assert.equal(updated.entries[0]?.card?.source, 'collection');
    const backingCollection = await readCollectionState(rootDir, 'official-cards');
    assert.equal(backingCollection.entries[0]?.scryfallId, '66666666-6666-6666-6666-666666666666');
  });
});

function officialPrint(overrides: Partial<OfficialCardPrint>): OfficialCardPrint {
  return {
    view: 'prints',
    id: '00000000-0000-0000-0000-000000000000',
    oracleId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    name: 'Fixture Card',
    manaCost: '',
    manaValue: 0,
    typeLine: 'Artifact',
    oracleText: '',
    colors: [],
    colorIdentity: [],
    setCode: 'TST',
    setName: 'Test Set',
    collectorNumber: '1',
    rarity: 'rare',
    releasedAt: '2026-01-01',
    finishes: ['nonfoil'],
    lang: 'en',
    ...overrides
  };
}

function officialOracle(overrides: Partial<OfficialCardOracle>): OfficialCardOracle {
  return {
    view: 'oracle',
    id: '00000000-0000-0000-0000-000000000000',
    oracleId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    name: 'Fixture Oracle Card',
    manaCost: '',
    manaValue: 0,
    typeLine: 'Instant',
    oracleText: '',
    colors: [],
    colorIdentity: [],
    ...overrides
  };
}

function scryfallCard(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    id: '00000000-0000-4000-8000-000000000000',
    oracle_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    name: 'Scryfall Fixture Card',
    mana_cost: '',
    mana_value: 0,
    type_line: 'Artifact',
    oracle_text: '',
    colors: [],
    color_identity: [],
    set: 'TST',
    set_name: 'Test Set',
    collector_number: '1',
    rarity: 'rare',
    released_at: '2026-01-01',
    finishes: ['nonfoil'],
    lang: 'en',
    ...overrides
  };
}

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

function streamJsonResponse(value: unknown): Response {
  const encoded = new TextEncoder().encode(JSON.stringify(value));
  return new Response(
    new ReadableStream({
      start(controller) {
        for (let offset = 0; offset < encoded.length; offset += 17) {
          controller.enqueue(encoded.slice(offset, offset + 17));
        }
        controller.close();
      }
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

async function createFixtureRoot(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'forge-official-cards-'));
}

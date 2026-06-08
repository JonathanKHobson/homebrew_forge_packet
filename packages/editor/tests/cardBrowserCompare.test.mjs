import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const requireFromRoot = createRequire(join(repoRoot, 'package.json'));

test('card browser compare keeps duplicate source rows distinct and resolves saved variants', async () => {
  const compare = await loadCompareModule();
  const project = {
    setCode: 'DEMO',
    drafts: [
      draft({ cardId: 'CARD-1', variantId: 'primary', variantIsPrimary: true, name: 'Primary CARD-1', manaCost: '{2}{G}' }),
      draft({ cardId: 'CARD-1', variantId: 'alt', variantIsPrimary: false, name: 'Alt CARD-1', manaCost: '{G}' })
    ]
  };
  const context = { projectsBySet: { DEMO: project }, currentProject: null, collectionStates: {} };
  const setRow = row({ key: 'set:DEMO:CARD-1', sourceKind: 'set', sourceId: 'DEMO', sourceName: 'Demo Set', setCode: 'DEMO', cardId: 'CARD-1' });
  const deckRow = row({ key: 'deck:demo:main:DEMO:CARD-1:alt', sourceKind: 'deck', sourceId: 'demo', sourceName: 'Demo Deck', setCode: 'DEMO', cardId: 'CARD-1', variantId: 'alt', quantity: 2, deckSection: 'main' });

  const setItem = compare.buildCardBrowserCompareItem(setRow, context);
  const deckItem = compare.buildCardBrowserCompareItem(deckRow, context);

  assert.equal(setItem.key, 'set:DEMO:CARD-1');
  assert.equal(deckItem.key, 'deck:demo:main:DEMO:CARD-1:alt');
  assert.equal(setItem.draft.name, 'Primary CARD-1');
  assert.equal(deckItem.draft.name, 'Alt CARD-1');
  assert.equal(compare.cardBrowserCompareSourceLabel(setRow), 'Set card - Demo Set');
  assert.equal(compare.cardBrowserCompareSourceLabel(deckRow), 'Main deck - Demo Deck');
});

test('card browser compare preserves unresolved collection row metadata', async () => {
  const compare = await loadCompareModule();
  const entry = {
    entryId: 'entry-1',
    quantity: 3,
    cardName: 'Unknown Trade Binder Card',
    setCode: 'ABC',
    setName: 'Alpha Binder',
    collectorNumber: '42',
    finish: 'Foil',
    condition: 'Lightly Played',
    language: 'English',
    location: 'Trade binder',
    reviewStatus: 'needs_review',
    sourceRow: JSON.stringify({ mana_value: 4 })
  };
  const collectionRow = row({
    key: 'collection:binder:entry-1',
    sourceKind: 'collection',
    sourceId: 'binder',
    sourceName: 'Trade Binder',
    collectionEntryId: 'entry-1',
    name: entry.cardName,
    quantity: entry.quantity,
    reviewStatus: 'needs_review',
    status: 'needs_review'
  });
  const item = compare.buildCardBrowserCompareItem(collectionRow, {
    projectsBySet: {},
    currentProject: null,
    collectionStates: { binder: { entries: [entry] } }
  });
  const details = new Map(compare.cardBrowserCompareDetailsForItem(item).map((detail) => [detail.label, detail.value]));

  assert.equal(item.draft, null);
  assert.match(item.renderUnavailableReason, /No linked authored card render/);
  assert.equal(details.get('Quantity'), '3');
  assert.equal(details.get('Collection print'), 'ABC 42');
  assert.equal(details.get('Finish'), 'Foil');
  assert.equal(details.get('Condition'), 'Lightly Played');
  assert.equal(details.get('Location'), 'Trade binder');
  assert.equal(details.get('Mana value'), '4');
});

test('card browser compare exposes official catalog card details without an authored draft', async () => {
  const compare = await loadCompareModule();
  const officialCard = {
    view: 'prints',
    id: 'print-1',
    name: 'Lightning Bolt',
    manaCost: '{R}',
    manaValue: 1,
    typeLine: 'Instant',
    oracleText: 'Lightning Bolt deals 3 damage to any target.',
    colors: ['R'],
    colorIdentity: ['R'],
    power: '',
    toughness: '',
    setCode: 'SLD',
    setName: 'Secret Lair Drop',
    collectorNumber: '123',
    rarity: 'rare',
    scryfallUri: 'https://scryfall.com/card/sld/123/lightning-bolt'
  };
  const officialRow = row({
    key: 'official:prints:print-1',
    sourceKind: 'official',
    sourceId: 'prints',
    sourceName: 'Scryfall Prints',
    setCode: 'SLD',
    cardId: 'print-1',
    name: officialCard.name,
    typeLine: officialCard.typeLine,
    manaCost: officialCard.manaCost,
    colors: 'R',
    status: 'official',
    officialCard
  });
  const item = compare.buildCardBrowserCompareItem(officialRow, {
    projectsBySet: {},
    currentProject: null,
    collectionStates: {}
  });
  const details = new Map(compare.cardBrowserCompareDetailsForItem(item).map((detail) => [detail.label, detail.value]));

  assert.equal(item.draft, null);
  assert.match(item.renderUnavailableReason, /Official catalog rows/);
  assert.equal(details.get('Mana value'), '1');
  assert.equal(details.get('Oracle text'), 'Lightning Bolt deals 3 damage to any target.');
  assert.equal(details.get('Rarity'), 'rare');
  assert.equal(details.get('Scryfall'), officialCard.scryfallUri);
});

async function loadCompareModule() {
  const typescript = requireFromRoot('typescript');
  const source = await readFile(join(repoRoot, 'packages/editor/src/domain/cardBrowserCompare.ts'), 'utf8');
  const { outputText } = typescript.transpileModule(source, {
    compilerOptions: {
      module: typescript.ModuleKind.CommonJS,
      target: typescript.ScriptTarget.ES2022
    }
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, { exports: module.exports, module }, { filename: 'cardBrowserCompare.cjs' });
  return module.exports;
}

function draft(overrides) {
  return {
    cardId: 'CARD-1',
    setCode: 'DEMO',
    setName: 'Demo Set',
    name: 'CARD-1',
    manaCost: '',
    colors: '',
    typeLine: 'Creature - Test',
    oracleText: 'Draw a card.',
    power: '2',
    toughness: '2',
    loyalty: '',
    rarity: 'common',
    status: 'draft',
    tags: [],
    variantId: 'primary',
    variantIsPrimary: true,
    ...overrides
  };
}

function row(overrides) {
  return {
    key: 'row',
    sourceKind: 'set',
    sourceId: 'DEMO',
    sourceName: 'Demo Set',
    setCode: 'DEMO',
    cardId: 'CARD-1',
    name: 'CARD-1',
    typeLine: 'Creature - Test',
    manaCost: '',
    colors: '',
    status: 'draft',
    tags: [],
    ...overrides
  };
}

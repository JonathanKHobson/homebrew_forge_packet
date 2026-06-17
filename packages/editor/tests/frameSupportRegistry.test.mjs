import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import test from 'node:test';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

test('frame support registry covers the current catalog card types', async () => {
  const registry = await read('packages/editor/src/domain/cardTypeRegistry.ts');
  const expectedTypes = [
    'Artifact',
    'Battle',
    'Boss',
    'Conspiracy',
    'Creature',
    'Dungeon',
    'Emblem',
    'Enchantment',
    'Event',
    'Hero',
    'Instant',
    'Kindred',
    'Land',
    'Phenomenon',
    'Plane',
    'Planeswalker',
    'Scheme',
    'Sorcery',
    'Vanguard'
  ];

  for (const type of expectedTypes) {
    assert.match(registry, new RegExp(`'${type}'`));
  }
  assert.match(registry, /'Tribal'/);
});

test('border registry exposes selectable and gated border colors', async () => {
  const registry = await read('packages/editor-core/src/borderColorRegistry.ts');
  for (const border of ['black', 'white', 'silver', 'gold', 'borderless', 'none']) {
    assert.match(registry, new RegExp(`'${border}'`));
  }
  assert.match(registry, /disabled|unavailable|does not declare support/);
});

test('vehicle has subtype inference and a frame option path', async () => {
  const subtypeRegistry = await read('packages/editor-core/src/subtypeInferenceRegistry.ts');
  const frameRegistry = await read('packages/editor-core/src/frameRegistry.ts');

  assert.match(subtypeRegistry, /subtype\('vehicle', 'Vehicle'/);
  assert.match(frameRegistry, /\['vehicle', 'Vehicle'/);
  assert.match(frameRegistry, /hasSubtype\(draft\.subtypes, 'vehicle'\)/);
});

async function read(relativePath) {
  return readFile(join(repoRoot, relativePath), 'utf8');
}

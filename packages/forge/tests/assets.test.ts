import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { checkAssetPack, loadAssetPack } from '../src/assets/assetPack.js';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

describe('asset pack checks', () => {
  it('reports missing required composited frame and symbol inputs', async () => {
    const assetPack = await loadAssetPack({ rootDir: repoRoot, packId: 'private-mtg-style' });
    const result = checkAssetPack(assetPack);

    assert.equal(result.packId, 'private-mtg-style');
    assert.ok(result.missing.some((role) => role.role === 'frame.full_card' && role.layout === 'normal_creature'));
    assert.ok(result.missing.some((role) => role.role === 'symbol.mana' && role.symbol === 'w'));
  });
});


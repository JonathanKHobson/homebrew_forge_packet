import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { manaColorsFromCost, normalizeManaCost, parseManaCostTokens } from '../src/domain/mana.js';

describe('mana syntax', () => {
  it('normalizes compact and braced mana costs to token syntax', () => {
    assert.equal(normalizeManaCost('2WU'), '{2}{W}{U}');
    assert.equal(normalizeManaCost('{X} {2} {R}'), '{X}{2}{R}');
  });

  it('supports hybrid and Phyrexian slash tokens', () => {
    assert.deepEqual(parseManaCostTokens('2/W U/B 1/P G/P'), ['2/W', 'U/B', '1/P', 'G/P']);
    assert.equal(normalizeManaCost('2/WU/B1/PG/P'), '{2/W}{U/B}{1/P}{G/P}');
  });

  it('infers color identity from compact, hybrid, and braced costs', () => {
    assert.equal(manaColorsFromCost('2/WU/B{G/P}{C}'), 'WUBGC');
  });
});

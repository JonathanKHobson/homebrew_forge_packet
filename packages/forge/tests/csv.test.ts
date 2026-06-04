import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsvRecords, writeCsvRecords } from '../src/data/csv.js';

describe('CSV records', () => {
  it('parses quoted multiline card text and preserves empty cells', () => {
    const csv = [
      'card_id,face_index,face_name,mana_cost,type_line,oracle_text,flavor_text,power,toughness',
      'DEMO-001,0,Example Vanguard,{1}{W},Creature - Human,"Vigilance\\nWhen this enters, scry 1.",,2,3'
    ].join('\n');

    const rows = parseCsvRecords(csv);

    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.oracle_text, 'Vigilance\nWhen this enters, scry 1.');
    assert.equal(rows[0]?.flavor_text, '');
  });

  it('writes parseable CSV with deterministic headers', () => {
    const csv = writeCsvRecords(
      [
        { card_id: 'DEMO-001', name: 'Example, With Comma', notes: 'Line 1\nLine 2' },
        { card_id: 'DEMO-002', name: 'Plain Example', notes: '' }
      ],
      ['card_id', 'name', 'notes']
    );

    const rows = parseCsvRecords(csv);

    assert.equal(csv.split('\n')[0], 'card_id,name,notes');
    assert.equal(rows[0]?.name, 'Example, With Comma');
    assert.equal(rows[0]?.notes, 'Line 1\nLine 2');
  });
});

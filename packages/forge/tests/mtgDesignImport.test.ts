import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  analyzeMtgDesignImport,
  applyImportedRows,
  parsePlanesculptorsText,
  upsertRowByKeys
} from '../src/importers/mtgDesign.js';

const sgeXmlPath = '/Users/kyle/Documents/My Games/Magic The Gathering/Sets/test import/Stargate/SGE/SGE.xml';
const sgeTextPath = '/Users/kyle/Documents/My Games/Magic The Gathering/Sets/test import/Stargate/SGE (1)/SGE.txt';

describe('MTG.design import readiness', () => {
  it('audits the local SGE Cockatrice XML without discarding unsupported card families', async () => {
    const content = await readFile(sgeXmlPath, 'utf8');

    const result = analyzeMtgDesignImport({
      setCode: 'SGE',
      format: 'cockatrice',
      content,
      inputPath: sgeXmlPath
    });

    assert.equal(result.cards.length, 105);
    assert.equal(result.faces.length, 105);
    assert.equal(result.art.length, 105);
    assert.equal(result.audit.importedCards, 105);
    assert.equal(result.audit.artReferences, 105);
    assert.equal(result.audit.legacyRenderReferences, 105);
    assert.equal(result.audit.editableArtNeeded, 105);
    assert.equal(result.audit.missingArt, 105);
    assert.equal(result.audit.parsedTokens, 8);
    assert.equal(result.audit.parsedSagas, 3);
    assert.ok(result.audit.possibleTransformCards >= 1);
    assert.ok(result.audit.unsupportedLayouts.some((item) => item.layout === 'saga' && item.count === 3));
    assert.ok(result.audit.warnings.some((warning) => warning.code === 'unsupported-layout'));
    assert.ok(result.audit.warnings.some((warning) => warning.code === 'possible-transform'));
    assert.ok(result.audit.warnings.some((warning) => warning.code === 'needs-editable-art'));
  });

  it('parses Planesculptors text into editable mana, rules, flavor, and artist/source fields', async () => {
    const content = await readFile(sgeTextPath, 'utf8');

    const result = parsePlanesculptorsText(content, { setCode: 'SGE' });

    assert.equal(result.cards.length, 105);
    assert.equal(result.faces.length, 105);
    assert.equal(result.cards[0]?.collector_number, 'A031');
    assert.equal(result.cards[0]?.rarity, 'rare');
    assert.equal(result.faces[0]?.mana_cost, '{4}{W}{W}');
    assert.match(result.faces[0]?.oracle_text ?? '', /Whenever Prometheus attacks/);
    assert.match(result.faces[0]?.flavor_text ?? '', /Humanity/);
    assert.equal(result.faces[0]?.artist_display, 'Stargate SG-1');
  });

  it('upserts multi-face rows by card id and face index instead of replacing the whole card', () => {
    const rows = [
      { card_id: 'DFC-001', face_index: '0', face_name: 'Front' },
      { card_id: 'DFC-001', face_index: '1', face_name: 'Back' }
    ];

    upsertRowByKeys(rows, ['card_id', 'face_index'], { card_id: 'DFC-001', face_index: '1', face_name: 'Back Updated' });

    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.face_name, 'Front');
    assert.equal(rows[1]?.face_name, 'Back Updated');
  });

  it('dry-runs without writing set CSVs and non-dry-run writes a complete imported set', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'homebrew-forge-import-'));
    const content = await readFile(sgeXmlPath, 'utf8');
    const imported = analyzeMtgDesignImport({
      setCode: 'SGE',
      format: 'cockatrice',
      content,
      inputPath: sgeXmlPath
    });

    const dryRun = await applyImportedRows({
      repoRoot,
      setCode: 'SGE',
      imported,
      mode: 'replace',
      dryRun: true
    });

    await assert.rejects(() => stat(join(repoRoot, 'sets', 'SGE', 'cards.csv')));
    assert.equal(dryRun.importedCards, 105);

    const written = await applyImportedRows({
      repoRoot,
      setCode: 'SGE',
      imported,
      mode: 'replace',
      dryRun: false
    });

    const cardsCsv = await readFile(join(repoRoot, 'sets', 'SGE', 'cards.csv'), 'utf8');
    const facesCsv = await readFile(join(repoRoot, 'sets', 'SGE', 'card_faces.csv'), 'utf8');
    const artCsv = await readFile(join(repoRoot, 'sets', 'SGE', 'art_manifest.csv'), 'utf8');
    assert.equal(written.importedCards, 105);
    assert.match(cardsCsv, /Prometheus/);
    assert.ok(facesCsv.includes('{4}{W}{W}'));
    assert.match(artCsv, /not-used-as-render-art/);
  });
});

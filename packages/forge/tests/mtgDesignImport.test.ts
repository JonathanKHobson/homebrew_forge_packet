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
import { parseCsvRecords, writeCsvRecords } from '../src/data/csv.js';

const sgeXmlPath = '/Users/kyle/Documents/My Games/Magic The Gathering/Sets/test import/Stargate/SGE/SGE.xml';
const sgeTextPath = '/Users/kyle/Documents/My Games/Magic The Gathering/Sets/test import/Stargate/SGE (1)/SGE.txt';

describe('MTG.design import readiness', () => {
  it('audits the local SGE Cockatrice XML without discarding registered card families', async () => {
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
    assert.equal(result.audit.importedVariants, 105);
    assert.equal(result.audit.importedVariantFaces, 105);
    assert.equal(result.audit.artReferences, 105);
    assert.equal(result.audit.legacyRenderReferences, 105);
    assert.equal(result.audit.editableArtNeeded, 105);
    assert.equal(result.audit.missingArt, 105);
    assert.equal(result.audit.parsedTokens, 8);
    assert.equal(result.audit.parsedSagas, 3);
    assert.ok(result.audit.possibleTransformCards >= 1);
    assert.equal(result.audit.unsupportedLayouts.some((item) => item.layout === 'saga'), false);
    assert.equal(result.audit.warnings.some((warning) => warning.code === 'unsupported-layout'), false);
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

  it('imports Homebrew Forge CSV variant rows without duplicating the parent card', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'homebrew-forge-variant-import-'));
    const headers = [
      'card_id',
      'collector_number',
      'name',
      'layout',
      'mode',
      'rarity',
      'color_identity',
      'status',
      'print_count',
      'variant_id',
      'variant_display_name',
      'variant_kind',
      'variant_status',
      'variant_is_primary',
      'variant_export_policy',
      'variant_tags',
      'variant_notes',
      'face_index',
      'face_name',
      'mana_cost',
      'type_line',
      'oracle_text',
      'flavor_text',
      'power',
      'toughness',
      'colors',
      'frame_type'
    ];
    const content = writeCsvRecords(
      [
        {
          card_id: 'CSV-001',
          collector_number: '001',
          name: 'Variant Weaver',
          layout: 'normal',
          mode: 'custom',
          rarity: 'rare',
          color_identity: 'U',
          status: 'draft',
          print_count: '1',
          variant_id: 'CSV-001-V1',
          variant_display_name: 'Variant 1',
          variant_kind: 'mechanics test',
          variant_status: 'active',
          variant_is_primary: 'true',
          variant_export_policy: 'default',
          variant_tags: '',
          variant_notes: 'Primary version',
          face_index: '0',
          face_name: 'Variant Weaver',
          mana_cost: '{1}{U}',
          type_line: 'Creature - Human Wizard',
          oracle_text: 'When Variant Weaver enters, draw a card.',
          flavor_text: '',
          power: '1',
          toughness: '3',
          colors: 'U',
          frame_type: 'normal_creature'
        },
        {
          card_id: 'CSV-001',
          collector_number: '001',
          name: 'Variant Weaver',
          layout: 'normal',
          mode: 'custom',
          rarity: 'rare',
          color_identity: 'U',
          status: 'draft',
          print_count: '1',
          variant_id: 'CSV-001-V2',
          variant_display_name: 'Wording Test',
          variant_kind: 'wording test',
          variant_status: 'testing',
          variant_is_primary: 'false',
          variant_export_policy: 'optional',
          variant_tags: 'tempo;rules-copy',
          variant_notes: 'Testing shorter wording',
          face_index: '0',
          face_name: 'Variant Weaver',
          mana_cost: '{1}{U}',
          type_line: 'Creature - Human Wizard',
          oracle_text: 'Flying\nWhen Variant Weaver enters, scry 2.',
          flavor_text: '',
          power: '1',
          toughness: '3',
          colors: 'U',
          frame_type: 'normal_creature'
        }
      ],
      headers
    );

    const imported = analyzeMtgDesignImport({
      setCode: 'CSV',
      format: 'csv',
      content
    });

    assert.equal(imported.cards.length, 1);
    assert.equal(imported.faces.length, 1);
    assert.equal(imported.variants.length, 2);
    assert.equal(imported.variantFaces.length, 2);
    assert.equal(imported.audit.importedVariants, 2);

    await applyImportedRows({
      repoRoot,
      setCode: 'CSV',
      imported,
      mode: 'replace',
      dryRun: false
    });

    const cards = parseCsvRecords(await readFile(join(repoRoot, 'sets', 'CSV', 'cards.csv'), 'utf8'));
    const faces = parseCsvRecords(await readFile(join(repoRoot, 'sets', 'CSV', 'card_faces.csv'), 'utf8'));
    const variants = parseCsvRecords(await readFile(join(repoRoot, 'sets', 'CSV', 'card_variants.csv'), 'utf8'));
    const variantFaces = parseCsvRecords(await readFile(join(repoRoot, 'sets', 'CSV', 'card_variant_faces.csv'), 'utf8'));

    assert.equal(cards.length, 1);
    assert.equal(faces.length, 1);
    assert.equal(variants.length, 2);
    assert.equal(variants.filter((row) => row.is_primary === 'true').length, 1);
    assert.equal(variants.find((row) => row.variant_id === 'CSV-001-V2')?.kind, 'wording_test');
    assert.equal(variants.find((row) => row.variant_id === 'CSV-001-V2')?.status, 'testing');
    assert.equal(variants.find((row) => row.variant_id === 'CSV-001-V2')?.export_policy, 'optional');
    assert.match(faces[0]?.oracle_text ?? '', /draw a card/);
    assert.match(variantFaces.find((row) => row.variant_id === 'CSV-001-V2')?.oracle_text ?? '', /scry 2/);
  });
});

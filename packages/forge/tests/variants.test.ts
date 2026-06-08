import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeCsvRecords } from '../src/data/csv.js';
import { loadForgeProject } from '../src/data/loadProject.js';
import { variantExportCards } from '../src/variants/cardVariants.js';

describe('Card variants', () => {
  it('synthesizes one primary variant for legacy sets without variant files', async () => {
    const rootDir = await createVariantFixture({ withVariants: false });

    const project = await loadForgeProject({ rootDir, setCode: 'VAR' });

    assert.equal(project.variants.length, 1);
    assert.equal(project.variants[0]?.variantId, 'VAR-001-V1');
    assert.equal(project.variants[0]?.isPrimary, true);
    assert.equal(project.variantFaces[0]?.variantId, 'VAR-001-V1');
    assert.equal(project.faces[0]?.cardId, 'VAR-001');
  });

  it('loads variant CSVs and normalizes to one primary variant per card', async () => {
    const rootDir = await createVariantFixture({ withVariants: true, duplicatePrimary: true });

    const project = await loadForgeProject({ rootDir, setCode: 'VAR' });
    const primaries = project.variants.filter((variant) => variant.cardId === 'VAR-001' && variant.isPrimary);

    assert.equal(project.variants.length, 4);
    assert.equal(primaries.length, 1);
    assert.equal(primaries[0]?.variantId, 'VAR-001-V1');
    assert.equal(project.faces[0]?.oracleText, 'Primary rules text.');
  });

  it('selects variants for export by policy', async () => {
    const rootDir = await createVariantFixture({ withVariants: true });
    const project = await loadForgeProject({ rootDir, setCode: 'VAR' });

    assert.deepEqual(variantExportCards(project, 'primary').map((entry) => entry.variant.variantId), ['VAR-001-V1']);
    assert.deepEqual(variantExportCards(project, 'default').map((entry) => entry.variant.variantId), ['VAR-001-V1', 'VAR-001-V2']);
    assert.deepEqual(variantExportCards(project, 'all_active').map((entry) => entry.variant.variantId), ['VAR-001-V1', 'VAR-001-V2', 'VAR-001-V3']);
    assert.deepEqual(variantExportCards(project, 'all').map((entry) => entry.variant.variantId), ['VAR-001-V1', 'VAR-001-V2', 'VAR-001-V3', 'VAR-001-V4']);
  });

  it('loads DEMO variants that cover lifecycle states and export modes', async () => {
    const repoRoot = join(process.cwd(), '..', '..');
    const project = await loadForgeProject({ rootDir: repoRoot, setCode: 'DEMO' });
    const variantsByCard = new Map<string, typeof project.variants>();
    for (const variant of project.variants) {
      variantsByCard.set(variant.cardId, [...(variantsByCard.get(variant.cardId) ?? []), variant]);
    }

    assert.equal(project.variants.length, 22);
    assert.equal(project.variantFaces.length, 22);
    assert.equal(variantsByCard.get('DEMO-001')?.length, 4);
    assert.equal(variantsByCard.get('DEMO-002')?.length, 4);
    assert.equal(variantsByCard.get('DEMO-003')?.length, 4);

    for (const [cardId, variants] of variantsByCard) {
      assert.equal(variants.filter((variant) => variant.isPrimary).length, 1, `${cardId} should have exactly one primary variant`);
    }

    assert.deepEqual(new Set(project.variants.map((variant) => variant.kind)), new Set(['mechanics_test', 'wording_test', 'visual_alternate', 'finish_alternate', 'history_snapshot', 'print_alternate']));
    assert.deepEqual(new Set(project.variants.map((variant) => variant.status)), new Set(['active', 'testing', 'archived', 'final']));
    assert.equal(variantExportCards(project, 'primary').length, 10);
    assert.equal(variantExportCards(project, 'default').length, 12);
    assert.equal(variantExportCards(project, 'all_active').length, 20);
    assert.equal(variantExportCards(project, 'all').length, 22);
  });
});

async function createVariantFixture({ withVariants, duplicatePrimary = false }: { withVariants: boolean; duplicatePrimary?: boolean }): Promise<string> {
  const rootDir = await mkdtemp(join(tmpdir(), 'homebrew-forge-variants-'));
  const setDir = join(rootDir, 'sets', 'VAR');
  await mkdir(setDir, { recursive: true });
  await writeFile(
    join(setDir, 'sets.csv'),
    `${writeCsvRecords(
      [
        {
          set_code: 'VAR',
          set_name: 'Variant Set',
          set_type: 'custom',
          version: '0.1.0',
          default_language: 'en',
          default_asset_pack: 'debug',
          default_export_profile: 'cockatrice',
          author: 'Test',
          status: 'draft',
          tags: '',
          notes: ''
        }
      ],
      ['set_code', 'set_name', 'set_type', 'version', 'default_language', 'default_asset_pack', 'default_export_profile', 'author', 'status', 'tags', 'notes']
    )}\n`,
    'utf8'
  );
  await writeFile(
    join(setDir, 'cards.csv'),
    `${writeCsvRecords(
      [
        {
          card_id: 'VAR-001',
          set_code: 'VAR',
          collector_number: '001',
          name: 'Variant Adept',
          layout: 'normal',
          mode: 'custom',
          source_card_name: '',
          source_set_code: '',
          rarity: 'common',
          color_identity: 'W',
          tags: '',
          status: 'draft',
          print_count: '1',
          export_name_override: '',
          notes: ''
        }
      ],
      ['card_id', 'set_code', 'collector_number', 'name', 'layout', 'mode', 'source_card_name', 'source_set_code', 'rarity', 'color_identity', 'tags', 'status', 'print_count', 'export_name_override', 'notes']
    )}\n`,
    'utf8'
  );
  await writeFile(
    join(setDir, 'card_faces.csv'),
    `${writeCsvRecords([faceRow('VAR-001', 'Variant Adept', 'Legacy rules text.')], faceHeaders())}\n`,
    'utf8'
  );
  await writeFile(join(setDir, 'art_manifest.csv'), 'art_id,file_path,source_url,source_type,artist,license,permission_status,checksum_sha256,position_x,position_y,scale,crop_x,crop_y,crop_w,crop_h,notes\n', 'utf8');
  await writeFile(
    join(setDir, 'export_profiles.csv'),
    `${writeCsvRecords(
      [
        {
          profile_id: 'cockatrice',
          target: 'cockatrice',
          image_format: 'png',
          width_px: '488',
          height_px: '680',
          quality: '',
          include_bleed: 'false',
          bleed_px: '0',
          include_crop_marks: 'false',
          include_playtest_watermark: 'false',
          watermark_text: '',
          allow_placeholder_art: 'true',
          filename_template: '{{card_id}}.png'
        }
      ],
      ['profile_id', 'target', 'image_format', 'width_px', 'height_px', 'quality', 'include_bleed', 'bleed_px', 'include_crop_marks', 'include_playtest_watermark', 'watermark_text', 'allow_placeholder_art', 'filename_template']
    )}\n`,
    'utf8'
  );

  if (withVariants) {
    await writeFile(
      join(setDir, 'card_variants.csv'),
      `${writeCsvRecords(
        [
          variantRow('VAR-001-V1', 'Variant 1', 'mechanics_test', 'active', true, 'default'),
          variantRow('VAR-001-V2', 'Rules Test', 'wording_test', 'testing', duplicatePrimary, 'default'),
          variantRow('VAR-001-V3', 'Showcase', 'visual_alternate', 'active', false, 'optional'),
          variantRow('VAR-001-V4', 'Old Draft', 'history_snapshot', 'archived', false, 'excluded')
        ],
        ['variant_id', 'card_id', 'display_name', 'kind', 'status', 'is_primary', 'export_policy', 'tags', 'notes', 'created_at', 'updated_at']
      )}\n`,
      'utf8'
    );
    await writeFile(
      join(setDir, 'card_variant_faces.csv'),
      `${writeCsvRecords(
        [
          variantFaceRow('VAR-001-V1', 'Primary rules text.'),
          variantFaceRow('VAR-001-V2', 'Alternate rules text.'),
          variantFaceRow('VAR-001-V3', 'Showcase rules text.'),
          variantFaceRow('VAR-001-V4', 'Archived rules text.')
        ],
        ['variant_id', ...faceHeaders()]
      )}\n`,
      'utf8'
    );
  }

  return rootDir;
}

function variantRow(variantId: string, displayName: string, kind: string, status: string, isPrimary: boolean, exportPolicy: string): Record<string, string> {
  return {
    variant_id: variantId,
    card_id: 'VAR-001',
    display_name: displayName,
    kind,
    status,
    is_primary: isPrimary ? 'true' : 'false',
    export_policy: exportPolicy,
    tags: '',
    notes: '',
    created_at: '',
    updated_at: ''
  };
}

function variantFaceRow(variantId: string, oracleText: string): Record<string, string> {
  return {
    variant_id: variantId,
    card_id: 'VAR-001',
    ...faceRow('VAR-001', 'Variant Adept', oracleText)
  };
}

function faceRow(cardId: string, name: string, oracleText: string): Record<string, string> {
  return {
    card_id: cardId,
    face_index: '0',
    face_name: name,
    mana_cost: '{1}{W}',
    type_line: 'Creature - Wizard',
    oracle_text: oracleText,
    flavor_text: '',
    power: '2',
    toughness: '2',
    loyalty: '',
    defense: '',
    colors: 'W',
    frame_type: 'normal_creature',
    art_id: '',
    artist_display: '',
    watermark: '',
    rules_text_size_hint: 'auto',
    rules_text_padding_top: '',
    rules_text_padding_right: '',
    rules_text_padding_bottom: '',
    rules_text_padding_left: '',
    rules_text_reminder_mode: 'auto',
    layout_variant: 'normal'
  };
}

function faceHeaders(): string[] {
  return [
    'card_id',
    'face_index',
    'face_name',
    'mana_cost',
    'type_line',
    'oracle_text',
    'flavor_text',
    'power',
    'toughness',
    'loyalty',
    'defense',
    'colors',
    'frame_type',
    'art_id',
    'artist_display',
    'watermark',
    'rules_text_size_hint',
    'rules_text_padding_top',
    'rules_text_padding_right',
    'rules_text_padding_bottom',
    'rules_text_padding_left',
    'rules_text_reminder_mode',
    'layout_variant'
  ];
}

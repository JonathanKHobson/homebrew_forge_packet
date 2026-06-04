import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import { writeCsvRecords } from '../src/data/csv.js';
import {
  createDeck,
  exportDeckCockatrice,
  exportDeckPlainText,
  readDeckState,
  saveDeck
} from '../src/decks/deckStore.js';
import type { DeckEntry } from '../src/decks/deckModel.js';

describe('Deck storage and export', () => {
  it('round-trips deck metadata and entries through local deck files', async () => {
    const rootDir = await createFixtureRoot();
    const created = await createDeck(rootDir, { name: 'Cross Set Test', linkedSetCode: 'AAA' });
    const entries: DeckEntry[] = [
      { deckId: created.metadata.deckId, section: 'main', count: 2, setCode: 'AAA', cardId: 'AAA-001', nameSnapshot: 'Alpha Adept' },
      { deckId: created.metadata.deckId, section: 'side', count: 1, setCode: 'BBB', cardId: 'BBB-001', nameSnapshot: 'Beta Relic' }
    ];

    await saveDeck(rootDir, { metadata: created.metadata, entries });
    const loaded = await readDeckState(rootDir, created.metadata.deckId);
    const csv = await readFile(join(rootDir, 'decks', created.metadata.deckId, 'entries.csv'), 'utf8');

    assert.equal(loaded.metadata.name, 'Cross Set Test');
    assert.equal(loaded.entries.length, 2);
    assert.equal(loaded.entries[1]?.card?.name, 'Beta Relic');
    assert.match(csv, /deck_id,section,count,set_code,card_id,name_snapshot/);
  });

  it('resolves cards across multiple sets and keeps unresolved cards visible', async () => {
    const rootDir = await createFixtureRoot();
    const created = await createDeck(rootDir, { name: 'Resolver Test' });

    await saveDeck(rootDir, {
      metadata: created.metadata,
      entries: [
        { deckId: created.metadata.deckId, section: 'main', count: 1, setCode: 'AAA', cardId: 'AAA-001', nameSnapshot: 'Alpha Adept' },
        { deckId: created.metadata.deckId, section: 'maybe', count: 3, setCode: 'ZZZ', cardId: 'ZZZ-404', nameSnapshot: 'Lost Card' }
      ]
    });

    const deck = await readDeckState(rootDir, created.metadata.deckId);

    assert.equal(deck.availableCards.length, 2);
    assert.equal(deck.entries[0]?.card?.setCode, 'AAA');
    assert.equal(deck.entries[1]?.card, undefined);
    assert.match(deck.entries[1]?.warning ?? '', /Could not resolve ZZZ\/ZZZ-404/);
  });

  it('exports grouped plain text decklists', async () => {
    const rootDir = await createFixtureRoot();
    const created = await createDeck(rootDir, { name: 'Text Export Test', description: 'Useful at the table.' });

    await saveDeck(rootDir, {
      metadata: created.metadata,
      entries: [
        { deckId: created.metadata.deckId, section: 'main', count: 4, setCode: 'AAA', cardId: 'AAA-001', nameSnapshot: 'Alpha Adept' },
        { deckId: created.metadata.deckId, section: 'side', count: 2, setCode: 'BBB', cardId: 'BBB-001', nameSnapshot: 'Beta Relic' },
        { deckId: created.metadata.deckId, section: 'maybe', count: 1, setCode: 'AAA', cardId: 'AAA-001', nameSnapshot: 'Alpha Adept' }
      ]
    });

    const result = await exportDeckPlainText(rootDir, created.metadata.deckId);

    assert.equal(result.filename, 'text-export-test.txt');
    assert.match(result.content, /Main\n4 Alpha Adept/);
    assert.match(result.content, /Sideboard\n2 Beta Relic/);
    assert.match(result.content, /Maybeboard\n1 Alpha Adept/);
  });

  it('exports Cockatrice .cod decks with main and side zones', async () => {
    const rootDir = await createFixtureRoot();
    const created = await createDeck(rootDir, { name: 'Cockatrice Export Test' });

    await saveDeck(rootDir, {
      metadata: created.metadata,
      entries: [
        { deckId: created.metadata.deckId, section: 'main', count: 4, setCode: 'AAA', cardId: 'AAA-001', nameSnapshot: 'Alpha Adept' },
        { deckId: created.metadata.deckId, section: 'side', count: 2, setCode: 'BBB', cardId: 'BBB-001', nameSnapshot: 'Beta Relic' },
        { deckId: created.metadata.deckId, section: 'maybe', count: 1, setCode: 'AAA', cardId: 'AAA-001', nameSnapshot: 'Alpha Adept' }
      ]
    });

    const result = await exportDeckCockatrice(rootDir, created.metadata.deckId);
    const parsed = new XMLParser({ ignoreAttributes: false }).parse(result.content);
    const zones = parsed.cockatrice_deck.zone;

    assert.equal(result.filename, 'cockatrice-export-test.cod');
    assert.equal(parsed.cockatrice_deck.deckname, 'Cockatrice Export Test');
    assert.equal(zones[0]['@_name'], 'main');
    assert.equal(zones[0].card['@_number'], '4');
    assert.equal(zones[0].card['@_name'], 'Alpha Adept');
    assert.equal(zones[1]['@_name'], 'side');
    assert.equal(zones[1].card['@_name'], 'Beta Relic');
    assert.equal(result.content.includes('Maybeboard'), false);
  });
});

async function createFixtureRoot(): Promise<string> {
  const rootDir = await mkdtemp(join(tmpdir(), 'homebrew-forge-decks-'));
  await writeSet(rootDir, 'AAA', 'Alpha Set', 'Alpha Adept', 'Creature - Wizard');
  await writeSet(rootDir, 'BBB', 'Beta Set', 'Beta Relic', 'Artifact');
  return rootDir;
}

async function writeSet(rootDir: string, setCode: string, setName: string, cardName: string, typeLine: string): Promise<void> {
  const setDir = join(rootDir, 'sets', setCode);
  await mkdir(setDir, { recursive: true });
  await writeFile(
    join(setDir, 'sets.csv'),
    `${writeCsvRecords(
      [
        {
          set_code: setCode,
          set_name: setName,
          set_type: 'custom',
          version: '0.1.0',
          default_language: 'en',
          default_asset_pack: 'debug',
          default_export_profile: 'cockatrice',
          author: 'Test',
          status: 'draft',
          notes: ''
        }
      ],
      ['set_code', 'set_name', 'set_type', 'version', 'default_language', 'default_asset_pack', 'default_export_profile', 'author', 'status', 'notes']
    )}\n`,
    'utf8'
  );
  await writeFile(
    join(setDir, 'cards.csv'),
    `${writeCsvRecords(
      [
        {
          card_id: `${setCode}-001`,
          set_code: setCode,
          collector_number: '001',
          name: cardName,
          layout: 'normal',
          mode: 'custom',
          source_card_name: '',
          source_set_code: '',
          rarity: 'common',
          color_identity: '',
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
    `${writeCsvRecords(
      [
        {
          card_id: `${setCode}-001`,
          face_index: '0',
          face_name: cardName,
          mana_cost: '',
          type_line: typeLine,
          oracle_text: '',
          flavor_text: '',
          power: '',
          toughness: '',
          loyalty: '',
          defense: '',
          colors: '',
          frame_type: 'normal',
          art_id: '',
          artist_display: '',
          watermark: '',
          rules_text_size_hint: 'auto',
          rules_text_padding_top: '',
          rules_text_padding_right: '',
          rules_text_padding_bottom: '',
          rules_text_padding_left: '',
          layout_variant: 'normal'
        }
      ],
      ['card_id', 'face_index', 'face_name', 'mana_cost', 'type_line', 'oracle_text', 'flavor_text', 'power', 'toughness', 'loyalty', 'defense', 'colors', 'frame_type', 'art_id', 'artist_display', 'watermark', 'rules_text_size_hint', 'rules_text_padding_top', 'rules_text_padding_right', 'rules_text_padding_bottom', 'rules_text_padding_left', 'layout_variant']
    )}\n`,
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
}

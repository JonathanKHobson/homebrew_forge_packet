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
  importDeck,
  listDecks,
  readDeckState,
  saveDeck
} from '../src/decks/deckStore.js';
import type { DeckEntry } from '../src/decks/deckModel.js';

describe('Deck storage and export', () => {
  it('round-trips deck metadata and entries through local deck files', async () => {
    const rootDir = await createFixtureRoot();
    const created = await createDeck(rootDir, {
      name: 'Cross Set Test',
      linkedSetCode: 'AAA',
      format: 'Commander',
      playStyleTags: ['Midrange', 'Tokens'],
      colorIdentity: 'WU',
      commander: { setCode: 'AAA', cardId: 'AAA-001', variantId: 'AAA-001-V1', nameSnapshot: 'Alpha Adept' },
      commanderBracket: 'Bracket 3 - Upgraded'
    });
    const entries: DeckEntry[] = [
      { deckId: created.metadata.deckId, section: 'main', count: 2, setCode: 'AAA', cardId: 'AAA-001', variantId: 'AAA-001-V1', nameSnapshot: 'Alpha Adept' },
      { deckId: created.metadata.deckId, section: 'side', count: 1, setCode: 'BBB', cardId: 'BBB-001', nameSnapshot: 'Beta Relic' }
    ];

    await saveDeck(rootDir, { metadata: created.metadata, entries });
    const loaded = await readDeckState(rootDir, created.metadata.deckId);
    const csv = await readFile(join(rootDir, 'decks', created.metadata.deckId, 'entries.csv'), 'utf8');

    assert.equal(loaded.metadata.name, 'Cross Set Test');
    assert.equal(loaded.metadata.format, 'Commander');
    assert.deepEqual(loaded.metadata.playStyleTags, ['Midrange', 'Tokens']);
    assert.equal(loaded.metadata.colorIdentity, 'WU');
    assert.deepEqual(loaded.metadata.commander, { setCode: 'AAA', cardId: 'AAA-001', variantId: 'AAA-001-V1', nameSnapshot: 'Alpha Adept' });
    assert.deepEqual(loaded.metadata.coverCard, { setCode: 'AAA', cardId: 'AAA-001', variantId: 'AAA-001-V1', nameSnapshot: 'Alpha Adept' });
    assert.equal(loaded.metadata.commanderBracket, 'Bracket 3 - Upgraded');
    assert.equal(loaded.entries.length, 2);
    assert.equal(loaded.entries[1]?.card?.name, 'Beta Relic');
    assert.match(csv, /deck_id,entry_id,deck_variant_id,section,count,set_code,card_id,variant_id,name_snapshot,candidate_status/);
    assert.match(csv, /AAA-001-V1/);
  });

  it('stores deck variants, candidate metadata, and exports only the active build', async () => {
    const rootDir = await createFixtureRoot();
    const created = await createDeck(rootDir, { name: 'Variant Test', format: 'Commander', colorIdentity: 'WU' });
    const now = new Date().toISOString();
    const metadata = {
      ...created.metadata,
      activeVariantId: 'testing-build',
      variants: [
        ...created.metadata.variants,
        {
          deckId: created.metadata.deckId,
          variantId: 'testing-build',
          name: 'Testing Build',
          status: 'testing' as const,
          colorIdentity: 'U',
          partnerCommanders: [],
          tags: ['tempo'],
          notes: 'Variant notes',
          createdAt: now,
          updatedAt: now
        }
      ]
    };
    const entries: DeckEntry[] = [
      {
        deckId: created.metadata.deckId,
        entryId: 'default-alpha',
        deckVariantId: 'default',
        section: 'main',
        count: 1,
        setCode: 'AAA',
        cardId: 'AAA-001',
        nameSnapshot: 'Alpha Adept',
        roles: ['Draw'],
        roleSource: 'manual',
        impactRating: 4,
        entryTags: ['core'],
        starred: true
      },
      {
        deckId: created.metadata.deckId,
        entryId: 'testing-beta',
        deckVariantId: 'testing-build',
        section: 'main',
        count: 2,
        setCode: 'BBB',
        cardId: 'BBB-001',
        nameSnapshot: 'Beta Relic',
        candidateStatus: 'active'
      },
      {
        deckId: created.metadata.deckId,
        entryId: 'testing-alpha-candidate',
        deckVariantId: 'testing-build',
        section: 'maybe',
        count: 1,
        setCode: 'AAA',
        cardId: 'AAA-001',
        nameSnapshot: 'Alpha Adept',
        candidateStatus: 'candidate',
        entryNotes: 'Try after cuts'
      }
    ];

    await saveDeck(rootDir, { metadata, entries });
    const loaded = await readDeckState(rootDir, created.metadata.deckId);
    const textExport = await exportDeckPlainText(rootDir, created.metadata.deckId);
    const csv = await readFile(join(rootDir, 'decks', created.metadata.deckId, 'entries.csv'), 'utf8');

    assert.equal(loaded.activeVariantId, 'testing-build');
    assert.equal(loaded.activeVariant.name, 'Testing Build');
    assert.equal(loaded.metadata.variants.length, 2);
    assert.equal(loaded.entries.find((entry) => entry.entryId === 'default-alpha')?.roleSource, 'manual');
    assert.equal(loaded.entries.find((entry) => entry.entryId === 'testing-alpha-candidate')?.candidateStatus, 'candidate');
    assert.match(csv, /testing_alpha_candidate|testing-alpha-candidate/);
    assert.match(textExport.content, /Main\n2 Beta Relic/);
    assert.doesNotMatch(textExport.content, /Alpha Adept/);
  });

  it('applies local role dataset rows before heuristics', async () => {
    const rootDir = await createFixtureRoot();
    await mkdir(join(rootDir, 'reference'), { recursive: true });
    await writeFile(
      join(rootDir, 'reference', 'deck_roles.csv'),
      `${writeCsvRecords(
        [
          {
            card_name: 'Beta Relic',
            roles: 'Tutor|Utility',
            source: 'test-dataset',
            confidence: '0.91',
            notes: 'Fixture override'
          }
        ],
        ['card_name', 'roles', 'source', 'confidence', 'notes']
      )}\n`,
      'utf8'
    );
    const created = await createDeck(rootDir, { name: 'Role Dataset Test' });
    await saveDeck(rootDir, {
      metadata: created.metadata,
      entries: [
        { deckId: created.metadata.deckId, section: 'main', count: 1, setCode: 'BBB', cardId: 'BBB-001', nameSnapshot: 'Beta Relic' }
      ]
    });

    const deck = await readDeckState(rootDir, created.metadata.deckId);
    const entry = deck.entries[0];

    assert.deepEqual(entry?.roles, ['tutor', 'utility']);
    assert.equal(entry?.roleSource, 'external_dataset');
    assert.equal(entry?.roleConfidence, 0.91);
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
    assert.match(deck.entries[1]?.warning ?? '', /Could not resolve Lost Card \(ZZZ\/ZZZ-404\)/);
  });

  it('resolves collection-backed official print rows without warning spam', async () => {
    const rootDir = await createFixtureRoot();
    await writeCollectionCard(rootDir);
    const created = await createDeck(rootDir, {
      name: 'Collection Resolve Test',
      commander: { setCode: 'MH2', cardId: 'official-squirrel-id', nameSnapshot: 'Chatterfang, Squirrel General' }
    });

    await saveDeck(rootDir, {
      metadata: created.metadata,
      entries: [
        { deckId: created.metadata.deckId, section: 'main', count: 1, setCode: 'MH2', cardId: 'official-squirrel-id', nameSnapshot: 'Chatterfang, Squirrel General' }
      ]
    });

    const deck = await readDeckState(rootDir, created.metadata.deckId);
    const summaries = await listDecks(rootDir);

    assert.equal(deck.warnings.length, 0);
    assert.equal(deck.entries[0]?.card?.source, 'collection');
    assert.equal(deck.entries[0]?.card?.manaValue, 4);
    assert.equal(deck.entries[0]?.card?.imageUris?.normal, 'https://cards.example/chatterfang-normal.jpg');
    assert.equal(summaries[0]?.coverImageUrl, 'https://cards.example/chatterfang-normal.jpg');
  });

  it('exports grouped plain text decklists', async () => {
    const rootDir = await createFixtureRoot();
    const created = await createDeck(rootDir, { name: 'Text Export Test', description: 'Useful at the table.' });

    await saveDeck(rootDir, {
      metadata: created.metadata,
      entries: [
        { deckId: created.metadata.deckId, section: 'main', count: 4, setCode: 'AAA', cardId: 'AAA-001', variantId: 'AAA-001-V2', nameSnapshot: 'Alpha Adept' },
        { deckId: created.metadata.deckId, section: 'side', count: 2, setCode: 'BBB', cardId: 'BBB-001', nameSnapshot: 'Beta Relic' },
        { deckId: created.metadata.deckId, section: 'maybe', count: 1, setCode: 'AAA', cardId: 'AAA-001', nameSnapshot: 'Alpha Adept' }
      ]
    });

    const result = await exportDeckPlainText(rootDir, created.metadata.deckId);

    assert.equal(result.filename, 'text-export-test.txt');
    assert.match(result.content, /Main\n4 Alpha Adept \(Playtest Variant\)/);
    assert.match(result.content, /Sideboard\n2 Beta Relic/);
    assert.match(result.content, /Maybeboard\n1 Alpha Adept/);
  });

  it('exports Cockatrice .cod decks with main and side zones', async () => {
    const rootDir = await createFixtureRoot();
    const created = await createDeck(rootDir, { name: 'Cockatrice Export Test' });

    await saveDeck(rootDir, {
      metadata: created.metadata,
      entries: [
        { deckId: created.metadata.deckId, section: 'main', count: 4, setCode: 'AAA', cardId: 'AAA-001', variantId: 'AAA-001-V2', nameSnapshot: 'Alpha Adept' },
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
    assert.equal(zones[0].card['@_name'], 'Alpha Adept (Playtest Variant)');
    assert.equal(zones[1]['@_name'], 'side');
    assert.equal(zones[1].card['@_name'], 'Beta Relic');
    assert.equal(result.content.includes('Maybeboard'), false);
  });

  it('imports markdown decklists and preserves unresolved rows', async () => {
    const rootDir = await createFixtureRoot();
    const result = await importDeck(rootDir, {
      sourceFormat: 'markdown',
      mode: 'create',
      content: [
        '# Imported Tempo',
        '',
        '## Main',
        '4 Alpha Adept (Playtest Variant)',
        '',
        '## Sideboard',
        '2 Beta Relic',
        '',
        '## Maybeboard',
        '1 Unknown Spell'
      ].join('\n')
    });

    assert.equal(result.summary.name, 'Imported Tempo');
    assert.equal(result.summary.importedEntries, 3);
    assert.equal(result.summary.unresolvedCount, 1);
    assert.equal(result.deck?.entries[0]?.variantId, 'AAA-001-V2');
    assert.equal(result.deck?.entries[2]?.setCode, 'UNRESOLVED');
    assert.match(result.deck?.warnings.join('\n') ?? '', /Unknown Spell/);
  });

  it('imports Cockatrice .cod deck zones into deck storage', async () => {
    const rootDir = await createFixtureRoot();
    const result = await importDeck(rootDir, {
      sourceFormat: 'cockatrice',
      mode: 'create',
      content: [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<cockatrice_deck version="1">',
        '  <deckname>Cockatrice Import Test</deckname>',
        '  <zone name="main">',
        '    <card number="3" name="Alpha Adept"/>',
        '  </zone>',
        '  <zone name="side">',
        '    <card number="1" name="Beta Relic"/>',
        '  </zone>',
        '</cockatrice_deck>'
      ].join('\n')
    });

    assert.equal(result.summary.name, 'Cockatrice Import Test');
    assert.equal(result.summary.mainCount, 3);
    assert.equal(result.summary.sideCount, 1);
    assert.equal(result.deck?.entries[0]?.cardId, 'AAA-001');
    assert.equal(result.deck?.entries[1]?.section, 'side');
  });

  it('imports deck CSV rows with selected variants', async () => {
    const rootDir = await createFixtureRoot();
    const result = await importDeck(rootDir, {
      sourceFormat: 'csv',
      mode: 'create',
      name: 'CSV Import Test',
      content: writeCsvRecords(
        [
          {
            section: 'main',
            count: '4',
            set_code: 'AAA',
            card_id: 'AAA-001',
            variant_id: 'AAA-001-V2',
            name_snapshot: 'Alpha Adept'
          }
        ],
        ['section', 'count', 'set_code', 'card_id', 'variant_id', 'name_snapshot']
      )
    });

    assert.equal(result.summary.importedEntries, 1);
    assert.equal(result.deck?.entries[0]?.variantId, 'AAA-001-V2');
    const csv = await readFile(join(rootDir, 'decks', result.deck?.metadata.deckId ?? '', 'entries.csv'), 'utf8');
    assert.match(csv, /AAA-001-V2/);
  });
});

async function writeCollectionCard(rootDir: string): Promise<void> {
  const collectionDir = join(rootDir, 'collections', 'owned-squirrels');
  await mkdir(collectionDir, { recursive: true });
  await writeFile(
    join(collectionDir, 'metadata.json'),
    `${JSON.stringify({
      collectionId: 'owned-squirrels',
      name: 'Owned Squirrels',
      gameId: 'mtg',
      purpose: 'owned',
      source: 'generic'
    }, null, 2)}\n`,
    'utf8'
  );
  await writeFile(
    join(collectionDir, 'entries.csv'),
    `${writeCsvRecords(
      [
        {
          collection_id: 'owned-squirrels',
          entry_id: 'owned-squirrels-001',
          quantity: '1',
          card_name: 'Chatterfang, Squirrel General',
          set_code: 'MH2',
          set_name: 'Modern Horizons 2',
          collector_number: '151',
          scryfall_id: 'official-squirrel-id',
          finish: 'Nonfoil',
          condition: 'Near Mint',
          language: 'English',
          location: 'Commander',
          source: 'generic',
          source_row: JSON.stringify({
            enrichment: {
              source: 'scryfall',
              name: 'Chatterfang, Squirrel General',
              scryfall_uri: 'https://scryfall.example/chatterfang',
              image_uris: {
                normal: 'https://cards.example/chatterfang-normal.jpg'
              },
              mana_cost: '{2}{B}{G}',
              mana_value: 4,
              type_line: 'Legendary Creature - Squirrel Warrior',
              oracle_text: 'Forestwalk',
              colors: ['B', 'G'],
              color_identity: ['B', 'G'],
              rarity: 'rare'
            }
          }),
          match_key: 'official-squirrel-id',
          match_strategy: 'scryfall_id',
          review_status: 'matched',
          review_notes: '',
          linked_set_code: '',
          linked_card_id: '',
          linked_variant_id: '',
          preview_art_source: 'scryfall'
        }
      ],
      ['collection_id', 'entry_id', 'quantity', 'card_name', 'set_code', 'set_name', 'collector_number', 'scryfall_id', 'finish', 'condition', 'language', 'location', 'source', 'source_row', 'match_key', 'match_strategy', 'review_status', 'review_notes', 'linked_set_code', 'linked_card_id', 'linked_variant_id', 'preview_art_source']
    )}\n`,
    'utf8'
  );
}

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
  await writeFile(
    join(setDir, 'card_variants.csv'),
    `${writeCsvRecords(
      [
        {
          variant_id: `${setCode}-001-V1`,
          card_id: `${setCode}-001`,
          display_name: 'Variant 1',
          kind: 'mechanics_test',
          status: 'active',
          is_primary: 'true',
          export_policy: 'default',
          tags: '',
          notes: '',
          created_at: '',
          updated_at: ''
        },
        {
          variant_id: `${setCode}-001-V2`,
          card_id: `${setCode}-001`,
          display_name: 'Playtest Variant',
          kind: 'wording_test',
          status: 'testing',
          is_primary: 'false',
          export_policy: 'optional',
          tags: '',
          notes: '',
          created_at: '',
          updated_at: ''
        }
      ],
      ['variant_id', 'card_id', 'display_name', 'kind', 'status', 'is_primary', 'export_policy', 'tags', 'notes', 'created_at', 'updated_at']
    )}\n`,
    'utf8'
  );
  await writeFile(
    join(setDir, 'card_variant_faces.csv'),
    `${writeCsvRecords(
      [
        {
          variant_id: `${setCode}-001-V1`,
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
          rules_text_reminder_mode: 'auto',
          layout_variant: 'normal'
        },
        {
          variant_id: `${setCode}-001-V2`,
          card_id: `${setCode}-001`,
          face_index: '0',
          face_name: cardName,
          mana_cost: '',
          type_line: typeLine,
          oracle_text: 'Playtest wording.',
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
          rules_text_reminder_mode: 'auto',
          layout_variant: 'normal'
        }
      ],
      ['variant_id', 'card_id', 'face_index', 'face_name', 'mana_cost', 'type_line', 'oracle_text', 'flavor_text', 'power', 'toughness', 'loyalty', 'defense', 'colors', 'frame_type', 'art_id', 'artist_display', 'watermark', 'rules_text_size_hint', 'rules_text_padding_top', 'rules_text_padding_right', 'rules_text_padding_bottom', 'rules_text_padding_left', 'rules_text_reminder_mode', 'layout_variant']
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

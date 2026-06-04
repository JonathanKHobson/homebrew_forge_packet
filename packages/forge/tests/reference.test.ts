import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildReferenceCatalog,
  createReferenceTermFromRequest,
  defaultReferenceCatalog,
  extractReferenceLinks,
  lintRulesText,
  mergeReferenceCatalogs,
  referenceOptionsForCategory,
  searchReferenceTerms,
  termsForTrigger,
  type ReferenceSeedRow
} from '../src/reference/catalog.js';
import { buildReferenceDiff, readOfficialReferenceSnapshot, writeOfficialReferenceSnapshot } from '../src/reference/officialStore.js';
import { createProjectReference, customReferenceFilePath, loadProjectReferenceCatalog } from '../src/reference/referenceStore.js';
import { extractCounterNamesFromText, parseComprehensiveRulesText, termsFromRulesCatalog } from '../src/reference/rulesParser.js';
import { buildOfficialReferenceSnapshotFromScryfall, counterTermsFromOracleCards, tokenTermsFromScryfallCards } from '../src/reference/scryfallSync.js';

const seedRows: ReferenceSeedRow[] = [
  { sheet: 'Keyword Abilities', values: { Number: '702.9', Keyword: 'Flying', Type: 'Ability', Definition: 'Can be blocked only by creatures with flying or reach.', 'Typical Colors': 'U, W, B' } },
  { sheet: 'Keyword Actions', values: { Number: '701.18', Keyword: 'Scry N', Type: 'Action', Definition: 'Look at the top N cards of your library.', 'Typical Colors': 'U' } },
  { sheet: 'Card Types', values: { 'Card Type': 'Battle', 'One-Sentence Definition': 'A permanent that enters with a defense value.', 'Typical Components': 'Defense number; rules text.' } },
  { sheet: 'Card SubTypes', values: { Subtype: 'Equipment', 'Main type': 'Artifact', 'Short description': 'Attaches to creatures via equip.', 'Common colors': 'W/R' } },
  { sheet: 'Token Types', values: { Token: 'Treasure', Definition: 'Colorless artifact token with "{T}, Sacrifice: Add one mana of any color."', 'Typical Colors': 'All' } },
  { sheet: 'Counter Types', values: { Counter: 'Shield counters', Definition: 'If it would be destroyed or dealt damage, instead remove one.', 'Typical Colors': 'W, G' } },
  { sheet: 'Mana Colors', values: { Color: 'White ({W})', 'One-Sentence Identity': 'Order, protection, and teamwork.' } }
];

describe('reference catalog', () => {
  it('normalizes spreadsheet seed rows and current catalog values into searchable terms', () => {
    const catalog = buildReferenceCatalog({
      seedRows,
      scryfall: {
        supertypes: ['Basic', 'Legendary', 'Token'],
        cardTypes: ['Artifact', 'Battle', 'Creature', 'Kindred'],
        artifactTypes: ['Equipment', 'Vehicle'],
        creatureTypes: ['Human', 'Wizard'],
        keywordAbilities: ['Flying', 'Ward'],
        keywordActions: ['Scry', 'Mill'],
        abilityWords: ['Landfall']
      },
      homebrewTerms: [{ name: 'Metallivory', category: 'homebrew', definition: 'Replicator artifact-damage limiter.', status: 'homebrew' }]
    });

    assert.deepEqual(referenceOptionsForCategory(catalog, 'supertype'), ['Basic', 'Legendary', 'Token']);
    assert.ok(referenceOptionsForCategory(catalog, 'card-type').includes('Kindred'));
    assert.ok(referenceOptionsForCategory(catalog, 'subtype').includes('Equipment'));
    assert.ok(referenceOptionsForCategory(catalog, 'subtype').includes('Wizard'));
    assert.equal(searchReferenceTerms(catalog, 'metal')[0]?.name, 'Metallivory');
    assert.equal(searchReferenceTerms(catalog, 'flying')[0]?.source, 'drive-sheet');
  });

  it('routes rules-text trigger characters to the intended term categories', () => {
    const catalog = buildReferenceCatalog({
      seedRows,
      scryfall: {
        supertypes: ['Basic'],
        cardTypes: ['Artifact', 'Creature'],
        artifactTypes: ['Equipment'],
        creatureTypes: ['Human'],
        keywordAbilities: ['Flying'],
        keywordActions: ['Scry'],
        abilityWords: ['Landfall']
      }
    });

    assert.deepEqual(
      termsForTrigger(catalog, '@', 'fly').map((term) => term.name),
      ['Flying']
    );
    assert.deepEqual(
      termsForTrigger(catalog, '#', 'scry').map((term) => term.name),
      ['Scry']
    );
    assert.ok(termsForTrigger(catalog, ':', 'equip').some((term) => term.name === 'Equipment'));
  });

  it('keeps seeded definitions and metadata when official catalog terms are name-only', () => {
    const base = buildReferenceCatalog({
      seedRows,
      scryfall: {
        keywordAbilities: ['Flying'],
        keywordActions: ['Scry'],
        artifactTypes: ['Equipment']
      }
    });
    const official = buildReferenceCatalog({
      scryfall: {
        keywordAbilities: ['Flying'],
        keywordActions: ['Scry'],
        artifactTypes: ['Equipment']
      }
    });
    const merged = mergeReferenceCatalogs(base, official, '2026-06-03T00:00:00.000Z');
    const flying = merged.terms.find((term) => term.id === 'keyword-ability:flying');
    const scry = merged.terms.find((term) => term.id === 'keyword-action:scry');
    const equipment = merged.terms.find((term) => term.id === 'subtype:equipment');

    assert.equal(flying?.definition, 'Can be blocked only by creatures with flying or reach.');
    assert.equal(flying?.details?.ruleNumber, '702.9');
    assert.equal(scry?.definition, 'Look at the top N cards of your library.');
    assert.equal(scry?.details?.ruleNumber, '701.18');
    assert.equal(equipment?.definition, 'Attaches to creatures via equip.');
    assert.equal(equipment?.details?.parentType, 'Artifact');
  });

  it('fills baseline catalog metadata without replacing richer seeded definitions', () => {
    const catalog = defaultReferenceCatalog();
    const missing = catalog.terms.filter((term) => !term.definition);
    const scry = catalog.terms.find((term) => term.id === 'keyword-action:scry');
    const subtype = catalog.terms.find((term) => term.id === 'subtype:nicol-bolas');

    assert.deepEqual(missing.map((term) => term.id), []);
    assert.equal(scry?.name, 'Scry');
    assert.equal(scry?.definition, 'Look at the top N cards of your library; put any number on the bottom and the rest on top in any order.');
    assert.equal(subtype?.definition, 'A planeswalker subtype.');
  });

  it('extracts concrete reference and card links from card text', () => {
    const catalog = buildReferenceCatalog({
      seedRows,
      scryfall: {
        supertypes: ['Legendary'],
        cardTypes: ['Artifact', 'Creature'],
        artifactTypes: ['Equipment'],
        creatureTypes: ['Human'],
        keywordAbilities: ['Flying'],
        keywordActions: ['Scry'],
        abilityWords: ['Landfall']
      },
      homebrewTerms: [{ name: 'Metallivory', category: 'homebrew', definition: 'Replicator artifact-damage limiter.', status: 'homebrew' }]
    });

    const links = extractReferenceLinks({
      catalog,
      textByField: {
        oracleText: 'Flying\nScry 2, then attach this to Gate Room Sentinel.',
        typeLine: 'Legendary Artifact - Equipment'
      },
      cards: [{ id: 'SG1-001', name: 'Gate Room Sentinel', typeLine: 'Creature - Soldier' }]
    });

    assert.ok(links.some((link) => link.id === 'keyword-ability:flying' && link.matchedText === 'Flying'));
    assert.ok(links.some((link) => link.id === 'keyword-action:scry' && link.matchedText === 'Scry'));
    assert.ok(links.some((link) => link.id === 'subtype:equipment' && link.sourceField === 'typeLine'));
    assert.ok(links.some((link) => link.kind === 'card' && link.id === 'SG1-001'));

    const noisyLinks = extractReferenceLinks({
      catalog: {
        ...catalog,
        terms: [
          ...catalog.terms,
          createReferenceTermFromRequest({ name: 'Age counters', category: 'counter', source: 'scryfall-oracle', origin: 'official', aliases: ['ALL', 'WHO'] })
        ]
      },
      textByField: { flavorText: 'We march for all who cannot.' }
    });
    assert.equal(noisyLinks.some((link) => link.label === 'Age counters'), false);
  });

  it('reports focused non-blocking rules text findings', () => {
    const catalog = buildReferenceCatalog({
      seedRows,
      scryfall: {
        supertypes: ['Basic'],
        cardTypes: ['Artifact', 'Battle', 'Creature', 'Enchantment'],
        artifactTypes: ['Equipment', 'Vehicle'],
        enchantmentTypes: ['Aura'],
        keywordAbilities: ['Flying'],
        keywordActions: ['Scry'],
        abilityWords: []
      }
    });

    const findings = lintRulesText(
      {
        name: 'Loose Sword',
        typeLine: 'Artifact - Equipment',
        cardTypes: ['Artifact'],
        subtypes: 'Equipment',
        oracleText: 'Flying'
      },
      catalog
    );

    assert.equal(findings.find((finding) => finding.ruleId === 'equipment-has-attachment')?.severity, 'warning');
    assert.equal(findings.find((finding) => finding.ruleId === 'unknown-term'), undefined);
  });

  it('normalizes local reference creation requests with draft/final metadata', () => {
    const term = createReferenceTermFromRequest({
      name: '  Signal Burst  ',
      category: 'keyword-action',
      definition: 'Reveal the top card, then broadcast it to each opponent.',
      aliases: ['broadcast'],
      tags: ['Stargate'],
      details: { ruleNumber: '701.HF', sourceSet: 'SG1' }
    });

    assert.equal(term.id, 'keyword-action:signal-burst');
    assert.equal(term.source, 'local-custom');
    assert.equal(term.system, 'homebrew');
    assert.equal(term.origin, 'homebrew');
    assert.equal(term.workflowStatus, 'draft');
    assert.ok(term.aliases.includes('broadcast'));
    assert.equal(term.details?.ruleNumber, '701.HF');
  });

  it('saves local references separately and merges them into the project catalog', async () => {
    const root = await mkdtemp(join(tmpdir(), 'forge-reference-'));
    try {
      const result = await createProjectReference(root, {
        name: 'Signal Burst',
        category: 'keyword-action',
        origin: 'homebrew',
        status: 'homebrew',
        workflowStatus: 'final',
        definition: 'Reveal the top card, then broadcast it to each opponent.',
        tags: ['stargate']
      });

      assert.equal(result.term.workflowStatus, 'final');
      assert.equal(searchReferenceTerms(result.catalog, 'signal burst')[0]?.name, 'Signal Burst');
      const saved = JSON.parse(await readFile(customReferenceFilePath(root), 'utf8')) as { terms: Array<{ name: string }> };
      assert.deepEqual(saved.terms.map((term) => term.name), ['Signal Burst']);

      const reloaded = loadProjectReferenceCatalog(root);
      assert.equal(searchReferenceTerms(reloaded, 'signal burst')[0]?.source, 'local-custom');

      await assert.rejects(
        () => createProjectReference(root, { name: 'Signal Burst', category: 'keyword-action' }),
        /already exists/
      );
      await assert.rejects(
        () => createProjectReference(root, { name: 'Flying', category: 'keyword-ability' }),
        /already exists/
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('canonicalizes Scryfall token cards and disambiguates duplicate token names', () => {
    const terms = tokenTermsFromScryfallCards(
      [
        {
          name: 'Pest',
          layout: 'token',
          type_line: 'Token Creature — Pest',
          oracle_text: 'When this creature dies, you gain 1 life.',
          colors: ['B', 'G'],
          power: '1',
          toughness: '1',
          set: 'tsoc',
          scryfall_uri: 'https://scryfall.com/card/tsoc/pest'
        },
        {
          name: 'Pest',
          layout: 'token',
          type_line: 'Token Creature — Pest',
          oracle_text: 'Whenever this token attacks, you gain 1 life.',
          colors: ['B', 'G'],
          power: '1',
          toughness: '1',
          set: 'tsos'
        },
        {
          name: 'Treasure',
          layout: 'token',
          type_line: 'Token Artifact — Treasure',
          oracle_text: '{T}, Sacrifice this artifact: Add one mana of any color.',
          set: 'tneo'
        }
      ],
      '2026-06-03T00:00:00.000Z'
    );

    assert.equal(terms.filter((term) => term.name.startsWith('Pest')).length, 2);
    assert.ok(terms.some((term) => term.name === 'Treasure'));
    assert.ok(terms.find((term) => term.name.startsWith('Pest'))?.aliases.includes('Pest'));
  });

  it('stages oracle-scanned counter candidates for review', () => {
    const terms = counterTermsFromOracleCards(
      [
        {
          name: 'Adaptive Trainer',
          oracle_text: 'Put a training counter on target creature. Then put a +1/+1 counter on it.',
          set: 'abc'
        }
      ],
      '2026-06-03T00:00:00.000Z'
    );

    assert.ok(terms.some((term) => term.name === '+1/+1 counters'));
    assert.ok(terms.some((term) => term.name === 'Training counters'));
    assert.ok(terms.every((term) => term.workflowStatus === 'draft'));
    assert.ok(terms.every((term) => term.tags.includes('review-needed')));
  });

  it('parses Comprehensive Rules sections, glossary entries, and rules-backed terms', () => {
    const text = `Magic: The Gathering Comprehensive Rules

These rules are effective as of April 17, 2026.

Contents

1. Game Concepts
111. Tokens
122. Counters
701. Keyword Actions
702. Keyword Abilities
Glossary
Credits

1. Game Concepts

111. Tokens

111.10. Some effects instruct a player to create a predefined token.

111.10a A Treasure token is a colorless Treasure artifact token with "{T}, Sacrifice this token: Add one mana of any color."

122. Counters

122.1c One or more shield counters on a permanent create a single replacement effect.

701.4. Behold

701.4a "Behold a [quality]" means "Reveal a [quality] card from your hand."

702.9. Flying

702.9a Flying is an evasion ability.

Glossary

Flying
A keyword ability that restricts blocking.

Treasure Token
A Treasure token is a predefined token.

Credits`;
    const rules = parseComprehensiveRulesText(text, { sourceUrl: 'https://example.test/rules.txt', fetchedAt: '2026-06-03T00:00:00.000Z' });
    const terms = termsFromRulesCatalog(rules);

    assert.equal(rules.effectiveDate, 'April 17, 2026');
    assert.ok(rules.entries.some((entry) => entry.id === 'rule:111.10a' && entry.kind === 'predefined-token'));
    assert.ok(rules.entries.some((entry) => entry.id === 'glossary:flying'));
    assert.ok(terms.some((term) => term.name === 'Treasure'));
    assert.ok(terms.some((term) => term.name === 'Shield counters'));
    assert.deepEqual(extractCounterNamesFromText('Put a lore counter and two stun counters on it.'), ['Lore counters', 'Stun counters']);
  });

  it('enriches official catalog terms from current rules and seeded metadata instead of emitting name-only terms', () => {
    const rules = parseComprehensiveRulesText(
      `Magic: The Gathering Comprehensive Rules

These rules are effective as of April 17, 2026.

Contents

701. Keyword Actions
702. Keyword Abilities
Glossary
Credits

701. Keyword Actions

701.22. Scry

701.22a To "scry N" means to look at the top N cards of your library, then put any number of them on the bottom of your library in any order and the rest on top in any order.

702. Keyword Abilities

702.9. Flying

702.9a Flying is an evasion ability.

Glossary

Flying
A keyword ability that restricts how a creature may be blocked. See rule 702.9, "Flying."

Equipment
An artifact subtype. Equipment can be attached to creatures. See rule 301, "Artifacts," and rule 702.6, "Equip."

Scry
To manipulate some of the cards on top of your library. See rule 701.22, "Scry."

Credits`,
      { sourceUrl: 'https://example.test/rules.txt', fetchedAt: '2026-06-03T00:00:00.000Z' }
    );
    const current = buildReferenceCatalog({
      seedRows,
      scryfall: {
        keywordAbilities: ['Flying'],
        keywordActions: ['Scry'],
        artifactTypes: ['Equipment']
      }
    });
    const snapshot = buildOfficialReferenceSnapshotFromScryfall({
      inputs: {
        fetchedAt: '2026-06-03T00:00:00.000Z',
        catalogSeed: {
          keywordAbilities: ['Flying'],
          keywordActions: ['Scry'],
          artifactTypes: ['Equipment']
        },
        tokenCards: [],
        counterCards: [],
        sourceSnapshots: []
      },
      currentTerms: current.terms,
      rulesCatalog: rules,
      generatedAt: '2026-06-03T00:00:00.000Z'
    });
    const flying = snapshot.terms.find((term) => term.id === 'keyword-ability:flying');
    const scry = snapshot.terms.find((term) => term.id === 'keyword-action:scry');
    const equipment = snapshot.terms.find((term) => term.id === 'subtype:equipment');

    assert.equal(flying?.definition, 'A keyword ability that restricts how a creature may be blocked. See rule 702.9, "Flying."');
    assert.equal(flying?.details?.ruleNumber, '702.9');
    assert.equal(scry?.definition, 'To manipulate some of the cards on top of your library. See rule 701.22, "Scry."');
    assert.equal(scry?.details?.ruleNumber, '701.22');
    assert.equal(equipment?.definition, 'An artifact subtype. Equipment can be attached to creatures. See rule 301, "Artifacts," and rule 702.6, "Equip."');
    assert.equal(equipment?.details?.parentType, 'Artifact');
  });

  it('imports printed card reminder text separately from rules definitions', () => {
    const rules = parseComprehensiveRulesText(
      `Magic: The Gathering Comprehensive Rules

These rules are effective as of April 17, 2026.

Contents

702. Keyword Abilities
Glossary
Credits

702. Keyword Abilities

702.2. Deathtouch

702.2a Deathtouch is a static ability.

Glossary

Deathtouch
A keyword ability that causes damage dealt by an object to be especially effective. See rule 702.2, "Deathtouch."

Credits`,
      { sourceUrl: 'https://example.test/rules.txt', fetchedAt: '2026-06-03T00:00:00.000Z' }
    );
    const snapshot = buildOfficialReferenceSnapshotFromScryfall({
      inputs: {
        fetchedAt: '2026-06-03T00:00:00.000Z',
        catalogSeed: {
          keywordAbilities: ['Deathtouch']
        },
        tokenCards: [],
        counterCards: [],
        printedTextCards: [
          {
            name: 'Typhoid Rats',
            text: 'Deathtouch (Any amount of damage this deals to a creature is enough to destroy it.)',
            set: 'm21'
          }
        ],
        sourceSnapshots: []
      },
      currentTerms: [],
      rulesCatalog: rules,
      generatedAt: '2026-06-03T00:00:00.000Z'
    });
    const deathtouch = snapshot.terms.find((term) => term.id === 'keyword-ability:deathtouch');

    assert.equal(deathtouch?.definition, 'A keyword ability that causes damage dealt by an object to be especially effective. See rule 702.2, "Deathtouch."');
    assert.equal(deathtouch?.reminderText, 'Any amount of damage this deals to a creature is enough to destroy it.');
  });

  it('reports reference additions, removals, changes, and review-needed terms', () => {
    const before = [
      createReferenceTermFromRequest({ name: 'Flying', category: 'keyword-ability', origin: 'official', source: 'scryfall-catalog', workflowStatus: 'final', definition: 'Old text.' }, '2026-06-01T00:00:00.000Z'),
      createReferenceTermFromRequest({ name: 'Retired Thing', category: 'keyword-action', origin: 'official', source: 'scryfall-catalog', workflowStatus: 'final' }, '2026-06-01T00:00:00.000Z')
    ];
    const after = [
      createReferenceTermFromRequest({ name: 'Flying', category: 'keyword-ability', origin: 'official', source: 'scryfall-catalog', workflowStatus: 'final', definition: 'New text.' }, '2026-06-03T00:00:00.000Z'),
      createReferenceTermFromRequest({ name: 'Training counters', category: 'counter', origin: 'official', source: 'scryfall-oracle', workflowStatus: 'draft', tags: ['review-needed'] }, '2026-06-03T00:00:00.000Z')
    ];
    const diff = buildReferenceDiff(before, after);

    assert.equal(diff.added.length, 1);
    assert.equal(diff.changed.length, 1);
    assert.equal(diff.removed.length, 1);
    assert.equal(diff.reviewNeeded.length, 1);
  });

  it('loads official snapshots before local custom references', async () => {
    const root = await mkdtemp(join(tmpdir(), 'forge-official-reference-'));
    try {
      const officialTerm = createReferenceTermFromRequest(
        {
          name: 'Walrus',
          category: 'subtype',
          origin: 'official',
          source: 'scryfall-catalog',
          tags: ['creature']
        },
        '2026-06-03T00:00:00.000Z'
      );
      await writeOfficialReferenceSnapshot(
        root,
        {
          version: 1,
          updatedAt: '2026-06-03T00:00:00.000Z',
          generatedAt: '2026-06-03T00:00:00.000Z',
          terms: [officialTerm],
          sourceSnapshots: []
        },
        false
      );
      await createProjectReference(root, {
        name: 'Walrus',
        category: 'homebrew',
        definition: 'A local faction term that should not collide across categories.'
      });

      const loaded = loadProjectReferenceCatalog(root);
      assert.ok(loaded.terms.some((term) => term.category === 'subtype' && term.name === 'Walrus'));
      assert.ok(loaded.terms.some((term) => term.category === 'homebrew' && term.name === 'Walrus'));
      assert.ok(readOfficialReferenceSnapshot(root)?.terms.some((term) => term.name === 'Walrus'));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

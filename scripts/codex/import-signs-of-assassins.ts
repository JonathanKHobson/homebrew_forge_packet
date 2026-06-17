import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  COLLECTION_ENTRY_HEADERS,
  DECK_ENTRY_HEADERS,
  collectionEntrySchema,
  collectionMetadataSchema,
  deckEntrySchema,
  deckMetadataSchema,
  deckVariantSchema,
  importCollectionCsv,
  officialCardCatalogStatus,
  parseCsvRecords,
  readCollectionState,
  saveCollection,
  saveDeck,
  writeCsvRecords,
  type CollectionEntry,
  type CollectionMetadata,
  type DeckEntry,
  type DeckVariant
} from '../../packages/forge/src/index.ts';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '../..');
const SOURCE_CSV = '/Users/kyle/Documents/My Games/Magic The Gathering/own cards to import/assassin cards for assassin deck.csv';

const PROJECT_ID = 'assassin-deck-candidates';
const PROJECT_NAME = 'Signs of Assassins';
const SET_CODE = 'SOA';
const SET_NAME = 'Signs of Assassins';
const BINDER_ID = 'assassin-candidate-binder';
const RECOMMENDATIONS_ID = 'recommendations';
const FLAGGED_ID = 'flagged';
const DECK_ID = 'signs-of-assassins';
const OWNER_NAME = 'Kyle';
const COMMANDER_NAME = "Altaïr Ibn-La'Ahad";
const COMMANDER_SCRYFALL_ID = '358026de-ab7c-4a17-8cac-cfbee391b127';
const KASSANDRA_NAME = 'Kassandra, Eagle Bearer';
const SPEAR_NAME = 'The Spear of Leonidas';
const DECK_COLOR_IDENTITY = 'WBR';
const COMMANDER_BRACKET = 'Bracket 3 - Upgraded';
const BATCH_TAGS = ['batch-001', 'assassin', 'commander', 'mardu', 'manabox', 'signs-of-assassins'];
const ORDERED_TAGS = ['batch-002', 'ordered', 'partner-order', 'assassin', 'commander', 'mardu', 'signs-of-assassins'];
const COMMANDER_COLORS = new Set(['B', 'R', 'W']);
const BASIC_LANDS = new Set(['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes']);
const OWNED_BASIC_LAND_COUNTS: Record<string, number> = { Swamp: 7, Mountain: 5, Plains: 7 };
const BASIC_LAND_POOL_NAMES = Object.keys(OWNED_BASIC_LAND_COUNTS);
const EXTRA_OWNED_LANDS: Array<{ name: string; quantity: number; notes: string; tags: string[] }> = [
  { name: 'Evolving Wilds', quantity: 1, notes: 'Additional owned copy not captured in the ManaBox scan.', tags: ['land', 'fixing', 'duplicate-name-review'] }
];
const KNOWN_OFF_COLOR = new Set(['Chishiro, the Shattered Blade', 'Eivor, Wolf-Kissed', 'Bountiful Landscape', 'Forest']);
const DECK_PLAY_STYLE_TAGS = [
  'evasive-combat',
  'unblockable',
  'cannot-block',
  'combat-puzzle',
  'graveyard-setup',
  'exile-value',
  'assassin-typal',
  'freerunning',
  'attack-triggers',
  'mardu',
  'toolbox'
];

const SET_HEADERS = ['set_code', 'set_name', 'set_type', 'version', 'default_language', 'default_asset_pack', 'default_export_profile', 'author', 'status', 'tags', 'notes'];
const CARD_HEADERS = ['card_id', 'set_code', 'collector_number', 'name', 'layout', 'mode', 'source_card_name', 'source_set_code', 'rarity', 'color_identity', 'tags', 'status', 'print_count', 'export_name_override', 'notes'];
const FACE_HEADERS = ['card_id', 'face_index', 'face_name', 'mana_cost', 'type_line', 'oracle_text', 'flavor_text', 'power', 'toughness', 'loyalty', 'defense', 'colors', 'frame_type', 'art_id', 'artist_display', 'watermark', 'rules_text_size_hint', 'rules_text_padding_top', 'rules_text_padding_right', 'rules_text_padding_bottom', 'rules_text_padding_left', 'rules_text_reminder_mode', 'layout_variant'];
const VARIANT_HEADERS = ['variant_id', 'card_id', 'display_name', 'kind', 'status', 'is_primary', 'export_policy', 'tags', 'notes', 'created_at', 'updated_at'];
const ART_HEADERS = ['art_id', 'file_path', 'source_url', 'source_type', 'artist', 'license', 'permission_status', 'checksum_sha256', 'position_x', 'position_y', 'scale', 'crop_x', 'crop_y', 'crop_w', 'crop_h', 'notes'];
const EXPORT_HEADERS = ['profile_id', 'target', 'image_format', 'width_px', 'height_px', 'quality', 'include_bleed', 'bleed_px', 'include_crop_marks', 'include_playtest_watermark', 'watermark_text', 'allow_placeholder_art', 'filename_template'];

interface CsvRow {
  [key: string]: string | undefined;
}

interface ScryfallCard {
  id: string;
  name: string;
  set?: string;
  set_name?: string;
  collector_number?: string;
  mana_cost?: string;
  cmc?: number;
  mana_value?: number;
  type_line?: string;
  oracle_text?: string;
  flavor_text?: string;
  power?: string;
  toughness?: string;
  colors?: string[];
  color_identity?: string[];
  rarity?: string;
  lang?: string;
  finishes?: string[];
  scryfall_uri?: string;
  image_uris?: Record<string, string>;
  card_faces?: Array<Record<string, unknown>>;
  prices?: Record<string, string | null>;
}

interface Candidate {
  entry: CollectionEntry;
  card: ScryfallCard;
  owned: boolean;
  name: string;
  keyName: string;
  setCode: string;
  cardId: string;
  manaValue: number;
  typeLine: string;
  oracleText: string;
  colorIdentity: string[];
  roles: string[];
  tags: string[];
  quantity: number;
}

interface VariantDefinition {
  id: string;
  name: string;
  description: string;
  status: DeckVariant['status'];
  tags: string[];
  ownedOnly: boolean;
  landTarget: number;
  includeRecommendations: string[];
  roleWeights: Record<string, number>;
  notes: string;
}

interface PickedCard {
  candidate: Candidate;
  count: number;
}

interface MaybePickedCard extends PickedCard {
  note: string;
}

interface VariantBuild {
  main: PickedCard[];
  maybe: MaybePickedCard[];
}

const ORDERED_CARDS: Array<{ name: string; quantity?: number; notes: string; tags?: string[] }> = [
  { name: 'Apple of Eden, Isu Relic', notes: 'Incoming Assassin artifact payoff. Evaluate for exile/value and legend/artifact package slots.', tags: ['artifact', 'exile', 'payoff'] },
  { name: 'Cathartic Reunion', notes: 'Incoming graveyard setup spell. Strong for loading Assassins into the graveyard without becoming hard reanimator.', tags: ['graveyard', 'draw', 'setup'] },
  { name: 'Distract the Guards', notes: 'Incoming Assassin-flavor evasion/combat trick. Evaluate for puzzle-combat and cannot-block lines.', tags: ['evasion', 'combat', 'puzzle'] },
  { name: 'Fall of the First Civilization', notes: 'Incoming saga/value card. Evaluate for board reset, graveyard, or long-game variants.', tags: ['saga', 'wipe', 'value'] },
  { name: 'Hemlock Vial', notes: 'Incoming Assassin artifact. Evaluate as removal/protection support depending on exact rules text.', tags: ['artifact', 'removal', 'assassin'] },
  { name: 'Mjolnir, Storm Hammer', notes: 'Incoming legendary Equipment. Evaluate for Brotherhood Arsenal and Voltron-style pressure.', tags: ['equipment', 'artifact', 'finisher'] },
  { name: 'Mortify', notes: 'Incoming extra removal copy. Evaluate as an upgrade over narrower creature-only or sorcery-speed removal.', tags: ['removal', 'interaction'] },
  { name: 'Roshan, Hidden Magister', notes: 'Incoming extra Assassin copy. Evaluate for freerunning, exile, and Assassin density.', tags: ['assassin', 'exile', 'evasion'] },
  { name: "Staff of Eden, Vault's Key", notes: 'Incoming legendary artifact. Evaluate for artifact payoff, card flow, and top-end utility.', tags: ['artifact', 'draw', 'utility'] },
  { name: 'The Animus', notes: 'Incoming Assassin engine piece. Evaluate for graveyard/exile play patterns and Memory Corridor.', tags: ['artifact', 'graveyard', 'exile'] },
  { name: SPEAR_NAME, notes: 'Required partner engine with Kassandra, Eagle Bearer. Do not run Kassandra without the Spear package.', tags: ['equipment', 'artifact', 'kassandra-package', 'required-package'] },
  { name: 'Towering Viewpoint', notes: 'Incoming land/evasion support. Evaluate for freerunning, fixing, and attack setup.', tags: ['land', 'evasion', 'setup'] },
  { name: 'Yggdrasil, Rebirth Engine', notes: 'Incoming legendary artifact recursion/value engine. Evaluate carefully against the deck goal of using graveyard/exile without becoming generic reanimator.', tags: ['artifact', 'graveyard', 'recursion', 'engine'] }
];

const RECOMMENDATIONS: Array<{ name: string; roles: string[]; tags: string[]; notes: string; land?: boolean; basicCount?: number }> = [
  { name: 'Command Tower', roles: ['land', 'fixing'], tags: ['land', 'fixing', 'gap-filler'], notes: 'Commander staple fixing for Mardu variants.', land: true },
  { name: 'Nomad Outpost', roles: ['land', 'fixing'], tags: ['land', 'fixing', 'mardu'], notes: 'Budget Mardu tri-land to stabilize colors.', land: true },
  { name: 'Path of Ancestry', roles: ['land', 'fixing', 'assassin'], tags: ['land', 'fixing', 'tribal'], notes: 'Fixes commander colors and scries when casting Assassins.', land: true },
  { name: "Rogue's Passage", roles: ['land', 'evasion'], tags: ['land', 'evasion'], notes: 'Gives key attackers a direct unblockable line.', land: true },
  { name: 'Unclaimed Territory', roles: ['land', 'fixing', 'assassin'], tags: ['land', 'fixing', 'tribal'], notes: 'Tribal fixing for Assassin-heavy builds.', land: true },
  { name: 'Secluded Courtyard', roles: ['land', 'fixing', 'assassin'], tags: ['land', 'fixing', 'tribal'], notes: 'Second tribal land for Assassin density.', land: true },
  { name: 'Exotic Orchard', roles: ['land', 'fixing'], tags: ['land', 'fixing'], notes: 'Multiplayer fixing that usually covers Mardu colors.', land: true },
  { name: 'Bojuka Bog', roles: ['land', 'graveyard', 'interaction'], tags: ['land', 'graveyard', 'interaction'], notes: 'Graveyard interaction from a land slot.', land: true },
  { name: 'Caves of Koilos', roles: ['land', 'fixing'], tags: ['land', 'fixing'], notes: 'Untapped WB fixing.', land: true },
  { name: 'Battlefield Forge', roles: ['land', 'fixing'], tags: ['land', 'fixing'], notes: 'Untapped RW fixing.', land: true },
  { name: 'Sulfurous Springs', roles: ['land', 'fixing'], tags: ['land', 'fixing'], notes: 'Untapped BR fixing.', land: true },
  { name: 'Clifftop Retreat', roles: ['land', 'fixing'], tags: ['land', 'fixing'], notes: 'RW check land for a smoother mana base.', land: true },
  { name: 'Isolated Chapel', roles: ['land', 'fixing'], tags: ['land', 'fixing'], notes: 'WB check land for a smoother mana base.', land: true },
  { name: 'Dragonskull Summit', roles: ['land', 'fixing'], tags: ['land', 'fixing'], notes: 'BR check land for a smoother mana base.', land: true },
  { name: 'Temple of Malice', roles: ['land', 'fixing'], tags: ['land', 'fixing', 'selection'], notes: 'BR scry land for budget smoothing.', land: true },
  { name: 'Temple of Silence', roles: ['land', 'fixing'], tags: ['land', 'fixing', 'selection'], notes: 'WB scry land for budget smoothing.', land: true },
  { name: 'Temple of Triumph', roles: ['land', 'fixing'], tags: ['land', 'fixing', 'selection'], notes: 'RW scry land for budget smoothing.', land: true },
  { name: 'Orzhov Basilica', roles: ['land', 'fixing'], tags: ['land', 'fixing'], notes: 'WB bounce land for budget fixing.', land: true },
  { name: 'Boros Garrison', roles: ['land', 'fixing'], tags: ['land', 'fixing'], notes: 'RW bounce land for budget fixing.', land: true },
  { name: 'Rakdos Carnarium', roles: ['land', 'fixing'], tags: ['land', 'fixing'], notes: 'BR bounce land for budget fixing.', land: true },
  { name: 'Cover of Darkness', roles: ['evasion', 'assassin'], tags: ['evasion', 'tribal', 'gap-filler'], notes: 'Makes chosen creature type hard to block and fits Assassin pressure.' },
  { name: 'Reconnaissance', roles: ['protection', 'combat'], tags: ['combat', 'protection', 'puzzle'], notes: 'Lets attacks become safer and creates tricky combat sequencing.' },
  { name: 'Dolmen Gate', roles: ['protection', 'combat'], tags: ['combat', 'protection'], notes: 'Protects attacking creatures so evasion pressure is easier to commit to.' },
  { name: 'Whispersilk Cloak', roles: ['evasion', 'protection', 'equipment'], tags: ['evasion', 'protection', 'equipment'], notes: 'Unblockable plus shroud for a key Assassin.' },
  { name: "Trailblazer's Boots", roles: ['evasion', 'equipment'], tags: ['evasion', 'equipment'], notes: 'Nonbasic landwalk is often close to unblockable in Commander.' },
  { name: 'Key to the City', roles: ['evasion', 'draw'], tags: ['evasion', 'discard', 'draw'], notes: 'Unblockable outlet that can also stock graveyard lines.' },
  { name: 'Lightning Greaves', roles: ['protection', 'haste', 'equipment'], tags: ['protection', 'equipment'], notes: 'Protects Altaïr and enables immediate combat value.' },
  { name: 'Swiftfoot Boots', roles: ['protection', 'haste', 'equipment'], tags: ['protection', 'equipment'], notes: 'Second commander protection piece with equip flexibility.' },
  { name: 'Maskwood Nexus', roles: ['assassin', 'artifact', 'synergy'], tags: ['tribal', 'artifact', 'assassin'], notes: 'Makes all creatures Assassins for Altaïr and tribal payoffs.' },
  { name: "Herald's Horn", roles: ['assassin', 'artifact', 'ramp', 'draw'], tags: ['tribal', 'artifact', 'card-advantage'], notes: 'Reduces Assassin costs and digs for more creatures.' },
  { name: "Vanquisher's Banner", roles: ['assassin', 'artifact', 'draw', 'payoff'], tags: ['tribal', 'artifact', 'draw'], notes: 'Tribal anthem and card draw for Assassin builds.' },
  { name: 'Shared Animosity', roles: ['assassin', 'combat', 'finisher'], tags: ['tribal', 'combat', 'payoff'], notes: 'Converts wide Assassin attacks into real closing pressure.' },
  { name: 'Isshin, Two Heavens as One', roles: ['combat', 'trigger', 'payoff'], tags: ['combat', 'attack-trigger'], notes: 'Doubles attack triggers for token and combat engines.' },
  { name: 'The Master, Multiplied', roles: ['combat', 'token', 'exile'], tags: ['combat', 'token', 'exile'], notes: 'Prevents temporary tokens from being sacrificed, an experimental Altaïr engine piece.' },
  { name: 'Buried Alive', roles: ['graveyard', 'tutor'], tags: ['graveyard', 'setup'], notes: 'Loads key Assassins into the graveyard for Altaïr without reanimating them directly.' },
  { name: 'Entomb', roles: ['graveyard', 'tutor'], tags: ['graveyard', 'setup'], notes: 'One-card graveyard setup for Altaïr targets.' },
  { name: 'Unmarked Grave', roles: ['graveyard', 'tutor'], tags: ['graveyard', 'setup'], notes: 'Budget graveyard setup for nonlegendary targets.' },
  { name: 'Oriq Loremage', roles: ['graveyard', 'tutor'], tags: ['graveyard', 'setup'], notes: 'Repeatable graveyard loading for the Memory Corridor variant.' },
  { name: 'Dauthi Voidwalker', roles: ['exile', 'graveyard', 'evasion'], tags: ['exile', 'graveyard', 'evasion'], notes: 'Exile pressure, shadow evasion, and a powerful temporary-cast line.' },
  { name: 'Boros Charm', roles: ['protection', 'finisher'], tags: ['protection', 'combat'], notes: 'Protects the board or ends games with double strike/combat reach.' },
  { name: "Teferi's Protection", roles: ['protection'], tags: ['protection', 'premium'], notes: 'Premium safety valve for commander turns and wide attacks.' },
  { name: 'Skullclamp', roles: ['draw', 'artifact'], tags: ['draw', 'artifact'], notes: 'Turns small or temporary creatures into card flow.' },
  { name: 'Anguished Unmaking', roles: ['removal'], tags: ['removal', 'interaction'], notes: 'Flexible Mardu-color permanent answer.' },
  { name: 'Feed the Swarm', roles: ['removal'], tags: ['removal', 'enchantment-answer'], notes: 'Black answer to enchantments, covering a common Mardu gap.' },
  { name: 'Wear // Tear', roles: ['removal'], tags: ['removal', 'artifact-answer', 'enchantment-answer'], notes: 'Efficient artifact/enchantment interaction.' },
  { name: 'Arcane Signet', roles: ['ramp', 'fixing', 'artifact'], tags: ['ramp', 'fixing', 'artifact'], notes: 'Baseline Commander fixing rock.' },
  { name: 'Rakdos Signet', roles: ['ramp', 'fixing', 'artifact'], tags: ['ramp', 'fixing', 'artifact'], notes: 'BR signet for two-color fixing.' },
  { name: 'Boros Signet', roles: ['ramp', 'fixing', 'artifact'], tags: ['ramp', 'fixing', 'artifact'], notes: 'RW signet for two-color fixing.' },
  { name: 'Orzhov Signet', roles: ['ramp', 'fixing', 'artifact'], tags: ['ramp', 'fixing', 'artifact'], notes: 'WB signet for two-color fixing.' },
  { name: 'Talisman of Conviction', roles: ['ramp', 'fixing', 'artifact'], tags: ['ramp', 'fixing', 'artifact'], notes: 'RW two-mana fixing.' },
  { name: 'Talisman of Hierarchy', roles: ['ramp', 'fixing', 'artifact'], tags: ['ramp', 'fixing', 'artifact'], notes: 'WB two-mana fixing.' },
  { name: 'Talisman of Indulgence', roles: ['ramp', 'fixing', 'artifact'], tags: ['ramp', 'fixing', 'artifact'], notes: 'BR two-mana fixing.' },
  { name: 'Fellwar Stone', roles: ['ramp', 'fixing', 'artifact'], tags: ['ramp', 'fixing', 'artifact'], notes: 'Two-mana multiplayer fixing.' }
];

const VARIANTS: VariantDefinition[] = [
  {
    id: 'hidden-blade-core',
    name: 'Hidden Blade Core',
    description: 'Owned-only reality check for the Altaïr plan: Assassin density, evasive bodies, graveyard setup, and the cards Kyle can actually sleeve today.',
    status: 'testing',
    tags: ['owned-only', 'baseline', 'assassin', 'mardu', 'graveyard-setup', 'evasive-combat'],
    ownedOnly: true,
    landTarget: 36,
    includeRecommendations: [],
    roleWeights: { assassin: 4, evasion: 4, graveyard: 3, exile: 3, removal: 2, draw: 2, ramp: 2, protection: 2, combat: 2 },
    notes: 'Use this as the honest starting point. It shows whether the owned pool already has enough mana, evasive attackers, discard/mill, and interaction for Altaïr before any upgrades are added.'
  },
  {
    id: 'rooftop-evasion',
    name: 'Rooftop Evasion',
    description: 'Owned-only pressure build for the "you cannot block me" fantasy: flying, menace, tap-downs, cannot-block effects, and awkward combat math.',
    status: 'testing',
    tags: ['owned-only', 'evasion', 'unblockable', 'cannot-block', 'combat-puzzle', 'assassin'],
    ownedOnly: true,
    landTarget: 36,
    includeRecommendations: [],
    roleWeights: { evasion: 6, assassin: 4, combat: 4, equipment: 3, protection: 3, draw: 2, removal: 2, graveyard: 1 },
    notes: 'This is the owned-only combat puzzle build. It favors cards that make blocks impossible, bad, or irrelevant, then checks whether the deck can keep pressure up without leaning on unowned staples.'
  },
  {
    id: 'memory-corridor',
    name: 'Memory Corridor',
    description: 'Graveyard/exile engine build: stock the graveyard with Assassins, let Altaïr turn those memories into combat pressure, and avoid becoming generic reanimator.',
    status: 'draft',
    tags: ['recommendation-enhanced', 'graveyard', 'exile', 'assassin', 'altaïr-engine', 'discard-outlets'],
    ownedOnly: false,
    landTarget: 37,
    includeRecommendations: ['Buried Alive', 'Entomb', 'Unmarked Grave', 'Oriq Loremage', 'Dauthi Voidwalker', 'Key to the City', 'Command Tower', 'Path of Ancestry', 'Nomad Outpost', 'Rogue\'s Passage', 'Bojuka Bog', 'Arcane Signet', 'Fellwar Stone'],
    roleWeights: { graveyard: 7, exile: 6, assassin: 4, evasion: 4, tutor: 4, draw: 3, protection: 3, removal: 2, ramp: 2 },
    notes: 'This variant is built around filling the graveyard on purpose, then using Altaïr and exile-adjacent pieces to borrow value temporarily. Cards that only return creatures permanently are treated as tension unless they also advance the exile/memory theme.'
  },
  {
    id: 'brotherhood-arsenal',
    name: 'Brotherhood Arsenal',
    description: 'Artifact and Equipment toolbelt build: protect Altaïr, suit up evasive Assassins, and turn relics into card flow or closing pressure.',
    status: 'draft',
    tags: ['recommendation-enhanced', 'equipment', 'artifact', 'protection', 'toolbox', 'relics'],
    ownedOnly: false,
    landTarget: 36,
    includeRecommendations: ['Whispersilk Cloak', 'Trailblazer\'s Boots', 'Lightning Greaves', 'Swiftfoot Boots', 'Skullclamp', 'Maskwood Nexus', 'Herald\'s Horn', 'Vanquisher\'s Banner', 'Command Tower', 'Nomad Outpost', 'Path of Ancestry', 'Arcane Signet', 'Boros Signet', 'Orzhov Signet', 'Rakdos Signet'],
    roleWeights: { equipment: 7, artifact: 6, protection: 5, evasion: 4, assassin: 4, ramp: 4, draw: 3, removal: 2 },
    notes: 'This variant asks whether the deck wants to be a relic toolbox. It prioritizes protection, Equipment, tribal artifacts, and the Kassandra plus Spear package over pure graveyard velocity.'
  },
  {
    id: 'nothing-is-true',
    name: 'Nothing Is True',
    description: 'Most practical upgraded build: better mana, cleaner setup, stronger protection, and removal that keeps the Altaïr plan alive.',
    status: 'draft',
    tags: ['recommendation-enhanced', 'stronger-build', 'balanced', 'mardu', 'fixing', 'protection'],
    ownedOnly: false,
    landTarget: 37,
    includeRecommendations: ['Command Tower', 'Nomad Outpost', 'Path of Ancestry', 'Exotic Orchard', 'Caves of Koilos', 'Battlefield Forge', 'Sulfurous Springs', 'Clifftop Retreat', 'Isolated Chapel', 'Dragonskull Summit', 'Buried Alive', 'Entomb', 'Cover of Darkness', 'Reconnaissance', 'Dolmen Gate', 'Lightning Greaves', 'Swiftfoot Boots', 'Boros Charm', 'Teferi\'s Protection', 'Anguished Unmaking', 'Feed the Swarm', 'Wear // Tear', 'Arcane Signet', 'Fellwar Stone'],
    roleWeights: { fixing: 7, land: 5, ramp: 5, protection: 5, removal: 5, graveyard: 4, evasion: 4, draw: 3, assassin: 3, combat: 3 },
    notes: 'This is the version to test when you want the deck to function first and express theme second. It spends recommendation slots on fixing, protection, graveyard setup, and flexible answers before adding cuter puzzle pieces.'
  },
  {
    id: 'everything-is-permitted',
    name: 'Everything Is Permitted',
    description: 'Experimental puzzle-combat build: unblockable lines, attack-trigger multiplication, type manipulation, and temporary-token weirdness.',
    status: 'draft',
    tags: ['recommendation-enhanced', 'experimental', 'puzzle', 'evasion', 'unblockable', 'attack-triggers', 'token-copy'],
    ownedOnly: false,
    landTarget: 36,
    includeRecommendations: ['Cover of Darkness', 'Reconnaissance', 'Dolmen Gate', 'Key to the City', 'Whispersilk Cloak', 'Trailblazer\'s Boots', 'Maskwood Nexus', 'Shared Animosity', 'Isshin, Two Heavens as One', 'The Master, Multiplied', 'Dauthi Voidwalker', 'Rogue\'s Passage', 'Unclaimed Territory', 'Secluded Courtyard', 'Path of Ancestry', 'Command Tower', 'Arcane Signet', 'Talisman of Conviction', 'Talisman of Hierarchy', 'Talisman of Indulgence'],
    roleWeights: { evasion: 8, combat: 6, puzzle: 5, assassin: 5, exile: 4, token: 4, equipment: 3, protection: 3, draw: 2, ramp: 2 },
    notes: 'This is the sandbox version. It keeps cards that create strange attack states, unblockable shortcuts, copied attack triggers, and creature-type hacks, even when those lines are less efficient than the practical build.'
  }
];

async function main(): Promise<void> {
  const now = new Date().toISOString();
  const sourceContent = await readFile(SOURCE_CSV, 'utf8');
  const sourceRows = parseCsvRecords(sourceContent) as CsvRow[];
  const sourceRowsById = new Map(sourceRows.map((row) => [clean(row['Scryfall ID']).toLowerCase(), row]));
  const officialStatus = await officialCardCatalogStatus(REPO_ROOT);
  console.log(`Official-card cache: prints=${officialStatus.prints.available ? officialStatus.prints.count : 0}, oracle=${officialStatus.oracle.available ? officialStatus.oracle.count : 0}. Using targeted Scryfall fetch for this import.`);

  const dryRun = await importCollectionCsv(REPO_ROOT, collectionImportRequest(sourceContent, true));
  assertImportSummary(dryRun.summary);
  console.log(`Dry-run ok: ${dryRun.summary.importedRows} rows, ${dryRun.summary.scryfallIdMatches} Scryfall ID matches, ${dryRun.summary.unresolvedRows} unresolved.`);

  const importResult = await importCollectionCsv(REPO_ROOT, collectionImportRequest(sourceContent, false));
  const orderedCardsByName = await fetchScryfallCardsByName(ORDERED_CARDS.map((card) => card.name));
  const ownedLandPoolByName = await fetchScryfallCardsByName([...BASIC_LAND_POOL_NAMES, ...EXTRA_OWNED_LANDS.map((land) => land.name)]);
  for (const ordered of ORDERED_CARDS) {
    const card = orderedCardsByName.get(normalizedName(ordered.name));
    if (card) {
      sourceRowsById.set(card.id.toLowerCase(), orderedSourceRow(ordered, now));
    }
  }
  for (const card of ownedLandPoolByName.values()) {
    sourceRowsById.set(card.id.toLowerCase(), basicLandPoolSourceRow(card, now));
  }
  const baseOwnedEntries = upsertOwnedLandPoolEntries(upsertOrderedEntries(importResult.collection.entries, orderedCardsByName, now), ownedLandPoolByName, now);
  const ownedCardsById = await fetchScryfallCardsById(baseOwnedEntries.map((entry) => entry.scryfallId).filter((id): id is string => Boolean(id)));
  for (const card of orderedCardsByName.values()) {
    ownedCardsById.set(card.id.toLowerCase(), card);
  }
  for (const card of ownedLandPoolByName.values()) {
    ownedCardsById.set(card.id.toLowerCase(), card);
  }
  const duplicateCounts = countBy(baseOwnedEntries, (entry) => normalizedName(entry.cardName), (entry) => entry.quantity);
  const enrichedOwnedEntries = baseOwnedEntries.map((entry) => enrichOwnedEntry(entry, ownedCardsById.get(clean(entry.scryfallId).toLowerCase()), sourceRowsById.get(clean(entry.scryfallId).toLowerCase()), duplicateCounts, now));
  const binder = await saveCollection(REPO_ROOT, {
    metadata: collectionMetadataSchema.parse({
      ...importResult.collection.metadata,
      name: "Assassin's Ledger",
      description: "Kyle's owned Assassin ledger for the Signs of Assassins Commander deck family, including scanned cards and ordered batch-002 additions.",
      linkedUniverseId: PROJECT_ID,
      gameId: 'mtg',
      purpose: 'owned',
      source: 'manabox',
      kind: 'binder',
      listCategory: 'general',
      tags: uniqueTags([...importResult.collection.metadata.tags, ...BATCH_TAGS, 'batch-002', 'ordered']),
      defaultEntryTags: BATCH_TAGS,
      defaultOwnershipStatus: 'owned',
      linkedSetCodes: uniqueTags([...(importResult.collection.metadata.linkedSetCodes ?? []), SET_CODE]),
      accentColor: '#9b2f3f',
      acquisitionNotes: 'batch-001 import from Kyle\'s ManaBox Assassin deck CSV. batch-002 ordered cards were added as owned cards for deck-building evaluation.',
      updatedAt: now
    }),
    entries: enrichedOwnedEntries
  });

  await ensureSignsOfAssassinsSet(now, coverImageUrlForCard(ownedCardsById.get(COMMANDER_SCRYFALL_ID)));
  const flagged = await upsertFlaggedReviewList(binder.entries, now);
  const recommendations = await upsertRecommendations(binder.entries, now);
  const { deck, totals } = await buildDeck(binder.entries, recommendations.entries, now);
  const offColorCount = binder.entries.filter((entry) => KNOWN_OFF_COLOR.has(entry.cardName)).length;
  console.log(JSON.stringify({
    binder: {
      id: binder.metadata.collectionId,
      rows: binder.entries.length,
      quantity: binder.entries.reduce((sum, entry) => sum + entry.quantity, 0),
      owners: [...new Set(binder.entries.map((entry) => entry.ownerName))],
      ownershipStatuses: [...new Set(binder.entries.map((entry) => entry.ownershipStatus))],
      incomingRows: binder.entries.filter((entry) => entry.tags.includes('batch-002')).length,
      offColorReviewRows: offColorCount
    },
    flagged: {
      rows: flagged.entries.filter((entry) => entry.tags.includes('signs-of-assassins')).length
    },
    recommendations: {
      rows: recommendations.entries.length,
      signsOfAssassinsRows: recommendations.entries.filter((entry) => entry.tags.includes('signs-of-assassins')).length
    },
    deck: {
      id: deck.metadata.deckId,
      variants: deck.metadata.variants.map((variant) => variant.variantId),
      totals
    }
  }, null, 2));
}

function collectionImportRequest(content: string, dryRun: boolean) {
  return {
	    collectionId: BINDER_ID,
	    name: "Assassin's Ledger",
	    description: "Kyle's owned Assassin ledger for the Signs of Assassins Commander deck family, including scanned cards and ordered batch-002 additions.",
    linkedUniverseId: PROJECT_ID,
    gameId: 'mtg',
    purpose: 'owned' as const,
    kind: 'binder' as const,
    listCategory: 'general' as const,
    defaultOwnershipStatus: 'owned' as const,
    defaultEntryTags: BATCH_TAGS,
    source: 'manabox' as const,
    contentFormat: 'csv' as const,
    content,
    mode: 'replace' as const,
    dryRun
  };
}

function assertImportSummary(summary: { importedRows: number; writtenRows: number; matchedRows: number; scryfallIdMatches: number; unresolvedRows: number; warnings: string[] }): void {
  const expected = { importedRows: 169, writtenRows: 169, matchedRows: 169, scryfallIdMatches: 169, unresolvedRows: 0 };
  for (const [key, value] of Object.entries(expected)) {
    if (summary[key as keyof typeof expected] !== value) {
      throw new Error(`Import dry-run mismatch for ${key}: expected ${value}, got ${summary[key as keyof typeof expected]}.`);
    }
  }
  if (summary.warnings.length) {
    throw new Error(`Import dry-run returned warnings: ${summary.warnings.join('; ')}`);
  }
}

function upsertOrderedEntries(entries: CollectionEntry[], cardsByName: Map<string, ScryfallCard>, now: string): CollectionEntry[] {
  const next = entries.map((entry) => collectionEntrySchema.parse({ ...entry }));
  for (const ordered of ORDERED_CARDS) {
    const card = cardsByName.get(normalizedName(ordered.name));
    if (!card) {
      console.warn(`Ordered card skipped: ${ordered.name} was not found on Scryfall.`);
      continue;
    }
    const quantity = Math.max(1, ordered.quantity ?? 1);
    const exactIndex = next.findIndex((entry) => clean(entry.scryfallId).toLowerCase() === card.id.toLowerCase());
    if (exactIndex >= 0) {
      const existing = next[exactIndex];
      next[exactIndex] = collectionEntrySchema.parse({
        ...existing,
        quantity: existing.quantity + quantity,
        ownershipStatus: 'owned',
        ownerName: OWNER_NAME,
        tags: uniqueTags([...withoutLogisticsTags(existing.tags), ...ORDERED_TAGS, ...(ordered.tags ?? [])]),
        notes: uniqueSentences([existing.notes, orderedLedgerNote(ordered)]).join(' '),
        reviewNotes: uniqueSentences([existing.reviewNotes, `batch-002 adds ${quantity} ordered copy of ${card.name} for Kyle.`]).join(' ')
      });
      continue;
    }
    next.push(collectionEntrySchema.parse({
      collectionId: BINDER_ID,
      entryId: `incoming-batch-002-${slugify(card.name)}-${card.id.slice(0, 8)}`,
      quantity,
      ownershipStatus: 'owned',
      ownerName: OWNER_NAME,
      cardName: card.name,
      setCode: clean(card.set).toUpperCase(),
      setName: clean(card.set_name),
      collectorNumber: clean(card.collector_number),
      scryfallId: card.id,
      finish: 'normal',
      condition: 'unknown',
      language: languageLabel(card.lang),
      location: 'Kyle collection',
      source: 'scryfall',
      sourceRow: JSON.stringify({ source: 'partner-online-order', ordered, scryfall: card }),
      matchKey: card.id,
      matchStrategy: 'scryfall_id',
      reviewStatus: 'matched',
      reviewNotes: 'batch-002 ordered card for Kyle.',
      previewArtSource: 'scryfall',
      tags: uniqueTags([...ORDERED_TAGS, ...(ordered.tags ?? [])]),
      notes: orderedLedgerNote(ordered),
      flagged: false,
      proxy: false,
      homebrew: false
    }));
  }
  return next;
}

function orderedSourceRow(ordered: { name: string; quantity?: number; notes: string; tags?: string[] }, now: string): CsvRow {
  return {
    Name: ordered.name,
    Quantity: String(Math.max(1, ordered.quantity ?? 1)),
    Source: 'partner-online-order',
    Batch: 'batch-002',
    'Order status': 'owned',
    Added: now,
    Notes: ordered.notes
  };
}

function orderedLedgerNote(ordered: { name: string; notes: string }): string {
  return ordered.notes;
}

function withoutLogisticsTags(tags: string[] | undefined): string[] {
  return (tags ?? []).filter((tag) => !['incoming', 'delivery-pending'].includes(tag));
}

function upsertOwnedLandPoolEntries(entries: CollectionEntry[], cardsByName: Map<string, ScryfallCard>, now: string): CollectionEntry[] {
  const next = entries.map((entry) => collectionEntrySchema.parse({ ...entry }));
  const scannedBasicCounts = countBy(next.filter((entry) => BASIC_LANDS.has(entry.cardName)), (entry) => entry.cardName, (entry) => entry.quantity);
  for (const name of BASIC_LAND_POOL_NAMES) {
    const card = cardsByName.get(normalizedName(name));
    if (!card) {
      console.warn(`Basic land pool skipped: ${name} was not found on Scryfall.`);
      continue;
    }
    const quantity = Math.max(0, (OWNED_BASIC_LAND_COUNTS[name] ?? 0) - (scannedBasicCounts.get(name) ?? 0));
    if (quantity <= 0) {
      continue;
    }
    const entryId = `basic-land-pool-${slugify(card.name)}`;
    const existingIndex = next.findIndex((entry) => entry.entryId === entryId);
    const basicEntry = collectionEntrySchema.parse({
      ...(existingIndex >= 0 ? next[existingIndex] : {}),
      collectionId: BINDER_ID,
      entryId,
      quantity,
      ownershipStatus: 'owned',
      ownerName: OWNER_NAME,
      cardName: card.name,
      setCode: clean(card.set).toUpperCase(),
      setName: clean(card.set_name),
      collectorNumber: clean(card.collector_number),
      scryfallId: card.id,
      finish: 'normal',
      condition: 'bulk',
      language: languageLabel(card.lang),
      location: 'Kyle basic lands',
      source: 'generic',
      sourceRow: JSON.stringify({ source: 'assumed-owned-basic-land-pool', scryfall: card }),
      matchKey: card.id,
      matchStrategy: 'scryfall_id',
      reviewStatus: 'matched',
      reviewNotes: `Owned basic land pool for Commander deck construction; ${quantity} unscanned ${card.name} ${quantity === 1 ? 'copy' : 'copies'} added to reach Kyle's stated owned total of ${OWNED_BASIC_LAND_COUNTS[name]}.`,
      previewArtSource: 'scryfall',
      tags: uniqueTags(['basic-land-pool', 'assumed-owned', 'owned-basic', 'land', 'basic-land', 'commander', 'mardu', 'signs-of-assassins']),
      notes: `Kyle owns ${OWNED_BASIC_LAND_COUNTS[name]} total ${card.name} basic lands for this deck lane; this row adds the unscanned copies so Commander variants do not treat basics as missing cards.`,
      flagged: false,
      proxy: false,
      homebrew: false
    });
    if (existingIndex >= 0) {
      next[existingIndex] = basicEntry;
    } else {
      next.push(basicEntry);
    }
  }
  for (const ownedLand of EXTRA_OWNED_LANDS) {
    const card = cardsByName.get(normalizedName(ownedLand.name));
    if (!card) {
      console.warn(`Extra owned land skipped: ${ownedLand.name} was not found on Scryfall.`);
      continue;
    }
    const entryId = `extra-owned-land-${slugify(card.name)}-${card.id.slice(0, 8)}`;
    const existingIndex = next.findIndex((entry) => entry.entryId === entryId);
    const extraEntry = collectionEntrySchema.parse({
      ...(existingIndex >= 0 ? next[existingIndex] : {}),
      collectionId: BINDER_ID,
      entryId,
      quantity: ownedLand.quantity,
      ownershipStatus: 'owned',
      ownerName: OWNER_NAME,
      cardName: card.name,
      setCode: clean(card.set).toUpperCase(),
      setName: clean(card.set_name),
      collectorNumber: clean(card.collector_number),
      scryfallId: card.id,
      finish: 'normal',
      condition: 'unknown',
      language: languageLabel(card.lang),
      location: 'Kyle collection',
      source: 'generic',
      sourceRow: JSON.stringify({ source: 'extra-owned-land', scryfall: card, note: ownedLand.notes }),
      matchKey: card.id,
      matchStrategy: 'scryfall_id',
      reviewStatus: 'matched',
      reviewNotes: ownedLand.notes,
      previewArtSource: 'scryfall',
      tags: uniqueTags(['extra-owned-land', 'owned', 'commander', 'mardu', 'signs-of-assassins', ...ownedLand.tags]),
      notes: ownedLand.notes,
      flagged: false,
      proxy: false,
      homebrew: false
    });
    if (existingIndex >= 0) {
      next[existingIndex] = extraEntry;
    } else {
      next.push(extraEntry);
    }
  }
  return next;
}

function basicLandPoolSourceRow(card: ScryfallCard, now: string): CsvRow {
  return {
    Name: card.name,
    Quantity: String(OWNED_BASIC_LAND_COUNTS[card.name] ?? EXTRA_OWNED_LANDS.find((land) => normalizedName(land.name) === normalizedName(card.name))?.quantity ?? 1),
    Source: BASIC_LANDS.has(card.name) ? 'owned-basic-land-pool' : 'extra-owned-land',
    Added: now,
    Notes: BASIC_LANDS.has(card.name) ? 'Owned basic land pool for Commander deck construction.' : 'Extra owned nonbasic land copy.'
  };
}

function enrichOwnedEntry(
  entry: CollectionEntry,
  card: ScryfallCard | undefined,
  sourceRow: CsvRow | undefined,
  duplicateCounts: Map<string, number>,
  now: string
): CollectionEntry {
  const roles = inferRoles(card, entry.cardName);
  const isIncomingOrder = entry.tags.includes('batch-002') || entry.tags.includes('incoming') || entry.source === 'scryfall';
  const isOwnedLandPool = entry.tags.includes('basic-land-pool') || entry.tags.includes('extra-owned-land');
  const importTags = isOwnedLandPool
    ? ['owned-land-pool', 'assumed-owned', 'commander', 'mardu', 'signs-of-assassins']
    : isIncomingOrder
      ? ['assassin', 'commander', 'mardu', 'signs-of-assassins']
      : BATCH_TAGS;
  const tags = uniqueTags([...importTags, ...roles, ...entry.tags]);
  const duplicateCount = duplicateCounts.get(normalizedName(entry.cardName)) ?? entry.quantity;
  const reviewNotes: string[] = [];
  let needsImportReview = false;
  if (duplicateCount > 1 && !BASIC_LANDS.has(entry.cardName)) {
    tags.push('duplicate-name-review', 'flagged', 'review-queue');
    reviewNotes.push(`Duplicate name review: ${entry.cardName} appears as ${duplicateCount} owned copies/prints across Assassin's Ledger. Commander variants should use only one nonbasic copy; the binder preserves every owned print.`);
    needsImportReview = true;
  }
  const colorIdentity = colorIdentityForCard(card);
  if (KNOWN_OFF_COLOR.has(entry.cardName) || !isCommanderLegal(colorIdentity)) {
    tags.push('off-color-review', 'flagged', 'review-queue');
    reviewNotes.push('Color identity review: outside Altaïr\'s Mardu Commander identity, so this card stays in the binder and is excluded from active variants.');
    needsImportReview = true;
  }
  if (entry.cardName === COMMANDER_NAME) {
    tags.push('commander-card');
    reviewNotes.push('Commander and cover card for the Signs of Assassins deck family.');
  }
  const sourcePayload = {
    source: isOwnedLandPool ? 'owned-land-pool' : isIncomingOrder ? 'partner-online-order' : 'manabox',
    row: sourceRow ?? {},
    enrichment: card
  };
  const marketPrice = marketPriceForCard(card, entry.finish);
  return collectionEntrySchema.parse({
    ...entry,
    ownershipStatus: 'owned',
    ownerName: OWNER_NAME,
    sourceRow: JSON.stringify(sourcePayload),
    previewArtSource: card ? 'scryfall' : entry.previewArtSource,
    estimatedMarketPrice: entry.estimatedMarketPrice ?? marketPrice,
    estimatedMarketCurrency: entry.estimatedMarketCurrency ?? (marketPrice === undefined ? undefined : 'USD'),
    marketPriceSource: entry.marketPriceSource ?? (marketPrice === undefined ? undefined : 'scryfall'),
    marketPriceUpdatedAt: entry.marketPriceUpdatedAt ?? (marketPrice === undefined ? undefined : now),
	    tags: uniqueTags(tags),
	    notes: entry.notes ?? noteForRoles(roles),
	    reviewNotes: uniqueSentences([entry.reviewNotes, ...reviewNotes]).join(' '),
    reviewStatus: needsImportReview ? 'needs_review' : entry.reviewStatus,
    flagged: Boolean(entry.flagged || needsImportReview)
	  });
}

async function upsertFlaggedReviewList(ownedEntries: CollectionEntry[], now: string): Promise<{ metadata: CollectionMetadata; entries: CollectionEntry[] }> {
  const existing = await readCollectionState(REPO_ROOT, FLAGGED_ID).catch(async () => ({
    metadata: collectionMetadataSchema.parse({
      collectionId: FLAGGED_ID,
      name: 'Flagged',
      description: 'Cards needing attention, review, or follow-up.',
      gameId: 'mtg',
      purpose: 'mixed',
      source: 'generic',
      kind: 'list',
      listCategory: 'flagged',
      tags: ['flagged'],
      defaultEntryTags: ['flagged'],
      defaultOwnershipStatus: 'reference',
      defaultFlagged: true,
      linkedSetCodes: [],
      createdAt: now,
      updatedAt: now
    }),
    entries: [],
    warnings: []
  }));
  const retainedEntries = existing.entries.filter((entry) => !entry.tags.includes('signs-of-assassins'));
  const reviewEntries = ownedEntries
    .filter((entry) => entry.flagged || entry.reviewStatus === 'needs_review' || entry.tags.includes('duplicate-name-review') || entry.tags.includes('off-color-review'))
    .map((entry) =>
      collectionEntrySchema.parse({
        ...entry,
        collectionId: FLAGGED_ID,
        entryId: `flagged-signs-of-assassins-${slugify(entry.cardName)}-${clean(entry.setCode).toLowerCase()}-${clean(entry.collectorNumber).toLowerCase()}`,
        reviewStatus: 'needs_review',
        flagged: true,
        tags: uniqueTags([...entry.tags, 'flagged', 'review-queue', 'signs-of-assassins']),
        reviewNotes: uniqueSentences([entry.reviewNotes, 'Flagged by the Signs of Assassins import for duplicate-name or color-identity review.']).join(' ')
      })
    );
  return saveCollection(REPO_ROOT, {
    metadata: collectionMetadataSchema.parse({
      ...existing.metadata,
      name: 'Flagged',
      description: 'Cards needing attention, review, or follow-up.',
      purpose: 'mixed',
      source: 'generic',
      kind: 'list',
      listCategory: 'flagged',
      tags: uniqueTags([...(existing.metadata.tags ?? []), 'flagged', 'signs-of-assassins']),
      defaultEntryTags: uniqueTags([...(existing.metadata.defaultEntryTags ?? []), 'flagged']),
      defaultFlagged: true,
      linkedSetCodes: uniqueTags([...(existing.metadata.linkedSetCodes ?? []), SET_CODE]),
      updatedAt: now
    }),
    entries: [...retainedEntries, ...reviewEntries].sort((left, right) => left.cardName.localeCompare(right.cardName) || (left.setCode ?? '').localeCompare(right.setCode ?? ''))
  });
}

async function upsertRecommendations(ownedEntries: CollectionEntry[], now: string): Promise<{ metadata: CollectionMetadata; entries: CollectionEntry[] }> {
  const existing = await readCollectionState(REPO_ROOT, RECOMMENDATIONS_ID).catch(async () => ({
    metadata: collectionMetadataSchema.parse({
      collectionId: RECOMMENDATIONS_ID,
      name: 'Recommendations',
      description: 'Cards recommended for future deck or collection decisions.',
      gameId: 'mtg',
      purpose: 'research',
      source: 'generic',
      kind: 'list',
      listCategory: 'recommendation',
      tags: ['recommendations'],
      defaultEntryTags: ['recommended'],
      defaultOwnershipStatus: 'recommended',
      linkedSetCodes: [],
      createdAt: now,
      updatedAt: now
    }),
    entries: [],
    warnings: []
  }));
  const ownedNonbasicNames = new Set(ownedEntries.filter((entry) => !BASIC_LANDS.has(entry.cardName)).map((entry) => normalizedName(entry.cardName)));
  const cardsByName = await fetchRecommendedCards();
  const existingById = new Map(existing.entries.filter((entry) => !entry.tags.includes('signs-of-assassins')).map((entry) => [clean(entry.scryfallId).toLowerCase() || entry.entryId, entry]));
  for (const recommendation of RECOMMENDATIONS) {
    if (ownedNonbasicNames.has(normalizedName(recommendation.name))) {
      continue;
    }
    const card = cardsByName.get(normalizedName(recommendation.name));
    if (!card) {
      console.warn(`Recommendation skipped: ${recommendation.name} was not found on Scryfall.`);
      continue;
    }
    const entryId = `recommendations-signs-of-assassins-${slugify(card.name)}`;
    const key = card.id.toLowerCase();
    const existingEntry = existingById.get(key);
    const roles = uniqueTags([...recommendation.roles, ...inferRoles(card, card.name)]);
    const tags = uniqueTags([
      'recommended',
      'ghost-slot',
      'unowned',
      'gap-filler',
      'signs-of-assassins',
      ...recommendation.tags,
      ...roles
    ]);
    const price = marketPriceForCard(card, 'normal');
    const entry = collectionEntrySchema.parse({
      ...(existingEntry ?? {}),
      collectionId: RECOMMENDATIONS_ID,
      entryId: existingEntry?.entryId || entryId,
      quantity: 1,
      ownershipStatus: 'recommended',
      ownerName: OWNER_NAME,
      cardName: card.name,
      setCode: clean(card.set).toUpperCase(),
      setName: clean(card.set_name),
      collectorNumber: clean(card.collector_number),
      scryfallId: card.id,
      finish: 'normal',
      language: languageLabel(card.lang),
      source: 'scryfall',
      sourceRow: JSON.stringify({ source: 'scryfall', scryfall: card, recommendationContext: recommendation }),
      matchKey: card.id,
      matchStrategy: 'scryfall_id',
      reviewStatus: 'matched',
      reviewNotes: 'Recommendation-backed ghost slot for the Signs of Assassins deck family.',
      previewArtSource: 'scryfall',
      estimatedMarketPrice: price,
      estimatedMarketCurrency: price === undefined ? undefined : 'USD',
      marketPriceSource: price === undefined ? undefined : 'scryfall',
      marketPriceUpdatedAt: price === undefined ? undefined : now,
      tags,
      notes: recommendation.notes,
      flagged: false,
      proxy: false,
      homebrew: false
    });
    existingById.set(key, entry);
  }
  const entries = [...existingById.values()].sort((left, right) => left.cardName.localeCompare(right.cardName) || (left.setCode ?? '').localeCompare(right.setCode ?? ''));
  const saved = await saveCollection(REPO_ROOT, {
    metadata: collectionMetadataSchema.parse({
      ...existing.metadata,
      name: 'Recommendations',
      description: 'Cards recommended for future deck or collection decisions.',
      linkedUniverseId: PROJECT_ID,
      purpose: 'research',
      source: 'generic',
      kind: 'list',
      listCategory: 'recommendation',
      tags: uniqueTags([...(existing.metadata.tags ?? []), 'recommendations', 'signs-of-assassins']),
      defaultEntryTags: uniqueTags([...(existing.metadata.defaultEntryTags ?? []), 'recommended']),
      defaultOwnershipStatus: 'recommended',
      linkedSetCodes: uniqueTags([...(existing.metadata.linkedSetCodes ?? []), SET_CODE]),
      updatedAt: now
    }),
    entries
  });
  return saved;
}

async function buildDeck(ownedEntries: CollectionEntry[], recommendationEntries: CollectionEntry[], now: string) {
  const ownedCandidates = ownedEntries.map((entry) => candidateFromEntry(entry, true)).filter((candidate): candidate is Candidate => Boolean(candidate));
  const recommendationCandidates = recommendationEntries.filter((entry) => entry.tags.includes('signs-of-assassins')).map((entry) => candidateFromEntry(entry, false)).filter((candidate): candidate is Candidate => Boolean(candidate));
  const commanderCandidate = ownedCandidates.find((candidate) => candidate.cardId === COMMANDER_SCRYFALL_ID || candidate.name === COMMANDER_NAME);
  if (!commanderCandidate) {
    throw new Error(`Commander ${COMMANDER_NAME} was not found in the owned binder import.`);
  }
  const commanderReference = {
    setCode: 'ACR',
    cardId: COMMANDER_SCRYFALL_ID,
    variantId: 'official-print',
    nameSnapshot: COMMANDER_NAME
  };
  const variants = VARIANTS.map((definition) =>
    deckVariantSchema.parse({
      deckId: DECK_ID,
      variantId: definition.id,
      name: definition.name,
      description: definition.description,
      status: definition.status,
      colorIdentity: DECK_COLOR_IDENTITY,
      commander: commanderReference,
      tags: uniqueTags(['assassin', 'mardu', ...definition.tags]),
      notes: definition.notes,
      createdAt: now,
      updatedAt: now
    })
  );
  const allEntries: DeckEntry[] = [];
  for (const definition of VARIANTS) {
    const build = buildVariantBuild(definition, ownedCandidates, recommendationCandidates, commanderCandidate);
    allEntries.push(...build.main.map((pick, index) => deckEntryFromPick(definition, pick, index, 'main')));
    allEntries.push(...build.maybe.map((pick, index) => deckEntryFromPick(definition, pick, index, 'maybe', pick.note)));
  }
  const metadata = deckMetadataSchema.parse({
    deckId: DECK_ID,
    name: SET_NAME,
    description: "Altaïr Mardu Commander deck built around evasive Assassin attacks, graveyard setup, and temporary exile-memory value instead of generic reanimation.",
    linkedUniverseId: PROJECT_ID,
    linkedSetCode: SET_CODE,
    format: 'Commander',
    playStyleTags: DECK_PLAY_STYLE_TAGS,
    colorIdentity: DECK_COLOR_IDENTITY,
    commander: commanderReference,
    coverCard: commanderReference,
    commanderBracket: COMMANDER_BRACKET,
    status: 'draft',
    activeVariantId: 'hidden-blade-core',
    variants,
    tags: ['assassin', 'commander', 'mardu', 'signs-of-assassins', 'batch-001', 'deck-variants'],
    notes: 'Core thesis: make blocking awkward or impossible, put useful Assassins into the graveyard, then let Altaïr turn those cards into temporary combat value. Owned-only variants show the real pool; recommendation-enhanced variants show the upgrades, lands, and gap fillers to test next.',
    createdAt: now,
    updatedAt: now
  });
  const totals = verifyDeck(allEntries);
  const deck = await saveDeck(REPO_ROOT, { metadata, entries: allEntries });
  return { deck, totals };
}

function buildVariantBuild(definition: VariantDefinition, ownedCandidates: Candidate[], recommendationCandidates: Candidate[], commanderCandidate: Candidate): VariantBuild {
  const removedForPackage: MaybePickedCard[] = [];
  const main = buildVariantPicks(definition, ownedCandidates, recommendationCandidates, commanderCandidate, removedForPackage);
  return {
    main,
    maybe: buildMaybeBoardPicks(definition, main, removedForPackage, ownedCandidates, recommendationCandidates, commanderCandidate)
  };
}

function buildVariantPicks(definition: VariantDefinition, ownedCandidates: Candidate[], recommendationCandidates: Candidate[], commanderCandidate: Candidate, removedForPackage: MaybePickedCard[]): PickedCard[] {
  const allowedOwned = ownedCandidates.filter((candidate) => candidate.cardId !== commanderCandidate.cardId && !KNOWN_OFF_COLOR.has(candidate.name) && isCommanderLegal(candidate.colorIdentity));
  const allowedRecommendations = definition.ownedOnly ? [] : recommendationCandidates.filter((candidate) => isCommanderLegal(candidate.colorIdentity));
  const selected: PickedCard[] = [];
  const chosenNonbasicNames = new Set<string>();
  let landCount = 0;

  const add = (candidate: Candidate, count = 1): boolean => {
    if (totalCount(selected) >= 99) {
      return false;
    }
    const adjustedCount = Math.min(count, 99 - totalCount(selected));
    if (adjustedCount <= 0) {
      return false;
    }
    const isBasic = BASIC_LANDS.has(candidate.name);
    if (!isBasic && chosenNonbasicNames.has(candidate.keyName)) {
      return false;
    }
    if (candidate.name === COMMANDER_NAME || KNOWN_OFF_COLOR.has(candidate.name) || !isCommanderLegal(candidate.colorIdentity)) {
      return false;
    }
    if (!isBasic) {
      chosenNonbasicNames.add(candidate.keyName);
    }
    selected.push({ candidate, count: adjustedCount });
    if (candidate.roles.includes('land')) {
      landCount += adjustedCount;
    }
    return true;
  };

  const ownedNonbasicLands = allowedOwned
    .filter((candidate) => candidate.roles.includes('land') && !BASIC_LANDS.has(candidate.name))
    .sort((left, right) => scoreCandidate(right, definition) - scoreCandidate(left, definition) || left.name.localeCompare(right.name));
  if (definition.ownedOnly) {
    for (const land of ownedNonbasicLands) {
      if (landCount >= definition.landTarget) {
        break;
      }
      add(land, Math.min(land.quantity, 1));
    }
    fillOwnedBasicLands();
  } else {
    for (const land of ownedNonbasicLands) {
      if (landCount >= Math.max(26, definition.landTarget - 10)) {
        break;
      }
      add(land, Math.min(land.quantity, 1));
    }
    const preferredLands = allowedRecommendations
      .filter((candidate) => candidate.roles.includes('land'))
      .sort((left, right) => recommendedLandPriority(right, definition) - recommendedLandPriority(left, definition));
    for (const land of preferredLands) {
      if (landCount >= definition.landTarget) {
        break;
      }
      const recommendation = RECOMMENDATIONS.find((item) => normalizedName(item.name) === land.keyName);
      const count = recommendation?.basicCount && BASIC_LANDS.has(land.name) ? Math.min(recommendation.basicCount, definition.landTarget - landCount) : 1;
      add(land, count);
    }
    fillOwnedBasicLands();
  }

  for (const name of definition.includeRecommendations) {
    const candidate = allowedRecommendations.find((item) => item.keyName === normalizedName(name));
    if (candidate && !candidate.roles.includes('land')) {
      add(candidate);
    }
  }

  const fillerPool = [...allowedOwned, ...allowedRecommendations]
    .filter((candidate) => !candidate.roles.includes('land'))
    .sort((left, right) => scoreCandidate(right, definition) - scoreCandidate(left, definition) || left.manaValue - right.manaValue || left.name.localeCompare(right.name));
  for (const candidate of fillerPool) {
    if (totalCount(selected) >= 99) {
      break;
    }
    add(candidate);
  }
  enforceKassandraSpearPackage(selected, allowedOwned, definition, removedForPackage);

  if (totalCount(selected) !== 99) {
    throw new Error(`${definition.name} generated ${totalCount(selected)} main-deck cards instead of 99.`);
  }
  return selected;

  function fillOwnedBasicLands(): void {
    if (landCount >= definition.landTarget) {
      return;
    }
    const basicsByName = new Map<string, Candidate>();
    for (const candidate of allowedOwned) {
      if (!BASIC_LANDS.has(candidate.name)) {
        continue;
      }
      const existing = basicsByName.get(candidate.name);
      if (existing) {
        const representative = candidate.tags.includes('basic-land-pool') ? candidate : existing;
        basicsByName.set(candidate.name, { ...representative, quantity: existing.quantity + candidate.quantity, tags: uniqueTags([...existing.tags, ...candidate.tags]) });
      } else {
        basicsByName.set(candidate.name, candidate);
      }
    }
    const desired = basicLandMix(definition.landTarget - landCount);
    for (const [name, count] of desired) {
      const candidate = basicsByName.get(name);
      if (!candidate || landCount >= definition.landTarget) {
        continue;
      }
      add(candidate, Math.min(count, candidate.quantity, definition.landTarget - landCount));
    }
    for (const name of BASIC_LAND_POOL_NAMES) {
      const candidate = basicsByName.get(name);
      if (!candidate || landCount >= definition.landTarget) {
        continue;
      }
      add(candidate, Math.min(candidate.quantity, definition.landTarget - landCount));
    }
  }
}

function basicLandMix(needed: number): Array<[string, number]> {
  if (needed <= 0) {
    return [];
  }
  const swamps = Math.max(1, Math.ceil(needed * 0.5));
  const mountains = Math.max(needed >= 3 ? 1 : 0, Math.floor(needed * 0.3));
  const plains = Math.max(0, needed - swamps - mountains);
  return [
    ['Swamp', swamps],
    ['Mountain', mountains],
    ['Plains', plains]
  ].filter(([, count]) => count > 0) as Array<[string, number]>;
}

function enforceKassandraSpearPackage(selected: PickedCard[], allowedOwned: Candidate[], definition: VariantDefinition, removedForPackage: MaybePickedCard[]): void {
  const hasKassandra = selected.some((pick) => pick.candidate.name === KASSANDRA_NAME);
  const hasSpear = selected.some((pick) => pick.candidate.name === SPEAR_NAME);
  if (!hasKassandra || hasSpear) {
    return;
  }
  const spear = allowedOwned.find((candidate) => candidate.name === SPEAR_NAME);
  if (!spear) {
    return;
  }
  if (totalCount(selected) >= 99) {
    const removable = selected
      .map((pick, index) => ({ pick, index, score: scoreCandidate(pick.candidate, definition) }))
      .filter(({ pick }) => pick.candidate.name !== KASSANDRA_NAME && pick.candidate.name !== SPEAR_NAME && !pick.candidate.roles.includes('land'))
      .sort((left, right) => left.score - right.score || right.pick.candidate.manaValue - left.pick.candidate.manaValue);
    const fallback = selected
      .map((pick, index) => ({ pick, index, score: scoreCandidate(pick.candidate, definition) }))
      .filter(({ pick }) => pick.candidate.name !== KASSANDRA_NAME && pick.candidate.name !== SPEAR_NAME)
      .sort((left, right) => left.score - right.score);
    const removal = removable[0] ?? fallback[0];
    if (!removal) {
      return;
    }
    selected.splice(removal.index, 1);
    removedForPackage.push({
      ...removal.pick,
      note: `${removal.pick.candidate.name} moved to Maybeboard so ${definition.name} can keep Kassandra paired with The Spear of Leonidas. Re-test this as a replacement if the Kassandra package underperforms.`
    });
  }
  selected.push({ candidate: spear, count: 1 });
}

function buildMaybeBoardPicks(
  definition: VariantDefinition,
  main: PickedCard[],
  removedForPackage: MaybePickedCard[],
  ownedCandidates: Candidate[],
  recommendationCandidates: Candidate[],
  commanderCandidate: Candidate
): MaybePickedCard[] {
  const mainNames = new Set(main.map((pick) => pick.candidate.keyName));
  const maybeNames = new Set<string>();
  const maybe: MaybePickedCard[] = [];
  const addMaybe = (candidate: Candidate, note: string): void => {
    if (candidate.cardId === commanderCandidate.cardId || KNOWN_OFF_COLOR.has(candidate.name) || !isCommanderLegal(candidate.colorIdentity)) {
      return;
    }
    if (mainNames.has(candidate.keyName) || maybeNames.has(candidate.keyName)) {
      return;
    }
    maybeNames.add(candidate.keyName);
    maybe.push({ candidate, count: 1, note });
  };
  for (const removed of removedForPackage) {
    addMaybe(removed.candidate, removed.note);
  }
  const incomingOwned = ownedCandidates
    .filter((candidate) => candidate.tags.includes('batch-002') || candidate.tags.includes('incoming'))
    .sort((left, right) => scoreCandidate(right, definition) - scoreCandidate(left, definition) || left.name.localeCompare(right.name));
  for (const candidate of incomingOwned) {
    addMaybe(candidate, maybeBoardNote(candidate, definition, replacementTargetFor(candidate, definition, main), 'owned-option'));
  }
  const recommendationMaybes = recommendationCandidates
    .filter((candidate) => !definition.ownedOnly && isCommanderLegal(candidate.colorIdentity) && !candidate.roles.includes('land'))
    .sort((left, right) => scoreCandidate(right, definition) - scoreCandidate(left, definition) || left.name.localeCompare(right.name))
    .slice(0, 8);
  for (const candidate of recommendationMaybes) {
    addMaybe(candidate, maybeBoardNote(candidate, definition, replacementTargetFor(candidate, definition, main), 'recommended-upgrade'));
  }
  return maybe.slice(0, 18);
}

function maybeBoardNote(candidate: Candidate, definition: VariantDefinition, replacementTarget: string | undefined, mode: 'owned-option' | 'recommended-upgrade'): string {
  if (candidate.name === SPEAR_NAME) {
    return `Kassandra package card: move this into the 99 whenever ${KASSANDRA_NAME} is active. If the package feels too slow, cut both together instead of judging either card alone.`;
  }
  const label = mode === 'owned-option' ? 'Maybeboard test' : 'Recommended upgrade';
  const target = replacementTarget ? ` Test against ${replacementTarget} first; that is the current lower-priority ${primaryRoleLabel(candidate)} slot.` : ' Test against the lowest-impact card with the same role before moving it into the 99.';
  return `${label}: ${cardPurpose(candidate)} Variant fit: ${variantFit(candidate, definition)}${target}`;
}

function deckEntryFromPick(definition: VariantDefinition, pick: PickedCard, index: number, section: DeckEntry['section'], noteOverride?: string): DeckEntry {
  const roles = uniqueTags(pick.candidate.roles);
  const tags = uniqueTags([
    ...pick.candidate.tags,
	    definition.id,
    section === 'maybe' ? 'maybe-board' : '',
    section === 'maybe' ? 'replacement-candidate' : '',
    pick.candidate.tags.includes('batch-002') ? 'ordered-option' : '',
	    pick.candidate.owned ? 'owned' : 'recommended',
    pick.candidate.owned ? '' : 'ghost-slot',
    pick.candidate.owned ? '' : 'unowned',
    pick.candidate.owned ? '' : 'gap-filler'
  ]);
  const flags = uniqueTags([
    definition.ownedOnly && pick.candidate.roles.includes('land') ? 'owned-only-land-pool' : '',
	    !pick.candidate.owned ? 'ghost-slot' : '',
	    !pick.candidate.owned ? 'unowned' : '',
    section === 'maybe' ? 'maybe-board' : '',
	    definition.ownedOnly && roles.includes('land') ? landLightFlag(definition.id) : ''
	  ]);
  return deckEntrySchema.parse({
    deckId: DECK_ID,
	    entryId: `${definition.id}-${section}-${String(index + 1).padStart(3, '0')}-${slugify(pick.candidate.name)}`,
	    deckVariantId: definition.id,
	    section,
    count: pick.count,
    setCode: pick.candidate.setCode,
    cardId: pick.candidate.cardId,
    variantId: 'official-print',
    nameSnapshot: pick.candidate.name,
	    candidateStatus: section === 'main' ? 'active' : 'candidate',
    roles,
    roleSource: 'heuristic',
    roleConfidence: pick.candidate.owned ? 0.78 : 0.86,
    impactRating: ratingFor(pick.candidate, definition, 'impact'),
    synergyRating: ratingFor(pick.candidate, definition, 'synergy'),
    qualityRating: ratingFor(pick.candidate, definition, 'quality'),
    entryTags: tags,
	    entryNotes: noteOverride ?? entryNotesFor(pick.candidate, definition, section),
    flags,
    starred: !pick.candidate.owned && pick.candidate.roles.some((role) => ['fixing', 'graveyard', 'evasion', 'protection'].includes(role)),
    markedForDeletion: false
  });
}

function landLightFlag(variantId: string): string {
  return variantId === 'hidden-blade-core' || variantId === 'rooftop-evasion' ? 'land-light-review' : '';
}

function candidateFromEntry(entry: CollectionEntry, owned: boolean): Candidate | undefined {
  const source = parseScryfallSource(entry.sourceRow);
  if (!source || !entry.scryfallId || !entry.setCode) {
    return undefined;
  }
  const roles = uniqueTags([...inferRoles(source, entry.cardName), ...entry.tags.filter((tag) => ROLE_TAGS.has(tag))]);
  return {
    entry,
    card: source,
    owned,
    name: entry.cardName,
    keyName: normalizedName(entry.cardName),
    setCode: entry.setCode.toUpperCase(),
    cardId: entry.scryfallId,
    manaValue: manaValueForCard(source),
    typeLine: typeLineForCard(source),
    oracleText: oracleTextForCard(source),
    colorIdentity: colorIdentityForCard(source),
    roles,
    tags: uniqueTags([...entry.tags, ...roles]),
    quantity: Math.max(1, entry.quantity || 1)
  };
}

const ROLE_TAGS = new Set(['land', 'fixing', 'assassin', 'evasion', 'graveyard', 'exile', 'ramp', 'draw', 'removal', 'wipe', 'protection', 'recursion', 'equipment', 'artifact', 'combat', 'tutor', 'token', 'puzzle', 'finisher', 'interaction', 'haste']);

function inferRoles(card: ScryfallCard | undefined, fallbackName: string): string[] {
  const typeLine = typeLineForCard(card).toLowerCase();
  const oracle = oracleTextForCard(card).toLowerCase();
  const name = fallbackName.toLowerCase();
  const roles: string[] = [];
  if (typeLine.includes('land')) roles.push('land');
  if (typeLine.includes('assassin') || oracle.includes('assassin')) roles.push('assassin');
  if (typeLine.includes('equipment') || oracle.includes('equip') || oracle.includes('attach')) roles.push('equipment');
  if (typeLine.includes('artifact')) roles.push('artifact');
  if (oracle.match(/can't be blocked|unblockable|flying|menace|fear|intimidate|skulk|shadow|landwalk|protection from|nonbasic landwalk/) || name.includes('passage')) roles.push('evasion');
  if (oracle.includes('graveyard') || oracle.includes('surveil') || oracle.includes('mill') || oracle.includes('discard')) roles.push('graveyard');
  if (oracle.includes('exile') || oracle.includes('foretell') || oracle.includes('plot')) roles.push('exile');
  if (oracle.match(/add \{|treasure|search your library for .*land|mana of any color|cost .* less|spells.*cost/)) roles.push('ramp');
  if (oracle.match(/draw (a|two|three|x|that many|cards?) card|look at the top|reveal the top|whenever you cast.*draw|card into your hand/)) roles.push('draw');
  if (oracle.match(/destroy target|exile target|deals? .* damage|sacrifice .* creature|target creature gets -|return target .* to its owner's hand/)) roles.push('removal');
  if (oracle.match(/destroy all|each creature|all creatures|each opponent sacrifices|each player sacrifices/)) roles.push('wipe');
  if (oracle.match(/indestructible|hexproof|protection|prevent .* damage|phase out|ward|can't be sacrificed|regenerate/)) roles.push('protection');
  if (oracle.match(/return .* from your graveyard|cast .* from your graveyard|from your graveyard to your hand|escape/)) roles.push('recursion');
  if (oracle.match(/tutor|search your library|search your graveyard/)) roles.push('tutor');
  if (oracle.match(/attacks|attacking|combat|double strike|first strike|haste|goad|myriad/)) roles.push('combat');
  if (oracle.match(/create .* token|tokens? you control|token that's a copy/)) roles.push('token');
  if (oracle.match(/can't attack you|can't block|tap target creature|creatures your opponents control.*can't block/)) roles.push('puzzle');
  if (oracle.match(/\+1\/\+1|double strike|damage to each opponent|lose the game|extra combat/)) roles.push('finisher');
  if (roles.includes('land') && oracle.match(/any color|one mana of any color|add \{[WUBRG]\}|add one mana/)) roles.push('fixing');
  return uniqueTags(roles.length ? roles : ['utility']);
}

function scoreCandidate(candidate: Candidate, definition: VariantDefinition): number {
  let score = candidate.owned ? 1.5 : 0.8;
  if (candidate.name === COMMANDER_NAME) {
    return -999;
  }
  if (candidate.roles.includes('land')) {
    score += definition.roleWeights.land ?? 1;
  }
  for (const role of candidate.roles) {
    score += definition.roleWeights[role] ?? 0;
  }
  if (candidate.manaValue <= 2 && !candidate.roles.includes('land')) score += 1.2;
  if (candidate.manaValue >= 6 && !candidate.roles.includes('finisher')) score -= 0.7;
  if (candidate.roles.includes('assassin') && candidate.roles.includes('evasion')) score += 1.5;
  if (candidate.roles.includes('graveyard') && candidate.roles.includes('exile')) score += 1.1;
  if (!candidate.owned && definition.includeRecommendations.some((name) => normalizedName(name) === candidate.keyName)) score += 5;
  return score;
}

function recommendedLandPriority(candidate: Candidate, definition: VariantDefinition): number {
  const exact = definition.includeRecommendations.some((name) => normalizedName(name) === candidate.keyName) ? 100 : 0;
  const fixing = candidate.roles.includes('fixing') ? 20 : 0;
  const utility = candidate.roles.some((role) => ['evasion', 'graveyard'].includes(role)) ? 12 : 0;
  const basic = BASIC_LANDS.has(candidate.name) ? -5 : 0;
  return exact + fixing + utility + basic + scoreCandidate(candidate, definition);
}

function ratingFor(candidate: Candidate, definition: VariantDefinition, kind: 'impact' | 'synergy' | 'quality'): number {
  const score = scoreCandidate(candidate, definition);
  if (kind === 'quality') {
    if (!candidate.owned && candidate.tags.includes('premium')) return 5;
    if (candidate.roles.includes('fixing') || candidate.roles.includes('protection') || candidate.roles.includes('removal')) return candidate.owned ? 3 : 4;
    return Math.max(2, Math.min(4, Math.round(score / 4)));
  }
  if (kind === 'synergy') {
    const synergyRoles = candidate.roles.filter((role) => ['assassin', 'evasion', 'graveyard', 'exile', 'equipment', 'combat', 'token', 'puzzle'].includes(role)).length;
    return Math.max(1, Math.min(5, synergyRoles + (!candidate.owned ? 1 : 0)));
  }
  return Math.max(1, Math.min(5, Math.round(score / 3)));
}

function entryNotesFor(candidate: Candidate, definition: VariantDefinition, section: DeckEntry['section'] = 'main'): string {
  const prefix = section === 'maybe' ? 'Maybeboard lens' : 'Why it is here';
  const recommendationNote = candidate.owned ? '' : ' Recommendation slot: keep it visually unowned until Kyle adds the card to the owned pool.';
  return `${prefix}: ${cardPurpose(candidate)} Variant fit: ${variantFit(candidate, definition)} Role lens: ${roleSummary(candidate.roles)}.${recommendationNote}`.trim();
}

function noteForRoles(roles: string[]): string {
  return `Deck-building lens: ${roleSummary(roles)}.`;
}

function replacementTargetFor(candidate: Candidate, definition: VariantDefinition, main: PickedCard[]): string | undefined {
  const candidateIsLand = candidate.roles.includes('land');
  const protectedNames = new Set([COMMANDER_NAME, KASSANDRA_NAME, SPEAR_NAME]);
  const pool = main.filter((pick) => !protectedNames.has(pick.candidate.name) && pick.candidate.name !== candidate.name);
  const roleMatches = pool.filter((pick) => pick.candidate.roles.includes('land') === candidateIsLand && pick.candidate.roles.some((role) => candidate.roles.includes(role)));
  const fallback = pool.filter((pick) => pick.candidate.roles.includes('land') === candidateIsLand);
  const candidates = (roleMatches.length ? roleMatches : fallback.length ? fallback : pool)
    .slice()
    .sort((left, right) => scoreCandidate(left.candidate, definition) - scoreCandidate(right.candidate, definition) || right.candidate.manaValue - left.candidate.manaValue || left.candidate.name.localeCompare(right.candidate.name));
  return candidates[0]?.candidate.name;
}

function cardPurpose(candidate: Candidate): string {
  const specific = cardSpecificPurpose(candidate);
  if (specific) {
    return specific;
  }
  const oracle = candidate.oracleText.toLowerCase();
  if (candidate.roles.includes('land') && candidate.roles.includes('fixing')) {
    return 'Stabilizes the Mardu mana base so Altaïr can come down on time and the deck can cast black, red, and white spells in the same game.';
  }
  if (candidate.roles.includes('land')) {
    return 'Fills the mana base; in this deck, lands are also being watched because the owned-only builds are short on scanned basics.';
  }
  if (candidate.roles.includes('assassin') && candidate.roles.includes('evasion')) {
    return 'Adds an Assassin body that can connect through blockers, which is the cleanest creature profile for Altaïr combat turns.';
  }
  if (candidate.roles.includes('graveyard') && candidate.roles.includes('draw')) {
    return 'Filters cards while putting useful creatures or spells into the graveyard, setting up Altaïr without committing to full reanimation.';
  }
  if (candidate.roles.includes('graveyard') && candidate.roles.includes('tutor')) {
    return 'Places the right graveyard card on purpose, turning Altaïr from a value commander into a planned combat engine.';
  }
  if (candidate.roles.includes('graveyard') && candidate.roles.includes('exile')) {
    return 'Sits directly in the deck theme: graveyard resources become exile or temporary value instead of permanent graveyard recursion.';
  }
  if (candidate.roles.includes('evasion') && candidate.roles.includes('equipment')) {
    return 'Turns one key attacker into a reliable connection point, which matters when Altaïr needs combat to convert setup into value.';
  }
  if (candidate.roles.includes('evasion')) {
    if (oracle.includes("can't block") || oracle.includes('can\'t block')) {
      return 'Creates a cannot-block window, making the attack step feel like a puzzle the opponent has already failed to solve.';
    }
    return 'Helps attackers connect through flying, menace, unblockable, or similar pressure instead of fighting fair through blockers.';
  }
  if (candidate.roles.includes('protection')) {
    return 'Protects Altaïr or the attack board so the deck can commit to combat without losing its engine to the first answer.';
  }
  if (candidate.roles.includes('removal') || candidate.roles.includes('interaction')) {
    return 'Clears blockers, engines, or problem permanents so the Assassin plan can keep attacking instead of stalling out.';
  }
  if (candidate.roles.includes('equipment') || candidate.roles.includes('artifact')) {
    return 'Supports the relic/toolbelt side of the deck, where artifacts turn individual attackers into harder-to-answer threats.';
  }
  if (candidate.roles.includes('ramp') || candidate.roles.includes('fixing')) {
    return 'Smooths early mana so the deck can move from setup into Altaïr combat turns without stumbling.';
  }
  if (candidate.roles.includes('draw')) {
    return 'Keeps cards moving so the deck can find evasive attackers, graveyard setup, and protection in the same game.';
  }
  if (candidate.roles.includes('combat') || candidate.roles.includes('puzzle')) {
    return 'Changes combat math in a way that supports the deck fantasy: attacks should be hard to block, punish blocks, or force awkward choices.';
  }
  return 'Utility card for the current variant; keep it under review against more focused evasion, graveyard, protection, or mana pieces.';
}

function cardSpecificPurpose(candidate: Candidate): string | undefined {
  switch (candidate.keyName) {
    case normalizedName(COMMANDER_NAME):
      return 'Commander and engine: exile Assassins from the graveyard, then turn combat into temporary copied attackers and attack triggers.';
    case normalizedName(KASSANDRA_NAME):
      return 'Package attacker for The Spear of Leonidas; she should be tested as a pair, not as a standalone creature.';
    case normalizedName(SPEAR_NAME):
      return 'Required Kassandra package piece that converts her into a much more meaningful combat engine.';
    case normalizedName("Staff of Eden, Vault's Key"):
      return 'Legendary artifact value piece for the relic package; test it as top-end card flow or utility rather than as graveyard setup.';
    case normalizedName('Apple of Eden, Isu Relic'):
      return 'Assassin-flavored relic payoff that belongs in artifact/exile-value builds when the deck wants a bigger legendary artifact package.';
    case normalizedName('The Animus'):
      return 'Theme engine for Memory Corridor: it pushes the deck toward graveyard/exile play patterns instead of plain creature recursion.';
    case normalizedName('Cathartic Reunion'):
      return 'Excellent setup spell: discard Assassins or clunky cards, draw deeper, and make the graveyard useful for Altaïr.';
    case normalizedName('Distract the Guards'):
      return 'On-theme combat puzzle card that can open a turn where blocks stop mattering.';
    case normalizedName('Fall of the First Civilization'):
      return 'Long-game saga/wipe candidate; useful when the deck needs reset power, but it competes with faster setup and protection.';
    case normalizedName('Hemlock Vial'):
      return 'Cheap Assassin relic/intervention slot; test it where artifact count and interaction density both matter.';
    case normalizedName('Mjolnir, Storm Hammer'):
      return 'Top-end Equipment finisher for Brotherhood Arsenal, best when the deck is already protecting and connecting with one attacker.';
    case normalizedName('Mortify'):
      return 'Flexible removal that answers both creatures and enchantments, a useful Mardu gap-filler.';
    case normalizedName('Roshan, Hidden Magister'):
      return 'Assassin density and freerunning support; strongest when the variant wants more bodies that naturally fit the tribe.';
    case normalizedName('Towering Viewpoint'):
      return 'Land/setup card that supports freerunning and evasive attack sequencing while helping the mana count.';
    case normalizedName('Yggdrasil, Rebirth Engine'):
      return 'Powerful recursion/value engine, but it should be watched carefully because it can pull the deck toward normal reanimator play.';
    case normalizedName("Rogue's Passage"):
      return 'Deterministic unblockable line from the mana base; perfect for making Altaïr or one loaded Assassin connect.';
    case normalizedName('Path of Ancestry'):
      return 'Tribal fixer that also scries when casting Assassins, so it improves both mana and card quality.';
    case normalizedName('Cover of Darkness'):
      return 'One of the cleanest Assassin evasion upgrades: name Assassin and make blocking dramatically harder.';
    case normalizedName('Reconnaissance'):
      return 'Lets the deck attack more freely, then pull creatures out of bad combat after triggers or pressure are established.';
    case normalizedName('Dolmen Gate'):
      return 'Protects attacking creatures, encouraging the deck to commit to combat without trading off its engine pieces.';
    case normalizedName('Buried Alive'):
      return 'Premium Altaïr setup: choose the exact Assassins or graveyard cards that should become future combat value.';
    case normalizedName('Entomb'):
      return 'Fastest graveyard setup option, turning one card into the exact Altaïr target the game needs.';
    case normalizedName('Unmarked Grave'):
      return 'Budget graveyard tutor for nonlegendary setup pieces, useful when Memory Corridor needs redundancy.';
    case normalizedName('Oriq Loremage'):
      return 'Repeatable graveyard loader that turns later turns into deliberate Altaïr setup instead of random milling.';
    case normalizedName('Dauthi Voidwalker'):
      return 'Shadow evasion plus exile pressure; it attacks the graveyard axis while remaining hard to block.';
    case normalizedName('Maskwood Nexus'):
      return 'Creature-type glue: makes more bodies count as Assassins for Altaïr and tribal payoffs.';
    case normalizedName("Herald's Horn"):
      return 'Assassin cost reduction plus card selection, best in variants trying to keep creature density high.';
    case normalizedName("Vanquisher's Banner"):
      return 'Tribal payoff that turns Assassin casts into cards and makes the board hit harder.';
    case normalizedName('Shared Animosity'):
      return 'Turns a wide Assassin attack into lethal pressure, especially with copied or token attackers.';
    case normalizedName('Isshin, Two Heavens as One'):
      return 'Attack-trigger multiplier that rewards the deck for building around combat triggers instead of simple damage.';
    case normalizedName('The Master, Multiplied'):
      return 'Experimental token-copy piece that may bend temporary-token drawbacks into lasting pressure.';
    case normalizedName('Key to the City'):
      return 'Unblockable outlet that also discards cards, so it advances both evasion and graveyard setup.';
    case normalizedName('Whispersilk Cloak'):
      return 'Unblockable plus protection for the one attacker that absolutely needs to connect.';
    case normalizedName("Trailblazer's Boots"):
      return 'Often functions like unblockable in Commander because nonbasic lands are everywhere.';
    case normalizedName('Lightning Greaves'):
      return 'Protects Altaïr and gives haste, letting the deck convert commander recasts into immediate combat value.';
    case normalizedName('Swiftfoot Boots'):
      return 'Flexible commander protection that still allows targeted support because it grants hexproof instead of shroud.';
    case normalizedName('Skullclamp'):
      return 'Card-flow engine for small creatures and temporary bodies; strongest when the deck can turn deaths into cards.';
    case normalizedName('Boros Charm'):
      return 'Protects the board from sweepers or creates a surprise double-strike kill.';
    case normalizedName("Teferi's Protection"):
      return 'Premium safety valve for overcommitted combat turns and commander-board protection.';
    case normalizedName('Anguished Unmaking'):
      return 'Flexible answer to almost any problem permanent at instant speed.';
    case normalizedName('Feed the Swarm'):
      return 'Black enchantment answer, which covers a real Mardu interaction weakness.';
    case normalizedName('Wear // Tear'):
      return 'Efficient artifact/enchantment interaction with useful split-card flexibility.';
    case normalizedName('Arcane Signet'):
    case normalizedName('Fellwar Stone'):
    case normalizedName('Rakdos Signet'):
    case normalizedName('Boros Signet'):
    case normalizedName('Orzhov Signet'):
    case normalizedName('Talisman of Conviction'):
    case normalizedName('Talisman of Hierarchy'):
    case normalizedName('Talisman of Indulgence'):
      return 'Two-mana acceleration and fixing, which this Mardu deck needs so Altaïr and the support pieces arrive on curve.';
    default:
      return undefined;
  }
}

function variantFit(candidate: Candidate, definition: VariantDefinition): string {
  switch (definition.id) {
    case 'hidden-blade-core':
      if (candidate.roles.includes('land')) return 'Keeps the owned-only mana count visible, even when the current pool is land-light.';
      if (candidate.roles.includes('graveyard')) return 'Tests whether the owned pool can load Altaïr targets without recommended tutors.';
      if (candidate.roles.includes('evasion')) return 'Shows how much unblockable pressure Kyle already owns.';
      return 'Included to measure the real owned pool before upgrade decisions.';
    case 'rooftop-evasion':
      if (candidate.roles.includes('evasion') || candidate.roles.includes('puzzle')) return 'Directly supports the cannot-block combat plan.';
      if (candidate.roles.includes('equipment')) return 'Helps one evasive attacker become the threat that must be answered.';
      return 'Kept only if it helps the owned-only combat build stay interactive or consistent.';
    case 'memory-corridor':
      if (candidate.roles.includes('graveyard') || candidate.roles.includes('exile')) return 'This is one of the cards that makes the memory/exile engine feel intentional.';
      if (candidate.roles.includes('draw')) return 'Finds setup pieces while keeping the graveyard stocked.';
      return 'Supports the graveyard plan by protecting, fixing, or clearing the way for Altaïr turns.';
    case 'brotherhood-arsenal':
      if (candidate.roles.includes('equipment') || candidate.roles.includes('artifact')) return 'Fits the relic/toolbelt identity of this variant.';
      if (candidate.roles.includes('protection')) return 'Protects the suited-up attacker or Altaïr engine.';
      return 'Included if it helps the artifact package survive long enough to matter.';
    case 'nothing-is-true':
      if (candidate.roles.includes('fixing') || candidate.roles.includes('ramp')) return 'Raises the deck floor by making the mana work.';
      if (candidate.roles.includes('removal') || candidate.roles.includes('protection')) return 'Keeps the practical build from folding to common Commander interaction.';
      return 'Chosen for functional reliability more than flavor.';
    case 'everything-is-permitted':
      if (candidate.roles.includes('puzzle') || candidate.roles.includes('token') || candidate.roles.includes('combat')) return 'Belongs in the weird-line sandbox where combat rules and triggers get bent.';
      if (candidate.roles.includes('evasion')) return 'Pushes the variant toward clever unblockable turns.';
      return 'Included as a speculative piece if it creates unusual sequencing or supports those experiments.';
    default:
      return `Supports ${definition.name}'s main role package.`;
  }
}

function roleSummary(roles: string[]): string {
  const labels = uniqueTags(roles).slice(0, 4).map(roleLabel);
  return labels.length ? humanList(labels) : 'utility';
}

function primaryRoleLabel(candidate: Candidate): string {
  return roleLabel(candidate.roles.find((role) => role !== 'artifact' && role !== 'assassin') ?? candidate.roles[0] ?? 'utility');
}

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    land: 'land',
    fixing: 'mana fixing',
    assassin: 'Assassin density',
    evasion: 'evasion',
    graveyard: 'graveyard setup',
    exile: 'exile value',
    ramp: 'ramp',
    draw: 'card flow',
    removal: 'removal',
    wipe: 'board reset',
    protection: 'protection',
    recursion: 'recursion',
    equipment: 'Equipment',
    artifact: 'artifact support',
    combat: 'combat pressure',
    tutor: 'tutor/setup',
    token: 'token/copy line',
    puzzle: 'combat puzzle',
    finisher: 'finisher',
    interaction: 'interaction',
    haste: 'haste'
  };
  return labels[role] ?? role;
}

function humanList(items: string[]): string {
  if (items.length <= 1) {
    return items[0] ?? '';
  }
  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

async function ensureSignsOfAssassinsSet(now: string, coverImageUrl?: string): Promise<void> {
  await ensureLibraryEntry(now, coverImageUrl);
  const setDir = join(REPO_ROOT, 'sets', SET_CODE);
  await mkdir(setDir, { recursive: true });
  await mkdir(join(setDir, 'art'), { recursive: true });
  await writeFile(join(setDir, 'sets.csv'), `${writeCsvRecords([{
    set_code: SET_CODE,
    set_name: SET_NAME,
    set_type: 'custom',
    version: '0.1.0',
    default_language: 'en',
    default_asset_pack: 'basic-m15-local',
    default_export_profile: 'cockatrice',
    author: 'Jonathan Kyle Hobson',
    status: 'draft',
    tags: 'assassin;commander;mardu;deck-building',
    notes: 'Empty authored shell for the Signs of Assassins deck-building project. Official imported cards stay in collections and decks, not in authored card records.'
  }], SET_HEADERS)}\n`, 'utf8');
  await ensureCsvFile(join(setDir, 'cards.csv'), CARD_HEADERS);
  await ensureCsvFile(join(setDir, 'card_faces.csv'), FACE_HEADERS);
  await ensureCsvFile(join(setDir, 'card_variants.csv'), VARIANT_HEADERS);
  await ensureCsvFile(join(setDir, 'card_variant_faces.csv'), FACE_HEADERS);
  await ensureCsvFile(join(setDir, 'art_manifest.csv'), ART_HEADERS);
  await ensureCsvFile(join(setDir, 'export_profiles.csv'), EXPORT_HEADERS);
}

async function ensureLibraryEntry(now: string, coverImageUrl?: string): Promise<void> {
  const path = join(REPO_ROOT, 'sets', 'library.json');
  const library = JSON.parse(await readFile(path, 'utf8')) as {
    universes?: Array<Record<string, unknown>>;
    sets?: Array<Record<string, unknown>>;
  };
  const universes = Array.isArray(library.universes) ? library.universes : [];
  const sets = Array.isArray(library.sets) ? library.sets : [];
	  upsertByKey(universes, 'id', PROJECT_ID, {
	    id: PROJECT_ID,
	    name: PROJECT_NAME,
	    description: "Deck-building project for Kyle's Altaïr Assassin Commander deck, owned ledger, recommendations, flags, and variants.",
	    status: 'draft',
	    tags: ['assassin', 'commander', 'mardu', 'deck-building'],
    coverImageUrl,
	    updatedAt: now
	  });
  const nextSort = Math.max(0, ...sets.map((set) => Number(set.sortOrder) || 0)) + 10;
  upsertByKey(sets, 'setCode', SET_CODE, {
    setCode: SET_CODE,
    universeId: PROJECT_ID,
    sortOrder: nextSort
  });
  await writeFile(path, `${JSON.stringify({ ...library, universes, sets }, null, 2)}\n`, 'utf8');
}

async function ensureCsvFile(path: string, headers: string[]): Promise<void> {
  if (existsSync(path)) {
    return;
  }
  await writeFile(path, `${headers.join(',')}\n`, 'utf8');
}

function upsertByKey(items: Array<Record<string, unknown>>, key: string, value: string, next: Record<string, unknown>): void {
  const index = items.findIndex((item) => item[key] === value);
  if (index >= 0) {
    items[index] = { ...items[index], ...next };
    return;
  }
  items.push(next);
}

async function fetchScryfallCardsById(ids: string[]): Promise<Map<string, ScryfallCard>> {
  const uniqueIds = [...new Set(ids.map((id) => clean(id).toLowerCase()).filter(Boolean))];
  const cards = new Map<string, ScryfallCard>();
  for (let index = 0; index < uniqueIds.length; index += 75) {
    const chunk = uniqueIds.slice(index, index + 75);
    const response = await scryfallJson<{ data?: ScryfallCard[] }>('https://api.scryfall.com/cards/collection', {
      method: 'POST',
      body: JSON.stringify({ identifiers: chunk.map((id) => ({ id })) })
    });
    for (const card of response.data ?? []) {
      cards.set(card.id.toLowerCase(), card);
    }
    await delay(80);
  }
  return cards;
}

async function fetchRecommendedCards(): Promise<Map<string, ScryfallCard>> {
  return fetchScryfallCardsByName(RECOMMENDATIONS.map((recommendation) => recommendation.name));
}

async function fetchScryfallCardsByName(names: string[]): Promise<Map<string, ScryfallCard>> {
  const cards = new Map<string, ScryfallCard>();
  const uniqueNames = [...new Set(names.map(normalizeScryfallLookupName).filter(Boolean))];
  for (let index = 0; index < uniqueNames.length; index += 75) {
    const chunk = uniqueNames.slice(index, index + 75);
    const response = await scryfallJson<{ data?: ScryfallCard[]; not_found?: Array<Record<string, unknown>> }>('https://api.scryfall.com/cards/collection', {
      method: 'POST',
      body: JSON.stringify({ identifiers: chunk.map((name) => ({ name })) })
    });
    for (const card of response.data ?? []) {
      cards.set(normalizedName(card.name), card);
    }
    for (const missing of response.not_found ?? []) {
      const name = clean(missing.name);
      if (!name) {
        console.warn(`Recommendation lookup missing: ${JSON.stringify(missing)}`);
        continue;
      }
      try {
        const card = await scryfallJson<ScryfallCard>(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name.replace(/\s*\/\/\s*/g, ' '))}`);
        cards.set(normalizedName(card.name), card);
        cards.set(normalizedName(name), card);
      } catch (error) {
        console.warn(`Recommendation lookup missing: ${JSON.stringify(missing)} (${error instanceof Error ? error.message : String(error)})`);
      }
    }
    await delay(80);
  }
  return cards;
}

async function scryfallJson<T>(url: string, init: RequestInit = {}, retries = 2): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'HomebrewForgeCodexImport/1.0',
      ...(init.headers ?? {})
    }
  });
  if (response.status === 429 && retries > 0) {
    const retryAfterSeconds = Number(response.headers.get('retry-after')) || 65;
    console.warn(`Scryfall rate limit reached; waiting ${retryAfterSeconds}s before retrying.`);
    await delay(retryAfterSeconds * 1000);
    return scryfallJson<T>(url, init, retries - 1);
  }
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`${response.status} ${response.statusText}${text ? `: ${text.slice(0, 180)}` : ''}`);
  }
  return (await response.json()) as T;
}

function parseScryfallSource(sourceRow: string | undefined): ScryfallCard | undefined {
  if (!sourceRow) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(sourceRow) as Record<string, unknown>;
    const candidate = (parsed.enrichment ?? parsed.scryfall ?? parsed) as ScryfallCard;
    return candidate?.id ? candidate : undefined;
  } catch {
    try {
      const parsed = JSON.parse(sourceRow.replace(/\r?\n/g, '\\n')) as Record<string, unknown>;
      const candidate = (parsed.enrichment ?? parsed.scryfall ?? parsed) as ScryfallCard;
      return candidate?.id ? candidate : undefined;
    } catch {
      return undefined;
    }
  }
}

function marketPriceForCard(card: ScryfallCard | undefined, finish: string | undefined): number | undefined {
  const prices = card?.prices;
  const raw = clean(finish).toLowerCase().includes('foil') ? prices?.usd_foil : prices?.usd;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function coverImageUrlForCard(card: ScryfallCard | undefined): string | undefined {
  const images = card?.image_uris ?? card?.card_faces?.find((face) => face.image_uris)?.image_uris as Record<string, string> | undefined;
  return clean(images?.art_crop) || clean(images?.normal) || clean(images?.large) || clean(images?.png) || undefined;
}

function colorIdentityForCard(card: ScryfallCard | undefined): string[] {
  return Array.isArray(card?.color_identity) ? card.color_identity.map((color) => clean(color).toUpperCase()).filter(Boolean) : [];
}

function isCommanderLegal(colors: string[]): boolean {
  return colors.every((color) => COMMANDER_COLORS.has(color));
}

function typeLineForCard(card: ScryfallCard | undefined): string {
  return clean(card?.type_line) || clean(card?.card_faces?.[0]?.type_line);
}

function oracleTextForCard(card: ScryfallCard | undefined): string {
  if (clean(card?.oracle_text)) {
    return clean(card?.oracle_text);
  }
  const faces = card?.card_faces ?? [];
  return faces.map((face) => clean(face.oracle_text)).filter(Boolean).join('\n\n');
}

function manaValueForCard(card: ScryfallCard | undefined): number {
  const value = Number(card?.mana_value ?? card?.cmc ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function languageLabel(lang: string | undefined): string | undefined {
  return clean(lang) || undefined;
}

function countBy<T>(values: T[], keyFor: (value: T) => string, countFor: (value: T) => number): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) {
    const key = keyFor(value);
    counts.set(key, (counts.get(key) ?? 0) + countFor(value));
  }
  return counts;
}

function verifyDeck(entries: DeckEntry[]): Record<string, { count: number; land: number; ghost: number; duplicateNonbasicNames: string[] }> {
  const totals: Record<string, { count: number; land: number; ghost: number; duplicateNonbasicNames: string[] }> = {};
  for (const variant of VARIANTS) {
    const variantEntries = entries.filter((entry) => entry.deckVariantId === variant.id && entry.section === 'main');
    const nameCounts = countBy(variantEntries, (entry) => normalizedName(entry.nameSnapshot ?? entry.cardId), (entry) => entry.count);
    const duplicateNonbasicNames = [...nameCounts.entries()]
      .filter(([name, count]) => count > 1 && ![...BASIC_LANDS].map(normalizedName).includes(name))
      .map(([name]) => name);
    const land = variantEntries.filter((entry) => entry.roles?.includes('land')).reduce((sum, entry) => sum + entry.count, 0);
    totals[variant.id] = {
      count: variantEntries.reduce((sum, entry) => sum + entry.count, 0),
      land,
      ghost: variantEntries.filter((entry) => entry.entryTags?.includes('ghost-slot')).reduce((sum, entry) => sum + entry.count, 0),
      duplicateNonbasicNames
    };
    if (totals[variant.id].count !== 99) {
      throw new Error(`${variant.name} has ${totals[variant.id].count} main-deck cards, expected 99.`);
    }
    if (land < variant.landTarget) {
      throw new Error(`${variant.name} has ${land} lands, expected at least ${variant.landTarget}.`);
    }
    if (duplicateNonbasicNames.length) {
      throw new Error(`${variant.name} has duplicate nonbasic names: ${duplicateNonbasicNames.join(', ')}`);
    }
  }
  return totals;
}

function totalCount(picks: PickedCard[]): number {
  return picks.reduce((sum, pick) => sum + pick.count, 0);
}

function uniqueTags(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const value of values) {
    const tag = clean(value);
    if (!tag) {
      continue;
    }
    const key = tag.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    tags.push(tag);
  }
  return tags;
}

function uniqueSentences(values: Array<string | undefined>): string[] {
  return uniqueTags(values.flatMap((value) => clean(value).split(/(?<=\.)\s+/)));
}

function normalizedName(value: string | undefined): string {
  return clean(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[‘’`]/g, "'").toLowerCase();
}

function normalizeScryfallLookupName(value: string | undefined): string {
  return clean(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[‘’`]/g, "'");
}

function slugify(value: string): string {
  return normalizedName(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'card';
}

function clean(value: unknown): string {
  return String(value ?? '').trim();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

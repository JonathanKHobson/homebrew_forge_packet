import { defaultReferenceCatalog, referenceOptionsForCategory } from '@homebrew-forge/forge/reference';

const REFERENCE_CATALOG = defaultReferenceCatalog();

export const COLOR_SYMBOLS = [
  { symbol: 'W', label: 'White' },
  { symbol: 'U', label: 'Blue' },
  { symbol: 'B', label: 'Black' },
  { symbol: 'R', label: 'Red' },
  { symbol: 'G', label: 'Green' },
  { symbol: 'C', label: 'Colorless' }
] as const;

export const COLOR_IDENTITY_OPTIONS = [
  'C',
  'W',
  'U',
  'B',
  'R',
  'G',
  'WU',
  'WB',
  'WR',
  'WG',
  'UB',
  'UR',
  'UG',
  'BR',
  'BG',
  'RG',
  'WUB',
  'WUR',
  'WUG',
  'WBR',
  'WBG',
  'WRG',
  'UBR',
  'UBG',
  'URG',
  'BRG',
  'WUBR',
  'WUBG',
  'WURG',
  'WBRG',
  'UBRG',
  'WUBRG'
] as const;

export const SUPERTYPES = referenceOptionsForCategory(REFERENCE_CATALOG, 'supertype');

export const CARD_TYPES = referenceOptionsForCategory(REFERENCE_CATALOG, 'card-type');

const COMMON_CARD_TYPE_COMBOS = [
  'Artifact',
  'Artifact Creature',
  'Artifact Enchantment',
  'Artifact Enchantment Creature',
  'Artifact Land',
  'Artifact Land Creature',
  'Battle',
  'Conspiracy',
  'Creature',
  'Enchantment',
  'Enchantment Artifact',
  'Enchantment Artifact Creature',
  'Enchantment Artifact Land',
  'Enchantment Artifact Land Creature',
  'Enchantment Creature',
  'Enchantment Land',
  'Enchantment Land Creature',
  'Enchantment Saga',
  'Instant',
  'Land',
  'Land Creature',
  'Planeswalker',
  'Sorcery'
];

export const CARD_TYPE_COMBOS = [...new Set([...COMMON_CARD_TYPE_COMBOS, ...CARD_TYPES])];

export const COMMON_SUBTYPES = referenceOptionsForCategory(REFERENCE_CATALOG, 'subtype');

export const RARITIES = ['common', 'uncommon', 'rare', 'mythic', 'special', 'bonus', 'token'] as const;

export const BORDER_COLORS = ['black', 'white', 'silver', 'gold'] as const;

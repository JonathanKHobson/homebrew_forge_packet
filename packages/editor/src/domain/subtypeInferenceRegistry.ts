import type { FrameSupportEntry } from './frameSupportTypes.js';
import { COMMON_SUBTYPES } from './magicTerms.js';

const DEMO_TAGS = ['frame-support-squirrel-lab'];

const SPECIAL_SUBTYPE_INFERENCE_SUPPORT: FrameSupportEntry[] = [
  subtype('saga', 'Saga', 'asset-present-unwired', ['Enchantment', 'Saga'], 'saga'),
  subtype('class', 'Class', 'asset-present-unwired', ['Enchantment', 'Class'], 'class'),
  subtype('case', 'Case', 'partial-renderer', ['Enchantment', 'Case'], 'case'),
  subtype('room', 'Room', 'partial-renderer', ['Enchantment', 'Room'], 'split'),
  subtype('vehicle', 'Vehicle', 'partial-renderer', ['Artifact', 'Vehicle'], 'vehicle', ['crew', 'power', 'toughness']),
  subtype('equipment', 'Equipment', 'partial-renderer', ['Artifact', 'Equipment'], 'equipment', ['equip/reconfigure text']),
  subtype('aura', 'Aura', 'partial-renderer', ['Enchantment', 'Aura'], 'aura', ['enchant line']),
  subtype('omen', 'Omen', 'partial-renderer', ['Omen'], 'adventure'),
  subtype('adventure', 'Adventure', 'partial-renderer', ['Adventure'], 'adventure'),
  subtype('lesson', 'Lesson', 'renderable', ['Instant', 'Lesson'], 'normal_creature'),
  subtype('siege', 'Siege', 'partial-renderer', ['Battle', 'Siege'], 'battle', ['defense']),
  subtype('attraction', 'Attraction', 'partial-renderer', ['Artifact', 'Attraction'], 'attraction'),
  subtype('spacecraft', 'Spacecraft', 'registered-only', ['Artifact', 'Spacecraft'], 'normal_artifact'),
  subtype('role', 'Role', 'partial-renderer', ['Token', 'Enchantment', 'Role'], 'token_creature'),
  subtype('food', 'Food', 'renderable', ['Artifact', 'Food'], 'token_creature'),
  subtype('clue', 'Clue', 'renderable', ['Artifact', 'Clue'], 'token_creature'),
  subtype('treasure', 'Treasure', 'renderable', ['Artifact', 'Treasure'], 'token_creature'),
  subtype('blood', 'Blood', 'renderable', ['Artifact', 'Blood'], 'token_creature'),
  subtype('map', 'Map', 'renderable', ['Artifact', 'Map'], 'token_creature'),
  subtype('powerstone', 'Powerstone', 'renderable', ['Artifact', 'Powerstone'], 'token_creature'),
  subtype('incubator', 'Incubator', 'renderable', ['Artifact', 'Incubator'], 'token_creature'),
  subtype('background', 'Background', 'partial-renderer', ['Enchantment', 'Background'], 'normal_enchantment'),
  subtype('cartouche', 'Cartouche', 'partial-renderer', ['Enchantment', 'Cartouche'], 'normal_enchantment'),
  subtype('curse', 'Curse', 'partial-renderer', ['Enchantment', 'Curse'], 'normal_enchantment'),
  subtype('rune', 'Rune', 'partial-renderer', ['Enchantment', 'Rune'], 'normal_enchantment'),
  subtype('shrine', 'Shrine', 'partial-renderer', ['Enchantment', 'Shrine'], 'normal_enchantment'),
  subtype('fortification', 'Fortification', 'partial-renderer', ['Artifact', 'Fortification'], 'normal_artifact'),
  subtype('contraption', 'Contraption', 'registered-only', ['Artifact', 'Contraption'], 'contraption')
];

const SPECIAL_SUBTYPE_IDS = new Set(SPECIAL_SUBTYPE_INFERENCE_SUPPORT.map((entry) => entry.displayName.toLowerCase()));

export const SUBTYPE_INFERENCE_SUPPORT: FrameSupportEntry[] = [
  ...SPECIAL_SUBTYPE_INFERENCE_SUPPORT,
  ...COMMON_SUBTYPES.filter((subtypeName) => !SPECIAL_SUBTYPE_IDS.has(subtypeName.toLowerCase())).map((subtypeName) =>
    subtype(
      subtypeName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      subtypeName,
      'registered-only',
      [subtypeName],
      'normal'
    )
  )
];

export function hasSubtype(subtypes: string, subtype: string): boolean {
  const normalized = subtype.toLowerCase();
  return subtypes
    .toLowerCase()
    .split(/[\s,;/]+/)
    .filter(Boolean)
    .includes(normalized);
}

function subtype(
  id: string,
  displayName: string,
  supportState: FrameSupportEntry['supportState'],
  typeLineIncludes: string[],
  fallbackRenderer: string,
  requiredData?: string[]
): FrameSupportEntry {
  return {
    id: `subtype:${id}`,
    displayName,
    category: 'subtype',
    supportState,
    inferredFrom: { typeLineIncludes },
    requiredData,
    fallbackRenderer,
    licenseStatus: supportState === 'reference-only' ? 'reference-only' : 'unknown',
    demoTags: DEMO_TAGS
  };
}

import type { FrameSupportEntry } from './frameSupportTypes.js';

const DEFAULT_DEMO_TAGS = ['frame-support-squirrel-lab'];

export const CARD_TYPE_SUPPORT: FrameSupportEntry[] = [
  entry('artifact', 'Artifact', 'renderable', ['Artifact'], 'normal_artifact'),
  entry('battle', 'Battle', 'registered-only', ['Battle'], 'battle'),
  entry('boss', 'Boss', 'registered-only', ['Boss'], 'normal'),
  entry('conspiracy', 'Conspiracy', 'registered-only', ['Conspiracy'], 'conspiracy'),
  entry('creature', 'Creature', 'renderable', ['Creature'], 'normal_creature'),
  entry('dungeon', 'Dungeon', 'registered-only', ['Dungeon'], 'dungeon'),
  entry('emblem', 'Emblem', 'registered-only', ['Emblem'], 'emblem'),
  entry('enchantment', 'Enchantment', 'renderable', ['Enchantment'], 'normal_creature'),
  entry('event', 'Event', 'registered-only', ['Event'], 'normal'),
  entry('hero', 'Hero', 'registered-only', ['Hero'], 'normal'),
  entry('instant', 'Instant', 'renderable', ['Instant'], 'normal_creature'),
  entry('kindred', 'Kindred', 'registered-only', ['Kindred', 'Tribal'], 'normal'),
  entry('land', 'Land', 'renderable', ['Land'], 'normal_land'),
  entry('phenomenon', 'Phenomenon', 'registered-only', ['Phenomenon'], 'phenomenon'),
  entry('plane', 'Plane', 'registered-only', ['Plane'], 'plane'),
  entry('planeswalker', 'Planeswalker', 'renderable', ['Planeswalker'], 'normal_planeswalker'),
  entry('scheme', 'Scheme', 'registered-only', ['Scheme'], 'scheme'),
  entry('sorcery', 'Sorcery', 'renderable', ['Sorcery'], 'normal_creature'),
  entry('vanguard', 'Vanguard', 'registered-only', ['Vanguard'], 'vanguard')
];

function entry(id: string, displayName: string, supportState: FrameSupportEntry['supportState'], rulesTerms: string[], fallbackRenderer: string): FrameSupportEntry {
  return {
    id: `card-type:${id}`,
    displayName,
    category: 'card-type',
    supportState,
    aliases: displayName === 'Kindred' ? ['Tribal'] : undefined,
    rulesTerms,
    inferredFrom: { typeLineIncludes: rulesTerms },
    fallbackRenderer,
    licenseStatus: 'reference-only',
    demoTags: DEFAULT_DEMO_TAGS
  };
}

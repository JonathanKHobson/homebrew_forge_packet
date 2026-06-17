import type { CardFaceRecord, CardRecord } from './schemas.js';

export const CARD_LAYOUTS = [
  'normal',
  'split',
  'flip',
  'transform',
  'modal_dfc',
  'meld',
  'adventure',
  'saga',
  'class',
  'case',
  'room',
  'battle',
  'plane',
  'scheme',
  'phenomenon',
  'vanguard',
  'dungeon',
  'leveler',
  'prepare',
  'omen',
  'emblem',
  'attraction',
  'sticker_sheet',
  'token',
  'double_faced_token',
  'art_series',
  'reversible_card',
  'host',
  'augment',
  'contraption',
  'station',
  'mutate',
  'prototype',
  'aftermath',
  'fuse'
] as const;

export type CardLayout = (typeof CARD_LAYOUTS)[number];

export type FrameSupportState =
  | 'renderable'
  | 'registered-only'
  | 'asset-present-unwired'
  | 'partial-renderer'
  | 'reference-only'
  | 'needs-assets'
  | 'blocked-license-review'
  | 'out-of-scope-for-now';

export interface LayoutSupportEntry {
  id: CardLayout;
  displayName: string;
  supportState: FrameSupportState;
  fallbackLayout: 'normal' | 'token' | 'token_full_art' | 'planeswalker';
  fallbackFrameType: string;
  preserveMetadata: boolean;
}

export const LAYOUT_SUPPORT: readonly LayoutSupportEntry[] = [
  layout('normal', 'Normal', 'renderable', 'normal', 'normal_creature'),
  layout('token', 'Token', 'renderable', 'token', 'token_creature'),
  layout('double_faced_token', 'Double-faced Token', 'partial-renderer', 'token', 'token_creature'),
  layout('saga', 'Saga', 'partial-renderer', 'normal', 'saga'),
  layout('class', 'Class', 'partial-renderer', 'normal', 'class'),
  layout('case', 'Case', 'partial-renderer', 'normal', 'case'),
  layout('room', 'Room', 'partial-renderer', 'normal', 'room'),
  layout('battle', 'Battle', 'partial-renderer', 'normal', 'battle'),
  layout('plane', 'Plane', 'partial-renderer', 'normal', 'plane'),
  layout('scheme', 'Scheme', 'partial-renderer', 'normal', 'scheme'),
  layout('phenomenon', 'Phenomenon', 'partial-renderer', 'normal', 'phenomenon'),
  layout('vanguard', 'Vanguard', 'partial-renderer', 'normal', 'vanguard'),
  layout('dungeon', 'Dungeon', 'partial-renderer', 'normal', 'dungeon'),
  layout('adventure', 'Adventure', 'partial-renderer', 'normal', 'adventure'),
  layout('split', 'Split', 'partial-renderer', 'normal', 'split'),
  layout('flip', 'Flip', 'partial-renderer', 'normal', 'flip'),
  layout('transform', 'Transform DFC', 'partial-renderer', 'normal', 'transform'),
  layout('modal_dfc', 'Modal DFC', 'partial-renderer', 'normal', 'modal_dfc'),
  layout('meld', 'Meld', 'registered-only', 'normal', 'meld'),
  layout('leveler', 'Leveler / Level Up', 'partial-renderer', 'normal', 'leveler'),
  layout('prepare', 'Prepare / Preparation', 'partial-renderer', 'normal', 'prepare'),
  layout('omen', 'Omen', 'partial-renderer', 'normal', 'omen'),
  layout('emblem', 'Emblem', 'partial-renderer', 'normal', 'emblem'),
  layout('attraction', 'Attraction', 'partial-renderer', 'normal', 'attraction'),
  layout('sticker_sheet', 'Sticker Sheet', 'registered-only', 'normal', 'sticker_sheet'),
  layout('art_series', 'Art Series', 'registered-only', 'normal', 'art_series'),
  layout('reversible_card', 'Reversible Card', 'registered-only', 'normal', 'reversible_card'),
  layout('host', 'Host', 'registered-only', 'normal', 'host'),
  layout('augment', 'Augment', 'registered-only', 'normal', 'augment'),
  layout('contraption', 'Contraption', 'registered-only', 'normal', 'contraption'),
  layout('station', 'Station', 'registered-only', 'normal', 'station'),
  layout('mutate', 'Mutate', 'partial-renderer', 'normal', 'mutate'),
  layout('prototype', 'Prototype', 'partial-renderer', 'normal', 'prototype'),
  layout('aftermath', 'Aftermath', 'partial-renderer', 'normal', 'aftermath'),
  layout('fuse', 'Fuse', 'partial-renderer', 'normal', 'fuse')
];

export const RENDERABLE_LAYOUTS = new Set<CardLayout>(LAYOUT_SUPPORT.filter((entry) => ['renderable', 'partial-renderer'].includes(entry.supportState)).map((entry) => entry.id));

export function isKnownLayout(value: string): value is CardLayout {
  return (CARD_LAYOUTS as readonly string[]).includes(value);
}

export function normalizeLayoutId(value: string | undefined): CardLayout {
  const normalized = String(value ?? 'normal').trim().toLowerCase().replace(/[-\s]+/g, '_');
  if (normalized === 'modaldfc' || normalized === 'mdfc') {
    return 'modal_dfc';
  }
  if (normalized === 'double_faced' || normalized === 'dfc') {
    return 'transform';
  }
  if (normalized === 'double_faced_token') {
    return 'double_faced_token';
  }
  if (normalized === 'planar') {
    return 'plane';
  }
  if (normalized === 'level_up' || normalized === 'leveler') {
    return 'leveler';
  }
  if (normalized === 'prepared' || normalized === 'preparation') {
    return 'prepare';
  }
  if (normalized === 'sticker-sheet') {
    return 'sticker_sheet';
  }
  return isKnownLayout(normalized) ? normalized : 'normal';
}

export function layoutSupportFor(layout: string | undefined): LayoutSupportEntry {
  const normalized = normalizeLayoutId(layout);
  return LAYOUT_SUPPORT.find((entry) => entry.id === normalized) ?? LAYOUT_SUPPORT[0]!;
}

export function rendererLayoutFor(card: Pick<CardRecord, 'layout'>, face: Pick<CardFaceRecord, 'frameType' | 'typeLine'>): LayoutSupportEntry['fallbackLayout'] {
  if (card.layout === 'token' && face.frameType === 'token_full_art') {
    return 'token_full_art';
  }
  if (card.layout === 'token' || card.layout === 'double_faced_token') {
    return 'token';
  }
  if (face.frameType.includes('planeswalker') || /\bplaneswalker\b/i.test(face.typeLine)) {
    return 'planeswalker';
  }
  return layoutSupportFor(card.layout).fallbackLayout;
}

function layout(
  id: CardLayout,
  displayName: string,
  supportState: FrameSupportState,
  fallbackLayout: LayoutSupportEntry['fallbackLayout'],
  fallbackFrameType: string
): LayoutSupportEntry {
  return {
    id,
    displayName,
    supportState,
    fallbackLayout,
    fallbackFrameType,
    preserveMetadata: true
  };
}

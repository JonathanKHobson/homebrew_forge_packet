import type { FrameSupportEntry } from './frameSupportTypes.js';

const DEMO_TAGS = ['frame-support-squirrel-lab'];

export const LAYOUT_SUPPORT: FrameSupportEntry[] = [
  layout('normal', 'Normal', 'renderable', 'normal'),
  layout('token', 'Token', 'renderable', 'token'),
  layout('double_faced_token', 'Double-faced Token', 'partial-renderer', 'token_creature'),
  layout('saga', 'Saga', 'partial-renderer', 'saga', ['magic-m15-saga.mse-style', 'figma-mtg-card-assets']),
  layout('class', 'Class', 'partial-renderer', 'class', ['magic-m15-saga.mse-style']),
  layout('case', 'Case', 'partial-renderer', 'case'),
  layout('room', 'Room', 'partial-renderer', 'split'),
  layout('battle', 'Battle', 'partial-renderer', 'battle'),
  layout('plane', 'Plane', 'partial-renderer', 'plane'),
  layout('scheme', 'Scheme', 'partial-renderer', 'scheme'),
  layout('phenomenon', 'Phenomenon', 'partial-renderer', 'phenomenon'),
  layout('vanguard', 'Vanguard', 'partial-renderer', 'vanguard'),
  layout('dungeon', 'Dungeon', 'partial-renderer', 'dungeon'),
  layout('adventure', 'Adventure', 'partial-renderer', 'adventure', ['magic-m15-adventure.mse-style', 'figma-mtg-card-assets']),
  layout('omen', 'Omen', 'partial-renderer', 'adventure'),
  layout('prepare', 'Prepare / Preparation', 'partial-renderer', 'adventure'),
  layout('split', 'Split', 'partial-renderer', 'split', ['magic-m15-split-fusable.mse-style']),
  layout('fuse', 'Fuse', 'partial-renderer', 'split'),
  layout('aftermath', 'Aftermath', 'partial-renderer', 'split'),
  layout('flip', 'Flip', 'partial-renderer', 'normal'),
  layout('transform', 'Transform DFC', 'partial-renderer', 'transform', ['magic-m15-mainframe-dfc.mse-style']),
  layout('modal_dfc', 'Modal DFC', 'partial-renderer', 'modal_dfc', ['magic-m15-mainframe-dfc.mse-style']),
  layout('meld', 'Meld', 'registered-only', 'meld'),
  layout('leveler', 'Leveler / Level Up', 'partial-renderer', 'normal', ['magic-modules.mse-include/levels']),
  layout('prototype', 'Prototype', 'partial-renderer', 'normal_artifact'),
  layout('station', 'Station', 'registered-only', 'normal_artifact'),
  layout('mutate', 'Mutate', 'partial-renderer', 'normal'),
  layout('emblem', 'Emblem', 'partial-renderer', 'emblem'),
  layout('attraction', 'Attraction', 'partial-renderer', 'normal_artifact'),
  layout('sticker_sheet', 'Sticker Sheet', 'registered-only', 'normal'),
  layout('host', 'Host', 'registered-only', 'normal'),
  layout('augment', 'Augment', 'registered-only', 'normal'),
  layout('contraption', 'Contraption', 'registered-only', 'normal_artifact'),
  layout('art_series', 'Art Series', 'registered-only', 'normal'),
  layout('reversible_card', 'Reversible Card', 'registered-only', 'normal')
];

function layout(
  id: string,
  displayName: string,
  supportState: FrameSupportEntry['supportState'],
  fallbackRenderer: string,
  assetPackIds?: string[]
): FrameSupportEntry {
  return {
    id: `layout:${id}`,
    displayName,
    category: 'layout',
    supportState,
    inferredFrom: { layout: id },
    fallbackRenderer,
    assetPackIds,
    licenseStatus: assetPackIds?.length ? 'local-owned' : supportState === 'reference-only' ? 'reference-only' : 'unknown',
    demoTags: DEMO_TAGS
  };
}

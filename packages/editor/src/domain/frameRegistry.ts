import type { CardLayout, LayoutSupportEntry } from '@homebrew-forge/forge/frameSupport';
import { LAYOUT_SUPPORT } from '@homebrew-forge/forge/frameSupport';
import { manaColorsFromCost } from '@homebrew-forge/forge/mana';
import type { CardDraft, FrameOption } from './editorTypes.js';
import type { FrameSupportState } from './frameSupportTypes.js';
import { hasSubtype } from './subtypeInferenceRegistry.js';

type FrameSource = FrameOption['source'];
type FrameSpec = readonly [
  id: string,
  label: string,
  family: string,
  layout: CardLayout,
  frameType: string,
  renderable: boolean,
  description: string,
  supportedTypes: readonly string[],
  source: FrameSource,
  supportState: FrameSupportState
];

const LAYOUT_SUPPORT_BY_ID = new Map<string, LayoutSupportEntry>(LAYOUT_SUPPORT.map((entry) => [entry.id, entry]));

const FRAME_SPECS: readonly FrameSpec[] = [
  ['auto', 'Automatic', 'Automatic', 'normal', 'normal_creature', true, 'Infers layout, frame type, and fallback renderer from card data.', [], 'basic-m15', 'renderable'],
  ['normal-spell', 'Normal spell/permanent', 'Core M15', 'normal', 'normal_creature', true, 'Default spell/permanent frame from the Basic M15 style.', ['Creature', 'Instant', 'Sorcery', 'Enchantment'], 'basic-m15', 'renderable'],
  ['normal-creature', 'Creature', 'Core M15', 'normal', 'normal_creature', true, 'Creature frame from the Basic M15 style.', ['Creature'], 'basic-m15', 'renderable'],
  ['normal-noncreature', 'Noncreature spell', 'Core M15', 'normal', 'normal_noncreature', true, 'Noncreature frame where an asset pack declares one; falls back to normal geometry.', ['Instant', 'Sorcery', 'Enchantment'], 'figma', 'partial-renderer'],
  ['normal-instant', 'Instant', 'Core M15', 'normal', 'normal_instant', true, 'Instant frame where an asset pack declares one; falls back to normal geometry.', ['Instant'], 'private', 'partial-renderer'],
  ['normal-sorcery', 'Sorcery', 'Core M15', 'normal', 'normal_sorcery', true, 'Sorcery frame where an asset pack declares one; falls back to normal geometry.', ['Sorcery'], 'private', 'partial-renderer'],
  ['normal-enchantment', 'Enchantment', 'Core M15', 'normal', 'normal_enchantment', true, 'Normal enchantment frame for non-Saga/Class/Case/Room enchantments.', ['Enchantment'], 'basic-m15', 'partial-renderer'],
  ['artifact', 'Artifact', 'Core M15', 'normal', 'normal_artifact', true, 'Artifact frame from the Basic M15 pack.', ['Artifact'], 'basic-m15', 'renderable'],
  ['equipment', 'Equipment', 'Subtype-driven', 'normal', 'equipment', true, 'Equipment support using artifact fallback unless a pack declares equipment assets.', ['Artifact'], 'reference', 'partial-renderer'],
  ['vehicle', 'Vehicle', 'Subtype-driven', 'normal', 'vehicle', true, 'Vehicle support using dedicated vehicle assets when available, otherwise artifact fallback.', ['Artifact'], 'figma', 'partial-renderer'],
  ['aura', 'Aura', 'Subtype-driven', 'normal', 'aura', true, 'Aura support using enchantment/normal fallback with Aura validation hints.', ['Enchantment'], 'reference', 'partial-renderer'],
  ['prototype', 'Prototype', 'Mechanic inset', 'prototype', 'prototype', true, 'Prototype artifact creature support with metadata preservation and normal fallback geometry.', ['Artifact', 'Creature'], 'reference', 'partial-renderer'],
  ['leveler', 'Leveler / Level Up', 'Mechanic layout', 'leveler', 'leveler', true, 'Level up cards preserve leveler layout and render through normal fallback geometry.', ['Creature', 'Artifact', 'Enchantment'], 'full-magic-pack', 'partial-renderer'],
  ['station', 'Station / Spacecraft', 'Mechanic layout', 'station', 'station', false, 'Station and Spacecraft support is registered and round-trips while renderer assets settle.', ['Artifact'], 'reference', 'registered-only'],
  ['land', 'Land', 'Core M15', 'normal', 'normal_land', true, 'Land frame from the Basic M15 pack.', ['Land'], 'basic-m15', 'renderable'],
  ['planeswalker', 'Planeswalker', 'Core M15', 'normal', 'normal_planeswalker', true, 'Three-ability planeswalker frame from local Full Magic Pack assets.', ['Planeswalker'], 'basic-m15', 'renderable'],
  ['planeswalker-4', 'Planeswalker 4 abilities', 'Core M15', 'normal', 'normal_planeswalker_4', true, 'Four-ability planeswalker frame from local Full Magic Pack assets.', ['Planeswalker'], 'basic-m15', 'renderable'],
  ['token-creature', 'Token', 'Core M15', 'token', 'token_creature', true, 'Text token frame with masked arched art from the M15 token style.', ['Artifact', 'Creature', 'Enchantment', 'Land'], 'basic-m15', 'renderable'],
  ['token-full-art', 'Full-art token', 'Core M15', 'token', 'token_full_art', true, 'Full-body-art token frame with compact top and bottom text bands.', ['Artifact', 'Creature', 'Enchantment', 'Land'], 'basic-m15', 'renderable'],
  ['double-faced-token', 'Double-faced token', 'Token', 'double_faced_token', 'token_creature', true, 'Double-faced token metadata is preserved and rendered through token fallback geometry.', ['Artifact', 'Creature', 'Enchantment', 'Land'], 'reference', 'partial-renderer'],
  ['saga', 'Saga', 'Vertical enchantment', 'saga', 'saga', true, 'Saga metadata and chapter text render through best available Saga asset/fallback geometry.', ['Enchantment'], 'figma', 'partial-renderer'],
  ['class', 'Class', 'Vertical enchantment', 'class', 'class', true, 'Class enchantments preserve level sections and use vertical-enchantment fallback rendering.', ['Enchantment'], 'full-magic-pack', 'partial-renderer'],
  ['case', 'Case', 'Vertical enchantment', 'case', 'case', true, 'Case enchantments preserve solved metadata and use vertical-enchantment fallback rendering.', ['Enchantment'], 'reference', 'partial-renderer'],
  ['room', 'Room', 'Split enchantment', 'room', 'room', true, 'Room enchantments preserve split-door metadata and render through split/normal fallback geometry.', ['Enchantment'], 'reference', 'partial-renderer'],
  ['adventure', 'Adventure', 'Two-part layout', 'adventure', 'adventure', true, 'Adventure two-part layout support with best available adventure asset/fallback geometry.', ['Creature', 'Instant', 'Sorcery'], 'figma', 'partial-renderer'],
  ['omen', 'Omen', 'Two-part layout', 'omen', 'omen', true, 'Omen cards preserve spell-inset metadata and render through Adventure-like fallback geometry.', ['Instant', 'Sorcery', 'Creature', 'Enchantment', 'Artifact'], 'reference', 'partial-renderer'],
  ['prepare', 'Prepare / Preparation', 'Two-part layout', 'prepare', 'prepare', true, 'Preparation cards preserve lower-right prepare spell metadata and render through two-part fallback geometry.', ['Creature', 'Enchantment', 'Artifact'], 'reference', 'partial-renderer'],
  ['split', 'Split', 'Multiface / multipanel', 'split', 'split', true, 'Split cards preserve panel metadata and render through fallback geometry.', ['Instant', 'Sorcery'], 'full-magic-pack', 'partial-renderer'],
  ['fuse', 'Fuse', 'Multiface / multipanel', 'fuse', 'fuse', true, 'Fuse cards preserve split/fuse metadata and render through split fallback geometry.', ['Instant', 'Sorcery'], 'reference', 'partial-renderer'],
  ['aftermath', 'Aftermath', 'Multiface / multipanel', 'aftermath', 'aftermath', true, 'Aftermath cards preserve rotated-half metadata and render through split fallback geometry.', ['Instant', 'Sorcery'], 'reference', 'partial-renderer'],
  ['flip', 'Flip', 'Multiface / multipanel', 'flip', 'flip', true, 'Flip cards preserve layout metadata and render through normal fallback geometry.', ['Creature', 'Enchantment', 'Artifact'], 'reference', 'partial-renderer'],
  ['transform', 'Transform DFC', 'Double-faced', 'transform', 'transform', true, 'Transform double-faced cards preserve face metadata and render the selected face through fallback geometry.', [], 'full-magic-pack', 'partial-renderer'],
  ['modal-dfc-front', 'Modal DFC', 'Double-faced', 'modal_dfc', 'modal_dfc', true, 'Modal DFC cards preserve face metadata and render the selected face through fallback geometry.', [], 'full-magic-pack', 'partial-renderer'],
  ['meld', 'Meld', 'Double-faced', 'meld', 'meld', false, 'Meld source/result relationships are registered and preserved for a later dedicated renderer.', [], 'full-magic-pack', 'registered-only'],
  ['battle', 'Battle', 'Supplemental object', 'battle', 'battle', true, 'Battle cards preserve defense/protector metadata and render through fallback geometry.', ['Battle'], 'full-magic-pack', 'partial-renderer'],
  ['plane', 'Plane', 'Command zone', 'plane', 'plane', true, 'Planechase plane cards preserve planar/chaos text and render through fallback geometry.', ['Plane'], 'reference', 'partial-renderer'],
  ['scheme', 'Scheme', 'Command zone', 'scheme', 'scheme', true, 'Archenemy scheme cards preserve scheme metadata and render through fallback geometry.', ['Scheme'], 'reference', 'partial-renderer'],
  ['phenomenon', 'Phenomenon', 'Command zone', 'phenomenon', 'phenomenon', true, 'Planechase phenomenon cards preserve metadata and render through fallback geometry.', ['Phenomenon'], 'reference', 'partial-renderer'],
  ['dungeon', 'Dungeon', 'Command zone', 'dungeon', 'dungeon', true, 'Dungeon room-grid metadata is preserved and rendered through static fallback geometry.', ['Dungeon'], 'reference', 'partial-renderer'],
  ['vanguard', 'Vanguard', 'Command zone', 'vanguard', 'vanguard', true, 'Vanguard hand/life modifier metadata is preserved and rendered through fallback geometry.', ['Vanguard'], 'reference', 'partial-renderer'],
  ['conspiracy', 'Conspiracy', 'Draft matters', 'normal', 'conspiracy', true, 'Conspiracy cards preserve draft-matters metadata and render through normal fallback geometry.', ['Conspiracy'], 'reference', 'partial-renderer'],
  ['emblem', 'Emblem', 'Game object', 'emblem', 'emblem', true, 'Planeswalker emblems preserve command-zone object metadata and render through fallback geometry.', ['Emblem'], 'reference', 'partial-renderer'],
  ['attraction', 'Attraction', 'Un-set object', 'attraction', 'attraction', true, 'Attractions preserve light-number metadata and render through artifact fallback geometry.', ['Artifact'], 'reference', 'partial-renderer'],
  ['sticker-sheet', 'Sticker Sheet', 'Un-set object', 'sticker_sheet', 'sticker_sheet', false, 'Sticker sheets are registered and round-trip outside the main card renderer for now.', [], 'reference', 'registered-only'],
  ['host', 'Host', 'Un-set object', 'host', 'host', false, 'Host cards are registered and preserved with normal fallback metadata.', ['Creature'], 'reference', 'registered-only'],
  ['augment', 'Augment', 'Un-set object', 'augment', 'augment', false, 'Augment cards are registered and preserved with normal fallback metadata.', ['Creature'], 'reference', 'registered-only'],
  ['contraption', 'Contraption', 'Un-set object', 'contraption', 'contraption', false, 'Contraptions are registered and preserved with artifact fallback metadata.', ['Artifact'], 'reference', 'registered-only'],
  ['mutate', 'Mutate', 'Mechanic layout', 'mutate', 'mutate', true, 'Mutate cards preserve mutate metadata and render through normal fallback geometry.', ['Creature'], 'reference', 'partial-renderer'],
  ['art-series', 'Art Series', 'Supplemental object', 'art_series', 'art_series', false, 'Art series cards are registered for import/export preservation.', [], 'reference', 'registered-only'],
  ['reversible-card', 'Reversible card', 'Supplemental object', 'reversible_card', 'reversible_card', false, 'Reversible cards are registered for import/export preservation.', [], 'reference', 'registered-only'],
  ['style-altered', 'Altered frame style', 'Alternate art styles', 'normal', 'normal_creature', true, 'Local altered-style assets are tracked and use normal fallback rendering unless a pack declares a matching frame.', [], 'full-magic-pack', 'asset-present-unwired'],
  ['style-borderless', 'Borderless / frameless', 'Alternate art styles', 'normal', 'normal_creature', true, 'Borderless and frameless treatments are selectable where the selected frame/border combination supports them.', [], 'full-magic-pack', 'asset-present-unwired'],
  ['style-extended-art', 'Extended art', 'Alternate art styles', 'normal', 'normal_creature', true, 'Extended-art treatment metadata is preserved through layout variant fallback.', [], 'full-magic-pack', 'asset-present-unwired'],
  ['style-classic', 'Classic / old-border-like', 'Alternate art styles', 'normal', 'normal_creature', true, 'Classic old-border-like assets are tracked as local/private style support.', [], 'private', 'asset-present-unwired'],
  ['style-future-shifted', 'Future-shifted', 'Alternate art styles', 'normal', 'normal_creature', false, 'Future-shifted support is registered until licensed local assets are wired.', [], 'reference', 'registered-only'],
  ['style-colorshifted', 'Colorshifted', 'Alternate art styles', 'normal', 'normal_creature', false, 'Colorshifted support is registered until licensed local assets are wired.', [], 'reference', 'registered-only'],
  ['style-nyx', 'Nyx / constellation', 'Treatments', 'normal', 'normal_enchantment', false, 'Nyx-style enchantment treatment is registered for future composable overlay support.', ['Enchantment'], 'reference', 'registered-only'],
  ['style-miracle', 'Miracle', 'Treatments', 'normal', 'normal_instant', true, 'Miracle treatment assets are tracked and render through spell fallback geometry.', ['Instant', 'Sorcery'], 'full-magic-pack', 'asset-present-unwired'],
  ['style-devoid', 'Devoid / colorless overlay', 'Treatments', 'normal', 'normal_creature', true, 'Devoid/colorless overlay treatment assets are tracked with normal fallback rendering.', [], 'full-magic-pack', 'asset-present-unwired'],
  ['style-showcase', 'Showcase', 'Treatments', 'normal', 'normal_creature', false, 'Showcase treatment is registered until specific local assets are licensed and mapped.', [], 'reference', 'registered-only'],
  ['style-textless', 'Textless', 'Treatments', 'normal', 'normal_creature', false, 'Textless treatment is registered for future export-specific rendering.', [], 'reference', 'registered-only'],
  ['style-genevensis', 'GenevensiS', 'Third-party/local styles', 'normal', 'normal_creature', true, 'GenevensiS local assets are tracked and use matching asset-pack roles when selected.', [], 'genevensis', 'partial-renderer'],
  ['style-figma-community', 'Figma community assets', 'Third-party/local styles', 'normal', 'normal_creature', true, 'Figma community assets are tracked as local/private style support.', [], 'figma', 'partial-renderer'],
  ['style-private-mtg', 'Private MTG-style pack', 'Third-party/local styles', 'normal', 'normal_creature', true, 'Private user-supplied frame pack support.', [], 'private', 'partial-renderer']
];

export const CORE_FRAMES: FrameOption[] = FRAME_SPECS.map(([id, label, family, layout, frameType, renderable, description, supportedTypes, source, supportState]) => ({
  id,
  label,
  family,
  layout,
  frameType,
  renderable,
  description,
  supportedTypes: [...supportedTypes],
  source,
  supportState
}));

export function inferFrame(draft: CardDraft, frames: FrameOption[] = CORE_FRAMES): FrameOption {
  const override = frames.find((frame) => frame.id === draft.frameOverrideId && frame.id !== 'auto');
  if (override) {
    return override;
  }

  const layoutFrame = frameForExplicitLayout(draft, frames);
  if (layoutFrame) {
    return layoutFrame;
  }

  const types = new Set(draft.cardTypes);
  const oracleText = draft.oracleText.toLowerCase();
  if (types.has('Planeswalker')) return frameById(frames, draft.planeswalkerAbilityCount === '4' ? 'planeswalker-4' : 'planeswalker');
  if (types.has('Plane')) return frameById(frames, 'plane');
  if (types.has('Scheme')) return frameById(frames, 'scheme');
  if (types.has('Phenomenon')) return frameById(frames, 'phenomenon');
  if (types.has('Dungeon')) return frameById(frames, 'dungeon');
  if (types.has('Vanguard')) return frameById(frames, 'vanguard');
  if (types.has('Conspiracy')) return frameById(frames, 'conspiracy');
  if (types.has('Battle')) return frameById(frames, 'battle');
  if (types.has('Emblem')) return frameById(frames, 'emblem');

  if (types.has('Enchantment') && hasSubtype(draft.subtypes, 'saga')) return frameById(frames, 'saga');
  if (types.has('Enchantment') && hasSubtype(draft.subtypes, 'class')) return frameById(frames, 'class');
  if (types.has('Enchantment') && hasSubtype(draft.subtypes, 'case')) return frameById(frames, 'case');
  if (types.has('Enchantment') && hasSubtype(draft.subtypes, 'room')) return frameById(frames, 'room');
  if (types.has('Enchantment') && hasSubtype(draft.subtypes, 'aura')) return frameById(frames, 'aura');
  if (types.has('Land')) return frameById(frames, 'land');

  if (types.has('Artifact') && hasSubtype(draft.subtypes, 'attraction')) return frameById(frames, 'attraction');
  if (types.has('Artifact') && hasSubtype(draft.subtypes, 'vehicle')) return frameById(frames, 'vehicle');
  if (types.has('Artifact') && hasSubtype(draft.subtypes, 'equipment')) return frameById(frames, 'equipment');
  if (types.has('Artifact') && hasSubtype(draft.subtypes, 'spacecraft')) return frameById(frames, oracleText.includes('station') ? 'station' : 'artifact');
  if (types.has('Artifact') && !types.has('Creature') && !types.has('Land')) return frameById(frames, 'artifact');

  if (oracleText.includes('level up') || /\blevel\s+\d/i.test(oracleText)) return frameById(frames, 'leveler');
  if (oracleText.includes('prototype')) return frameById(frames, 'prototype');
  if (oracleText.includes('mutate')) return frameById(frames, 'mutate');
  if (oracleText.includes('prepare') || oracleText.includes('prepared')) return frameById(frames, 'prepare');
  if (hasSubtype(draft.subtypes, 'omen') || oracleText.includes('omen')) return frameById(frames, 'omen');
  if (hasSubtype(draft.subtypes, 'adventure')) return frameById(frames, 'adventure');
  if (types.has('Instant')) return frameById(frames, 'normal-instant');
  if (types.has('Sorcery')) return frameById(frames, 'normal-sorcery');
  if (types.has('Enchantment')) return frameById(frames, 'normal-enchantment');
  return frameById(frames, 'normal-spell');
}

export function inferColors(manaCost: string, colorIndicator?: string): string {
  const fromIndicator = normalizeColors(colorIndicator);
  return fromIndicator || normalizeColors(manaColorsFromCost(manaCost));
}

export function buildTypeLine(draft: Pick<CardDraft, 'supertypes' | 'cardTypes' | 'subtypes' | 'typeLine'>): string {
  const left = [...draft.supertypes, ...draft.cardTypes].filter(Boolean).join(' ').trim();
  const right = draft.subtypes.trim();
  return left && right ? `${left} - ${right}` : left || draft.typeLine;
}

export function normalizeColors(value?: string): string {
  return [...new Set((value ?? '').toUpperCase().replace(/[^WUBRGC]/g, '').split('').filter(Boolean))].join('');
}

function frameForExplicitLayout(draft: CardDraft, frames: FrameOption[]): FrameOption | undefined {
  if (draft.layout === 'normal') {
    return undefined;
  }
  if (draft.layout === 'token') {
    return frameById(frames, draft.frameType === 'token_full_art' ? 'token-full-art' : 'token-creature');
  }
  const byLayout = frames.find((frame) => frame.layout === draft.layout);
  if (byLayout) {
    return byLayout;
  }
  const layoutSupport = LAYOUT_SUPPORT_BY_ID.get(draft.layout);
  if (!layoutSupport) {
    return undefined;
  }
  return {
    id: `layout:${layoutSupport.id}`,
    label: layoutSupport.displayName,
    family: 'Registered layout',
    layout: layoutSupport.id,
    frameType: layoutSupport.fallbackFrameType,
    renderable: layoutSupport.supportState !== 'registered-only',
    description: `${layoutSupport.displayName} is registered and falls back to ${layoutSupport.fallbackLayout} rendering.`,
    supportedTypes: [],
    source: 'reference',
    supportState: layoutSupport.supportState
  };
}

function frameById(frames: FrameOption[], id: string): FrameOption {
  return frames.find((frame) => frame.id === id) ?? frames[0] ?? CORE_FRAMES[0]!;
}

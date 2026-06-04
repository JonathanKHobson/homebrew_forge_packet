import type { CardDraft, FrameOption } from './editorTypes.js';
import { manaColorsFromCost } from '@homebrew-forge/forge/mana';

export const CORE_FRAMES: FrameOption[] = [
  {
    id: 'auto',
    label: 'Normal',
    family: 'Automatic',
    layout: 'normal',
    frameType: 'normal_creature',
    renderable: true,
    description: 'Infers the active Basic M15 frame from mana cost and card type.',
    supportedTypes: [],
    source: 'basic-m15'
  },
  {
    id: 'normal-spell',
    label: 'Normal',
    family: 'Core M15',
    layout: 'normal',
    frameType: 'normal_creature',
    renderable: true,
    description: 'Creature, instant, sorcery, and enchantment color frames in the Basic M15 style.',
    supportedTypes: ['Creature', 'Instant', 'Sorcery', 'Enchantment'],
    source: 'basic-m15'
  },
  {
    id: 'artifact',
    label: 'Artifact',
    family: 'Core M15',
    layout: 'normal',
    frameType: 'normal_artifact',
    renderable: true,
    description: 'Artifact frame from the Basic M15 pack.',
    supportedTypes: ['Artifact'],
    source: 'basic-m15'
  },
  {
    id: 'land',
    label: 'Land',
    family: 'Core M15',
    layout: 'normal',
    frameType: 'normal_land',
    renderable: true,
    description: 'Land frame from the Basic M15 pack.',
    supportedTypes: ['Land'],
    source: 'basic-m15'
  },
  {
    id: 'token-creature',
    label: 'Token',
    family: 'Core M15',
    layout: 'token',
    frameType: 'token_creature',
    renderable: true,
    description: 'Text token frame with masked arched art from the M15 token style.',
    supportedTypes: ['Artifact', 'Creature', 'Enchantment', 'Land'],
    source: 'basic-m15'
  },
  {
    id: 'token-full-art',
    label: 'Full-art token',
    family: 'Core M15',
    layout: 'token',
    frameType: 'token_full_art',
    renderable: true,
    description: 'Full-body-art token frame with compact top and bottom text bands.',
    supportedTypes: ['Artifact', 'Creature', 'Enchantment', 'Land'],
    source: 'basic-m15'
  },
  {
    id: 'planeswalker',
    label: 'Planeswalker',
    family: 'Core M15',
    layout: 'normal',
    frameType: 'normal_planeswalker',
    renderable: true,
    description: 'Planeswalker frame from the local Full Magic Pack assets.',
    supportedTypes: ['Planeswalker'],
    source: 'basic-m15'
  },
  {
    id: 'saga',
    label: 'Saga',
    family: 'Full Magic Pack',
    layout: 'saga',
    frameType: 'saga',
    renderable: false,
    description: 'Registered from the Full Magic Pack for future renderer support.',
    supportedTypes: ['Enchantment'],
    source: 'full-magic-pack'
  },
  {
    id: 'class',
    label: 'Class',
    family: 'Full Magic Pack',
    layout: 'class',
    frameType: 'class',
    renderable: false,
    description: 'Registered for Class enchantments; renderer support is planned.',
    supportedTypes: ['Enchantment'],
    source: 'planned'
  },
  {
    id: 'case',
    label: 'Case',
    family: 'Full Magic Pack',
    layout: 'case',
    frameType: 'case',
    renderable: false,
    description: 'Registered for Case enchantments; renderer support is planned.',
    supportedTypes: ['Enchantment'],
    source: 'planned'
  },
  {
    id: 'modal-dfc-front',
    label: 'Modal DFC front',
    family: 'Full Magic Pack',
    layout: 'modal_dfc',
    frameType: 'modal_dfc_front',
    renderable: false,
    description: 'Registered from the Full Magic Pack for future renderer support.',
    supportedTypes: [],
    source: 'full-magic-pack'
  },
  {
    id: 'battle',
    label: 'Battle',
    family: 'Full Magic Pack',
    layout: 'battle',
    frameType: 'battle',
    renderable: false,
    description: 'Registered from the Full Magic Pack for future renderer support.',
    supportedTypes: ['Battle'],
    source: 'full-magic-pack'
  },
  {
    id: 'plane',
    label: 'Plane',
    family: 'Casual / command zone',
    layout: 'plane',
    frameType: 'plane',
    renderable: false,
    description: 'Registered for Planechase plane cards; renderer support is planned.',
    supportedTypes: ['Plane'],
    source: 'planned'
  },
  {
    id: 'scheme',
    label: 'Scheme',
    family: 'Casual / command zone',
    layout: 'scheme',
    frameType: 'scheme',
    renderable: false,
    description: 'Registered for Archenemy scheme cards; renderer support is planned.',
    supportedTypes: ['Scheme'],
    source: 'planned'
  },
  {
    id: 'phenomenon',
    label: 'Phenomenon',
    family: 'Casual / command zone',
    layout: 'phenomenon',
    frameType: 'phenomenon',
    renderable: false,
    description: 'Registered for Planechase phenomenon cards; renderer support is planned.',
    supportedTypes: ['Phenomenon'],
    source: 'planned'
  },
  {
    id: 'dungeon',
    label: 'Dungeon',
    family: 'Command zone',
    layout: 'dungeon',
    frameType: 'dungeon',
    renderable: false,
    description: 'Registered for dungeon cards; renderer support is planned.',
    supportedTypes: ['Dungeon'],
    source: 'planned'
  },
  {
    id: 'vanguard',
    label: 'Vanguard',
    family: 'Casual / command zone',
    layout: 'vanguard',
    frameType: 'vanguard',
    renderable: false,
    description: 'Registered for Vanguard cards; renderer support is planned.',
    supportedTypes: ['Vanguard'],
    source: 'planned'
  },
  {
    id: 'conspiracy',
    label: 'Conspiracy',
    family: 'Draft matters',
    layout: 'normal',
    frameType: 'conspiracy',
    renderable: false,
    description: 'Registered for Conspiracy cards; renderer support is planned.',
    supportedTypes: ['Conspiracy'],
    source: 'planned'
  }
];

export function inferFrame(draft: CardDraft, frames: FrameOption[] = CORE_FRAMES): FrameOption {
  const override = frames.find((frame) => frame.id === draft.frameOverrideId && frame.id !== 'auto');
  if (override) {
    return override;
  }

  const types = new Set(draft.cardTypes);
  if (draft.layout === 'token') {
    return frameById(frames, draft.frameType === 'token_full_art' ? 'token-full-art' : 'token-creature');
  }
  if (types.has('Planeswalker')) {
    return frameById(frames, 'planeswalker');
  }
  if (types.has('Plane')) {
    return frameById(frames, 'plane');
  }
  if (types.has('Scheme')) {
    return frameById(frames, 'scheme');
  }
  if (types.has('Phenomenon')) {
    return frameById(frames, 'phenomenon');
  }
  if (types.has('Dungeon')) {
    return frameById(frames, 'dungeon');
  }
  if (types.has('Vanguard')) {
    return frameById(frames, 'vanguard');
  }
  if (types.has('Conspiracy')) {
    return frameById(frames, 'conspiracy');
  }
  if (types.has('Battle')) {
    return frameById(frames, 'battle');
  }
  if (types.has('Enchantment') && draft.subtypes.toLowerCase().split(/\s+/).includes('saga')) {
    return frameById(frames, 'saga');
  }
  if (types.has('Enchantment') && draft.subtypes.toLowerCase().split(/\s+/).includes('class')) {
    return frameById(frames, 'class');
  }
  if (types.has('Enchantment') && draft.subtypes.toLowerCase().split(/\s+/).includes('case')) {
    return frameById(frames, 'case');
  }
  if (types.has('Land')) {
    return frameById(frames, 'land');
  }
  if (types.has('Artifact') && !types.has('Creature') && !types.has('Land')) {
    return frameById(frames, 'artifact');
  }
  return frameById(frames, 'normal-spell');
}

export function inferColors(manaCost: string, colorIndicator?: string): string {
  const fromIndicator = normalizeColors(colorIndicator);
  if (fromIndicator) {
    return fromIndicator;
  }
  return normalizeColors(manaColorsFromCost(manaCost));
}

export function buildTypeLine(draft: Pick<CardDraft, 'supertypes' | 'cardTypes' | 'subtypes' | 'typeLine'>): string {
  const left = [...draft.supertypes, ...draft.cardTypes].filter(Boolean).join(' ').trim();
  const right = draft.subtypes.trim();
  if (left && right) {
    return `${left} - ${right}`;
  }
  return left || draft.typeLine;
}

function frameById(frames: FrameOption[], id: string): FrameOption {
  return frames.find((frame) => frame.id === id) ?? frames[0] ?? CORE_FRAMES[0]!;
}

export function normalizeColors(value?: string): string {
  return [...new Set((value ?? '').toUpperCase().replace(/[^WUBRGC]/g, '').split('').filter(Boolean))].join('');
}

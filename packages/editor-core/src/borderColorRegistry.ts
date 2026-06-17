import type { FrameOption } from './editorTypes.js';
import type { BorderColorOption, FrameBorderColor } from './frameSupportTypes.js';

export const BORDER_COLORS: readonly FrameBorderColor[] = ['black', 'white', 'white-mse', 'silver', 'gold', 'borderless', 'none'];

type BorderCapability = {
  supported: readonly FrameBorderColor[];
  reasons?: Partial<Record<FrameBorderColor, string>>;
};

const DEFAULT_BORDER_CAPABILITY: BorderCapability = {
  supported: ['black', 'white'],
  reasons: {
    white: 'Full-white border needs a real full-white frame asset; no clipped-matte fallback is offered.',
    'white-mse': 'MSE white border keeps the black footer and bottom edge and uses the local M15 border mask.',
    silver: 'Silver border is limited to casual/un-set or custom packs.',
    gold: 'Gold border is limited to collector/proxy-style treatments.',
    borderless: 'Borderless needs a borderless/frameless frame asset.',
    none: 'No-border exports need a borderless frame asset.'
  }
};

const BORDER_CAPABILITIES_BY_FRAME_ID: Record<string, BorderCapability> = {
  auto: DEFAULT_BORDER_CAPABILITY,
  'normal-spell': { supported: ['black', 'white', 'gold'] },
  'normal-creature': { supported: ['black', 'white', 'gold'] },
  'normal-noncreature': { supported: ['black', 'white', 'gold'] },
  'normal-instant': { supported: ['black', 'white', 'gold'] },
  'normal-sorcery': { supported: ['black', 'white', 'gold'] },
  'normal-enchantment': { supported: ['black', 'white', 'gold'] },
  artifact: { supported: ['black', 'white', 'gold'] },
  equipment: { supported: ['black', 'white', 'gold'] },
  vehicle: { supported: ['black', 'white', 'gold'] },
  aura: { supported: ['black', 'white', 'gold'] },
  prototype: { supported: ['black', 'white', 'gold'] },
  leveler: { supported: ['black', 'white', 'gold'] },
  station: { supported: ['black', 'white', 'gold'] },
  land: { supported: ['black', 'white', 'gold'] },
  planeswalker: { supported: ['black', 'white', 'gold'] },
  'planeswalker-4': { supported: ['black', 'white', 'gold'] },
  'token-creature': { supported: ['black', 'white', 'silver', 'gold'] },
  'token-full-art': { supported: ['black', 'white', 'gold', 'borderless', 'none'] },
  'double-faced-token': { supported: ['black', 'white', 'silver', 'gold'] },
  saga: { supported: ['black', 'white', 'gold'] },
  class: { supported: ['black', 'white', 'gold'] },
  case: { supported: ['black', 'white', 'gold'] },
  room: { supported: ['black', 'white', 'gold'] },
  adventure: { supported: ['black', 'white', 'gold'] },
  omen: { supported: ['black', 'white', 'gold'] },
  prepare: { supported: ['black', 'white', 'gold'] },
  split: { supported: ['black', 'white', 'gold'] },
  fuse: { supported: ['black', 'white', 'gold'] },
  aftermath: { supported: ['black', 'white', 'gold'] },
  flip: { supported: ['black', 'white', 'gold'] },
  transform: { supported: ['black', 'white', 'gold'] },
  'modal-dfc-front': { supported: ['black', 'white', 'gold'] },
  meld: { supported: ['black', 'white', 'gold'] },
  battle: { supported: ['black', 'white', 'gold'] },
  plane: { supported: ['black', 'silver'] },
  phenomenon: { supported: ['black', 'silver'] },
  scheme: { supported: ['black', 'silver'] },
  dungeon: { supported: ['black', 'silver'] },
  vanguard: { supported: ['black', 'silver', 'gold'] },
  conspiracy: { supported: ['black', 'silver'] },
  emblem: { supported: ['black', 'white', 'gold'] },
  attraction: { supported: ['black', 'silver'] },
  'sticker-sheet': { supported: ['black', 'silver'] },
  host: { supported: ['black', 'silver'] },
  augment: { supported: ['black', 'silver'] },
  contraption: { supported: ['black', 'silver'] },
  mutate: { supported: ['black', 'white', 'gold'] },
  'art-series': { supported: ['black', 'white', 'gold', 'borderless', 'none'] },
  'reversible-card': { supported: ['black', 'white', 'gold'] },
  'style-altered': { supported: ['black', 'white', 'silver', 'gold'] },
  'style-borderless': { supported: ['black', 'white', 'gold', 'borderless', 'none'] },
  'style-extended-art': { supported: ['black', 'white', 'gold', 'borderless'] },
  'style-classic': { supported: ['black', 'white', 'gold'] },
  'style-future-shifted': { supported: ['black', 'white', 'gold'] },
  'style-colorshifted': { supported: ['black', 'white', 'gold'] },
  'style-nyx': { supported: ['black', 'white', 'gold'] },
  'style-miracle': { supported: ['black', 'white', 'gold'] },
  'style-devoid': { supported: ['black', 'white', 'gold'] },
  'style-showcase': { supported: ['black', 'white', 'gold', 'borderless'] },
  'style-textless': { supported: ['black', 'white', 'gold', 'borderless', 'none'] },
  'style-genevensis': { supported: ['black', 'white', 'silver', 'gold'] },
  'style-figma-community': { supported: ['black', 'white', 'silver', 'gold'] },
  'style-private-mtg': { supported: ['black', 'white', 'silver', 'gold'] }
};

export function borderOptionsForFrame(frame: FrameOption | null | undefined, currentBorder?: FrameBorderColor): BorderColorOption[] {
  const capability = frame ? (BORDER_CAPABILITIES_BY_FRAME_ID[frame.id] ?? DEFAULT_BORDER_CAPABILITY) : DEFAULT_BORDER_CAPABILITY;
  const supported = new Set(capability.supported);
  if (supported.has('white')) {
    supported.add('white-mse');
  }
  supported.delete('white');
  const options = BORDER_COLORS.map((border) => ({
    value: border,
    label: labelForBorder(border),
    selectable: supported.has(border),
    reason: supported.has(border) ? undefined : capability.reasons?.[border] ?? DEFAULT_BORDER_CAPABILITY.reasons?.[border] ?? 'This frame pack does not declare support for this border.'
  }));

  if (currentBorder && !BORDER_COLORS.includes(currentBorder)) {
    return [
      ...options,
      {
        value: currentBorder,
        label: `${currentBorder} (imported)`,
        selectable: true,
        reason: 'Imported value preserved for review.'
      }
    ];
  }
  return options;
}

export function borderSupportHint(frame: FrameOption | null | undefined, border: FrameBorderColor): string {
  const option = borderOptionsForFrame(frame, border).find((candidate) => candidate.value === border);
  if (!option) {
    return 'Border value is not recognized by the current registry.';
  }
  return option.selectable ? 'Supported by the selected frame.' : option.reason ?? 'Unsupported by the selected frame.';
}

export function isBorderColorSupported(frame: FrameOption | null | undefined, border: FrameBorderColor): boolean {
  return borderOptionsForFrame(frame, border).some((candidate) => candidate.value === border && candidate.selectable);
}

function labelForBorder(border: FrameBorderColor): string {
  switch (border) {
    case 'white':
      return 'white (full asset missing)';
    case 'borderless':
      return 'borderless';
    case 'white-mse':
      return 'white (MSE footer)';
    case 'none':
      return 'none';
    default:
      return border;
  }
}

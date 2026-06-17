import type { FrameSupportEntry } from './frameSupportTypes.js';

const DEMO_TAGS = ['frame-support-squirrel-lab'];

export const FRAME_STYLE_SUPPORT: FrameSupportEntry[] = [
  style('m15', 'Default Modern / M15', 'renderable', ['basic-m15-local']),
  style('altered', 'Altered', 'asset-present-unwired', ['magic-m15-altered.mse-style']),
  style('borderless', 'Borderless / Frameless', 'asset-present-unwired', ['magic-m15-altered.mse-style']),
  style('full-art', 'Full Art', 'partial-renderer', ['basic-m15-local']),
  style('extended-art', 'Extended Art', 'asset-present-unwired', ['magic-m15-altered.mse-style']),
  style('classic', 'Classic / Old-Border-Like', 'asset-present-unwired', ['old-border-like', 'magic-overlay-foil-old.mse-include']),
  style('eighth-edition', '8th Edition / Modern pre-M15', 'registered-only'),
  style('future-shifted', 'Future-Shifted', 'registered-only'),
  style('timeshifted', 'Timeshifted', 'registered-only'),
  style('colorshifted', 'Colorshifted', 'registered-only'),
  style('dka-like', 'DKA-Like', 'asset-present-unwired', ['magic-m15-altered.mse-style']),
  style('fnm-like', 'FNM-Like', 'asset-present-unwired', ['magic-m15-altered.mse-style']),
  style('masterpiece-like', 'Masterpiece-Like', 'reference-only'),
  style('mystical-archive-like', 'Mystical Archive-Like', 'reference-only'),
  style('devoid', 'Devoid / Colorless Overlay', 'asset-present-unwired', ['magic-m15-altered.mse-style']),
  style('constellation-nyx-like', 'Constellation / Nyx-Like', 'registered-only'),
  style('pokemon-like-homage', 'Original Creature-Battle Homage', 'needs-assets'),
  style('yugioh-like-homage', 'Original Monster-Duel Homage', 'needs-assets'),
  style('genevensis', 'GenevensiS', 'partial-renderer', ['genevensis-local']),
  style('figma-community', 'Figma Community MTG Assets', 'partial-renderer', ['figma-mtg-card-assets']),
  style('private-mtg-style', 'Private MTG-Style Pack', 'partial-renderer', ['private-mtg-style'])
];

function style(id: string, displayName: string, supportState: FrameSupportEntry['supportState'], assetPackIds?: string[]): FrameSupportEntry {
  return {
    id: `frame-style:${id}`,
    displayName,
    category: 'frame-style',
    supportState,
    assetPackIds,
    licenseStatus: assetPackIds?.length ? 'local-owned' : supportState === 'reference-only' ? 'reference-only' : 'unknown',
    demoTags: DEMO_TAGS
  };
}

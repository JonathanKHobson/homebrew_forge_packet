import type { FrameSupportEntry } from './frameSupportTypes.js';

const DEMO_TAGS = ['frame-support-squirrel-lab'];

export const TREATMENT_SUPPORT: FrameSupportEntry[] = [
  treatment('standard', 'Standard', 'renderable'),
  treatment('legendary-crown', 'Legendary Crown', 'registered-only'),
  treatment('nyx', 'Nyx / Enchantment Overlay', 'registered-only'),
  treatment('miracle', 'Miracle', 'asset-present-unwired', ['magic-m15-altered.mse-style']),
  treatment('tombstone', 'Tombstone Icon', 'registered-only'),
  treatment('devoid', 'Devoid', 'asset-present-unwired', ['magic-m15-altered.mse-style']),
  treatment('colorshifted', 'Colorshifted', 'registered-only'),
  treatment('timeshifted', 'Timeshifted', 'registered-only'),
  treatment('inverted', 'Inverted / color-shifted homage', 'registered-only'),
  treatment('showcase', 'Showcase', 'registered-only'),
  treatment('masterpiece-like', 'Masterpiece-like', 'reference-only'),
  treatment('retro', 'Retro / Classic', 'asset-present-unwired', ['old-border-like']),
  treatment('extended-art', 'Extended Art', 'asset-present-unwired', ['magic-m15-altered.mse-style']),
  treatment('borderless', 'Borderless', 'asset-present-unwired', ['magic-m15-altered.mse-style']),
  treatment('full-art', 'Full Art', 'partial-renderer', ['basic-m15-local']),
  treatment('textless', 'Textless', 'registered-only'),
  treatment('serialized-safe', 'Serialized Number Safe', 'registered-only'),
  treatment('surge-foil-safe', 'Surge Foil Safe', 'out-of-scope-for-now'),
  treatment('galaxy-foil-safe', 'Galaxy Foil Safe', 'out-of-scope-for-now'),
  treatment('etched', 'Etched / Foil Simulation', 'out-of-scope-for-now')
];

function treatment(id: string, displayName: string, supportState: FrameSupportEntry['supportState'], assetPackIds?: string[]): FrameSupportEntry {
  return {
    id: `treatment:${id}`,
    displayName,
    category: 'treatment',
    supportState,
    assetPackIds,
    licenseStatus: assetPackIds?.length ? 'local-owned' : supportState === 'out-of-scope-for-now' ? 'unknown' : 'reference-only',
    demoTags: DEMO_TAGS
  };
}

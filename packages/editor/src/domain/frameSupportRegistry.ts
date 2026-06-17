import { CARD_TYPE_SUPPORT } from './cardTypeRegistry.js';
import { FRAME_STYLE_SUPPORT } from './frameStyleRegistry.js';
import { LAYOUT_SUPPORT } from './layoutRegistry.js';
import { SUBTYPE_INFERENCE_SUPPORT } from './subtypeInferenceRegistry.js';
import { TREATMENT_SUPPORT } from './treatmentRegistry.js';
import type { FrameSupportEntry } from './frameSupportTypes.js';

export const FRAME_SUPPORT_REGISTRY: FrameSupportEntry[] = [
  ...CARD_TYPE_SUPPORT,
  ...LAYOUT_SUPPORT,
  ...SUBTYPE_INFERENCE_SUPPORT,
  ...FRAME_STYLE_SUPPORT,
  ...TREATMENT_SUPPORT
];

export function frameSupportById(id: string): FrameSupportEntry | undefined {
  return FRAME_SUPPORT_REGISTRY.find((entry) => entry.id === id);
}

export function frameSupportByCategory(category: FrameSupportEntry['category']): FrameSupportEntry[] {
  return FRAME_SUPPORT_REGISTRY.filter((entry) => entry.category === category);
}

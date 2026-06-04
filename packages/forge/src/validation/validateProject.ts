import type { ForgeProject } from '../domain/schemas.js';
import { hasRecognizedManaCost } from '../domain/mana.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateForgeProject(project: ForgeProject): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const cardIds = new Set(project.cards.map((card) => card.cardId));
  const faceGroups = new Map<string, typeof project.faces>();

  for (const face of project.faces) {
    if (!cardIds.has(face.cardId)) {
      errors.push(`Face row references unknown card ${face.cardId}.`);
    }
    faceGroups.set(face.cardId, [...(faceGroups.get(face.cardId) ?? []), face]);
    if (face.artId && !project.art[face.artId]) {
      warnings.push(`Face ${face.cardId}/${face.faceIndex} references missing art ${face.artId}.`);
    }
    if (/creature/i.test(face.typeLine) && (!face.power || !face.toughness)) {
      errors.push(`Creature face ${face.cardId}/${face.faceIndex} is missing power/toughness.`);
    }
    if (face.manaCost && !hasRecognizedManaCost(face.manaCost)) {
      warnings.push(`Face ${face.cardId}/${face.faceIndex} has unrecognized mana cost syntax (${face.manaCost}).`);
    }
    if (/\btoken\b/i.test(face.typeLine) && !/token/i.test(face.frameType)) {
      warnings.push(`Face ${face.cardId}/${face.faceIndex} token layout should use a token frame.`);
    }
    if (/\btransform(s|ed|ing)?\b/i.test(face.oracleText ?? '') && !['transform', 'modal_dfc'].includes(project.cards.find((card) => card.cardId === face.cardId)?.layout ?? '')) {
      warnings.push(`Face ${face.cardId}/${face.faceIndex} mentions transform but is not marked as a transform layout.`);
    }
  }

  for (const card of project.cards) {
    const faces = faceGroups.get(card.cardId) ?? [];
    if (faces.length === 0) {
      errors.push(`Card ${card.cardId} has no face rows.`);
    }
    if (card.setCode !== project.setCode) {
      errors.push(`Card ${card.cardId} belongs to ${card.setCode}, expected ${project.setCode}.`);
    }
    if (!['normal', 'token'].includes(card.layout)) {
      warnings.push(`Card ${card.cardId} uses unsupported layout ${card.layout}; preserved for review.`);
    }
    if (card.layout === 'token' && !faces.some((face) => /token/i.test(face.frameType))) {
      warnings.push(`Card ${card.cardId} token layout should use a token frame.`);
    }
    if (faces.some((face) => /\bplaneswalker\b/i.test(face.typeLine) && !face.loyalty)) {
      warnings.push(`Card ${card.cardId} is a planeswalker without starting loyalty.`);
    }
    if (card.colorIdentity && !/^[WUBRGC]*$/.test(card.colorIdentity)) {
      warnings.push(`Card ${card.cardId} has unusual color identity ${card.colorIdentity}.`);
    }
  }

  const profileIds = new Set(project.exportProfiles.map((profile) => profile.profileId));
  if (project.set.defaultExportProfile && !profileIds.has(project.set.defaultExportProfile)) {
    errors.push(`Default export profile ${project.set.defaultExportProfile} is not defined.`);
  }
  if (!project.set.defaultAssetPack) {
    warnings.push('Set has no default asset pack.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

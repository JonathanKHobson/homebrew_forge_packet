import type { CardFaceRecord, CardRecord, CardVariantFaceRecord, CardVariantRecord, ForgeProject } from '../domain/schemas.js';

export type CardVariantExportMode = 'primary' | 'default' | 'all_active' | 'all';

export interface ExportVariantCard {
  parentCard: CardRecord;
  variant: CardVariantRecord;
  card: CardRecord;
  face: CardFaceRecord;
}

export function defaultVariantId(cardId: string, index = 1): string {
  return `${cardId}-V${index}`;
}

export function normalizeProjectVariants(args: {
  cards: CardRecord[];
  faces: CardFaceRecord[];
  variants: CardVariantRecord[];
  variantFaces: CardVariantFaceRecord[];
}): { variants: CardVariantRecord[]; variantFaces: CardVariantFaceRecord[]; primaryFaces: CardFaceRecord[] } {
  const variants: CardVariantRecord[] = [];
  const variantFaces: CardVariantFaceRecord[] = [];
  const legacyFacesByCard = groupFacesByCard(args.faces);
  const suppliedVariantsByCard = groupVariantsByCard(args.variants);
  const suppliedFacesByVariant = groupVariantFacesByVariant(args.variantFaces);

  for (const card of args.cards) {
    const legacyPrimaryFace = legacyFacesByCard.get(card.cardId)?.[0];
    const cardVariants = suppliedVariantsByCard.get(card.cardId)?.length
      ? suppliedVariantsByCard.get(card.cardId) ?? []
      : legacyPrimaryFace
        ? [synthesizeVariant(card, 1)]
        : [];
    const normalizedCardVariants = normalizePrimary(cardVariants);
    variants.push(...normalizedCardVariants);

    for (const variant of normalizedCardVariants) {
      const suppliedFaces = suppliedFacesByVariant.get(variant.variantId);
      if (suppliedFaces?.length) {
        variantFaces.push(...suppliedFaces);
        continue;
      }
      if (legacyPrimaryFace) {
        variantFaces.push(variantFaceFromCardFace(variant.variantId, legacyPrimaryFace));
      }
    }
  }

  const primaryFaces = primaryFacesFromVariants(args.cards, variants, variantFaces, args.faces);
  return { variants, variantFaces, primaryFaces };
}

export function primaryVariantForCard(project: Pick<ForgeProject, 'variants'>, cardId: string): CardVariantRecord | undefined {
  const variants = project.variants.filter((variant) => variant.cardId === cardId);
  return variants.find((variant) => variant.isPrimary) ?? variants[0];
}

export function variantFaceForVariant(project: Pick<ForgeProject, 'variantFaces'>, variantId: string): CardVariantFaceRecord | undefined {
  return [...project.variantFaces.filter((face) => face.variantId === variantId)].sort((left, right) => left.faceIndex - right.faceIndex)[0];
}

export function cardFaceFromVariantFace(face: CardVariantFaceRecord, exportCardId = face.cardId): CardFaceRecord {
  return {
    cardId: exportCardId,
    faceIndex: face.faceIndex,
    faceName: face.faceName,
    manaCost: face.manaCost,
    typeLine: face.typeLine,
    oracleText: face.oracleText,
    flavorText: face.flavorText,
    power: face.power,
    toughness: face.toughness,
    loyalty: face.loyalty,
    defense: face.defense,
    colors: face.colors,
    frameType: face.frameType,
    artId: face.artId,
    artistDisplay: face.artistDisplay,
    watermark: face.watermark,
    rulesTextSizeHint: face.rulesTextSizeHint,
    rulesTextPaddingTop: face.rulesTextPaddingTop,
    rulesTextPaddingRight: face.rulesTextPaddingRight,
    rulesTextPaddingBottom: face.rulesTextPaddingBottom,
    rulesTextPaddingLeft: face.rulesTextPaddingLeft,
    rulesTextReminderMode: face.rulesTextReminderMode,
    layoutVariant: face.layoutVariant
  };
}

export function variantFaceFromCardFace(variantId: string, face: CardFaceRecord): CardVariantFaceRecord {
  return {
    variantId,
    cardId: face.cardId,
    faceIndex: face.faceIndex,
    faceName: face.faceName,
    manaCost: face.manaCost,
    typeLine: face.typeLine,
    oracleText: face.oracleText,
    flavorText: face.flavorText,
    power: face.power,
    toughness: face.toughness,
    loyalty: face.loyalty,
    defense: face.defense,
    colors: face.colors,
    frameType: face.frameType,
    artId: face.artId,
    artistDisplay: face.artistDisplay,
    watermark: face.watermark,
    rulesTextSizeHint: face.rulesTextSizeHint,
    rulesTextPaddingTop: face.rulesTextPaddingTop,
    rulesTextPaddingRight: face.rulesTextPaddingRight,
    rulesTextPaddingBottom: face.rulesTextPaddingBottom,
    rulesTextPaddingLeft: face.rulesTextPaddingLeft,
    rulesTextReminderMode: face.rulesTextReminderMode,
    layoutVariant: face.layoutVariant
  };
}

export function variantExportCards(project: ForgeProject, mode: CardVariantExportMode = 'primary'): ExportVariantCard[] {
  const result: ExportVariantCard[] = [];
  const cardsById = new Map(project.cards.map((card) => [card.cardId, card]));
  const facesByVariant = groupVariantFacesByVariant(project.variantFaces);

  for (const card of project.cards) {
    const variants = project.variants.filter((variant) => variant.cardId === card.cardId);
    for (const variant of variants.filter((candidate) => shouldExportVariant(candidate, mode))) {
      const variantFace = facesByVariant.get(variant.variantId)?.[0];
      if (!variantFace) {
        continue;
      }
      const exportCard = exportCardForVariant(cardsById.get(variant.cardId) ?? card, variant);
      result.push({
        parentCard: card,
        variant,
        card: exportCard,
        face: cardFaceFromVariantFace(variantFace, exportCard.cardId)
      });
    }
  }
  return result;
}

function synthesizeVariant(card: CardRecord, index: number): CardVariantRecord {
  return {
    variantId: defaultVariantId(card.cardId, index),
    cardId: card.cardId,
    displayName: `Variant ${index}`,
    kind: 'mechanics_test',
    status: card.status === 'final' ? 'final' : 'active',
    isPrimary: index === 1,
    exportPolicy: 'default',
    tags: [],
    notes: '',
    createdAt: undefined,
    updatedAt: undefined
  };
}

function normalizePrimary(variants: CardVariantRecord[]): CardVariantRecord[] {
  if (!variants.length) {
    return [];
  }
  const preferredIndex = variants.findIndex((variant) => variant.isPrimary && variant.status !== 'archived');
  const fallbackIndex = variants.findIndex((variant) => variant.status !== 'archived');
  const primaryIndex = preferredIndex >= 0 ? preferredIndex : fallbackIndex >= 0 ? fallbackIndex : 0;
  return variants.map((variant, index) => ({ ...variant, isPrimary: index === primaryIndex }));
}

function primaryFacesFromVariants(cards: CardRecord[], variants: CardVariantRecord[], variantFaces: CardVariantFaceRecord[], legacyFaces: CardFaceRecord[]): CardFaceRecord[] {
  const facesByVariant = groupVariantFacesByVariant(variantFaces);
  const legacyFacesByCard = groupFacesByCard(legacyFaces);
  const result: CardFaceRecord[] = [];

  for (const card of cards) {
    const primary = variants.find((variant) => variant.cardId === card.cardId && variant.isPrimary);
    const primaryFace = primary ? facesByVariant.get(primary.variantId)?.[0] : undefined;
    if (primaryFace) {
      result.push(cardFaceFromVariantFace(primaryFace, card.cardId));
      continue;
    }
    const legacyFace = legacyFacesByCard.get(card.cardId)?.[0];
    if (legacyFace) {
      result.push(legacyFace);
    }
  }
  return result;
}

function shouldExportVariant(variant: CardVariantRecord, mode: CardVariantExportMode): boolean {
  if (variant.isPrimary) {
    return true;
  }
  if (mode === 'primary') {
    return false;
  }
  if (mode === 'default') {
    return variant.status !== 'archived' && variant.exportPolicy === 'default';
  }
  if (mode === 'all_active') {
    return variant.status !== 'archived' && variant.exportPolicy !== 'excluded';
  }
  return true;
}

function exportCardForVariant(card: CardRecord, variant: CardVariantRecord): CardRecord {
  if (variant.isPrimary) {
    return card;
  }
  return {
    ...card,
    cardId: variant.variantId,
    collectorNumber: `${card.collectorNumber}${variantSuffix(variant.variantId)}`,
    name: `${card.name} (${variant.displayName})`,
    tags: [...card.tags, ...variant.tags, `variant:${variant.kind}`],
    status: variant.status === 'archived' ? 'archived' : card.status,
    notes: [card.notes, variant.notes].filter(Boolean).join('\n')
  };
}

function variantSuffix(variantId: string): string {
  const match = variantId.match(/-V(\d+)$/i);
  return match ? String.fromCharCode(96 + Math.min(26, Math.max(1, Number(match[1]) || 1))) : 'v';
}

function groupFacesByCard(faces: CardFaceRecord[]): Map<string, CardFaceRecord[]> {
  const grouped = new Map<string, CardFaceRecord[]>();
  for (const face of faces) {
    grouped.set(face.cardId, [...(grouped.get(face.cardId) ?? []), face].sort((left, right) => left.faceIndex - right.faceIndex));
  }
  return grouped;
}

function groupVariantsByCard(variants: CardVariantRecord[]): Map<string, CardVariantRecord[]> {
  const grouped = new Map<string, CardVariantRecord[]>();
  for (const variant of variants) {
    grouped.set(variant.cardId, [...(grouped.get(variant.cardId) ?? []), variant]);
  }
  return grouped;
}

function groupVariantFacesByVariant(faces: CardVariantFaceRecord[]): Map<string, CardVariantFaceRecord[]> {
  const grouped = new Map<string, CardVariantFaceRecord[]>();
  for (const face of faces) {
    grouped.set(face.variantId, [...(grouped.get(face.variantId) ?? []), face].sort((left, right) => left.faceIndex - right.faceIndex));
  }
  return grouped;
}

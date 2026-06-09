import type { ArtManifestRecord, CardFaceRecord, CardRecord, CardVariantFaceRecord, CardVariantRecord, ExportProfile } from '@homebrew-forge/forge';
import type { CardDraft } from './editorTypes.js';
import { CARD_TYPES, SUPERTYPES } from './magicTerms.js';
import { buildTypeLine, inferColors, inferFrame, normalizeColors } from './frameRegistry.js';
import { CORE_FRAMES } from './frameRegistry.js';
import type { FrameBorderColor } from './frameSupportTypes.js';

export function draftFromRecords(args: {
  card: CardRecord;
  face: CardFaceRecord;
  variant?: CardVariantRecord;
  variantFace?: CardVariantFaceRecord;
  art?: ArtManifestRecord;
  setName: string;
  language?: string;
  designer?: string;
}): CardDraft {
  const variant = args.variant ?? defaultVariant(args.card);
  const face = args.variantFace ? cardFaceFromVariantFace(args.variantFace) : args.face;
  const parsedType = parseTypeLine(face.typeLine);
  const planeswalkerAbilities = parsePlaneswalkerAbilities(face.oracleText ?? '');
  const layoutVariant = parseLayoutVariant(face.layoutVariant);
  return {
    cardId: args.card.cardId,
    setCode: args.card.setCode,
    setName: args.setName,
    collectorNumber: args.card.collectorNumber,
    setTotal: '',
    language: args.language ?? 'EN',
    designer: args.designer ?? '',
    name: args.card.name,
    manaCost: face.manaCost ?? '',
    rarity: args.card.rarity,
    layout: args.card.layout,
    mode: args.card.mode,
    frameType: face.frameType,
    frameOverrideId: layoutVariant.frameOverrideId,
    supertypes: parsedType.supertypes,
    cardTypes: parsedType.cardTypes,
    subtypes: parsedType.subtypes,
    typeLine: face.typeLine,
    oracleText: face.oracleText ?? '',
    flavorText: face.flavorText ?? '',
    rulesTextSize: rulesTextSizeFromHint(face.rulesTextSizeHint),
    rulesTextPaddingTop: numberToDraftCell(face.rulesTextPaddingTop),
    rulesTextPaddingRight: numberToDraftCell(face.rulesTextPaddingRight),
    rulesTextPaddingBottom: numberToDraftCell(face.rulesTextPaddingBottom),
    rulesTextPaddingLeft: numberToDraftCell(face.rulesTextPaddingLeft),
    rulesTextReminderMode: face.rulesTextReminderMode ?? 'auto',
    power: face.power ?? '',
    toughness: face.toughness ?? '',
    loyalty: face.loyalty ?? '',
    planeswalkerAbilityCount: planeswalkerAbilities.count,
    planeswalkerAbility1Cost: planeswalkerAbilities.abilities[0]?.cost ?? '+1',
    planeswalkerAbility1Text: planeswalkerAbilities.abilities[0]?.text ?? '',
    planeswalkerAbility2Cost: planeswalkerAbilities.abilities[1]?.cost ?? '-2',
    planeswalkerAbility2Text: planeswalkerAbilities.abilities[1]?.text ?? '',
    planeswalkerAbility3Cost: planeswalkerAbilities.abilities[2]?.cost ?? '-7',
    planeswalkerAbility3Text: planeswalkerAbilities.abilities[2]?.text ?? '',
    planeswalkerAbility4Cost: planeswalkerAbilities.abilities[3]?.cost ?? '',
    planeswalkerAbility4Text: planeswalkerAbilities.abilities[3]?.text ?? '',
    colors: face.colors ?? args.card.colorIdentity ?? '',
    colorIndicator: '',
    borderColor: layoutVariant.borderColor,
    foilTreatment: layoutVariant.foilTreatment,
    artId: face.artId ?? '',
    artFilePath: args.art?.filePath ?? '',
    artUrl: args.art?.sourceUrl ?? '',
    artDataUri: undefined,
    artPositionX: args.art?.transform?.x === undefined ? '' : String(args.art.transform.x),
    artPositionY: args.art?.transform?.y === undefined ? '' : String(args.art.transform.y),
    artScale: args.art?.transform?.scale === undefined || args.art.transform.scale <= 100 ? '' : String(args.art.transform.scale),
    artCropX: args.art?.crop?.x === undefined ? '' : String(args.art.crop.x),
    artCropY: args.art?.crop?.y === undefined ? '' : String(args.art.crop.y),
    artCropW: args.art?.crop?.w === undefined ? '' : String(args.art.crop.w),
    artCropH: args.art?.crop?.h === undefined ? '' : String(args.art.crop.h),
    artist: face.artistDisplay ?? args.art?.artist ?? '',
    setSymbolPath: '',
    setSymbolUrl: '',
    watermark: face.watermark ?? '',
    status: args.card.status,
    tags: args.card.tags,
    notes: args.card.notes ?? '',
    variantId: variant.variantId,
    variantDisplayName: variant.displayName,
    variantKind: variant.kind,
    variantStatus: variant.status,
    variantIsPrimary: variant.isPrimary,
    variantExportPolicy: variant.exportPolicy,
    variantTags: variant.tags,
    variantNotes: variant.notes ?? '',
    variantCreatedAt: variant.createdAt,
    variantUpdatedAt: variant.updatedAt,
    variantSummaries: [],
    sourceCard: args.card,
    sourceFace: face
  };
}

export function recordsFromDraft(draft: CardDraft): { card: CardRecord; face: CardFaceRecord; variant: CardVariantRecord; variantFace: CardVariantFaceRecord } {
  const inferredFrame = inferFrame(draft, CORE_FRAMES);
  const typeLine = buildTypeLine(draft);
  const frameColors = inferColors(draft.manaCost);
  const colorIdentity = normalizeColors(draft.colorIndicator) || frameColors;
  const layout = inferredFrame.layout;
  const oracleText = draft.cardTypes.includes('Planeswalker') ? serializePlaneswalkerAbilities(draft) || draft.oracleText : draft.oracleText;
  const layoutVariant = serializeLayoutVariant({
    base: inferredFrame.frameType === 'token_full_art' ? 'full_art' : parseLayoutVariant(draft.sourceFace?.layoutVariant).base,
    borderColor: draft.borderColor,
    foilTreatment: draft.foilTreatment,
    frameOverrideId: draft.frameOverrideId
  });

  const card: CardRecord = {
      cardId: draft.cardId,
      setCode: draft.setCode,
      collectorNumber: draft.collectorNumber,
      name: draft.name,
      layout,
      mode: layout === 'token' ? 'token' : 'custom',
      sourceCardName: draft.sourceCard?.sourceCardName,
      sourceSetCode: draft.sourceCard?.sourceSetCode,
      rarity: draft.rarity,
      colorIdentity,
      tags: draft.tags,
      status: draft.creationStatus ?? draft.status ?? draft.sourceCard?.status ?? 'draft',
      printCount: draft.sourceCard?.printCount ?? 1,
      exportNameOverride: draft.sourceCard?.exportNameOverride,
      notes: draft.creationNotes ?? draft.notes ?? draft.sourceCard?.notes
    };
  const face: CardFaceRecord = {
      cardId: draft.cardId,
      faceIndex: draft.sourceFace?.faceIndex ?? 0,
      faceName: draft.name,
      manaCost: draft.manaCost,
      typeLine,
      oracleText,
      flavorText: draft.flavorText,
      power: draft.power,
      toughness: draft.toughness,
      loyalty: draft.loyalty,
      defense: draft.sourceFace?.defense,
      colors: frameColors,
      frameType: inferredFrame.frameType,
      artId: draft.artId,
      artistDisplay: draft.artist,
      watermark: draft.watermark,
      rulesTextSizeHint: draft.rulesTextSize.trim() || 'auto',
      rulesTextPaddingTop: optionalNumberFromDraft(draft.rulesTextPaddingTop),
      rulesTextPaddingRight: optionalNumberFromDraft(draft.rulesTextPaddingRight),
      rulesTextPaddingBottom: optionalNumberFromDraft(draft.rulesTextPaddingBottom),
      rulesTextPaddingLeft: optionalNumberFromDraft(draft.rulesTextPaddingLeft),
      rulesTextReminderMode: draft.rulesTextReminderMode,
      layoutVariant
    };
  const now = new Date().toISOString();
  const variant: CardVariantRecord = {
    variantId: draft.variantId || `${draft.cardId}-V1`,
    cardId: draft.cardId,
    displayName: draft.variantDisplayName || 'Variant 1',
    kind: draft.variantKind || 'mechanics_test',
    status: draft.variantStatus || 'active',
    isPrimary: Boolean(draft.variantIsPrimary),
    exportPolicy: draft.variantExportPolicy || 'default',
    tags: draft.variantTags ?? [],
    notes: draft.variantNotes ?? '',
    createdAt: draft.variantCreatedAt || now,
    updatedAt: now
  };
  return {
    card,
    face,
    variant,
    variantFace: variantFaceFromCardFace(variant.variantId, face)
  };
}

function defaultVariant(card: CardRecord): CardVariantRecord {
  return {
    variantId: `${card.cardId}-V1`,
    cardId: card.cardId,
    displayName: 'Variant 1',
    kind: 'mechanics_test',
    status: card.status === 'final' ? 'final' : 'active',
    isPrimary: true,
    exportPolicy: 'default',
    tags: [],
    notes: '',
    createdAt: undefined,
    updatedAt: undefined
  };
}

function cardFaceFromVariantFace(face: CardVariantFaceRecord): CardFaceRecord {
  return {
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

function variantFaceFromCardFace(variantId: string, face: CardFaceRecord): CardVariantFaceRecord {
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

function rulesTextSizeFromHint(value: string | undefined): string {
  const cleaned = String(value ?? '').trim();
  if (!cleaned || cleaned === 'auto') {
    return '';
  }
  if (cleaned === 'small') {
    return '16';
  }
  if (cleaned === 'normal') {
    return '20';
  }
  if (cleaned === 'large') {
    return '26';
  }
  return cleaned;
}

function numberToDraftCell(value: number | undefined): string {
  return value === undefined ? '' : String(value);
}

function optionalNumberFromDraft(value: string): number | undefined {
  if (value.trim() === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseLayoutVariant(value: string | undefined): {
  base: string;
  borderColor: FrameBorderColor;
  foilTreatment: CardDraft['foilTreatment'];
  frameOverrideId: string;
} {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return { base: 'normal', borderColor: 'black', foilTreatment: 'none', frameOverrideId: 'auto' };
  }
  const [base = 'normal', ...parts] = raw.split(';').map((part) => part.trim()).filter(Boolean);
  const metadata = new Map(parts.map((part) => {
    const [key = '', ...rest] = part.split('=');
    return [key.trim(), rest.join('=').trim()];
  }));
  return {
    base,
    borderColor: parseBorderColor(metadata.get('border')),
    foilTreatment: parseFoilTreatment(metadata.get('treatment')),
    frameOverrideId: metadata.get('frame') || 'auto'
  };
}

function serializeLayoutVariant(args: {
  base: string;
  borderColor: FrameBorderColor;
  foilTreatment: CardDraft['foilTreatment'];
  frameOverrideId: string;
}): string {
  const base = args.base.trim() || 'normal';
  const parts = [base];
  if (args.borderColor !== 'black') {
    parts.push(`border=${args.borderColor}`);
  }
  if (args.foilTreatment !== 'none') {
    parts.push(`treatment=${args.foilTreatment}`);
  }
  if (args.frameOverrideId && args.frameOverrideId !== 'auto') {
    parts.push(`frame=${args.frameOverrideId}`);
  }
  return parts.join(';');
}

function parseBorderColor(value: string | undefined): FrameBorderColor {
  if (value === 'white' || value === 'white-mse' || value === 'silver' || value === 'gold' || value === 'borderless' || value === 'none') {
    return value;
  }
  return 'black';
}

function parseFoilTreatment(value: string | undefined): CardDraft['foilTreatment'] {
  if (value === 'foil' || value === 'etched' || value === 'showcase') {
    return value;
  }
  return 'none';
}

function parsePlaneswalkerAbilities(oracleText: string): { count: '3' | '4'; abilities: Array<{ cost: string; text: string }> } {
  const abilities = oracleText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^([+\-0-9X]+)\s*:?\s*(.*)$/i);
      return match ? { cost: match[1] ?? '', text: match[2] ?? '' } : { cost: '', text: line };
    });
  return {
    count: abilities.length > 3 ? '4' : '3',
    abilities
  };
}

function serializePlaneswalkerAbilities(draft: CardDraft): string {
  const rows = [
    { cost: draft.planeswalkerAbility1Cost, text: draft.planeswalkerAbility1Text },
    { cost: draft.planeswalkerAbility2Cost, text: draft.planeswalkerAbility2Text },
    { cost: draft.planeswalkerAbility3Cost, text: draft.planeswalkerAbility3Text },
    ...(draft.planeswalkerAbilityCount === '4' ? [{ cost: draft.planeswalkerAbility4Cost, text: draft.planeswalkerAbility4Text }] : [])
  ];
  return rows
    .map((row) => `${row.cost.trim()}${row.cost.trim() ? ': ' : ''}${row.text.trim()}`.trim())
    .filter(Boolean)
    .join('\n');
}

export function previewProfile(): ExportProfile {
  return {
    profileId: 'editor_preview',
    target: 'images',
    imageFormat: 'png',
    widthPx: 488,
    heightPx: 680,
    quality: undefined,
    includeBleed: false,
    bleedPx: 0,
    includeCropMarks: false,
    includePlaytestWatermark: false,
    watermarkText: undefined,
    allowPlaceholderArt: true,
    filenameTemplate: '{{card_id}}.png'
  };
}

function parseTypeLine(typeLine: string): { supertypes: string[]; cardTypes: string[]; subtypes: string } {
  const [left = '', right = ''] = typeLine.split(/\s+[—-]\s+/, 2);
  const knownSupertypes = new Set(SUPERTYPES);
  const knownTypes = new Set(CARD_TYPES);
  const words = left.split(/\s+/).filter(Boolean);
  return {
    supertypes: words.filter((word) => knownSupertypes.has(word)),
    cardTypes: words.filter((word) => knownTypes.has(word)),
    subtypes: right
  };
}

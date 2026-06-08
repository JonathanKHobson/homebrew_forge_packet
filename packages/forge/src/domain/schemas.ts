import { z } from 'zod';
import { CARD_LAYOUTS, normalizeLayoutId } from './frameSupport.js';

const optionalText = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  return String(value);
}, z.string().optional());

const requiredText = z.preprocess((value) => String(value ?? '').trim(), z.string().min(1));
const cardIdText = z.preprocess((value) => String(value ?? '').trim(), z.string().min(1).regex(/^[A-Za-z0-9_-]+$/));

const integerCell = (fallback: number) =>
  z.preprocess((value) => {
    if (value === undefined || value === null || value === '') {
      return fallback;
    }
    return Number(value);
  }, z.number().int().min(0));

const optionalNumberCell = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  return Number(value);
}, z.number().optional());

const booleanCell = (fallback: boolean) =>
  z.preprocess((value) => {
    if (value === undefined || value === null || value === '') {
      return fallback;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    return ['true', '1', 'yes', 'y'].includes(String(value).toLowerCase());
  }, z.boolean());

export const cardLayoutSchema = z.preprocess((value) => normalizeLayoutId(String(value ?? 'normal')), z.enum(CARD_LAYOUTS));

export const cardModeSchema = z.enum(['custom', 'reskin', 'token', 'imported', 'placeholder']);
export const cardStatusSchema = z.enum(['idea', 'draft', 'review', 'playtest', 'final', 'cut', 'archived']);
export const raritySchema = z.enum(['common', 'uncommon', 'rare', 'mythic', 'special', 'bonus', 'token']);
export const exportTargetSchema = z.enum(['images', 'cockatrice', 'print_pdf', 'gallery']);
export const imageFormatSchema = z.enum(['png', 'jpg', 'jpeg', 'webp']);
export const rulesTextReminderModeSchema = z.enum(['auto', 'off']);
export const cardVariantKindSchema = z.enum(['mechanics_test', 'wording_test', 'visual_alternate', 'finish_alternate', 'print_alternate', 'history_snapshot']);
export const cardVariantStatusSchema = z.enum(['active', 'testing', 'final', 'archived']);
export const cardVariantExportPolicySchema = z.enum(['default', 'optional', 'excluded']);

export const setRecordSchema = z
  .object({
    set_code: requiredText,
    set_name: requiredText,
    set_type: optionalText,
    version: requiredText,
    default_language: optionalText,
    default_asset_pack: optionalText,
    default_export_profile: optionalText,
    author: optionalText,
    status: optionalText,
    tags: optionalText,
    notes: optionalText
  })
  .transform((row) => ({
    setCode: row.set_code,
    setName: row.set_name,
    setType: row.set_type,
    version: row.version,
    defaultLanguage: row.default_language,
    defaultAssetPack: row.default_asset_pack,
    defaultExportProfile: row.default_export_profile,
    author: row.author,
    status: row.status,
    tags: row.tags ? row.tags.split(';').map((tag) => tag.trim()).filter(Boolean) : [],
    notes: row.notes
  }));

export const cardRecordSchema = z
  .object({
    card_id: cardIdText,
    set_code: requiredText,
    collector_number: requiredText,
    name: requiredText,
    layout: cardLayoutSchema,
    mode: cardModeSchema,
    source_card_name: optionalText,
    source_set_code: optionalText,
    rarity: raritySchema,
    color_identity: optionalText,
    tags: optionalText,
    status: cardStatusSchema,
    print_count: integerCell(1),
    export_name_override: optionalText,
    notes: optionalText
  })
  .transform((row) => ({
    cardId: row.card_id,
    setCode: row.set_code,
    collectorNumber: row.collector_number,
    name: row.name,
    layout: row.layout,
    mode: row.mode,
    sourceCardName: row.source_card_name,
    sourceSetCode: row.source_set_code,
    rarity: row.rarity,
    colorIdentity: row.color_identity,
    tags: row.tags ? row.tags.split(';').map((tag) => tag.trim()).filter(Boolean) : [],
    status: row.status,
    printCount: row.print_count,
    exportNameOverride: row.export_name_override,
    notes: row.notes
  }));

export const cardFaceRecordSchema = z
  .object({
    card_id: requiredText,
    face_index: integerCell(0),
    face_name: requiredText,
    mana_cost: optionalText,
    type_line: requiredText,
    oracle_text: optionalText,
    flavor_text: optionalText,
    power: optionalText,
    toughness: optionalText,
    loyalty: optionalText,
    defense: optionalText,
    colors: optionalText,
    frame_type: requiredText,
    art_id: optionalText,
    artist_display: optionalText,
    watermark: optionalText,
    rules_text_size_hint: z.preprocess((value) => (value === '' || value === undefined ? 'auto' : String(value)), z.string()),
    rules_text_padding_top: optionalNumberCell,
    rules_text_padding_right: optionalNumberCell,
    rules_text_padding_bottom: optionalNumberCell,
    rules_text_padding_left: optionalNumberCell,
    rules_text_reminder_mode: z.preprocess((value) => (value === '' || value === undefined ? 'auto' : String(value)), rulesTextReminderModeSchema),
    layout_variant: optionalText
  })
  .transform((row) => ({
    cardId: row.card_id,
    faceIndex: row.face_index,
    faceName: row.face_name,
    manaCost: row.mana_cost,
    typeLine: row.type_line,
    oracleText: row.oracle_text,
    flavorText: row.flavor_text,
    power: row.power,
    toughness: row.toughness,
    loyalty: row.loyalty,
    defense: row.defense,
    colors: row.colors,
    frameType: row.frame_type,
    artId: row.art_id,
    artistDisplay: row.artist_display,
    watermark: row.watermark,
    rulesTextSizeHint: row.rules_text_size_hint,
    rulesTextPaddingTop: row.rules_text_padding_top,
    rulesTextPaddingRight: row.rules_text_padding_right,
    rulesTextPaddingBottom: row.rules_text_padding_bottom,
    rulesTextPaddingLeft: row.rules_text_padding_left,
    rulesTextReminderMode: row.rules_text_reminder_mode,
    layoutVariant: row.layout_variant
  }));

export const cardVariantRecordSchema = z
  .object({
    variant_id: cardIdText,
    card_id: cardIdText,
    display_name: z.preprocess((value) => String(value ?? '').trim() || 'Variant 1', z.string()),
    kind: z.preprocess((value) => String(value ?? '').trim() || 'mechanics_test', cardVariantKindSchema),
    status: z.preprocess((value) => String(value ?? '').trim() || 'active', cardVariantStatusSchema),
    is_primary: booleanCell(false),
    export_policy: z.preprocess((value) => String(value ?? '').trim() || 'default', cardVariantExportPolicySchema),
    tags: optionalText,
    notes: optionalText,
    created_at: optionalText,
    updated_at: optionalText
  })
  .transform((row) => ({
    variantId: row.variant_id,
    cardId: row.card_id,
    displayName: row.display_name,
    kind: row.kind,
    status: row.status,
    isPrimary: row.is_primary,
    exportPolicy: row.export_policy,
    tags: row.tags ? row.tags.split(';').map((tag) => tag.trim()).filter(Boolean) : [],
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));

export const cardVariantFaceRecordSchema = z
  .object({
    variant_id: cardIdText,
    card_id: cardIdText,
    face_index: integerCell(0),
    face_name: requiredText,
    mana_cost: optionalText,
    type_line: requiredText,
    oracle_text: optionalText,
    flavor_text: optionalText,
    power: optionalText,
    toughness: optionalText,
    loyalty: optionalText,
    defense: optionalText,
    colors: optionalText,
    frame_type: requiredText,
    art_id: optionalText,
    artist_display: optionalText,
    watermark: optionalText,
    rules_text_size_hint: z.preprocess((value) => (value === '' || value === undefined ? 'auto' : String(value)), z.string()),
    rules_text_padding_top: optionalNumberCell,
    rules_text_padding_right: optionalNumberCell,
    rules_text_padding_bottom: optionalNumberCell,
    rules_text_padding_left: optionalNumberCell,
    rules_text_reminder_mode: z.preprocess((value) => (value === '' || value === undefined ? 'auto' : String(value)), rulesTextReminderModeSchema),
    layout_variant: optionalText
  })
  .transform((row) => ({
    variantId: row.variant_id,
    cardId: row.card_id,
    faceIndex: row.face_index,
    faceName: row.face_name,
    manaCost: row.mana_cost,
    typeLine: row.type_line,
    oracleText: row.oracle_text,
    flavorText: row.flavor_text,
    power: row.power,
    toughness: row.toughness,
    loyalty: row.loyalty,
    defense: row.defense,
    colors: row.colors,
    frameType: row.frame_type,
    artId: row.art_id,
    artistDisplay: row.artist_display,
    watermark: row.watermark,
    rulesTextSizeHint: row.rules_text_size_hint,
    rulesTextPaddingTop: row.rules_text_padding_top,
    rulesTextPaddingRight: row.rules_text_padding_right,
    rulesTextPaddingBottom: row.rules_text_padding_bottom,
    rulesTextPaddingLeft: row.rules_text_padding_left,
    rulesTextReminderMode: row.rules_text_reminder_mode,
    layoutVariant: row.layout_variant
  }));

export const artManifestRecordSchema = z
  .object({
    art_id: requiredText,
    file_path: optionalText,
    source_url: optionalText,
    source_type: requiredText,
    artist: optionalText,
    license: optionalText,
    permission_status: requiredText,
    checksum_sha256: optionalText,
    position_x: optionalNumberCell,
    position_y: optionalNumberCell,
    scale: optionalNumberCell,
    crop_x: optionalNumberCell,
    crop_y: optionalNumberCell,
    crop_w: optionalNumberCell,
    crop_h: optionalNumberCell,
    notes: optionalText
  })
  .transform((row) => ({
    artId: row.art_id,
    filePath: row.file_path ?? '',
    sourceUrl: row.source_url,
    sourceType: row.source_type,
    artist: row.artist,
    license: row.license,
    permissionStatus: row.permission_status,
    checksumSha256: row.checksum_sha256,
    transform:
      row.position_x !== undefined || row.position_y !== undefined || row.scale !== undefined
        ? { x: row.position_x ?? 0, y: row.position_y ?? 0, scale: row.scale ?? 100 }
        : undefined,
    crop:
      row.crop_x !== undefined && row.crop_y !== undefined && row.crop_w !== undefined && row.crop_h !== undefined
        ? { x: row.crop_x, y: row.crop_y, w: row.crop_w, h: row.crop_h }
        : undefined,
    notes: row.notes
  }));

export const exportProfileSchema = z
  .object({
    profile_id: requiredText,
    target: exportTargetSchema,
    image_format: imageFormatSchema,
    width_px: integerCell(744),
    height_px: integerCell(1039),
    quality: z.preprocess((value) => {
      if (value === undefined || value === null || value === '') {
        return undefined;
      }
      return Number(value);
    }, z.number().int().min(1).max(100).optional()),
    include_bleed: booleanCell(false),
    bleed_px: integerCell(0),
    include_crop_marks: booleanCell(false),
    include_playtest_watermark: booleanCell(true),
    watermark_text: optionalText,
    allow_placeholder_art: booleanCell(true),
    filename_template: requiredText
  })
  .transform((row) => ({
    profileId: row.profile_id,
    target: row.target,
    imageFormat: row.image_format,
    widthPx: row.width_px,
    heightPx: row.height_px,
    quality: row.quality,
    includeBleed: row.include_bleed,
    bleedPx: row.bleed_px,
    includeCropMarks: row.include_crop_marks,
    includePlaytestWatermark: row.include_playtest_watermark,
    watermarkText: row.watermark_text,
    allowPlaceholderArt: row.allow_placeholder_art,
    filenameTemplate: row.filename_template
  }));

const layoutZoneSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number()
});

const layoutMapSchema = z.object({
  layout: z.string(),
  canvas: z.object({
    width: z.number(),
    height: z.number()
  }),
  zones: z.record(z.string(), layoutZoneSchema)
});

const renderHintsSchema = z
  .object({
    source_profile: z.string().optional(),
    cover_placeholder_text: z.boolean().optional(),
    overlay_art_over_frame: z.boolean().optional(),
    pt_box_uses_zone: z.boolean().optional()
  })
  .default({});

const roleSchema = z
  .object({
    id: z.string(),
    role: z.string(),
    layout: z.string().optional(),
    color_variant: z.string().optional(),
    symbol: z.string().optional(),
    required: z.boolean().optional(),
    path: z.string(),
    source_id: z.string().optional(),
    checksum_sha256: z.string().optional()
  })
  .transform((role) => ({
    id: role.id,
    role: role.role,
    layout: role.layout,
    colorVariant: role.color_variant,
    symbol: role.symbol,
    required: role.required ?? false,
    path: role.path,
    sourceId: role.source_id,
    checksumSha256: role.checksum_sha256
  }));

export const assetPackManifestSchema = z
  .object({
    pack_id: requiredText,
    name: requiredText,
    version: requiredText,
    asset_base_path: optionalText,
    source_summary: optionalText,
    license_status: optionalText,
    redistribution_allowed: z.boolean().default(false),
    commit_allowed: z.boolean().default(false),
    render_hints: renderHintsSchema,
    supported_layouts: z.array(z.string()).default([]),
    roles: z.array(roleSchema).default([]),
    layout_maps: z.array(layoutMapSchema).default([])
  })
  .transform((manifest) => ({
    packId: manifest.pack_id,
    name: manifest.name,
    version: manifest.version,
    assetBasePath: manifest.asset_base_path,
    sourceSummary: manifest.source_summary,
    licenseStatus: manifest.license_status,
    redistributionAllowed: manifest.redistribution_allowed,
    commitAllowed: manifest.commit_allowed,
    renderHints: {
      sourceProfile: manifest.render_hints.source_profile,
      coverPlaceholderText: manifest.render_hints.cover_placeholder_text ?? false,
      overlayArtOverFrame: manifest.render_hints.overlay_art_over_frame ?? false,
      ptBoxUsesZone: manifest.render_hints.pt_box_uses_zone ?? false
    },
    supportedLayouts: manifest.supported_layouts,
    roles: manifest.roles,
    layoutMaps: manifest.layout_maps
  }));

export type SetRecord = z.output<typeof setRecordSchema>;
export type CardRecord = z.output<typeof cardRecordSchema>;
export type CardFaceRecord = z.output<typeof cardFaceRecordSchema>;
export type CardVariantRecord = z.output<typeof cardVariantRecordSchema>;
export type CardVariantFaceRecord = z.output<typeof cardVariantFaceRecordSchema>;
export type ArtManifestRecord = z.output<typeof artManifestRecordSchema> & { absolutePath?: string };
export type ExportProfile = z.output<typeof exportProfileSchema>;
export type AssetPackManifest = z.output<typeof assetPackManifestSchema>;
export type AssetRoleRef = AssetPackManifest['roles'][number];
export type LayoutMap = AssetPackManifest['layoutMaps'][number];

export interface ForgeProject {
  rootDir: string;
  setCode: string;
  set: SetRecord;
  cards: CardRecord[];
  faces: CardFaceRecord[];
  variants: CardVariantRecord[];
  variantFaces: CardVariantFaceRecord[];
  art: Record<string, ArtManifestRecord>;
  exportProfiles: ExportProfile[];
}

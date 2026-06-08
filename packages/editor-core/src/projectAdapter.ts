import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  cardFaceFromVariantFace,
  type CardVariantFaceRecord,
  type CardVariantRecord,
  type ForgeProject
} from '@homebrew-forge/forge';
import { draftFromRecords } from './cardDraft.js';
import type { CardDraft, CockatriceSyncResult, EditorProject, LibraryAssetSummary } from './editorTypes.js';
import { CORE_FRAMES } from './frameRegistry.js';

export async function editorProjectFromForge(repoRoot: string, project: ForgeProject, lastCockatriceSync?: CockatriceSyncResult): Promise<EditorProject> {
  const variantsByCard = new Map<string, CardVariantRecord[]>();
  for (const variant of project.variants) {
    variantsByCard.set(variant.cardId, [...(variantsByCard.get(variant.cardId) ?? []), variant]);
  }
  const variantFacesByVariant = new Map<string, CardVariantFaceRecord[]>();
  for (const face of project.variantFaces) {
    variantFacesByVariant.set(face.variantId, [...(variantFacesByVariant.get(face.variantId) ?? []), face]);
  }
  const drafts = project.cards.flatMap((card) => {
    const variants = variantsByCard.get(card.cardId) ?? [];
    return variants.flatMap((variant) => {
      const variantFace = [...(variantFacesByVariant.get(variant.variantId) ?? [])].sort((left, right) => left.faceIndex - right.faceIndex)[0];
      if (!variantFace) {
        return [];
      }
      const face = cardFaceFromVariantFace(variantFace, card.cardId);
      return [
        draftFromRecords({
          card,
          face,
          variant,
          variantFace,
          art: face.artId ? project.art[face.artId] : undefined,
          setName: project.set.setName,
          language: project.set.defaultLanguage?.toUpperCase() ?? 'EN',
          designer: project.set.author
        })
      ];
    });
  });
  const variantSummariesByCard = new Map<string, EditorProject['cards'][number]['variants']>();
  for (const draft of drafts) {
    const summary = variantSummaryFromDraft(draft);
    variantSummariesByCard.set(draft.cardId, [...(variantSummariesByCard.get(draft.cardId) ?? []), summary]);
  }
  const draftsWithVariantSummaries = drafts.map((draft) => ({
    ...draft,
    variantSummaries: variantSummariesByCard.get(draft.cardId) ?? []
  }));

  return {
    setCode: project.setCode,
    setName: project.set.setName,
    language: project.set.defaultLanguage?.toUpperCase() ?? 'EN',
    designer: project.set.author ?? '',
    assetPackId: project.set.defaultAssetPack ?? 'debug',
    cards: project.cards.flatMap((card) => {
      const cardDrafts = draftsWithVariantSummaries.filter((draft) => draft.cardId === card.cardId);
      const draft = cardDrafts.find((candidate) => candidate.variantIsPrimary) ?? cardDrafts[0];
      if (!draft) {
        return [];
      }
      const variants = variantSummariesByCard.get(card.cardId) ?? [];
      return [
        {
          cardId: draft.cardId,
          collectorNumber: draft.collectorNumber,
          name: draft.name,
          typeLine: draft.typeLine,
          rarity: draft.rarity,
          colors: draft.colors,
          layout: draft.layout,
          frameType: draft.frameType,
          status: draft.status,
          tags: draft.tags,
          notes: draft.notes,
          manaCost: draft.manaCost,
          colorIdentity: draft.colorIndicator || draft.colors,
          oracleText: draft.oracleText,
          flavorText: draft.flavorText,
          power: draft.power,
          toughness: draft.toughness,
          hasArt: Boolean(draft.artId && project.art[draft.artId]),
          needsReview:
            draft.status === 'review' ||
            draft.status === 'idea' ||
            draft.tags.some((tag) => tag === 'needs_review' || tag.startsWith('unsupported_layout:') || tag.startsWith('registered_layout:')),
          primaryVariantId: variants.find((variant) => variant.isPrimary)?.variantId ?? draft.variantId,
          variantCount: variants.length,
          variants
        }
      ];
    }),
    drafts: draftsWithVariantSummaries,
    libraryAssets: buildLibraryAssets(project, draftsWithVariantSummaries),
    frames: CORE_FRAMES,
    discoveredFrameFamilies: await discoverFullPackFrameFamilies(repoRoot),
    lastCockatriceSync
  };
}

function variantSummaryFromDraft(draft: CardDraft): EditorProject['cards'][number]['variants'][number] {
  return {
    variantId: draft.variantId,
    cardId: draft.cardId,
    displayName: draft.variantDisplayName,
    kind: draft.variantKind,
    status: draft.variantStatus,
    isPrimary: draft.variantIsPrimary,
    exportPolicy: draft.variantExportPolicy,
    tags: draft.variantTags,
    notes: draft.variantNotes,
    searchText: [
      draft.variantDisplayName,
      draft.variantKind,
      draft.variantStatus,
      draft.variantExportPolicy,
      draft.variantTags.join(' '),
      draft.variantNotes,
      draft.name,
      draft.manaCost,
      draft.typeLine,
      draft.oracleText,
      draft.flavorText
    ].join(' ')
  };
}

function buildLibraryAssets(project: ForgeProject, drafts: CardDraft[]): LibraryAssetSummary[] {
  const assignedByArtId = new Map<string, Array<{ cardId: string; name: string }>>();
  for (const draft of drafts) {
    if (!draft.artId) {
      continue;
    }
    assignedByArtId.set(draft.artId, [...(assignedByArtId.get(draft.artId) ?? []), { cardId: draft.cardId, name: draft.name }]);
  }
  return Object.values(project.art)
    .map((asset) => {
      const [sourceMode = asset.sourceType, assetType = 'art'] = asset.sourceType.split(':', 2);
      return {
        artId: asset.artId,
        name: asset.artId,
        assetType,
        filePath: asset.filePath,
        sourceUrl: asset.sourceUrl ?? '',
        sourceType: sourceMode,
        artist: asset.artist ?? '',
        license: asset.license ?? '',
        permissionStatus: asset.permissionStatus,
        notes: asset.notes ?? '',
        assignedCards: assignedByArtId.get(asset.artId) ?? []
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

async function discoverFullPackFrameFamilies(repoRoot: string): Promise<string[]> {
  const dataDir = join(repoRoot, '..', 'Basic-M15-Magic-Pack-main', 'Full-Magic-Pack-main', 'data');
  try {
    const entries = await readdir(dataDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && entry.name.endsWith('.mse-style'))
      .map((entry) => entry.name.replace(/\.mse-style$/, ''))
      .filter((name) => /magic-m15|planeswalker|token|saga|battle|dfc|split/i.test(name))
      .sort();
  } catch {
    return [];
  }
}

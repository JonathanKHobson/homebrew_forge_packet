import { useEffect, useState } from 'react';
import { fetchProject } from '../../api/client.js';
import type { CardDraft, DeckCardOption, DeckMetadata } from '../../domain/editorTypes.js';
import { imageUrlForMetadata, metadataFromDeckCard } from '../../domain/officialCardMetadata.js';
import { ManaSymbolSet } from '../ManaSymbols.js';

interface DeckCoverBadgeProps {
  metadata: Pick<DeckMetadata, 'name' | 'coverCard' | 'commander' | 'colorIdentity'> & { coverImageUrl?: string };
  cards?: DeckCardOption[];
  size?: 'small' | 'large';
}

export function DeckCoverBadge({ metadata, cards = [], size = 'small' }: DeckCoverBadgeProps) {
  const reference = metadata.coverCard ?? metadata.commander;
  const [src, setSrc] = useState('');
  const officialSrc = metadata.coverImageUrl || imageUrlForMetadata(metadataFromDeckCard(cards.find((card) => card.setCode === reference?.setCode && card.cardId === reference?.cardId)), 'normal');

  useEffect(() => {
    let mounted = true;
    setSrc('');
    if (officialSrc || !reference?.setCode || !reference.cardId) {
      return () => {
        mounted = false;
      };
    }
    void fetchProject(reference.setCode)
      .then((project) => {
        const draft =
          project.drafts.find((candidate) => candidate.cardId === reference.cardId && candidate.variantId === reference.variantId) ??
          project.drafts.find((candidate) => candidate.cardId === reference.cardId && candidate.variantIsPrimary) ??
          project.drafts.find((candidate) => candidate.cardId === reference.cardId);
        if (mounted) {
          setSrc(draft ? draftArtSrc(draft) : '');
        }
      })
      .catch(() => {
        if (mounted) {
          setSrc('');
        }
      });
    return () => {
      mounted = false;
    };
  }, [officialSrc, reference?.setCode, reference?.cardId, reference?.variantId]);

  const label = reference?.nameSnapshot ?? metadata.name;
  const resolvedSrc = officialSrc || src;
  return (
    <span className={`deck-cover-badge ${size} ${resolvedSrc ? 'has-art' : ''}`} title={label} aria-label={`Deck cover ${label}`}>
      {resolvedSrc ? <img src={resolvedSrc} alt="" /> : <strong>{initials(label)}</strong>}
      {metadata.colorIdentity ? (
        <em title={`Color identity ${metadata.colorIdentity}`}>
          <ManaSymbolSet value={metadata.colorIdentity} className="deck-cover-symbols" />
        </em>
      ) : null}
    </span>
  );
}

function draftArtSrc(draft: CardDraft): string {
  if (draft.artDataUri) {
    return draft.artDataUri;
  }
  if (draft.artUrl) {
    return draft.artUrl;
  }
  if (draft.artFilePath) {
    return `/api/asset?path=${encodeURIComponent(draft.artFilePath)}`;
  }
  return '';
}

function initials(value: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? `${words[0]?.[0] ?? ''}${words[1]?.[0] ?? ''}` : value.slice(0, 2);
  return letters.toUpperCase() || 'DK';
}

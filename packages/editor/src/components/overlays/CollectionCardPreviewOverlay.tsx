import { useEffect, useMemo, useState } from 'react';
import { fetchProject } from '../../api/client.js';
import type { CardDraft, CollectionEntry, CollectionState, EditorProject, LibraryState } from '../../domain/editorTypes.js';
import { normalizeCollectionOwnerName, normalizeCollectionTags } from '../../domain/collectionOwnership.js';
import { collectionValueEstimateFromEntry, imageUrlForMetadata, metadataFromCollectionEntry, printLabelForMetadata } from '../../domain/officialCardMetadata.js';
import { Field } from '../Field.js';
import { Icon } from '../Icon.js';
import { ImageLightbox } from '../ImageLightbox.js';
import { ColorIdentitySymbols, ManaCostSymbols } from '../ManaSymbols.js';
import { OverlayShell } from './OverlayShell.js';

interface CollectionCardPreviewOverlayProps {
  collection: CollectionState;
  entry: CollectionEntry;
  library: LibraryState | null;
  ownerSuggestions: string[];
  onChangeEntry: (patch: Partial<CollectionEntry>) => void;
  onOpenCard: (setCode: string, cardId: string, variantId?: string) => Promise<void> | void;
  onStatus: (message: string) => void;
  onClose: () => void;
}

export function CollectionCardPreviewOverlay({ collection, entry, library, ownerSuggestions, onChangeEntry, onOpenCard, onStatus, onClose }: CollectionCardPreviewOverlayProps) {
  const [linkedProject, setLinkedProject] = useState<EditorProject | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageExpanded, setImageExpanded] = useState(false);
  const linkedSetCode = entry.linkedSetCode ?? '';
  const linkedCardId = entry.linkedCardId ?? '';

  useEffect(() => {
    let mounted = true;
    if (!linkedSetCode) {
      setLinkedProject(null);
      return () => {
        mounted = false;
      };
    }
    setLoading(true);
    void fetchProject(linkedSetCode)
      .then((project) => {
        if (mounted) {
          setLinkedProject(project);
        }
      })
      .catch((caught) => onStatus(caught instanceof Error ? caught.message : String(caught)))
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [linkedSetCode, onStatus]);

  const linkedCards = linkedProject?.cards ?? [];
  const variants = useMemo(() => linkedProject?.drafts.filter((draft) => draft.cardId === linkedCardId) ?? [], [linkedCardId, linkedProject?.drafts]);
  const selectedDraft = variants.find((draft) => draft.variantId === entry.linkedVariantId) ?? variants.find((draft) => draft.variantIsPrimary) ?? variants[0];
  const officialMetadata = metadataFromCollectionEntry(entry);
  const valueEstimate = collectionValueEstimateFromEntry(entry);
  const officialPreviewSrc = entry.previewArtSource === 'none' ? '' : imageUrlForMetadata(officialMetadata, 'large');
  const previewSrc = selectedDraft && entry.previewArtSource !== 'none' && entry.previewArtSource !== 'scryfall' ? draftArtSrc(selectedDraft) || officialPreviewSrc : officialPreviewSrc;
  const footer = (
    <>
      {selectedDraft ? (
        <button
          type="button"
          className="secondary-button icon-label-button"
          onClick={() => {
            void onOpenCard(selectedDraft.setCode, selectedDraft.cardId, selectedDraft.variantId);
            onClose();
          }}
        >
          <Icon name="cards" />
          Open in Maker
        </button>
      ) : null}
      <button type="button" className="primary-button" onClick={onClose}>
        Done
      </button>
    </>
  );

  return (
    <OverlayShell title={entry.cardName} eyebrow="Collection Preview" subtitle={`${collection.metadata.name} - ${entry.quantity} copy${entry.quantity === 1 ? '' : 'ies'}`} dirty={false} footer={footer} onClose={onClose}>
      <div className="collection-preview-overlay-grid">
        <section className="collection-preview-art">
          {previewSrc ? (
            <button type="button" className="collection-preview-art-button" onClick={() => setImageExpanded(true)} onDoubleClick={() => setImageExpanded(true)} title="Expand card image" aria-label={`Expand ${entry.cardName} image`}>
              <img src={previewSrc} alt={`${entry.cardName} preview art`} />
            </button>
          ) : (
            <div className="tile-art-placeholder large collection-card-mark">
              <span>{entry.cardName.slice(0, 2).toUpperCase()}</span>
            </div>
          )}
          <div className="readonly-line">
            <strong>{previewSourceLabel(entry.previewArtSource ?? 'auto')}</strong>
            <span>{selectedDraft ? `${selectedDraft.variantDisplayName} art` : officialPreviewSrc ? 'Official card image' : 'No linked local card preview.'}</span>
          </div>
        </section>

        <section className="collection-preview-details">
          <div className="collection-detail-grid">
            <div className="readonly-line">
              <strong>Print</strong>
              <span>{printLabelForMetadata(officialMetadata) || 'Unresolved'}</span>
            </div>
            <div className="readonly-line">
              <strong>Owner</strong>
              <span>{entry.ownerName}</span>
            </div>
            <div className="readonly-line">
              <strong>Ownership</strong>
              <span>{[entry.ownershipStatus, entry.finish, entry.condition, entry.language].filter(Boolean).join(' - ') || 'No ownership fields set'}</span>
            </div>
            <div className="readonly-line">
              <strong>Review</strong>
              <span>{entry.reviewStatus === 'needs_review' ? entry.reviewNotes ?? 'Needs review' : 'Matched'}</span>
            </div>
            <div className="readonly-line">
              <strong>Location</strong>
              <span>{entry.location || 'No location'}</span>
            </div>
            <div className="readonly-line">
              <strong>Market value</strong>
              <span>{valueEstimate ? `${formatMoney(valueEstimate.amount * entry.quantity, valueEstimate.currency)} from ${valueEstimate.source}` : 'No source'}</span>
            </div>
            <div className="readonly-line">
              <strong>Markers</strong>
              <span>{rowMarkerLabel(entry)}</span>
            </div>
            <div className="readonly-line">
              <strong>Mana</strong>
              <ManaCostSymbols value={officialMetadata.manaCost} />
            </div>
            <div className="readonly-line">
              <strong>Mana value</strong>
              <span>{officialMetadata.manaValue ?? '-'}</span>
            </div>
            <div className="readonly-line">
              <strong>Identity</strong>
              <ColorIdentitySymbols value={officialMetadata.colorIdentity} />
            </div>
            <div className="readonly-line">
              <strong>Type</strong>
              <span>{officialMetadata.typeLine || '-'}</span>
            </div>
          </div>
          {officialMetadata.oracleText ? <p className="official-card-text">{officialMetadata.oracleText}</p> : null}
          {officialMetadata.flavorText ? <p className="official-card-text flavor">{officialMetadata.flavorText}</p> : null}

          <div className="grid-2">
            <Field label="Authored set link">
              <select value={linkedSetCode} onChange={(event) => onChangeEntry({ linkedSetCode: event.target.value || undefined, linkedCardId: undefined, linkedVariantId: undefined })}>
                <option value="">No authored set linked</option>
                {(library?.sets ?? []).map((set) => (
                  <option key={set.setCode} value={set.setCode}>
                    {set.setCode} - {set.setName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Preview source">
              <select value={entry.previewArtSource ?? 'auto'} onChange={(event) => onChangeEntry({ previewArtSource: event.target.value as CollectionEntry['previewArtSource'] })}>
                <option value="auto">Auto</option>
                <option value="local">Local art</option>
                <option value="scryfall">Scryfall fallback</option>
                <option value="none">No image</option>
              </select>
            </Field>
          </div>
          <div className="grid-2">
            <Field label="Authored card link">
              <select value={linkedCardId} disabled={!linkedSetCode || loading || !linkedCards.length} onChange={(event) => onChangeEntry({ linkedCardId: event.target.value || undefined, linkedVariantId: undefined })}>
                <option value="">{loading ? 'Loading cards...' : 'No authored card linked'}</option>
                {linkedCards.map((card) => (
                  <option key={card.cardId} value={card.cardId}>
                    {card.collectorNumber} - {card.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Authored variant">
              <select value={entry.linkedVariantId ?? selectedDraft?.variantId ?? ''} disabled={!variants.length} onChange={(event) => onChangeEntry({ linkedVariantId: event.target.value || undefined })}>
                <option value="">Primary variant</option>
                {variants.map((draft) => (
                  <option key={draft.variantId} value={draft.variantId}>
                    {draft.variantIsPrimary ? '* ' : ''}{draft.variantDisplayName}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="collection-preview-quick-edit">
            <div className="collection-marker-row" role="group" aria-label="Collection row markers">
              <label className="checkbox-row">
                <input type="checkbox" checked={Boolean(entry.starred)} onChange={(event) => onChangeEntry({ starred: event.target.checked })} />
                <span>Starred</span>
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={Boolean(entry.flagged)} onChange={(event) => onChangeEntry({ flagged: event.target.checked })} />
                <span>Flagged</span>
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={Boolean(entry.markedForDeletion)} onChange={(event) => onChangeEntry({ markedForDeletion: event.target.checked })} />
                <span>Marked for deletion</span>
              </label>
            </div>
            <div className="collection-marker-row" role="group" aria-label="Collection row attributes">
              <label className="checkbox-row">
                <input type="checkbox" checked={Boolean(entry.altered)} onChange={(event) => onChangeEntry({ altered: event.target.checked })} />
                <span>Altered</span>
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={Boolean(entry.misprint)} onChange={(event) => onChangeEntry({ misprint: event.target.checked })} />
                <span>Misprint</span>
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={Boolean(entry.proxy)} onChange={(event) => onChangeEntry({ proxy: event.target.checked })} />
                <span>Proxy</span>
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={Boolean(entry.homebrew)} onChange={(event) => onChangeEntry({ homebrew: event.target.checked })} />
                <span>Homebrew</span>
              </label>
            </div>
            <div className="grid-2">
              <Field label="Owner">
                <input list="collection-preview-owner-options" value={entry.ownerName} placeholder="Kyle" onChange={(event) => onChangeEntry({ ownerName: event.target.value })} onBlur={(event) => onChangeEntry({ ownerName: normalizeCollectionOwnerName(event.target.value) })} />
                <datalist id="collection-preview-owner-options">
                  {ownerSuggestions.map((owner) => (
                    <option key={owner} value={owner} />
                  ))}
                </datalist>
              </Field>
              <Field label="Tags">
                <input value={(entry.tags ?? []).join(';')} placeholder="trade;commander" onChange={(event) => onChangeEntry({ tags: normalizeCollectionTags(event.target.value) })} />
              </Field>
            </div>
            <div className="grid-2">
              <Field label="Purchase price">
                <div className="grid-2">
                  <input type="number" min="0" step="0.01" value={entry.purchasePrice ?? ''} onChange={(event) => onChangeEntry({ purchasePrice: event.target.value === '' ? undefined : Number(event.target.value) })} />
                  <input value={entry.purchaseCurrency ?? 'USD'} onChange={(event) => onChangeEntry({ purchaseCurrency: event.target.value.toUpperCase() || undefined })} />
                </div>
              </Field>
            </div>
            <Field label="Notes">
              <textarea value={entry.notes ?? ''} rows={3} onChange={(event) => onChangeEntry({ notes: event.target.value || undefined })} />
            </Field>
          </div>
        </section>
      </div>
      {imageExpanded && previewSrc ? <ImageLightbox src={previewSrc} alt={`${entry.cardName} card image`} label={`${entry.cardName} expanded image`} onClose={() => setImageExpanded(false)} /> : null}
    </OverlayShell>
  );
}

function rowMarkerLabel(entry: CollectionEntry): string {
  const markers = [
    entry.starred ? 'Starred' : '',
    entry.flagged ? 'Flagged' : '',
    entry.markedForDeletion ? 'Delete review' : '',
    entry.altered ? 'Altered' : '',
    entry.misprint ? 'Misprint' : '',
    entry.proxy ? 'Proxy' : '',
    entry.homebrew ? 'Homebrew' : ''
  ].filter(Boolean);
  return markers.length ? markers.join(', ') : 'None';
}

function formatMoney(amount: number, currency: string): string {
  if (currency === 'TIX') {
    return `${amount.toFixed(2)} tix`;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
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

function previewSourceLabel(value: CollectionEntry['previewArtSource']): string {
  if (value === 'local') {
    return 'Local art';
  }
  if (value === 'scryfall') {
    return 'Scryfall fallback';
  }
  if (value === 'none') {
    return 'No image';
  }
  return 'Auto preview';
}

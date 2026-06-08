import { useEffect, useMemo, useState } from 'react';
import { fetchProject } from '../../api/client.js';
import type { CardDraft, DeckEntry, DeckState, EditorProject } from '../../domain/editorTypes.js';
import { imageUrlForMetadata, metadataFromDeckCard, printLabelForMetadata } from '../../domain/officialCardMetadata.js';
import { Field } from '../Field.js';
import { Icon } from '../Icon.js';
import { ColorIdentitySymbols, ManaCostSymbols } from '../ManaSymbols.js';
import { TagEditor } from '../TagEditor.js';
import { OverlayShell } from './OverlayShell.js';

const DECK_ROLE_SUGGESTIONS = [
  'Ramp',
  'Mana source',
  'Fixing',
  'Draw',
  'Removal',
  'Board wipe',
  'Stack interaction',
  'Protection',
  'Recursion',
  'Tutor',
  'Finisher',
  'Enabler',
  'Payoff',
  'Synergy',
  'Utility',
  'Threat',
  'Land',
  'Commander',
  'Sideboard tech'
];

interface DeckCardPreviewOverlayProps {
  deck: DeckState;
  entry: DeckState['entries'][number];
  entryIndex: number;
  onUpdateEntry: (index: number, patch: Partial<DeckEntry>) => void;
  onRemoveEntry: (index: number) => void;
  onOpenCard: (setCode: string, cardId: string, variantId?: string) => Promise<void> | void;
  onStatus: (message: string) => void;
  onClose: () => void;
}

export function DeckCardPreviewOverlay({ deck, entry, entryIndex, onUpdateEntry, onRemoveEntry, onOpenCard, onStatus, onClose }: DeckCardPreviewOverlayProps) {
  const [project, setProject] = useState<EditorProject | null>(null);
  const [loading, setLoading] = useState(false);
  const cardName = entry.card?.name ?? entry.nameSnapshot ?? entry.cardId;

  useEffect(() => {
    let mounted = true;
    if (entry.card?.source === 'collection') {
      setProject(null);
      setLoading(false);
      return () => {
        mounted = false;
      };
    }
    setLoading(true);
    void fetchProject(entry.setCode)
      .then((loaded) => {
        if (mounted) {
          setProject(loaded);
        }
      })
      .catch((caught) => {
        setProject(null);
        if (entry.card) {
          onStatus(caught instanceof Error ? caught.message : String(caught));
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [entry.card?.source, entry.setCode, onStatus]);

  const variants = useMemo(() => project?.drafts.filter((draft) => draft.cardId === entry.cardId) ?? [], [entry.cardId, project?.drafts]);
  const selectedDraft = variants.find((draft) => draft.variantId === entry.variantId) ?? variants.find((draft) => draft.variantIsPrimary) ?? variants[0];
  const officialMetadata = metadataFromDeckCard(entry.card);
  const previewSrc = selectedDraft ? draftArtSrc(selectedDraft) : imageUrlForMetadata(officialMetadata, 'large');
  const canOpenInEditor = Boolean(entry.card && entry.card.source !== 'collection');
  const footer = (
    <>
      {canOpenInEditor ? (
        <button
          type="button"
          className="secondary-button icon-label-button"
          onClick={() => {
            void onOpenCard(entry.setCode, entry.cardId, entry.variantId);
            onClose();
          }}
        >
          <Icon name="edit" />
          Edit Card
        </button>
      ) : null}
      <button type="button" className="secondary-button" onClick={() => onUpdateEntry(entryIndex, { starred: !entry.starred })}>
        {entry.starred ? 'Unstar' : 'Star'}
      </button>
      <button type="button" className="primary-button" onClick={onClose}>
        Done
      </button>
    </>
  );

  return (
    <OverlayShell title={cardName} eyebrow="Deck Preview" subtitle={`${deck.metadata.name} - ${entry.count} in ${deckSectionLabel(entry.section)}`} dirty={false} footer={footer} onClose={onClose}>
      <div className="collection-preview-overlay-grid">
        <section className="collection-preview-art">
          {previewSrc ? (
            <img src={previewSrc} alt={`${cardName} preview art`} />
          ) : (
            <div className="tile-art-placeholder large collection-card-mark">
              <span>{cardName.slice(0, 2).toUpperCase()}</span>
            </div>
          )}
          <div className="readonly-line">
            <strong>{selectedDraft ? selectedDraft.variantDisplayName : loading ? 'Loading preview' : 'No local preview'}</strong>
            <span>{selectedDraft ? `${selectedDraft.setCode} ${selectedDraft.collectorNumber}` : entry.warning ?? printLabelForMetadata(officialMetadata)}</span>
          </div>
        </section>

        <section className="collection-preview-details">
          <div className="collection-detail-grid deck-preview-fact-grid">
            <div className="readonly-line">
              <strong>Board</strong>
              <span>{deckSectionLabel(entry.section)}</span>
            </div>
            <div className="readonly-line">
              <strong>Count</strong>
              <span>{entry.count}</span>
            </div>
            <div className="readonly-line">
              <strong>Set</strong>
              <span>{printLabelForMetadata(officialMetadata) || entry.setCode}</span>
            </div>
            <div className="readonly-line">
              <strong>Mana</strong>
              <ManaCostSymbols value={officialMetadata?.manaCost} />
            </div>
            <div className="readonly-line">
              <strong>Mana value</strong>
              <span>{officialMetadata?.manaValue ?? '-'}</span>
            </div>
            <div className="readonly-line">
              <strong>Type</strong>
              <span>{officialMetadata?.typeLine || 'Unresolved'}</span>
            </div>
            <div className="readonly-line">
              <strong>Identity</strong>
              <ColorIdentitySymbols value={officialMetadata?.colorIdentity || officialMetadata?.colors} />
            </div>
          </div>
          <DeckPreviewMetadataTools entry={entry} entryIndex={entryIndex} onUpdateEntry={onUpdateEntry} onRemoveEntry={onRemoveEntry} onClose={onClose} />
          {officialMetadata?.oracleText ? <p className="official-card-text">{officialMetadata.oracleText}</p> : null}
          {officialMetadata?.flavorText ? <p className="official-card-text flavor">{officialMetadata.flavorText}</p> : null}
          {!officialMetadata?.oracleText && !officialMetadata?.flavorText ? (
            <p className="workspace-copy">This deck row is preserved as a collection or imported reference. Link or add it to an authored set before editing it in Maker.</p>
          ) : null}
        </section>
      </div>
    </OverlayShell>
  );
}

function DeckPreviewMetadataTools({
  entry,
  entryIndex,
  onUpdateEntry,
  onRemoveEntry,
  onClose
}: {
  entry: DeckState['entries'][number];
  entryIndex: number;
  onUpdateEntry: (index: number, patch: Partial<DeckEntry>) => void;
  onRemoveEntry: (index: number) => void;
  onClose: () => void;
}) {
  return (
    <section className="deck-preview-metadata-tools" aria-label="Deck entry metadata">
      <div className="grid-2">
        <Field label="Status">
          <select value={entry.candidateStatus ?? 'active'} onChange={(event) => onUpdateEntry(entryIndex, { candidateStatus: event.target.value as DeckEntry['candidateStatus'] })}>
            <option value="active">Active</option>
            <option value="candidate">Candidate</option>
            <option value="testing">Testing</option>
            <option value="locked">Locked</option>
            <option value="cut">Cut</option>
          </select>
        </Field>
        <Field label="Board">
          <select value={entry.section} onChange={(event) => onUpdateEntry(entryIndex, { section: event.target.value as DeckEntry['section'] })}>
            <option value="main">Main</option>
            <option value="side">Sideboard</option>
            <option value="maybe">Maybeboard</option>
          </select>
        </Field>
      </div>
      <Field label="Roles">
        <TagEditor value={entry.roles ?? []} suggestions={DECK_ROLE_SUGGESTIONS} placeholder="Ramp, Draw, Removal..." ariaLabel="Preview deck entry roles" onChange={(roles) => onUpdateEntry(entryIndex, { roles, roleSource: 'manual', roleConfidence: 1 })} />
      </Field>
      <div className="grid-3 compact-filter-grid">
        <Field label="Impact">
          <input type="number" min="0" max="5" value={entry.impactRating ?? 0} onChange={(event) => onUpdateEntry(entryIndex, { impactRating: ratingValue(event.target.value) })} />
        </Field>
        <Field label="Synergy">
          <input type="number" min="0" max="5" value={entry.synergyRating ?? 0} onChange={(event) => onUpdateEntry(entryIndex, { synergyRating: ratingValue(event.target.value) })} />
        </Field>
        <Field label="Quality">
          <input type="number" min="0" max="5" value={entry.qualityRating ?? 0} onChange={(event) => onUpdateEntry(entryIndex, { qualityRating: ratingValue(event.target.value) })} />
        </Field>
      </div>
      <Field label="Flags">
        <TagEditor value={entry.flags ?? []} suggestions={['off-plan', 'needs testing', 'too slow', 'budget cut', 'upgrade target']} placeholder="off-plan, needs testing..." ariaLabel="Preview deck entry flags" onChange={(flags) => onUpdateEntry(entryIndex, { flags })} />
      </Field>
      <Field label="Notes">
        <textarea value={entry.entryNotes ?? ''} rows={3} onChange={(event) => onUpdateEntry(entryIndex, { entryNotes: event.target.value || undefined })} />
      </Field>
      <div className="export-actions">
        <button type="button" className="secondary-button" onClick={() => onUpdateEntry(entryIndex, { markedForDeletion: !entry.markedForDeletion, candidateStatus: entry.markedForDeletion ? entry.candidateStatus : 'cut' })}>
          {entry.markedForDeletion ? 'Keep' : 'Mark delete'}
        </button>
        <button type="button" className="secondary-button danger" onClick={() => { onRemoveEntry(entryIndex); onClose(); }}>
          Delete row
        </button>
      </div>
    </section>
  );
}

function deckSectionLabel(section: DeckState['entries'][number]['section']): string {
  if (section === 'side') {
    return 'Sideboard';
  }
  if (section === 'maybe') {
    return 'Maybeboard';
  }
  return 'Main board';
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

function ratingValue(value: string): number {
  return Math.max(0, Math.min(5, Number(value) || 0));
}

import type { CardDraft } from '../../domain/editorTypes.js';

export type SetViewMode = 'grid' | 'list' | 'single';

interface SetCardViewsProps {
  mode: SetViewMode;
  drafts: CardDraft[];
  selectedCardId: string;
  emptyText: string;
  onSelectCard: (cardId: string) => void;
  onEdit: (cardId: string) => void;
  onView: (cardId: string) => void;
}

export function SetCardViews({ mode, drafts, selectedCardId, emptyText, onSelectCard, onEdit, onView }: SetCardViewsProps) {
  if (!drafts.length) {
    return (
      <div className="preview-empty">
        <strong>No cards shown</strong>
        <span>{emptyText}</span>
      </div>
    );
  }
  if (mode === 'single') {
    const selectedDraft = drafts.find((draft) => draft.cardId === selectedCardId) ?? drafts[0];
    return (
      <div className="set-single-view">
        <div className="set-single-list" role="listbox" aria-label="Set cards">
          {drafts.map((draft) => (
            <button key={`${draft.cardId}-${draft.variantId}`} type="button" className={selectedDraft.cardId === draft.cardId ? 'selected' : ''} onClick={() => onSelectCard(draft.cardId)}>
              <strong>{draft.collectorNumber} {draft.name}</strong>
              <span>{draft.typeLine || 'Untyped card'}</span>
            </button>
          ))}
        </div>
        <article className="set-single-card">
          {draftArtSrc(selectedDraft) ? <img src={draftArtSrc(selectedDraft)} alt="" /> : <span className="tile-art-placeholder large">{selectedDraft.collectorNumber}</span>}
          <div>
            <h3>{selectedDraft.name}</h3>
            <p className="workspace-copy">{selectedDraft.typeLine || 'Untyped card'}</p>
            <dl className="collection-single-metadata">
              <div>
                <dt>Collector</dt>
                <dd>{selectedDraft.collectorNumber || '-'}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{selectedDraft.status || selectedDraft.creationStatus || '-'}</dd>
              </div>
              <div>
                <dt>Variant</dt>
                <dd>{selectedDraft.variantDisplayName || selectedDraft.variantId || '-'}</dd>
              </div>
            </dl>
            <div className="export-actions">
              <button type="button" className="primary-button" onClick={() => onEdit(selectedDraft.cardId)}>
                Edit
              </button>
              <button type="button" className="secondary-button" onClick={() => onView(selectedDraft.cardId)}>
                Preview
              </button>
            </div>
          </div>
        </article>
      </div>
    );
  }
  if (mode === 'list') {
    return (
      <div className="set-card-list">
        {drafts.map((draft) => (
          <button key={`${draft.cardId}-${draft.variantId}`} type="button" className={`set-card-row ${selectedCardId === draft.cardId ? 'selected' : ''}`} onClick={() => onSelectCard(draft.cardId)} onDoubleClick={() => onEdit(draft.cardId)}>
            <span className="set-card-number">{draft.collectorNumber || '-'}</span>
            <span>
              <strong>{draft.name}</strong>
              <small>{draft.typeLine || 'Untyped card'}</small>
            </span>
            <small>{draft.status || draft.creationStatus || '-'}</small>
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className="card-image-grid">
      {drafts.map((draft) => (
        <button
          key={`${draft.cardId}-${draft.variantId}`}
          type="button"
          className={`card-image-tile ${selectedCardId === draft.cardId ? 'selected' : ''}`}
          onClick={() => onEdit(draft.cardId)}
          onDoubleClick={(event) => {
            event.preventDefault();
            onView(draft.cardId);
          }}
        >
          {draftArtSrc(draft) ? <img src={draftArtSrc(draft)} alt="" /> : <span className="tile-art-placeholder">{draft.collectorNumber}</span>}
          <span className="tile-copy">
            <strong>{draft.collectorNumber} {draft.name}</strong>
            <small>{draft.typeLine || 'Untyped card'}</small>
          </span>
        </button>
      ))}
    </div>
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

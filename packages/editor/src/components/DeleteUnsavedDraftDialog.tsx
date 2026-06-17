import type { CardDraft } from '../domain/editorTypes.js';

interface DeleteUnsavedDraftDialogProps {
  draft: CardDraft;
  onDelete: () => void;
  onCancel: () => void;
}

export function DeleteUnsavedDraftDialog({ draft, onDelete, onCancel }: DeleteUnsavedDraftDialogProps) {
  return (
    <div className="workspace-lightbox" role="dialog" aria-modal="true" aria-label="Delete unsaved draft">
      <div className="workspace-lightbox-panel unsaved-tab-dialog">
        <div className="dialog-header">
          <div>
            <span className="dialog-eyebrow">Delete Unsaved Draft</span>
            <h2>Delete {draft.collectorNumber} {draft.name}?</h2>
            <p>This removes the session-only draft. Saved cards and CSV files will not be changed.</p>
          </div>
        </div>
        <div className="unsaved-tab-summary">
          <strong>{draft.variantDisplayName}</strong>
          <span>{draft.typeLine}</span>
        </div>
        <div className="create-overlay-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="secondary-button danger" onClick={onDelete}>
            Delete Draft
          </button>
        </div>
      </div>
    </div>
  );
}

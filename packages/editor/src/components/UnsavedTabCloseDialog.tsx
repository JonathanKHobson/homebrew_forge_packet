import type { CardDraft } from '../domain/editorTypes.js';

interface UnsavedTabCloseDialogProps {
  draft: CardDraft;
  saving: boolean;
  onSave: () => void;
  onSaveAsVariant: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export function UnsavedTabCloseDialog({ draft, saving, onSave, onSaveAsVariant, onDiscard, onCancel }: UnsavedTabCloseDialogProps) {
  return (
    <div className="workspace-lightbox" role="dialog" aria-modal="true" aria-label="Unsaved card changes">
      <div className="workspace-lightbox-panel unsaved-tab-dialog">
        <div className="dialog-header">
          <div>
            <span className="dialog-eyebrow">Unsaved Changes</span>
            <h2>Close {draft.collectorNumber} {draft.name}?</h2>
            <p>These edits are only in this session until you save them.</p>
          </div>
        </div>
        <div className="unsaved-tab-summary">
          <strong>{draft.variantDisplayName}</strong>
          <span>{draft.typeLine}</span>
        </div>
        <div className="create-overlay-actions">
          <button type="button" className="secondary-button" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="secondary-button danger" onClick={onDiscard} disabled={saving}>
            Do Not Save
          </button>
          <button type="button" className="secondary-button" onClick={onSaveAsVariant} disabled={saving}>
            Save as Variant
          </button>
          <button type="button" className="primary-button" onClick={onSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

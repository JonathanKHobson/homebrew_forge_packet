interface DirtyCloseConfirmProps {
  onCancel: () => void;
  onDiscard: () => void;
}

export function DirtyCloseConfirm({ onCancel, onDiscard }: DirtyCloseConfirmProps) {
  return (
    <div className="dirty-close-confirm" role="alert">
      <span>Discard unsaved changes?</span>
      <button type="button" className="secondary-button" onClick={onCancel}>
        Keep editing
      </button>
      <button type="button" className="secondary-button danger" onClick={onDiscard}>
        Discard
      </button>
    </div>
  );
}

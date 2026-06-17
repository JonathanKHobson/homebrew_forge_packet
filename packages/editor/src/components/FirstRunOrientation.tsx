import { formatCount } from '../domain/uiText.js';

interface FirstRunOrientationProps {
  activeProjectName: string;
  activeSetCode: string;
  cardCount: number;
  showDismiss?: boolean;
  onDismiss: () => void;
  onCreateCard: () => void;
  onCreateSet: () => void;
  onImport: () => void;
}

export function FirstRunOrientation({
  activeProjectName,
  activeSetCode,
  cardCount,
  showDismiss = true,
  onDismiss,
  onCreateCard,
  onCreateSet,
  onImport
}: FirstRunOrientationProps) {
  const projectLabel = activeProjectName || 'No project selected';
  const setLabel = activeSetCode || 'No set loaded';
  const primaryAction = activeSetCode
    ? { label: 'Create Card', onClick: onCreateCard, disabled: false }
    : { label: 'Create Set', onClick: onCreateSet, disabled: false };

  return (
    <section className="maker-orientation" aria-label="Maker workspace overview">
      <div className="maker-orientation-copy">
        <span>Start here</span>
        <strong>Homebrew Forge</strong>
        <small>File-backed cards, variants, decks, collections, and exports.</small>
      </div>
      <div className="maker-orientation-context" aria-label="Current Maker workspace context">
        <span>
          <strong>Project</strong>
          {projectLabel}
        </span>
        <span>
          <strong>Set</strong>
          {setLabel}
        </span>
        <span>
          <strong>Cards</strong>
          {formatCount(cardCount, 'card')}
        </span>
      </div>
      <div className="maker-orientation-actions">
        <button type="button" className="primary-button" onClick={primaryAction.onClick} disabled={primaryAction.disabled}>
          {primaryAction.label}
        </button>
        <button type="button" className="secondary-button" onClick={onImport}>
          Import
        </button>
        {showDismiss ? (
          <button type="button" className="secondary-button" onClick={onDismiss}>
            Dismiss
          </button>
        ) : null}
      </div>
    </section>
  );
}

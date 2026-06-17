import { useEffect, useRef } from 'react';
import { Icon } from './Icon.js';

interface ImageLightboxProps {
  src: string;
  alt: string;
  label: string;
  loading?: boolean;
  status?: string;
  cardOptions?: Array<{ id: string; label: string }>;
  selectedCardId?: string;
  onCardSelect?: (cardId: string) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onClose: () => void;
}

export function ImageLightbox({ src, alt, label, loading = false, status, cardOptions = [], selectedCardId = '', onCardSelect, onPrevious, onNext, onClose }: ImageLightboxProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const showCardPicker = cardOptions.length > 0 && Boolean(onCardSelect);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key === 'ArrowLeft' && onPrevious) {
        event.preventDefault();
        onPrevious();
        return;
      }
      if (event.key === 'ArrowRight' && onNext) {
        event.preventDefault();
        onNext();
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      previousFocus?.focus();
    };
  }, [onClose, onNext, onPrevious]);

  return (
    <div
      className="workspace-lightbox image-only-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="image-lightbox-panel"
        ref={panelRef}
        tabIndex={-1}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
      >
        {showCardPicker ? (
          <label className="image-lightbox-card-picker">
            <span>Card</span>
            <select value={selectedCardId} onChange={(event) => onCardSelect?.(event.target.value)}>
              {cardOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button type="button" className="image-lightbox-close" onClick={onClose} title="Close" aria-label="Close image preview">
          <Icon name="close" />
        </button>
        {onPrevious ? (
          <button type="button" className="image-lightbox-nav previous" onClick={onPrevious} title="Previous card" aria-label="Previous card preview">
            <Icon name="collapseLeft" />
          </button>
        ) : null}
        {onNext ? (
          <button type="button" className="image-lightbox-nav next" onClick={onNext} title="Next card" aria-label="Next card preview">
            <Icon name="collapseRight" />
          </button>
        ) : null}
        {src ? <img className={loading ? 'loading' : ''} src={src} alt={alt} /> : <div className="image-lightbox-empty">Preview unavailable.</div>}
        {loading || status ? (
          <div className="image-lightbox-status" aria-live="polite">
            {loading ? <span className="preview-loading-spinner compact" aria-hidden="true" /> : null}
            <strong>{status ?? 'Rendering preview'}</strong>
          </div>
        ) : null}
      </div>
    </div>
  );
}

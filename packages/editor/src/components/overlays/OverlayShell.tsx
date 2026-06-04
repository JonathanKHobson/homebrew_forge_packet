import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../Icon.js';
import { DirtyCloseConfirm } from './DirtyCloseConfirm.js';

interface OverlayShellProps {
  title: string;
  eyebrow: string;
  subtitle?: string;
  dirty: boolean;
  children: ReactNode;
  footer: ReactNode | ((requestClose: () => void) => ReactNode);
  onClose: () => void;
}

export function OverlayShell({ title, eyebrow, subtitle, dirty, children, footer, onClose }: OverlayShellProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [confirmClose, setConfirmClose] = useState(false);

  const requestClose = () => {
    if (dirty) {
      setConfirmClose(true);
      return;
    }
    onClose();
  };

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        requestClose();
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  });

  return (
    <div
      className="workspace-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          requestClose();
        }
      }}
    >
      <div className="workspace-lightbox-panel create-overlay-panel" ref={panelRef} tabIndex={-1}>
        <div className="dialog-header">
          <div>
            <span className="dialog-eyebrow">{eyebrow}</span>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" className="icon-button" title="Close" onClick={requestClose}>
            <Icon name="close" />
          </button>
        </div>
        <div className="create-overlay-body">{children}</div>
        <div className="create-overlay-footer">
          {confirmClose ? <DirtyCloseConfirm onCancel={() => setConfirmClose(false)} onDiscard={onClose} /> : null}
          <div className="create-overlay-actions">{typeof footer === 'function' ? footer(requestClose) : footer}</div>
        </div>
      </div>
    </div>
  );
}

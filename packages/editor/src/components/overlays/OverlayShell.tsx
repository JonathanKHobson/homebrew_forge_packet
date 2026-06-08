import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { IconButton } from '../forge-ui/index.js';
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
  const titleId = useId();
  const subtitleId = useId();
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

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      requestClose();
      return;
    }
    if (event.key !== 'Tab') {
      return;
    }
    const focusable = focusableElements(panelRef.current);
    if (!focusable.length) {
      event.preventDefault();
      panelRef.current?.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const current = document.activeElement;
    if (event.shiftKey && current === first) {
      event.preventDefault();
      last.focus();
      return;
    }
    if (!event.shiftKey && current === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="workspace-lightbox forge-dialog-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={subtitle ? subtitleId : undefined}
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          requestClose();
        }
      }}
    >
      <div className="workspace-lightbox-panel create-overlay-panel forge-dialog-panel" ref={panelRef} tabIndex={-1} data-dirty={dirty ? 'true' : undefined}>
        <div className="dialog-header forge-dialog-header">
          <div>
            <span className="dialog-eyebrow">{eyebrow}</span>
            <h2 id={titleId}>{title}</h2>
            {subtitle ? <p id={subtitleId}>{subtitle}</p> : null}
          </div>
          <IconButton label={`Close ${title}`} icon={<Icon name="close" />} onClick={requestClose} />
        </div>
        <div className="create-overlay-body forge-dialog-body">{children}</div>
        <div className="create-overlay-footer forge-dialog-footer">
          {confirmClose ? <DirtyCloseConfirm onCancel={() => setConfirmClose(false)} onDiscard={onClose} /> : null}
          <div className="create-overlay-actions">{typeof footer === 'function' ? footer(requestClose) : footer}</div>
        </div>
      </div>
    </div>
  );
}

function focusableElements(root: HTMLElement | null): HTMLElement[] {
  if (!root) {
    return [];
  }
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => !element.hasAttribute('hidden') && element.offsetParent !== null);
}

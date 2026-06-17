import type { ReactNode } from 'react';
import { cx } from './utils.js';

interface WorkspaceHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function WorkspaceHeader({ eyebrow, title, subtitle, meta, actions, className }: WorkspaceHeaderProps) {
  return (
    <header className={cx('forge-workspace-header', className)}>
      <div className="forge-workspace-header-copy">
        {eyebrow ? <span className="dialog-eyebrow">{eyebrow}</span> : null}
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {meta ? <div className="forge-workspace-header-meta">{meta}</div> : null}
      {actions ? <div className="forge-workspace-header-actions">{actions}</div> : null}
    </header>
  );
}

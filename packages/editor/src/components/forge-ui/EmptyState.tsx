import type { ReactNode } from 'react';
import { cx } from './utils.js';

interface EmptyStateProps {
  title: string;
  detail?: string;
  actions?: ReactNode;
  compact?: boolean;
  className?: string;
}

export function EmptyState({ title, detail, actions, compact = false, className }: EmptyStateProps) {
  return (
    <div className={cx('empty-list forge-empty-state', compact && 'compact-empty', className)}>
      <strong>{title}</strong>
      {detail ? <span>{detail}</span> : null}
      {actions ? <div className="empty-actions">{actions}</div> : null}
    </div>
  );
}

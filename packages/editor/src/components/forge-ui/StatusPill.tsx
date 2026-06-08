import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from './utils.js';

export type StatusPillTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'dirty' | 'local' | 'synced';

interface StatusPillProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: StatusPillTone;
  icon?: ReactNode;
}

export function StatusPill({ tone = 'neutral', icon, className, children, ...props }: StatusPillProps) {
  return (
    <span className={cx('forge-status-pill', `tone-${tone}`, className)} {...props}>
      {icon ? <span className="forge-status-pill-icon" aria-hidden="true">{icon}</span> : null}
      {children}
    </span>
  );
}

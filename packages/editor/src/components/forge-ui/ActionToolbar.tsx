import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from './utils.js';

interface ActionToolbarProps extends HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'end' | 'between';
  compact?: boolean;
  children: ReactNode;
}

export function ActionToolbar({ align = 'start', compact = false, className, children, ...props }: ActionToolbarProps) {
  return (
    <div className={cx('forge-action-toolbar', `align-${align}`, compact && 'compact', className)} {...props}>
      {children}
    </div>
  );
}

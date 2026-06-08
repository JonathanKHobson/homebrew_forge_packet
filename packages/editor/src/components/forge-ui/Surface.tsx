import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from './utils.js';

type SurfaceElement = 'div' | 'section' | 'article' | 'aside';
type SurfaceTone = 'panel' | 'elevated' | 'inset' | 'warning' | 'danger' | 'success' | 'info';

interface SurfaceProps extends HTMLAttributes<HTMLElement> {
  as?: SurfaceElement;
  tone?: SurfaceTone;
  compact?: boolean;
  children: ReactNode;
}

export function Surface({ as: Element = 'section', tone = 'panel', compact = false, className, children, ...props }: SurfaceProps) {
  return (
    <Element className={cx('forge-surface', `tone-${tone}`, compact && 'compact', className)} {...props}>
      {children}
    </Element>
  );
}

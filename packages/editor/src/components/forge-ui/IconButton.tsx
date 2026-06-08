import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from './utils.js';

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label: string;
  icon: ReactNode;
  compact?: boolean;
}

export function IconButton({ label, icon, compact = false, className, ...props }: IconButtonProps) {
  return (
    <button type="button" className={cx('icon-button forge-icon-button', compact && 'compact', className)} aria-label={label} title={props.title ?? label} {...props}>
      {icon}
    </button>
  );
}

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from './utils.js';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  compact?: boolean;
  icon?: ReactNode;
}

export function Button({ variant = 'secondary', compact = false, icon, className, children, ...props }: ButtonProps) {
  const legacyClass =
    variant === 'primary' ? 'primary-button' :
    variant === 'danger' ? 'secondary-button danger' :
    variant === 'ghost' ? 'forge-button-ghost' :
    'secondary-button';

  return (
    <button type="button" className={cx('forge-button', legacyClass, compact && 'compact', icon ? 'icon-label-button' : false, className)} {...props}>
      {icon ? <span className="forge-button-icon" aria-hidden="true">{icon}</span> : null}
      {children}
    </button>
  );
}

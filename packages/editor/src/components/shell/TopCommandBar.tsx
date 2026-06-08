import type { ReactNode } from 'react';

interface TopCommandBarProps {
  children: ReactNode;
  visible: boolean;
}

export function TopCommandBar({ children, visible }: TopCommandBarProps) {
  if (!visible) {
    return null;
  }
  return <>{children}</>;
}

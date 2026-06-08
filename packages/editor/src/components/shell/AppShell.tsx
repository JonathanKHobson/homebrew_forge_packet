import type { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
  overlays?: ReactNode;
  runtimeStatus?: ReactNode;
  statusBar?: ReactNode;
  topCommandBar?: ReactNode;
}

export function AppShell({ children, overlays, runtimeStatus, statusBar, topCommandBar }: AppShellProps) {
  return (
    <main className="editor-shell">
      {topCommandBar}
      {runtimeStatus}
      {children}
      {statusBar}
      {overlays}
    </main>
  );
}

import type { ReactNode } from 'react';
import { cx } from './utils.js';

interface DataTableShellProps {
  label: string;
  summary?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  empty?: ReactNode;
  className?: string;
}

export function DataTableShell({ label, summary, toolbar, children, empty, className }: DataTableShellProps) {
  return (
    <section className={cx('forge-data-table-shell', className)} aria-label={label}>
      {summary || toolbar ? (
        <header className="forge-data-table-shell-header">
          <div>{summary}</div>
          {toolbar ? <div className="forge-data-table-shell-toolbar">{toolbar}</div> : null}
        </header>
      ) : null}
      <div className="forge-data-table-shell-body">{children || empty}</div>
    </section>
  );
}

import type { ReactNode } from 'react';
import { cx } from './utils.js';

interface InspectorPanelProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function InspectorPanel({ title, subtitle, actions, children, className }: InspectorPanelProps) {
  return (
    <section className={cx('forge-inspector-panel', className)}>
      {title || subtitle || actions ? (
        <header className="forge-inspector-panel-header">
          <div>
            {title ? <h3>{title}</h3> : null}
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {actions ? <div className="forge-inspector-panel-actions">{actions}</div> : null}
        </header>
      ) : null}
      <div className="forge-inspector-panel-body">{children}</div>
    </section>
  );
}

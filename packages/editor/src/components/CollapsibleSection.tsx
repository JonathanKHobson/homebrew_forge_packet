import { useState, type ReactNode } from 'react';

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  compact?: boolean;
  className?: string;
  children: ReactNode;
}

export function CollapsibleSection({ title, subtitle, defaultOpen = true, compact = false, className = '', children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`form-section ${compact ? 'compact' : ''} ${className}`.trim()}>
      <button type="button" className="section-toggle" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span>
          <strong>{title}</strong>
          {subtitle ? <small>{subtitle}</small> : null}
        </span>
        <span className="chevron">{open ? '-' : '+'}</span>
      </button>
      {open ? <div className="section-body">{children}</div> : null}
    </section>
  );
}

import { StatusPill, type StatusPillTone } from './StatusPill.js';
import { cx } from './utils.js';

export interface ValidationSummaryItem {
  id: string;
  label: string;
  detail?: string;
  tone?: StatusPillTone;
}

interface ValidationSummaryProps {
  title: string;
  items: ValidationSummaryItem[];
  emptyLabel?: string;
  className?: string;
}

export function ValidationSummary({ title, items, emptyLabel = 'No validation issues.', className }: ValidationSummaryProps) {
  return (
    <section className={cx('forge-validation-summary', className)}>
      <header>
        <h3>{title}</h3>
        <StatusPill tone={items.length ? 'warning' : 'success'}>
          {items.length ? `${items.length} issue${items.length === 1 ? '' : 's'}` : 'Clear'}
        </StatusPill>
      </header>
      {items.length ? (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <StatusPill tone={item.tone ?? 'warning'}>{item.label}</StatusPill>
              {item.detail ? <span>{item.detail}</span> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p>{emptyLabel}</p>
      )}
    </section>
  );
}

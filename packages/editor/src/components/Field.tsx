import { cloneElement, isValidElement, useId, type ReactNode } from 'react';

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

type FieldControlProps = {
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
};

export function Field({ label, hint, error, children }: FieldProps) {
  const generatedId = useId();
  const childId = isValidElement<FieldControlProps>(children) ? (children.props.id ?? generatedId) : generatedId;
  const hintId = hint ? `${childId}-hint` : undefined;
  const errorId = error ? `${childId}-error` : undefined;
  const describedBy = [isValidElement<FieldControlProps>(children) ? children.props['aria-describedby'] : undefined, hintId, errorId].filter(Boolean).join(' ') || undefined;
  const control = isValidElement<FieldControlProps>(children) ? cloneElement(children, { id: childId, 'aria-describedby': describedBy, 'aria-invalid': Boolean(error) || undefined }) : children;
  return (
    <div className="field">
      <label htmlFor={childId}>
        {label}
        {hint ? <small id={hintId}>{hint}</small> : null}
      </label>
      {control}
      {error ? (
        <small className="field-error" id={errorId}>
          {error}
        </small>
      ) : null}
    </div>
  );
}

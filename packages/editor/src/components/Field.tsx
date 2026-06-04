import { cloneElement, isValidElement, useId, type ReactNode } from 'react';

interface FieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, hint, children }: FieldProps) {
  const generatedId = useId();
  const childId = isValidElement<{ id?: string }>(children) ? (children.props.id ?? generatedId) : generatedId;
  const control = isValidElement<{ id?: string }>(children) ? cloneElement(children, { id: childId }) : children;
  return (
    <div className="field">
      <label htmlFor={childId}>
        {label}
        {hint ? <small>{hint}</small> : null}
      </label>
      {control}
    </div>
  );
}

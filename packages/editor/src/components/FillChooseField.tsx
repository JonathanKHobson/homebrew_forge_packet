import { useId, useMemo, useState } from 'react';
import { Field } from './Field.js';

interface FillChooseFieldProps {
  label: string;
  hint?: string;
  value: string;
  options: readonly string[];
  placeholder?: string;
  onChange: (value: string) => void;
}

export function FillChooseField({ label, hint = 'fill or choose', value, options, placeholder, onChange }: FillChooseFieldProps) {
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [filterEnabled, setFilterEnabled] = useState(false);
  const filteredOptions = useMemo(() => {
    const needle = filterEnabled ? value.trim().toLowerCase() : '';
    if (!needle) {
      return options;
    }
    return options.filter((option) => option.toLowerCase().includes(needle));
  }, [filterEnabled, options, value]);

  return (
    <div className="fill-choose">
      <Field label={label} hint={hint}>
        <input
          id={inputId}
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          onFocus={() => {
            setOpen(true);
            setFilterEnabled(false);
          }}
          onClick={() => {
            setOpen(true);
            setFilterEnabled(false);
          }}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onChange={(event) => {
            setFilterEnabled(true);
            setOpen(true);
            onChange(event.target.value);
          }}
        />
      </Field>
      {open ? (
        <div className="fill-choose-menu" role="listbox" aria-label={`${label} options`}>
          {filteredOptions.length ? (
            filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                role="option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                  setFilterEnabled(false);
                }}
              >
                {option}
              </button>
            ))
          ) : (
            <span>No matches</span>
          )}
        </div>
      ) : null}
    </div>
  );
}

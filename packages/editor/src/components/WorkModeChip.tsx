import { useEffect, useRef, useState } from 'react';
import { WORK_MODE_DEFINITIONS, type WorkModeDefinition, type WorkModeId } from '../domain/workModes.js';

interface WorkModeChipProps {
  mode: WorkModeDefinition;
  onChange: (mode: WorkModeId) => void;
}

export function WorkModeChip({ mode, onChange }: WorkModeChipProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const closeIfOutside = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeIfOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeIfOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const handleChange = (modeId: WorkModeId) => {
    setOpen(false);
    onChange(modeId);
  };

  return (
    <div className="work-mode-switcher" ref={rootRef}>
      <button
        type="button"
        className={`work-mode-chip ${open ? 'open' : ''}`}
        aria-label={`Current work mode: ${mode.label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? 'work-mode-switcher-menu' : undefined}
        title={mode.description}
        onClick={() => setOpen((value) => !value)}
      >
        <span>Work Mode</span>
        <strong>{mode.label}</strong>
        <b className="work-mode-caret" aria-hidden="true">v</b>
      </button>
      {open ? (
        <div id="work-mode-switcher-menu" className="work-mode-switcher-menu" role="menu" aria-label="Switch work mode">
          {WORK_MODE_DEFINITIONS.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              role="menuitemradio"
              aria-checked={candidate.id === mode.id}
              className={`work-mode-option ${candidate.id === mode.id ? 'active' : ''}`}
              title={candidate.description}
              onClick={() => handleChange(candidate.id)}
            >
              <strong>{candidate.label}</strong>
              <span>{candidate.railHint}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

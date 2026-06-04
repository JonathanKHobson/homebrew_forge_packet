import { useMemo } from 'react';
import type { LibraryState } from '../domain/editorTypes.js';

interface LibraryBarProps {
  library: LibraryState | null;
  selectedUniverseId: string;
  selectedSetCode: string;
  onUniverseChange: (universeId: string) => void;
  onSetChange: (setCode: string) => void;
}

export function LibraryBar({
  library,
  selectedUniverseId,
  selectedSetCode,
  onUniverseChange,
  onSetChange
}: LibraryBarProps) {
  const setsInUniverse = useMemo(() => {
    if (!library) {
      return [];
    }
    return library.sets.filter((set) => set.universeId === selectedUniverseId);
  }, [library, selectedUniverseId]);

  return (
    <div className="library-bar">
      <div className="library-selects">
        <label>
          <span>Project</span>
          <select value={selectedUniverseId} disabled={!library} onChange={(event) => onUniverseChange(event.target.value)}>
            {(library?.universes ?? []).map((universe) => (
              <option key={universe.id} value={universe.id}>
                {universe.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Set</span>
          <select value={selectedSetCode} disabled={!library || setsInUniverse.length === 0} onChange={(event) => onSetChange(event.target.value)}>
            {setsInUniverse.map((set) => (
              <option key={set.setCode} value={set.setCode}>
                {set.setCode} - {set.setName}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

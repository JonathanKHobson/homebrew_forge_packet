import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { splitTagInput } from '../domain/filterTypes.js';

interface TagEditorProps {
  value: string[];
  suggestions?: string[];
  placeholder?: string;
  ariaLabel: string;
  onChange: (tags: string[]) => void;
}

const MAX_VISIBLE_SUGGESTIONS = 6;

export function TagEditor({ value, suggestions = [], placeholder, ariaLabel, onChange }: TagEditorProps) {
  const listboxId = useId();
  const [inputValue, setInputValue] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const normalizedValue = useMemo(() => splitTagInput(value), [value]);
  const visibleSuggestions = useMemo(() => {
    const query = normalizeTag(inputValue);
    const selectedKeys = new Set(normalizedValue.map((tag) => normalizeTag(tag)));
    return splitTagInput(suggestions)
      .filter((tag) => !selectedKeys.has(normalizeTag(tag)))
      .filter((tag) => !query || normalizeTag(tag).includes(query))
      .sort((first, second) => sortTags(first, second, query))
      .slice(0, MAX_VISIBLE_SUGGESTIONS);
  }, [inputValue, normalizedValue, suggestions]);
  const listboxOpen = Boolean(inputValue.trim() && visibleSuggestions.length);
  const activeSuggestion = visibleSuggestions[Math.min(activeIndex, Math.max(visibleSuggestions.length - 1, 0))];

  function applyTags(nextTags: string[]) {
    onChange(splitTagInput([...normalizedValue, ...nextTags]));
    setInputValue('');
    setActiveIndex(0);
  }

  function removeTag(tagToRemove: string) {
    const removeKey = normalizeTag(tagToRemove);
    onChange(normalizedValue.filter((tag) => normalizeTag(tag) !== removeKey));
  }

  function commitInput(useSuggestion: boolean) {
    const nextTag = useSuggestion && activeSuggestion ? activeSuggestion : inputValue;
    if (!nextTag.trim()) {
      return;
    }
    applyTags(splitTagInput(nextTag));
  }

  function handleInputChange(nextValue: string) {
    if (/[,;\n]/.test(nextValue)) {
      const parts = nextValue.split(/[,;\n]+/);
      const trailing = parts.pop() ?? '';
      const completed = splitTagInput(parts);
      if (completed.length) {
        onChange(splitTagInput([...normalizedValue, ...completed]));
      }
      setInputValue(trailing);
      setActiveIndex(0);
      return;
    }
    setInputValue(nextValue);
    setActiveIndex(0);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitInput(true);
      return;
    }
    if (event.key === ',' || event.key === ';') {
      event.preventDefault();
      commitInput(false);
      return;
    }
    if (event.key === 'ArrowDown' && visibleSuggestions.length) {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, visibleSuggestions.length - 1));
      return;
    }
    if (event.key === 'ArrowUp' && visibleSuggestions.length) {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === 'Backspace' && !inputValue && normalizedValue.length) {
      event.preventDefault();
      onChange(normalizedValue.slice(0, -1));
    }
  }

  return (
    <div className="tag-editor">
      <div className="tag-chip-input">
        {normalizedValue.map((tag) => (
          <button key={tag} type="button" className="tag-chip" onClick={() => removeTag(tag)} title={`Remove ${tag}`}>
            <span>{tag}</span>
            <strong aria-hidden="true">x</strong>
          </button>
        ))}
        <input
          value={inputValue}
          placeholder={normalizedValue.length ? '' : placeholder}
          aria-label={ariaLabel}
          aria-autocomplete="list"
          aria-controls={listboxOpen ? listboxId : undefined}
          aria-expanded={listboxOpen}
          aria-activedescendant={listboxOpen && activeSuggestion ? `${listboxId}-${normalizeTag(activeSuggestion)}` : undefined}
          onBlur={() => commitInput(false)}
          onChange={(event) => handleInputChange(event.currentTarget.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      {listboxOpen ? (
        <div id={listboxId} className="tag-suggest-menu" role="listbox" aria-label={`${ariaLabel} suggestions`}>
          {visibleSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              id={`${listboxId}-${normalizeTag(suggestion)}`}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className={index === activeIndex ? 'active' : ''}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => applyTags([suggestion])}
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function normalizeTag(value: string): string {
  return value.trim().toLowerCase();
}

function sortTags(first: string, second: string, query: string): number {
  const firstKey = normalizeTag(first);
  const secondKey = normalizeTag(second);
  if (query) {
    const firstStarts = firstKey.startsWith(query);
    const secondStarts = secondKey.startsWith(query);
    if (firstStarts !== secondStarts) {
      return firstStarts ? -1 : 1;
    }
  }
  return firstKey.localeCompare(secondKey);
}

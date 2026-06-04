import { useCallback, useMemo, useRef, type ChangeEventHandler, type FocusEventHandler, type KeyboardEventHandler, type MouseEventHandler, type ReactEventHandler } from 'react';
import type { ExtractedReferenceLink, ReferenceLinkField } from '@homebrew-forge/forge/reference';
import { linkKey, type LinkedTextSelection } from '../domain/rulesTextReferenceActions.js';

interface LinkedTextAreaProps {
  value: string;
  rows: number;
  links: ExtractedReferenceLink[];
  sourceField: ReferenceLinkField;
  activeLink?: ExtractedReferenceLink | null;
  ariaLabel?: string;
  onBlur?: FocusEventHandler<HTMLTextAreaElement>;
  onChange: ChangeEventHandler<HTMLTextAreaElement>;
  onSelectionChange?: (selection: LinkedTextSelection) => void;
}

type HighlightPart =
  | { kind: 'text'; text: string }
  | { kind: 'link'; text: string; key: string; linkKind: ExtractedReferenceLink['kind']; category: ExtractedReferenceLink['category'] };

export function LinkedTextArea({ value, rows, links, sourceField, activeLink, ariaLabel, onBlur, onChange, onSelectionChange }: LinkedTextAreaProps) {
  const mirrorRef = useRef<HTMLDivElement>(null);
  const parts = useMemo(() => linkedTextParts(value, links, sourceField), [links, sourceField, value]);
  const activeLinkKey = activeLink && activeLink.sourceField === sourceField ? linkKey(activeLink) : undefined;
  const notifySelection = useCallback(
    (target: HTMLTextAreaElement) => {
      onSelectionChange?.({
        sourceField,
        selectionStart: target.selectionStart ?? 0,
        selectionEnd: target.selectionEnd ?? target.selectionStart ?? 0
      });
    },
    [onSelectionChange, sourceField]
  );
  const handlePointerSelection: MouseEventHandler<HTMLTextAreaElement> = (event) => notifySelection(event.currentTarget);
  const handleKeyboardSelection: KeyboardEventHandler<HTMLTextAreaElement> = (event) => notifySelection(event.currentTarget);
  const handleSelect: ReactEventHandler<HTMLTextAreaElement> = (event) => notifySelection(event.currentTarget);

  return (
    <div className="linked-textarea">
      <div className="linked-textarea-highlight" aria-hidden="true" ref={mirrorRef}>
        {parts.map((part, index) =>
          part.kind === 'link' ? (
            <mark key={part.key} className={`linked-textarea-mark ${part.linkKind === 'card' ? 'card-link' : ''} ${part.key === activeLinkKey ? 'active-link' : ''}`}>
              {part.text}
            </mark>
          ) : (
            <span key={`text-${index}`}>{part.text}</span>
          )
        )}
        {value.endsWith('\n') ? <span>&nbsp;</span> : null}
      </div>
      <textarea
        aria-label={ariaLabel}
        className="linked-textarea-input"
        value={value}
        rows={rows}
        onBlur={onBlur}
        onChange={onChange}
        onClick={handlePointerSelection}
        onFocus={(event) => notifySelection(event.currentTarget)}
        onKeyUp={handleKeyboardSelection}
        onSelect={handleSelect}
        onScroll={(event) => {
          if (mirrorRef.current) {
            mirrorRef.current.scrollTop = event.currentTarget.scrollTop;
            mirrorRef.current.scrollLeft = event.currentTarget.scrollLeft;
          }
        }}
      />
    </div>
  );
}

function linkedTextParts(value: string, links: ExtractedReferenceLink[], sourceField: ReferenceLinkField): HighlightPart[] {
  const fieldLinks = links
    .filter((link) => link.sourceField === sourceField && link.start >= 0 && link.end > link.start && link.end <= value.length)
    .sort((a, b) => a.start - b.start || b.end - a.end);
  const parts: HighlightPart[] = [];
  let cursor = 0;

  for (const link of fieldLinks) {
    if (link.start < cursor) {
      continue;
    }
    if (link.start > cursor) {
      parts.push({ kind: 'text', text: value.slice(cursor, link.start) });
    }
    parts.push({
      kind: 'link',
      text: value.slice(link.start, link.end),
      key: `${link.kind}-${link.id}-${link.sourceField}-${link.start}-${link.end}`,
      linkKind: link.kind,
      category: link.category
    });
    cursor = link.end;
  }

  if (cursor < value.length) {
    parts.push({ kind: 'text', text: value.slice(cursor) });
  }
  return parts.length ? parts : [{ kind: 'text', text: value }];
}

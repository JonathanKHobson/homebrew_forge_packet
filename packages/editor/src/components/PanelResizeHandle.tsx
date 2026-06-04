import { useState, type PointerEvent as ReactPointerEvent } from 'react';

interface PanelResizeHandleProps {
  label: string;
  orientation?: 'vertical' | 'horizontal';
  onResize: (delta: number) => void;
}

export function PanelResizeHandle({ label, orientation = 'vertical', onResize }: PanelResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    let previousPosition = orientation === 'vertical' ? event.clientX : event.clientY;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = orientation === 'vertical' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
    setIsDragging(true);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextPosition = orientation === 'vertical' ? moveEvent.clientX : moveEvent.clientY;
      const delta = nextPosition - previousPosition;
      previousPosition = nextPosition;
      onResize(delta);
    };

    const stopDragging = () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', stopDragging);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      setIsDragging(false);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', stopDragging);
  }

  return (
    <button
      type="button"
      className={`panel-resize-handle ${orientation} ${isDragging ? 'dragging' : ''}`}
      aria-label={label}
      title={label}
      onPointerDown={handlePointerDown}
    >
      <span />
    </button>
  );
}

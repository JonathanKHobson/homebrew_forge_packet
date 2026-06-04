import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { CardDraft, FrameOption, PreviewResponse } from '../domain/editorTypes.js';
import { inferColors } from '../domain/frameRegistry.js';

interface CardPreviewProps {
  draft: CardDraft | null;
  preview: PreviewResponse | null;
  selectedFrame: FrameOption | null;
  showGuides: boolean;
  showSafeArea: boolean;
  zoom: number;
  onChange?: (draft: CardDraft) => void;
}

export function CardPreview({ draft, preview, selectedFrame, showGuides, showSafeArea, zoom, onChange }: CardPreviewProps) {
  const [artEditing, setArtEditing] = useState(false);
  const [cropMode, setCropMode] = useState(false);
  const [liveArt, setLiveArt] = useState<ArtEditValues | null>(null);
  const liveArtRef = useRef<ArtEditValues | null>(null);
  const liveImageRef = useRef<HTMLImageElement | null>(null);
  const hotspotRef = useRef<HTMLDivElement | null>(null);
  const warning = preview?.warnings[0] ? humanPreviewWarning(preview.warnings[0]) : undefined;
  const artBox = useMemo(() => artZoneRatio(draft), [draft?.layout, draft?.frameType, draft?.frameOverrideId, draft?.cardTypes.join(' ')]);
  const artImageSrc = useMemo(() => imageSrcFromDraft(draft), [draft?.artDataUri, draft?.artFilePath, draft?.artUrl]);
  const artValues = liveArt ?? valuesFromDraft(draft);
  const artImageStyle = cropMode ? cropImageStyle(artValues) : transformImageStyle(artValues);

  useEffect(() => {
    setLiveArt(null);
    liveArtRef.current = null;
  }, [draft?.cardId, draft?.artPositionX, draft?.artPositionY, draft?.artScale, draft?.artCropX, draft?.artCropY, draft?.artCropW, draft?.artCropH]);

  function resetArtEdits() {
    if (!draft || !onChange) {
      return;
    }
    const resetValues = defaultArtValues();
    setCropMode(false);
    setArtEditing(true);
    setLiveArt(resetValues);
    liveArtRef.current = resetValues;
    applyArtImageStyle(liveImageRef.current, resetValues, false);
    onChange({
      ...draft,
      artPositionX: '',
      artPositionY: '',
      artScale: '',
      artCropX: '',
      artCropY: '',
      artCropW: '',
      artCropH: ''
    });
  }

  function startArtEdit(event: ReactPointerEvent<HTMLElement>, mode: 'move' | 'resize', handle: ResizeHandle = 'se') {
    event.preventDefault();
    event.stopPropagation();
    const target = event.target as HTMLElement;
    if (mode === 'move' && (target.closest('.art-edit-toolbar') || target.closest('.art-resize-handle'))) {
      return;
    }
    if (!draft || !onChange) {
      return;
    }
    const rect = hotspotRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    setArtEditing(true);
    let previousX = event.clientX;
    let previousY = event.clientY;
    let nextValues = valuesFromDraft(draft);
    liveArtRef.current = nextValues;
    setLiveArt(nextValues);
    const cropModeAtStart = cropMode;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = mode === 'resize' ? 'nwse-resize' : 'grabbing';
    document.body.style.userSelect = 'none';

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const movementX = moveEvent.clientX - previousX;
      const movementY = moveEvent.clientY - previousY;
      previousX = moveEvent.clientX;
      previousY = moveEvent.clientY;
      const deltaX = (movementX / Math.max(1, rect.width)) * 100;
      const deltaY = (movementY / Math.max(1, rect.height)) * 100;
      if (!cropModeAtStart) {
        if (mode === 'move') {
          nextValues = {
            ...nextValues,
            positionX: clampValue(nextValues.positionX + deltaX, -200, 200),
            positionY: clampValue(nextValues.positionY + deltaY, -200, 200)
          };
        } else {
          nextValues = {
            ...nextValues,
            scale: clampValue(nextValues.scale + scaleDelta(movementX, movementY, handle, rect), 25, 400)
          };
        }
        liveArtRef.current = nextValues;
        setLiveArt(nextValues);
        applyArtImageStyle(liveImageRef.current, nextValues, cropModeAtStart);
        return;
      }
      if (mode === 'move') {
        nextValues = nextValues.cropActive
          ? {
              ...nextValues,
              cropX: clampValue(nextValues.cropX + deltaX, 0, Math.max(0, 100 - nextValues.cropW)),
              cropY: clampValue(nextValues.cropY + deltaY, 0, Math.max(0, 100 - nextValues.cropH))
            }
          : {
              ...nextValues,
              positionX: clampValue(nextValues.positionX + deltaX, -200, 200),
              positionY: clampValue(nextValues.positionY + deltaY, -200, 200)
            };
      } else {
        nextValues = resizeCrop(nextValues, deltaX, deltaY, handle);
      }
      liveArtRef.current = nextValues;
      setLiveArt(nextValues);
      applyArtImageStyle(liveImageRef.current, nextValues, cropModeAtStart);
    };

    const commitArtValues = () => {
      const committed = liveArtRef.current;
      if (committed) {
        const commitCrop = cropModeAtStart && committed.cropActive;
        setLiveArt(committed);
        onChange({
          ...draft,
          artPositionX: committed.positionX ? String(committed.positionX) : '',
          artPositionY: committed.positionY ? String(committed.positionY) : '',
          artScale: committed.scale === 100 ? '' : String(committed.scale),
          artCropX: commitCrop ? String(committed.cropX) : '',
          artCropY: commitCrop ? String(committed.cropY) : '',
          artCropW: commitCrop ? String(committed.cropW) : '',
          artCropH: commitCrop ? String(committed.cropH) : ''
        });
      }
    };

    const stopDragging = () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', stopDragging);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      commitArtValues();
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', stopDragging);
  }

  return (
    <section className="preview-stage">
      <div className="preview-header">
        <div>
          <h2>Preview</h2>
          <p>{selectedFrame ? `${selectedFrame.label} - ${selectedFrame.source}` : 'No frame selected'}</p>
        </div>
        <div className="preview-header-badges">
          {preview?.powerAssessment ? (
            <span className={`power-score-badge ${powerBadgeClass(preview.powerAssessment.label)}`} title={`Confidence ${Math.round(preview.powerAssessment.confidence * 100)}%`}>
              Power {preview.powerAssessment.score} · {preview.powerAssessment.label}
            </span>
          ) : null}
          {draft ? <span className="color-strip">{inferColors(draft.manaCost, draft.colorIndicator) || 'C'}</span> : null}
        </div>
      </div>
      <div className={`card-canvas ${showGuides ? 'show-guides' : ''} ${showSafeArea ? 'show-safe-area' : ''}`}>
        {preview?.imageDataUri ? (
          <div className="render-frame" style={{ transform: `scale(${zoom})` }}>
            <img src={preview.imageDataUri} alt={draft?.name ?? 'Card preview'} />
            {draft ? (
              <div
                ref={hotspotRef}
                role="button"
                tabIndex={0}
                className={`art-edit-hotspot ${artEditing ? 'active' : ''}`}
                style={{
                  left: `${artBox.left}%`,
                  top: `${artBox.top}%`,
                  width: `${artBox.width}%`,
                  height: `${artBox.height}%`
                }}
                onClick={() => {
                  setArtEditing(true);
                }}
                onPointerDown={(event) => startArtEdit(event, 'move')}
                title={cropMode ? 'Crop artwork' : 'Move artwork'}
              >
                {artEditing && artImageSrc ? (
                  <span className={`art-live-viewport ${cropMode ? 'crop-mode' : ''}`} aria-hidden="true">
                    <img ref={liveImageRef} className="art-live-image" src={artImageSrc} alt="" style={artImageStyle} />
                  </span>
                ) : null}
                {artEditing ? (
                  <span className="art-edit-toolbar" aria-label="Artwork tool mode">
                    <button
                      type="button"
                      className={cropMode ? 'active' : ''}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setCropMode((value) => !value);
                      }}
                    >
                      Crop
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        resetArtEdits();
                      }}
                    >
                      Reset
                    </button>
                    <span className="art-scale-readout">{Math.round(artValues.scale)}%</span>
                  </span>
                ) : null}
                {artEditing ? <span className="art-edit-label">{cropMode ? 'Drag to crop' : 'Drag to move'}</span> : null}
                {artEditing
                  ? RESIZE_HANDLES.map((handle) => (
                      <button
                        key={handle}
                        type="button"
                        className={`art-resize-handle ${handle}`}
                        title={cropMode ? 'Resize crop window' : 'Resize artwork'}
                        onPointerDown={(event) => startArtEdit(event, 'resize', handle)}
                      />
                    ))
                  : null}
              </div>
            ) : null}
            {showGuides ? <span className="guide-crosshair" /> : null}
            {showSafeArea ? <span className="safe-area-box" /> : null}
          </div>
        ) : (
          <div className="preview-empty">
            <strong>{selectedFrame?.label ?? 'Select a card'}</strong>
            <span>{warning ?? 'Preview will render here.'}</span>
          </div>
        )}
      </div>
      {preview?.warnings.length ? (
        <div className="warning-list">
          {preview.warnings.map((warning) => (
            <span key={warning}>{warning}</span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function artZoneRatio(draft: CardDraft | null): { left: number; top: number; width: number; height: number } {
  if (draft?.cardTypes.includes('Planeswalker')) {
    return { left: (25 / 375) * 100, top: (52 / 523) * 100, width: (324 / 375) * 100, height: (239 / 523) * 100 };
  }
  if (draft?.frameType === 'token_full_art' || draft?.frameOverrideId === 'token-full-art') {
    return { left: 0, top: 0, width: 100, height: 100 };
  }
  if (draft?.layout === 'token') {
    return { left: (29 / 375) * 100, top: (62 / 523) * 100, width: (319 / 375) * 100, height: (290 / 523) * 100 };
  }
  return { left: (29 / 375) * 100, top: (60 / 523) * 100, width: (316 / 375) * 100, height: (231 / 523) * 100 };
}

const RESIZE_HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;
type ResizeHandle = (typeof RESIZE_HANDLES)[number];

interface ArtEditValues {
  positionX: number;
  positionY: number;
  scale: number;
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
  cropActive: boolean;
}

function valuesFromDraft(draft: CardDraft | null): ArtEditValues {
  return {
    positionX: numericValue(draft?.artPositionX ?? '', 0),
    positionY: numericValue(draft?.artPositionY ?? '', 0),
    scale: clampValue(numericValue(draft?.artScale ?? '', 100), 25, 400),
    cropX: numericValue(draft?.artCropX ?? '', 0),
    cropY: numericValue(draft?.artCropY ?? '', 0),
    cropW: clampValue(numericValue(draft?.artCropW ?? '', 100), 10, 100),
    cropH: clampValue(numericValue(draft?.artCropH ?? '', 100), 10, 100),
    cropActive: Boolean(draft?.artCropX || draft?.artCropY || draft?.artCropW || draft?.artCropH)
  };
}

function defaultArtValues(): ArtEditValues {
  return {
    positionX: 0,
    positionY: 0,
    scale: 100,
    cropX: 0,
    cropY: 0,
    cropW: 100,
    cropH: 100,
    cropActive: false
  };
}

function imageSrcFromDraft(draft: CardDraft | null): string {
  if (!draft) {
    return '';
  }
  if (draft.artDataUri) {
    return draft.artDataUri;
  }
  if (draft.artUrl) {
    return draft.artUrl;
  }
  if (draft.artFilePath) {
    return `/api/asset?path=${encodeURIComponent(draft.artFilePath)}`;
  }
  return '';
}

function transformImageStyle(values: ArtEditValues): CSSProperties {
  const scale = clampValue(values.scale, 25, 400);
  const positionX = clampValue(values.positionX, -200, 200);
  const positionY = clampValue(values.positionY, -200, 200);
  return {
    width: `${scale}%`,
    height: `${scale}%`,
    left: `${positionX - (scale - 100) / 2}%`,
    top: `${positionY - (scale - 100) / 2}%`
  };
}

function cropImageStyle(values: ArtEditValues): CSSProperties {
  if (!values.cropActive) {
    return transformImageStyle(values);
  }
  const cropW = clampValue(values.cropW, 10, 100);
  const cropH = clampValue(values.cropH, 10, 100);
  const scaleX = 100 / cropW;
  const scaleY = 100 / cropH;
  return {
    width: `${100 * scaleX}%`,
    height: `${100 * scaleY}%`,
    left: `${-scaleX * clampValue(values.cropX, 0, 100)}%`,
    top: `${-scaleY * clampValue(values.cropY, 0, 100)}%`
  };
}

function scaleDelta(movementX: number, movementY: number, handle: ResizeHandle, rect: DOMRect): number {
  const directionalX = handle.includes('e') ? movementX : handle.includes('w') ? -movementX : 0;
  const directionalY = handle.includes('s') ? movementY : handle.includes('n') ? -movementY : 0;
  const parts = [directionalX, directionalY].filter((value) => value !== 0);
  const movement = parts.length ? parts.reduce((sum, value) => sum + value, 0) / parts.length : 0;
  return (movement / Math.max(1, Math.min(rect.width, rect.height))) * 100 * 1.4;
}

function resizeCrop(values: ArtEditValues, deltaX: number, deltaY: number, handle: ResizeHandle): ArtEditValues {
  const next = { ...values, cropActive: true };
  const minSize = 10;
  if (handle.includes('w')) {
    const right = next.cropX + next.cropW;
    const nextX = clampValue(next.cropX + deltaX, 0, Math.max(0, right - minSize));
    next.cropX = nextX;
    next.cropW = clampValue(right - nextX, minSize, 100 - nextX);
  } else if (handle.includes('e')) {
    next.cropW = clampValue(next.cropW + deltaX, minSize, 100 - next.cropX);
  }
  if (handle.includes('n')) {
    const bottom = next.cropY + next.cropH;
    const nextY = clampValue(next.cropY + deltaY, 0, Math.max(0, bottom - minSize));
    next.cropY = nextY;
    next.cropH = clampValue(bottom - nextY, minSize, 100 - nextY);
  } else if (handle.includes('s')) {
    next.cropH = clampValue(next.cropH + deltaY, minSize, 100 - next.cropY);
  }
  return next;
}

function applyArtImageStyle(image: HTMLImageElement | null, values: ArtEditValues, cropMode: boolean): void {
  if (!image) {
    return;
  }
  const style = cropMode ? cropImageStyle(values) : transformImageStyle(values);
  image.style.width = String(style.width ?? '');
  image.style.height = String(style.height ?? '');
  image.style.left = String(style.left ?? '');
  image.style.top = String(style.top ?? '');
}

function numericValue(value: string, fallback: number): number {
  if (value.trim() === '') {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampValue(value: number, min: number, max: number): number {
  return Math.round(Math.min(max, Math.max(min, value)) * 10) / 10;
}

function humanPreviewWarning(warning: string): string {
  const cleaned = warning.replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return 'Preview render failed.';
  }
  if (cleaned.length > 180 || /<html|<!doctype|at\s+\S+\s+\(|\/src\/|node_modules|function\s+\w+\(/i.test(cleaned)) {
    return 'Preview render failed. Check the dev server status and card data.';
  }
  return cleaned;
}

function powerBadgeClass(label: string): string {
  return label.toLowerCase().replace(/\s+/g, '-');
}

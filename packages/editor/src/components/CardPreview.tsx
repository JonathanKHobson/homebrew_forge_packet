import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { CardDraft, CardSummary, FrameOption, PreviewResponse } from '../domain/editorTypes.js';
import type { PreviewToolMode } from '../domain/editorUiTypes.js';
import { buildTypeLine } from '../domain/frameRegistry.js';
import { CARD_TYPES, SUPERTYPES } from '../domain/magicTerms.js';
import { formatCount } from '../domain/uiText.js';
import { Icon } from './Icon.js';
import { ImageLightbox } from './ImageLightbox.js';

interface CardPreviewProps {
  draft: CardDraft | null;
  preview: PreviewResponse | null;
  selectedFrame: FrameOption | null;
  previewLoading?: boolean;
  previewUpdating?: boolean;
  hasUnsavedChanges?: boolean;
  showGuides: boolean;
  showSafeArea: boolean;
  showCardGrid: boolean;
  zoom: number;
  previewToolMode: PreviewToolMode;
  hideHeader?: boolean;
  expandRequestToken?: number;
  cards?: CardSummary[];
  onChange?: (draft: CardDraft) => void;
  onVariantChange?: (variantId: string) => void;
  onCardSelect?: (cardId: string) => void;
  onPreviewRetry?: () => void;
}

export function CardPreview({ draft, preview, selectedFrame, previewLoading = false, previewUpdating = false, hasUnsavedChanges = false, showGuides, showSafeArea, showCardGrid, zoom, previewToolMode, hideHeader = false, expandRequestToken = 0, cards = [], onChange, onVariantChange, onCardSelect, onPreviewRetry }: CardPreviewProps) {
  const [artEditing, setArtEditing] = useState(false);
  const [cropMode, setCropMode] = useState(false);
  const [imageExpanded, setImageExpanded] = useState(false);
  const [expandedImageSrc, setExpandedImageSrc] = useState('');
  const [liveArt, setLiveArt] = useState<ArtEditValues | null>(null);
  const liveArtRef = useRef<ArtEditValues | null>(null);
  const liveImageRef = useRef<HTMLImageElement | null>(null);
  const hotspotRef = useRef<HTMLDivElement | null>(null);
  const warning = preview?.warnings[0] ? humanPreviewWarning(preview.warnings[0]) : undefined;
  const variantSummaries = draft?.variantSummaries ?? [];
  const expandedCardOptions = useMemo(() => cards.map((card) => ({ id: card.cardId, label: cardPreviewOptionLabel(card) })), [cards]);
  const expandedCardIndex = useMemo(() => cards.findIndex((card) => card.cardId === draft?.cardId), [cards, draft?.cardId]);
  const artBox = useMemo(() => artZoneRatio(draft), [draft?.layout, draft?.frameType, draft?.frameOverrideId, draft?.cardTypes.join(' ')]);
  const artImageSrc = useMemo(() => imageSrcFromDraft(draft), [draft?.artDataUri, draft?.artFilePath, draft?.artUrl]);
  const artValues = liveArt ?? valuesFromDraft(draft);
  const artImageStyle = cropMode ? cropImageStyle(artValues) : transformImageStyle(artValues);

  useEffect(() => {
    setLiveArt(null);
    liveArtRef.current = null;
  }, [draft?.cardId, draft?.artPositionX, draft?.artPositionY, draft?.artScale, draft?.artCropX, draft?.artCropY, draft?.artCropW, draft?.artCropH]);

  useEffect(() => {
    if (expandRequestToken && preview?.imageDataUri) {
      setExpandedImageSrc(preview.imageDataUri);
      setImageExpanded(true);
    }
  }, [expandRequestToken, preview?.imageDataUri]);

  useEffect(() => {
    if (imageExpanded && preview?.imageDataUri) {
      setExpandedImageSrc(preview.imageDataUri);
    }
  }, [imageExpanded, preview?.imageDataUri]);

  useEffect(() => {
    if (previewToolMode !== 'art') {
      setArtEditing(false);
    }
  }, [previewToolMode]);

  // Restrained craft moment: a one-shot reveal when a *different* card is shown.
  // Editing fields on the same card does not retrigger it. Reduced-motion is
  // handled in CSS (.card-canvas.fb-reveal animations are disabled).
  const [cardReveal, setCardReveal] = useState(false);
  const lastRevealCardRef = useRef('');
  useEffect(() => {
    if (!draft?.cardId || !preview?.imageDataUri) {
      return;
    }
    if (lastRevealCardRef.current === draft.cardId) {
      return;
    }
    lastRevealCardRef.current = draft.cardId;
    setCardReveal(true);
    const timeout = window.setTimeout(() => setCardReveal(false), 1150);
    return () => window.clearTimeout(timeout);
  }, [draft?.cardId, preview?.imageDataUri]);

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

  function openExpandedPreview() {
    if (preview?.imageDataUri) {
      setExpandedImageSrc(preview.imageDataUri);
      setImageExpanded(true);
    }
  }

  function selectExpandedCard(direction: 1 | -1) {
    if (!cards.length || !onCardSelect) {
      return;
    }
    const currentIndex = expandedCardIndex >= 0 ? expandedCardIndex : 0;
    const nextIndex = (currentIndex + direction + cards.length) % cards.length;
    const nextCard = cards[nextIndex];
    if (nextCard) {
      onCardSelect(nextCard.cardId);
    }
  }

  function cardSurfaceClickIsTool(target: HTMLElement): boolean {
    return Boolean(target.closest('.preview-card-tool-overlay, .art-edit-hotspot, .art-edit-toolbar, .art-resize-handle, .preview-canvas-action'));
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
    <section className={`preview-stage ${hideHeader ? 'preview-stage-compact' : ''}`}>
      {!hideHeader ? (
        <div className="preview-header">
          <div>
            <h2>Preview</h2>
            <p>{selectedFrame ? `${selectedFrame.label} - ${selectedFrame.source}` : 'No frame selected'}</p>
          </div>
          <div className="preview-header-badges">
            {preview?.imageDataUri ? (
              <button type="button" className="icon-button" onClick={openExpandedPreview} aria-label="Open larger preview" data-tooltip="Open larger preview">
                <Icon name="expand" />
              </button>
            ) : null}
            {draft && variantSummaries.length ? (
              <label className="variant-switcher" title={formatCount(variantSummaries.length, 'variant')}>
                <span>{formatCount(variantSummaries.length, 'variant')}</span>
                <select value={draft.variantId} onChange={(event) => onVariantChange?.(event.target.value)}>
                  {variantSummaries.map((variant) => (
                    <option key={variant.variantId} value={variant.variantId}>
                      {variant.isPrimary ? '* ' : ''}{variant.displayName}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {preview?.powerAssessment ? (
              <span className={`power-score-badge ${powerBadgeClass(preview.powerAssessment.label)}`} title={`Confidence ${Math.round(preview.powerAssessment.confidence * 100)}%`}>
                Power {preview.powerAssessment.score} · {preview.powerAssessment.label}
              </span>
            ) : null}
            {hasUnsavedChanges ? <span className="unsaved-badge">Unsaved</span> : null}
            {previewUpdating ? <span className="preview-updating-badge">Updating preview</span> : null}
          </div>
        </div>
      ) : null}
      <div className={`card-canvas ${showGuides ? 'show-guides' : ''} ${showSafeArea ? 'show-safe-area' : ''} ${cardReveal ? 'fb-reveal' : ''}`}>
        {hideHeader && preview?.imageDataUri ? (
          <button type="button" className="preview-canvas-action" onClick={openExpandedPreview} aria-label="Open larger preview" data-tooltip="Open larger preview">
            <Icon name="expand" />
          </button>
        ) : null}
        {preview?.imageDataUri ? (
          <div
            className={`render-frame preview-tool-${previewToolMode} ${previewToolMode === 'preview' ? 'can-open-lightbox' : ''}`}
            style={{ transform: `scale(${zoom})` }}
            onClickCapture={(event) => {
              if (previewToolMode !== 'preview') {
                return;
              }
              const target = event.target as HTMLElement;
              if (cardSurfaceClickIsTool(target)) {
                return;
              }
              event.preventDefault();
              openExpandedPreview();
            }}
            onDoubleClickCapture={(event) => {
              const target = event.target as HTMLElement;
              if (previewToolMode !== 'preview' || cardSurfaceClickIsTool(target)) {
                return;
              }
              event.preventDefault();
              openExpandedPreview();
            }}
          >
            <img
              src={preview.imageDataUri}
              alt={draft?.name ?? 'Card preview'}
              title={previewToolMode === 'preview' ? 'Click to open larger preview' : undefined}
              onDoubleClick={previewToolMode === 'preview' ? openExpandedPreview : undefined}
            />
            {draft && previewToolMode === 'art' ? (
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
                title={cropMode ? 'Drag to crop artwork' : 'Drag to move artwork'}
              >
                {artEditing && artImageSrc ? (
                  <span className={`art-live-viewport ${cropMode ? 'crop-mode' : ''}`} aria-hidden="true">
                    <img ref={liveImageRef} className="art-live-image" src={artImageSrc} alt="" style={artImageStyle} />
                  </span>
                ) : null}
                {artEditing ? (
                  <span className="art-edit-toolbar" aria-label="Artwork tool options">
                    <button
                      type="button"
                      className={cropMode ? 'active' : ''}
                      aria-pressed={cropMode}
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
                      aria-label="Reset artwork position and crop"
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
            {draft && onChange && previewToolMode === 'text' ? <PreviewTextOverlay draft={draft} onChange={onChange} /> : null}
            {draft && onChange && previewToolMode === 'layout' ? <PreviewLayoutOverlay draft={draft} onChange={onChange} /> : null}
            {showGuides ? <span className="guide-crosshair" /> : null}
            {showSafeArea ? <span className="safe-area-box" /> : null}
            {showCardGrid ? <CardGridOverlay /> : null}
            {previewUpdating ? (
              <div className="preview-update-overlay" aria-live="polite">
                <span className="preview-loading-spinner compact" aria-hidden="true" />
                <strong>Updating preview</strong>
              </div>
            ) : null}
          </div>
        ) : previewLoading ? (
          <div className="preview-empty preview-loading" aria-busy="true" aria-live="polite">
            <span className="preview-loading-spinner" aria-hidden="true" />
            <strong>Rendering preview</strong>
            <span>{draft ? `${draft.collectorNumber} ${draft.name}` : 'Preparing card preview.'}</span>
          </div>
        ) : (
          <div className="preview-empty">
            <strong>{selectedFrame?.label ?? 'Select a card'}</strong>
            <span>{warning ?? 'Preview will render here.'}</span>
            {warning && draft && onPreviewRetry ? (
              <button type="button" className="secondary-button compact" onClick={onPreviewRetry}>
                Retry preview
              </button>
            ) : null}
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
      {imageExpanded ? (
        <ImageLightbox
          src={preview?.imageDataUri ?? expandedImageSrc}
          alt={draft?.name ?? 'Card preview'}
          label={`${draft?.name ?? 'Card'} expanded preview`}
          loading={previewLoading || Boolean(draft && !preview?.imageDataUri)}
          status={previewUpdating ? 'Updating preview' : undefined}
          cardOptions={expandedCardOptions}
          selectedCardId={draft?.cardId ?? ''}
          onCardSelect={onCardSelect}
          onPrevious={cards.length > 1 && onCardSelect ? () => selectExpandedCard(-1) : undefined}
          onNext={cards.length > 1 && onCardSelect ? () => selectExpandedCard(1) : undefined}
          onClose={() => setImageExpanded(false)}
        />
      ) : null}
    </section>
  );
}

function cardPreviewOptionLabel(card: CardSummary): string {
  return [card.collectorNumber, card.name].filter(Boolean).join(' ');
}

function CardGridOverlay() {
  const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const rows = Array.from({ length: 14 }, (_value, index) => index + 1);

  return (
    <div className="card-grid-overlay" aria-hidden="true">
      <div className="card-grid-lines" />
      <div className="card-grid-labels top">
        {columns.map((column) => (
          <span key={column}>{column}</span>
        ))}
      </div>
      <div className="card-grid-labels bottom">
        {columns.map((column) => (
          <span key={column}>{column}</span>
        ))}
      </div>
      <div className="card-grid-labels left">
        {rows.map((row) => (
          <span key={row}>{row}</span>
        ))}
      </div>
      <div className="card-grid-labels right">
        {rows.map((row) => (
          <span key={row}>{row}</span>
        ))}
      </div>
    </div>
  );
}

interface PreviewOverlayProps {
  draft: CardDraft;
  onChange: (draft: CardDraft) => void;
}

function PreviewTextOverlay({ draft, onChange }: PreviewOverlayProps) {
  const textZones = previewTextZones(draft);
  const typeLine = buildTypeLine(draft);
  const showLoyalty = draft.cardTypes.includes('Planeswalker') || Boolean(draft.loyalty);
  const showPowerToughness = !showLoyalty && (draft.cardTypes.includes('Creature') || Boolean(draft.power || draft.toughness));
  const updateDraft = (patch: Partial<CardDraft>) => onChange({ ...draft, ...patch });

  return (
    <div className="preview-card-tool-overlay preview-card-text-overlay" onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
      <input
        className="preview-card-text-field preview-card-name-field"
        aria-label="Edit card name on preview"
        style={zoneStyle(textZones.name)}
        value={draft.name}
        onChange={(event) => updateDraft({ name: event.target.value })}
      />
      <input
        className="preview-card-text-field preview-card-type-field"
        aria-label="Edit type line on preview"
        style={zoneStyle(textZones.typeLine)}
        value={typeLine}
        onChange={(event) => updateDraft(parseTypeLineEdit(event.target.value, draft))}
      />
      <div className="preview-card-rules-stack" style={zoneStyle(textZones.rules)}>
        <textarea
          className="preview-card-text-field preview-card-rules-field"
          aria-label="Edit rules text on preview"
          value={draft.oracleText}
          onChange={(event) => updateDraft({ oracleText: event.target.value })}
        />
        <textarea
          className="preview-card-text-field preview-card-flavor-field"
          aria-label="Edit flavor text on preview"
          value={draft.flavorText}
          onChange={(event) => updateDraft({ flavorText: event.target.value })}
        />
      </div>
      {showPowerToughness ? (
        <div className="preview-card-stat-row" style={zoneStyle(textZones.stats)}>
          <input aria-label="Edit power on preview" value={draft.power} onChange={(event) => updateDraft({ power: event.target.value })} />
          <span aria-hidden="true">/</span>
          <input aria-label="Edit toughness on preview" value={draft.toughness} onChange={(event) => updateDraft({ toughness: event.target.value })} />
        </div>
      ) : null}
      {showLoyalty ? (
        <input
          className="preview-card-text-field preview-card-loyalty-field"
          aria-label="Edit loyalty on preview"
          style={zoneStyle(textZones.stats)}
          value={draft.loyalty}
          onChange={(event) => updateDraft({ loyalty: event.target.value })}
        />
      ) : null}
    </div>
  );
}

function PreviewLayoutOverlay({ draft, onChange }: PreviewOverlayProps) {
  const zones = previewTextZones(draft);
  const [selectedZone, setSelectedZone] = useState<LayoutZoneKey>('rules');
  const padding = rulesPaddingFromDraft(draft);
  const updatePadding = (nextPadding: RulesPadding) => {
    onChange({
      ...draft,
      rulesTextPaddingTop: layoutPaddingValue(nextPadding.top),
      rulesTextPaddingRight: layoutPaddingValue(nextPadding.right),
      rulesTextPaddingBottom: layoutPaddingValue(nextPadding.bottom),
      rulesTextPaddingLeft: layoutPaddingValue(nextPadding.left)
    });
  };
  const resetPadding = () => {
    onChange({
      ...draft,
      rulesTextPaddingTop: '',
      rulesTextPaddingRight: '',
      rulesTextPaddingBottom: '',
      rulesTextPaddingLeft: ''
    });
  };
  const startPaddingDrag = (event: ReactPointerEvent<HTMLButtonElement>, side: keyof RulesPadding) => {
    event.preventDefault();
    event.stopPropagation();
    const frameRect = (event.currentTarget.closest('.render-frame') as HTMLElement | null)?.getBoundingClientRect();
    if (!frameRect) {
      return;
    }
    const startX = event.clientX;
    const startY = event.clientY;
    const startPadding = { ...padding };
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = side === 'left' || side === 'right' ? 'ew-resize' : 'ns-resize';
    document.body.style.userSelect = 'none';

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = ((moveEvent.clientX - startX) / Math.max(1, frameRect.width)) * CARD_PREVIEW_WIDTH;
      const deltaY = ((moveEvent.clientY - startY) / Math.max(1, frameRect.height)) * CARD_PREVIEW_HEIGHT;
      const nextPadding = { ...startPadding };
      if (side === 'top') {
        nextPadding.top = clampValue(startPadding.top + deltaY, 0, 64);
      } else if (side === 'right') {
        nextPadding.right = clampValue(startPadding.right - deltaX, 0, 64);
      } else if (side === 'bottom') {
        nextPadding.bottom = clampValue(startPadding.bottom - deltaY, 0, 64);
      } else {
        nextPadding.left = clampValue(startPadding.left + deltaX, 0, 64);
      }
      updatePadding(nextPadding);
    };
    const stopDragging = () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', stopDragging);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', stopDragging);
  };

  return (
    <div className="preview-card-tool-overlay preview-card-layout-overlay" onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
      {LAYOUT_TEXT_ZONES.map((zone) => (
        <button
          key={zone}
          type="button"
          className={`preview-layout-zone-hitbox ${zone}`}
          style={zoneStyle(zones[zone])}
          aria-label={`Select ${LAYOUT_ZONE_LABELS[zone]} layout zone`}
          aria-pressed={selectedZone === zone}
          title={`Select ${LAYOUT_ZONE_LABELS[zone]} layout zone`}
          onClick={() => setSelectedZone(zone)}
        />
      ))}
      <div className={`preview-layout-selected-frame ${selectedZone}`} style={zoneStyle(zones[selectedZone])}>
        {selectedZone === 'rules' ? <span className="preview-layout-inner-padding" aria-hidden="true" style={rulesInnerPaddingStyle(padding)} /> : null}
        <span className="preview-layout-readout">
          {selectedZone === 'rules'
            ? `Rules ${Math.round(padding.top)}/${Math.round(padding.right)}/${Math.round(padding.bottom)}/${Math.round(padding.left)}`
            : `${LAYOUT_ZONE_LABELS[selectedZone]} zone`}
        </span>
        {selectedZone === 'rules' ? (
          <>
            <button type="button" className="preview-layout-reset" onClick={resetPadding}>
              Reset
            </button>
            {LAYOUT_PADDING_SIDES.map((side) => (
              <button
                key={side}
                type="button"
                className={`layout-padding-handle ${side}`}
                aria-label={`Adjust rules ${side} padding`}
                title={`Adjust rules ${side} padding`}
                onPointerDown={(event) => startPaddingDrag(event, side)}
              />
            ))}
          </>
        ) : null}
      </div>
    </div>
  );
}

const CARD_PREVIEW_WIDTH = 375;
const CARD_PREVIEW_HEIGHT = 523;
const LAYOUT_TEXT_ZONES = ['name', 'typeLine', 'rules'] as const;
type LayoutZoneKey = (typeof LAYOUT_TEXT_ZONES)[number];
const LAYOUT_ZONE_LABELS: Record<LayoutZoneKey, string> = {
  name: 'Name',
  typeLine: 'Type line',
  rules: 'Rules text'
};
const LAYOUT_PADDING_SIDES = ['top', 'right', 'bottom', 'left'] as const;

interface PreviewZone {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface RulesPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

function previewTextZones(draft: CardDraft): Record<'name' | 'typeLine' | 'rules' | 'stats', PreviewZone> {
  if (draft.frameType === 'token_full_art' || draft.frameOverrideId === 'token-full-art') {
    return {
      name: { left: 8, top: 5, width: 68, height: 6.5 },
      typeLine: { left: 8, top: 80.5, width: 70, height: 5.8 },
      rules: { left: 8, top: 86.5, width: 70, height: 7.5 },
      stats: { left: 75.5, top: 86.4, width: 15, height: 5.8 }
    };
  }
  if (draft.cardTypes.includes('Planeswalker')) {
    return {
      name: { left: 7.5, top: 5.2, width: 70, height: 6.3 },
      typeLine: { left: 7.5, top: 55.3, width: 84, height: 5.6 },
      rules: { left: 8.5, top: 62, width: 83, height: 27 },
      stats: { left: 78, top: 88.4, width: 13, height: 6 }
    };
  }
  return {
    name: { left: 7.6, top: 5.4, width: 68, height: 6.2 },
    typeLine: { left: 7.7, top: 55.9, width: 84, height: 5.8 },
    rules: { left: 8.4, top: 63.2, width: 83.2, height: 22.5 },
    stats: { left: 75.5, top: 87.3, width: 16.2, height: 6.6 }
  };
}

function zoneStyle(zone: PreviewZone): CSSProperties {
  return {
    left: `${zone.left}%`,
    top: `${zone.top}%`,
    width: `${zone.width}%`,
    height: `${zone.height}%`
  };
}

function parseTypeLineEdit(value: string, draft: CardDraft): Partial<CardDraft> {
  const normalized = value.replace(/\s+/g, ' ').trim();
  const [leftPart, rightPart = ''] = normalized.split(/\s+[—-]\s+/, 2);
  const supertypeSet = new Set<string>(SUPERTYPES);
  const cardTypeSet = new Set<string>(CARD_TYPES);
  const nextSupertypes: string[] = [];
  const nextCardTypes: string[] = [];
  const subtypeFragments: string[] = [];
  for (const token of leftPart.split(/\s+/).filter(Boolean)) {
    if (supertypeSet.has(token)) {
      nextSupertypes.push(token);
    } else if (cardTypeSet.has(token)) {
      nextCardTypes.push(token);
    } else {
      subtypeFragments.push(token);
    }
  }
  const nextSubtypes = [rightPart, subtypeFragments.join(' ')].filter((part) => part.trim()).join(' ').trim();
  return {
    supertypes: nextSupertypes.length ? nextSupertypes : draft.supertypes,
    cardTypes: nextCardTypes.length ? nextCardTypes : draft.cardTypes,
    subtypes: nextSubtypes,
    typeLine: normalized
  };
}

function rulesPaddingFromDraft(draft: CardDraft): RulesPadding {
  return {
    top: numericValue(draft.rulesTextPaddingTop, 0),
    right: numericValue(draft.rulesTextPaddingRight, 0),
    bottom: numericValue(draft.rulesTextPaddingBottom, 0),
    left: numericValue(draft.rulesTextPaddingLeft, 0)
  };
}

function layoutPaddingValue(value: number): string {
  const rounded = Math.round(value);
  return rounded > 0 ? String(rounded) : '';
}

function rulesInnerPaddingStyle(padding: RulesPadding): CSSProperties {
  return {
    top: `${(padding.top / CARD_PREVIEW_HEIGHT) * 100}%`,
    right: `${(padding.right / CARD_PREVIEW_WIDTH) * 100}%`,
    bottom: `${(padding.bottom / CARD_PREVIEW_HEIGHT) * 100}%`,
    left: `${(padding.left / CARD_PREVIEW_WIDTH) * 100}%`
  };
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
  if (/timed out/i.test(cleaned)) {
    return `${cleaned} Retry the preview or check the renderer status.`;
  }
  if (cleaned.length > 180 || /<html|<!doctype|at\s+\S+\s+\(|\/src\/|node_modules|function\s+\w+\(/i.test(cleaned)) {
    return 'Preview render failed. Check the dev server status and card data.';
  }
  return cleaned;
}

function powerBadgeClass(label: string): string {
  return label.toLowerCase().replace(/\s+/g, '-');
}

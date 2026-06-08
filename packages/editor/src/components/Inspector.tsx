import type { CardDraft, EditorProject, PreviewResponse } from '../domain/editorTypes.js';
import type { InspectorTab } from '../domain/editorUiTypes.js';
import { CARD_TYPE_COMBOS, COLOR_IDENTITY_OPTIONS, COMMON_SUBTYPES, RARITIES, SUPERTYPES } from '../domain/magicTerms.js';
import { buildTypeLine, inferColors, inferFrame } from '../domain/frameRegistry.js';
import { borderOptionsForFrame } from '../domain/borderColorRegistry.js';
import { CARD_STATUS_OPTIONS } from '../domain/filterTypes.js';
import { CollapsibleSection } from './CollapsibleSection.js';
import { Field } from './Field.js';
import { FillChooseField } from './FillChooseField.js';
import { Icon } from './Icon.js';
import { LinkedTextArea } from './LinkedTextArea.js';
import { ManaCostSymbols, ManaSymbolPreloader, ManaSymbolSet, cleanColorIdentity, preloadManaSymbols } from './ManaSymbols.js';
import { TagEditor } from './TagEditor.js';
import { findLinkAtSelection, formatReminderText, insertReferenceReminderText, type LinkedTextSelection } from '../domain/rulesTextReferenceActions.js';
import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { extractReferenceLinks, lintRulesText, termsForTrigger, type ExtractedReferenceLink, type ReferenceCatalog, type ReferenceTerm, type RulesLintFinding } from '@homebrew-forge/forge/reference';

interface InspectorProps {
  project: EditorProject | null;
  draft: CardDraft | null;
  preview: PreviewResponse | null;
  referenceCatalog: ReferenceCatalog | null;
  activeTab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
  onChange: (draft: CardDraft) => void;
  onVariantChange?: (variantId: string) => void;
  onSaveVariant?: (draft: CardDraft) => void;
  onCollapse?: () => void;
  panelClassName?: string;
  panelId?: string;
}

const INSPECTOR_TABS: InspectorTab[] = ['card', 'frame', 'layout', 'preview'];
const AUTOMATIC_FRAME_IDS = new Set([
  'normal-spell',
  'normal-creature',
  'normal-noncreature',
  'normal-instant',
  'normal-sorcery',
  'normal-enchantment',
  'artifact',
  'equipment',
  'vehicle',
  'aura',
  'land',
  'planeswalker',
  'planeswalker-4',
  'battle',
  'plane',
  'scheme',
  'phenomenon',
  'dungeon',
  'vanguard',
  'conspiracy',
  'emblem',
  'attraction'
]);

export function Inspector({
  project,
  draft,
  preview,
  referenceCatalog,
  activeTab,
  onTabChange,
  onChange,
  onVariantChange,
  onSaveVariant,
  onCollapse,
  panelClassName,
  panelId
}: InspectorProps) {
  const [artSourceMode, setArtSourceMode] = useState<'upload' | 'url' | 'library'>('library');
  const [frameSourceMode, setFrameSourceMode] = useState<'upload' | 'url' | 'library'>('library');
  const selectedFrame = project && draft ? inferFrame(draft, project.frames) : null;
  const isPlaneswalker = Boolean(draft?.cardTypes.includes('Planeswalker'));
  const hasPowerToughness = Boolean(draft && (draft.cardTypes.includes('Creature') || draft.subtypes.toLowerCase().includes('vehicle')));
  const tagSuggestions = useMemo(() => (project && draft ? collectTagSuggestions(project, draft) : []), [draft, project]);
  const linkedReferences = useMemo<ExtractedReferenceLink[]>(() => {
    if (!referenceCatalog || !project || !draft) {
      return [];
    }
    return extractReferenceLinks({
      catalog: referenceCatalog,
      textByField: {
        oracleText: draft.oracleText,
        flavorText: draft.flavorText,
        typeLine: buildTypeLine(draft),
        manaCost: draft.manaCost
      },
      cards: project.cards.map((card) => ({ id: card.cardId, name: card.name, typeLine: card.typeLine, setCode: project.setCode })),
      limit: 18
    });
  }, [draft, project, referenceCatalog]);
  if (!project || !draft || !selectedFrame) {
    return (
      <aside id={panelId} className={`inspector ${panelClassName ?? ''}`}>
        <div className="panel-heading">
          <h2>Card Inspector</h2>
          {onCollapse ? (
            <button type="button" className="panel-control-button" onClick={onCollapse} title="Hide inspector panel" aria-label="Hide inspector panel">
              <Icon name="collapseRight" />
            </button>
          ) : null}
        </div>
      </aside>
    );
  }

  const update = (patch: Partial<CardDraft>) => {
    const next = { ...draft, ...patch };
    onChange({
      ...next,
      colors: inferColors(next.manaCost),
      typeLine: buildTypeLine(next)
    });
  };
  const saveVariantPatch = (patch: Partial<CardDraft>) => {
    const next = { ...draft, ...patch };
    onChange(next);
    onSaveVariant?.(next);
  };
  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, tab: InspectorTab) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') {
      return;
    }
    event.preventDefault();
    const currentIndex = INSPECTOR_TABS.indexOf(tab);
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? INSPECTOR_TABS.length - 1
          : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + INSPECTOR_TABS.length) % INSPECTOR_TABS.length;
    const nextTab = INSPECTOR_TABS[nextIndex];
    onTabChange(nextTab);
    window.setTimeout(() => document.getElementById(inspectorTabId(nextTab))?.focus(), 0);
  };

  return (
    <aside id={panelId} className={`inspector ${panelClassName ?? ''}`}>
      <div className="panel-heading" title={preview?.inferredFrame.label ?? selectedFrame.label}>
        <div>
          <h2>Card Inspector</h2>
        </div>
        {onCollapse ? (
          <button type="button" className="panel-control-button" onClick={onCollapse} title="Hide inspector panel" aria-label="Hide inspector panel">
            <Icon name="collapseRight" />
          </button>
        ) : null}
      </div>

      <div className="inspector-tabs" role="tablist" aria-label="Inspector tabs">
        {INSPECTOR_TABS.map((tab) => (
          <button
            key={tab}
            id={inspectorTabId(tab)}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls={inspectorPanelId(tab)}
            tabIndex={activeTab === tab ? 0 : -1}
            className={activeTab === tab ? 'active' : ''}
            onClick={() => onTabChange(tab)}
            onKeyDown={(event) => handleTabKeyDown(event, tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'card' ? (
        <div id={inspectorPanelId('card')} role="tabpanel" aria-labelledby={inspectorTabId('card')} className="inspector-tab-panel">
          <CollapsibleSection title="Identity">
            <div className="grid-2">
              <Field label="Set code">
                <input value={draft.setCode} maxLength={6} readOnly title="Move cards between sets from the Sets workspace." />
              </Field>
              <Field label="Language">
                <input value={draft.language} maxLength={3} onChange={(event) => update({ language: event.target.value.toUpperCase() })} />
              </Field>
              <Field label="Number">
                <input value={draft.collectorNumber} onChange={(event) => update({ collectorNumber: event.target.value })} />
              </Field>
              <Field label="Set total">
                <input value={draft.setTotal} placeholder="Optional" onChange={(event) => update({ setTotal: event.target.value })} />
              </Field>
            </div>
            <Field label="Designer / footer">
              <input value={draft.designer} onChange={(event) => update({ designer: event.target.value })} />
            </Field>
          </CollapsibleSection>

          <CollapsibleSection title="Name & Mana Cost">
            <Field label="Name">
              <input value={draft.name} onChange={(event) => update({ name: event.target.value })} />
            </Field>
            <Field label="Mana cost">
              <ManaCostEditor value={draft.manaCost} onChange={(manaCost) => update({ manaCost })} />
            </Field>
          </CollapsibleSection>

          <CollapsibleSection title="Type Line">
            <div className="grid-2">
              <FillChooseField
                label="Supertype"
                value={draft.supertypes.join(' ')}
                options={SUPERTYPES}
                placeholder="Legendary"
                onChange={(value) => update({ supertypes: parseTypeWords(value) })}
              />
              <FillChooseField
                label="Card type"
                value={draft.cardTypes.join(' ')}
                options={CARD_TYPE_COMBOS}
                placeholder="Creature"
                onChange={(value) => update({ cardTypes: parseTypeWords(value) })}
              />
            </div>
            <FillChooseField label="Subtype" value={draft.subtypes} options={COMMON_SUBTYPES} placeholder="Human Soldier" onChange={(value) => update({ subtypes: value })} />
          </CollapsibleSection>

          <CollapsibleSection title="Rules">
            {isPlaneswalker ? <PlaneswalkerAbilityControls draft={draft} onChange={update} /> : <RulesTextControls project={project} draft={draft} referenceCatalog={referenceCatalog} linkedReferences={linkedReferences} onChange={update} />}
            {hasPowerToughness ? (
              <div className="grid-2">
                <Field label="Power">
                  <input value={draft.power} onChange={(event) => update({ power: event.target.value })} />
                </Field>
                <Field label="Toughness">
                  <input value={draft.toughness} onChange={(event) => update({ toughness: event.target.value })} />
                </Field>
              </div>
            ) : null}
            {isPlaneswalker ? (
              <Field label="Loyalty">
                <input value={draft.loyalty} onChange={(event) => update({ loyalty: event.target.value })} />
              </Field>
            ) : null}
          </CollapsibleSection>

          <CollapsibleSection title="Frame">
            <FrameBasicsControls project={project} draft={draft} onChange={update} />
          </CollapsibleSection>

          <CollapsibleSection title="Art">
            <ArtSourceControls draft={draft} mode={artSourceMode} onModeChange={setArtSourceMode} onChange={update} />
          </CollapsibleSection>

          <CollapsibleSection title="Advanced Options" defaultOpen={false}>
            <Field label="Set symbol path">
              <input value={draft.setSymbolPath} placeholder="Optional local PNG/SVG" onChange={(event) => update({ setSymbolPath: event.target.value })} />
            </Field>
            <Field label="Set symbol URL">
              <input value={draft.setSymbolUrl} placeholder="Optional URL" onChange={(event) => update({ setSymbolUrl: event.target.value })} />
            </Field>
            <Field label="Watermark">
              <input value={draft.watermark} placeholder="Optional" onChange={(event) => update({ watermark: event.target.value })} />
            </Field>
          </CollapsibleSection>
        </div>
      ) : null}

      {activeTab === 'frame' ? (
        <div id={inspectorPanelId('frame')} role="tabpanel" aria-labelledby={inspectorTabId('frame')} className="inspector-tab-panel">
          <CollapsibleSection title="Frame Source">
            <FrameBasicsControls project={project} draft={draft} onChange={update} />
            <FrameSourceControls mode={frameSourceMode} onModeChange={setFrameSourceMode} />
          </CollapsibleSection>
        </div>
      ) : null}

      {activeTab === 'layout' ? (
        <div id={inspectorPanelId('layout')} role="tabpanel" aria-labelledby={inspectorTabId('layout')} className="inspector-tab-panel">
          <CollapsibleSection title="Text Layout">
            <TextLayoutControls draft={draft} onChange={update} />
          </CollapsibleSection>

          <CollapsibleSection title="Art Source">
            <ArtSourceControls draft={draft} mode={artSourceMode} onModeChange={setArtSourceMode} onChange={update} />
          </CollapsibleSection>

          <CollapsibleSection title="Art Transform">
            <div className="grid-3">
              <Field label="Position X">
                <input type="number" min="-200" max="200" value={draft.artPositionX} placeholder="0" onChange={(event) => update({ artPositionX: event.target.value })} />
              </Field>
              <Field label="Position Y">
                <input type="number" min="-200" max="200" value={draft.artPositionY} placeholder="0" onChange={(event) => update({ artPositionY: event.target.value })} />
              </Field>
              <Field label="Scale">
                <input type="number" min="25" max="400" value={draft.artScale} placeholder="100" onChange={(event) => update({ artScale: event.target.value })} />
              </Field>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Crop" defaultOpen={false}>
            <div className="grid-2">
              <Field label="Crop X">
                <input type="number" min="0" max="100" value={draft.artCropX} placeholder="0" onChange={(event) => update({ artCropX: event.target.value })} />
              </Field>
              <Field label="Crop Y">
                <input type="number" min="0" max="100" value={draft.artCropY} placeholder="0" onChange={(event) => update({ artCropY: event.target.value })} />
              </Field>
              <Field label="Crop W">
                <input type="number" min="1" max="100" value={draft.artCropW} placeholder="100" onChange={(event) => update({ artCropW: event.target.value })} />
              </Field>
              <Field label="Crop H">
                <input type="number" min="1" max="100" value={draft.artCropH} placeholder="100" onChange={(event) => update({ artCropH: event.target.value })} />
              </Field>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Foil / Finish">
            <Field label="Treatment">
              <select value={draft.foilTreatment} onChange={(event) => update({ foilTreatment: event.target.value as CardDraft['foilTreatment'] })}>
                <option value="none">Standard</option>
                <option value="foil">Foil</option>
                <option value="etched">Etched</option>
                <option value="showcase">Showcase</option>
              </select>
            </Field>
          </CollapsibleSection>
        </div>
      ) : null}

      {activeTab === 'preview' ? (
        <div id={inspectorPanelId('preview')} role="tabpanel" aria-labelledby={inspectorTabId('preview')} className="inspector-tab-panel">
          <CollapsibleSection title="Render Check">
            <p className="inventory-note">{preview?.warnings[0] ?? `${selectedFrame.label} is active for ${draft.name}.`}</p>
          </CollapsibleSection>
          {preview?.powerAssessment ? <PowerEstimatePanel assessment={preview.powerAssessment} /> : null}
          <CollapsibleSection title="Linked References" defaultOpen={Boolean(linkedReferences.length)}>
            <LinkedReferenceChips links={linkedReferences} showHeading={false} emptyMessage="No linked rules, flavor, type, or mana references found yet." />
          </CollapsibleSection>
          <CollapsibleSection title="Review Metadata">
            <div className="grid-2">
              <Field label="Status">
                <select value={draft.status} onChange={(event) => update({ status: event.target.value as CardDraft['status'] })}>
                  {CARD_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tags">
                <TagEditor value={draft.tags} suggestions={tagSuggestions} placeholder="needs_review, token, commander" ariaLabel="Card tags" onChange={(tags) => update({ tags })} />
              </Field>
            </div>
            <Field label="Notes">
              <textarea value={draft.notes} rows={4} onChange={(event) => update({ notes: event.target.value })} />
            </Field>
          </CollapsibleSection>
          <CollapsibleSection title="Variants" defaultOpen={false}>
            <div className="grid-2">
              <Field label="Active variant">
                <select value={draft.variantId} onChange={(event) => onVariantChange?.(event.target.value)}>
                  {draft.variantSummaries.map((variant) => (
                    <option key={variant.variantId} value={variant.variantId}>
                      {variant.isPrimary ? '* ' : ''}{variant.displayName}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Name">
                <input value={draft.variantDisplayName} onChange={(event) => update({ variantDisplayName: event.target.value })} />
              </Field>
            </div>
            <div className="grid-2">
              <Field label="Kind">
                <select value={draft.variantKind} onChange={(event) => update({ variantKind: event.target.value as CardDraft['variantKind'] })}>
                  <option value="mechanics_test">Mechanics test</option>
                  <option value="wording_test">Wording test</option>
                  <option value="visual_alternate">Visual alternate</option>
                  <option value="finish_alternate">Finish alternate</option>
                  <option value="print_alternate">Print alternate</option>
                  <option value="history_snapshot">History snapshot</option>
                </select>
              </Field>
              <Field label="Status">
                <select value={draft.variantStatus} onChange={(event) => update({ variantStatus: event.target.value as CardDraft['variantStatus'] })}>
                  <option value="active">Active</option>
                  <option value="testing">Testing</option>
                  <option value="final">Final</option>
                  <option value="archived">Archived</option>
                </select>
              </Field>
            </div>
            <div className="grid-2">
              <Field label="Export">
                <select value={draft.variantExportPolicy} onChange={(event) => update({ variantExportPolicy: event.target.value as CardDraft['variantExportPolicy'] })}>
                  <option value="default">Default export</option>
                  <option value="optional">Optional</option>
                  <option value="excluded">Excluded</option>
                </select>
              </Field>
              <Field label="Variant tags">
                <TagEditor value={draft.variantTags} suggestions={tagSuggestions} placeholder="playtest, alt-art" ariaLabel="Variant tags" onChange={(variantTags) => update({ variantTags })} />
              </Field>
            </div>
            <Field label="Variant notes">
              <textarea value={draft.variantNotes} rows={3} onChange={(event) => update({ variantNotes: event.target.value })} />
            </Field>
            <div className="inline-action-row">
              <button type="button" className="secondary-button" disabled={draft.variantIsPrimary} onClick={() => saveVariantPatch({ variantIsPrimary: true, variantStatus: draft.variantStatus === 'archived' ? 'active' : draft.variantStatus })}>
                Set Primary
              </button>
              {draft.variantStatus === 'archived' ? (
                <button type="button" className="secondary-button" onClick={() => saveVariantPatch({ variantStatus: 'active' })}>
                  Restore
                </button>
              ) : (
                <button type="button" className="secondary-button" onClick={() => saveVariantPatch({ variantStatus: 'archived', variantExportPolicy: 'excluded' })}>
                  Archive
                </button>
              )}
              <button type="button" className="primary-button" onClick={() => onSaveVariant?.(draft)}>
                Save Variant
              </button>
            </div>
          </CollapsibleSection>
        </div>
      ) : null}
    </aside>
  );
}

function inspectorTabId(tab: InspectorTab): string {
  return `inspector-tab-${tab}`;
}

function inspectorPanelId(tab: InspectorTab): string {
  return `inspector-panel-${tab}`;
}

function PowerEstimatePanel({ assessment }: { assessment: NonNullable<PreviewResponse['powerAssessment']> }) {
  const topContributions = assessment.contributions
    .filter((contribution) => contribution.kind !== 'allowance' && contribution.points !== 0)
    .sort((a, b) => Math.abs(b.points) - Math.abs(a.points))
    .slice(0, 6);
  return (
    <CollapsibleSection title="Power Estimate">
      <div className={`power-estimate-card ${assessment.label.toLowerCase().replace(/\s+/g, '-')}`}>
        <div className="power-estimate-score">
          <strong>{assessment.score}</strong>
          <span>{assessment.label}</span>
        </div>
        <div className="power-estimate-metrics">
          <span>Confidence {Math.round(assessment.confidence * 100)}%</span>
          <span>Budget {assessment.allowedBudget}</span>
          <span>Effects {assessment.effectValue}</span>
          <span>Delta {formatSigned(assessment.balanceDelta)}</span>
        </div>
      </div>
      <div className="power-recommendations">
        {assessment.recommendations.slice(0, 3).map((recommendation) => (
          <p key={`${recommendation.action}-${recommendation.message}`} className={`power-recommendation ${recommendation.priority}`}>
            <strong>{recommendationPriorityLabel(recommendation.priority)}</strong>
            <span>{recommendation.message}</span>
          </p>
        ))}
      </div>
      {topContributions.length ? (
        <div className="power-breakdown" aria-label="Power contribution breakdown">
          {topContributions.map((contribution) => (
            <div key={contribution.id} className="power-breakdown-row">
              <span>{contribution.label}</span>
              <strong>{formatSigned(contribution.points)}</strong>
            </div>
          ))}
        </div>
      ) : null}
      {assessment.coverageGaps.length ? (
        <div className="power-gap-list" aria-label="Power coverage gaps">
          <strong>{assessment.coverageGaps.length} terms need review</strong>
          {assessment.coverageGaps.slice(0, 5).map((gap) => (
            <span key={`${gap.termId}-${gap.sourceField ?? ''}`}>{gap.label}</span>
          ))}
        </div>
      ) : null}
    </CollapsibleSection>
  );
}

function collectTagSuggestions(project: EditorProject, draft: CardDraft): string[] {
  return [
    ...project.cards.flatMap((card) => [...card.tags, ...card.variants.flatMap((variant) => variant.tags)]),
    ...project.drafts.flatMap((candidate) => [...candidate.tags, ...candidate.variantTags]),
    ...draft.tags,
    ...draft.variantTags
  ];
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function recommendationPriorityLabel(priority: 'low' | 'medium' | 'high'): string {
  if (priority === 'high') {
    return 'Act';
  }
  if (priority === 'medium') {
    return 'Watch';
  }
  return 'Note';
}

interface RuleSuggestion {
  id: string;
  name: string;
  category: string;
  detail: string;
  insertText: string;
}

function RulesTextControls({
  project,
  draft,
  referenceCatalog,
  linkedReferences,
  onChange
}: {
  project: EditorProject;
  draft: CardDraft;
  referenceCatalog: ReferenceCatalog | null;
  linkedReferences: ExtractedReferenceLink[];
  onChange: (patch: Partial<CardDraft>) => void;
}) {
  const [promptOpen, setPromptOpen] = useState(false);
  const [dismissPrompt, setDismissPrompt] = useState(false);
  const [promptedCardId, setPromptedCardId] = useState('');
  const [activeTrigger, setActiveTrigger] = useState<RuleTrigger | null>(null);
  const [syntaxHelpOpen, setSyntaxHelpOpen] = useState(false);
  const [activeReferenceLink, setActiveReferenceLink] = useState<ExtractedReferenceLink | null>(null);
  const [referenceDetailsOpen, setReferenceDetailsOpen] = useState(false);
  const [referenceActionMessage, setReferenceActionMessage] = useState('');
  const lintFindings = useMemo<RulesLintFinding[]>(() => {
    if (!referenceCatalog) {
      return [];
    }
    return lintRulesText(draft, referenceCatalog);
  }, [draft, referenceCatalog]);
  const suggestions = useMemo<RuleSuggestion[]>(() => {
    if (!activeTrigger) {
      return [];
    }
    if (activeTrigger.trigger === '!') {
      return project.cards
        .filter((card) => card.name.toLowerCase().includes(activeTrigger.query.toLowerCase()))
        .slice(0, 12)
        .map((card) => ({ id: card.cardId, name: card.name, category: 'card name', detail: card.typeLine, insertText: card.name }));
    }
    if (!referenceCatalog) {
      return [];
    }
    return termsForTrigger(referenceCatalog, activeTrigger.trigger, activeTrigger.query).map(termToSuggestion);
  }, [activeTrigger, project.cards, referenceCatalog]);
  const referenceTermById = useMemo(() => new Map((referenceCatalog?.terms ?? []).map((term) => [term.id, term])), [referenceCatalog]);
  const activeReferenceTerm = activeReferenceLink?.kind === 'reference-term' ? referenceTermById.get(activeReferenceLink.id) : undefined;

  const updateText = (patch: Partial<CardDraft>, trigger?: RuleTrigger | null) => {
    onChange(patch);
    setActiveTrigger(trigger ?? null);
    if (patch.oracleText !== undefined || patch.flavorText !== undefined) {
      setActiveReferenceLink(null);
      setReferenceActionMessage('');
    }
    if (draft.rulesTextSize.trim() && promptedCardId !== draft.cardId && !isTextSizePromptDismissed()) {
      setPromptOpen(true);
      setPromptedCardId(draft.cardId);
    }
  };

  const closePrompt = (useAutoSize: boolean) => {
    if (dismissPrompt) {
      dismissTextSizePrompt();
    }
    setPromptOpen(false);
    if (useAutoSize) {
      onChange({ rulesTextSize: '' });
    }
  };
  const handleLinkedSelection = (selection: LinkedTextSelection) => {
    const sourceText = textForReferenceField(draft, selection.sourceField);
    const trigger = selection.sourceField === 'oracleText' ? extractRuleTrigger(sourceText, selection.selectionEnd) : null;
    setActiveTrigger(trigger);
    const link = trigger ? null : findLinkAtSelection(linkedReferences, selection);
    setActiveReferenceLink(link);
    setReferenceDetailsOpen(false);
    setReferenceActionMessage('');
  };
  const insertActiveReminder = () => {
    if (!activeReferenceLink || (activeReferenceLink.sourceField !== 'oracleText' && activeReferenceLink.sourceField !== 'flavorText')) {
      return;
    }
    const sourceText = textForReferenceField(draft, activeReferenceLink.sourceField);
    const result = insertReferenceReminderText(sourceText, activeReferenceLink, activeReferenceTerm);
    if (result.status === 'inserted') {
      updateText({ [activeReferenceLink.sourceField]: result.text } as Partial<CardDraft>, null);
      setActiveReferenceLink(null);
      setReferenceActionMessage('');
      return;
    }
    setReferenceActionMessage(result.status === 'already-present' ? 'Reminder text is already present after this term.' : 'No reminder text is available for this reference yet.');
  };
  const copyActiveReminder = () => {
    const reminderText = activeReferenceTerm?.reminderText?.trim();
    if (!reminderText || !navigator.clipboard) {
      setReferenceActionMessage('No reminder text is available to copy.');
      return;
    }
    void navigator.clipboard
      .writeText(reminderText)
      .then(() => setReferenceActionMessage('Reminder text copied.'))
      .catch(() => setReferenceActionMessage('Could not copy reminder text from this browser context.'));
  };

  return (
    <>
      {promptOpen ? (
        <div className="inline-prompt" role="dialog" aria-label="Manual text size prompt">
          <strong>Manual text size is active.</strong>
          <p>Use auto sizing after this edit, or keep the current manual text size?</p>
          <label className="checkbox-row">
            <input type="checkbox" checked={dismissPrompt} onChange={(event) => setDismissPrompt(event.target.checked)} />
            Do not ask again
          </label>
          <div className="inline-prompt-actions">
            <button type="button" className="secondary-button" onClick={() => closePrompt(false)}>
              Keep Manual
            </button>
            <button type="button" className="primary-button" onClick={() => closePrompt(true)}>
              Use Auto Size
            </button>
          </div>
        </div>
      ) : null}
      <Field label="Rules text">
        <div className="rules-syntax-toggle-row">
          <button type="button" className="secondary-button compact" onClick={() => setSyntaxHelpOpen((open) => !open)} aria-expanded={syntaxHelpOpen} aria-controls="rules-syntax-guide">
            {syntaxHelpOpen ? 'Hide Syntax' : 'Show Syntax'}
          </button>
        </div>
        {syntaxHelpOpen ? <RulesSyntaxGuide /> : null}
        <div className="rules-text-field">
          <LinkedTextArea
            value={draft.oracleText}
            rows={5}
            links={linkedReferences}
            sourceField="oracleText"
            activeLink={activeReferenceLink}
            ariaLabel="Rules text"
            onBlur={() => window.setTimeout(() => setActiveTrigger(null), 140)}
            onChange={(event) => {
              const cursor = event.currentTarget.selectionStart ?? event.currentTarget.value.length;
              updateText({ oracleText: event.currentTarget.value }, extractRuleTrigger(event.currentTarget.value, cursor));
            }}
            onSelectionChange={handleLinkedSelection}
          />
          {suggestions.length ? (
            <div className="rules-suggest-menu" role="listbox" aria-label="Rules text suggestions">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  role="option"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    if (!activeTrigger) {
                      return;
                    }
                    updateText({ oracleText: replaceActiveTrigger(draft.oracleText, activeTrigger, suggestion.insertText) }, null);
                  }}
                >
                  <strong>{suggestion.name}</strong>
                  <span>{suggestion.category}</span>
                  <small>{suggestion.detail}</small>
                </button>
              ))}
            </div>
          ) : null}
          {activeReferenceLink?.sourceField === 'oracleText' ? (
            <ReferenceLinkActionPanel
              link={activeReferenceLink}
              term={activeReferenceTerm}
              detailsOpen={referenceDetailsOpen}
              message={referenceActionMessage}
              onInsertReminder={insertActiveReminder}
              onCopyReminder={copyActiveReminder}
              onToggleDetails={() => setReferenceDetailsOpen((open) => !open)}
              onClose={() => setActiveReferenceLink(null)}
            />
          ) : null}
        </div>
      </Field>
      {lintFindings.length ? (
        <div className="rules-lint-list" aria-label="Rules text notes">
          {lintFindings.map((finding) => (
            <p key={`${finding.ruleId}-${finding.term ?? ''}`} className={`rules-lint ${finding.severity}`}>
              <strong>{finding.severity}</strong>
              <span>{finding.message}</span>
            </p>
          ))}
        </div>
      ) : null}
      <Field label="Flavor text">
        <div className="rules-text-field">
          <LinkedTextArea
            value={draft.flavorText}
            rows={3}
            links={linkedReferences}
            sourceField="flavorText"
            activeLink={activeReferenceLink}
            ariaLabel="Flavor text"
            onChange={(event) => updateText({ flavorText: event.target.value })}
            onSelectionChange={handleLinkedSelection}
          />
          {activeReferenceLink?.sourceField === 'flavorText' ? (
            <ReferenceLinkActionPanel
              link={activeReferenceLink}
              term={activeReferenceTerm}
              detailsOpen={referenceDetailsOpen}
              message={referenceActionMessage}
              onInsertReminder={insertActiveReminder}
              onCopyReminder={copyActiveReminder}
              onToggleDetails={() => setReferenceDetailsOpen((open) => !open)}
              onClose={() => setActiveReferenceLink(null)}
            />
          ) : null}
        </div>
      </Field>
    </>
  );
}

function textForReferenceField(draft: CardDraft, field: ExtractedReferenceLink['sourceField']): string {
  switch (field) {
    case 'oracleText':
      return draft.oracleText;
    case 'flavorText':
      return draft.flavorText;
    case 'typeLine':
      return buildTypeLine(draft);
    case 'manaCost':
      return draft.manaCost;
  }
}

interface RuleTrigger {
  trigger: '@' | '#' | ':' | '!';
  start: number;
  end: number;
  query: string;
}

function RulesSyntaxGuide() {
  return (
    <div id="rules-syntax-guide" className="rules-syntax-guide">
      <div>
        <strong>Reference shortcuts</strong>
        <ul>
          <li>
            <code>@</code> keyword abilities, ability words, and homebrew mechanics.
          </li>
          <li>
            <code>#</code> keyword actions and action phrases.
          </li>
          <li>
            <code>:</code> card types, supertypes, subtypes, tokens, and counters.
          </li>
          <li>
            <code>!</code> active-set card names.
          </li>
        </ul>
      </div>
      <div>
        <strong>Rules and flavor syntax</strong>
        <ul>
          <li>
            Mana and symbols use braces: <code>{'{X}{2}{R}'}</code>, <code>{'{T}'}</code>.
          </li>
          <li>
            Hybrid and Phyrexian forms use slashes: <code>{'{2/W}{U/B}'}</code>, <code>{'{1/P}{G/P}'}</code>.
          </li>
          <li>
            <code>~</code> renders as this card&apos;s name.
          </li>
          <li>
            <code>{'<i>Ability Word</i>'}</code> renders inline italics; parenthetical text italicizes automatically.
          </li>
          <li>
            In flavor text, <code>*word*</code> de-emphasizes text.
          </li>
          <li>
            <code>\\</code> forces a new card-text line.
          </li>
        </ul>
      </div>
      <p>Mana cost accepts compact input such as <code>2WU</code>; rules and flavor require braces so ordinary letters stay ordinary text.</p>
    </div>
  );
}

function LinkedReferenceChips({ links, showHeading = true, emptyMessage }: { links: ExtractedReferenceLink[]; showHeading?: boolean; emptyMessage?: string }) {
  if (!links.length && !emptyMessage) {
    return null;
  }
  return (
    <div className="linked-reference-panel" aria-label="Linked rules references">
      {showHeading ? (
        <div className="linked-reference-heading">
          <strong>Linked references</strong>
          <span>{links.length} found</span>
        </div>
      ) : null}
      {links.length ? (
        <div className="linked-reference-chips">
          {links.map((link) => (
            <span
              key={`${link.kind}-${link.id}-${link.sourceField}-${link.start}`}
              className={`linked-reference-chip ${link.kind === 'card' ? 'card-link' : ''} ${link.workflowStatus === 'draft' ? 'draft-link' : ''}`}
              title={`${fieldLabel(link.sourceField)} matched "${link.matchedText}"`}
            >
              <strong>{link.label}</strong>
              <small>{link.category === 'card' ? 'card' : link.category.replace(/-/g, ' ')}</small>
            </span>
          ))}
        </div>
      ) : (
        <p className="linked-reference-empty">{emptyMessage}</p>
      )}
    </div>
  );
}

function ReferenceLinkActionPanel({
  link,
  term,
  detailsOpen,
  message,
  onInsertReminder,
  onCopyReminder,
  onToggleDetails,
  onClose
}: {
  link: ExtractedReferenceLink;
  term: ReferenceTerm | undefined;
  detailsOpen: boolean;
  message: string;
  onInsertReminder: () => void;
  onCopyReminder: () => void;
  onToggleDetails: () => void;
  onClose: () => void;
}) {
  const reminderText = formatReminderText(term?.reminderText);
  const categoryLabel = link.category === 'card' ? 'card' : link.category.replace(/-/g, ' ');
  const summary = reminderText ?? term?.definition ?? (link.kind === 'card' ? 'Linked active-set card.' : 'Reference metadata is available, but reminder text is not loaded yet.');
  return (
    <div className="reference-link-action-panel" role="dialog" aria-label={`${link.label} reference actions`}>
      <div className="reference-link-action-heading">
        <span>
          <strong>{link.label}</strong>
          <small>{categoryLabel}</small>
        </span>
        <button type="button" className="secondary-button compact" onMouseDown={(event) => event.preventDefault()} onClick={onClose}>
          Close
        </button>
      </div>
      <p>{summary}</p>
      <div className="reference-link-action-buttons">
        <button type="button" className="primary-button" disabled={!reminderText} onMouseDown={(event) => event.preventDefault()} onClick={onInsertReminder}>
          Insert Reminder
        </button>
        <button type="button" className="secondary-button" disabled={!reminderText} onMouseDown={(event) => event.preventDefault()} onClick={onCopyReminder}>
          Copy
        </button>
        <button type="button" className="secondary-button" disabled={!term} onMouseDown={(event) => event.preventDefault()} onClick={onToggleDetails}>
          {detailsOpen ? 'Hide Details' : 'View Term'}
        </button>
      </div>
      {message ? <small className="reference-link-action-message">{message}</small> : null}
      {detailsOpen && term ? (
        <dl className="reference-link-action-details">
          <dt>Status</dt>
          <dd>{term.workflowStatus === 'draft' ? `${term.status} / draft` : term.status}</dd>
          <dt>Source</dt>
          <dd>{term.source}</dd>
          {term.definition ? (
            <>
              <dt>Definition</dt>
              <dd>{term.definition}</dd>
            </>
          ) : null}
          {term.aliases.length ? (
            <>
              <dt>Aliases</dt>
              <dd>{term.aliases.slice(0, 6).join(', ')}</dd>
            </>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}

function fieldLabel(field: ExtractedReferenceLink['sourceField']): string {
  switch (field) {
    case 'oracleText':
      return 'Rules text';
    case 'flavorText':
      return 'Flavor text';
    case 'typeLine':
      return 'Type line';
    case 'manaCost':
      return 'Mana cost';
  }
}

function extractRuleTrigger(value: string, cursor: number): RuleTrigger | null {
  const beforeCursor = value.slice(0, cursor);
  const match = beforeCursor.match(/(^|[\s([{])([@#:!])([A-Za-z0-9' -]{0,40})$/);
  if (!match || !match[2]) {
    return null;
  }
  const prefixLength = match[1]?.length ?? 0;
  const matchedText = match[0] ?? '';
  const start = cursor - matchedText.length + prefixLength;
  return { trigger: match[2] as RuleTrigger['trigger'], start, end: cursor, query: match[3] ?? '' };
}

function replaceActiveTrigger(value: string, trigger: RuleTrigger, insertText: string): string {
  return `${value.slice(0, trigger.start)}${insertText}${value.slice(trigger.end)}`;
}

function termToSuggestion(term: ReferenceTerm): RuleSuggestion {
  return {
    id: term.id,
    name: term.name,
    category: term.category.replace(/-/g, ' '),
    detail: term.reminderText ?? term.definition ?? term.source,
    insertText: term.name
  };
}

function TextLayoutControls({ draft, onChange }: { draft: CardDraft; onChange: (patch: Partial<CardDraft>) => void }) {
  const manual = draft.rulesTextSize.trim() !== '';
  return (
    <>
      <div className="grid-2">
        <Field label="Rules text size">
          <input type="number" min="13" max="60" step="0.5" value={draft.rulesTextSize} placeholder="Auto" title={manual ? 'Manual text size is active.' : 'Leave blank to auto-size rules text.'} onChange={(event) => onChange({ rulesTextSize: event.target.value })} />
        </Field>
        <div className="field">
          <label title="Fit text to the rules box.">Auto size</label>
          <button type="button" className="secondary-button" disabled={!manual} onClick={() => onChange({ rulesTextSize: '' })}>
            Re-enable Auto
          </button>
        </div>
      </div>
      <div className="grid-4">
        <Field label="Top padding">
          <input type="number" min="-18" max="64" value={draft.rulesTextPaddingTop} placeholder="0" onChange={(event) => onChange({ rulesTextPaddingTop: event.target.value })} />
        </Field>
        <Field label="Right padding">
          <input type="number" min="-24" max="64" value={draft.rulesTextPaddingRight} placeholder="0" onChange={(event) => onChange({ rulesTextPaddingRight: event.target.value })} />
        </Field>
        <Field label="Bottom padding">
          <input type="number" min="-18" max="64" value={draft.rulesTextPaddingBottom} placeholder="0" onChange={(event) => onChange({ rulesTextPaddingBottom: event.target.value })} />
        </Field>
        <Field label="Left padding">
          <input type="number" min="-24" max="64" value={draft.rulesTextPaddingLeft} placeholder="0" onChange={(event) => onChange({ rulesTextPaddingLeft: event.target.value })} />
        </Field>
      </div>
    </>
  );
}

function PlaneswalkerAbilityControls({ draft, onChange }: { draft: CardDraft; onChange: (patch: Partial<CardDraft>) => void }) {
  const count = Number(draft.planeswalkerAbilityCount);
  const abilities = [
    ['planeswalkerAbility1Cost', 'planeswalkerAbility1Text', 'Ability 1'],
    ['planeswalkerAbility2Cost', 'planeswalkerAbility2Text', 'Ability 2'],
    ['planeswalkerAbility3Cost', 'planeswalkerAbility3Text', 'Ability 3'],
    ['planeswalkerAbility4Cost', 'planeswalkerAbility4Text', 'Ability 4']
  ] as const;
  return (
    <>
      <Field label="Ability slots">
        <select value={draft.planeswalkerAbilityCount} onChange={(event) => onChange({ planeswalkerAbilityCount: event.target.value as CardDraft['planeswalkerAbilityCount'] })}>
          <option value="3">3 abilities</option>
          <option value="4">4 abilities</option>
        </select>
      </Field>
      {abilities.slice(0, count).map(([costKey, textKey, label]) => (
        <div key={label} className="planeswalker-ability-row">
          <Field label={`${label} cost`}>
            <input value={draft[costKey]} placeholder="+1" onChange={(event) => onChange({ [costKey]: event.target.value })} />
          </Field>
          <Field label={label}>
            <textarea value={draft[textKey]} rows={2} placeholder="Draw a card." onChange={(event) => onChange({ [textKey]: event.target.value })} />
          </Field>
        </div>
      ))}
      <Field label="Starting loyalty">
        <input value={draft.loyalty} placeholder="4" onChange={(event) => onChange({ loyalty: event.target.value })} />
      </Field>
    </>
  );
}

function ManaCostEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div className="mana-cost-editor" role="presentation" onClick={() => inputRef.current?.focus()}>
      <div className={`mana-cost-visual ${value.trim() ? '' : 'empty'}`} aria-hidden="true">
        <ManaCostSymbols value={value} empty="Type mana" />
      </div>
      <input
        ref={inputRef}
        className="mana-cost-native-input"
        value={value}
        aria-label="Mana cost"
        autoComplete="off"
        spellCheck={false}
        title="Type compact mana like 1W or braced mana like {1}{W}."
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function ColorIdentitySelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const current = cleanColorIdentity(value || 'C') || 'C';
  return (
    <div className="color-identity-select" onPointerEnter={() => preloadManaSymbols(['w', 'u', 'b', 'r', 'g', 'c'])} onBlur={() => window.setTimeout(() => setOpen(false), 120)}>
      <ManaSymbolPreloader />
      <button
        type="button"
        className="color-identity-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Color identity ${current}`}
        title={`Color identity ${current}`}
        onClick={() => setOpen((next) => !next)}
      >
        <ManaSymbolSet value={current} />
        <span className="color-identity-caret" aria-hidden="true">⌄</span>
      </button>
      <div className={`color-identity-menu ${open ? 'open' : ''}`} role="listbox" aria-label="Color identity options" aria-hidden={open ? undefined : 'true'}>
        {COLOR_IDENTITY_OPTIONS.map((identity) => (
          <button
            key={identity}
            type="button"
            role="option"
            aria-selected={identity === current}
            aria-label={identity}
            title={identity}
            tabIndex={open ? 0 : -1}
            className={identity === current ? 'active' : ''}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onChange(identity);
              setOpen(false);
            }}
          >
            <ManaSymbolSet value={identity} />
          </button>
        ))}
      </div>
    </div>
  );
}

function FrameBasicsControls({ project, draft, onChange }: { project: EditorProject; draft: CardDraft; onChange: (patch: Partial<CardDraft>) => void }) {
  const selectedFrame = inferFrame(draft, project.frames);
  const borderOptions = borderOptionsForFrame(selectedFrame, draft.borderColor);
  const frameOptions = frameStyleOptions(project.frames, draft);
  const selectedOverride = frameOptions.some((frame) => frame.id === draft.frameOverrideId) ? draft.frameOverrideId : 'auto';
  return (
    <>
      <div className="grid-2">
        <Field label="Rarity">
          <select value={draft.rarity} onChange={(event) => onChange({ rarity: event.target.value as CardDraft['rarity'] })}>
            {RARITIES.map((rarity) => (
              <option key={rarity} value={rarity}>
                {rarity}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Color identity">
          <ColorIdentitySelect value={cleanColorIdentity(draft.colorIndicator || draft.colors || 'C')} onChange={(value) => onChange({ colorIndicator: value })} />
        </Field>
        <Field label="Frame style">
          <select value={selectedOverride} title="Normal follows the type line. Choose an alternate only when this card needs a special frame." onChange={(event) => onChange({ frameOverrideId: event.target.value })}>
            {frameOptions.map((frame) => (
              <option key={frame.id} value={frame.id}>
                {frameStyleLabel(frame)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Border">
          <select value={draft.borderColor} title="Border colors are filtered by the selected frame." onChange={(event) => onChange({ borderColor: event.target.value as CardDraft['borderColor'] })}>
            {borderOptions.map((border) => (
              <option key={border.value} value={border.value} disabled={!border.selectable} title={border.reason}>
                {border.selectable ? border.label : `${border.label} - unavailable`}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </>
  );
}

function frameStyleOptions(frames: EditorProject['frames'], draft: CardDraft): EditorProject['frames'] {
  const types = new Set(draft.cardTypes);
  const base = frames.find((frame) => frame.id === 'auto') ?? frames[0];
  const selected = frames.find((frame) => frame.id === draft.frameOverrideId && frame.id !== 'auto');
  const options = frames.filter((frame) => {
    if (frame.id === 'auto') {
      return false;
    }
    if (AUTOMATIC_FRAME_IDS.has(frame.id)) {
      return false;
    }
    if (frame.id.startsWith('token') || frame.id === 'double-faced-token') {
      return true;
    }
    if (frame.id.startsWith('style-')) {
      return !frame.supportedTypes.length || frame.supportedTypes.some((type) => types.has(type));
    }
    if (frame.supportedTypes.length && !frame.supportedTypes.some((type) => types.has(type))) {
      return false;
    }
    return true;
  });
  return uniqueFrames([base, ...options, selected].filter(Boolean) as EditorProject['frames']);
}

function uniqueFrames(frames: EditorProject['frames']): EditorProject['frames'] {
  const seen = new Set<string>();
  return frames.filter((frame) => {
    if (seen.has(frame.id)) {
      return false;
    }
    seen.add(frame.id);
    return true;
  });
}

function frameStyleLabel(frame: EditorProject['frames'][number]): string {
  return frame.id === 'auto' ? 'Normal' : frame.label;
}

function ArtSourceControls({
  draft,
  mode,
  onModeChange,
  onChange
}: {
  draft: CardDraft;
  mode: 'upload' | 'url' | 'library';
  onModeChange: (mode: 'upload' | 'url' | 'library') => void;
  onChange: (patch: Partial<CardDraft>) => void;
}) {
  return (
    <>
      <div className="source-actions">
        <button type="button" className={mode === 'upload' ? 'secondary-button active' : 'secondary-button'} onClick={() => onModeChange('upload')}>
          Upload
        </button>
        <button type="button" className={mode === 'url' ? 'secondary-button active' : 'secondary-button'} onClick={() => onModeChange('url')}>
          From URL
        </button>
        <button type="button" className={mode === 'library' ? 'secondary-button active' : 'secondary-button'} onClick={() => onModeChange('library')}>
          Gallery
        </button>
      </div>
      {mode === 'upload' ? (
        <Field label="Upload image">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) {
                return;
              }
              const reader = new FileReader();
              reader.addEventListener('load', () => {
                onChange({ artDataUri: typeof reader.result === 'string' ? reader.result : undefined, artUrl: '', artFilePath: '' });
              });
              reader.readAsDataURL(file);
            }}
          />
        </Field>
      ) : null}
      {mode === 'url' ? (
        <Field label="Art URL">
          <input value={draft.artUrl} placeholder="https://..." onChange={(event) => onChange({ artUrl: event.target.value, artFilePath: '', artDataUri: undefined })} />
        </Field>
      ) : null}
      {mode === 'library' ? (
        <Field label="Gallery item">
          <input value={draft.artFilePath ? draft.artId : ''} placeholder="Choose from Gallery" onChange={(event) => onChange({ artId: event.target.value || draft.artId })} />
        </Field>
      ) : null}
      <Field label="Artist">
        <input value={draft.artist} onChange={(event) => onChange({ artist: event.target.value })} />
      </Field>
    </>
  );
}

function FrameSourceControls({
  mode,
  onModeChange
}: {
  mode: 'upload' | 'url' | 'library';
  onModeChange: (mode: 'upload' | 'url' | 'library') => void;
}) {
  return (
    <>
      <div className="source-actions">
        <button type="button" className={mode === 'upload' ? 'secondary-button active' : 'secondary-button'} onClick={() => onModeChange('upload')}>
          Upload
        </button>
        <button type="button" className={mode === 'url' ? 'secondary-button active' : 'secondary-button'} onClick={() => onModeChange('url')}>
          From URL
        </button>
        <button type="button" className={mode === 'library' ? 'secondary-button active' : 'secondary-button'} onClick={() => onModeChange('library')}>
          Gallery
        </button>
      </div>
      {mode === 'upload' ? (
        <Field label="Upload frame">
          <input type="file" accept="image/png,image/svg+xml" />
        </Field>
      ) : null}
      {mode === 'url' ? (
        <Field label="Frame URL">
          <input placeholder="https://..." />
        </Field>
      ) : null}
      {mode === 'library' ? (
        <Field label="Gallery frame">
          <input placeholder="Choose from Gallery" />
        </Field>
      ) : null}
    </>
  );
}

function parseTypeWords(value: string): string[] {
  return value
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const TEXT_SIZE_PROMPT_DISMISSED_KEY = 'homebrewForge.dismissManualTextSizePrompt';

function isTextSizePromptDismissed(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.localStorage.getItem(TEXT_SIZE_PROMPT_DISMISSED_KEY) === '1';
}

function dismissTextSizePrompt(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(TEXT_SIZE_PROMPT_DISMISSED_KEY, '1');
}

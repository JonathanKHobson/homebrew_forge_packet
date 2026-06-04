import type { CardDraft, EditorProject, PreviewResponse } from '../domain/editorTypes.js';
import type { InspectorTab } from '../domain/editorUiTypes.js';
import { BORDER_COLORS, CARD_TYPE_COMBOS, COLOR_IDENTITY_OPTIONS, COMMON_SUBTYPES, RARITIES, SUPERTYPES } from '../domain/magicTerms.js';
import { buildTypeLine, inferColors, inferFrame } from '../domain/frameRegistry.js';
import { CARD_STATUS_OPTIONS, joinTags, splitTagInput } from '../domain/filterTypes.js';
import { CollapsibleSection } from './CollapsibleSection.js';
import { Field } from './Field.js';
import { FillChooseField } from './FillChooseField.js';
import { Icon } from './Icon.js';
import { LinkedTextArea } from './LinkedTextArea.js';
import { findLinkAtSelection, formatReminderText, insertReferenceReminderText, type LinkedTextSelection } from '../domain/rulesTextReferenceActions.js';
import { useMemo, useState, type ReactNode } from 'react';
import { extractReferenceLinks, lintRulesText, termsForTrigger, type ExtractedReferenceLink, type ReferenceCatalog, type ReferenceTerm, type RulesLintFinding } from '@homebrew-forge/forge/reference';

interface InspectorProps {
  project: EditorProject | null;
  draft: CardDraft | null;
  preview: PreviewResponse | null;
  referenceCatalog: ReferenceCatalog | null;
  beforeSections?: ReactNode;
  activeTab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
  onChange: (draft: CardDraft) => void;
  onCollapse?: () => void;
}

export function Inspector({
  project,
  draft,
  preview,
  referenceCatalog,
  beforeSections,
  activeTab,
  onTabChange,
  onChange,
  onCollapse
}: InspectorProps) {
  const [artSourceMode, setArtSourceMode] = useState<'upload' | 'url' | 'library'>('library');
  const [frameSourceMode, setFrameSourceMode] = useState<'upload' | 'url' | 'library'>('library');
  if (!project || !draft) {
    return (
      <aside className="inspector">
        <div className="panel-heading">
          <h2>Inspector</h2>
          {onCollapse ? (
            <button type="button" className="panel-control-button" onClick={onCollapse} title="Hide inspector panel" aria-label="Hide inspector panel">
              <Icon name="collapseRight" />
            </button>
          ) : null}
        </div>
      </aside>
    );
  }

  const selectedFrame = inferFrame(draft, project.frames);
  const isPlaneswalker = draft.cardTypes.includes('Planeswalker');
  const hasPowerToughness = draft.cardTypes.includes('Creature') || draft.subtypes.toLowerCase().includes('vehicle');
  const update = (patch: Partial<CardDraft>) => {
    const next = { ...draft, ...patch };
    onChange({
      ...next,
      colors: inferColors(next.manaCost),
      typeLine: buildTypeLine(next)
    });
  };

  return (
    <aside className="inspector">
      <div className="panel-heading">
        <div>
          <h2>Inspector</h2>
          <p>{preview?.inferredFrame.label ?? selectedFrame.label}</p>
        </div>
        {onCollapse ? (
          <button type="button" className="panel-control-button" onClick={onCollapse} title="Hide inspector panel" aria-label="Hide inspector panel">
            <Icon name="collapseRight" />
          </button>
        ) : null}
      </div>

      <div className="inspector-tabs" role="tablist" aria-label="Inspector tabs">
        {(['card', 'frame', 'layout', 'preview'] as InspectorTab[]).map((tab) => (
          <button key={tab} type="button" className={activeTab === tab ? 'active' : ''} onClick={() => onTabChange(tab)}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'card' ? (
        <>
          <CollapsibleSection title="Identity" subtitle={`${draft.setCode} / ${draft.collectorNumber}`}>
            <div className="grid-2">
              <Field label="Set code" hint="3 letters">
                <input value={draft.setCode} maxLength={6} readOnly title="Move cards between sets from the Sets workspace." />
              </Field>
              <Field label="Language" hint="2 letters">
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

          <CollapsibleSection title="Name & Mana Cost" subtitle={draft.name}>
            <Field label="Name">
              <input value={draft.name} onChange={(event) => update({ name: event.target.value })} />
            </Field>
            <Field label="Mana cost" hint="{2}{W}{U}">
              <input value={draft.manaCost} onChange={(event) => update({ manaCost: event.target.value })} />
            </Field>
          </CollapsibleSection>

          <CollapsibleSection title="Type Line" subtitle={buildTypeLine(draft)}>
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

          <CollapsibleSection title="Rules" subtitle={isPlaneswalker ? `${draft.planeswalkerAbilityCount} loyalty abilities` : draft.oracleText ? 'Rules text active' : 'No rules yet'}>
            {isPlaneswalker ? <PlaneswalkerAbilityControls draft={draft} onChange={update} /> : <RulesTextControls project={project} draft={draft} referenceCatalog={referenceCatalog} onChange={update} />}
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

          <CollapsibleSection title="Frame" subtitle={`${draft.rarity} / ${selectedFrame.label}`}>
            <FrameBasicsControls project={project} draft={draft} onChange={update} />
          </CollapsibleSection>

          <CollapsibleSection title="Art" subtitle={draft.artist || 'No artist'}>
            <ArtSourceControls draft={draft} mode={artSourceMode} onModeChange={setArtSourceMode} onChange={update} />
          </CollapsibleSection>

          <CollapsibleSection title="Advanced Options" subtitle="Watermark and set symbol" defaultOpen={false}>
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
        </>
      ) : null}

      {activeTab === 'frame' ? (
        <>
          <CollapsibleSection title="Frame Source" subtitle={preview?.inferredFrame.label ?? selectedFrame.label}>
            <FrameBasicsControls project={project} draft={draft} onChange={update} />
            <FrameSourceControls mode={frameSourceMode} onModeChange={setFrameSourceMode} />
          </CollapsibleSection>
        </>
      ) : null}

      {activeTab === 'layout' ? (
        <>
          <CollapsibleSection title="Text Layout" subtitle={draft.rulesTextSize ? `${draft.rulesTextSize} pt manual` : 'Auto size'}>
            <TextLayoutControls draft={draft} onChange={update} />
          </CollapsibleSection>

          <CollapsibleSection title="Art Source" subtitle={draft.artist || 'No artist'}>
            <ArtSourceControls draft={draft} mode={artSourceMode} onModeChange={setArtSourceMode} onChange={update} />
          </CollapsibleSection>

          <CollapsibleSection title="Art Transform" subtitle="Position and scale">
            <div className="grid-3">
              <Field label="Position X" hint="-200 to 200">
                <input type="number" min="-200" max="200" value={draft.artPositionX} placeholder="0" onChange={(event) => update({ artPositionX: event.target.value })} />
              </Field>
              <Field label="Position Y" hint="-200 to 200">
                <input type="number" min="-200" max="200" value={draft.artPositionY} placeholder="0" onChange={(event) => update({ artPositionY: event.target.value })} />
              </Field>
              <Field label="Scale" hint="25-400">
                <input type="number" min="25" max="400" value={draft.artScale} placeholder="100" onChange={(event) => update({ artScale: event.target.value })} />
              </Field>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Crop" subtitle="Only used in crop mode" defaultOpen={false}>
            <div className="grid-2">
              <Field label="Crop X" hint="0-100">
                <input type="number" min="0" max="100" value={draft.artCropX} placeholder="0" onChange={(event) => update({ artCropX: event.target.value })} />
              </Field>
              <Field label="Crop Y" hint="0-100">
                <input type="number" min="0" max="100" value={draft.artCropY} placeholder="0" onChange={(event) => update({ artCropY: event.target.value })} />
              </Field>
              <Field label="Crop W" hint="1-100">
                <input type="number" min="1" max="100" value={draft.artCropW} placeholder="100" onChange={(event) => update({ artCropW: event.target.value })} />
              </Field>
              <Field label="Crop H" hint="1-100">
                <input type="number" min="1" max="100" value={draft.artCropH} placeholder="100" onChange={(event) => update({ artCropH: event.target.value })} />
              </Field>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Foil / Finish" subtitle={draft.foilTreatment === 'none' ? 'Standard' : draft.foilTreatment}>
            <Field label="Treatment">
              <select value={draft.foilTreatment} onChange={(event) => update({ foilTreatment: event.target.value as CardDraft['foilTreatment'] })}>
                <option value="none">Standard</option>
                <option value="foil">Foil</option>
                <option value="etched">Etched</option>
                <option value="showcase">Showcase</option>
              </select>
            </Field>
          </CollapsibleSection>
        </>
      ) : null}

      {activeTab === 'preview' ? (
        <>
          {beforeSections}
          <CollapsibleSection title="Preview Status" subtitle={preview?.warnings.length ? 'Warnings' : 'Ready'}>
            <p className="inventory-note">{preview?.warnings[0] ?? `${selectedFrame.label} is active for ${draft.name}.`}</p>
          </CollapsibleSection>
          {preview?.powerAssessment ? <PowerEstimatePanel assessment={preview.powerAssessment} /> : null}
          <CollapsibleSection title="Review Metadata" subtitle={`${draft.status} / ${draft.tags.length} tags`}>
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
                <input value={joinTags(draft.tags)} placeholder="needs_review, token, commander" onChange={(event) => update({ tags: splitTagInput(event.target.value) })} />
              </Field>
            </div>
            <Field label="Notes">
              <textarea value={draft.notes} rows={4} onChange={(event) => update({ notes: event.target.value })} />
            </Field>
          </CollapsibleSection>
        </>
      ) : null}
    </aside>
  );
}

function PowerEstimatePanel({ assessment }: { assessment: NonNullable<PreviewResponse['powerAssessment']> }) {
  const topContributions = assessment.contributions
    .filter((contribution) => contribution.kind !== 'allowance' && contribution.points !== 0)
    .sort((a, b) => Math.abs(b.points) - Math.abs(a.points))
    .slice(0, 6);
  return (
    <CollapsibleSection title="Power Estimate" subtitle={`${assessment.score} / ${assessment.label}`}>
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
  onChange
}: {
  project: EditorProject;
  draft: CardDraft;
  referenceCatalog: ReferenceCatalog | null;
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
  const linkedReferences = useMemo<ExtractedReferenceLink[]>(() => {
    if (!referenceCatalog) {
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
  }, [draft, project.cards, referenceCatalog]);
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
      <Field label="Rules text" hint="Use syntax for symbols and references">
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
      <LinkedReferenceChips links={linkedReferences} />
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

function LinkedReferenceChips({ links }: { links: ExtractedReferenceLink[] }) {
  if (!links.length) {
    return null;
  }
  return (
    <div className="linked-reference-panel" aria-label="Linked rules references">
      <div className="linked-reference-heading">
        <strong>Linked references</strong>
        <span>{links.length} found</span>
      </div>
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
        <Field label="Rules text size" hint={manual ? 'manual' : 'auto'}>
          <input type="number" min="13" max="60" step="0.5" value={draft.rulesTextSize} placeholder="Auto" onChange={(event) => onChange({ rulesTextSize: event.target.value })} />
        </Field>
        <div className="field">
          <label>
            Auto size
            <small>Fit text to box</small>
          </label>
          <button type="button" className="secondary-button" disabled={!manual} onClick={() => onChange({ rulesTextSize: '' })}>
            Re-enable Auto
          </button>
        </div>
      </div>
      <label className="toggle-row text-layout-toggle">
        <input
          type="checkbox"
          checked={draft.rulesTextReminderMode !== 'off'}
          onChange={(event) => onChange({ rulesTextReminderMode: event.target.checked ? 'auto' : 'off' })}
        />
        <span>
          Auto reminder text
          <small>Render linked term reminders only when they fit.</small>
        </span>
      </label>
      <div className="grid-4">
        <Field label="Top padding" hint="-18 to 64">
          <input type="number" min="-18" max="64" value={draft.rulesTextPaddingTop} placeholder="0" onChange={(event) => onChange({ rulesTextPaddingTop: event.target.value })} />
        </Field>
        <Field label="Right padding" hint="-24 to 64">
          <input type="number" min="-24" max="64" value={draft.rulesTextPaddingRight} placeholder="0" onChange={(event) => onChange({ rulesTextPaddingRight: event.target.value })} />
        </Field>
        <Field label="Bottom padding" hint="-18 to 64">
          <input type="number" min="-18" max="64" value={draft.rulesTextPaddingBottom} placeholder="0" onChange={(event) => onChange({ rulesTextPaddingBottom: event.target.value })} />
        </Field>
        <Field label="Left padding" hint="-24 to 64">
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

function FrameBasicsControls({ project, draft, onChange }: { project: EditorProject; draft: CardDraft; onChange: (patch: Partial<CardDraft>) => void }) {
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
        <Field label="Color identity" hint="Does not override mana frame">
          <input list="color-identity-options" value={draft.colorIndicator || draft.colors} onChange={(event) => onChange({ colorIndicator: cleanColorIdentity(event.target.value) })} />
        </Field>
        <Field label="Frame style">
          <select value={draft.frameOverrideId} onChange={(event) => onChange({ frameOverrideId: event.target.value })}>
            {frameStyleOptions(project.frames).map((frame) => (
              <option key={frame.id} value={frame.id}>
                {frame.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Border">
          <select value={draft.borderColor} onChange={(event) => onChange({ borderColor: event.target.value as CardDraft['borderColor'] })}>
            {BORDER_COLORS.map((border) => (
              <option key={border} value={border}>
                {border}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <datalist id="color-identity-options">
        {COLOR_IDENTITY_OPTIONS.map((identity) => (
          <option key={identity} value={identity} />
        ))}
      </datalist>
    </>
  );
}

function frameStyleOptions(frames: EditorProject['frames']): EditorProject['frames'] {
  return frames.filter((frame) => frame.id !== 'normal-spell');
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
          Library
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
        <Field label="Library item">
          <input value={draft.artFilePath ? draft.artId : ''} placeholder="Choose from Library" onChange={(event) => onChange({ artId: event.target.value || draft.artId })} />
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
          Library
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
        <Field label="Library frame">
          <input placeholder="Choose from Library" />
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

function cleanColorIdentity(value: string): string {
  return [...new Set(value.toUpperCase().replace(/[^WUBRGC]/g, '').split('').filter(Boolean))].join('');
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

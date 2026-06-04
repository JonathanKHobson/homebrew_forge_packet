import { useMemo, useRef, useState } from 'react';
import { buildTypeLine, inferColors } from '../../domain/frameRegistry.js';
import { CARD_TYPES, SUPERTYPES } from '../../domain/magicTerms.js';
import type { CardDraft, FrameOption } from '../../domain/editorTypes.js';
import type { CreateFlowStatus } from '../../domain/createFlowTypes.js';
import { CollapsibleSection } from '../CollapsibleSection.js';
import { Field } from '../Field.js';
import { Icon } from '../Icon.js';
import { OverlayShell } from '../overlays/OverlayShell.js';
import { CreateFlowStatusMessage } from './CreateFlowStatusMessage.js';

interface CreateCardOverlayProps {
  initialDraft: CardDraft;
  frames: FrameOption[];
  onCreateDraft: (draft: CardDraft) => Promise<void>;
  onStatus: (message: string) => void;
  onClose: () => void;
}

export function CreateCardOverlay({ initialDraft, frames, onCreateDraft, onStatus, onClose }: CreateCardOverlayProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState<CardDraft>({ ...initialDraft, creationStatus: 'draft', creationNotes: '' });
  const [flowState, setFlowState] = useState<CreateFlowStatus>('idle');
  const [error, setError] = useState('');
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify({ ...initialDraft, creationStatus: 'draft', creationNotes: '' }), [draft, initialDraft]);

  function update(next: Partial<CardDraft>) {
    setDraft((current) => normalizeDraft({ ...current, ...next }));
    setFlowState('dirty');
  }

  function updateTypeLine(typeLine: string) {
    update({ typeLine, ...parseTypeLine(typeLine) });
  }

  async function handleImportFile(file: File | undefined) {
    if (!file) {
      return;
    }
    try {
      const content = await file.text();
      const imported = file.name.toLowerCase().endsWith('.xml') ? parseSingleCardXml(content) : parseSingleCardCsv(content);
      update(imported);
      onStatus(`Loaded ${file.name} into the new card form.`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setError(message);
      setFlowState('error');
      onStatus(message);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function submit() {
    setFlowState('saving');
    setError('');
    try {
      await onCreateDraft(normalizeDraft(draft));
      setFlowState('saved');
      onClose();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setError(message);
      setFlowState('error');
      onStatus(message);
    }
  }

  const footer = (
    <>
      <input ref={fileInputRef} type="file" accept=".csv,.xml,text/csv,text/xml,application/xml" onChange={(event) => void handleImportFile(event.target.files?.[0])} hidden />
      <button type="button" className="secondary-button icon-label-button" onClick={() => fileInputRef.current?.click()}>
        <Icon name="download" />
        Import Card
      </button>
      <button type="button" className="secondary-button" onClick={onClose}>
        Cancel
      </button>
      <button type="button" className="primary-button" disabled={flowState === 'saving' || !draft.name.trim()} onClick={() => void submit()}>
        {flowState === 'saving' ? 'Creating...' : 'Create Draft'}
      </button>
    </>
  );

  return (
    <OverlayShell title="New Card" eyebrow="Create" subtitle="Capture the card information first; tune layout and crop after the draft exists." dirty={dirty && flowState !== 'saving'} footer={footer} onClose={onClose}>
      <CreateFlowStatusMessage state={flowState} error={error} />
      <div className="create-overlay-grid">
        <CollapsibleSection title="Identity" subtitle="Set placement and collection metadata">
          <div className="grid-3">
            <Field label="Set">
              <input value={`${draft.setCode} - ${draft.setName}`} readOnly />
            </Field>
            <Field label="Collector number">
              <input value={draft.collectorNumber} onChange={(event) => update({ collectorNumber: event.target.value })} />
            </Field>
            <Field label="Rarity">
              <select value={draft.rarity} onChange={(event) => update({ rarity: event.target.value as CardDraft['rarity'] })}>
                <option value="common">common</option>
                <option value="uncommon">uncommon</option>
                <option value="rare">rare</option>
                <option value="mythic">mythic</option>
                <option value="special">special</option>
              </select>
            </Field>
          </div>
          <div className="grid-2">
            <Field label="Designer">
              <input value={draft.designer} onChange={(event) => update({ designer: event.target.value })} />
            </Field>
            <Field label="Language">
              <input value={draft.language} onChange={(event) => update({ language: event.target.value })} />
            </Field>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Card Text" subtitle="Name, mana, type, rules, and flavor">
          <div className="grid-2">
            <Field label="Name">
              <input value={draft.name} onChange={(event) => update({ name: event.target.value })} />
            </Field>
            <Field label="Mana cost">
              <input value={draft.manaCost} placeholder="{1}{W}" onChange={(event) => update({ manaCost: event.target.value })} />
            </Field>
          </div>
          <Field label="Type line">
            <input value={buildTypeLine(draft)} placeholder="Creature - Human" onChange={(event) => updateTypeLine(event.target.value)} />
          </Field>
          <div className="grid-2">
            <Field label="Rules text">
              <textarea value={draft.oracleText} rows={6} onChange={(event) => update({ oracleText: event.target.value })} />
            </Field>
            <Field label="Flavor text">
              <textarea value={draft.flavorText} rows={6} onChange={(event) => update({ flavorText: event.target.value })} />
            </Field>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Stats" subtitle="Power, toughness, loyalty, and planeswalker text">
          <div className="grid-4">
            <Field label="Power">
              <input value={draft.power} onChange={(event) => update({ power: event.target.value })} />
            </Field>
            <Field label="Toughness">
              <input value={draft.toughness} onChange={(event) => update({ toughness: event.target.value })} />
            </Field>
            <Field label="Loyalty">
              <input value={draft.loyalty} onChange={(event) => update({ loyalty: event.target.value })} />
            </Field>
            <Field label="Abilities">
              <select value={draft.planeswalkerAbilityCount} onChange={(event) => update({ planeswalkerAbilityCount: event.target.value as CardDraft['planeswalkerAbilityCount'] })}>
                <option value="3">3 abilities</option>
                <option value="4">4 abilities</option>
              </select>
            </Field>
          </div>
          <div className="planeswalker-ability-row">
            <input aria-label="Ability one cost" value={draft.planeswalkerAbility1Cost} onChange={(event) => update({ planeswalkerAbility1Cost: event.target.value })} />
            <textarea aria-label="Ability one text" value={draft.planeswalkerAbility1Text} rows={2} onChange={(event) => update({ planeswalkerAbility1Text: event.target.value })} />
          </div>
          <div className="planeswalker-ability-row">
            <input aria-label="Ability two cost" value={draft.planeswalkerAbility2Cost} onChange={(event) => update({ planeswalkerAbility2Cost: event.target.value })} />
            <textarea aria-label="Ability two text" value={draft.planeswalkerAbility2Text} rows={2} onChange={(event) => update({ planeswalkerAbility2Text: event.target.value })} />
          </div>
          <div className="planeswalker-ability-row">
            <input aria-label="Ability three cost" value={draft.planeswalkerAbility3Cost} onChange={(event) => update({ planeswalkerAbility3Cost: event.target.value })} />
            <textarea aria-label="Ability three text" value={draft.planeswalkerAbility3Text} rows={2} onChange={(event) => update({ planeswalkerAbility3Text: event.target.value })} />
          </div>
          {draft.planeswalkerAbilityCount === '4' ? (
            <div className="planeswalker-ability-row">
              <input aria-label="Ability four cost" value={draft.planeswalkerAbility4Cost} onChange={(event) => update({ planeswalkerAbility4Cost: event.target.value })} />
              <textarea aria-label="Ability four text" value={draft.planeswalkerAbility4Text} rows={2} onChange={(event) => update({ planeswalkerAbility4Text: event.target.value })} />
            </div>
          ) : null}
        </CollapsibleSection>

        <CollapsibleSection title="Frame And Art" subtitle="Broad frame, art source, and finish">
          <div className="grid-3">
            <Field label="Frame">
              <select value={draft.frameOverrideId} onChange={(event) => updateFrame(event.target.value, frames, update)}>
                {frames.map((frame) => (
                  <option key={frame.id} value={frame.id}>
                    {frame.label} - {frame.family}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Layout">
              <select value={draft.layout} onChange={(event) => update({ layout: event.target.value as CardDraft['layout'] })}>
                <option value="normal">normal</option>
                <option value="token">token</option>
                <option value="saga">saga</option>
                <option value="class">class</option>
                <option value="case">case</option>
                <option value="battle">battle</option>
                <option value="modal_dfc">modal_dfc</option>
                <option value="plane">plane</option>
                <option value="scheme">scheme</option>
                <option value="phenomenon">phenomenon</option>
              </select>
            </Field>
            <Field label="Finish">
              <select value={draft.foilTreatment} onChange={(event) => update({ foilTreatment: event.target.value as CardDraft['foilTreatment'] })}>
                <option value="none">none</option>
                <option value="foil">foil</option>
                <option value="etched">etched</option>
                <option value="showcase">showcase</option>
              </select>
            </Field>
          </div>
          <div className="grid-2">
            <Field label="Art file path">
              <input value={draft.artFilePath} placeholder="sets/DEMO/art/example.png" onChange={(event) => update({ artFilePath: event.target.value, artUrl: event.target.value ? draft.artUrl : '' })} />
            </Field>
            <Field label="Art URL">
              <input value={draft.artUrl} placeholder="https://..." onChange={(event) => update({ artUrl: event.target.value })} />
            </Field>
          </div>
          <div className="grid-2">
            <Field label="Art ID">
              <input value={draft.artId} onChange={(event) => update({ artId: event.target.value })} />
            </Field>
            <Field label="Artist">
              <input value={draft.artist} onChange={(event) => update({ artist: event.target.value })} />
            </Field>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Status And Notes" subtitle="Creation metadata that saves with the draft">
          <div className="grid-2">
            <Field label="Status">
              <select value={draft.creationStatus ?? 'draft'} onChange={(event) => update({ creationStatus: event.target.value as CardDraft['creationStatus'] })}>
                <option value="draft">draft</option>
                <option value="idea">idea</option>
                <option value="review">review</option>
                <option value="playtest">playtest</option>
                <option value="final">final</option>
                <option value="cut">cut</option>
              </select>
            </Field>
            <Field label="Border">
              <select value={draft.borderColor} onChange={(event) => update({ borderColor: event.target.value as CardDraft['borderColor'] })}>
                <option value="black">black</option>
                <option value="white">white</option>
                <option value="silver">silver</option>
                <option value="gold">gold</option>
              </select>
            </Field>
          </div>
          <Field label="Notes">
            <textarea value={draft.creationNotes ?? ''} rows={4} onChange={(event) => update({ creationNotes: event.target.value })} />
          </Field>
        </CollapsibleSection>
      </div>
    </OverlayShell>
  );
}

function normalizeDraft(draft: CardDraft): CardDraft {
  return {
    ...draft,
    colors: inferColors(draft.manaCost) || draft.colors,
    typeLine: buildTypeLine(draft)
  };
}

function updateFrame(frameId: string, frames: FrameOption[], update: (next: Partial<CardDraft>) => void) {
  const frame = frames.find((candidate) => candidate.id === frameId);
  update({
    frameOverrideId: frameId,
    frameType: frame?.frameType,
    layout: frame?.layout
  });
}

function parseTypeLine(typeLine: string): Pick<CardDraft, 'supertypes' | 'cardTypes' | 'subtypes'> {
  const [left = '', right = ''] = typeLine.split(/\s+-\s+/, 2);
  const knownSupertypes = new Set(SUPERTYPES);
  const knownTypes = new Set(CARD_TYPES);
  const words = left.split(/\s+/).filter(Boolean);
  const cardTypes = words.filter((word) => knownTypes.has(word));
  return {
    supertypes: words.filter((word) => knownSupertypes.has(word)),
    cardTypes: cardTypes.length ? cardTypes : ['Creature'],
    subtypes: right
  };
}

function parseSingleCardCsv(content: string): Partial<CardDraft> {
  const rows = parseCsv(content);
  if (rows.length < 2) {
    throw new Error('CSV import needs a header row and at least one card row.');
  }
  const headers = rows[0].map(normalizeKey);
  const values = rows[1];
  const row = new Map(headers.map((header, index) => [header, values[index] ?? '']));
  return mappedCardFields(row);
}

function parseSingleCardXml(content: string): Partial<CardDraft> {
  const document = new DOMParser().parseFromString(content, 'application/xml');
  if (document.querySelector('parsererror')) {
    throw new Error('XML import could not be parsed.');
  }
  const card = document.querySelector('card') ?? document.documentElement;
  const row = new Map<string, string>([
    ['name', textFrom(card, 'name')],
    ['mana_cost', textFrom(card, 'manacost') || textFrom(card, 'mana_cost')],
    ['type_line', textFrom(card, 'type') || textFrom(card, 'type_line')],
    ['oracle_text', textFrom(card, 'text') || textFrom(card, 'oracle_text')],
    ['flavor_text', textFrom(card, 'flavor') || textFrom(card, 'flavor_text')],
    ['rarity', textFrom(card, 'rarity')],
    ['power', textFrom(card, 'power')],
    ['toughness', textFrom(card, 'toughness')],
    ['loyalty', textFrom(card, 'loyalty')],
    ['artist', textFrom(card, 'artist')],
    ['art_url', textFrom(card, 'art_url')]
  ]);
  const pt = textFrom(card, 'pt');
  if (pt.includes('/')) {
    const [power = '', toughness = ''] = pt.split('/', 2);
    row.set('power', power);
    row.set('toughness', toughness);
  }
  return mappedCardFields(row);
}

function mappedCardFields(row: Map<string, string>): Partial<CardDraft> {
  const typeLine = valueFor(row, ['type_line', 'typeline', 'type']);
  return {
    name: valueFor(row, ['name', 'card_name']) || undefined,
    manaCost: valueFor(row, ['mana_cost', 'manacost', 'cost']) || undefined,
    rarity: normalizedRarity(valueFor(row, ['rarity'])) as CardDraft['rarity'] | undefined,
    oracleText: valueFor(row, ['oracle_text', 'rules_text', 'text']) || undefined,
    flavorText: valueFor(row, ['flavor_text', 'flavor']) || undefined,
    power: valueFor(row, ['power']) || undefined,
    toughness: valueFor(row, ['toughness']) || undefined,
    loyalty: valueFor(row, ['loyalty']) || undefined,
    artUrl: valueFor(row, ['art_url', 'source_url', 'image_url']) || undefined,
    artFilePath: valueFor(row, ['art_file_path', 'file_path']) || undefined,
    artist: valueFor(row, ['artist', 'artist_display']) || undefined,
    creationNotes: valueFor(row, ['notes']) || undefined,
    ...(typeLine ? parseTypeLine(typeLine) : {})
  };
}

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let cell = '';
  let row: string[] = [];
  let quoted = false;
  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === ',' && !quoted) {
      row.push(cell.trim());
      cell = '';
      continue;
    }
    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') {
        index += 1;
      }
      row.push(cell.trim());
      if (row.some(Boolean)) {
        rows.push(row);
      }
      row = [];
      cell = '';
      continue;
    }
    cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) {
    rows.push(row);
  }
  return rows;
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function valueFor(row: Map<string, string>, keys: string[]): string {
  for (const key of keys) {
    const value = row.get(key);
    if (value?.trim()) {
      return value.trim();
    }
  }
  return '';
}

function normalizedRarity(value: string): string {
  const normalized = value.trim().toLowerCase();
  return normalized === 'mythic rare' ? 'mythic' : normalized;
}

function textFrom(element: Element, selector: string): string {
  return element.querySelector(selector)?.textContent?.trim() ?? '';
}

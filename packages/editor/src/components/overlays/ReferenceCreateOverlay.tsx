import { useMemo, useState } from 'react';
import { createReference } from '../../api/client.js';
import { Field } from '../Field.js';
import { TagEditor } from '../TagEditor.js';
import { OverlayShell } from './OverlayShell.js';
import {
  REFERENCE_CATEGORIES,
  type CreateReferenceRequest,
  type ReferenceCatalog,
  type ReferenceCategory,
  type ReferenceOrigin,
  type ReferenceStatus,
  type ReferenceSystem,
  type ReferenceTerm,
  type ReferenceWorkflowStatus
} from '@homebrew-forge/forge/reference';

interface ReferenceCreateOverlayProps {
  catalog: ReferenceCatalog | null;
  onCreated: (term: ReferenceTerm, catalog: ReferenceCatalog) => void;
  onStatus: (message: string) => void;
  onClose: () => void;
}

interface ReferenceFormState {
  name: string;
  category: ReferenceCategory;
  system: ReferenceSystem;
  origin: ReferenceOrigin;
  status: ReferenceStatus;
  workflowStatus: ReferenceWorkflowStatus;
  definition: string;
  reminderText: string;
  typicalColors: string;
  aliases: string;
  tags: string[];
  sourceNotes: string;
  parentType: string;
  ruleNumber: string;
  sourceSet: string;
  components: string;
  designNotes: string;
}

const CATEGORY_LABELS: Record<ReferenceCategory, string> = {
  'supertype': 'Supertype',
  'card-type': 'Card type',
  'subtype': 'Subtype',
  'keyword-ability': 'Keyword ability',
  'ability-word': 'Ability word',
  'keyword-action': 'Keyword action',
  'action-phrase': 'Action phrase',
  'token': 'Token',
  'counter': 'Counter',
  'mana-color': 'Mana color',
  'frame': 'Frame',
  'homebrew': 'Homebrew'
};

const STATUS_OPTIONS: ReferenceStatus[] = ['current', 'legacy', 'retired', 'casual', 'homebrew'];

const INITIAL_FORM: ReferenceFormState = {
  name: '',
  category: 'keyword-ability',
  system: 'magic',
  origin: 'homebrew',
  status: 'homebrew',
  workflowStatus: 'draft',
  definition: '',
  reminderText: '',
  typicalColors: '',
  aliases: '',
  tags: [],
  sourceNotes: '',
  parentType: '',
  ruleNumber: '',
  sourceSet: '',
  components: '',
  designNotes: ''
};

export function ReferenceCreateOverlay({ catalog, onCreated, onStatus, onClose }: ReferenceCreateOverlayProps) {
  const [form, setForm] = useState<ReferenceFormState>(INITIAL_FORM);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [importText, setImportText] = useState('');
  const duplicate = useMemo(() => {
    const name = form.name.trim().toLowerCase();
    return catalog?.terms.find((term) => term.category === form.category && term.name.toLowerCase() === name);
  }, [catalog?.terms, form.category, form.name]);
  const tagSuggestions = useMemo(() => catalog?.terms.flatMap((term) => term.tags) ?? [], [catalog?.terms]);

  const update = (patch: Partial<ReferenceFormState>) => {
    setForm((current) => ({ ...current, ...patch }));
    setDirty(true);
    setError('');
  };

  const save = async (workflowStatus: ReferenceWorkflowStatus) => {
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    if (duplicate) {
      setError(`A ${CATEGORY_LABELS[form.category].toLowerCase()} named "${form.name.trim()}" already exists.`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const request = buildRequest(form, workflowStatus);
      const result = await createReference(request);
      onCreated(result.term, result.catalog);
      onStatus(`Created ${workflowStatus} reference ${result.term.name}.`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : String(createError));
    } finally {
      setBusy(false);
    }
  };

  const previewImport = () => {
    try {
      update(parseImportSnippet(importText, form));
      onStatus('Loaded one reference into the create form for review.');
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : String(parseError));
    }
  };

  return (
    <OverlayShell
      title="New Reference"
      eyebrow="Reference"
      subtitle="Create an official, local, or homebrew term for rules text, card types, frames, and design notes."
      dirty={dirty}
      onClose={onClose}
      footer={(requestClose) => (
        <>
          <button type="button" className="secondary-button" disabled={busy} onClick={requestClose}>
            Cancel
          </button>
          <button type="button" className="secondary-button" disabled={busy || !form.name.trim()} onClick={() => void save('draft')}>
            Save Draft
          </button>
          <button type="button" className="primary-button" disabled={busy || !form.name.trim()} onClick={() => void save('final')}>
            Save Final
          </button>
        </>
      )}
    >
      <section className="create-overlay-section">
        <div className="create-section-heading">
          <span>Kind</span>
          <strong>{form.origin === 'official' ? 'Official/local reference' : 'Homebrew reference'}</strong>
        </div>
        <div className="create-overlay-grid">
          <Field label="Category">
            <select value={form.category} onChange={(event) => update({ category: event.target.value as ReferenceCategory })}>
              {REFERENCE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="System">
            <select value={form.system} onChange={(event) => update({ system: event.target.value as ReferenceSystem })}>
              <option value="magic">Magic: The Gathering</option>
              <option value="homebrew">Homebrew</option>
            </select>
          </Field>
          <Field label="Origin">
            <select
              value={form.origin}
              onChange={(event) => {
                const origin = event.target.value as ReferenceOrigin;
                update({ origin, status: origin === 'homebrew' ? 'homebrew' : 'current', system: origin === 'homebrew' ? 'homebrew' : 'magic' });
              }}
            >
              <option value="homebrew">Homebrew</option>
              <option value="official">Official/local note</option>
            </select>
          </Field>
          <Field label="Lifecycle">
            <select value={form.status} onChange={(event) => update({ status: event.target.value as ReferenceStatus })}>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section className="create-overlay-section">
        <div className="create-section-heading">
          <span>Core</span>
          <strong>{form.workflowStatus === 'draft' ? 'Draft by default' : 'Final by default'}</strong>
        </div>
        <div className="create-overlay-grid">
          <Field label="Name">
            <input value={form.name} placeholder="Flying, Metallivory, Vehicle..." onChange={(event) => update({ name: event.target.value })} />
          </Field>
          <Field label="Default state">
            <select value={form.workflowStatus} onChange={(event) => update({ workflowStatus: event.target.value as ReferenceWorkflowStatus })}>
              <option value="draft">Draft</option>
              <option value="final">Final</option>
            </select>
          </Field>
          <Field label="Typical colors" hint="W, U, B, R, G, C">
            <input value={form.typicalColors} placeholder="W, U" onChange={(event) => update({ typicalColors: event.target.value })} />
          </Field>
          <Field label="Aliases" hint="Comma separated">
            <input value={form.aliases} placeholder="702.9, fly" onChange={(event) => update({ aliases: event.target.value })} />
          </Field>
          <Field label="Definition">
            <textarea value={form.definition} rows={4} placeholder="Short rules-facing definition." onChange={(event) => update({ definition: event.target.value })} />
          </Field>
          <Field label="Reminder text">
            <textarea value={form.reminderText} rows={4} placeholder="Optional reminder text." onChange={(event) => update({ reminderText: event.target.value })} />
          </Field>
        </div>
      </section>

      <section className="create-overlay-section">
        <div className="create-section-heading">
          <span>Details</span>
          <strong>{CATEGORY_LABELS[form.category]}</strong>
        </div>
        <div className="create-overlay-grid">
          {showsRulesDetails(form.category) ? (
            <>
              <Field label="Rule number">
                <input value={form.ruleNumber} placeholder="702.9" onChange={(event) => update({ ruleNumber: event.target.value })} />
              </Field>
              <Field label="Source set">
                <input value={form.sourceSet} placeholder="Optional set or source" onChange={(event) => update({ sourceSet: event.target.value })} />
              </Field>
            </>
          ) : null}
          {showsTypeDetails(form.category) ? (
            <>
              <Field label="Parent type">
                <input value={form.parentType} placeholder="Artifact, Creature, Battle..." onChange={(event) => update({ parentType: event.target.value })} />
              </Field>
              <Field label="Components">
                <input value={form.components} placeholder="Defense, counters, token rules..." onChange={(event) => update({ components: event.target.value })} />
              </Field>
            </>
          ) : null}
          <Field label="Tags">
            <TagEditor value={form.tags} suggestions={tagSuggestions} placeholder="stargate, replicators, keyword" ariaLabel="Reference tags" onChange={(tags) => update({ tags })} />
          </Field>
          <Field label="Source notes">
            <input value={form.sourceNotes} placeholder="Where this came from or why it exists." onChange={(event) => update({ sourceNotes: event.target.value })} />
          </Field>
          <Field label="Design notes">
            <textarea value={form.designNotes} rows={3} placeholder="Balance notes, wording caveats, or future cleanup." onChange={(event) => update({ designNotes: event.target.value })} />
          </Field>
        </div>
      </section>

      <section className="create-overlay-section">
        <div className="create-section-heading">
          <span>Single Import</span>
          <strong>Paste one JSON, CSV row, or XML-ish reference</strong>
        </div>
        <textarea className="reference-import-textarea" value={importText} rows={5} placeholder={'name,category,definition\\nMetallivory,homebrew,Artifact-damage limiter'} onChange={(event) => setImportText(event.target.value)} />
        <div className="create-section-actions">
          <button type="button" className="secondary-button" disabled={!importText.trim()} onClick={previewImport}>
            Preview Import
          </button>
        </div>
      </section>

      <section className="create-overlay-section reference-review-section">
        <div className="create-section-heading">
          <span>Review</span>
          <strong>{form.name.trim() || 'Unnamed reference'}</strong>
        </div>
        <p>{form.definition.trim() || 'Add at least a name. Definition can stay blank for draft capture.'}</p>
        {duplicate ? <p className="form-error">Duplicate: {duplicate.name} already exists in {CATEGORY_LABELS[duplicate.category]}.</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
      </section>
    </OverlayShell>
  );
}

function buildRequest(form: ReferenceFormState, workflowStatus: ReferenceWorkflowStatus): CreateReferenceRequest {
  return {
    name: form.name,
    category: form.category,
    system: form.system,
    origin: form.origin,
    status: form.status,
    workflowStatus,
    definition: form.definition,
    reminderText: form.reminderText,
    typicalColors: splitList(form.typicalColors).map((color) => color.toUpperCase()),
    aliases: splitList(form.aliases),
    tags: form.tags,
    sourceNotes: form.sourceNotes,
    details: {
      parentType: form.parentType,
      ruleNumber: form.ruleNumber,
      sourceSet: form.sourceSet,
      components: form.components,
      designNotes: form.designNotes
    }
  };
}

function showsRulesDetails(category: ReferenceCategory): boolean {
  return ['keyword-ability', 'ability-word', 'keyword-action', 'action-phrase'].includes(category);
}

function showsTypeDetails(category: ReferenceCategory): boolean {
  return ['supertype', 'card-type', 'subtype', 'token', 'counter', 'mana-color', 'frame', 'homebrew'].includes(category);
}

function splitList(value: string): string[] {
  return value.split(/[,;\n]+/).map((item) => item.trim()).filter(Boolean);
}

function parseImportSnippet(text: string, current: ReferenceFormState): Partial<ReferenceFormState> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Paste one reference before previewing import.');
  }
  const parsed = parseJsonSnippet(trimmed) ?? parseXmlSnippet(trimmed) ?? parseCsvSnippet(trimmed);
  if (!parsed.name) {
    throw new Error('Imported reference needs a name.');
  }
  return { ...parsed, category: parsed.category ?? current.category };
}

function parseJsonSnippet(text: string): Partial<ReferenceFormState> | undefined {
  try {
    const parsed = JSON.parse(text) as Record<string, unknown> | Array<Record<string, unknown>>;
    const row = Array.isArray(parsed) ? parsed[0] : parsed;
    return row ? objectToForm(row) : undefined;
  } catch {
    return undefined;
  }
}

function parseXmlSnippet(text: string): Partial<ReferenceFormState> | undefined {
  if (!text.startsWith('<')) {
    return undefined;
  }
  const read = (key: string) => readXmlTag(text, key) ?? readXmlAttribute(text, key);
  return objectToForm({
    name: read('name') ?? read('keyword') ?? read('term'),
    category: read('category') ?? read('type'),
    definition: read('definition'),
    reminderText: read('reminderText') ?? read('reminder'),
    aliases: read('aliases') ?? read('alias'),
    tags: read('tags') ?? read('tag'),
    ruleNumber: read('ruleNumber') ?? read('number'),
    sourceSet: read('sourceSet') ?? read('set')
  });
}

function parseCsvSnippet(text: string): Partial<ReferenceFormState> {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const first = splitCsvLine(lines[0] ?? '');
  const second = splitCsvLine(lines[1] ?? '');
  const hasHeader = first.some((cell) => ['name', 'keyword', 'category', 'definition'].includes(cell.trim().toLowerCase()));
  if (hasHeader) {
    const row: Record<string, string> = {};
    first.forEach((header, index) => {
      row[header.trim()] = second[index] ?? '';
    });
    return objectToForm(row);
  }
  return objectToForm({
    name: first[0],
    category: first[1],
    definition: first[2],
    reminderText: first[3],
    aliases: first[4],
    tags: first[5]
  });
}

function objectToForm(row: Record<string, unknown>): Partial<ReferenceFormState> {
  const rawCategory = stringValue(row.category ?? row.type ?? row.kind);
  const origin = normalizeOrigin(stringValue(row.origin));
  const status = normalizeStatus(stringValue(row.status), origin);
  return {
    name: stringValue(row.name ?? row.keyword ?? row.term),
    category: normalizeCategory(rawCategory),
    system: normalizeSystem(stringValue(row.system), origin),
    origin,
    status,
    workflowStatus: stringValue(row.workflowStatus).toLowerCase() === 'final' ? 'final' : 'draft',
    definition: stringValue(row.definition),
    reminderText: stringValue(row.reminderText ?? row.reminder),
    typicalColors: listValue(row.typicalColors ?? row.colors),
    aliases: listValue(row.aliases ?? row.alias),
    tags: splitList(listValue(row.tags ?? row.tag)),
    sourceNotes: stringValue(row.sourceNotes ?? row.source),
    parentType: stringValue(row.parentType ?? row.parent),
    ruleNumber: stringValue(row.ruleNumber ?? row.number),
    sourceSet: stringValue(row.sourceSet ?? row.set),
    components: stringValue(row.components),
    designNotes: stringValue(row.designNotes ?? row.notes)
  };
}

function normalizeCategory(value: string): ReferenceCategory | undefined {
  const normalized = value.toLowerCase().trim().replace(/[_\s]+/g, '-').replace(/s$/, '');
  const aliases: Record<string, ReferenceCategory> = {
    keyword: 'keyword-ability',
    'keyword-abilitie': 'keyword-ability',
    action: 'keyword-action',
    'keyword-action': 'keyword-action',
    type: 'card-type',
    'card-type': 'card-type',
    subtype: 'subtype',
    token: 'token',
    counter: 'counter',
    frame: 'frame',
    homebrew: 'homebrew'
  };
  return REFERENCE_CATEGORIES.find((category) => category === normalized) ?? aliases[normalized];
}

function normalizeOrigin(value: string): ReferenceOrigin {
  return value.toLowerCase() === 'official' ? 'official' : 'homebrew';
}

function normalizeSystem(value: string, origin: ReferenceOrigin): ReferenceSystem {
  if (value.toLowerCase() === 'magic' || value.toLowerCase().includes('gathering')) {
    return 'magic';
  }
  return origin === 'official' ? 'magic' : 'homebrew';
}

function normalizeStatus(value: string, origin: ReferenceOrigin): ReferenceStatus {
  const normalized = value.toLowerCase();
  return STATUS_OPTIONS.includes(normalized as ReferenceStatus) ? (normalized as ReferenceStatus) : origin === 'official' ? 'current' : 'homebrew';
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : '';
}

function listValue(value: unknown): string {
  return Array.isArray(value) ? value.map(stringValue).filter(Boolean).join(', ') : stringValue(value);
}

function readXmlTag(text: string, key: string): string | undefined {
  const match = text.match(new RegExp(`<${key}[^>]*>([\\s\\S]*?)<\\/${key}>`, 'i'));
  return match?.[1]?.replace(/<[^>]+>/g, '').trim();
}

function readXmlAttribute(text: string, key: string): string | undefined {
  const match = text.match(new RegExp(`${key}=["']([^"']+)["']`, 'i'));
  return match?.[1]?.trim();
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

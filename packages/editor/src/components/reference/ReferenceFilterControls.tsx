import type { ReferenceCategory, ReferenceRuleKind } from '@homebrew-forge/forge';
import type {
  ReferenceRuleFilterOptions,
  ReferenceRuleFilters,
  ReferenceTermFilterOptions,
  ReferenceTermFilters
} from '../../domain/referenceFilters.js';

interface ReferenceFilterControlsProps {
  mode: 'terms' | 'rules';
  category: ReferenceCategory | 'all';
  ruleKind: ReferenceRuleKind | 'all';
  categories: Array<{ id: ReferenceCategory | 'all'; label: string }>;
  ruleKinds: Array<{ id: ReferenceRuleKind | 'all'; label: string }>;
  termFilters: ReferenceTermFilters;
  ruleFilters: ReferenceRuleFilters;
  termOptions: ReferenceTermFilterOptions;
  ruleOptions: ReferenceRuleFilterOptions;
  activeCardLabel: string;
  onCategoryChange: (category: ReferenceCategory | 'all') => void;
  onRuleKindChange: (ruleKind: ReferenceRuleKind | 'all') => void;
  onTermFiltersChange: (patch: Partial<ReferenceTermFilters>) => void;
  onRuleFiltersChange: (patch: Partial<ReferenceRuleFilters>) => void;
}

export function ReferenceFilterControls({
  mode,
  category,
  ruleKind,
  categories,
  ruleKinds,
  termFilters,
  ruleFilters,
  termOptions,
  ruleOptions,
  activeCardLabel,
  onCategoryChange,
  onRuleKindChange,
  onTermFiltersChange,
  onRuleFiltersChange
}: ReferenceFilterControlsProps) {
  if (mode === 'rules') {
    return (
      <div className="filter-panel">
        <label className="filter-field">
          <span>Rule kind</span>
          <select value={ruleKind} onChange={(event) => onRuleKindChange(event.target.value as ReferenceRuleKind | 'all')}>
            {ruleKinds.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid-2 compact-filter-grid">
          <label className="filter-field">
            <span>Rule number</span>
            <input value={ruleFilters.number} placeholder="702, 701.1, 122.*" onChange={(event) => onRuleFiltersChange({ number: event.target.value })} />
          </label>
          <label className="filter-field">
            <span>Effective</span>
            <select value={ruleFilters.effectiveDate} onChange={(event) => onRuleFiltersChange({ effectiveDate: event.target.value })}>
              <option value="all">All dates</option>
              {ruleOptions.effectiveDates.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="filter-field">
          <span>Title</span>
          <input value={ruleFilters.title} placeholder="Casting spells, counters..." onChange={(event) => onRuleFiltersChange({ title: event.target.value })} />
        </label>
        <label className="filter-field">
          <span>Rule text</span>
          <input value={ruleFilters.text} placeholder="Whenever, create, exile..." onChange={(event) => onRuleFiltersChange({ text: event.target.value })} />
        </label>
        <label className="filter-field">
          <span>Related term</span>
          <input value={ruleFilters.relatedTerm} placeholder="Vigilance, Food, stun..." onChange={(event) => onRuleFiltersChange({ relatedTerm: event.target.value })} />
        </label>
        <div className="grid-2 compact-filter-grid">
          <label className="filter-field">
            <span>Related terms</span>
            <select value={ruleFilters.relatedTerms} onChange={(event) => onRuleFiltersChange({ relatedTerms: event.target.value as ReferenceRuleFilters['relatedTerms'] })}>
              <option value="all">Any terms</option>
              <option value="has">Has terms</option>
              <option value="missing">No terms</option>
            </select>
          </label>
          <label className="filter-field">
            <span>Source</span>
            <select value={ruleFilters.sourceUrl || 'all'} onChange={(event) => onRuleFiltersChange({ sourceUrl: event.target.value === 'all' ? '' : event.target.value })}>
              <option value="all">All rule sources</option>
              {ruleOptions.sources.map((item) => (
                <option key={item.value} value={item.value}>
                  {shortSourceLabel(item.label)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="filter-panel">
      <label className="filter-field">
        <span>Category</span>
        <select value={category} onChange={(event) => onCategoryChange(event.target.value as ReferenceCategory | 'all')}>
          {categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <div className="grid-2 compact-filter-grid">
        <label className="filter-field">
          <span>Status</span>
          <select value={termFilters.status} onChange={(event) => onTermFiltersChange({ status: event.target.value })}>
            <option value="all">All statuses</option>
            <option value="current">Current</option>
            <option value="legacy">Legacy</option>
            <option value="retired">Retired</option>
            <option value="casual">Casual</option>
            <option value="homebrew">Homebrew</option>
          </select>
        </label>
        <label className="filter-field">
          <span>Workflow</span>
          <select value={termFilters.workflowStatus} onChange={(event) => onTermFiltersChange({ workflowStatus: event.target.value })}>
            <option value="all">All workflows</option>
            <option value="draft">Draft</option>
            <option value="final">Final</option>
          </select>
        </label>
      </div>
      <div className="grid-2 compact-filter-grid">
        <label className="filter-field">
          <span>Origin</span>
          <select value={termFilters.origin} onChange={(event) => onTermFiltersChange({ origin: event.target.value })}>
            <option value="all">All origins</option>
            <option value="official">Official</option>
            <option value="homebrew">Homebrew</option>
          </select>
        </label>
        <label className="filter-field">
          <span>System</span>
          <select value={termFilters.system} onChange={(event) => onTermFiltersChange({ system: event.target.value })}>
            <option value="all">All systems</option>
            {termOptions.systems.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="filter-field">
        <span>Source</span>
        <select value={termFilters.source} onChange={(event) => onTermFiltersChange({ source: event.target.value })}>
          <option value="all">All sources</option>
          {termOptions.sources.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <div className="grid-2 compact-filter-grid">
        <label className="filter-field">
          <span>Color</span>
          <select value={termFilters.color} onChange={(event) => onTermFiltersChange({ color: event.target.value })}>
            <option value="all">All colors</option>
            {termOptions.colors.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          <span>Source set</span>
          <input list="reference-source-set-options" value={termFilters.sourceSet} placeholder="DMU, BLB..." onChange={(event) => onTermFiltersChange({ sourceSet: event.target.value })} />
          <datalist id="reference-source-set-options">
            {termOptions.sourceSets.map((item) => (
              <option key={item.value} value={item.value} />
            ))}
          </datalist>
        </label>
      </div>
      <div className="grid-2 compact-filter-grid">
        <label className="filter-field">
          <span>Parent/type</span>
          <input list="reference-parent-type-options" value={termFilters.parentType} placeholder="Creature, artifact..." onChange={(event) => onTermFiltersChange({ parentType: event.target.value })} />
          <datalist id="reference-parent-type-options">
            {termOptions.parentTypes.map((item) => (
              <option key={item.value} value={item.value} />
            ))}
          </datalist>
        </label>
        <label className="filter-field">
          <span>Rule</span>
          <input value={termFilters.ruleNumber} placeholder="702, 111.10..." onChange={(event) => onTermFiltersChange({ ruleNumber: event.target.value })} />
        </label>
      </div>
      <label className="filter-field">
        <span>Type line</span>
        <input value={termFilters.typeLine} placeholder="Token Creature, Artifact..." onChange={(event) => onTermFiltersChange({ typeLine: event.target.value })} />
      </label>
      <label className="filter-field">
        <span>Tags</span>
        <input value={termFilters.tag} placeholder="rules, token, homebrew..." onChange={(event) => onTermFiltersChange({ tag: event.target.value })} />
      </label>
      <div className="grid-3 compact-filter-grid">
        <PresenceSelect label="Definition" value={termFilters.definitionPresence} onChange={(value) => onTermFiltersChange({ definitionPresence: value })} />
        <PresenceSelect label="Reminder" value={termFilters.reminderPresence} onChange={(value) => onTermFiltersChange({ reminderPresence: value })} />
        <PresenceSelect label="Versions" value={termFilters.versionPresence} onChange={(value) => onTermFiltersChange({ versionPresence: value })} />
      </div>
      <label className="filter-field">
        <span>Usage</span>
        <select value={termFilters.usageScope} onChange={(event) => onTermFiltersChange({ usageScope: event.target.value as ReferenceTermFilters['usageScope'] })}>
          <option value="all">All usage states</option>
          <option value="used-active-set">Used in active set</option>
          <option value="unused-active-set">Unused in active set</option>
          <option value="used-active-card">Used in selected card{activeCardLabel ? `: ${activeCardLabel}` : ''}</option>
          <option value="unused-active-card">Unused in selected card{activeCardLabel ? `: ${activeCardLabel}` : ''}</option>
        </select>
      </label>
      <label className="filter-field">
        <span>Specific card</span>
        <select value={termFilters.cardId} onChange={(event) => onTermFiltersChange({ cardId: event.target.value })}>
          <option value="all">All active-set cards</option>
          {termOptions.cards.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function PresenceSelect({
  label,
  value,
  onChange
}: {
  label: string;
  value: ReferenceTermFilters['definitionPresence'];
  onChange: (value: ReferenceTermFilters['definitionPresence']) => void;
}) {
  return (
    <label className="filter-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as ReferenceTermFilters['definitionPresence'])}>
        <option value="all">Any</option>
        <option value="has">Has</option>
        <option value="missing">Missing</option>
      </select>
    </label>
  );
}

function shortSourceLabel(value: string): string {
  try {
    const url = new URL(value);
    return url.pathname.split('/').filter(Boolean).at(-1) ?? url.hostname;
  } catch {
    return value;
  }
}

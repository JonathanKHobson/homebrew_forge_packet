import type { CSSProperties, DragEvent } from 'react';
import type { DashboardChartDatum, DashboardProbabilityDatum, DashboardRecommendation, DashboardStats } from '../../domain/dashboardFacts.js';

export type DashboardWidgetId =
  | 'snapshot'
  | 'sources'
  | 'types'
  | 'creatureTypes'
  | 'subtypes'
  | 'supertypes'
  | 'curve'
  | 'colors'
  | 'landMana'
  | 'deckRatio'
  | 'keywords'
  | 'roles'
  | 'probability'
  | 'collection'
  | 'recommendations'
  | 'matrix';

export type DashboardVisualization = 'kpi' | 'bar' | 'donut' | 'histogram' | 'radar' | 'probability' | 'insight' | 'matrix';

export interface DashboardWidgetDefinition {
  id: DashboardWidgetId;
  title: string;
  eyebrow: string;
  description: string;
  defaultVisualization: DashboardVisualization;
  alternateVisualizations: DashboardVisualization[];
}

export const DASHBOARD_WIDGETS: DashboardWidgetDefinition[] = [
  {
    id: 'snapshot',
    title: 'Scope snapshot',
    eyebrow: 'Overview',
    description: 'Fast count of rows, cards, variants, and review pressure in the selected scope.',
    defaultVisualization: 'kpi',
    alternateVisualizations: ['bar']
  },
  {
    id: 'sources',
    title: 'Source composition',
    eyebrow: 'Source aware',
    description: 'Keeps authored cards, deck entries, and collection rows distinct.',
    defaultVisualization: 'bar',
    alternateVisualizations: ['donut']
  },
  {
    id: 'types',
    title: 'Card type mix',
    eyebrow: 'Composition',
    description: 'Resolved card types only; unresolved collection rows are excluded.',
    defaultVisualization: 'bar',
    alternateVisualizations: ['donut']
  },
  {
    id: 'creatureTypes',
    title: 'Creature types',
    eyebrow: 'Typal',
    description: 'Creature subtypes in the selected scope, useful for checking Assassin density.',
    defaultVisualization: 'bar',
    alternateVisualizations: ['donut']
  },
  {
    id: 'subtypes',
    title: 'Subtype mix',
    eyebrow: 'Taxonomy',
    description: 'All card subtypes across creatures, artifacts, enchantments, lands, and spells.',
    defaultVisualization: 'bar',
    alternateVisualizations: ['donut']
  },
  {
    id: 'supertypes',
    title: 'Supertype mix',
    eyebrow: 'Taxonomy',
    description: 'Basic, legendary, snow, and other supertypes in the selected scope.',
    defaultVisualization: 'bar',
    alternateVisualizations: ['donut']
  },
  {
    id: 'curve',
    title: 'Mana curve',
    eyebrow: 'Deck shape',
    description: 'Nonland cards grouped by mana value. Labels show weighted cards per mana value.',
    defaultVisualization: 'histogram',
    alternateVisualizations: ['bar']
  },
  {
    id: 'colors',
    title: 'Color mix',
    eyebrow: 'Color pressure',
    description: 'Resolved card colors only; unresolved rows are excluded from color counts.',
    defaultVisualization: 'bar',
    alternateVisualizations: ['donut']
  },
  {
    id: 'landMana',
    title: 'Land mana sources',
    eyebrow: 'Mana base',
    description: 'Colors and flexible sources produced by lands in the selected scope.',
    defaultVisualization: 'bar',
    alternateVisualizations: ['donut']
  },
  {
    id: 'deckRatio',
    title: 'Land / creature / other',
    eyebrow: 'Deck health',
    description: 'A quick deck-body read before deeper probability or role analysis.',
    defaultVisualization: 'donut',
    alternateVisualizations: ['bar']
  },
  {
    id: 'keywords',
    title: 'Keyword and mechanic frequency',
    eyebrow: 'Homebrew signal',
    description: 'Finds repeated mechanics, evergreen keywords, and design-pattern concentration.',
    defaultVisualization: 'bar',
    alternateVisualizations: ['donut']
  },
  {
    id: 'roles',
    title: 'Commander role coverage',
    eyebrow: 'Deck roles',
    description: 'Uses deck-entry role metadata first, then local dataset and heuristic role inference.',
    defaultVisualization: 'radar',
    alternateVisualizations: ['bar']
  },
  {
    id: 'probability',
    title: 'Draw probability',
    eyebrow: 'Math',
    description: 'Hypergeometric odds for visible deck/card categories with assumptions shown.',
    defaultVisualization: 'probability',
    alternateVisualizations: ['bar']
  },
  {
    id: 'collection',
    title: 'Collection value and review',
    eyebrow: 'Collector',
    description: 'Value, purchase, review, and marked rows stay visible for collection scopes.',
    defaultVisualization: 'kpi',
    alternateVisualizations: ['bar', 'donut']
  },
  {
    id: 'recommendations',
    title: 'Review checklist',
    eyebrow: 'Review',
    description: 'Interpretive cards with caveats, source assumptions, and next-action framing.',
    defaultVisualization: 'insight',
    alternateVisualizations: []
  },
  {
    id: 'matrix',
    title: 'Color x type matrix',
    eyebrow: 'Advanced',
    description: 'An analytical matrix view that keeps the third dimension useful instead of decorative.',
    defaultVisualization: 'matrix',
    alternateVisualizations: []
  }
];

interface DashboardWidgetCardProps {
  definition: DashboardWidgetDefinition;
  stats: DashboardStats;
  visualization: DashboardVisualization;
  editMode: boolean;
  isActive: boolean;
  isDragging: boolean;
  onVisualizationChange: (visualization: DashboardVisualization) => void;
  onMove: (direction: -1 | 1) => void;
  onToggle: () => void;
  onDragStart: () => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDrop: () => void;
}

export function DashboardWidgetCard({ definition, stats, visualization, editMode, isActive, isDragging, onVisualizationChange, onMove, onToggle, onDragStart, onDragOver, onDrop }: DashboardWidgetCardProps) {
  return (
    <article
      className={`dashboard-widget-card widget-${definition.id} ${editMode ? 'editing' : ''} ${isActive ? 'active-widget' : 'ghost-widget'} ${isDragging ? 'dragging-widget' : ''}`}
      draggable={editMode && isActive}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {editMode ? (
        <button type="button" className={`dashboard-widget-toggle ${isActive ? 'remove' : 'add'}`} onClick={onToggle} aria-label={isActive ? `Remove ${definition.title}` : `Add ${definition.title}`}>
          {isActive ? 'x' : '+'}
        </button>
      ) : null}
      <header className="dashboard-widget-header">
        <div>
          <span>{definition.eyebrow}</span>
          <h3>{definition.title}</h3>
          <p>{definition.description}</p>
        </div>
        <div className="dashboard-widget-actions">
          {definition.alternateVisualizations.length && isActive ? (
            <select value={visualization} onChange={(event) => onVisualizationChange(event.target.value as DashboardVisualization)} aria-label={`Visualization for ${definition.title}`}>
              {[definition.defaultVisualization, ...definition.alternateVisualizations].map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          ) : null}
          {editMode && isActive ? (
            <>
              <span className="dashboard-drag-hint">Drag</span>
              <button type="button" className="dashboard-mini-button" onClick={() => onMove(-1)}>Up</button>
              <button type="button" className="dashboard-mini-button" onClick={() => onMove(1)}>Down</button>
            </>
          ) : null}
        </div>
      </header>
      <div className="dashboard-widget-body">
        <WidgetContent id={definition.id} visualization={visualization} stats={stats} />
      </div>
    </article>
  );
}

function WidgetContent({ id, visualization, stats }: { id: DashboardWidgetId; visualization: DashboardVisualization; stats: DashboardStats }) {
  if (id === 'snapshot') {
    const rows: DashboardChartDatum[] = [
      { label: 'Weighted cards', value: stats.totalQuantity },
      { label: 'Rows', value: stats.totalRows },
      { label: 'Unique names', value: stats.uniqueNames },
      { label: 'Review rows', value: stats.reviewRows },
      { label: 'Missing art', value: stats.missingArt }
    ];
    return visualization === 'bar' ? <BarList rows={rows} /> : <KpiGrid rows={rows} />;
  }
  if (id === 'sources') {
    return visualization === 'donut' ? <Donut rows={stats.sourceRows} /> : <BarList rows={stats.sourceRows} />;
  }
  if (id === 'types') {
    return visualization === 'donut' ? <Donut rows={stats.typeRows} /> : <BarList rows={stats.typeRows} />;
  }
  if (id === 'creatureTypes') {
    return visualization === 'donut' ? <Donut rows={stats.creatureTypeRows} emptyLabel="No creature types in this scope." /> : <BarList rows={stats.creatureTypeRows} emptyLabel="No creature types in this scope." />;
  }
  if (id === 'subtypes') {
    return visualization === 'donut' ? <Donut rows={stats.subtypeRows} emptyLabel="No subtypes in this scope." /> : <BarList rows={stats.subtypeRows} emptyLabel="No subtypes in this scope." />;
  }
  if (id === 'supertypes') {
    return visualization === 'donut' ? <Donut rows={stats.supertypeRows} emptyLabel="No supertypes in this scope." /> : <BarList rows={stats.supertypeRows} emptyLabel="No supertypes in this scope." />;
  }
  if (id === 'curve') {
    return visualization === 'bar' ? <BarList rows={stats.manaRows} /> : <Histogram rows={stats.manaRows} />;
  }
  if (id === 'colors') {
    return visualization === 'donut' ? <Donut rows={stats.colorRows} /> : <BarList rows={stats.colorRows} />;
  }
  if (id === 'landMana') {
    return visualization === 'donut' ? <Donut rows={stats.landManaRows} emptyLabel="No land mana sources in this scope." /> : <BarList rows={stats.landManaRows} emptyLabel="No land mana sources in this scope." />;
  }
  if (id === 'deckRatio') {
    return visualization === 'bar' ? <BarList rows={stats.deckRatioRows} /> : <Donut rows={stats.deckRatioRows} />;
  }
  if (id === 'keywords') {
    return visualization === 'donut' ? <Donut rows={stats.keywordRows} /> : <BarList rows={stats.keywordRows} emptyLabel="No keyword signal in this scope." />;
  }
  if (id === 'roles') {
    return visualization === 'bar' ? <BarList rows={stats.roleRows} emptyLabel="No role signals detected yet." /> : <Radar rows={stats.roleRows} />;
  }
  if (id === 'probability') {
    return visualization === 'bar' ? <ProbabilityBars rows={stats.probabilityRows} /> : <ProbabilityTable rows={stats.probabilityRows} />;
  }
  if (id === 'collection') {
    if (visualization === 'bar') {
      return <BarList rows={collectionStatusRows(stats)} emptyLabel="No collection rows in this scope." />;
    }
    if (visualization === 'donut') {
      return <Donut rows={collectionStatusRows(stats)} emptyLabel="No collection rows in this scope." />;
    }
    return <CollectionValueKpis stats={stats} />;
  }
  if (id === 'recommendations') {
    return <RecommendationList rows={stats.recommendationRows} />;
  }
  if (id === 'matrix') {
    return <Matrix rows={stats.cubeRows} />;
  }
  return null;
}

function CollectionValueKpis({ stats }: { stats: DashboardStats }) {
  const gainLoss = stats.collectionValueRows && stats.collectionPurchaseRows ? stats.collectionEstimatedValue - stats.collectionPurchaseValue : null;
  return (
    <div className="dashboard-kpi-grid">
      <div className="dashboard-kpi">
        <strong>{stats.collectionValueRows ? formatMoney(stats.collectionEstimatedValue, stats.collectionValueCurrency) : 'No source'}</strong>
        <span>Estimated value</span>
      </div>
      <div className="dashboard-kpi">
        <strong>{stats.collectionPurchaseRows ? formatMoney(stats.collectionPurchaseValue, stats.collectionPurchaseCurrency) : 'No source'}</strong>
        <span>Purchase total</span>
      </div>
      <div className="dashboard-kpi">
        <strong>{gainLoss === null ? 'No source' : formatMoney(gainLoss, stats.collectionValueCurrency)}</strong>
        <span>Gain / loss</span>
      </div>
      <div className="dashboard-kpi">
        <strong>{formatNumber(stats.reviewRows)}</strong>
        <span>Review rows</span>
      </div>
      <div className="dashboard-kpi">
        <strong>{formatNumber(stats.collectionFlaggedRows)}</strong>
        <span>Flagged cards</span>
      </div>
      <div className="dashboard-kpi">
        <strong>{formatNumber(stats.collectionDeletionRows)}</strong>
        <span>Delete queue</span>
      </div>
    </div>
  );
}

function collectionStatusRows(stats: DashboardStats): DashboardChartDatum[] {
  return [
    ...stats.reviewRowsByStatus,
    { label: 'Flagged', value: stats.collectionFlaggedRows },
    { label: 'Delete queue', value: stats.collectionDeletionRows },
    { label: 'Value rows', value: stats.collectionValueRows },
    { label: 'Purchase rows', value: stats.collectionPurchaseRows }
  ].filter((row) => row.value > 0);
}

function KpiGrid({ rows }: { rows: DashboardChartDatum[] }) {
  return (
    <div className="dashboard-kpi-grid">
      {rows.map((row) => (
        <div key={row.label} className="dashboard-kpi">
          <strong>{formatNumber(row.value)}</strong>
          <span>{row.label}</span>
        </div>
      ))}
    </div>
  );
}

function BarList({ rows, emptyLabel = 'No rows available.' }: { rows: DashboardChartDatum[]; emptyLabel?: string }) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  if (!rows.length) {
    return <EmptyWidget label={emptyLabel} />;
  }
  return (
    <div className="dashboard-bar-list">
      {rows.map((row) => (
        <div key={row.label} className="dashboard-bar-row" style={rowColorStyle(row.label)}>
          <div className="dashboard-bar-label">
            <span>{row.label}</span>
            <strong>{formatNumber(row.value)}</strong>
          </div>
          <div className="dashboard-bar-track">
            <span style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Histogram({ rows }: { rows: DashboardChartDatum[] }) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  if (!rows.length) {
    return <EmptyWidget label="No mana costs available for this scope." />;
  }
  return (
    <div className="dashboard-histogram">
      {rows.map((row) => (
        <div key={row.label} className="dashboard-histogram-column">
          <strong>{row.value}</strong>
          <div className="dashboard-histogram-bar" style={{ height: `${Math.max(12, (row.value / max) * 132)}px` }} />
          <span>{row.label}</span>
        </div>
      ))}
    </div>
  );
}

function Donut({ rows, emptyLabel = 'No rows available.' }: { rows: DashboardChartDatum[]; emptyLabel?: string }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  if (!rows.length || total <= 0) {
    return <EmptyWidget label={emptyLabel} />;
  }
  let current = 0;
  const stops = rows.map((row, index) => {
    const start = current;
    const end = current + (row.value / total) * 100;
    current = end;
    return `${colorForLabel(row.label, index)} ${start}% ${end}%`;
  }).join(', ');
  return (
    <div className="dashboard-donut-wrap">
      <div className="dashboard-donut" style={{ background: `conic-gradient(${stops})` }}>
        <div className="dashboard-donut-core">
          <strong>{formatNumber(total)}</strong>
          <span>total</span>
        </div>
      </div>
      <div className="dashboard-donut-legend">
        {rows.slice(0, 8).map((row, index) => (
          <span key={row.label}>
            <i style={{ background: colorForLabel(row.label, index) }} />
            {row.label} {Math.round((row.value / total) * 100)}%
          </span>
        ))}
      </div>
    </div>
  );
}

function Radar({ rows }: { rows: DashboardChartDatum[] }) {
  if (!rows.length) {
    return <EmptyWidget label="No role signals detected yet." />;
  }
  return (
    <div className="dashboard-radar">
      {rows.map((row) => (
        <div key={row.label} className="dashboard-radar-spoke">
          <span>{row.label}</span>
          <strong>{row.value}</strong>
        </div>
      ))}
    </div>
  );
}

function ProbabilityTable({ rows }: { rows: DashboardProbabilityDatum[] }) {
  if (!rows.length) {
    return <EmptyWidget label="No probability scenarios available for this scope." />;
  }
  return (
    <div className="dashboard-probability-table">
      {rows.map((row) => (
        <div key={row.label} className="dashboard-probability-row">
          <div>
            <strong>{row.label}</strong>
            <span>{row.detail}</span>
          </div>
          <b>{Math.round(row.probability * 100)}%</b>
        </div>
      ))}
    </div>
  );
}

function ProbabilityBars({ rows }: { rows: DashboardProbabilityDatum[] }) {
  return (
    <BarList
      rows={rows.map((row) => ({
        label: row.label,
        value: Math.round(row.probability * 100),
        detail: row.detail
      }))}
      emptyLabel="No probability scenarios available for this scope."
    />
  );
}

function RecommendationList({ rows }: { rows: DashboardRecommendation[] }) {
  return (
    <div className="dashboard-recommendations">
      {rows.map((row) => (
        <div key={row.id} className={`dashboard-recommendation ${row.severity}`}>
          <strong>{row.title}</strong>
          <p>{row.body}</p>
          <span>{row.source}</span>
        </div>
      ))}
    </div>
  );
}

function Matrix({ rows }: { rows: Array<{ color: string; type: string; value: number }> }) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  if (!rows.length) {
    return <EmptyWidget label="No matrix data available." />;
  }
  return (
    <div className="dashboard-matrix" aria-label="Color by type matrix">
      {rows.map((row) => (
        <div key={`${row.color}:${row.type}`} className="dashboard-matrix-cell" style={{ '--matrix-alpha': String(Math.max(0.12, row.value / max)) } as CSSProperties}>
          <strong>{row.value}</strong>
          <span>{row.color}</span>
          <small>{row.type}</small>
        </div>
      ))}
    </div>
  );
}

function EmptyWidget({ label }: { label: string }) {
  return (
    <div className="dashboard-widget-empty">
      <strong>No data</strong>
      <span>{label}</span>
    </div>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatMoney(value: number, currency: string): string {
  if (currency === 'TIX') {
    return `${value.toFixed(2)} tix`;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
}

function rowColorStyle(label: string): CSSProperties {
  const color = colorForLabel(label);
  return {
    '--row-color': color,
    '--row-track': lightTrackForLabel(label)
  } as CSSProperties;
}

function colorForLabel(label: string, index = 0): string {
  const normalized = label.toLowerCase();
  if (normalized.includes('creature')) return 'var(--fb-chart-green)';
  if (normalized.includes('planeswalker')) return 'var(--fb-chart-purple)';
  if (normalized.includes('artifact')) return 'var(--fb-chart-gray)';
  if (normalized.includes('land')) return 'var(--fb-chart-teal)';
  if (normalized.includes('sorcery')) return 'var(--fb-chart-pink)';
  if (normalized.includes('enchantment')) return 'var(--fb-chart-cyan)';
  if (normalized.includes('instant')) return 'var(--fb-chart-blue)';
  if (normalized === 'white') return 'var(--fb-chart-gray)';
  if (normalized === 'blue') return 'var(--fb-chart-blue)';
  if (normalized === 'black') return 'var(--fb-chart-gray)';
  if (normalized === 'red') return '#f87171';
  if (normalized === 'green') return 'var(--fb-chart-green)';
  if (normalized === 'colorless') return 'var(--fb-chart-gray)';
  if (normalized.includes('mv 2')) return 'var(--fb-chart-blue)';
  if (normalized.includes('mv 3')) return 'var(--fb-chart-blue-strong)';
  if (normalized.includes('mv 4')) return 'var(--fb-chart-cyan)';
  const palette = ['var(--fb-chart-blue)', 'var(--fb-chart-green)', 'var(--fb-chart-purple)', 'var(--fb-chart-cyan)', 'var(--fb-chart-pink)', 'var(--fb-chart-gray)', 'var(--fb-chart-teal)', 'var(--fb-accent)'];
  return palette[index % palette.length];
}

function lightTrackForLabel(label: string): string {
  const normalized = label.toLowerCase();
  if (normalized.includes('creature')) return 'var(--fb-track-creature)';
  if (normalized.includes('planeswalker')) return 'var(--fb-track-planeswalker)';
  if (normalized.includes('artifact')) return 'var(--fb-track-artifact)';
  if (normalized.includes('land')) return 'var(--fb-track-land)';
  if (normalized.includes('sorcery')) return 'var(--fb-track-sorcery)';
  if (normalized.includes('enchantment')) return 'var(--fb-track-enchantment)';
  if (normalized.includes('instant')) return 'var(--fb-track-instant)';
  if (normalized === 'white') return 'var(--fb-track-white)';
  if (normalized === 'blue') return 'var(--fb-track-blue)';
  if (normalized === 'black') return 'var(--fb-track-black)';
  if (normalized === 'red') return 'var(--fb-track-red)';
  if (normalized === 'green') return 'var(--fb-track-green)';
  if (normalized === 'colorless') return 'var(--fb-track-colorless)';
  return 'var(--fb-track-default)';
}

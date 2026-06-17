import type { OfficialCardBrowserFilters } from '../../domain/officialCardBrowser.js';

const RARITY_OPTIONS = [
  { value: 'all', label: 'All rarities' },
  { value: 'common', label: 'Common' },
  { value: 'uncommon', label: 'Uncommon' },
  { value: 'rare', label: 'Rare' },
  { value: 'mythic', label: 'Mythic' },
  { value: 'special', label: 'Special' },
  { value: 'bonus', label: 'Bonus' }
];

const COLOR_OPTIONS = [
  { value: 'all', label: 'All identities' },
  { value: 'C', label: 'Colorless' },
  { value: 'W', label: 'White' },
  { value: 'U', label: 'Blue' },
  { value: 'B', label: 'Black' },
  { value: 'R', label: 'Red' },
  { value: 'G', label: 'Green' },
  { value: 'WU', label: 'Azorius' },
  { value: 'UB', label: 'Dimir' },
  { value: 'BR', label: 'Rakdos' },
  { value: 'RG', label: 'Gruul' },
  { value: 'GW', label: 'Selesnya' },
  { value: 'WB', label: 'Orzhov' },
  { value: 'UR', label: 'Izzet' },
  { value: 'BG', label: 'Golgari' },
  { value: 'RW', label: 'Boros' },
  { value: 'GU', label: 'Simic' }
];

const LAYOUT_OPTIONS = [
  { value: 'all', label: 'All layouts' },
  { value: 'normal', label: 'Normal' },
  { value: 'transform', label: 'Transform' },
  { value: 'modal_dfc', label: 'Modal DFC' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'saga', label: 'Saga' },
  { value: 'split', label: 'Split' },
  { value: 'token', label: 'Token' },
  { value: 'art_series', label: 'Art series' },
  { value: 'planar', label: 'Plane' },
  { value: 'scheme', label: 'Scheme' },
  { value: 'emblem', label: 'Emblem' }
];

const FINISH_OPTIONS = [
  { value: 'all', label: 'All finishes' },
  { value: 'nonfoil', label: 'Nonfoil' },
  { value: 'foil', label: 'Foil' },
  { value: 'etched', label: 'Etched' }
];

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All card categories' },
  { value: 'normal', label: 'Normal cards' },
  { value: 'token', label: 'Tokens' },
  { value: 'art', label: 'Art series' },
  { value: 'extra', label: 'Plane, scheme, emblem' },
  { value: 'funny', label: 'Funny / silver-border style' }
] as const;

interface OfficialCardFilterControlsProps {
  filters: OfficialCardBrowserFilters;
  onFiltersChange: (patch: Partial<OfficialCardBrowserFilters>) => void;
}

export function OfficialCardFilterControls({ filters, onFiltersChange }: OfficialCardFilterControlsProps) {
  return (
    <div className="filter-panel">
      <div className="grid-2 compact-filter-grid">
        <label className="filter-field">
          <span>Set</span>
          <input value={filters.setCode} placeholder="WHO, CMM, SLD..." onChange={(event) => onFiltersChange({ setCode: event.target.value })} />
        </label>
        <label className="filter-field">
          <span>Rarity</span>
          <select value={filters.rarity} onChange={(event) => onFiltersChange({ rarity: event.target.value })}>
            {RARITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid-2 compact-filter-grid">
        <label className="filter-field">
          <span>Color identity</span>
          <select value={filters.colorIdentity} onChange={(event) => onFiltersChange({ colorIdentity: event.target.value })}>
            {COLOR_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          <span>Type line</span>
          <input value={filters.typeLine} placeholder="Creature, Equipment..." onChange={(event) => onFiltersChange({ typeLine: event.target.value })} />
        </label>
      </div>
      <div className="grid-2 compact-filter-grid">
        <label className="filter-field">
          <span>Layout</span>
          <select value={filters.layout} onChange={(event) => onFiltersChange({ layout: event.target.value })}>
            {LAYOUT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          <span>Finish</span>
          <select value={filters.finish} onChange={(event) => onFiltersChange({ finish: event.target.value })}>
            {FINISH_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid-2 compact-filter-grid">
        <label className="filter-field">
          <span>Language</span>
          <input value={filters.lang} placeholder="en, ja, es..." onChange={(event) => onFiltersChange({ lang: event.target.value })} />
        </label>
        <label className="filter-field">
          <span>Mana min</span>
          <input type="number" min="0" value={filters.manaValueMin} onChange={(event) => onFiltersChange({ manaValueMin: event.target.value })} />
        </label>
        <label className="filter-field">
          <span>Mana max</span>
          <input type="number" min="0" value={filters.manaValueMax} onChange={(event) => onFiltersChange({ manaValueMax: event.target.value })} />
        </label>
      </div>
      <div className="grid-2 compact-filter-grid">
        <label className="filter-field">
          <span>Price</span>
          <select value={filters.priceCurrency} onChange={(event) => onFiltersChange({ priceCurrency: event.target.value as OfficialCardBrowserFilters['priceCurrency'] })}>
            <option value="usd">USD</option>
            <option value="usdFoil">USD foil</option>
            <option value="eur">EUR</option>
            <option value="eurFoil">EUR foil</option>
            <option value="tix">MTGO tix</option>
          </select>
        </label>
        <label className="filter-field">
          <span>Price min</span>
          <input type="number" min="0" step="0.01" value={filters.priceMin} onChange={(event) => onFiltersChange({ priceMin: event.target.value })} />
        </label>
        <label className="filter-field">
          <span>Price max</span>
          <input type="number" min="0" step="0.01" value={filters.priceMax} onChange={(event) => onFiltersChange({ priceMax: event.target.value })} />
        </label>
      </div>
      <div className="grid-2 compact-filter-grid">
        <label className="filter-field">
          <span>Released after</span>
          <input type="date" value={filters.releasedAfter} onChange={(event) => onFiltersChange({ releasedAfter: event.target.value })} />
        </label>
        <label className="filter-field">
          <span>Released before</span>
          <input type="date" value={filters.releasedBefore} onChange={(event) => onFiltersChange({ releasedBefore: event.target.value })} />
        </label>
        <label className="filter-field">
          <span>Year</span>
          <input inputMode="numeric" value={filters.year} placeholder="1993, 2026..." onChange={(event) => onFiltersChange({ year: event.target.value })} />
        </label>
      </div>
      <div className="grid-2 compact-filter-grid">
        <label className="filter-field">
          <span>Image</span>
          <select value={filters.hasImage} onChange={(event) => onFiltersChange({ hasImage: event.target.value as OfficialCardBrowserFilters['hasImage'] })}>
            <option value="all">Any image state</option>
            <option value="yes">Has image</option>
            <option value="no">Missing image</option>
          </select>
        </label>
        <label className="filter-field">
          <span>Category</span>
          <select value={filters.cardCategory} onChange={(event) => onFiltersChange({ cardCategory: event.target.value as OfficialCardBrowserFilters['cardCategory'] })}>
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

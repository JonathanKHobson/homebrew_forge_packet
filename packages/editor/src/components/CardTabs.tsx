import type { CardSummary } from '../domain/editorTypes.js';

interface CardTabsProps {
  cards: CardSummary[];
  openCardIds: string[];
  selectedId: string;
  onSelect: (cardId: string) => void;
  onClose: (cardId: string) => void;
  onNew: () => void;
}

export function CardTabs({ cards, openCardIds, selectedId, onSelect, onClose, onNew }: CardTabsProps) {
  const cardsById = new Map(cards.map((card) => [card.cardId, card]));
  const openCards = openCardIds.map((cardId) => cardsById.get(cardId)).filter(Boolean) as CardSummary[];
  return (
    <div className="card-tabs" role="tablist" aria-label="Open cards">
      {openCards.map((card) => (
        <div key={card.cardId} className={`card-tab ${card.cardId === selectedId ? 'active' : ''}`}>
          <button type="button" role="tab" aria-selected={card.cardId === selectedId} onClick={() => onSelect(card.cardId)}>
            {card.collectorNumber} {card.name}
          </button>
          <button type="button" className="tab-close" title={`Close ${card.name}`} onClick={() => onClose(card.cardId)}>
            x
          </button>
        </div>
      ))}
      <button type="button" className="card-tab new-tab" title="New card" onClick={onNew}>
        +
      </button>
    </div>
  );
}

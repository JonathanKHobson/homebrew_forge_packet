export type CardLayout =
  | 'normal'
  | 'split'
  | 'flip'
  | 'transform'
  | 'modal_dfc'
  | 'meld'
  | 'adventure'
  | 'saga'
  | 'class'
  | 'case'
  | 'battle'
  | 'plane'
  | 'scheme'
  | 'phenomenon'
  | 'vanguard'
  | 'dungeon'
  | 'token';

export type CardMode = 'custom' | 'reskin' | 'token' | 'imported' | 'placeholder';
export type CardStatus = 'idea' | 'draft' | 'playtest' | 'final' | 'cut';

export interface CardRecord {
  cardId: string;
  setCode: string;
  collectorNumber: string;
  name: string;
  layout: CardLayout;
  mode: CardMode;
  sourceCardName?: string;
  sourceSetCode?: string;
  rarity: string;
  colorIdentity?: string;
  tags?: string[];
  status: CardStatus;
  printCount: number;
  exportNameOverride?: string;
  notes?: string;
}

export interface CardFaceRecord {
  cardId: string;
  faceIndex: number;
  faceName: string;
  manaCost?: string;
  typeLine: string;
  oracleText?: string;
  flavorText?: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
  defense?: string;
  colors?: string;
  frameType: string;
  artId?: string;
  artistDisplay?: string;
  watermark?: string;
  rulesTextSizeHint?: string; // "auto" or a numeric manual font size.
  rulesTextPaddingTop?: number;
  rulesTextPaddingRight?: number;
  rulesTextPaddingBottom?: number;
  rulesTextPaddingLeft?: number;
  layoutVariant?: string;
}

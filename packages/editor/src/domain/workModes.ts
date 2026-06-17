import type { CardListDensity, WorkspaceSection } from './editorUiTypes.js';

export type WorkModeId = 'full-studio' | 'card-maker' | 'deck-builder' | 'collection-manager';

export interface WorkModePanelPreset {
  showCommandBar: boolean;
  showSideRail: boolean;
  showLeftPanel: boolean;
  showPreviewPanel: boolean;
  showRightPanel: boolean;
  showCardsRailItem?: boolean;
  showCollectionsRailItem?: boolean;
  cardListDensity?: CardListDensity;
}

export interface WorkModeDefinition {
  id: WorkModeId;
  label: string;
  shortLabel: string;
  description: string;
  defaultWorkspace: WorkspaceSection;
  visibleSections: WorkspaceSection[];
  panelPreset: WorkModePanelPreset;
  railHint: string;
  statusMessage: string;
  workspaceNotes: Partial<Record<WorkspaceSection, string>>;
}

const ALL_WORKSPACE_SECTIONS: WorkspaceSection[] = ['maker', 'sets', 'decks', 'collections', 'binders', 'lists', 'projects', 'cards', 'library', 'reference', 'settings'];

export const WORK_MODE_DEFINITIONS: WorkModeDefinition[] = [
  {
    id: 'full-studio',
    label: 'Full Studio',
    shortLabel: 'Studio',
    description: 'Everything visible for moving between Maker, the optional Cards catalog, sets, decks, collections, the asset gallery, references, and project work.',
    defaultWorkspace: 'maker',
    visibleSections: ALL_WORKSPACE_SECTIONS,
    panelPreset: {
      showCommandBar: true,
      showSideRail: true,
      showLeftPanel: true,
      showPreviewPanel: true,
      showRightPanel: true,
      showCollectionsRailItem: true,
      cardListDensity: 'comfortable'
    },
    railHint: 'All workspaces',
    statusMessage: 'All workspaces are available.',
    workspaceNotes: {}
  },
  {
    id: 'card-maker',
    label: 'Card Maker',
    shortLabel: 'Maker',
    description: 'Author cards and sets with preview, inspector, layout, art, and reference tools close at hand.',
    defaultWorkspace: 'maker',
    visibleSections: ['maker', 'sets', 'library', 'reference', 'projects', 'settings'],
    panelPreset: {
      showCommandBar: true,
      showSideRail: true,
      showLeftPanel: true,
      showPreviewPanel: true,
      showRightPanel: true,
      cardListDensity: 'comfortable'
    },
    railHint: 'Authoring focus',
    statusMessage: 'Maker, sets, gallery, and references are emphasized.',
    workspaceNotes: {
      maker: 'Authoring mode keeps the Maker list, live preview, and inspector visible for card and set creation.',
      sets: 'Card Maker uses Sets for authored set structure and export readiness.',
      library: 'Card Maker uses Gallery for art and source assets.',
      reference: 'Card Maker uses References for rules language, terms, and homebrew mechanics.'
    }
  },
  {
    id: 'deck-builder',
    label: 'Deck Builder',
    shortLabel: 'Decks',
    description: 'Build and tune playable decks with deck lists, collection-backed adds, exports, and deck stats.',
    defaultWorkspace: 'decks',
    visibleSections: ['decks', 'collections', 'binders', 'lists', 'projects', 'settings'],
    panelPreset: {
      showCommandBar: true,
      showSideRail: true,
      showLeftPanel: true,
      showPreviewPanel: false,
      showRightPanel: true,
      showCollectionsRailItem: true,
      cardListDensity: 'compact'
    },
    railHint: 'Deck workspaces',
    statusMessage: 'Decks and collection availability are emphasized.',
    workspaceNotes: {
      decks: 'Deck Builder keeps deck lists, Add cards, exports, and deck-entry details in the foreground.',
      lists: 'Deck Builder uses Lists for wanted, recommended, flagged, and virtual test cards.',
      binders: 'Deck Builder uses Binders to check owned card groups.',
      collections: 'Deck Builder uses Collections to check owned cards and add collection-backed entries.'
    }
  },
  {
    id: 'collection-manager',
    label: 'Collection Manager',
    shortLabel: 'Collection',
    description: 'Review owned cards, duplicates, print details, conditions, locations, and source-derived value signals.',
    defaultWorkspace: 'collections',
    visibleSections: ['collections', 'binders', 'lists', 'decks', 'projects', 'settings'],
    panelPreset: {
      showCommandBar: true,
      showSideRail: true,
      showLeftPanel: true,
      showPreviewPanel: false,
      showRightPanel: true,
      showCollectionsRailItem: true,
      cardListDensity: 'compact'
    },
    railHint: 'Inventory focus',
    statusMessage: 'Collections, inventory review, and deck relationships are emphasized.',
    workspaceNotes: {
      collections: 'Collection Manager keeps ownership, print identity, review state, condition, duplicates, and value-source signals visible.',
      binders: 'Binders organize owned physical or virtual collection groups.',
      lists: 'Lists organize wanted, recommended, starred, flagged, and gift card groups.',
      decks: 'Collection Manager uses Decks to see where owned cards can become playable lists.'
    }
  }
];

const WORK_MODE_BY_ID = new Map(WORK_MODE_DEFINITIONS.map((mode) => [mode.id, mode]));

export function getWorkMode(id: WorkModeId): WorkModeDefinition {
  return WORK_MODE_BY_ID.get(id) ?? WORK_MODE_DEFINITIONS[0];
}

export function visibleRailSectionsForMode(id: WorkModeId, activeSection: WorkspaceSection, showCollections: boolean, showCards: boolean): WorkspaceSection[] {
  const mode = getWorkMode(id);
  const sections = mode.visibleSections.filter((section) => {
    if (!showCollections && section === 'collections' && activeSection !== 'collections') {
      return false;
    }
    if (!showCards && section === 'cards' && activeSection !== 'cards') {
      return false;
    }
    return true;
  });
  if (!sections.includes(activeSection)) {
    return [...sections, activeSection];
  }
  return sections;
}

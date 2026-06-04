export type IconName =
  | 'assets'
  | 'cards'
  | 'close'
  | 'collapseLeft'
  | 'collapseRight'
  | 'collapseUp'
  | 'collections'
  | 'decks'
  | 'download'
  | 'edit'
  | 'export'
  | 'expand'
  | 'filter'
  | 'folder'
  | 'guide'
  | 'new'
  | 'redo'
  | 'save'
  | 'search'
  | 'settings'
  | 'sets'
  | 'trash'
  | 'undo'
  | 'universes'
  | 'view'
  | 'zoom';

interface IconProps {
  name: IconName;
}

const paths: Record<IconName, string[]> = {
  assets: ['M4 7h16v11H4z', 'M7 4h10l3 3H4z', 'M8 11h8M8 15h5'],
  cards: ['M7 3h10l2 3v15H7z', 'M5 6h12v15H5z', 'M8 10h6M8 14h7M8 18h4'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  collapseLeft: ['M5 4v16', 'M19 12H9', 'M12 8l-4 4 4 4'],
  collapseRight: ['M19 4v16', 'M5 12h10', 'M12 8l4 4-4 4'],
  collapseUp: ['M4 5h16', 'M12 19V9', 'M8 12l4-4 4 4'],
  collections: ['M5 5h9l5 5v9H5z', 'M14 5v5h5', 'M8 12h8M8 16h6', 'M3 8h2M3 12h2M3 16h2'],
  decks: ['M5 4h10l4 4v12H5z', 'M15 4v5h5', 'M8 10h6M8 14h8M8 18h5', 'M3 7h2M3 11h2M3 15h2'],
  download: ['M12 4v10', 'M8 10l4 4 4-4', 'M5 19h14'],
  edit: ['M4 20l4-1 11-11-3-3L5 16z', 'M14 5l3 3'],
  export: ['M12 4v10', 'M8 8l4-4 4 4', 'M5 14v5h14v-5'],
  expand: ['M9 5H5v4', 'M5 5l6 6', 'M15 19h4v-4', 'M19 19l-6-6'],
  filter: ['M4 5h16l-6 7v6l-4 2v-8z'],
  folder: ['M3 7h7l2 2h9v10H3z'],
  guide: ['M4 4h16v16H4z', 'M8 4v16M16 4v16M4 8h16M4 16h16'],
  new: ['M12 5v14M5 12h14'],
  redo: ['M16 7l4 4-4 4', 'M20 11H9a5 5 0 0 0-5 5v1'],
  save: ['M5 4h12l2 2v14H5z', 'M8 4v6h8V4', 'M8 17h8'],
  search: ['M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16z', 'M16 16l5 5'],
  settings: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M19 12h3M2 12h3M12 2v3M12 19v3M17 5l2-2M5 19l2-2M5 5l3 3M16 16l3 3'],
  sets: ['M4 6h13v13H4z', 'M7 3h13v13', 'M8 10h5M8 14h6'],
  trash: ['M5 7h14', 'M10 11v6M14 11v6', 'M8 7l1 14h6l1-14', 'M9 7V4h6v3'],
  undo: ['M8 7l-4 4 4 4', 'M4 11h11a5 5 0 0 1 5 5v1'],
  universes: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M3 12h18', 'M12 3c3 3 3 15 0 18', 'M12 3c-3 3-3 15 0 18'],
  view: ['M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  zoom: ['M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16z', 'M16 16l5 5', 'M7 10h6M10 7v6']
};

export function Icon({ name }: IconProps) {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      {paths[name].map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}

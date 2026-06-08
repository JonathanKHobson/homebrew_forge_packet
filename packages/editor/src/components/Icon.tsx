import {
  Archive,
  BookOpen,
  Download,
  Eye,
  Filter,
  Flag,
  Folder,
  GalleryVerticalEnd,
  Grid2X2,
  Globe,
  Images,
  Layers,
  List,
  ListChecks,
  Maximize2,
  Package,
  PanelLeftClose,
  PanelRightClose,
  PanelTopClose,
  Pencil,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Search,
  Settings,
  Star,
  Square,
  TableProperties,
  Trash2,
  Undo2,
  Upload,
  X,
  ZoomIn,
  type LucideIcon
} from 'lucide-react';

export type IconName =
  | 'assets'
  | 'binders'
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
  | 'flag'
  | 'folder'
  | 'grid'
  | 'guide'
  | 'list'
  | 'lists'
  | 'new'
  | 'redo'
  | 'revert'
  | 'save'
  | 'search'
  | 'settings'
  | 'sets'
  | 'star'
  | 'single'
  | 'trash'
  | 'undo'
  | 'universes'
  | 'view'
  | 'zoom';

interface IconProps {
  name: IconName;
}

const icons: Record<IconName, LucideIcon> = {
  assets: Images,
  binders: Archive,
  cards: GalleryVerticalEnd,
  close: X,
  collapseLeft: PanelLeftClose,
  collapseRight: PanelRightClose,
  collapseUp: PanelTopClose,
  collections: TableProperties,
  decks: Layers,
  download: Download,
  edit: Pencil,
  export: Upload,
  expand: Maximize2,
  filter: Filter,
  flag: Flag,
  folder: Folder,
  grid: Grid2X2,
  guide: BookOpen,
  list: List,
  lists: ListChecks,
  new: Plus,
  redo: Redo2,
  revert: RotateCcw,
  save: Save,
  search: Search,
  settings: Settings,
  sets: Package,
  single: Square,
  star: Star,
  trash: Trash2,
  undo: Undo2,
  universes: Globe,
  view: Eye,
  zoom: ZoomIn
};

export function Icon({ name }: IconProps) {
  const IconComponent = icons[name];
  return <IconComponent className="icon" aria-hidden="true" strokeWidth={2} />;
}

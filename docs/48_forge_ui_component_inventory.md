# Forge UI Component Inventory

This maps current editor surfaces to the future Forge UI primitive system. Use it to choose the next safe slice without flattening Homebrew Forge's domain model.

## Current Shell And Navigation

| Current owner | Current role | Future Forge UI primitive |
| --- | --- | --- |
| `App.tsx` | Main editor shell, panel orchestration, focused layouts, status bar, runtime banner | `AppShell`, `WorkspaceFrame` |
| `EditorToolbar.tsx` | Menus, file/edit/view/tools/help actions, preview controls, project context | `TopCommandBar`, `ActionToolbar` |
| `SideRail.tsx` | Stable left workspace navigation | `SidebarNav` |
| `components/shell/CommandPalette.tsx` | Searchable keyboard command surface for app actions and navigation | command/dialog primitive wrapper |
| `components/shell/WorkspaceHealth.tsx` | Runtime freshness, source, preview, reference, and dirty-work health surfaces | `StatusPill`, health panel primitive |
| `WorkModeChip.tsx` | Work mode selector/status | `StatusPill`, `TopCommandBar` |
| `PanelResizeHandle.tsx` | Resizable panel controls | keep current behavior; style through tokens |

## Current Workspaces

| Current owner | Current role | Future Forge UI primitive |
| --- | --- | --- |
| `CardList.tsx` | Maker search/list/filter entry | `WorkspaceHeader`, `DataTableShell`, `EmptyState` |
| `CardTabs.tsx` | Open card/variant tabs | tab primitive or repo-native tab wrapper |
| `CardPreview.tsx` | Preview canvas, tool modes, expanded preview | `PreviewFrame`, `ActionToolbar` |
| `Inspector.tsx` | Card/frame/layout/preview inspector | `InspectorPanel`, `ValidationSummary` |
| `WorkspaceView.tsx` | Projects/Sets/Decks/Collections/Gallery/References management views | `WorkspaceHeader`, `Surface`, `DataTableShell`, `StatusPill`, `EmptyState` |
| `CardBrowserView.tsx` | Source-aware browser and compare mode | `DataTableShell`, `InspectorPanel`, `StatusPill` |
| `components/dashboard/` | Analytics dashboard, widgets, advanced filters | `Surface`, `WorkspaceHeader`, `DataTableShell`, `StatusPill` |

## Current Overlays And Forms

| Current owner | Current role | Future Forge UI primitive |
| --- | --- | --- |
| `OverlayShell.tsx` | Shared overlay shell | dialog/sheet primitive wrapper |
| `TransferDialog.tsx` | File import/export modal | dialog/sheet primitive wrapper, `ValidationSummary` |
| `Create*Overlay.tsx` | Create card/set/deck/project/library/collection flows | dialog/sheet primitive wrapper, `ActionToolbar` |
| `PrintDialog.tsx` | Print/PDF/PNG workflow | dialog/sheet primitive wrapper, `StatusPill` |
| `Field.tsx` | Field wrapper | form field primitive |
| `FillChooseField.tsx` | Choose-or-fill controls | combobox/select primitive after Radix gate |
| `TagEditor.tsx` | Tag chips and suggestions | chip + combobox primitive after Radix gate |
| `LinkedTextArea.tsx` | Rules/reference-aware text editing | keep custom behavior; style through tokens |

## Initial Forge UI Primitive Set

Create these before large restyling:

- `Button`
- `IconButton`
- `StatusPill`
- `Surface`
- `EmptyState`
- `ActionToolbar`
- `WorkspaceHeader`
- `InspectorPanel`
- `ValidationSummary`
- `DataTableShell`

Phase 7 shell primitives now exist:

- `CommandPalette`
- `WorkspaceHealthPanel`

Keep command actions non-destructive unless the command already has an explicit
confirmation or saved-state affordance elsewhere. Keep health panel data sourced
from existing local editor/runtime state unless a later backend slice adds a
documented health endpoint.

## Icon Inventory

Current `Icon.tsx` names:

- `assets`
- `cards`
- `close`
- `collapseLeft`
- `collapseRight`
- `collapseUp`
- `collections`
- `decks`
- `download`
- `edit`
- `export`
- `expand`
- `filter`
- `folder`
- `guide`
- `new`
- `redo`
- `revert`
- `save`
- `search`
- `settings`
- `sets`
- `trash`
- `undo`
- `universes`
- `view`
- `zoom`

Lucide migration rule: keep `Icon.tsx` as the compatibility layer. Do not import Lucide directly throughout feature components until the wrapper owns the mapping.

Phase 2 mapping now lives in `packages/editor/src/components/Icon.tsx`:

| Homebrew name | Lucide icon |
| --- | --- |
| `assets` | `Images` |
| `cards` | `GalleryVerticalEnd` |
| `close` | `X` |
| `collapseLeft` | `PanelLeftClose` |
| `collapseRight` | `PanelRightClose` |
| `collapseUp` | `PanelTopClose` |
| `collections` | `TableProperties` |
| `decks` | `Layers` |
| `download` | `Download` |
| `edit` | `Pencil` |
| `export` | `Upload` |
| `expand` | `Maximize2` |
| `filter` | `Filter` |
| `folder` | `Folder` |
| `guide` | `BookOpen` |
| `new` | `Plus` |
| `redo` | `Redo2` |
| `revert` | `RotateCcw` |
| `save` | `Save` |
| `search` | `Search` |
| `settings` | `Settings` |
| `sets` | `Package` |
| `trash` | `Trash2` |
| `undo` | `Undo2` |
| `universes` | `Globe` |
| `view` | `Eye` |
| `zoom` | `ZoomIn` |

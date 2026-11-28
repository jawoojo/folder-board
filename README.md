# Folder Board

English | [한국어](README.ko.md)

**A keyboard-first, 2D folder explorer for Obsidian.**  
See your folders and notes across multiple columns at a glance, reorganize files with keyboard carry-move or drag-and-drop, and quick-edit notes in a native split pane — without ever digging through a narrow sidebar tree.

> **Desktop only** · Requires Obsidian `1.5.0+` · Auto-detects **English / Korean** (configurable in Settings)

---

## Why Folder Board?

- **See more, scroll less (`Flow` · `Vertical` · `Horizontal`)** — Switch between a borderless multi-column tree (`Flow`, default) and drag-to-split card grids (`Vertical` / `Horizontal`). Every mode remembers its own card order, column count, and card sizes independently.
- **Native Quick Edit loop (`Space` → `Space`/`Tab` → `Esc`)** — Press `Space` to preview any note in a real Obsidian right-split editor (full Live Preview & community plugin support). Press `Space` again (or `Tab`) to start typing immediately, `Esc` to return to the board, and `Esc` again to close.
- **Fastest file triage in Obsidian** — Hold `Option/Alt + Arrows` to carry files across folders (release to drop), press `Option/Alt + 1–9` for one-key filing, or use `Shift + ↑/↓` multi-select with `⌘/Ctrl + C / X / V / Z`.
- **Works as a full sidebar replacement** — Auto-pin the board tab, optionally auto-collapse the left sidebar while browsing, and access **Vault Switcher** (top-left vault name), **Bookmarks** (`B`), and **Obsidian Settings** (`⚙️`) directly from the board toolbar.
- **Obsidian-native visuals** — Mirrors your native File Explorer icons and colors (including `material-icon-theme` and custom icon packs) and adapts cleanly to themes like **Minimal**, **Baseline**, and **Things**.

---

## 3 Layout Modes

| Mode | Best For | Controls |
| --- | --- | --- |
| **Flow** *(Default)* | Scanning an entire vault as a clean, continuous multi-column tree | Drag column gaps to resize width · Hover a folder's bottom edge for `S / M / L` presets or drag up to `200` rows · Smooth wheel scroll inside large folders |
| **Vertical** | Multi-row card dashboard with vertical scrolling | Drag column gaps for `1–6` columns · Drag any card's bottom edge for `1/4`–`Full` height (double-click to toggle full/half) |
| **Horizontal** | Kanban-style board with horizontal scrolling | Exact `1–6` columns fit screen width + horizontal scroll overflow · Drag any card's bottom edge for `1/4`–`Full` height |

- **One-shot folder sort**: Click the sort button (`A↓Z`) in the toolbar to tidy the current folder (`A→Z`, `Z→A`, most items, recently modified) without locking manual drag reordering.

---

## Essential Shortcuts

Press **`?`** anytime inside Folder Board (or open **Settings → Folder Board**) to view the full cheat sheet.

| Category | Shortcut | Action |
| --- | --- | --- |
| **Navigate** | `↑` `↓` `←` `→` | Move across items, cards, and columns (`↑` at top focuses Search) |
| | `1`–`9` / `⌘/Ctrl + ←/→` | Jump to Nth card / first or last card |
| | `Enter` / `⌘/Ctrl + Enter` | Open note or enter folder / open in new tab |
| | `Backspace` | Go to parent folder |
| | `⌘/Ctrl + F` or `/` | Search in board |
| | `B` / `?` | Open Bookmarks menu / Toggle shortcut cheat sheet |
| **Quick Edit & Fold** | `Space` | **File**: 1st press previews, 2nd press focuses editor · **Folder**: fold/unfold |
| | `Tab` / `Esc` | Focus Quick Edit / Return to board (2nd `Esc` closes Quick Edit) |
| | `[` / `]` | Collapse / expand subfolders |
| **Organize** | `Option/Alt + Arrows` | Carry & move selected items (release key to drop) |
| | `Option/Alt + 1`–`9` | Move directly to Nth card |
| | `Shift + ↑/↓` / `⌘/Ctrl + A` | Range multi-select / Select all in card |
| | `⌘/Ctrl + C / X / V / Z` | Copy / Cut / Paste / Undo last move |
| | `N` / `Shift + N` | New note / New folder in focused folder |
| | `F2` or `R` / `⌘/Ctrl + ⌫` | Inline rename / Move to trash |
| **Reorder Cards** | `Shift + ←/→` or Drag Header | Reorder cards (saved independently per layout mode) |

---

## Opening Folder Board

- **File Explorer header button**: Click the grid icon (`⊞`) in the native File Explorer toolbar (`⌘/Ctrl + click` opens the active note's folder).
- **Ribbon icon**: Click the Folder Board icon in the left ribbon.
- **Command Palette (`⌘/Ctrl + P`)**: Run `Folder Board: Open 2D Folder Board` (you can add a custom search alias in Settings for instant lookup).

---

## Installation

### Manual Installation
1. Download `manifest.json`, `main.js`, and `styles.css` from the latest release (or build from `plugin/`).
2. Create the folder `<your-vault>/.obsidian/plugins/folder-board/`.
3. Copy the three files into that folder.
4. Reload Obsidian and enable **Folder Board** in **Settings → Community plugins**.

### Build from Source
```bash
cd plugin
npm install
npm run build
```

---

## Settings Highlights

- **Language**: `Auto` (Korean if Obsidian is set to Korean, English for all other languages), `English`, or `한국어`.
- **Command Palette search alias**: Add your own keyword (updates immediately without restart).
- **Auto-pin Folder Board tab**: Keep the board open while notes open in an adjacent tab (also 1-click toggleable in the board toolbar).
- **Auto-collapse left sidebar**: Automatically hide the left sidebar while viewing Folder Board and restore it when leaving (respects manual collapse and stays collapsed during `Space` Quick Edit).

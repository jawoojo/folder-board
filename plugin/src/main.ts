// [ID 6.6] Folder Board 옵시디언 플러그인 엔트리포인트
// -> ItemView 등록, 리본/커맨드, 설정 탭, 영속 펼침 상태 및 사용자 지정 폴더 순서를 관리함.
import { Plugin, WorkspaceLeaf } from "obsidian";
import { FolderBoardView, VIEW_TYPE_FOLDER_BOARD } from "./board-view";
import { FolderBoardSettingTab } from "./settings";
import { DEFAULT_SETTINGS, type FolderBoardSettings } from "./types";

export default class FolderBoardPlugin extends Plugin {
  settings: FolderBoardSettings = { ...DEFAULT_SETTINGS };
  private expandedSet = new Set<string>();

  async onload(): Promise<void> {
    await this.loadSettings();

    this.registerView(VIEW_TYPE_FOLDER_BOARD, (leaf) => new FolderBoardView(leaf, this));

    this.addRibbonIcon("layout-grid", "Folder Board", () => {
      void this.activateBoardView();
    });

    this.addCommand({
      id: "open-folder-board",
      name: "Open 2D Folder Board",
      hotkeys: [{ modifiers: ["Mod", "Shift"], key: "e" }],
      callback: () => {
        void this.activateBoardView();
      }
    });

    this.addCommand({
      id: "open-folder-board-here",
      name: "Open 2D Folder Board in current folder",
      callback: () => {
        const active = this.app.workspace.getActiveFile();
        const folderPath = active?.parent && !active.parent.isRoot() ? active.parent.path : "";
        void this.activateBoardView(folderPath);
      }
    });

    this.addSettingTab(new FolderBoardSettingTab(this.app, this));
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_FOLDER_BOARD);
  }

  async activateBoardView(folderPath?: string): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_FOLDER_BOARD);
    let leaf: WorkspaceLeaf;

    if (existing.length > 0) {
      leaf = existing[0];
    } else {
      leaf = this.app.workspace.getLeaf("tab");
      await leaf.setViewState({
        type: VIEW_TYPE_FOLDER_BOARD,
        active: true,
        state: { folderPath: folderPath ?? "" }
      });
    }

    this.app.workspace.revealLeaf(leaf);
    this.app.workspace.setActiveLeaf(leaf, { focus: true });

    if (folderPath !== undefined && leaf.view instanceof FolderBoardView) {
      leaf.view.setFolderPath(folderPath);
    }
  }

  refreshOpenViews(): void {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_FOLDER_BOARD)) {
      if (leaf.view instanceof FolderBoardView) {
        leaf.view.refresh();
      }
    }
  }

  async loadSettings(): Promise<void> {
    const saved = (await this.loadData()) as Partial<FolderBoardSettings> | null;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, saved);
    if (!this.settings.folderOrder || typeof this.settings.folderOrder !== "object") {
      this.settings.folderOrder = {};
    }
    this.expandedSet = new Set(this.settings.expandedFolders || []);
  }

  async saveSettings(): Promise<void> {
    this.settings.expandedFolders = [...this.expandedSet];
    await this.saveData(this.settings);
  }

  isFolderExpanded(path: string): boolean {
    return this.expandedSet.has(path);
  }

  async toggleFolderExpanded(path: string): Promise<boolean> {
    const next = !this.expandedSet.has(path);
    if (next) this.expandedSet.add(path);
    else this.expandedSet.delete(path);
    await this.saveSettings();
    return next;
  }

  async setFolderExpanded(path: string, expanded: boolean): Promise<void> {
    if (expanded) this.expandedSet.add(path);
    else this.expandedSet.delete(path);
    await this.saveSettings();
  }

  // [ID 6.6.6] 여러 하위 폴더 펼침/접힘 일괄 반영 (C/E 단축키용 단일 저장)
  async setFoldersExpandedBatch(paths: string[], expanded: boolean): Promise<void> {
    for (const p of paths) {
      if (expanded) this.expandedSet.add(p);
      else this.expandedSet.delete(p);
    }
    await this.saveSettings();
  }

  async renameExpandedFolder(oldPath: string, newPath: string): Promise<void> {
    let changed = false;
    if (this.expandedSet.has(oldPath)) {
      this.expandedSet.delete(oldPath);
      this.expandedSet.add(newPath);
      changed = true;
    }

    const nextOrder: Record<string, string[]> = {};
    for (const [parentKey, list] of Object.entries(this.settings.folderOrder)) {
      const updatedParent = parentKey === oldPath ? newPath : parentKey;
      const updatedList = list.map((p) => (p === oldPath ? newPath : p));
      if (updatedParent !== parentKey || updatedList.some((v, i) => v !== list[i])) {
        changed = true;
      }
      nextOrder[updatedParent] = updatedList;
    }
    this.settings.folderOrder = nextOrder;

    if (changed) await this.saveSettings();
  }

  getFolderOrder(parentPath: string): string[] {
    return this.settings.folderOrder[parentPath] || [];
  }

  async setFolderOrder(parentPath: string, orderedPaths: string[]): Promise<void> {
    this.settings.folderOrder[parentPath] = orderedPaths;
    await this.saveSettings();
  }
}

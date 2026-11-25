// [ID 6.6] Folder Board 옵시디언 플러그인 엔트리포인트
// -> 노트와 동일한 워크스페이스 평면(ItemView)에 Folder Board를 등록하고,
// -> 리본 아이콘·커맨드·설정 탭·영속 폴더 펼침 상태를 통합 관리함.
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

    // 좌측 리본 아이콘: 탐색기 옆 메인 영역에 Folder Board 탭 열기/전환
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
        const folderPath = active?.parent?.path || "";
        void this.activateBoardView(folderPath);
      }
    });

    this.addSettingTab(new FolderBoardSettingTab(this.app, this));
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_FOLDER_BOARD);
  }

  // [ID 6.6.2] 워크스페이스 메인 탭 열기/활성화
  // -> 이미 열려 있는 Folder Board 탭이 있으면 새 탭을 중복 생성하지 않고 해당 탭으로 즉시 포커스 전환함.
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

  async renameExpandedFolder(oldPath: string, newPath: string): Promise<void> {
    if (!this.expandedSet.has(oldPath)) return;
    this.expandedSet.delete(oldPath);
    this.expandedSet.add(newPath);
    await this.saveSettings();
  }
}

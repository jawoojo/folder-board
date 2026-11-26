// [ID 6.6] Folder Board 옵시디언 플러그인 엔트리포인트
// -> ItemView 등록, 리본/커맨드, 영속 펼침·폴더 순서 저장, 좌측 네이티브 파일 탐색기 ↔ 폴더 보드 방향키 브릿지를 관리함.
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

    // [ID 6.6.3] 좌측 네이티브 파일 탐색기 → Folder Board 방향키(→) 복귀 브릿지
    // -> 왼쪽 파일 탐색기에서 파일(또는 비어 있는 펼쳐진 폴더)에 포커스된 상태로 → 를 누르면 Folder Board 첫 카드로 자연스럽게 복귀함.
    this.registerDomEvent(document, "keydown", (e: KeyboardEvent) => {
      if (e.key !== "ArrowRight" || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (document.querySelector(".modal-container")) return;
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select")) return;

      const activeLeaf = this.app.workspace.activeLeaf;
      if (!activeLeaf || activeLeaf.view.getViewType() !== "file-explorer") return;

      const boardLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FOLDER_BOARD);
      if (boardLeaves.length === 0) return;

      // 접혀 있는 폴더나 자식이 있는 펼쳐진 폴더에서는 옵시디언 기본 → (펼치기/하위 진입) 동작을 존중함
      const explorerEl = activeLeaf.view.containerEl;
      const focusedNode = explorerEl.querySelector<HTMLElement>(
        ".tree-item-self.has-focus, .tree-item-self.is-being-focused"
      );
      if (focusedNode?.classList.contains("nav-folder-title")) {
        const treeItem = focusedNode.closest(".tree-item");
        const isCollapsed = treeItem?.classList.contains("is-collapsed");
        const hasChildren = Boolean(treeItem?.querySelector(".tree-item-children > .tree-item"));
        if (isCollapsed || hasChildren) return;
      }

      e.preventDefault();
      e.stopPropagation();

      const targetLeaf = boardLeaves[0];
      this.app.workspace.revealLeaf(targetLeaf);
      this.app.workspace.setActiveLeaf(targetLeaf, { focus: true });
      if (targetLeaf.view instanceof FolderBoardView) {
        targetLeaf.view.focusFromLeftSidebar();
      }
    }, true);

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

  async renameExpandedFolder(oldPath: string, newPath: string): Promise<void> {
    let changed = false;
    if (this.expandedSet.has(oldPath)) {
      this.expandedSet.delete(oldPath);
      this.expandedSet.add(newPath);
      changed = true;
    }

    // [ID 6.6.4] 폴더 이름/경로 변경 시 사용자 지정 순서 맵도 함께 동기화
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

  // [ID 6.6.5] 부모 폴더별 사용자 지정 카드 순서 조회/저장
  getFolderOrder(parentPath: string): string[] {
    return this.settings.folderOrder[parentPath] || [];
  }

  async setFolderOrder(parentPath: string, orderedPaths: string[]): Promise<void> {
    this.settings.folderOrder[parentPath] = orderedPaths;
    await this.saveSettings();
  }
}

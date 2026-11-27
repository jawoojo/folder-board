// [ID 6.6] Folder Board 옵시디언 플러그인 엔트리포인트
// -> ItemView 등록, 리본/커맨드, 설정 탭, 영속 펼침·접힘 상태 및 사용자 지정 폴더 순서를 관리함.
import { Command, Plugin, WorkspaceLeaf } from "obsidian";
import { FolderBoardView, VIEW_TYPE_FOLDER_BOARD } from "./board-view";
import { FolderBoardSettingTab } from "./settings";
import { DEFAULT_SETTINGS, type FlowWindowSizeSpec, type FolderBoardSettings } from "./types";

export default class FolderBoardPlugin extends Plugin {
  settings: FolderBoardSettings = { ...DEFAULT_SETTINGS };
  private expandedSet = new Set<string>();
  private collapsedFlowSet = new Set<string>();
  private tallGridCardSet = new Set<string>();
  private openBoardCmd: Command | null = null;
  private openBoardHereCmd: Command | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.registerView(VIEW_TYPE_FOLDER_BOARD, (leaf) => new FolderBoardView(leaf, this));

    this.addRibbonIcon("layout-grid", "Folder Board", () => {
      void this.activateBoardView();
    });

    this.openBoardCmd = this.addCommand({
      id: "open-folder-board",
      name: this.buildOpenCommandLabel(false),
      hotkeys: [{ modifiers: ["Mod", "Shift"], key: "e" }],
      callback: () => {
        void this.activateBoardView();
      }
    });

    this.openBoardHereCmd = this.addCommand({
      id: "open-folder-board-here",
      name: this.buildOpenCommandLabel(true),
      callback: () => {
        const active = this.app.workspace.getActiveFile();
        const folderPath = active?.parent && !active.parent.isRoot() ? active.parent.path : "";
        void this.activateBoardView(folderPath);
      }
    });

    this.addSettingTab(new FolderBoardSettingTab(this.app, this));
  }

  // [ID 6.6.9] 커맨드 팔레트(Cmd+P) 사용자 지정 문구 즉시 반영 (핫키 ID 보존)
  // -> 한글 등 원하는 검색 문구를 추가해 한영 전환 없이 Cmd+P에서 바로 폴더 보드를 열 수 있게 함.
  private buildOpenCommandLabel(inCurrentFolder: boolean): string {
    const alias = (this.settings.openCommandAlias || "").trim();
    if (!inCurrentFolder) {
      return alias ? `Open 2D Folder Board · ${alias}` : "Open 2D Folder Board";
    }
    return alias
      ? `Open 2D Folder Board in current folder · ${alias} (현재 폴더)`
      : "Open 2D Folder Board in current folder";
  }

  syncCommandNames(): void {
    const prefix = `${this.manifest.name}: `;
    if (this.openBoardCmd) {
      this.openBoardCmd.name = `${prefix}${this.buildOpenCommandLabel(false)}`;
    }
    if (this.openBoardHereCmd) {
      this.openBoardHereCmd.name = `${prefix}${this.buildOpenCommandLabel(true)}`;
    }
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
    if (typeof this.settings.flowColumnWidth !== "number" || !Number.isFinite(this.settings.flowColumnWidth)) {
      this.settings.flowColumnWidth = DEFAULT_SETTINGS.flowColumnWidth;
    }
    if (
      typeof this.settings.quickLookSplitRatio !== "number" ||
      !Number.isFinite(this.settings.quickLookSplitRatio)
    ) {
      this.settings.quickLookSplitRatio = DEFAULT_SETTINGS.quickLookSplitRatio;
    }
    if (!this.settings.flowWindowSizes || typeof this.settings.flowWindowSizes !== "object") {
      this.settings.flowWindowSizes = {};
    }
    // 구버전 expandedFlowWindows 설정을 소/중/대 규격("lg")으로 자동 마이그레이션
    if (Array.isArray(this.settings.expandedFlowWindows) && this.settings.expandedFlowWindows.length > 0) {
      for (const k of this.settings.expandedFlowWindows) {
        if (!(k in this.settings.flowWindowSizes)) {
          this.settings.flowWindowSizes[k] = "lg";
        }
      }
      delete this.settings.expandedFlowWindows;
    }
    if (typeof this.settings.openCommandAlias !== "string") {
      this.settings.openCommandAlias = DEFAULT_SETTINGS.openCommandAlias;
    }
    this.expandedSet = new Set(this.settings.expandedFolders || []);
    this.collapsedFlowSet = new Set(this.settings.collapsedFlowSections || []);
    this.tallGridCardSet = new Set(this.settings.tallGridCards || []);
  }

  async saveSettings(): Promise<void> {
    this.settings.expandedFolders = [...this.expandedSet];
    this.settings.collapsedFlowSections = [...this.collapsedFlowSet];
    this.settings.tallGridCards = [...this.tallGridCardSet];
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

  async setFoldersExpandedBatch(paths: string[], expanded: boolean): Promise<void> {
    for (const p of paths) {
      if (expanded) this.expandedSet.add(p);
      else this.expandedSet.delete(p);
    }
    await this.saveSettings();
  }

  // [ID 6.6.7] 여러줄 모드(flow) 폴더 섹션 접힘/펼침 영속 관리
  isFlowSectionCollapsed(path: string): boolean {
    return this.collapsedFlowSet.has(path);
  }

  async toggleFlowSectionCollapsed(path: string): Promise<boolean> {
    const next = !this.collapsedFlowSet.has(path);
    if (next) this.collapsedFlowSet.add(path);
    else this.collapsedFlowSet.delete(path);
    await this.saveSettings();
    return next;
  }

  async setFlowSectionsCollapsedBatch(paths: string[], collapsed: boolean): Promise<void> {
    for (const p of paths) {
      if (collapsed) this.collapsedFlowSet.add(p);
      else this.collapsedFlowSet.delete(p);
    }
    await this.saveSettings();
  }

  // [ID 6.6.8] 여러줄 모드(flow) 폴더별 표시 길이(소·중·대 또는 드래그 지정 행 수) 영속 관리
  getFlowWindowSizeSpec(key: string): FlowWindowSizeSpec {
    return this.settings.flowWindowSizes[key] ?? "md";
  }

  async setFlowWindowSizeSpec(key: string, spec: FlowWindowSizeSpec): Promise<void> {
    if (spec === "md") {
      delete this.settings.flowWindowSizes[key];
    } else {
      this.settings.flowWindowSizes[key] = spec;
    }
    await this.saveSettings();
  }

  hasAnyDynamicFlowWindow(): boolean {
    return Object.values(this.settings.flowWindowSizes).some((v) => v === "lg" || typeof v === "number");
  }

  // [ID 6.6.10] 카드 모드(그리드·세로) 세로 확장(화면 1줄) 카드 상태 영속 관리
  isGridCardTall(key: string): boolean {
    return this.tallGridCardSet.has(key);
  }

  async toggleGridCardTall(key: string): Promise<boolean> {
    const next = !this.tallGridCardSet.has(key);
    if (next) this.tallGridCardSet.add(key);
    else this.tallGridCardSet.delete(key);
    await this.saveSettings();
    return next;
  }

  async resetAllExpandedStates(): Promise<void> {
    this.expandedSet.clear();
    this.collapsedFlowSet.clear();
    this.tallGridCardSet.clear();
    this.settings.flowWindowSizes = {};
    await this.saveSettings();
  }

  async renameExpandedFolder(oldPath: string, newPath: string): Promise<void> {
    let changed = false;
    if (this.expandedSet.has(oldPath)) {
      this.expandedSet.delete(oldPath);
      this.expandedSet.add(newPath);
      changed = true;
    }
    if (this.collapsedFlowSet.has(oldPath)) {
      this.collapsedFlowSet.delete(oldPath);
      this.collapsedFlowSet.add(newPath);
      changed = true;
    }
    if (this.tallGridCardSet.has(oldPath)) {
      this.tallGridCardSet.delete(oldPath);
      this.tallGridCardSet.add(newPath);
      changed = true;
    }
    if (oldPath in this.settings.flowWindowSizes) {
      this.settings.flowWindowSizes[newPath] = this.settings.flowWindowSizes[oldPath];
      delete this.settings.flowWindowSizes[oldPath];
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

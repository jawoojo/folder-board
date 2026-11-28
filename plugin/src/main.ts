// [ID 6.6] Folder Board 옵시디언 플러그인 엔트리포인트
// -> ItemView 등록, 리본/커맨드, 설정 탭, 영속 펼침·접힘 상태 및 사용자 지정 폴더 순서를 관리함.
import { Command, Plugin, WorkspaceLeaf, WorkspaceSidedock, setIcon } from "obsidian";
import { FolderBoardView, VIEW_TYPE_FOLDER_BOARD } from "./board-view";
import { FolderBoardSettingTab } from "./settings";
import { DEFAULT_SETTINGS, type FlowWindowSizeSpec, type FolderBoardSettings, type LayoutColumns } from "./types";

export default class FolderBoardPlugin extends Plugin {
  settings: FolderBoardSettings = { ...DEFAULT_SETTINGS };
  private expandedSet = new Set<string>();
  private collapsedFlowSet = new Set<string>();
  private openBoardCmd: Command | null = null;
  private openBoardHereCmd: Command | null = null;
  // [ID 6.6.13] Folder Board 활성 시 좌측 사이드바 자동 접힘/복원 상태 추적
  // -> 보드가 직접 접었을 때만(leftSidebarCollapsedByBoard) 다른 탭 전환 시 복원해 수동 접힘 상태를 존중함.
  private leftSidebarCollapsedByBoard = false;
  private lastBoardVisible = false;
  private sidebarSyncRaf: number | null = null;

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

    // [ID 6.6.11] 좌측 기본 파일 탐색기 상단 툴바(.nav-buttons-container)에 Folder Board 바로가기 버튼 주입
    this.app.workspace.onLayoutReady(() => {
      this.injectFileExplorerLaunchButtons();
      this.scheduleLeftSidebarSync();
    });
    this.registerEvent(
      this.app.workspace.on("layout-change", () => {
        this.injectFileExplorerLaunchButtons();
        this.scheduleLeftSidebarSync();
      })
    );
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        this.scheduleLeftSidebarSync();
      })
    );
  }

  // [ID 6.6.13] Folder Board 가시성 기준 좌측 사이드바 스마트 자동 접힘·복원
  // -> 1) 수동 접힘 존중(직접 접어둔 사이드바는 나갔다 와도 안 펼침),
  // -> 2) Space 우측 분할 편집기 편집 중에는 보드가 여전히 화면에 보이므로 사이드바가 튀어나오지 않음,
  // -> 3) 보드 화면에서 사용자가 직접 사이드바를 펼치면 재접힘하지 않음.
  private getDesktopLeftSplit(): WorkspaceSidedock | null {
    const split = this.app.workspace.leftSplit;
    return split instanceof WorkspaceSidedock ? split : null;
  }

  private isAnyFolderBoardVisible(): boolean {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FOLDER_BOARD);
    for (const leaf of leaves) {
      if (leaf.getRoot() !== this.app.workspace.rootSplit) continue;
      const el = leaf.view?.containerEl;
      if (el && el.isConnected && el.offsetParent !== null) {
        return true;
      }
    }
    return false;
  }

  private scheduleLeftSidebarSync(): void {
    if (this.sidebarSyncRaf !== null) {
      window.cancelAnimationFrame(this.sidebarSyncRaf);
    }
    this.sidebarSyncRaf = window.requestAnimationFrame(() => {
      this.sidebarSyncRaf = null;
      this.syncLeftSidebarAutoCollapse();
    });
  }

  private syncLeftSidebarAutoCollapse(): void {
    const leftSplit = this.getDesktopLeftSplit();
    const nowVisible = this.isAnyFolderBoardVisible();
    const wasVisible = this.lastBoardVisible;
    this.lastBoardVisible = nowVisible;

    if (!leftSplit) return;

    if (!this.settings.autoCollapseLeftSidebar) {
      if (this.leftSidebarCollapsedByBoard) {
        leftSplit.expand();
        this.leftSidebarCollapsedByBoard = false;
      }
      return;
    }

    if (nowVisible && !wasVisible) {
      // 보드 화면에 새로 진입: 좌측 패널이 열려 있었을 때만 접고 플래그 기록
      if (!leftSplit.collapsed) {
        leftSplit.collapse();
        this.leftSidebarCollapsedByBoard = true;
      } else {
        this.leftSidebarCollapsedByBoard = false;
      }
    } else if (!nowVisible && wasVisible) {
      // 보드 화면에서 완전히 벗어남: 보드가 접었던 경우에만 원래대로 펼침
      if (this.leftSidebarCollapsedByBoard) {
        leftSplit.expand();
        this.leftSidebarCollapsedByBoard = false;
      }
    } else if (nowVisible && !leftSplit.collapsed) {
      // 보드 화면에서 사용자가 직접 좌측 패널을 열었으면 자동 복원 대상 해제 (강제 재접힘 안 함)
      this.leftSidebarCollapsedByBoard = false;
    }
  }

  async setAutoCollapseLeftSidebar(enabled: boolean): Promise<void> {
    this.settings.autoCollapseLeftSidebar = enabled;
    await this.saveSettings();

    const leftSplit = this.getDesktopLeftSplit();
    if (leftSplit) {
      if (enabled && this.isAnyFolderBoardVisible()) {
        if (!leftSplit.collapsed) {
          leftSplit.collapse();
          this.leftSidebarCollapsedByBoard = true;
        }
      } else if (!enabled && this.leftSidebarCollapsedByBoard) {
        leftSplit.expand();
        this.leftSidebarCollapsedByBoard = false;
      }
    }

    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_FOLDER_BOARD)) {
      if (leaf.view instanceof FolderBoardView) {
        leaf.view.syncSidebarCollapseButtonState();
      }
    }
  }

  // [ID 6.6.11] 옵시디언 기본 탐색기 헤더 버튼 주입 및 언로드 정리
  // -> .nav-buttons-container 맨 뒤에 네이티브 클래스로 1개만 추가해 테마·타 플러그인 버튼과 자연스럽게 어우러짐.
  private injectFileExplorerLaunchButtons(): void {
    const leaves = this.app.workspace.getLeavesOfType("file-explorer");
    for (const leaf of leaves) {
      const buttonsEl = leaf.view.containerEl.querySelector<HTMLElement>(".nav-header .nav-buttons-container");
      if (!buttonsEl || buttonsEl.querySelector(".fb-explorer-launch-btn")) continue;

      const btn = buttonsEl.createDiv({
        cls: "clickable-icon nav-action-button fb-explorer-launch-btn",
        attr: { "aria-label": "Folder Board 열기 (⌘/Ctrl+클릭: 현재 폴더)" }
      });
      setIcon(btn, "layout-grid");
      btn.addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.metaKey || e.ctrlKey) {
          const active = this.app.workspace.getActiveFile();
          const folderPath = active?.parent && !active.parent.isRoot() ? active.parent.path : "";
          void this.activateBoardView(folderPath);
        } else {
          void this.activateBoardView();
        }
      });
    }
  }

  private removeFileExplorerLaunchButtons(): void {
    document.querySelectorAll(".fb-explorer-launch-btn").forEach((el) => el.remove());
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
    if (this.sidebarSyncRaf !== null) {
      window.cancelAnimationFrame(this.sidebarSyncRaf);
      this.sidebarSyncRaf = null;
    }
    if (this.leftSidebarCollapsedByBoard) {
      this.getDesktopLeftSplit()?.expand();
      this.leftSidebarCollapsedByBoard = false;
    }
    this.removeFileExplorerLaunchButtons();
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
      if (this.settings.autoPinTab) {
        leaf.setPinned(true);
      }
    }

    // [ID 6.6.12] 메인 탭 전환 시 revealLeaf()의 갈색 강조 깜박임 방지
    // -> 사이드바 서랍에 도킹된 경우에만 revealLeaf()를 호출하고, 메인 탭은 setActiveLeaf()로 즉시 깔끔하게 전환함.
    if (leaf.getRoot() !== this.app.workspace.rootSplit) {
      this.app.workspace.revealLeaf(leaf);
    }
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

  syncOpenBoardPinState(pinned: boolean): void {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_FOLDER_BOARD)) {
      leaf.setPinned(pinned);
      if (leaf.view instanceof FolderBoardView) {
        leaf.view.syncPinButtonState();
      }
    }
  }

  async loadSettings(): Promise<void> {
    const saved = (await this.loadData()) as (Omit<Partial<FolderBoardSettings>, "gridCols"> & { gridCols?: unknown }) | null;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, saved) as FolderBoardSettings;

    // [ID 6.6.14] 구버전 레이아웃 설정(2/3/4/auto/scroll) → Flow/Vertical/Horizontal 자동 마이그레이션
    const rawLayout: unknown = saved?.gridCols;
    if (rawLayout === 2 || rawLayout === 3 || rawLayout === 4) {
      this.settings.gridCols = "vertical";
      if (typeof saved?.verticalCols !== "number") {
        this.settings.verticalCols = rawLayout;
      }
    } else if (rawLayout === "auto") {
      this.settings.gridCols = "vertical";
    } else if (rawLayout === "scroll") {
      this.settings.gridCols = "horizontal";
    } else if (
      this.settings.gridCols !== "flow" &&
      this.settings.gridCols !== "vertical" &&
      this.settings.gridCols !== "horizontal"
    ) {
      this.settings.gridCols = DEFAULT_SETTINGS.gridCols;
    }

    if (typeof this.settings.verticalCols !== "number" || !Number.isFinite(this.settings.verticalCols)) {
      this.settings.verticalCols = DEFAULT_SETTINGS.verticalCols;
    } else {
      this.settings.verticalCols = Math.max(1, Math.min(6, Math.round(this.settings.verticalCols)));
    }
    if (typeof this.settings.horizontalCols !== "number" || !Number.isFinite(this.settings.horizontalCols)) {
      this.settings.horizontalCols = DEFAULT_SETTINGS.horizontalCols;
    } else {
      this.settings.horizontalCols = Math.max(1, Math.min(6, Math.round(this.settings.horizontalCols)));
    }
    // [ID 6.6.15] 모드별 독립 카드 높이(cardRowUnitsByMode) 및 독립 폴더 순서(folderOrderByMode) 초기화·마이그레이션
    const savedUnitsByMode = saved?.cardRowUnitsByMode;
    this.settings.cardRowUnitsByMode = {
      vertical:
        savedUnitsByMode?.vertical && typeof savedUnitsByMode.vertical === "object"
          ? { ...savedUnitsByMode.vertical }
          : {},
      horizontal:
        savedUnitsByMode?.horizontal && typeof savedUnitsByMode.horizontal === "object"
          ? { ...savedUnitsByMode.horizontal }
          : {}
    };
    if (saved?.cardRowUnits && typeof saved.cardRowUnits === "object") {
      for (const [k, v] of Object.entries(saved.cardRowUnits)) {
        if (typeof v === "number" && Number.isFinite(v) && !(k in this.settings.cardRowUnitsByMode.vertical)) {
          this.settings.cardRowUnitsByMode.vertical[k] = v;
        }
      }
      delete this.settings.cardRowUnits;
    }
    if (Array.isArray(this.settings.tallGridCards) && this.settings.tallGridCards.length > 0) {
      for (const k of this.settings.tallGridCards) {
        if (!(k in this.settings.cardRowUnitsByMode.vertical)) {
          this.settings.cardRowUnitsByMode.vertical[k] = 12;
        }
      }
      delete this.settings.tallGridCards;
    }

    const savedOrderByMode = saved?.folderOrderByMode;
    this.settings.folderOrderByMode = {
      flow:
        savedOrderByMode?.flow && typeof savedOrderByMode.flow === "object"
          ? { ...savedOrderByMode.flow }
          : {},
      vertical:
        savedOrderByMode?.vertical && typeof savedOrderByMode.vertical === "object"
          ? { ...savedOrderByMode.vertical }
          : {},
      horizontal:
        savedOrderByMode?.horizontal && typeof savedOrderByMode.horizontal === "object"
          ? { ...savedOrderByMode.horizontal }
          : {}
    };
    // 구버전 공용 folderOrder → 각 모드 초기값으로 1회 복제 후 이후부터 완전 독립 저장
    if (saved?.folderOrder && typeof saved.folderOrder === "object") {
      const legacyEntries = Object.entries(saved.folderOrder);
      if (legacyEntries.length > 0) {
        for (const mode of ["flow", "vertical", "horizontal"] as const) {
          if (Object.keys(this.settings.folderOrderByMode[mode]).length === 0) {
            for (const [parentKey, list] of legacyEntries) {
              if (Array.isArray(list)) {
                this.settings.folderOrderByMode[mode][parentKey] = [...list];
              }
            }
          }
        }
      }
      delete this.settings.folderOrder;
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
    if (typeof this.settings.autoPinTab !== "boolean") {
      this.settings.autoPinTab = DEFAULT_SETTINGS.autoPinTab;
    }
    if (typeof this.settings.autoCollapseLeftSidebar !== "boolean") {
      this.settings.autoCollapseLeftSidebar = DEFAULT_SETTINGS.autoCollapseLeftSidebar;
    }
    this.expandedSet = new Set(this.settings.expandedFolders || []);
    this.collapsedFlowSet = new Set(this.settings.collapsedFlowSections || []);
  }

  async saveSettings(): Promise<void> {
    this.settings.expandedFolders = [...this.expandedSet];
    this.settings.collapsedFlowSections = [...this.collapsedFlowSet];
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

  // [ID 6.6.10] Vertical/Horizontal 모드별 독립 12분할 카드 높이(3=1/4 .. 12=전체) 영속 관리
  getCardRowUnits(mode: "vertical" | "horizontal", key: string): number | null {
    const v = this.settings.cardRowUnitsByMode[mode]?.[key];
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  }

  async setCardRowUnits(mode: "vertical" | "horizontal", key: string, units: number | null): Promise<void> {
    const bucket = this.settings.cardRowUnitsByMode[mode];
    if (units === null) {
      delete bucket[key];
    } else {
      bucket[key] = units;
    }
    await this.saveSettings();
  }

  async resetAllExpandedStates(): Promise<void> {
    this.expandedSet.clear();
    this.collapsedFlowSet.clear();
    this.settings.cardRowUnitsByMode = { vertical: {}, horizontal: {} };
    this.settings.flowWindowSizes = {};
    await this.saveSettings();
  }

  async resetAllFolderOrders(): Promise<void> {
    this.settings.folderOrderByMode = { flow: {}, vertical: {}, horizontal: {} };
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
    for (const cardMode of ["vertical", "horizontal"] as const) {
      const bucket = this.settings.cardRowUnitsByMode[cardMode];
      if (oldPath in bucket) {
        bucket[newPath] = bucket[oldPath];
        delete bucket[oldPath];
        changed = true;
      }
    }
    if (oldPath in this.settings.flowWindowSizes) {
      this.settings.flowWindowSizes[newPath] = this.settings.flowWindowSizes[oldPath];
      delete this.settings.flowWindowSizes[oldPath];
      changed = true;
    }

    for (const layoutMode of ["flow", "vertical", "horizontal"] as const) {
      const prevMap = this.settings.folderOrderByMode[layoutMode];
      const nextOrder: Record<string, string[]> = {};
      for (const [parentKey, list] of Object.entries(prevMap)) {
        const updatedParent = parentKey === oldPath ? newPath : parentKey;
        const updatedList = list.map((p) => (p === oldPath ? newPath : p));
        if (updatedParent !== parentKey || updatedList.some((v, i) => v !== list[i])) {
          changed = true;
        }
        nextOrder[updatedParent] = updatedList;
      }
      this.settings.folderOrderByMode[layoutMode] = nextOrder;
    }

    if (changed) await this.saveSettings();
  }

  getFolderOrder(mode: LayoutColumns, parentPath: string): string[] {
    return this.settings.folderOrderByMode[mode]?.[parentPath] || [];
  }

  async setFolderOrder(mode: LayoutColumns, parentPath: string, orderedPaths: string[]): Promise<void> {
    this.settings.folderOrderByMode[mode][parentPath] = orderedPaths;
    await this.saveSettings();
  }

  async clearFolderOrder(mode: LayoutColumns, parentPath: string): Promise<void> {
    delete this.settings.folderOrderByMode[mode][parentPath];
    await this.saveSettings();
  }
}

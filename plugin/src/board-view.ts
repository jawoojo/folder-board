// [ID 6.5] 2D 네이티브 폴더 탐색기 워크스페이스 뷰 (FolderBoardView extends ItemView)
// -> 모달 팝업이 아니라 노트와 동일한 평면(탐색기 옆 메인 탭 영역)에서 열리도록 ItemView로 구현하고,
// -> 옵시디언 기본 UI 클래스(clickable-icon, search-input-container, nav-files-container)를 그대로 사용해 테마 통일성을 보장함.
import {
  Component,
  EventRef,
  ItemView,
  MarkdownRenderer,
  Notice,
  TAbstractFile,
  TFile,
  TFolder,
  WorkspaceLeaf,
  normalizePath,
  setIcon
} from "obsidian";
import type FolderBoardPlugin from "./main";
import { NamePromptModal } from "./name-modal";
import {
  applyNativeDecoration,
  getFileByPath,
  getFolderByPath,
  openNativeFileMenu
} from "./native-sync";
import type { BoardCardModel, CardTreeItem, MoveUndoEntry } from "./types";

export const VIEW_TYPE_FOLDER_BOARD = "folder-board-view";
const DRAG_MIME = "application/x-obsidian-folder-board";

interface FolderBoardViewState {
  folderPath?: string;
}

export class FolderBoardView extends ItemView {
  private plugin: FolderBoardPlugin;
  private currentFolderPath = "";
  private searchQuery = "";
  private focusedCardIndex = 0;
  private focusedItemKey: string | null = null;
  private selectedPaths = new Set<string>();
  private shelfPaths: string[] = [];
  private undoStack: MoveUndoEntry[] = [];
  private quickLookOpen = false;
  private renderedCards: BoardCardModel[] = [];

  private activeDragPaths: string[] = [];
  private currentDropEl: HTMLElement | null = null;
  private isDragging = false;
  private isSubModalOpen = false;

  // DOM 레퍼런스
  private shellEl!: HTMLElement;
  private backBtnEl!: HTMLButtonElement;
  private breadcrumbEl!: HTMLElement;
  private searchInputEl!: HTMLInputElement;
  private clearSearchEl!: HTMLElement;
  private colBtns: HTMLButtonElement[] = [];
  private sortBtnEl!: HTMLButtonElement;
  private newNoteBtnEl!: HTMLButtonElement;
  private newFolderBtnEl!: HTMLButtonElement;
  private qlBtnEl!: HTMLButtonElement;
  private gridEl!: HTMLElement;
  private qlDrawerEl!: HTMLElement;
  private qlTitleEl!: HTMLElement;
  private qlBodyEl!: HTMLElement;
  private shelfEl!: HTMLElement;
  private shelfListEl!: HTMLElement;
  private shelfDropHereBtn!: HTMLButtonElement;
  private selectionBarEl!: HTMLElement;
  private selectionCountEl!: HTMLElement;

  private markdownComponent: Component | null = null;
  private vaultRefs: EventRef[] = [];
  private boundKeydown: (e: KeyboardEvent) => void;
  private boundDragOver: (e: DragEvent) => void;
  private boundDragLeave: (e: DragEvent) => void;
  private boundDrop: (e: DragEvent) => void;
  private boundDragEnd: () => void;
  private refreshTimer: number | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: FolderBoardPlugin) {
    super(leaf);
    this.plugin = plugin;

    this.boundKeydown = this.handleKeydown.bind(this);
    this.boundDragOver = this.handleDragOver.bind(this);
    this.boundDragLeave = this.handleDragLeave.bind(this);
    this.boundDrop = this.handleDrop.bind(this);
    this.boundDragEnd = this.handleDragEnd.bind(this);
  }

  getViewType(): string {
    return VIEW_TYPE_FOLDER_BOARD;
  }

  getDisplayText(): string {
    if (!this.currentFolderPath) return "Folder Board";
    const parts = this.currentFolderPath.split("/");
    return parts[parts.length - 1] || "Folder Board";
  }

  getIcon(): string {
    return "layout-grid";
  }

  getState(): Record<string, unknown> {
    return { folderPath: this.currentFolderPath };
  }

  async setState(state: FolderBoardViewState, result: { history: boolean }): Promise<void> {
    if (typeof state?.folderPath === "string") {
      this.currentFolderPath = state.folderPath;
    }
    await super.setState(state, result);
    if (this.shellEl) {
      this.renderAll();
    }
  }

  setFolderPath(folderPath: string): void {
    this.currentFolderPath = folderPath;
    this.focusedCardIndex = 0;
    this.focusedItemKey = null;
    this.renderAll();
    if (this.renderedCards[0]?.items[0]) {
      this.focusCardItem(0, 0);
    }
  }

  refresh(): void {
    if (this.shellEl) this.renderAll();
  }

  async onOpen(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass("fb-view-content");

    this.buildShell();
    this.bindVaultEvents();
    this.bindInteractionEvents();
    this.renderAll();

    if (!this.findFocusedCardAndIndex().item && this.renderedCards[0]?.items[0]) {
      this.focusCardItem(0, 0);
    }

    requestAnimationFrame(() => this.shellEl?.focus());
  }

  async onClose(): Promise<void> {
    this.unbindVaultEvents();
    document.removeEventListener("keydown", this.boundKeydown, true);
    this.contentEl.removeEventListener("dragover", this.boundDragOver);
    this.contentEl.removeEventListener("dragleave", this.boundDragLeave);
    this.contentEl.removeEventListener("drop", this.boundDrop);
    document.removeEventListener("dragend", this.boundDragEnd);

    if (this.refreshTimer !== null) {
      window.clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.unloadMarkdownComponent();
    this.contentEl.empty();
  }

  private buildShell(): void {
    this.shellEl = this.contentEl.createDiv({
      cls: "fb-shell",
      attr: { tabindex: "-1" }
    });

    // 상단 미니멀 툴바 (옵시디언 네이티브 clickable-icon / search-input-container 사용 -> 테마 자동 통일)
    const header = this.shellEl.createDiv({ cls: "fb-header" });
    const navLeft = header.createDiv({ cls: "fb-nav-left" });

    this.backBtnEl = navLeft.createEl("button", {
      cls: "clickable-icon fb-tool-btn",
      attr: { "aria-label": "상위 폴더 (Backspace)" }
    });
    setIcon(this.backBtnEl, "arrow-left");
    this.backBtnEl.addEventListener("click", () => this.goUp());

    this.breadcrumbEl = navLeft.createDiv({ cls: "fb-breadcrumb" });

    const controls = header.createDiv({ cls: "fb-controls" });

    // 옵시디언 네이티브 검색창 구조 적용
    const searchWrap = controls.createDiv({ cls: "search-input-container fb-search-wrap" });
    this.searchInputEl = searchWrap.createEl("input", {
      type: "search",
      cls: "fb-search-input",
      placeholder: "검색..."
    });
    this.clearSearchEl = searchWrap.createDiv({
      cls: "search-input-clear-button is-hidden",
      attr: { "aria-label": "검색 지우기" }
    });

    this.searchInputEl.addEventListener("input", () => {
      this.searchQuery = this.searchInputEl.value;
      this.clearSearchEl.toggleClass("is-hidden", !this.searchQuery);
      this.renderGridAndHeader();
    });
    this.clearSearchEl.addEventListener("click", () => {
      this.searchQuery = "";
      this.searchInputEl.value = "";
      this.clearSearchEl.addClass("is-hidden");
      this.renderGridAndHeader();
    });

    // 열 개수 세그먼트 (2 / 3 / 4)
    const colGroup = controls.createDiv({ cls: "fb-segmented" });
    this.colBtns = ([2, 3, 4] as const).map((cols) => {
      const btn = colGroup.createEl("button", {
        cls: "clickable-icon fb-seg-btn",
        text: String(cols),
        attr: { "aria-label": `${cols}열 보기` }
      });
      btn.addEventListener("click", async () => {
        this.plugin.settings.gridCols = cols;
        await this.plugin.saveSettings();
        this.renderGridAndHeader();
      });
      return btn;
    });

    // 정렬 토글 (이름순 ↔ 최근 수정순) — 모든 옵시디언 버전에 내장된 Lucide 아이콘 사용
    this.sortBtnEl = controls.createEl("button", { cls: "clickable-icon fb-tool-btn" });
    this.sortBtnEl.addEventListener("click", async () => {
      this.plugin.settings.sortBy = this.plugin.settings.sortBy === "name" ? "mtime" : "name";
      await this.plugin.saveSettings();
      this.renderGridAndHeader();
    });

    controls.createDiv({ cls: "fb-divider" });

    // 포커싱된 폴더에 새 노트 / 새 폴더 생성
    this.newNoteBtnEl = controls.createEl("button", { cls: "clickable-icon fb-tool-btn" });
    setIcon(this.newNoteBtnEl, "file-plus");
    this.newNoteBtnEl.addEventListener("click", () => this.promptCreateNote());

    this.newFolderBtnEl = controls.createEl("button", { cls: "clickable-icon fb-tool-btn" });
    setIcon(this.newFolderBtnEl, "folder-plus");
    this.newFolderBtnEl.addEventListener("click", () => this.promptCreateFolder());

    controls.createDiv({ cls: "fb-divider" });

    // Quick Look 미리보기 토글 (탭 닫기 x는 옵시디언 탭 헤더가 제공하므로 중복 x 제거)
    this.qlBtnEl = controls.createEl("button", {
      cls: "clickable-icon fb-tool-btn",
      attr: { "aria-label": "미리보기 (Space)" }
    });
    setIcon(this.qlBtnEl, "panel-right");
    this.qlBtnEl.addEventListener("click", () => {
      this.quickLookOpen = !this.quickLookOpen;
      void this.updateQuickLook();
      this.updateToolbarStates();
    });

    // 메인 바디 (2D 그리드 + Quick Look 드로어)
    const body = this.shellEl.createDiv({ cls: "fb-body" });
    const canvas = body.createDiv({ cls: "fb-canvas" });
    this.gridEl = canvas.createDiv({ cls: "fb-grid" });

    // Quick Look 미리보기 드로어
    this.qlDrawerEl = body.createDiv({ cls: "fb-quicklook" });
    const qlHeader = this.qlDrawerEl.createDiv({ cls: "fb-ql-header" });
    this.qlTitleEl = qlHeader.createSpan({ cls: "fb-ql-title" });
    const qlActions = qlHeader.createDiv({ cls: "fb-ql-actions" });

    const qlOpenBtn = qlActions.createEl("button", {
      cls: "clickable-icon fb-tool-btn",
      attr: { "aria-label": "노트 열기 (Enter)" }
    });
    setIcon(qlOpenBtn, "arrow-up-right");
    qlOpenBtn.addEventListener("click", () => {
      const focusedFile = this.getFocusedFile();
      if (focusedFile) void this.openFile(focusedFile);
    });

    const qlCloseBtn = qlActions.createEl("button", {
      cls: "clickable-icon fb-tool-btn",
      attr: { "aria-label": "미리보기 닫기" }
    });
    setIcon(qlCloseBtn, "x");
    qlCloseBtn.addEventListener("click", () => {
      this.quickLookOpen = false;
      void this.updateQuickLook();
      this.updateToolbarStates();
    });

    this.qlBodyEl = this.qlDrawerEl.createDiv({ cls: "fb-ql-body markdown-rendered" });

    // 자동 노출 임시 바구니 (드래그 중 또는 보관 항목이 있을 때만 표시)
    this.shelfEl = this.shellEl.createDiv({
      cls: "fb-shelf is-collapsed",
      attr: { "data-drop-shelf": "true" }
    });
    const shelfIcon = this.shelfEl.createSpan({ cls: "fb-shelf-icon" });
    setIcon(shelfIcon, "inbox");
    this.shelfListEl = this.shelfEl.createDiv({ cls: "fb-shelf-list" });
    const shelfActions = this.shelfEl.createDiv({ cls: "fb-shelf-actions" });

    this.shelfDropHereBtn = shelfActions.createEl("button", {
      cls: "mod-cta fb-compact-btn",
      text: "이동"
    });
    this.shelfDropHereBtn.addEventListener("click", () => {
      const target = this.getFocusedTargetFolderPath();
      void this.moveFiles(this.shelfPaths, target);
    });

    const shelfClearBtn = shelfActions.createEl("button", {
      cls: "clickable-icon fb-tool-btn",
      attr: { "aria-label": "바구니 비우기" }
    });
    setIcon(shelfClearBtn, "x");
    shelfClearBtn.addEventListener("click", () => {
      this.shelfPaths = [];
      this.renderShelf();
    });

    // 다중 선택 플로팅 바
    this.selectionBarEl = this.shellEl.createDiv({ cls: "fb-selection-bar is-hidden" });
    this.selectionCountEl = this.selectionBarEl.createSpan({ cls: "fb-selection-count" });

    const selShelfBtn = this.selectionBarEl.createEl("button", {
      cls: "clickable-icon fb-selection-btn",
      text: "바구니"
    });
    selShelfBtn.addEventListener("click", () => {
      this.addPathsToShelf([...this.selectedPaths]);
    });

    const selClearBtn = this.selectionBarEl.createEl("button", {
      cls: "clickable-icon fb-tool-btn",
      attr: { "aria-label": "선택 해제" }
    });
    setIcon(selClearBtn, "x");
    selClearBtn.addEventListener("click", () => {
      this.selectedPaths.clear();
      this.renderGridAndHeader();
      this.renderSelectionBar();
    });
  }

  private bindVaultEvents(): void {
    const scheduleRefresh = () => {
      if (this.refreshTimer !== null) window.clearTimeout(this.refreshTimer);
      this.refreshTimer = window.setTimeout(() => {
        this.refreshTimer = null;
        this.renderAll();
      }, 60);
    };

    this.vaultRefs.push(this.app.vault.on("create", scheduleRefresh));
    this.vaultRefs.push(this.app.vault.on("delete", scheduleRefresh));
    this.vaultRefs.push(
      this.app.vault.on("rename", (file, oldPath) => {
        if (file instanceof TFolder && this.plugin.isFolderExpanded(oldPath)) {
          void this.plugin.renameExpandedFolder(oldPath, file.path);
        }
        if (this.currentFolderPath === oldPath) {
          this.currentFolderPath = file.path;
        }
        scheduleRefresh();
      })
    );
  }

  private unbindVaultEvents(): void {
    this.vaultRefs.forEach((ref) => this.app.vault.offref(ref));
    this.vaultRefs = [];
  }

  private bindInteractionEvents(): void {
    document.addEventListener("keydown", this.boundKeydown, true);
    this.contentEl.addEventListener("dragover", this.boundDragOver);
    this.contentEl.addEventListener("dragleave", this.boundDragLeave);
    this.contentEl.addEventListener("drop", this.boundDrop);
    document.addEventListener("dragend", this.boundDragEnd);
  }

  // =========================================================
  // 데이터 모델 구성 (1번 카드 = 직속 노트, 나머지 = 하위 폴더)
  // =========================================================
  private getSortedChildren(folder: TFolder): { folders: TFolder[]; files: TFile[] } {
    const folders: TFolder[] = [];
    const files: TFile[] = [];

    for (const child of folder.children) {
      if (child instanceof TFolder) folders.push(child);
      else if (child instanceof TFile) files.push(child);
    }

    folders.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    if (this.plugin.settings.sortBy === "mtime") {
      files.sort((a, b) => b.stat.mtime - a.stat.mtime);
    } else {
      files.sort((a, b) => a.basename.localeCompare(b.basename, undefined, { numeric: true }));
    }

    return { folders, files };
  }

  private countFilesRecursive(folder: TFolder): number {
    let count = 0;
    for (const child of folder.children) {
      if (child instanceof TFile) count++;
      else if (child instanceof TFolder) count += this.countFilesRecursive(child);
    }
    return count;
  }

  private collectCardTreeItems(
    folder: TFolder,
    depth: number,
    out: CardTreeItem[],
    includeSubfolders: boolean
  ): void {
    const q = this.searchQuery.trim().toLowerCase();
    const { folders, files } = this.getSortedChildren(folder);

    if (includeSubfolders) {
      for (const sub of folders) {
        const expanded = q ? true : this.plugin.isFolderExpanded(sub.path);
        const childOut: CardTreeItem[] = [];
        if (expanded) {
          this.collectCardTreeItems(sub, depth + 1, childOut, true);
        }
        const nameMatch = !q || sub.name.toLowerCase().includes(q);
        if (!q || nameMatch || childOut.length > 0) {
          out.push({
            type: "folder",
            key: `folder:${sub.path}`,
            path: sub.path,
            name: sub.name,
            depth,
            expanded,
            childCount: this.countFilesRecursive(sub)
          });
          if (expanded) out.push(...childOut);
        }
      }
    }

    for (const file of files) {
      const displayName = file.extension === "md" ? file.basename : file.name;
      if (q && !displayName.toLowerCase().includes(q) && !file.path.toLowerCase().includes(q)) {
        continue;
      }
      out.push({
        type: "file",
        key: `file:${file.path}`,
        path: file.path,
        name: displayName,
        depth,
        mtime: file.stat.mtime
      });
    }
  }

  private buildBoardCards(): BoardCardModel[] {
    let currentFolder = getFolderByPath(this.app, this.currentFolderPath);
    if (!currentFolder) {
      this.currentFolderPath = "";
      currentFolder = this.app.vault.getRoot();
    }

    const q = this.searchQuery.trim().toLowerCase();
    const cards: BoardCardModel[] = [];
    const { folders: childFolders, files: directFiles } = this.getSortedChildren(currentFolder);

    // 1) 첫 번째 카드: 현재 경로 직속 파일
    const directItems: CardTreeItem[] = [];
    this.collectCardTreeItems(currentFolder, 0, directItems, false);
    if (!q || directItems.length > 0) {
      cards.push({
        isRootCard: true,
        folderPath: currentFolder.path,
        title: currentFolder.isRoot() ? this.app.vault.getName() : currentFolder.name,
        totalCount: directFiles.length,
        items: directItems
      });
    }

    // 2) 하위 폴더 카드들
    for (const sub of childFolders) {
      const items: CardTreeItem[] = [];
      this.collectCardTreeItems(sub, 0, items, true);
      const nameMatch = !q || sub.name.toLowerCase().includes(q);
      if (q && !nameMatch && items.length === 0) continue;

      cards.push({
        isRootCard: false,
        folderPath: sub.path,
        title: sub.name,
        totalCount: this.countFilesRecursive(sub),
        items
      });
    }

    if (cards.length === 0) {
      this.focusedCardIndex = 0;
      this.focusedItemKey = null;
    } else {
      this.focusedCardIndex = Math.max(0, Math.min(this.focusedCardIndex, cards.length - 1));
    }

    this.renderedCards = cards;
    return cards;
  }

  // [ID 6.5.4] 현재 포커싱된 생성 대상 폴더 해석
  // -> 포커스된 하위 폴더 행 → 포커스된 파일의 부모 폴더 → 포커스된 카드 폴더 순으로 생성 위치를 결정함.
  private getFocusedTargetFolderPath(): string {
    const curCard = this.renderedCards[this.focusedCardIndex];
    if (this.focusedItemKey) {
      if (this.focusedItemKey.startsWith("folder:")) {
        const path = this.focusedItemKey.slice(7);
        if (getFolderByPath(this.app, path)) return path;
      } else if (this.focusedItemKey.startsWith("file:")) {
        const file = getFileByPath(this.app, this.focusedItemKey.slice(5));
        if (file?.parent) return file.parent.path;
      }
    }
    if (curCard) return curCard.folderPath;
    return this.currentFolderPath;
  }

  private getFocusedFolderDisplayName(): string {
    const targetPath = this.getFocusedTargetFolderPath();
    return targetPath || this.app.vault.getName();
  }

  private findFocusedCardAndIndex(): {
    card: BoardCardModel | null;
    itemIndex: number;
    item: CardTreeItem | null;
  } {
    const card = this.renderedCards[this.focusedCardIndex] || null;
    if (!card || !this.focusedItemKey) return { card, itemIndex: -1, item: null };
    const idx = card.items.findIndex((it) => it.key === this.focusedItemKey);
    return { card, itemIndex: idx, item: idx >= 0 ? card.items[idx] : null };
  }

  private getFocusedFile(): TFile | null {
    if (this.focusedItemKey?.startsWith("file:")) {
      const f = getFileByPath(this.app, this.focusedItemKey.slice(5));
      if (f) return f;
    }
    for (const path of this.selectedPaths) {
      const f = getFileByPath(this.app, path);
      if (f) return f;
    }
    return null;
  }

  // =========================================================
  // 렌더링
  // =========================================================
  private renderAll(): void {
    this.renderGridAndHeader();
    this.renderShelf();
    this.renderSelectionBar();
    void this.updateQuickLook();
  }

  private renderGridAndHeader(): void {
    const cards = this.buildBoardCards();
    this.renderBreadcrumb();
    this.renderGrid(cards);
    this.updateToolbarStates();
    (this.leaf as unknown as { updateHeader?: () => void }).updateHeader?.();
  }

  private updateToolbarStates(): void {
    const s = this.plugin.settings;
    this.backBtnEl.disabled = !this.currentFolderPath;

    this.colBtns.forEach((btn, idx) => {
      const cols = idx + 2;
      btn.toggleClass("is-active", s.gridCols === cols);
    });

    this.sortBtnEl.empty();
    setIcon(this.sortBtnEl, s.sortBy === "name" ? "arrow-up-down" : "clock");
    this.sortBtnEl.setAttr("aria-label", s.sortBy === "name" ? "정렬: 이름순" : "정렬: 최근 수정순");

    const targetLabel = this.getFocusedFolderDisplayName();
    this.newNoteBtnEl.setAttr("aria-label", `새 노트 → ${targetLabel} (N)`);
    this.newFolderBtnEl.setAttr("aria-label", `새 폴더 → ${targetLabel} (Shift+N)`);

    this.qlBtnEl.toggleClass("is-active", this.quickLookOpen);
  }

  private renderBreadcrumb(): void {
    this.breadcrumbEl.empty();

    const segments: Array<{ path: string; name: string }> = [
      { path: "", name: this.app.vault.getName() }
    ];

    if (this.currentFolderPath) {
      const parts = this.currentFolderPath.split("/");
      let acc = "";
      for (const part of parts) {
        acc = acc ? `${acc}/${part}` : part;
        segments.push({ path: acc, name: part });
      }
    }

    segments.forEach((seg, idx) => {
      if (idx > 0) {
        const sep = this.breadcrumbEl.createSpan({ cls: "fb-crumb-sep" });
        setIcon(sep, "chevron-right");
      }
      const isLast = idx === segments.length - 1;
      const btn = this.breadcrumbEl.createEl("button", {
        cls: "clickable-icon fb-crumb-btn" + (isLast ? " is-current" : ""),
        text: seg.name,
        attr: { "data-drop-folder": seg.path }
      });
      if (!isLast) {
        btn.addEventListener("click", () => this.navigateToFolder(seg.path));
      }
    });
  }

  private renderGrid(cards: BoardCardModel[]): void {
    this.gridEl.empty();

    // 동적 행 높이: 1줄일 땐 세로 100% 꽉 채움, 2줄일 땐 균등 분할, 3줄 이상 여유 스크롤
    const prefCols = this.plugin.settings.gridCols;
    const effectiveCols = Math.max(1, Math.min(prefCols, Math.max(1, cards.length)));
    const rowCount = Math.max(1, Math.ceil(cards.length / effectiveCols));
    const rowClass = rowCount === 1 ? "fb-rows-1" : rowCount === 2 ? "fb-rows-2" : "fb-rows-many";

    this.gridEl.className = `fb-grid fb-cols-${effectiveCols} ${rowClass}`;

    if (cards.length === 0) {
      this.gridEl.createDiv({ cls: "fb-empty-grid", text: "일치하는 항목이 없습니다" });
      return;
    }

    cards.forEach((cardModel, cardIdx) => {
      const isFocusedCard = cardIdx === this.focusedCardIndex;
      const cardEl = this.gridEl.createDiv({
        cls:
          "fb-card" +
          (cardModel.isRootCard ? " is-root-card" : "") +
          (isFocusedCard ? " is-focused-card" : ""),
        attr: { "data-drop-folder": cardModel.folderPath }
      });

      // 카드 헤더
      const headerEl = cardEl.createDiv({ cls: "fb-card-header" });
      const titleWrap = headerEl.createDiv({ cls: "fb-card-title-wrap" });
      const iconEl = titleWrap.createSpan({ cls: "fb-native-icon" });
      const nameEl = titleWrap.createSpan({ cls: "fb-card-title", text: cardModel.title });

      if (cardModel.isRootCard) {
        setIcon(iconEl, "inbox");
        titleWrap.createSpan({ cls: "fb-root-pill", text: "직속" });
      } else {
        applyNativeDecoration(this.app, cardModel.folderPath, iconEl, nameEl, "folder");
      }

      const metaEl = headerEl.createDiv({ cls: "fb-card-meta" });
      metaEl.createSpan({ cls: "fb-count", text: String(cardModel.totalCount) });

      if (!cardModel.isRootCard) {
        const drillBtn = metaEl.createEl("button", {
          cls: "clickable-icon fb-drill-btn",
          attr: { "aria-label": `${cardModel.title} 열기` }
        });
        setIcon(drillBtn, "arrow-right");
        drillBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.navigateToFolder(cardModel.folderPath);
        });

        headerEl.addEventListener("dblclick", () => this.navigateToFolder(cardModel.folderPath));
        headerEl.addEventListener("contextmenu", (e) => {
          const folder = getFolderByPath(this.app, cardModel.folderPath);
          if (!folder) return;
          e.preventDefault();
          openNativeFileMenu(
            this.app,
            e,
            folder,
            () => this.renderAll(),
            (target) => this.promptRename(target)
          );
        });
      }

      headerEl.addEventListener("click", () => {
        this.focusedCardIndex = cardIdx;
        if (cardModel.items.length > 0) {
          const firstFileIdx = cardModel.items.findIndex((it) => it.type === "file");
          this.focusCardItem(cardIdx, firstFileIdx >= 0 ? firstFileIdx : 0);
        } else {
          this.focusedItemKey = null;
          this.renderGridAndHeader();
        }
      });

      // 네이티브 탐색기 파일 트리 본문 (.nav-files-container)
      const listEl = cardEl.createDiv({ cls: "fb-card-body nav-files-container" });

      if (cardModel.items.length === 0) {
        listEl.createDiv({ cls: "fb-empty-card", text: "비어 있음" });
        return;
      }

      for (const item of cardModel.items) {
        const isFocused = isFocusedCard && this.focusedItemKey === item.key;

        if (item.type === "folder") {
          const row = listEl.createDiv({
            cls: "tree-item-self is-clickable nav-folder-title fb-row" + (isFocused ? " is-focused" : ""),
            attr: {
              "data-path": item.path,
              "data-drop-folder": item.path
            }
          });
          row.style.paddingLeft = `${8 + item.depth * 14}px`;

          const caret = row.createSpan({
            cls: "tree-item-icon collapse-icon" + (item.expanded ? "" : " is-collapsed")
          });
          setIcon(caret, "chevron-down");

          const fIcon = row.createSpan({ cls: "fb-native-icon" });
          const fTitle = row.createSpan({ cls: "tree-item-inner nav-folder-title-content", text: item.name });
          applyNativeDecoration(this.app, item.path, fIcon, fTitle, "folder");

          if (item.childCount !== undefined) {
            row.createSpan({ cls: "fb-row-count", text: String(item.childCount) });
          }

          row.addEventListener("click", async (e) => {
            e.stopPropagation();
            this.focusedCardIndex = cardIdx;
            this.focusedItemKey = item.key;
            await this.plugin.toggleFolderExpanded(item.path);
            this.renderGridAndHeader();
          });

          row.addEventListener("dblclick", (e) => {
            e.stopPropagation();
            this.navigateToFolder(item.path);
          });

          row.addEventListener("contextmenu", (e) => {
            const folder = getFolderByPath(this.app, item.path);
            if (!folder) return;
            e.preventDefault();
            openNativeFileMenu(
              this.app,
              e,
              folder,
              () => this.renderAll(),
              (target) => this.promptRename(target)
            );
          });
        } else {
          const isSelected = this.selectedPaths.has(item.path);
          const row = listEl.createDiv({
            cls:
              "tree-item-self is-clickable nav-file-title fb-row" +
              (isSelected ? " is-selected" : "") +
              (isFocused ? " is-focused" : ""),
            attr: {
              "data-path": item.path,
              "data-drag-path": item.path,
              draggable: "true"
            }
          });
          row.style.paddingLeft = `${10 + item.depth * 14}px`;

          const nIcon = row.createSpan({ cls: "fb-native-icon" });
          const nTitle = row.createSpan({ cls: "tree-item-inner nav-file-title-content", text: item.name });
          applyNativeDecoration(this.app, item.path, nIcon, nTitle, "file-text");

          row.addEventListener("click", (e) => this.handleFileClick(e, item.path, cardIdx));
          row.addEventListener("dblclick", (e) => {
            const file = getFileByPath(this.app, item.path);
            if (file) void this.openFile(file, e.metaKey || e.ctrlKey);
          });
          row.addEventListener("contextmenu", (e) => {
            const file = getFileByPath(this.app, item.path);
            if (!file) return;
            e.preventDefault();
            openNativeFileMenu(
              this.app,
              e,
              file,
              () => this.renderAll(),
              (target) => this.promptRename(target)
            );
          });
          row.addEventListener("dragstart", (e) => this.handleDragStart(e, item.path, false));
        }
      }
    });
  }

  private renderShelf(): void {
    this.shelfPaths = this.shelfPaths.filter((p) => getFileByPath(this.app, p) !== null);
    const hasItems = this.shelfPaths.length > 0;
    const shouldShow = hasItems || this.isDragging;

    this.shelfEl.toggleClass("is-collapsed", !shouldShow);
    this.shelfDropHereBtn.toggleClass("is-hidden", !hasItems);
    this.shelfListEl.empty();

    if (!hasItems) {
      this.shelfListEl.createSpan({ cls: "fb-shelf-hint", text: "임시 보관" });
      return;
    }

    for (const path of this.shelfPaths) {
      const file = getFileByPath(this.app, path);
      if (!file) continue;
      const chip = this.shelfListEl.createDiv({
        cls: "fb-shelf-chip",
        attr: { draggable: "true", "data-drag-path": path }
      });
      chip.createSpan({ text: file.extension === "md" ? file.basename : file.name });
      const rm = chip.createEl("button", { cls: "clickable-icon fb-shelf-chip-rm" });
      setIcon(rm, "x");
      rm.addEventListener("click", (e) => {
        e.stopPropagation();
        this.shelfPaths = this.shelfPaths.filter((p) => p !== path);
        this.renderShelf();
      });
      chip.addEventListener("dragstart", (e) => this.handleDragStart(e, path, true));
    }
  }

  private renderSelectionBar(): void {
    const count = this.selectedPaths.size;
    this.selectionBarEl.toggleClass("is-hidden", count < 2);
    if (count >= 2) {
      this.selectionCountEl.setText(`${count}개 선택됨`);
    }
  }

  private async updateQuickLook(): Promise<void> {
    this.qlDrawerEl.toggleClass("is-open", this.quickLookOpen);
    if (!this.quickLookOpen) return;

    const file = this.getFocusedFile();
    this.unloadMarkdownComponent();
    this.qlBodyEl.empty();

    if (!file) {
      this.qlTitleEl.setText("미리보기");
      this.qlBodyEl.createDiv({ cls: "fb-ql-empty", text: "선택된 파일이 없습니다" });
      return;
    }

    this.qlTitleEl.setText(file.extension === "md" ? file.basename : file.name);

    if (file.extension !== "md") {
      this.qlBodyEl.createDiv({ cls: "fb-ql-empty", text: file.name });
      return;
    }

    try {
      const content = await this.app.vault.cachedRead(file);
      this.markdownComponent = new Component();
      this.markdownComponent.load();
      await MarkdownRenderer.render(this.app, content, this.qlBodyEl, file.path, this.markdownComponent);
    } catch {
      this.qlBodyEl.createDiv({ cls: "fb-ql-empty", text: "내용을 불러올 수 없습니다" });
    }
  }

  private unloadMarkdownComponent(): void {
    if (this.markdownComponent) {
      this.markdownComponent.unload();
      this.markdownComponent = null;
    }
  }

  // =========================================================
  // 포커스 · 탐색 · 파일 열기
  // =========================================================
  private focusCardItem(cardIdx: number, itemIndex: number): void {
    const card = this.renderedCards[cardIdx];
    if (!card) return;
    this.focusedCardIndex = cardIdx;

    if (card.items.length === 0) {
      this.focusedItemKey = null;
      this.renderGridAndHeader();
      this.scrollFocusedIntoView();
      return;
    }

    const safeIdx = Math.max(0, Math.min(itemIndex, card.items.length - 1));
    const item = card.items[safeIdx];
    this.focusedItemKey = item.key;

    if (item.type === "file") {
      this.selectedPaths = new Set([item.path]);
    }

    this.renderGridAndHeader();
    this.renderSelectionBar();
    if (this.quickLookOpen) void this.updateQuickLook();
    this.scrollFocusedIntoView();
  }

  private scrollFocusedIntoView(): void {
    requestAnimationFrame(() => {
      const row = this.gridEl.querySelector(".fb-row.is-focused") as HTMLElement | null;
      if (row) {
        row.scrollIntoView({ block: "nearest", inline: "nearest" });
      } else {
        const card = this.gridEl.querySelector(".fb-card.is-focused-card") as HTMLElement | null;
        if (card) card.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    });
  }

  private handleFileClick(e: MouseEvent, path: string, cardIdx: number): void {
    this.focusedCardIndex = cardIdx;
    this.focusedItemKey = `file:${path}`;

    if (e.metaKey || e.ctrlKey) {
      if (this.selectedPaths.has(path)) this.selectedPaths.delete(path);
      else this.selectedPaths.add(path);
    } else {
      this.selectedPaths = new Set([path]);
    }

    this.renderGridAndHeader();
    this.renderSelectionBar();
    if (this.quickLookOpen) void this.updateQuickLook();
  }

  // [ID 6.5.8] 워크스페이스 평면 노트 열기
  // -> 분할 화면에 다른 마크다운 탭이 열려 있으면 그 탭에서 열고, 단독 화면이면 설정(현재 탭/새 탭)에 따라 자연스럽게 염.
  private async openFile(file: TFile, forceNewTab = false): Promise<void> {
    if (forceNewTab || this.plugin.settings.openBehavior === "new-tab") {
      const newLeaf = this.app.workspace.getLeaf("tab");
      await newLeaf.openFile(file, { active: true });
      return;
    }

    const otherLeaf = this.app.workspace
      .getLeavesOfType("markdown")
      .find((l) => l !== this.leaf && l.getRoot() === this.app.workspace.rootSplit);

    if (otherLeaf) {
      await otherLeaf.openFile(file, { active: true });
      this.app.workspace.setActiveLeaf(otherLeaf, { focus: true });
      return;
    }

    await this.leaf.openFile(file, { active: true });
  }

  private navigateToFolder(folderPath: string): void {
    this.currentFolderPath = folderPath;
    this.focusedCardIndex = 0;
    this.focusedItemKey = null;
    this.renderAll();

    if (this.renderedCards[0]?.items[0]) {
      this.focusCardItem(0, 0);
    }
  }

  private goUp(): void {
    if (!this.currentFolderPath) return;
    const current = getFolderByPath(this.app, this.currentFolderPath);
    const parentPath = current?.parent ? current.parent.path : "";
    this.navigateToFolder(parentPath);
  }

  // =========================================================
  // 포커스된 폴더에 노트/폴더 생성 & 이름 변경
  // =========================================================
  private promptCreateNote(): void {
    const targetFolderPath = this.getFocusedTargetFolderPath();
    const destLabel = targetFolderPath || this.app.vault.getName();
    this.isSubModalOpen = true;

    const modal = new NamePromptModal(this.app, {
      title: "새 노트",
      placeholder: "노트 제목",
      destinationLabel: destLabel,
      confirmLabel: "생성",
      onSubmit: async (rawName) => {
        const cleanName = rawName.endsWith(".md") ? rawName : `${rawName}.md`;
        const fullPath = normalizePath(targetFolderPath ? `${targetFolderPath}/${cleanName}` : cleanName);
        if (this.app.vault.getAbstractFileByPath(fullPath)) {
          new Notice("같은 이름의 파일이 이미 존재합니다.");
          return;
        }
        try {
          const created = await this.app.vault.create(fullPath, "");
          if (targetFolderPath) {
            await this.plugin.setFolderExpanded(targetFolderPath, true);
          }
          this.focusedItemKey = `file:${created.path}`;
          this.selectedPaths = new Set([created.path]);
          this.renderAll();
          this.scrollFocusedIntoView();
        } catch (err) {
          new Notice(`노트 생성 실패: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    });

    const origOnClose = modal.onClose.bind(modal);
    modal.onClose = () => {
      origOnClose();
      this.isSubModalOpen = false;
      requestAnimationFrame(() => this.shellEl?.focus());
    };
    modal.open();
  }

  private promptCreateFolder(): void {
    const targetFolderPath = this.getFocusedTargetFolderPath();
    const destLabel = targetFolderPath || this.app.vault.getName();
    this.isSubModalOpen = true;

    const modal = new NamePromptModal(this.app, {
      title: "새 폴더",
      placeholder: "폴더 이름",
      destinationLabel: destLabel,
      confirmLabel: "생성",
      onSubmit: async (rawName) => {
        const fullPath = normalizePath(targetFolderPath ? `${targetFolderPath}/${rawName}` : rawName);
        if (this.app.vault.getAbstractFileByPath(fullPath)) {
          new Notice("같은 이름의 폴더가 이미 존재합니다.");
          return;
        }
        try {
          await this.app.vault.createFolder(fullPath);
          if (targetFolderPath) {
            await this.plugin.setFolderExpanded(targetFolderPath, true);
          }
          this.focusedItemKey = `folder:${fullPath}`;
          this.renderAll();
          this.scrollFocusedIntoView();
        } catch (err) {
          new Notice(`폴더 생성 실패: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    });

    const origOnClose = modal.onClose.bind(modal);
    modal.onClose = () => {
      origOnClose();
      this.isSubModalOpen = false;
      requestAnimationFrame(() => this.shellEl?.focus());
    };
    modal.open();
  }

  private promptRename(target: TAbstractFile): void {
    const isMd = target instanceof TFile && target.extension === "md";
    const initial = isMd ? target.basename : target.name;
    this.isSubModalOpen = true;

    const modal = new NamePromptModal(this.app, {
      title: "이름 바꾸기",
      placeholder: "새 이름",
      initialValue: initial,
      confirmLabel: "변경",
      onSubmit: async (rawName) => {
        const finalName = isMd && !rawName.endsWith(".md") ? `${rawName}.md` : rawName;
        const parentPath = target.parent?.path || "";
        const destPath = normalizePath(parentPath ? `${parentPath}/${finalName}` : finalName);
        if (destPath === target.path) return;
        if (this.app.vault.getAbstractFileByPath(destPath)) {
          new Notice("같은 이름이 이미 존재합니다.");
          return;
        }
        try {
          await this.app.fileManager.renameFile(target, destPath);
          this.renderAll();
        } catch (err) {
          new Notice(`이름 변경 실패: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    });

    const origOnClose = modal.onClose.bind(modal);
    modal.onClose = () => {
      origOnClose();
      this.isSubModalOpen = false;
      requestAnimationFrame(() => this.shellEl?.focus());
    };
    modal.open();
  }

  // =========================================================
  // 드래그 앤 드롭 & 위키링크 보존 파일 이동 + Undo
  // =========================================================
  private handleDragStart(e: DragEvent, path: string, fromShelf: boolean): void {
    if (!e.dataTransfer) return;

    if (fromShelf) {
      this.activeDragPaths = [path];
    } else if (this.selectedPaths.has(path) && this.selectedPaths.size > 1) {
      this.activeDragPaths = [...this.selectedPaths];
    } else {
      this.activeDragPaths = [path];
      this.selectedPaths = new Set([path]);
    }

    this.isDragging = true;
    this.renderShelf();

    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(DRAG_MIME, JSON.stringify(this.activeDragPaths));

    const firstFile = getFileByPath(this.app, this.activeDragPaths[0]);
    const label = firstFile
      ? firstFile.extension === "md"
        ? firstFile.basename
        : firstFile.name
      : path;
    const ghost = document.body.createDiv({
      cls: "fb-drag-ghost",
      text: this.activeDragPaths.length > 1 ? `${label} 외 ${this.activeDragPaths.length - 1}개` : label
    });
    e.dataTransfer.setDragImage(ghost, 12, 12);
    requestAnimationFrame(() => ghost.remove());
  }

  private resolveDropTarget(target: EventTarget | null): HTMLElement | null {
    if (!(target instanceof Element)) return null;
    return target.closest(
      "[data-drop-shelf], .nav-folder-title[data-drop-folder], .fb-crumb-btn[data-drop-folder], .fb-card[data-drop-folder]"
    ) as HTMLElement | null;
  }

  private setDropHighlight(el: HTMLElement | null): void {
    if (this.currentDropEl === el) return;
    if (this.currentDropEl) this.currentDropEl.removeClass("is-drag-over");
    this.currentDropEl = el;
    if (this.currentDropEl) this.currentDropEl.addClass("is-drag-over");
  }

  private handleDragOver(e: DragEvent): void {
    if (this.activeDragPaths.length === 0) return;
    const dropEl = this.resolveDropTarget(e.target);
    if (!dropEl) {
      this.setDropHighlight(null);
      return;
    }
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    this.setDropHighlight(dropEl);
  }

  private handleDragLeave(e: DragEvent): void {
    if (!this.currentDropEl) return;
    if (e.relatedTarget instanceof Node && this.currentDropEl.contains(e.relatedTarget)) return;
    if (e.target === this.currentDropEl) this.setDropHighlight(null);
  }

  private handleDrop(e: DragEvent): void {
    const dropEl = this.resolveDropTarget(e.target);
    if (!dropEl) {
      this.handleDragEnd();
      return;
    }
    e.preventDefault();

    let paths = this.activeDragPaths;
    if (paths.length === 0 && e.dataTransfer) {
      try {
        paths = JSON.parse(e.dataTransfer.getData(DRAG_MIME) || "[]");
      } catch {
        paths = [];
      }
    }

    if (paths.length > 0) {
      if (dropEl.hasAttribute("data-drop-shelf")) {
        this.addPathsToShelf(paths);
      } else if (dropEl.hasAttribute("data-drop-folder")) {
        const destFolderPath = dropEl.getAttribute("data-drop-folder") || "";
        void this.moveFiles(paths, destFolderPath);
      }
    }

    this.handleDragEnd();
  }

  private handleDragEnd(): void {
    this.activeDragPaths = [];
    this.isDragging = false;
    this.setDropHighlight(null);
    this.renderShelf();
  }

  private addPathsToShelf(paths: string[]): void {
    for (const p of paths) {
      if (getFileByPath(this.app, p) && !this.shelfPaths.includes(p)) {
        this.shelfPaths.push(p);
      }
    }
    this.renderShelf();
  }

  private async moveFiles(sourcePaths: string[], destFolderPath: string): Promise<void> {
    const unique = [...new Set(sourcePaths)];
    const moves: MoveUndoEntry["moves"] = [];
    let skipped = 0;

    for (const srcPath of unique) {
      const file = getFileByPath(this.app, srcPath);
      if (!file) continue;
      const currentParent = file.parent?.path || "";
      if (currentParent === destFolderPath) continue;

      const destPath = normalizePath(destFolderPath ? `${destFolderPath}/${file.name}` : file.name);
      if (this.app.vault.getAbstractFileByPath(destPath)) {
        skipped++;
        continue;
      }

      try {
        await this.app.fileManager.renameFile(file, destPath);
        moves.push({ fromPath: srcPath, toPath: destPath });
      } catch {
        skipped++;
      }
    }

    if (moves.length > 0) {
      this.undoStack.push({ moves });
      if (this.undoStack.length > 25) this.undoStack.shift();

      const movedSources = new Set(moves.map((m) => m.fromPath));
      this.shelfPaths = this.shelfPaths.filter((p) => !movedSources.has(p));
      this.selectedPaths = new Set(moves.map((m) => m.toPath));
      this.focusedItemKey = `file:${moves[0].toPath}`;

      const destName = destFolderPath || this.app.vault.getName();
      new Notice(`${moves.length}개 항목을 '${destName}'로 이동했습니다.`);
      this.renderAll();
    } else if (skipped > 0) {
      new Notice("대상 폴더에 같은 이름의 파일이 있어 이동하지 못했습니다.");
    }
  }

  private async undoLastMove(): Promise<void> {
    const entry = this.undoStack.pop();
    if (!entry) return;

    let restored = 0;
    for (const move of entry.moves) {
      const file = getFileByPath(this.app, move.toPath);
      if (!file) continue;
      if (this.app.vault.getAbstractFileByPath(move.fromPath)) continue;
      try {
        await this.app.fileManager.renameFile(file, move.fromPath);
        restored++;
      } catch {
        // 복원 실패 항목 건너뜀
      }
    }

    if (restored > 0) {
      new Notice(`${restored}개 항목 이동을 되돌렸습니다.`);
      this.renderAll();
    }
  }

  // =========================================================
  // 키보드 2D 탐색 핸들러 (현재 Folder Board 탭이 활성 상태일 때만 동작)
  // =========================================================
  private isViewActive(): boolean {
    if (this.isSubModalOpen) return false;
    if (document.querySelector(".modal-container")) return false;
    return this.app.workspace.getActiveViewOfType(FolderBoardView) === this;
  }

  private handleKeydown(e: KeyboardEvent): void {
    if (!this.isViewActive()) return;
    if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select")) {
      if (e.key === "Escape") (e.target as HTMLElement).blur();
      return;
    }

    const meta = e.metaKey || e.ctrlKey;

    if (e.key === "Escape") {
      if (this.selectedPaths.size > 1) {
        e.preventDefault();
        this.selectedPaths.clear();
        this.renderGridAndHeader();
        this.renderSelectionBar();
      } else if (this.quickLookOpen) {
        e.preventDefault();
        this.quickLookOpen = false;
        void this.updateQuickLook();
        this.updateToolbarStates();
      }
      return;
    }

    if (meta && !e.shiftKey && e.key.toLowerCase() === "z") {
      if (this.undoStack.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        void this.undoLastMove();
      }
      return;
    }

    if (!meta && !e.altKey && e.key.toLowerCase() === "n") {
      e.preventDefault();
      e.stopPropagation();
      if (e.shiftKey) this.promptCreateFolder();
      else this.promptCreateNote();
      return;
    }

    if (this.renderedCards.length === 0) return;

    // 좌/우: 폴더 카드 간 이동
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.key === "ArrowRight" ? 1 : -1;
      const nextIdx = (this.focusedCardIndex + delta + this.renderedCards.length) % this.renderedCards.length;
      const targetCard = this.renderedCards[nextIdx];
      const firstFileIdx = targetCard.items.findIndex((it) => it.type === "file");
      this.focusCardItem(nextIdx, firstFileIdx >= 0 ? firstFileIdx : 0);
      return;
    }

    // 위/아래: 현재 카드 내 아이템 이동
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      const { card, itemIndex } = this.findFocusedCardAndIndex();
      if (!card || card.items.length === 0) return;
      const delta = e.key === "ArrowDown" ? 1 : -1;
      const nextIdx =
        itemIndex === -1
          ? delta > 0
            ? 0
            : card.items.length - 1
          : Math.max(0, Math.min(itemIndex + delta, card.items.length - 1));
      this.focusCardItem(this.focusedCardIndex, nextIdx);
      return;
    }

    // Space: 파일 → Quick Look 토글, 하위 폴더 → 카드 내 접기/펼치기(영속 기억)
    if (e.code === "Space") {
      e.preventDefault();
      e.stopPropagation();
      const { item } = this.findFocusedCardAndIndex();
      if (item?.type === "folder") {
        void this.plugin.toggleFolderExpanded(item.path).then(() => this.renderGridAndHeader());
      } else {
        this.quickLookOpen = !this.quickLookOpen;
        void this.updateQuickLook();
        this.updateToolbarStates();
      }
      return;
    }

    // Enter / Shift+Enter
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      const { card, item } = this.findFocusedCardAndIndex();
      if (e.shiftKey && card && !card.isRootCard) {
        this.navigateToFolder(card.folderPath);
        return;
      }
      if (item?.type === "folder") {
        this.navigateToFolder(item.path);
      } else if (item?.type === "file") {
        const file = getFileByPath(this.app, item.path);
        if (file) void this.openFile(file, meta);
      } else if (card && !card.isRootCard) {
        this.navigateToFolder(card.folderPath);
      }
      return;
    }

    // Backspace: 상위 폴더로 복귀
    if (e.key === "Backspace" && this.currentFolderPath) {
      e.preventDefault();
      e.stopPropagation();
      this.goUp();
    }
  }
}

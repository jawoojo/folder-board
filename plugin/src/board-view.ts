// [ID 6.5] 2D 네이티브 폴더 탐색기 워크스페이스 뷰 (FolderBoardView extends ItemView)
// -> 2/3/4열 그리드 + 세로 펼침(가로 스크롤) 모드, DOM 파괴 없는 인플레이스 포커스 갱신(테마 깜빡임 방지),
// -> 예비 포커싱(밝은 테두리) + Shift 다중 선택 + Cmd+방향키 들고 이동(키 떼면 드롭)을 구현함.
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
import type { BoardCardModel, CardTreeItem, LayoutColumns, MoveUndoEntry } from "./types";

export const VIEW_TYPE_FOLDER_BOARD = "folder-board-view";
const DRAG_MIME = "application/x-obsidian-folder-board";

interface FolderBoardViewState {
  folderPath?: string;
}

// [ID 6.5.9] 옵시디언 루트 경로("/") 정규화
// -> Obsidian의 Vault Root는 path가 "/"이므로 ""로 통일해 브레드크럼 빈 세그먼트(> >)와 루트 이동 불일치를 방지함.
function normalizeFolderRef(folder: TFolder | null | undefined): string {
  if (!folder || folder.isRoot() || folder.path === "/") return "";
  return folder.path;
}

function normalizeFolderStr(path: string | null | undefined): string {
  if (!path || path === "/") return "";
  return path.replace(/^\/+|\/+$/g, "");
}

export class FolderBoardView extends ItemView {
  private plugin: FolderBoardPlugin;
  private currentFolderPath = "";
  private searchQuery = "";
  private focusedCardIndex = 0;
  private focusedItemKey: string | null = null;
  // [ID 6.5.10] 예비 포커싱(커서)과 다중 선택 분리
  // -> 단일 이동 시엔 밝은 테두리만 움직이고 selectedPaths는 비워 테마의 강렬한 선택 색상(갈색 등)을 방지함.
  private selectedPaths = new Set<string>();
  private selectionAnchorIndex: number | null = null;
  private shelfPaths: string[] = [];
  private undoStack: MoveUndoEntry[] = [];
  private quickLookOpen = false;
  private quickLookPath: string | null = null;
  private renderedCards: BoardCardModel[] = [];

  // [ID 6.5.11] Cmd + 방향키 들고 이동(Carry Mode) 상태
  // -> Cmd 키를 누른 채 방향키로 대상 폴더를 지정하고 Cmd 키를 떼는 순간 일괄 이동을 실행함.
  private carryPaths: string[] = [];
  private carryCardIndex = 0;
  private carryTargetFolderPath: string | null = null;

  private activeDragPaths: string[] = [];
  private currentDropEl: HTMLElement | null = null;
  private isDragging = false;
  private isSubModalOpen = false;
  private renderedSortIcon: string | null = null;

  // DOM 레퍼런스
  private shellEl!: HTMLElement;
  private backBtnEl!: HTMLButtonElement;
  private breadcrumbEl!: HTMLElement;
  private searchInputEl!: HTMLInputElement;
  private clearSearchEl!: HTMLElement;
  private layoutBtns: Array<{ value: LayoutColumns; el: HTMLButtonElement }> = [];
  private sortBtnEl!: HTMLButtonElement;
  private newNoteBtnEl!: HTMLButtonElement;
  private newFolderBtnEl!: HTMLButtonElement;
  private qlBtnEl!: HTMLButtonElement;
  private canvasEl!: HTMLElement;
  private gridEl!: HTMLElement;
  private qlDrawerEl!: HTMLElement;
  private qlTitleEl!: HTMLElement;
  private qlBodyEl!: HTMLElement;
  private shelfEl!: HTMLElement;
  private shelfListEl!: HTMLElement;
  private shelfDropHereBtn!: HTMLButtonElement;
  private selectionBarEl!: HTMLElement;
  private selectionCountEl!: HTMLElement;
  private carryPillEl!: HTMLElement;

  private markdownComponent: Component | null = null;
  private vaultRefs: EventRef[] = [];
  private boundKeydown: (e: KeyboardEvent) => void;
  private boundKeyup: (e: KeyboardEvent) => void;
  private boundWindowBlur: () => void;
  private boundDragOver: (e: DragEvent) => void;
  private boundDragLeave: (e: DragEvent) => void;
  private boundDrop: (e: DragEvent) => void;
  private boundDragEnd: () => void;
  private refreshTimer: number | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: FolderBoardPlugin) {
    super(leaf);
    this.plugin = plugin;

    this.boundKeydown = this.handleKeydown.bind(this);
    this.boundKeyup = this.handleKeyup.bind(this);
    this.boundWindowBlur = this.cancelCarryMode.bind(this);
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
    const parts = this.currentFolderPath.split("/").filter(Boolean);
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
      this.currentFolderPath = normalizeFolderStr(state.folderPath);
    }
    await super.setState(state, result);
    if (this.shellEl) {
      this.renderAll();
    }
  }

  setFolderPath(folderPath: string): void {
    this.currentFolderPath = normalizeFolderStr(folderPath);
    this.focusedCardIndex = 0;
    this.focusedItemKey = null;
    this.selectedPaths.clear();
    this.selectionAnchorIndex = null;
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
    document.removeEventListener("keyup", this.boundKeyup, true);
    window.removeEventListener("blur", this.boundWindowBlur);
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

    // 상단 미니멀 툴바
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

    // 옵시디언 네이티브 검색창
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

    // [ID 6.5.12] 레이아웃 세그먼트 (2열 / 3열 / 4열 / 세로 펼침 가로 스크롤)
    const colGroup = controls.createDiv({ cls: "fb-segmented" });
    const layoutOptions: Array<{ value: LayoutColumns; label: string; aria: string; icon?: string }> = [
      { value: 2, label: "2", aria: "2열 그리드" },
      { value: 3, label: "3", aria: "3열 그리드" },
      { value: 4, label: "4", aria: "4열 그리드" },
      { value: "scroll", label: "", aria: "세로 펼침 (가로 스크롤)", icon: "columns" }
    ];

    this.layoutBtns = layoutOptions.map((opt) => {
      const btn = colGroup.createEl("button", {
        cls: "clickable-icon fb-seg-btn",
        text: opt.label,
        attr: { "aria-label": opt.aria }
      });
      if (opt.icon) setIcon(btn, opt.icon);
      btn.addEventListener("click", async () => {
        this.plugin.settings.gridCols = opt.value;
        await this.plugin.saveSettings();
        this.renderGridAndHeader();
      });
      return { value: opt.value, el: btn };
    });

    // 정렬 토글
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

    // Quick Look 토글
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

    // 메인 바디
    const body = this.shellEl.createDiv({ cls: "fb-body" });
    this.canvasEl = body.createDiv({ cls: "fb-canvas" });
    this.gridEl = this.canvasEl.createDiv({ cls: "fb-grid" });

    // 가로 스크롤 모드에서 카드 바깥 여백의 세로 휠을 가로 스크롤로 자연스럽게 연결
    this.canvasEl.addEventListener(
      "wheel",
      (e: WheelEvent) => {
        if (this.plugin.settings.gridCols !== "scroll") return;
        const target = e.target as HTMLElement | null;
        if (target?.closest(".fb-card-body")) return;
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          this.canvasEl.scrollLeft += e.deltaY;
          e.preventDefault();
        }
      },
      { passive: false }
    );

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
      const targetFile = (this.quickLookPath ? getFileByPath(this.app, this.quickLookPath) : null) || this.getFocusedFile();
      if (targetFile) void this.openFile(targetFile);
    });

    const qlCloseBtn = qlActions.createEl("button", {
      cls: "clickable-icon fb-tool-btn",
      attr: { "aria-label": "미리보기 닫기" }
    });
    setIcon(qlCloseBtn, "x");
    qlCloseBtn.addEventListener("click", () => {
      this.quickLookOpen = false;
      this.quickLookPath = null;
      void this.updateQuickLook();
      this.updateToolbarStates();
    });

    this.qlBodyEl = this.qlDrawerEl.createDiv({ cls: "fb-ql-body markdown-rendered" });

    // 자동 노출 임시 바구니
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
      this.selectionAnchorIndex = null;
      this.syncFocusAndSelectionDOM();
      this.renderSelectionBar();
    });

    // Cmd+방향키 들고 이동 플로팅 상태 표시
    this.carryPillEl = this.shellEl.createDiv({ cls: "fb-carry-pill is-hidden" });
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
          this.currentFolderPath = normalizeFolderStr(file.path);
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
    document.addEventListener("keyup", this.boundKeyup, true);
    window.addEventListener("blur", this.boundWindowBlur);
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
        const subPath = normalizeFolderRef(sub);
        const expanded = q ? true : this.plugin.isFolderExpanded(subPath);
        const childOut: CardTreeItem[] = [];
        if (expanded) {
          this.collectCardTreeItems(sub, depth + 1, childOut, true);
        }
        const nameMatch = !q || sub.name.toLowerCase().includes(q);
        if (!q || nameMatch || childOut.length > 0) {
          out.push({
            type: "folder",
            key: `folder:${subPath}`,
            path: subPath,
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
    this.currentFolderPath = normalizeFolderStr(this.currentFolderPath);
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
        folderPath: normalizeFolderRef(currentFolder),
        title: currentFolder.isRoot() ? this.app.vault.getName() : currentFolder.name,
        totalCount: directFiles.length,
        items: directItems
      });
    }

    // 2) 하위 폴더 카드들
    for (const sub of childFolders) {
      const subPath = normalizeFolderRef(sub);
      const items: CardTreeItem[] = [];
      this.collectCardTreeItems(sub, 0, items, true);
      const nameMatch = !q || sub.name.toLowerCase().includes(q);
      if (q && !nameMatch && items.length === 0) continue;

      cards.push({
        isRootCard: false,
        folderPath: subPath,
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

  private getFocusedTargetFolderPath(): string {
    const curCard = this.renderedCards[this.focusedCardIndex];
    if (this.focusedItemKey) {
      if (this.focusedItemKey.startsWith("folder:")) {
        const path = normalizeFolderStr(this.focusedItemKey.slice(7));
        if (getFolderByPath(this.app, path)) return path;
      } else if (this.focusedItemKey.startsWith("file:")) {
        const file = getFileByPath(this.app, this.focusedItemKey.slice(5));
        if (file?.parent) return normalizeFolderRef(file.parent);
      }
    }
    if (curCard) return normalizeFolderStr(curCard.folderPath);
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
    return null;
  }

  // =========================================================
  // 렌더링 & DOM 무파괴 인플레이스 포커스 동기화
  // =========================================================
  private renderAll(): void {
    this.renderGridAndHeader();
    this.renderShelf();
    this.renderSelectionBar();
    this.renderCarryPill();
    if (this.quickLookOpen) void this.updateQuickLook();
  }

  private renderGridAndHeader(): void {
    const cards = this.buildBoardCards();
    this.renderBreadcrumb();
    this.renderGrid(cards);
    this.updateToolbarStates();
    (this.leaf as unknown as { updateHeader?: () => void }).updateHeader?.();
  }

  // [ID 6.5.13] DOM 무파괴 포커스/선택 인플레이스 갱신
  // -> 방향키 이동 때마다 그리드와 툴바 SVG를 재생성하면 Baseline 등 테마의 아이콘/버튼 전환 효과가 깜빡이므로
  // -> 기존 DOM 노드의 CSS 클래스만 토글해 깜빡임을 원천 제거하고 60fps 반응성을 확보함.
  private syncFocusAndSelectionDOM(): void {
    const cardEls = this.gridEl.querySelectorAll<HTMLElement>(".fb-card");
    const isCarrying = this.carryPaths.length > 0;

    cardEls.forEach((cardEl) => {
      const idx = Number(cardEl.dataset.cardIndex);
      const cardPath = cardEl.dataset.dropFolder || "";
      const isFocusedCard = !isCarrying && idx === this.focusedCardIndex;
      const isCarryCard = isCarrying && idx === this.carryCardIndex && this.carryTargetFolderPath === cardPath;
      cardEl.toggleClass("is-focused-card", isFocusedCard);
      cardEl.toggleClass("is-carry-target", isCarryCard);
    });

    const rowEls = this.gridEl.querySelectorAll<HTMLElement>(".fb-row");
    rowEls.forEach((rowEl) => {
      const key = rowEl.dataset.itemKey || "";
      const filePath = rowEl.dataset.dragPath || "";
      const dropPath = rowEl.dataset.dropFolder;
      const cardIdx = Number(rowEl.dataset.cardIndex);

      const isFocused = !isCarrying && cardIdx === this.focusedCardIndex && key === this.focusedItemKey;
      const isSelected = Boolean(filePath && this.selectedPaths.has(filePath));
      const isCarryFolder =
        isCarrying &&
        dropPath !== undefined &&
        cardIdx === this.carryCardIndex &&
        this.carryTargetFolderPath === dropPath;

      rowEl.toggleClass("is-focused", isFocused);
      rowEl.toggleClass("is-selected", isSelected);
      rowEl.toggleClass("is-carry-target", isCarryFolder);
    });

    this.updateActionTooltipsOnly();
  }

  private updateActionTooltipsOnly(): void {
    const targetLabel = this.getFocusedFolderDisplayName();
    this.newNoteBtnEl.setAttr("aria-label", `새 노트 → ${targetLabel} (N)`);
    this.newFolderBtnEl.setAttr("aria-label", `새 폴더 → ${targetLabel} (Shift+N)`);
  }

  private updateToolbarStates(): void {
    const s = this.plugin.settings;
    this.backBtnEl.disabled = !this.currentFolderPath;

    this.layoutBtns.forEach(({ value, el }) => {
      el.toggleClass("is-active", s.gridCols === value);
    });

    // 정렬 아이콘은 실제 아이콘이 바뀔 때만 setIcon 호출 (불필요한 SVG 재생성 및 테마 깜빡임 방지)
    const nextSortIcon = s.sortBy === "name" ? "arrow-up-down" : "clock";
    if (this.renderedSortIcon !== nextSortIcon) {
      this.renderedSortIcon = nextSortIcon;
      this.sortBtnEl.empty();
      setIcon(this.sortBtnEl, nextSortIcon);
    }
    this.sortBtnEl.setAttr("aria-label", s.sortBy === "name" ? "정렬: 이름순" : "정렬: 최근 수정순");

    this.updateActionTooltipsOnly();
    this.qlBtnEl.toggleClass("is-active", this.quickLookOpen);
  }

  private renderBreadcrumb(): void {
    this.breadcrumbEl.empty();

    const segments: Array<{ path: string; name: string }> = [
      { path: "", name: this.app.vault.getName() }
    ];

    const parts = this.currentFolderPath.split("/").filter(Boolean);
    let acc = "";
    for (const part of parts) {
      acc = acc ? `${acc}/${part}` : part;
      segments.push({ path: acc, name: part });
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

    const prefLayout = this.plugin.settings.gridCols;
    const isScrollMode = prefLayout === "scroll";
    this.canvasEl.toggleClass("is-horizontal-scroll", isScrollMode);

    if (isScrollMode) {
      this.gridEl.className = "fb-grid fb-layout-scroll";
    } else {
      const effectiveCols = Math.max(1, Math.min(prefLayout, Math.max(1, cards.length)));
      const rowCount = Math.max(1, Math.ceil(cards.length / effectiveCols));
      const rowClass = rowCount === 1 ? "fb-rows-1" : rowCount === 2 ? "fb-rows-2" : "fb-rows-many";
      this.gridEl.className = `fb-grid fb-cols-${effectiveCols} ${rowClass}`;
    }

    if (cards.length === 0) {
      this.gridEl.createDiv({ cls: "fb-empty-grid", text: "일치하는 항목이 없습니다" });
      return;
    }

    const isCarrying = this.carryPaths.length > 0;

    cards.forEach((cardModel, cardIdx) => {
      const isFocusedCard = !isCarrying && cardIdx === this.focusedCardIndex;
      const isCarryCard =
        isCarrying && cardIdx === this.carryCardIndex && this.carryTargetFolderPath === cardModel.folderPath;

      const cardEl = this.gridEl.createDiv({
        cls:
          "fb-card" +
          (cardModel.isRootCard ? " is-root-card" : "") +
          (isFocusedCard ? " is-focused-card" : "") +
          (isCarryCard ? " is-carry-target" : ""),
        attr: {
          "data-drop-folder": cardModel.folderPath,
          "data-card-index": String(cardIdx)
        }
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
        this.selectedPaths.clear();
        this.selectionAnchorIndex = null;
        if (cardModel.items.length > 0) {
          const firstFileIdx = cardModel.items.findIndex((it) => it.type === "file");
          this.focusCardItem(cardIdx, firstFileIdx >= 0 ? firstFileIdx : 0);
        } else {
          this.focusedCardIndex = cardIdx;
          this.focusedItemKey = null;
          this.syncFocusAndSelectionDOM();
          this.renderSelectionBar();
        }
      });

      // 네이티브 탐색기 본문
      const listEl = cardEl.createDiv({ cls: "fb-card-body nav-files-container" });

      if (cardModel.items.length === 0) {
        listEl.createDiv({ cls: "fb-empty-card", text: "비어 있음" });
        return;
      }

      cardModel.items.forEach((item, itemIdx) => {
        const isFocused = !isCarrying && cardIdx === this.focusedCardIndex && this.focusedItemKey === item.key;

        if (item.type === "folder") {
          const isCarryFolder =
            isCarrying && cardIdx === this.carryCardIndex && this.carryTargetFolderPath === item.path;
          const row = listEl.createDiv({
            cls:
              "tree-item-self is-clickable nav-folder-title fb-row" +
              (isFocused ? " is-focused" : "") +
              (isCarryFolder ? " is-carry-target" : ""),
            attr: {
              "data-path": item.path,
              "data-drop-folder": item.path,
              "data-item-key": item.key,
              "data-card-index": String(cardIdx)
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
            this.selectedPaths.clear();
            this.selectionAnchorIndex = null;
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
              "data-item-key": item.key,
              "data-card-index": String(cardIdx),
              draggable: "true"
            }
          });
          row.style.paddingLeft = `${10 + item.depth * 14}px`;

          const nIcon = row.createSpan({ cls: "fb-native-icon" });
          const nTitle = row.createSpan({ cls: "tree-item-inner nav-file-title-content", text: item.name });
          applyNativeDecoration(this.app, item.path, nIcon, nTitle, "file-text");

          row.addEventListener("click", (e) => this.handleFileClick(e, item.path, cardIdx, itemIdx));
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
      });
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
    const hide = count < 2 || this.carryPaths.length > 0;
    this.selectionBarEl.toggleClass("is-hidden", hide);
    if (!hide) {
      this.selectionCountEl.setText(`${count}개 선택됨`);
    }
  }

  private renderCarryPill(): void {
    if (this.carryPaths.length === 0 || this.carryTargetFolderPath === null) {
      this.carryPillEl.addClass("is-hidden");
      return;
    }
    const targetName = this.carryTargetFolderPath || this.app.vault.getName();
    this.carryPillEl.setText(`${this.carryPaths.length}개 → ${targetName}`);
    this.carryPillEl.removeClass("is-hidden");
  }

  private async updateQuickLook(targetFileOverride?: TFile | null): Promise<void> {
    this.qlDrawerEl.toggleClass("is-open", this.quickLookOpen);
    if (!this.quickLookOpen) return;

    const file = targetFileOverride !== undefined ? targetFileOverride : this.getFocusedFile();
    this.quickLookPath = file ? file.path : null;
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
  // 포커스 · 범위 다중 선택 · 탐색 · 파일 열기
  // =========================================================
  private focusCardItem(
    cardIdx: number,
    itemIndex: number,
    { clearSelection = true, updatePreview = true }: { clearSelection?: boolean; updatePreview?: boolean } = {}
  ): void {
    const card = this.renderedCards[cardIdx];
    if (!card) return;
    this.focusedCardIndex = cardIdx;

    if (clearSelection) {
      this.selectedPaths.clear();
      this.selectionAnchorIndex = null;
    }

    if (card.items.length === 0) {
      this.focusedItemKey = null;
      this.syncFocusAndSelectionDOM();
      this.renderSelectionBar();
      this.scrollFocusedIntoView();
      return;
    }

    const safeIdx = Math.max(0, Math.min(itemIndex, card.items.length - 1));
    const item = card.items[safeIdx];
    this.focusedItemKey = item.key;

    this.syncFocusAndSelectionDOM();
    this.renderSelectionBar();
    // 다중 선택 중이 아닐 때만 열려 있는 미리보기를 따라가며 갱신
    if (updatePreview && this.quickLookOpen && this.selectedPaths.size === 0 && item.type === "file") {
      void this.updateQuickLook(getFileByPath(this.app, item.path));
    }
    this.scrollFocusedIntoView();
  }

  private scrollFocusedIntoView(): void {
    requestAnimationFrame(() => {
      const targetEl =
        (this.gridEl.querySelector(".fb-row.is-carry-target") as HTMLElement | null) ||
        (this.gridEl.querySelector(".fb-card.is-carry-target") as HTMLElement | null) ||
        (this.gridEl.querySelector(".fb-row.is-focused") as HTMLElement | null) ||
        (this.gridEl.querySelector(".fb-card.is-focused-card") as HTMLElement | null);

      if (targetEl) {
        targetEl.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    });
  }

  private selectRangeInCard(cardIdx: number, anchorIdx: number, targetIdx: number): void {
    const card = this.renderedCards[cardIdx];
    if (!card || card.items.length === 0) return;

    const start = Math.max(0, Math.min(anchorIdx, targetIdx));
    const end = Math.min(card.items.length - 1, Math.max(anchorIdx, targetIdx));

    this.selectedPaths.clear();
    for (let i = start; i <= end; i++) {
      const it = card.items[i];
      if (it.type === "file") this.selectedPaths.add(it.path);
    }

    const safeTarget = Math.max(0, Math.min(targetIdx, card.items.length - 1));
    this.focusedCardIndex = cardIdx;
    this.focusedItemKey = card.items[safeTarget].key;

    // 다중 선택 중에는 미리보기를 바꾸지 않고 예비 포커스 테두리와 선택 음영만 즉시 갱신
    this.syncFocusAndSelectionDOM();
    this.renderSelectionBar();
    this.scrollFocusedIntoView();
  }

  private handleFileClick(e: MouseEvent, path: string, cardIdx: number, itemIdx: number): void {
    if (e.shiftKey && cardIdx === this.focusedCardIndex) {
      const anchor = this.selectionAnchorIndex ?? this.findFocusedCardAndIndex().itemIndex;
      const safeAnchor = anchor >= 0 ? anchor : itemIdx;
      this.selectionAnchorIndex = safeAnchor;
      this.selectRangeInCard(cardIdx, safeAnchor, itemIdx);
      return;
    }

    if (e.metaKey || e.ctrlKey) {
      this.focusedCardIndex = cardIdx;
      this.focusedItemKey = `file:${path}`;
      this.selectionAnchorIndex = itemIdx;
      if (this.selectedPaths.has(path)) this.selectedPaths.delete(path);
      else this.selectedPaths.add(path);
      this.syncFocusAndSelectionDOM();
      this.renderSelectionBar();
      return;
    }

    // 일반 클릭: 예비 포커싱(밝은 테두리)만 이동, 다중 선택 해제
    this.focusCardItem(cardIdx, itemIdx, { clearSelection: true, updatePreview: true });
  }

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
    this.currentFolderPath = normalizeFolderStr(folderPath);
    this.focusedCardIndex = 0;
    this.focusedItemKey = null;
    this.selectedPaths.clear();
    this.selectionAnchorIndex = null;
    this.renderAll();

    if (this.renderedCards[0]?.items[0]) {
      this.focusCardItem(0, 0);
    }
  }

  private goUp(): void {
    if (!this.currentFolderPath) return;
    const current = getFolderByPath(this.app, this.currentFolderPath);
    const parentPath = normalizeFolderRef(current?.parent);
    this.navigateToFolder(parentPath);
  }

  // =========================================================
  // Cmd + 방향키 들고 이동 (Carry Mode)
  // =========================================================
  private beginOrStepCarry(direction: "left" | "right" | "up" | "down"): void {
    if (this.renderedCards.length === 0) return;

    if (this.carryPaths.length === 0) {
      if (this.selectedPaths.size > 0) {
        this.carryPaths = [...this.selectedPaths];
      } else {
        const focusedFile = this.getFocusedFile();
        if (!focusedFile) return;
        this.carryPaths = [focusedFile.path];
      }
      this.carryCardIndex = this.focusedCardIndex;
      this.carryTargetFolderPath = this.renderedCards[this.carryCardIndex]?.folderPath ?? this.currentFolderPath;
    }

    if (direction === "left" || direction === "right") {
      const delta = direction === "right" ? 1 : -1;
      this.carryCardIndex = (this.carryCardIndex + delta + this.renderedCards.length) % this.renderedCards.length;
      this.carryTargetFolderPath = this.renderedCards[this.carryCardIndex].folderPath;
    } else {
      // Cmd + ↑/↓: 현재 대상 카드 내 직속 + 펼쳐진 하위 폴더 사이를 순회하며 정밀 드롭 지정
      const card = this.renderedCards[this.carryCardIndex];
      if (!card) return;
      const folderTargets: string[] = [
        card.folderPath,
        ...card.items.filter((it) => it.type === "folder").map((it) => it.path)
      ];
      const curIdx = folderTargets.indexOf(this.carryTargetFolderPath ?? card.folderPath);
      const delta = direction === "down" ? 1 : -1;
      const nextIdx = Math.max(0, Math.min((curIdx === -1 ? 0 : curIdx) + delta, folderTargets.length - 1));
      this.carryTargetFolderPath = folderTargets[nextIdx];
    }

    this.syncFocusAndSelectionDOM();
    this.renderSelectionBar();
    this.renderCarryPill();
    this.scrollFocusedIntoView();
  }

  private commitCarryMode(): void {
    if (this.carryPaths.length === 0 || this.carryTargetFolderPath === null) return;
    const paths = [...this.carryPaths];
    const dest = normalizeFolderStr(this.carryTargetFolderPath);
    const destCardIdx = this.carryCardIndex;

    this.carryPaths = [];
    this.carryTargetFolderPath = null;
    this.renderCarryPill();

    this.focusedCardIndex = destCardIdx;
    void this.moveFiles(paths, dest);
  }

  private cancelCarryMode(): void {
    if (this.carryPaths.length === 0) return;
    this.carryPaths = [];
    this.carryTargetFolderPath = null;
    this.syncFocusAndSelectionDOM();
    this.renderSelectionBar();
    this.renderCarryPill();
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
          this.selectedPaths.clear();
          this.focusedItemKey = `file:${created.path}`;
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
          this.selectedPaths.clear();
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
        const parentPath = normalizeFolderRef(target.parent);
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
  // 드래그 앤 드롭 & 링크 안전 일괄 이동 + Undo
  // =========================================================
  private handleDragStart(e: DragEvent, path: string, fromShelf: boolean): void {
    if (!e.dataTransfer) return;

    if (fromShelf) {
      this.activeDragPaths = [path];
    } else if (this.selectedPaths.has(path) && this.selectedPaths.size > 1) {
      this.activeDragPaths = [...this.selectedPaths];
    } else {
      this.activeDragPaths = [path];
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
        const destFolderPath = normalizeFolderStr(dropEl.getAttribute("data-drop-folder"));
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

  private async moveFiles(sourcePaths: string[], rawDestFolderPath: string): Promise<void> {
    const destFolderPath = normalizeFolderStr(rawDestFolderPath);
    const unique = [...new Set(sourcePaths)];
    const moves: MoveUndoEntry["moves"] = [];
    let skipped = 0;

    for (const srcPath of unique) {
      const file = getFileByPath(this.app, srcPath);
      if (!file) continue;
      const currentParent = normalizeFolderRef(file.parent);
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
      this.selectedPaths.clear();
      this.selectionAnchorIndex = null;
      this.focusedItemKey = `file:${moves[0].toPath}`;

      const destName = destFolderPath || this.app.vault.getName();
      new Notice(`${moves.length}개 항목을 '${destName}'로 이동했습니다.`);
      this.renderAll();
      this.scrollFocusedIntoView();
    } else if (skipped > 0) {
      new Notice("대상 폴더에 같은 이름의 파일이 있어 이동하지 못했습니다.");
    } else {
      this.syncFocusAndSelectionDOM();
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
  // 키보드 2D 탐색 · Shift 다중 선택 · Cmd 들고 이동 핸들러
  // =========================================================
  private isViewActive(): boolean {
    if (this.isSubModalOpen) return false;
    if (document.querySelector(".modal-container")) return false;
    return this.app.workspace.getActiveViewOfType(FolderBoardView) === this;
  }

  private handleKeyup(e: KeyboardEvent): void {
    if (this.carryPaths.length === 0) return;
    if (e.key === "Meta" || e.key === "Control") {
      this.commitCarryMode();
    }
  }

  private handleKeydown(e: KeyboardEvent): void {
    if (!this.isViewActive()) return;
    if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select")) {
      if (e.key === "Escape") (e.target as HTMLElement).blur();
      return;
    }

    const meta = e.metaKey || e.ctrlKey;

    if (e.key === "Escape") {
      if (this.carryPaths.length > 0) {
        e.preventDefault();
        this.cancelCarryMode();
        return;
      }
      if (this.selectedPaths.size > 0) {
        e.preventDefault();
        this.selectedPaths.clear();
        this.selectionAnchorIndex = null;
        this.syncFocusAndSelectionDOM();
        this.renderSelectionBar();
      } else if (this.quickLookOpen) {
        e.preventDefault();
        this.quickLookOpen = false;
        this.quickLookPath = null;
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

    // [ID 6.5.14] Cmd/Ctrl + 방향키: 선택된 항목(또는 포커스 파일) 들고 원하는 폴더로 이동 → 키 떼면 드롭
    if (meta && (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      e.stopPropagation();
      const dirMap = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down"
      } as const;
      this.beginOrStepCarry(dirMap[e.key]);
      return;
    }

    // Shift + 위/아래 방향키: 범위 다중 선택 (미리보기는 변경하지 않음)
    if (e.shiftKey && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      e.stopPropagation();
      const { card, itemIndex } = this.findFocusedCardAndIndex();
      if (!card || card.items.length === 0) return;

      const curIdx = itemIndex === -1 ? 0 : itemIndex;
      if (this.selectionAnchorIndex === null) {
        this.selectionAnchorIndex = curIdx;
      }
      const delta = e.key === "ArrowDown" ? 1 : -1;
      const nextIdx = Math.max(0, Math.min(curIdx + delta, card.items.length - 1));
      this.selectRangeInCard(this.focusedCardIndex, this.selectionAnchorIndex, nextIdx);
      return;
    }

    // 좌/우: 폴더 카드 간 이동 (예비 포커싱)
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.key === "ArrowRight" ? 1 : -1;
      const nextIdx = (this.focusedCardIndex + delta + this.renderedCards.length) % this.renderedCards.length;
      const targetCard = this.renderedCards[nextIdx];
      const firstFileIdx = targetCard.items.findIndex((it) => it.type === "file");
      this.focusCardItem(nextIdx, firstFileIdx >= 0 ? firstFileIdx : 0, {
        clearSelection: true,
        updatePreview: true
      });
      return;
    }

    // 위/아래: 현재 카드 내 아이템 이동 (예비 포커싱)
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
      this.focusCardItem(this.focusedCardIndex, nextIdx, {
        clearSelection: true,
        updatePreview: true
      });
      return;
    }

    // Space: 폴더면 접기/펼치기, 파일이면 Quick Look 열기/갱신/닫기
    if (e.code === "Space") {
      e.preventDefault();
      e.stopPropagation();
      const { item } = this.findFocusedCardAndIndex();
      if (item?.type === "folder") {
        void this.plugin.toggleFolderExpanded(item.path).then(() => this.renderGridAndHeader());
      } else if (item?.type === "file") {
        const file = getFileByPath(this.app, item.path);
        if (!this.quickLookOpen) {
          this.quickLookOpen = true;
          void this.updateQuickLook(file);
        } else if (this.quickLookPath !== item.path) {
          // 다중 선택 중 예비 포커스가 다른 노트로 옮겨갔을 때 Space를 누르면 해당 노트로 미리보기 갱신
          void this.updateQuickLook(file);
        } else {
          this.quickLookOpen = false;
          this.quickLookPath = null;
          void this.updateQuickLook();
        }
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

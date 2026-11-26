// [ID 6.5] 2D 네이티브 폴더 탐색기 워크스페이스 뷰 (FolderBoardView extends ItemView)
// -> 2/3/4열 그리드 + 세로 펼침(가로 스크롤) 모드, DOM 파괴 없는 인플레이스 포커스 갱신(테마 깜빡임 방지),
// -> 예비 포커싱(밝은 테두리) + Shift 다중 선택 + Cmd+방향키 들고 이동(키 떼면 드롭)을 구현함.
import {
  Component,
  EventRef,
  ItemView,
  MarkdownRenderer,
  Notice,
  Scope,
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
const CARD_REORDER_MIME = "application/x-obsidian-folder-board-card";
const CARD_HEADER_KEY = "__card_header__";

interface FolderBoardViewState {
  folderPath?: string;
  focusedCardIndex?: number;
  focusedItemKey?: string | null;
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
  // [ID 6.5.15] 옵시디언 기본 뒤로가기(History) 활성화
  // -> navigation = true로 설정해야 노트 진입 후 뒤로가기(Cmd+Opt+Left / 마우스 뒤로가기)로 폴더 보드로 즉시 복귀할 수 있음.
  navigation = true;

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

  // [ID 6.5.11] Option(Alt)+방향키 들고 이동 & Cmd+C/X/V 복사·잘라내기·붙여넣기 클립보드 상태
  // -> cut은 이동(원본 반투명 표시), copy는 재귀 복제(여러 폴더에 반복 붙여넣기 가능)로 동작함.
  private carryPaths: string[] = [];
  private carryCardIndex = 0;
  private carryTargetFolderPath: string | null = null;
  private clipboardMode: "cut" | "copy" | null = null;
  private clipboardPaths: string[] = [];

  private activeDragPaths: string[] = [];
  private draggingCardPath: string | null = null;
  private reorderTargetEl: HTMLElement | null = null;
  private reorderPosition: "before" | "after" = "before";
  private currentDropEl: HTMLElement | null = null;
  private isDragging = false;
  private isSubModalOpen = false;
  private isInlineRenaming = false;
  private renderedSortIcon: string | null = null;
  // [ID 6.5.36] viewScope와 window capture 간 중복 실행 방지용 이벤트 추적기
  // -> e.defaultPrevented 대신 WeakSet을 사용해 옵시디언 기본 핫키(Cmd+D 등)가 preventDefault()를 걸어도 보드 동작이 정상 실행되게 함.
  private handledKeyEvents = new WeakSet<KeyboardEvent>();

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
  private resizeObserver: ResizeObserver | null = null;
  // [ID 6.5.32] 뷰 전용 Obsidian Scope -> 옵시디언 글로벌 Cmd+F/A/D 단축키보다 우선해 보드 활성 시 안전하게 가로챔
  private viewScope: Scope | null = null;
  private scopeActive = false;
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
    return {
      folderPath: this.currentFolderPath,
      focusedCardIndex: this.focusedCardIndex,
      focusedItemKey: this.focusedItemKey
    };
  }

  async setState(state: FolderBoardViewState, result: { history: boolean }): Promise<void> {
    if (typeof state?.folderPath === "string") {
      this.currentFolderPath = normalizeFolderStr(state.folderPath);
    }
    if (typeof state?.focusedCardIndex === "number") {
      this.focusedCardIndex = state.focusedCardIndex;
    }
    if (state?.focusedItemKey !== undefined) {
      this.focusedItemKey = state.focusedItemKey;
    }
    await super.setState(state, result);
    if (this.shellEl) {
      this.renderAll();
      this.scrollFocusedIntoView();
      requestAnimationFrame(() => this.shellEl?.focus());
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

  private isInputFocused(): boolean {
    return Boolean(
      document.activeElement instanceof HTMLElement &&
        document.activeElement.closest("input, textarea, select")
    );
  }

  private hasSelectedText(): boolean {
    const sel = window.getSelection();
    return Boolean(sel && sel.toString().length > 0);
  }

  private setupViewScope(): void {
    const scope = new Scope(this.app.scope);

    // [ID 6.5.34] Mod(Cmd)와 Ctrl 모두 등록 + 한글 IME 키 동시 대응
    // -> 옵시디언 글로벌 키맵 및 Electron 기본 복사/붙여넣기보다 보드 뷰 Scope가 우선 실행되도록 보장함.
    const registerModAndCtrl = (keys: string[], handler: (evt: KeyboardEvent) => boolean | void) => {
      for (const key of keys) {
        scope.register(["Mod"], key, handler);
        scope.register(["Ctrl"], key, handler);
      }
    };

    // Cmd/Ctrl + F: 보드 검색창 포커스
    registerModAndCtrl(["f", "ㄹ"], (evt) => {
      this.handledKeyEvents.add(evt);
      evt.preventDefault();
      evt.stopImmediatePropagation();
      this.focusSearchBox();
      return false;
    });

    // Cmd/Ctrl + A: 현재 카드 전체 선택
    registerModAndCtrl(["a", "ㅁ"], (evt) => {
      if (this.isInputFocused()) return true;
      this.handledKeyEvents.add(evt);
      evt.preventDefault();
      evt.stopImmediatePropagation();
      this.selectAllInFocusedCard();
      return false;
    });

    // Cmd/Ctrl + C: 선택/포커스 파일·폴더 복사
    registerModAndCtrl(["c", "ㅊ"], (evt) => {
      if (this.isInputFocused() || this.hasSelectedText()) return true;
      if (this.copySelectedOrFocused()) {
        this.handledKeyEvents.add(evt);
        evt.preventDefault();
        evt.stopImmediatePropagation();
        return false;
      }
      return true;
    });

    // Cmd/Ctrl + X: 선택/포커스 파일·폴더 잘라내기
    registerModAndCtrl(["x", "ㅌ"], (evt) => {
      if (this.isInputFocused() || this.hasSelectedText()) return true;
      if (this.cutSelectedOrFocused()) {
        this.handledKeyEvents.add(evt);
        evt.preventDefault();
        evt.stopImmediatePropagation();
        return false;
      }
      return true;
    });

    // Cmd/Ctrl + V: 복사/잘라낸 항목을 현재 포커스 폴더에 붙여넣기
    registerModAndCtrl(["v", "ㅍ"], (evt) => {
      if (this.isInputFocused()) return true;
      if (this.clipboardPaths.length > 0 && this.clipboardMode) {
        this.handledKeyEvents.add(evt);
        evt.preventDefault();
        evt.stopImmediatePropagation();
        void this.pasteClipboardToFocusedFolder();
        return false;
      }
      return true;
    });

    this.viewScope = scope;
  }

  private syncScopeState(): void {
    const shouldBeActive =
      !this.isSubModalOpen &&
      !this.isInlineRenaming &&
      !document.querySelector(".modal-container") &&
      this.app.workspace.getActiveViewOfType(FolderBoardView) === this;

    if (shouldBeActive && !this.scopeActive && this.viewScope) {
      this.app.keymap.pushScope(this.viewScope);
      this.scopeActive = true;
    } else if (!shouldBeActive && this.scopeActive && this.viewScope) {
      this.app.keymap.popScope(this.viewScope);
      this.scopeActive = false;
    }
  }

  private focusSearchBox(): void {
    this.searchInputEl?.focus();
    this.searchInputEl?.select();
  }

  async onOpen(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass("fb-view-content");

    this.buildShell();
    this.setupViewScope();
    this.bindVaultEvents();
    this.bindInteractionEvents();
    this.renderAll();

    if (!this.findFocusedCardAndIndex().item && this.renderedCards[0]?.items[0]) {
      this.focusCardItem(0, 0);
    }

    this.syncScopeState();
    // 리로드 직후 이미 활성 탭인 경우 active-leaf-change가 안 뜰 수 있으므로 layoutReady 시점에도 한 번 더 동기화
    this.app.workspace.onLayoutReady(() => this.syncScopeState());
    requestAnimationFrame(() => {
      this.shellEl?.focus();
      this.syncScopeState();
    });
  }

  async onClose(): Promise<void> {
    if (this.scopeActive && this.viewScope) {
      this.app.keymap.popScope(this.viewScope);
      this.scopeActive = false;
    }
    this.viewScope = null;
    this.unbindVaultEvents();
    window.removeEventListener("keydown", this.boundKeydown, true);
    document.removeEventListener("keyup", this.boundKeyup, true);
    window.removeEventListener("blur", this.boundWindowBlur);
    this.contentEl.removeEventListener("dragover", this.boundDragOver);
    this.contentEl.removeEventListener("dragleave", this.boundDragLeave);
    this.contentEl.removeEventListener("drop", this.boundDrop);
    document.removeEventListener("dragend", this.boundDragEnd);

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
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
    this.shellEl.addEventListener("mousedown", () => this.syncScopeState());
    this.shellEl.addEventListener("focusin", () => this.syncScopeState());

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
    this.searchInputEl.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        this.searchInputEl.blur();
        this.shellEl?.focus();
      } else if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        this.searchInputEl.blur();
        this.shellEl?.focus();
        if (this.renderedCards[0]?.items[0]) {
          this.focusCardItem(0, 0);
        }
      }
    });
    this.clearSearchEl.addEventListener("click", () => {
      this.searchQuery = "";
      this.searchInputEl.value = "";
      this.clearSearchEl.addClass("is-hidden");
      this.renderGridAndHeader();
    });

    // [ID 6.5.12] 레이아웃 세그먼트 (2/3/4열 고정 · 세로 자동 열 · 가로 스크롤 세로 펼침)
    const colGroup = controls.createDiv({ cls: "fb-segmented" });
    const layoutOptions: Array<{ value: LayoutColumns; label: string; aria: string; icon?: string }> = [
      { value: 2, label: "2", aria: "2열 그리드" },
      { value: 3, label: "3", aria: "3열 그리드" },
      { value: 4, label: "4", aria: "4열 그리드" },
      { value: "auto", label: "", aria: "세로 모드 (넓이 자동 맞춤)", icon: "layout-grid" },
      { value: "scroll", label: "", aria: "가로 모드 (세로 펼침 · 가로 스크롤)", icon: "columns" }
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

    // [ID 6.5.19] 세로 자동 모드 창 폭 반응형 행 높이 보정
    this.resizeObserver = new ResizeObserver(() => {
      if (this.plugin.settings.gridCols === "auto" && this.renderedCards.length > 0) {
        this.applyGridLayoutClasses(this.renderedCards.length);
      }
    });
    this.resizeObserver.observe(this.canvasEl);

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
    this.vaultRefs.push(this.app.workspace.on("active-leaf-change", () => this.syncScopeState()));
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
    this.vaultRefs.forEach((ref) => {
      this.app.vault.offref(ref);
      this.app.workspace.offref(ref);
    });
    this.vaultRefs = [];
  }

  private bindInteractionEvents(): void {
    window.addEventListener("keydown", this.boundKeydown, true);
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

    // [ID 6.5.30] 사용자 지정 폴더 카드 순서 우선 적용 (미지정 신규 폴더는 뒤쪽에 이름순 배치)
    const customOrder = this.plugin.getFolderOrder(normalizeFolderRef(folder));
    if (customOrder.length > 0) {
      const rank = new Map(customOrder.map((p, idx) => [p, idx]));
      folders.sort((a, b) => {
        const ra = rank.has(normalizeFolderRef(a)) ? rank.get(normalizeFolderRef(a))! : Number.MAX_SAFE_INTEGER;
        const rb = rank.has(normalizeFolderRef(b)) ? rank.get(normalizeFolderRef(b))! : Number.MAX_SAFE_INTEGER;
        if (ra !== rb) return ra - rb;
        return a.name.localeCompare(b.name, undefined, { numeric: true });
      });
    }

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
    this.syncFocusAndSelectionDOM();
    this.updateToolbarStates();
    (this.leaf as unknown as { updateHeader?: () => void }).updateHeader?.();
  }

  // [ID 6.5.13] DOM 무파괴 포커스/선택 인플레이스 갱신
  // -> 방향키 이동 때마다 그리드와 툴바 SVG를 재생성하면 Baseline 등 테마의 아이콘/버튼 전환 효과가 깜빡이므로
  // -> 기존 DOM 노드의 CSS 클래스만 토글해 깜빡임을 원천 제거하고 60fps 반응성을 확보함.
  private syncFocusAndSelectionDOM(): void {
    const cardEls = this.gridEl.querySelectorAll<HTMLElement>(".fb-card");
    const isCarrying = this.carryPaths.length > 0;

    const cutSet = new Set(this.clipboardMode === "cut" ? this.clipboardPaths : []);

    cardEls.forEach((cardEl) => {
      const idx = Number(cardEl.dataset.cardIndex);
      const cardPath = cardEl.dataset.dropFolder || "";
      const isFocusedCard = !isCarrying && idx === this.focusedCardIndex;
      const isHeaderFocused = isFocusedCard && this.focusedItemKey === CARD_HEADER_KEY;
      const isCarryCard = isCarrying && idx === this.carryCardIndex && this.carryTargetFolderPath === cardPath;
      const isCutCard = Boolean(cardPath && cutSet.has(cardPath));
      cardEl.toggleClass("is-focused-card", isFocusedCard);
      cardEl.toggleClass("is-carry-target", isCarryCard);
      cardEl.toggleClass("is-cut", isCutCard);
      const headerEl = cardEl.querySelector<HTMLElement>(".fb-card-header");
      if (headerEl) headerEl.toggleClass("is-header-focused", isHeaderFocused);
    });

    const rowEls = this.gridEl.querySelectorAll<HTMLElement>(".fb-row");
    rowEls.forEach((rowEl) => {
      const key = rowEl.dataset.itemKey || "";
      const itemPath = rowEl.dataset.dragPath || "";
      const dropPath = rowEl.dataset.dropFolder;
      const cardIdx = Number(rowEl.dataset.cardIndex);

      const isFocused = !isCarrying && cardIdx === this.focusedCardIndex && key === this.focusedItemKey;
      const isSelected = Boolean(itemPath && this.selectedPaths.has(itemPath));
      const isCut = Boolean(itemPath && cutSet.has(itemPath));
      const isCarryFolder =
        isCarrying &&
        dropPath !== undefined &&
        cardIdx === this.carryCardIndex &&
        this.carryTargetFolderPath === dropPath;

      rowEl.toggleClass("is-focused", isFocused);
      rowEl.toggleClass("is-selected", isSelected);
      rowEl.toggleClass("is-cut", isCut);
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

  private applyGridLayoutClasses(cardCount: number): void {
    const prefLayout = this.plugin.settings.gridCols;
    const isScrollMode = prefLayout === "scroll";
    this.canvasEl.toggleClass("is-horizontal-scroll", isScrollMode);

    if (isScrollMode) {
      this.gridEl.className = "fb-grid fb-layout-scroll";
    } else if (prefLayout === "auto") {
      // [ID 6.5.19] 세로 모드: 현재 폭 기준 예상 열 수를 계산해 1줄이면 세로 100%, 여러 줄이면 위아래 스크롤
      const availWidth = Math.max(260, this.canvasEl.clientWidth - 28);
      const estimatedCols = Math.max(1, Math.floor((availWidth + 10) / 270));
      const rowClass = cardCount <= estimatedCols ? "fb-rows-1" : "fb-rows-auto";
      this.gridEl.className = `fb-grid fb-layout-auto ${rowClass}`;
    } else {
      const effectiveCols = Math.max(1, Math.min(prefLayout, Math.max(1, cardCount)));
      const rowCount = Math.max(1, Math.ceil(cardCount / effectiveCols));
      const rowClass = rowCount === 1 ? "fb-rows-1" : rowCount === 2 ? "fb-rows-2" : "fb-rows-many";
      this.gridEl.className = `fb-grid fb-cols-${effectiveCols} ${rowClass}`;
    }
  }

  private openContextMenu(e: MouseEvent, target: TAbstractFile): void {
    e.preventDefault();
    e.stopPropagation();
    openNativeFileMenu(this.app, e, target, {
      leaf: this.leaf,
      onMutated: () => this.renderAll(),
      onRequestRename: (file) => this.promptRename(file),
      onRequestCreateNote: (folderPath) => this.promptCreateNote(folderPath),
      onRequestCreateFolder: (folderPath) => this.promptCreateFolder(folderPath)
    });
  }

  private renderGrid(cards: BoardCardModel[]): void {
    this.gridEl.empty();
    this.applyGridLayoutClasses(cards.length);

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

      // [ID 6.5.38] 직속 영역은 상단 브레드크럼에 경로가 이미 표시되므로 헤더(제목·아이콘·직속 배지) 생략
      if (!cardModel.isRootCard) {
        const isHeaderFocused = isFocusedCard && this.focusedItemKey === CARD_HEADER_KEY;
        const headerEl = cardEl.createDiv({
          cls: "fb-card-header" + (isHeaderFocused ? " is-header-focused" : "")
        });
        const titleWrap = headerEl.createDiv({ cls: "fb-card-title-wrap" });
        const iconEl = titleWrap.createSpan({ cls: "fb-native-icon" });
        const nameEl = titleWrap.createSpan({ cls: "fb-card-title", text: cardModel.title });
        applyNativeDecoration(this.app, cardModel.folderPath, iconEl, nameEl, "folder");

        const metaEl = headerEl.createDiv({ cls: "fb-card-meta" });
        metaEl.createSpan({ cls: "fb-count", text: String(cardModel.totalCount) });

        headerEl.setAttr("draggable", "true");
        headerEl.addEventListener("dragstart", (e) =>
          this.handleCardDragStart(e, cardModel.folderPath, cardModel.title)
        );

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
          if (folder) this.openContextMenu(e, folder);
        });

        headerEl.addEventListener("click", () => {
          this.selectedPaths.clear();
          this.selectionAnchorIndex = null;
          this.focusedCardIndex = cardIdx;
          this.focusedItemKey = CARD_HEADER_KEY;
          this.syncFocusAndSelectionDOM();
          this.renderSelectionBar();
          this.scrollFocusedIntoView();
        });
      }

      // 네이티브 탐색기 본문 (빈 공간 우클릭 시 해당 카드 폴더의 네이티브 생성 메뉴 표시)
      const listEl = cardEl.createDiv({ cls: "fb-card-body nav-files-container" });
      listEl.addEventListener("click", (e) => {
        if ((e.target as HTMLElement | null)?.closest(".fb-row")) return;
        this.selectedPaths.clear();
        this.selectionAnchorIndex = null;
        this.focusedCardIndex = cardIdx;
        if (cardModel.items.length === 0) {
          this.focusedItemKey = cardModel.isRootCard ? null : CARD_HEADER_KEY;
        }
        this.syncFocusAndSelectionDOM();
        this.renderSelectionBar();
      });
      listEl.addEventListener("contextmenu", (e) => {
        if ((e.target as HTMLElement | null)?.closest(".fb-row")) return;
        const folder = getFolderByPath(this.app, cardModel.folderPath);
        if (folder) this.openContextMenu(e, folder);
      });

      if (cardModel.items.length === 0) {
        listEl.createDiv({ cls: "fb-empty-card", text: "비어 있음" });
        return;
      }

      cardModel.items.forEach((item, itemIdx) => {
        const isFocused = !isCarrying && cardIdx === this.focusedCardIndex && this.focusedItemKey === item.key;

        if (item.type === "folder") {
          const isSelected = this.selectedPaths.has(item.path);
          const isCarryFolder =
            isCarrying && cardIdx === this.carryCardIndex && this.carryTargetFolderPath === item.path;
          const row = listEl.createDiv({
            cls:
              "tree-item-self is-clickable nav-folder-title fb-row" +
              (isSelected ? " is-selected" : "") +
              (isFocused ? " is-focused" : "") +
              (isCarryFolder ? " is-carry-target" : ""),
            attr: {
              "data-path": item.path,
              "data-drag-path": item.path,
              "data-drop-folder": item.path,
              "data-item-key": item.key,
              "data-card-index": String(cardIdx),
              draggable: "true"
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
            if (e.shiftKey && cardIdx === this.focusedCardIndex) {
              const anchor = this.selectionAnchorIndex ?? this.findFocusedCardAndIndex().itemIndex;
              const safeAnchor = anchor >= 0 ? anchor : itemIdx;
              this.selectionAnchorIndex = safeAnchor;
              this.selectRangeInCard(cardIdx, safeAnchor, itemIdx);
              return;
            }
            if (e.metaKey || e.ctrlKey) {
              this.focusedCardIndex = cardIdx;
              this.focusedItemKey = item.key;
              this.selectionAnchorIndex = itemIdx;
              if (this.selectedPaths.has(item.path)) this.selectedPaths.delete(item.path);
              else this.selectedPaths.add(item.path);
              this.syncFocusAndSelectionDOM();
              this.renderSelectionBar();
              return;
            }
            this.focusedCardIndex = cardIdx;
            this.focusedItemKey = item.key;
            this.selectedPaths.clear();
            this.selectionAnchorIndex = null;
            await this.plugin.toggleFolderExpanded(item.path);
            this.renderGridAndHeader();
          });

          row.addEventListener("dblclick", (e) => {
            e.stopPropagation();
            this.enterInlineSubfolderLevel(item.path);
          });

          row.addEventListener("contextmenu", (e) => {
            const folder = getFolderByPath(this.app, item.path);
            if (folder) this.openContextMenu(e, folder);
          });
          row.addEventListener("dragstart", (e) => this.handleDragStart(e, item.path, false));
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
            if (file) this.openContextMenu(e, file);
          });
          row.addEventListener("dragstart", (e) => this.handleDragStart(e, item.path, false));
        }
      });
    });
  }

  private renderShelf(): void {
    this.shelfPaths = this.shelfPaths.filter((p) => this.app.vault.getAbstractFileByPath(p) !== null);
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
      const abs = this.app.vault.getAbstractFileByPath(path);
      if (!abs) continue;
      const chip = this.shelfListEl.createDiv({
        cls: "fb-shelf-chip",
        attr: { draggable: "true", "data-drag-path": path }
      });
      const label = abs instanceof TFile && abs.extension === "md" ? abs.basename : abs.name;
      chip.createSpan({ text: label });
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
    const hide = count < 2 || this.carryPaths.length > 0 || this.clipboardPaths.length > 0;
    this.selectionBarEl.toggleClass("is-hidden", hide);
    if (!hide) {
      this.selectionCountEl.setText(`${count}개 선택됨`);
    }
  }

  private renderCarryPill(): void {
    if (this.carryPaths.length > 0 && this.carryTargetFolderPath !== null) {
      const targetName = this.carryTargetFolderPath || this.app.vault.getName();
      this.carryPillEl.setText(`${this.carryPaths.length}개 → ${targetName}`);
      this.carryPillEl.removeClass("is-hidden");
      return;
    }

    this.clipboardPaths = this.clipboardPaths.filter(
      (p) => this.app.vault.getAbstractFileByPath(p) !== null
    );
    if (this.clipboardPaths.length > 0 && this.clipboardMode) {
      const label =
        this.clipboardMode === "copy"
          ? `${this.clipboardPaths.length}개 복사됨 · ⌘V 붙여넣기`
          : `${this.clipboardPaths.length}개 잘라냄 · ⌘V 이동`;
      this.carryPillEl.setText(label);
      this.carryPillEl.removeClass("is-hidden");
      return;
    }

    this.clipboardMode = null;
    this.carryPillEl.addClass("is-hidden");
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
      this.focusedItemKey = card.isRootCard ? null : CARD_HEADER_KEY;
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

  // [ID 6.5.16] 카드 단위 좌우 스크롤 보정 (첫/끝 카드 짤림 방지)
  // -> 0번 카드는 scrollLeft = 0, 마지막 카드는 scrollWidth 끝까지 완전히 밀어주어 좌우 짤림 현상을 없애고,
  // -> 중간 카드는 카드 프레임 전체를 먼저 수평 정렬한 뒤 내부 행을 수직 스크롤함.
  private scrollFocusedIntoView(): void {
    requestAnimationFrame(() => {
      const isCarrying = this.carryPaths.length > 0;
      const activeCardIdx = isCarrying ? this.carryCardIndex : this.focusedCardIndex;
      const lastCardIdx = this.renderedCards.length - 1;

      if (this.plugin.settings.gridCols === "scroll") {
        if (activeCardIdx <= 0) {
          this.canvasEl.scrollLeft = 0;
        } else if (activeCardIdx >= lastCardIdx) {
          this.canvasEl.scrollLeft = this.canvasEl.scrollWidth;
        } else {
          const activeCardEl = this.gridEl.querySelector<HTMLElement>(
            `.fb-card[data-card-index="${activeCardIdx}"]`
          );
          if (activeCardEl) {
            const pad = 14;
            const leftEdge = activeCardEl.offsetLeft - pad;
            const rightEdge = activeCardEl.offsetLeft + activeCardEl.offsetWidth + pad;
            if (leftEdge < this.canvasEl.scrollLeft) {
              this.canvasEl.scrollLeft = Math.max(0, leftEdge);
            } else if (rightEdge > this.canvasEl.scrollLeft + this.canvasEl.clientWidth) {
              this.canvasEl.scrollLeft = rightEdge - this.canvasEl.clientWidth;
            }
          }
        }
      } else {
        const activeCardEl = this.gridEl.querySelector<HTMLElement>(
          `.fb-card[data-card-index="${activeCardIdx}"]`
        );
        if (activeCardEl) {
          activeCardEl.scrollIntoView({ block: "nearest", inline: "nearest" });
        }
      }

      const rowEl =
        (this.gridEl.querySelector(".fb-row.is-carry-target") as HTMLElement | null) ||
        (this.gridEl.querySelector(".fb-row.is-focused") as HTMLElement | null);
      if (rowEl) {
        rowEl.scrollIntoView({ block: "nearest", inline: "nearest" });
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
      this.selectedPaths.add(it.path);
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

  // [ID 6.5.8] 동일 탭 노트 열기 + 뒤로가기 히스토리 보존
  // -> navigation = true인 현재 leaf에서 바로 openFile을 호출해야 옵시디언 기본 뒤로가기(Cmd+Opt+Left)로 Folder Board로 복귀됨.
  private async openFile(file: TFile, forceNewTab = false): Promise<void> {
    if (forceNewTab || this.plugin.settings.openBehavior === "new-tab") {
      const newLeaf = this.app.workspace.getLeaf("tab");
      await newLeaf.openFile(file, { active: true });
      return;
    }

    await this.leaf.openFile(file, { active: true });
  }

  private navigateToFolder(folderPath: string, focusChildFolderPath?: string): void {
    this.currentFolderPath = normalizeFolderStr(folderPath);
    this.focusedCardIndex = 0;
    this.focusedItemKey = null;
    this.selectedPaths.clear();
    this.selectionAnchorIndex = null;
    this.renderAll();

    if (focusChildFolderPath) {
      const normalizedChild = normalizeFolderStr(focusChildFolderPath);
      const matchIdx = this.renderedCards.findIndex(
        (c) => !c.isRootCard && c.folderPath === normalizedChild
      );
      if (matchIdx >= 0) {
        const card = this.renderedCards[matchIdx];
        const firstFileIdx = card.items.findIndex((it) => it.type === "file");
        if (firstFileIdx >= 0) {
          this.focusCardItem(matchIdx, firstFileIdx);
        } else if (card.items.length > 0) {
          this.focusCardItem(matchIdx, 0);
        } else {
          this.focusedCardIndex = matchIdx;
          this.focusedItemKey = CARD_HEADER_KEY;
          this.syncFocusAndSelectionDOM();
          this.scrollFocusedIntoView();
        }
        return;
      }
    }

    if (this.renderedCards[0]?.items[0]) {
      this.focusCardItem(0, 0);
    } else if (this.renderedCards[1]) {
      this.focusedCardIndex = 1;
      this.focusedItemKey = CARD_HEADER_KEY;
      this.syncFocusAndSelectionDOM();
      this.scrollFocusedIntoView();
    }
  }

  // [ID 6.5.17] 카드 내부 하위 폴더 Enter 시 한 단계 상위(형제 폴더들이 함께 보이는 레벨)로 이동
  // -> 사용자가 하위 폴더를 눌렀을 때 같은 레벨의 다른 형제 폴더 카드들도 한눈에 비교할 수 있도록 부모로 진입하고 해당 카드에 포커스함.
  private enterInlineSubfolderLevel(subfolderPath: string): void {
    const folder = getFolderByPath(this.app, subfolderPath);
    const parentPath = normalizeFolderRef(folder?.parent);
    if (parentPath === this.currentFolderPath) {
      // 이미 같은 레벨이면 해당 폴더 안으로 직접 진입
      this.navigateToFolder(subfolderPath);
      return;
    }
    this.navigateToFolder(parentPath, subfolderPath);
  }

  private goUp(): void {
    if (!this.currentFolderPath) return;
    const current = getFolderByPath(this.app, this.currentFolderPath);
    const parentPath = normalizeFolderRef(current?.parent);
    this.navigateToFolder(parentPath);
  }

  // =========================================================
  // [ID 6.5.21] Cmd/Ctrl + 방향키 들고 이동 (파일 + 폴더 지원 · 현재 위치 기준 바로 위/아래 폴더 타겟팅)
  // -> 위/아래 키 첫 입력 시 카드 최상단부터 다시 내려가지 않고, 현재 포커싱 위치 바로 위/아래 폴더로 즉시 점프함.
  // =========================================================
  private isInvalidDropDest(destPath: string, movingPaths: string[]): boolean {
    const normDest = normalizeFolderStr(destPath);
    return movingPaths.some((src) => {
      const normSrc = normalizeFolderStr(src);
      if (!normSrc) return true;
      return normDest === normSrc || normDest.startsWith(`${normSrc}/`);
    });
  }

  private resolveCarrySourcePaths(): string[] {
    if (this.selectedPaths.size > 0) {
      return [...this.selectedPaths];
    }
    const curCard = this.renderedCards[this.focusedCardIndex];
    if (this.focusedItemKey === CARD_HEADER_KEY && curCard && !curCard.isRootCard) {
      return [curCard.folderPath];
    }
    if (this.focusedItemKey?.startsWith("folder:")) {
      const p = normalizeFolderStr(this.focusedItemKey.slice(7));
      return p ? [p] : [];
    }
    if (this.focusedItemKey?.startsWith("file:")) {
      const f = getFileByPath(this.app, this.focusedItemKey.slice(5));
      return f ? [f.path] : [];
    }
    return [];
  }

  private getValidFolderTargetsInCard(card: BoardCardModel): Array<{ path: string; pos: number }> {
    const targets: Array<{ path: string; pos: number }> = [];
    if (!this.isInvalidDropDest(card.folderPath, this.carryPaths)) {
      targets.push({ path: card.folderPath, pos: -1 });
    }
    card.items.forEach((it, idx) => {
      if (it.type === "folder" && !this.isInvalidDropDest(it.path, this.carryPaths)) {
        targets.push({ path: it.path, pos: idx });
      }
    });
    return targets;
  }

  private beginOrStepCarry(direction: "left" | "right" | "up" | "down"): void {
    if (this.renderedCards.length === 0) return;

    const justStarted = this.carryPaths.length === 0;
    if (justStarted) {
      const sources = this.resolveCarrySourcePaths();
      if (sources.length === 0) return;
      this.carryPaths = sources;
      this.carryCardIndex = this.focusedCardIndex;
      this.carryTargetFolderPath = null;
    }

    if (direction === "left" || direction === "right") {
      const delta = direction === "right" ? 1 : -1;
      const total = this.renderedCards.length;
      for (let step = 1; step <= total; step++) {
        const candidateIdx = (this.carryCardIndex + delta * step + total) % total;
        const candidatePath = this.renderedCards[candidateIdx].folderPath;
        if (!this.isInvalidDropDest(candidatePath, this.carryPaths)) {
          this.carryCardIndex = candidateIdx;
          this.carryTargetFolderPath = candidatePath;
          break;
        }
      }
    } else {
      const card = this.renderedCards[this.carryCardIndex];
      if (!card) return;
      const targets = this.getValidFolderTargetsInCard(card);
      if (targets.length === 0) return;

      if (justStarted) {
        // 첫 입력: 현재 포커스 위치(originPos) 기준으로 바로 위 또는 바로 아래 폴더로 즉시 포커스
        const originPos =
          this.focusedItemKey === CARD_HEADER_KEY ? -1 : this.findFocusedCardAndIndex().itemIndex;

        if (direction === "up") {
          const above = targets.filter((t) => t.pos < originPos);
          this.carryTargetFolderPath =
            above.length > 0 ? above[above.length - 1].path : targets[targets.length - 1].path;
        } else {
          const below = targets.filter((t) => t.pos > originPos);
          this.carryTargetFolderPath = below.length > 0 ? below[0].path : targets[0].path;
        }
      } else {
        const curIdx = targets.findIndex((t) => t.path === this.carryTargetFolderPath);
        const delta = direction === "down" ? 1 : -1;
        const nextIdx =
          curIdx === -1
            ? 0
            : (curIdx + delta + targets.length) % targets.length;
        this.carryTargetFolderPath = targets[nextIdx].path;
      }
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
  // 포커스된 폴더(또는 우클릭 지정 폴더)에 노트/폴더 생성 & 이름 변경
  // =========================================================
  private promptCreateNote(explicitFolderPath?: string): void {
    const targetFolderPath =
      explicitFolderPath !== undefined
        ? normalizeFolderStr(explicitFolderPath)
        : this.getFocusedTargetFolderPath();
    const destLabel = targetFolderPath || this.app.vault.getName();
    this.isSubModalOpen = true;
    this.syncScopeState();

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
      this.syncScopeState();
      requestAnimationFrame(() => this.shellEl?.focus());
    };
    modal.open();
  }

  private promptCreateFolder(explicitFolderPath?: string): void {
    const targetFolderPath =
      explicitFolderPath !== undefined
        ? normalizeFolderStr(explicitFolderPath)
        : this.getFocusedTargetFolderPath();
    const destLabel = targetFolderPath || this.app.vault.getName();
    this.isSubModalOpen = true;
    this.syncScopeState();

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
      this.syncScopeState();
      requestAnimationFrame(() => this.shellEl?.focus());
    };
    modal.open();
  }

  // [ID 6.5.37] 네이티브 탐색기 스타일 인라인(제자리) 이름 바꾸기
  // -> 별도 모달 없이 해당 행/카드 헤더의 텍스트 노드만 <input>으로 교체해 시선 이동과 지연을 제거함.
  // -> 한글 조합(isComposing) 보호, 금지 문자 방어, 드래그 충돌 방지를 함께 처리함.
  private startInlineRename(target: TAbstractFile): void {
    if (target instanceof TFolder && target.isRoot()) return;
    if (this.isInlineRenaming) return;

    const targetPath = target.path;
    let hostEl: HTMLElement | null = null;
    let titleEl: HTMLElement | null = null;
    let isCardHeader = false;

    // 1) 카드 내부 행(.fb-row) 우선 탐색
    const rows = Array.from(this.gridEl.querySelectorAll<HTMLElement>(".fb-row"));
    const matchedRow = rows.find((el) => el.dataset.path === targetPath);
    if (matchedRow) {
      hostEl = matchedRow;
      titleEl = matchedRow.querySelector<HTMLElement>(".tree-item-inner");
    }

    // 2) 행이 없으면 폴더 카드 헤더(.fb-card) 탐색
    if (!titleEl && target instanceof TFolder) {
      const cards = Array.from(this.gridEl.querySelectorAll<HTMLElement>(".fb-card:not(.is-root-card)"));
      const matchedCard = cards.find((el) => normalizeFolderStr(el.dataset.dropFolder) === normalizeFolderStr(targetPath));
      if (matchedCard) {
        hostEl = matchedCard.querySelector<HTMLElement>(".fb-card-header");
        titleEl = matchedCard.querySelector<HTMLElement>(".fb-card-title");
        isCardHeader = true;
      }
    }

    if (!hostEl || !titleEl) {
      this.promptRenameModalFallback(target);
      return;
    }

    const isMd = target instanceof TFile && target.extension === "md";
    const initialValue = isMd ? target.basename : target.name;
    const prevDraggable = hostEl.getAttribute("draggable");
    hostEl.setAttribute("draggable", "false");

    this.isInlineRenaming = true;
    this.syncScopeState();

    const input = document.createElement("input");
    input.type = "text";
    input.className = "fb-inline-rename-input";
    input.value = initialValue;

    titleEl.addClass("is-hidden");
    titleEl.insertAdjacentElement("afterend", input);

    let finished = false;
    const cleanup = () => {
      if (finished) return false;
      finished = true;
      input.remove();
      titleEl?.removeClass("is-hidden");
      if (prevDraggable !== null) hostEl?.setAttribute("draggable", prevDraggable);
      else hostEl?.removeAttribute("draggable");
      this.isInlineRenaming = false;
      this.syncScopeState();
      requestAnimationFrame(() => this.shellEl?.focus());
      return true;
    };

    const commit = async () => {
      const rawName = input.value.trim();
      if (!cleanup()) return;
      if (!rawName) return;

      if (/[\\/:*?"<>|]/.test(rawName)) {
        new Notice("파일/폴더 이름에 사용할 수 없는 문자가 포함되어 있습니다.");
        return;
      }

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
        if (!isCardHeader) {
          this.focusedItemKey = target instanceof TFolder ? `folder:${destPath}` : `file:${destPath}`;
        }
        this.renderAll();
        this.scrollFocusedIntoView();
      } catch (err) {
        new Notice(`이름 변경 실패: ${err instanceof Error ? err.message : String(err)}`);
      }
    };

    const cancel = () => {
      cleanup();
    };

    input.addEventListener("click", (e) => e.stopPropagation());
    input.addEventListener("dblclick", (e) => e.stopPropagation());
    input.addEventListener("mousedown", (e) => e.stopPropagation());
    input.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter" && !e.isComposing) {
        e.preventDefault();
        void commit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      }
    });
    input.addEventListener("blur", () => {
      void commit();
    });

    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  }

  private promptRename(target: TAbstractFile): void {
    this.startInlineRename(target);
  }

  private promptRenameModalFallback(target: TAbstractFile): void {
    const isMd = target instanceof TFile && target.extension === "md";
    const initial = isMd ? target.basename : target.name;
    this.isSubModalOpen = true;
    this.syncScopeState();

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
      this.syncScopeState();
      requestAnimationFrame(() => this.shellEl?.focus());
    };
    modal.open();
  }

  // =========================================================
  // [ID 6.5.33] 빠른 생산성 단축키 액션 (이름 변경, 삭제, 전체 선택, 복제, 일괄 접기/펼치기, 숫자 점프)
  // =========================================================
  private getFocusedAbstractTarget(): TAbstractFile | null {
    const curCard = this.renderedCards[this.focusedCardIndex];
    if (this.focusedItemKey === CARD_HEADER_KEY && curCard && !curCard.isRootCard) {
      return getFolderByPath(this.app, curCard.folderPath);
    }
    if (this.focusedItemKey?.startsWith("folder:")) {
      return getFolderByPath(this.app, this.focusedItemKey.slice(7));
    }
    if (this.focusedItemKey?.startsWith("file:")) {
      return getFileByPath(this.app, this.focusedItemKey.slice(5));
    }
    return null;
  }

  private renameFocusedItem(): void {
    const target = this.getFocusedAbstractTarget();
    if (!target || (target instanceof TFolder && target.isRoot())) return;
    this.promptRename(target);
  }

  private async deleteFocusedOrSelected(): Promise<void> {
    const paths = this.resolveCarrySourcePaths();
    if (paths.length === 0) return;

    let deleted = 0;
    for (const p of paths) {
      const target = this.app.vault.getAbstractFileByPath(p);
      if (!target || (target instanceof TFolder && target.isRoot())) continue;
      try {
        await this.app.vault.trash(target, true);
        deleted++;
      } catch {
        // 삭제 실패 항목 건너뜀
      }
    }

    if (deleted > 0) {
      this.selectedPaths.clear();
      this.selectionAnchorIndex = null;
      new Notice(`${deleted}개 항목을 휴지통으로 이동했습니다.`);
      this.renderAll();
    }
  }

  private selectAllInFocusedCard(): void {
    const card = this.renderedCards[this.focusedCardIndex];
    if (!card || card.items.length === 0) return;
    this.selectedPaths.clear();
    for (const it of card.items) {
      this.selectedPaths.add(it.path);
    }
    this.selectionAnchorIndex = 0;
    this.syncFocusAndSelectionDOM();
    this.renderSelectionBar();
  }

  // [ID 6.5.35] 옵시디언 구버전 호환 파일·폴더 재귀 복제 유틸
  // -> vault.copy()는 Obsidian 1.8.7 이상에서만 존재하므로 readBinary/createBinary + 재귀 폴더 생성으로 전 버전 호환성을 보장함.
  private buildUniqueCopyPath(destFolderPath: string, item: TAbstractFile, forceSuffix: boolean): string {
    const isFile = item instanceof TFile;
    const base = isFile ? item.basename : item.name;
    const ext = isFile && item.extension ? `.${item.extension}` : "";

    if (!forceSuffix) {
      const direct = normalizePath(destFolderPath ? `${destFolderPath}/${base}${ext}` : `${base}${ext}`);
      if (!this.app.vault.getAbstractFileByPath(direct)) return direct;
    }

    for (let n = 1; n < 1000; n++) {
      const candidateName = `${base} ${n}${ext}`;
      const candidate = normalizePath(destFolderPath ? `${destFolderPath}/${candidateName}` : candidateName);
      if (!this.app.vault.getAbstractFileByPath(candidate)) return candidate;
    }
    return "";
  }

  private async copyAbstractItem(source: TAbstractFile, destPath: string): Promise<TAbstractFile> {
    if (source instanceof TFile) {
      const data = await this.app.vault.readBinary(source);
      return await this.app.vault.createBinary(destPath, data);
    }

    await this.app.vault.createFolder(destPath);
    if (source instanceof TFolder) {
      for (const child of source.children) {
        const childDest = normalizePath(`${destPath}/${child.name}`);
        await this.copyAbstractItem(child, childDest);
      }
    }
    return this.app.vault.getAbstractFileByPath(destPath) || source;
  }

  private copySelectedOrFocused(): boolean {
    const sources = this.resolveCarrySourcePaths();
    if (sources.length === 0) return false;
    this.clipboardMode = "copy";
    this.clipboardPaths = sources;
    this.syncFocusAndSelectionDOM();
    this.renderSelectionBar();
    this.renderCarryPill();
    return true;
  }

  private cutSelectedOrFocused(): boolean {
    const sources = this.resolveCarrySourcePaths();
    if (sources.length === 0) return false;
    this.clipboardMode = "cut";
    this.clipboardPaths = sources;
    this.selectedPaths.clear();
    this.selectionAnchorIndex = null;
    this.syncFocusAndSelectionDOM();
    this.renderSelectionBar();
    this.renderCarryPill();
    return true;
  }

  private async pasteClipboardToFocusedFolder(): Promise<void> {
    if (this.clipboardPaths.length === 0 || !this.clipboardMode) return;
    const mode = this.clipboardMode;
    const paths = [...this.clipboardPaths];
    const destFolderPath = this.getFocusedTargetFolderPath();

    if (mode === "cut") {
      this.clipboardMode = null;
      this.clipboardPaths = [];
      this.renderCarryPill();
      await this.moveFiles(paths, destFolderPath);
      return;
    }

    // 복사 붙여넣기 (여러 폴더에 연속 붙여넣기할 수 있도록 clipboardPaths 유지, Esc로 해제)
    let copiedCount = 0;
    let firstCreatedKey: string | null = null;

    for (const srcPath of paths) {
      const target = this.app.vault.getAbstractFileByPath(srcPath);
      if (!target) continue;
      if (target instanceof TFolder && this.isInvalidDropDest(destFolderPath, [target.path])) {
        continue;
      }

      const destPath = this.buildUniqueCopyPath(destFolderPath, target, false);
      if (!destPath) continue;

      try {
        const created = await this.copyAbstractItem(target, destPath);
        if (!firstCreatedKey) {
          firstCreatedKey = created instanceof TFolder ? `folder:${created.path}` : `file:${created.path}`;
        }
        copiedCount++;
      } catch {
        // 개별 복사 실패 건너뜀
      }
    }

    if (copiedCount > 0) {
      this.selectedPaths.clear();
      this.selectionAnchorIndex = null;
      if (firstCreatedKey) this.focusedItemKey = firstCreatedKey;
      const destName = destFolderPath || this.app.vault.getName();
      new Notice(`${copiedCount}개 항목을 '${destName}'에 복사했습니다.`);
      this.renderAll();
      this.scrollFocusedIntoView();
    }
  }

  private async setAllSubfoldersExpanded(expanded: boolean): Promise<void> {
    const folderPaths: string[] = [];
    const collectAllSubfolders = (folder: TFolder) => {
      for (const child of folder.children) {
        if (child instanceof TFolder) {
          const p = normalizeFolderRef(child);
          if (p) folderPaths.push(p);
          collectAllSubfolders(child);
        }
      }
    };

    for (const card of this.renderedCards) {
      if (card.isRootCard) continue;
      const folder = getFolderByPath(this.app, card.folderPath);
      if (folder) collectAllSubfolders(folder);
    }

    if (folderPaths.length === 0) return;
    await this.plugin.setFoldersExpandedBatch(folderPaths, expanded);
    this.renderGridAndHeader();
  }

  private jumpToCardByIndex(cardIdx: number): void {
    if (cardIdx < 0 || cardIdx >= this.renderedCards.length) return;
    const targetCard = this.renderedCards[cardIdx];
    const firstFileIdx = targetCard.items.findIndex((it) => it.type === "file");
    this.focusCardItem(cardIdx, firstFileIdx >= 0 ? firstFileIdx : 0, {
      clearSelection: true,
      updatePreview: true
    });
  }

  private triageToCardByIndex(cardIdx: number): void {
    if (cardIdx < 0 || cardIdx >= this.renderedCards.length) return;
    const sources = this.resolveCarrySourcePaths();
    if (sources.length === 0) return;
    const targetPath = this.renderedCards[cardIdx].folderPath;
    if (this.isInvalidDropDest(targetPath, sources)) return;
    this.focusedCardIndex = cardIdx;
    void this.moveFiles(sources, targetPath);
  }

  // =========================================================
  // 폴더 카드 순서 변경 (헤더 드래그 & Shift+←/→)
  // =========================================================
  private handleCardDragStart(e: DragEvent, folderPath: string, title: string): void {
    if (!e.dataTransfer) return;
    this.draggingCardPath = folderPath;
    this.activeDragPaths = [];
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(CARD_REORDER_MIME, folderPath);

    const ghost = document.body.createDiv({
      cls: "fb-drag-ghost",
      text: title
    });
    e.dataTransfer.setDragImage(ghost, 12, 12);
    requestAnimationFrame(() => ghost.remove());
  }

  private clearReorderHighlight(): void {
    if (this.reorderTargetEl) {
      this.reorderTargetEl.removeClass("is-reorder-before", "is-reorder-after");
      this.reorderTargetEl = null;
    }
  }

  private async applyFolderCardReorder(
    sourcePath: string,
    targetPath: string,
    position: "before" | "after"
  ): Promise<void> {
    const folderCards = this.renderedCards.filter((c) => !c.isRootCard).map((c) => c.folderPath);
    const fromIdx = folderCards.indexOf(sourcePath);
    if (fromIdx === -1 || sourcePath === targetPath) return;

    folderCards.splice(fromIdx, 1);
    const targetIdx = folderCards.indexOf(targetPath);
    if (targetIdx === -1) return;

    const insertIdx = position === "before" ? targetIdx : targetIdx + 1;
    folderCards.splice(insertIdx, 0, sourcePath);

    await this.plugin.setFolderOrder(this.currentFolderPath, folderCards);
    this.renderAll();

    const newCardIdx = this.renderedCards.findIndex((c) => !c.isRootCard && c.folderPath === sourcePath);
    if (newCardIdx >= 0) {
      this.focusCardHeader(newCardIdx);
    }
  }

  private async shiftFolderCardOrder(delta: -1 | 1): Promise<void> {
    const curCard = this.renderedCards[this.focusedCardIndex];
    if (!curCard || curCard.isRootCard) return;

    const folderCards = this.renderedCards.filter((c) => !c.isRootCard).map((c) => c.folderPath);
    const idx = folderCards.indexOf(curCard.folderPath);
    if (idx === -1) return;
    const nextIdx = idx + delta;
    if (nextIdx < 0 || nextIdx >= folderCards.length) return;

    const [moved] = folderCards.splice(idx, 1);
    folderCards.splice(nextIdx, 0, moved);

    await this.plugin.setFolderOrder(this.currentFolderPath, folderCards);
    this.renderAll();

    const newCardIdx = this.renderedCards.findIndex((c) => !c.isRootCard && c.folderPath === moved);
    if (newCardIdx >= 0) {
      this.focusCardHeader(newCardIdx);
    }
  }

  // =========================================================
  // 드래그 앤 드롭 & 링크 안전 일괄 이동 + Undo
  // =========================================================
  private handleDragStart(e: DragEvent, path: string, fromShelf: boolean): void {
    if (!e.dataTransfer) return;
    this.draggingCardPath = null;

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

    const firstItem = this.app.vault.getAbstractFileByPath(this.activeDragPaths[0]);
    const label = firstItem
      ? firstItem instanceof TFile && firstItem.extension === "md"
        ? firstItem.basename
        : firstItem.name
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
    if (this.draggingCardPath) {
      const cardEl = (e.target instanceof Element ? e.target.closest(".fb-card") : null) as HTMLElement | null;
      if (!cardEl || cardEl.hasClass("is-root-card")) {
        this.clearReorderHighlight();
        return;
      }
      const targetPath = normalizeFolderStr(cardEl.dataset.dropFolder);
      if (!targetPath || targetPath === this.draggingCardPath) {
        this.clearReorderHighlight();
        return;
      }
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";

      const rect = cardEl.getBoundingClientRect();
      const pos: "before" | "after" = e.clientX < rect.left + rect.width / 2 ? "before" : "after";
      if (this.reorderTargetEl !== cardEl || this.reorderPosition !== pos) {
        this.clearReorderHighlight();
        this.reorderTargetEl = cardEl;
        this.reorderPosition = pos;
        cardEl.addClass(pos === "before" ? "is-reorder-before" : "is-reorder-after");
      }
      return;
    }

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
    if (this.draggingCardPath && this.reorderTargetEl) {
      if (e.relatedTarget instanceof Node && this.reorderTargetEl.contains(e.relatedTarget)) return;
      if (e.target === this.reorderTargetEl) this.clearReorderHighlight();
      return;
    }
    if (!this.currentDropEl) return;
    if (e.relatedTarget instanceof Node && this.currentDropEl.contains(e.relatedTarget)) return;
    if (e.target === this.currentDropEl) this.setDropHighlight(null);
  }

  private handleDrop(e: DragEvent): void {
    if (this.draggingCardPath) {
      const srcPath = this.draggingCardPath;
      const targetEl = this.reorderTargetEl;
      const pos = this.reorderPosition;
      this.handleDragEnd();
      if (targetEl) {
        e.preventDefault();
        const targetPath = normalizeFolderStr(targetEl.dataset.dropFolder);
        if (targetPath && targetPath !== srcPath) {
          void this.applyFolderCardReorder(srcPath, targetPath, pos);
        }
      }
      return;
    }

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
    this.draggingCardPath = null;
    this.isDragging = false;
    this.setDropHighlight(null);
    this.clearReorderHighlight();
    this.renderShelf();
  }

  private addPathsToShelf(paths: string[]): void {
    for (const p of paths) {
      if (this.app.vault.getAbstractFileByPath(p) && !this.shelfPaths.includes(p)) {
        this.shelfPaths.push(p);
      }
    }
    this.renderShelf();
  }

  // [ID 6.5.22] 파일 및 폴더 통합 이동 + 순환 이동(자기 자신/하위로 이동) 방어 + Undo
  private async moveFiles(sourcePaths: string[], rawDestFolderPath: string): Promise<void> {
    const destFolderPath = normalizeFolderStr(rawDestFolderPath);
    const unique = [...new Set(sourcePaths)];
    const moves: MoveUndoEntry["moves"] = [];
    let skipped = 0;
    let firstMovedType: "file" | "folder" = "file";

    for (const srcPath of unique) {
      const target = this.app.vault.getAbstractFileByPath(srcPath);
      if (!target) continue;
      if (target instanceof TFolder && this.isInvalidDropDest(destFolderPath, [target.path])) {
        skipped++;
        continue;
      }

      const currentParent = normalizeFolderRef(target.parent);
      if (currentParent === destFolderPath) continue;

      const destPath = normalizePath(destFolderPath ? `${destFolderPath}/${target.name}` : target.name);
      if (this.app.vault.getAbstractFileByPath(destPath)) {
        skipped++;
        continue;
      }

      try {
        await this.app.fileManager.renameFile(target, destPath);
        if (moves.length === 0) {
          firstMovedType = target instanceof TFolder ? "folder" : "file";
        }
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
      this.focusedItemKey = `${firstMovedType}:${moves[0].toPath}`;

      const destName = destFolderPath || this.app.vault.getName();
      new Notice(`${moves.length}개 항목을 '${destName}'로 이동했습니다.`);
      this.renderAll();
      this.scrollFocusedIntoView();
    } else if (skipped > 0) {
      new Notice("대상 폴더에 같은 이름이 있거나 이동할 수 없는 경로입니다.");
    } else {
      this.syncFocusAndSelectionDOM();
    }
  }

  private async undoLastMove(): Promise<void> {
    const entry = this.undoStack.pop();
    if (!entry) return;

    let restored = 0;
    for (const move of entry.moves) {
      const target = this.app.vault.getAbstractFileByPath(move.toPath);
      if (!target) continue;
      if (this.app.vault.getAbstractFileByPath(move.fromPath)) continue;
      try {
        await this.app.fileManager.renameFile(target, move.fromPath);
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
  // 키보드 2D 탐색 · Shift 다중 선택 · Option 들고 이동 · Cmd 점프 & X/V
  // =========================================================
  private isViewActive(): boolean {
    if (this.isSubModalOpen || this.isInlineRenaming) return false;
    if (document.querySelector(".modal-container")) return false;
    return this.app.workspace.getActiveViewOfType(FolderBoardView) === this;
  }

  // [ID 6.5.24] 2D 그리드 / 세로 모드에서 화면상 동일 열의 바로 위·아래 행 카드 탐색
  // -> 대각선(인접 열) 카드로 엉뚱하게 튀지 않도록 동일 열(offsetLeft 오차 24px 이내)에 위치한 카드만 매칭함.
  private findVerticalNeighborCard(cardIdx: number, direction: "up" | "down"): number {
    if (this.plugin.settings.verticalEdgeBehavior !== "adaptive") return -1;
    if (this.plugin.settings.gridCols === "scroll") return -1;

    const cardEls = Array.from(this.gridEl.querySelectorAll<HTMLElement>(".fb-card"));
    const curEl = cardEls[cardIdx];
    if (!curEl) return -1;

    const curTop = curEl.offsetTop;
    const curLeft = curEl.offsetLeft;
    const threshold = 10;
    const sameColTolerance = 24;

    let bestIdx = -1;
    let bestRowDist = Infinity;

    cardEls.forEach((el, idx) => {
      if (idx === cardIdx) return;
      const dy = el.offsetTop - curTop;
      if (direction === "down" && dy <= threshold) return;
      if (direction === "up" && dy >= -threshold) return;

      const colDist = Math.abs(el.offsetLeft - curLeft);
      if (colDist > sameColTolerance) return;

      const rowDist = Math.abs(dy);
      if (rowDist < bestRowDist) {
        bestRowDist = rowDist;
        bestIdx = idx;
      }
    });

    return bestIdx;
  }

  private focusCardHeader(cardIdx: number): void {
    this.focusedCardIndex = cardIdx;
    this.focusedItemKey = CARD_HEADER_KEY;
    this.selectedPaths.clear();
    this.selectionAnchorIndex = null;
    this.syncFocusAndSelectionDOM();
    this.renderSelectionBar();
    this.scrollFocusedIntoView();
  }

  private handleKeyup(e: KeyboardEvent): void {
    if (this.carryPaths.length === 0) return;
    // [ID 6.5.25] Option(Alt) 키를 떼는 순간 들고 있던 파일/폴더를 대상 폴더로 확정 이동
    if (e.key === "Alt") {
      this.commitCarryMode();
    }
  }

  private handleKeydown(e: KeyboardEvent): void {
    if (this.handledKeyEvents.has(e)) return;
    if (!this.isViewActive()) return;
    const meta = e.metaKey || e.ctrlKey;
    const code = e.code;

    // [ID 6.5.31] Cmd/Ctrl + F: 입력창 포커스 여부 및 한글 IME와 무관하게 보드 검색창 포커스
    if (meta && !e.shiftKey && !e.altKey && code === "KeyF") {
      e.preventDefault();
      e.stopPropagation();
      this.focusSearchBox();
      return;
    }

    if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select")) {
      if (e.key === "Escape") {
        (e.target as HTMLElement).blur();
        this.shellEl?.focus();
      }
      return;
    }

    if (e.key === "Escape") {
      if (this.carryPaths.length > 0) {
        e.preventDefault();
        this.cancelCarryMode();
        return;
      }
      if (this.clipboardPaths.length > 0) {
        e.preventDefault();
        this.clipboardMode = null;
        this.clipboardPaths = [];
        this.syncFocusAndSelectionDOM();
        this.renderCarryPill();
        this.renderSelectionBar();
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

    // / (슬래시): 한 손 검색창 포커스
    if (!meta && !e.shiftKey && !e.altKey && code === "Slash") {
      e.preventDefault();
      e.stopPropagation();
      this.focusSearchBox();
      return;
    }

    // Cmd/Ctrl + Z: 마지막 이동 되돌리기 (한글 IME 안전하게 e.code 사용)
    if (meta && !e.shiftKey && !e.altKey && code === "KeyZ") {
      if (this.undoStack.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        void this.undoLastMove();
      }
      return;
    }

    // Cmd/Ctrl + A: 현재 포커스된 카드 내 모든 항목 전체 선택
    if (meta && !e.shiftKey && !e.altKey && code === "KeyA") {
      e.preventDefault();
      e.stopPropagation();
      this.selectAllInFocusedCard();
      return;
    }

    // [ID 6.5.26] Cmd/Ctrl + C / X / V: 복사 · 잘라내기 · 붙여넣기
    if (meta && !e.shiftKey && !e.altKey && code === "KeyC") {
      if (!this.hasSelectedText() && this.copySelectedOrFocused()) {
        e.preventDefault();
        e.stopPropagation();
      }
      return;
    }

    if (meta && !e.shiftKey && !e.altKey && code === "KeyX") {
      if (!this.hasSelectedText() && this.cutSelectedOrFocused()) {
        e.preventDefault();
        e.stopPropagation();
      }
      return;
    }

    if (meta && !e.shiftKey && !e.altKey && code === "KeyV") {
      if (this.clipboardPaths.length > 0 && this.clipboardMode) {
        e.preventDefault();
        e.stopPropagation();
        void this.pasteClipboardToFocusedFolder();
      }
      return;
    }

    // Cmd/Ctrl + Backspace 또는 Delete: 선택/포커스 항목 휴지통 삭제
    if (
      (meta && !e.shiftKey && !e.altKey && code === "Backspace") ||
      (!meta && !e.shiftKey && !e.altKey && code === "Delete")
    ) {
      e.preventDefault();
      e.stopPropagation();
      void this.deleteFocusedOrSelected();
      return;
    }

    // F2 또는 R: 포커스된 파일/폴더 이름 바꾸기
    if (
      (!meta && !e.shiftKey && !e.altKey && code === "F2") ||
      (!meta && !e.shiftKey && !e.altKey && code === "KeyR")
    ) {
      e.preventDefault();
      e.stopPropagation();
      this.renameFocusedItem();
      return;
    }

    // [ / ]: 현재 보드의 모든 하위 폴더 일괄 접기 / 일괄 펼치기
    if (!meta && !e.shiftKey && !e.altKey && (code === "BracketLeft" || code === "BracketRight")) {
      e.preventDefault();
      e.stopPropagation();
      void this.setAllSubfoldersExpanded(code === "BracketRight");
      return;
    }

    // N / Shift+N: 포커스 폴더에 새 노트 / 새 폴더 생성
    if (!meta && !e.altKey && code === "KeyN") {
      e.preventDefault();
      e.stopPropagation();
      if (e.shiftKey) this.promptCreateFolder();
      else this.promptCreateNote();
      return;
    }

    if (this.renderedCards.length === 0) return;

    // 1~9: N번째 카드로 즉시 점프 / Option + 1~9: N번째 카드로 원클릭 이동(트리아지)
    if (!meta && !e.shiftKey && /^Digit[1-9]$/.test(code)) {
      const cardIdx = Number(code.slice(5)) - 1;
      if (cardIdx < this.renderedCards.length) {
        e.preventDefault();
        e.stopPropagation();
        if (e.altKey) this.triageToCardByIndex(cardIdx);
        else this.jumpToCardByIndex(cardIdx);
      }
      return;
    }

    // [ID 6.5.14] Option(Alt) + 방향키: 업계 표준 항목 들고 이동 → Option(Alt) 키를 떼면 드롭
    if (
      e.altKey &&
      !meta &&
      (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown")
    ) {
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

    // [ID 6.5.27] Cmd/Ctrl + 방향키: 업계 표준 빠른 점프 (↑/↓ 맨 위·맨 아래 항목, ←/→ 첫·끝 카드)
    if (meta && !e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      e.stopPropagation();
      const { card, itemIndex } = this.findFocusedCardAndIndex();
      if (!card || card.items.length === 0) return;
      const targetIdx = e.key === "ArrowUp" ? 0 : card.items.length - 1;

      if (e.shiftKey) {
        const anchor = this.selectionAnchorIndex ?? (itemIndex >= 0 ? itemIndex : 0);
        this.selectionAnchorIndex = anchor;
        this.selectRangeInCard(this.focusedCardIndex, anchor, targetIdx);
      } else {
        this.focusCardItem(this.focusedCardIndex, targetIdx, {
          clearSelection: true,
          updatePreview: true
        });
      }
      return;
    }

    if (meta && !e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      e.preventDefault();
      e.stopPropagation();
      const nextIdx = e.key === "ArrowLeft" ? 0 : this.renderedCards.length - 1;
      const targetCard = this.renderedCards[nextIdx];
      const firstFileIdx = targetCard.items.findIndex((it) => it.type === "file");
      this.focusCardItem(nextIdx, firstFileIdx >= 0 ? firstFileIdx : 0, {
        clearSelection: true,
        updatePreview: true
      });
      return;
    }

    // Shift + 위/아래 방향키: 범위 다중 선택 (미리보기는 변경하지 않음)
    if (e.shiftKey && !meta && !e.altKey && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
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

    // Shift + 좌/우: 폴더 카드 헤더 포커스 상태에서 카드 순서 좌우 이동
    if (
      e.shiftKey &&
      !meta &&
      !e.altKey &&
      this.focusedItemKey === CARD_HEADER_KEY &&
      (e.key === "ArrowLeft" || e.key === "ArrowRight")
    ) {
      e.preventDefault();
      e.stopPropagation();
      void this.shiftFolderCardOrder(e.key === "ArrowRight" ? 1 : -1);
      return;
    }

    // 좌/우: 폴더 카드 간 순환 이동 (예비 포커싱)
    if (!meta && !e.altKey && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
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

    // [ID 6.5.18] 위/아래 이동 (모드 적응형: 가로 모드=내부 순환, 세로/2D 그리드=아래·위 행 카드 연결)
    if (!meta && !e.altKey && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      e.stopPropagation();
      const { card, itemIndex } = this.findFocusedCardAndIndex();
      if (!card) return;

      const hasHeaderStop = !card.isRootCard;
      const onHeader = this.focusedItemKey === CARD_HEADER_KEY;
      const count = card.items.length;

      if (count === 0) {
        const neighborIdx = this.findVerticalNeighborCard(
          this.focusedCardIndex,
          e.key === "ArrowUp" ? "up" : "down"
        );
        if (neighborIdx >= 0) {
          const neighbor = this.renderedCards[neighborIdx];
          if (e.key === "ArrowUp") {
            if (neighbor.items.length > 0) {
              this.focusCardItem(neighborIdx, neighbor.items.length - 1);
            } else if (!neighbor.isRootCard) {
              this.focusCardHeader(neighborIdx);
            }
          } else {
            if (!neighbor.isRootCard) {
              this.focusCardHeader(neighborIdx);
            } else {
              this.focusCardItem(neighborIdx, 0);
            }
          }
          return;
        }
        if (hasHeaderStop) this.focusCardHeader(this.focusedCardIndex);
        return;
      }

      if (e.key === "ArrowUp") {
        if (onHeader || (!hasHeaderStop && itemIndex <= 0)) {
          // 2D 그리드/세로 모드에서 위 행 카드가 있으면 그 카드의 최하단으로 연결, 없으면 현재 카드 최하단 순환
          const aboveIdx = this.findVerticalNeighborCard(this.focusedCardIndex, "up");
          if (aboveIdx >= 0) {
            const aboveCard = this.renderedCards[aboveIdx];
            if (aboveCard.items.length > 0) {
              this.focusCardItem(aboveIdx, aboveCard.items.length - 1, {
                clearSelection: true,
                updatePreview: true
              });
            } else if (!aboveCard.isRootCard) {
              this.focusCardHeader(aboveIdx);
            }
          } else {
            this.focusCardItem(this.focusedCardIndex, count - 1, {
              clearSelection: true,
              updatePreview: true
            });
          }
        } else if (itemIndex <= 0) {
          // 첫 번째 항목에서 ↑ -> 카드 폴더 헤더 포커스 (Enter로 진입 가능)
          this.focusCardHeader(this.focusedCardIndex);
        } else {
          this.focusCardItem(this.focusedCardIndex, itemIndex - 1, {
            clearSelection: true,
            updatePreview: true
          });
        }
      } else {
        // ArrowDown
        if (onHeader || itemIndex === -1) {
          this.focusCardItem(this.focusedCardIndex, 0, {
            clearSelection: true,
            updatePreview: true
          });
        } else if (itemIndex >= count - 1) {
          // 2D 그리드/세로 모드에서 아래 행 카드가 있으면 그 카드 헤더로 자연스럽게 이동, 없으면 현재 카드 내부 순환
          const belowIdx = this.findVerticalNeighborCard(this.focusedCardIndex, "down");
          if (belowIdx >= 0) {
            const belowCard = this.renderedCards[belowIdx];
            if (!belowCard.isRootCard) {
              this.focusCardHeader(belowIdx);
            } else {
              this.focusCardItem(belowIdx, 0, {
                clearSelection: true,
                updatePreview: true
              });
            }
          } else if (hasHeaderStop) {
            this.focusCardHeader(this.focusedCardIndex);
          } else {
            this.focusCardItem(this.focusedCardIndex, 0, {
              clearSelection: true,
              updatePreview: true
            });
          }
        } else {
          this.focusCardItem(this.focusedCardIndex, itemIndex + 1, {
            clearSelection: true,
            updatePreview: true
          });
        }
      }
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
      if (this.focusedItemKey === CARD_HEADER_KEY && card && !card.isRootCard) {
        this.navigateToFolder(card.folderPath);
        return;
      }
      if (e.shiftKey && card && !card.isRootCard) {
        this.navigateToFolder(card.folderPath);
        return;
      }
      if (item?.type === "folder") {
        this.enterInlineSubfolderLevel(item.path);
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

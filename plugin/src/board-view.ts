// [ID 6.5] 2D 네이티브 폴더 탐색기 워크스페이스 뷰 (FolderBoardView extends ItemView)
// -> 2/3/4열 그리드 + 세로 펼침(가로 스크롤) 모드, DOM 파괴 없는 인플레이스 포커스 갱신(테마 깜빡임 방지),
// -> 예비 포커싱(밝은 테두리) + Shift 다중 선택 + Cmd+방향키 들고 이동(키 떼면 드롭)을 구현함.
import {
  EventRef,
  ItemView,
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
import { ShortcutHelpModal } from "./shortcuts";
import {
  applyNativeDecoration,
  getFileByPath,
  getFolderByPath,
  invalidateNativeIconCache,
  openNativeFileMenu
} from "./native-sync";
import type { BoardCardModel, CardTreeItem, FlowWindowSizeSpec, LayoutColumns, MoveUndoEntry } from "./types";

export const VIEW_TYPE_FOLDER_BOARD = "folder-board-view";
const DRAG_MIME = "application/x-obsidian-folder-board";
const CARD_REORDER_MIME = "application/x-obsidian-folder-board-card";
const CARD_HEADER_KEY = "__card_header__";
const ROOT_CARD_ORDER_KEY = "__root__";
const FLOW_SIZE_SM = 4;
const FLOW_WINDOW_SIZE = 15;
const FLOW_MAX_DRAG_COLS = 4;
const FLOW_COL_GAP = 24;
const FLOW_CANVAS_PAD_LEFT = 14;
const FLOW_COL_MIN_WIDTH = 180;
const FLOW_COL_MAX_WIDTH = 560;
const QL_SPLIT_MIN_RATIO = 0.18;
const QL_SPLIT_MAX_RATIO = 0.75;

interface WorkspaceSplitNodeLike {
  dimension?: number;
  setDimension?: (dim: number) => void;
  containerEl?: HTMLElement;
  parent?: {
    recomputeChildrenDimensions?: () => void;
  };
}

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
  // [ID 6.5.43] Space 네이티브 우측 분할 편집기(WorkspaceLeaf 1개 재사용) + 분할 비율 영속화
  // -> 진짜 옵시디언 MarkdownView 1개만 재사용해 토글 플러그인·라이브 프리뷰를 100% 지원하면서 메모리 부담을 일반 탭 1개 수준으로 제한함.
  private quickEditLeaf: WorkspaceLeaf | null = null;
  private splitSaveTimer: number | null = null;
  private splitApplyLockUntil = 0;
  private renderedCards: BoardCardModel[] = [];

  // [ID 6.5.11] Option(Alt)+방향키 들고 이동 & Cmd+C/X/V 복사·잘라내기·붙여넣기 클립보드 상태
  // -> cut은 이동(원본 반투명 표시), copy는 재귀 복제(여러 폴더에 반복 붙여넣기 가능)로 동작함.
  private carryPaths: string[] = [];
  private carryCardIndex = 0;
  private carryTargetFolderPath: string | null = null;
  private carryAnchorY: number | null = null;
  private carryAnchorX: number | null = null;
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
  // [ID 6.5.41] 여러줄 모드 가상 슬라이딩 윈도우 스크롤 오프셋 & 휠 누적기
  // -> overflow: visible을 유지(하단 빈공간 0)하면서도 15개 초과 대용량 폴더 내부를 휠·방향키로 실시간 스크롤함.
  private flowScrollOffsets = new Map<string, number>();
  private flowWheelAccum = new Map<string, number>();
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
  private pinBtnEl!: HTMLButtonElement;
  private qlBtnEl!: HTMLButtonElement;
  private canvasEl!: HTMLElement;
  private gridEl!: HTMLElement;
  private colResizersEl!: HTMLElement;
  private shelfEl!: HTMLElement;
  private shelfListEl!: HTMLElement;
  private shelfDropHereBtn!: HTMLButtonElement;
  private selectionBarEl!: HTMLElement;
  private selectionCountEl!: HTMLElement;
  private carryPillEl!: HTMLElement;

  private vaultRefs: EventRef[] = [];
  private resizeObserver: ResizeObserver | null = null;
  private flowResizerRaf: number | null = null;
  private lastCanvasHeight = 0;
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
  private lateIconSyncTimer: number | null = null;

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

  private isLeafPinned(): boolean {
    const pinnedProp = (this.leaf as unknown as { pinned?: boolean }).pinned;
    return Boolean(pinnedProp ?? this.leaf.getViewState().pinned);
  }

  syncPinButtonState(): void {
    if (!this.pinBtnEl) return;
    const pinned = this.isLeafPinned();
    this.pinBtnEl.toggleClass("is-active", pinned);
    this.pinBtnEl.setAttr(
      "aria-label",
      pinned
        ? "탭 고정됨 — 노트 열 때 옆 탭에서 열림 (클릭해 해제)"
        : "탭 고정 (Pin) — 보드를 유지한 채 옆 탭에서 노트 열기"
    );
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

  private openShortcutHelpModal(): void {
    this.isSubModalOpen = true;
    this.syncScopeState();
    const modal = new ShortcutHelpModal(this.app);
    const origOnClose = modal.onClose.bind(modal);
    modal.onClose = () => {
      origOnClose();
      this.isSubModalOpen = false;
      this.syncScopeState();
      requestAnimationFrame(() => this.shellEl?.focus());
    };
    modal.open();
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

    if (this.plugin.settings.autoPinTab && !this.isLeafPinned()) {
      this.leaf.setPinned(true);
    }
    this.syncPinButtonState();

    this.syncScopeState();
    // 리로드 직후 이미 활성 탭인 경우 active-leaf-change가 안 뜰 수 있으므로 layoutReady 시점에도 한 번 더 동기화
    this.app.workspace.onLayoutReady(() => this.syncScopeState());
    requestAnimationFrame(() => {
      this.shellEl?.focus();
      this.syncScopeState();
    });
    // [ID 6.5.56] 앱 시작 직후 커뮤니티 아이콘 플러그인이 file-explorer를 뒤늦게 꾸미는 타이밍 보완 (1회 인플레이스 갱신)
    this.lateIconSyncTimer = window.setTimeout(() => {
      this.lateIconSyncTimer = null;
      this.refreshNativeDecorationsInPlace();
    }, 800);
  }

  async onClose(): Promise<void> {
    this.closeQuickEditLeaf(false);
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
    if (this.lateIconSyncTimer !== null) {
      window.clearTimeout(this.lateIconSyncTimer);
      this.lateIconSyncTimer = null;
    }
    if (this.splitSaveTimer !== null) {
      window.clearTimeout(this.splitSaveTimer);
      this.splitSaveTimer = null;
    }
    if (this.flowResizerRaf !== null) {
      window.cancelAnimationFrame(this.flowResizerRaf);
      this.flowResizerRaf = null;
    }
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

    // [ID 6.5.12] 레이아웃 세그먼트 (여러줄 모드를 기본 최좌측 배치 + 2/3/4열 · 세로 · 가로)
    const colGroup = controls.createDiv({ cls: "fb-segmented" });
    const layoutOptions: Array<{ value: LayoutColumns; label: string; aria: string; icon?: string }> = [
      { value: "flow", label: "", aria: "여러줄 모드 (섹션 분류 · 기본)", icon: "list-tree" },
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

    // [ID 6.5.61] 보드 상단 원클릭 탭 고정(Pin) 토글 -> 설정 탭에 가지 않고 즉시 고정/해제 및 설정 기억
    this.pinBtnEl = controls.createEl("button", {
      cls: "clickable-icon fb-tool-btn",
      attr: { "aria-label": "탭 고정 (Pin)" }
    });
    setIcon(this.pinBtnEl, "pin");
    this.pinBtnEl.addEventListener("click", () => {
      const nextPinned = !this.isLeafPinned();
      this.leaf.setPinned(nextPinned);
      this.plugin.settings.autoPinTab = nextPinned;
      void this.plugin.saveSettings();
      this.syncPinButtonState();
    });

    // Quick Edit / Quick Look 토글
    this.qlBtnEl = controls.createEl("button", {
      cls: "clickable-icon fb-tool-btn",
      attr: { "aria-label": "빠른 편집 (Space)" }
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
    this.colResizersEl = this.canvasEl.createDiv({ cls: "fb-col-resizers" });

    // [ID 6.5.19] 창 크기 변경 시 세로 자동 열 수, 그리드 1줄 확장 span, 여러줄 모드 1열 확장 상한 및 호버 리사이즈 핸들 동기화
    this.resizeObserver = new ResizeObserver(() => {
      if (this.renderedCards.length === 0) return;
      const mode = this.plugin.settings.gridCols;
      if (mode === "auto" || typeof mode === "number") {
        this.applyGridLayoutClasses(this.renderedCards.length);
      } else if (mode === "flow") {
        const nextH = this.canvasEl.clientHeight;
        if (
          Math.abs(nextH - this.lastCanvasHeight) >= 12 &&
          this.plugin.hasAnyDynamicFlowWindow()
        ) {
          this.lastCanvasHeight = nextH;
          this.renderGridAndHeader();
          return;
        }
        this.lastCanvasHeight = nextH;
        this.scheduleFlowColResizersSync();
      }
    });
    this.resizeObserver.observe(this.canvasEl);

    // 가로 모드 및 여러줄(연속 다단) 모드에서 세로 휠을 가로 스크롤로 자연스럽게 연결
    // -> 여러줄 모드의 가상 스크롤 대상 폴더 위에서는 폴더 자체 세로 슬라이딩을 우선함.
    this.canvasEl.addEventListener(
      "wheel",
      (e: WheelEvent) => {
        const mode = this.plugin.settings.gridCols;
        if (mode !== "scroll" && mode !== "flow") return;
        const target = e.target as HTMLElement | null;
        if (mode === "scroll" && target?.closest(".fb-card-body")) return;
        if (mode === "flow" && target?.closest('.fb-card[data-windowed="true"]')) return;
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          this.canvasEl.scrollLeft += e.deltaY;
          e.preventDefault();
        }
      },
      { passive: false }
    );

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
      this.app.workspace.on("layout-change", () => {
        this.syncPinButtonState();
        if (this.quickLookOpen && !this.isQuickEditLeafAlive()) {
          this.quickLookOpen = false;
          this.quickLookPath = null;
          this.updateToolbarStates();
        } else if (this.quickLookOpen) {
          this.scheduleCaptureSplitRatio();
        }
      })
    );
    this.vaultRefs.push(
      this.app.workspace.on("resize", () => {
        if (this.quickLookOpen && this.isQuickEditLeafAlive()) {
          this.scheduleCaptureSplitRatio();
        }
      })
    );
    this.vaultRefs.push(
      this.app.vault.on("rename", (file, oldPath) => {
        if (file instanceof TFolder) {
          void this.plugin.renameExpandedFolder(oldPath, file.path);
        }
        if (this.currentFolderPath === oldPath) {
          this.currentFolderPath = normalizeFolderStr(file.path);
        }
        if (this.quickLookPath === oldPath) {
          this.quickLookPath = file.path;
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

    // 2) 하위 폴더 카드/섹션들
    const isFlowMode = this.plugin.settings.gridCols === "flow";
    for (const sub of childFolders) {
      const subPath = normalizeFolderRef(sub);
      const isCollapsedSection = isFlowMode && !q && this.plugin.isFlowSectionCollapsed(subPath);
      const items: CardTreeItem[] = [];
      if (!isCollapsedSection) {
        this.collectCardTreeItems(sub, 0, items, true);
      }
      const nameMatch = !q || sub.name.toLowerCase().includes(q);
      if (q && !nameMatch && items.length === 0) continue;

      cards.push({
        isRootCard: false,
        folderPath: subPath,
        title: sub.name,
        totalCount: this.countFilesRecursive(sub),
        items,
        isCollapsedSection
      });
    }

    // [ID 6.5.58] 직속 카드 포함 전체 카드 사용자 지정 순서 반영 (기존 folderOrder와 100% 하위 호환)
    const customOrder = this.plugin.getFolderOrder(normalizeFolderRef(currentFolder));
    if (customOrder.includes(ROOT_CARD_ORDER_KEY)) {
      const rank = new Map(customOrder.map((k, idx) => [k, idx]));
      const fallbackRank = new Map(cards.map((c, idx) => [this.getCardOrderKey(c), idx]));
      cards.sort((a, b) => {
        const ka = this.getCardOrderKey(a);
        const kb = this.getCardOrderKey(b);
        const ra = rank.has(ka) ? rank.get(ka)! : Number.MAX_SAFE_INTEGER;
        const rb = rank.has(kb) ? rank.get(kb)! : Number.MAX_SAFE_INTEGER;
        if (ra !== rb) return ra - rb;
        return (fallbackRank.get(ka) ?? 0) - (fallbackRank.get(kb) ?? 0);
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

  private getCardOrderKey(card: BoardCardModel): string {
    return card.isRootCard ? ROOT_CARD_ORDER_KEY : card.folderPath;
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
    this.syncPinButtonState();
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

  private clampFlowColWidth(width: number): number {
    return Math.max(FLOW_COL_MIN_WIDTH, Math.min(Math.round(width), FLOW_COL_MAX_WIDTH));
  }

  private applyGridLayoutClasses(cardCount: number): void {
    const prefLayout = this.plugin.settings.gridCols;
    const isHorizontalCanvas = prefLayout === "scroll" || prefLayout === "flow";
    this.canvasEl.toggleClass("is-horizontal-scroll", isHorizontalCanvas);

    if (prefLayout === "scroll") {
      this.gridEl.style.removeProperty("--fb-flow-col-width");
      this.gridEl.style.removeProperty("--fb-tall-span");
      this.gridEl.className = "fb-grid fb-layout-scroll";
    } else if (prefLayout === "flow") {
      const colW = this.clampFlowColWidth(this.plugin.settings.flowColumnWidth);
      this.gridEl.style.setProperty("--fb-flow-col-width", `${colW}px`);
      this.gridEl.style.removeProperty("--fb-tall-span");
      this.gridEl.className = cardCount === 0 ? "fb-grid fb-layout-flow is-empty" : "fb-grid fb-layout-flow";
    } else if (prefLayout === "auto") {
      this.gridEl.style.removeProperty("--fb-flow-col-width");
      // [ID 6.5.19] 세로 모드: 현재 폭 기준 예상 열 수를 계산해 1줄이면 세로 100%, 여러 줄이면 위아래 스크롤
      const availWidth = Math.max(260, this.canvasEl.clientWidth - 28);
      const estimatedCols = Math.max(1, Math.floor((availWidth + 10) / 270));
      const rowClass = cardCount <= estimatedCols ? "fb-rows-1" : "fb-rows-auto";
      const availH = Math.max(360, this.canvasEl.clientHeight - 24);
      const tallSpan = rowClass === "fb-rows-1" ? 1 : Math.max(2, Math.round((availH + 10) / 330));
      this.gridEl.style.setProperty("--fb-tall-span", String(tallSpan));
      this.gridEl.className = `fb-grid fb-layout-auto ${rowClass}`;
    } else {
      this.gridEl.style.removeProperty("--fb-flow-col-width");
      const effectiveCols = Math.max(1, Math.min(prefLayout, Math.max(1, cardCount)));
      const rowCount = Math.max(1, Math.ceil(cardCount / effectiveCols));
      const rowClass = rowCount === 1 ? "fb-rows-1" : rowCount === 2 ? "fb-rows-2" : "fb-rows-many";
      const availH = Math.max(360, this.canvasEl.clientHeight - 24);
      const tallSpan =
        rowClass === "fb-rows-1" ? 1 : rowClass === "fb-rows-2" ? 2 : Math.max(2, Math.round((availH + 10) / 350));
      this.gridEl.style.setProperty("--fb-tall-span", String(tallSpan));
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

  private refreshNativeDecorationsInPlace(): void {
    if (!this.gridEl) return;
    invalidateNativeIconCache();

    this.gridEl.querySelectorAll<HTMLElement>(".fb-card:not(.is-root-card)").forEach((cardEl) => {
      const folderPath = normalizeFolderStr(cardEl.dataset.dropFolder);
      const iconEl = cardEl.querySelector<HTMLElement>(".fb-card-header .fb-native-icon");
      const titleEl = cardEl.querySelector<HTMLElement>(".fb-card-header .fb-card-title");
      const isExpanded = !cardEl.hasClass("is-section-collapsed");
      if (folderPath && iconEl && titleEl) {
        applyNativeDecoration(this.app, folderPath, iconEl, titleEl, "folder", isExpanded);
      }
    });

    this.gridEl.querySelectorAll<HTMLElement>(".fb-row").forEach((rowEl) => {
      const itemPath = rowEl.dataset.path;
      const iconEl = rowEl.querySelector<HTMLElement>(".fb-native-icon");
      const titleEl = rowEl.querySelector<HTMLElement>(".tree-item-inner");
      if (!itemPath || !iconEl || !titleEl) return;
      const isFolder = rowEl.classList.contains("nav-folder-title");
      const isExpanded = isFolder ? !rowEl.querySelector(".collapse-icon")?.hasClass("is-collapsed") : undefined;
      applyNativeDecoration(this.app, itemPath, iconEl, titleEl, isFolder ? "folder" : "file-text", isExpanded);
    });
  }

  private renderGrid(cards: BoardCardModel[]): void {
    invalidateNativeIconCache();
    this.gridEl.empty();
    this.applyGridLayoutClasses(cards.length);

    if (cards.length === 0) {
      this.gridEl.createDiv({ cls: "fb-empty-grid", text: "일치하는 항목이 없습니다" });
      this.colResizersEl?.empty();
      return;
    }

    const isCarrying = this.carryPaths.length > 0;
    const isFlowMode = this.plugin.settings.gridCols === "flow";

    // [ID 6.5.39] 여러줄 모드도 카드를 쪼개지 않고 CSS Multi-Column(column-fill: auto)에 직접 배치해 하단 빈공간을 0으로 만듦
    cards.forEach((cardModel, cardIdx) => {
      this.renderCardElement(this.gridEl, cardModel, cardIdx, isCarrying, isFlowMode);
    });

    if (isFlowMode) {
      this.lastCanvasHeight = this.canvasEl.clientHeight;
      this.scheduleFlowColResizersSync();
    } else {
      this.colResizersEl?.empty();
    }
  }

  // [ID 6.5.46] 여러줄 모드 호버 전용 다단 너비 조절 바 동기화
  // -> 고정 구분선(column-rule)을 제거하고 열 사이 여백에만 투명 히트존을 배치해 호버/드래그 시 조절 바가 나타나며,
  // -> k번째 경계 드래그 시 dx/k 비율로 열 폭을 갱신해 핸들이 커서를 1:1로 추적하고 설정에 영속 저장함.
  private scheduleFlowColResizersSync(): void {
    if (this.flowResizerRaf !== null) {
      window.cancelAnimationFrame(this.flowResizerRaf);
    }
    this.flowResizerRaf = window.requestAnimationFrame(() => {
      this.flowResizerRaf = null;
      this.syncFlowColResizers();
    });
  }

  private positionFlowColResizer(handleEl: HTMLElement, colIndex: number, colWidth: number): void {
    const gapCenter = FLOW_CANVAS_PAD_LEFT + colIndex * colWidth + (colIndex - 1) * FLOW_COL_GAP + FLOW_COL_GAP / 2;
    handleEl.style.left = `${Math.round(gapCenter - 7)}px`;
  }

  private syncFlowColResizers(): void {
    if (!this.colResizersEl) return;
    this.colResizersEl.empty();
    if (this.plugin.settings.gridCols !== "flow" || this.renderedCards.length === 0) return;

    const colW = this.clampFlowColWidth(this.plugin.settings.flowColumnWidth);
    const gridRect = this.gridEl.getBoundingClientRect();
    const probes = Array.from(
      this.gridEl.querySelectorAll<HTMLElement>(".fb-row, .fb-card-header, .fb-empty-card")
    );
    let maxRight = gridRect.left + colW;
    for (const el of probes) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.right > maxRight) {
        maxRight = r.right;
      }
    }

    const totalSpan = Math.max(colW, maxRight - gridRect.left);
    const numCols = Math.max(1, Math.round((totalSpan + FLOW_COL_GAP) / (colW + FLOW_COL_GAP)));

    for (let k = 1; k <= numCols; k++) {
      const handle = this.colResizersEl.createDiv({
        cls: "fb-col-resizer",
        attr: {
          "data-col-index": String(k),
          "aria-label": "다단 너비 조절 (드래그)"
        }
      });
      this.positionFlowColResizer(handle, k, colW);

      handle.addEventListener("pointerdown", (e: PointerEvent) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startW = this.clampFlowColWidth(this.plugin.settings.flowColumnWidth);
        let latestW = startW;

        handle.addClass("is-dragging");
        document.body.style.cursor = "col-resize";

        const allHandles = Array.from(this.colResizersEl.querySelectorAll<HTMLElement>(".fb-col-resizer"));

        const onMove = (ev: PointerEvent) => {
          const dx = ev.clientX - startX;
          latestW = this.clampFlowColWidth(startW + dx / k);
          this.gridEl.style.setProperty("--fb-flow-col-width", `${latestW}px`);
          for (const h of allHandles) {
            const idx = Number(h.dataset.colIndex) || 1;
            this.positionFlowColResizer(h, idx, latestW);
          }
        };

        const onUp = () => {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
          window.removeEventListener("pointercancel", onUp);
          handle.removeClass("is-dragging");
          document.body.style.cursor = "";

          this.plugin.settings.flowColumnWidth = latestW;
          void this.plugin.saveSettings();
          this.scheduleFlowColResizersSync();
        };

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onUp);
      });
    }
  }

  private getFlowWindowKey(cardModel: BoardCardModel): string {
    return cardModel.isRootCard ? "__root__" : cardModel.folderPath;
  }

  // [ID 6.5.47] 여러줄 모드 카드 1열 꽉 찬 최대 행 수 정밀 산출
  // -> .fb-grid 실제 내부 높이와 실측 행 높이(flow 모드는 gap 0)를 그대로 사용해 화면 하단까지 빈틈없이 딱 맞게 채움.
  private measureFlowRowHeight(): number {
    const sampleRow = this.gridEl?.querySelector<HTMLElement>(".fb-row");
    const measured = sampleRow ? sampleRow.getBoundingClientRect().height : 27;
    return Math.max(22, Math.min(40, measured || 27));
  }

  private getFlowMaxOneColumnItems(cardModel: BoardCardModel): number {
    const gridH = this.gridEl?.clientHeight || Math.max(240, (this.canvasEl?.clientHeight || 720) - 24);
    const rowH = this.measureFlowRowHeight();
    const sampleHeader = !cardModel.isRootCard
      ? this.gridEl?.querySelector<HTMLElement>(".fb-card-header")
      : null;
    const headerH = sampleHeader ? sampleHeader.getBoundingClientRect().height : 28;
    // border(2) + card padding(10) + header + body padding(3) + scroll footer(12) + 여유(1)
    const chromeH = cardModel.isRootCard ? 16 : Math.ceil(headerH) + 28;
    const usableH = Math.max(rowH * FLOW_SIZE_SM, gridH - chromeH);
    return Math.max(FLOW_SIZE_SM, Math.floor(usableH / rowH));
  }

  private getFlowWindowLimit(cardModel: BoardCardModel): number {
    const key = this.getFlowWindowKey(cardModel);
    const spec = this.plugin.getFlowWindowSizeSpec(key);
    const maxOneCol = this.getFlowMaxOneColumnItems(cardModel);
    const maxDragItems = maxOneCol * FLOW_MAX_DRAG_COLS;

    if (spec === "sm") return Math.min(cardModel.items.length, FLOW_SIZE_SM);
    if (spec === "lg") return Math.min(cardModel.items.length, maxOneCol);
    if (typeof spec === "number" && Number.isFinite(spec)) {
      const clamped = Math.max(2, Math.min(Math.round(spec), maxDragItems));
      return Math.min(cardModel.items.length, clamped);
    }
    return Math.min(cardModel.items.length, FLOW_WINDOW_SIZE);
  }

  private getFlowWindowOffset(cardModel: BoardCardModel): number {
    const limit = this.getFlowWindowLimit(cardModel);
    const maxOffset = Math.max(0, cardModel.items.length - limit);
    const saved = this.flowScrollOffsets.get(this.getFlowWindowKey(cardModel)) || 0;
    const clamped = Math.max(0, Math.min(saved, maxOffset));
    if (clamped !== saved) {
      this.flowScrollOffsets.set(this.getFlowWindowKey(cardModel), clamped);
    }
    return clamped;
  }

  // [ID 6.5.59] 카드 헤더 카운트 간소화 -> 범위(1–15/41) 대신 폴더 전체 파일 수 숫자 1개만 표시해 제목 잘림과 시각적 잡음을 제거함
  private formatFlowCountLabel(cardModel: BoardCardModel, _isScrollableWindow: boolean): string {
    return String(cardModel.totalCount);
  }

  private updateFlowWindowDOM(cardIdx: number): void {
    const cardModel = this.renderedCards[cardIdx];
    if (!cardModel || this.plugin.settings.gridCols !== "flow" || cardModel.isCollapsedSection) return;
    const limit = this.getFlowWindowLimit(cardModel);
    const isScrollable = cardModel.items.length > limit;

    const cardEl = this.gridEl.querySelector<HTMLElement>(`.fb-card[data-card-index="${cardIdx}"]`);
    if (!cardEl) return;
    const listEl = cardEl.querySelector<HTMLElement>(".fb-card-body");
    if (!listEl) return;

    if (isScrollable) cardEl.setAttribute("data-windowed", "true");
    else cardEl.removeAttribute("data-windowed");

    const offset = isScrollable ? this.getFlowWindowOffset(cardModel) : 0;
    const isCarrying = this.carryPaths.length > 0;
    listEl.empty();
    this.renderCardRows(
      listEl,
      cardModel,
      cardIdx,
      isCarrying,
      offset,
      isScrollable ? offset + limit : cardModel.items.length
    );

    const countEl = cardEl.querySelector<HTMLElement>(".fb-count");
    if (countEl) {
      countEl.setText(this.formatFlowCountLabel(cardModel, isScrollable));
    }

    const footerEl = cardEl.querySelector<HTMLElement>(".fb-flow-scroll-footer");
    footerEl?.toggleClass("is-unscrolled", !isScrollable);

    const thumbEl = cardEl.querySelector<HTMLElement>(".fb-flow-scroll-thumb");
    if (thumbEl) {
      const total = cardModel.items.length;
      if (isScrollable) {
        const pctLeft = (offset / total) * 100;
        const pctWidth = Math.max(8, (limit / total) * 100);
        thumbEl.style.left = `${pctLeft}%`;
        thumbEl.style.width = `${pctWidth}%`;
      } else {
        thumbEl.style.left = "0%";
        thumbEl.style.width = "100%";
      }
    }
  }

  private ensureFlowWindowIncludes(cardIdx: number, itemIndex: number): void {
    if (this.plugin.settings.gridCols !== "flow") return;
    const cardModel = this.renderedCards[cardIdx];
    if (!cardModel || cardModel.isCollapsedSection) return;
    const limit = this.getFlowWindowLimit(cardModel);
    if (cardModel.items.length <= limit) return;

    const key = this.getFlowWindowKey(cardModel);
    const curOffset = this.getFlowWindowOffset(cardModel);
    let nextOffset = curOffset;

    if (itemIndex < curOffset) {
      nextOffset = itemIndex;
    } else if (itemIndex >= curOffset + limit) {
      nextOffset = itemIndex - limit + 1;
    }

    const maxOffset = Math.max(0, cardModel.items.length - limit);
    nextOffset = Math.max(0, Math.min(nextOffset, maxOffset));

    if (nextOffset !== curOffset) {
      this.flowScrollOffsets.set(key, nextOffset);
      this.updateFlowWindowDOM(cardIdx);
    }
  }

  private renderCardElement(
    parentEl: HTMLElement,
    cardModel: BoardCardModel,
    cardIdx: number,
    isCarrying: boolean,
    isFlowMode: boolean
  ): void {
    const isFocusedCard = !isCarrying && cardIdx === this.focusedCardIndex;
    const isCarryCard =
      isCarrying && cardIdx === this.carryCardIndex && this.carryTargetFolderPath === cardModel.folderPath;
    const winKey = this.getFlowWindowKey(cardModel);
    const isResizableFlowCard = isFlowMode && !cardModel.isCollapsedSection && cardModel.items.length > FLOW_SIZE_SM;
    const windowLimit = isResizableFlowCard ? this.getFlowWindowLimit(cardModel) : cardModel.items.length;
    const isScrollableWindow = isResizableFlowCard && cardModel.items.length > windowLimit;

    const cardKey = this.getCardOrderKey(cardModel);
    const isTallGridCard = !isFlowMode && this.plugin.settings.gridCols !== "scroll" && this.plugin.isGridCardTall(cardKey);

    const cardEl = parentEl.createDiv({
      cls:
        "fb-card" +
        (cardModel.isRootCard ? " is-root-card" : "") +
        (cardModel.isRootCard && cardIdx > 0 ? " is-root-moved" : "") +
        (cardModel.isCollapsedSection ? " is-section-collapsed" : "") +
        (isTallGridCard ? " is-card-tall" : "") +
        (isFocusedCard ? " is-focused-card" : "") +
        (isCarryCard ? " is-carry-target" : ""),
      attr: {
        "data-drop-folder": cardModel.folderPath,
        "data-order-key": cardKey,
        "data-card-index": String(cardIdx),
        ...(isScrollableWindow ? { "data-windowed": "true" } : {})
      }
    });

    // [ID 6.5.42] 가상 슬라이딩 윈도우 휠 스크롤 핸들러 -> 인플레이스 펼침 이후에도 그대로 동작하도록 카드 단위에 상시 바인딩
    if (isFlowMode) {
      cardEl.addEventListener(
        "wheel",
        (e: WheelEvent) => {
          if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
          const liveModel = this.renderedCards[cardIdx];
          if (!liveModel || liveModel.isCollapsedSection) return;
          const curLimit = this.getFlowWindowLimit(liveModel);
          if (liveModel.items.length <= curLimit) return;
          e.preventDefault();
          e.stopPropagation();

          const accum = (this.flowWheelAccum.get(winKey) || 0) + e.deltaY;
          const stepPx = 24;
          const rowSteps = Math.trunc(accum / stepPx);
          if (rowSteps === 0) {
            this.flowWheelAccum.set(winKey, accum);
            return;
          }
          this.flowWheelAccum.set(winKey, accum - rowSteps * stepPx);

          const curOffset = this.getFlowWindowOffset(liveModel);
          const maxOffset = Math.max(0, liveModel.items.length - curLimit);
          const nextOffset = Math.max(0, Math.min(curOffset + rowSteps, maxOffset));
          if (nextOffset !== curOffset) {
            this.flowScrollOffsets.set(winKey, nextOffset);
            this.updateFlowWindowDOM(cardIdx);
          }
        },
        { passive: false }
      );
    }

    // [ID 6.5.38 / 6.5.58] 직속 카드 헤더 정책
    // -> 그리드·세로·가로 모드에서는 다른 카드와 통일감 있게 정식 카드 헤더(아이콘 + 제목 + 직속 배지 + 카운트)를 표시하고,
    // -> 여러줄(flow) 모드에서는 맨 앞(0번) 무헤더 + 상단 호버 손잡이, 이동 시 은은한 미니 헤더(C안)를 적용함.
    if (cardModel.isRootCard) {
      if (isFlowMode && cardIdx === 0) {
        const hoverZone = cardEl.createDiv({ cls: "fb-root-hover-zone" });
        const hoverGrip = hoverZone.createDiv({
          cls: "fb-root-hover-grip",
          attr: {
            draggable: "true",
            "aria-label": "드래그하거나 Shift+←/→로 직속 카드 위치 이동"
          }
        });
        setIcon(hoverGrip, "grip-horizontal");
        hoverGrip.addEventListener("dragstart", (e) =>
          this.handleCardDragStart(e, ROOT_CARD_ORDER_KEY, cardModel.title)
        );
      } else if (isFlowMode) {
        const isHeaderFocused = isFocusedCard && this.focusedItemKey === CARD_HEADER_KEY;
        const rootHeader = cardEl.createDiv({
          cls: "fb-card-header is-root-moved-header" + (isHeaderFocused ? " is-header-focused" : ""),
          attr: { draggable: "true" }
        });
        const titleWrap = rootHeader.createDiv({ cls: "fb-card-title-wrap" });
        const gripIcon = titleWrap.createSpan({ cls: "fb-root-header-grip" });
        setIcon(gripIcon, "grip-horizontal");
        titleWrap.createSpan({ cls: "fb-card-title is-root-moved-title", text: cardModel.title });

        const metaEl = rootHeader.createDiv({ cls: "fb-card-meta" });
        metaEl.createSpan({
          cls: "fb-count",
          text: this.formatFlowCountLabel(cardModel, isScrollableWindow)
        });

        rootHeader.addEventListener("dragstart", (e) =>
          this.handleCardDragStart(e, ROOT_CARD_ORDER_KEY, cardModel.title)
        );
        rootHeader.addEventListener("click", () => {
          this.selectedPaths.clear();
          this.selectionAnchorIndex = null;
          this.focusedCardIndex = cardIdx;
          this.focusedItemKey = CARD_HEADER_KEY;
          this.syncFocusAndSelectionDOM();
          this.renderSelectionBar();
          this.scrollFocusedIntoView();
        });
      } else {
        // 그리드(2/3/4열) · 세로 · 가로 모드: 다른 카드들과 통일된 카드 헤더
        const isHeaderFocused = isFocusedCard && this.focusedItemKey === CARD_HEADER_KEY;
        const rootHeader = cardEl.createDiv({
          cls: "fb-card-header" + (isHeaderFocused ? " is-header-focused" : ""),
          attr: { draggable: "true" }
        });
        const titleWrap = rootHeader.createDiv({ cls: "fb-card-title-wrap" });
        const iconEl = titleWrap.createSpan({ cls: "fb-native-icon" });
        setIcon(iconEl, "inbox");
        titleWrap.createSpan({ cls: "fb-card-title", text: cardModel.title });
        titleWrap.createSpan({ cls: "fb-root-pill", text: "직속" });

        const metaEl = rootHeader.createDiv({ cls: "fb-card-meta" });
        metaEl.createSpan({
          cls: "fb-count",
          text: this.formatFlowCountLabel(cardModel, isScrollableWindow)
        });

        rootHeader.addEventListener("dragstart", (e) =>
          this.handleCardDragStart(e, ROOT_CARD_ORDER_KEY, cardModel.title)
        );
        rootHeader.addEventListener("click", () => {
          this.selectedPaths.clear();
          this.selectionAnchorIndex = null;
          this.focusedCardIndex = cardIdx;
          this.focusedItemKey = CARD_HEADER_KEY;
          this.syncFocusAndSelectionDOM();
          this.renderSelectionBar();
          this.scrollFocusedIntoView();
        });
      }
    } else {
      const isHeaderFocused = isFocusedCard && this.focusedItemKey === CARD_HEADER_KEY;
      const headerEl = cardEl.createDiv({
        cls: "fb-card-header" + (isHeaderFocused ? " is-header-focused" : "")
      });
      const titleWrap = headerEl.createDiv({ cls: "fb-card-title-wrap" });

      if (isFlowMode) {
        const sectionCaret = titleWrap.createSpan({
          cls: "tree-item-icon collapse-icon fb-section-caret" + (cardModel.isCollapsedSection ? " is-collapsed" : "")
        });
        setIcon(sectionCaret, "chevron-down");
        sectionCaret.addEventListener("click", (e) => {
          e.stopPropagation();
          this.focusedCardIndex = cardIdx;
          this.focusedItemKey = CARD_HEADER_KEY;
          this.toggleFlowSectionInPlace(cardIdx, cardModel.folderPath);
        });
      }

      const iconEl = titleWrap.createSpan({ cls: "fb-native-icon" });
      const nameEl = titleWrap.createSpan({ cls: "fb-card-title", text: cardModel.title });
      applyNativeDecoration(this.app, cardModel.folderPath, iconEl, nameEl, "folder", !cardModel.isCollapsedSection);

      if (isFlowMode) {
        headerEl.createDiv({ cls: "fb-section-rule" });
      }

      const metaEl = headerEl.createDiv({ cls: "fb-card-meta" });
      metaEl.createSpan({
        cls: "fb-count",
        text: this.formatFlowCountLabel(cardModel, isScrollableWindow)
      });

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

      // [ID 6.5.50] 여러줄(트리) 모드에서는 클릭 접기/펼치기와 충돌하는 더블클릭 폴더 진입을 비활성화 (우측 → 버튼·Enter로만 진입)
      if (!isFlowMode) {
        headerEl.addEventListener("dblclick", () => this.navigateToFolder(cardModel.folderPath));
      }
      headerEl.addEventListener("contextmenu", (e) => {
        const folder = getFolderByPath(this.app, cardModel.folderPath);
        if (folder) this.openContextMenu(e, folder);
      });

      headerEl.addEventListener("click", () => {
        this.selectedPaths.clear();
        this.selectionAnchorIndex = null;
        this.focusedCardIndex = cardIdx;
        this.focusedItemKey = CARD_HEADER_KEY;
        if (isFlowMode) {
          this.toggleFlowSectionInPlace(cardIdx, cardModel.folderPath);
          return;
        }
        this.syncFocusAndSelectionDOM();
        this.renderSelectionBar();
        this.scrollFocusedIntoView();
      });
    }

    this.renderCardBodyAndFooter(cardEl, cardModel, cardIdx, isCarrying, isFlowMode);

    // [ID 6.5.60] 카드 모드(2/3/4열 그리드 · 세로 모드) 하단 호버 기호 전용 세로 확장/축소 토글 (화면 1줄)
    // -> DOM 재생성 없이 클래스와 아이콘만 인플레이스 토글해 깜박임 없이 원하는 카드만 화면 1줄 높이로 늘림.
    if (!isFlowMode && this.plugin.settings.gridCols !== "scroll") {
      const tallZone = cardEl.createDiv({ cls: "fb-card-tall-zone" });
      const tallBtn = tallZone.createEl("button", {
        cls: "fb-card-tall-btn",
        attr: {
          type: "button",
          "aria-label": isTallGridCard ? "기본 크기로 축소" : "화면 1줄 높이로 확장"
        }
      });
      setIcon(tallBtn, isTallGridCard ? "chevrons-up" : "chevrons-down");
      tallBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const nextTall = !this.plugin.isGridCardTall(cardKey);
        void this.plugin.toggleGridCardTall(cardKey);
        cardEl.toggleClass("is-card-tall", nextTall);
        tallBtn.empty();
        setIcon(tallBtn, nextTall ? "chevrons-up" : "chevrons-down");
        tallBtn.setAttr("aria-label", nextTall ? "기본 크기로 축소" : "화면 1줄 높이로 확장");
      });
    }
  }

  // [ID 6.5.54] 카드 본문·하단 리사이즈 바 독립 렌더링 (헤더/→ 화살표 DOM 보존용)
  // -> 폴더 접기/펼치기·크기 변경 시 카드 헤더를 파괴하지 않고 본문만 부분 교체해 Baseline 테마 아이콘 깜박임과 끊김을 원천 제거함.
  private renderCardBodyAndFooter(
    cardEl: HTMLElement,
    cardModel: BoardCardModel,
    cardIdx: number,
    isCarrying: boolean,
    isFlowMode: boolean
  ): HTMLElement | null {
    if (cardModel.isCollapsedSection) return null;

    const winKey = this.getFlowWindowKey(cardModel);
    const isResizableFlowCard = isFlowMode && cardModel.items.length > FLOW_SIZE_SM;
    const windowLimit = isResizableFlowCard ? this.getFlowWindowLimit(cardModel) : cardModel.items.length;
    const isScrollableWindow = isResizableFlowCard && cardModel.items.length > windowLimit;
    const activeSizeSpec = isResizableFlowCard ? this.plugin.getFlowWindowSizeSpec(winKey) : "md";

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
      return listEl;
    }

    const startIdx = isScrollableWindow ? this.getFlowWindowOffset(cardModel) : 0;
    const endIdx = isScrollableWindow ? Math.min(cardModel.items.length, startIdx + windowLimit) : cardModel.items.length;
    this.renderCardRows(listEl, cardModel, cardIdx, isCarrying, startIdx, endIdx);

    // [ID 6.5.48] 하단 스크롤바 호버 소·중·대 크기 선택 + 상하 드래그 실시간 리사이징
    // -> 소(4개)·중(기본 15개)·대(1열 꽉차게) 프리셋과 드래그 자유 조절을 모두 지원하며 폴더별로 기억함.
    if (isResizableFlowCard) {
      const footer = cardEl.createDiv({
        cls: "fb-flow-scroll-footer" + (isScrollableWindow ? "" : " is-unscrolled"),
        attr: { "aria-label": "드래그로 길이 조절 또는 소/중/대 선택" }
      });
      const track = footer.createDiv({ cls: "fb-flow-scroll-track" });
      const thumb = track.createDiv({ cls: "fb-flow-scroll-thumb" });
      const total = cardModel.items.length;
      if (isScrollableWindow) {
        thumb.style.left = `${(startIdx / total) * 100}%`;
        thumb.style.width = `${Math.max(8, (windowLimit / total) * 100)}%`;
      } else {
        thumb.style.left = "0%";
        thumb.style.width = "100%";
      }

      const sizeBar = footer.createDiv({ cls: "fb-flow-size-bar" });
      // [ID 6.5.53] 호버 선택바 좌측 상하 드래그 손잡이(↕) -> 드래그 리사이징 가능성을 직관적으로 안내
      const dragHandle = sizeBar.createSpan({
        cls: "fb-flow-drag-handle",
        attr: { "aria-label": "위아래 드래그로 길이 조절" }
      });
      setIcon(dragHandle, "chevrons-up-down");
      sizeBar.createSpan({ cls: "fb-flow-size-sep" });

      const sizePresets: Array<{ spec: "sm" | "md" | "lg"; label: string; aria: string }> = [
        { spec: "sm", label: "소", aria: `소 (${FLOW_SIZE_SM}개)` },
        { spec: "md", label: "중", aria: `중 (기본 ${FLOW_WINDOW_SIZE}개)` }
      ];
      if (cardModel.items.length > FLOW_WINDOW_SIZE) {
        sizePresets.push({ spec: "lg", label: "대", aria: "대 (1열 꽉차게)" });
      }

      let suppressNextClick = false;
      for (const preset of sizePresets) {
        const isActive =
          activeSizeSpec === preset.spec ||
          (typeof activeSizeSpec === "number" &&
            ((preset.spec === "sm" && activeSizeSpec === FLOW_SIZE_SM) ||
              (preset.spec === "md" && activeSizeSpec === FLOW_WINDOW_SIZE)));
        const btn = sizeBar.createEl("button", {
          cls: "fb-flow-size-btn" + (isActive ? " is-active" : ""),
          text: preset.label,
          attr: { type: "button", "aria-label": preset.aria }
        });
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (suppressNextClick) {
            suppressNextClick = false;
            return;
          }
          void this.plugin.setFlowWindowSizeSpec(winKey, preset.spec);
          this.patchCardInPlace(cardIdx);
          this.scrollFocusedIntoView();
        });
      }

      const dragBadge = footer.createSpan({ cls: "fb-flow-drag-badge" });

      footer.addEventListener("pointerdown", (e: PointerEvent) => {
        if (e.button !== 0) return;
        e.stopPropagation();

        // [ID 6.5.55] 하단 드래그 최대 4열 확장 지원 (상하 드래그 + 우측/좌측 다단 드래그 동시 대응)
        // -> 화면 하단에 닿아도 우측으로 끌면 2~4열까지 매끄럽게 확장되며, 28px 가로 데드존으로 수직 드래그 흔들림을 방지함.
        const startX = e.clientX;
        const startY = e.clientY;
        const startRows = Math.min(cardModel.items.length, this.getFlowWindowLimit(cardModel));
        const rowH = this.measureFlowRowHeight();
        const maxOneCol = this.getFlowMaxOneColumnItems(cardModel);
        const maxDragLimit = maxOneCol * FLOW_MAX_DRAG_COLS;
        const maxRows = Math.min(cardModel.items.length, maxDragLimit);
        const minRows = Math.min(2, cardModel.items.length);
        const colPitch = this.clampFlowColWidth(this.plugin.settings.flowColumnWidth) + FLOW_COL_GAP;

        let isDragging = false;
        let latestRows = startRows;

        const onMove = (ev: PointerEvent) => {
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          if (!isDragging && Math.hypot(dx, dy) >= 4) {
            isDragging = true;
            footer.addClass("is-resizing");
            document.body.style.cursor = "ns-resize";
          }
          if (!isDragging) return;

          const effectiveDx = Math.abs(dx) < 28 ? 0 : dx > 0 ? dx - 28 : dx + 28;
          const deltaRows = Math.round(dy / rowH + (effectiveDx / colPitch) * maxOneCol);
          const nextRows = Math.max(minRows, Math.min(maxRows, startRows + deltaRows));

          if (nextRows >= maxDragLimit && cardModel.items.length > maxDragLimit) {
            dragBadge.setText(`${nextRows}개 · 최대 ${FLOW_MAX_DRAG_COLS}열`);
          } else if (nextRows > maxOneCol) {
            const cols = Math.min(FLOW_MAX_DRAG_COLS, Math.ceil(nextRows / maxOneCol));
            dragBadge.setText(`${nextRows}개 (${cols}열)`);
          } else {
            dragBadge.setText(`${nextRows}개`);
          }

          if (nextRows !== latestRows) {
            latestRows = nextRows;
            this.plugin.settings.flowWindowSizes[winKey] = nextRows;
            this.updateFlowWindowDOM(cardIdx);
          }
        };

        const onUp = () => {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
          window.removeEventListener("pointercancel", onUp);

          if (!isDragging) return;

          suppressNextClick = true;
          window.setTimeout(() => {
            suppressNextClick = false;
          }, 0);

          footer.removeClass("is-resizing");
          document.body.style.cursor = "";

          let finalSpec: FlowWindowSizeSpec = latestRows;
          if (latestRows === FLOW_SIZE_SM) {
            finalSpec = "sm";
          } else if (
            latestRows === FLOW_WINDOW_SIZE ||
            (latestRows === cardModel.items.length && cardModel.items.length <= FLOW_WINDOW_SIZE)
          ) {
            finalSpec = "md";
          } else if (latestRows === maxOneCol && cardModel.items.length > FLOW_WINDOW_SIZE) {
            finalSpec = "lg";
          }

          void this.plugin.setFlowWindowSizeSpec(winKey, finalSpec);
          this.patchCardInPlace(cardIdx);
        };

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onUp);
      });
    }

    return listEl;
  }

  private renderCardRows(
    listEl: HTMLElement,
    cardModel: BoardCardModel,
    cardIdx: number,
    isCarrying: boolean,
    startIdx: number,
    endIdx: number
  ): void {
    const cutSet = new Set(this.clipboardMode === "cut" ? this.clipboardPaths : []);
    const isFlowMode = this.plugin.settings.gridCols === "flow";

    for (let itemIdx = startIdx; itemIdx < endIdx && itemIdx < cardModel.items.length; itemIdx++) {
      const item = cardModel.items[itemIdx];
      const isFocused = !isCarrying && cardIdx === this.focusedCardIndex && this.focusedItemKey === item.key;
      const isCut = cutSet.has(item.path);

      if (item.type === "folder") {
        const isSelected = this.selectedPaths.has(item.path);
        const isCarryFolder =
          isCarrying && cardIdx === this.carryCardIndex && this.carryTargetFolderPath === item.path;
        const row = listEl.createDiv({
          cls:
            "tree-item-self is-clickable nav-folder-title fb-row" +
            (isSelected ? " is-selected" : "") +
            (isFocused ? " is-focused" : "") +
            (isCut ? " is-cut" : "") +
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
        applyNativeDecoration(this.app, item.path, fIcon, fTitle, "folder", Boolean(item.expanded));

        if (item.childCount !== undefined) {
          row.createSpan({ cls: "fb-row-count", text: String(item.childCount) });
        }

        if (isFlowMode) {
          const rowDrillBtn = row.createEl("button", {
            cls: "clickable-icon fb-row-drill-btn",
            attr: { "aria-label": `${item.name} 열기` }
          });
          setIcon(rowDrillBtn, "arrow-right");
          rowDrillBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            this.enterInlineSubfolderLevel(item.path);
          });
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
          this.toggleInlineSubfolderInPlace(cardIdx, item.path);
        });

        // [ID 6.5.50] 여러줄(트리) 모드에서는 하위 폴더도 더블클릭 진입을 막아 빠른 접기/펼치기 오작동을 방지함
        if (!isFlowMode) {
          row.addEventListener("dblclick", (e) => {
            e.stopPropagation();
            this.enterInlineSubfolderLevel(item.path);
          });
        }

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
            (isFocused ? " is-focused" : "") +
            (isCut ? " is-cut" : ""),
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
    }
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

  private clampQuickEditSplitRatio(ratio: number): number {
    return Math.max(QL_SPLIT_MIN_RATIO, Math.min(QL_SPLIT_MAX_RATIO, ratio));
  }

  private isQuickEditLeafAlive(): boolean {
    if (!this.quickEditLeaf) return false;
    let alive = false;
    this.app.workspace.iterateAllLeaves((l) => {
      if (l === this.quickEditLeaf) alive = true;
    });
    if (!alive) this.quickEditLeaf = null;
    return alive;
  }

  // [ID 6.5.44] 우측 분할 편집기 너비 비율 영속화 (옵시디언 기본 분할선 드래그 감지 및 복원)
  // -> 생성 직후 50/50 초기 레이아웃 이벤트가 저장값을 덮어쓰지 않도록 splitApplyLockUntil로 보호함.
  private applySavedQuickEditSplitRatio(): void {
    if (!this.isQuickEditLeafAlive() || !this.quickEditLeaf) return;
    const boardParent = this.leaf.parent as unknown as WorkspaceSplitNodeLike | null;
    const editParent = this.quickEditLeaf.parent as unknown as WorkspaceSplitNodeLike | null;
    if (!boardParent || !editParent || boardParent === editParent || boardParent.parent !== editParent.parent) {
      return;
    }

    const ratio = this.clampQuickEditSplitRatio(this.plugin.settings.quickLookSplitRatio);
    const curBoardDim = typeof boardParent.dimension === "number" && boardParent.dimension > 0 ? boardParent.dimension : 50;
    const curEditDim = typeof editParent.dimension === "number" && editParent.dimension > 0 ? editParent.dimension : 50;
    const pairTotal = curBoardDim + curEditDim;
    const nextEditDim = Math.max(10, pairTotal * ratio);
    const nextBoardDim = Math.max(10, pairTotal - nextEditDim);

    this.splitApplyLockUntil = Date.now() + 260;

    if (typeof boardParent.setDimension === "function" && typeof editParent.setDimension === "function") {
      boardParent.setDimension(nextBoardDim);
      editParent.setDimension(nextEditDim);
    } else if (boardParent.containerEl && editParent.containerEl) {
      boardParent.containerEl.style.flexGrow = String(nextBoardDim);
      editParent.containerEl.style.flexGrow = String(nextEditDim);
    }
    boardParent.parent?.recomputeChildrenDimensions?.();
  }

  private captureQuickEditSplitRatio(force = false): void {
    if (!force && Date.now() < this.splitApplyLockUntil) return;
    if (!this.isQuickEditLeafAlive() || !this.quickEditLeaf) return;

    const boardParent = this.leaf.parent as unknown as WorkspaceSplitNodeLike | null;
    const editParent = this.quickEditLeaf.parent as unknown as WorkspaceSplitNodeLike | null;
    if (!boardParent?.containerEl || !editParent?.containerEl || boardParent === editParent) return;

    const bw = boardParent.containerEl.clientWidth;
    const ew = editParent.containerEl.clientWidth;
    if (bw <= 0 || ew <= 0) return;

    const ratio = this.clampQuickEditSplitRatio(ew / (bw + ew));
    if (Math.abs(ratio - this.plugin.settings.quickLookSplitRatio) >= 0.01) {
      this.plugin.settings.quickLookSplitRatio = Number(ratio.toFixed(3));
      void this.plugin.saveSettings();
    }
  }

  private scheduleCaptureSplitRatio(): void {
    if (Date.now() < this.splitApplyLockUntil) return;
    if (this.splitSaveTimer !== null) {
      window.clearTimeout(this.splitSaveTimer);
    }
    this.splitSaveTimer = window.setTimeout(() => {
      this.splitSaveTimer = null;
      this.captureQuickEditSplitRatio();
    }, 220);
  }

  private closeQuickEditLeaf(refocusBoard = true): void {
    this.captureQuickEditSplitRatio(true);
    this.quickLookOpen = false;
    this.quickLookPath = null;

    if (this.isQuickEditLeafAlive() && this.quickEditLeaf) {
      const leafToClose = this.quickEditLeaf;
      this.quickEditLeaf = null;
      leafToClose.detach();
    }

    if (refocusBoard) {
      this.updateToolbarStates();
      this.app.workspace.setActiveLeaf(this.leaf, { focus: true });
      requestAnimationFrame(() => {
        this.shellEl?.focus();
        this.syncScopeState();
        if (this.plugin.settings.gridCols === "flow") {
          this.scheduleFlowColResizersSync();
        }
      });
    }
  }

  // [ID 6.5.45] Space 네이티브 우측 분할 편집기 열기/교체/닫기
  // -> 옵시디언 공식 createLeafBySplit으로 진짜 편집기 탭 1개만 우측에 띄우고,
  // -> 방향키 이동 시 active: false로 내용만 교체해 보드 포커스를 유지하면서도 toggle-premium·라이브 프리뷰를 100% 살림.
  private async updateQuickLook(targetFileOverride?: TFile | null): Promise<void> {
    if (!this.quickLookOpen) {
      this.closeQuickEditLeaf(true);
      return;
    }

    const file = targetFileOverride !== undefined ? targetFileOverride : this.getFocusedFile();
    if (!file) {
      if (!this.isQuickEditLeafAlive()) {
        this.quickLookOpen = false;
        this.quickLookPath = null;
        this.updateToolbarStates();
      }
      return;
    }

    const alive = this.isQuickEditLeafAlive();
    const currentViewFile = (this.quickEditLeaf?.view as { file?: TFile | null } | undefined)?.file;
    if (alive && currentViewFile?.path === file.path) {
      this.quickLookPath = file.path;
      return;
    }

    let createdNew = false;
    if (!alive) {
      this.splitApplyLockUntil = Date.now() + 350;
      this.quickEditLeaf = this.app.workspace.createLeafBySplit(this.leaf, "vertical", false);
      createdNew = true;
      requestAnimationFrame(() => this.applySavedQuickEditSplitRatio());
    }

    if (!this.quickEditLeaf) return;
    this.quickLookPath = file.path;

    try {
      await this.quickEditLeaf.openFile(file, {
        active: false,
        state: file.extension === "md" ? { mode: "source" } : undefined
      });
    } catch {
      return;
    }

    if (createdNew) {
      requestAnimationFrame(() => this.applySavedQuickEditSplitRatio());
    }

    // 보드 포커스를 되찾아 ↑/↓ 연속 탐색과 Space 즉시 닫기가 끊김 없이 동작하도록 유지
    this.app.workspace.setActiveLeaf(this.leaf, { focus: true });
    requestAnimationFrame(() => {
      this.shellEl?.focus();
      this.syncScopeState();
      if (this.plugin.settings.gridCols === "flow") {
        this.scheduleFlowColResizersSync();
      }
    });
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

    this.ensureFlowWindowIncludes(cardIdx, safeIdx);
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
      } else if (this.plugin.settings.gridCols === "flow") {
        const focusTarget =
          (this.gridEl.querySelector(".fb-row.is-carry-target") as HTMLElement | null) ||
          (this.gridEl.querySelector(".fb-row.is-focused") as HTMLElement | null) ||
          (this.gridEl.querySelector(".fb-card-header.is-header-focused") as HTMLElement | null) ||
          this.gridEl.querySelector<HTMLElement>(`.fb-card[data-card-index="${activeCardIdx}"]`);
        if (focusTarget) {
          focusTarget.scrollIntoView({ block: "nearest", inline: "nearest" });
        }
        return;
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

    // 다중 선택 중에는 미리보기를 바꾸지 않고 가상 윈도우·예비 포커스 테두리·선택 음영만 즉시 갱신
    this.ensureFlowWindowIncludes(cardIdx, safeTarget);
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

  // [ID 6.5.8] 노트 열기 (핀 고정 시 옵시디언 표준 getLeaf(false)로 옆 비고정 탭 재사용 / 미고정 시 동일 탭 히스토리 보존)
  // -> 탭이 고정(Pinned)된 상태에서는 보드를 덮어쓰지 않고 옆 작업 탭에서 열어 탭 폭증을 막으면서 보드를 상시 유지함.
  private async openFile(file: TFile, forceNewTab = false): Promise<void> {
    if (forceNewTab || this.plugin.settings.openBehavior === "new-tab") {
      const newLeaf = this.app.workspace.getLeaf("tab");
      await newLeaf.openFile(file, { active: true });
      return;
    }

    if (this.isLeafPinned()) {
      const unpinned = this.app.workspace.getLeaf(false);
      const targetLeaf =
        unpinned && unpinned !== this.leaf && unpinned !== this.quickEditLeaf
          ? unpinned
          : this.app.workspace.getLeaf("tab");
      await targetLeaf.openFile(file, { active: true });
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

  // [ID 6.5.17] 카드 내부 하위 폴더 진입 -> 직관적으로 선택한 하위 폴더 안으로 직접 이동함.
  private enterInlineSubfolderLevel(subfolderPath: string): void {
    this.navigateToFolder(subfolderPath);
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

  private isAllSourcesAlreadyInFolder(destPath: string): boolean {
    const normDest = normalizeFolderStr(destPath);
    if (this.carryPaths.length === 0) return false;
    return this.carryPaths.every((p) => {
      const abs = this.app.vault.getAbstractFileByPath(p);
      return abs?.parent ? normalizeFolderRef(abs.parent) === normDest : false;
    });
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

  // [ID 6.5.57] Option(Alt)+방향키 들고 이동 (전역 수직 순회 + 2D 공간 좌/우 이동 통합)
  // -> 위/아래 이동 시 현재 카드 내부에 갇히지 않고 카드 경계를 넘어 위·아래의 모든 폴더/하위 폴더로 자연스럽게 이동함.
  private beginOrStepCarry(direction: "left" | "right" | "up" | "down"): void {
    if (this.renderedCards.length === 0) return;

    const justStarted = this.carryPaths.length === 0;
    if (justStarted) {
      const sources = this.resolveCarrySourcePaths();
      if (sources.length === 0) return;
      this.carryPaths = sources;
      this.carryCardIndex = this.focusedCardIndex;
      this.carryTargetFolderPath = null;
      const anchorRect = this.getActiveAnchorRect();
      this.carryAnchorX = anchorRect ? anchorRect.left : null;
      this.carryAnchorY = anchorRect ? anchorRect.top + anchorRect.height / 2 : null;
    }

    const mode = this.plugin.settings.gridCols;

    if (direction === "left" || direction === "right") {
      let spatialHandled = false;
      if (mode === "flow" && this.carryAnchorX !== null && this.carryAnchorY !== null) {
        // [ID 6.5.49] 여러줄 모드 Option+좌/우 들고 이동 -> 현재 파일/타겟 행의 실제 세로 위치(carryAnchorY)에 인접한 옆 열 폴더 타겟팅
        const excludePath = justStarted
          ? normalizeFolderStr(this.renderedCards[this.focusedCardIndex]?.folderPath)
          : this.carryTargetFolderPath !== null
            ? normalizeFolderStr(this.carryTargetFolderPath)
            : null;
        const found = this.findFlowHorizontalCarryTarget(
          direction,
          this.carryAnchorX,
          this.carryAnchorY,
          excludePath
        );
        if (found) {
          this.carryCardIndex = found.cardIdx;
          this.carryTargetFolderPath = found.folderPath;
          this.carryAnchorX = found.rect.left;
          spatialHandled = true;
        }
      }

      if (!spatialHandled) {
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
      }
    } else if (mode === "flow") {
      // 여러줄 모드 위/아래: 전체 보드의 모든 폴더·하위 폴더를 위→아래 흐름대로 끊김 없이 순회
      const allTargets: Array<{ cardIdx: number; path: string; pos: number }> = [];
      this.renderedCards.forEach((card, cardIdx) => {
        for (const t of this.getValidFolderTargetsInCard(card)) {
          allTargets.push({ cardIdx, path: t.path, pos: t.pos });
        }
      });
      if (allTargets.length === 0) return;

      let chosen: { cardIdx: number; path: string; pos: number } | null = null;
      if (justStarted) {
        const originCard = this.focusedCardIndex;
        const originPos =
          this.focusedItemKey === CARD_HEADER_KEY ? -1 : this.findFocusedCardAndIndex().itemIndex;
        const nonSameParent = (t: { path: string }) => !this.isAllSourcesAlreadyInFolder(t.path);
        const candidates = allTargets.filter(nonSameParent);
        const pool = candidates.length > 0 ? candidates : allTargets;

        if (direction === "up") {
          const before = pool.filter(
            (t) => t.cardIdx < originCard || (t.cardIdx === originCard && t.pos < originPos)
          );
          chosen = before.length > 0 ? before[before.length - 1] : pool[pool.length - 1];
        } else {
          const after = pool.filter(
            (t) => t.cardIdx > originCard || (t.cardIdx === originCard && t.pos > originPos)
          );
          chosen = after.length > 0 ? after[0] : pool[0];
        }
      } else {
        const curFlatIdx = allTargets.findIndex(
          (t) => t.cardIdx === this.carryCardIndex && t.path === this.carryTargetFolderPath
        );
        const delta = direction === "down" ? 1 : -1;
        const nextFlatIdx =
          curFlatIdx === -1 ? 0 : (curFlatIdx + delta + allTargets.length) % allTargets.length;
        chosen = allTargets[nextFlatIdx];
      }

      if (chosen) {
        this.carryCardIndex = chosen.cardIdx;
        this.carryTargetFolderPath = chosen.path;
        if (chosen.pos >= 0) {
          this.ensureFlowWindowIncludes(chosen.cardIdx, chosen.pos);
        }
      }
    } else {
      // 2D 그리드·세로·가로 모드 위/아래: 현재 카드 내부 폴더 순회 후 경계 도달 시 위/아래 행 카드로 자연스럽게 연결
      const card = this.renderedCards[this.carryCardIndex];
      if (!card) return;
      const targets = this.getValidFolderTargetsInCard(card);
      if (targets.length === 0) return;

      const stepToVerticalNeighborCard = (dir: "up" | "down"): boolean => {
        if (mode === "scroll") return false;
        let probeIdx = this.carryCardIndex;
        for (let guard = 0; guard < this.renderedCards.length; guard++) {
          const neighborIdx = this.findVerticalNeighborCard(probeIdx, dir);
          if (neighborIdx < 0) break;
          const neighborTargets = this.getValidFolderTargetsInCard(this.renderedCards[neighborIdx]);
          if (neighborTargets.length > 0) {
            this.carryCardIndex = neighborIdx;
            this.carryTargetFolderPath =
              dir === "up"
                ? neighborTargets[neighborTargets.length - 1].path
                : neighborTargets[0].path;
            return true;
          }
          probeIdx = neighborIdx;
        }
        return false;
      };

      if (justStarted) {
        const originPos =
          this.focusedItemKey === CARD_HEADER_KEY ? -1 : this.findFocusedCardAndIndex().itemIndex;
        const filtered = targets.filter((t) => !this.isAllSourcesAlreadyInFolder(t.path));

        if (direction === "up") {
          const above = filtered.filter((t) => t.pos < originPos);
          if (above.length > 0) {
            this.carryTargetFolderPath = above[above.length - 1].path;
          } else if (!stepToVerticalNeighborCard("up")) {
            this.carryTargetFolderPath =
              filtered.length > 0 ? filtered[filtered.length - 1].path : targets[targets.length - 1].path;
          }
        } else {
          const below = filtered.filter((t) => t.pos > originPos);
          if (below.length > 0) {
            this.carryTargetFolderPath = below[0].path;
          } else if (!stepToVerticalNeighborCard("down")) {
            this.carryTargetFolderPath = filtered.length > 0 ? filtered[0].path : targets[0].path;
          }
        }
      } else {
        const curIdx = targets.findIndex((t) => t.path === this.carryTargetFolderPath);
        if (direction === "down") {
          if (curIdx >= 0 && curIdx < targets.length - 1) {
            this.carryTargetFolderPath = targets[curIdx + 1].path;
          } else if (!stepToVerticalNeighborCard("down")) {
            this.carryTargetFolderPath = targets[0].path;
          }
        } else {
          if (curIdx > 0) {
            this.carryTargetFolderPath = targets[curIdx - 1].path;
          } else if (!stepToVerticalNeighborCard("up")) {
            this.carryTargetFolderPath = targets[targets.length - 1].path;
          }
        }
      }
    }

    // 세로로 폴더 타겟을 바꿨으면 다음 좌/우 이동의 기준 좌표도 새 타겟 위치에 맞춤
    if (direction === "up" || direction === "down") {
      const targetEl =
        this.gridEl.querySelector<HTMLElement>(
          `.fb-row[data-card-index="${this.carryCardIndex}"][data-drop-folder="${CSS.escape(this.carryTargetFolderPath || "")}"]`
        ) ||
        this.gridEl.querySelector<HTMLElement>(
          `.fb-card[data-card-index="${this.carryCardIndex}"] .fb-card-header`
        ) ||
        this.gridEl.querySelector<HTMLElement>(`.fb-card[data-card-index="${this.carryCardIndex}"]`);
      if (targetEl) {
        const r = targetEl.getBoundingClientRect();
        this.carryAnchorX = r.left;
        this.carryAnchorY = r.top + r.height / 2;
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
    this.carryAnchorX = null;
    this.carryAnchorY = null;
    this.renderCarryPill();

    this.focusedCardIndex = destCardIdx;
    void this.moveFiles(paths, dest);
  }

  private cancelCarryMode(): void {
    if (this.carryPaths.length === 0) return;
    this.carryPaths = [];
    this.carryTargetFolderPath = null;
    this.carryAnchorX = null;
    this.carryAnchorY = null;
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

  // [ID 6.5.52] 무깜박임 부분 카드 갱신(In-Place Patch) + 열림 전용 초경량 100ms GPU 슬라이드
  // -> 전체 gridEl.empty() 대신 변경된 카드 1개의 본문만 교체해 Baseline 테마 화살표 깜박임과 끊김을 0으로 줄이고,
  // -> 닫힐 때는 0ms 즉각 반응(▾ 화살표만 부드럽게 회전), 열릴 때만 리플로우 없는 GPU opacity+translateY(100ms)를 적용함.
  private playGpuReveal(el: HTMLElement | null, durationMs = 100): void {
    if (!el || typeof el.animate !== "function") return;
    el.animate(
      [
        { opacity: 0, transform: "translateY(-4px)" },
        { opacity: 1, transform: "translateY(0)" }
      ],
      { duration: durationMs, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
    );
  }

  private findRenderedDescendantRows(cardIdx: number, folderPath: string): HTMLElement[] {
    const prefix = `${folderPath}/`;
    const cardEl = this.gridEl.querySelector<HTMLElement>(`.fb-card[data-card-index="${cardIdx}"]`);
    if (!cardEl) return [];
    return Array.from(cardEl.querySelectorAll<HTMLElement>(".fb-row")).filter((el) => {
      const p = el.dataset.path || "";
      return p.startsWith(prefix);
    });
  }

  private patchCardInPlace(
    cardIdx: number,
    options: { animateBody?: boolean; animateSubfolderPath?: string; skipSync?: boolean } = {}
  ): void {
    const cardModel = this.renderedCards[cardIdx];
    const cardEl = this.gridEl.querySelector<HTMLElement>(`.fb-card[data-card-index="${cardIdx}"]`);
    if (!cardModel || !cardEl) {
      this.renderGridAndHeader();
      return;
    }

    const isFlowMode = this.plugin.settings.gridCols === "flow";
    const q = this.searchQuery.trim().toLowerCase();
    const isCollapsed = isFlowMode && !cardModel.isRootCard && !q && this.plugin.isFlowSectionCollapsed(cardModel.folderPath);
    cardModel.isCollapsedSection = isCollapsed;

    const folder = getFolderByPath(this.app, cardModel.folderPath);
    const nextItems: CardTreeItem[] = [];
    if (folder && !isCollapsed) {
      this.collectCardTreeItems(folder, 0, nextItems, !cardModel.isRootCard);
    }
    cardModel.items = nextItems;

    const prevBody = cardEl.querySelector<HTMLElement>(".fb-card-body");
    const prevScrollTop = prevBody ? prevBody.scrollTop : 0;
    prevBody?.remove();
    cardEl.querySelector(".fb-flow-scroll-footer")?.remove();

    cardEl.toggleClass("is-section-collapsed", isCollapsed);
    cardEl.querySelector(".fb-section-caret")?.toggleClass("is-collapsed", isCollapsed);
    if (!cardModel.isRootCard) {
      const hdrIcon = cardEl.querySelector<HTMLElement>(".fb-card-header .fb-native-icon");
      const hdrTitle = cardEl.querySelector<HTMLElement>(".fb-card-header .fb-card-title");
      if (hdrIcon && hdrTitle) {
        applyNativeDecoration(this.app, cardModel.folderPath, hdrIcon, hdrTitle, "folder", !isCollapsed);
      }
    }

    const isResizable = isFlowMode && !isCollapsed && cardModel.items.length > FLOW_SIZE_SM;
    const limit = isResizable ? this.getFlowWindowLimit(cardModel) : cardModel.items.length;
    const isScrollable = isResizable && cardModel.items.length > limit;
    if (isScrollable) cardEl.setAttribute("data-windowed", "true");
    else cardEl.removeAttribute("data-windowed");

    const countEl = cardEl.querySelector<HTMLElement>(".fb-count");
    if (countEl) {
      countEl.setText(this.formatFlowCountLabel(cardModel, isScrollable));
    }

    const isCarrying = this.carryPaths.length > 0;
    const newBody = this.renderCardBodyAndFooter(cardEl, cardModel, cardIdx, isCarrying, isFlowMode);
    if (newBody && prevScrollTop > 0) {
      newBody.scrollTop = prevScrollTop;
    }

    if (options.animateBody && newBody) {
      this.playGpuReveal(newBody, 105);
      const newFooter = cardEl.querySelector<HTMLElement>(".fb-flow-scroll-footer");
      if (newFooter && typeof newFooter.animate === "function") {
        newFooter.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 95, easing: "ease-out" });
      }
    } else if (options.animateSubfolderPath) {
      const descendants = this.findRenderedDescendantRows(cardIdx, options.animateSubfolderPath);
      for (const row of descendants) {
        this.playGpuReveal(row, 100);
      }
    }

    if (!options.skipSync) {
      this.syncFocusAndSelectionDOM();
      this.renderSelectionBar();
      if (isFlowMode) this.scheduleFlowColResizersSync();
    }
  }

  private toggleFlowSectionInPlace(cardIdx: number, folderPath: string): void {
    const willExpand = this.plugin.isFlowSectionCollapsed(folderPath);
    // 메모리 상태는 즉시 반영하고 디스크 저장은 백그라운드로 비동기 처리 (0ms UI 응답)
    void this.plugin.toggleFlowSectionCollapsed(folderPath);
    this.patchCardInPlace(cardIdx, { animateBody: willExpand });
  }

  private toggleInlineSubfolderInPlace(cardIdx: number, folderPath: string): void {
    const willExpand = !this.plugin.isFolderExpanded(folderPath);
    void this.plugin.toggleFolderExpanded(folderPath);
    this.patchCardInPlace(cardIdx, { animateSubfolderPath: willExpand ? folderPath : undefined });
  }

  // [ID 6.5.51] 포커스 레벨 맞춤형 [ / ] 접기·펼치기 (부분 카드 갱신으로 화살표 깜박임 0)
  // -> 직속 영역에 포커스가 있으면 보드 전체를 일괄 접기/펼치기하고,
  // -> 특정 폴더 카드나 하위 폴더 내부에 포커스가 있으면 해당 폴더 스코프의 하위 폴더들만 레벨에 맞게 접고 펼침.
  private setAllSubfoldersExpanded(expanded: boolean): void {
    const collectAllSubfolders = (folder: TFolder, out: string[]) => {
      for (const child of folder.children) {
        if (child instanceof TFolder) {
          const p = normalizeFolderRef(child);
          if (p) out.push(p);
          collectAllSubfolders(child, out);
        }
      }
    };

    const isFlowMode = this.plugin.settings.gridCols === "flow";
    const curCard = this.renderedCards[this.focusedCardIndex];

    // 1) 직속 영역(루트 카드) 포커스 시: 현재 보드 전체 일괄 접기/펼치기 (카드 헤더 유지한 채 본문만 패치)
    if (!curCard || curCard.isRootCard) {
      const folderPaths: string[] = [];
      const sectionPaths: string[] = [];
      const prevCollapsedIdx = new Set<number>();
      this.renderedCards.forEach((card, idx) => {
        if (card.isRootCard) return;
        sectionPaths.push(card.folderPath);
        if (card.isCollapsedSection) prevCollapsedIdx.add(idx);
        const folder = getFolderByPath(this.app, card.folderPath);
        if (folder) collectAllSubfolders(folder, folderPaths);
      });

      if (isFlowMode && sectionPaths.length > 0) {
        void this.plugin.setFlowSectionsCollapsedBatch(sectionPaths, !expanded);
      }
      if (folderPaths.length > 0) {
        void this.plugin.setFoldersExpandedBatch(folderPaths, expanded);
      }

      this.renderedCards.forEach((card, idx) => {
        if (card.isRootCard) return;
        this.patchCardInPlace(idx, {
          animateBody: expanded && isFlowMode && prevCollapsedIdx.has(idx),
          skipSync: true
        });
      });
      this.syncFocusAndSelectionDOM();
      this.renderSelectionBar();
      if (isFlowMode) this.scheduleFlowColResizersSync();
      return;
    }

    // 2) 특정 폴더 카드 또는 내부 하위 폴더 포커스 시: 해당 폴더 스코프만 레벨별 접기/펼치기
    const cardIdx = this.focusedCardIndex;
    const targetFolderPath = this.getFocusedTargetFolderPath();
    const targetFolder = getFolderByPath(this.app, targetFolderPath);
    const isCardRootScope = targetFolderPath === curCard.folderPath;
    const subfolders: string[] = [];
    if (targetFolder) {
      collectAllSubfolders(targetFolder, subfolders);
    }

    if (expanded) {
      const wasSectionCollapsed = isFlowMode && this.plugin.isFlowSectionCollapsed(curCard.folderPath);
      if (wasSectionCollapsed) {
        void this.plugin.setFlowSectionsCollapsedBatch([curCard.folderPath], false);
      }
      const toExpand = isCardRootScope ? subfolders : [targetFolderPath, ...subfolders];
      const hasNewlyExpanding = toExpand.some((p) => !this.plugin.isFolderExpanded(p));
      if (toExpand.length > 0) {
        void this.plugin.setFoldersExpandedBatch(toExpand, true);
      }
      this.patchCardInPlace(cardIdx, {
        animateBody: wasSectionCollapsed,
        animateSubfolderPath: !wasSectionCollapsed && hasNewlyExpanding ? targetFolderPath : undefined
      });
    } else {
      const hasExpandedDescendant = subfolders.some((p) => this.plugin.isFolderExpanded(p));
      if (hasExpandedDescendant) {
        void this.plugin.setFoldersExpandedBatch(subfolders, false);
      } else if (!isCardRootScope) {
        void this.plugin.setFoldersExpandedBatch([targetFolderPath], false);
        this.focusedItemKey = `folder:${targetFolderPath}`;
      } else if (isFlowMode) {
        void this.plugin.setFlowSectionsCollapsedBatch([curCard.folderPath], true);
        this.focusedItemKey = CARD_HEADER_KEY;
      }
      this.patchCardInPlace(cardIdx);
    }

    this.scrollFocusedIntoView();
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
    sourceKey: string,
    targetKey: string,
    position: "before" | "after"
  ): Promise<void> {
    const allCardKeys = this.renderedCards.map((c) => this.getCardOrderKey(c));
    const fromIdx = allCardKeys.indexOf(sourceKey);
    if (fromIdx === -1 || sourceKey === targetKey) return;

    allCardKeys.splice(fromIdx, 1);
    const targetIdx = allCardKeys.indexOf(targetKey);
    if (targetIdx === -1) return;

    const insertIdx = position === "before" ? targetIdx : targetIdx + 1;
    allCardKeys.splice(insertIdx, 0, sourceKey);

    await this.plugin.setFolderOrder(this.currentFolderPath, allCardKeys);
    this.renderAll();

    const newCardIdx = this.renderedCards.findIndex((c) => this.getCardOrderKey(c) === sourceKey);
    if (newCardIdx >= 0) {
      const movedCard = this.renderedCards[newCardIdx];
      if (movedCard.isRootCard && this.plugin.settings.gridCols === "flow" && newCardIdx === 0) {
        this.focusCardItem(newCardIdx, 0, { clearSelection: true, updatePreview: false });
      } else {
        this.focusCardHeader(newCardIdx);
      }
    }
  }

  private async shiftFolderCardOrder(delta: -1 | 1): Promise<void> {
    const curCard = this.renderedCards[this.focusedCardIndex];
    if (!curCard) return;

    const prevItemKey = this.focusedItemKey;
    const allCardKeys = this.renderedCards.map((c) => this.getCardOrderKey(c));
    const curKey = this.getCardOrderKey(curCard);
    const idx = allCardKeys.indexOf(curKey);
    if (idx === -1) return;
    const nextIdx = idx + delta;
    if (nextIdx < 0 || nextIdx >= allCardKeys.length) return;

    const [moved] = allCardKeys.splice(idx, 1);
    allCardKeys.splice(nextIdx, 0, moved);

    await this.plugin.setFolderOrder(this.currentFolderPath, allCardKeys);
    this.renderAll();

    const newCardIdx = this.renderedCards.findIndex((c) => this.getCardOrderKey(c) === moved);
    if (newCardIdx >= 0) {
      const movedCard = this.renderedCards[newCardIdx];
      if (movedCard.isRootCard) {
        if (prevItemKey && prevItemKey !== CARD_HEADER_KEY) {
          const itemIdx = movedCard.items.findIndex((it) => it.key === prevItemKey);
          this.focusCardItem(newCardIdx, itemIdx >= 0 ? itemIdx : 0, {
            clearSelection: true,
            updatePreview: false
          });
        } else if (this.plugin.settings.gridCols === "flow" && newCardIdx === 0) {
          this.focusCardItem(newCardIdx, 0, { clearSelection: true, updatePreview: false });
        } else {
          this.focusCardHeader(newCardIdx);
        }
      } else {
        this.focusCardHeader(newCardIdx);
      }
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
      if (!cardEl) {
        this.clearReorderHighlight();
        return;
      }
      const targetKey = cardEl.dataset.orderKey || "";
      if (!targetKey || targetKey === this.draggingCardPath) {
        this.clearReorderHighlight();
        return;
      }
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";

      const rect = cardEl.getBoundingClientRect();
      const isFlow = this.plugin.settings.gridCols === "flow";
      const pos: "before" | "after" = isFlow
        ? e.clientY < rect.top + rect.height / 2
          ? "before"
          : "after"
        : e.clientX < rect.left + rect.width / 2
          ? "before"
          : "after";
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
        const targetKey = targetEl.dataset.orderKey || "";
        if (targetKey && targetKey !== srcPath) {
          void this.applyFolderCardReorder(srcPath, targetKey, pos);
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

  // [ID 6.5.24] 2D 그리드 · 세로 · 여러줄 모드에서 동일 열의 바로 위·아래 카드/섹션 탐색
  // -> getBoundingClientRect() 화면 좌표를 사용해 flex 컬럼(.fb-flow-col)과 grid 양쪽에서 동일 열만 정확히 매칭함.
  private findVerticalNeighborCard(cardIdx: number, direction: "up" | "down"): number {
    if (this.plugin.settings.verticalEdgeBehavior !== "adaptive") return -1;
    if (this.plugin.settings.gridCols === "scroll") return -1;

    // 여러줄 연속 다단 모드에서는 폴더들이 끊김 없이 순차적으로 이어지므로 바로 다음/이전 폴더로 자연스럽게 연결
    if (this.plugin.settings.gridCols === "flow") {
      const next = cardIdx + (direction === "down" ? 1 : -1);
      return next >= 0 && next < this.renderedCards.length ? next : -1;
    }

    const cardEls = Array.from(this.gridEl.querySelectorAll<HTMLElement>(".fb-card"));
    const curEl = cardEls.find((el) => Number(el.dataset.cardIndex) === cardIdx);
    if (!curEl) return -1;

    const curRect = curEl.getBoundingClientRect();
    const threshold = 8;
    const sameColTolerance = 28;

    let bestIdx = -1;
    let bestRowDist = Infinity;

    for (const el of cardEls) {
      const idx = Number(el.dataset.cardIndex);
      if (idx === cardIdx) continue;
      const r = el.getBoundingClientRect();
      const dy = r.top - curRect.top;
      if (direction === "down" && dy <= threshold) continue;
      if (direction === "up" && dy >= -threshold) continue;

      const colDist = Math.abs(r.left - curRect.left);
      if (colDist > sameColTolerance) continue;

      const rowDist = Math.abs(dy);
      if (rowDist < bestRowDist) {
        bestRowDist = rowDist;
        bestIdx = idx;
      }
    }

    return bestIdx;
  }

  // [ID 6.5.40] 여러줄 모드(flow)에서 현재 포커스된 파일/헤더의 실제 화면 좌표(Y) 기준 옆 열 탐색
  // -> 같은 폴더 내에서도 상단 파일과 하단 파일 옆에 놓인 폴더가 다르므로, 카드 최상단이 아닌 현재 행 위치에서 수평 인접 항목·폴더를 찾음.
  private getActiveAnchorRect(): DOMRect | null {
    const el =
      (this.gridEl.querySelector(".fb-row.is-focused") as HTMLElement | null) ||
      (this.gridEl.querySelector(".fb-card-header.is-header-focused") as HTMLElement | null) ||
      this.gridEl.querySelector<HTMLElement>(`.fb-card[data-card-index="${this.focusedCardIndex}"]`);
    return el ? el.getBoundingClientRect() : null;
  }

  private findFlowHorizontalNavTarget(direction: "left" | "right"): { cardIdx: number; itemKey: string } | null {
    const anchor = this.getActiveAnchorRect();
    if (!anchor) return null;

    const curX = anchor.left;
    const curCenterY = anchor.top + anchor.height / 2;
    const colThreshold = 40;

    const nodes = Array.from(
      this.gridEl.querySelectorAll<HTMLElement>(".fb-row, .fb-card-header, .fb-empty-card")
    );
    const candidates: Array<{ cardIdx: number; itemKey: string; rect: DOMRect }> = [];
    for (const el of nodes) {
      const cardEl = el.closest<HTMLElement>(".fb-card");
      if (!cardEl) continue;
      const cardIdx = Number(cardEl.dataset.cardIndex);
      if (Number.isNaN(cardIdx)) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      const itemKey = el.classList.contains("fb-row") ? el.dataset.itemKey || "" : CARD_HEADER_KEY;
      candidates.push({ cardIdx, itemKey, rect });
    }

    let best: { cardIdx: number; itemKey: string } | null = null;
    let bestColDist = Infinity;
    let bestRowDist = Infinity;

    for (const c of candidates) {
      const dx = c.rect.left - curX;
      if (direction === "right" && dx <= colThreshold) continue;
      if (direction === "left" && dx >= -colThreshold) continue;

      const colDist = Math.abs(dx);
      const rowDist = Math.abs(c.rect.top + c.rect.height / 2 - curCenterY);
      if (
        colDist < bestColDist - colThreshold ||
        (Math.abs(colDist - bestColDist) <= colThreshold && rowDist < bestRowDist)
      ) {
        bestColDist = colDist;
        bestRowDist = rowDist;
        best = { cardIdx: c.cardIdx, itemKey: c.itemKey };
      }
    }

    if (best) return best;

    // 양쪽 끝 열에서 더 누르면 반대편 끝 열의 같은 높이 행으로 래핑
    let wrapBest: { cardIdx: number; itemKey: string } | null = null;
    let extremeX = direction === "right" ? Infinity : -Infinity;
    let wrapRowDist = Infinity;

    for (const c of candidates) {
      const isMoreExtreme =
        direction === "right" ? c.rect.left < extremeX - colThreshold : c.rect.left > extremeX + colThreshold;
      const isSameExtreme = Math.abs(c.rect.left - extremeX) <= colThreshold;
      const rowDist = Math.abs(c.rect.top + c.rect.height / 2 - curCenterY);
      if (isMoreExtreme || (isSameExtreme && rowDist < wrapRowDist)) {
        extremeX = c.rect.left;
        wrapRowDist = rowDist;
        wrapBest = { cardIdx: c.cardIdx, itemKey: c.itemKey };
      }
    }

    return wrapBest;
  }

  private findFlowHorizontalCarryTarget(
    direction: "left" | "right",
    anchorX: number,
    anchorY: number,
    excludeFolderPath: string | null
  ): { cardIdx: number; folderPath: string; rect: DOMRect } | null {
    const colThreshold = 40;
    const nodes = Array.from(
      this.gridEl.querySelectorAll<HTMLElement>(".fb-row, .fb-card-header, .fb-empty-card")
    );

    const candidates: Array<{ cardIdx: number; folderPath: string; rect: DOMRect }> = [];
    for (const el of nodes) {
      const cardEl = el.closest<HTMLElement>(".fb-card");
      if (!cardEl) continue;
      const cardIdx = Number(cardEl.dataset.cardIndex);
      const card = this.renderedCards[cardIdx];
      if (!card) continue;
      const folderPath = normalizeFolderStr(card.folderPath);
      if (this.isInvalidDropDest(folderPath, this.carryPaths)) continue;
      if (excludeFolderPath !== null && folderPath === excludeFolderPath) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      candidates.push({ cardIdx, folderPath, rect });
    }

    let best: { cardIdx: number; folderPath: string; rect: DOMRect } | null = null;
    let bestColDist = Infinity;
    let bestRowDist = Infinity;

    for (const c of candidates) {
      const dx = c.rect.left - anchorX;
      if (direction === "right" && dx <= colThreshold) continue;
      if (direction === "left" && dx >= -colThreshold) continue;

      const colDist = Math.abs(dx);
      const rowDist = Math.abs(c.rect.top + c.rect.height / 2 - anchorY);
      if (
        colDist < bestColDist - colThreshold ||
        (Math.abs(colDist - bestColDist) <= colThreshold && rowDist < bestRowDist)
      ) {
        bestColDist = colDist;
        bestRowDist = rowDist;
        best = c;
      }
    }

    if (best) return best;

    // 끝 열에서 반대편 끝 열의 가장 가까운 높이 폴더로 래핑
    let wrapBest: { cardIdx: number; folderPath: string; rect: DOMRect } | null = null;
    let extremeX = direction === "right" ? Infinity : -Infinity;
    let wrapRowDist = Infinity;

    for (const c of candidates) {
      const isMoreExtreme =
        direction === "right" ? c.rect.left < extremeX - colThreshold : c.rect.left > extremeX + colThreshold;
      const isSameExtreme = Math.abs(c.rect.left - extremeX) <= colThreshold;
      const rowDist = Math.abs(c.rect.top + c.rect.height / 2 - anchorY);
      if (isMoreExtreme || (isSameExtreme && rowDist < wrapRowDist)) {
        extremeX = c.rect.left;
        wrapRowDist = rowDist;
        wrapBest = c;
      }
    }

    return wrapBest;
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

    // ? (Shift+/): 단축키 치트시트 모달 열기
    if (!meta && !e.altKey && (e.key === "?" || (e.shiftKey && code === "Slash"))) {
      e.preventDefault();
      e.stopPropagation();
      this.openShortcutHelpModal();
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

    // Shift + 좌/우: 폴더 카드 헤더 포커스 또는 직속 카드 포커스 상태에서 카드 순서 좌우 이동
    const curFocusedCard = this.renderedCards[this.focusedCardIndex];
    if (
      e.shiftKey &&
      !meta &&
      !e.altKey &&
      (this.focusedItemKey === CARD_HEADER_KEY || Boolean(curFocusedCard?.isRootCard)) &&
      (e.key === "ArrowLeft" || e.key === "ArrowRight")
    ) {
      e.preventDefault();
      e.stopPropagation();
      void this.shiftFolderCardOrder(e.key === "ArrowRight" ? 1 : -1);
      return;
    }

    // 좌/우: 폴더 카드/섹션 간 이동 (여러줄 모드에서는 현재 포커스 파일의 세로 위치 바로 옆 항목·폴더로 직관 점프)
    if (!meta && !e.altKey && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
      e.preventDefault();
      e.stopPropagation();
      const dir = e.key === "ArrowRight" ? "right" : "left";
      if (this.plugin.settings.gridCols === "flow") {
        const spatial = this.findFlowHorizontalNavTarget(dir);
        if (spatial) {
          const targetCard = this.renderedCards[spatial.cardIdx];
          if (targetCard) {
            if (spatial.itemKey === CARD_HEADER_KEY) {
              if (!targetCard.isRootCard) {
                this.focusCardHeader(spatial.cardIdx);
              } else {
                this.focusCardItem(spatial.cardIdx, 0, { clearSelection: true, updatePreview: true });
              }
              return;
            }
            const itemIdx = targetCard.items.findIndex((it) => it.key === spatial.itemKey);
            this.focusCardItem(spatial.cardIdx, itemIdx >= 0 ? itemIdx : 0, {
              clearSelection: true,
              updatePreview: true
            });
            return;
          }
        }
      }
      const delta = dir === "right" ? 1 : -1;
      const nextIdx = (this.focusedCardIndex + delta + this.renderedCards.length) % this.renderedCards.length;
      const targetCard = this.renderedCards[nextIdx];
      const firstFileIdx = targetCard.items.findIndex((it) => it.type === "file");
      this.focusCardItem(nextIdx, firstFileIdx >= 0 ? firstFileIdx : 0, {
        clearSelection: true,
        updatePreview: true
      });
      return;
    }

    // [ID 6.5.18] 위/아래 이동 (모드 적응형: 위·아래 연결 카드가 있으면 이동, 최상단·최하단 끝에서는 순환하지 않고 안정적으로 멈춤)
    if (!meta && !e.altKey && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      e.stopPropagation();
      const { card, itemIndex } = this.findFocusedCardAndIndex();
      if (!card) return;

      const hasHeaderStop = !card.isRootCard || this.plugin.settings.gridCols !== "flow" || this.focusedCardIndex > 0;
      const onHeader = this.focusedItemKey === CARD_HEADER_KEY;
      const count = card.items.length;
      const shouldLoopAtEdge = this.plugin.settings.verticalEdgeBehavior === "loop";

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
          // 위쪽 연결 카드가 있으면 그 카드 최하단으로 이동, 최상단 끝에서는 loop 설정이 아닐 경우 제자리에 멈춤
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
          } else if (shouldLoopAtEdge) {
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
          // 아래쪽 연결 카드가 있으면 그 카드 헤더로 이동, 최하단 끝에서는 loop 설정이 아닐 경우 제자리에 멈춤
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
          } else if (shouldLoopAtEdge) {
            if (hasHeaderStop) {
              this.focusCardHeader(this.focusedCardIndex);
            } else {
              this.focusCardItem(this.focusedCardIndex, 0, {
                clearSelection: true,
                updatePreview: true
              });
            }
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

    // Space: 여러줄 모드 섹션 헤더면 섹션 접기/펼치기, 하위 폴더면 접기/펼치기, 파일이면 Quick Look 토글
    if (e.code === "Space") {
      e.preventDefault();
      e.stopPropagation();
      const { card, item } = this.findFocusedCardAndIndex();
      if (
        this.plugin.settings.gridCols === "flow" &&
        this.focusedItemKey === CARD_HEADER_KEY &&
        card &&
        !card.isRootCard
      ) {
        this.toggleFlowSectionInPlace(this.focusedCardIndex, card.folderPath);
        return;
      }
      if (item?.type === "folder") {
        this.toggleInlineSubfolderInPlace(this.focusedCardIndex, item.path);
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

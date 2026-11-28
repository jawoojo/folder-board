// [ID 6.5] 2D 네이티브 폴더 탐색기 워크스페이스 뷰 (FolderBoardView extends ItemView)
// -> 2/3/4열 그리드 + 세로 펼침(가로 스크롤) 모드, DOM 파괴 없는 인플레이스 포커스 갱신(테마 깜빡임 방지),
// -> 예비 포커싱(밝은 테두리) + Shift 다중 선택 + Cmd+방향키 들고 이동(키 떼면 드롭)을 구현함.
import {
  EventRef,
  ItemView,
  MarkdownView,
  Menu,
  Notice,
  Scope,
  TAbstractFile,
  TFile,
  TFolder,
  WorkspaceLeaf,
  getIcon,
  normalizePath,
  setIcon
} from "obsidian";
import { i18n } from "./i18n";
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
const FLOW_MAX_DRAG_ROWS = 200;
const FLOW_COL_GAP = 24;
const FLOW_CANVAS_PAD_LEFT = 14;
const FLOW_COL_MIN_WIDTH = 180;
const FLOW_COL_MAX_WIDTH = 560;
const GRID_GAP = 10;
const GRID_CANVAS_PAD_X = 28;
const GRID_CANVAS_PAD_Y = 24;
const GRID_MIN_COLS = 1;
const GRID_MAX_COLS = 6;
const GRID_CARD_MIN_WIDTH = 160;
const GRID_CARD_MIN_HEIGHT = 150;
const GRID_ROW_UNITS_TOTAL = 12;
const GRID_ROW_SNAP_UNITS = [3, 4, 6, 8, 9, 12] as const;
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
  private folderSortBtnEl!: HTMLButtonElement;
  private newNoteBtnEl!: HTMLButtonElement;
  private newFolderBtnEl!: HTMLButtonElement;
  private sidebarAutoCollapseBtnEl!: HTMLButtonElement;
  private pinBtnEl!: HTMLButtonElement;
  private qlBtnEl!: HTMLButtonElement;
  private bookmarkBtnEl!: HTMLButtonElement;
  private settingsBtnEl!: HTMLButtonElement;
  private canvasEl!: HTMLElement;
  private gridEl!: HTMLElement;
  private colResizersEl!: HTMLElement;
  private flowVertIndicatorEl!: HTMLElement;
  private shelfEl!: HTMLElement;
  private shelfListEl!: HTMLElement;
  private shelfDropHereBtn!: HTMLButtonElement;
  private selectionBarEl!: HTMLElement;
  private selectionCountEl!: HTMLElement;
  private carryPillEl!: HTMLElement;

  private vaultRefs: EventRef[] = [];
  private resizeObserver: ResizeObserver | null = null;
  private flowResizerRaf: number | null = null;
  private flowWheelRaf: number | null = null;
  private flowWheelPendingCards = new Set<number>();
  private flowVertFadeTimer: number | null = null;
  private flowVertActiveCardIdx: number | null = null;
  private flowVertLastColX: number | null = null;
  private hScrollFadeTimer: number | null = null;
  private resizeBadgeEl: HTMLElement | null = null;
  private lastCanvasHeight = 0;
  // [ID 6.5.32] 뷰 전용 Obsidian Scope -> 옵시디언 글로벌 Cmd+F/A/D 단축키보다 우선해 보드 활성 시 안전하게 가로챔
  private viewScope: Scope | null = null;
  private scopeActive = false;
  private boundKeydown: (e: KeyboardEvent) => void;
  private boundQuickEditEscKeydown: (e: KeyboardEvent) => void;
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
    this.boundQuickEditEscKeydown = this.handleQuickEditEscKeydown.bind(this);
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
    this.pinBtnEl.setAttr("aria-label", pinned ? i18n.pinTabOnAria() : i18n.pinTabOffAria());
  }

  syncSidebarCollapseButtonState(): void {
    if (!this.sidebarAutoCollapseBtnEl) return;
    const enabled = this.plugin.settings.autoCollapseLeftSidebar;
    this.sidebarAutoCollapseBtnEl.toggleClass("is-active", enabled);
    this.sidebarAutoCollapseBtnEl.setAttr(
      "aria-label",
      enabled ? i18n.autoCollapseSidebarOnAria() : i18n.autoCollapseSidebarOffAria()
    );
  }

  // [ID 6.5.70] 언어 설정 변경 시 상단 고정 툴바·검색창·바구니 라벨 즉시 동기화
  syncLocaleLabels(): void {
    this.backBtnEl?.setAttr("aria-label", i18n.parentFolderAria());
    if (this.searchInputEl) this.searchInputEl.placeholder = i18n.searchPlaceholder();
    this.clearSearchEl?.setAttr("aria-label", i18n.clearSearchAria());
    for (const { value, el } of this.layoutBtns) {
      el.setAttr(
        "aria-label",
        value === "flow"
          ? i18n.layoutFlowAria()
          : value === "vertical"
            ? i18n.layoutVerticalAria()
            : i18n.layoutHorizontalAria()
      );
    }
    this.folderSortBtnEl?.setAttr("aria-label", i18n.folderSortAria());
    this.qlBtnEl?.setAttr("aria-label", i18n.quickEditAria());
    this.bookmarkBtnEl?.setAttr("aria-label", i18n.bookmarksAria());
    this.settingsBtnEl?.setAttr("aria-label", i18n.settingsAria());
    if (this.shelfDropHereBtn) this.shelfDropHereBtn.setText(i18n.move());
    this.shelfEl?.querySelector<HTMLElement>(".fb-shelf-actions .fb-tool-btn")?.setAttr("aria-label", i18n.clearShelfAria());
    const selShelf = this.selectionBarEl?.querySelector<HTMLElement>(".fb-selection-btn");
    if (selShelf) selShelf.setText(i18n.shelf());
    this.selectionBarEl?.querySelector<HTMLElement>(".fb-tool-btn")?.setAttr("aria-label", i18n.clearSelectionAria());
    this.renderBreadcrumb();
    this.updateToolbarStates();
    this.renderShelf();
    this.renderSelectionBar();
    this.renderCarryPill();
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
    window.removeEventListener("keydown", this.boundQuickEditEscKeydown, true);
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
    if (this.flowWheelRaf !== null) {
      window.cancelAnimationFrame(this.flowWheelRaf);
      this.flowWheelRaf = null;
    }
    this.flowWheelPendingCards.clear();
    if (this.flowVertFadeTimer !== null) {
      window.clearTimeout(this.flowVertFadeTimer);
      this.flowVertFadeTimer = null;
    }
    if (this.hScrollFadeTimer !== null) {
      window.clearTimeout(this.hScrollFadeTimer);
      this.hScrollFadeTimer = null;
    }
    this.hideResizeBadge();
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
      attr: { "aria-label": i18n.parentFolderAria() }
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
      placeholder: i18n.searchPlaceholder()
    });
    this.clearSearchEl = searchWrap.createDiv({
      cls: "search-input-clear-button is-hidden",
      attr: { "aria-label": i18n.clearSearchAria() }
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

    // [ID 6.5.12] 3대 레이아웃 세그먼트 (Flow 기본 최좌측 · Vertical 세로 스크롤 · Horizontal 가로 스크롤)
    const colGroup = controls.createDiv({ cls: "fb-segmented" });
    const layoutOptions: Array<{ value: LayoutColumns; label: string; aria: string; icon?: string }> = [
      { value: "flow", label: "", aria: i18n.layoutFlowAria(), icon: "list-tree" },
      { value: "vertical", label: "", aria: i18n.layoutVerticalAria(), icon: "layout-grid" },
      { value: "horizontal", label: "", aria: i18n.layoutHorizontalAria(), icon: "columns" }
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

    // 파일 정렬 토글
    this.sortBtnEl = controls.createEl("button", { cls: "clickable-icon fb-tool-btn" });
    this.sortBtnEl.addEventListener("click", async () => {
      this.plugin.settings.sortBy = this.plugin.settings.sortBy === "name" ? "mtime" : "name";
      await this.plugin.saveSettings();
      this.renderGridAndHeader();
    });

    // [ID 6.5.66] 현재 레이아웃 모드 폴더 순서 1회 정렬 버튼 (고정 없음 · 정렬 직후 자유 드래그 가능)
    this.folderSortBtnEl = controls.createEl("button", {
      cls: "clickable-icon fb-tool-btn",
      attr: { "aria-label": i18n.folderSortAria() }
    });
    setIcon(
      this.folderSortBtnEl,
      this.pickAvailableIcon(["arrow-down-az", "arrow-down-a-z", "arrow-up-narrow-wide", "sort-asc", "list-ordered"])
    );
    this.folderSortBtnEl.addEventListener("click", () => {
      this.openFolderSortMenu(this.folderSortBtnEl);
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

    // [ID 6.5.62] 보드 상단 좌측 패널 자동 접기 토글 (설정 탭과 양방향 동기화)
    this.sidebarAutoCollapseBtnEl = controls.createEl("button", {
      cls: "clickable-icon fb-tool-btn",
      attr: { "aria-label": i18n.autoCollapseSidebarAria() }
    });
    setIcon(this.sidebarAutoCollapseBtnEl, "panel-left-close");
    this.sidebarAutoCollapseBtnEl.addEventListener("click", () => {
      void this.plugin.setAutoCollapseLeftSidebar(!this.plugin.settings.autoCollapseLeftSidebar);
    });

    // [ID 6.5.61] 보드 상단 원클릭 탭 고정(Pin) 토글 -> 설정 탭에 가지 않고 즉시 고정/해제 및 설정 기억
    this.pinBtnEl = controls.createEl("button", {
      cls: "clickable-icon fb-tool-btn",
      attr: { "aria-label": i18n.pinTabAria() }
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
      attr: { "aria-label": i18n.quickEditAria() }
    });
    setIcon(this.qlBtnEl, "panel-right");
    this.qlBtnEl.addEventListener("click", () => {
      this.quickLookOpen = !this.quickLookOpen;
      void this.updateQuickLook();
      this.updateToolbarStates();
    });

    controls.createDiv({ cls: "fb-divider" });

    // [ID 6.5.72] 좌측 패널 접힘 상태에서도 탐색기를 열지 않고 바로 쓰는 북마크 드롭다운 · 옵시디언 설정 버튼
    this.bookmarkBtnEl = controls.createEl("button", {
      cls: "clickable-icon fb-tool-btn",
      attr: { "aria-label": i18n.bookmarksAria() }
    });
    setIcon(this.bookmarkBtnEl, "bookmark");
    this.bookmarkBtnEl.addEventListener("click", () => {
      this.openBookmarksMenu(this.bookmarkBtnEl);
    });

    this.settingsBtnEl = controls.createEl("button", {
      cls: "clickable-icon fb-tool-btn",
      attr: { "aria-label": i18n.settingsAria() }
    });
    setIcon(this.settingsBtnEl, "settings");
    this.settingsBtnEl.addEventListener("click", (e: MouseEvent) => {
      this.openObsidianSettings(e.metaKey || e.ctrlKey);
    });
    this.settingsBtnEl.addEventListener("contextmenu", (e: MouseEvent) => {
      e.preventDefault();
      this.openObsidianSettings(true);
    });

    // 메인 바디
    const body = this.shellEl.createDiv({ cls: "fb-body" });
    this.canvasEl = body.createDiv({ cls: "fb-canvas" });
    this.gridEl = this.canvasEl.createDiv({ cls: "fb-grid" });
    this.colResizersEl = this.canvasEl.createDiv({ cls: "fb-col-resizers" });
    this.flowVertIndicatorEl = this.canvasEl.createDiv({ cls: "fb-flow-vscroll-indicator" });

    // [ID 6.5.68] 가로 스크롤 중일 때만 상시 예약된 7px 초슬림 스크롤바 썸을 은은하게 표시
    this.canvasEl.addEventListener(
      "scroll",
      () => {
        if (!this.canvasEl.hasClass("is-horizontal-scroll")) return;
        this.canvasEl.addClass("is-hscrolling");
        if (this.hScrollFadeTimer !== null) window.clearTimeout(this.hScrollFadeTimer);
        this.hScrollFadeTimer = window.setTimeout(() => {
          this.hScrollFadeTimer = null;
          this.canvasEl?.removeClass("is-hscrolling");
        }, 800);
      },
      { passive: true }
    );

    // [ID 6.5.19] 창 크기 변경 시 Vertical/Horizontal 12분할 행 높이·열 폭·리사이즈 핸들 및 Flow 다단 동기화
    this.resizeObserver = new ResizeObserver(() => {
      if (this.renderedCards.length === 0) return;
      const mode = this.plugin.settings.gridCols;
      if (mode === "vertical" || mode === "horizontal") {
        this.applyGridLayoutClasses(this.renderedCards.length);
        this.syncCardRowSpansInPlace();
        this.scheduleFlowColResizersSync();
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

    // Horizontal 및 Flow 모드에서 세로 휠을 가로 스크롤로 자연스럽게 연결
    // -> 카드 내부가 실제로 세로 스크롤 가능한 경우에만 카드 내부 스크롤을 우선하고, 아니면 가로 스크롤함.
    this.canvasEl.addEventListener(
      "wheel",
      (e: WheelEvent) => {
        const mode = this.plugin.settings.gridCols;
        if (mode !== "horizontal" && mode !== "flow") return;
        const target = e.target as HTMLElement | null;
        if (mode === "horizontal") {
          const cardBody = target?.closest<HTMLElement>(".fb-card-body");
          if (cardBody && cardBody.scrollHeight > cardBody.clientHeight + 1) return;
        }
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
      text: i18n.move()
    });
    this.shelfDropHereBtn.addEventListener("click", () => {
      const target = this.getFocusedTargetFolderPath();
      void this.moveFiles(this.shelfPaths, target);
    });

    const shelfClearBtn = shelfActions.createEl("button", {
      cls: "clickable-icon fb-tool-btn",
      attr: { "aria-label": i18n.clearShelfAria() }
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
      text: i18n.shelf()
    });
    selShelfBtn.addEventListener("click", () => {
      this.addPathsToShelf([...this.selectedPaths]);
    });

    const selClearBtn = this.selectionBarEl.createEl("button", {
      cls: "clickable-icon fb-tool-btn",
      attr: { "aria-label": i18n.clearSelectionAria() }
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
    window.addEventListener("keydown", this.boundQuickEditEscKeydown, true);
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

    // [ID 6.5.30] 현재 레이아웃 모드별 독립 폴더 카드 순서 우선 적용 (미지정 신규 폴더는 뒤쪽에 이름순 배치)
    const customOrder = this.plugin.getFolderOrder(this.plugin.settings.gridCols, normalizeFolderRef(folder));
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

    // [ID 6.5.58] 직속 카드 포함 현재 레이아웃 모드별 독립 카드 순서 반영
    const customOrder = this.plugin.getFolderOrder(this.plugin.settings.gridCols, normalizeFolderRef(currentFolder));
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
    this.newNoteBtnEl.setAttr("aria-label", i18n.newNoteAria(targetLabel));
    this.newFolderBtnEl.setAttr("aria-label", i18n.newFolderAria(targetLabel));
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
    this.sortBtnEl.setAttr(
      "aria-label",
      s.sortBy === "name" ? i18n.fileSortNameAria() : i18n.fileSortMtimeAria()
    );

    this.updateActionTooltipsOnly();
    this.syncSidebarCollapseButtonState();
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
      const isVaultRoot = idx === 0;

      // [ID 6.5.72] 볼트 이름에 네이티브 볼트 전환기 통합 -> 루트에서는 볼트명 클릭, 하위 폴더에서는 우측 ⌄ 클릭으로 즉시 볼트 전환
      if (isVaultRoot && isLast) {
        const btn = this.breadcrumbEl.createEl("button", {
          cls: "clickable-icon fb-crumb-btn is-current is-vault-root",
          attr: {
            "data-drop-folder": seg.path,
            "aria-label": i18n.vaultSwitcherAria()
          }
        });
        btn.createSpan({ text: seg.name });
        const caret = btn.createSpan({ cls: "fb-vault-caret" });
        setIcon(caret, "chevron-down");
        btn.addEventListener("click", () => this.openVaultSwitcher());
        return;
      }

      const btn = this.breadcrumbEl.createEl("button", {
        cls: "clickable-icon fb-crumb-btn" + (isLast ? " is-current" : ""),
        text: seg.name,
        attr: { "data-drop-folder": seg.path }
      });
      if (!isLast) {
        btn.addEventListener("click", () => this.navigateToFolder(seg.path));
      }

      if (isVaultRoot && !isLast) {
        const caretBtn = this.breadcrumbEl.createEl("button", {
          cls: "clickable-icon fb-vault-caret-btn",
          attr: { "aria-label": i18n.vaultSwitcherAria() }
        });
        setIcon(caretBtn, "chevron-down");
        caretBtn.addEventListener("click", (e: MouseEvent) => {
          e.stopPropagation();
          this.openVaultSwitcher();
        });
      }
    });
  }

  // [ID 6.5.72] 네이티브 볼트 전환기 · 옵시디언 설정 · 코어 북마크 드롭다운 실행기
  private executeObsidianCommand(commandId: string): boolean {
    const cmds = (
      this.app as unknown as {
        commands?: { executeCommandById?: (id: string) => boolean };
      }
    ).commands;
    return Boolean(cmds?.executeCommandById?.(commandId));
  }

  private openVaultSwitcher(): void {
    this.executeObsidianCommand("app:open-vault");
  }

  private openObsidianSettings(openPluginTab = false): void {
    const settingApi = (
      this.app as unknown as {
        setting?: { open?: () => void; openTabById?: (id: string) => void };
      }
    ).setting;
    if (settingApi?.open) {
      settingApi.open();
      if (openPluginTab && settingApi.openTabById) {
        settingApi.openTabById(this.plugin.manifest.id);
      }
      return;
    }
    this.executeObsidianCommand("app:open-settings");
  }

  private openBookmarksMenu(anchorEl: HTMLElement): void {
    interface ObsidianBookmarkItem {
      type?: string;
      title?: string;
      path?: string;
      subpath?: string;
      query?: string;
      url?: string;
      items?: ObsidianBookmarkItem[];
    }
    interface BookmarksPluginLike {
      enabled?: boolean;
      instance?: {
        items?: ObsidianBookmarkItem[];
        openBookmark?: (item: ObsidianBookmarkItem, newLeaf?: boolean) => void;
      };
    }

    const bookmarksPlugin = (
      this.app as unknown as {
        internalPlugins?: { plugins?: { bookmarks?: BookmarksPluginLike } };
      }
    ).internalPlugins?.plugins?.bookmarks;

    const menu = new Menu();
    const enabled = Boolean(bookmarksPlugin?.enabled);
    const instance = bookmarksPlugin?.instance;
    const rawItems = enabled && Array.isArray(instance?.items) ? instance!.items! : [];

    let addedCount = 0;

    const appendItems = (items: ObsidianBookmarkItem[], depth: number) => {
      const indent = depth > 0 ? "　".repeat(Math.min(depth, 3)) : "";
      for (const bm of items) {
        if (bm.type === "group") {
          const groupTitle = bm.title || "Group";
          menu.addItem((mi) =>
            mi
              .setTitle(`${indent}▸ ${groupTitle}`)
              .setIcon("bookmark")
              .setDisabled(true)
          );
          if (Array.isArray(bm.items) && bm.items.length > 0) {
            appendItems(bm.items, depth + 1);
          }
          continue;
        }

        if (bm.type === "folder" && bm.path) {
          const folderPath = normalizeFolderStr(bm.path);
          const fallbackName = folderPath.split("/").pop() || this.app.vault.getName();
          const label = bm.title || fallbackName;
          addedCount++;
          menu.addItem((mi) =>
            mi
              .setTitle(`${indent}${label}`)
              .setIcon("folder")
              .onClick(() => {
                this.navigateToFolder(folderPath);
              })
          );
          continue;
        }

        if (bm.type === "file" && bm.path) {
          const filePath = bm.path;
          const file = getFileByPath(this.app, filePath);
          const fallbackName = file
            ? file.extension === "md"
              ? file.basename
              : file.name
            : filePath.split("/").pop() || filePath;
          const label = bm.title || (bm.subpath ? `${fallbackName}${bm.subpath}` : fallbackName);
          addedCount++;
          menu.addItem((mi) =>
            mi
              .setTitle(`${indent}${label}`)
              .setIcon("file-text")
              .onClick(() => {
                if (bm.subpath && instance?.openBookmark) {
                  instance.openBookmark(bm, false);
                } else if (file) {
                  void this.openFile(file, false);
                } else if (instance?.openBookmark) {
                  instance.openBookmark(bm, false);
                }
              })
          );
          continue;
        }

        if (bm.type === "search" || bm.type === "graph" || bm.type === "url") {
          const label = bm.title || bm.query || bm.url || bm.type;
          const icon = bm.type === "search" ? "search" : bm.type === "graph" ? "git-fork" : "globe";
          addedCount++;
          menu.addItem((mi) =>
            mi
              .setTitle(`${indent}${label}`)
              .setIcon(icon)
              .onClick(() => {
                instance?.openBookmark?.(bm, false);
              })
          );
        }
      }
    };

    if (!enabled) {
      menu.addItem((mi) => mi.setTitle(i18n.bookmarksDisabled()).setDisabled(true));
    } else if (rawItems.length === 0) {
      menu.addItem((mi) => mi.setTitle(i18n.bookmarksEmpty()).setDisabled(true));
    } else {
      appendItems(rawItems, 0);
      if (addedCount === 0) {
        menu.addItem((mi) => mi.setTitle(i18n.bookmarksEmpty()).setDisabled(true));
      }
    }

    if (enabled) {
      menu.addSeparator();
      menu.addItem((mi) =>
        mi
          .setTitle(i18n.openBookmarksPane())
          .setIcon("bookmark")
          .onClick(() => {
            this.executeObsidianCommand("bookmarks:open");
          })
      );
    }

    const rect = anchorEl.getBoundingClientRect();
    menu.showAtPosition({ x: Math.round(rect.left), y: Math.round(rect.bottom + 4) });
  }

  private clampFlowColWidth(width: number): number {
    return Math.max(FLOW_COL_MIN_WIDTH, Math.min(Math.round(width), FLOW_COL_MAX_WIDTH));
  }

  // [ID 6.5.64] Vertical/Horizontal 공용 12분할 카드 그리드 계산 · 드래그 리사이즈 · 플로팅 배지
  // -> 가로 폭은 1~6열 분할(최소 160px), 세로 높이는 12단위 화면 분수(1/4~전체, 최소 150px)로 통일하고
  // -> Vertical과 Horizontal은 넘쳤을 때 스크롤 방향(세로 vs 가로)만 다르게 동작하도록 일원화함.
  private getCardGridColsSetting(): number {
    const raw =
      this.plugin.settings.gridCols === "horizontal"
        ? this.plugin.settings.horizontalCols
        : this.plugin.settings.verticalCols;
    return Math.max(GRID_MIN_COLS, Math.min(GRID_MAX_COLS, Math.round(raw || 3)));
  }

  private setCardGridColsSetting(cols: number): void {
    const clamped = Math.max(GRID_MIN_COLS, Math.min(GRID_MAX_COLS, Math.round(cols)));
    if (this.plugin.settings.gridCols === "horizontal") {
      this.plugin.settings.horizontalCols = clamped;
    } else {
      this.plugin.settings.verticalCols = clamped;
    }
  }

  private getCardGridAvailWidth(): number {
    return Math.max(GRID_CARD_MIN_WIDTH, (this.canvasEl?.clientWidth || 960) - GRID_CANVAS_PAD_X);
  }

  private getCardGridAvailHeight(): number {
    return Math.max(320, (this.canvasEl?.clientHeight || 680) - GRID_CANVAS_PAD_Y);
  }

  private getCardGridMaxCols(availW: number): number {
    return Math.min(
      GRID_MAX_COLS,
      Math.max(GRID_MIN_COLS, Math.floor((availW + GRID_GAP) / (GRID_CARD_MIN_WIDTH + GRID_GAP)))
    );
  }

  private getEffectiveCardGridCols(availW: number): number {
    const pref = this.getCardGridColsSetting();
    return Math.max(GRID_MIN_COLS, Math.min(pref, this.getCardGridMaxCols(availW)));
  }

  private computeUnitRowHeight(availH: number): number {
    return Math.max(12, (availH - (GRID_ROW_UNITS_TOTAL - 1) * GRID_GAP) / GRID_ROW_UNITS_TOTAL);
  }

  private getCardHeightForUnits(units: number, unitRowH: number): number {
    return units * unitRowH + (units - 1) * GRID_GAP;
  }

  private getAllowedCardRowUnits(availH: number): number[] {
    const unitRowH = this.computeUnitRowHeight(availH);
    const allowed = GRID_ROW_SNAP_UNITS.filter(
      (u) => this.getCardHeightForUnits(u, unitRowH) >= GRID_CARD_MIN_HEIGHT
    );
    return allowed.length > 0 ? [...allowed] : [GRID_ROW_UNITS_TOTAL];
  }

  private getActiveCardGridMode(): "vertical" | "horizontal" {
    return this.plugin.settings.gridCols === "horizontal" ? "horizontal" : "vertical";
  }

  private resolveCardRowUnits(cardKey: string, cardCount: number): number {
    const availH = this.getCardGridAvailHeight();
    const allowed = this.getAllowedCardRowUnits(availH);
    const saved = this.plugin.getCardRowUnits(this.getActiveCardGridMode(), cardKey);
    if (saved !== null) {
      const match = allowed.find((u) => u >= saved);
      return match ?? allowed[allowed.length - 1];
    }
    const effectiveCols = this.getEffectiveCardGridCols(this.getCardGridAvailWidth());
    const target = cardCount <= effectiveCols ? GRID_ROW_UNITS_TOTAL : 6;
    const match = allowed.find((u) => u >= target);
    return match ?? allowed[allowed.length - 1];
  }

  private formatCardRowUnitsLabel(units: number): string {
    return i18n.cardRowUnitsLabel(units);
  }

  private showResizeBadge(text: string, clientX: number, clientY: number): void {
    if (!this.resizeBadgeEl) {
      this.resizeBadgeEl = document.body.createDiv({ cls: "fb-resize-badge" });
    }
    this.resizeBadgeEl.textContent = text;
    this.resizeBadgeEl.style.left = `${Math.round(clientX + 14)}px`;
    this.resizeBadgeEl.style.top = `${Math.round(clientY - 26)}px`;
  }

  private hideResizeBadge(): void {
    if (this.resizeBadgeEl) {
      this.resizeBadgeEl.remove();
      this.resizeBadgeEl = null;
    }
  }

  private syncCardRowSpansInPlace(): void {
    if (this.plugin.settings.gridCols === "flow") return;
    const cardCount = this.renderedCards.length;
    this.gridEl.querySelectorAll<HTMLElement>(".fb-card").forEach((cardEl) => {
      const cardKey = cardEl.dataset.orderKey;
      if (!cardKey) return;
      const units = this.resolveCardRowUnits(cardKey, cardCount);
      cardEl.style.setProperty("--fb-card-row-span", String(units));
    });
  }

  private applyGridLayoutClasses(cardCount: number): void {
    const prefLayout = this.plugin.settings.gridCols;
    const isHorizontalCanvas = prefLayout === "horizontal" || prefLayout === "flow";
    this.canvasEl.toggleClass("is-horizontal-scroll", isHorizontalCanvas);

    if (prefLayout === "flow") {
      const colW = this.clampFlowColWidth(this.plugin.settings.flowColumnWidth);
      this.gridEl.style.setProperty("--fb-flow-col-width", `${colW}px`);
      this.gridEl.style.removeProperty("--fb-grid-cols");
      this.gridEl.style.removeProperty("--fb-grid-col-w");
      this.gridEl.style.removeProperty("--fb-unit-row-h");
      this.gridEl.className = cardCount === 0 ? "fb-grid fb-layout-flow is-empty" : "fb-grid fb-layout-flow";
      return;
    }

    this.gridEl.style.removeProperty("--fb-flow-col-width");
    const availW = this.getCardGridAvailWidth();
    const availH = this.getCardGridAvailHeight();
    const effectiveCols = this.getEffectiveCardGridCols(availW);
    const unitRowH = this.computeUnitRowHeight(availH);
    const colW = Math.max(GRID_CARD_MIN_WIDTH, (availW - (effectiveCols - 1) * GRID_GAP) / effectiveCols);

    this.gridEl.style.setProperty("--fb-grid-cols", String(effectiveCols));
    this.gridEl.style.setProperty("--fb-grid-col-w", `${colW.toFixed(2)}px`);
    this.gridEl.style.setProperty("--fb-unit-row-h", `${unitRowH.toFixed(3)}px`);

    if (prefLayout === "horizontal") {
      this.gridEl.className = "fb-grid fb-layout-horizontal";
    } else {
      this.gridEl.className = "fb-grid fb-layout-vertical";
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
    this.hideFlowVertIndicator();
    this.gridEl.empty();
    this.applyGridLayoutClasses(cards.length);

    if (cards.length === 0) {
      this.gridEl.createDiv({ cls: "fb-empty-grid", text: i18n.noMatches() });
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
    }
    this.scheduleFlowColResizersSync();
  }

  // [ID 6.5.46] Flow 다단 너비 조절 바 + Vertical/Horizontal 열 분할 드래그 바 통합 동기화
  // -> 열 사이 여백에만 투명 히트존을 배치해 카드 스크롤바와 겹치지 않고,
  // -> Flow는 픽셀 단위 폭, Vertical/Horizontal은 1~6열 분할 스냅 + 플로팅 배지로 직관 조절함.
  private scheduleFlowColResizersSync(): void {
    if (this.flowResizerRaf !== null) {
      window.cancelAnimationFrame(this.flowResizerRaf);
    }
    this.flowResizerRaf = window.requestAnimationFrame(() => {
      this.flowResizerRaf = null;
      if (this.plugin.settings.gridCols === "flow") {
        this.syncFlowColResizers();
      } else {
        this.syncCardGridColResizers();
      }
    });
  }

  private positionCardGridColResizer(handleEl: HTMLElement, colIndex: number, colWidth: number): void {
    const gapCenter = FLOW_CANVAS_PAD_LEFT + colIndex * colWidth + (colIndex - 1) * GRID_GAP + GRID_GAP / 2;
    handleEl.style.left = `${Math.round(gapCenter - 7)}px`;
  }

  private syncCardGridColResizers(): void {
    if (!this.colResizersEl) return;
    this.colResizersEl.empty();
    const mode = this.plugin.settings.gridCols;
    if ((mode !== "vertical" && mode !== "horizontal") || this.renderedCards.length === 0) return;

    const availW = this.getCardGridAvailWidth();
    const effectiveCols = this.getEffectiveCardGridCols(availW);
    const colW = Math.max(GRID_CARD_MIN_WIDTH, (availW - (effectiveCols - 1) * GRID_GAP) / effectiveCols);
    const gridRect = this.gridEl.getBoundingClientRect();

    let numCols = effectiveCols;
    if (mode === "horizontal") {
      let maxRight = gridRect.left + colW;
      this.gridEl.querySelectorAll<HTMLElement>(".fb-card").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.right > maxRight) maxRight = r.right;
      });
      const totalSpan = Math.max(colW, maxRight - gridRect.left);
      numCols = Math.max(1, Math.round((totalSpan + GRID_GAP) / (colW + GRID_GAP)));
    } else {
      numCols = Math.max(1, Math.min(effectiveCols, this.renderedCards.length));
    }

    // 세로 스크롤 모드에서는 colResizersEl 높이를 그리드 전체 높이에 맞춰 아래쪽 카드 사이도 드래그 가능하게 함
    const targetH = Math.max(this.canvasEl.clientHeight, this.gridEl.scrollHeight + GRID_CANVAS_PAD_Y);
    this.colResizersEl.style.height = `${Math.round(targetH)}px`;

    for (let k = 1; k <= numCols; k++) {
      const handle = this.colResizersEl.createDiv({
        cls: "fb-col-resizer",
        attr: {
          "data-col-index": String(k),
          "aria-label": i18n.colResizeAria()
        }
      });
      this.positionCardGridColResizer(handle, k, colW);

      handle.addEventListener("pointerdown", (e: PointerEvent) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startAvailW = this.getCardGridAvailWidth();
        const maxCols = this.getCardGridMaxCols(startAvailW);
        const startCols = this.getEffectiveCardGridCols(startAvailW);
        const startColW = Math.max(
          GRID_CARD_MIN_WIDTH,
          (startAvailW - (startCols - 1) * GRID_GAP) / startCols
        );
        const handleLeft = FLOW_CANVAS_PAD_LEFT + k * startColW + (k - 1) * GRID_GAP;
        const visualK = Math.max(
          1,
          Math.min(3, Math.round((handleLeft - this.canvasEl.scrollLeft) / (startColW + GRID_GAP)))
        );

        let latestCols = startCols;
        handle.addClass("is-dragging");
        document.body.style.cursor = "col-resize";
        this.showResizeBadge(i18n.colSplitBadge(latestCols), e.clientX, e.clientY);

        const allHandles = Array.from(this.colResizersEl.querySelectorAll<HTMLElement>(".fb-col-resizer"));

        const onMove = (ev: PointerEvent) => {
          const dx = ev.clientX - startX;
          const desiredW = Math.max(GRID_CARD_MIN_WIDTH, startColW + dx / visualK);
          const nextCols = Math.max(
            GRID_MIN_COLS,
            Math.min(maxCols, Math.round((startAvailW + GRID_GAP) / (desiredW + GRID_GAP)))
          );
          if (nextCols !== latestCols) {
            latestCols = nextCols;
            this.setCardGridColsSetting(latestCols);
            this.applyGridLayoutClasses(this.renderedCards.length);
            this.syncCardRowSpansInPlace();
            const nextColW = Math.max(
              GRID_CARD_MIN_WIDTH,
              (startAvailW - (latestCols - 1) * GRID_GAP) / latestCols
            );
            for (const h of allHandles) {
              const idx = Number(h.dataset.colIndex) || 1;
              this.positionCardGridColResizer(h, idx, nextColW);
            }
          }
          this.showResizeBadge(i18n.colSplitBadge(latestCols), ev.clientX, ev.clientY);
        };

        const onUp = () => {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
          window.removeEventListener("pointercancel", onUp);
          handle.removeClass("is-dragging");
          document.body.style.cursor = "";
          this.hideResizeBadge();

          this.setCardGridColsSetting(latestCols);
          void this.plugin.saveSettings();
          this.scheduleFlowColResizersSync();
        };

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onUp);
      });
    }
  }

  private positionFlowColResizer(handleEl: HTMLElement, colIndex: number, colWidth: number): void {
    const gapCenter = FLOW_CANVAS_PAD_LEFT + colIndex * colWidth + (colIndex - 1) * FLOW_COL_GAP + FLOW_COL_GAP / 2;
    handleEl.style.left = `${Math.round(gapCenter - 7)}px`;
  }

  private syncFlowColResizers(): void {
    if (!this.colResizersEl) return;
    this.colResizersEl.empty();
    this.colResizersEl.style.removeProperty("height");
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
          "aria-label": i18n.flowColResizeAria()
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

  // [ID 6.5.47] Flow 모드 카드 1열 꽉 찬 최대 행 수 정밀 산출
  // -> 다단 분할로 .fb-card-header/.fb-row의 BoundingRect 높이가 열 전체로 부풀어 오르는 오차를 막기 위해
  // -> 정상 범위(행 18~42px, 헤더 20~48px) 샘플만 채택하고 canvasEl 실측 높이를 안전 반영함.
  private measureFlowRowHeight(): number {
    if (this.gridEl) {
      const rows = this.gridEl.querySelectorAll<HTMLElement>(".fb-row");
      for (const r of Array.from(rows)) {
        const h = r.offsetHeight || r.getBoundingClientRect().height;
        if (h >= 18 && h <= 42) {
          return Math.max(22, Math.min(38, h));
        }
      }
    }
    return 27;
  }

  private getFlowMaxOneColumnItems(cardModel: BoardCardModel): number {
    const canvasInnerH = Math.max(240, (this.canvasEl?.clientHeight || 720) - 20);
    const gridH = Math.max(this.gridEl?.clientHeight || 0, canvasInnerH);
    const rowH = this.measureFlowRowHeight();
    let headerH = 28;
    if (!cardModel.isRootCard && this.gridEl) {
      const headers = this.gridEl.querySelectorAll<HTMLElement>(".fb-card-header");
      for (const h of Array.from(headers)) {
        const rectH = h.offsetHeight || h.getBoundingClientRect().height;
        if (rectH >= 20 && rectH <= 48) {
          headerH = rectH;
          break;
        }
      }
    }
    // border(2) + card padding(8) + margin(8) + header + body padding(3) + 하단 호버바 여유(8)
    const chromeH = cardModel.isRootCard ? 26 : Math.ceil(headerH) + 36;
    const usableH = Math.max(rowH * FLOW_SIZE_SM, gridH - chromeH);
    return Math.max(FLOW_SIZE_SM, Math.floor(usableH / rowH));
  }

  private getFlowWindowLimit(cardModel: BoardCardModel): number {
    const key = this.getFlowWindowKey(cardModel);
    const spec = this.plugin.getFlowWindowSizeSpec(key);
    const maxOneCol = this.getFlowMaxOneColumnItems(cardModel);
    const maxDragItems = Math.max(maxOneCol * FLOW_MAX_DRAG_COLS, FLOW_MAX_DRAG_ROWS);

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
    const endIdx = isScrollable ? Math.min(cardModel.items.length, offset + limit) : cardModel.items.length;
    const isCarrying = this.carryPaths.length > 0;

    // [ID 6.5.69] 증분 DOM 시프트 -> 1~4행 이동 시 기존 행·아이콘 DOM을 재사용하고 진입 행만 추가해 120fps 부드러운 스크롤 구현
    const prevStart = listEl.dataset.winStart !== undefined ? Number(listEl.dataset.winStart) : NaN;
    const prevEnd = listEl.dataset.winEnd !== undefined ? Number(listEl.dataset.winEnd) : NaN;
    const delta = offset - prevStart;
    const sameSpan =
      Number.isFinite(prevStart) &&
      Number.isFinite(prevEnd) &&
      endIdx - offset === prevEnd - prevStart &&
      listEl.children.length === prevEnd - prevStart;

    if (sameSpan && delta > 0 && delta <= 4) {
      for (let i = 0; i < delta; i++) {
        listEl.firstElementChild?.remove();
      }
      this.renderCardRows(listEl, cardModel, cardIdx, isCarrying, prevEnd, endIdx);
    } else if (sameSpan && delta < 0 && delta >= -4) {
      const count = -delta;
      for (let i = 0; i < count; i++) {
        listEl.lastElementChild?.remove();
      }
      const fragHost = document.createElement("div");
      this.renderCardRows(fragHost, cardModel, cardIdx, isCarrying, offset, prevStart);
      listEl.prepend(...Array.from(fragHost.children));
    } else {
      listEl.empty();
      this.renderCardRows(listEl, cardModel, cardIdx, isCarrying, offset, endIdx);
    }
    listEl.dataset.winStart = String(offset);
    listEl.dataset.winEnd = String(endIdx);

    const countEl = cardEl.querySelector<HTMLElement>(".fb-count");
    if (countEl) {
      countEl.setText(this.formatFlowCountLabel(cardModel, isScrollable));
    }

    const footerEl = cardEl.querySelector<HTMLElement>(".fb-flow-scroll-footer");
    footerEl?.toggleClass("is-unscrolled", !isScrollable);

    if (isScrollable) {
      this.showFlowVertIndicator(cardIdx, true);
    } else if (this.flowVertActiveCardIdx === cardIdx) {
      this.hideFlowVertIndicator();
    }
  }

  private scheduleFlowWheelCommit(cardIdx: number): void {
    this.flowWheelPendingCards.add(cardIdx);
    if (this.flowWheelRaf !== null) return;
    this.flowWheelRaf = window.requestAnimationFrame(() => {
      this.flowWheelRaf = null;
      const batch = Array.from(this.flowWheelPendingCards);
      this.flowWheelPendingCards.clear();
      for (const idx of batch) {
        this.updateFlowWindowDOM(idx);
      }
    });
  }

  // [ID 6.5.67] Flow 모드 분할 열을 넘나드는 초슬림 세로 스크롤 인디케이터
  // -> 서브-행 분수 오프셋(accum/stepPx)과 동일 열 transform 이징(열 이동 시 순간 점프)을 결합해 끊김 없이 부드럽게 이동함.
  private hideFlowVertIndicator(): void {
    if (this.flowVertFadeTimer !== null) {
      window.clearTimeout(this.flowVertFadeTimer);
      this.flowVertFadeTimer = null;
    }
    this.flowVertActiveCardIdx = null;
    this.flowVertLastColX = null;
    this.flowVertIndicatorEl?.removeClass("is-visible");
    this.flowVertIndicatorEl?.removeClass("is-active");
  }

  private showFlowVertIndicator(cardIdx: number, isActiveScroll: boolean): void {
    if (!this.flowVertIndicatorEl || this.plugin.settings.gridCols !== "flow") return;
    const cardModel = this.renderedCards[cardIdx];
    if (!cardModel || cardModel.isCollapsedSection) {
      this.hideFlowVertIndicator();
      return;
    }
    const limit = this.getFlowWindowLimit(cardModel);
    const total = cardModel.items.length;
    if (total <= limit) {
      if (this.flowVertActiveCardIdx === cardIdx) this.hideFlowVertIndicator();
      return;
    }

    const cardEl = this.gridEl.querySelector<HTMLElement>(`.fb-card[data-card-index="${cardIdx}"]`);
    if (!cardEl) return;
    const rows = Array.from(cardEl.querySelectorAll<HTMLElement>(".fb-row"));
    if (rows.length === 0) return;

    const canvasRect = this.canvasEl.getBoundingClientRect();
    const scrollL = this.canvasEl.scrollLeft;
    const scrollT = this.canvasEl.scrollTop;

    // 다단(column-fill: auto)으로 쪼개진 행들을 열 단위 세그먼트로 묶음
    const segments: Array<{ left: number; right: number; top: number; bottom: number; height: number }> = [];
    for (const row of rows) {
      const r = row.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      const prev = segments[segments.length - 1];
      if (prev && Math.abs(r.left - prev.left) <= 18) {
        prev.top = Math.min(prev.top, r.top);
        prev.bottom = Math.max(prev.bottom, r.bottom);
        prev.right = Math.max(prev.right, r.right);
        prev.height = prev.bottom - prev.top;
      } else {
        segments.push({
          left: r.left,
          right: r.right,
          top: r.top,
          bottom: r.bottom,
          height: r.height
        });
      }
    }
    if (segments.length === 0) return;

    const totalTrackLen = segments.reduce((sum, s) => sum + s.height, 0);
    const winKey = this.getFlowWindowKey(cardModel);
    const offset = this.getFlowWindowOffset(cardModel);
    const maxOffset = Math.max(1, total - limit);
    const stepPx = Math.max(18, this.measureFlowRowHeight());
    const subFrac = (this.flowWheelAccum.get(winKey) || 0) / stepPx;
    const exactOffset = Math.max(0, Math.min(maxOffset, offset + subFrac));
    const ratio = exactOffset / maxOffset;

    const thumbH = Math.min(30, Math.max(18, Math.round(totalTrackLen * 0.16)));
    let remaining = ratio * totalTrackLen;
    let targetSeg = segments[segments.length - 1];
    for (const seg of segments) {
      if (remaining <= seg.height || seg === targetSeg) {
        targetSeg = seg;
        break;
      }
      remaining -= seg.height;
    }

    const localT = targetSeg.height > 0 ? Math.max(0, Math.min(1, remaining / targetSeg.height)) : 0;
    const clampedThumbH = Math.min(thumbH, Math.max(12, Math.round(targetSeg.height - 2)));
    const x = Math.round(targetSeg.right - canvasRect.left + scrollL + 2);
    const y = Math.round(
      targetSeg.top - canvasRect.top + scrollT + localT * Math.max(0, targetSeg.height - clampedThumbH)
    );

    const wasVisible = this.flowVertIndicatorEl.hasClass("is-visible");
    const jumpedColumn =
      !wasVisible ||
      this.flowVertActiveCardIdx !== cardIdx ||
      this.flowVertLastColX === null ||
      Math.abs(x - this.flowVertLastColX) > 20;

    this.flowVertActiveCardIdx = cardIdx;
    this.flowVertLastColX = x;
    this.flowVertIndicatorEl.style.height = `${clampedThumbH}px`;

    if (jumpedColumn) {
      // 첫 노출 또는 열을 건널 때는 대각선 비행을 막기 위해 transform만 즉시 점프
      this.flowVertIndicatorEl.style.transition = "opacity 160ms ease, background-color 120ms ease";
      this.flowVertIndicatorEl.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      void this.flowVertIndicatorEl.offsetWidth;
      this.flowVertIndicatorEl.style.removeProperty("transition");
    } else {
      this.flowVertIndicatorEl.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }

    this.flowVertIndicatorEl.addClass("is-visible");
    this.flowVertIndicatorEl.toggleClass("is-active", isActiveScroll);

    if (this.flowVertFadeTimer !== null) {
      window.clearTimeout(this.flowVertFadeTimer);
      this.flowVertFadeTimer = null;
    }
    if (isActiveScroll) {
      this.flowVertFadeTimer = window.setTimeout(() => {
        this.flowVertFadeTimer = null;
        this.flowVertIndicatorEl?.removeClass("is-active");
        this.flowVertIndicatorEl?.removeClass("is-visible");
        this.flowVertActiveCardIdx = null;
        this.flowVertLastColX = null;
      }, 850);
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

    const cardEl = parentEl.createDiv({
      cls:
        "fb-card" +
        (cardModel.isRootCard ? " is-root-card" : "") +
        (cardModel.isRootCard && cardIdx > 0 ? " is-root-moved" : "") +
        (cardModel.isCollapsedSection ? " is-section-collapsed" : "") +
        (isFocusedCard ? " is-focused-card" : "") +
        (isCarryCard ? " is-carry-target" : ""),
      attr: {
        "data-drop-folder": cardModel.folderPath,
        "data-order-key": cardKey,
        "data-card-index": String(cardIdx),
        ...(isScrollableWindow ? { "data-windowed": "true" } : {})
      }
    });

    if (!isFlowMode) {
      const units = this.resolveCardRowUnits(cardKey, this.renderedCards.length);
      cardEl.style.setProperty("--fb-card-row-span", String(units));
    }

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

          const stepPx = Math.max(18, this.measureFlowRowHeight());
          const curOffset = this.getFlowWindowOffset(liveModel);
          const maxOffset = Math.max(0, liveModel.items.length - curLimit);
          let accum = (this.flowWheelAccum.get(winKey) || 0) + e.deltaY;

          // 최상단·최하단 경계에서는 잔여 누적값을 즉시 0으로 정리해 역방향 스크롤 데드존 제거
          if ((curOffset <= 0 && accum < 0) || (curOffset >= maxOffset && accum > 0)) {
            accum = 0;
          }

          const rowSteps = Math.trunc(accum / stepPx);
          if (rowSteps === 0) {
            this.flowWheelAccum.set(winKey, accum);
            this.showFlowVertIndicator(cardIdx, true);
            return;
          }

          const nextOffset = Math.max(0, Math.min(curOffset + rowSteps, maxOffset));
          const remainder = nextOffset === 0 || nextOffset === maxOffset ? 0 : accum - rowSteps * stepPx;
          this.flowWheelAccum.set(winKey, remainder);

          if (nextOffset !== curOffset) {
            this.flowScrollOffsets.set(winKey, nextOffset);
            this.scheduleFlowWheelCommit(cardIdx);
          }
          this.showFlowVertIndicator(cardIdx, true);
        },
        { passive: false }
      );

      cardEl.addEventListener("pointerenter", () => {
        const liveModel = this.renderedCards[cardIdx];
        if (!liveModel || liveModel.isCollapsedSection) return;
        if (liveModel.items.length > this.getFlowWindowLimit(liveModel)) {
          this.showFlowVertIndicator(cardIdx, false);
        }
      });
      cardEl.addEventListener("pointerleave", () => {
        if (this.flowVertActiveCardIdx === cardIdx && this.flowVertFadeTimer === null) {
          this.hideFlowVertIndicator();
        }
      });
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
            "aria-label": i18n.rootMoveGripAria()
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
        titleWrap.createSpan({ cls: "fb-root-pill", text: i18n.directPill() });

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
        attr: { "aria-label": i18n.openItemAria(cardModel.title) }
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

    // [ID 6.5.60] Vertical/Horizontal 공용 카드 하단 드래그 세로 분할 리사이저 (최소 150px 방어 · 더블클릭 1/2↔전체 토글)
    // -> DOM 재생성 없이 --fb-card-row-span만 인플레이스 갱신해 60fps로 카드별 원하는 높이 분할을 조절함.
    if (!isFlowMode) {
      const resizeBottom = cardEl.createDiv({
        cls: "fb-card-resize-bottom",
        attr: { "aria-label": i18n.cardHeightResizeAria() }
      });

      resizeBottom.addEventListener("dblclick", (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const curUnits = this.resolveCardRowUnits(cardKey, this.renderedCards.length);
        const nextUnits = curUnits >= GRID_ROW_UNITS_TOTAL ? 6 : GRID_ROW_UNITS_TOTAL;
        const allowed = this.getAllowedCardRowUnits(this.getCardGridAvailHeight());
        const clamped = allowed.find((u) => u >= nextUnits) ?? allowed[allowed.length - 1];
        cardEl.style.setProperty("--fb-card-row-span", String(clamped));
        void this.plugin.setCardRowUnits(this.getActiveCardGridMode(), cardKey, clamped);
        this.scheduleFlowColResizersSync();
      });

      resizeBottom.addEventListener("pointerdown", (e: PointerEvent) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();

        const startY = e.clientY;
        const startH = cardEl.getBoundingClientRect().height;
        const availH = this.getCardGridAvailHeight();
        const unitRowH = this.computeUnitRowHeight(availH);
        const allowed = this.getAllowedCardRowUnits(availH);
        let latestUnits = this.resolveCardRowUnits(cardKey, this.renderedCards.length);

        resizeBottom.addClass("is-dragging");
        cardEl.addClass("is-resizing");
        document.body.style.cursor = "row-resize";
        this.showResizeBadge(this.formatCardRowUnitsLabel(latestUnits), e.clientX, e.clientY);

        const onMove = (ev: PointerEvent) => {
          const dy = ev.clientY - startY;
          const desiredH = Math.max(GRID_CARD_MIN_HEIGHT, startH + dy);
          let bestUnit = allowed[0];
          let bestDist = Infinity;
          for (const u of allowed) {
            const h = this.getCardHeightForUnits(u, unitRowH);
            const dist = Math.abs(h - desiredH);
            if (dist < bestDist) {
              bestDist = dist;
              bestUnit = u;
            }
          }
          if (bestUnit !== latestUnits) {
            latestUnits = bestUnit;
            cardEl.style.setProperty("--fb-card-row-span", String(latestUnits));
          }
          const isAtMin = latestUnits === allowed[0] && startH + dy < GRID_CARD_MIN_HEIGHT;
          const label = isAtMin
            ? i18n.cardRowUnitsMinBadge(latestUnits)
            : this.formatCardRowUnitsLabel(latestUnits);
          this.showResizeBadge(label, ev.clientX, ev.clientY);
        };

        const onUp = () => {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
          window.removeEventListener("pointercancel", onUp);
          resizeBottom.removeClass("is-dragging");
          cardEl.removeClass("is-resizing");
          document.body.style.cursor = "";
          this.hideResizeBadge();

          void this.plugin.setCardRowUnits(this.getActiveCardGridMode(), cardKey, latestUnits);
          this.scheduleFlowColResizersSync();
        };

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onUp);
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
      listEl.createDiv({ cls: "fb-empty-card", text: i18n.emptyCard() });
      return listEl;
    }

    const startIdx = isScrollableWindow ? this.getFlowWindowOffset(cardModel) : 0;
    const endIdx = isScrollableWindow ? Math.min(cardModel.items.length, startIdx + windowLimit) : cardModel.items.length;
    this.renderCardRows(listEl, cardModel, cardIdx, isCarrying, startIdx, endIdx);
    listEl.dataset.winStart = String(startIdx);
    listEl.dataset.winEnd = String(endIdx);

    // [ID 6.5.48] Flow 하단 투명 호버 존 -> 평소 선 없이 깨끗하게 유지, 호버 시 소·중·대 선택 + 상하·다단 드래그 지원
    if (isResizableFlowCard) {
      const footer = cardEl.createDiv({
        cls: "fb-flow-scroll-footer" + (isScrollableWindow ? "" : " is-unscrolled"),
        attr: { "aria-label": i18n.flowFooterAria() }
      });

      const sizeBar = footer.createDiv({ cls: "fb-flow-size-bar" });
      // [ID 6.5.53] 호버 선택바 좌측 상하 드래그 손잡이(↕) -> 드래그 리사이징 가능성을 직관적으로 안내
      const dragHandle = sizeBar.createSpan({
        cls: "fb-flow-drag-handle",
        attr: { "aria-label": i18n.flowDragHandleAria() }
      });
      setIcon(dragHandle, "chevrons-up-down");
      sizeBar.createSpan({ cls: "fb-flow-size-sep" });

      const sizePresets: Array<{ spec: "sm" | "md" | "lg"; label: string; aria: string }> = [
        { spec: "sm", label: i18n.flowPresetSm(), aria: i18n.flowPresetSmAria(FLOW_SIZE_SM) },
        { spec: "md", label: i18n.flowPresetMd(), aria: i18n.flowPresetMdAria(FLOW_WINDOW_SIZE) }
      ];
      if (cardModel.items.length > FLOW_WINDOW_SIZE) {
        sizePresets.push({ spec: "lg", label: i18n.flowPresetLg(), aria: i18n.flowPresetLgAria() });
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

        // [ID 6.5.55] 하단 드래그 최대 200행 자유 확장 지원 (상하 드래그 + 우측/좌측 다단 드래그 동시 대응)
        // -> 화면 하단에 닿아도 우측으로 끌면 여러 열에 걸쳐 최대 200행까지 매끄럽게 확장됨.
        const startX = e.clientX;
        const startY = e.clientY;
        const startRows = Math.min(cardModel.items.length, this.getFlowWindowLimit(cardModel));
        const rowH = this.measureFlowRowHeight();
        const maxOneCol = this.getFlowMaxOneColumnItems(cardModel);
        const maxDragLimit = Math.max(maxOneCol * FLOW_MAX_DRAG_COLS, FLOW_MAX_DRAG_ROWS);
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
            dragBadge.setText(i18n.flowDragRowsMaxLimit(nextRows));
          } else if (nextRows > maxOneCol) {
            const cols = Math.ceil(nextRows / maxOneCol);
            dragBadge.setText(i18n.flowDragRowsCols(nextRows, cols));
          } else {
            dragBadge.setText(i18n.flowDragRows(nextRows));
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
            attr: { "aria-label": i18n.openItemAria(item.name) }
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
      this.shelfListEl.createSpan({ cls: "fb-shelf-hint", text: i18n.shelfEmptyHint() });
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
      this.selectionCountEl.setText(i18n.selectedCount(count));
    }
  }

  private renderCarryPill(): void {
    if (this.carryPaths.length > 0 && this.carryTargetFolderPath !== null) {
      const targetName = this.carryTargetFolderPath || this.app.vault.getName();
      this.carryPillEl.setText(i18n.carryPill(this.carryPaths.length, targetName));
      this.carryPillEl.removeClass("is-hidden");
      return;
    }

    this.clipboardPaths = this.clipboardPaths.filter(
      (p) => this.app.vault.getAbstractFileByPath(p) !== null
    );
    if (this.clipboardPaths.length > 0 && this.clipboardMode) {
      const label =
        this.clipboardMode === "copy"
          ? i18n.clipboardCopied(this.clipboardPaths.length)
          : i18n.clipboardCut(this.clipboardPaths.length);
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

  // [ID 6.5.63] 보드(Tab) ↔ 우측 분할 빠른 편집기(Esc) 원키 포커스 왕복
  // -> 일반 마크다운 탭에는 일절 개입하지 않고 오직 quickEditLeaf 내부에서 오버레이/검색창/IME 조합이 없을 때만 Esc로 보드 복귀함.
  private focusQuickEditLeaf(): void {
    if (!this.isQuickEditLeafAlive() || !this.quickEditLeaf) return;
    const targetLeaf = this.quickEditLeaf;
    this.app.workspace.setActiveLeaf(targetLeaf, { focus: true });
    this.syncScopeState();
    requestAnimationFrame(() => {
      const view = targetLeaf.view;
      if (view instanceof MarkdownView && view.editor) {
        view.editor.focus();
      } else {
        const cmContent = view?.containerEl?.querySelector<HTMLElement>(".cm-content");
        if (cmContent) cmContent.focus();
      }
    });
  }

  private handleQuickEditEscKeydown(e: KeyboardEvent): void {
    if (e.key !== "Escape" || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    if (e.isComposing || e.keyCode === 229) return;
    if (!this.quickLookOpen || !this.isQuickEditLeafAlive() || !this.quickEditLeaf) return;
    if (!this.containerEl.isConnected || this.containerEl.offsetParent === null) return;

    // Vim 모드 사용자의 모드 전환 Esc 보호
    const vaultConfig = (this.app.vault as unknown as { getConfig?: (k: string) => unknown }).getConfig;
    if (vaultConfig && Boolean(vaultConfig.call(this.app.vault, "vimMode"))) return;

    // 모달·자동완성·컨텍스트 메뉴·프롬프트가 열려 있으면 옵시디언 기본 Esc 닫기에 양보
    if (document.querySelector(".modal-container, .suggestion-container, .menu, .prompt")) return;

    const quickEl = this.quickEditLeaf.view?.containerEl;
    if (!quickEl) return;

    const targetNode = e.target instanceof Node ? e.target : document.activeElement;
    if (targetNode instanceof HTMLElement && targetNode.closest(".document-search-container")) return;

    const inQuickLeaf =
      (targetNode instanceof Node && quickEl.contains(targetNode)) ||
      (targetNode === document.body && this.app.workspace.getActiveViewOfType(ItemView)?.leaf === this.quickEditLeaf);
    if (!inQuickLeaf) return;

    // 텍스트 선택 또는 다중 커서 상태에서는 1차 Esc를 에디터 선택 해제에 양보
    const quickView = this.quickEditLeaf.view;
    if (quickView instanceof MarkdownView && quickView.editor) {
      if (quickView.editor.somethingSelected()) return;
      const selections = quickView.editor.listSelections?.();
      if (selections && selections.length > 1) return;
    }

    this.handledKeyEvents.add(e);
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    this.app.workspace.setActiveLeaf(this.leaf, { focus: true });
    requestAnimationFrame(() => {
      this.shellEl?.focus();
      this.syncScopeState();
    });
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

      if (this.plugin.settings.gridCols === "horizontal") {
        const activeCardEl = this.gridEl.querySelector<HTMLElement>(
          `.fb-card[data-card-index="${activeCardIdx}"]`
        );
        if (activeCardEl) {
          const pad = 14;
          const leftEdge = activeCardEl.offsetLeft - pad;
          const rightEdge = activeCardEl.offsetLeft + activeCardEl.offsetWidth + pad;
          if (leftEdge <= pad) {
            this.canvasEl.scrollLeft = 0;
          } else if (leftEdge < this.canvasEl.scrollLeft) {
            this.canvasEl.scrollLeft = Math.max(0, leftEdge);
          } else if (rightEdge > this.canvasEl.scrollLeft + this.canvasEl.clientWidth) {
            this.canvasEl.scrollLeft = rightEdge - this.canvasEl.clientWidth;
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

  // [ID 6.5.8] 노트 열기 (미리보기 분할창 우선 정리 · 핀 고정 시 옆 비고정 탭 재사용 / 미고정 시 동일 탭 히스토리 보존)
  // -> Space 미리보기가 열린 상태에서 Enter·더블클릭으로 노트에 진입하면 우측 분할 편집기를 먼저 닫아 분할 잔류를 방지하고,
  // -> 탭이 고정(Pinned)된 상태에서는 보드를 덮어쓰지 않고 옆 작업 탭에서 열어 보드를 상시 유지함.
  private async openFile(file: TFile, forceNewTab = false): Promise<void> {
    if (this.quickLookOpen || this.isQuickEditLeafAlive()) {
      this.closeQuickEditLeaf(false);
      this.updateToolbarStates();
    }

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
      title: i18n.newNote(),
      placeholder: i18n.noteTitlePlaceholder(),
      destinationLabel: destLabel,
      confirmLabel: i18n.create(),
      onSubmit: async (rawName) => {
        const cleanName = rawName.endsWith(".md") ? rawName : `${rawName}.md`;
        const fullPath = normalizePath(targetFolderPath ? `${targetFolderPath}/${cleanName}` : cleanName);
        if (this.app.vault.getAbstractFileByPath(fullPath)) {
          new Notice(i18n.fileAlreadyExists());
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
          new Notice(i18n.createNoteFailed(err instanceof Error ? err.message : String(err)));
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
      title: i18n.newFolder(),
      placeholder: i18n.folderNamePlaceholder(),
      destinationLabel: destLabel,
      confirmLabel: i18n.create(),
      onSubmit: async (rawName) => {
        const fullPath = normalizePath(targetFolderPath ? `${targetFolderPath}/${rawName}` : rawName);
        if (this.app.vault.getAbstractFileByPath(fullPath)) {
          new Notice(i18n.folderAlreadyExists());
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
          new Notice(i18n.createFolderFailed(err instanceof Error ? err.message : String(err)));
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
        new Notice(i18n.invalidNameChars());
        return;
      }

      const finalName = isMd && !rawName.endsWith(".md") ? `${rawName}.md` : rawName;
      const parentPath = normalizeFolderRef(target.parent);
      const destPath = normalizePath(parentPath ? `${parentPath}/${finalName}` : finalName);
      if (destPath === target.path) return;
      if (this.app.vault.getAbstractFileByPath(destPath)) {
        new Notice(i18n.sameNameExists());
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
        new Notice(i18n.renameFailed(err instanceof Error ? err.message : String(err)));
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
      title: i18n.rename(),
      placeholder: i18n.newNamePlaceholder(),
      initialValue: initial,
      confirmLabel: i18n.renameConfirm(),
      onSubmit: async (rawName) => {
        const finalName = isMd && !rawName.endsWith(".md") ? `${rawName}.md` : rawName;
        const parentPath = normalizeFolderRef(target.parent);
        const destPath = normalizePath(parentPath ? `${parentPath}/${finalName}` : finalName);
        if (destPath === target.path) return;
        if (this.app.vault.getAbstractFileByPath(destPath)) {
          new Notice(i18n.sameNameExists());
          return;
        }
        try {
          await this.app.fileManager.renameFile(target, destPath);
          this.renderAll();
        } catch (err) {
          new Notice(i18n.renameFailed(err instanceof Error ? err.message : String(err)));
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
      new Notice(i18n.trashedItems(deleted));
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
      new Notice(i18n.copiedItems(copiedCount, destName));
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

    await this.plugin.setFolderOrder(this.plugin.settings.gridCols, this.currentFolderPath, allCardKeys);
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

  // [ID 6.5.66] 현재 레이아웃 모드의 폴더 순서를 1회성으로 깔끔하게 정리 (정렬 고정 없음 · 이후 즉시 수동 드래그 가능)
  // -> 검색 필터 중에도 실제 전체 하위 폴더 기준으로 정렬해 누락 없이 현재 모드 버킷에만 반영함.
  private getFolderRecursiveStats(folder: TFolder): { count: number; latestMtime: number } {
    let count = 0;
    let latestMtime = 0;
    const walk = (f: TFolder) => {
      for (const child of f.children) {
        if (child instanceof TFile) {
          count += 1;
          if (child.stat.mtime > latestMtime) latestMtime = child.stat.mtime;
        } else if (child instanceof TFolder) {
          count += 1;
          walk(child);
        }
      }
    };
    walk(folder);
    return { count, latestMtime };
  }

  private pickAvailableIcon(candidates: string[], fallback = "list"): string {
    for (const id of candidates) {
      if (getIcon(id)) return id;
    }
    return fallback;
  }

  private openFolderSortMenu(anchorEl: HTMLElement): void {
    const menu = new Menu();
    menu.addItem((item) =>
      item
        .setTitle(i18n.sortFolderNameAsc())
        .setIcon(this.pickAvailableIcon(["arrow-down-az", "arrow-down-a-z", "sort-asc", "arrow-down"]))
        .onClick(() => {
          void this.applyOneShotFolderSort("name-asc");
        })
    );
    menu.addItem((item) =>
      item
        .setTitle(i18n.sortFolderNameDesc())
        .setIcon(this.pickAvailableIcon(["arrow-up-za", "arrow-up-z-a", "sort-desc", "arrow-up"]))
        .onClick(() => {
          void this.applyOneShotFolderSort("name-desc");
        })
    );
    menu.addItem((item) =>
      item
        .setTitle(i18n.sortFolderCountDesc())
        .setIcon(this.pickAvailableIcon(["arrow-down-wide-narrow", "bar-chart-2", "list-ordered", "hash"]))
        .onClick(() => {
          void this.applyOneShotFolderSort("count-desc");
        })
    );
    menu.addItem((item) =>
      item
        .setTitle(i18n.sortFolderMtimeDesc())
        .setIcon(this.pickAvailableIcon(["clock", "history"]))
        .onClick(() => {
          void this.applyOneShotFolderSort("mtime-desc");
        })
    );

    const rect = anchorEl.getBoundingClientRect();
    menu.showAtPosition({ x: Math.round(rect.left), y: Math.round(rect.bottom + 4) });
  }

  private async applyOneShotFolderSort(
    criterion: "name-asc" | "name-desc" | "count-desc" | "mtime-desc"
  ): Promise<void> {
    const mode = this.plugin.settings.gridCols;
    const parentPath = this.currentFolderPath;

    if (criterion === "name-asc") {
      await this.plugin.clearFolderOrder(mode, parentPath);
      this.renderAll();
      return;
    }

    const currentFolder = parentPath ? getFolderByPath(this.app, parentPath) : this.app.vault.getRoot();
    if (!currentFolder) return;

    const childFolders = currentFolder.children.filter((c): c is TFolder => c instanceof TFolder);
    const hasRootFiles = currentFolder.children.some((c) => c instanceof TFile);
    const statsMap = new Map<string, { count: number; latestMtime: number }>();
    if (criterion === "count-desc" || criterion === "mtime-desc") {
      for (const f of childFolders) {
        statsMap.set(f.path, this.getFolderRecursiveStats(f));
      }
    }

    childFolders.sort((a, b) => {
      if (criterion === "name-desc") {
        return b.name.localeCompare(a.name, undefined, { numeric: true });
      }
      if (criterion === "count-desc") {
        const ca = statsMap.get(a.path)?.count ?? 0;
        const cb = statsMap.get(b.path)?.count ?? 0;
        if (cb !== ca) return cb - ca;
        return a.name.localeCompare(b.name, undefined, { numeric: true });
      }
      const ma = statsMap.get(a.path)?.latestMtime ?? 0;
      const mb = statsMap.get(b.path)?.latestMtime ?? 0;
      if (mb !== ma) return mb - ma;
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });

    const orderedKeys: string[] = [];
    if (hasRootFiles) orderedKeys.push(ROOT_CARD_ORDER_KEY);
    for (const f of childFolders) {
      orderedKeys.push(normalizeFolderRef(f));
    }

    await this.plugin.setFolderOrder(mode, parentPath, orderedKeys);
    this.renderAll();
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

    await this.plugin.setFolderOrder(this.plugin.settings.gridCols, this.currentFolderPath, allCardKeys);
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
      text:
        this.activeDragPaths.length > 1
          ? i18n.dragGhostMulti(label, this.activeDragPaths.length - 1)
          : label
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
      new Notice(i18n.movedItems(moves.length, destName));
      this.renderAll();
      this.scrollFocusedIntoView();
    } else if (skipped > 0) {
      new Notice(i18n.moveFailedConflict());
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
      new Notice(i18n.undidMove(restored));
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

  // [ID 6.5.24] Vertical · Horizontal · Flow 모드에서 동일 열의 바로 위·아래 카드/섹션 탐색
  // -> getBoundingClientRect() 화면 좌표를 사용해 세로·가로 스크롤 그리드 양쪽에서 동일 열 카드만 정확히 매칭함.
  private findVerticalNeighborCard(cardIdx: number, direction: "up" | "down"): number {
    if (this.plugin.settings.verticalEdgeBehavior !== "adaptive") return -1;

    // Flow 연속 다단 모드에서는 폴더들이 끊김 없이 순차적으로 이어지므로 바로 다음/이전 폴더로 자연스럽게 연결
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

  // [ID 6.5.65] Vertical/Horizontal 다단 카드 모드 공간 좌표 기반 좌/우 인접 카드 탐색
  // -> Horizontal(column dense) 및 높이 가변 그리드에서도 인덱스 순서가 아닌 실제 시각적 좌/우 카드로 자연 이동함.
  private findCardHorizontalNeighbor(cardIdx: number, direction: "left" | "right"): number {
    const cardEls = Array.from(this.gridEl.querySelectorAll<HTMLElement>(".fb-card"));
    const curEl = cardEls.find((el) => Number(el.dataset.cardIndex) === cardIdx);
    if (!curEl) return -1;

    const curRect = curEl.getBoundingClientRect();
    const curCenterY = curRect.top + curRect.height / 2;
    const colThreshold = 28;

    let bestIdx = -1;
    let bestColDist = Infinity;
    let bestRowDist = Infinity;

    for (const el of cardEls) {
      const idx = Number(el.dataset.cardIndex);
      if (idx === cardIdx) continue;
      const r = el.getBoundingClientRect();
      const dx = r.left - curRect.left;
      if (direction === "right" && dx <= colThreshold) continue;
      if (direction === "left" && dx >= -colThreshold) continue;

      const colDist = Math.abs(dx);
      const rowDist = Math.abs(r.top + r.height / 2 - curCenterY);
      if (colDist < bestColDist - colThreshold || (Math.abs(colDist - bestColDist) <= colThreshold && rowDist < bestRowDist)) {
        bestColDist = colDist;
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

    // [ID 6.5.72] B: 북마크 드롭다운 메뉴 즉시 열기
    if (!meta && !e.shiftKey && !e.altKey && code === "KeyB") {
      e.preventDefault();
      e.stopPropagation();
      this.openBookmarksMenu(this.bookmarkBtnEl);
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
      const spatialCardIdx = this.findCardHorizontalNeighbor(this.focusedCardIndex, dir);
      const delta = dir === "right" ? 1 : -1;
      const nextIdx =
        spatialCardIdx >= 0
          ? spatialCardIdx
          : (this.focusedCardIndex + delta + this.renderedCards.length) % this.renderedCards.length;
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
        if (e.key === "ArrowUp" && this.focusedCardIndex === 0) {
          this.focusSearchBox();
          return;
        }
        if (hasHeaderStop) this.focusCardHeader(this.focusedCardIndex);
        return;
      }

      if (e.key === "ArrowUp") {
        // [ID 6.5.71] 맨 첫 번째 카드 최상단(직속 첫 항목 또는 첫 카드 헤더)에서 ↑ 입력 시 검색창으로 자연 연결
        if (onHeader || (!hasHeaderStop && itemIndex <= 0)) {
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
          } else if (this.focusedCardIndex === 0) {
            this.focusSearchBox();
          } else if (shouldLoopAtEdge) {
            this.focusCardItem(this.focusedCardIndex, count - 1, {
              clearSelection: true,
              updatePreview: true
            });
          }
        } else if (itemIndex <= 0) {
          if (this.focusedCardIndex === 0 && card.isRootCard) {
            this.focusSearchBox();
          } else {
            // 첫 번째 항목에서 ↑ -> 카드 폴더 헤더 포커스 (Enter로 진입 가능)
            this.focusCardHeader(this.focusedCardIndex);
          }
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

    // [ID 6.5.63] Tab: 우측 분할 빠른 편집기가 열려 있을 때 마우스 클릭 없이 즉시 편집기 커서 활성화
    if (!meta && !e.altKey && !e.shiftKey && e.key === "Tab") {
      if (this.quickLookOpen && this.isQuickEditLeafAlive()) {
        e.preventDefault();
        e.stopPropagation();
        this.focusQuickEditLeaf();
      }
      return;
    }

    // [ID 6.5.63] Space: 섹션/하위 폴더 접기·펼치기, 파일이면 1회차 미리보기 열기 → 2회차(또는 Tab) 우측 편집기 즉시 진입
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
        if (!this.quickLookOpen || !this.isQuickEditLeafAlive()) {
          this.quickLookOpen = true;
          void this.updateQuickLook(file);
        } else if (this.quickLookPath !== item.path) {
          void this.updateQuickLook(file);
        } else {
          this.focusQuickEditLeaf();
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

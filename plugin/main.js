var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => FolderBoardPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian5 = require("obsidian");

// src/board-view.ts
var import_obsidian3 = require("obsidian");

// src/name-modal.ts
var import_obsidian = require("obsidian");
var NamePromptModal = class extends import_obsidian.Modal {
  constructor(app, opts) {
    super(app);
    this.opts = opts;
  }
  onOpen() {
    const { contentEl, modalEl } = this;
    modalEl.addClass("fb-prompt-modal");
    contentEl.empty();
    const header = contentEl.createDiv({ cls: "fb-prompt-header" });
    header.createDiv({ cls: "fb-prompt-title", text: this.opts.title });
    if (this.opts.destinationLabel) {
      header.createSpan({
        cls: "fb-prompt-dest",
        text: this.opts.destinationLabel
      });
    }
    const input = contentEl.createEl("input", {
      type: "text",
      cls: "fb-prompt-input",
      placeholder: this.opts.placeholder,
      value: this.opts.initialValue || ""
    });
    const footer = contentEl.createDiv({ cls: "fb-prompt-footer" });
    const cancelBtn = footer.createEl("button", { text: "\uCDE8\uC18C" });
    const submitBtn = footer.createEl("button", {
      cls: "mod-cta",
      text: this.opts.confirmLabel || "\uC0DD\uC131"
    });
    const commit = async () => {
      const value = input.value.trim();
      if (!value) return;
      this.close();
      await this.opts.onSubmit(value);
    };
    cancelBtn.addEventListener("click", () => this.close());
    submitBtn.addEventListener("click", () => void commit());
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.isComposing) {
        e.preventDefault();
        void commit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        this.close();
      }
    });
    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/native-sync.ts
var import_obsidian2 = require("obsidian");
function getNativeFileExplorerItems(app) {
  try {
    const leaves = app.workspace.getLeavesOfType("file-explorer");
    if (!leaves || leaves.length === 0) return null;
    const view = leaves[0].view;
    return view?.fileItems || null;
  } catch {
    return null;
  }
}
function applyNativeDecoration(app, path, iconContainer, titleEl, fallbackIcon) {
  iconContainer.empty();
  const fileItems = getNativeFileExplorerItems(app);
  const nativeSelf = fileItems?.[path]?.selfEl;
  if (nativeSelf) {
    const inlineColor = nativeSelf.style.color || nativeSelf.style.getPropertyValue("--folder-color");
    if (inlineColor) {
      titleEl.style.color = inlineColor;
    }
    const customIcon = nativeSelf.querySelector(
      ".obsidian-icon-folder-icon, .iconic-icon, .folder-icon, [data-icon]"
    );
    if (customIcon) {
      const cloned = customIcon.cloneNode(true);
      cloned.classList.add("fb-cloned-native-icon");
      iconContainer.appendChild(cloned);
      return;
    }
  }
  (0, import_obsidian2.setIcon)(iconContainer, fallbackIcon);
}
function openNativeFileMenu(app, event, target, cb) {
  const menu = new import_obsidian2.Menu();
  if (target instanceof import_obsidian2.TFolder) {
    const folderPath = target.isRoot() || target.path === "/" ? "" : target.path;
    menu.addItem(
      (item) => item.setTitle("\uC0C8 \uB178\uD2B8").setIcon("file-plus").setSection("action-primary").onClick(() => cb.onRequestCreateNote(folderPath))
    );
    menu.addItem(
      (item) => item.setTitle("\uC0C8 \uD3F4\uB354").setIcon("folder-plus").setSection("action-primary").onClick(() => cb.onRequestCreateFolder(folderPath))
    );
    if (!target.isRoot()) {
      menu.addItem(
        (item) => item.setTitle("\uC774\uB984 \uBC14\uAFB8\uAE30").setIcon("pencil").setSection("danger").onClick(() => cb.onRequestRename(target))
      );
      menu.addItem(
        (item) => item.setTitle("\uC0AD\uC81C").setIcon("trash").setSection("danger").setWarning(true).onClick(async () => {
          try {
            await app.vault.trash(target, true);
            cb.onMutated();
          } catch (err) {
            new import_obsidian2.Notice(`\uC0AD\uC81C \uC2E4\uD328: ${err instanceof Error ? err.message : String(err)}`);
          }
        })
      );
    }
  } else if (target instanceof import_obsidian2.TFile) {
    menu.addItem(
      (item) => item.setTitle("\uC0C8 \uD0ED\uC5D0\uC11C \uC5F4\uAE30").setIcon("file-plus").setSection("open").onClick(async () => {
        await app.workspace.getLeaf("tab").openFile(target);
      })
    );
    menu.addItem(
      (item) => item.setTitle("\uC774\uB984 \uBC14\uAFB8\uAE30").setIcon("pencil").setSection("danger").onClick(() => cb.onRequestRename(target))
    );
    menu.addItem(
      (item) => item.setTitle("\uC0AD\uC81C").setIcon("trash").setSection("danger").setWarning(true).onClick(async () => {
        try {
          await app.vault.trash(target, true);
          cb.onMutated();
        } catch (err) {
          new import_obsidian2.Notice(`\uC0AD\uC81C \uC2E4\uD328: ${err instanceof Error ? err.message : String(err)}`);
        }
      })
    );
  }
  app.workspace.trigger("file-menu", menu, target, "file-explorer-context-menu", cb.leaf);
  menu.showAtMouseEvent(event);
}
function getFolderByPath(app, path) {
  if (!path || path === "/") return app.vault.getRoot();
  const abs = app.vault.getAbstractFileByPath(path);
  return abs instanceof import_obsidian2.TFolder ? abs : null;
}
function getFileByPath(app, path) {
  const abs = app.vault.getAbstractFileByPath(path);
  return abs instanceof import_obsidian2.TFile ? abs : null;
}

// src/board-view.ts
var VIEW_TYPE_FOLDER_BOARD = "folder-board-view";
var DRAG_MIME = "application/x-obsidian-folder-board";
var CARD_REORDER_MIME = "application/x-obsidian-folder-board-card";
var CARD_HEADER_KEY = "__card_header__";
function normalizeFolderRef(folder) {
  if (!folder || folder.isRoot() || folder.path === "/") return "";
  return folder.path;
}
function normalizeFolderStr(path) {
  if (!path || path === "/") return "";
  return path.replace(/^\/+|\/+$/g, "");
}
var FolderBoardView = class _FolderBoardView extends import_obsidian3.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    // [ID 6.5.15] 옵시디언 기본 뒤로가기(History) 활성화
    // -> navigation = true로 설정해야 노트 진입 후 뒤로가기(Cmd+Opt+Left / 마우스 뒤로가기)로 폴더 보드로 즉시 복귀할 수 있음.
    this.navigation = true;
    this.currentFolderPath = "";
    this.searchQuery = "";
    this.focusedCardIndex = 0;
    this.focusedItemKey = null;
    // [ID 6.5.10] 예비 포커싱(커서)과 다중 선택 분리
    // -> 단일 이동 시엔 밝은 테두리만 움직이고 selectedPaths는 비워 테마의 강렬한 선택 색상(갈색 등)을 방지함.
    this.selectedPaths = /* @__PURE__ */ new Set();
    this.selectionAnchorIndex = null;
    this.shelfPaths = [];
    this.undoStack = [];
    this.quickLookOpen = false;
    this.quickLookPath = null;
    this.renderedCards = [];
    // [ID 6.5.11] Option(Alt)+방향키 들고 이동 & Cmd+C/X/V 복사·잘라내기·붙여넣기 클립보드 상태
    // -> cut은 이동(원본 반투명 표시), copy는 재귀 복제(여러 폴더에 반복 붙여넣기 가능)로 동작함.
    this.carryPaths = [];
    this.carryCardIndex = 0;
    this.carryTargetFolderPath = null;
    this.clipboardMode = null;
    this.clipboardPaths = [];
    this.activeDragPaths = [];
    this.draggingCardPath = null;
    this.reorderTargetEl = null;
    this.reorderPosition = "before";
    this.currentDropEl = null;
    this.isDragging = false;
    this.isSubModalOpen = false;
    this.renderedSortIcon = null;
    this.layoutBtns = [];
    this.markdownComponent = null;
    this.vaultRefs = [];
    this.resizeObserver = null;
    // [ID 6.5.32] 뷰 전용 Obsidian Scope -> 옵시디언 글로벌 Cmd+F/A/D 단축키보다 우선해 보드 활성 시 안전하게 가로챔
    this.viewScope = null;
    this.scopeActive = false;
    this.refreshTimer = null;
    this.plugin = plugin;
    this.boundKeydown = this.handleKeydown.bind(this);
    this.boundKeyup = this.handleKeyup.bind(this);
    this.boundWindowBlur = this.cancelCarryMode.bind(this);
    this.boundDragOver = this.handleDragOver.bind(this);
    this.boundDragLeave = this.handleDragLeave.bind(this);
    this.boundDrop = this.handleDrop.bind(this);
    this.boundDragEnd = this.handleDragEnd.bind(this);
  }
  getViewType() {
    return VIEW_TYPE_FOLDER_BOARD;
  }
  getDisplayText() {
    if (!this.currentFolderPath) return "Folder Board";
    const parts = this.currentFolderPath.split("/").filter(Boolean);
    return parts[parts.length - 1] || "Folder Board";
  }
  getIcon() {
    return "layout-grid";
  }
  getState() {
    return {
      folderPath: this.currentFolderPath,
      focusedCardIndex: this.focusedCardIndex,
      focusedItemKey: this.focusedItemKey
    };
  }
  async setState(state, result) {
    if (typeof state?.folderPath === "string") {
      this.currentFolderPath = normalizeFolderStr(state.folderPath);
    }
    if (typeof state?.focusedCardIndex === "number") {
      this.focusedCardIndex = state.focusedCardIndex;
    }
    if (state?.focusedItemKey !== void 0) {
      this.focusedItemKey = state.focusedItemKey;
    }
    await super.setState(state, result);
    if (this.shellEl) {
      this.renderAll();
      this.scrollFocusedIntoView();
      requestAnimationFrame(() => this.shellEl?.focus());
    }
  }
  setFolderPath(folderPath) {
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
  refresh() {
    if (this.shellEl) this.renderAll();
  }
  isInputFocused() {
    return Boolean(
      document.activeElement instanceof HTMLElement && document.activeElement.closest("input, textarea, select")
    );
  }
  hasSelectedText() {
    const sel = window.getSelection();
    return Boolean(sel && sel.toString().length > 0);
  }
  setupViewScope() {
    const scope = new import_obsidian3.Scope(this.app.scope);
    const registerModAndCtrl = (keys, handler) => {
      for (const key of keys) {
        scope.register(["Mod"], key, handler);
        scope.register(["Ctrl"], key, handler);
      }
    };
    registerModAndCtrl(["f", "\u3139"], (evt) => {
      evt.preventDefault();
      evt.stopImmediatePropagation();
      this.focusSearchBox();
      return false;
    });
    registerModAndCtrl(["a", "\u3141"], (evt) => {
      if (this.isInputFocused()) return true;
      evt.preventDefault();
      evt.stopImmediatePropagation();
      this.selectAllInFocusedCard();
      return false;
    });
    registerModAndCtrl(["d", "\u3147"], (evt) => {
      if (this.isInputFocused()) return true;
      evt.preventDefault();
      evt.stopImmediatePropagation();
      void this.duplicateFocusedItem();
      return false;
    });
    registerModAndCtrl(["c", "\u314A"], (evt) => {
      if (this.isInputFocused() || this.hasSelectedText()) return true;
      if (this.copySelectedOrFocused()) {
        evt.preventDefault();
        evt.stopImmediatePropagation();
        return false;
      }
      return true;
    });
    registerModAndCtrl(["x", "\u314C"], (evt) => {
      if (this.isInputFocused() || this.hasSelectedText()) return true;
      if (this.cutSelectedOrFocused()) {
        evt.preventDefault();
        evt.stopImmediatePropagation();
        return false;
      }
      return true;
    });
    registerModAndCtrl(["v", "\u314D"], (evt) => {
      if (this.isInputFocused()) return true;
      if (this.clipboardPaths.length > 0 && this.clipboardMode) {
        evt.preventDefault();
        evt.stopImmediatePropagation();
        void this.pasteClipboardToFocusedFolder();
        return false;
      }
      return true;
    });
    this.viewScope = scope;
  }
  syncScopeState() {
    const shouldBeActive = !this.isSubModalOpen && !document.querySelector(".modal-container") && this.app.workspace.getActiveViewOfType(_FolderBoardView) === this;
    if (shouldBeActive && !this.scopeActive && this.viewScope) {
      this.app.keymap.pushScope(this.viewScope);
      this.scopeActive = true;
    } else if (!shouldBeActive && this.scopeActive && this.viewScope) {
      this.app.keymap.popScope(this.viewScope);
      this.scopeActive = false;
    }
  }
  focusSearchBox() {
    this.searchInputEl?.focus();
    this.searchInputEl?.select();
  }
  async onOpen() {
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
    requestAnimationFrame(() => this.shellEl?.focus());
  }
  async onClose() {
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
  buildShell() {
    this.shellEl = this.contentEl.createDiv({
      cls: "fb-shell",
      attr: { tabindex: "-1" }
    });
    const header = this.shellEl.createDiv({ cls: "fb-header" });
    const navLeft = header.createDiv({ cls: "fb-nav-left" });
    this.backBtnEl = navLeft.createEl("button", {
      cls: "clickable-icon fb-tool-btn",
      attr: { "aria-label": "\uC0C1\uC704 \uD3F4\uB354 (Backspace)" }
    });
    (0, import_obsidian3.setIcon)(this.backBtnEl, "arrow-left");
    this.backBtnEl.addEventListener("click", () => this.goUp());
    this.breadcrumbEl = navLeft.createDiv({ cls: "fb-breadcrumb" });
    const controls = header.createDiv({ cls: "fb-controls" });
    const searchWrap = controls.createDiv({ cls: "search-input-container fb-search-wrap" });
    this.searchInputEl = searchWrap.createEl("input", {
      type: "search",
      cls: "fb-search-input",
      placeholder: "\uAC80\uC0C9..."
    });
    this.clearSearchEl = searchWrap.createDiv({
      cls: "search-input-clear-button is-hidden",
      attr: { "aria-label": "\uAC80\uC0C9 \uC9C0\uC6B0\uAE30" }
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
    const colGroup = controls.createDiv({ cls: "fb-segmented" });
    const layoutOptions = [
      { value: 2, label: "2", aria: "2\uC5F4 \uADF8\uB9AC\uB4DC" },
      { value: 3, label: "3", aria: "3\uC5F4 \uADF8\uB9AC\uB4DC" },
      { value: 4, label: "4", aria: "4\uC5F4 \uADF8\uB9AC\uB4DC" },
      { value: "auto", label: "", aria: "\uC138\uB85C \uBAA8\uB4DC (\uB113\uC774 \uC790\uB3D9 \uB9DE\uCDA4)", icon: "layout-grid" },
      { value: "scroll", label: "", aria: "\uAC00\uB85C \uBAA8\uB4DC (\uC138\uB85C \uD3BC\uCE68 \xB7 \uAC00\uB85C \uC2A4\uD06C\uB864)", icon: "columns" }
    ];
    this.layoutBtns = layoutOptions.map((opt) => {
      const btn = colGroup.createEl("button", {
        cls: "clickable-icon fb-seg-btn",
        text: opt.label,
        attr: { "aria-label": opt.aria }
      });
      if (opt.icon) (0, import_obsidian3.setIcon)(btn, opt.icon);
      btn.addEventListener("click", async () => {
        this.plugin.settings.gridCols = opt.value;
        await this.plugin.saveSettings();
        this.renderGridAndHeader();
      });
      return { value: opt.value, el: btn };
    });
    this.sortBtnEl = controls.createEl("button", { cls: "clickable-icon fb-tool-btn" });
    this.sortBtnEl.addEventListener("click", async () => {
      this.plugin.settings.sortBy = this.plugin.settings.sortBy === "name" ? "mtime" : "name";
      await this.plugin.saveSettings();
      this.renderGridAndHeader();
    });
    controls.createDiv({ cls: "fb-divider" });
    this.newNoteBtnEl = controls.createEl("button", { cls: "clickable-icon fb-tool-btn" });
    (0, import_obsidian3.setIcon)(this.newNoteBtnEl, "file-plus");
    this.newNoteBtnEl.addEventListener("click", () => this.promptCreateNote());
    this.newFolderBtnEl = controls.createEl("button", { cls: "clickable-icon fb-tool-btn" });
    (0, import_obsidian3.setIcon)(this.newFolderBtnEl, "folder-plus");
    this.newFolderBtnEl.addEventListener("click", () => this.promptCreateFolder());
    controls.createDiv({ cls: "fb-divider" });
    this.qlBtnEl = controls.createEl("button", {
      cls: "clickable-icon fb-tool-btn",
      attr: { "aria-label": "\uBBF8\uB9AC\uBCF4\uAE30 (Space)" }
    });
    (0, import_obsidian3.setIcon)(this.qlBtnEl, "panel-right");
    this.qlBtnEl.addEventListener("click", () => {
      this.quickLookOpen = !this.quickLookOpen;
      void this.updateQuickLook();
      this.updateToolbarStates();
    });
    const body = this.shellEl.createDiv({ cls: "fb-body" });
    this.canvasEl = body.createDiv({ cls: "fb-canvas" });
    this.gridEl = this.canvasEl.createDiv({ cls: "fb-grid" });
    this.resizeObserver = new ResizeObserver(() => {
      if (this.plugin.settings.gridCols === "auto" && this.renderedCards.length > 0) {
        this.applyGridLayoutClasses(this.renderedCards.length);
      }
    });
    this.resizeObserver.observe(this.canvasEl);
    this.canvasEl.addEventListener(
      "wheel",
      (e) => {
        if (this.plugin.settings.gridCols !== "scroll") return;
        const target = e.target;
        if (target?.closest(".fb-card-body")) return;
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          this.canvasEl.scrollLeft += e.deltaY;
          e.preventDefault();
        }
      },
      { passive: false }
    );
    this.qlDrawerEl = body.createDiv({ cls: "fb-quicklook" });
    const qlHeader = this.qlDrawerEl.createDiv({ cls: "fb-ql-header" });
    this.qlTitleEl = qlHeader.createSpan({ cls: "fb-ql-title" });
    const qlActions = qlHeader.createDiv({ cls: "fb-ql-actions" });
    const qlOpenBtn = qlActions.createEl("button", {
      cls: "clickable-icon fb-tool-btn",
      attr: { "aria-label": "\uB178\uD2B8 \uC5F4\uAE30 (Enter)" }
    });
    (0, import_obsidian3.setIcon)(qlOpenBtn, "arrow-up-right");
    qlOpenBtn.addEventListener("click", () => {
      const targetFile = (this.quickLookPath ? getFileByPath(this.app, this.quickLookPath) : null) || this.getFocusedFile();
      if (targetFile) void this.openFile(targetFile);
    });
    const qlCloseBtn = qlActions.createEl("button", {
      cls: "clickable-icon fb-tool-btn",
      attr: { "aria-label": "\uBBF8\uB9AC\uBCF4\uAE30 \uB2EB\uAE30" }
    });
    (0, import_obsidian3.setIcon)(qlCloseBtn, "x");
    qlCloseBtn.addEventListener("click", () => {
      this.quickLookOpen = false;
      this.quickLookPath = null;
      void this.updateQuickLook();
      this.updateToolbarStates();
    });
    this.qlBodyEl = this.qlDrawerEl.createDiv({ cls: "fb-ql-body markdown-rendered" });
    this.shelfEl = this.shellEl.createDiv({
      cls: "fb-shelf is-collapsed",
      attr: { "data-drop-shelf": "true" }
    });
    const shelfIcon = this.shelfEl.createSpan({ cls: "fb-shelf-icon" });
    (0, import_obsidian3.setIcon)(shelfIcon, "inbox");
    this.shelfListEl = this.shelfEl.createDiv({ cls: "fb-shelf-list" });
    const shelfActions = this.shelfEl.createDiv({ cls: "fb-shelf-actions" });
    this.shelfDropHereBtn = shelfActions.createEl("button", {
      cls: "mod-cta fb-compact-btn",
      text: "\uC774\uB3D9"
    });
    this.shelfDropHereBtn.addEventListener("click", () => {
      const target = this.getFocusedTargetFolderPath();
      void this.moveFiles(this.shelfPaths, target);
    });
    const shelfClearBtn = shelfActions.createEl("button", {
      cls: "clickable-icon fb-tool-btn",
      attr: { "aria-label": "\uBC14\uAD6C\uB2C8 \uBE44\uC6B0\uAE30" }
    });
    (0, import_obsidian3.setIcon)(shelfClearBtn, "x");
    shelfClearBtn.addEventListener("click", () => {
      this.shelfPaths = [];
      this.renderShelf();
    });
    this.selectionBarEl = this.shellEl.createDiv({ cls: "fb-selection-bar is-hidden" });
    this.selectionCountEl = this.selectionBarEl.createSpan({ cls: "fb-selection-count" });
    const selShelfBtn = this.selectionBarEl.createEl("button", {
      cls: "clickable-icon fb-selection-btn",
      text: "\uBC14\uAD6C\uB2C8"
    });
    selShelfBtn.addEventListener("click", () => {
      this.addPathsToShelf([...this.selectedPaths]);
    });
    const selClearBtn = this.selectionBarEl.createEl("button", {
      cls: "clickable-icon fb-tool-btn",
      attr: { "aria-label": "\uC120\uD0DD \uD574\uC81C" }
    });
    (0, import_obsidian3.setIcon)(selClearBtn, "x");
    selClearBtn.addEventListener("click", () => {
      this.selectedPaths.clear();
      this.selectionAnchorIndex = null;
      this.syncFocusAndSelectionDOM();
      this.renderSelectionBar();
    });
    this.carryPillEl = this.shellEl.createDiv({ cls: "fb-carry-pill is-hidden" });
  }
  bindVaultEvents() {
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
        if (file instanceof import_obsidian3.TFolder && this.plugin.isFolderExpanded(oldPath)) {
          void this.plugin.renameExpandedFolder(oldPath, file.path);
        }
        if (this.currentFolderPath === oldPath) {
          this.currentFolderPath = normalizeFolderStr(file.path);
        }
        scheduleRefresh();
      })
    );
  }
  unbindVaultEvents() {
    this.vaultRefs.forEach((ref) => {
      this.app.vault.offref(ref);
      this.app.workspace.offref(ref);
    });
    this.vaultRefs = [];
  }
  bindInteractionEvents() {
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
  getSortedChildren(folder) {
    const folders = [];
    const files = [];
    for (const child of folder.children) {
      if (child instanceof import_obsidian3.TFolder) folders.push(child);
      else if (child instanceof import_obsidian3.TFile) files.push(child);
    }
    folders.sort((a, b) => a.name.localeCompare(b.name, void 0, { numeric: true }));
    const customOrder = this.plugin.getFolderOrder(normalizeFolderRef(folder));
    if (customOrder.length > 0) {
      const rank = new Map(customOrder.map((p, idx) => [p, idx]));
      folders.sort((a, b) => {
        const ra = rank.has(normalizeFolderRef(a)) ? rank.get(normalizeFolderRef(a)) : Number.MAX_SAFE_INTEGER;
        const rb = rank.has(normalizeFolderRef(b)) ? rank.get(normalizeFolderRef(b)) : Number.MAX_SAFE_INTEGER;
        if (ra !== rb) return ra - rb;
        return a.name.localeCompare(b.name, void 0, { numeric: true });
      });
    }
    if (this.plugin.settings.sortBy === "mtime") {
      files.sort((a, b) => b.stat.mtime - a.stat.mtime);
    } else {
      files.sort((a, b) => a.basename.localeCompare(b.basename, void 0, { numeric: true }));
    }
    return { folders, files };
  }
  countFilesRecursive(folder) {
    let count = 0;
    for (const child of folder.children) {
      if (child instanceof import_obsidian3.TFile) count++;
      else if (child instanceof import_obsidian3.TFolder) count += this.countFilesRecursive(child);
    }
    return count;
  }
  collectCardTreeItems(folder, depth, out, includeSubfolders) {
    const q = this.searchQuery.trim().toLowerCase();
    const { folders, files } = this.getSortedChildren(folder);
    if (includeSubfolders) {
      for (const sub of folders) {
        const subPath = normalizeFolderRef(sub);
        const expanded = q ? true : this.plugin.isFolderExpanded(subPath);
        const childOut = [];
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
  buildBoardCards() {
    this.currentFolderPath = normalizeFolderStr(this.currentFolderPath);
    let currentFolder = getFolderByPath(this.app, this.currentFolderPath);
    if (!currentFolder) {
      this.currentFolderPath = "";
      currentFolder = this.app.vault.getRoot();
    }
    const q = this.searchQuery.trim().toLowerCase();
    const cards = [];
    const { folders: childFolders, files: directFiles } = this.getSortedChildren(currentFolder);
    const directItems = [];
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
    for (const sub of childFolders) {
      const subPath = normalizeFolderRef(sub);
      const items = [];
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
  getFocusedTargetFolderPath() {
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
  getFocusedFolderDisplayName() {
    const targetPath = this.getFocusedTargetFolderPath();
    return targetPath || this.app.vault.getName();
  }
  findFocusedCardAndIndex() {
    const card = this.renderedCards[this.focusedCardIndex] || null;
    if (!card || !this.focusedItemKey) return { card, itemIndex: -1, item: null };
    const idx = card.items.findIndex((it) => it.key === this.focusedItemKey);
    return { card, itemIndex: idx, item: idx >= 0 ? card.items[idx] : null };
  }
  getFocusedFile() {
    if (this.focusedItemKey?.startsWith("file:")) {
      const f = getFileByPath(this.app, this.focusedItemKey.slice(5));
      if (f) return f;
    }
    return null;
  }
  // =========================================================
  // 렌더링 & DOM 무파괴 인플레이스 포커스 동기화
  // =========================================================
  renderAll() {
    this.renderGridAndHeader();
    this.renderShelf();
    this.renderSelectionBar();
    this.renderCarryPill();
    if (this.quickLookOpen) void this.updateQuickLook();
  }
  renderGridAndHeader() {
    const cards = this.buildBoardCards();
    this.renderBreadcrumb();
    this.renderGrid(cards);
    this.syncFocusAndSelectionDOM();
    this.updateToolbarStates();
    this.leaf.updateHeader?.();
  }
  // [ID 6.5.13] DOM 무파괴 포커스/선택 인플레이스 갱신
  // -> 방향키 이동 때마다 그리드와 툴바 SVG를 재생성하면 Baseline 등 테마의 아이콘/버튼 전환 효과가 깜빡이므로
  // -> 기존 DOM 노드의 CSS 클래스만 토글해 깜빡임을 원천 제거하고 60fps 반응성을 확보함.
  syncFocusAndSelectionDOM() {
    const cardEls = this.gridEl.querySelectorAll(".fb-card");
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
      const headerEl = cardEl.querySelector(".fb-card-header");
      if (headerEl) headerEl.toggleClass("is-header-focused", isHeaderFocused);
    });
    const rowEls = this.gridEl.querySelectorAll(".fb-row");
    rowEls.forEach((rowEl) => {
      const key = rowEl.dataset.itemKey || "";
      const itemPath = rowEl.dataset.dragPath || "";
      const dropPath = rowEl.dataset.dropFolder;
      const cardIdx = Number(rowEl.dataset.cardIndex);
      const isFocused = !isCarrying && cardIdx === this.focusedCardIndex && key === this.focusedItemKey;
      const isSelected = Boolean(itemPath && this.selectedPaths.has(itemPath));
      const isCut = Boolean(itemPath && cutSet.has(itemPath));
      const isCarryFolder = isCarrying && dropPath !== void 0 && cardIdx === this.carryCardIndex && this.carryTargetFolderPath === dropPath;
      rowEl.toggleClass("is-focused", isFocused);
      rowEl.toggleClass("is-selected", isSelected);
      rowEl.toggleClass("is-cut", isCut);
      rowEl.toggleClass("is-carry-target", isCarryFolder);
    });
    this.updateActionTooltipsOnly();
  }
  updateActionTooltipsOnly() {
    const targetLabel = this.getFocusedFolderDisplayName();
    this.newNoteBtnEl.setAttr("aria-label", `\uC0C8 \uB178\uD2B8 \u2192 ${targetLabel} (N)`);
    this.newFolderBtnEl.setAttr("aria-label", `\uC0C8 \uD3F4\uB354 \u2192 ${targetLabel} (Shift+N)`);
  }
  updateToolbarStates() {
    const s = this.plugin.settings;
    this.backBtnEl.disabled = !this.currentFolderPath;
    this.layoutBtns.forEach(({ value, el }) => {
      el.toggleClass("is-active", s.gridCols === value);
    });
    const nextSortIcon = s.sortBy === "name" ? "arrow-up-down" : "clock";
    if (this.renderedSortIcon !== nextSortIcon) {
      this.renderedSortIcon = nextSortIcon;
      this.sortBtnEl.empty();
      (0, import_obsidian3.setIcon)(this.sortBtnEl, nextSortIcon);
    }
    this.sortBtnEl.setAttr("aria-label", s.sortBy === "name" ? "\uC815\uB82C: \uC774\uB984\uC21C" : "\uC815\uB82C: \uCD5C\uADFC \uC218\uC815\uC21C");
    this.updateActionTooltipsOnly();
    this.qlBtnEl.toggleClass("is-active", this.quickLookOpen);
  }
  renderBreadcrumb() {
    this.breadcrumbEl.empty();
    const segments = [
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
        (0, import_obsidian3.setIcon)(sep, "chevron-right");
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
  applyGridLayoutClasses(cardCount) {
    const prefLayout = this.plugin.settings.gridCols;
    const isScrollMode = prefLayout === "scroll";
    this.canvasEl.toggleClass("is-horizontal-scroll", isScrollMode);
    if (isScrollMode) {
      this.gridEl.className = "fb-grid fb-layout-scroll";
    } else if (prefLayout === "auto") {
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
  openContextMenu(e, target) {
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
  renderGrid(cards) {
    this.gridEl.empty();
    this.applyGridLayoutClasses(cards.length);
    if (cards.length === 0) {
      this.gridEl.createDiv({ cls: "fb-empty-grid", text: "\uC77C\uCE58\uD558\uB294 \uD56D\uBAA9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" });
      return;
    }
    const isCarrying = this.carryPaths.length > 0;
    cards.forEach((cardModel, cardIdx) => {
      const isFocusedCard = !isCarrying && cardIdx === this.focusedCardIndex;
      const isCarryCard = isCarrying && cardIdx === this.carryCardIndex && this.carryTargetFolderPath === cardModel.folderPath;
      const cardEl = this.gridEl.createDiv({
        cls: "fb-card" + (cardModel.isRootCard ? " is-root-card" : "") + (isFocusedCard ? " is-focused-card" : "") + (isCarryCard ? " is-carry-target" : ""),
        attr: {
          "data-drop-folder": cardModel.folderPath,
          "data-card-index": String(cardIdx)
        }
      });
      const isHeaderFocused = isFocusedCard && this.focusedItemKey === CARD_HEADER_KEY;
      const headerEl = cardEl.createDiv({
        cls: "fb-card-header" + (isHeaderFocused ? " is-header-focused" : "")
      });
      const titleWrap = headerEl.createDiv({ cls: "fb-card-title-wrap" });
      const iconEl = titleWrap.createSpan({ cls: "fb-native-icon" });
      const nameEl = titleWrap.createSpan({ cls: "fb-card-title", text: cardModel.title });
      if (cardModel.isRootCard) {
        (0, import_obsidian3.setIcon)(iconEl, "inbox");
        titleWrap.createSpan({ cls: "fb-root-pill", text: "\uC9C1\uC18D" });
      } else {
        applyNativeDecoration(this.app, cardModel.folderPath, iconEl, nameEl, "folder");
      }
      const metaEl = headerEl.createDiv({ cls: "fb-card-meta" });
      metaEl.createSpan({ cls: "fb-count", text: String(cardModel.totalCount) });
      if (!cardModel.isRootCard) {
        headerEl.setAttr("draggable", "true");
        headerEl.addEventListener(
          "dragstart",
          (e) => this.handleCardDragStart(e, cardModel.folderPath, cardModel.title)
        );
        const drillBtn = metaEl.createEl("button", {
          cls: "clickable-icon fb-drill-btn",
          attr: { "aria-label": `${cardModel.title} \uC5F4\uAE30` }
        });
        (0, import_obsidian3.setIcon)(drillBtn, "arrow-right");
        drillBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.navigateToFolder(cardModel.folderPath);
        });
        headerEl.addEventListener("dblclick", () => this.navigateToFolder(cardModel.folderPath));
      }
      headerEl.addEventListener("contextmenu", (e) => {
        const folder = getFolderByPath(this.app, cardModel.folderPath);
        if (folder) this.openContextMenu(e, folder);
      });
      headerEl.addEventListener("click", () => {
        this.selectedPaths.clear();
        this.selectionAnchorIndex = null;
        if (!cardModel.isRootCard) {
          this.focusedCardIndex = cardIdx;
          this.focusedItemKey = CARD_HEADER_KEY;
          this.syncFocusAndSelectionDOM();
          this.renderSelectionBar();
          this.scrollFocusedIntoView();
        } else if (cardModel.items.length > 0) {
          const firstFileIdx = cardModel.items.findIndex((it) => it.type === "file");
          this.focusCardItem(cardIdx, firstFileIdx >= 0 ? firstFileIdx : 0);
        } else {
          this.focusedCardIndex = cardIdx;
          this.focusedItemKey = null;
          this.syncFocusAndSelectionDOM();
          this.renderSelectionBar();
        }
      });
      const listEl = cardEl.createDiv({ cls: "fb-card-body nav-files-container" });
      listEl.addEventListener("contextmenu", (e) => {
        if (e.target?.closest(".fb-row")) return;
        const folder = getFolderByPath(this.app, cardModel.folderPath);
        if (folder) this.openContextMenu(e, folder);
      });
      if (cardModel.items.length === 0) {
        listEl.createDiv({ cls: "fb-empty-card", text: "\uBE44\uC5B4 \uC788\uC74C" });
        return;
      }
      cardModel.items.forEach((item, itemIdx) => {
        const isFocused = !isCarrying && cardIdx === this.focusedCardIndex && this.focusedItemKey === item.key;
        if (item.type === "folder") {
          const isSelected = this.selectedPaths.has(item.path);
          const isCarryFolder = isCarrying && cardIdx === this.carryCardIndex && this.carryTargetFolderPath === item.path;
          const row = listEl.createDiv({
            cls: "tree-item-self is-clickable nav-folder-title fb-row" + (isSelected ? " is-selected" : "") + (isFocused ? " is-focused" : "") + (isCarryFolder ? " is-carry-target" : ""),
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
          (0, import_obsidian3.setIcon)(caret, "chevron-down");
          const fIcon = row.createSpan({ cls: "fb-native-icon" });
          const fTitle = row.createSpan({ cls: "tree-item-inner nav-folder-title-content", text: item.name });
          applyNativeDecoration(this.app, item.path, fIcon, fTitle, "folder");
          if (item.childCount !== void 0) {
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
            cls: "tree-item-self is-clickable nav-file-title fb-row" + (isSelected ? " is-selected" : "") + (isFocused ? " is-focused" : ""),
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
  renderShelf() {
    this.shelfPaths = this.shelfPaths.filter((p) => this.app.vault.getAbstractFileByPath(p) !== null);
    const hasItems = this.shelfPaths.length > 0;
    const shouldShow = hasItems || this.isDragging;
    this.shelfEl.toggleClass("is-collapsed", !shouldShow);
    this.shelfDropHereBtn.toggleClass("is-hidden", !hasItems);
    this.shelfListEl.empty();
    if (!hasItems) {
      this.shelfListEl.createSpan({ cls: "fb-shelf-hint", text: "\uC784\uC2DC \uBCF4\uAD00" });
      return;
    }
    for (const path of this.shelfPaths) {
      const abs = this.app.vault.getAbstractFileByPath(path);
      if (!abs) continue;
      const chip = this.shelfListEl.createDiv({
        cls: "fb-shelf-chip",
        attr: { draggable: "true", "data-drag-path": path }
      });
      const label = abs instanceof import_obsidian3.TFile && abs.extension === "md" ? abs.basename : abs.name;
      chip.createSpan({ text: label });
      const rm = chip.createEl("button", { cls: "clickable-icon fb-shelf-chip-rm" });
      (0, import_obsidian3.setIcon)(rm, "x");
      rm.addEventListener("click", (e) => {
        e.stopPropagation();
        this.shelfPaths = this.shelfPaths.filter((p) => p !== path);
        this.renderShelf();
      });
      chip.addEventListener("dragstart", (e) => this.handleDragStart(e, path, true));
    }
  }
  renderSelectionBar() {
    const count = this.selectedPaths.size;
    const hide = count < 2 || this.carryPaths.length > 0 || this.clipboardPaths.length > 0;
    this.selectionBarEl.toggleClass("is-hidden", hide);
    if (!hide) {
      this.selectionCountEl.setText(`${count}\uAC1C \uC120\uD0DD\uB428`);
    }
  }
  renderCarryPill() {
    if (this.carryPaths.length > 0 && this.carryTargetFolderPath !== null) {
      const targetName = this.carryTargetFolderPath || this.app.vault.getName();
      this.carryPillEl.setText(`${this.carryPaths.length}\uAC1C \u2192 ${targetName}`);
      this.carryPillEl.removeClass("is-hidden");
      return;
    }
    this.clipboardPaths = this.clipboardPaths.filter(
      (p) => this.app.vault.getAbstractFileByPath(p) !== null
    );
    if (this.clipboardPaths.length > 0 && this.clipboardMode) {
      const label = this.clipboardMode === "copy" ? `${this.clipboardPaths.length}\uAC1C \uBCF5\uC0AC\uB428 \xB7 \u2318V \uBD99\uC5EC\uB123\uAE30` : `${this.clipboardPaths.length}\uAC1C \uC798\uB77C\uB0C4 \xB7 \u2318V \uC774\uB3D9`;
      this.carryPillEl.setText(label);
      this.carryPillEl.removeClass("is-hidden");
      return;
    }
    this.clipboardMode = null;
    this.carryPillEl.addClass("is-hidden");
  }
  async updateQuickLook(targetFileOverride) {
    this.qlDrawerEl.toggleClass("is-open", this.quickLookOpen);
    if (!this.quickLookOpen) return;
    const file = targetFileOverride !== void 0 ? targetFileOverride : this.getFocusedFile();
    this.quickLookPath = file ? file.path : null;
    this.unloadMarkdownComponent();
    this.qlBodyEl.empty();
    if (!file) {
      this.qlTitleEl.setText("\uBBF8\uB9AC\uBCF4\uAE30");
      this.qlBodyEl.createDiv({ cls: "fb-ql-empty", text: "\uC120\uD0DD\uB41C \uD30C\uC77C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" });
      return;
    }
    this.qlTitleEl.setText(file.extension === "md" ? file.basename : file.name);
    if (file.extension !== "md") {
      this.qlBodyEl.createDiv({ cls: "fb-ql-empty", text: file.name });
      return;
    }
    try {
      const content = await this.app.vault.cachedRead(file);
      this.markdownComponent = new import_obsidian3.Component();
      this.markdownComponent.load();
      await import_obsidian3.MarkdownRenderer.render(this.app, content, this.qlBodyEl, file.path, this.markdownComponent);
    } catch {
      this.qlBodyEl.createDiv({ cls: "fb-ql-empty", text: "\uB0B4\uC6A9\uC744 \uBD88\uB7EC\uC62C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
    }
  }
  unloadMarkdownComponent() {
    if (this.markdownComponent) {
      this.markdownComponent.unload();
      this.markdownComponent = null;
    }
  }
  // =========================================================
  // 포커스 · 범위 다중 선택 · 탐색 · 파일 열기
  // =========================================================
  focusCardItem(cardIdx, itemIndex, { clearSelection = true, updatePreview = true } = {}) {
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
    if (updatePreview && this.quickLookOpen && this.selectedPaths.size === 0 && item.type === "file") {
      void this.updateQuickLook(getFileByPath(this.app, item.path));
    }
    this.scrollFocusedIntoView();
  }
  // [ID 6.5.16] 카드 단위 좌우 스크롤 보정 (첫/끝 카드 짤림 방지)
  // -> 0번 카드는 scrollLeft = 0, 마지막 카드는 scrollWidth 끝까지 완전히 밀어주어 좌우 짤림 현상을 없애고,
  // -> 중간 카드는 카드 프레임 전체를 먼저 수평 정렬한 뒤 내부 행을 수직 스크롤함.
  scrollFocusedIntoView() {
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
          const activeCardEl = this.gridEl.querySelector(
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
        const activeCardEl = this.gridEl.querySelector(
          `.fb-card[data-card-index="${activeCardIdx}"]`
        );
        if (activeCardEl) {
          activeCardEl.scrollIntoView({ block: "nearest", inline: "nearest" });
        }
      }
      const rowEl = this.gridEl.querySelector(".fb-row.is-carry-target") || this.gridEl.querySelector(".fb-row.is-focused");
      if (rowEl) {
        rowEl.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    });
  }
  selectRangeInCard(cardIdx, anchorIdx, targetIdx) {
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
    this.syncFocusAndSelectionDOM();
    this.renderSelectionBar();
    this.scrollFocusedIntoView();
  }
  handleFileClick(e, path, cardIdx, itemIdx) {
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
    this.focusCardItem(cardIdx, itemIdx, { clearSelection: true, updatePreview: true });
  }
  // [ID 6.5.8] 동일 탭 노트 열기 + 뒤로가기 히스토리 보존
  // -> navigation = true인 현재 leaf에서 바로 openFile을 호출해야 옵시디언 기본 뒤로가기(Cmd+Opt+Left)로 Folder Board로 복귀됨.
  async openFile(file, forceNewTab = false) {
    if (forceNewTab || this.plugin.settings.openBehavior === "new-tab") {
      const newLeaf = this.app.workspace.getLeaf("tab");
      await newLeaf.openFile(file, { active: true });
      return;
    }
    await this.leaf.openFile(file, { active: true });
  }
  navigateToFolder(folderPath, focusChildFolderPath) {
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
  enterInlineSubfolderLevel(subfolderPath) {
    const folder = getFolderByPath(this.app, subfolderPath);
    const parentPath = normalizeFolderRef(folder?.parent);
    if (parentPath === this.currentFolderPath) {
      this.navigateToFolder(subfolderPath);
      return;
    }
    this.navigateToFolder(parentPath, subfolderPath);
  }
  goUp() {
    if (!this.currentFolderPath) return;
    const current = getFolderByPath(this.app, this.currentFolderPath);
    const parentPath = normalizeFolderRef(current?.parent);
    this.navigateToFolder(parentPath);
  }
  // =========================================================
  // [ID 6.5.21] Cmd/Ctrl + 방향키 들고 이동 (파일 + 폴더 지원 · 현재 위치 기준 바로 위/아래 폴더 타겟팅)
  // -> 위/아래 키 첫 입력 시 카드 최상단부터 다시 내려가지 않고, 현재 포커싱 위치 바로 위/아래 폴더로 즉시 점프함.
  // =========================================================
  isInvalidDropDest(destPath, movingPaths) {
    const normDest = normalizeFolderStr(destPath);
    return movingPaths.some((src) => {
      const normSrc = normalizeFolderStr(src);
      if (!normSrc) return true;
      return normDest === normSrc || normDest.startsWith(`${normSrc}/`);
    });
  }
  resolveCarrySourcePaths() {
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
  getValidFolderTargetsInCard(card) {
    const targets = [];
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
  beginOrStepCarry(direction) {
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
        const originPos = this.focusedItemKey === CARD_HEADER_KEY ? -1 : this.findFocusedCardAndIndex().itemIndex;
        if (direction === "up") {
          const above = targets.filter((t) => t.pos < originPos);
          this.carryTargetFolderPath = above.length > 0 ? above[above.length - 1].path : targets[targets.length - 1].path;
        } else {
          const below = targets.filter((t) => t.pos > originPos);
          this.carryTargetFolderPath = below.length > 0 ? below[0].path : targets[0].path;
        }
      } else {
        const curIdx = targets.findIndex((t) => t.path === this.carryTargetFolderPath);
        const delta = direction === "down" ? 1 : -1;
        const nextIdx = curIdx === -1 ? 0 : (curIdx + delta + targets.length) % targets.length;
        this.carryTargetFolderPath = targets[nextIdx].path;
      }
    }
    this.syncFocusAndSelectionDOM();
    this.renderSelectionBar();
    this.renderCarryPill();
    this.scrollFocusedIntoView();
  }
  commitCarryMode() {
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
  cancelCarryMode() {
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
  promptCreateNote(explicitFolderPath) {
    const targetFolderPath = explicitFolderPath !== void 0 ? normalizeFolderStr(explicitFolderPath) : this.getFocusedTargetFolderPath();
    const destLabel = targetFolderPath || this.app.vault.getName();
    this.isSubModalOpen = true;
    this.syncScopeState();
    const modal = new NamePromptModal(this.app, {
      title: "\uC0C8 \uB178\uD2B8",
      placeholder: "\uB178\uD2B8 \uC81C\uBAA9",
      destinationLabel: destLabel,
      confirmLabel: "\uC0DD\uC131",
      onSubmit: async (rawName) => {
        const cleanName = rawName.endsWith(".md") ? rawName : `${rawName}.md`;
        const fullPath = (0, import_obsidian3.normalizePath)(targetFolderPath ? `${targetFolderPath}/${cleanName}` : cleanName);
        if (this.app.vault.getAbstractFileByPath(fullPath)) {
          new import_obsidian3.Notice("\uAC19\uC740 \uC774\uB984\uC758 \uD30C\uC77C\uC774 \uC774\uBBF8 \uC874\uC7AC\uD569\uB2C8\uB2E4.");
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
          new import_obsidian3.Notice(`\uB178\uD2B8 \uC0DD\uC131 \uC2E4\uD328: ${err instanceof Error ? err.message : String(err)}`);
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
  promptCreateFolder(explicitFolderPath) {
    const targetFolderPath = explicitFolderPath !== void 0 ? normalizeFolderStr(explicitFolderPath) : this.getFocusedTargetFolderPath();
    const destLabel = targetFolderPath || this.app.vault.getName();
    this.isSubModalOpen = true;
    this.syncScopeState();
    const modal = new NamePromptModal(this.app, {
      title: "\uC0C8 \uD3F4\uB354",
      placeholder: "\uD3F4\uB354 \uC774\uB984",
      destinationLabel: destLabel,
      confirmLabel: "\uC0DD\uC131",
      onSubmit: async (rawName) => {
        const fullPath = (0, import_obsidian3.normalizePath)(targetFolderPath ? `${targetFolderPath}/${rawName}` : rawName);
        if (this.app.vault.getAbstractFileByPath(fullPath)) {
          new import_obsidian3.Notice("\uAC19\uC740 \uC774\uB984\uC758 \uD3F4\uB354\uAC00 \uC774\uBBF8 \uC874\uC7AC\uD569\uB2C8\uB2E4.");
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
          new import_obsidian3.Notice(`\uD3F4\uB354 \uC0DD\uC131 \uC2E4\uD328: ${err instanceof Error ? err.message : String(err)}`);
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
  promptRename(target) {
    const isMd = target instanceof import_obsidian3.TFile && target.extension === "md";
    const initial = isMd ? target.basename : target.name;
    this.isSubModalOpen = true;
    this.syncScopeState();
    const modal = new NamePromptModal(this.app, {
      title: "\uC774\uB984 \uBC14\uAFB8\uAE30",
      placeholder: "\uC0C8 \uC774\uB984",
      initialValue: initial,
      confirmLabel: "\uBCC0\uACBD",
      onSubmit: async (rawName) => {
        const finalName = isMd && !rawName.endsWith(".md") ? `${rawName}.md` : rawName;
        const parentPath = normalizeFolderRef(target.parent);
        const destPath = (0, import_obsidian3.normalizePath)(parentPath ? `${parentPath}/${finalName}` : finalName);
        if (destPath === target.path) return;
        if (this.app.vault.getAbstractFileByPath(destPath)) {
          new import_obsidian3.Notice("\uAC19\uC740 \uC774\uB984\uC774 \uC774\uBBF8 \uC874\uC7AC\uD569\uB2C8\uB2E4.");
          return;
        }
        try {
          await this.app.fileManager.renameFile(target, destPath);
          this.renderAll();
        } catch (err) {
          new import_obsidian3.Notice(`\uC774\uB984 \uBCC0\uACBD \uC2E4\uD328: ${err instanceof Error ? err.message : String(err)}`);
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
  getFocusedAbstractTarget() {
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
  renameFocusedItem() {
    const target = this.getFocusedAbstractTarget();
    if (!target || target instanceof import_obsidian3.TFolder && target.isRoot()) return;
    this.promptRename(target);
  }
  async deleteFocusedOrSelected() {
    const paths = this.resolveCarrySourcePaths();
    if (paths.length === 0) return;
    let deleted = 0;
    for (const p of paths) {
      const target = this.app.vault.getAbstractFileByPath(p);
      if (!target || target instanceof import_obsidian3.TFolder && target.isRoot()) continue;
      try {
        await this.app.vault.trash(target, true);
        deleted++;
      } catch {
      }
    }
    if (deleted > 0) {
      this.selectedPaths.clear();
      this.selectionAnchorIndex = null;
      new import_obsidian3.Notice(`${deleted}\uAC1C \uD56D\uBAA9\uC744 \uD734\uC9C0\uD1B5\uC73C\uB85C \uC774\uB3D9\uD588\uC2B5\uB2C8\uB2E4.`);
      this.renderAll();
    }
  }
  selectAllInFocusedCard() {
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
  buildUniqueCopyPath(destFolderPath, item, forceSuffix) {
    const isFile = item instanceof import_obsidian3.TFile;
    const base = isFile ? item.basename : item.name;
    const ext = isFile && item.extension ? `.${item.extension}` : "";
    if (!forceSuffix) {
      const direct = (0, import_obsidian3.normalizePath)(destFolderPath ? `${destFolderPath}/${base}${ext}` : `${base}${ext}`);
      if (!this.app.vault.getAbstractFileByPath(direct)) return direct;
    }
    for (let n = 1; n < 1e3; n++) {
      const candidateName = `${base} ${n}${ext}`;
      const candidate = (0, import_obsidian3.normalizePath)(destFolderPath ? `${destFolderPath}/${candidateName}` : candidateName);
      if (!this.app.vault.getAbstractFileByPath(candidate)) return candidate;
    }
    return "";
  }
  async copyAbstractItem(source, destPath) {
    if (source instanceof import_obsidian3.TFile) {
      const data = await this.app.vault.readBinary(source);
      return await this.app.vault.createBinary(destPath, data);
    }
    await this.app.vault.createFolder(destPath);
    if (source instanceof import_obsidian3.TFolder) {
      for (const child of source.children) {
        const childDest = (0, import_obsidian3.normalizePath)(`${destPath}/${child.name}`);
        await this.copyAbstractItem(child, childDest);
      }
    }
    return this.app.vault.getAbstractFileByPath(destPath) || source;
  }
  copySelectedOrFocused() {
    const sources = this.resolveCarrySourcePaths();
    if (sources.length === 0) return false;
    this.clipboardMode = "copy";
    this.clipboardPaths = sources;
    this.syncFocusAndSelectionDOM();
    this.renderSelectionBar();
    this.renderCarryPill();
    return true;
  }
  cutSelectedOrFocused() {
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
  async pasteClipboardToFocusedFolder() {
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
    let copiedCount = 0;
    let firstCreatedKey = null;
    for (const srcPath of paths) {
      const target = this.app.vault.getAbstractFileByPath(srcPath);
      if (!target) continue;
      if (target instanceof import_obsidian3.TFolder && this.isInvalidDropDest(destFolderPath, [target.path])) {
        continue;
      }
      const destPath = this.buildUniqueCopyPath(destFolderPath, target, false);
      if (!destPath) continue;
      try {
        const created = await this.copyAbstractItem(target, destPath);
        if (!firstCreatedKey) {
          firstCreatedKey = created instanceof import_obsidian3.TFolder ? `folder:${created.path}` : `file:${created.path}`;
        }
        copiedCount++;
      } catch {
      }
    }
    if (copiedCount > 0) {
      this.selectedPaths.clear();
      this.selectionAnchorIndex = null;
      if (firstCreatedKey) this.focusedItemKey = firstCreatedKey;
      const destName = destFolderPath || this.app.vault.getName();
      new import_obsidian3.Notice(`${copiedCount}\uAC1C \uD56D\uBAA9\uC744 '${destName}'\uC5D0 \uBCF5\uC0AC\uD588\uC2B5\uB2C8\uB2E4.`);
      this.renderAll();
      this.scrollFocusedIntoView();
    }
  }
  async duplicateFocusedItem() {
    const target = this.getFocusedAbstractTarget();
    if (!target || target instanceof import_obsidian3.TFolder && target.isRoot()) return;
    const parentPath = normalizeFolderRef(target.parent);
    const destPath = this.buildUniqueCopyPath(parentPath, target, true);
    if (!destPath) return;
    try {
      const copied = await this.copyAbstractItem(target, destPath);
      this.selectedPaths.clear();
      this.selectionAnchorIndex = null;
      this.focusedItemKey = copied instanceof import_obsidian3.TFolder ? `folder:${copied.path}` : `file:${copied.path}`;
      const displayName = copied instanceof import_obsidian3.TFile && copied.extension === "md" ? copied.basename : copied.name;
      new import_obsidian3.Notice(`'${displayName}' \uBCF5\uC81C \uC644\uB8CC`);
      this.renderAll();
      this.scrollFocusedIntoView();
    } catch (err) {
      new import_obsidian3.Notice(`\uBCF5\uC81C \uC2E4\uD328: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  async setAllSubfoldersExpanded(expanded) {
    const folderPaths = [];
    const collectAllSubfolders = (folder) => {
      for (const child of folder.children) {
        if (child instanceof import_obsidian3.TFolder) {
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
  jumpToCardByIndex(cardIdx) {
    if (cardIdx < 0 || cardIdx >= this.renderedCards.length) return;
    const targetCard = this.renderedCards[cardIdx];
    const firstFileIdx = targetCard.items.findIndex((it) => it.type === "file");
    this.focusCardItem(cardIdx, firstFileIdx >= 0 ? firstFileIdx : 0, {
      clearSelection: true,
      updatePreview: true
    });
  }
  triageToCardByIndex(cardIdx) {
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
  handleCardDragStart(e, folderPath, title) {
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
  clearReorderHighlight() {
    if (this.reorderTargetEl) {
      this.reorderTargetEl.removeClass("is-reorder-before", "is-reorder-after");
      this.reorderTargetEl = null;
    }
  }
  async applyFolderCardReorder(sourcePath, targetPath, position) {
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
  async shiftFolderCardOrder(delta) {
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
  handleDragStart(e, path, fromShelf) {
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
    const label = firstItem ? firstItem instanceof import_obsidian3.TFile && firstItem.extension === "md" ? firstItem.basename : firstItem.name : path;
    const ghost = document.body.createDiv({
      cls: "fb-drag-ghost",
      text: this.activeDragPaths.length > 1 ? `${label} \uC678 ${this.activeDragPaths.length - 1}\uAC1C` : label
    });
    e.dataTransfer.setDragImage(ghost, 12, 12);
    requestAnimationFrame(() => ghost.remove());
  }
  resolveDropTarget(target) {
    if (!(target instanceof Element)) return null;
    return target.closest(
      "[data-drop-shelf], .nav-folder-title[data-drop-folder], .fb-crumb-btn[data-drop-folder], .fb-card[data-drop-folder]"
    );
  }
  setDropHighlight(el) {
    if (this.currentDropEl === el) return;
    if (this.currentDropEl) this.currentDropEl.removeClass("is-drag-over");
    this.currentDropEl = el;
    if (this.currentDropEl) this.currentDropEl.addClass("is-drag-over");
  }
  handleDragOver(e) {
    if (this.draggingCardPath) {
      const cardEl = e.target instanceof Element ? e.target.closest(".fb-card") : null;
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
      const pos = e.clientX < rect.left + rect.width / 2 ? "before" : "after";
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
  handleDragLeave(e) {
    if (this.draggingCardPath && this.reorderTargetEl) {
      if (e.relatedTarget instanceof Node && this.reorderTargetEl.contains(e.relatedTarget)) return;
      if (e.target === this.reorderTargetEl) this.clearReorderHighlight();
      return;
    }
    if (!this.currentDropEl) return;
    if (e.relatedTarget instanceof Node && this.currentDropEl.contains(e.relatedTarget)) return;
    if (e.target === this.currentDropEl) this.setDropHighlight(null);
  }
  handleDrop(e) {
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
  handleDragEnd() {
    this.activeDragPaths = [];
    this.draggingCardPath = null;
    this.isDragging = false;
    this.setDropHighlight(null);
    this.clearReorderHighlight();
    this.renderShelf();
  }
  addPathsToShelf(paths) {
    for (const p of paths) {
      if (this.app.vault.getAbstractFileByPath(p) && !this.shelfPaths.includes(p)) {
        this.shelfPaths.push(p);
      }
    }
    this.renderShelf();
  }
  // [ID 6.5.22] 파일 및 폴더 통합 이동 + 순환 이동(자기 자신/하위로 이동) 방어 + Undo
  async moveFiles(sourcePaths, rawDestFolderPath) {
    const destFolderPath = normalizeFolderStr(rawDestFolderPath);
    const unique = [...new Set(sourcePaths)];
    const moves = [];
    let skipped = 0;
    let firstMovedType = "file";
    for (const srcPath of unique) {
      const target = this.app.vault.getAbstractFileByPath(srcPath);
      if (!target) continue;
      if (target instanceof import_obsidian3.TFolder && this.isInvalidDropDest(destFolderPath, [target.path])) {
        skipped++;
        continue;
      }
      const currentParent = normalizeFolderRef(target.parent);
      if (currentParent === destFolderPath) continue;
      const destPath = (0, import_obsidian3.normalizePath)(destFolderPath ? `${destFolderPath}/${target.name}` : target.name);
      if (this.app.vault.getAbstractFileByPath(destPath)) {
        skipped++;
        continue;
      }
      try {
        await this.app.fileManager.renameFile(target, destPath);
        if (moves.length === 0) {
          firstMovedType = target instanceof import_obsidian3.TFolder ? "folder" : "file";
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
      new import_obsidian3.Notice(`${moves.length}\uAC1C \uD56D\uBAA9\uC744 '${destName}'\uB85C \uC774\uB3D9\uD588\uC2B5\uB2C8\uB2E4.`);
      this.renderAll();
      this.scrollFocusedIntoView();
    } else if (skipped > 0) {
      new import_obsidian3.Notice("\uB300\uC0C1 \uD3F4\uB354\uC5D0 \uAC19\uC740 \uC774\uB984\uC774 \uC788\uAC70\uB098 \uC774\uB3D9\uD560 \uC218 \uC5C6\uB294 \uACBD\uB85C\uC785\uB2C8\uB2E4.");
    } else {
      this.syncFocusAndSelectionDOM();
    }
  }
  async undoLastMove() {
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
      }
    }
    if (restored > 0) {
      new import_obsidian3.Notice(`${restored}\uAC1C \uD56D\uBAA9 \uC774\uB3D9\uC744 \uB418\uB3CC\uB838\uC2B5\uB2C8\uB2E4.`);
      this.renderAll();
    }
  }
  // =========================================================
  // 키보드 2D 탐색 · Shift 다중 선택 · Option 들고 이동 · Cmd 점프 & X/V
  // =========================================================
  isViewActive() {
    if (this.isSubModalOpen) return false;
    if (document.querySelector(".modal-container")) return false;
    return this.app.workspace.getActiveViewOfType(_FolderBoardView) === this;
  }
  // [ID 6.5.24] 2D 그리드 / 세로 모드에서 화면상 동일 열의 바로 위·아래 행 카드 탐색
  // -> 대각선(인접 열) 카드로 엉뚱하게 튀지 않도록 동일 열(offsetLeft 오차 24px 이내)에 위치한 카드만 매칭함.
  findVerticalNeighborCard(cardIdx, direction) {
    if (this.plugin.settings.verticalEdgeBehavior !== "adaptive") return -1;
    if (this.plugin.settings.gridCols === "scroll") return -1;
    const cardEls = Array.from(this.gridEl.querySelectorAll(".fb-card"));
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
  focusCardHeader(cardIdx) {
    this.focusedCardIndex = cardIdx;
    this.focusedItemKey = CARD_HEADER_KEY;
    this.selectedPaths.clear();
    this.selectionAnchorIndex = null;
    this.syncFocusAndSelectionDOM();
    this.renderSelectionBar();
    this.scrollFocusedIntoView();
  }
  handleKeyup(e) {
    if (this.carryPaths.length === 0) return;
    if (e.key === "Alt") {
      this.commitCarryMode();
    }
  }
  handleKeydown(e) {
    if (e.defaultPrevented) return;
    if (!this.isViewActive()) return;
    const meta = e.metaKey || e.ctrlKey;
    const code = e.code;
    if (meta && !e.shiftKey && !e.altKey && code === "KeyF") {
      e.preventDefault();
      e.stopPropagation();
      this.focusSearchBox();
      return;
    }
    if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select")) {
      if (e.key === "Escape") {
        e.target.blur();
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
    if (!meta && !e.shiftKey && !e.altKey && code === "Slash") {
      e.preventDefault();
      e.stopPropagation();
      this.focusSearchBox();
      return;
    }
    if (meta && !e.shiftKey && !e.altKey && code === "KeyZ") {
      if (this.undoStack.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        void this.undoLastMove();
      }
      return;
    }
    if (meta && !e.shiftKey && !e.altKey && code === "KeyA") {
      e.preventDefault();
      e.stopPropagation();
      this.selectAllInFocusedCard();
      return;
    }
    if (meta && !e.shiftKey && !e.altKey && code === "KeyD") {
      e.preventDefault();
      e.stopPropagation();
      void this.duplicateFocusedItem();
      return;
    }
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
    if (meta && !e.shiftKey && !e.altKey && code === "Backspace" || !meta && !e.shiftKey && !e.altKey && code === "Delete") {
      e.preventDefault();
      e.stopPropagation();
      void this.deleteFocusedOrSelected();
      return;
    }
    if (!meta && !e.shiftKey && !e.altKey && code === "F2" || !meta && !e.shiftKey && !e.altKey && code === "KeyR") {
      e.preventDefault();
      e.stopPropagation();
      this.renameFocusedItem();
      return;
    }
    if (!meta && !e.shiftKey && !e.altKey && (code === "BracketLeft" || code === "BracketRight")) {
      e.preventDefault();
      e.stopPropagation();
      void this.setAllSubfoldersExpanded(code === "BracketRight");
      return;
    }
    if (!meta && !e.altKey && code === "KeyN") {
      e.preventDefault();
      e.stopPropagation();
      if (e.shiftKey) this.promptCreateFolder();
      else this.promptCreateNote();
      return;
    }
    if (this.renderedCards.length === 0) return;
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
    if (e.altKey && !meta && (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      e.stopPropagation();
      const dirMap = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down"
      };
      this.beginOrStepCarry(dirMap[e.key]);
      return;
    }
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
    if (e.shiftKey && !meta && !e.altKey && this.focusedItemKey === CARD_HEADER_KEY && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      e.preventDefault();
      e.stopPropagation();
      void this.shiftFolderCardOrder(e.key === "ArrowRight" ? 1 : -1);
      return;
    }
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
        if (onHeader || !hasHeaderStop && itemIndex <= 0) {
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
          this.focusCardHeader(this.focusedCardIndex);
        } else {
          this.focusCardItem(this.focusedCardIndex, itemIndex - 1, {
            clearSelection: true,
            updatePreview: true
          });
        }
      } else {
        if (onHeader || itemIndex === -1) {
          this.focusCardItem(this.focusedCardIndex, 0, {
            clearSelection: true,
            updatePreview: true
          });
        } else if (itemIndex >= count - 1) {
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
    if (e.key === "Backspace" && this.currentFolderPath) {
      e.preventDefault();
      e.stopPropagation();
      this.goUp();
    }
  }
};

// src/settings.ts
var import_obsidian4 = require("obsidian");
var FolderBoardSettingTab = class extends import_obsidian4.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new import_obsidian4.Setting(containerEl).setName("\uAE30\uBCF8 \uB808\uC774\uC544\uC6C3").addDropdown(
      (dd) => dd.addOption("2", "2\uC5F4 \uADF8\uB9AC\uB4DC").addOption("3", "3\uC5F4 \uADF8\uB9AC\uB4DC").addOption("4", "4\uC5F4 \uADF8\uB9AC\uB4DC").addOption("auto", "\uC138\uB85C \uBAA8\uB4DC (\uB113\uC774 \uC790\uB3D9 \uB9DE\uCDA4)").addOption("scroll", "\uAC00\uB85C \uBAA8\uB4DC (\uC138\uB85C \uD3BC\uCE68 \xB7 \uAC00\uB85C \uC2A4\uD06C\uB864)").setValue(String(this.plugin.settings.gridCols)).onChange(async (value) => {
        this.plugin.settings.gridCols = value === "scroll" || value === "auto" ? value : Number(value);
        await this.plugin.saveSettings();
        this.plugin.refreshOpenViews();
      })
    );
    new import_obsidian4.Setting(containerEl).setName("\uAE30\uBCF8 \uC815\uB82C").addDropdown(
      (dd) => dd.addOption("name", "\uC774\uB984\uC21C").addOption("mtime", "\uCD5C\uADFC \uC218\uC815\uC21C").setValue(this.plugin.settings.sortBy).onChange(async (value) => {
        this.plugin.settings.sortBy = value;
        await this.plugin.saveSettings();
        this.plugin.refreshOpenViews();
      })
    );
    new import_obsidian4.Setting(containerEl).setName("\uB178\uD2B8 \uC5F4\uAE30 \uBC29\uC2DD").addDropdown(
      (dd) => dd.addOption("same-tab", "\uD604\uC7AC \uD0ED\uC5D0\uC11C \uC5F4\uAE30").addOption("new-tab", "\uC0C8 \uD0ED\uC5D0\uC11C \uC5F4\uAE30").setValue(this.plugin.settings.openBehavior).onChange(async (value) => {
        this.plugin.settings.openBehavior = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian4.Setting(containerEl).setName("\uCE74\uB4DC \uC0C1\uD558 \uB05D\uC5D0\uC11C \u2191/\u2193 \uB3D9\uC791").setDesc("\uC801\uC751\uD615: \uAC00\uB85C \uBAA8\uB4DC\uB294 \uCE74\uB4DC \uB0B4\uBD80 \uC21C\uD658, 2D \uADF8\uB9AC\uB4DC\xB7\uC138\uB85C \uBAA8\uB4DC\uB294 \uC704/\uC544\uB798 \uD589 \uD3F4\uB354 \uCE74\uB4DC\uB85C \uC5F0\uACB0").addDropdown(
      (dd) => dd.addOption("adaptive", "\uBAA8\uB4DC \uC801\uC751\uD615 (\uCD94\uCC9C)").addOption("loop", "\uD56D\uC0C1 \uCE74\uB4DC \uB0B4\uBD80 \uC21C\uD658").setValue(this.plugin.settings.verticalEdgeBehavior).onChange(async (value) => {
        this.plugin.settings.verticalEdgeBehavior = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian4.Setting(containerEl).setName("\uC0AC\uC6A9\uC790 \uC9C0\uC815 \uD3F4\uB354 \uC21C\uC11C \uCD08\uAE30\uD654").addButton(
      (btn) => btn.setButtonText("\uCD08\uAE30\uD654").onClick(async () => {
        this.plugin.settings.folderOrder = {};
        await this.plugin.saveSettings();
        this.plugin.refreshOpenViews();
      })
    );
    new import_obsidian4.Setting(containerEl).setName("\uAE30\uC5B5\uB41C \uD3F4\uB354 \uD3BC\uCE68 \uC0C1\uD0DC \uCD08\uAE30\uD654").addButton(
      (btn) => btn.setButtonText("\uCD08\uAE30\uD654").onClick(async () => {
        this.plugin.settings.expandedFolders = [];
        await this.plugin.saveSettings();
        this.plugin.refreshOpenViews();
      })
    );
  }
};

// src/types.ts
var DEFAULT_SETTINGS = {
  gridCols: 3,
  sortBy: "name",
  openBehavior: "same-tab",
  verticalEdgeBehavior: "adaptive",
  expandedFolders: [],
  folderOrder: {}
};

// src/main.ts
var FolderBoardPlugin = class extends import_obsidian5.Plugin {
  constructor() {
    super(...arguments);
    this.settings = { ...DEFAULT_SETTINGS };
    this.expandedSet = /* @__PURE__ */ new Set();
  }
  async onload() {
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
  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_FOLDER_BOARD);
  }
  async activateBoardView(folderPath) {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_FOLDER_BOARD);
    let leaf;
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
    if (folderPath !== void 0 && leaf.view instanceof FolderBoardView) {
      leaf.view.setFolderPath(folderPath);
    }
  }
  refreshOpenViews() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_FOLDER_BOARD)) {
      if (leaf.view instanceof FolderBoardView) {
        leaf.view.refresh();
      }
    }
  }
  async loadSettings() {
    const saved = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, saved);
    if (!this.settings.folderOrder || typeof this.settings.folderOrder !== "object") {
      this.settings.folderOrder = {};
    }
    this.expandedSet = new Set(this.settings.expandedFolders || []);
  }
  async saveSettings() {
    this.settings.expandedFolders = [...this.expandedSet];
    await this.saveData(this.settings);
  }
  isFolderExpanded(path) {
    return this.expandedSet.has(path);
  }
  async toggleFolderExpanded(path) {
    const next = !this.expandedSet.has(path);
    if (next) this.expandedSet.add(path);
    else this.expandedSet.delete(path);
    await this.saveSettings();
    return next;
  }
  async setFolderExpanded(path, expanded) {
    if (expanded) this.expandedSet.add(path);
    else this.expandedSet.delete(path);
    await this.saveSettings();
  }
  // [ID 6.6.6] 여러 하위 폴더 펼침/접힘 일괄 반영 (C/E 단축키용 단일 저장)
  async setFoldersExpandedBatch(paths, expanded) {
    for (const p of paths) {
      if (expanded) this.expandedSet.add(p);
      else this.expandedSet.delete(p);
    }
    await this.saveSettings();
  }
  async renameExpandedFolder(oldPath, newPath) {
    let changed = false;
    if (this.expandedSet.has(oldPath)) {
      this.expandedSet.delete(oldPath);
      this.expandedSet.add(newPath);
      changed = true;
    }
    const nextOrder = {};
    for (const [parentKey, list] of Object.entries(this.settings.folderOrder)) {
      const updatedParent = parentKey === oldPath ? newPath : parentKey;
      const updatedList = list.map((p) => p === oldPath ? newPath : p);
      if (updatedParent !== parentKey || updatedList.some((v, i) => v !== list[i])) {
        changed = true;
      }
      nextOrder[updatedParent] = updatedList;
    }
    this.settings.folderOrder = nextOrder;
    if (changed) await this.saveSettings();
  }
  getFolderOrder(parentPath) {
    return this.settings.folderOrder[parentPath] || [];
  }
  async setFolderOrder(parentPath, orderedPaths) {
    this.settings.folderOrder[parentPath] = orderedPaths;
    await this.saveSettings();
  }
};

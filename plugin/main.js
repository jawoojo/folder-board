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
function openNativeFileMenu(app, event, target, onMutated, onRequestRename) {
  const menu = new import_obsidian2.Menu();
  if (target instanceof import_obsidian2.TFile) {
    menu.addItem(
      (item) => item.setTitle("\uC0C8 \uD0ED\uC5D0\uC11C \uC5F4\uAE30").setIcon("file-plus").onClick(async () => {
        await app.workspace.getLeaf("tab").openFile(target);
      })
    );
  }
  menu.addItem(
    (item) => item.setTitle("\uC774\uB984 \uBC14\uAFB8\uAE30").setIcon("pencil").onClick(() => onRequestRename(target))
  );
  menu.addItem(
    (item) => item.setTitle("\uC0AD\uC81C").setIcon("trash").setWarning(true).onClick(async () => {
      try {
        await app.vault.trash(target, true);
        onMutated();
      } catch (err) {
        new import_obsidian2.Notice(`\uC0AD\uC81C \uC2E4\uD328: ${err instanceof Error ? err.message : String(err)}`);
      }
    })
  );
  menu.addSeparator();
  app.workspace.trigger("file-menu", menu, target, "file-explorer");
  menu.showAtMouseEvent(event);
}
function getFolderByPath(app, path) {
  if (!path) return app.vault.getRoot();
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
var FolderBoardView = class _FolderBoardView extends import_obsidian3.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.currentFolderPath = "";
    this.searchQuery = "";
    this.focusedCardIndex = 0;
    this.focusedItemKey = null;
    this.selectedPaths = /* @__PURE__ */ new Set();
    this.shelfPaths = [];
    this.undoStack = [];
    this.quickLookOpen = false;
    this.renderedCards = [];
    this.activeDragPaths = [];
    this.currentDropEl = null;
    this.isDragging = false;
    this.isSubModalOpen = false;
    this.colBtns = [];
    this.markdownComponent = null;
    this.vaultRefs = [];
    this.refreshTimer = null;
    this.plugin = plugin;
    this.boundKeydown = this.handleKeydown.bind(this);
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
    const parts = this.currentFolderPath.split("/");
    return parts[parts.length - 1] || "Folder Board";
  }
  getIcon() {
    return "layout-grid";
  }
  getState() {
    return { folderPath: this.currentFolderPath };
  }
  async setState(state, result) {
    if (typeof state?.folderPath === "string") {
      this.currentFolderPath = state.folderPath;
    }
    await super.setState(state, result);
    if (this.shellEl) {
      this.renderAll();
    }
  }
  setFolderPath(folderPath) {
    this.currentFolderPath = folderPath;
    this.focusedCardIndex = 0;
    this.focusedItemKey = null;
    this.renderAll();
    if (this.renderedCards[0]?.items[0]) {
      this.focusCardItem(0, 0);
    }
  }
  refresh() {
    if (this.shellEl) this.renderAll();
  }
  async onOpen() {
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
  async onClose() {
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
    this.clearSearchEl.addEventListener("click", () => {
      this.searchQuery = "";
      this.searchInputEl.value = "";
      this.clearSearchEl.addClass("is-hidden");
      this.renderGridAndHeader();
    });
    const colGroup = controls.createDiv({ cls: "fb-segmented" });
    this.colBtns = [2, 3, 4].map((cols) => {
      const btn = colGroup.createEl("button", {
        cls: "clickable-icon fb-seg-btn",
        text: String(cols),
        attr: { "aria-label": `${cols}\uC5F4 \uBCF4\uAE30` }
      });
      btn.addEventListener("click", async () => {
        this.plugin.settings.gridCols = cols;
        await this.plugin.saveSettings();
        this.renderGridAndHeader();
      });
      return btn;
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
    const canvas = body.createDiv({ cls: "fb-canvas" });
    this.gridEl = canvas.createDiv({ cls: "fb-grid" });
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
      const focusedFile = this.getFocusedFile();
      if (focusedFile) void this.openFile(focusedFile);
    });
    const qlCloseBtn = qlActions.createEl("button", {
      cls: "clickable-icon fb-tool-btn",
      attr: { "aria-label": "\uBBF8\uB9AC\uBCF4\uAE30 \uB2EB\uAE30" }
    });
    (0, import_obsidian3.setIcon)(qlCloseBtn, "x");
    qlCloseBtn.addEventListener("click", () => {
      this.quickLookOpen = false;
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
      this.renderGridAndHeader();
      this.renderSelectionBar();
    });
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
    this.vaultRefs.push(
      this.app.vault.on("rename", (file, oldPath) => {
        if (file instanceof import_obsidian3.TFolder && this.plugin.isFolderExpanded(oldPath)) {
          void this.plugin.renameExpandedFolder(oldPath, file.path);
        }
        if (this.currentFolderPath === oldPath) {
          this.currentFolderPath = file.path;
        }
        scheduleRefresh();
      })
    );
  }
  unbindVaultEvents() {
    this.vaultRefs.forEach((ref) => this.app.vault.offref(ref));
    this.vaultRefs = [];
  }
  bindInteractionEvents() {
    document.addEventListener("keydown", this.boundKeydown, true);
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
        const expanded = q ? true : this.plugin.isFolderExpanded(sub.path);
        const childOut = [];
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
  buildBoardCards() {
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
        folderPath: currentFolder.path,
        title: currentFolder.isRoot() ? this.app.vault.getName() : currentFolder.name,
        totalCount: directFiles.length,
        items: directItems
      });
    }
    for (const sub of childFolders) {
      const items = [];
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
  getFocusedTargetFolderPath() {
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
    for (const path of this.selectedPaths) {
      const f = getFileByPath(this.app, path);
      if (f) return f;
    }
    return null;
  }
  // =========================================================
  // 렌더링
  // =========================================================
  renderAll() {
    this.renderGridAndHeader();
    this.renderShelf();
    this.renderSelectionBar();
    void this.updateQuickLook();
  }
  renderGridAndHeader() {
    const cards = this.buildBoardCards();
    this.renderBreadcrumb();
    this.renderGrid(cards);
    this.updateToolbarStates();
    this.leaf.updateHeader?.();
  }
  updateToolbarStates() {
    const s = this.plugin.settings;
    this.backBtnEl.disabled = !this.currentFolderPath;
    this.colBtns.forEach((btn, idx) => {
      const cols = idx + 2;
      btn.toggleClass("is-active", s.gridCols === cols);
    });
    this.sortBtnEl.empty();
    (0, import_obsidian3.setIcon)(this.sortBtnEl, s.sortBy === "name" ? "arrow-up-down" : "clock");
    this.sortBtnEl.setAttr("aria-label", s.sortBy === "name" ? "\uC815\uB82C: \uC774\uB984\uC21C" : "\uC815\uB82C: \uCD5C\uADFC \uC218\uC815\uC21C");
    const targetLabel = this.getFocusedFolderDisplayName();
    this.newNoteBtnEl.setAttr("aria-label", `\uC0C8 \uB178\uD2B8 \u2192 ${targetLabel} (N)`);
    this.newFolderBtnEl.setAttr("aria-label", `\uC0C8 \uD3F4\uB354 \u2192 ${targetLabel} (Shift+N)`);
    this.qlBtnEl.toggleClass("is-active", this.quickLookOpen);
  }
  renderBreadcrumb() {
    this.breadcrumbEl.empty();
    const segments = [
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
  renderGrid(cards) {
    this.gridEl.empty();
    const prefCols = this.plugin.settings.gridCols;
    const effectiveCols = Math.max(1, Math.min(prefCols, Math.max(1, cards.length)));
    const rowCount = Math.max(1, Math.ceil(cards.length / effectiveCols));
    const rowClass = rowCount === 1 ? "fb-rows-1" : rowCount === 2 ? "fb-rows-2" : "fb-rows-many";
    this.gridEl.className = `fb-grid fb-cols-${effectiveCols} ${rowClass}`;
    if (cards.length === 0) {
      this.gridEl.createDiv({ cls: "fb-empty-grid", text: "\uC77C\uCE58\uD558\uB294 \uD56D\uBAA9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" });
      return;
    }
    cards.forEach((cardModel, cardIdx) => {
      const isFocusedCard = cardIdx === this.focusedCardIndex;
      const cardEl = this.gridEl.createDiv({
        cls: "fb-card" + (cardModel.isRootCard ? " is-root-card" : "") + (isFocusedCard ? " is-focused-card" : ""),
        attr: { "data-drop-folder": cardModel.folderPath }
      });
      const headerEl = cardEl.createDiv({ cls: "fb-card-header" });
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
      const listEl = cardEl.createDiv({ cls: "fb-card-body nav-files-container" });
      if (cardModel.items.length === 0) {
        listEl.createDiv({ cls: "fb-empty-card", text: "\uBE44\uC5B4 \uC788\uC74C" });
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
          (0, import_obsidian3.setIcon)(caret, "chevron-down");
          const fIcon = row.createSpan({ cls: "fb-native-icon" });
          const fTitle = row.createSpan({ cls: "tree-item-inner nav-folder-title-content", text: item.name });
          applyNativeDecoration(this.app, item.path, fIcon, fTitle, "folder");
          if (item.childCount !== void 0) {
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
            cls: "tree-item-self is-clickable nav-file-title fb-row" + (isSelected ? " is-selected" : "") + (isFocused ? " is-focused" : ""),
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
  renderShelf() {
    this.shelfPaths = this.shelfPaths.filter((p) => getFileByPath(this.app, p) !== null);
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
      const file = getFileByPath(this.app, path);
      if (!file) continue;
      const chip = this.shelfListEl.createDiv({
        cls: "fb-shelf-chip",
        attr: { draggable: "true", "data-drag-path": path }
      });
      chip.createSpan({ text: file.extension === "md" ? file.basename : file.name });
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
    this.selectionBarEl.toggleClass("is-hidden", count < 2);
    if (count >= 2) {
      this.selectionCountEl.setText(`${count}\uAC1C \uC120\uD0DD\uB428`);
    }
  }
  async updateQuickLook() {
    this.qlDrawerEl.toggleClass("is-open", this.quickLookOpen);
    if (!this.quickLookOpen) return;
    const file = this.getFocusedFile();
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
  // 포커스 · 탐색 · 파일 열기
  // =========================================================
  focusCardItem(cardIdx, itemIndex) {
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
      this.selectedPaths = /* @__PURE__ */ new Set([item.path]);
    }
    this.renderGridAndHeader();
    this.renderSelectionBar();
    if (this.quickLookOpen) void this.updateQuickLook();
    this.scrollFocusedIntoView();
  }
  scrollFocusedIntoView() {
    requestAnimationFrame(() => {
      const row = this.gridEl.querySelector(".fb-row.is-focused");
      if (row) {
        row.scrollIntoView({ block: "nearest", inline: "nearest" });
      } else {
        const card = this.gridEl.querySelector(".fb-card.is-focused-card");
        if (card) card.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    });
  }
  handleFileClick(e, path, cardIdx) {
    this.focusedCardIndex = cardIdx;
    this.focusedItemKey = `file:${path}`;
    if (e.metaKey || e.ctrlKey) {
      if (this.selectedPaths.has(path)) this.selectedPaths.delete(path);
      else this.selectedPaths.add(path);
    } else {
      this.selectedPaths = /* @__PURE__ */ new Set([path]);
    }
    this.renderGridAndHeader();
    this.renderSelectionBar();
    if (this.quickLookOpen) void this.updateQuickLook();
  }
  // [ID 6.5.8] 워크스페이스 평면 노트 열기
  // -> 분할 화면에 다른 마크다운 탭이 열려 있으면 그 탭에서 열고, 단독 화면이면 설정(현재 탭/새 탭)에 따라 자연스럽게 염.
  async openFile(file, forceNewTab = false) {
    if (forceNewTab || this.plugin.settings.openBehavior === "new-tab") {
      const newLeaf = this.app.workspace.getLeaf("tab");
      await newLeaf.openFile(file, { active: true });
      return;
    }
    const otherLeaf = this.app.workspace.getLeavesOfType("markdown").find((l) => l !== this.leaf && l.getRoot() === this.app.workspace.rootSplit);
    if (otherLeaf) {
      await otherLeaf.openFile(file, { active: true });
      this.app.workspace.setActiveLeaf(otherLeaf, { focus: true });
      return;
    }
    await this.leaf.openFile(file, { active: true });
  }
  navigateToFolder(folderPath) {
    this.currentFolderPath = folderPath;
    this.focusedCardIndex = 0;
    this.focusedItemKey = null;
    this.renderAll();
    if (this.renderedCards[0]?.items[0]) {
      this.focusCardItem(0, 0);
    }
  }
  goUp() {
    if (!this.currentFolderPath) return;
    const current = getFolderByPath(this.app, this.currentFolderPath);
    const parentPath = current?.parent ? current.parent.path : "";
    this.navigateToFolder(parentPath);
  }
  // =========================================================
  // 포커스된 폴더에 노트/폴더 생성 & 이름 변경
  // =========================================================
  promptCreateNote() {
    const targetFolderPath = this.getFocusedTargetFolderPath();
    const destLabel = targetFolderPath || this.app.vault.getName();
    this.isSubModalOpen = true;
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
          this.focusedItemKey = `file:${created.path}`;
          this.selectedPaths = /* @__PURE__ */ new Set([created.path]);
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
      requestAnimationFrame(() => this.shellEl?.focus());
    };
    modal.open();
  }
  promptCreateFolder() {
    const targetFolderPath = this.getFocusedTargetFolderPath();
    const destLabel = targetFolderPath || this.app.vault.getName();
    this.isSubModalOpen = true;
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
      requestAnimationFrame(() => this.shellEl?.focus());
    };
    modal.open();
  }
  promptRename(target) {
    const isMd = target instanceof import_obsidian3.TFile && target.extension === "md";
    const initial = isMd ? target.basename : target.name;
    this.isSubModalOpen = true;
    const modal = new NamePromptModal(this.app, {
      title: "\uC774\uB984 \uBC14\uAFB8\uAE30",
      placeholder: "\uC0C8 \uC774\uB984",
      initialValue: initial,
      confirmLabel: "\uBCC0\uACBD",
      onSubmit: async (rawName) => {
        const finalName = isMd && !rawName.endsWith(".md") ? `${rawName}.md` : rawName;
        const parentPath = target.parent?.path || "";
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
      requestAnimationFrame(() => this.shellEl?.focus());
    };
    modal.open();
  }
  // =========================================================
  // 드래그 앤 드롭 & 위키링크 보존 파일 이동 + Undo
  // =========================================================
  handleDragStart(e, path, fromShelf) {
    if (!e.dataTransfer) return;
    if (fromShelf) {
      this.activeDragPaths = [path];
    } else if (this.selectedPaths.has(path) && this.selectedPaths.size > 1) {
      this.activeDragPaths = [...this.selectedPaths];
    } else {
      this.activeDragPaths = [path];
      this.selectedPaths = /* @__PURE__ */ new Set([path]);
    }
    this.isDragging = true;
    this.renderShelf();
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(DRAG_MIME, JSON.stringify(this.activeDragPaths));
    const firstFile = getFileByPath(this.app, this.activeDragPaths[0]);
    const label = firstFile ? firstFile.extension === "md" ? firstFile.basename : firstFile.name : path;
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
    if (!this.currentDropEl) return;
    if (e.relatedTarget instanceof Node && this.currentDropEl.contains(e.relatedTarget)) return;
    if (e.target === this.currentDropEl) this.setDropHighlight(null);
  }
  handleDrop(e) {
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
  handleDragEnd() {
    this.activeDragPaths = [];
    this.isDragging = false;
    this.setDropHighlight(null);
    this.renderShelf();
  }
  addPathsToShelf(paths) {
    for (const p of paths) {
      if (getFileByPath(this.app, p) && !this.shelfPaths.includes(p)) {
        this.shelfPaths.push(p);
      }
    }
    this.renderShelf();
  }
  async moveFiles(sourcePaths, destFolderPath) {
    const unique = [...new Set(sourcePaths)];
    const moves = [];
    let skipped = 0;
    for (const srcPath of unique) {
      const file = getFileByPath(this.app, srcPath);
      if (!file) continue;
      const currentParent = file.parent?.path || "";
      if (currentParent === destFolderPath) continue;
      const destPath = (0, import_obsidian3.normalizePath)(destFolderPath ? `${destFolderPath}/${file.name}` : file.name);
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
      new import_obsidian3.Notice(`${moves.length}\uAC1C \uD56D\uBAA9\uC744 '${destName}'\uB85C \uC774\uB3D9\uD588\uC2B5\uB2C8\uB2E4.`);
      this.renderAll();
    } else if (skipped > 0) {
      new import_obsidian3.Notice("\uB300\uC0C1 \uD3F4\uB354\uC5D0 \uAC19\uC740 \uC774\uB984\uC758 \uD30C\uC77C\uC774 \uC788\uC5B4 \uC774\uB3D9\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
    }
  }
  async undoLastMove() {
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
      }
    }
    if (restored > 0) {
      new import_obsidian3.Notice(`${restored}\uAC1C \uD56D\uBAA9 \uC774\uB3D9\uC744 \uB418\uB3CC\uB838\uC2B5\uB2C8\uB2E4.`);
      this.renderAll();
    }
  }
  // =========================================================
  // 키보드 2D 탐색 핸들러 (현재 Folder Board 탭이 활성 상태일 때만 동작)
  // =========================================================
  isViewActive() {
    if (this.isSubModalOpen) return false;
    if (document.querySelector(".modal-container")) return false;
    return this.app.workspace.getActiveViewOfType(_FolderBoardView) === this;
  }
  handleKeydown(e) {
    if (!this.isViewActive()) return;
    if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select")) {
      if (e.key === "Escape") e.target.blur();
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
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      const { card, itemIndex } = this.findFocusedCardAndIndex();
      if (!card || card.items.length === 0) return;
      const delta = e.key === "ArrowDown" ? 1 : -1;
      const nextIdx = itemIndex === -1 ? delta > 0 ? 0 : card.items.length - 1 : Math.max(0, Math.min(itemIndex + delta, card.items.length - 1));
      this.focusCardItem(this.focusedCardIndex, nextIdx);
      return;
    }
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
    new import_obsidian4.Setting(containerEl).setName("\uAE30\uBCF8 \uC5F4 \uAC1C\uC218").addDropdown(
      (dd) => dd.addOption("2", "2\uC5F4").addOption("3", "3\uC5F4").addOption("4", "4\uC5F4").setValue(String(this.plugin.settings.gridCols)).onChange(async (value) => {
        this.plugin.settings.gridCols = Number(value);
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
  expandedFolders: []
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
        const folderPath = active?.parent?.path || "";
        void this.activateBoardView(folderPath);
      }
    });
    this.addSettingTab(new FolderBoardSettingTab(this.app, this));
  }
  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_FOLDER_BOARD);
  }
  // [ID 6.6.2] 워크스페이스 메인 탭 열기/활성화
  // -> 이미 열려 있는 Folder Board 탭이 있으면 새 탭을 중복 생성하지 않고 해당 탭으로 즉시 포커스 전환함.
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
  async renameExpandedFolder(oldPath, newPath) {
    if (!this.expandedSet.has(oldPath)) return;
    this.expandedSet.delete(oldPath);
    this.expandedSet.add(newPath);
    await this.saveSettings();
  }
};

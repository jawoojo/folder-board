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
var fallbackCache = null;
var CACHE_TTL_MS = 2e3;
function invalidateNativeIconCache() {
  fallbackCache = null;
}
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
function stripCssQuotes(raw) {
  const trimmed = raw.trim();
  if (trimmed === "none" || trimmed === "normal" || trimmed === "" || trimmed === '""' || trimmed === "''") {
    return "";
  }
  let inner = trimmed;
  if (inner.startsWith('"') && inner.endsWith('"') || inner.startsWith("'") && inner.endsWith("'")) {
    inner = inner.slice(1, -1);
  }
  return inner.replace(/[\s\u200B-\u200F\u202A-\u202E\u2060\uFEFF\u00A0]+/g, "");
}
function extractPseudoIcon(el) {
  if (!el || !el.isConnected) return null;
  const cs = window.getComputedStyle(el, "::before");
  if (!cs || cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return null;
  const bgImage = cs.backgroundImage && cs.backgroundImage !== "none" ? cs.backgroundImage : "";
  const rawMask = cs.maskImage && cs.maskImage !== "none" ? cs.maskImage : cs.getPropertyValue("-webkit-mask-image");
  const maskImage = rawMask && rawMask !== "none" ? rawMask : "";
  const text = stripCssQuotes(cs.content || "");
  if (!bgImage && !maskImage && !text) return null;
  if (!text) {
    const w = parseFloat(cs.width) || 0;
    const h = parseFloat(cs.height) || 0;
    if (w > 0 && w < 8 && h > 0 && h < 8) return null;
  }
  return {
    backgroundImage: bgImage,
    backgroundSize: cs.backgroundSize || "contain",
    backgroundRepeat: cs.backgroundRepeat || "no-repeat",
    backgroundPosition: cs.backgroundPosition || "center",
    maskImage,
    maskSize: cs.maskSize || cs.getPropertyValue("-webkit-mask-size") || "contain",
    maskRepeat: cs.maskRepeat || cs.getPropertyValue("-webkit-mask-repeat") || "no-repeat",
    maskPosition: cs.maskPosition || cs.getPropertyValue("-webkit-mask-position") || "center",
    backgroundColor: cs.backgroundColor || "",
    color: cs.color || "",
    text,
    fontFamily: cs.fontFamily || "",
    fontSize: cs.fontSize || ""
  };
}
function isBuiltinExplorerElement(el) {
  return el.classList.contains("collapse-icon") || el.classList.contains("nav-folder-collapse-indicator") || el.classList.contains("nav-file-tag") || el.classList.contains("tree-item-flair-outer") || el.classList.contains("tree-item-flair");
}
function cloneAndPreserveVisuals(source, parentEl) {
  const clone = source.cloneNode(true);
  clone.classList.add("fb-cloned-native-icon");
  if (source.isConnected) {
    const cs = window.getComputedStyle(source);
    const parentColor = parentEl.isConnected ? window.getComputedStyle(parentEl).color : "";
    const tag = clone.tagName.toLowerCase();
    const isGraphicSelf = tag === "svg" || tag === "img";
    const hasGraphicChild = isGraphicSelf || Boolean(clone.querySelector("svg, img"));
    if (!hasGraphicChild && clone instanceof HTMLElement) {
      if (cs.backgroundImage && cs.backgroundImage !== "none") {
        clone.style.backgroundImage = cs.backgroundImage;
        clone.style.backgroundSize = cs.backgroundSize || "contain";
        clone.style.backgroundRepeat = cs.backgroundRepeat || "no-repeat";
        clone.style.backgroundPosition = cs.backgroundPosition || "center";
        clone.style.width = "15px";
        clone.style.height = "15px";
      }
      const rawMask = cs.maskImage && cs.maskImage !== "none" ? cs.maskImage : cs.getPropertyValue("-webkit-mask-image");
      if (rawMask && rawMask !== "none") {
        clone.style.maskImage = rawMask;
        clone.style.setProperty("-webkit-mask-image", rawMask);
        clone.style.maskSize = cs.maskSize || "contain";
        clone.style.setProperty("-webkit-mask-size", cs.maskSize || "contain");
        clone.style.maskRepeat = "no-repeat";
        clone.style.setProperty("-webkit-mask-repeat", "no-repeat");
        clone.style.maskPosition = "center";
        clone.style.setProperty("-webkit-mask-position", "center");
        if (cs.backgroundColor && cs.backgroundColor !== "rgba(0, 0, 0, 0)") {
          clone.style.backgroundColor = cs.backgroundColor;
        }
        clone.style.width = "15px";
        clone.style.height = "15px";
      }
    }
    if ((clone instanceof HTMLElement || clone instanceof SVGElement) && !clone.style.color && cs.color && cs.color !== parentColor) {
      clone.style.color = cs.color;
    }
    const srcSvg = tag === "svg" ? source : source.querySelector("svg");
    const dstSvg = tag === "svg" ? clone : clone.querySelector("svg");
    if (srcSvg instanceof SVGElement && dstSvg instanceof SVGElement) {
      const svgCs = window.getComputedStyle(srcSvg);
      if (!dstSvg.style.color && svgCs.color && svgCs.color !== parentColor) {
        dstSvg.style.color = svgCs.color;
      }
    }
  }
  return clone;
}
function isCandidateIconElement(el) {
  const tag = el.tagName.toLowerCase();
  if (tag === "svg" || tag === "img") return true;
  if (el.querySelector("svg, img")) return true;
  if (el.hasAttribute("data-icon")) return true;
  const cls = el.getAttribute("class") || "";
  if (/icon/i.test(cls)) return true;
  const text = (el.textContent || "").trim();
  if (text.length > 0 && [...text].length <= 3) return true;
  if (el.isConnected) {
    const cs = window.getComputedStyle(el);
    const hasBg = Boolean(cs.backgroundImage && cs.backgroundImage !== "none");
    const rawMask = cs.maskImage && cs.maskImage !== "none" ? cs.maskImage : cs.getPropertyValue("-webkit-mask-image");
    if (hasBg || rawMask && rawMask !== "none") return true;
  }
  return false;
}
function extractIconFromNativeSelf(nativeSelf) {
  const titleContent = nativeSelf.querySelector(".tree-item-inner");
  for (const child of Array.from(nativeSelf.children)) {
    if (child === titleContent || isBuiltinExplorerElement(child)) continue;
    if (isCandidateIconElement(child)) {
      return { kind: "node", template: cloneAndPreserveVisuals(child, nativeSelf) };
    }
  }
  if (titleContent) {
    for (const child of Array.from(titleContent.children)) {
      if (isBuiltinExplorerElement(child)) continue;
      if (isCandidateIconElement(child)) {
        return { kind: "node", template: cloneAndPreserveVisuals(child, titleContent) };
      }
    }
  }
  const pseudo = extractPseudoIcon(titleContent) || extractPseudoIcon(nativeSelf);
  if (pseudo) {
    return { kind: "pseudo", styles: pseudo };
  }
  return null;
}
function renderExtractedIcon(container, icon) {
  if (icon.kind === "node") {
    container.appendChild(icon.template.cloneNode(true));
    return;
  }
  const span = container.createSpan({ cls: "fb-mirrored-pseudo-icon" });
  const s = icon.styles;
  if (s.backgroundImage) {
    span.style.backgroundImage = s.backgroundImage;
    span.style.backgroundSize = s.backgroundSize;
    span.style.backgroundRepeat = s.backgroundRepeat;
    span.style.backgroundPosition = s.backgroundPosition;
  } else if (s.maskImage) {
    span.style.maskImage = s.maskImage;
    span.style.setProperty("-webkit-mask-image", s.maskImage);
    span.style.maskSize = s.maskSize;
    span.style.setProperty("-webkit-mask-size", s.maskSize);
    span.style.maskRepeat = s.maskRepeat;
    span.style.setProperty("-webkit-mask-repeat", s.maskRepeat);
    span.style.maskPosition = s.maskPosition;
    span.style.setProperty("-webkit-mask-position", s.maskPosition);
    span.style.backgroundColor = s.backgroundColor && s.backgroundColor !== "rgba(0, 0, 0, 0)" ? s.backgroundColor : s.color || "currentColor";
  } else if (s.text) {
    span.setText(s.text);
    if (s.color) span.style.color = s.color;
    if (s.fontFamily) span.style.fontFamily = s.fontFamily;
    if (s.fontSize) span.style.fontSize = s.fontSize;
  }
}
function getExtensionFromPath(path) {
  const fileName = path.split("/").pop() || "";
  const dotIdx = fileName.lastIndexOf(".");
  if (dotIdx <= 0 || dotIdx === fileName.length - 1) return "";
  return fileName.slice(dotIdx + 1).toLowerCase();
}
function getIconSignature(icon) {
  if (!icon) return "";
  if (icon.kind === "node") {
    const key = icon.template.getAttribute("data-mfi-icon-key");
    if (key) return `mfi:${key}`;
    return icon.template.innerHTML.slice(0, 160);
  }
  return icon.styles.backgroundImage || icon.styles.maskImage || icon.styles.text;
}
function isNativeFolderCollapsed(nativeSelf) {
  const folderItem = nativeSelf.closest(".nav-folder");
  if (folderItem) return folderItem.classList.contains("is-collapsed");
  const caret = nativeSelf.querySelector(".collapse-icon");
  return caret ? caret.classList.contains("is-collapsed") : true;
}
function getFallbackIconCache(fileItems) {
  const now = Date.now();
  if (fallbackCache && now - fallbackCache.builtAt < CACHE_TTL_MS) {
    return fallbackCache;
  }
  const byExt = /* @__PURE__ */ new Map();
  let defaultFolderClosed = null;
  let defaultFolderOpen = null;
  let defaultFolderClosedHtml = "";
  let defaultFolderOpenHtml = "";
  for (const [itemPath, entry] of Object.entries(fileItems)) {
    const selfEl = entry?.selfEl;
    if (!selfEl || !selfEl.isConnected) continue;
    const isFolder = selfEl.classList.contains("nav-folder-title");
    if (isFolder) {
      const collapsed = isNativeFolderCollapsed(selfEl);
      if (collapsed && !defaultFolderClosed) {
        const extracted2 = extractIconFromNativeSelf(selfEl);
        if (extracted2) {
          const mfiKey = extracted2.kind === "node" ? extracted2.template.getAttribute("data-mfi-icon-key") : null;
          if (!mfiKey || mfiKey === "folder") {
            defaultFolderClosed = extracted2;
            defaultFolderClosedHtml = getIconSignature(extracted2);
          }
        }
      } else if (!collapsed && !defaultFolderOpen) {
        const extracted2 = extractIconFromNativeSelf(selfEl);
        if (extracted2) {
          const mfiKey = extracted2.kind === "node" ? extracted2.template.getAttribute("data-mfi-icon-key") : null;
          if (!mfiKey || mfiKey === "folder-open") {
            defaultFolderOpen = extracted2;
            defaultFolderOpenHtml = getIconSignature(extracted2);
          }
        }
      }
      continue;
    }
    const ext = getExtensionFromPath(itemPath);
    if (!ext || byExt.has(ext)) continue;
    const extracted = extractIconFromNativeSelf(selfEl);
    if (extracted) {
      byExt.set(ext, extracted);
    }
  }
  if (!defaultFolderClosed || !defaultFolderOpen) {
    for (const entry of Object.values(fileItems)) {
      const selfEl = entry?.selfEl;
      if (!selfEl || !selfEl.isConnected || !selfEl.classList.contains("nav-folder-title")) continue;
      const collapsed = isNativeFolderCollapsed(selfEl);
      if (collapsed && !defaultFolderClosed) {
        const extracted = extractIconFromNativeSelf(selfEl);
        if (extracted) {
          defaultFolderClosed = extracted;
          defaultFolderClosedHtml = getIconSignature(extracted);
        }
      } else if (!collapsed && !defaultFolderOpen) {
        const extracted = extractIconFromNativeSelf(selfEl);
        if (extracted) {
          defaultFolderOpen = extracted;
          defaultFolderOpenHtml = getIconSignature(extracted);
        }
      }
      if (defaultFolderClosed && defaultFolderOpen) break;
    }
  }
  fallbackCache = {
    builtAt: now,
    byExt,
    defaultFolderClosed,
    defaultFolderOpen,
    defaultFolderClosedHtml,
    defaultFolderOpenHtml
  };
  return fallbackCache;
}
function applyNativeDecoration(app, path, iconContainer, titleEl, fallbackIcon, isExpandedFolder) {
  iconContainer.empty();
  iconContainer.removeClass("is-hidden");
  const fileItems = getNativeFileExplorerItems(app);
  const nativeSelf = fileItems?.[path]?.selfEl;
  if (nativeSelf) {
    const nativeTitle = nativeSelf.querySelector(".tree-item-inner");
    const customColor = nativeTitle?.style.color || nativeSelf.style.color || nativeSelf.style.getPropertyValue("--folder-color") || nativeSelf.style.getPropertyValue("--color");
    if (customColor) {
      titleEl.style.color = customColor;
    }
  }
  const rowEl = titleEl.parentElement instanceof HTMLElement ? titleEl.parentElement : null;
  if (extractPseudoIcon(titleEl) || extractPseudoIcon(rowEl)) {
    iconContainer.addClass("is-hidden");
    return;
  }
  const cache = fileItems ? getFallbackIconCache(fileItems) : null;
  if (nativeSelf) {
    const exactIcon = extractIconFromNativeSelf(nativeSelf);
    if (exactIcon) {
      if (fallbackIcon === "folder" && isExpandedFolder !== void 0 && cache) {
        const sig = getIconSignature(exactIcon);
        const isGenericFolder = sig === "mfi:folder" || sig === "mfi:folder-open" || cache.defaultFolderClosedHtml !== "" && sig === cache.defaultFolderClosedHtml || cache.defaultFolderOpenHtml !== "" && sig === cache.defaultFolderOpenHtml;
        if (isGenericFolder) {
          const stateMatched = isExpandedFolder ? cache.defaultFolderOpen || exactIcon : cache.defaultFolderClosed || exactIcon;
          renderExtractedIcon(iconContainer, stateMatched);
          return;
        }
      }
      renderExtractedIcon(iconContainer, exactIcon);
      return;
    }
  }
  if (cache) {
    let cachedIcon = null;
    if (fallbackIcon === "folder") {
      cachedIcon = isExpandedFolder ? cache.defaultFolderOpen || cache.defaultFolderClosed : cache.defaultFolderClosed || cache.defaultFolderOpen;
    } else {
      cachedIcon = cache.byExt.get(getExtensionFromPath(path)) || null;
    }
    if (cachedIcon) {
      renderExtractedIcon(iconContainer, cachedIcon);
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
var FLOW_SIZE_SM = 4;
var FLOW_WINDOW_SIZE = 15;
var FLOW_MAX_DRAG_COLS = 4;
var FLOW_COL_GAP = 24;
var FLOW_CANVAS_PAD_LEFT = 14;
var FLOW_COL_MIN_WIDTH = 180;
var FLOW_COL_MAX_WIDTH = 560;
var QL_SPLIT_MIN_RATIO = 0.18;
var QL_SPLIT_MAX_RATIO = 0.75;
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
    // [ID 6.5.43] Space 네이티브 우측 분할 편집기(WorkspaceLeaf 1개 재사용) + 분할 비율 영속화
    // -> 진짜 옵시디언 MarkdownView 1개만 재사용해 토글 플러그인·라이브 프리뷰를 100% 지원하면서 메모리 부담을 일반 탭 1개 수준으로 제한함.
    this.quickEditLeaf = null;
    this.splitSaveTimer = null;
    this.splitApplyLockUntil = 0;
    this.renderedCards = [];
    // [ID 6.5.11] Option(Alt)+방향키 들고 이동 & Cmd+C/X/V 복사·잘라내기·붙여넣기 클립보드 상태
    // -> cut은 이동(원본 반투명 표시), copy는 재귀 복제(여러 폴더에 반복 붙여넣기 가능)로 동작함.
    this.carryPaths = [];
    this.carryCardIndex = 0;
    this.carryTargetFolderPath = null;
    this.carryAnchorY = null;
    this.carryAnchorX = null;
    this.clipboardMode = null;
    this.clipboardPaths = [];
    this.activeDragPaths = [];
    this.draggingCardPath = null;
    this.reorderTargetEl = null;
    this.reorderPosition = "before";
    this.currentDropEl = null;
    this.isDragging = false;
    this.isSubModalOpen = false;
    this.isInlineRenaming = false;
    this.renderedSortIcon = null;
    // [ID 6.5.41] 여러줄 모드 가상 슬라이딩 윈도우 스크롤 오프셋 & 휠 누적기
    // -> overflow: visible을 유지(하단 빈공간 0)하면서도 15개 초과 대용량 폴더 내부를 휠·방향키로 실시간 스크롤함.
    this.flowScrollOffsets = /* @__PURE__ */ new Map();
    this.flowWheelAccum = /* @__PURE__ */ new Map();
    // [ID 6.5.36] viewScope와 window capture 간 중복 실행 방지용 이벤트 추적기
    // -> e.defaultPrevented 대신 WeakSet을 사용해 옵시디언 기본 핫키(Cmd+D 등)가 preventDefault()를 걸어도 보드 동작이 정상 실행되게 함.
    this.handledKeyEvents = /* @__PURE__ */ new WeakSet();
    this.layoutBtns = [];
    this.vaultRefs = [];
    this.resizeObserver = null;
    this.flowResizerRaf = null;
    this.lastCanvasHeight = 0;
    // [ID 6.5.32] 뷰 전용 Obsidian Scope -> 옵시디언 글로벌 Cmd+F/A/D 단축키보다 우선해 보드 활성 시 안전하게 가로챔
    this.viewScope = null;
    this.scopeActive = false;
    this.refreshTimer = null;
    this.lateIconSyncTimer = null;
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
      this.handledKeyEvents.add(evt);
      evt.preventDefault();
      evt.stopImmediatePropagation();
      this.focusSearchBox();
      return false;
    });
    registerModAndCtrl(["a", "\u3141"], (evt) => {
      if (this.isInputFocused()) return true;
      this.handledKeyEvents.add(evt);
      evt.preventDefault();
      evt.stopImmediatePropagation();
      this.selectAllInFocusedCard();
      return false;
    });
    registerModAndCtrl(["c", "\u314A"], (evt) => {
      if (this.isInputFocused() || this.hasSelectedText()) return true;
      if (this.copySelectedOrFocused()) {
        this.handledKeyEvents.add(evt);
        evt.preventDefault();
        evt.stopImmediatePropagation();
        return false;
      }
      return true;
    });
    registerModAndCtrl(["x", "\u314C"], (evt) => {
      if (this.isInputFocused() || this.hasSelectedText()) return true;
      if (this.cutSelectedOrFocused()) {
        this.handledKeyEvents.add(evt);
        evt.preventDefault();
        evt.stopImmediatePropagation();
        return false;
      }
      return true;
    });
    registerModAndCtrl(["v", "\u314D"], (evt) => {
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
  syncScopeState() {
    const shouldBeActive = !this.isSubModalOpen && !this.isInlineRenaming && !document.querySelector(".modal-container") && this.app.workspace.getActiveViewOfType(_FolderBoardView) === this;
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
    this.app.workspace.onLayoutReady(() => this.syncScopeState());
    requestAnimationFrame(() => {
      this.shellEl?.focus();
      this.syncScopeState();
    });
    this.lateIconSyncTimer = window.setTimeout(() => {
      this.lateIconSyncTimer = null;
      this.refreshNativeDecorationsInPlace();
    }, 800);
  }
  async onClose() {
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
  buildShell() {
    this.shellEl = this.contentEl.createDiv({
      cls: "fb-shell",
      attr: { tabindex: "-1" }
    });
    this.shellEl.addEventListener("mousedown", () => this.syncScopeState());
    this.shellEl.addEventListener("focusin", () => this.syncScopeState());
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
      { value: "scroll", label: "", aria: "\uAC00\uB85C \uBAA8\uB4DC (\uC138\uB85C \uD3BC\uCE68 \xB7 \uAC00\uB85C \uC2A4\uD06C\uB864)", icon: "columns" },
      { value: "flow", label: "", aria: "\uC5EC\uB7EC\uC904 \uBAA8\uB4DC (\uC139\uC158 \uBD84\uB958)", icon: "list-tree" }
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
      attr: { "aria-label": "\uBE60\uB978 \uD3B8\uC9D1 (Space)" }
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
    this.colResizersEl = this.canvasEl.createDiv({ cls: "fb-col-resizers" });
    this.resizeObserver = new ResizeObserver(() => {
      if (this.renderedCards.length === 0) return;
      if (this.plugin.settings.gridCols === "auto") {
        this.applyGridLayoutClasses(this.renderedCards.length);
      } else if (this.plugin.settings.gridCols === "flow") {
        const nextH = this.canvasEl.clientHeight;
        if (Math.abs(nextH - this.lastCanvasHeight) >= 12 && this.plugin.hasAnyDynamicFlowWindow()) {
          this.lastCanvasHeight = nextH;
          this.renderGridAndHeader();
          return;
        }
        this.lastCanvasHeight = nextH;
        this.scheduleFlowColResizersSync();
      }
    });
    this.resizeObserver.observe(this.canvasEl);
    this.canvasEl.addEventListener(
      "wheel",
      (e) => {
        const mode = this.plugin.settings.gridCols;
        if (mode !== "scroll" && mode !== "flow") return;
        const target = e.target;
        if (mode === "scroll" && target?.closest(".fb-card-body")) return;
        if (mode === "flow" && target?.closest('.fb-card[data-windowed="true"]')) return;
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          this.canvasEl.scrollLeft += e.deltaY;
          e.preventDefault();
        }
      },
      { passive: false }
    );
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
      this.app.workspace.on("layout-change", () => {
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
        if (file instanceof import_obsidian3.TFolder) {
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
    const isFlowMode = this.plugin.settings.gridCols === "flow";
    for (const sub of childFolders) {
      const subPath = normalizeFolderRef(sub);
      const isCollapsedSection = isFlowMode && !q && this.plugin.isFlowSectionCollapsed(subPath);
      const items = [];
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
  clampFlowColWidth(width) {
    return Math.max(FLOW_COL_MIN_WIDTH, Math.min(Math.round(width), FLOW_COL_MAX_WIDTH));
  }
  applyGridLayoutClasses(cardCount) {
    const prefLayout = this.plugin.settings.gridCols;
    const isHorizontalCanvas = prefLayout === "scroll" || prefLayout === "flow";
    this.canvasEl.toggleClass("is-horizontal-scroll", isHorizontalCanvas);
    if (prefLayout === "scroll") {
      this.gridEl.style.removeProperty("--fb-flow-col-width");
      this.gridEl.className = "fb-grid fb-layout-scroll";
    } else if (prefLayout === "flow") {
      const colW = this.clampFlowColWidth(this.plugin.settings.flowColumnWidth);
      this.gridEl.style.setProperty("--fb-flow-col-width", `${colW}px`);
      this.gridEl.className = cardCount === 0 ? "fb-grid fb-layout-flow is-empty" : "fb-grid fb-layout-flow";
    } else if (prefLayout === "auto") {
      this.gridEl.style.removeProperty("--fb-flow-col-width");
      const availWidth = Math.max(260, this.canvasEl.clientWidth - 28);
      const estimatedCols = Math.max(1, Math.floor((availWidth + 10) / 270));
      const rowClass = cardCount <= estimatedCols ? "fb-rows-1" : "fb-rows-auto";
      this.gridEl.className = `fb-grid fb-layout-auto ${rowClass}`;
    } else {
      this.gridEl.style.removeProperty("--fb-flow-col-width");
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
  refreshNativeDecorationsInPlace() {
    if (!this.gridEl) return;
    invalidateNativeIconCache();
    this.gridEl.querySelectorAll(".fb-card:not(.is-root-card)").forEach((cardEl) => {
      const folderPath = normalizeFolderStr(cardEl.dataset.dropFolder);
      const iconEl = cardEl.querySelector(".fb-card-header .fb-native-icon");
      const titleEl = cardEl.querySelector(".fb-card-header .fb-card-title");
      const isExpanded = !cardEl.hasClass("is-section-collapsed");
      if (folderPath && iconEl && titleEl) {
        applyNativeDecoration(this.app, folderPath, iconEl, titleEl, "folder", isExpanded);
      }
    });
    this.gridEl.querySelectorAll(".fb-row").forEach((rowEl) => {
      const itemPath = rowEl.dataset.path;
      const iconEl = rowEl.querySelector(".fb-native-icon");
      const titleEl = rowEl.querySelector(".tree-item-inner");
      if (!itemPath || !iconEl || !titleEl) return;
      const isFolder = rowEl.classList.contains("nav-folder-title");
      const isExpanded = isFolder ? !rowEl.querySelector(".collapse-icon")?.hasClass("is-collapsed") : void 0;
      applyNativeDecoration(this.app, itemPath, iconEl, titleEl, isFolder ? "folder" : "file-text", isExpanded);
    });
  }
  renderGrid(cards) {
    invalidateNativeIconCache();
    this.gridEl.empty();
    this.applyGridLayoutClasses(cards.length);
    if (cards.length === 0) {
      this.gridEl.createDiv({ cls: "fb-empty-grid", text: "\uC77C\uCE58\uD558\uB294 \uD56D\uBAA9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" });
      this.colResizersEl?.empty();
      return;
    }
    const isCarrying = this.carryPaths.length > 0;
    const isFlowMode = this.plugin.settings.gridCols === "flow";
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
  scheduleFlowColResizersSync() {
    if (this.flowResizerRaf !== null) {
      window.cancelAnimationFrame(this.flowResizerRaf);
    }
    this.flowResizerRaf = window.requestAnimationFrame(() => {
      this.flowResizerRaf = null;
      this.syncFlowColResizers();
    });
  }
  positionFlowColResizer(handleEl, colIndex, colWidth) {
    const gapCenter = FLOW_CANVAS_PAD_LEFT + colIndex * colWidth + (colIndex - 1) * FLOW_COL_GAP + FLOW_COL_GAP / 2;
    handleEl.style.left = `${Math.round(gapCenter - 7)}px`;
  }
  syncFlowColResizers() {
    if (!this.colResizersEl) return;
    this.colResizersEl.empty();
    if (this.plugin.settings.gridCols !== "flow" || this.renderedCards.length === 0) return;
    const colW = this.clampFlowColWidth(this.plugin.settings.flowColumnWidth);
    const gridRect = this.gridEl.getBoundingClientRect();
    const probes = Array.from(
      this.gridEl.querySelectorAll(".fb-row, .fb-card-header, .fb-empty-card")
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
          "aria-label": "\uB2E4\uB2E8 \uB108\uBE44 \uC870\uC808 (\uB4DC\uB798\uADF8)"
        }
      });
      this.positionFlowColResizer(handle, k, colW);
      handle.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startW = this.clampFlowColWidth(this.plugin.settings.flowColumnWidth);
        let latestW = startW;
        handle.addClass("is-dragging");
        document.body.style.cursor = "col-resize";
        const allHandles = Array.from(this.colResizersEl.querySelectorAll(".fb-col-resizer"));
        const onMove = (ev) => {
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
  getFlowWindowKey(cardModel) {
    return cardModel.isRootCard ? "__root__" : cardModel.folderPath;
  }
  // [ID 6.5.47] 여러줄 모드 카드 1열 꽉 찬 최대 행 수 정밀 산출
  // -> .fb-grid 실제 내부 높이와 실측 행 높이(flow 모드는 gap 0)를 그대로 사용해 화면 하단까지 빈틈없이 딱 맞게 채움.
  measureFlowRowHeight() {
    const sampleRow = this.gridEl?.querySelector(".fb-row");
    const measured = sampleRow ? sampleRow.getBoundingClientRect().height : 27;
    return Math.max(22, Math.min(40, measured || 27));
  }
  getFlowMaxOneColumnItems(cardModel) {
    const gridH = this.gridEl?.clientHeight || Math.max(240, (this.canvasEl?.clientHeight || 720) - 24);
    const rowH = this.measureFlowRowHeight();
    const sampleHeader = !cardModel.isRootCard ? this.gridEl?.querySelector(".fb-card-header") : null;
    const headerH = sampleHeader ? sampleHeader.getBoundingClientRect().height : 28;
    const chromeH = cardModel.isRootCard ? 16 : Math.ceil(headerH) + 28;
    const usableH = Math.max(rowH * FLOW_SIZE_SM, gridH - chromeH);
    return Math.max(FLOW_SIZE_SM, Math.floor(usableH / rowH));
  }
  getFlowWindowLimit(cardModel) {
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
  getFlowWindowOffset(cardModel) {
    const limit = this.getFlowWindowLimit(cardModel);
    const maxOffset = Math.max(0, cardModel.items.length - limit);
    const saved = this.flowScrollOffsets.get(this.getFlowWindowKey(cardModel)) || 0;
    const clamped = Math.max(0, Math.min(saved, maxOffset));
    if (clamped !== saved) {
      this.flowScrollOffsets.set(this.getFlowWindowKey(cardModel), clamped);
    }
    return clamped;
  }
  formatFlowCountLabel(cardModel, isScrollableWindow) {
    if (!isScrollableWindow) return String(cardModel.totalCount);
    const limit = this.getFlowWindowLimit(cardModel);
    const offset = this.getFlowWindowOffset(cardModel);
    const end = Math.min(cardModel.items.length, offset + limit);
    return `${offset + 1}\u2013${end} / ${cardModel.items.length}`;
  }
  updateFlowWindowDOM(cardIdx) {
    const cardModel = this.renderedCards[cardIdx];
    if (!cardModel || this.plugin.settings.gridCols !== "flow" || cardModel.isCollapsedSection) return;
    const limit = this.getFlowWindowLimit(cardModel);
    const isScrollable = cardModel.items.length > limit;
    const cardEl = this.gridEl.querySelector(`.fb-card[data-card-index="${cardIdx}"]`);
    if (!cardEl) return;
    const listEl = cardEl.querySelector(".fb-card-body");
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
    const countEl = cardEl.querySelector(".fb-count");
    if (countEl) {
      countEl.setText(this.formatFlowCountLabel(cardModel, isScrollable));
    }
    const footerEl = cardEl.querySelector(".fb-flow-scroll-footer");
    footerEl?.toggleClass("is-unscrolled", !isScrollable);
    const thumbEl = cardEl.querySelector(".fb-flow-scroll-thumb");
    if (thumbEl) {
      const total = cardModel.items.length;
      if (isScrollable) {
        const pctLeft = offset / total * 100;
        const pctWidth = Math.max(8, limit / total * 100);
        thumbEl.style.left = `${pctLeft}%`;
        thumbEl.style.width = `${pctWidth}%`;
      } else {
        thumbEl.style.left = "0%";
        thumbEl.style.width = "100%";
      }
    }
  }
  ensureFlowWindowIncludes(cardIdx, itemIndex) {
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
  renderCardElement(parentEl, cardModel, cardIdx, isCarrying, isFlowMode) {
    const isFocusedCard = !isCarrying && cardIdx === this.focusedCardIndex;
    const isCarryCard = isCarrying && cardIdx === this.carryCardIndex && this.carryTargetFolderPath === cardModel.folderPath;
    const winKey = this.getFlowWindowKey(cardModel);
    const isResizableFlowCard = isFlowMode && !cardModel.isCollapsedSection && cardModel.items.length > FLOW_SIZE_SM;
    const windowLimit = isResizableFlowCard ? this.getFlowWindowLimit(cardModel) : cardModel.items.length;
    const isScrollableWindow = isResizableFlowCard && cardModel.items.length > windowLimit;
    const cardEl = parentEl.createDiv({
      cls: "fb-card" + (cardModel.isRootCard ? " is-root-card" : "") + (cardModel.isCollapsedSection ? " is-section-collapsed" : "") + (isFocusedCard ? " is-focused-card" : "") + (isCarryCard ? " is-carry-target" : ""),
      attr: {
        "data-drop-folder": cardModel.folderPath,
        "data-card-index": String(cardIdx),
        ...isScrollableWindow ? { "data-windowed": "true" } : {}
      }
    });
    if (isFlowMode) {
      cardEl.addEventListener(
        "wheel",
        (e) => {
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
    if (!cardModel.isRootCard) {
      const isHeaderFocused = isFocusedCard && this.focusedItemKey === CARD_HEADER_KEY;
      const headerEl = cardEl.createDiv({
        cls: "fb-card-header" + (isHeaderFocused ? " is-header-focused" : "")
      });
      const titleWrap = headerEl.createDiv({ cls: "fb-card-title-wrap" });
      if (isFlowMode) {
        const sectionCaret = titleWrap.createSpan({
          cls: "tree-item-icon collapse-icon fb-section-caret" + (cardModel.isCollapsedSection ? " is-collapsed" : "")
        });
        (0, import_obsidian3.setIcon)(sectionCaret, "chevron-down");
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
  }
  // [ID 6.5.54] 카드 본문·하단 리사이즈 바 독립 렌더링 (헤더/→ 화살표 DOM 보존용)
  // -> 폴더 접기/펼치기·크기 변경 시 카드 헤더를 파괴하지 않고 본문만 부분 교체해 Baseline 테마 아이콘 깜박임과 끊김을 원천 제거함.
  renderCardBodyAndFooter(cardEl, cardModel, cardIdx, isCarrying, isFlowMode) {
    if (cardModel.isCollapsedSection) return null;
    const winKey = this.getFlowWindowKey(cardModel);
    const isResizableFlowCard = isFlowMode && cardModel.items.length > FLOW_SIZE_SM;
    const windowLimit = isResizableFlowCard ? this.getFlowWindowLimit(cardModel) : cardModel.items.length;
    const isScrollableWindow = isResizableFlowCard && cardModel.items.length > windowLimit;
    const activeSizeSpec = isResizableFlowCard ? this.plugin.getFlowWindowSizeSpec(winKey) : "md";
    const listEl = cardEl.createDiv({ cls: "fb-card-body nav-files-container" });
    listEl.addEventListener("click", (e) => {
      if (e.target?.closest(".fb-row")) return;
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
      if (e.target?.closest(".fb-row")) return;
      const folder = getFolderByPath(this.app, cardModel.folderPath);
      if (folder) this.openContextMenu(e, folder);
    });
    if (cardModel.items.length === 0) {
      listEl.createDiv({ cls: "fb-empty-card", text: "\uBE44\uC5B4 \uC788\uC74C" });
      return listEl;
    }
    const startIdx = isScrollableWindow ? this.getFlowWindowOffset(cardModel) : 0;
    const endIdx = isScrollableWindow ? Math.min(cardModel.items.length, startIdx + windowLimit) : cardModel.items.length;
    this.renderCardRows(listEl, cardModel, cardIdx, isCarrying, startIdx, endIdx);
    if (isResizableFlowCard) {
      const footer = cardEl.createDiv({
        cls: "fb-flow-scroll-footer" + (isScrollableWindow ? "" : " is-unscrolled"),
        attr: { "aria-label": "\uB4DC\uB798\uADF8\uB85C \uAE38\uC774 \uC870\uC808 \uB610\uB294 \uC18C/\uC911/\uB300 \uC120\uD0DD" }
      });
      const track = footer.createDiv({ cls: "fb-flow-scroll-track" });
      const thumb = track.createDiv({ cls: "fb-flow-scroll-thumb" });
      const total = cardModel.items.length;
      if (isScrollableWindow) {
        thumb.style.left = `${startIdx / total * 100}%`;
        thumb.style.width = `${Math.max(8, windowLimit / total * 100)}%`;
      } else {
        thumb.style.left = "0%";
        thumb.style.width = "100%";
      }
      const sizeBar = footer.createDiv({ cls: "fb-flow-size-bar" });
      const dragHandle = sizeBar.createSpan({
        cls: "fb-flow-drag-handle",
        attr: { "aria-label": "\uC704\uC544\uB798 \uB4DC\uB798\uADF8\uB85C \uAE38\uC774 \uC870\uC808" }
      });
      (0, import_obsidian3.setIcon)(dragHandle, "chevrons-up-down");
      sizeBar.createSpan({ cls: "fb-flow-size-sep" });
      const sizePresets = [
        { spec: "sm", label: "\uC18C", aria: `\uC18C (${FLOW_SIZE_SM}\uAC1C)` },
        { spec: "md", label: "\uC911", aria: `\uC911 (\uAE30\uBCF8 ${FLOW_WINDOW_SIZE}\uAC1C)` }
      ];
      if (cardModel.items.length > FLOW_WINDOW_SIZE) {
        sizePresets.push({ spec: "lg", label: "\uB300", aria: "\uB300 (1\uC5F4 \uAF49\uCC28\uAC8C)" });
      }
      let suppressNextClick = false;
      for (const preset of sizePresets) {
        const isActive = activeSizeSpec === preset.spec || typeof activeSizeSpec === "number" && (preset.spec === "sm" && activeSizeSpec === FLOW_SIZE_SM || preset.spec === "md" && activeSizeSpec === FLOW_WINDOW_SIZE);
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
      footer.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
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
        const onMove = (ev) => {
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          if (!isDragging && Math.hypot(dx, dy) >= 4) {
            isDragging = true;
            footer.addClass("is-resizing");
            document.body.style.cursor = "ns-resize";
          }
          if (!isDragging) return;
          const effectiveDx = Math.abs(dx) < 28 ? 0 : dx > 0 ? dx - 28 : dx + 28;
          const deltaRows = Math.round(dy / rowH + effectiveDx / colPitch * maxOneCol);
          const nextRows = Math.max(minRows, Math.min(maxRows, startRows + deltaRows));
          if (nextRows >= maxDragLimit && cardModel.items.length > maxDragLimit) {
            dragBadge.setText(`${nextRows}\uAC1C \xB7 \uCD5C\uB300 ${FLOW_MAX_DRAG_COLS}\uC5F4`);
          } else if (nextRows > maxOneCol) {
            const cols = Math.min(FLOW_MAX_DRAG_COLS, Math.ceil(nextRows / maxOneCol));
            dragBadge.setText(`${nextRows}\uAC1C (${cols}\uC5F4)`);
          } else {
            dragBadge.setText(`${nextRows}\uAC1C`);
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
          let finalSpec = latestRows;
          if (latestRows === FLOW_SIZE_SM) {
            finalSpec = "sm";
          } else if (latestRows === FLOW_WINDOW_SIZE || latestRows === cardModel.items.length && cardModel.items.length <= FLOW_WINDOW_SIZE) {
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
  renderCardRows(listEl, cardModel, cardIdx, isCarrying, startIdx, endIdx) {
    const cutSet = new Set(this.clipboardMode === "cut" ? this.clipboardPaths : []);
    const isFlowMode = this.plugin.settings.gridCols === "flow";
    for (let itemIdx = startIdx; itemIdx < endIdx && itemIdx < cardModel.items.length; itemIdx++) {
      const item = cardModel.items[itemIdx];
      const isFocused = !isCarrying && cardIdx === this.focusedCardIndex && this.focusedItemKey === item.key;
      const isCut = cutSet.has(item.path);
      if (item.type === "folder") {
        const isSelected = this.selectedPaths.has(item.path);
        const isCarryFolder = isCarrying && cardIdx === this.carryCardIndex && this.carryTargetFolderPath === item.path;
        const row = listEl.createDiv({
          cls: "tree-item-self is-clickable nav-folder-title fb-row" + (isSelected ? " is-selected" : "") + (isFocused ? " is-focused" : "") + (isCut ? " is-cut" : "") + (isCarryFolder ? " is-carry-target" : ""),
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
        applyNativeDecoration(this.app, item.path, fIcon, fTitle, "folder", Boolean(item.expanded));
        if (item.childCount !== void 0) {
          row.createSpan({ cls: "fb-row-count", text: String(item.childCount) });
        }
        if (isFlowMode) {
          const rowDrillBtn = row.createEl("button", {
            cls: "clickable-icon fb-row-drill-btn",
            attr: { "aria-label": `${item.name} \uC5F4\uAE30` }
          });
          (0, import_obsidian3.setIcon)(rowDrillBtn, "arrow-right");
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
          cls: "tree-item-self is-clickable nav-file-title fb-row" + (isSelected ? " is-selected" : "") + (isFocused ? " is-focused" : "") + (isCut ? " is-cut" : ""),
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
  clampQuickEditSplitRatio(ratio) {
    return Math.max(QL_SPLIT_MIN_RATIO, Math.min(QL_SPLIT_MAX_RATIO, ratio));
  }
  isQuickEditLeafAlive() {
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
  applySavedQuickEditSplitRatio() {
    if (!this.isQuickEditLeafAlive() || !this.quickEditLeaf) return;
    const boardParent = this.leaf.parent;
    const editParent = this.quickEditLeaf.parent;
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
  captureQuickEditSplitRatio(force = false) {
    if (!force && Date.now() < this.splitApplyLockUntil) return;
    if (!this.isQuickEditLeafAlive() || !this.quickEditLeaf) return;
    const boardParent = this.leaf.parent;
    const editParent = this.quickEditLeaf.parent;
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
  scheduleCaptureSplitRatio() {
    if (Date.now() < this.splitApplyLockUntil) return;
    if (this.splitSaveTimer !== null) {
      window.clearTimeout(this.splitSaveTimer);
    }
    this.splitSaveTimer = window.setTimeout(() => {
      this.splitSaveTimer = null;
      this.captureQuickEditSplitRatio();
    }, 220);
  }
  closeQuickEditLeaf(refocusBoard = true) {
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
  async updateQuickLook(targetFileOverride) {
    if (!this.quickLookOpen) {
      this.closeQuickEditLeaf(true);
      return;
    }
    const file = targetFileOverride !== void 0 ? targetFileOverride : this.getFocusedFile();
    if (!file) {
      if (!this.isQuickEditLeafAlive()) {
        this.quickLookOpen = false;
        this.quickLookPath = null;
        this.updateToolbarStates();
      }
      return;
    }
    const alive = this.isQuickEditLeafAlive();
    const currentViewFile = this.quickEditLeaf?.view?.file;
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
        state: file.extension === "md" ? { mode: "source" } : void 0
      });
    } catch {
      return;
    }
    if (createdNew) {
      requestAnimationFrame(() => this.applySavedQuickEditSplitRatio());
    }
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
    this.ensureFlowWindowIncludes(cardIdx, safeIdx);
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
      } else if (this.plugin.settings.gridCols === "flow") {
        const focusTarget = this.gridEl.querySelector(".fb-row.is-carry-target") || this.gridEl.querySelector(".fb-row.is-focused") || this.gridEl.querySelector(".fb-card-header.is-header-focused") || this.gridEl.querySelector(`.fb-card[data-card-index="${activeCardIdx}"]`);
        if (focusTarget) {
          focusTarget.scrollIntoView({ block: "nearest", inline: "nearest" });
        }
        return;
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
    this.ensureFlowWindowIncludes(cardIdx, safeTarget);
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
  // [ID 6.5.17] 카드 내부 하위 폴더 진입 -> 직관적으로 선택한 하위 폴더 안으로 직접 이동함.
  enterInlineSubfolderLevel(subfolderPath) {
    this.navigateToFolder(subfolderPath);
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
  isAllSourcesAlreadyInFolder(destPath) {
    const normDest = normalizeFolderStr(destPath);
    if (this.carryPaths.length === 0) return false;
    return this.carryPaths.every((p) => {
      const abs = this.app.vault.getAbstractFileByPath(p);
      return abs?.parent ? normalizeFolderRef(abs.parent) === normDest : false;
    });
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
  // [ID 6.5.57] Option(Alt)+방향키 들고 이동 (전역 수직 순회 + 2D 공간 좌/우 이동 통합)
  // -> 위/아래 이동 시 현재 카드 내부에 갇히지 않고 카드 경계를 넘어 위·아래의 모든 폴더/하위 폴더로 자연스럽게 이동함.
  beginOrStepCarry(direction) {
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
        const excludePath = justStarted ? normalizeFolderStr(this.renderedCards[this.focusedCardIndex]?.folderPath) : this.carryTargetFolderPath !== null ? normalizeFolderStr(this.carryTargetFolderPath) : null;
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
      const allTargets = [];
      this.renderedCards.forEach((card, cardIdx) => {
        for (const t of this.getValidFolderTargetsInCard(card)) {
          allTargets.push({ cardIdx, path: t.path, pos: t.pos });
        }
      });
      if (allTargets.length === 0) return;
      let chosen = null;
      if (justStarted) {
        const originCard = this.focusedCardIndex;
        const originPos = this.focusedItemKey === CARD_HEADER_KEY ? -1 : this.findFocusedCardAndIndex().itemIndex;
        const nonSameParent = (t) => !this.isAllSourcesAlreadyInFolder(t.path);
        const candidates = allTargets.filter(nonSameParent);
        const pool = candidates.length > 0 ? candidates : allTargets;
        if (direction === "up") {
          const before = pool.filter(
            (t) => t.cardIdx < originCard || t.cardIdx === originCard && t.pos < originPos
          );
          chosen = before.length > 0 ? before[before.length - 1] : pool[pool.length - 1];
        } else {
          const after = pool.filter(
            (t) => t.cardIdx > originCard || t.cardIdx === originCard && t.pos > originPos
          );
          chosen = after.length > 0 ? after[0] : pool[0];
        }
      } else {
        const curFlatIdx = allTargets.findIndex(
          (t) => t.cardIdx === this.carryCardIndex && t.path === this.carryTargetFolderPath
        );
        const delta = direction === "down" ? 1 : -1;
        const nextFlatIdx = curFlatIdx === -1 ? 0 : (curFlatIdx + delta + allTargets.length) % allTargets.length;
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
      const card = this.renderedCards[this.carryCardIndex];
      if (!card) return;
      const targets = this.getValidFolderTargetsInCard(card);
      if (targets.length === 0) return;
      const stepToVerticalNeighborCard = (dir) => {
        if (mode === "scroll") return false;
        let probeIdx = this.carryCardIndex;
        for (let guard = 0; guard < this.renderedCards.length; guard++) {
          const neighborIdx = this.findVerticalNeighborCard(probeIdx, dir);
          if (neighborIdx < 0) break;
          const neighborTargets = this.getValidFolderTargetsInCard(this.renderedCards[neighborIdx]);
          if (neighborTargets.length > 0) {
            this.carryCardIndex = neighborIdx;
            this.carryTargetFolderPath = dir === "up" ? neighborTargets[neighborTargets.length - 1].path : neighborTargets[0].path;
            return true;
          }
          probeIdx = neighborIdx;
        }
        return false;
      };
      if (justStarted) {
        const originPos = this.focusedItemKey === CARD_HEADER_KEY ? -1 : this.findFocusedCardAndIndex().itemIndex;
        const filtered = targets.filter((t) => !this.isAllSourcesAlreadyInFolder(t.path));
        if (direction === "up") {
          const above = filtered.filter((t) => t.pos < originPos);
          if (above.length > 0) {
            this.carryTargetFolderPath = above[above.length - 1].path;
          } else if (!stepToVerticalNeighborCard("up")) {
            this.carryTargetFolderPath = filtered.length > 0 ? filtered[filtered.length - 1].path : targets[targets.length - 1].path;
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
    if (direction === "up" || direction === "down") {
      const targetEl = this.gridEl.querySelector(
        `.fb-row[data-card-index="${this.carryCardIndex}"][data-drop-folder="${CSS.escape(this.carryTargetFolderPath || "")}"]`
      ) || this.gridEl.querySelector(
        `.fb-card[data-card-index="${this.carryCardIndex}"] .fb-card-header`
      ) || this.gridEl.querySelector(`.fb-card[data-card-index="${this.carryCardIndex}"]`);
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
  commitCarryMode() {
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
  cancelCarryMode() {
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
  // [ID 6.5.37] 네이티브 탐색기 스타일 인라인(제자리) 이름 바꾸기
  // -> 별도 모달 없이 해당 행/카드 헤더의 텍스트 노드만 <input>으로 교체해 시선 이동과 지연을 제거함.
  // -> 한글 조합(isComposing) 보호, 금지 문자 방어, 드래그 충돌 방지를 함께 처리함.
  startInlineRename(target) {
    if (target instanceof import_obsidian3.TFolder && target.isRoot()) return;
    if (this.isInlineRenaming) return;
    const targetPath = target.path;
    let hostEl = null;
    let titleEl = null;
    let isCardHeader = false;
    const rows = Array.from(this.gridEl.querySelectorAll(".fb-row"));
    const matchedRow = rows.find((el) => el.dataset.path === targetPath);
    if (matchedRow) {
      hostEl = matchedRow;
      titleEl = matchedRow.querySelector(".tree-item-inner");
    }
    if (!titleEl && target instanceof import_obsidian3.TFolder) {
      const cards = Array.from(this.gridEl.querySelectorAll(".fb-card:not(.is-root-card)"));
      const matchedCard = cards.find((el) => normalizeFolderStr(el.dataset.dropFolder) === normalizeFolderStr(targetPath));
      if (matchedCard) {
        hostEl = matchedCard.querySelector(".fb-card-header");
        titleEl = matchedCard.querySelector(".fb-card-title");
        isCardHeader = true;
      }
    }
    if (!hostEl || !titleEl) {
      this.promptRenameModalFallback(target);
      return;
    }
    const isMd = target instanceof import_obsidian3.TFile && target.extension === "md";
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
        new import_obsidian3.Notice("\uD30C\uC77C/\uD3F4\uB354 \uC774\uB984\uC5D0 \uC0AC\uC6A9\uD560 \uC218 \uC5C6\uB294 \uBB38\uC790\uAC00 \uD3EC\uD568\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.");
        return;
      }
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
        if (!isCardHeader) {
          this.focusedItemKey = target instanceof import_obsidian3.TFolder ? `folder:${destPath}` : `file:${destPath}`;
        }
        this.renderAll();
        this.scrollFocusedIntoView();
      } catch (err) {
        new import_obsidian3.Notice(`\uC774\uB984 \uBCC0\uACBD \uC2E4\uD328: ${err instanceof Error ? err.message : String(err)}`);
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
  promptRename(target) {
    this.startInlineRename(target);
  }
  promptRenameModalFallback(target) {
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
  // [ID 6.5.52] 무깜박임 부분 카드 갱신(In-Place Patch) + 열림 전용 초경량 100ms GPU 슬라이드
  // -> 전체 gridEl.empty() 대신 변경된 카드 1개의 본문만 교체해 Baseline 테마 화살표 깜박임과 끊김을 0으로 줄이고,
  // -> 닫힐 때는 0ms 즉각 반응(▾ 화살표만 부드럽게 회전), 열릴 때만 리플로우 없는 GPU opacity+translateY(100ms)를 적용함.
  playGpuReveal(el, durationMs = 100) {
    if (!el || typeof el.animate !== "function") return;
    el.animate(
      [
        { opacity: 0, transform: "translateY(-4px)" },
        { opacity: 1, transform: "translateY(0)" }
      ],
      { duration: durationMs, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
    );
  }
  findRenderedDescendantRows(cardIdx, folderPath) {
    const prefix = `${folderPath}/`;
    const cardEl = this.gridEl.querySelector(`.fb-card[data-card-index="${cardIdx}"]`);
    if (!cardEl) return [];
    return Array.from(cardEl.querySelectorAll(".fb-row")).filter((el) => {
      const p = el.dataset.path || "";
      return p.startsWith(prefix);
    });
  }
  patchCardInPlace(cardIdx, options = {}) {
    const cardModel = this.renderedCards[cardIdx];
    const cardEl = this.gridEl.querySelector(`.fb-card[data-card-index="${cardIdx}"]`);
    if (!cardModel || !cardEl) {
      this.renderGridAndHeader();
      return;
    }
    const isFlowMode = this.plugin.settings.gridCols === "flow";
    const q = this.searchQuery.trim().toLowerCase();
    const isCollapsed = isFlowMode && !cardModel.isRootCard && !q && this.plugin.isFlowSectionCollapsed(cardModel.folderPath);
    cardModel.isCollapsedSection = isCollapsed;
    const folder = getFolderByPath(this.app, cardModel.folderPath);
    const nextItems = [];
    if (folder && !isCollapsed) {
      this.collectCardTreeItems(folder, 0, nextItems, !cardModel.isRootCard);
    }
    cardModel.items = nextItems;
    const prevBody = cardEl.querySelector(".fb-card-body");
    const prevScrollTop = prevBody ? prevBody.scrollTop : 0;
    prevBody?.remove();
    cardEl.querySelector(".fb-flow-scroll-footer")?.remove();
    cardEl.toggleClass("is-section-collapsed", isCollapsed);
    cardEl.querySelector(".fb-section-caret")?.toggleClass("is-collapsed", isCollapsed);
    if (!cardModel.isRootCard) {
      const hdrIcon = cardEl.querySelector(".fb-card-header .fb-native-icon");
      const hdrTitle = cardEl.querySelector(".fb-card-header .fb-card-title");
      if (hdrIcon && hdrTitle) {
        applyNativeDecoration(this.app, cardModel.folderPath, hdrIcon, hdrTitle, "folder", !isCollapsed);
      }
    }
    const isResizable = isFlowMode && !isCollapsed && cardModel.items.length > FLOW_SIZE_SM;
    const limit = isResizable ? this.getFlowWindowLimit(cardModel) : cardModel.items.length;
    const isScrollable = isResizable && cardModel.items.length > limit;
    if (isScrollable) cardEl.setAttribute("data-windowed", "true");
    else cardEl.removeAttribute("data-windowed");
    const countEl = cardEl.querySelector(".fb-count");
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
      const newFooter = cardEl.querySelector(".fb-flow-scroll-footer");
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
  toggleFlowSectionInPlace(cardIdx, folderPath) {
    const willExpand = this.plugin.isFlowSectionCollapsed(folderPath);
    void this.plugin.toggleFlowSectionCollapsed(folderPath);
    this.patchCardInPlace(cardIdx, { animateBody: willExpand });
  }
  toggleInlineSubfolderInPlace(cardIdx, folderPath) {
    const willExpand = !this.plugin.isFolderExpanded(folderPath);
    void this.plugin.toggleFolderExpanded(folderPath);
    this.patchCardInPlace(cardIdx, { animateSubfolderPath: willExpand ? folderPath : void 0 });
  }
  // [ID 6.5.51] 포커스 레벨 맞춤형 [ / ] 접기·펼치기 (부분 카드 갱신으로 화살표 깜박임 0)
  // -> 직속 영역에 포커스가 있으면 보드 전체를 일괄 접기/펼치기하고,
  // -> 특정 폴더 카드나 하위 폴더 내부에 포커스가 있으면 해당 폴더 스코프의 하위 폴더들만 레벨에 맞게 접고 펼침.
  setAllSubfoldersExpanded(expanded) {
    const collectAllSubfolders = (folder, out) => {
      for (const child of folder.children) {
        if (child instanceof import_obsidian3.TFolder) {
          const p = normalizeFolderRef(child);
          if (p) out.push(p);
          collectAllSubfolders(child, out);
        }
      }
    };
    const isFlowMode = this.plugin.settings.gridCols === "flow";
    const curCard = this.renderedCards[this.focusedCardIndex];
    if (!curCard || curCard.isRootCard) {
      const folderPaths = [];
      const sectionPaths = [];
      const prevCollapsedIdx = /* @__PURE__ */ new Set();
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
    const cardIdx = this.focusedCardIndex;
    const targetFolderPath = this.getFocusedTargetFolderPath();
    const targetFolder = getFolderByPath(this.app, targetFolderPath);
    const isCardRootScope = targetFolderPath === curCard.folderPath;
    const subfolders = [];
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
        animateSubfolderPath: !wasSectionCollapsed && hasNewlyExpanding ? targetFolderPath : void 0
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
      const isFlow = this.plugin.settings.gridCols === "flow";
      const pos = isFlow ? e.clientY < rect.top + rect.height / 2 ? "before" : "after" : e.clientX < rect.left + rect.width / 2 ? "before" : "after";
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
    if (this.isSubModalOpen || this.isInlineRenaming) return false;
    if (document.querySelector(".modal-container")) return false;
    return this.app.workspace.getActiveViewOfType(_FolderBoardView) === this;
  }
  // [ID 6.5.24] 2D 그리드 · 세로 · 여러줄 모드에서 동일 열의 바로 위·아래 카드/섹션 탐색
  // -> getBoundingClientRect() 화면 좌표를 사용해 flex 컬럼(.fb-flow-col)과 grid 양쪽에서 동일 열만 정확히 매칭함.
  findVerticalNeighborCard(cardIdx, direction) {
    if (this.plugin.settings.verticalEdgeBehavior !== "adaptive") return -1;
    if (this.plugin.settings.gridCols === "scroll") return -1;
    if (this.plugin.settings.gridCols === "flow") {
      const next = cardIdx + (direction === "down" ? 1 : -1);
      return next >= 0 && next < this.renderedCards.length ? next : -1;
    }
    const cardEls = Array.from(this.gridEl.querySelectorAll(".fb-card"));
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
  getActiveAnchorRect() {
    const el = this.gridEl.querySelector(".fb-row.is-focused") || this.gridEl.querySelector(".fb-card-header.is-header-focused") || this.gridEl.querySelector(`.fb-card[data-card-index="${this.focusedCardIndex}"]`);
    return el ? el.getBoundingClientRect() : null;
  }
  findFlowHorizontalNavTarget(direction) {
    const anchor = this.getActiveAnchorRect();
    if (!anchor) return null;
    const curX = anchor.left;
    const curCenterY = anchor.top + anchor.height / 2;
    const colThreshold = 40;
    const nodes = Array.from(
      this.gridEl.querySelectorAll(".fb-row, .fb-card-header, .fb-empty-card")
    );
    const candidates = [];
    for (const el of nodes) {
      const cardEl = el.closest(".fb-card");
      if (!cardEl) continue;
      const cardIdx = Number(cardEl.dataset.cardIndex);
      if (Number.isNaN(cardIdx)) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      const itemKey = el.classList.contains("fb-row") ? el.dataset.itemKey || "" : CARD_HEADER_KEY;
      candidates.push({ cardIdx, itemKey, rect });
    }
    let best = null;
    let bestColDist = Infinity;
    let bestRowDist = Infinity;
    for (const c of candidates) {
      const dx = c.rect.left - curX;
      if (direction === "right" && dx <= colThreshold) continue;
      if (direction === "left" && dx >= -colThreshold) continue;
      const colDist = Math.abs(dx);
      const rowDist = Math.abs(c.rect.top + c.rect.height / 2 - curCenterY);
      if (colDist < bestColDist - colThreshold || Math.abs(colDist - bestColDist) <= colThreshold && rowDist < bestRowDist) {
        bestColDist = colDist;
        bestRowDist = rowDist;
        best = { cardIdx: c.cardIdx, itemKey: c.itemKey };
      }
    }
    if (best) return best;
    let wrapBest = null;
    let extremeX = direction === "right" ? Infinity : -Infinity;
    let wrapRowDist = Infinity;
    for (const c of candidates) {
      const isMoreExtreme = direction === "right" ? c.rect.left < extremeX - colThreshold : c.rect.left > extremeX + colThreshold;
      const isSameExtreme = Math.abs(c.rect.left - extremeX) <= colThreshold;
      const rowDist = Math.abs(c.rect.top + c.rect.height / 2 - curCenterY);
      if (isMoreExtreme || isSameExtreme && rowDist < wrapRowDist) {
        extremeX = c.rect.left;
        wrapRowDist = rowDist;
        wrapBest = { cardIdx: c.cardIdx, itemKey: c.itemKey };
      }
    }
    return wrapBest;
  }
  findFlowHorizontalCarryTarget(direction, anchorX, anchorY, excludeFolderPath) {
    const colThreshold = 40;
    const nodes = Array.from(
      this.gridEl.querySelectorAll(".fb-row, .fb-card-header, .fb-empty-card")
    );
    const candidates = [];
    for (const el of nodes) {
      const cardEl = el.closest(".fb-card");
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
    let best = null;
    let bestColDist = Infinity;
    let bestRowDist = Infinity;
    for (const c of candidates) {
      const dx = c.rect.left - anchorX;
      if (direction === "right" && dx <= colThreshold) continue;
      if (direction === "left" && dx >= -colThreshold) continue;
      const colDist = Math.abs(dx);
      const rowDist = Math.abs(c.rect.top + c.rect.height / 2 - anchorY);
      if (colDist < bestColDist - colThreshold || Math.abs(colDist - bestColDist) <= colThreshold && rowDist < bestRowDist) {
        bestColDist = colDist;
        bestRowDist = rowDist;
        best = c;
      }
    }
    if (best) return best;
    let wrapBest = null;
    let extremeX = direction === "right" ? Infinity : -Infinity;
    let wrapRowDist = Infinity;
    for (const c of candidates) {
      const isMoreExtreme = direction === "right" ? c.rect.left < extremeX - colThreshold : c.rect.left > extremeX + colThreshold;
      const isSameExtreme = Math.abs(c.rect.left - extremeX) <= colThreshold;
      const rowDist = Math.abs(c.rect.top + c.rect.height / 2 - anchorY);
      if (isMoreExtreme || isSameExtreme && rowDist < wrapRowDist) {
        extremeX = c.rect.left;
        wrapRowDist = rowDist;
        wrapBest = c;
      }
    }
    return wrapBest;
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
    if (this.handledKeyEvents.has(e)) return;
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
      const dir = e.key === "ArrowRight" ? "right" : "left";
      if (this.plugin.settings.gridCols === "flow") {
        const spatial = this.findFlowHorizontalNavTarget(dir);
        if (spatial) {
          const targetCard2 = this.renderedCards[spatial.cardIdx];
          if (targetCard2) {
            if (spatial.itemKey === CARD_HEADER_KEY) {
              if (!targetCard2.isRootCard) {
                this.focusCardHeader(spatial.cardIdx);
              } else {
                this.focusCardItem(spatial.cardIdx, 0, { clearSelection: true, updatePreview: true });
              }
              return;
            }
            const itemIdx = targetCard2.items.findIndex((it) => it.key === spatial.itemKey);
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
    if (!meta && !e.altKey && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      e.stopPropagation();
      const { card, itemIndex } = this.findFocusedCardAndIndex();
      if (!card) return;
      const hasHeaderStop = !card.isRootCard;
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
          } else if (shouldLoopAtEdge) {
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
    if (e.code === "Space") {
      e.preventDefault();
      e.stopPropagation();
      const { card, item } = this.findFocusedCardAndIndex();
      if (this.plugin.settings.gridCols === "flow" && this.focusedItemKey === CARD_HEADER_KEY && card && !card.isRootCard) {
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
      (dd) => dd.addOption("2", "2\uC5F4 \uADF8\uB9AC\uB4DC").addOption("3", "3\uC5F4 \uADF8\uB9AC\uB4DC").addOption("4", "4\uC5F4 \uADF8\uB9AC\uB4DC").addOption("auto", "\uC138\uB85C \uBAA8\uB4DC (\uB113\uC774 \uC790\uB3D9 \uB9DE\uCDA4)").addOption("scroll", "\uAC00\uB85C \uBAA8\uB4DC (\uC138\uB85C \uD3BC\uCE68 \xB7 \uAC00\uB85C \uC2A4\uD06C\uB864)").addOption("flow", "\uC5EC\uB7EC\uC904 \uBAA8\uB4DC (\uC139\uC158 \uBD84\uB958 \xB7 \uBE48\uACF5\uAC04 \uCD5C\uC18C\uD654)").setValue(String(this.plugin.settings.gridCols)).onChange(async (value) => {
        this.plugin.settings.gridCols = value === "scroll" || value === "auto" || value === "flow" ? value : Number(value);
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
    new import_obsidian4.Setting(containerEl).setName("\uCE74\uB4DC \uC0C1\uD558 \uB05D\uC5D0\uC11C \u2191/\u2193 \uB3D9\uC791").setDesc("\uC801\uC751\uD615: \uAC00\uB85C \uBAA8\uB4DC\uB294 \uCE74\uB4DC \uB0B4\uBD80 \uC21C\uD658, 2D \uADF8\uB9AC\uB4DC\xB7\uC138\uB85C\xB7\uC5EC\uB7EC\uC904 \uBAA8\uB4DC\uB294 \uC704/\uC544\uB798 \uC139\uC158\uC73C\uB85C \uC5F0\uACB0").addDropdown(
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
        await this.plugin.resetAllExpandedStates();
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
  folderOrder: {},
  collapsedFlowSections: [],
  flowWindowSizes: {},
  flowColumnWidth: 270,
  quickLookSplitRatio: 0.4
};

// src/main.ts
var FolderBoardPlugin = class extends import_obsidian5.Plugin {
  constructor() {
    super(...arguments);
    this.settings = { ...DEFAULT_SETTINGS };
    this.expandedSet = /* @__PURE__ */ new Set();
    this.collapsedFlowSet = /* @__PURE__ */ new Set();
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
    if (typeof this.settings.flowColumnWidth !== "number" || !Number.isFinite(this.settings.flowColumnWidth)) {
      this.settings.flowColumnWidth = DEFAULT_SETTINGS.flowColumnWidth;
    }
    if (typeof this.settings.quickLookSplitRatio !== "number" || !Number.isFinite(this.settings.quickLookSplitRatio)) {
      this.settings.quickLookSplitRatio = DEFAULT_SETTINGS.quickLookSplitRatio;
    }
    if (!this.settings.flowWindowSizes || typeof this.settings.flowWindowSizes !== "object") {
      this.settings.flowWindowSizes = {};
    }
    if (Array.isArray(this.settings.expandedFlowWindows) && this.settings.expandedFlowWindows.length > 0) {
      for (const k of this.settings.expandedFlowWindows) {
        if (!(k in this.settings.flowWindowSizes)) {
          this.settings.flowWindowSizes[k] = "lg";
        }
      }
      delete this.settings.expandedFlowWindows;
    }
    this.expandedSet = new Set(this.settings.expandedFolders || []);
    this.collapsedFlowSet = new Set(this.settings.collapsedFlowSections || []);
  }
  async saveSettings() {
    this.settings.expandedFolders = [...this.expandedSet];
    this.settings.collapsedFlowSections = [...this.collapsedFlowSet];
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
  async setFoldersExpandedBatch(paths, expanded) {
    for (const p of paths) {
      if (expanded) this.expandedSet.add(p);
      else this.expandedSet.delete(p);
    }
    await this.saveSettings();
  }
  // [ID 6.6.7] 여러줄 모드(flow) 폴더 섹션 접힘/펼침 영속 관리
  isFlowSectionCollapsed(path) {
    return this.collapsedFlowSet.has(path);
  }
  async toggleFlowSectionCollapsed(path) {
    const next = !this.collapsedFlowSet.has(path);
    if (next) this.collapsedFlowSet.add(path);
    else this.collapsedFlowSet.delete(path);
    await this.saveSettings();
    return next;
  }
  async setFlowSectionsCollapsedBatch(paths, collapsed) {
    for (const p of paths) {
      if (collapsed) this.collapsedFlowSet.add(p);
      else this.collapsedFlowSet.delete(p);
    }
    await this.saveSettings();
  }
  // [ID 6.6.8] 여러줄 모드(flow) 폴더별 표시 길이(소·중·대 또는 드래그 지정 행 수) 영속 관리
  getFlowWindowSizeSpec(key) {
    return this.settings.flowWindowSizes[key] ?? "md";
  }
  async setFlowWindowSizeSpec(key, spec) {
    if (spec === "md") {
      delete this.settings.flowWindowSizes[key];
    } else {
      this.settings.flowWindowSizes[key] = spec;
    }
    await this.saveSettings();
  }
  hasAnyDynamicFlowWindow() {
    return Object.values(this.settings.flowWindowSizes).some((v) => v === "lg" || typeof v === "number");
  }
  async resetAllExpandedStates() {
    this.expandedSet.clear();
    this.collapsedFlowSet.clear();
    this.settings.flowWindowSizes = {};
    await this.saveSettings();
  }
  async renameExpandedFolder(oldPath, newPath) {
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
    if (oldPath in this.settings.flowWindowSizes) {
      this.settings.flowWindowSizes[newPath] = this.settings.flowWindowSizes[oldPath];
      delete this.settings.flowWindowSizes[oldPath];
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

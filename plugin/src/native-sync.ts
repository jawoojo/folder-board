// [ID 6.2] 옵시디언 네이티브 파일 탐색기 연동 유틸리티
// -> 기본 file-explorer의 커스텀 아이콘/색상을 복제하고,
// -> file-menu 이벤트를 트리거해 새 노트·새 폴더·새 캔버스·새 베이스 및 향후 코어/커뮤니티 생성 메뉴를 자동 연동함.
import { App, Menu, Notice, TAbstractFile, TFile, TFolder, WorkspaceLeaf, setIcon } from "obsidian";
import { i18n } from "./i18n";

interface NativeFileItem {
  selfEl?: HTMLElement;
}

interface PseudoIconSpec {
  backgroundImage: string;
  backgroundSize: string;
  backgroundRepeat: string;
  backgroundPosition: string;
  maskImage: string;
  maskSize: string;
  maskRepeat: string;
  maskPosition: string;
  backgroundColor: string;
  color: string;
  text: string;
  fontFamily: string;
  fontSize: string;
}

type ExtractedIcon =
  | { kind: "node"; template: Element }
  | { kind: "pseudo"; styles: PseudoIconSpec };

interface NativeIconFallbackCache {
  builtAt: number;
  byExt: Map<string, ExtractedIcon>;
  defaultFolderClosed: ExtractedIcon | null;
  defaultFolderOpen: ExtractedIcon | null;
  defaultFolderClosedHtml: string;
  defaultFolderOpenHtml: string;
}

let fallbackCache: NativeIconFallbackCache | null = null;
let stickyFolderClosed: ExtractedIcon | null = null;
let stickyFolderOpen: ExtractedIcon | null = null;
let mfiSvgIdCounter = 0;
const CACHE_TTL_MS = 2000;

interface MaterialIconPluginLike {
  settings?: {
    applyToFolders?: boolean;
    applyToFiles?: boolean;
  };
  getFolderIconKey?: (path: string, isCollapsed: boolean) => string;
  getIconSet?: (key: string) => { dark?: string; light?: string } | undefined;
  getSvg?: (iconSet: { dark?: string; light?: string }) => string;
  getFileIconSvg?: (path: string) => string;
}

// [ID 6.2.6] Material Icon Theme 안전 보조 연동 (좌측 탐색기 전체 접힘/사이드바 닫힘 시에도 열림·닫힘 폴더 아이콘 완벽 보장)
// -> 플러그인이 설치·활성화된 경우에만 try/catch로 안전하게 SVG를 조회하며, 미설치·버전 변경 시에는 자동으로 범용 DOM 미러링으로 폴백함.
function tryExtractMaterialIcon(
  app: App,
  path: string,
  fallbackIcon: "folder" | "file-text" | "inbox",
  isExpandedFolder?: boolean
): ExtractedIcon | null {
  try {
    const plugins = (app as unknown as { plugins?: { enabledPlugins?: Set<string>; plugins?: Record<string, unknown> } })
      .plugins;
    if (plugins?.enabledPlugins && !plugins.enabledPlugins.has("material-icon-theme")) return null;
    const mfi = plugins?.plugins?.["material-icon-theme"] as MaterialIconPluginLike | undefined;
    if (!mfi) return null;

    let svgMarkup = "";
    if (fallbackIcon === "folder") {
      if (mfi.settings?.applyToFolders === false) return null;
      if (typeof mfi.getFolderIconKey !== "function" || typeof mfi.getIconSet !== "function" || typeof mfi.getSvg !== "function") {
        return null;
      }
      const isCollapsed = isExpandedFolder === undefined ? true : !isExpandedFolder;
      const key = mfi.getFolderIconKey(path, isCollapsed);
      const set = mfi.getIconSet(key);
      if (!set) return null;
      svgMarkup = mfi.getSvg(set);
    } else if (fallbackIcon === "file-text") {
      if (mfi.settings?.applyToFiles === false) return null;
      if (typeof mfi.getFileIconSvg !== "function") return null;
      svgMarkup = mfi.getFileIconSvg(path);
    } else {
      return null;
    }

    if (!svgMarkup) return null;
    const parsed = new DOMParser().parseFromString(svgMarkup, "image/svg+xml");
    if (parsed.querySelector("parsererror")) return null;
    const svgRoot = parsed.documentElement;
    if (!svgRoot || svgRoot.nodeName.toLowerCase() !== "svg") return null;

    const svgEl = document.importNode(svgRoot, true) as Element;
    // 동일 SVG 내부 gradient/clipPath id 충돌 방지
    const idNodes = Array.from(svgEl.querySelectorAll("[id]"));
    if (svgEl.hasAttribute("id")) idNodes.unshift(svgEl);
    if (idNodes.length > 0) {
      const prefix = `fb-mfi-${++mfiSvgIdCounter}-`;
      const idMap = new Map<string, string>();
      for (const node of idNodes) {
        const oldId = node.getAttribute("id");
        if (!oldId) continue;
        const nextId = `${prefix}${oldId}`;
        idMap.set(oldId, nextId);
        node.setAttribute("id", nextId);
      }
      for (const node of [svgEl, ...Array.from(svgEl.querySelectorAll("*"))]) {
        for (const attr of Array.from(node.attributes)) {
          let val = attr.value;
          if (attr.localName === "href" && val.startsWith("#")) {
            const mapped = idMap.get(val.slice(1));
            if (mapped) val = `#${mapped}`;
          }
          val = val.replace(/url\(\s*(['"]?)#([^'")\s]+)\1\s*\)/g, (m, _q, ref) => {
            const mapped = idMap.get(ref);
            return mapped ? `url(#${mapped})` : m;
          });
          if (val !== attr.value) {
            node.setAttributeNS(attr.namespaceURI, attr.name, val);
          }
        }
      }
    }

    svgEl.setAttribute("width", "15");
    svgEl.setAttribute("height", "15");
    const wrapper = document.createElement("span");
    wrapper.className = "mfi-icon fb-cloned-native-icon";
    wrapper.appendChild(svgEl);
    return { kind: "node", template: wrapper };
  } catch {
    return null;
  }
}

export function invalidateNativeIconCache(): void {
  fallbackCache = null;
}

export interface NativeMenuCallbacks {
  leaf: WorkspaceLeaf;
  onMutated: () => void;
  onRequestRename: (file: TAbstractFile) => void;
  onRequestCreateNote: (folderPath: string) => void;
  onRequestCreateFolder: (folderPath: string) => void;
}

function getNativeFileExplorerItems(app: App): Record<string, NativeFileItem> | null {
  try {
    const leaves = app.workspace.getLeavesOfType("file-explorer");
    if (!leaves || leaves.length === 0) return null;
    const view = leaves[0].view as unknown as { fileItems?: Record<string, NativeFileItem> };
    return view?.fileItems || null;
  } catch {
    return null;
  }
}

function stripCssQuotes(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === "none" || trimmed === "normal" || trimmed === "" || trimmed === '""' || trimmed === "''") {
    return "";
  }
  let inner = trimmed;
  if ((inner.startsWith('"') && inner.endsWith('"')) || (inner.startsWith("'") && inner.endsWith("'"))) {
    inner = inner.slice(1, -1);
  }
  // [ID 6.2.5] Obsidian 기본 .tree-item-self::before의 Zero-Width Space(\u200B) 등 불가시 문자 오탐 방지
  // -> 불가시 공백을 제거하지 않으면 모든 .fb-row가 커스텀 ::before 아이콘이 있는 것으로 오판되어 아이콘이 전부 숨겨짐.
  return inner.replace(/[\s\u200B-\u200F\u202A-\u202E\u2060\uFEFF\u00A0]+/g, "");
}

function extractPseudoIcon(el: HTMLElement | null): PseudoIconSpec | null {
  if (!el || !el.isConnected) return null;
  const cs = window.getComputedStyle(el, "::before");
  if (!cs || cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return null;

  const bgImage = cs.backgroundImage && cs.backgroundImage !== "none" ? cs.backgroundImage : "";
  const rawMask = cs.maskImage && cs.maskImage !== "none" ? cs.maskImage : cs.getPropertyValue("-webkit-mask-image");
  const maskImage = rawMask && rawMask !== "none" ? rawMask : "";
  const text = stripCssQuotes(cs.content || "");

  if (!bgImage && !maskImage && !text) return null;
  // 단순 보더/점 장식 오탐 방지 (텍스트 글리프가 없는 경우 최소 8px 이상 크기 확인)
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

function isBuiltinExplorerElement(el: Element): boolean {
  return (
    el.classList.contains("collapse-icon") ||
    el.classList.contains("nav-folder-collapse-indicator") ||
    el.classList.contains("nav-file-tag") ||
    el.classList.contains("tree-item-flair-outer") ||
    el.classList.contains("tree-item-flair")
  );
}

function cloneAndPreserveVisuals(source: Element, parentEl: HTMLElement): Element {
  const clone = source.cloneNode(true) as Element;
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
      const rawMask =
        cs.maskImage && cs.maskImage !== "none" ? cs.maskImage : cs.getPropertyValue("-webkit-mask-image");
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

function isCandidateIconElement(el: Element): boolean {
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
    const rawMask =
      cs.maskImage && cs.maskImage !== "none" ? cs.maskImage : cs.getPropertyValue("-webkit-mask-image");
    if (hasBg || (rawMask && rawMask !== "none")) return true;
  }

  return false;
}

// [ID 6.2.3] 범용 네이티브 탐색기 아이콘 추출기
// -> 특정 플러그인 클래스명 하드코딩 대신, 기본 구조(접기 화살표·제목·확장자 태그) 외 커스텀 DOM 요소(직접 삽입 SVG 포함)와 ::before 스타일을 모두 탐색함.
function extractIconFromNativeSelf(nativeSelf: HTMLElement): ExtractedIcon | null {
  const titleContent = nativeSelf.querySelector<HTMLElement>(".tree-item-inner");

  // 1) nativeSelf 직속 커스텀 아이콘 요소 탐색 (Iconize, Iconic, Material Icon Theme 등)
  for (const child of Array.from(nativeSelf.children)) {
    if (child === titleContent || isBuiltinExplorerElement(child)) continue;
    if (isCandidateIconElement(child)) {
      return { kind: "node", template: cloneAndPreserveVisuals(child, nativeSelf) };
    }
  }

  // 2) .tree-item-inner 내부에 직접 삽입된 아이콘(svg/img/icon span) 탐색
  if (titleContent) {
    for (const child of Array.from(titleContent.children)) {
      if (isBuiltinExplorerElement(child)) continue;
      if (isCandidateIconElement(child)) {
        return { kind: "node", template: cloneAndPreserveVisuals(child, titleContent) };
      }
    }
  }

  // 3) CSS ::before 가상요소 아이콘 탐색 ([data-type="file-explorer"] 한정 CSS 스니펫·테마 포함)
  const pseudo = extractPseudoIcon(titleContent) || extractPseudoIcon(nativeSelf);
  if (pseudo) {
    return { kind: "pseudo", styles: pseudo };
  }

  return null;
}

function renderExtractedIcon(container: HTMLElement, icon: ExtractedIcon): void {
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
    span.style.backgroundColor =
      s.backgroundColor && s.backgroundColor !== "rgba(0, 0, 0, 0)" ? s.backgroundColor : s.color || "currentColor";
  } else if (s.text) {
    span.setText(s.text);
    if (s.color) span.style.color = s.color;
    if (s.fontFamily) span.style.fontFamily = s.fontFamily;
    if (s.fontSize) span.style.fontSize = s.fontSize;
  }
}

function getExtensionFromPath(path: string): string {
  const fileName = path.split("/").pop() || "";
  const dotIdx = fileName.lastIndexOf(".");
  if (dotIdx <= 0 || dotIdx === fileName.length - 1) return "";
  return fileName.slice(dotIdx + 1).toLowerCase();
}

function getIconSignature(icon: ExtractedIcon | null): string {
  if (!icon) return "";
  if (icon.kind === "node") {
    const key = icon.template.getAttribute("data-mfi-icon-key");
    if (key) return `mfi:${key}`;
    return icon.template.innerHTML.slice(0, 160);
  }
  return icon.styles.backgroundImage || icon.styles.maskImage || icon.styles.text;
}

function isNativeFolderCollapsed(nativeSelf: HTMLElement): boolean {
  const folderItem = nativeSelf.closest(".nav-folder");
  if (folderItem) return folderItem.classList.contains("is-collapsed");
  const caret = nativeSelf.querySelector(".collapse-icon");
  return caret ? caret.classList.contains("is-collapsed") : true;
}

// [ID 6.2.4] 접힌 폴더 하위 항목·열림/닫힘 폴더 상태를 위한 확장자 및 폴더 아이콘 1회 스캔 캐시
// -> 좌측 기본 탐색기에서 접혀 있어 DOM이 없는 파일도 같은 확장자 아이콘을 표시하고,
// -> 열린 폴더·닫힌 폴더 아이콘을 각각 캐시해 보드 내 펼침/접힘 상태에 맞게 실시간 전환함.
function getFallbackIconCache(fileItems: Record<string, NativeFileItem>): NativeIconFallbackCache {
  const now = Date.now();
  if (fallbackCache && now - fallbackCache.builtAt < CACHE_TTL_MS) {
    return fallbackCache;
  }

  const byExt = new Map<string, ExtractedIcon>();
  let defaultFolderClosed: ExtractedIcon | null = null;
  let defaultFolderOpen: ExtractedIcon | null = null;
  let defaultFolderClosedHtml = "";
  let defaultFolderOpenHtml = "";

  for (const [itemPath, entry] of Object.entries(fileItems)) {
    const selfEl = entry?.selfEl;
    if (!selfEl || !selfEl.isConnected) continue;

    const isFolder = selfEl.classList.contains("nav-folder-title");
    if (isFolder) {
      const collapsed = isNativeFolderCollapsed(selfEl);
      if (collapsed && !defaultFolderClosed) {
        const extracted = extractIconFromNativeSelf(selfEl);
        if (extracted) {
          const mfiKey = extracted.kind === "node" ? extracted.template.getAttribute("data-mfi-icon-key") : null;
          if (!mfiKey || mfiKey === "folder") {
            defaultFolderClosed = extracted;
            defaultFolderClosedHtml = getIconSignature(extracted);
          }
        }
      } else if (!collapsed && !defaultFolderOpen) {
        const extracted = extractIconFromNativeSelf(selfEl);
        if (extracted) {
          const mfiKey = extracted.kind === "node" ? extracted.template.getAttribute("data-mfi-icon-key") : null;
          if (!mfiKey || mfiKey === "folder-open") {
            defaultFolderOpen = extracted;
            defaultFolderOpenHtml = getIconSignature(extracted);
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

  // 기본 키("folder"/"folder-open")가 없었던 경우 첫 번째로 발견된 닫힌/열린 폴더 아이콘을 폴백으로 채움
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

  if (defaultFolderClosed) stickyFolderClosed = defaultFolderClosed;
  if (defaultFolderOpen) stickyFolderOpen = defaultFolderOpen;

  fallbackCache = {
    builtAt: now,
    byExt,
    defaultFolderClosed: defaultFolderClosed || stickyFolderClosed,
    defaultFolderOpen: defaultFolderOpen || stickyFolderOpen,
    defaultFolderClosedHtml,
    defaultFolderOpenHtml
  };
  return fallbackCache;
}

// [ID 6.2.1] 네이티브 탐색기 커스텀 아이콘·색상 범용 미러링 (중복 아이콘 방지 + 열림/닫힘 폴더 아이콘 동기화)
export function applyNativeDecoration(
  app: App,
  path: string,
  iconContainer: HTMLElement,
  titleEl: HTMLElement,
  fallbackIcon: "folder" | "file-text" | "inbox",
  isExpandedFolder?: boolean
): void {
  iconContainer.empty();
  iconContainer.removeClass("is-hidden");

  const fileItems = getNativeFileExplorerItems(app);
  const nativeSelf = fileItems?.[path]?.selfEl;

  // 1) 커스텀 텍스트 색상 동기화 (인라인 color / --folder-color / 제목 인라인 색상)
  if (nativeSelf) {
    const nativeTitle = nativeSelf.querySelector<HTMLElement>(".tree-item-inner");
    const customColor =
      nativeTitle?.style.color ||
      nativeSelf.style.color ||
      nativeSelf.style.getPropertyValue("--folder-color") ||
      nativeSelf.style.getPropertyValue("--color");
    if (customColor) {
      titleEl.style.color = customColor;
    }
  }

  // 2) 전역 CSS 스니펫/테마가 이미 현재 보드 행에 가시적 ::before 아이콘을 직접 그렸다면 기본 아이콘 숨김(이중 아이콘 방지)
  const rowEl = titleEl.parentElement instanceof HTMLElement ? titleEl.parentElement : null;
  if (extractPseudoIcon(titleEl) || extractPseudoIcon(rowEl)) {
    iconContainer.addClass("is-hidden");
    return;
  }

  // 3) Material Icon Theme이 활성화된 경우 좌측 탐색기 접힘 여부와 무관하게 정확한 열림/닫힘·확장자 아이콘 직접 적용
  const materialIcon = tryExtractMaterialIcon(app, path, fallbackIcon, isExpandedFolder);
  if (materialIcon) {
    renderExtractedIcon(iconContainer, materialIcon);
    return;
  }

  const cache = fileItems ? getFallbackIconCache(fileItems) : null;

  // 4) 기본 탐색기에서 해당 경로의 커스텀 아이콘 직접 미러링 (Iconic, Iconize, CSS 테마 등 범용 대응)
  // -> 일반 폴더 아이콘인 경우 보드의 현재 열림/닫힘 상태(isExpandedFolder)에 맞는 열린/닫힌 폴더 아이콘으로 자동 매칭함.
  if (nativeSelf) {
    const exactIcon = extractIconFromNativeSelf(nativeSelf);
    if (exactIcon) {
      if (fallbackIcon === "folder" && isExpandedFolder !== undefined && cache) {
        const sig = getIconSignature(exactIcon);
        const isGenericFolder =
          sig === "mfi:folder" ||
          sig === "mfi:folder-open" ||
          (cache.defaultFolderClosedHtml !== "" && sig === cache.defaultFolderClosedHtml) ||
          (cache.defaultFolderOpenHtml !== "" && sig === cache.defaultFolderOpenHtml);
        if (isGenericFolder) {
          const stateMatched = isExpandedFolder
            ? cache.defaultFolderOpen || exactIcon
            : cache.defaultFolderClosed || exactIcon;
          renderExtractedIcon(iconContainer, stateMatched);
          return;
        }
      }
      renderExtractedIcon(iconContainer, exactIcon);
      return;
    }
  }

  // 5) 기본 탐색기에서 접혀 있어 미렌더링된 항목은 확장자/열림·닫힘 폴더 캐시 아이콘으로 보완
  if (cache) {
    let cachedIcon: ExtractedIcon | null = null;
    if (fallbackIcon === "folder") {
      cachedIcon = isExpandedFolder
        ? cache.defaultFolderOpen || cache.defaultFolderClosed
        : cache.defaultFolderClosed || cache.defaultFolderOpen;
    } else {
      cachedIcon = cache.byExt.get(getExtensionFromPath(path)) || null;
    }
    if (cachedIcon) {
      renderExtractedIcon(iconContainer, cachedIcon);
      return;
    }
  }

  // 6) 커스텀 아이콘이 전혀 없는 경우 옵시디언 기본 Lucide 아이콘 표시 (폴더 열림/닫힘 구분)
  setIcon(iconContainer, fallbackIcon === "folder" && isExpandedFolder ? "folder-open" : fallbackIcon);
}

// [ID 6.2.2] 옵시디언 네이티브 우클릭 컨텍스트 메뉴 호출 (자동 생성 메뉴 연동)
// -> 폴더 우클릭 시 새 노트/새 폴더를 action-primary 섹션에 배치한 뒤 workspace.trigger("file-menu")를 호출해
// -> 옵시디언 코어(새 캔버스, 새 베이스 등)와 향후 패치·커뮤니티 플러그인 생성 메뉴가 별도 패치 없이 자동 합류하도록 함.
export function openNativeFileMenu(
  app: App,
  event: MouseEvent,
  target: TAbstractFile,
  cb: NativeMenuCallbacks
): void {
  const menu = new Menu();

  if (target instanceof TFolder) {
    const folderPath = target.isRoot() || target.path === "/" ? "" : target.path;

    menu.addItem((item) =>
      item
        .setTitle(i18n.newNote())
        .setIcon("file-plus")
        .setSection("action-primary")
        .onClick(() => cb.onRequestCreateNote(folderPath))
    );

    menu.addItem((item) =>
      item
        .setTitle(i18n.newFolder())
        .setIcon("folder-plus")
        .setSection("action-primary")
        .onClick(() => cb.onRequestCreateFolder(folderPath))
    );

    if (!target.isRoot()) {
      menu.addItem((item) =>
        item
          .setTitle(i18n.rename())
          .setIcon("pencil")
          .setSection("danger")
          .onClick(() => cb.onRequestRename(target))
      );

      menu.addItem((item) =>
        item
          .setTitle(i18n.delete())
          .setIcon("trash")
          .setSection("danger")
          .setWarning(true)
          .onClick(async () => {
            try {
              await app.vault.trash(target, true);
              cb.onMutated();
            } catch (err) {
              new Notice(i18n.deleteFailed(err instanceof Error ? err.message : String(err)));
            }
          })
      );
    }
  } else if (target instanceof TFile) {
    menu.addItem((item) =>
      item
        .setTitle(i18n.openInNewTab())
        .setIcon("file-plus")
        .setSection("open")
        .onClick(async () => {
          await app.workspace.getLeaf("tab").openFile(target);
        })
    );

    menu.addItem((item) =>
      item
        .setTitle(i18n.rename())
        .setIcon("pencil")
        .setSection("danger")
        .onClick(() => cb.onRequestRename(target))
    );

    menu.addItem((item) =>
      item
        .setTitle(i18n.delete())
        .setIcon("trash")
        .setSection("danger")
        .setWarning(true)
        .onClick(async () => {
          try {
            await app.vault.trash(target, true);
            cb.onMutated();
          } catch (err) {
            new Notice(i18n.deleteFailed(err instanceof Error ? err.message : String(err)));
          }
        })
    );
  }

  // 옵시디언 코어(캔버스, 베이스 등) 및 모든 커뮤니티 플러그인 메뉴 항목 자동 주입
  app.workspace.trigger("file-menu", menu, target, "file-explorer-context-menu", cb.leaf);
  menu.showAtMouseEvent(event);
}

export function getFolderByPath(app: App, path: string): TFolder | null {
  if (!path || path === "/") return app.vault.getRoot();
  const abs = app.vault.getAbstractFileByPath(path);
  return abs instanceof TFolder ? abs : null;
}

export function getFileByPath(app: App, path: string): TFile | null {
  const abs = app.vault.getAbstractFileByPath(path);
  return abs instanceof TFile ? abs : null;
}

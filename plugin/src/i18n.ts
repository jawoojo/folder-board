// [ID 6.9] 다국어(i18n) 지원 모듈 — 옵시디언 언어 자동 감지(한국어 → ko, 그 외 모든 언어 → en) 및 수동 선택
// -> 사용자가 설정에서 언어를 바꾸면 플러그인 재시작 없이 설정 탭·툴바·메뉴·모달·단축키 안내가 즉시 반영됨.
import { moment } from "obsidian";
import type { LanguageMode } from "./types";

export type ResolvedLocale = "ko" | "en";

let currentLanguageMode: LanguageMode = "auto";

export function detectObsidianLocale(): ResolvedLocale {
  let raw = "";
  try {
    raw = window.localStorage.getItem("language") || "";
  } catch {
    raw = "";
  }
  if (!raw && typeof moment?.locale === "function") {
    raw = moment.locale() || "";
  }
  if (!raw && typeof document !== "undefined") {
    raw = document.documentElement?.lang || "";
  }
  return raw.toLowerCase().startsWith("ko") ? "ko" : "en";
}

export function setLanguageMode(mode: LanguageMode): void {
  currentLanguageMode = mode;
}

export function getResolvedLocale(mode: LanguageMode = currentLanguageMode): ResolvedLocale {
  if (mode === "ko" || mode === "en") return mode;
  return detectObsidianLocale();
}

export function isKoreanLocale(): boolean {
  return getResolvedLocale() === "ko";
}

export function tr(ko: string, en: string): string {
  return isKoreanLocale() ? ko : en;
}

export const i18n = {
  // Common
  cancel: () => tr("취소", "Cancel"),
  create: () => tr("생성", "Create"),
  rename: () => tr("이름 바꾸기", "Rename"),
  renameConfirm: () => tr("변경", "Rename"),
  delete: () => tr("삭제", "Delete"),
  reset: () => tr("초기화", "Reset"),
  newNote: () => tr("새 노트", "New note"),
  newFolder: () => tr("새 폴더", "New folder"),
  openInNewTab: () => tr("새 탭에서 열기", "Open in new tab"),
  emptyCard: () => tr("비어 있음", "Empty"),
  noMatches: () => tr("일치하는 항목이 없습니다", "No matching items"),
  directPill: () => tr("직속", "Direct"),
  move: () => tr("이동", "Move"),
  shelf: () => tr("바구니", "Shelf"),
  shelfEmptyHint: () => tr("임시 보관", "Shelf"),

  // Explorer launch & Command Palette
  explorerLaunchAria: () =>
    tr("Folder Board 열기 (⌘/Ctrl+클릭: 현재 폴더)", "Open Folder Board (⌘/Ctrl+click: current folder)"),
  defaultCommandAlias: () => tr("폴더 보드 열기", ""),
  currentFolderSuffix: () => tr("현재 폴더", "current folder"),

  // Toolbar & Buttons
  parentFolderAria: () => tr("상위 폴더 (Backspace)", "Parent folder (Backspace)"),
  searchPlaceholder: () => tr("검색...", "Search..."),
  clearSearchAria: () => tr("검색 지우기", "Clear search"),
  layoutFlowAria: () => tr("Flow 모드 — 연속 다단 트리 (기본)", "Flow mode — Continuous multi-column tree (default)"),
  layoutVerticalAria: () =>
    tr("Vertical 모드 — 세로 스크롤 카드 (경계 드래그 분할)", "Vertical mode — Vertical scroll cards (drag borders to split)"),
  layoutHorizontalAria: () =>
    tr("Horizontal 모드 — 가로 스크롤 카드 (경계 드래그 분할)", "Horizontal mode — Horizontal scroll cards (drag borders to split)"),
  fileSortNameAria: () => tr("파일 정렬: 이름순", "File sort: Name"),
  fileSortMtimeAria: () => tr("파일 정렬: 최근 수정순", "File sort: Modified time"),
  folderSortAria: () =>
    tr("폴더 순서 정렬 (현재 모드 1회 정렬 · 이후 자유 드래그)", "Sort folders (one-shot for current mode · drag freely after)"),
  newNoteAria: (target: string) => tr(`새 노트 → ${target} (N)`, `New note → ${target} (N)`),
  newFolderAria: (target: string) => tr(`새 폴더 → ${target} (Shift+N)`, `New folder → ${target} (Shift+N)`),
  autoCollapseSidebarAria: () =>
    tr("폴더 보드에서 좌측 패널 자동 접기", "Auto-collapse left sidebar in Folder Board"),
  autoCollapseSidebarOnAria: () =>
    tr(
      "좌측 패널 자동 접기 켜짐 — 보드에서만 접고 나가면 복원 (클릭해 끄기)",
      "Auto-collapse left sidebar ON — collapses on board, restores on leave (click to disable)"
    ),
  autoCollapseSidebarOffAria: () =>
    tr("폴더 보드에서 좌측 패널 자동 접기 켜기", "Enable auto-collapse left sidebar in Folder Board"),
  pinTabAria: () => tr("탭 고정 (Pin)", "Pin tab"),
  pinTabOnAria: () =>
    tr(
      "탭 고정됨 — 노트 열 때 옆 탭에서 열림 (클릭해 해제)",
      "Tab pinned — notes open in another tab (click to unpin)"
    ),
  pinTabOffAria: () =>
    tr(
      "탭 고정 (Pin) — 보드를 유지한 채 옆 탭에서 노트 열기",
      "Pin tab — keep Folder Board open and open notes beside it"
    ),
  quickEditAria: () => tr("빠른 편집 (Space)", "Quick Edit (Space)"),
  vaultSwitcherAria: () => tr("볼트 전환 (다른 볼트 열기)", "Switch vault"),
  bookmarksAria: () => tr("북마크 (B)", "Bookmarks (B)"),
  bookmarksEmpty: () => tr("저장된 북마크가 없습니다", "No bookmarks yet"),
  bookmarksDisabled: () => tr("북마크 코어 플러그인이 꺼져 있습니다", "Bookmarks core plugin is disabled"),
  openBookmarksPane: () => tr("북마크 패널 열기", "Open Bookmarks pane"),
  settingsAria: () =>
    tr("옵시디언 설정 (⌘/Ctrl+클릭: Folder Board 설정)", "Obsidian Settings (⌘/Ctrl+click: Folder Board settings)"),
  clearShelfAria: () => tr("바구니 비우기", "Clear shelf"),
  clearSelectionAria: () => tr("선택 해제", "Clear selection"),

  // Folder sort menu
  sortFolderNameAsc: () => tr("폴더 이름순 (A → Z)", "Folder name (A → Z)"),
  sortFolderNameDesc: () => tr("폴더 이름 역순 (Z → A)", "Folder name (Z → A)"),
  sortFolderCountDesc: () => tr("항목 많은 순", "Most items first"),
  sortFolderMtimeDesc: () => tr("최근 수정 순", "Recently modified first"),

  // Card controls & resize badges
  openItemAria: (name: string) => tr(`${name} 열기`, `Open ${name}`),
  colResizeAria: () => tr("가로 분할 수 조절 (좌우 드래그)", "Adjust column split (drag left/right)"),
  flowColResizeAria: () => tr("다단 너비 조절 (드래그)", "Adjust column width (drag)"),
  colSplitBadge: (cols: number) => tr(`${cols}열 분할`, `${cols} ${cols === 1 ? "column" : "columns"}`),
  cardRowUnitsLabel: (units: number) => {
    switch (units) {
      case 3:
        return tr("1/4 높이", "1/4 height");
      case 4:
        return tr("1/3 높이", "1/3 height");
      case 6:
        return tr("1/2 높이", "1/2 height");
      case 8:
        return tr("2/3 높이", "2/3 height");
      case 9:
        return tr("3/4 높이", "3/4 height");
      case 12:
      default:
        return tr("전체 높이", "Full height");
    }
  },
  cardRowUnitsMinBadge: (units: number) =>
    tr(`${i18n.cardRowUnitsLabel(units)} (최소)`, `${i18n.cardRowUnitsLabel(units)} (min)`),
  cardHeightResizeAria: () =>
    tr("카드 높이 조절 (상하 드래그 · 더블클릭 전체/기본)", "Resize card height (drag up/down · double-click toggle full)"),
  rootMoveGripAria: () =>
    tr("드래그하거나 Shift+←/→로 직속 카드 위치 이동", "Drag or press Shift+←/→ to reorder Direct card"),
  flowFooterAria: () =>
    tr("드래그로 길이 조절 또는 소/중/대 선택", "Drag to resize or pick S / M / L"),
  flowDragHandleAria: () => tr("위아래 드래그로 길이 조절", "Drag up/down to resize"),
  flowPresetSm: () => tr("소", "S"),
  flowPresetMd: () => tr("중", "M"),
  flowPresetLg: () => tr("대", "L"),
  flowPresetSmAria: (n: number) => tr(`소 (${n}개)`, `Small (${n} items)`),
  flowPresetMdAria: (n: number) => tr(`중 (기본 ${n}개)`, `Medium (default ${n} items)`),
  flowPresetLgAria: () => tr("대 (1열 꽉차게)", "Large (fit 1 column)"),
  flowDragRowsMaxLimit: (rows: number) => tr(`${rows}개 · 최대`, `${rows} items · max`),
  flowDragRowsCols: (rows: number, cols: number) =>
    tr(`${rows}개 (${cols}열)`, `${rows} items (${cols} cols)`),
  flowDragRows: (rows: number) => tr(`${rows}개`, `${rows} items`),

  // Selection, Carry, Clipboard, Drag ghost
  selectedCount: (n: number) => tr(`${n}개 선택됨`, `${n} selected`),
  carryPill: (n: number, target: string) => tr(`${n}개 → ${target}`, `${n} ${n === 1 ? "item" : "items"} → ${target}`),
  clipboardCopied: (n: number) => tr(`${n}개 복사됨 · ⌘V 붙여넣기`, `${n} copied · ⌘V to paste`),
  clipboardCut: (n: number) => tr(`${n}개 잘라냄 · ⌘V 이동`, `${n} cut · ⌘V to move`),
  dragGhostMulti: (label: string, extra: number) => tr(`${label} 외 ${extra}개`, `${label} +${extra} more`),

  // Modals & Notices
  noteTitlePlaceholder: () => tr("노트 제목", "Note title"),
  folderNamePlaceholder: () => tr("폴더 이름", "Folder name"),
  newNamePlaceholder: () => tr("새 이름", "New name"),
  fileAlreadyExists: () => tr("같은 이름의 파일이 이미 존재합니다.", "A file with that name already exists."),
  folderAlreadyExists: () => tr("같은 이름의 폴더가 이미 존재합니다.", "A folder with that name already exists."),
  sameNameExists: () => tr("같은 이름이 이미 존재합니다.", "An item with that name already exists."),
  invalidNameChars: () =>
    tr("파일/폴더 이름에 사용할 수 없는 문자가 포함되어 있습니다.", "Name contains invalid characters."),
  createNoteFailed: (msg: string) => tr(`노트 생성 실패: ${msg}`, `Failed to create note: ${msg}`),
  createFolderFailed: (msg: string) => tr(`폴더 생성 실패: ${msg}`, `Failed to create folder: ${msg}`),
  renameFailed: (msg: string) => tr(`이름 변경 실패: ${msg}`, `Failed to rename: ${msg}`),
  deleteFailed: (msg: string) => tr(`삭제 실패: ${msg}`, `Failed to delete: ${msg}`),
  trashedItems: (n: number) =>
    tr(`${n}개 항목을 휴지통으로 이동했습니다.`, `Moved ${n} ${n === 1 ? "item" : "items"} to trash.`),
  copiedItems: (n: number, dest: string) =>
    tr(`${n}개 항목을 '${dest}'에 복사했습니다.`, `Copied ${n} ${n === 1 ? "item" : "items"} to '${dest}'.`),
  movedItems: (n: number, dest: string) =>
    tr(`${n}개 항목을 '${dest}'로 이동했습니다.`, `Moved ${n} ${n === 1 ? "item" : "items"} to '${dest}'.`),
  moveFailedConflict: () =>
    tr("대상 폴더에 같은 이름이 있거나 이동할 수 없는 경로입니다.", "Destination already has a same-named item or cannot be moved there."),
  undidMove: (n: number) =>
    tr(`${n}개 항목 이동을 되돌렸습니다.`, `Undid move for ${n} ${n === 1 ? "item" : "items"}.`),

  // Settings tab
  settingLanguageName: () => tr("언어 (Language)", "Language"),
  settingLanguageDesc: () =>
    tr(
      "자동 선택 시 옵시디언이 한국어면 한국어, 그 외 모든 언어에서는 영어로 표시됩니다.",
      "Auto follows Obsidian's language (Korean for Korean Obsidian, English for all other languages)."
    ),
  settingLanguageAuto: () => tr("자동 (옵시디언 언어 따름)", "Auto (follow Obsidian)"),
  settingLanguageEn: () => "English",
  settingLanguageKo: () => "한국어",

  settingCmdAliasName: () => tr("커맨드 팔레트(⌘P) 열기 별칭", "Command Palette (⌘P) search alias"),
  settingCmdAliasDesc: () =>
    tr(
      "⌘P에서 한영 전환 없이 바로 찾을 문구를 입력하세요 (예: 폴더 보드 열기, 보드). 변경 즉시 반영됩니다.",
      "Optional extra keyword appended to the Command Palette command for quick lookup. Updates immediately."
    ),
  settingCmdAliasPlaceholder: () => tr("폴더 보드 열기", "e.g. fb, board"),

  settingLayoutName: () => tr("기본 레이아웃", "Default layout"),
  settingLayoutDesc: () =>
    tr(
      "Flow(연속 다단), Vertical(세로 스크롤), Horizontal(가로 스크롤). Vertical·Horizontal은 카드 경계 드래그로 가로·세로 분할을 자유 조절합니다.",
      "Flow (continuous columns), Vertical (vertical scroll), Horizontal (horizontal scroll). Drag card borders to split columns and heights."
    ),
  settingLayoutFlow: () => tr("Flow 모드 (연속 다단 · 기본)", "Flow (continuous columns · default)"),
  settingLayoutVertical: () => tr("Vertical 모드 (세로 스크롤)", "Vertical (vertical scroll)"),
  settingLayoutHorizontal: () => tr("Horizontal 모드 (가로 스크롤)", "Horizontal (horizontal scroll)"),

  settingSortName: () => tr("기본 정렬", "Default file sort"),
  settingSortOptName: () => tr("이름순", "Name"),
  settingSortOptMtime: () => tr("최근 수정순", "Modified time"),

  settingOpenBehaviorName: () => tr("노트 열기 방식", "Open note behavior"),
  settingOpenSameTab: () => tr("현재 탭에서 열기", "Open in current tab"),
  settingOpenNewTab: () => tr("새 탭에서 열기", "Open in new tab"),

  settingAutoPinName: () => tr("폴더 보드 탭 자동 고정 (Pin)", "Auto-pin Folder Board tab"),
  settingAutoPinDesc: () =>
    tr(
      "폴더 보드 탭을 고정해 두어 탐색기나 보드에서 노트를 열어도 보드가 사라지지 않고 옆 탭에서 열리게 합니다. (보드 상단 핀 버튼으로도 즉시 토글 가능)",
      "Pins the Folder Board tab so opening notes from the board or File Explorer opens them in an adjacent tab instead of replacing the board. (Also toggleable in the board toolbar.)"
    ),

  settingAutoCollapseName: () => tr("폴더 보드에서 좌측 패널 자동 접기", "Auto-collapse left sidebar in Folder Board"),
  settingAutoCollapseDesc: () =>
    tr(
      "폴더 보드를 볼 때 좌측 탐색기 패널을 자동으로 접어 화면을 넓히고, 다른 노트로 이동하면 다시 펼칩니다. (수동으로 접어둔 상태 및 Space 분할 편집 중에는 유지)",
      "Automatically collapses the left sidebar while viewing Folder Board and restores it when leaving. (Respects manually collapsed sidebars and stays collapsed during Space Quick Edit.)"
    ),

  settingEdgeBehaviorName: () => tr("카드 상하 끝에서 ↑/↓ 동작", "↑/↓ behavior at card top/bottom edge"),
  settingEdgeBehaviorDesc: () =>
    tr(
      "적응형: 같은 열의 위/아래 카드·섹션으로 자연스럽게 연결 / 순환: 항상 현재 카드 내부 순환",
      "Adaptive: seamlessly moves to the card/section above or below in the same column / Loop: wraps inside the current card."
    ),
  settingEdgeAdaptive: () => tr("모드 적응형 (추천)", "Adaptive (recommended)"),
  settingEdgeLoop: () => tr("항상 카드 내부 순환", "Always loop within card"),

  settingResetOrderName: () => tr("사용자 지정 폴더 순서 초기화", "Reset custom folder order"),
  settingResetOrderDesc: () =>
    tr(
      "Flow · Vertical · Horizontal 모든 모드에 저장된 카드 순서를 기본 이름순으로 되돌립니다.",
      "Resets saved card orders across Flow, Vertical, and Horizontal modes back to default alphabetical order."
    ),

  settingResetExpandedName: () => tr("기억된 폴더 펼침 상태 초기화", "Reset saved expand & card size states"),
  settingShortcutsHeading: () => tr("단축키 안내", "Keyboard shortcuts"),

  // Shortcut help modal
  shortcutModalTitle: () => tr("Folder Board 단축키", "Folder Board Shortcuts"),
  shortcutModalHint: () => tr("? 또는 Esc로 닫기", "Press ? or Esc to close")
};

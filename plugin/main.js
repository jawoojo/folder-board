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
var import_obsidian7 = require("obsidian");

// src/board-view.ts
var import_obsidian5 = require("obsidian");

// src/i18n.ts
var import_obsidian = require("obsidian");
var currentLanguageMode = "auto";
function detectObsidianLocale() {
  let raw = "";
  try {
    raw = window.localStorage.getItem("language") || "";
  } catch {
    raw = "";
  }
  if (!raw && typeof import_obsidian.moment?.locale === "function") {
    raw = import_obsidian.moment.locale() || "";
  }
  if (!raw && typeof document !== "undefined") {
    raw = document.documentElement?.lang || "";
  }
  return raw.toLowerCase().startsWith("ko") ? "ko" : "en";
}
function setLanguageMode(mode) {
  currentLanguageMode = mode;
}
function getResolvedLocale(mode = currentLanguageMode) {
  if (mode === "ko" || mode === "en") return mode;
  return detectObsidianLocale();
}
function isKoreanLocale() {
  return getResolvedLocale() === "ko";
}
function tr(ko, en) {
  return isKoreanLocale() ? ko : en;
}
var i18n = {
  // Common
  cancel: () => tr("\uCDE8\uC18C", "Cancel"),
  create: () => tr("\uC0DD\uC131", "Create"),
  rename: () => tr("\uC774\uB984 \uBC14\uAFB8\uAE30", "Rename"),
  renameConfirm: () => tr("\uBCC0\uACBD", "Rename"),
  delete: () => tr("\uC0AD\uC81C", "Delete"),
  reset: () => tr("\uCD08\uAE30\uD654", "Reset"),
  newNote: () => tr("\uC0C8 \uB178\uD2B8", "New note"),
  newFolder: () => tr("\uC0C8 \uD3F4\uB354", "New folder"),
  openInNewTab: () => tr("\uC0C8 \uD0ED\uC5D0\uC11C \uC5F4\uAE30", "Open in new tab"),
  emptyCard: () => tr("\uBE44\uC5B4 \uC788\uC74C", "Empty"),
  noMatches: () => tr("\uC77C\uCE58\uD558\uB294 \uD56D\uBAA9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4", "No matching items"),
  directPill: () => tr("\uC9C1\uC18D", "Direct"),
  move: () => tr("\uC774\uB3D9", "Move"),
  shelf: () => tr("\uBC14\uAD6C\uB2C8", "Shelf"),
  shelfEmptyHint: () => tr("\uC784\uC2DC \uBCF4\uAD00", "Shelf"),
  // Explorer launch & Command Palette
  explorerLaunchAria: () => tr("Folder Board \uC5F4\uAE30 (\u2318/Ctrl+\uD074\uB9AD: \uD604\uC7AC \uD3F4\uB354)", "Open Folder Board (\u2318/Ctrl+click: current folder)"),
  defaultCommandAlias: () => tr("\uD3F4\uB354 \uBCF4\uB4DC \uC5F4\uAE30", ""),
  currentFolderSuffix: () => tr("\uD604\uC7AC \uD3F4\uB354", "current folder"),
  // Toolbar & Buttons
  parentFolderAria: () => tr("\uC0C1\uC704 \uD3F4\uB354 (Backspace)", "Parent folder (Backspace)"),
  searchPlaceholder: () => tr("\uAC80\uC0C9...", "Search..."),
  clearSearchAria: () => tr("\uAC80\uC0C9 \uC9C0\uC6B0\uAE30", "Clear search"),
  layoutFlowAria: () => tr("Flow \uBAA8\uB4DC \u2014 \uC5F0\uC18D \uB2E4\uB2E8 \uD2B8\uB9AC (\uAE30\uBCF8)", "Flow mode \u2014 Continuous multi-column tree (default)"),
  layoutVerticalAria: () => tr("Vertical \uBAA8\uB4DC \u2014 \uC138\uB85C \uC2A4\uD06C\uB864 \uCE74\uB4DC (\uACBD\uACC4 \uB4DC\uB798\uADF8 \uBD84\uD560)", "Vertical mode \u2014 Vertical scroll cards (drag borders to split)"),
  layoutHorizontalAria: () => tr("Horizontal \uBAA8\uB4DC \u2014 \uAC00\uB85C \uC2A4\uD06C\uB864 \uCE74\uB4DC (\uACBD\uACC4 \uB4DC\uB798\uADF8 \uBD84\uD560)", "Horizontal mode \u2014 Horizontal scroll cards (drag borders to split)"),
  fileSortNameAria: () => tr("\uD30C\uC77C \uC815\uB82C: \uC774\uB984\uC21C", "File sort: Name"),
  fileSortMtimeAria: () => tr("\uD30C\uC77C \uC815\uB82C: \uCD5C\uADFC \uC218\uC815\uC21C", "File sort: Modified time"),
  folderSortAria: () => tr("\uD3F4\uB354 \uC21C\uC11C \uC815\uB82C (\uD604\uC7AC \uBAA8\uB4DC 1\uD68C \uC815\uB82C \xB7 \uC774\uD6C4 \uC790\uC720 \uB4DC\uB798\uADF8)", "Sort folders (one-shot for current mode \xB7 drag freely after)"),
  newNoteAria: (target) => tr(`\uC0C8 \uB178\uD2B8 \u2192 ${target} (N)`, `New note \u2192 ${target} (N)`),
  newFolderAria: (target) => tr(`\uC0C8 \uD3F4\uB354 \u2192 ${target} (Shift+N)`, `New folder \u2192 ${target} (Shift+N)`),
  autoCollapseSidebarAria: () => tr("\uD3F4\uB354 \uBCF4\uB4DC\uC5D0\uC11C \uC88C\uCE21 \uD328\uB110 \uC790\uB3D9 \uC811\uAE30", "Auto-collapse left sidebar in Folder Board"),
  autoCollapseSidebarOnAria: () => tr(
    "\uC88C\uCE21 \uD328\uB110 \uC790\uB3D9 \uC811\uAE30 \uCF1C\uC9D0 \u2014 \uBCF4\uB4DC\uC5D0\uC11C\uB9CC \uC811\uACE0 \uB098\uAC00\uBA74 \uBCF5\uC6D0 (\uD074\uB9AD\uD574 \uB044\uAE30)",
    "Auto-collapse left sidebar ON \u2014 collapses on board, restores on leave (click to disable)"
  ),
  autoCollapseSidebarOffAria: () => tr("\uD3F4\uB354 \uBCF4\uB4DC\uC5D0\uC11C \uC88C\uCE21 \uD328\uB110 \uC790\uB3D9 \uC811\uAE30 \uCF1C\uAE30", "Enable auto-collapse left sidebar in Folder Board"),
  pinTabAria: () => tr("\uD0ED \uACE0\uC815 (Pin)", "Pin tab"),
  pinTabOnAria: () => tr(
    "\uD0ED \uACE0\uC815\uB428 \u2014 \uB178\uD2B8 \uC5F4 \uB54C \uC606 \uD0ED\uC5D0\uC11C \uC5F4\uB9BC (\uD074\uB9AD\uD574 \uD574\uC81C)",
    "Tab pinned \u2014 notes open in another tab (click to unpin)"
  ),
  pinTabOffAria: () => tr(
    "\uD0ED \uACE0\uC815 (Pin) \u2014 \uBCF4\uB4DC\uB97C \uC720\uC9C0\uD55C \uCC44 \uC606 \uD0ED\uC5D0\uC11C \uB178\uD2B8 \uC5F4\uAE30",
    "Pin tab \u2014 keep Folder Board open and open notes beside it"
  ),
  quickEditAria: () => tr("\uBE60\uB978 \uD3B8\uC9D1 (Space)", "Quick Edit (Space)"),
  clearShelfAria: () => tr("\uBC14\uAD6C\uB2C8 \uBE44\uC6B0\uAE30", "Clear shelf"),
  clearSelectionAria: () => tr("\uC120\uD0DD \uD574\uC81C", "Clear selection"),
  // Folder sort menu
  sortFolderNameAsc: () => tr("\uD3F4\uB354 \uC774\uB984\uC21C (A \u2192 Z)", "Folder name (A \u2192 Z)"),
  sortFolderNameDesc: () => tr("\uD3F4\uB354 \uC774\uB984 \uC5ED\uC21C (Z \u2192 A)", "Folder name (Z \u2192 A)"),
  sortFolderCountDesc: () => tr("\uD56D\uBAA9 \uB9CE\uC740 \uC21C", "Most items first"),
  sortFolderMtimeDesc: () => tr("\uCD5C\uADFC \uC218\uC815 \uC21C", "Recently modified first"),
  // Card controls & resize badges
  openItemAria: (name) => tr(`${name} \uC5F4\uAE30`, `Open ${name}`),
  colResizeAria: () => tr("\uAC00\uB85C \uBD84\uD560 \uC218 \uC870\uC808 (\uC88C\uC6B0 \uB4DC\uB798\uADF8)", "Adjust column split (drag left/right)"),
  flowColResizeAria: () => tr("\uB2E4\uB2E8 \uB108\uBE44 \uC870\uC808 (\uB4DC\uB798\uADF8)", "Adjust column width (drag)"),
  colSplitBadge: (cols) => tr(`${cols}\uC5F4 \uBD84\uD560`, `${cols} ${cols === 1 ? "column" : "columns"}`),
  cardRowUnitsLabel: (units) => {
    switch (units) {
      case 3:
        return tr("1/4 \uB192\uC774", "1/4 height");
      case 4:
        return tr("1/3 \uB192\uC774", "1/3 height");
      case 6:
        return tr("1/2 \uB192\uC774", "1/2 height");
      case 8:
        return tr("2/3 \uB192\uC774", "2/3 height");
      case 9:
        return tr("3/4 \uB192\uC774", "3/4 height");
      case 12:
      default:
        return tr("\uC804\uCCB4 \uB192\uC774", "Full height");
    }
  },
  cardRowUnitsMinBadge: (units) => tr(`${i18n.cardRowUnitsLabel(units)} (\uCD5C\uC18C)`, `${i18n.cardRowUnitsLabel(units)} (min)`),
  cardHeightResizeAria: () => tr("\uCE74\uB4DC \uB192\uC774 \uC870\uC808 (\uC0C1\uD558 \uB4DC\uB798\uADF8 \xB7 \uB354\uBE14\uD074\uB9AD \uC804\uCCB4/\uAE30\uBCF8)", "Resize card height (drag up/down \xB7 double-click toggle full)"),
  rootMoveGripAria: () => tr("\uB4DC\uB798\uADF8\uD558\uAC70\uB098 Shift+\u2190/\u2192\uB85C \uC9C1\uC18D \uCE74\uB4DC \uC704\uCE58 \uC774\uB3D9", "Drag or press Shift+\u2190/\u2192 to reorder Direct card"),
  flowFooterAria: () => tr("\uB4DC\uB798\uADF8\uB85C \uAE38\uC774 \uC870\uC808 \uB610\uB294 \uC18C/\uC911/\uB300 \uC120\uD0DD", "Drag to resize or pick S / M / L"),
  flowDragHandleAria: () => tr("\uC704\uC544\uB798 \uB4DC\uB798\uADF8\uB85C \uAE38\uC774 \uC870\uC808", "Drag up/down to resize"),
  flowPresetSm: () => tr("\uC18C", "S"),
  flowPresetMd: () => tr("\uC911", "M"),
  flowPresetLg: () => tr("\uB300", "L"),
  flowPresetSmAria: (n) => tr(`\uC18C (${n}\uAC1C)`, `Small (${n} items)`),
  flowPresetMdAria: (n) => tr(`\uC911 (\uAE30\uBCF8 ${n}\uAC1C)`, `Medium (default ${n} items)`),
  flowPresetLgAria: () => tr("\uB300 (1\uC5F4 \uAF49\uCC28\uAC8C)", "Large (fit 1 column)"),
  flowDragRowsMaxLimit: (rows) => tr(`${rows}\uAC1C \xB7 \uCD5C\uB300`, `${rows} items \xB7 max`),
  flowDragRowsCols: (rows, cols) => tr(`${rows}\uAC1C (${cols}\uC5F4)`, `${rows} items (${cols} cols)`),
  flowDragRows: (rows) => tr(`${rows}\uAC1C`, `${rows} items`),
  // Selection, Carry, Clipboard, Drag ghost
  selectedCount: (n) => tr(`${n}\uAC1C \uC120\uD0DD\uB428`, `${n} selected`),
  carryPill: (n, target) => tr(`${n}\uAC1C \u2192 ${target}`, `${n} ${n === 1 ? "item" : "items"} \u2192 ${target}`),
  clipboardCopied: (n) => tr(`${n}\uAC1C \uBCF5\uC0AC\uB428 \xB7 \u2318V \uBD99\uC5EC\uB123\uAE30`, `${n} copied \xB7 \u2318V to paste`),
  clipboardCut: (n) => tr(`${n}\uAC1C \uC798\uB77C\uB0C4 \xB7 \u2318V \uC774\uB3D9`, `${n} cut \xB7 \u2318V to move`),
  dragGhostMulti: (label, extra) => tr(`${label} \uC678 ${extra}\uAC1C`, `${label} +${extra} more`),
  // Modals & Notices
  noteTitlePlaceholder: () => tr("\uB178\uD2B8 \uC81C\uBAA9", "Note title"),
  folderNamePlaceholder: () => tr("\uD3F4\uB354 \uC774\uB984", "Folder name"),
  newNamePlaceholder: () => tr("\uC0C8 \uC774\uB984", "New name"),
  fileAlreadyExists: () => tr("\uAC19\uC740 \uC774\uB984\uC758 \uD30C\uC77C\uC774 \uC774\uBBF8 \uC874\uC7AC\uD569\uB2C8\uB2E4.", "A file with that name already exists."),
  folderAlreadyExists: () => tr("\uAC19\uC740 \uC774\uB984\uC758 \uD3F4\uB354\uAC00 \uC774\uBBF8 \uC874\uC7AC\uD569\uB2C8\uB2E4.", "A folder with that name already exists."),
  sameNameExists: () => tr("\uAC19\uC740 \uC774\uB984\uC774 \uC774\uBBF8 \uC874\uC7AC\uD569\uB2C8\uB2E4.", "An item with that name already exists."),
  invalidNameChars: () => tr("\uD30C\uC77C/\uD3F4\uB354 \uC774\uB984\uC5D0 \uC0AC\uC6A9\uD560 \uC218 \uC5C6\uB294 \uBB38\uC790\uAC00 \uD3EC\uD568\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.", "Name contains invalid characters."),
  createNoteFailed: (msg) => tr(`\uB178\uD2B8 \uC0DD\uC131 \uC2E4\uD328: ${msg}`, `Failed to create note: ${msg}`),
  createFolderFailed: (msg) => tr(`\uD3F4\uB354 \uC0DD\uC131 \uC2E4\uD328: ${msg}`, `Failed to create folder: ${msg}`),
  renameFailed: (msg) => tr(`\uC774\uB984 \uBCC0\uACBD \uC2E4\uD328: ${msg}`, `Failed to rename: ${msg}`),
  deleteFailed: (msg) => tr(`\uC0AD\uC81C \uC2E4\uD328: ${msg}`, `Failed to delete: ${msg}`),
  trashedItems: (n) => tr(`${n}\uAC1C \uD56D\uBAA9\uC744 \uD734\uC9C0\uD1B5\uC73C\uB85C \uC774\uB3D9\uD588\uC2B5\uB2C8\uB2E4.`, `Moved ${n} ${n === 1 ? "item" : "items"} to trash.`),
  copiedItems: (n, dest) => tr(`${n}\uAC1C \uD56D\uBAA9\uC744 '${dest}'\uC5D0 \uBCF5\uC0AC\uD588\uC2B5\uB2C8\uB2E4.`, `Copied ${n} ${n === 1 ? "item" : "items"} to '${dest}'.`),
  movedItems: (n, dest) => tr(`${n}\uAC1C \uD56D\uBAA9\uC744 '${dest}'\uB85C \uC774\uB3D9\uD588\uC2B5\uB2C8\uB2E4.`, `Moved ${n} ${n === 1 ? "item" : "items"} to '${dest}'.`),
  moveFailedConflict: () => tr("\uB300\uC0C1 \uD3F4\uB354\uC5D0 \uAC19\uC740 \uC774\uB984\uC774 \uC788\uAC70\uB098 \uC774\uB3D9\uD560 \uC218 \uC5C6\uB294 \uACBD\uB85C\uC785\uB2C8\uB2E4.", "Destination already has a same-named item or cannot be moved there."),
  undidMove: (n) => tr(`${n}\uAC1C \uD56D\uBAA9 \uC774\uB3D9\uC744 \uB418\uB3CC\uB838\uC2B5\uB2C8\uB2E4.`, `Undid move for ${n} ${n === 1 ? "item" : "items"}.`),
  // Settings tab
  settingLanguageName: () => tr("\uC5B8\uC5B4 (Language)", "Language"),
  settingLanguageDesc: () => tr(
    "\uC790\uB3D9 \uC120\uD0DD \uC2DC \uC635\uC2DC\uB514\uC5B8\uC774 \uD55C\uAD6D\uC5B4\uBA74 \uD55C\uAD6D\uC5B4, \uADF8 \uC678 \uBAA8\uB4E0 \uC5B8\uC5B4\uC5D0\uC11C\uB294 \uC601\uC5B4\uB85C \uD45C\uC2DC\uB429\uB2C8\uB2E4.",
    "Auto follows Obsidian's language (Korean for Korean Obsidian, English for all other languages)."
  ),
  settingLanguageAuto: () => tr("\uC790\uB3D9 (\uC635\uC2DC\uB514\uC5B8 \uC5B8\uC5B4 \uB530\uB984)", "Auto (follow Obsidian)"),
  settingLanguageEn: () => "English",
  settingLanguageKo: () => "\uD55C\uAD6D\uC5B4",
  settingCmdAliasName: () => tr("\uCEE4\uB9E8\uB4DC \uD314\uB808\uD2B8(\u2318P) \uC5F4\uAE30 \uBCC4\uCE6D", "Command Palette (\u2318P) search alias"),
  settingCmdAliasDesc: () => tr(
    "\u2318P\uC5D0\uC11C \uD55C\uC601 \uC804\uD658 \uC5C6\uC774 \uBC14\uB85C \uCC3E\uC744 \uBB38\uAD6C\uB97C \uC785\uB825\uD558\uC138\uC694 (\uC608: \uD3F4\uB354 \uBCF4\uB4DC \uC5F4\uAE30, \uBCF4\uB4DC). \uBCC0\uACBD \uC989\uC2DC \uBC18\uC601\uB429\uB2C8\uB2E4.",
    "Optional extra keyword appended to the Command Palette command for quick lookup. Updates immediately."
  ),
  settingCmdAliasPlaceholder: () => tr("\uD3F4\uB354 \uBCF4\uB4DC \uC5F4\uAE30", "e.g. fb, board"),
  settingLayoutName: () => tr("\uAE30\uBCF8 \uB808\uC774\uC544\uC6C3", "Default layout"),
  settingLayoutDesc: () => tr(
    "Flow(\uC5F0\uC18D \uB2E4\uB2E8), Vertical(\uC138\uB85C \uC2A4\uD06C\uB864), Horizontal(\uAC00\uB85C \uC2A4\uD06C\uB864). Vertical\xB7Horizontal\uC740 \uCE74\uB4DC \uACBD\uACC4 \uB4DC\uB798\uADF8\uB85C \uAC00\uB85C\xB7\uC138\uB85C \uBD84\uD560\uC744 \uC790\uC720 \uC870\uC808\uD569\uB2C8\uB2E4.",
    "Flow (continuous columns), Vertical (vertical scroll), Horizontal (horizontal scroll). Drag card borders to split columns and heights."
  ),
  settingLayoutFlow: () => tr("Flow \uBAA8\uB4DC (\uC5F0\uC18D \uB2E4\uB2E8 \xB7 \uAE30\uBCF8)", "Flow (continuous columns \xB7 default)"),
  settingLayoutVertical: () => tr("Vertical \uBAA8\uB4DC (\uC138\uB85C \uC2A4\uD06C\uB864)", "Vertical (vertical scroll)"),
  settingLayoutHorizontal: () => tr("Horizontal \uBAA8\uB4DC (\uAC00\uB85C \uC2A4\uD06C\uB864)", "Horizontal (horizontal scroll)"),
  settingSortName: () => tr("\uAE30\uBCF8 \uC815\uB82C", "Default file sort"),
  settingSortOptName: () => tr("\uC774\uB984\uC21C", "Name"),
  settingSortOptMtime: () => tr("\uCD5C\uADFC \uC218\uC815\uC21C", "Modified time"),
  settingOpenBehaviorName: () => tr("\uB178\uD2B8 \uC5F4\uAE30 \uBC29\uC2DD", "Open note behavior"),
  settingOpenSameTab: () => tr("\uD604\uC7AC \uD0ED\uC5D0\uC11C \uC5F4\uAE30", "Open in current tab"),
  settingOpenNewTab: () => tr("\uC0C8 \uD0ED\uC5D0\uC11C \uC5F4\uAE30", "Open in new tab"),
  settingAutoPinName: () => tr("\uD3F4\uB354 \uBCF4\uB4DC \uD0ED \uC790\uB3D9 \uACE0\uC815 (Pin)", "Auto-pin Folder Board tab"),
  settingAutoPinDesc: () => tr(
    "\uD3F4\uB354 \uBCF4\uB4DC \uD0ED\uC744 \uACE0\uC815\uD574 \uB450\uC5B4 \uD0D0\uC0C9\uAE30\uB098 \uBCF4\uB4DC\uC5D0\uC11C \uB178\uD2B8\uB97C \uC5F4\uC5B4\uB3C4 \uBCF4\uB4DC\uAC00 \uC0AC\uB77C\uC9C0\uC9C0 \uC54A\uACE0 \uC606 \uD0ED\uC5D0\uC11C \uC5F4\uB9AC\uAC8C \uD569\uB2C8\uB2E4. (\uBCF4\uB4DC \uC0C1\uB2E8 \uD540 \uBC84\uD2BC\uC73C\uB85C\uB3C4 \uC989\uC2DC \uD1A0\uAE00 \uAC00\uB2A5)",
    "Pins the Folder Board tab so opening notes from the board or File Explorer opens them in an adjacent tab instead of replacing the board. (Also toggleable in the board toolbar.)"
  ),
  settingAutoCollapseName: () => tr("\uD3F4\uB354 \uBCF4\uB4DC\uC5D0\uC11C \uC88C\uCE21 \uD328\uB110 \uC790\uB3D9 \uC811\uAE30", "Auto-collapse left sidebar in Folder Board"),
  settingAutoCollapseDesc: () => tr(
    "\uD3F4\uB354 \uBCF4\uB4DC\uB97C \uBCFC \uB54C \uC88C\uCE21 \uD0D0\uC0C9\uAE30 \uD328\uB110\uC744 \uC790\uB3D9\uC73C\uB85C \uC811\uC5B4 \uD654\uBA74\uC744 \uB113\uD788\uACE0, \uB2E4\uB978 \uB178\uD2B8\uB85C \uC774\uB3D9\uD558\uBA74 \uB2E4\uC2DC \uD3BC\uCE69\uB2C8\uB2E4. (\uC218\uB3D9\uC73C\uB85C \uC811\uC5B4\uB454 \uC0C1\uD0DC \uBC0F Space \uBD84\uD560 \uD3B8\uC9D1 \uC911\uC5D0\uB294 \uC720\uC9C0)",
    "Automatically collapses the left sidebar while viewing Folder Board and restores it when leaving. (Respects manually collapsed sidebars and stays collapsed during Space Quick Edit.)"
  ),
  settingEdgeBehaviorName: () => tr("\uCE74\uB4DC \uC0C1\uD558 \uB05D\uC5D0\uC11C \u2191/\u2193 \uB3D9\uC791", "\u2191/\u2193 behavior at card top/bottom edge"),
  settingEdgeBehaviorDesc: () => tr(
    "\uC801\uC751\uD615: \uAC19\uC740 \uC5F4\uC758 \uC704/\uC544\uB798 \uCE74\uB4DC\xB7\uC139\uC158\uC73C\uB85C \uC790\uC5F0\uC2A4\uB7FD\uAC8C \uC5F0\uACB0 / \uC21C\uD658: \uD56D\uC0C1 \uD604\uC7AC \uCE74\uB4DC \uB0B4\uBD80 \uC21C\uD658",
    "Adaptive: seamlessly moves to the card/section above or below in the same column / Loop: wraps inside the current card."
  ),
  settingEdgeAdaptive: () => tr("\uBAA8\uB4DC \uC801\uC751\uD615 (\uCD94\uCC9C)", "Adaptive (recommended)"),
  settingEdgeLoop: () => tr("\uD56D\uC0C1 \uCE74\uB4DC \uB0B4\uBD80 \uC21C\uD658", "Always loop within card"),
  settingResetOrderName: () => tr("\uC0AC\uC6A9\uC790 \uC9C0\uC815 \uD3F4\uB354 \uC21C\uC11C \uCD08\uAE30\uD654", "Reset custom folder order"),
  settingResetOrderDesc: () => tr(
    "Flow \xB7 Vertical \xB7 Horizontal \uBAA8\uB4E0 \uBAA8\uB4DC\uC5D0 \uC800\uC7A5\uB41C \uCE74\uB4DC \uC21C\uC11C\uB97C \uAE30\uBCF8 \uC774\uB984\uC21C\uC73C\uB85C \uB418\uB3CC\uB9BD\uB2C8\uB2E4.",
    "Resets saved card orders across Flow, Vertical, and Horizontal modes back to default alphabetical order."
  ),
  settingResetExpandedName: () => tr("\uAE30\uC5B5\uB41C \uD3F4\uB354 \uD3BC\uCE68 \uC0C1\uD0DC \uCD08\uAE30\uD654", "Reset saved expand & card size states"),
  settingShortcutsHeading: () => tr("\uB2E8\uCD95\uD0A4 \uC548\uB0B4", "Keyboard shortcuts"),
  // Shortcut help modal
  shortcutModalTitle: () => tr("Folder Board \uB2E8\uCD95\uD0A4", "Folder Board Shortcuts"),
  shortcutModalHint: () => tr("? \uB610\uB294 Esc\uB85C \uB2EB\uAE30", "Press ? or Esc to close")
};

// src/name-modal.ts
var import_obsidian2 = require("obsidian");
var NamePromptModal = class extends import_obsidian2.Modal {
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
    const cancelBtn = footer.createEl("button", { text: i18n.cancel() });
    const submitBtn = footer.createEl("button", {
      cls: "mod-cta",
      text: this.opts.confirmLabel || i18n.create()
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

// src/shortcuts.ts
var import_obsidian3 = require("obsidian");
function getShortcutGroups() {
  return [
    {
      title: tr("\uD0D0\uC0C9 & \uC5F4\uAE30", "Navigate & Open"),
      items: [
        { keys: ["\u2191", "\u2193", "\u2190", "\u2192"], desc: tr("\uD56D\uBAA9 \xB7 \uCE74\uB4DC \xB7 \uC778\uC811 \uC5F4 \uC774\uB3D9", "Move across items, cards, and columns") },
        { keys: ["\u2318/Ctrl", "\u2190/\u2192"], desc: tr("\uCCAB \uBC88\uC9F8 \xB7 \uB9C8\uC9C0\uB9C9 \uCE74\uB4DC\uB85C \uC810\uD504", "Jump to first / last card") },
        { keys: ["\u2318/Ctrl", "\u2191/\u2193"], desc: tr("\uD604\uC7AC \uCE74\uB4DC \uB9E8 \uC704 \xB7 \uB9E8 \uC544\uB798\uB85C \uC810\uD504", "Jump to top / bottom of current card") },
        { keys: ["1 ~ 9"], desc: tr("N\uBC88\uC9F8 \uCE74\uB4DC\uB85C \uC989\uC2DC \uC810\uD504", "Jump to Nth card") },
        { keys: ["Enter"], desc: tr("\uB178\uD2B8 \uC5F4\uAE30 / \uD3F4\uB354 \uC548\uC73C\uB85C \uC9C4\uC785", "Open note / enter folder") },
        { keys: ["\u2318/Ctrl", "Enter"], desc: tr("\uC0C8 \uD0ED\uC5D0\uC11C \uB178\uD2B8 \uC5F4\uAE30", "Open note in new tab") },
        { keys: ["Backspace"], desc: tr("\uC0C1\uC704 \uD3F4\uB354\uB85C \uC774\uB3D9", "Go to parent folder") },
        { keys: ["\u2318/Ctrl", "F"], desc: tr("\uBCF4\uB4DC \uB0B4 \uAC80\uC0C9 (\uB610\uB294 /)", "Search in board (or /)") },
        { keys: ["?"], desc: tr("\uB2E8\uCD95\uD0A4 \uB3C4\uC6C0\uB9D0 \uC5F4\uAE30 \xB7 \uB2EB\uAE30", "Toggle keyboard shortcuts") }
      ]
    },
    {
      title: tr("\uBE60\uB978 \uD3B8\uC9D1 & \uC811\uAE30/\uD3BC\uCE58\uAE30", "Quick Edit & Fold"),
      items: [
        {
          keys: ["Space"],
          desc: tr("\uD30C\uC77C: 1\uD68C \uBBF8\uB9AC\uBCF4\uAE30 \xB7 2\uD68C \uD3B8\uC9D1 \uC9C4\uC785 / \uD3F4\uB354: \uC811\uAE30\xB7\uD3BC\uCE58\uAE30", "File: 1st preview \xB7 2nd edit / Folder: fold toggle")
        },
        {
          keys: ["Tab / Esc"],
          desc: tr("\uC6B0\uCE21 \uD3B8\uC9D1\uAE30 \uCEE4\uC11C \uC9C4\uC785 / \uBCF4\uB4DC\uB85C \uBCF5\uADC0 (Esc 2\uD68C \uB2EB\uAE30)", "Focus Quick Edit / return to board (2nd Esc closes)")
        },
        { keys: ["["], desc: tr("\uD3EC\uCEE4\uC2A4 \uD3F4\uB354 \uD558\uC704 \uC811\uAE30 (\uC9C1\uC18D\uC5D0\uC11C\uB294 \uC804\uCCB4 \uC811\uAE30)", "Collapse subfolders (or collapse all from Direct)") },
        { keys: ["]"], desc: tr("\uD3EC\uCEE4\uC2A4 \uD3F4\uB354 \uD558\uC704 \uD3BC\uCE58\uAE30 (\uC9C1\uC18D\uC5D0\uC11C\uB294 \uC804\uCCB4 \uD3BC\uCE58\uAE30)", "Expand subfolders (or expand all from Direct)") },
        { keys: ["Esc"], desc: tr("\uC120\uD0DD \xB7 \uD074\uB9BD\uBCF4\uB4DC \xB7 \uB4E4\uACE0 \uC774\uB3D9 \xB7 \uBD84\uD560 \uD3B8\uC9D1\uAE30 \uB2EB\uAE30", "Clear selection / clipboard / carry / close Quick Edit") }
      ]
    },
    {
      title: tr("\uD30C\uC77C \xB7 \uD3F4\uB354 \uC815\uB9AC & \uD3B8\uC9D1", "Organize & Edit"),
      items: [
        { keys: ["Option/Alt", tr("\uBC29\uD5A5\uD0A4", "Arrows")], desc: tr("\uD56D\uBAA9 \uB4E4\uACE0 \uC774\uB3D9 (\uD0A4 \uB5BC\uBA74 \uB4DC\uB86D)", "Carry & move items (release key to drop)") },
        { keys: ["Option/Alt", "1 ~ 9"], desc: tr("N\uBC88\uC9F8 \uCE74\uB4DC\uB85C \uC6D0\uD0A4 \uC774\uB3D9", "Move directly to Nth card") },
        { keys: ["Shift", "\u2191/\u2193"], desc: tr("\uBC94\uC704 \uB2E4\uC911 \uC120\uD0DD", "Range multi-select") },
        { keys: ["\u2318/Ctrl", "A"], desc: tr("\uD604\uC7AC \uCE74\uB4DC \uC804\uCCB4 \uC120\uD0DD", "Select all in current card") },
        { keys: ["\u2318/Ctrl", "C / X / V"], desc: tr("\uD30C\uC77C \xB7 \uD3F4\uB354 \uBCF5\uC0AC \xB7 \uC798\uB77C\uB0B4\uAE30 \xB7 \uBD99\uC5EC\uB123\uAE30", "Copy / cut / paste files & folders") },
        { keys: ["\u2318/Ctrl", "Z"], desc: tr("\uB9C8\uC9C0\uB9C9 \uC774\uB3D9 \uB418\uB3CC\uB9AC\uAE30", "Undo last move") },
        { keys: ["N / Shift+N"], desc: tr("\uD3EC\uCEE4\uC2A4 \uD3F4\uB354\uC5D0 \uC0C8 \uB178\uD2B8 / \uC0C8 \uD3F4\uB354 \uC0DD\uC131", "New note / new folder in focused folder") },
        { keys: ["F2 / R"], desc: tr("\uC81C\uC790\uB9AC \uC774\uB984 \uBC14\uAFB8\uAE30", "Inline rename") },
        { keys: ["\u2318/Ctrl", "\u232B"], desc: tr("\uC120\uD0DD \uD56D\uBAA9 \uD734\uC9C0\uD1B5\uC73C\uB85C \uC0AD\uC81C (\uB610\uB294 Delete)", "Move selected items to trash (or Delete)") }
      ]
    },
    {
      title: tr("\uCE74\uB4DC \uC21C\uC11C & \uB808\uC774\uC544\uC6C3 \uB4DC\uB798\uADF8 \uBD84\uD560", "Card Order & Drag Layout"),
      items: [
        { keys: ["Shift", "\u2190/\u2192"], desc: tr("\uCE74\uB4DC \uC21C\uC11C \uC774\uB3D9 (\uD3F4\uB354 \uD5E4\uB354 \xB7 \uC9C1\uC18D \uCE74\uB4DC)", "Reorder card (folder header / Direct card)") },
        { keys: [tr("\uD5E4\uB354 \uB4DC\uB798\uADF8", "Drag Header")], desc: tr("\uCE74\uB4DC \uC21C\uC11C \uB9C8\uC6B0\uC2A4 \uB4DC\uB798\uADF8 \uBCC0\uACBD", "Drag header to reorder cards") },
        {
          keys: [tr("\uC5F4 \uC0AC\uC774 \uB4DC\uB798\uADF8", "Drag Col Gap")],
          desc: tr("Flow: \uB2E4\uB2E8 \uB108\uBE44 \uC870\uC808 \xB7 Vertical/Horizontal: 1~6\uC5F4 \uBD84\uD560", "Flow: column width \xB7 Vertical/Horizontal: 1\u20136 cols")
        },
        {
          keys: [tr("\uCE74\uB4DC \uD558\uB2E8 \uB4DC\uB798\uADF8", "Drag Card Bottom")],
          desc: tr("Vertical/Horizontal: \uCE74\uB4DC \uB192\uC774 \uBD84\uD560(\uB354\uBE14\uD074\uB9AD 1/2\u2194\uC804\uCCB4)", "Vertical/Horizontal: card height (dbl-click full/half)")
        },
        {
          keys: [tr("Flow \uD558\uB2E8 \uD638\uBC84", "Hover Flow Bottom")],
          desc: tr("\uC18C(4) \xB7 \uC911(15) \xB7 \uB300(1\uC5F4) \uC120\uD0DD \uBC0F \uCD5C\uB300 200\uC904 \uB4DC\uB798\uADF8", "S(4) \xB7 M(15) \xB7 L(1 col) presets & drag up to 200 rows")
        }
      ]
    }
  ];
}
function renderShortcutsGrid(containerEl) {
  const grid = containerEl.createDiv({ cls: "fb-shortcuts-grid" });
  for (const group of getShortcutGroups()) {
    const section = grid.createDiv({ cls: "fb-shortcut-group" });
    section.createDiv({ cls: "fb-shortcut-group-title", text: group.title });
    const list = section.createDiv({ cls: "fb-shortcut-list" });
    for (const item of group.items) {
      const row = list.createDiv({ cls: "fb-shortcut-row" });
      const keysWrap = row.createDiv({ cls: "fb-shortcut-keys" });
      item.keys.forEach((keyLabel, idx) => {
        if (idx > 0) {
          keysWrap.createSpan({ cls: "fb-kbd-plus", text: "+" });
        }
        keysWrap.createEl("kbd", { cls: "fb-kbd", text: keyLabel });
      });
      row.createSpan({ cls: "fb-shortcut-desc", text: item.desc });
    }
  }
}
var ShortcutHelpModal = class extends import_obsidian3.Modal {
  constructor(app) {
    super(app);
    this.boundKeydown = (e) => {
      if (e.key === "?" || e.shiftKey && e.code === "Slash") {
        e.preventDefault();
        e.stopPropagation();
        this.close();
      }
    };
  }
  onOpen() {
    const { contentEl, modalEl } = this;
    modalEl.addClass("fb-shortcut-modal");
    contentEl.empty();
    const header = contentEl.createDiv({ cls: "fb-shortcut-modal-header" });
    header.createSpan({ cls: "fb-shortcut-modal-title", text: i18n.shortcutModalTitle() });
    header.createSpan({ cls: "fb-shortcut-modal-hint", text: i18n.shortcutModalHint() });
    renderShortcutsGrid(contentEl);
    window.addEventListener("keydown", this.boundKeydown, true);
  }
  onClose() {
    window.removeEventListener("keydown", this.boundKeydown, true);
    this.contentEl.empty();
  }
};

// src/native-sync.ts
var import_obsidian4 = require("obsidian");
var fallbackCache = null;
var stickyFolderClosed = null;
var stickyFolderOpen = null;
var mfiSvgIdCounter = 0;
var CACHE_TTL_MS = 2e3;
function tryExtractMaterialIcon(app, path, fallbackIcon, isExpandedFolder) {
  try {
    const plugins = app.plugins;
    if (plugins?.enabledPlugins && !plugins.enabledPlugins.has("material-icon-theme")) return null;
    const mfi = plugins?.plugins?.["material-icon-theme"];
    if (!mfi) return null;
    let svgMarkup = "";
    if (fallbackIcon === "folder") {
      if (mfi.settings?.applyToFolders === false) return null;
      if (typeof mfi.getFolderIconKey !== "function" || typeof mfi.getIconSet !== "function" || typeof mfi.getSvg !== "function") {
        return null;
      }
      const isCollapsed = isExpandedFolder === void 0 ? true : !isExpandedFolder;
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
    const svgEl = document.importNode(svgRoot, true);
    const idNodes = Array.from(svgEl.querySelectorAll("[id]"));
    if (svgEl.hasAttribute("id")) idNodes.unshift(svgEl);
    if (idNodes.length > 0) {
      const prefix = `fb-mfi-${++mfiSvgIdCounter}-`;
      const idMap = /* @__PURE__ */ new Map();
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
  const materialIcon = tryExtractMaterialIcon(app, path, fallbackIcon, isExpandedFolder);
  if (materialIcon) {
    renderExtractedIcon(iconContainer, materialIcon);
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
  (0, import_obsidian4.setIcon)(iconContainer, fallbackIcon === "folder" && isExpandedFolder ? "folder-open" : fallbackIcon);
}
function openNativeFileMenu(app, event, target, cb) {
  const menu = new import_obsidian4.Menu();
  if (target instanceof import_obsidian4.TFolder) {
    const folderPath = target.isRoot() || target.path === "/" ? "" : target.path;
    menu.addItem(
      (item) => item.setTitle(i18n.newNote()).setIcon("file-plus").setSection("action-primary").onClick(() => cb.onRequestCreateNote(folderPath))
    );
    menu.addItem(
      (item) => item.setTitle(i18n.newFolder()).setIcon("folder-plus").setSection("action-primary").onClick(() => cb.onRequestCreateFolder(folderPath))
    );
    if (!target.isRoot()) {
      menu.addItem(
        (item) => item.setTitle(i18n.rename()).setIcon("pencil").setSection("danger").onClick(() => cb.onRequestRename(target))
      );
      menu.addItem(
        (item) => item.setTitle(i18n.delete()).setIcon("trash").setSection("danger").setWarning(true).onClick(async () => {
          try {
            await app.vault.trash(target, true);
            cb.onMutated();
          } catch (err) {
            new import_obsidian4.Notice(i18n.deleteFailed(err instanceof Error ? err.message : String(err)));
          }
        })
      );
    }
  } else if (target instanceof import_obsidian4.TFile) {
    menu.addItem(
      (item) => item.setTitle(i18n.openInNewTab()).setIcon("file-plus").setSection("open").onClick(async () => {
        await app.workspace.getLeaf("tab").openFile(target);
      })
    );
    menu.addItem(
      (item) => item.setTitle(i18n.rename()).setIcon("pencil").setSection("danger").onClick(() => cb.onRequestRename(target))
    );
    menu.addItem(
      (item) => item.setTitle(i18n.delete()).setIcon("trash").setSection("danger").setWarning(true).onClick(async () => {
        try {
          await app.vault.trash(target, true);
          cb.onMutated();
        } catch (err) {
          new import_obsidian4.Notice(i18n.deleteFailed(err instanceof Error ? err.message : String(err)));
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
  return abs instanceof import_obsidian4.TFolder ? abs : null;
}
function getFileByPath(app, path) {
  const abs = app.vault.getAbstractFileByPath(path);
  return abs instanceof import_obsidian4.TFile ? abs : null;
}

// src/board-view.ts
var VIEW_TYPE_FOLDER_BOARD = "folder-board-view";
var DRAG_MIME = "application/x-obsidian-folder-board";
var CARD_REORDER_MIME = "application/x-obsidian-folder-board-card";
var CARD_HEADER_KEY = "__card_header__";
var ROOT_CARD_ORDER_KEY = "__root__";
var FLOW_SIZE_SM = 4;
var FLOW_WINDOW_SIZE = 15;
var FLOW_MAX_DRAG_COLS = 4;
var FLOW_MAX_DRAG_ROWS = 200;
var FLOW_COL_GAP = 24;
var FLOW_CANVAS_PAD_LEFT = 14;
var FLOW_COL_MIN_WIDTH = 180;
var FLOW_COL_MAX_WIDTH = 560;
var GRID_GAP = 10;
var GRID_CANVAS_PAD_X = 28;
var GRID_CANVAS_PAD_Y = 24;
var GRID_MIN_COLS = 1;
var GRID_MAX_COLS = 6;
var GRID_CARD_MIN_WIDTH = 160;
var GRID_CARD_MIN_HEIGHT = 150;
var GRID_ROW_UNITS_TOTAL = 12;
var GRID_ROW_SNAP_UNITS = [3, 4, 6, 8, 9, 12];
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
var FolderBoardView = class _FolderBoardView extends import_obsidian5.ItemView {
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
    this.flowWheelRaf = null;
    this.flowWheelPendingCards = /* @__PURE__ */ new Set();
    this.flowVertFadeTimer = null;
    this.flowVertActiveCardIdx = null;
    this.flowVertLastColX = null;
    this.hScrollFadeTimer = null;
    this.resizeBadgeEl = null;
    this.lastCanvasHeight = 0;
    // [ID 6.5.32] 뷰 전용 Obsidian Scope -> 옵시디언 글로벌 Cmd+F/A/D 단축키보다 우선해 보드 활성 시 안전하게 가로챔
    this.viewScope = null;
    this.scopeActive = false;
    this.refreshTimer = null;
    this.lateIconSyncTimer = null;
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
  isLeafPinned() {
    const pinnedProp = this.leaf.pinned;
    return Boolean(pinnedProp ?? this.leaf.getViewState().pinned);
  }
  syncPinButtonState() {
    if (!this.pinBtnEl) return;
    const pinned = this.isLeafPinned();
    this.pinBtnEl.toggleClass("is-active", pinned);
    this.pinBtnEl.setAttr("aria-label", pinned ? i18n.pinTabOnAria() : i18n.pinTabOffAria());
  }
  syncSidebarCollapseButtonState() {
    if (!this.sidebarAutoCollapseBtnEl) return;
    const enabled = this.plugin.settings.autoCollapseLeftSidebar;
    this.sidebarAutoCollapseBtnEl.toggleClass("is-active", enabled);
    this.sidebarAutoCollapseBtnEl.setAttr(
      "aria-label",
      enabled ? i18n.autoCollapseSidebarOnAria() : i18n.autoCollapseSidebarOffAria()
    );
  }
  // [ID 6.5.70] 언어 설정 변경 시 상단 고정 툴바·검색창·바구니 라벨 즉시 동기화
  syncLocaleLabels() {
    this.backBtnEl?.setAttr("aria-label", i18n.parentFolderAria());
    if (this.searchInputEl) this.searchInputEl.placeholder = i18n.searchPlaceholder();
    this.clearSearchEl?.setAttr("aria-label", i18n.clearSearchAria());
    for (const { value, el } of this.layoutBtns) {
      el.setAttr(
        "aria-label",
        value === "flow" ? i18n.layoutFlowAria() : value === "vertical" ? i18n.layoutVerticalAria() : i18n.layoutHorizontalAria()
      );
    }
    this.folderSortBtnEl?.setAttr("aria-label", i18n.folderSortAria());
    this.qlBtnEl?.setAttr("aria-label", i18n.quickEditAria());
    if (this.shelfDropHereBtn) this.shelfDropHereBtn.setText(i18n.move());
    this.shelfEl?.querySelector(".fb-shelf-actions .fb-tool-btn")?.setAttr("aria-label", i18n.clearShelfAria());
    const selShelf = this.selectionBarEl?.querySelector(".fb-selection-btn");
    if (selShelf) selShelf.setText(i18n.shelf());
    this.selectionBarEl?.querySelector(".fb-tool-btn")?.setAttr("aria-label", i18n.clearSelectionAria());
    this.updateToolbarStates();
    this.renderShelf();
    this.renderSelectionBar();
    this.renderCarryPill();
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
    const scope = new import_obsidian5.Scope(this.app.scope);
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
  openShortcutHelpModal() {
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
    if (this.plugin.settings.autoPinTab && !this.isLeafPinned()) {
      this.leaf.setPinned(true);
    }
    this.syncPinButtonState();
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
      attr: { "aria-label": i18n.parentFolderAria() }
    });
    (0, import_obsidian5.setIcon)(this.backBtnEl, "arrow-left");
    this.backBtnEl.addEventListener("click", () => this.goUp());
    this.breadcrumbEl = navLeft.createDiv({ cls: "fb-breadcrumb" });
    const controls = header.createDiv({ cls: "fb-controls" });
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
    const colGroup = controls.createDiv({ cls: "fb-segmented" });
    const layoutOptions = [
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
      if (opt.icon) (0, import_obsidian5.setIcon)(btn, opt.icon);
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
    this.folderSortBtnEl = controls.createEl("button", {
      cls: "clickable-icon fb-tool-btn",
      attr: { "aria-label": i18n.folderSortAria() }
    });
    (0, import_obsidian5.setIcon)(
      this.folderSortBtnEl,
      this.pickAvailableIcon(["arrow-down-az", "arrow-down-a-z", "arrow-up-narrow-wide", "sort-asc", "list-ordered"])
    );
    this.folderSortBtnEl.addEventListener("click", () => {
      this.openFolderSortMenu(this.folderSortBtnEl);
    });
    controls.createDiv({ cls: "fb-divider" });
    this.newNoteBtnEl = controls.createEl("button", { cls: "clickable-icon fb-tool-btn" });
    (0, import_obsidian5.setIcon)(this.newNoteBtnEl, "file-plus");
    this.newNoteBtnEl.addEventListener("click", () => this.promptCreateNote());
    this.newFolderBtnEl = controls.createEl("button", { cls: "clickable-icon fb-tool-btn" });
    (0, import_obsidian5.setIcon)(this.newFolderBtnEl, "folder-plus");
    this.newFolderBtnEl.addEventListener("click", () => this.promptCreateFolder());
    controls.createDiv({ cls: "fb-divider" });
    this.sidebarAutoCollapseBtnEl = controls.createEl("button", {
      cls: "clickable-icon fb-tool-btn",
      attr: { "aria-label": i18n.autoCollapseSidebarAria() }
    });
    (0, import_obsidian5.setIcon)(this.sidebarAutoCollapseBtnEl, "panel-left-close");
    this.sidebarAutoCollapseBtnEl.addEventListener("click", () => {
      void this.plugin.setAutoCollapseLeftSidebar(!this.plugin.settings.autoCollapseLeftSidebar);
    });
    this.pinBtnEl = controls.createEl("button", {
      cls: "clickable-icon fb-tool-btn",
      attr: { "aria-label": i18n.pinTabAria() }
    });
    (0, import_obsidian5.setIcon)(this.pinBtnEl, "pin");
    this.pinBtnEl.addEventListener("click", () => {
      const nextPinned = !this.isLeafPinned();
      this.leaf.setPinned(nextPinned);
      this.plugin.settings.autoPinTab = nextPinned;
      void this.plugin.saveSettings();
      this.syncPinButtonState();
    });
    this.qlBtnEl = controls.createEl("button", {
      cls: "clickable-icon fb-tool-btn",
      attr: { "aria-label": i18n.quickEditAria() }
    });
    (0, import_obsidian5.setIcon)(this.qlBtnEl, "panel-right");
    this.qlBtnEl.addEventListener("click", () => {
      this.quickLookOpen = !this.quickLookOpen;
      void this.updateQuickLook();
      this.updateToolbarStates();
    });
    const body = this.shellEl.createDiv({ cls: "fb-body" });
    this.canvasEl = body.createDiv({ cls: "fb-canvas" });
    this.gridEl = this.canvasEl.createDiv({ cls: "fb-grid" });
    this.colResizersEl = this.canvasEl.createDiv({ cls: "fb-col-resizers" });
    this.flowVertIndicatorEl = this.canvasEl.createDiv({ cls: "fb-flow-vscroll-indicator" });
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
    this.resizeObserver = new ResizeObserver(() => {
      if (this.renderedCards.length === 0) return;
      const mode = this.plugin.settings.gridCols;
      if (mode === "vertical" || mode === "horizontal") {
        this.applyGridLayoutClasses(this.renderedCards.length);
        this.syncCardRowSpansInPlace();
        this.scheduleFlowColResizersSync();
      } else if (mode === "flow") {
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
        if (mode !== "horizontal" && mode !== "flow") return;
        const target = e.target;
        if (mode === "horizontal") {
          const cardBody = target?.closest(".fb-card-body");
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
    this.shelfEl = this.shellEl.createDiv({
      cls: "fb-shelf is-collapsed",
      attr: { "data-drop-shelf": "true" }
    });
    const shelfIcon = this.shelfEl.createSpan({ cls: "fb-shelf-icon" });
    (0, import_obsidian5.setIcon)(shelfIcon, "inbox");
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
    (0, import_obsidian5.setIcon)(shelfClearBtn, "x");
    shelfClearBtn.addEventListener("click", () => {
      this.shelfPaths = [];
      this.renderShelf();
    });
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
    (0, import_obsidian5.setIcon)(selClearBtn, "x");
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
        if (file instanceof import_obsidian5.TFolder) {
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
  getSortedChildren(folder) {
    const folders = [];
    const files = [];
    for (const child of folder.children) {
      if (child instanceof import_obsidian5.TFolder) folders.push(child);
      else if (child instanceof import_obsidian5.TFile) files.push(child);
    }
    folders.sort((a, b) => a.name.localeCompare(b.name, void 0, { numeric: true }));
    const customOrder = this.plugin.getFolderOrder(this.plugin.settings.gridCols, normalizeFolderRef(folder));
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
      if (child instanceof import_obsidian5.TFile) count++;
      else if (child instanceof import_obsidian5.TFolder) count += this.countFilesRecursive(child);
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
    const customOrder = this.plugin.getFolderOrder(this.plugin.settings.gridCols, normalizeFolderRef(currentFolder));
    if (customOrder.includes(ROOT_CARD_ORDER_KEY)) {
      const rank = new Map(customOrder.map((k, idx) => [k, idx]));
      const fallbackRank = new Map(cards.map((c, idx) => [this.getCardOrderKey(c), idx]));
      cards.sort((a, b) => {
        const ka = this.getCardOrderKey(a);
        const kb = this.getCardOrderKey(b);
        const ra = rank.has(ka) ? rank.get(ka) : Number.MAX_SAFE_INTEGER;
        const rb = rank.has(kb) ? rank.get(kb) : Number.MAX_SAFE_INTEGER;
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
  getCardOrderKey(card) {
    return card.isRootCard ? ROOT_CARD_ORDER_KEY : card.folderPath;
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
    this.newNoteBtnEl.setAttr("aria-label", i18n.newNoteAria(targetLabel));
    this.newFolderBtnEl.setAttr("aria-label", i18n.newFolderAria(targetLabel));
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
      (0, import_obsidian5.setIcon)(this.sortBtnEl, nextSortIcon);
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
        (0, import_obsidian5.setIcon)(sep, "chevron-right");
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
  // [ID 6.5.64] Vertical/Horizontal 공용 12분할 카드 그리드 계산 · 드래그 리사이즈 · 플로팅 배지
  // -> 가로 폭은 1~6열 분할(최소 160px), 세로 높이는 12단위 화면 분수(1/4~전체, 최소 150px)로 통일하고
  // -> Vertical과 Horizontal은 넘쳤을 때 스크롤 방향(세로 vs 가로)만 다르게 동작하도록 일원화함.
  getCardGridColsSetting() {
    const raw = this.plugin.settings.gridCols === "horizontal" ? this.plugin.settings.horizontalCols : this.plugin.settings.verticalCols;
    return Math.max(GRID_MIN_COLS, Math.min(GRID_MAX_COLS, Math.round(raw || 3)));
  }
  setCardGridColsSetting(cols) {
    const clamped = Math.max(GRID_MIN_COLS, Math.min(GRID_MAX_COLS, Math.round(cols)));
    if (this.plugin.settings.gridCols === "horizontal") {
      this.plugin.settings.horizontalCols = clamped;
    } else {
      this.plugin.settings.verticalCols = clamped;
    }
  }
  getCardGridAvailWidth() {
    return Math.max(GRID_CARD_MIN_WIDTH, (this.canvasEl?.clientWidth || 960) - GRID_CANVAS_PAD_X);
  }
  getCardGridAvailHeight() {
    return Math.max(320, (this.canvasEl?.clientHeight || 680) - GRID_CANVAS_PAD_Y);
  }
  getCardGridMaxCols(availW) {
    return Math.min(
      GRID_MAX_COLS,
      Math.max(GRID_MIN_COLS, Math.floor((availW + GRID_GAP) / (GRID_CARD_MIN_WIDTH + GRID_GAP)))
    );
  }
  getEffectiveCardGridCols(availW) {
    const pref = this.getCardGridColsSetting();
    return Math.max(GRID_MIN_COLS, Math.min(pref, this.getCardGridMaxCols(availW)));
  }
  computeUnitRowHeight(availH) {
    return Math.max(12, (availH - (GRID_ROW_UNITS_TOTAL - 1) * GRID_GAP) / GRID_ROW_UNITS_TOTAL);
  }
  getCardHeightForUnits(units, unitRowH) {
    return units * unitRowH + (units - 1) * GRID_GAP;
  }
  getAllowedCardRowUnits(availH) {
    const unitRowH = this.computeUnitRowHeight(availH);
    const allowed = GRID_ROW_SNAP_UNITS.filter(
      (u) => this.getCardHeightForUnits(u, unitRowH) >= GRID_CARD_MIN_HEIGHT
    );
    return allowed.length > 0 ? [...allowed] : [GRID_ROW_UNITS_TOTAL];
  }
  getActiveCardGridMode() {
    return this.plugin.settings.gridCols === "horizontal" ? "horizontal" : "vertical";
  }
  resolveCardRowUnits(cardKey, cardCount) {
    const availH = this.getCardGridAvailHeight();
    const allowed = this.getAllowedCardRowUnits(availH);
    const saved = this.plugin.getCardRowUnits(this.getActiveCardGridMode(), cardKey);
    if (saved !== null) {
      const match2 = allowed.find((u) => u >= saved);
      return match2 ?? allowed[allowed.length - 1];
    }
    const effectiveCols = this.getEffectiveCardGridCols(this.getCardGridAvailWidth());
    const target = cardCount <= effectiveCols ? GRID_ROW_UNITS_TOTAL : 6;
    const match = allowed.find((u) => u >= target);
    return match ?? allowed[allowed.length - 1];
  }
  formatCardRowUnitsLabel(units) {
    return i18n.cardRowUnitsLabel(units);
  }
  showResizeBadge(text, clientX, clientY) {
    if (!this.resizeBadgeEl) {
      this.resizeBadgeEl = document.body.createDiv({ cls: "fb-resize-badge" });
    }
    this.resizeBadgeEl.textContent = text;
    this.resizeBadgeEl.style.left = `${Math.round(clientX + 14)}px`;
    this.resizeBadgeEl.style.top = `${Math.round(clientY - 26)}px`;
  }
  hideResizeBadge() {
    if (this.resizeBadgeEl) {
      this.resizeBadgeEl.remove();
      this.resizeBadgeEl = null;
    }
  }
  syncCardRowSpansInPlace() {
    if (this.plugin.settings.gridCols === "flow") return;
    const cardCount = this.renderedCards.length;
    this.gridEl.querySelectorAll(".fb-card").forEach((cardEl) => {
      const cardKey = cardEl.dataset.orderKey;
      if (!cardKey) return;
      const units = this.resolveCardRowUnits(cardKey, cardCount);
      cardEl.style.setProperty("--fb-card-row-span", String(units));
    });
  }
  applyGridLayoutClasses(cardCount) {
    const prefLayout = this.plugin.settings.gridCols;
    const isHorizontalCanvas = prefLayout === "horizontal" || prefLayout === "flow";
    this.canvasEl.toggleClass("is-horizontal-scroll", isHorizontalCanvas);
    if (prefLayout === "flow") {
      const colW2 = this.clampFlowColWidth(this.plugin.settings.flowColumnWidth);
      this.gridEl.style.setProperty("--fb-flow-col-width", `${colW2}px`);
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
  scheduleFlowColResizersSync() {
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
  positionCardGridColResizer(handleEl, colIndex, colWidth) {
    const gapCenter = FLOW_CANVAS_PAD_LEFT + colIndex * colWidth + (colIndex - 1) * GRID_GAP + GRID_GAP / 2;
    handleEl.style.left = `${Math.round(gapCenter - 7)}px`;
  }
  syncCardGridColResizers() {
    if (!this.colResizersEl) return;
    this.colResizersEl.empty();
    const mode = this.plugin.settings.gridCols;
    if (mode !== "vertical" && mode !== "horizontal" || this.renderedCards.length === 0) return;
    const availW = this.getCardGridAvailWidth();
    const effectiveCols = this.getEffectiveCardGridCols(availW);
    const colW = Math.max(GRID_CARD_MIN_WIDTH, (availW - (effectiveCols - 1) * GRID_GAP) / effectiveCols);
    const gridRect = this.gridEl.getBoundingClientRect();
    let numCols = effectiveCols;
    if (mode === "horizontal") {
      let maxRight = gridRect.left + colW;
      this.gridEl.querySelectorAll(".fb-card").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.right > maxRight) maxRight = r.right;
      });
      const totalSpan = Math.max(colW, maxRight - gridRect.left);
      numCols = Math.max(1, Math.round((totalSpan + GRID_GAP) / (colW + GRID_GAP)));
    } else {
      numCols = Math.max(1, Math.min(effectiveCols, this.renderedCards.length));
    }
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
      handle.addEventListener("pointerdown", (e) => {
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
        const allHandles = Array.from(this.colResizersEl.querySelectorAll(".fb-col-resizer"));
        const onMove = (ev) => {
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
  positionFlowColResizer(handleEl, colIndex, colWidth) {
    const gapCenter = FLOW_CANVAS_PAD_LEFT + colIndex * colWidth + (colIndex - 1) * FLOW_COL_GAP + FLOW_COL_GAP / 2;
    handleEl.style.left = `${Math.round(gapCenter - 7)}px`;
  }
  syncFlowColResizers() {
    if (!this.colResizersEl) return;
    this.colResizersEl.empty();
    this.colResizersEl.style.removeProperty("height");
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
          "aria-label": i18n.flowColResizeAria()
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
  // [ID 6.5.47] Flow 모드 카드 1열 꽉 찬 최대 행 수 정밀 산출
  // -> 다단 분할로 .fb-card-header/.fb-row의 BoundingRect 높이가 열 전체로 부풀어 오르는 오차를 막기 위해
  // -> 정상 범위(행 18~42px, 헤더 20~48px) 샘플만 채택하고 canvasEl 실측 높이를 안전 반영함.
  measureFlowRowHeight() {
    if (this.gridEl) {
      const rows = this.gridEl.querySelectorAll(".fb-row");
      for (const r of Array.from(rows)) {
        const h = r.offsetHeight || r.getBoundingClientRect().height;
        if (h >= 18 && h <= 42) {
          return Math.max(22, Math.min(38, h));
        }
      }
    }
    return 27;
  }
  getFlowMaxOneColumnItems(cardModel) {
    const canvasInnerH = Math.max(240, (this.canvasEl?.clientHeight || 720) - 20);
    const gridH = Math.max(this.gridEl?.clientHeight || 0, canvasInnerH);
    const rowH = this.measureFlowRowHeight();
    let headerH = 28;
    if (!cardModel.isRootCard && this.gridEl) {
      const headers = this.gridEl.querySelectorAll(".fb-card-header");
      for (const h of Array.from(headers)) {
        const rectH = h.offsetHeight || h.getBoundingClientRect().height;
        if (rectH >= 20 && rectH <= 48) {
          headerH = rectH;
          break;
        }
      }
    }
    const chromeH = cardModel.isRootCard ? 26 : Math.ceil(headerH) + 36;
    const usableH = Math.max(rowH * FLOW_SIZE_SM, gridH - chromeH);
    return Math.max(FLOW_SIZE_SM, Math.floor(usableH / rowH));
  }
  getFlowWindowLimit(cardModel) {
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
  // [ID 6.5.59] 카드 헤더 카운트 간소화 -> 범위(1–15/41) 대신 폴더 전체 파일 수 숫자 1개만 표시해 제목 잘림과 시각적 잡음을 제거함
  formatFlowCountLabel(cardModel, _isScrollableWindow) {
    return String(cardModel.totalCount);
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
    const endIdx = isScrollable ? Math.min(cardModel.items.length, offset + limit) : cardModel.items.length;
    const isCarrying = this.carryPaths.length > 0;
    const prevStart = listEl.dataset.winStart !== void 0 ? Number(listEl.dataset.winStart) : NaN;
    const prevEnd = listEl.dataset.winEnd !== void 0 ? Number(listEl.dataset.winEnd) : NaN;
    const delta = offset - prevStart;
    const sameSpan = Number.isFinite(prevStart) && Number.isFinite(prevEnd) && endIdx - offset === prevEnd - prevStart && listEl.children.length === prevEnd - prevStart;
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
    const countEl = cardEl.querySelector(".fb-count");
    if (countEl) {
      countEl.setText(this.formatFlowCountLabel(cardModel, isScrollable));
    }
    const footerEl = cardEl.querySelector(".fb-flow-scroll-footer");
    footerEl?.toggleClass("is-unscrolled", !isScrollable);
    if (isScrollable) {
      this.showFlowVertIndicator(cardIdx, true);
    } else if (this.flowVertActiveCardIdx === cardIdx) {
      this.hideFlowVertIndicator();
    }
  }
  scheduleFlowWheelCommit(cardIdx) {
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
  hideFlowVertIndicator() {
    if (this.flowVertFadeTimer !== null) {
      window.clearTimeout(this.flowVertFadeTimer);
      this.flowVertFadeTimer = null;
    }
    this.flowVertActiveCardIdx = null;
    this.flowVertLastColX = null;
    this.flowVertIndicatorEl?.removeClass("is-visible");
    this.flowVertIndicatorEl?.removeClass("is-active");
  }
  showFlowVertIndicator(cardIdx, isActiveScroll) {
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
    const cardEl = this.gridEl.querySelector(`.fb-card[data-card-index="${cardIdx}"]`);
    if (!cardEl) return;
    const rows = Array.from(cardEl.querySelectorAll(".fb-row"));
    if (rows.length === 0) return;
    const canvasRect = this.canvasEl.getBoundingClientRect();
    const scrollL = this.canvasEl.scrollLeft;
    const scrollT = this.canvasEl.scrollTop;
    const segments = [];
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
    const jumpedColumn = !wasVisible || this.flowVertActiveCardIdx !== cardIdx || this.flowVertLastColX === null || Math.abs(x - this.flowVertLastColX) > 20;
    this.flowVertActiveCardIdx = cardIdx;
    this.flowVertLastColX = x;
    this.flowVertIndicatorEl.style.height = `${clampedThumbH}px`;
    if (jumpedColumn) {
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
    const cardKey = this.getCardOrderKey(cardModel);
    const cardEl = parentEl.createDiv({
      cls: "fb-card" + (cardModel.isRootCard ? " is-root-card" : "") + (cardModel.isRootCard && cardIdx > 0 ? " is-root-moved" : "") + (cardModel.isCollapsedSection ? " is-section-collapsed" : "") + (isFocusedCard ? " is-focused-card" : "") + (isCarryCard ? " is-carry-target" : ""),
      attr: {
        "data-drop-folder": cardModel.folderPath,
        "data-order-key": cardKey,
        "data-card-index": String(cardIdx),
        ...isScrollableWindow ? { "data-windowed": "true" } : {}
      }
    });
    if (!isFlowMode) {
      const units = this.resolveCardRowUnits(cardKey, this.renderedCards.length);
      cardEl.style.setProperty("--fb-card-row-span", String(units));
    }
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
          const stepPx = Math.max(18, this.measureFlowRowHeight());
          const curOffset = this.getFlowWindowOffset(liveModel);
          const maxOffset = Math.max(0, liveModel.items.length - curLimit);
          let accum = (this.flowWheelAccum.get(winKey) || 0) + e.deltaY;
          if (curOffset <= 0 && accum < 0 || curOffset >= maxOffset && accum > 0) {
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
        (0, import_obsidian5.setIcon)(hoverGrip, "grip-horizontal");
        hoverGrip.addEventListener(
          "dragstart",
          (e) => this.handleCardDragStart(e, ROOT_CARD_ORDER_KEY, cardModel.title)
        );
      } else if (isFlowMode) {
        const isHeaderFocused = isFocusedCard && this.focusedItemKey === CARD_HEADER_KEY;
        const rootHeader = cardEl.createDiv({
          cls: "fb-card-header is-root-moved-header" + (isHeaderFocused ? " is-header-focused" : ""),
          attr: { draggable: "true" }
        });
        const titleWrap = rootHeader.createDiv({ cls: "fb-card-title-wrap" });
        const gripIcon = titleWrap.createSpan({ cls: "fb-root-header-grip" });
        (0, import_obsidian5.setIcon)(gripIcon, "grip-horizontal");
        titleWrap.createSpan({ cls: "fb-card-title is-root-moved-title", text: cardModel.title });
        const metaEl = rootHeader.createDiv({ cls: "fb-card-meta" });
        metaEl.createSpan({
          cls: "fb-count",
          text: this.formatFlowCountLabel(cardModel, isScrollableWindow)
        });
        rootHeader.addEventListener(
          "dragstart",
          (e) => this.handleCardDragStart(e, ROOT_CARD_ORDER_KEY, cardModel.title)
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
        const isHeaderFocused = isFocusedCard && this.focusedItemKey === CARD_HEADER_KEY;
        const rootHeader = cardEl.createDiv({
          cls: "fb-card-header" + (isHeaderFocused ? " is-header-focused" : ""),
          attr: { draggable: "true" }
        });
        const titleWrap = rootHeader.createDiv({ cls: "fb-card-title-wrap" });
        const iconEl = titleWrap.createSpan({ cls: "fb-native-icon" });
        (0, import_obsidian5.setIcon)(iconEl, "inbox");
        titleWrap.createSpan({ cls: "fb-card-title", text: cardModel.title });
        titleWrap.createSpan({ cls: "fb-root-pill", text: i18n.directPill() });
        const metaEl = rootHeader.createDiv({ cls: "fb-card-meta" });
        metaEl.createSpan({
          cls: "fb-count",
          text: this.formatFlowCountLabel(cardModel, isScrollableWindow)
        });
        rootHeader.addEventListener(
          "dragstart",
          (e) => this.handleCardDragStart(e, ROOT_CARD_ORDER_KEY, cardModel.title)
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
        (0, import_obsidian5.setIcon)(sectionCaret, "chevron-down");
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
        attr: { "aria-label": i18n.openItemAria(cardModel.title) }
      });
      (0, import_obsidian5.setIcon)(drillBtn, "arrow-right");
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
    if (!isFlowMode) {
      const resizeBottom = cardEl.createDiv({
        cls: "fb-card-resize-bottom",
        attr: { "aria-label": i18n.cardHeightResizeAria() }
      });
      resizeBottom.addEventListener("dblclick", (e) => {
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
      resizeBottom.addEventListener("pointerdown", (e) => {
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
        const onMove = (ev) => {
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
          const label = isAtMin ? i18n.cardRowUnitsMinBadge(latestUnits) : this.formatCardRowUnitsLabel(latestUnits);
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
      listEl.createDiv({ cls: "fb-empty-card", text: i18n.emptyCard() });
      return listEl;
    }
    const startIdx = isScrollableWindow ? this.getFlowWindowOffset(cardModel) : 0;
    const endIdx = isScrollableWindow ? Math.min(cardModel.items.length, startIdx + windowLimit) : cardModel.items.length;
    this.renderCardRows(listEl, cardModel, cardIdx, isCarrying, startIdx, endIdx);
    listEl.dataset.winStart = String(startIdx);
    listEl.dataset.winEnd = String(endIdx);
    if (isResizableFlowCard) {
      const footer = cardEl.createDiv({
        cls: "fb-flow-scroll-footer" + (isScrollableWindow ? "" : " is-unscrolled"),
        attr: { "aria-label": i18n.flowFooterAria() }
      });
      const sizeBar = footer.createDiv({ cls: "fb-flow-size-bar" });
      const dragHandle = sizeBar.createSpan({
        cls: "fb-flow-drag-handle",
        attr: { "aria-label": i18n.flowDragHandleAria() }
      });
      (0, import_obsidian5.setIcon)(dragHandle, "chevrons-up-down");
      sizeBar.createSpan({ cls: "fb-flow-size-sep" });
      const sizePresets = [
        { spec: "sm", label: i18n.flowPresetSm(), aria: i18n.flowPresetSmAria(FLOW_SIZE_SM) },
        { spec: "md", label: i18n.flowPresetMd(), aria: i18n.flowPresetMdAria(FLOW_WINDOW_SIZE) }
      ];
      if (cardModel.items.length > FLOW_WINDOW_SIZE) {
        sizePresets.push({ spec: "lg", label: i18n.flowPresetLg(), aria: i18n.flowPresetLgAria() });
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
        const maxDragLimit = Math.max(maxOneCol * FLOW_MAX_DRAG_COLS, FLOW_MAX_DRAG_ROWS);
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
        (0, import_obsidian5.setIcon)(caret, "chevron-down");
        const fIcon = row.createSpan({ cls: "fb-native-icon" });
        const fTitle = row.createSpan({ cls: "tree-item-inner nav-folder-title-content", text: item.name });
        applyNativeDecoration(this.app, item.path, fIcon, fTitle, "folder", Boolean(item.expanded));
        if (item.childCount !== void 0) {
          row.createSpan({ cls: "fb-row-count", text: String(item.childCount) });
        }
        if (isFlowMode) {
          const rowDrillBtn = row.createEl("button", {
            cls: "clickable-icon fb-row-drill-btn",
            attr: { "aria-label": i18n.openItemAria(item.name) }
          });
          (0, import_obsidian5.setIcon)(rowDrillBtn, "arrow-right");
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
      const label = abs instanceof import_obsidian5.TFile && abs.extension === "md" ? abs.basename : abs.name;
      chip.createSpan({ text: label });
      const rm = chip.createEl("button", { cls: "clickable-icon fb-shelf-chip-rm" });
      (0, import_obsidian5.setIcon)(rm, "x");
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
      this.selectionCountEl.setText(i18n.selectedCount(count));
    }
  }
  renderCarryPill() {
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
      const label = this.clipboardMode === "copy" ? i18n.clipboardCopied(this.clipboardPaths.length) : i18n.clipboardCut(this.clipboardPaths.length);
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
  // [ID 6.5.63] 보드(Tab) ↔ 우측 분할 빠른 편집기(Esc) 원키 포커스 왕복
  // -> 일반 마크다운 탭에는 일절 개입하지 않고 오직 quickEditLeaf 내부에서 오버레이/검색창/IME 조합이 없을 때만 Esc로 보드 복귀함.
  focusQuickEditLeaf() {
    if (!this.isQuickEditLeafAlive() || !this.quickEditLeaf) return;
    const targetLeaf = this.quickEditLeaf;
    this.app.workspace.setActiveLeaf(targetLeaf, { focus: true });
    this.syncScopeState();
    requestAnimationFrame(() => {
      const view = targetLeaf.view;
      if (view instanceof import_obsidian5.MarkdownView && view.editor) {
        view.editor.focus();
      } else {
        const cmContent = view?.containerEl?.querySelector(".cm-content");
        if (cmContent) cmContent.focus();
      }
    });
  }
  handleQuickEditEscKeydown(e) {
    if (e.key !== "Escape" || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    if (e.isComposing || e.keyCode === 229) return;
    if (!this.quickLookOpen || !this.isQuickEditLeafAlive() || !this.quickEditLeaf) return;
    if (!this.containerEl.isConnected || this.containerEl.offsetParent === null) return;
    const vaultConfig = this.app.vault.getConfig;
    if (vaultConfig && Boolean(vaultConfig.call(this.app.vault, "vimMode"))) return;
    if (document.querySelector(".modal-container, .suggestion-container, .menu, .prompt")) return;
    const quickEl = this.quickEditLeaf.view?.containerEl;
    if (!quickEl) return;
    const targetNode = e.target instanceof Node ? e.target : document.activeElement;
    if (targetNode instanceof HTMLElement && targetNode.closest(".document-search-container")) return;
    const inQuickLeaf = targetNode instanceof Node && quickEl.contains(targetNode) || targetNode === document.body && this.app.workspace.getActiveViewOfType(import_obsidian5.ItemView)?.leaf === this.quickEditLeaf;
    if (!inQuickLeaf) return;
    const quickView = this.quickEditLeaf.view;
    if (quickView instanceof import_obsidian5.MarkdownView && quickView.editor) {
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
      if (this.plugin.settings.gridCols === "horizontal") {
        const activeCardEl = this.gridEl.querySelector(
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
  // [ID 6.5.8] 노트 열기 (미리보기 분할창 우선 정리 · 핀 고정 시 옆 비고정 탭 재사용 / 미고정 시 동일 탭 히스토리 보존)
  // -> Space 미리보기가 열린 상태에서 Enter·더블클릭으로 노트에 진입하면 우측 분할 편집기를 먼저 닫아 분할 잔류를 방지하고,
  // -> 탭이 고정(Pinned)된 상태에서는 보드를 덮어쓰지 않고 옆 작업 탭에서 열어 보드를 상시 유지함.
  async openFile(file, forceNewTab = false) {
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
      const targetLeaf = unpinned && unpinned !== this.leaf && unpinned !== this.quickEditLeaf ? unpinned : this.app.workspace.getLeaf("tab");
      await targetLeaf.openFile(file, { active: true });
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
      title: i18n.newNote(),
      placeholder: i18n.noteTitlePlaceholder(),
      destinationLabel: destLabel,
      confirmLabel: i18n.create(),
      onSubmit: async (rawName) => {
        const cleanName = rawName.endsWith(".md") ? rawName : `${rawName}.md`;
        const fullPath = (0, import_obsidian5.normalizePath)(targetFolderPath ? `${targetFolderPath}/${cleanName}` : cleanName);
        if (this.app.vault.getAbstractFileByPath(fullPath)) {
          new import_obsidian5.Notice(i18n.fileAlreadyExists());
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
          new import_obsidian5.Notice(i18n.createNoteFailed(err instanceof Error ? err.message : String(err)));
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
      title: i18n.newFolder(),
      placeholder: i18n.folderNamePlaceholder(),
      destinationLabel: destLabel,
      confirmLabel: i18n.create(),
      onSubmit: async (rawName) => {
        const fullPath = (0, import_obsidian5.normalizePath)(targetFolderPath ? `${targetFolderPath}/${rawName}` : rawName);
        if (this.app.vault.getAbstractFileByPath(fullPath)) {
          new import_obsidian5.Notice(i18n.folderAlreadyExists());
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
          new import_obsidian5.Notice(i18n.createFolderFailed(err instanceof Error ? err.message : String(err)));
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
    if (target instanceof import_obsidian5.TFolder && target.isRoot()) return;
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
    if (!titleEl && target instanceof import_obsidian5.TFolder) {
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
    const isMd = target instanceof import_obsidian5.TFile && target.extension === "md";
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
        new import_obsidian5.Notice(i18n.invalidNameChars());
        return;
      }
      const finalName = isMd && !rawName.endsWith(".md") ? `${rawName}.md` : rawName;
      const parentPath = normalizeFolderRef(target.parent);
      const destPath = (0, import_obsidian5.normalizePath)(parentPath ? `${parentPath}/${finalName}` : finalName);
      if (destPath === target.path) return;
      if (this.app.vault.getAbstractFileByPath(destPath)) {
        new import_obsidian5.Notice(i18n.sameNameExists());
        return;
      }
      try {
        await this.app.fileManager.renameFile(target, destPath);
        if (!isCardHeader) {
          this.focusedItemKey = target instanceof import_obsidian5.TFolder ? `folder:${destPath}` : `file:${destPath}`;
        }
        this.renderAll();
        this.scrollFocusedIntoView();
      } catch (err) {
        new import_obsidian5.Notice(i18n.renameFailed(err instanceof Error ? err.message : String(err)));
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
    const isMd = target instanceof import_obsidian5.TFile && target.extension === "md";
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
        const destPath = (0, import_obsidian5.normalizePath)(parentPath ? `${parentPath}/${finalName}` : finalName);
        if (destPath === target.path) return;
        if (this.app.vault.getAbstractFileByPath(destPath)) {
          new import_obsidian5.Notice(i18n.sameNameExists());
          return;
        }
        try {
          await this.app.fileManager.renameFile(target, destPath);
          this.renderAll();
        } catch (err) {
          new import_obsidian5.Notice(i18n.renameFailed(err instanceof Error ? err.message : String(err)));
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
    if (!target || target instanceof import_obsidian5.TFolder && target.isRoot()) return;
    this.promptRename(target);
  }
  async deleteFocusedOrSelected() {
    const paths = this.resolveCarrySourcePaths();
    if (paths.length === 0) return;
    let deleted = 0;
    for (const p of paths) {
      const target = this.app.vault.getAbstractFileByPath(p);
      if (!target || target instanceof import_obsidian5.TFolder && target.isRoot()) continue;
      try {
        await this.app.vault.trash(target, true);
        deleted++;
      } catch {
      }
    }
    if (deleted > 0) {
      this.selectedPaths.clear();
      this.selectionAnchorIndex = null;
      new import_obsidian5.Notice(i18n.trashedItems(deleted));
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
    const isFile = item instanceof import_obsidian5.TFile;
    const base = isFile ? item.basename : item.name;
    const ext = isFile && item.extension ? `.${item.extension}` : "";
    if (!forceSuffix) {
      const direct = (0, import_obsidian5.normalizePath)(destFolderPath ? `${destFolderPath}/${base}${ext}` : `${base}${ext}`);
      if (!this.app.vault.getAbstractFileByPath(direct)) return direct;
    }
    for (let n = 1; n < 1e3; n++) {
      const candidateName = `${base} ${n}${ext}`;
      const candidate = (0, import_obsidian5.normalizePath)(destFolderPath ? `${destFolderPath}/${candidateName}` : candidateName);
      if (!this.app.vault.getAbstractFileByPath(candidate)) return candidate;
    }
    return "";
  }
  async copyAbstractItem(source, destPath) {
    if (source instanceof import_obsidian5.TFile) {
      const data = await this.app.vault.readBinary(source);
      return await this.app.vault.createBinary(destPath, data);
    }
    await this.app.vault.createFolder(destPath);
    if (source instanceof import_obsidian5.TFolder) {
      for (const child of source.children) {
        const childDest = (0, import_obsidian5.normalizePath)(`${destPath}/${child.name}`);
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
      if (target instanceof import_obsidian5.TFolder && this.isInvalidDropDest(destFolderPath, [target.path])) {
        continue;
      }
      const destPath = this.buildUniqueCopyPath(destFolderPath, target, false);
      if (!destPath) continue;
      try {
        const created = await this.copyAbstractItem(target, destPath);
        if (!firstCreatedKey) {
          firstCreatedKey = created instanceof import_obsidian5.TFolder ? `folder:${created.path}` : `file:${created.path}`;
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
      new import_obsidian5.Notice(i18n.copiedItems(copiedCount, destName));
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
        if (child instanceof import_obsidian5.TFolder) {
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
  async applyFolderCardReorder(sourceKey, targetKey, position) {
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
  getFolderRecursiveStats(folder) {
    let count = 0;
    let latestMtime = 0;
    const walk = (f) => {
      for (const child of f.children) {
        if (child instanceof import_obsidian5.TFile) {
          count += 1;
          if (child.stat.mtime > latestMtime) latestMtime = child.stat.mtime;
        } else if (child instanceof import_obsidian5.TFolder) {
          count += 1;
          walk(child);
        }
      }
    };
    walk(folder);
    return { count, latestMtime };
  }
  pickAvailableIcon(candidates, fallback = "list") {
    for (const id of candidates) {
      if ((0, import_obsidian5.getIcon)(id)) return id;
    }
    return fallback;
  }
  openFolderSortMenu(anchorEl) {
    const menu = new import_obsidian5.Menu();
    menu.addItem(
      (item) => item.setTitle(i18n.sortFolderNameAsc()).setIcon(this.pickAvailableIcon(["arrow-down-az", "arrow-down-a-z", "sort-asc", "arrow-down"])).onClick(() => {
        void this.applyOneShotFolderSort("name-asc");
      })
    );
    menu.addItem(
      (item) => item.setTitle(i18n.sortFolderNameDesc()).setIcon(this.pickAvailableIcon(["arrow-up-za", "arrow-up-z-a", "sort-desc", "arrow-up"])).onClick(() => {
        void this.applyOneShotFolderSort("name-desc");
      })
    );
    menu.addItem(
      (item) => item.setTitle(i18n.sortFolderCountDesc()).setIcon(this.pickAvailableIcon(["arrow-down-wide-narrow", "bar-chart-2", "list-ordered", "hash"])).onClick(() => {
        void this.applyOneShotFolderSort("count-desc");
      })
    );
    menu.addItem(
      (item) => item.setTitle(i18n.sortFolderMtimeDesc()).setIcon(this.pickAvailableIcon(["clock", "history"])).onClick(() => {
        void this.applyOneShotFolderSort("mtime-desc");
      })
    );
    const rect = anchorEl.getBoundingClientRect();
    menu.showAtPosition({ x: Math.round(rect.left), y: Math.round(rect.bottom + 4) });
  }
  async applyOneShotFolderSort(criterion) {
    const mode = this.plugin.settings.gridCols;
    const parentPath = this.currentFolderPath;
    if (criterion === "name-asc") {
      await this.plugin.clearFolderOrder(mode, parentPath);
      this.renderAll();
      return;
    }
    const currentFolder = parentPath ? getFolderByPath(this.app, parentPath) : this.app.vault.getRoot();
    if (!currentFolder) return;
    const childFolders = currentFolder.children.filter((c) => c instanceof import_obsidian5.TFolder);
    const hasRootFiles = currentFolder.children.some((c) => c instanceof import_obsidian5.TFile);
    const statsMap = /* @__PURE__ */ new Map();
    if (criterion === "count-desc" || criterion === "mtime-desc") {
      for (const f of childFolders) {
        statsMap.set(f.path, this.getFolderRecursiveStats(f));
      }
    }
    childFolders.sort((a, b) => {
      if (criterion === "name-desc") {
        return b.name.localeCompare(a.name, void 0, { numeric: true });
      }
      if (criterion === "count-desc") {
        const ca = statsMap.get(a.path)?.count ?? 0;
        const cb = statsMap.get(b.path)?.count ?? 0;
        if (cb !== ca) return cb - ca;
        return a.name.localeCompare(b.name, void 0, { numeric: true });
      }
      const ma = statsMap.get(a.path)?.latestMtime ?? 0;
      const mb = statsMap.get(b.path)?.latestMtime ?? 0;
      if (mb !== ma) return mb - ma;
      return a.name.localeCompare(b.name, void 0, { numeric: true });
    });
    const orderedKeys = [];
    if (hasRootFiles) orderedKeys.push(ROOT_CARD_ORDER_KEY);
    for (const f of childFolders) {
      orderedKeys.push(normalizeFolderRef(f));
    }
    await this.plugin.setFolderOrder(mode, parentPath, orderedKeys);
    this.renderAll();
  }
  async shiftFolderCardOrder(delta) {
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
    const label = firstItem ? firstItem instanceof import_obsidian5.TFile && firstItem.extension === "md" ? firstItem.basename : firstItem.name : path;
    const ghost = document.body.createDiv({
      cls: "fb-drag-ghost",
      text: this.activeDragPaths.length > 1 ? i18n.dragGhostMulti(label, this.activeDragPaths.length - 1) : label
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
      if (target instanceof import_obsidian5.TFolder && this.isInvalidDropDest(destFolderPath, [target.path])) {
        skipped++;
        continue;
      }
      const currentParent = normalizeFolderRef(target.parent);
      if (currentParent === destFolderPath) continue;
      const destPath = (0, import_obsidian5.normalizePath)(destFolderPath ? `${destFolderPath}/${target.name}` : target.name);
      if (this.app.vault.getAbstractFileByPath(destPath)) {
        skipped++;
        continue;
      }
      try {
        await this.app.fileManager.renameFile(target, destPath);
        if (moves.length === 0) {
          firstMovedType = target instanceof import_obsidian5.TFolder ? "folder" : "file";
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
      new import_obsidian5.Notice(i18n.movedItems(moves.length, destName));
      this.renderAll();
      this.scrollFocusedIntoView();
    } else if (skipped > 0) {
      new import_obsidian5.Notice(i18n.moveFailedConflict());
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
      new import_obsidian5.Notice(i18n.undidMove(restored));
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
  // [ID 6.5.24] Vertical · Horizontal · Flow 모드에서 동일 열의 바로 위·아래 카드/섹션 탐색
  // -> getBoundingClientRect() 화면 좌표를 사용해 세로·가로 스크롤 그리드 양쪽에서 동일 열 카드만 정확히 매칭함.
  findVerticalNeighborCard(cardIdx, direction) {
    if (this.plugin.settings.verticalEdgeBehavior !== "adaptive") return -1;
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
  // [ID 6.5.65] Vertical/Horizontal 다단 카드 모드 공간 좌표 기반 좌/우 인접 카드 탐색
  // -> Horizontal(column dense) 및 높이 가변 그리드에서도 인덱스 순서가 아닌 실제 시각적 좌/우 카드로 자연 이동함.
  findCardHorizontalNeighbor(cardIdx, direction) {
    const cardEls = Array.from(this.gridEl.querySelectorAll(".fb-card"));
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
      if (colDist < bestColDist - colThreshold || Math.abs(colDist - bestColDist) <= colThreshold && rowDist < bestRowDist) {
        bestColDist = colDist;
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
    if (!meta && !e.altKey && (e.key === "?" || e.shiftKey && code === "Slash")) {
      e.preventDefault();
      e.stopPropagation();
      this.openShortcutHelpModal();
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
    const curFocusedCard = this.renderedCards[this.focusedCardIndex];
    if (e.shiftKey && !meta && !e.altKey && (this.focusedItemKey === CARD_HEADER_KEY || Boolean(curFocusedCard?.isRootCard)) && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
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
      const spatialCardIdx = this.findCardHorizontalNeighbor(this.focusedCardIndex, dir);
      const delta = dir === "right" ? 1 : -1;
      const nextIdx = spatialCardIdx >= 0 ? spatialCardIdx : (this.focusedCardIndex + delta + this.renderedCards.length) % this.renderedCards.length;
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
            this.focusCardHeader(this.focusedCardIndex);
          }
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
    if (!meta && !e.altKey && !e.shiftKey && e.key === "Tab") {
      if (this.quickLookOpen && this.isQuickEditLeafAlive()) {
        e.preventDefault();
        e.stopPropagation();
        this.focusQuickEditLeaf();
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
var import_obsidian6 = require("obsidian");
var FolderBoardSettingTab = class extends import_obsidian6.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new import_obsidian6.Setting(containerEl).setName(i18n.settingLanguageName()).setDesc(i18n.settingLanguageDesc()).addDropdown(
      (dd) => dd.addOption("auto", i18n.settingLanguageAuto()).addOption("en", i18n.settingLanguageEn()).addOption("ko", i18n.settingLanguageKo()).setValue(this.plugin.settings.languageMode).onChange(async (value) => {
        await this.plugin.setLanguageModeSetting(value);
        this.display();
      })
    );
    new import_obsidian6.Setting(containerEl).setName(i18n.settingCmdAliasName()).setDesc(i18n.settingCmdAliasDesc()).addText(
      (text) => text.setPlaceholder(i18n.settingCmdAliasPlaceholder()).setValue(this.plugin.settings.openCommandAlias).onChange(async (value) => {
        this.plugin.settings.openCommandAlias = value;
        this.plugin.syncCommandNames();
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian6.Setting(containerEl).setName(i18n.settingLayoutName()).setDesc(i18n.settingLayoutDesc()).addDropdown(
      (dd) => dd.addOption("flow", i18n.settingLayoutFlow()).addOption("vertical", i18n.settingLayoutVertical()).addOption("horizontal", i18n.settingLayoutHorizontal()).setValue(this.plugin.settings.gridCols).onChange(async (value) => {
        this.plugin.settings.gridCols = value;
        await this.plugin.saveSettings();
        this.plugin.refreshOpenViews();
      })
    );
    new import_obsidian6.Setting(containerEl).setName(i18n.settingSortName()).addDropdown(
      (dd) => dd.addOption("name", i18n.settingSortOptName()).addOption("mtime", i18n.settingSortOptMtime()).setValue(this.plugin.settings.sortBy).onChange(async (value) => {
        this.plugin.settings.sortBy = value;
        await this.plugin.saveSettings();
        this.plugin.refreshOpenViews();
      })
    );
    new import_obsidian6.Setting(containerEl).setName(i18n.settingOpenBehaviorName()).addDropdown(
      (dd) => dd.addOption("same-tab", i18n.settingOpenSameTab()).addOption("new-tab", i18n.settingOpenNewTab()).setValue(this.plugin.settings.openBehavior).onChange(async (value) => {
        this.plugin.settings.openBehavior = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian6.Setting(containerEl).setName(i18n.settingAutoPinName()).setDesc(i18n.settingAutoPinDesc()).addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.autoPinTab).onChange(async (value) => {
        this.plugin.settings.autoPinTab = value;
        await this.plugin.saveSettings();
        this.plugin.syncOpenBoardPinState(value);
      })
    );
    new import_obsidian6.Setting(containerEl).setName(i18n.settingAutoCollapseName()).setDesc(i18n.settingAutoCollapseDesc()).addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.autoCollapseLeftSidebar).onChange(async (value) => {
        await this.plugin.setAutoCollapseLeftSidebar(value);
      })
    );
    new import_obsidian6.Setting(containerEl).setName(i18n.settingEdgeBehaviorName()).setDesc(i18n.settingEdgeBehaviorDesc()).addDropdown(
      (dd) => dd.addOption("adaptive", i18n.settingEdgeAdaptive()).addOption("loop", i18n.settingEdgeLoop()).setValue(this.plugin.settings.verticalEdgeBehavior).onChange(async (value) => {
        this.plugin.settings.verticalEdgeBehavior = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian6.Setting(containerEl).setName(i18n.settingResetOrderName()).setDesc(i18n.settingResetOrderDesc()).addButton(
      (btn) => btn.setButtonText(i18n.reset()).onClick(async () => {
        await this.plugin.resetAllFolderOrders();
        this.plugin.refreshOpenViews();
      })
    );
    new import_obsidian6.Setting(containerEl).setName(i18n.settingResetExpandedName()).addButton(
      (btn) => btn.setButtonText(i18n.reset()).onClick(async () => {
        await this.plugin.resetAllExpandedStates();
        this.plugin.refreshOpenViews();
      })
    );
    new import_obsidian6.Setting(containerEl).setName(i18n.settingShortcutsHeading()).setHeading();
    const shortcutWrap = containerEl.createDiv({ cls: "fb-settings-shortcuts" });
    renderShortcutsGrid(shortcutWrap);
  }
};

// src/types.ts
var DEFAULT_SETTINGS = {
  languageMode: "auto",
  gridCols: "flow",
  sortBy: "name",
  openBehavior: "same-tab",
  verticalEdgeBehavior: "adaptive",
  expandedFolders: [],
  folderOrderByMode: { flow: {}, vertical: {}, horizontal: {} },
  collapsedFlowSections: [],
  flowWindowSizes: {},
  flowColumnWidth: 270,
  quickLookSplitRatio: 0.4,
  openCommandAlias: "",
  verticalCols: 3,
  horizontalCols: 3,
  cardRowUnitsByMode: { vertical: {}, horizontal: {} },
  autoPinTab: true,
  autoCollapseLeftSidebar: false
};

// src/main.ts
var FolderBoardPlugin = class extends import_obsidian7.Plugin {
  constructor() {
    super(...arguments);
    this.settings = { ...DEFAULT_SETTINGS };
    this.expandedSet = /* @__PURE__ */ new Set();
    this.collapsedFlowSet = /* @__PURE__ */ new Set();
    this.openBoardCmd = null;
    this.openBoardHereCmd = null;
    // [ID 6.6.13] Folder Board 활성 시 좌측 사이드바 자동 접힘/복원 상태 추적
    // -> 보드가 직접 접었을 때만(leftSidebarCollapsedByBoard) 다른 탭 전환 시 복원해 수동 접힘 상태를 존중함.
    this.leftSidebarCollapsedByBoard = false;
    this.lastBoardVisible = false;
    this.sidebarSyncRaf = null;
  }
  async onload() {
    await this.loadSettings();
    this.registerView(VIEW_TYPE_FOLDER_BOARD, (leaf) => new FolderBoardView(leaf, this));
    this.addRibbonIcon("layout-grid", "Folder Board", () => {
      void this.activateBoardView();
    });
    this.openBoardCmd = this.addCommand({
      id: "open-folder-board",
      name: this.buildOpenCommandLabel(false),
      hotkeys: [{ modifiers: ["Mod", "Shift"], key: "e" }],
      callback: () => {
        void this.activateBoardView();
      }
    });
    this.openBoardHereCmd = this.addCommand({
      id: "open-folder-board-here",
      name: this.buildOpenCommandLabel(true),
      callback: () => {
        const active = this.app.workspace.getActiveFile();
        const folderPath = active?.parent && !active.parent.isRoot() ? active.parent.path : "";
        void this.activateBoardView(folderPath);
      }
    });
    this.addSettingTab(new FolderBoardSettingTab(this.app, this));
    this.app.workspace.onLayoutReady(() => {
      this.injectFileExplorerLaunchButtons();
      this.scheduleLeftSidebarSync();
    });
    this.registerEvent(
      this.app.workspace.on("layout-change", () => {
        this.injectFileExplorerLaunchButtons();
        this.scheduleLeftSidebarSync();
      })
    );
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        this.scheduleLeftSidebarSync();
      })
    );
  }
  // [ID 6.6.13] Folder Board 가시성 기준 좌측 사이드바 스마트 자동 접힘·복원
  // -> 1) 수동 접힘 존중(직접 접어둔 사이드바는 나갔다 와도 안 펼침),
  // -> 2) Space 우측 분할 편집기 편집 중에는 보드가 여전히 화면에 보이므로 사이드바가 튀어나오지 않음,
  // -> 3) 보드 화면에서 사용자가 직접 사이드바를 펼치면 재접힘하지 않음.
  getDesktopLeftSplit() {
    const split = this.app.workspace.leftSplit;
    return split instanceof import_obsidian7.WorkspaceSidedock ? split : null;
  }
  isAnyFolderBoardVisible() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FOLDER_BOARD);
    for (const leaf of leaves) {
      if (leaf.getRoot() !== this.app.workspace.rootSplit) continue;
      const el = leaf.view?.containerEl;
      if (el && el.isConnected && el.offsetParent !== null) {
        return true;
      }
    }
    return false;
  }
  scheduleLeftSidebarSync() {
    if (this.sidebarSyncRaf !== null) {
      window.cancelAnimationFrame(this.sidebarSyncRaf);
    }
    this.sidebarSyncRaf = window.requestAnimationFrame(() => {
      this.sidebarSyncRaf = null;
      this.syncLeftSidebarAutoCollapse();
    });
  }
  syncLeftSidebarAutoCollapse() {
    const leftSplit = this.getDesktopLeftSplit();
    const nowVisible = this.isAnyFolderBoardVisible();
    const wasVisible = this.lastBoardVisible;
    this.lastBoardVisible = nowVisible;
    if (!leftSplit) return;
    if (!this.settings.autoCollapseLeftSidebar) {
      if (this.leftSidebarCollapsedByBoard) {
        leftSplit.expand();
        this.leftSidebarCollapsedByBoard = false;
      }
      return;
    }
    if (nowVisible && !wasVisible) {
      if (!leftSplit.collapsed) {
        leftSplit.collapse();
        this.leftSidebarCollapsedByBoard = true;
      } else {
        this.leftSidebarCollapsedByBoard = false;
      }
    } else if (!nowVisible && wasVisible) {
      if (this.leftSidebarCollapsedByBoard) {
        leftSplit.expand();
        this.leftSidebarCollapsedByBoard = false;
      }
    } else if (nowVisible && !leftSplit.collapsed) {
      this.leftSidebarCollapsedByBoard = false;
    }
  }
  async setAutoCollapseLeftSidebar(enabled) {
    this.settings.autoCollapseLeftSidebar = enabled;
    await this.saveSettings();
    const leftSplit = this.getDesktopLeftSplit();
    if (leftSplit) {
      if (enabled && this.isAnyFolderBoardVisible()) {
        if (!leftSplit.collapsed) {
          leftSplit.collapse();
          this.leftSidebarCollapsedByBoard = true;
        }
      } else if (!enabled && this.leftSidebarCollapsedByBoard) {
        leftSplit.expand();
        this.leftSidebarCollapsedByBoard = false;
      }
    }
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_FOLDER_BOARD)) {
      if (leaf.view instanceof FolderBoardView) {
        leaf.view.syncSidebarCollapseButtonState();
      }
    }
  }
  // [ID 6.6.11] 옵시디언 기본 탐색기 헤더 버튼 주입 및 언로드 정리
  // -> .nav-buttons-container 맨 뒤에 네이티브 클래스로 1개만 추가해 테마·타 플러그인 버튼과 자연스럽게 어우러짐.
  injectFileExplorerLaunchButtons() {
    const leaves = this.app.workspace.getLeavesOfType("file-explorer");
    for (const leaf of leaves) {
      const buttonsEl = leaf.view.containerEl.querySelector(".nav-header .nav-buttons-container");
      if (!buttonsEl || buttonsEl.querySelector(".fb-explorer-launch-btn")) continue;
      const btn = buttonsEl.createDiv({
        cls: "clickable-icon nav-action-button fb-explorer-launch-btn",
        attr: { "aria-label": i18n.explorerLaunchAria() }
      });
      (0, import_obsidian7.setIcon)(btn, "layout-grid");
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.metaKey || e.ctrlKey) {
          const active = this.app.workspace.getActiveFile();
          const folderPath = active?.parent && !active.parent.isRoot() ? active.parent.path : "";
          void this.activateBoardView(folderPath);
        } else {
          void this.activateBoardView();
        }
      });
    }
  }
  removeFileExplorerLaunchButtons() {
    document.querySelectorAll(".fb-explorer-launch-btn").forEach((el) => el.remove());
  }
  // [ID 6.6.9] 커맨드 팔레트(Cmd+P) 사용자 지정 문구 및 언어 즉시 반영 (핫키 ID 보존)
  // -> 한국어 환경에서는 기본 한글 별칭("폴더 보드 열기")을 자동 부가하고, 영문 환경에서는 깔끔한 영문 라벨을 표시함.
  buildOpenCommandLabel(inCurrentFolder) {
    const rawAlias = (this.settings.openCommandAlias || "").trim();
    const effectiveAlias = rawAlias ? !isKoreanLocale() && rawAlias === "\uD3F4\uB354 \uBCF4\uB4DC \uC5F4\uAE30" ? "" : rawAlias : i18n.defaultCommandAlias();
    if (!inCurrentFolder) {
      return effectiveAlias ? `Open 2D Folder Board \xB7 ${effectiveAlias}` : "Open 2D Folder Board";
    }
    return effectiveAlias ? `Open 2D Folder Board in current folder \xB7 ${effectiveAlias} (${i18n.currentFolderSuffix()})` : "Open 2D Folder Board in current folder";
  }
  syncCommandNames() {
    const prefix = `${this.manifest.name}: `;
    if (this.openBoardCmd) {
      this.openBoardCmd.name = `${prefix}${this.buildOpenCommandLabel(false)}`;
    }
    if (this.openBoardHereCmd) {
      this.openBoardHereCmd.name = `${prefix}${this.buildOpenCommandLabel(true)}`;
    }
  }
  // [ID 6.6.16] 언어 설정 변경 시 재시작 없이 명령어·탐색기 버튼·열린 보드 뷰 일괄 갱신
  async setLanguageModeSetting(mode) {
    this.settings.languageMode = mode;
    setLanguageMode(mode);
    await this.saveSettings();
    this.syncCommandNames();
    document.querySelectorAll(".fb-explorer-launch-btn").forEach((el) => {
      el.setAttr("aria-label", i18n.explorerLaunchAria());
    });
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_FOLDER_BOARD)) {
      if (leaf.view instanceof FolderBoardView) {
        leaf.view.syncLocaleLabels();
        leaf.view.refresh();
      }
    }
  }
  onunload() {
    if (this.sidebarSyncRaf !== null) {
      window.cancelAnimationFrame(this.sidebarSyncRaf);
      this.sidebarSyncRaf = null;
    }
    if (this.leftSidebarCollapsedByBoard) {
      this.getDesktopLeftSplit()?.expand();
      this.leftSidebarCollapsedByBoard = false;
    }
    this.removeFileExplorerLaunchButtons();
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
      if (this.settings.autoPinTab) {
        leaf.setPinned(true);
      }
    }
    if (leaf.getRoot() !== this.app.workspace.rootSplit) {
      this.app.workspace.revealLeaf(leaf);
    }
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
  syncOpenBoardPinState(pinned) {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_FOLDER_BOARD)) {
      leaf.setPinned(pinned);
      if (leaf.view instanceof FolderBoardView) {
        leaf.view.syncPinButtonState();
      }
    }
  }
  async loadSettings() {
    const saved = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, saved);
    const rawLayout = saved?.gridCols;
    if (rawLayout === 2 || rawLayout === 3 || rawLayout === 4) {
      this.settings.gridCols = "vertical";
      if (typeof saved?.verticalCols !== "number") {
        this.settings.verticalCols = rawLayout;
      }
    } else if (rawLayout === "auto") {
      this.settings.gridCols = "vertical";
    } else if (rawLayout === "scroll") {
      this.settings.gridCols = "horizontal";
    } else if (this.settings.gridCols !== "flow" && this.settings.gridCols !== "vertical" && this.settings.gridCols !== "horizontal") {
      this.settings.gridCols = DEFAULT_SETTINGS.gridCols;
    }
    if (typeof this.settings.verticalCols !== "number" || !Number.isFinite(this.settings.verticalCols)) {
      this.settings.verticalCols = DEFAULT_SETTINGS.verticalCols;
    } else {
      this.settings.verticalCols = Math.max(1, Math.min(6, Math.round(this.settings.verticalCols)));
    }
    if (typeof this.settings.horizontalCols !== "number" || !Number.isFinite(this.settings.horizontalCols)) {
      this.settings.horizontalCols = DEFAULT_SETTINGS.horizontalCols;
    } else {
      this.settings.horizontalCols = Math.max(1, Math.min(6, Math.round(this.settings.horizontalCols)));
    }
    const savedUnitsByMode = saved?.cardRowUnitsByMode;
    this.settings.cardRowUnitsByMode = {
      vertical: savedUnitsByMode?.vertical && typeof savedUnitsByMode.vertical === "object" ? { ...savedUnitsByMode.vertical } : {},
      horizontal: savedUnitsByMode?.horizontal && typeof savedUnitsByMode.horizontal === "object" ? { ...savedUnitsByMode.horizontal } : {}
    };
    if (saved?.cardRowUnits && typeof saved.cardRowUnits === "object") {
      for (const [k, v] of Object.entries(saved.cardRowUnits)) {
        if (typeof v === "number" && Number.isFinite(v) && !(k in this.settings.cardRowUnitsByMode.vertical)) {
          this.settings.cardRowUnitsByMode.vertical[k] = v;
        }
      }
      delete this.settings.cardRowUnits;
    }
    if (Array.isArray(this.settings.tallGridCards) && this.settings.tallGridCards.length > 0) {
      for (const k of this.settings.tallGridCards) {
        if (!(k in this.settings.cardRowUnitsByMode.vertical)) {
          this.settings.cardRowUnitsByMode.vertical[k] = 12;
        }
      }
      delete this.settings.tallGridCards;
    }
    const savedOrderByMode = saved?.folderOrderByMode;
    this.settings.folderOrderByMode = {
      flow: savedOrderByMode?.flow && typeof savedOrderByMode.flow === "object" ? { ...savedOrderByMode.flow } : {},
      vertical: savedOrderByMode?.vertical && typeof savedOrderByMode.vertical === "object" ? { ...savedOrderByMode.vertical } : {},
      horizontal: savedOrderByMode?.horizontal && typeof savedOrderByMode.horizontal === "object" ? { ...savedOrderByMode.horizontal } : {}
    };
    if (saved?.folderOrder && typeof saved.folderOrder === "object") {
      const legacyEntries = Object.entries(saved.folderOrder);
      if (legacyEntries.length > 0) {
        for (const mode of ["flow", "vertical", "horizontal"]) {
          if (Object.keys(this.settings.folderOrderByMode[mode]).length === 0) {
            for (const [parentKey, list] of legacyEntries) {
              if (Array.isArray(list)) {
                this.settings.folderOrderByMode[mode][parentKey] = [...list];
              }
            }
          }
        }
      }
      delete this.settings.folderOrder;
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
    if (this.settings.languageMode !== "auto" && this.settings.languageMode !== "en" && this.settings.languageMode !== "ko") {
      this.settings.languageMode = DEFAULT_SETTINGS.languageMode;
    }
    setLanguageMode(this.settings.languageMode);
    if (typeof this.settings.openCommandAlias !== "string") {
      this.settings.openCommandAlias = DEFAULT_SETTINGS.openCommandAlias;
    }
    if (typeof this.settings.autoPinTab !== "boolean") {
      this.settings.autoPinTab = DEFAULT_SETTINGS.autoPinTab;
    }
    if (typeof this.settings.autoCollapseLeftSidebar !== "boolean") {
      this.settings.autoCollapseLeftSidebar = DEFAULT_SETTINGS.autoCollapseLeftSidebar;
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
  // [ID 6.6.10] Vertical/Horizontal 모드별 독립 12분할 카드 높이(3=1/4 .. 12=전체) 영속 관리
  getCardRowUnits(mode, key) {
    const v = this.settings.cardRowUnitsByMode[mode]?.[key];
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  }
  async setCardRowUnits(mode, key, units) {
    const bucket = this.settings.cardRowUnitsByMode[mode];
    if (units === null) {
      delete bucket[key];
    } else {
      bucket[key] = units;
    }
    await this.saveSettings();
  }
  async resetAllExpandedStates() {
    this.expandedSet.clear();
    this.collapsedFlowSet.clear();
    this.settings.cardRowUnitsByMode = { vertical: {}, horizontal: {} };
    this.settings.flowWindowSizes = {};
    await this.saveSettings();
  }
  async resetAllFolderOrders() {
    this.settings.folderOrderByMode = { flow: {}, vertical: {}, horizontal: {} };
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
    for (const cardMode of ["vertical", "horizontal"]) {
      const bucket = this.settings.cardRowUnitsByMode[cardMode];
      if (oldPath in bucket) {
        bucket[newPath] = bucket[oldPath];
        delete bucket[oldPath];
        changed = true;
      }
    }
    if (oldPath in this.settings.flowWindowSizes) {
      this.settings.flowWindowSizes[newPath] = this.settings.flowWindowSizes[oldPath];
      delete this.settings.flowWindowSizes[oldPath];
      changed = true;
    }
    for (const layoutMode of ["flow", "vertical", "horizontal"]) {
      const prevMap = this.settings.folderOrderByMode[layoutMode];
      const nextOrder = {};
      for (const [parentKey, list] of Object.entries(prevMap)) {
        const updatedParent = parentKey === oldPath ? newPath : parentKey;
        const updatedList = list.map((p) => p === oldPath ? newPath : p);
        if (updatedParent !== parentKey || updatedList.some((v, i) => v !== list[i])) {
          changed = true;
        }
        nextOrder[updatedParent] = updatedList;
      }
      this.settings.folderOrderByMode[layoutMode] = nextOrder;
    }
    if (changed) await this.saveSettings();
  }
  getFolderOrder(mode, parentPath) {
    return this.settings.folderOrderByMode[mode]?.[parentPath] || [];
  }
  async setFolderOrder(mode, parentPath, orderedPaths) {
    this.settings.folderOrderByMode[mode][parentPath] = orderedPaths;
    await this.saveSettings();
  }
  async clearFolderOrder(mode, parentPath) {
    delete this.settings.folderOrderByMode[mode][parentPath];
    await this.saveSettings();
  }
};

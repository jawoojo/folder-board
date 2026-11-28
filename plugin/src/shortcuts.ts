// [ID 6.8] Folder Board 단축키 치트시트 공용 데이터 · 렌더러 · ? 도움말 모달 (한/영 i18n 지원)
// -> 보드 내 ? 키 모달과 플러그인 설정 탭 하단 단축키 표가 단일 소스(SSOT)를 공유해 항상 최신 단축키를 표시함.
import { App, Modal } from "obsidian";
import { i18n, tr } from "./i18n";

export interface ShortcutItem {
  keys: string[];
  desc: string;
}

export interface ShortcutGroup {
  title: string;
  items: ShortcutItem[];
}

export function getShortcutGroups(): ShortcutGroup[] {
  return [
    {
      title: tr("탐색 & 열기", "Navigate & Open"),
      items: [
        { keys: ["↑", "↓", "←", "→"], desc: tr("항목 · 카드 · 인접 열 이동", "Move across items, cards, and columns") },
        { keys: ["⌘/Ctrl", "←/→"], desc: tr("첫 번째 · 마지막 카드로 점프", "Jump to first / last card") },
        { keys: ["⌘/Ctrl", "↑/↓"], desc: tr("현재 카드 맨 위 · 맨 아래로 점프", "Jump to top / bottom of current card") },
        { keys: ["1 ~ 9"], desc: tr("N번째 카드로 즉시 점프", "Jump to Nth card") },
        { keys: ["Enter"], desc: tr("노트 열기 / 폴더 안으로 진입", "Open note / enter folder") },
        { keys: ["⌘/Ctrl", "Enter"], desc: tr("새 탭에서 노트 열기", "Open note in new tab") },
        { keys: ["Backspace"], desc: tr("상위 폴더로 이동", "Go to parent folder") },
        { keys: ["⌘/Ctrl", "F"], desc: tr("보드 내 검색 (또는 /)", "Search in board (or /)") },
        { keys: ["?"], desc: tr("단축키 도움말 열기 · 닫기", "Toggle keyboard shortcuts") }
      ]
    },
    {
      title: tr("빠른 편집 & 접기/펼치기", "Quick Edit & Fold"),
      items: [
        {
          keys: ["Space"],
          desc: tr("파일: 1회 미리보기 · 2회 편집 진입 / 폴더: 접기·펼치기", "File: 1st preview · 2nd edit / Folder: fold toggle")
        },
        {
          keys: ["Tab / Esc"],
          desc: tr("우측 편집기 커서 진입 / 보드로 복귀 (Esc 2회 닫기)", "Focus Quick Edit / return to board (2nd Esc closes)")
        },
        { keys: ["["], desc: tr("포커스 폴더 하위 접기 (직속에서는 전체 접기)", "Collapse subfolders (or collapse all from Direct)") },
        { keys: ["]"], desc: tr("포커스 폴더 하위 펼치기 (직속에서는 전체 펼치기)", "Expand subfolders (or expand all from Direct)") },
        { keys: ["Esc"], desc: tr("선택 · 클립보드 · 들고 이동 · 분할 편집기 닫기", "Clear selection / clipboard / carry / close Quick Edit") }
      ]
    },
    {
      title: tr("파일 · 폴더 정리 & 편집", "Organize & Edit"),
      items: [
        { keys: ["Option/Alt", tr("방향키", "Arrows")], desc: tr("항목 들고 이동 (키 떼면 드롭)", "Carry & move items (release key to drop)") },
        { keys: ["Option/Alt", "1 ~ 9"], desc: tr("N번째 카드로 원키 이동", "Move directly to Nth card") },
        { keys: ["Shift", "↑/↓"], desc: tr("범위 다중 선택", "Range multi-select") },
        { keys: ["⌘/Ctrl", "A"], desc: tr("현재 카드 전체 선택", "Select all in current card") },
        { keys: ["⌘/Ctrl", "C / X / V"], desc: tr("파일 · 폴더 복사 · 잘라내기 · 붙여넣기", "Copy / cut / paste files & folders") },
        { keys: ["⌘/Ctrl", "Z"], desc: tr("마지막 이동 되돌리기", "Undo last move") },
        { keys: ["N / Shift+N"], desc: tr("포커스 폴더에 새 노트 / 새 폴더 생성", "New note / new folder in focused folder") },
        { keys: ["F2 / R"], desc: tr("제자리 이름 바꾸기", "Inline rename") },
        { keys: ["⌘/Ctrl", "⌫"], desc: tr("선택 항목 휴지통으로 삭제 (또는 Delete)", "Move selected items to trash (or Delete)") }
      ]
    },
    {
      title: tr("카드 순서 & 레이아웃 드래그 분할", "Card Order & Drag Layout"),
      items: [
        { keys: ["Shift", "←/→"], desc: tr("카드 순서 이동 (폴더 헤더 · 직속 카드)", "Reorder card (folder header / Direct card)") },
        { keys: [tr("헤더 드래그", "Drag Header")], desc: tr("카드 순서 마우스 드래그 변경", "Drag header to reorder cards") },
        {
          keys: [tr("열 사이 드래그", "Drag Col Gap")],
          desc: tr("Flow: 다단 너비 조절 · Vertical/Horizontal: 1~6열 분할", "Flow: column width · Vertical/Horizontal: 1–6 cols")
        },
        {
          keys: [tr("카드 하단 드래그", "Drag Card Bottom")],
          desc: tr("Vertical/Horizontal: 카드 높이 분할(더블클릭 1/2↔전체)", "Vertical/Horizontal: card height (dbl-click full/half)")
        },
        {
          keys: [tr("Flow 하단 호버", "Hover Flow Bottom")],
          desc: tr("소(4) · 중(15) · 대(1열) 선택 및 최대 200줄 드래그", "S(4) · M(15) · L(1 col) presets & drag up to 200 rows")
        }
      ]
    }
  ];
}

export function renderShortcutsGrid(containerEl: HTMLElement): void {
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

export class ShortcutHelpModal extends Modal {
  private boundKeydown: (e: KeyboardEvent) => void;

  constructor(app: App) {
    super(app);
    this.boundKeydown = (e: KeyboardEvent) => {
      if (e.key === "?" || (e.shiftKey && e.code === "Slash")) {
        e.preventDefault();
        e.stopPropagation();
        this.close();
      }
    };
  }

  onOpen(): void {
    const { contentEl, modalEl } = this;
    modalEl.addClass("fb-shortcut-modal");
    contentEl.empty();

    const header = contentEl.createDiv({ cls: "fb-shortcut-modal-header" });
    header.createSpan({ cls: "fb-shortcut-modal-title", text: i18n.shortcutModalTitle() });
    header.createSpan({ cls: "fb-shortcut-modal-hint", text: i18n.shortcutModalHint() });

    renderShortcutsGrid(contentEl);
    window.addEventListener("keydown", this.boundKeydown, true);
  }

  onClose(): void {
    window.removeEventListener("keydown", this.boundKeydown, true);
    this.contentEl.empty();
  }
}

// [ID 6.8] Folder Board 단축키 치트시트 공용 데이터 · 렌더러 · ? 도움말 모달
// -> 보드 내 ? 키 모달과 플러그인 설정 탭 하단 단축키 표가 단일 소스(SSOT)를 공유해 항상 최신 단축키를 표시함.
import { App, Modal } from "obsidian";

export interface ShortcutItem {
  keys: string[];
  desc: string;
}

export interface ShortcutGroup {
  title: string;
  items: ShortcutItem[];
}

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "탐색 & 열기",
    items: [
      { keys: ["↑", "↓", "←", "→"], desc: "항목 · 카드 · 인접 열 이동" },
      { keys: ["⌘/Ctrl", "←/→"], desc: "첫 번째 · 마지막 카드로 점프" },
      { keys: ["⌘/Ctrl", "↑/↓"], desc: "현재 카드 맨 위 · 맨 아래로 점프" },
      { keys: ["1 ~ 9"], desc: "N번째 카드로 즉시 점프" },
      { keys: ["Enter"], desc: "노트 열기 / 폴더 안으로 진입" },
      { keys: ["⌘/Ctrl", "Enter"], desc: "새 탭에서 노트 열기" },
      { keys: ["Backspace"], desc: "상위 폴더로 이동" },
      { keys: ["⌘/Ctrl", "F"], desc: "보드 내 검색 (또는 /)" },
      { keys: ["?"], desc: "단축키 도움말 열기 · 닫기" }
    ]
  },
  {
    title: "빠른 편집 & 접기/펼치기",
    items: [
      { keys: ["Space"], desc: "파일: 우측 분할 편집기 토글 · 폴더: 접기/펼치기" },
      { keys: ["["], desc: "포커스 폴더 하위 접기 (직속에서는 전체 접기)" },
      { keys: ["]"], desc: "포커스 폴더 하위 펼치기 (직속에서는 전체 펼치기)" },
      { keys: ["Esc"], desc: "선택 · 클립보드 · 들고 이동 · 분할 편집기 닫기" }
    ]
  },
  {
    title: "파일 · 폴더 정리 & 편집",
    items: [
      { keys: ["Option", "방향키"], desc: "항목 들고 이동 (키 떼면 드롭)" },
      { keys: ["Option", "1 ~ 9"], desc: "N번째 카드로 원키 이동" },
      { keys: ["Shift", "↑/↓"], desc: "범위 다중 선택" },
      { keys: ["⌘/Ctrl", "A"], desc: "현재 카드 전체 선택" },
      { keys: ["⌘/Ctrl", "C / X / V"], desc: "파일 · 폴더 복사 · 잘라내기 · 붙여넣기" },
      { keys: ["⌘/Ctrl", "Z"], desc: "마지막 이동 되돌리기" },
      { keys: ["N / Shift+N"], desc: "포커스 폴더에 새 노트 / 새 폴더 생성" },
      { keys: ["F2 / R"], desc: "제자리 이름 바꾸기" },
      { keys: ["⌘/Ctrl", "⌫"], desc: "선택 항목 휴지통으로 삭제 (또는 Delete)" }
    ]
  },
  {
    title: "카드 순서 & 여러줄 레이아웃",
    items: [
      { keys: ["Shift", "←/→"], desc: "카드 순서 이동 (폴더 헤더 · 직속 카드)" },
      { keys: ["헤더 드래그"], desc: "카드 순서 마우스 드래그 변경" },
      { keys: ["하단 바 호버"], desc: "소(4) · 중(15) · 대(1열) 선택 및 최대 4열 드래그" },
      { keys: ["열 사이 호버"], desc: "여러줄 모드 다단 너비 드래그 조절" }
    ]
  }
];

export function renderShortcutsGrid(containerEl: HTMLElement): void {
  const grid = containerEl.createDiv({ cls: "fb-shortcuts-grid" });

  for (const group of SHORTCUT_GROUPS) {
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
    header.createSpan({ cls: "fb-shortcut-modal-title", text: "Folder Board 단축키" });
    header.createSpan({ cls: "fb-shortcut-modal-hint", text: "? 또는 Esc로 닫기" });

    renderShortcutsGrid(contentEl);
    window.addEventListener("keydown", this.boundKeydown, true);
  }

  onClose(): void {
    window.removeEventListener("keydown", this.boundKeydown, true);
    this.contentEl.empty();
  }
}

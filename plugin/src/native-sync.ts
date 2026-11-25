// [ID 6.2] 옵시디언 네이티브 파일 탐색기 연동 유틸리티
// -> 기본 file-explorer 뷰에 주입된 커뮤니티 플러그인 아이콘/색상(Iconize, Iconic, File Color 등)을
// -> 2D 미니 탐색기 카드에 그대로 미러링하고, 네이티브 우클릭 컨텍스트 메뉴를 동일하게 제공함.
import { App, Menu, Notice, TAbstractFile, TFile, TFolder, setIcon } from "obsidian";

interface NativeFileItem {
  selfEl?: HTMLElement;
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

// [ID 6.2.1] 네이티브 탐색기 커스텀 아이콘·색상 추출 및 복제
// -> Iconize(.obsidian-icon-folder-icon) 등 외부 플러그인이 DOM에 삽입한 아이콘 요소를 복제해 사용자 취향을 보존함.
export function applyNativeDecoration(
  app: App,
  path: string,
  iconContainer: HTMLElement,
  titleEl: HTMLElement,
  fallbackIcon: "folder" | "file-text" | "inbox"
): void {
  iconContainer.empty();

  const fileItems = getNativeFileExplorerItems(app);
  const nativeSelf = fileItems?.[path]?.selfEl;

  if (nativeSelf) {
    // 커스텀 컬러 스타일이 인라인으로 지정된 경우 승계 (File Color 등)
    const inlineColor = nativeSelf.style.color || nativeSelf.style.getPropertyValue("--folder-color");
    if (inlineColor) {
      titleEl.style.color = inlineColor;
    }

    // 커뮤니티 아이콘 플러그인이 주입한 아이콘 탐색
    const customIcon = nativeSelf.querySelector(
      ".obsidian-icon-folder-icon, .iconic-icon, .folder-icon, [data-icon]"
    ) as HTMLElement | null;

    if (customIcon) {
      const cloned = customIcon.cloneNode(true) as HTMLElement;
      cloned.classList.add("fb-cloned-native-icon");
      iconContainer.appendChild(cloned);
      return;
    }
  }

  setIcon(iconContainer, fallbackIcon);
}

// [ID 6.2.2] 옵시디언 네이티브 우클릭 컨텍스트 메뉴 호출
// -> file-menu 워크스페이스 이벤트를 트리거해 설치된 모든 커뮤니티 플러그인 메뉴(아이콘 변경, 색상 지정 등)가 그대로 나타나게 함.
export function openNativeFileMenu(
  app: App,
  event: MouseEvent,
  target: TAbstractFile,
  onMutated: () => void,
  onRequestRename: (file: TAbstractFile) => void
): void {
  const menu = new Menu();

  if (target instanceof TFile) {
    menu.addItem((item) =>
      item
        .setTitle("새 탭에서 열기")
        .setIcon("file-plus")
        .onClick(async () => {
          await app.workspace.getLeaf("tab").openFile(target);
        })
    );
  }

  menu.addItem((item) =>
    item
      .setTitle("이름 바꾸기")
      .setIcon("pencil")
      .onClick(() => onRequestRename(target))
  );

  menu.addItem((item) =>
    item
      .setTitle("삭제")
      .setIcon("trash")
      .setWarning(true)
      .onClick(async () => {
        try {
          await app.vault.trash(target, true);
          onMutated();
        } catch (err) {
          new Notice(`삭제 실패: ${err instanceof Error ? err.message : String(err)}`);
        }
      })
  );

  menu.addSeparator();
  app.workspace.trigger("file-menu", menu, target, "file-explorer");
  menu.showAtMouseEvent(event);
}

export function getFolderByPath(app: App, path: string): TFolder | null {
  if (!path) return app.vault.getRoot();
  const abs = app.vault.getAbstractFileByPath(path);
  return abs instanceof TFolder ? abs : null;
}

export function getFileByPath(app: App, path: string): TFile | null {
  const abs = app.vault.getAbstractFileByPath(path);
  return abs instanceof TFile ? abs : null;
}

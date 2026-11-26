// [ID 6.2] 옵시디언 네이티브 파일 탐색기 연동 유틸리티
// -> 기본 file-explorer의 커스텀 아이콘/색상을 복제하고,
// -> file-menu 이벤트를 트리거해 새 노트·새 폴더·새 캔버스·새 베이스 및 향후 코어/커뮤니티 생성 메뉴를 자동 연동함.
import { App, Menu, Notice, TAbstractFile, TFile, TFolder, WorkspaceLeaf, setIcon } from "obsidian";

interface NativeFileItem {
  selfEl?: HTMLElement;
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

// [ID 6.2.1] 네이티브 탐색기 커스텀 아이콘·색상 추출 및 복제
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
    const inlineColor = nativeSelf.style.color || nativeSelf.style.getPropertyValue("--folder-color");
    if (inlineColor) {
      titleEl.style.color = inlineColor;
    }

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
        .setTitle("새 노트")
        .setIcon("file-plus")
        .setSection("action-primary")
        .onClick(() => cb.onRequestCreateNote(folderPath))
    );

    menu.addItem((item) =>
      item
        .setTitle("새 폴더")
        .setIcon("folder-plus")
        .setSection("action-primary")
        .onClick(() => cb.onRequestCreateFolder(folderPath))
    );

    if (!target.isRoot()) {
      menu.addItem((item) =>
        item
          .setTitle("이름 바꾸기")
          .setIcon("pencil")
          .setSection("danger")
          .onClick(() => cb.onRequestRename(target))
      );

      menu.addItem((item) =>
        item
          .setTitle("삭제")
          .setIcon("trash")
          .setSection("danger")
          .setWarning(true)
          .onClick(async () => {
            try {
              await app.vault.trash(target, true);
              cb.onMutated();
            } catch (err) {
              new Notice(`삭제 실패: ${err instanceof Error ? err.message : String(err)}`);
            }
          })
      );
    }
  } else if (target instanceof TFile) {
    menu.addItem((item) =>
      item
        .setTitle("새 탭에서 열기")
        .setIcon("file-plus")
        .setSection("open")
        .onClick(async () => {
          await app.workspace.getLeaf("tab").openFile(target);
        })
    );

    menu.addItem((item) =>
      item
        .setTitle("이름 바꾸기")
        .setIcon("pencil")
        .setSection("danger")
        .onClick(() => cb.onRequestRename(target))
    );

    menu.addItem((item) =>
      item
        .setTitle("삭제")
        .setIcon("trash")
        .setSection("danger")
        .setWarning(true)
        .onClick(async () => {
          try {
            await app.vault.trash(target, true);
            cb.onMutated();
          } catch (err) {
            new Notice(`삭제 실패: ${err instanceof Error ? err.message : String(err)}`);
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

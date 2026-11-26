// [ID 6.1] Folder Board 플러그인 공용 타입 및 기본 설정
// -> 2/3/4열 고정 그리드, 세로 자동 열(auto), 세로 펼침 가로 스크롤(scroll) 및 영속 폴더 펼침 상태를 정의함.

export type SortMode = "name" | "mtime";
export type OpenBehavior = "same-tab" | "new-tab";
export type LayoutColumns = 2 | 3 | 4 | "auto" | "scroll";

export interface FolderBoardSettings {
  gridCols: LayoutColumns;
  sortBy: SortMode;
  openBehavior: OpenBehavior;
  // [ID 6.1.1] 영속적 폴더 펼침 상태 -> 하위 폴더 Drill-down 복귀 및 옵시디언 재시작 후에도 접힘/펼침 상태를 유지함
  expandedFolders: string[];
}

export const DEFAULT_SETTINGS: FolderBoardSettings = {
  gridCols: 3,
  sortBy: "name",
  openBehavior: "same-tab",
  expandedFolders: []
};

export interface CardTreeItem {
  type: "folder" | "file";
  key: string;
  path: string;
  name: string;
  depth: number;
  expanded?: boolean;
  childCount?: number;
  mtime?: number;
}

export interface BoardCardModel {
  isRootCard: boolean;
  folderPath: string;
  title: string;
  totalCount: number;
  items: CardTreeItem[];
}

export interface MoveUndoEntry {
  moves: Array<{
    fromPath: string;
    toPath: string;
  }>;
}

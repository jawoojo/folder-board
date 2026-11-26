// [ID 6.1] Folder Board 플러그인 공용 타입 및 기본 설정
// -> 레이아웃(2/3/4열 · 세로 자동 · 가로 스크롤), 정렬, 열기 방식, 세로 경계 이동 방식, 영속 폴더 펼침을 정의함.

export type SortMode = "name" | "mtime";
export type OpenBehavior = "same-tab" | "new-tab";
export type LayoutColumns = 2 | 3 | 4 | "auto" | "scroll";
export type VerticalEdgeBehavior = "adaptive" | "loop";

export interface FolderBoardSettings {
  gridCols: LayoutColumns;
  sortBy: SortMode;
  openBehavior: OpenBehavior;
  // [ID 6.1.2] 최상단/최하단 ↑↓ 이동 정책 -> adaptive(가로=내부 순환, 세로/그리드=아래/위 행 카드 연결) vs loop(항상 내부 순환)
  verticalEdgeBehavior: VerticalEdgeBehavior;
  // [ID 6.1.1] 영속적 폴더 펼침 상태 -> 하위 폴더 Drill-down 복귀 및 옵시디언 재시작 후에도 접힘/펼침 상태를 유지함
  expandedFolders: string[];
}

export const DEFAULT_SETTINGS: FolderBoardSettings = {
  gridCols: 3,
  sortBy: "name",
  openBehavior: "same-tab",
  verticalEdgeBehavior: "adaptive",
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

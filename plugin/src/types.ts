// [ID 6.1] Folder Board 플러그인 공용 타입 및 기본 설정
// -> 레이아웃, 정렬, 열기 방식, 세로 경계 이동 정책, 영속 폴더 펼침, 사용자 지정 폴더 카드 순서를 정의함.

export type SortMode = "name" | "mtime";
export type OpenBehavior = "same-tab" | "new-tab";
export type LayoutColumns = 2 | 3 | 4 | "auto" | "scroll";
export type VerticalEdgeBehavior = "adaptive" | "loop";

export interface FolderBoardSettings {
  gridCols: LayoutColumns;
  sortBy: SortMode;
  openBehavior: OpenBehavior;
  verticalEdgeBehavior: VerticalEdgeBehavior;
  // [ID 6.1.1] 영속적 폴더 펼침 상태 -> 하위 폴더 Drill-down 복귀 및 옵시디언 재시작 후에도 접힘/펼침 상태를 유지함
  expandedFolders: string[];
  // [ID 6.1.3] 사용자 지정 폴더 카드 순서 -> 부모 경로별 자식 폴더 경로 배열을 저장해 원하는 배치를 영구 유지함
  folderOrder: Record<string, string[]>;
}

export const DEFAULT_SETTINGS: FolderBoardSettings = {
  gridCols: 3,
  sortBy: "name",
  openBehavior: "same-tab",
  verticalEdgeBehavior: "adaptive",
  expandedFolders: [],
  folderOrder: {}
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

// [ID 6.1] Folder Board 플러그인 공용 타입 및 기본 설정
// -> 2/3/4열 · 세로(자동열) · 가로(스크롤) · 여러줄(섹션 분류) 레이아웃과 영속 펼침·순서 상태를 정의함.

export type SortMode = "name" | "mtime";
export type OpenBehavior = "same-tab" | "new-tab";
export type LayoutColumns = 2 | 3 | 4 | "auto" | "scroll" | "flow";
export type VerticalEdgeBehavior = "adaptive" | "loop";
export type FlowWindowSizeSpec = "sm" | "md" | "lg" | number;

export interface FolderBoardSettings {
  gridCols: LayoutColumns;
  sortBy: SortMode;
  openBehavior: OpenBehavior;
  verticalEdgeBehavior: VerticalEdgeBehavior;
  // [ID 6.1.1] 영속적 하위 폴더 펼침 상태
  expandedFolders: string[];
  // [ID 6.1.3] 부모 폴더별 사용자 지정 폴더 순서
  folderOrder: Record<string, string[]>;
  // [ID 6.1.4] 여러줄 모드(flow)에서 접어둔 폴더 섹션 경로 목록
  collapsedFlowSections: string[];
  // [ID 6.1.5] 여러줄 모드(flow) 폴더별 표시 길이(소·중·대 또는 드래그 행 수) · 다단 폭 · 우측 분할 편집창 비율 영속화
  flowWindowSizes: Record<string, FlowWindowSizeSpec>;
  expandedFlowWindows?: string[];
  flowColumnWidth: number;
  quickLookSplitRatio: number;
  // [ID 6.1.6] 커맨드 팔레트(Cmd+P) 사용자 지정 검색 별칭 · 카드 모드 세로 확장(1줄) 카드 목록 · 탭 자동 고정
  openCommandAlias: string;
  tallGridCards: string[];
  autoPinTab: boolean;
}

export const DEFAULT_SETTINGS: FolderBoardSettings = {
  gridCols: "flow",
  sortBy: "name",
  openBehavior: "same-tab",
  verticalEdgeBehavior: "adaptive",
  expandedFolders: [],
  folderOrder: {},
  collapsedFlowSections: [],
  flowWindowSizes: {},
  flowColumnWidth: 270,
  quickLookSplitRatio: 0.4,
  openCommandAlias: "폴더 보드 열기",
  tallGridCards: [],
  autoPinTab: true
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
  isCollapsedSection?: boolean;
}

export interface MoveUndoEntry {
  moves: Array<{
    fromPath: string;
    toPath: string;
  }>;
}

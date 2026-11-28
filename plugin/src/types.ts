// [ID 6.1] Folder Board 플러그인 공용 타입 및 기본 설정
// -> Flow(연속 다단) · Vertical(세로 스크롤) · Horizontal(가로 스크롤) 3대 모드와 드래그 분할 설정을 정의함.

export type SortMode = "name" | "mtime";
export type OpenBehavior = "same-tab" | "new-tab";
export type LayoutColumns = "flow" | "vertical" | "horizontal";
export type VerticalEdgeBehavior = "adaptive" | "loop";
export type FlowWindowSizeSpec = "sm" | "md" | "lg" | number;

export interface FolderBoardSettings {
  gridCols: LayoutColumns;
  sortBy: SortMode;
  openBehavior: OpenBehavior;
  verticalEdgeBehavior: VerticalEdgeBehavior;
  // [ID 6.1.1] 영속적 하위 폴더 펼침 상태
  expandedFolders: string[];
  // [ID 6.1.3] 레이아웃 모드별(flow/vertical/horizontal) 독립 폴더 순서 영속화
  // -> 한 모드에서 배치한 카드 순서가 다른 모드 레이아웃을 건드리지 않도록 완전 분리함.
  folderOrderByMode: Record<LayoutColumns, Record<string, string[]>>;
  folderOrder?: Record<string, string[]>;
  // [ID 6.1.4] Flow 모드에서 접어둔 폴더 섹션 경로 목록
  collapsedFlowSections: string[];
  // [ID 6.1.5] Flow 모드 폴더별 표시 길이(소·중·대 또는 드래그 행 수) · 다단 폭 · 우측 분할 편집창 비율 영속화
  flowWindowSizes: Record<string, FlowWindowSizeSpec>;
  expandedFlowWindows?: string[];
  flowColumnWidth: number;
  quickLookSplitRatio: number;
  // [ID 6.1.6] 커맨드 팔레트(Cmd+P) 사용자 지정 검색 별칭 · 탭 자동 고정 · 좌측 패널 자동 접힘
  openCommandAlias: string;
  // [ID 6.1.7] Vertical/Horizontal 모드별 드래그 열 분할 수(1~6) 및 독립 12분할 카드 높이(3=1/4 .. 12=전체) 영속화
  verticalCols: number;
  horizontalCols: number;
  cardRowUnitsByMode: Record<"vertical" | "horizontal", Record<string, number>>;
  cardRowUnits?: Record<string, number>;
  tallGridCards?: string[];
  autoPinTab: boolean;
  autoCollapseLeftSidebar: boolean;
}

export const DEFAULT_SETTINGS: FolderBoardSettings = {
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
  openCommandAlias: "폴더 보드 열기",
  verticalCols: 3,
  horizontalCols: 3,
  cardRowUnitsByMode: { vertical: {}, horizontal: {} },
  autoPinTab: true,
  autoCollapseLeftSidebar: false
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

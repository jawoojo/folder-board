// [ID 1.1] 프로토타입용 한국어 샘플 옵시디언 볼트 데이터
// -> 사용자가 실제로 인박스 트리아지(루트 낱개 노트 -> 하위 폴더 이동)와
// -> 2~3단계 Drill-down(예: 01_프로젝트 -> FolderBoard)을 체험해볼 수 있도록 현실적인 노트 구조를 제공함.
window.FB = window.FB || {};

window.FB.createSampleVault = function createSampleVault() {
  // [ID 1.1.1] 사용자 커스텀 아이콘/색상 메타데이터 (Iconize / File Color 시뮬레이션)
  // -> 좌측 네이티브 탐색기와 2D 미니 탐색기 카드가 동일한 아이콘·색상을 유지하는 UX를 검증하기 위해 부여함.
  const folders = [
    { id: "f-projects", name: "01_프로젝트", parentId: "", color: "#a78bfa", icon: "🚀" },
    { id: "f-proj-board", name: "FolderBoard", parentId: "f-projects", color: "#c4b5fd", icon: "⊞" },
    { id: "f-proj-blog", name: "기술블로그_개편", parentId: "f-projects", color: "#60a5fa", icon: "✍️" },
    { id: "f-proj-side", name: "사이드앱_아이디어", parentId: "f-projects", color: "#34d399", icon: "🧪" },

    { id: "f-ideas", name: "02_아이디어", parentId: "", color: "#fbbf24", icon: "💡" },
    { id: "f-study", name: "03_공부_리서치", parentId: "", color: "#38bdf8", icon: "📚" },
    { id: "f-study-ux", name: "UX_패턴", parentId: "f-study", color: "#22d3ee", icon: "🎨" },
    { id: "f-study-obs", name: "옵시디언_개발", parentId: "f-study", color: "#818cf8", icon: "💎" },

    { id: "f-books", name: "04_독서노트", parentId: "", color: "#f472b6", icon: "📖" },
    { id: "f-daily", name: "05_일기_회고", parentId: "", color: "#4ade80", icon: "🗓️" },
    { id: "f-archive", name: "06_아카이브", parentId: "", color: "#94a3b8", icon: "📦" }
  ];

  const notes = [
    // 루트 직속 낱개 노트 (첫 번째 카드에 네이티브 탐색기 형태로 표시됨)
    {
      id: "n-root-1",
      title: "2D 탐색기 UX 고민 메모",
      icon: "📌",
      folderId: "",
      updatedAt: "방금 전",
      orderTs: 1000,
      tags: ["inbox", "아이디어", "옵시디언"],
      content: `## 핵심 문제의식
옵시디언 좌측 탐색기를 세로 한 줄로 길게 보는 게 너무 답답하다.

> 여러 폴더를 한 평면(2D)에 펼쳐두고 드래그 앤 드롭과 방향키로 휙휙 탐색·정리할 수 있다면 어떨까?

## 테스트해볼 조작감
- [x] **첫 번째 카드 = 직속 노트**: 상단 공간 낭비 없이 깔끔한 2D 정렬
- [x] **방향키 탐색**: \`←/→\`로 폴더 카드 이동, \`↑/↓\`로 파일 이동, \`Space\`로 Quick Look
- [x] **동적 높이**: 한 줄일 땐 세로 100% 꽉 채워 네이티브 탐색기처럼 넓게 보기

지금 \`←/→/↑/↓\` 방향키를 눌러 탐색하거나, 이 노트를 옆 폴더 카드로 드래그해 보세요!`
    },
    {
      id: "n-root-2",
      title: "주말에 읽을 아티클 스크랩",
      icon: "🔖",
      folderId: "",
      updatedAt: "12분 전",
      orderTs: 990,
      tags: ["inbox", "리서치"],
      content: `## 읽을 거리 목록
- 밀러 컬럼(Miller Columns) vs 공간적 파일 매니저(Spatial Finder) 비교
- Apple Quick Look이 컨텍스트 전환 비용을 줄이는 이유
- 벤토 그리드(Bento Grid)에서 시선 흐름 최적화 기법

\`03_공부_리서치\` 폴더로 분류 필요.`
    },
    {
      id: "n-root-3",
      title: "오늘 저녁 장보기 & 할 일",
      folderId: "",
      updatedAt: "35분 전",
      orderTs: 980,
      tags: ["inbox", "일상"],
      content: `## 체크리스트
- [x] 프로토타입 아이디어 정리
- [ ] 방울토마토, 닭가슴살, 그릭요거트 구매
- [ ] 30분 러닝 후 주간 회고 작성`
    },
    {
      id: "n-root-4",
      title: "Turfs vs iCollections 벤치마킹 요약",
      folderId: "",
      updatedAt: "1시간 전",
      orderTs: 970,
      tags: ["inbox", "벤치마킹"],
      content: `## macOS 공간 정리 앱 인사이트
- **Turfs**: Folder Turf(물리 이동) + Tag Turf(비파괴 태그) 하이브리드 구조가 인상적
- **Dropover / Yoink**: 여러 폴더를 넘나들며 옮길 때 임시 보관함(Shelf)이 손목 피로를 크게 줄임

## 우리 프로토타입 반영 사항
하단 **임시 바구니(Shelf)**에 노트를 담아두고, 하위 폴더로 Drill-down한 뒤 한 번에 쏟아붓기!`
    },
    {
      id: "n-root-5",
      title: "디자인 시스템 서적 추천 리스트",
      folderId: "",
      updatedAt: "2시간 전",
      orderTs: 960,
      tags: ["inbox", "독서"],
      content: `## 후보 도서
- 도널드 노먼 — 디자인과 인간 심리 (어포던스 개념 원전)
- 제프 라스킨 — 인간 중심 인터페이스
- 스티브 크룩 — 사용자를 생각하게 하지 마!`
    },

    // 01_프로젝트 직속
    {
      id: "n-p1",
      title: "2026 Q4 프로젝트 로드맵",
      folderId: "f-projects",
      updatedAt: "오늘",
      orderTs: 950,
      tags: ["로드맵", "프로젝트"],
      content: `## 진행 중인 프로젝트
- **Folder Board**: 2D 평면 탐색기 프로토타입 검증 후 옵시디언 플러그인 착수
- **기술블로그 개편**: 검색 속도 개선 및 다크모드 타이포그래피 정리
- **사이드앱**: macOS 메뉴바 메모 유틸리티 MVP`
    },
    {
      id: "n-p2",
      title: "주간 스프린트 회의록",
      folderId: "f-projects",
      updatedAt: "어제",
      orderTs: 910,
      tags: ["회의록"],
      content: `## 결정 사항
- 카드 높이는 메이슨리(들쭉날쭉) 대신 **고정 높이 + 내부 스크롤**로 통일
- 브레드크럼으로 상위 폴더 드롭을 지원하면 2-Depth 이상 이동이 훨씬 수월함`
    },

    // 01_프로젝트 > FolderBoard (2-depth)
    {
      id: "n-pb1",
      title: "플러그인 네이밍 후보 정리",
      folderId: "f-proj-board",
      updatedAt: "오늘",
      orderTs: 945,
      tags: ["네이밍", "folder-board"],
      content: `## 최종 후보 3선
- \`folder-board\` — 가장 직관적이고 보드 위에서 옮기는 UX가 바로 연상됨
- \`flat-explorer\` — 트리 탐색기의 반대 개념 강조
- \`vault-deck\` — 카드/데크 느낌의 세련된 네이밍

> 옵시디언 \`manifest.json\`의 id는 kebab-case가 표준이다.`
    },
    {
      id: "n-pb2",
      title: "핵심 단축키 설계안",
      folderId: "f-proj-board",
      updatedAt: "오늘",
      orderTs: 930,
      tags: ["UX", "단축키"],
      content: `## 키보드 워크플로우
- \`Cmd/Ctrl + Shift + E\`: 2D 보드 호출 / 닫기
- \`Spacebar\`: 선택한 노트 Quick Look 미리보기
- \`Enter\`: 선택한 노트 열며 보드 닫기
- \`Backspace\`: 상위 폴더로 한 단계 복귀
- \`Cmd/Ctrl + Z\`: 방금 이동한 파일 원복`
    },
    {
      id: "n-pb3",
      title: "Obsidian API 파일 이동 구현 메모",
      folderId: "f-proj-board",
      updatedAt: "2일 전",
      orderTs: 880,
      tags: ["개발", "obsidian-api"],
      content: `## 물리적 파일 이동 시 주의점
단순 \`vault.rename()\` 대신 \`app.fileManager.renameFile(file, newPath)\`를 사용해야 볼트 전체의 위키링크(\`[[노트]]\`)와 백링크가 자동으로 업데이트된다.`
    },

    // 01_프로젝트 > 기술블로그_개편 (2-depth)
    {
      id: "n-bl1",
      title: "폰트 및 가독성 튜닝 기록",
      folderId: "f-proj-blog",
      updatedAt: "3일 전",
      orderTs: 850,
      tags: ["블로그", "타이포"],
      content: `## 본문 설정
- 한글: Pretendard Variable
- 본문 최대 폭: \`720px\`, 행간 \`1.7\`
- 코드 블록은 모노스페이스 대비를 살짝 낮춰 눈 피로도 감소`
    },
    {
      id: "n-bl2",
      title: "글 발행 전 체크리스트",
      folderId: "f-proj-blog",
      updatedAt: "4일 전",
      orderTs: 830,
      tags: ["블로그", "체크리스트"],
      content: `- [x] OG 이미지 생성
- [ ] 코드 예제 실행 검증
- [ ] 모바일 뷰포트 확인`
    },

    // 01_프로젝트 > 사이드앱_아이디어 (2-depth)
    {
      id: "n-sa1",
      title: "클립보드 스니펫 링 런처",
      folderId: "f-proj-side",
      updatedAt: "5일 전",
      orderTs: 800,
      tags: ["사이드앱", "macOS"],
      content: `단축키를 누르면 커서 주변에 원형(Radial) 메뉴가 뜨고 최근 복사한 6개 항목을 마우스 제스처로 바로 붙여넣는 유틸리티.`
    },

    // 02_아이디어
    {
      id: "n-i1",
      title: "비파괴적 가상 섹션 (태그 보드)",
      folderId: "f-ideas",
      updatedAt: "오늘",
      orderTs: 940,
      tags: ["아이디어", "태그"],
      content: `## 확장 아이디어
실제 폴더 섹션 옆에 \`#읽을거리\`나 \`#중요\` 같은 **가상 태그 섹션**을 띄워두고, 노트를 드롭하면 파일 경로는 유지한 채 프론트매터 태그만 추가되면 어떨까?`
    },
    {
      id: "n-i2",
      title: "폴더 카드 색상 코딩 & 핀 고정",
      folderId: "f-ideas",
      updatedAt: "어제",
      orderTs: 905,
      tags: ["UI", "아이디어"],
      content: `자주 정리하는 4~6개 핵심 폴더에 좌측 상단 컬러 도트를 지정하고, 정렬 순서와 무관하게 맨 앞줄에 핀 고정하는 기능.`
    },
    {
      id: "n-i3",
      title: "드래그 시 폴더 자동 진입 (Spring-loaded)",
      folderId: "f-ideas",
      updatedAt: "2일 전",
      orderTs: 875,
      tags: ["UX", "드래그앤드롭"],
      content: `macOS 파인더의 **Spring-loaded Folder**처럼 노트를 들고 폴더 헤더 위에 0.7초 이상 머무르면 자동으로 그 폴더 안으로 Drill-down되는 인터랙션.`
    },
    {
      id: "n-i4",
      title: "키보드 원클릭 배치 트리아지",
      folderId: "f-ideas",
      updatedAt: "3일 전",
      orderTs: 860,
      tags: ["생산성", "트리아지"],
      content: `인박스 노트를 선택한 뒤 숫자키 \`1~6\`을 누르면 화면에 보이는 1~6번 폴더 카드로 노트가 즉시 날아가는 초고속 분류 모드.`
    },

    // 03_공부_리서치
    {
      id: "n-s1",
      title: "점진적 공개 (Progressive Disclosure)",
      folderId: "f-study",
      updatedAt: "오늘",
      orderTs: 925,
      tags: ["UX", "이론"],
      content: `## 정의
처음부터 모든 정보와 패널을 화면에 띄워 인지 부하를 높이지 않고, 사용자가 의도를 드러낼 때(호버, Spacebar, 더블클릭) 단계적으로 세부 UI를 노출하는 원칙.

> 2D 보드에서 미리보기 패널을 고정하지 않고 Quick Look 서랍으로 숨긴 이유도 바로 이것이다.`
    },
    {
      id: "n-s2",
      title: "컨텍스트 스위칭 비용 최소화 전략",
      folderId: "f-study",
      updatedAt: "어제",
      orderTs: 900,
      tags: ["인지심리", "생산성"],
      content: `에디터 탭을 닫고 다른 탭으로 갔다가 돌아오는 동작보다, 현재 작업 화면 위에 반투명 오버레이를 띄웠다 닫는 방식이 공간 기억(Spatial Memory) 유지에 유리하다.`
    },
    {
      id: "n-s3",
      title: "밀러 컬럼 vs 2D 그리드 장단점",
      folderId: "f-study",
      updatedAt: "3일 전",
      orderTs: 840,
      tags: ["탐색기", "리서치"],
      content: `## 비교
- **밀러 컬럼**: 깊은 계층의 경로 파악에 강하지만, 형제 폴더 여러 개의 내부 파일을 동시에 비교하기 어렵다.
- **2D 그리드**: 한 계층 내 여러 폴더의 내용물을 바둑판으로 동시 조망하고 대각선 드래그로 분류하는 데 압도적으로 유리하다.`
    },
    {
      id: "n-s4",
      title: "공간 기억 (Spatial Memory)과 파일 정리",
      folderId: "f-study-ux",
      updatedAt: "4일 전",
      orderTs: 825,
      tags: ["UX", "공간기억"],
      content: `사람의 뇌는 텍스트 목록보다 "왼쪽 위 칸", "오른쪽 아래 서랍" 같은 2차원 좌표 위치를 훨씬 빠르게 기억한다.`
    },
    {
      id: "n-s5",
      title: "ItemView vs Modal 구현 비교",
      folderId: "f-study-obs",
      updatedAt: "2일 전",
      orderTs: 870,
      tags: ["옵시디언", "개발"],
      content: `## 옵시디언 플러그인 뷰 타입
- **Modal**: 확장 오버레이(모드 1) 구현에 가장 적합. ESC 닫기와 포커스 트랩이 기본 제공됨.
- **ItemView**: 메인 탭이나 3분할(모드 3)처럼 워크스페이스 패널로 도킹할 때 사용.`
    },

    // 04_독서노트
    {
      id: "n-b1",
      title: "디자인과 인간 심리 — 어포던스",
      folderId: "f-books",
      updatedAt: "어제",
      orderTs: 895,
      tags: ["독서", "디자인"],
      content: `## 인상 깊은 문장
> 좋은 디자인은 설명서 없이도 사용자가 무엇을 할 수 있는지 단서(Signifier)를 자연스럽게 보여준다.

## 적용 포인트
노트를 드래그하기 시작하면 드롭 가능한 폴더 카드 테두리가 부드럽게 빛나야 한다.`
    },
    {
      id: "n-b2",
      title: "세컨드 브레인 — PARA 정리법",
      folderId: "f-books",
      updatedAt: "4일 전",
      orderTs: 820,
      tags: ["독서", "PKM"],
      content: `## PARA 4대 축
- **Projects**: 마감 기한이 있는 진행 중 목표
- **Areas**: 지속 관리해야 할 책임 영역
- **Resources**: 관심 주제 및 참고 자료
- **Archive**: 완료되거나 비활성화된 항목

PARA처럼 1단계 폴더가 4~6개로 명확한 볼트일수록 2D 보드의 시너지가 극대화된다.`
    },
    {
      id: "n-b3",
      title: "인간 중심 인터페이스 — 모드 오류",
      folderId: "f-books",
      updatedAt: "6일 전",
      orderTs: 780,
      tags: ["독서", "HCI"],
      content: `사용자가 현재 어떤 모드에 있는지 시각적으로 즉시 구분되지 않으면 조작 실수가 급증한다.`
    },

    // 05_일기_회고
    {
      id: "n-d1",
      title: "2026-11-25 작업 일지",
      folderId: "f-daily",
      updatedAt: "어제",
      orderTs: 890,
      tags: ["일기"],
      content: `## 오늘 한 일
- 옵시디언 2D 탐색기 컨셉을 구체화했다.
- 처음엔 Fences처럼 수동 배치할까 고민했는데, 역시 폴더를 자동 배치하는 2D 그리드가 관리 부담이 없어 훨씬 현실적이다.`
    },
    {
      id: "n-d2",
      title: "2026-11-24 주간 회고",
      folderId: "f-daily",
      updatedAt: "2일 전",
      orderTs: 865,
      tags: ["회고"],
      content: `## Keep / Problem / Try
- **Keep**: 떠오른 아이디어를 바로 인박스에 적어두는 습관
- **Problem**: 인박스에 메모가 20개만 쌓여도 트리 탐색기로 분류하기 귀찮아짐
- **Try**: 2D Folder Board 프로토타입으로 주간 인박스 트리아지 직접 해보기`
    },
    {
      id: "n-d3",
      title: "2026-11-20 짧은 단상",
      folderId: "f-daily",
      updatedAt: "6일 전",
      orderTs: 790,
      tags: ["일기"],
      content: `도구는 결국 손이 자주 가야 살아남는다. 화려한 기능보다 0.2초 만에 열리고 1초 만에 정리 끝나는 경쾌함이 핵심이다.`
    },

    // 06_아카이브
    {
      id: "n-a1",
      title: "2025년 완료 프로젝트 목록",
      folderId: "f-archive",
      updatedAt: "지난달",
      orderTs: 700,
      tags: ["아카이브"],
      content: `작년에 마무리한 4개의 웹 프로젝트 회고 및 배포 링크 모음.`
    },
    {
      id: "n-a2",
      title: "구버전 세로 탐색기 CSS 스니펫",
      folderId: "f-archive",
      updatedAt: "2개월 전",
      orderTs: 650,
      tags: ["아카이브", "CSS"],
      content: `예전에 쓰던 옵시디언 레인보우 폴더 트리 CSS 스니펫 백업.`
    }
  ];

  return { folders, notes };
};

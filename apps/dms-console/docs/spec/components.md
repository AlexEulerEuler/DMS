# DMS Console — 공통 컴포넌트 스펙 (components.md)

> 범위: `apps/dms-console` 콘솔 한정. 이 문서는 [README.md](./README.md)를 단일 기준(SoT)으로 삼아, 라우트별 화면([screens.md](./screens.md))이 조립해 쓰는 공통 컴포넌트를 명세한다. enum·색·규약은 README 값을 그대로 쓰고 재정의하지 않는다. 상태 색·라벨은 [status-taxonomy.md](../ia/status-taxonomy.md), 색·타이포·간격 토큰은 `design-tokens.md`를 정본으로 참조한다.

## 0. 공통 규약

이 문서 전체에 적용되는 전제다.

- **프레임워크 중립**: React를 가정하되, 명세는 props·동작·상태 위주로 기술해 이식 가능하게 한다. 프레임워크 특정 API보다 계약(입력 props·발생 이벤트·시각 상태)을 우선한다.
- **enum·라벨**: 코드에서는 English key([README](./README.md) 3절), 화면에서는 한국어 라벨을 쓴다. 컴포넌트는 key를 받고 라벨은 내부에서 매핑하거나 상위에서 주입한다. 도메인어·브랜드어를 컴포넌트 이름·라벨에 넣지 않는다.
- **색 사용**: 상태·우선순위는 색만으로 의미를 구분하지 않는다. 항상 텍스트 라벨을 함께 노출한다(status-taxonomy 5절). 색값은 [README](./README.md) 4절 팔레트를 `design-tokens.md`의 토큰명으로 참조한다.
- **토큰 참조 표기**: 본문에서 색은 `token(...)` 형태로 의미 토큰을 가리킨다. 대응 hex는 [README](./README.md) 4절이 정본이다. 예: `token(primary)` = `#2563EB`, `token(status.done)` = `#2563EB`, `token(status.in_progress)` = `#16A34A`, `token(status.planned)` = `#9CA3AF`, `token(on_hold)` = `#F59E0B`.
- **공통 상태 셸**: 빈/로딩/에러/없음은 8절 StateViews를 재사용하고 문구만 맥락에 맞춘다([foundation](../ia/foundation.md) 8절).
- **접근성 기준선**: 모든 인터랙티브 요소는 키보드 도달·조작 가능해야 하고, 선택 상태(파란 배경)와 별개로 포커스 링을 표시한다([foundation](../ia/foundation.md) 10절).

### 공통 타입

여러 컴포넌트가 공유하는 타입을 먼저 정의한다.

```ts
// README 3절 Canonical Enums
type CommonStatus = 'planned' | 'in_progress' | 'done';
type WorkStatus   = 'planned' | 'in_progress' | 'review' | 'done';
type AgentStatus  = 'draft' | 'confirmed' | 'on_hold';
type IssueState   = 'open' | 'closed';
type Priority     = 'urgent' | 'high' | 'normal' | 'low';

type Size = 'sm' | 'md' | 'lg';

// 목록 정렬/페이지네이션 상태(리스트 공통 규약, README 5절)
interface SortState {
  key: string;
  dir: 'asc' | 'desc';
}
```

---

## 1. AppShell

**목적** — 콘솔 전역 프레임. 상단 바·좌측 사이드바·본문 3분할을 제공하고, 셸은 고정한 채 본문만 라우트에 따라 교체한다([foundation](../ia/foundation.md) 2절).

구성 하위 컴포넌트: `AppShell` > (`TopBar`, `Sidebar`, `ContentArea`).

### 1.1 AppShell (컨테이너)

**주요 props**

```ts
interface AppShellProps {
  primaryNav: PrimaryNavItem[];   // 1차 메뉴 6개(고정)
  activePrimaryKey: string;       // URL 첫 세그먼트로 판정
  secondaryNav: SecondaryNavSection[]; // 현재 1차 메뉴의 2차 메뉴
  activeSecondaryKey?: string;    // URL 두 번째 세그먼트/기본 라우트로 판정
  serviceName: string;            // 'DMS Console'
  onNavigate: (to: string) => void; // 라우트 이동 위임
  isNarrow?: boolean;             // 좁은 화면 → Drawer 전환(반응형)
  children: ReactNode;            // ContentArea 내용
}
```

**동작·상태**

- 넓은 화면: TopBar + Sidebar + ContentArea 3분할 유지.
- 좁은 화면(`isNarrow`): Sidebar를 Drawer(11.1)로, TopBar 1차 메뉴를 드로어/햄버거로 접는다. 본문 영역을 우선 확보([foundation](../ia/foundation.md) 10절).
- 스크롤: 본문 영역만 세로 스크롤, 셸 프레임은 고정.
- 상태 전이(로딩/에러/없음) 중에도 셸은 항상 렌더되어 사용자가 다른 모듈로 이탈 가능.

**a11y** — TopBar=배너/1차 내비, Sidebar=2차 내비, ContentArea=메인 랜드마크로 구분한다. 포커스 순서: 상단 1차 → 좌측 2차 → 본문.

### 1.2 TopBar

**목적** — 서비스명(좌)·1차 메뉴 6(중)·설정(우). 전역 항상 표시, 스크롤 시 고정([foundation](../ia/foundation.md) 3·9절).

**주요 props**

```ts
interface PrimaryNavItem {
  key: string;            // 예: 'overview' | 'task' | 'wbs' | 'issues' | 'work' | 'agent'
  label: string;          // 'Overview' | 'Task' | ... (라벨=Agent, 경로=/agents 예외)
  to: string;             // 클릭 시 이동할 기본 라우트
}

interface TopBarProps {
  serviceName: string;
  items: PrimaryNavItem[];        // 정확히 6개, 나열 순서 고정
  activeKey: string;
  onServiceNameClick: () => void; // 앱 루트('/')로 이동 → Overview
  onSettingsClick: () => void;    // 설정 진입
  onNavigate: (to: string) => void;
  compact?: boolean;              // 좁은 화면 축약/햄버거
}
```

**동작·상태**

- 항목 클릭: 해당 모듈 기본 라우트로 이동(`item.to`).
- 활성 판정: `activeKey`가 URL 첫 세그먼트와 일치. Agent는 경로 `/agents`이나 라벨 `Agent`(라벨↔경로 유일 예외).
- 서비스명 클릭: `/`(→ Overview)로 이동.
- 설정: 우측 끝 고정, 1차 메뉴와 시각적으로 구분.

**variant** — `default`(3분할 풀바) / `compact`(좁은 화면: 1차 메뉴 햄버거화, 설정 아이콘화).

**사용 토큰** — 활성 항목 `token(primary)` 텍스트/언더라인, 배경 `token(bg)`, 하단 경계 `token(border)`, 기본 텍스트 `token(text)`, 비활성 `token(textMuted)`.

**a11y** — 1차 메뉴는 `nav` 랜드마크, 활성 항목에 `aria-current="page"`. 활성 표시는 색 + 보조 표기(굵기/언더라인)로 이중화.

### 1.3 Sidebar

**목적** — 현재 1차 메뉴에 종속된 2차 메뉴 표시. 1차가 바뀌면 내용도 바뀐다. 2차 항목이 하나뿐인 모듈(WBS 등)도 그대로 표시([foundation](../ia/foundation.md) 4절).

**주요 props**

```ts
interface SecondaryNavItem {
  key: string;    // 예: 'backlog' | 'kanban' | 'ia'
  label: string;  // 'Backlog' | 'Kanban' | 'IA' ...
  to: string;
}

interface SecondaryNavSection {
  groupLabel?: string;         // 섹션 헤더(링크 아님). 예: '프로젝트 문서'
  items: SecondaryNavItem[];
}

interface SidebarProps {
  sections: SecondaryNavSection[];
  activeKey?: string;
  onNavigate: (to: string) => void;
}
```

**동작·상태**

- 선택 항목: 파란 배경 강조(선택 배경 tint = `token(primary.tint)` = `#EFF6FF`, 텍스트 `token(primary)`).
- 그룹 라벨: 링크가 아니라 그룹 제목. 이동은 하위 항목에서만.
- 단일 항목 모듈도 사이드바를 숨기지 않아 구조 일관성 유지.
- 3depth(목록에서 진입하는 상세·편집)는 사이드바에 나열하지 않는다.

**사용 토큰** — 선택 배경 `#EFF6FF`, 선택 텍스트 `token(primary)`, 기본 텍스트 `token(text)`, 그룹 라벨 `token(textMuted)`, 경계 `token(border)`.

**a11y** — `nav` 랜드마크. 선택 항목 `aria-current="page"`. 색 의존 금지 → 굵기/좌측 인디케이터 병행. 포커스 링 별도 표시.

### 1.4 ContentArea

**목적** — 라우트에 대응하는 화면 렌더 영역. 세로 스크롤 담당, 셸 프레임 고정.

**주요 props**

```ts
interface ContentAreaProps {
  children: ReactNode;    // 보통 PageHeader + 콘텐츠(목록/상세/폼/보드)
}
```

**a11y** — `main` 랜드마크. 라우트 전환 시 포커스를 콘텐츠 상단(제목)으로 이동 권장.

---

## 2. PageHeader

**목적** — 본문 상단의 제목·설명·요약·액션 블록. 모든 화면이 콘텐츠 위에 공통으로 얹는다([foundation](../ia/foundation.md) 2절, 각 IA "화면 레이아웃").

**주요 props**

```ts
interface PageHeaderProps {
  title: string;                 // 예: 'Backlog', 'Issues', '진행현황(WBS)'
  description?: string;          // 한 줄 설명
  summary?: ReactNode;          // 요약(예: 열린 이슈 N, 총 작업 수, 전체 진행률) — Badge/텍스트
  actions?: ReactNode;          // 우측 주요 액션(예: '이슈 등록', '작업 등록')
  breadcrumb?: BreadcrumbItem[]; // 3depth 상세/편집의 위치 표시(뒤로 가기 포함)
}

interface BreadcrumbItem {
  label: string;
  to?: string;   // 없으면 현재 위치(비링크)
}
```

**동작·상태** — 정적 표시가 기본. `summary`는 로딩 중 스켈레톤(8.2)으로 대체 가능. 상세/편집 화면은 `breadcrumb`로 위치·뒤로 가기를 표현(사이드바에 3depth를 나열하지 않으므로).

**variant** — `list`(요약+액션 강조) / `detail`(브레드크럼+제목) / `form`(브레드크럼+제목, 액션은 폼 하단으로 이동 가능).

**사용 토큰** — 제목 `token(text)`, 설명·요약 `token(textMuted)`, 하단 구분선 `token(border)`.

**a11y** — `title`은 페이지 `h1`. 브레드크럼은 `nav[aria-label="breadcrumb"]`. 요약 수치는 텍스트로도 읽히게 한다.

---

## 3. DataTable

**목적** — 목록형 테이블. 칼럼 정의·정렬·페이지네이션(페이지 25)·행 클릭을 제공한다. **Issues 목록**과 **Work Backlog**에서 사용([issues](../ia/issues.md) 4·5절, [work](../ia/work.md) 4.1절, [README](./README.md) 5절).

**주요 props**

```ts
interface Column<T> {
  key: string;
  header: string;                 // 예: '#', '제목', '상태', '우선순위', '라벨', '담당자'
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: number | string;
  render?: (row: T) => ReactNode; // 셀 커스텀(칩·배지 등)
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  sort?: SortState;
  onSortChange?: (next: SortState) => void;
  onRowClick?: (row: T) => void;   // 행 클릭 → 상세 진입
  page: number;                    // 1-base
  pageSize?: number;               // 기본 25(README 5절)
  totalCount: number;              // 헤더 요약에 노출
  onPageChange: (page: number) => void;
  state?: ListState;               // 'loading' | 'empty' | 'error' | 'populated'
  emptyLabel?: string;
  onRetry?: () => void;            // error 시 재시도
}

type ListState = 'loading' | 'empty' | 'error' | 'populated';
```

**동작·상태**

- 정렬: `sortable` 칼럼 헤더 클릭 → `onSortChange`. 기본 정렬은 등록일 최신순, Issues는 우선순위(urgent→low) → 등록일([README](./README.md) 5절). 정렬 자체는 상위(데이터 계층)에서 수행, 컴포넌트는 상태 표시·이벤트만.
- 페이지네이션: 페이지 기반(무한 스크롤 아님), 페이지 크기 25 고정 기본.
- 행 클릭: `onRowClick`으로 상세 라우트 이동(Issues `/issues/:issueId`, Work `/work/:workId`).
- 상태(`state`): `loading`→행 영역 LoadingSkeleton(8.2), `empty`→EmptyState(8.1), `error`→ErrorState(8.3, 재시도), `populated`→행 렌더.

**variant** — 밀도 `comfortable`(기본) / `compact`. 상태 칩·우선순위 칩·라벨 칩은 `render`로 주입(6절 Chips).

**사용 토큰** — 헤더 배경 `token(surface)`, 행 경계 `token(border)`, 텍스트 `token(text)`, 호버 행 배경 `token(surface)`, 정렬 활성 표시 `token(primary)`.

**a11y** — 시맨틱 테이블(`table/thead/tbody/th[scope]`). 정렬 헤더 `aria-sort`. 행 클릭이 있으면 키보드 포커스·Enter 활성 가능하게 하고, 행 내부 링크/버튼과 클릭 영역이 겹치지 않게 처리. 로딩/빈/에러는 텍스트로도 전달.

---

## 4. KanbanBoard / KanbanCard

**목적** — Work 작업을 상태별 열에 카드로 배치하는 실행 뷰. 열은 Todo/In Progress/Review/Done, 카드 드래그로 열 이동 시 `WorkStatus`가 갱신된다([work](../ia/work.md) 4.2·7절, [README](./README.md) 3절 매핑).

열 ↔ 상태 매핑(고정): Todo=`planned`, In Progress=`in_progress`, Review=`review`, Done=`done`.

### 4.1 KanbanBoard

**주요 props**

```ts
interface KanbanColumnDef {
  status: WorkStatus;   // 'planned' | 'in_progress' | 'review' | 'done'
  label: string;        // 'Todo' | 'In Progress' | 'Review' | 'Done'
}

interface KanbanBoardProps<T> {
  columns: KanbanColumnDef[];        // 4개 고정, 위 순서
  cards: T[];
  getCardId: (card: T) => string;
  getCardStatus: (card: T) => WorkStatus;
  renderCard: (card: T) => ReactNode; // 보통 KanbanCard
  onCardMove: (cardId: string, to: WorkStatus) => void; // 드래그 → 상태 전이
  onCardClick?: (card: T) => void;    // 카드 클릭 → 상세
  state?: ListState;
}
```

**동작·상태**

- 각 열 헤더: 열 제목 + 카드 수(Badge, 10절).
- 드래그 이동: 카드를 다른 열로 놓으면 `onCardMove(id, to)`. 표준 전이 `planned → in_progress → review → done`, 리뷰 반려 시 역전이 허용(상태 규칙은 status-taxonomy 6.4). 유효/역전이 판정은 상위 로직, 보드는 드롭 이벤트만 전달.
- 상태 변경은 Backlog 테이블과 양방향 공유(같은 WorkItem 집합).
- 빈 열: 열 내부에 안내 문구(EmptyState 축약).

**사용 토큰** — 열 배경 `token(surface)`, 열 경계 `token(border)`, 드롭 대상 하이라이트 `token(primary.tint)`.

**a11y** — 드래그는 마우스 전용이 되지 않게 키보드 대체 경로를 제공한다(카드 포커스 후 이동 메뉴/단축키 등). 각 열은 목록 시맨틱, 이동 결과를 라이브 리전으로 안내.

### 4.2 KanbanCard

**주요 props**

```ts
interface KanbanCardProps {
  title: string;             // 작업명
  owner?: string;            // 담당자(미지정 표시 가능)
  startDate?: string;        // 일정(시작)
  endDate?: string;          // 일정(종료)
  status: WorkStatus;        // StatusChip 표시용
  linkedIssueLabel?: string; // 연결 이슈 요약(예: '#123')
  onClick?: () => void;
  draggable?: boolean;
}
```

**동작·상태** — 표시: 제목·담당자·일정·상태(StatusChip)·연결 이슈. 클릭 시 상세 진입, 드래그로 열 이동. 담당/일정 미지정 시 "미지정" 표기.

**사용 토큰** — 카드 배경 `token(bg)`, 경계 `token(border)`, 상태 색은 StatusChip(6.1)에 위임.

**a11y** — 카드는 포커스 가능한 단일 활성 요소. 상태는 StatusChip 라벨로 텍스트 전달. 드래그 핸들에 접근 가능한 이름 부여.

---

## 5. GanttGrid

**목적** — WBS 일정표. 좌측 고정열 + 월/주 2단 시간축 + 상태별 막대/셀 + 오늘 강조선 + 마일스톤 마커 + 그룹(구분) 접기를 제공하는 조회 중심 컴포넌트([wbs](../ia/wbs.md) 4~8절).

**주요 props**

```ts
interface WbsItemView {
  id: string;
  group: string;             // 구분(좌측 세로 병합 그룹 헤더)
  title: string;             // 세부 업무명
  status: CommonStatus;      // 'planned' | 'in_progress' | 'done'
  owner?: string;
  startDate?: string;        // 없으면 막대 미표시
  endDate?: string;
  progress?: number;         // 0~100, 없으면 status로 산출
  order: number;
}

interface Milestone {
  id: string;
  date: string;
  label: string;
  kind?: 'A' | 'B';          // 제출 마일스톤 유형 A/B
}

interface GanttGridProps {
  items: WbsItemView[];
  milestones?: Milestone[];
  today?: string;                       // 오늘 강조선 기준(전체 기간 밖이면 생략)
  collapsedGroups?: string[];           // 접힌 구분 key 목록
  onToggleGroup?: (group: string) => void;
  timeAxis?: 'month-week';              // 월/주 2단 고정(일 단위는 향후)
  onItemHover?: (id: string | null) => void; // 툴팁(시작~종료·상태·진행률)
  state?: ListState;                    // empty 시 EmptyState
}
```

**동작·상태**

- 좌측 고정열: `구분 / 세부 업무 / 진행상태`. 가로 스크롤 시 sticky, `group`은 세로 병합해 그룹 헤더처럼 표시.
- 시간축: 월 행 + 주차 행 2단, 상단 고정. 기간은 저장값이 아니라 전체 item의 최소 startDate~최대 endDate에서 파생.
- 막대 색: 상태별 — `done`=`token(status.done)`(파랑 채움), `in_progress`=`token(status.in_progress)`(초록 채움), `planned`=`token(status.planned)`(회색/빈 일정). 색-상태 대응은 status-taxonomy 5.1과 동일.
- 셀 상태: 막대 없음(빈 배경)·시작(좌측 라운드)·중간(채움)·끝(우측 라운드)·오늘 포함(강조선 오버레이). 단일 주차 업무는 좌우 라운드 동시.
- 오늘 강조선: `today`가 현재 주에 걸치면 오버레이. 전체 기간 밖이면 생략. 진입 시 현재 주차로 자동 스크롤(기본 on).
- 마일스톤 마커: 그리드 위 date 위치에 마커(유형 A/B 구분).
- 그룹 접기/펼치기: 구분 단위 토글(`collapsedGroups`/`onToggleGroup`).
- 진행률: 행에 `progress` 있으면 값 사용, 없으면 상태 환산(done=100·in_progress=50·planned=0). 전체 진행률(단순 평균)은 PageHeader `summary`에 노출.
- 엣지: 시작/종료 누락 → 막대 미표시(좌측 열은 노출, 물음표 마커 가능), 종료<시작 → 데이터 오류 경고(막대는 시작 주차만), 진행률·상태 불일치 → 상태 색 우선.
- 편집 없음: 막대 드래그로 일정 변경하지 않는다(편집은 Task/Work). 조회·호버·스크롤·접기만.

**사용 토큰** — 막대 `token(status.*)`, 셀 배경 `token(bg)`, 그리드선/경계 `token(border)`, 좌측 열 배경 `token(surface)`, 오늘 강조선 `token(primary)` 또는 `token(warning)` 계열(대비 확보), 진행상태 라벨은 StatusChip(6.1).

**a11y** — 색만으로 상태 구분 금지 → 좌측 `진행상태` 열에 StatusChip(텍스트 라벨) 병행, 범례 제공. 그룹 토글 `aria-expanded`. 오늘 강조선·마일스톤은 텍스트 툴팁/캡션으로도 전달. 가로 스크롤 영역은 키보드 스크롤 가능하게.

---

## 6. TaskTree

**목적** — Task IA 트리. 구분–세부 업무 2단(중분류는 스키마에만, 화면 미노출)을 접기/펼치기로 탐색하고, 세부 업무 행에 상태·담당·기한을 표시한다([task](../ia/task.md) 4~8절).

**주요 props**

```ts
interface TaskTreeNode {
  id: string;
  type: TaskNodeType;        // 'category' | 'group' | 'task' (README 3절)
  title: string;
  parentId: string | null;
  status?: CommonStatus;     // 세부 업무(task)
  owner?: string;            // 세부 업무
  startDate?: string;        // 세부 업무
  endDate?: string;          // 세부 업무
  progress?: number;         // 세부 업무
  order: number;
}

interface TaskTreeProps {
  nodes: TaskTreeNode[];              // 자기참조 트리(parentId로 연결)
  collapsedIds?: string[];
  onToggle?: (id: string) => void;
  onView?: (node: TaskTreeNode) => void; // 구분/세부 업무 상세·요약(패널·모달)
  statusFilter?: CommonStatus | 'all';   // 전체/완료/진행중/진행예정 단일 선택
  emptyFilterLabel?: string;             // 필터 결과 0건 안내
  state?: ListState;
}

type TaskNodeType = 'category' | 'group' | 'task';
```

**동작·상태**

- 계층: 구분(category) 노드를 접이식으로 나열, 하위 세부 업무(task)를 들여쓰기. 중분류(group)는 현재 화면 미노출(스키마 유지).
- 세부 업무 행: 라벨 + StatusChip(상태) + 담당자 + 기한(시작~종료).
- 접기/펼치기: 구분 단위 토글.
- 상태 필터: 선택 상태의 세부 업무만 남긴다. 결과가 비면 트리 골격 유지 + "해당 상태의 업무가 없습니다" 안내(필터 값은 CommonStatus 저장형과 동일, status-taxonomy 7절).
- 구분/중분류의 상태·진행률은 하위 집계로 산출(컴포넌트는 표시만, 산출은 상위).
- View: 노드 상세/요약 표시(화면 내 패널·모달, Modal 11.2).

**사용 토큰** — 트리선/경계 `token(border)`, 라벨 `token(text)`, 담당·기한 `token(textMuted)`, 상태는 StatusChip(6.1).

**a11y** — `tree`/`treeitem` 시맨틱, 토글 `aria-expanded`. 상태는 색+라벨(StatusChip). 키보드 펼침/접힘·이동 지원.

---

## 7. Card

**목적** — 요약 정보를 담는 범용 카드. **AgentCard**(에이전트 목록), Overview 입력/출력 카드 등에 쓴다([agent](../ia/agent.md) 4·5절, [overview](../ia/overview.md) 5절).

**주요 props**

```ts
interface CardProps {
  title?: string;
  meta?: ReactNode;      // 우상단 메타(예: 생성일, 상태 배지)
  children?: ReactNode;  // 본문 요약(설명 등)
  actions?: ReactNode;   // 하단 액션(예: '열기', '삭제')
  onClick?: () => void;  // 카드 전체 클릭(선택)
  variant?: 'default' | 'outline';
}
```

**AgentCard 사용 예(합성)** — `Card`에 다음을 주입한다: `meta`=StatusChip(AgentStatus)+생성일, `title`=에이전트명, `children`=설명 요약, `actions`=열기/삭제. 별도 컴포넌트로 구현하지 않고 Card 조합으로 표현 가능.

```ts
// 참고: AgentCard가 Card 위에서 받는 데이터
interface AgentCardData {
  id: string;
  name: string;
  status: AgentStatus;   // 'draft' | 'confirmed' | 'on_hold'
  description?: string;
  createdAt: string;
}
```

**동작·상태** — 정적 요약. `onClick`/`actions`로 상세 진입·삭제. 좁은 화면에서 카드 그리드는 1열로 재배치([foundation](../ia/foundation.md) 10절).

**사용 토큰** — 배경 `token(bg)`, 경계 `token(border)`, 제목 `token(text)`, 메타/설명 `token(textMuted)`, `outline`은 경계 강조.

**a11y** — 카드 전체가 링크면 하나의 활성 요소로 하고 내부 액션 버튼과 포커스 충돌을 피한다. 상태는 StatusChip 라벨로 텍스트 전달.

---

## 8. Chips (StatusChip · PriorityChip · IssueStateChip · LabelChip)

색은 항상 텍스트 라벨과 함께 노출한다(색만으로 의미 구분 금지, status-taxonomy 5절). 아래 네 칩은 색/라벨 값을 재정의하지 않고 status-taxonomy·README 팔레트를 그대로 참조한다.

### 8.1 StatusChip

**목적** — 공통/Work/Agent 상태를 색+라벨로 표시. DataTable·KanbanCard·GanttGrid·TaskTree 등에서 공용.

**주요 props**

```ts
type StatusKind =
  | { domain: 'common'; value: CommonStatus }   // planned | in_progress | done
  | { domain: 'work';   value: WorkStatus }     // + review
  | { domain: 'agent';  value: AgentStatus };   // draft | confirmed | on_hold

interface StatusChipProps {
  status: StatusKind;
  size?: Size;
  showDot?: boolean;   // 색 점 + 라벨(색 의존 완화)
}
```

**색·라벨 매핑**(정본: status-taxonomy 5절, README 4절)

| domain/value | 라벨 | 색 계열 | 토큰(hex) |
| --- | --- | --- | --- |
| common `planned` / work `planned` | 진행예정 | 회색 | `#9CA3AF` |
| common `in_progress` / work `in_progress` | 진행중 | 초록 | `#16A34A` |
| work `review` | 리뷰중 | 초록(진행 계열, 명도 차) | `#16A34A` 계열 |
| common `done` / work `done` | 완료 | 파랑 | `#2563EB` |
| agent `draft` | 기획중 | 초록(진행) | `#16A34A` |
| agent `confirmed` | 확정 | 파랑(종료) | `#2563EB` |
| agent `on_hold` | 보류 | 앰버(정지/보류) | `#F59E0B` |

- 리뷰중은 진행 계열이되 진행중과 구분이 필요하면 같은 계열 다른 명도로 표현(status-taxonomy 5.2). 정확한 톤은 `design-tokens.md`.

**variant** — `solid`(채움) / `soft`(옅은 배경+텍스트). 크기 sm/md/lg.

**a11y** — 색+텍스트 라벨 필수. `showDot`으로 형태 신호 추가. 상태 의미는 라벨로 스크린 리더 전달.

### 8.2 PriorityChip

**목적** — 우선순위(Issues 등)를 색+라벨로 표시. 상태와 독립 축(status-taxonomy 9절).

**주요 props**

```ts
interface PriorityChipProps {
  priority: Priority;   // 'urgent' | 'high' | 'normal' | 'low'
  size?: Size;
}
```

**색·라벨 매핑**(정본: status-taxonomy 9절, README 4절)

| value | 라벨 | 색 | 토큰(hex) |
| --- | --- | --- | --- |
| `urgent` | 긴급 | 적색 | `#DC2626` |
| `high` | 높음 | 주황 | `#EA580C` |
| `normal` | 보통(기본값) | 중립 회색 | `#6B7280` |
| `low` | 낮음 | 옅은 회색 | `#D1D5DB` |

- 기본값 `normal`. 미지정 시 보통으로 표시(issues 10절).

**a11y** — 색+라벨. 정렬/필터 축으로 쓰이므로 값이 텍스트로 읽혀야 한다.

### 8.3 IssueStateChip

**목적** — GitHub 이슈 상태(open/closed) 표시. 콘솔은 별도 상태 기계를 두지 않고 GitHub 값을 반영만 한다(status-taxonomy 3.2, [issues](../ia/issues.md) 7절).

**주요 props**

```ts
interface IssueStateChipProps {
  state: IssueState;   // 'open' | 'closed'
  size?: Size;
}
```

**색·라벨 매핑**

| value | 라벨 | 색 계열 | 토큰(hex) |
| --- | --- | --- | --- |
| `open` | open(열림) | 초록(진행) | `#16A34A` |
| `closed` | closed(닫힘) | 파랑(종료) | `#2563EB` |

- 세분 진행 단계는 GitHub 라벨(LabelChip)로 표시하고 별도 상태로 취급하지 않는다.

**a11y** — 색+라벨. open/closed를 텍스트로 전달.

### 8.4 LabelChip

**목적** — GitHub 라벨 표시(읽기 전용 미러). 진행 세분·분류를 라벨로 노출([issues](../ia/issues.md) 5·7절).

**주요 props**

```ts
interface LabelChipProps {
  name: string;
  color?: string;    // GitHub 라벨 색(hex, 원본). 없으면 뉴트럴
  size?: Size;
}
```

**동작·상태** — GitHub에서 온 name/color를 그대로 표시(콘솔이 정의하지 않음). 다수 라벨은 가로 나열, 좁으면 줄바꿈/말줄임.

**사용 토큰** — 색 미지정 시 배경 `token(surface)`·경계 `token(border)`·텍스트 `token(text)`. GitHub 색 사용 시 대비 확보(밝기에 따라 텍스트 명암 반전).

**a11y** — 라벨 텍스트가 곧 의미. 색은 보조. 대비 자동 보정.

---

## 9. Form 컨트롤 (TextField · TextArea · Select · DatePicker)

공통: `label`·`value`·`onChange`·`error`·`disabled`·`required`를 기본 계약으로 갖는다. 검증 메시지는 텍스트로 노출하고 색(에러)만으로 표시하지 않는다. 등록/편집 폼(Issues new, Work new/상세, Agent 상세)에서 사용.

### 9.1 TextField

```ts
interface TextFieldProps {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;         // 검증 메시지(텍스트)
  disabled?: boolean;
  required?: boolean;
  readOnly?: boolean;     // GitHub 읽기 전용 필드 표시 등
  type?: 'text' | 'search';
}
```

**동작·상태** — `default`/`focus`/`error`/`disabled`/`readOnly`. `type='search'`는 제목 검색 입력(리스트 공통 규약)에 사용. GitHub 미러 필드(제목·본문 등 기존 이슈)는 `readOnly`로 표시([issues](../ia/issues.md) 8절).

**사용 토큰** — 경계 `token(border)`, 포커스 경계 `token(primary)`, 에러 경계/텍스트 `token(error)`, 텍스트 `token(text)`, placeholder `token(textMuted)`.

**a11y** — `label` 연결(`for`/`id`), 에러는 `aria-invalid`+`aria-describedby`. 포커스 링 표시.

### 9.2 TextArea

```ts
interface TextAreaProps {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  readOnly?: boolean;
}
```

**동작·상태** — 다중 행 입력(이슈 본문, Agent 기획 메모, Work 설명). 세로 리사이즈 허용 가능. 상태는 TextField와 동일 계열.

**a11y** — TextField와 동일.

### 9.3 Select (드롭다운)

```ts
interface SelectOption<V extends string> {
  value: V;
  label: string;
}

interface SelectProps<V extends string> {
  label?: string;
  value: V | null;
  options: SelectOption<V>[];
  onChange: (v: V) => void;
  placeholder?: string;      // 예: '선택'
  error?: string;
  disabled?: boolean;
  required?: boolean;
}
```

**동작·상태** — 단일 선택 드롭다운. 우선순위(Priority), Work/Agent 상태 변경, 상위 노드 선택 등에 사용. 옵션 라벨은 한국어, value는 enum key.

**사용 토큰** — TextField 계열. 열림 시 목록 배경 `token(bg)`, 선택 항목 `token(primary.tint)`.

**a11y** — 네이티브 `select` 또는 접근 가능한 커스텀 리스트박스(`role=listbox`/`option`, `aria-expanded`). 키보드 열림·이동·선택 지원.

### 9.4 DatePicker

```ts
interface DatePickerProps {
  label?: string;
  value: string | null;      // ISO 날짜
  onChange: (v: string | null) => void;
  min?: string;
  max?: string;              // 예: 종료일 ≥ 시작일 검증 지원
  error?: string;
  disabled?: boolean;
  required?: boolean;
}
```

**동작·상태** — 시작일/종료일(Task 세부 업무, Work 일정) 입력. 종료<시작 등 유효성 경고는 상위 검증 + `error` 노출([work](../ia/work.md) 10절, [task](../ia/task.md) 참조).

**사용 토큰** — TextField 계열. 달력 팝오버 배경 `token(bg)`, 오늘/선택 강조 `token(primary)`.

**a11y** — 라벨 연결, 키보드 날짜 입력·달력 이동 지원. 형식 안내를 텍스트로 제공.

---

## 10. StateViews (EmptyState · LoadingSkeleton · ErrorState · NotFound)

foundation 공통 상태 셸의 구현체. 모든 콘텐츠 영역이 재사용하고 문구만 맥락에 맞춘다([foundation](../ia/foundation.md) 8절). 상태 전이 중에도 AppShell(상단 바·사이드바)은 유지된다.

### 10.1 EmptyState

```ts
interface EmptyStateProps {
  title: string;            // 예: '등록된 업무가 없습니다'
  description?: string;
  action?: ReactNode;       // 주 액션 진입점(예: '항목 추가', '작업 등록')
  icon?: ReactNode;
}
```

**동작·상태** — 로드 성공·0건일 때. 주 액션(등록 등) 진입점 제공. 필터 결과 0건도 이 컴포넌트로(문구만 교체, 예: "해당 상태의 업무가 없습니다").

**사용 토큰** — 제목 `token(text)`, 설명 `token(textMuted)`, 배경 `token(surface)`.

**a11y** — 안내를 텍스트로 전달. 주 액션은 키보드 도달 가능.

### 10.2 LoadingSkeleton

```ts
interface LoadingSkeletonProps {
  variant?: 'table' | 'cards' | 'form' | 'text' | 'gantt';
  rows?: number;            // 스켈레톤 반복 수
}
```

**동작·상태** — 데이터 로드 중 콘텐츠 자리에 스켈레톤. 셸·사이드바는 유지. variant로 화면 형태(테이블/카드/폼/텍스트/간트)에 맞춘다.

**사용 토큰** — 스켈레톤 블록 `token(surface)`~`token(border)` 계열, 은은한 애니메이션.

**a11y** — `aria-busy`/`role=status`로 로딩을 텍스트로도 안내. 무의미한 반복 요소는 스크린 리더에서 숨김.

### 10.3 ErrorState

```ts
interface ErrorStateProps {
  title?: string;           // 기본: '문제가 발생했습니다'
  description?: string;      // 예: 'GitHub 연동이 끊겼습니다'
  onRetry?: () => void;     // '다시 시도'
}
```

**동작·상태** — 로드·저장 실패 시. 오류 메시지 + "다시 시도". 내비게이션은 계속 사용 가능. 부분 실패 시 실패 영역만 오류로 표시([foundation](../ia/foundation.md) 8절, [issues](../ia/issues.md) 10절 GitHub 연동 실패).

**사용 토큰** — 아이콘/강조 `token(error)`, 텍스트 `token(text)`/`token(textMuted)`.

**a11y** — 오류를 텍스트로 전달(`role=alert` 고려). 재시도 버튼 키보드 도달.

### 10.4 NotFound

```ts
interface NotFoundProps {
  title?: string;           // 기본: '없음'
  description?: string;      // 예: '존재하지 않는 경로/식별자입니다'
  action?: ReactNode;       // 홈/목록으로 이동 링크(선택)
}
```

**동작·상태** — 정의되지 않은 라우트/존재하지 않는 `:id`. 자동 리다이렉트하지 않고 "없음" 화면 표시([foundation](../ia/foundation.md) 7·8절). 모듈 루트→기본 화면 리다이렉트만 예외(NotFound 아님).

**사용 토큰** — EmptyState 계열(뉴트럴).

**a11y** — 상황을 텍스트로 안내. 이탈 경로 제공.

---

## 11. Drawer · Modal

### 11.1 Drawer

**목적** — 좁은 화면에서 사이드바(2차 메뉴) 및 1차 메뉴를 옆에서 밀려나오는 패널로 제공([foundation](../ia/foundation.md) 10절).

```ts
interface DrawerProps {
  open: boolean;
  onClose: () => void;
  side?: 'left';            // 사이드바는 좌측
  title?: string;
  children: ReactNode;      // Sidebar/1차 메뉴 목록
}
```

**동작·상태** — 열림/닫힘. 오버레이 클릭·ESC로 닫기. 넓은 화면에서는 사용하지 않고 인라인 Sidebar로 대체(AppShell `isNarrow` 분기).

**사용 토큰** — 패널 배경 `token(bg)`, 오버레이 반투명 뉴트럴, 경계 `token(border)`.

**a11y** — 포커스 트랩, ESC 닫기, 열림 시 포커스 이동·닫힘 시 트리거로 복귀. 오버레이는 배경 비활성.

### 11.2 Modal

**목적** — 확인 대화상자 및 폼(항목 추가/편집, 삭제 확인 등)을 본문 위에 띄운다. depth를 늘리지 않고 상세 정보를 수용([foundation](../ia/foundation.md) 5절, [task](../ia/task.md) 항목 추가/View).

```ts
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;       // 폼 또는 확인 문구
  footer?: ReactNode;        // 예: [취소][저장] / [취소][삭제]
  size?: 'sm' | 'md' | 'lg';
  dismissible?: boolean;     // 오버레이/ESC 닫기 허용(기본 true)
}
```

**동작·상태** — 확인형(예: 삭제 확인, 미저장 이동 확인)과 폼형(Task 항목 추가/편집, View 요약). 파괴적 액션(삭제)은 확인 단계 필수([agent](../ia/agent.md) 8·10절, [work](../ia/work.md) 8절). 저장/취소는 `footer`.

**variant** — `confirm`(간결 문구+2버튼) / `form`(입력 필드 포함).

**사용 토큰** — 패널 배경 `token(bg)`, 오버레이 반투명 뉴트럴, 파괴적 액션 강조 `token(error)`, 기본 액션 `token(primary)`.

**a11y** — `role=dialog`+`aria-modal`, 포커스 트랩, ESC/오버레이 닫기(비파괴 시), 제목을 `aria-labelledby`로 연결. 열림/닫힘 포커스 관리.

---

## 12. Badge

**목적** — 요약 카운트·짧은 수치/상태 표기. PageHeader 요약(열린 이슈 N, 총 작업 수), Kanban 열 카드 수, 사이드바 카운트 등([issues](../ia/issues.md) 4절, [work](../ia/work.md) 4절, [agent](../ia/agent.md) 4절).

```ts
interface BadgeProps {
  children: ReactNode;      // 수치/짧은 텍스트
  tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  size?: Size;
}
```

**동작·상태** — 정적 표시. 카운트가 0이면 숨김 또는 '0' 표기(맥락에 따라). Chips와 구분: Badge는 수치/요약, Chips는 enum 의미(상태·우선순위·라벨).

**사용 토큰** — `neutral` 배경 `token(surface)`·텍스트 `token(textMuted)`. tone은 시맨틱 색(`primary`/`success`/`warning`/`error`/`info` = README 4절 시맨틱 팔레트).

**a11y** — 수치·의미를 텍스트로 전달. 색만으로 구분하지 않는다.

---

## 13. 컴포넌트 ↔ 화면 사용 맵

각 컴포넌트가 어느 화면에서 쓰이는지 요약한다(상세는 [screens.md](./screens.md)).

| 컴포넌트 | 주 사용 화면 |
| --- | --- |
| AppShell (TopBar/Sidebar/ContentArea) | 전 화면 공통 셸 |
| PageHeader | 전 화면 상단 |
| DataTable | Issues 목록, Work Backlog |
| KanbanBoard / KanbanCard | Work Kanban |
| GanttGrid | WBS 진행현황 |
| TaskTree | Task IA |
| Card (+ AgentCard 합성) | Agent 목록, Overview 입력/출력 카드 |
| StatusChip | Task/WBS/Work/Agent 상태 표기 전반 |
| PriorityChip | Issues(목록·상세·등록) |
| IssueStateChip | Issues(목록·상세) |
| LabelChip | Issues(GitHub 라벨) |
| TextField/TextArea/Select/DatePicker | Issues new, Work new/상세, Agent 상세, 필터/검색 |
| EmptyState/LoadingSkeleton/ErrorState/NotFound | 전 화면 공통 상태 |
| Drawer | 좁은 화면 사이드바·1차 메뉴 |
| Modal | 항목 추가/편집, 삭제·이동 확인 |
| Badge | 요약 카운트(헤더·Kanban 열·사이드바) |

## 14. 연관 문서 크로스링크

- 단일 기준(enum·색·라우트·규약): [README.md](./README.md)
- 상태·색 값 정본: [status-taxonomy.md](../ia/status-taxonomy.md)
- 토큰(색·타이포·간격): `design-tokens.md`
- 엔티티 타입: `data-schema.md`
- 라우트별 화면 스펙: `screens.md`
- 공통 셸·내비게이션·상태: [foundation.md](../ia/foundation.md)
- 모듈 IA: [overview.md](../ia/overview.md), [task.md](../ia/task.md), [wbs.md](../ia/wbs.md), [issues.md](../ia/issues.md), [work.md](../ia/work.md), [agent.md](../ia/agent.md)

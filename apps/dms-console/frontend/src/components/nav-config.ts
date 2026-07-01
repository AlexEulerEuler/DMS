/** Static nav structure (foundation.md §3-4). Not data-driven — the 6 primary
 * modules and their secondary items are fixed by spec. */

export interface PrimaryNavItem {
  key: string;
  label: string;
  to: string;
}

export interface SecondaryNavItem {
  key: string;
  label: string;
  to: string;
  /** One-line doc description (Overview sub-docs render this in PageHeader). */
  description?: string;
}

export interface SecondaryNavSection {
  groupLabel?: string;
  items: SecondaryNavItem[];
}

export const PRIMARY_NAV: PrimaryNavItem[] = [
  { key: "overview", label: "Overview", to: "/overview" },
  { key: "task", label: "Task", to: "/task" },
  { key: "wbs", label: "WBS", to: "/wbs" },
  { key: "issues", label: "Issues", to: "/issues" },
  { key: "work", label: "Work", to: "/work" },
  { key: "agents", label: "Agent", to: "/agents" },
];

export const OVERVIEW_DOCS: SecondaryNavItem[] = [
  { key: "overview", label: "프로젝트 개요", to: "/overview", description: "입력·출력·워크플로우 요약" },
  { key: "glossary", label: "도메인 용어", to: "/overview/glossary", description: "콘솔 핵심 용어 정의" },
  { key: "pipeline", label: "전체 파이프라인", to: "/overview/pipeline", description: "입력→처리→출력 단계 상세" },
  { key: "modules", label: "서비스 모듈", to: "/overview/modules", description: "구성 모듈과 책임 범위" },
  { key: "api", label: "API 엔드포인트", to: "/overview/api", description: "제공 API 목록·용도" },
  { key: "cli", label: "CLI 명령어", to: "/overview/cli", description: "생성 실행 등 명령어 레퍼런스" },
  { key: "folder-structure", label: "폴더 구조", to: "/overview/folder-structure", description: "코드·산출물 디렉터리 구조" },
  { key: "data", label: "주요 데이터", to: "/overview/data", description: "생성 산출물 조회·다운로드" },
  { key: "tech-stack", label: "기술 스택", to: "/overview/tech-stack", description: "사용 기술·의존성" },
  { key: "env", label: "환경 변수", to: "/overview/env", description: "구동에 필요한 환경 변수" },
  { key: "runbook", label: "실행 방법", to: "/overview/runbook", description: "로컬·운영 실행 절차" },
  { key: "limitations", label: "알려진 한계", to: "/overview/limitations", description: "제약·미지원 사항" },
];

const SECONDARY_NAV: Record<string, SecondaryNavSection[]> = {
  overview: [{ groupLabel: "프로젝트 문서", items: OVERVIEW_DOCS }],
  task: [{ items: [{ key: "ia", label: "IA", to: "/task/ia" }] }],
  wbs: [{ items: [{ key: "wbs", label: "진행현황", to: "/wbs" }] }],
  issues: [{ items: [{ key: "issues", label: "이슈 목록", to: "/issues" }] }],
  work: [
    {
      items: [
        { key: "backlog", label: "Backlog", to: "/work/backlog" },
        { key: "kanban", label: "Kanban", to: "/work/kanban" },
      ],
    },
  ],
  agents: [{ items: [{ key: "agents", label: "에이전트 목록", to: "/agents" }] }],
};

export function primaryKeyFromPathname(pathname: string): string {
  const [, first] = pathname.split("/");
  return first || "overview";
}

export function secondaryNavFor(primaryKey: string): SecondaryNavSection[] {
  return SECONDARY_NAV[primaryKey] ?? [];
}

export function secondaryKeyFromPathname(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "overview";
  if (segments[0] === "overview") return segments[1] ?? "overview";
  if (segments[0] === "task") return "ia";
  if (segments[0] === "wbs") return "wbs";
  if (segments[0] === "issues") return "issues";
  if (segments[0] === "work") return segments[1] ?? "backlog";
  if (segments[0] === "agents") return "agents";
  return segments[0];
}

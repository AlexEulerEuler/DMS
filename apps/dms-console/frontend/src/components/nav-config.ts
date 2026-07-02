/** Static nav structure. 6개 1차 모듈 골격은 유지하되(비개발자의 학습 연속성),
 * 데이터 원천은 전부 GitHub·리포 문서다 (ADR-0002). */

export interface PrimaryNavItem {
  key: string;
  label: string;
  to: string;
}

export interface SecondaryNavItem {
  key: string;
  label: string;
  to: string;
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

const SECONDARY_NAV: Record<string, SecondaryNavSection[]> = {
  overview: [
    {
      items: [
        { key: "overview", label: "홈", to: "/overview", description: "진행 요약과 최근 활동" },
        { key: "docs", label: "프로젝트 문서", to: "/overview/docs", description: "리포 문서 브라우저" },
      ],
    },
  ],
  task: [{ items: [{ key: "ia", label: "계획 트리", to: "/task/ia" }] }],
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
  agents: [{ items: [{ key: "agents", label: "활동", to: "/agents" }] }],
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

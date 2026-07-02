/**
 * 화면 타입 + canonical enum. 데이터 정본은 GitHub(이슈·PR·커밋)과 리포 문서이며(ADR-0002),
 * 여기의 타입은 서버 데이터층(lib/server/*)이 유도한 읽기 전용 뷰다.
 * enum 라벨의 정본: apps/dms-console/docs/ia/status-taxonomy.md.
 */

export type DateTimeString = string; // ISO 8601
export type DateString = string; // "YYYY-MM-DD"

export type CommonStatus = "planned" | "in_progress" | "done";
export type WorkStatus = "planned" | "in_progress" | "review" | "done";
export type AgentStatus = "draft" | "confirmed" | "on_hold";
export type IssueState = "open" | "closed";
export type Priority = "urgent" | "high" | "normal" | "low";
export type TaskNodeType = "category" | "group" | "task";

/** 칸반 단계 — GitHub 사실에서 유도 (정본: docs/policy/10-dev-workflow.md §1) */
export type WorkStage = "backlog" | "todo" | "in_progress" | "review" | "done" | "blocked";

export const COMMON_STATUS_LABEL: Record<CommonStatus, string> = {
  planned: "진행예정",
  in_progress: "진행중",
  done: "완료",
};

export const WORK_STATUS_LABEL: Record<WorkStatus, string> = {
  planned: "진행예정",
  in_progress: "진행중",
  review: "리뷰중",
  done: "완료",
};

export const WORK_STAGE_LABEL: Record<WorkStage, string> = {
  backlog: "정의중",
  todo: "진행예정",
  in_progress: "진행중",
  review: "리뷰중",
  done: "완료",
  blocked: "차단됨",
};

export const AGENT_STATUS_LABEL: Record<AgentStatus, string> = {
  draft: "기획중",
  confirmed: "확정",
  on_hold: "보류",
};

export const ISSUE_STATE_LABEL: Record<IssueState, string> = {
  open: "open",
  closed: "closed",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  urgent: "긴급",
  high: "높음",
  normal: "보통",
  low: "낮음",
};

export const TASK_NODE_TYPE_LABEL: Record<TaskNodeType, string> = {
  category: "구분",
  group: "중분류",
  task: "세부 업무",
};

// ---------------------------------------------------------------------------
// GitHub 유도 뷰
// ---------------------------------------------------------------------------

export interface LinkedPull {
  number: number;
  title: string;
  draft: boolean;
  htmlUrl: string;
  state: "open" | "closed" | "merged";
  author: string | null;
  createdAt: DateTimeString;
}

export interface GhIssue {
  number: number;
  title: string;
  body: string;
  state: IssueState;
  labels: string[];
  assignees: string[];
  author: string | null;
  createdAt: DateTimeString;
  closedAt: DateTimeString | null;
  htmlUrl: string;
  commentsCount: number;
  priority: Priority; // P0~P3 라벨에서 유도
  taskId: string | null; // task:T-### 라벨에서 유도
  stage: WorkStage;
  linkedPulls: LinkedPull[];
}

export interface TimelineEvent {
  kind: "issue_opened" | "comment" | "pr" | "closed";
  actor: string | null;
  at: DateTimeString;
  title: string;
  body?: string;
  htmlUrl?: string;
}

export interface IssueDetail {
  issue: GhIssue;
  timeline: TimelineEvent[];
}

export interface ActivityItem {
  kind: "commit" | "pr";
  title: string;
  actor: string | null;
  agentInvolved: boolean;
  at: DateTimeString;
  htmlUrl: string;
  ref: string; // sha 앞 7자리 또는 #PR번호
}

export interface HomeSummary {
  openWork: number;
  readyWork: number;
  inProgress: number;
  inReview: number;
  mergedThisWeek: number;
  priorityCounts: Record<Priority, number>;
  recent: ActivityItem[];
  syncNote: string | null; // 목록 상한(100건) 초과 등 커버리지 경고
}

// ---------------------------------------------------------------------------
// 계획 (docs/plan/tasks.yaml)
// ---------------------------------------------------------------------------

export interface PlanNode {
  id: string; // T-###
  type: TaskNodeType;
  title: string;
  parent: string | null;
  owner: string | null;
  start: DateString | null;
  end: DateString | null;
  progressManual: number | null;
}

export interface WbsRow extends PlanNode {
  progress: number;
  openIssues: number;
  closedIssues: number;
  delayed: boolean;
}

// ---------------------------------------------------------------------------
// 문서 브라우저
// ---------------------------------------------------------------------------

export interface DocEntry {
  name: string;
  path: string;
  type: "file" | "dir";
}

export interface DocContent {
  path: string;
  frontMatter: Record<string, string | undefined> | null;
  body: string;
}

// ---------------------------------------------------------------------------
// 기존 공유 컴포넌트 계약 (TaskTree·GanttGrid·KanbanBoard가 사용)
// ---------------------------------------------------------------------------

export interface TaskIA {
  id: string;
  projectId: string;
  type: TaskNodeType;
  title: string;
  parentId?: string | null;
  status?: CommonStatus;
  owner?: string;
  startDate?: DateString;
  endDate?: DateString;
  progress?: number;
  order?: number;
}

export interface WBSItem {
  id: string;
  group: string;
  title: string;
  status: CommonStatus;
  owner?: string;
  startDate?: DateString;
  endDate?: DateString;
  progress?: number;
  order?: number;
}

export interface WbsMilestoneView {
  id: string;
  type: "A" | "B";
  label: string;
  date: DateString;
}

export interface WbsResponse {
  items: WBSItem[];
  milestones: WbsMilestoneView[];
  overallProgress: number;
  timeAxis: { startDate: DateString | null; endDate: DateString | null };
}

/** 칸반 카드 — 이슈에서 유도 (id = 이슈 번호 문자열) */
export interface WorkItem {
  id: string;
  title: string;
  owner?: string | null;
  status?: WorkStatus;
  stage?: WorkStage;
  priority?: Priority;
  taskId?: string | null;
  htmlUrl?: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}

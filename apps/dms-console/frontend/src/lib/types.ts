/**
 * Entity types + canonical enums (source of truth: docs/spec/data-schema.md,
 * docs/spec/README.md §3). Code uses the English enum keys; screens map them
 * to Korean labels via the *_LABEL records below.
 */

export type DateTimeString = string; // ISO 8601, e.g. "2026-07-01T09:00:00Z"
export type DateString = string; // "YYYY-MM-DD"

export type CommonStatus = "planned" | "in_progress" | "done";
export type WorkStatus = "planned" | "in_progress" | "review" | "done";
export type AgentStatus = "draft" | "confirmed" | "on_hold";
export type IssueState = "open" | "closed";
export type Priority = "urgent" | "high" | "normal" | "low";
export type TaskNodeType = "category" | "group" | "task";
export type ExportFormat = "json" | "xlsx" | "doc";
export type ParsedStatus = "pending" | "processing" | "done" | "error";
export type MasterListStatus = "draft" | "confirmed";

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

export const EXPORT_FORMAT_LABEL: Record<ExportFormat, string> = {
  json: "JSON",
  xlsx: "XLSX",
  doc: "문서",
};

// ---------------------------------------------------------------------------
// Project / Overview
// ---------------------------------------------------------------------------

export interface ProjectMeta {
  version?: string;
  language?: string;
  branch?: string;
  package?: string;
  apiEndpoint?: string;
}

export interface PipelineInput {
  key: string;
  title: string;
  description?: string;
}

export interface PipelineOutput {
  title: string;
  description?: string;
}

export interface WorkflowStep {
  order: number;
  label: string;
}

export interface PipelineSummary {
  inputs: PipelineInput[];
  outputs: PipelineOutput[];
  workflowSteps: WorkflowStep[];
}

export interface OverviewDoc {
  slug: string;
  title: string;
  content: string;
}

export interface MasterListItem {
  id: string;
  title?: string;
}

export interface MasterList {
  id: string;
  projectId: string;
  items: MasterListItem[];
  version?: string;
  generatedAt?: DateTimeString;
  status?: MasterListStatus;
  downloadUrl?: string;
}

export interface WbsMilestoneView {
  id: string;
  type: "A" | "B";
  label: string;
  date: DateString;
}

export interface GeneratedSchedule {
  id: string;
  projectId: string;
  milestones: { id: string; title?: string; date?: DateString }[];
  basedOn?: string;
  generatedAt?: DateTimeString;
  downloadUrl?: string;
}

export interface ExportFile {
  id: string;
  projectId: string;
  format: ExportFormat;
  sourceOutput?: string;
  createdAt?: DateTimeString;
  downloadUrl?: string;
}

export interface OverviewOutputs {
  masterLists: MasterList[];
  generatedSchedules: GeneratedSchedule[];
  exportFiles: ExportFile[];
}

// ---------------------------------------------------------------------------
// Pipeline inputs (runtime.md §2)
// ---------------------------------------------------------------------------

export type InputSourceType = "document" | "master-list" | "baseline";

export interface SourceDocument {
  id: string;
  projectId: string;
  fileName: string;
  fileType?: string | null;
  uploadedAt?: string | null;
  parsedStatus?: ParsedStatus | null;
}

export interface ExistingMasterListInput {
  id: string;
  projectId: string;
  fileName?: string | null;
  version?: string | null;
  itemCount?: number | null;
}

export interface BaselineScheduleInput {
  id: string;
  projectId: string;
  fileName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface InputsResponse {
  documents: SourceDocument[];
  masterLists: ExistingMasterListInput[];
  baselines: BaselineScheduleInput[];
}

// ---------------------------------------------------------------------------
// TaskIA
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
  linkedWbsId?: string;
  createdAt?: DateTimeString;
  updatedAt?: DateTimeString;
}

// ---------------------------------------------------------------------------
// WBSItem — derived view
// ---------------------------------------------------------------------------

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

export interface WbsResponse {
  items: WBSItem[];
  milestones: WbsMilestoneView[];
  overallProgress: number;
  timeAxis: { startDate: DateString | null; endDate: DateString | null };
}

// ---------------------------------------------------------------------------
// Issue — GitHub mirror + local overlay
// ---------------------------------------------------------------------------

/**
 * Wire shape returned by the API. NOTE: data-schema.md names this field
 * `number`, but api-contract.md's actual JSON examples use `id` — we follow
 * the wire contract (api-contract.md), matching the backend implementation.
 */
export interface IssueView {
  id: number;
  title: string;
  body: string;
  state: IssueState;
  labels: string[];
  assignee: string | null;
  createdAt: DateTimeString;
  htmlUrl: string;
  priority: Priority;
  linkedWorkItems: string[];
}

// ---------------------------------------------------------------------------
// WorkItem
// ---------------------------------------------------------------------------

export interface WorkItem {
  id: string;
  title: string;
  owner?: string | null;
  status?: WorkStatus;
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
  linkedIssue?: string | null;
  linkedAgent?: string | null;
  // Agent loop (runtime.md §4): the agent that claimed this work item, and when.
  executor?: string | null;
  claimedAt?: string | null;
  // Decomposition (runtime.md §8): parent work item when split from a larger goal.
  parentId?: string | null;
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export interface Agent {
  id: string;
  name: string;
  status?: AgentStatus;
  description?: string;
  planNote?: string;
  references?: string[];
  createdAt?: DateTimeString;
  updatedAt?: DateTimeString;
}

// ---------------------------------------------------------------------------
// List/page envelope (api-contract.md §1.3)
// ---------------------------------------------------------------------------

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}

/**
 * REST client for the console backend (api-contract.md). All calls run from
 * client components so a loading state is always visible on mount, matching
 * the foundation.md §8 common-state contract (loading → populated | error).
 */
"use client";

import type {
  Agent,
  AgentStatus,
  CommonStatus,
  OverviewDoc,
  OverviewOutputs,
  Page,
  PipelineSummary,
  ProjectMeta,
  Priority,
  TaskIA,
  TaskNodeType,
  WbsResponse,
  WorkItem,
  WorkStatus,
  IssueView,
  IssueState,
} from "./types";

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "알 수 없는 오류가 발생했습니다.";
}

type QueryValue = string | number | undefined | null;

function toQuery(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = body?.error?.message ?? "요청을 처리할 수 없습니다.";
    const code = body?.error?.code ?? "internal_error";
    throw new ApiError(response.status, code, message);
  }

  return body as T;
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export function getOverviewMeta(): Promise<{ meta: ProjectMeta; pipeline: PipelineSummary }> {
  return request("/overview/meta");
}

export function getOverviewDoc(slug: string): Promise<OverviewDoc> {
  return request(`/overview/docs/${encodeURIComponent(slug)}`);
}

export function getOverviewOutputs(): Promise<OverviewOutputs> {
  return request("/overview/outputs");
}

export function resolveDownloadUrl(downloadUrl: string): string {
  return `${API_BASE_URL}${downloadUrl}`;
}

// ---------------------------------------------------------------------------
// Task (IA tree)
// ---------------------------------------------------------------------------

export function listTasks(status?: CommonStatus): Promise<TaskIA[]> {
  return request(`/tasks${toQuery({ status })}`);
}

export interface TaskWritePayload {
  type: TaskNodeType;
  title: string;
  parentId?: string | null;
  status?: CommonStatus;
  owner?: string;
  startDate?: string | null;
  endDate?: string | null;
  progress?: number;
  order?: number;
}

export function createTask(payload: TaskWritePayload): Promise<TaskIA> {
  return request("/tasks", { method: "POST", body: JSON.stringify(payload) });
}

export function updateTask(id: string, payload: Partial<TaskWritePayload>): Promise<TaskIA> {
  return request(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteTask(id: string): Promise<void> {
  return request(`/tasks/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// WBS (read-only)
// ---------------------------------------------------------------------------

export function getWbs(): Promise<WbsResponse> {
  return request("/wbs");
}

// ---------------------------------------------------------------------------
// Work (Backlog / Kanban)
// ---------------------------------------------------------------------------

export interface ListWorkParams {
  status?: WorkStatus;
  q?: string;
  page?: number;
  size?: number;
}

export function listWork(params: ListWorkParams = {}): Promise<Page<WorkItem>> {
  return request(`/work${toQuery({ ...params })}`);
}

export interface WorkWritePayload {
  title: string;
  owner?: string | null;
  status?: WorkStatus;
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
  linkedIssue?: string | null;
  linkedAgent?: string | null;
}

export function createWork(payload: WorkWritePayload): Promise<WorkItem> {
  return request("/work", { method: "POST", body: JSON.stringify(payload) });
}

export function getWork(id: string): Promise<WorkItem> {
  return request(`/work/${id}`);
}

export function updateWork(id: string, payload: Partial<WorkWritePayload>): Promise<WorkItem> {
  return request(`/work/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteWork(id: string): Promise<void> {
  return request(`/work/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export interface ListAgentsParams {
  status?: AgentStatus;
  q?: string;
  page?: number;
  size?: number;
}

export function listAgents(params: ListAgentsParams = {}): Promise<Page<Agent>> {
  return request(`/agents${toQuery({ ...params })}`);
}

export interface AgentWritePayload {
  name: string;
  status?: AgentStatus;
  description?: string;
  planNote?: string;
  references?: string[];
}

export function createAgent(payload: AgentWritePayload): Promise<Agent> {
  return request("/agents", { method: "POST", body: JSON.stringify(payload) });
}

export function getAgent(id: string): Promise<Agent> {
  return request(`/agents/${id}`);
}

export function updateAgent(id: string, payload: Partial<AgentWritePayload>): Promise<Agent> {
  return request(`/agents/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteAgent(id: string): Promise<void> {
  return request(`/agents/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Issues (GitHub mirror + local overlay)
// ---------------------------------------------------------------------------

export interface ListIssuesParams {
  state?: IssueState;
  priority?: Priority;
  q?: string;
  page?: number;
  size?: number;
}

export function listIssues(params: ListIssuesParams = {}): Promise<Page<IssueView>> {
  return request(`/issues${toQuery({ ...params })}`);
}

export function getIssue(number: number | string): Promise<IssueView> {
  return request(`/issues/${number}`);
}

export interface IssueCreatePayload {
  title: string;
  body?: string;
  priority?: Priority;
}

export function createIssue(payload: IssueCreatePayload): Promise<IssueView> {
  return request("/issues", { method: "POST", body: JSON.stringify(payload) });
}

export interface IssueOverlayPayload {
  priority?: Priority;
  linkedWorkItems?: string[];
}

export function updateIssueOverlay(number: number | string, payload: IssueOverlayPayload): Promise<IssueView> {
  return request(`/issues/${number}/overlay`, { method: "PATCH", body: JSON.stringify(payload) });
}

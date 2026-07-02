/**
 * 클라이언트 → 로컬 라우트(/api/gh/*) 조회 전용 클라이언트. 라우트는 서버에서 GitHub과
 * 리포 문서를 직접 읽는다(ADR-0002 — 대시보드는 읽기 전용 투영, 쓰기 함수는 존재하지 않는다).
 */
"use client";

import type {
  ActivityItem,
  DocContent,
  DocEntry,
  GhIssue,
  HomeSummary,
  IssueDetail,
  IssueState,
  Page,
  Priority,
  WbsRow,
  WorkStage,
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

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`/api/gh${path}`, { cache: "no-store" });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.error?.code ?? "internal_error",
      body?.error?.message ?? "요청을 처리할 수 없습니다.",
    );
  }
  return body as T;
}

// ── Issues ────────────────────────────────────────────────────────────────
export interface ListIssuesParams {
  state?: IssueState | "all";
  priority?: Priority;
  q?: string;
  page?: number;
  size?: number;
}

export function listIssues(params: ListIssuesParams = {}): Promise<Page<GhIssue>> {
  return request(`/issues${toQuery({ ...params })}`);
}

export function getIssueDetail(number: number | string): Promise<IssueDetail> {
  return request(`/issues/${number}`);
}

// ── Work (이슈 유도 실행 뷰) ──────────────────────────────────────────────
export interface ListWorkParams {
  stage?: WorkStage;
  q?: string;
  page?: number;
  size?: number;
}

export function listWork(params: ListWorkParams = {}): Promise<Page<GhIssue> & { syncNote: string | null }> {
  return request(`/work${toQuery({ ...params })}`);
}

export function listWorkAll(): Promise<{ items: GhIssue[]; total: number; syncNote: string | null }> {
  return request(`/work?all=1`);
}

// ── 계획 (Task/WBS) ───────────────────────────────────────────────────────
export interface WbsData {
  rows: WbsRow[];
  overallProgress: number;
  timeAxis: { startDate: string | null; endDate: string | null };
}

export function getWbs(): Promise<WbsData> {
  return request(`/wbs`);
}

// ── 홈·활동 ───────────────────────────────────────────────────────────────
export function getSummary(): Promise<HomeSummary> {
  return request(`/summary`);
}

export function getActivity(): Promise<{ items: ActivityItem[] }> {
  return request(`/activity`);
}

// ── 문서 브라우저 ─────────────────────────────────────────────────────────
export function listDocEntries(path: string): Promise<{ entries: DocEntry[] }> {
  return request(`/docs${toQuery({ path })}`);
}

export function getDocContent(path: string): Promise<DocContent> {
  return request(`/docs${toQuery({ path, content: 1 })}`);
}

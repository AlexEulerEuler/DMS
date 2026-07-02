/** 라우트 핸들러 공통: 조회 조립 + 오류 응답 규약(구 api-contract의 error envelope 유지). */
// 서버 전용 모듈 — 클라이언트 컴포넌트에서 import 금지 (라우트 핸들러만 사용)

import { NextResponse } from "next/server";

import { GitHubError, listIssuesRaw, listPullsRaw, LIST_LIMIT } from "./github";
import { indexOpenPullsByIssue, toGhIssue } from "./derive";
import type { GhIssue } from "../types";

export function errorResponse(error: unknown): NextResponse {
  const status = error instanceof GitHubError ? error.status : 500;
  const message = error instanceof Error ? error.message : "알 수 없는 오류";
  return NextResponse.json({ error: { code: "github_error", message } }, { status: status >= 400 ? status : 500 });
}

/** 이슈 + open PR 연결을 한 번에 조립 (모든 화면의 공통 원천). */
export async function loadIssues(): Promise<{ issues: GhIssue[]; syncNote: string | null }> {
  const [rawIssues, rawPulls] = await Promise.all([listIssuesRaw("all"), listPullsRaw("open")]);
  const pullIndex = indexOpenPullsByIssue(rawPulls);
  const issues = rawIssues.map((i) => toGhIssue(i, pullIndex));
  const syncNote =
    rawIssues.length >= LIST_LIMIT
      ? `최근 ${LIST_LIMIT}건만 표시 — 전체는 GitHub에서 확인`
      : null;
  return { issues, syncNote };
}

export function paginate<T>(items: T[], page: number, size: number) {
  return { items: items.slice((page - 1) * size, page * size), total: items.length, page, size };
}

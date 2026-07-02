/**
 * GitHub 사실 → 화면 상태 유도. 규칙의 정본은 docs/policy/10-dev-workflow.md §1(상태 판정
 * 우선순위)·§4(라벨 사전) — 여기서 새 규칙을 발명하지 않는다.
 */
// 서버 전용 모듈 — 클라이언트 컴포넌트에서 import 금지 (라우트 핸들러만 사용)

import type { RawCommit, RawIssue, RawPull } from "./github";
import type { GhIssue, Priority, WorkStage } from "../types";

const PRIORITY_BY_LABEL: Record<string, Priority> = {
  P0: "urgent",
  P1: "high",
  P2: "normal",
  P3: "low",
};

export function labelNames(issue: { labels: { name: string }[] }): string[] {
  return issue.labels.map((l) => l.name);
}

export function derivePriority(labels: string[]): Priority {
  for (const l of labels) if (PRIORITY_BY_LABEL[l]) return PRIORITY_BY_LABEL[l];
  return "normal";
}

export function deriveTaskId(labels: string[]): string | null {
  const label = labels.find((l) => /^task:T-\d{3,}$/.test(l));
  return label ? label.slice("task:".length) : null;
}

/** PR 본문·제목에서 연결 이슈 번호 추출: Closes/Fixes/Resolves #N + 브랜치 번호. */
export function linkedIssueNumbers(pr: RawPull): number[] {
  const nums = new Set<number>();
  const body = `${pr.title}\n${pr.body ?? ""}`;
  for (const m of body.matchAll(/\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?|refs)\s*:?\s+#(\d+)/gi)) {
    nums.add(Number(m[1]));
  }
  const branch = pr.head.ref.match(/^(?:work|feat|fix|docs|chore|refactor)\/(\d+)-/);
  if (branch) nums.add(Number(branch[1]));
  return [...nums];
}

/** 상태 유도 — 10-dev-workflow §1 판정 우선순위 그대로. */
export function deriveStage(issue: RawIssue, openPullsByIssue: Map<number, RawPull[]>): WorkStage {
  if (issue.state === "closed") return "done";
  const labels = labelNames(issue);
  if (labels.includes("blocked")) return "blocked";
  const linked = openPullsByIssue.get(issue.number) ?? [];
  if (linked.some((pr) => !pr.draft)) return "review";
  if (issue.assignees.length > 0) return "in_progress";
  if (labels.includes("ready")) return "todo";
  return "backlog";
}

export function indexOpenPullsByIssue(pulls: RawPull[]): Map<number, RawPull[]> {
  const map = new Map<number, RawPull[]>();
  for (const pr of pulls) {
    if (pr.state !== "open") continue;
    for (const num of linkedIssueNumbers(pr)) {
      const list = map.get(num) ?? [];
      list.push(pr);
      map.set(num, list);
    }
  }
  return map;
}

export function toGhIssue(issue: RawIssue, openPullsByIssue: Map<number, RawPull[]>): GhIssue {
  const labels = labelNames(issue);
  return {
    number: issue.number,
    title: issue.title,
    body: issue.body ?? "",
    state: issue.state,
    labels,
    assignees: issue.assignees.map((a) => a.login),
    author: issue.user?.login ?? null,
    createdAt: issue.created_at,
    closedAt: issue.closed_at,
    htmlUrl: issue.html_url,
    commentsCount: issue.comments,
    priority: derivePriority(labels),
    taskId: deriveTaskId(labels),
    stage: deriveStage(issue, openPullsByIssue),
    linkedPulls: (openPullsByIssue.get(issue.number) ?? []).map((pr) => ({
      number: pr.number,
      title: pr.title,
      draft: pr.draft,
      htmlUrl: pr.html_url,
      state: pr.merged_at ? "merged" : pr.state,
      author: pr.user?.login ?? null,
      createdAt: pr.created_at,
    })),
  };
}

/** 에이전트 관여 판정: Agent: 트레일러(1차) 또는 Co-Authored-By/bot(2차). */
export function isAgentCommit(commit: RawCommit): boolean {
  const msg = commit.commit.message;
  if (/^agent:\s*\S+/im.test(msg)) return true;
  if (/^co-authored-by:.*\b(claude|gpt|agent|bot)\b/im.test(msg)) return true;
  if (commit.author?.type === "Bot" || commit.author?.login.endsWith("[bot]")) return true;
  return false;
}

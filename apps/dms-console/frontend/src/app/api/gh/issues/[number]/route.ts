import { NextResponse } from "next/server";

import { getIssueRaw, listIssueComments, listPullsRaw } from "@/lib/server/github";
import { indexOpenPullsByIssue, linkedIssueNumbers, toGhIssue } from "@/lib/server/derive";
import { errorResponse } from "@/lib/server/routes";
import type { IssueDetail, TimelineEvent } from "@/lib/types";

export async function GET(_req: Request, context: { params: Promise<{ number: string }> }) {
  try {
    const num = Number((await context.params).number);
    const [raw, comments, allPulls] = await Promise.all([
      getIssueRaw(num),
      listIssueComments(num),
      listPullsRaw("all"),
    ]);
    const openIndex = indexOpenPullsByIssue(allPulls.filter((p) => p.state === "open"));
    const issue = toGhIssue(raw, openIndex);

    // 타임라인: 오픈 → 코멘트 → 연결 PR(전 상태) → 클로즈, 시간순
    const events: TimelineEvent[] = [
      { kind: "issue_opened" as const, actor: raw.user?.login ?? null, at: raw.created_at, title: "이슈 생성" },
      ...comments.map<TimelineEvent>((c) => ({
        kind: "comment",
        actor: c.user?.login ?? null,
        at: c.created_at,
        title: "코멘트",
        body: c.body,
        htmlUrl: c.html_url,
      })),
      ...allPulls
        .filter((pr) => linkedIssueNumbers(pr).includes(num))
        .map<TimelineEvent>((pr) => ({
          kind: "pr",
          actor: pr.user?.login ?? null,
          at: pr.created_at,
          title: `PR #${pr.number} ${pr.merged_at ? "(머지됨)" : pr.state === "closed" ? "(닫힘)" : pr.draft ? "(draft)" : "(리뷰중)"} — ${pr.title}`,
          htmlUrl: pr.html_url,
        })),
      ...(raw.closed_at
        ? [{ kind: "closed" as const, actor: null, at: raw.closed_at, title: "이슈 종료" }]
        : []),
    ].sort((a, b) => a.at.localeCompare(b.at));

    const detail: IssueDetail = { issue, timeline: events };
    return NextResponse.json(detail);
  } catch (error) {
    return errorResponse(error);
  }
}

import { NextResponse } from "next/server";

import { listCommitsRaw, listPullsRaw } from "@/lib/server/github";
import { isAgentCommit } from "@/lib/server/derive";
import { errorResponse } from "@/lib/server/routes";
import type { ActivityItem } from "@/lib/types";

/** 실행 주체 활동 뷰 — 사람/에이전트 관여를 구분해 최근 활동을 나열. */
export async function GET() {
  try {
    const [pulls, commits] = await Promise.all([listPullsRaw("all"), listCommitsRaw(50)]);
    const items: ActivityItem[] = [
      ...pulls.map<ActivityItem>((pr) => ({
        kind: "pr",
        title: pr.title,
        actor: pr.user?.login ?? null,
        agentInvolved: pr.labels.some((l) => l.name === "by:agent"),
        at: pr.updated_at,
        htmlUrl: pr.html_url,
        ref: `#${pr.number}`,
      })),
      ...commits.map<ActivityItem>((c) => ({
        kind: "commit",
        title: c.commit.message.split("\n")[0],
        actor: c.author?.login ?? c.commit.author?.name ?? null,
        agentInvolved: isAgentCommit(c),
        at: c.commit.author?.date ?? "",
        htmlUrl: c.html_url,
        ref: c.sha.slice(0, 7),
      })),
    ].sort((a, b) => b.at.localeCompare(a.at));
    return NextResponse.json({ items });
  } catch (error) {
    return errorResponse(error);
  }
}

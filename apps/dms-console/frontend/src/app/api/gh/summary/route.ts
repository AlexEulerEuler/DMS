import { NextResponse } from "next/server";

import { listCommitsRaw, listPullsRaw } from "@/lib/server/github";
import { isAgentCommit } from "@/lib/server/derive";
import { errorResponse, loadIssues } from "@/lib/server/routes";
import type { ActivityItem, HomeSummary, Priority } from "@/lib/types";

export async function GET() {
  try {
    const [{ issues, syncNote }, pulls, commits] = await Promise.all([
      loadIssues(),
      listPullsRaw("all"),
      listCommitsRaw(30),
    ]);

    const work = issues.filter((i) => i.labels.some((l) => l.startsWith("type:")));
    const open = work.filter((i) => i.state === "open");
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

    const priorityCounts: Record<Priority, number> = { urgent: 0, high: 0, normal: 0, low: 0 };
    for (const i of open) priorityCounts[i.priority] += 1;

    const recent: ActivityItem[] = [
      ...pulls.slice(0, 15).map<ActivityItem>((pr) => ({
        kind: "pr",
        title: pr.title,
        actor: pr.user?.login ?? null,
        agentInvolved: false,
        at: pr.updated_at,
        htmlUrl: pr.html_url,
        ref: `#${pr.number}`,
      })),
      ...commits.slice(0, 15).map<ActivityItem>((c) => ({
        kind: "commit",
        title: c.commit.message.split("\n")[0],
        actor: c.author?.login ?? c.commit.author?.name ?? null,
        agentInvolved: isAgentCommit(c),
        at: c.commit.author?.date ?? "",
        htmlUrl: c.html_url,
        ref: c.sha.slice(0, 7),
      })),
    ]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 12);

    const summary: HomeSummary = {
      openWork: open.length,
      readyWork: open.filter((i) => i.stage === "todo").length,
      inProgress: open.filter((i) => i.stage === "in_progress").length,
      inReview: open.filter((i) => i.stage === "review").length,
      mergedThisWeek: pulls.filter((pr) => pr.merged_at && pr.merged_at >= weekAgo).length,
      priorityCounts,
      recent,
      syncNote,
    };
    return NextResponse.json(summary);
  } catch (error) {
    return errorResponse(error);
  }
}

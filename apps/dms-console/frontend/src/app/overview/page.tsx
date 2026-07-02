"use client";

import Link from "next/link";

import { Card, CardGrid } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { ErrorState, LoadingSkeleton } from "@/components/StateViews";
import { errorMessage, getSummary } from "@/lib/api-client";
import { useAsyncData } from "@/lib/hooks";
import { formatDateTime } from "@/lib/format";
import { PRIORITY_LABEL } from "@/lib/types";
import type { Priority } from "@/lib/types";

/** 홈 — GitHub 사실에서 유도된 진행 요약 + 최근 활동 피드 (읽기 전용 투영). */
export default function OverviewHomePage() {
  const { state, reload } = useAsyncData(getSummary, []);

  if (state.status === "loading") {
    return (
      <>
        <PageHeader title="Overview" description="진행 요약과 최근 활동 — 정본은 GitHub과 리포 문서" />
        <LoadingSkeleton variant="cards" rows={4} />
      </>
    );
  }
  if (state.status === "error") {
    return (
      <>
        <PageHeader title="Overview" description="진행 요약과 최근 활동 — 정본은 GitHub과 리포 문서" />
        <ErrorState description={errorMessage(state.error)} onRetry={reload} />
      </>
    );
  }

  const s = state.data;
  const priorities = (Object.keys(PRIORITY_LABEL) as Priority[]).filter((p) => s.priorityCounts[p] > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <PageHeader
        title="Overview"
        description="진행 요약과 최근 활동 — 정본은 GitHub과 리포 문서, 이 화면은 읽기 전용 투영"
        summary={s.syncNote ?? undefined}
        actions={
          <Button variant="secondary" onClick={reload}>
            새로고침
          </Button>
        }
      />

      <CardGrid>
        <Card title="열린 작업">
          <strong style={{ fontSize: "1.6em" }}>{s.openWork}</strong>
          <div style={{ color: "var(--color-text-muted)", marginTop: "var(--space-2)" }}>
            착수 가능 {s.readyWork} · 진행중 {s.inProgress} · 리뷰중 {s.inReview}
          </div>
        </Card>
        <Card title="이번 주 머지">
          <strong style={{ fontSize: "1.6em" }}>{s.mergedThisWeek}</strong>
          <div style={{ color: "var(--color-text-muted)", marginTop: "var(--space-2)" }}>최근 7일 머지된 PR</div>
        </Card>
        <Card title="우선순위 분포 (열린 작업)">
          {priorities.length === 0 ? (
            <span style={{ color: "var(--color-text-muted)" }}>열린 작업 없음</span>
          ) : (
            <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
              {priorities.map((p) => (
                <Badge key={p} tone={p === "urgent" ? "error" : p === "high" ? "warning" : "neutral"}>
                  {PRIORITY_LABEL[p]} {s.priorityCounts[p]}
                </Badge>
              ))}
            </div>
          )}
        </Card>
        <Card title="바로가기">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <Link href="/overview/docs">프로젝트 문서 브라우저</Link>
            <Link href="/work/kanban">작업 Kanban</Link>
            <Link href="/wbs">진행현황(WBS)</Link>
          </div>
        </Card>
      </CardGrid>

      <Card title="최근 활동">
        {s.recent.length === 0 ? (
          <span style={{ color: "var(--color-text-muted)" }}>활동 없음</span>
        ) : (
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {s.recent.map((item) => (
              <li key={`${item.kind}-${item.ref}`} style={{ display: "flex", gap: "var(--space-2)", alignItems: "baseline", flexWrap: "wrap" }}>
                <Badge tone={item.kind === "pr" ? "primary" : "neutral"} size="sm">
                  {item.kind === "pr" ? "PR" : "커밋"}
                </Badge>
                <a href={item.htmlUrl} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>
                  {item.ref} {item.title}
                </a>
                <span style={{ color: "var(--color-text-muted)", fontSize: "0.85em" }}>
                  {item.actor ?? "?"} · {formatDateTime(item.at)}
                </span>
                {item.agentInvolved ? (
                  <Badge tone="info" size="sm">
                    에이전트
                  </Badge>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}

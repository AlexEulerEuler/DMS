"use client";

import { use } from "react";
import Link from "next/link";

import { errorMessage, getIssueDetail } from "@/lib/api-client";
import { useAsyncData } from "@/lib/hooks";
import { formatDateTime } from "@/lib/format";
import { WORK_STAGE_LABEL } from "@/lib/types";
import type { TimelineEvent } from "@/lib/types";

import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { PriorityChip, LabelChip } from "@/components/Chips";
import { LoadingSkeleton, ErrorState, NotFound } from "@/components/StateViews";

const EVENT_ICON: Record<TimelineEvent["kind"], string> = {
  issue_opened: "○",
  comment: "•",
  pr: "⇄",
  closed: "●",
};

/** 작업 타임라인 — "로그성 기록을 보기 좋게"의 실체. 이슈 오픈→코멘트→PR→클로즈를 시간순으로. */
export default function WorkDetailPage({ params }: { params: Promise<{ workId: string }> }) {
  const { workId } = use(params);
  const { state, reload } = useAsyncData(() => getIssueDetail(workId), [workId]);

  if (state.status === "loading") return <LoadingSkeleton variant="text" rows={8} />;
  if (state.status === "error") {
    const message = errorMessage(state.error);
    return message.includes("404") ? (
      <NotFound description="존재하지 않는 작업(이슈) 번호입니다." />
    ) : (
      <ErrorState description={message} onRetry={reload} />
    );
  }

  const { issue, timeline } = state.data;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <PageHeader
        title={`#${issue.number} ${issue.title}`}
        description={`단계: ${WORK_STAGE_LABEL[issue.stage]} · 담당: ${issue.assignees.join(", ") || "미지정"}${issue.taskId ? ` · 계획: ${issue.taskId}` : ""}`}
        actions={
          <>
            <Button variant="secondary" onClick={reload}>
              새로고침
            </Button>
            <a href={issue.htmlUrl} target="_blank" rel="noreferrer">
              <Button variant="primary">GitHub에서 열기</Button>
            </a>
          </>
        }
      />

      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "center" }}>
        <PriorityChip priority={issue.priority} size="sm" />
        {issue.labels.map((label) => (
          <LabelChip key={label} name={label} size="sm" />
        ))}
      </div>

      {issue.body ? (
        <Card title="작업 정의">
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{issue.body}</pre>
        </Card>
      ) : null}

      <Card title={`타임라인 (${timeline.length})`}>
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {timeline.map((event, index) => (
            <li key={index} style={{ display: "flex", gap: "var(--space-3)", alignItems: "baseline" }}>
              <span aria-hidden style={{ width: 20, textAlign: "center" }}>{EVENT_ICON[event.kind]}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "baseline" }}>
                  {event.htmlUrl ? (
                    <a href={event.htmlUrl} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>
                      {event.title}
                    </a>
                  ) : (
                    <span style={{ fontWeight: 600 }}>{event.title}</span>
                  )}
                  <span style={{ color: "var(--color-text-muted)", fontSize: "0.85em" }}>
                    {event.actor ? `${event.actor} · ` : ""}
                    {formatDateTime(event.at)}
                  </span>
                </div>
                {event.body ? (
                  <div
                    style={{
                      whiteSpace: "pre-wrap",
                      color: "var(--color-text-muted)",
                      marginTop: "var(--space-1)",
                      maxHeight: 200,
                      overflow: "auto",
                    }}
                  >
                    {event.body}
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <div>
        <Link href="/work/backlog">← Backlog으로</Link>
        {" · "}
        <Link href="/work/kanban">Kanban 보기</Link>
        {issue.linkedPulls.length > 0 ? (
          <>
            {" · 연결 PR: "}
            {issue.linkedPulls.map((pr) => (
              <a key={pr.number} href={pr.htmlUrl} target="_blank" rel="noreferrer" style={{ marginRight: 8 }}>
                #{pr.number}{" "}
                <Badge tone={pr.state === "merged" ? "primary" : pr.draft ? "neutral" : "success"} size="sm">
                  {pr.state === "merged" ? "머지됨" : pr.draft ? "draft" : "리뷰중"}
                </Badge>
              </a>
            ))}
          </>
        ) : null}
      </div>
    </div>
  );
}

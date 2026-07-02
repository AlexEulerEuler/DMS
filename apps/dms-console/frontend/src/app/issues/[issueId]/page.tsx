"use client";

import { use } from "react";
import Link from "next/link";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { IssueStateChip, LabelChip, PriorityChip } from "@/components/Chips";
import { ErrorState, LoadingSkeleton, NotFound } from "@/components/StateViews";
import { useAsyncData } from "@/lib/hooks";
import { getIssueDetail, errorMessage } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";

export default function IssueDetailPage({ params }: { params: Promise<{ issueId: string }> }) {
  const { issueId } = use(params);
  const { state, reload } = useAsyncData(() => getIssueDetail(issueId), [issueId]);

  if (state.status === "loading") return <LoadingSkeleton variant="text" rows={8} />;
  if (state.status === "error") {
    const message = errorMessage(state.error);
    return message.includes("404") ? (
      <NotFound description="존재하지 않는 이슈 번호입니다." />
    ) : (
      <ErrorState description={message} onRetry={reload} />
    );
  }

  const { issue, timeline } = state.data;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <PageHeader
        title={`#${issue.number} ${issue.title}`}
        description={`작성: ${issue.author ?? "?"} · ${formatDateTime(issue.createdAt)} · 코멘트 ${issue.commentsCount}`}
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
        <IssueStateChip state={issue.state} size="sm" />
        <PriorityChip priority={issue.priority} size="sm" />
        {issue.labels.map((label) => (
          <LabelChip key={label} name={label} size="sm" />
        ))}
        {issue.taskId ? <span style={{ color: "var(--color-text-muted)" }}>계획: {issue.taskId}</span> : null}
      </div>

      {issue.body ? (
        <Card title="본문">
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{issue.body}</pre>
        </Card>
      ) : null}

      <Card title={`타임라인 (${timeline.length})`}>
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {timeline.map((event, index) => (
            <li key={index}>
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
                    maxHeight: 160,
                    overflow: "auto",
                  }}
                >
                  {event.body}
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      </Card>

      <div>
        <Link href="/issues">← 이슈 목록으로</Link>
        {issue.stage !== "backlog" ? (
          <>
            {" · "}
            <Link href={`/work/${issue.number}`}>작업 타임라인 보기</Link>
          </>
        ) : null}
      </div>
    </div>
  );
}

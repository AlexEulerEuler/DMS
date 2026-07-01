"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { Select } from "@/components/forms";
import { IssueStateChip, LabelChip } from "@/components/Chips";
import { ErrorState, LoadingSkeleton, NotFound } from "@/components/StateViews";
import { useAsyncData } from "@/lib/hooks";
import { ApiError, getIssue, updateIssueOverlay, errorMessage } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import type { Priority } from "@/lib/types";
import { PRIORITY_LABEL } from "@/lib/types";

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "urgent", label: PRIORITY_LABEL.urgent },
  { value: "high", label: PRIORITY_LABEL.high },
  { value: "normal", label: PRIORITY_LABEL.normal },
  { value: "low", label: PRIORITY_LABEL.low },
];

const metaRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "120px 1fr",
  gap: "var(--space-2)",
  alignItems: "center",
};

const labelStyle: CSSProperties = {
  color: "var(--color-text-muted)",
  fontSize: "var(--font-size-caption)",
};

export default function IssueDetailPage() {
  const router = useRouter();
  const params = useParams<{ issueId: string }>();
  const issueId = params.issueId;

  const { state, reload } = useAsyncData(() => getIssue(issueId), [issueId]);

  const [priority, setPriority] = useState<Priority>("normal");
  const [prioritySaveError, setPrioritySaveError] = useState<string | undefined>();
  const [savingPriority, setSavingPriority] = useState(false);

  useEffect(() => {
    if (state.status === "success") {
      setPriority(state.data.priority);
    }
  }, [state]);

  if (state.status === "loading") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
        <PageHeader breadcrumb={[{ label: "Issues", to: "/issues" }, { label: `#${issueId}` }]} title="이슈 상세" />
        <LoadingSkeleton variant="text" rows={6} />
      </div>
    );
  }

  if (state.status === "error") {
    const error = state.error;
    if (error instanceof ApiError && error.status === 404) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          <PageHeader breadcrumb={[{ label: "Issues", to: "/issues" }, { label: `#${issueId}` }]} title="이슈 상세" />
          <NotFound
            title="이슈를 찾을 수 없습니다"
            description={`#${issueId} 이슈가 존재하지 않습니다.`}
            action={
              <Button variant="secondary" onClick={() => router.push("/issues")}>
                목록으로
              </Button>
            }
          />
        </div>
      );
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
        <PageHeader breadcrumb={[{ label: "Issues", to: "/issues" }, { label: `#${issueId}` }]} title="이슈 상세" />
        <ErrorState description="GitHub 연동에 실패했습니다" onRetry={reload} />
      </div>
    );
  }

  const issue = state.data;

  async function changePriority(next: Priority) {
    const previous = priority;
    setPriority(next);
    setPrioritySaveError(undefined);
    setSavingPriority(true);
    try {
      await updateIssueOverlay(issueId, { priority: next });
    } catch (error) {
      setPriority(previous);
      setPrioritySaveError(errorMessage(error));
    } finally {
      setSavingPriority(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <PageHeader
        breadcrumb={[{ label: "Issues", to: "/issues" }, { label: `#${issue.id}` }]}
        title={`#${issue.id} ${issue.title}`}
        summary={
          <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-3)" }}>
            <IssueStateChip state={issue.state} size="sm" />
            <a
              href={issue.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--color-primary)", fontSize: "var(--font-size-caption)" }}
            >
              GitHub ↗
            </a>
          </span>
        }
      />

      <section
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
          padding: "var(--space-4)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
        }}
      >
        <div style={metaRowStyle}>
          <span style={labelStyle}>상태</span>
          <IssueStateChip state={issue.state} size="sm" />
        </div>

        <div style={metaRowStyle}>
          <span style={labelStyle}>우선순위</span>
          <span style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", maxWidth: "220px" }}>
              <Select
                value={priority}
                options={PRIORITY_OPTIONS}
                onChange={changePriority}
                disabled={savingPriority}
              />
            </span>
            <span style={labelStyle}>콘솔 로컬에 저장됩니다 (GitHub로 내보내지 않음).</span>
            {prioritySaveError ? (
              <span role="alert" style={{ color: "var(--color-error)", fontSize: "var(--font-size-caption)" }}>
                저장 실패: {prioritySaveError}
              </span>
            ) : null}
          </span>
        </div>

        <div style={metaRowStyle}>
          <span style={labelStyle}>담당자</span>
          {issue.assignee ? (
            <span>{issue.assignee}</span>
          ) : (
            <span style={{ color: "var(--color-text-muted)" }}>미지정</span>
          )}
        </div>

        <div style={metaRowStyle}>
          <span style={labelStyle}>라벨</span>
          {issue.labels.length > 0 ? (
            <span style={{ display: "inline-flex", flexWrap: "wrap", gap: "var(--space-1)" }}>
              {issue.labels.map((label) => (
                <LabelChip key={label} name={label} size="sm" />
              ))}
            </span>
          ) : (
            <span style={{ color: "var(--color-text-muted)" }}>-</span>
          )}
        </div>

        <div style={metaRowStyle}>
          <span style={labelStyle}>등록일</span>
          <span>{formatDate(issue.createdAt)}</span>
        </div>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <h2 style={{ fontSize: "var(--font-size-section)", margin: 0 }}>본문</h2>
        <p style={{ ...labelStyle, margin: 0 }}>GitHub 원문 (읽기 전용)</p>
        <div
          style={{
            padding: "var(--space-4)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border)",
            background: "var(--color-surface)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontSize: "var(--font-size-body)",
          }}
        >
          {issue.body ? issue.body : <span style={{ color: "var(--color-text-muted)" }}>본문이 없습니다.</span>}
        </div>
      </section>

      <section
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
          padding: "var(--space-4)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
        }}
      >
        <h2 style={{ fontSize: "var(--font-size-section)", margin: 0 }}>연결된 작업</h2>
        {issue.linkedWorkItems.length > 0 ? (
          <ul style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", margin: 0, padding: 0, listStyle: "none" }}>
            {issue.linkedWorkItems.map((workId) => (
              <li key={workId}>
                <Link href={`/work/${workId}`} style={{ color: "var(--color-primary)" }}>
                  작업 {workId}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <p style={{ ...labelStyle, margin: 0 }}>연결된 작업이 없습니다.</p>
            <span>
              <Button variant="secondary" onClick={() => router.push("/work/new")}>
                작업 생성
              </Button>
            </span>
          </div>
        )}
      </section>
    </div>
  );
}

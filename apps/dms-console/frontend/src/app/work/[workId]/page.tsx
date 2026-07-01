"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import {
  getWork,
  updateWork,
  deleteWork,
  listIssues,
  listAgents,
  ApiError,
  errorMessage,
} from "@/lib/api-client";
import { useAsyncData } from "@/lib/hooks";
import { formatDateRange } from "@/lib/format";
import type { Agent, IssueView, Page, WorkItem, WorkStatus } from "@/lib/types";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { StatusChip } from "@/components/Chips";
import { Modal } from "@/components/Modal";
import { LoadingSkeleton, ErrorState } from "@/components/StateViews";

import { WorkForm, dateRangeError } from "../WorkForm";
import type { WorkFormValues } from "../WorkForm";

interface DetailData {
  work: WorkItem;
  issues: IssueView[];
  agents: Agent[];
}

function toFormValues(work: WorkItem): WorkFormValues {
  return {
    title: work.title ?? "",
    owner: work.owner ?? "",
    status: work.status ?? "planned",
    startDate: work.startDate ?? null,
    endDate: work.endDate ?? null,
    description: work.description ?? "",
    linkedIssue: work.linkedIssue ?? "",
    linkedAgent: work.linkedAgent ?? "",
  };
}

export default function WorkDetailPage() {
  const router = useRouter();
  const params = useParams<{ workId: string }>();
  const workId = params.workId;

  const { state, reload } = useAsyncData<DetailData>(async () => {
    // getWork is the source of truth; a 404 here propagates for not-found UI.
    const work = await getWork(workId);
    // Connection candidates are best-effort and never block the detail view.
    const [issuesResult, agentsResult] = await Promise.allSettled([listIssues({}), listAgents({})]);
    const issues = issuesResult.status === "fulfilled" ? (issuesResult.value as Page<IssueView>).items : [];
    const agents = agentsResult.status === "fulfilled" ? (agentsResult.value as Page<Agent>).items : [];
    return { work, issues, agents };
  }, [workId]);

  const [values, setValues] = useState<WorkFormValues | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showTitleError, setShowTitleError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (state.status === "success") setValues(toFormValues(state.data.work));
  }, [state]);

  // Invalid workId → 오류 안내 + 목록 복귀 경로 (screens.md B-2, not bare NotFound).
  if (state.status === "error") {
    const is404 = state.error instanceof ApiError && state.error.status === 404;
    if (is404) {
      return (
        <div>
          <PageHeader
            title="작업을 찾을 수 없습니다"
            breadcrumb={[{ label: "Backlog", to: "/work/backlog" }]}
          />
          <div role="alert" style={{ color: "var(--color-error)", marginBottom: "var(--space-4)" }}>
            유효하지 않은 작업입니다.
          </div>
          <Link href="/work/backlog" style={{ color: "var(--color-primary)", textDecoration: "underline" }}>
            목록으로
          </Link>
        </div>
      );
    }
    return (
      <div>
        <PageHeader title="작업 상세" breadcrumb={[{ label: "Backlog", to: "/work/backlog" }]} />
        <ErrorState description={errorMessage(state.error)} onRetry={reload} />
      </div>
    );
  }

  if (state.status === "loading" || !values) {
    return (
      <div>
        <PageHeader title="작업 상세" breadcrumb={[{ label: "Backlog", to: "/work/backlog" }]} />
        <LoadingSkeleton variant="form" rows={6} />
      </div>
    );
  }

  const { work, issues, agents } = state.data;

  const issueOptions = issues.map((issue) => ({
    value: String(issue.id),
    label: `#${issue.id} ${issue.title}`,
  }));
  const agentOptions = agents.map((agent) => ({ value: agent.id, label: agent.name }));

  const dateError = dateRangeError(values.startDate, values.endDate);
  const titleError = showTitleError && !values.title.trim() ? "작업명을 입력하세요." : undefined;

  const status: WorkStatus = work.status ?? "planned";

  function patch(next: Partial<WorkFormValues>) {
    setValues((current) => (current ? { ...current, ...next } : current));
  }

  async function handleSave() {
    if (!values) return;
    if (!values.title.trim()) {
      setShowTitleError(true);
      return;
    }
    if (dateRangeError(values.startDate, values.endDate)) return;

    setSaving(true);
    setSaveError(null);
    try {
      await updateWork(workId, {
        title: values.title.trim(),
        owner: values.owner || null,
        status: values.status,
        startDate: values.startDate,
        endDate: values.endDate,
        description: values.description || null,
        linkedIssue: values.linkedIssue || null,
        linkedAgent: values.linkedAgent || null,
      });
      reload();
    } catch (error) {
      setSaveError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteWork(workId);
      router.push("/work/backlog");
    } catch (error) {
      setSaveError(errorMessage(error));
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={work.title}
        breadcrumb={[{ label: "Backlog", to: "/work/backlog" }, { label: work.title }]}
        summary={
          <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center", flexWrap: "wrap" }}>
            <StatusChip status={{ domain: "work", value: status }} />
            <span style={{ color: "var(--color-text-muted)" }}>담당: {work.owner || "미지정"}</span>
            <span style={{ color: "var(--color-text-muted)" }}>
              일정: {formatDateRange(work.startDate, work.endDate)}
            </span>
          </div>
        }
      />

      <WorkForm
        values={values}
        onChange={patch}
        issueOptions={issueOptions}
        agentOptions={agentOptions}
        titleError={titleError}
        dateError={dateError}
      />

      <LinkedRef
        linkedIssue={work.linkedIssue}
        linkedAgent={work.linkedAgent}
        issues={issues}
        agents={agents}
      />

      {saveError ? (
        <p role="alert" style={{ color: "var(--color-error)", marginTop: "var(--space-4)" }}>
          {saveError}
        </p>
      ) : null}

      <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-6)" }}>
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? "저장 중…" : "저장"}
        </Button>
        <Button variant="danger" onClick={() => setConfirmDelete(true)} disabled={saving}>
          삭제
        </Button>
        <Button variant="secondary" onClick={() => router.push("/work/backlog")} disabled={saving}>
          목록으로
        </Button>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="작업 삭제"
        footer={
          <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)} disabled={deleting}>
              취소
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? "삭제 중…" : "삭제"}
            </Button>
          </div>
        }
      >
        <p>이 작업을 삭제하시겠습니까? 되돌릴 수 없습니다.</p>
      </Modal>
    </div>
  );
}

interface LinkedRefProps {
  linkedIssue?: string | null;
  linkedAgent?: string | null;
  issues: IssueView[];
  agents: Agent[];
}

function LinkedRef({ linkedIssue, linkedAgent, issues, agents }: LinkedRefProps) {
  if (!linkedIssue && !linkedAgent) return null;

  const issue = linkedIssue ? issues.find((item) => String(item.id) === String(linkedIssue)) : undefined;
  const agent = linkedAgent ? agents.find((item) => item.id === linkedAgent) : undefined;

  return (
    <div style={{ marginTop: "var(--space-6)" }}>
      <h2 style={{ fontSize: "var(--font-size-section)", marginBottom: "var(--space-3)" }}>연결</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {linkedIssue ? (
          <div>
            <span style={{ color: "var(--color-text-muted)", marginRight: "var(--space-2)" }}>연결 이슈:</span>
            {issue ? (
              <Link
                href={`/issues/${linkedIssue}`}
                style={{ color: "var(--color-primary)", textDecoration: "underline" }}
              >
                #{linkedIssue} {issue.title}
              </Link>
            ) : (
              <span
                aria-disabled="true"
                title="연결된 이슈를 찾을 수 없습니다 (끊어진 링크)"
                style={{ color: "var(--color-text-muted)", textDecoration: "line-through", cursor: "not-allowed" }}
              >
                #{linkedIssue} (삭제됨)
              </span>
            )}
          </div>
        ) : null}

        {linkedAgent ? (
          <div>
            <span style={{ color: "var(--color-text-muted)", marginRight: "var(--space-2)" }}>연결 에이전트:</span>
            {agent ? (
              <Link
                href={`/agents/${linkedAgent}`}
                style={{ color: "var(--color-primary)", textDecoration: "underline" }}
              >
                {agent.name}
              </Link>
            ) : (
              <span
                aria-disabled="true"
                title="연결된 에이전트를 찾을 수 없습니다 (끊어진 링크)"
                style={{ color: "var(--color-text-muted)", textDecoration: "line-through", cursor: "not-allowed" }}
              >
                {linkedAgent} (삭제됨)
              </span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { StatusFilterTabs } from "@/components/StatusFilter";
import { TaskTree } from "@/components/TaskTree";
import { ErrorState, LoadingSkeleton } from "@/components/StateViews";
import { useAsyncData } from "@/lib/hooks";
import { errorMessage, getWbs } from "@/lib/api-client";
import type { CommonStatus, TaskIA, WbsRow } from "@/lib/types";
import { COMMON_STATUS_LABEL, TASK_NODE_TYPE_LABEL } from "@/lib/types";

type StatusFilter = CommonStatus | "all";

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "done", label: "완료" },
  { value: "in_progress", label: "진행중" },
  { value: "planned", label: "진행예정" },
];

function statusOf(row: WbsRow): CommonStatus {
  if (row.progress >= 100) return "done";
  if (row.progress > 0 || row.openIssues > 0) return "in_progress";
  return "planned";
}

function toTaskIA(row: WbsRow): TaskIA {
  return {
    id: row.id,
    projectId: "dms",
    type: row.type,
    title: `${row.id} · ${row.title}`,
    parentId: row.parent,
    status: statusOf(row),
    owner: row.owner ?? undefined,
    startDate: row.start ?? undefined,
    endDate: row.end ?? undefined,
    progress: row.progress,
  };
}

/** 계획 트리 — 정본은 docs/plan/tasks.yaml (읽기 전용, 편집은 해당 파일의 PR로). */
export default function TaskIaPage() {
  const { state, reload } = useAsyncData(getWbs, []);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [collapsedIds, setCollapsedIds] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows: WbsRow[] = state.status === "success" ? state.data.rows : [];
  const nodes = useMemo(() => rows.map(toTaskIA), [rows]);
  const selected = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);

  if (state.status === "loading") {
    return (
      <>
        <PageHeader title="Task" description="계획 트리 (정본: docs/plan/tasks.yaml)" />
        <LoadingSkeleton variant="table" rows={8} />
      </>
    );
  }
  if (state.status === "error") {
    return (
      <>
        <PageHeader title="Task" description="계획 트리 (정본: docs/plan/tasks.yaml)" />
        <ErrorState description={errorMessage(state.error)} onRetry={reload} />
      </>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <PageHeader
        title="Task"
        description="계획 트리 — 편집은 docs/plan/tasks.yaml PR로, 진행률은 task:T-### 라벨 이슈에서 자동 산출"
        summary={`노드 ${rows.length}`}
        actions={
          <Button variant="secondary" onClick={reload}>
            새로고침
          </Button>
        }
      />

      <StatusFilterTabs value={filter} options={FILTER_OPTIONS} onChange={setFilter} />

      <TaskTree
        nodes={nodes}
        collapsedIds={collapsedIds}
        onToggle={(id) =>
          setCollapsedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
        }
        onView={(node) => setSelectedId(node.id)}
        statusFilter={filter}
        state={rows.length === 0 ? "empty" : "populated"}
        onRetry={reload}
      />

      {selected ? (
        <Modal open title={`${selected.id} ${selected.title}`} onClose={() => setSelectedId(null)}>
          <dl style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "var(--space-2)", margin: 0 }}>
            <dt>유형</dt>
            <dd>{TASK_NODE_TYPE_LABEL[selected.type]}</dd>
            <dt>상태</dt>
            <dd>{COMMON_STATUS_LABEL[statusOf(selected)]}</dd>
            <dt>진행률</dt>
            <dd>{selected.progress}%</dd>
            <dt>연결 이슈</dt>
            <dd>
              open {selected.openIssues} · closed {selected.closedIssues}
            </dd>
            <dt>일정</dt>
            <dd>{selected.start || selected.end ? `${selected.start ?? "?"} ~ ${selected.end ?? "?"}` : "미지정"}</dd>
            <dt>담당</dt>
            <dd>{selected.owner ?? "미지정"}</dd>
          </dl>
          <p style={{ color: "var(--color-text-muted)", marginTop: "var(--space-4)" }}>
            편집은 리포의 docs/plan/tasks.yaml을 고치는 PR로 합니다 (대시보드는 읽기 전용 투영).
          </p>
        </Modal>
      ) : null}
    </div>
  );
}

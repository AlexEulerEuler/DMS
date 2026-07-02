"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { errorMessage, listWork } from "@/lib/api-client";
import { useAsyncData } from "@/lib/hooks";
import type { GhIssue, WorkStage } from "@/lib/types";
import { WORK_STAGE_LABEL } from "@/lib/types";

import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { PriorityChip } from "@/components/Chips";
import { DataTable } from "@/components/DataTable";
import type { Column } from "@/components/DataTable";
import type { ListState } from "@/components/StateViews";
import { SearchInput } from "@/components/SearchInput";
import { StatusFilterSelect } from "@/components/StatusFilter";
import { Pagination } from "@/components/Pagination";

const PAGE_SIZE = 25;

const STAGE_OPTIONS: { value: WorkStage; label: string }[] = (
  ["backlog", "todo", "in_progress", "review", "done", "blocked"] as WorkStage[]
).map((stage) => ({ value: stage, label: WORK_STAGE_LABEL[stage] }));

const STAGE_TONE: Record<WorkStage, "neutral" | "primary" | "success" | "warning" | "info"> = {
  backlog: "neutral",
  todo: "info",
  in_progress: "success",
  review: "primary",
  done: "primary",
  blocked: "warning",
};

export default function BacklogPage() {
  const router = useRouter();
  const [stage, setStage] = useState<WorkStage | "">("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const { state, reload } = useAsyncData(
    () => listWork({ stage: stage || undefined, q: q || undefined, page, size: PAGE_SIZE }),
    [stage, q, page],
  );

  const total = state.status === "success" ? state.data.total : 0;
  const rows: GhIssue[] = state.status === "success" ? state.data.items : [];
  const syncNote = state.status === "success" ? state.data.syncNote : null;

  const tableState: ListState =
    state.status === "loading"
      ? "loading"
      : state.status === "error"
        ? "error"
        : rows.length === 0
          ? "empty"
          : "populated";

  const columns: Column<GhIssue>[] = [
    { key: "number", header: "#", width: 64, render: (row) => `#${row.number}` },
    { key: "title", header: "작업명", render: (row) => row.title },
    {
      key: "stage",
      header: "단계",
      width: 110,
      render: (row) => (
        <Badge tone={STAGE_TONE[row.stage]} size="sm">
          {WORK_STAGE_LABEL[row.stage]}
        </Badge>
      ),
    },
    {
      key: "priority",
      header: "우선순위",
      width: 96,
      render: (row) => <PriorityChip priority={row.priority} size="sm" />,
    },
    {
      key: "assignees",
      header: "담당",
      width: 140,
      render: (row) =>
        row.assignees.length > 0 ? row.assignees.join(", ") : <span style={{ color: "var(--color-text-muted)" }}>미지정</span>,
    },
    {
      key: "taskId",
      header: "계획",
      width: 90,
      render: (row) => row.taskId ?? <span style={{ color: "var(--color-text-muted)" }}>-</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Backlog"
        description="GitHub 이슈에서 유도된 작업 목록 (읽기 전용 — 작업 등록·상태 변경은 GitHub에서)"
        summary={`총 작업 수 ${total}${syncNote ? ` · ${syncNote}` : ""}`}
        actions={
          <Button variant="secondary" onClick={reload}>
            새로고침
          </Button>
        }
      />

      <div
        style={{ display: "flex", gap: "var(--space-3)", alignItems: "center", marginBottom: "var(--space-4)", flexWrap: "wrap" }}
      >
        <StatusFilterSelect
          value={stage}
          options={STAGE_OPTIONS}
          onChange={(value) => {
            setStage(value);
            setPage(1);
          }}
          allLabel="전체 단계"
        />
        <SearchInput
          value={q}
          onChange={(value) => {
            setQ(value);
            setPage(1);
          }}
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(row) => String(row.number)}
        onRowClick={(row) => router.push(`/work/${row.number}`)}
        state={tableState}
        emptyTitle="작업이 없습니다"
        emptyDescription="type:* 라벨이 있는 GitHub 이슈가 작업으로 표시됩니다."
        onRetry={reload}
        errorDescription={state.status === "error" ? errorMessage(state.error) : undefined}
      />

      {state.status === "success" ? (
        <div style={{ marginTop: "var(--space-4)" }}>
          <Pagination page={page} pageSize={PAGE_SIZE} totalCount={total} onPageChange={setPage} />
        </div>
      ) : null}
    </div>
  );
}

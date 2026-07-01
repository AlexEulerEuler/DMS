"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { listWork } from "@/lib/api-client";
import { useAsyncData } from "@/lib/hooks";
import { formatDateRange } from "@/lib/format";
import type { WorkItem, WorkStatus } from "@/lib/types";
import { WORK_STATUS_LABEL } from "@/lib/types";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { StatusChip } from "@/components/Chips";
import { DataTable } from "@/components/DataTable";
import type { Column } from "@/components/DataTable";
import type { ListState } from "@/components/StateViews";
import { SearchInput } from "@/components/SearchInput";
import { StatusFilterSelect } from "@/components/StatusFilter";
import { Pagination } from "@/components/Pagination";
import { errorMessage } from "@/lib/api-client";

const PAGE_SIZE = 25;

const STATUS_OPTIONS: { value: WorkStatus; label: string }[] = [
  { value: "planned", label: WORK_STATUS_LABEL.planned },
  { value: "in_progress", label: WORK_STATUS_LABEL.in_progress },
  { value: "review", label: WORK_STATUS_LABEL.review },
  { value: "done", label: WORK_STATUS_LABEL.done },
];

export default function BacklogPage() {
  const router = useRouter();
  const [status, setStatus] = useState<WorkStatus | "">("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const { state, reload } = useAsyncData(
    () => listWork({ status: status || undefined, q: q || undefined, page, size: PAGE_SIZE }),
    [status, q, page],
  );

  const total = state.status === "success" ? state.data.total : 0;
  const rows: WorkItem[] = state.status === "success" ? state.data.items : [];

  const tableState: ListState =
    state.status === "loading"
      ? "loading"
      : state.status === "error"
        ? "error"
        : rows.length === 0
          ? "empty"
          : "populated";

  const newWorkButton = (
    <Button variant="primary" onClick={() => router.push("/work/new?from=/work/backlog")}>
      작업 등록
    </Button>
  );

  const columns: Column<WorkItem>[] = [
    { key: "title", header: "작업명", render: (row) => row.title },
    { key: "owner", header: "담당", render: (row) => row.owner || "미지정" },
    {
      key: "status",
      header: "진행상태",
      render: (row) => <StatusChip status={{ domain: "work", value: row.status ?? "planned" }} />,
    },
    {
      key: "schedule",
      header: "진행 일정",
      render: (row) => formatDateRange(row.startDate, row.endDate),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Backlog"
        description="개발자에게 할당할 작업 관리"
        summary={`총 작업 수 ${total}`}
        actions={newWorkButton}
      />

      <div
        style={{
          display: "flex",
          gap: "var(--space-3)",
          alignItems: "center",
          marginBottom: "var(--space-4)",
          flexWrap: "wrap",
        }}
      >
        <StatusFilterSelect
          value={status}
          options={STATUS_OPTIONS}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          allLabel="전체 상태"
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
        getRowId={(row) => row.id}
        onRowClick={(row) => router.push(`/work/${row.id}`)}
        state={tableState}
        emptyTitle="등록된 작업이 없습니다"
        emptyDescription="새 작업을 등록해 백로그를 채워 보세요."
        emptyAction={newWorkButton}
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { SearchInput } from "@/components/SearchInput";
import { StatusFilterSelect } from "@/components/StatusFilter";
import { DataTable } from "@/components/DataTable";
import type { Column } from "@/components/DataTable";
import type { ListState } from "@/components/StateViews";
import { IssueStateChip, PriorityChip, LabelChip } from "@/components/Chips";
import { Pagination } from "@/components/Pagination";
import { useAsyncData } from "@/lib/hooks";
import { listIssues } from "@/lib/api-client";
import type { GhIssue, IssueState, Priority } from "@/lib/types";
import { PRIORITY_LABEL } from "@/lib/types";

const PAGE_SIZE = 25;

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "urgent", label: PRIORITY_LABEL.urgent },
  { value: "high", label: PRIORITY_LABEL.high },
  { value: "normal", label: PRIORITY_LABEL.normal },
  { value: "low", label: PRIORITY_LABEL.low },
];

export default function IssuesListPage() {
  const router = useRouter();
  const [state, setState] = useState<IssueState>("open");
  const [priority, setPriority] = useState<Priority | "">("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const { state: asyncState, reload } = useAsyncData(
    () =>
      listIssues({
        state,
        priority: priority || undefined,
        q: q || undefined,
        page,
        size: PAGE_SIZE,
      }),
    [state, priority, q, page],
  );

  const items = asyncState.status === "success" ? asyncState.data.items : [];
  const total = asyncState.status === "success" ? asyncState.data.total : 0;

  const tableState: ListState =
    asyncState.status === "loading"
      ? "loading"
      : asyncState.status === "error"
        ? "error"
        : items.length === 0
          ? "empty"
          : "populated";

  const columns: Column<GhIssue>[] = [
    { key: "number", header: "#", width: 64, render: (row) => `#${row.number}` },
    { key: "title", header: "제목", render: (row) => row.title },
    { key: "state", header: "상태", width: 96, render: (row) => <IssueStateChip state={row.state} size="sm" /> },
    {
      key: "priority",
      header: "우선순위",
      width: 96,
      render: (row) => <PriorityChip priority={row.priority} size="sm" />,
    },
    {
      key: "labels",
      header: "라벨",
      render: (row) =>
        row.labels.length > 0 ? (
          <span style={{ display: "inline-flex", flexWrap: "wrap", gap: "var(--space-1)" }}>
            {row.labels.map((label) => (
              <LabelChip key={label} name={label} size="sm" />
            ))}
          </span>
        ) : (
          <span style={{ color: "var(--color-text-muted)" }}>-</span>
        ),
    },
    {
      key: "assignees",
      header: "담당자",
      width: 140,
      render: (row) =>
        row.assignees.length > 0 ? (
          row.assignees.join(", ")
        ) : (
          <span style={{ color: "var(--color-text-muted)" }}>미지정</span>
        ),
    },
  ];

  function changeState(next: IssueState) {
    if (next === state) return;
    setState(next);
    setPage(1);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <PageHeader
        title="Issues"
        description="GitHub 이슈 미러 (읽기 전용 — 등록·수정은 GitHub에서)"
        summary={state === "open" ? `열린 이슈 ${total}` : `닫힌 이슈 ${total}`}
        actions={
          <Button variant="secondary" onClick={reload}>
            새로고침
          </Button>
        }
      />

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-3)" }}>
        <div role="tablist" aria-label="아카이브 필터" style={{ display: "inline-flex", gap: "var(--space-2)" }}>
          <Button
            variant={state === "open" ? "primary" : "secondary"}
            aria-pressed={state === "open"}
            onClick={() => changeState("open")}
          >
            열린 이슈
          </Button>
          <Button
            variant={state === "closed" ? "primary" : "secondary"}
            aria-pressed={state === "closed"}
            onClick={() => changeState("closed")}
          >
            닫힌 이슈
          </Button>
        </div>
        <StatusFilterSelect
          value={priority}
          options={PRIORITY_OPTIONS}
          onChange={(next) => {
            setPriority(next);
            setPage(1);
          }}
          allLabel="전체 우선순위"
        />
        <div style={{ flex: 1, minWidth: "180px" }}>
          <SearchInput
            value={q}
            onChange={(next) => {
              setQ(next);
              setPage(1);
            }}
            placeholder="제목 검색"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={items}
        getRowId={(row) => String(row.number)}
        onRowClick={(row) => router.push(`/issues/${row.number}`)}
        state={tableState}
        emptyTitle="이슈가 없습니다"
        emptyDescription="이슈 등록은 GitHub에서 합니다."
        errorDescription="GitHub 연동에 실패했습니다"
        onRetry={reload}
      />

      <Pagination page={page} pageSize={PAGE_SIZE} totalCount={total} onPageChange={setPage} />
    </div>
  );
}

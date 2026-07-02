"use client";

import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { DataTable } from "@/components/DataTable";
import type { Column } from "@/components/DataTable";
import type { ListState } from "@/components/StateViews";
import { errorMessage, getActivity } from "@/lib/api-client";
import { useAsyncData } from "@/lib/hooks";
import { formatDateTime } from "@/lib/format";
import type { ActivityItem } from "@/lib/types";

/** Agent — 실행 주체 활동 뷰. "에이전트가 실제로 무엇을 했나"를 커밋 트레일러(Agent:)와
 * by:agent 라벨로 식별해 보여준다. 에이전트 기획·정책 문서는 문서 브라우저(docs/policy)에서. */
export default function AgentActivityPage() {
  const { state, reload } = useAsyncData(getActivity, []);

  const rows: ActivityItem[] = state.status === "success" ? state.data.items : [];
  const agentCount = rows.filter((r) => r.agentInvolved).length;

  const tableState: ListState =
    state.status === "loading" ? "loading" : state.status === "error" ? "error" : rows.length === 0 ? "empty" : "populated";

  const columns: Column<ActivityItem>[] = [
    {
      key: "kind",
      header: "유형",
      width: 80,
      render: (row) => (
        <Badge tone={row.kind === "pr" ? "primary" : "neutral"} size="sm">
          {row.kind === "pr" ? "PR" : "커밋"}
        </Badge>
      ),
    },
    {
      key: "title",
      header: "내용",
      render: (row) => (
        <a href={row.htmlUrl} target="_blank" rel="noreferrer">
          {row.ref} {row.title}
        </a>
      ),
    },
    { key: "actor", header: "주체", width: 140, render: (row) => row.actor ?? "?" },
    {
      key: "agent",
      header: "에이전트",
      width: 100,
      render: (row) =>
        row.agentInvolved ? (
          <Badge tone="info" size="sm">
            관여
          </Badge>
        ) : (
          <span style={{ color: "var(--color-text-muted)" }}>-</span>
        ),
    },
    { key: "at", header: "시각", width: 150, render: (row) => formatDateTime(row.at) },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <PageHeader
        title="Agent 활동"
        description="사람/에이전트 실행 주체별 최근 활동 (Agent: 커밋 트레일러 · by:agent 라벨로 식별)"
        summary={state.status === "success" ? `최근 ${rows.length}건 중 에이전트 관여 ${agentCount}건` : undefined}
        actions={
          <Button variant="secondary" onClick={reload}>
            새로고침
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(row) => `${row.kind}-${row.ref}`}
        state={tableState}
        emptyTitle="활동이 없습니다"
        emptyDescription="PR·커밋이 생기면 여기에 표시됩니다."
        onRetry={reload}
        errorDescription={state.status === "error" ? errorMessage(state.error) : undefined}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { deleteAgent, errorMessage, listAgents } from "@/lib/api-client";
import type { Agent } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { useAsyncData } from "@/lib/hooks";

import { Button } from "@/components/Button";
import { Card, CardGrid } from "@/components/Card";
import { StatusChip } from "@/components/Chips";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/StateViews";

const PAGE_SIZE = 25;

export default function AgentListPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<Agent | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { state, reload } = useAsyncData(
    () => listAgents({ page, size: PAGE_SIZE }),
    [page],
  );

  const newAgentButton = (
    <Button variant="primary" onClick={() => router.push("/agents/new")}>
      에이전트 등록
    </Button>
  );

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAgent(pendingDelete.id);
      setPendingDelete(null);
      reload();
    } catch (error) {
      setDeleteError(errorMessage(error));
    } finally {
      setDeleting(false);
    }
  }

  const total = state.status === "success" ? state.data.total : undefined;

  return (
    <div>
      <PageHeader
        title="Agent"
        description="만들 에이전트의 기획을 적어 두는 공간"
        summary={total !== undefined ? `총 ${total}개` : undefined}
        actions={newAgentButton}
      />

      {state.status === "loading" ? <LoadingSkeleton variant="cards" rows={6} /> : null}

      {state.status === "error" ? (
        <ErrorState description={errorMessage(state.error)} onRetry={reload} />
      ) : null}

      {state.status === "success" && state.data.items.length === 0 ? (
        <EmptyState
          title="등록된 에이전트가 없습니다"
          description="새 에이전트의 기획을 등록해 보세요."
          action={newAgentButton}
        />
      ) : null}

      {state.status === "success" && state.data.items.length > 0 ? (
        <>
          <CardGrid>
            {state.data.items.map((agent) => (
              <Card
                key={agent.id}
                meta={
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-2)",
                    }}
                  >
                    <StatusChip
                      status={{ domain: "agent", value: agent.status ?? "draft" }}
                      size="sm"
                    />
                    <span
                      style={{
                        color: "var(--color-text-muted)",
                        fontSize: "var(--font-size-caption)",
                      }}
                    >
                      생성일 {formatDate(agent.createdAt)}
                    </span>
                  </span>
                }
                title={agent.name}
                actions={
                  <>
                    <Button variant="secondary" onClick={() => router.push(`/agents/${agent.id}`)}>
                      열기
                    </Button>
                    <Button variant="danger" onClick={() => setPendingDelete(agent)}>
                      삭제
                    </Button>
                  </>
                }
              >
                <p
                  style={{
                    margin: 0,
                    color: "var(--color-text-muted)",
                    fontSize: "var(--font-size-body)",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {agent.description || "설명 없음"}
                </p>
              </Card>
            ))}
          </CardGrid>

          <div style={{ marginTop: "var(--space-6)" }}>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              totalCount={state.data.total}
              onPageChange={setPage}
            />
          </div>
        </>
      ) : null}

      <Modal
        open={pendingDelete !== null}
        onClose={() => {
          if (!deleting) {
            setPendingDelete(null);
            setDeleteError(null);
          }
        }}
        title="에이전트 삭제"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setPendingDelete(null);
                setDeleteError(null);
              }}
              disabled={deleting}
            >
              취소
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "삭제 중..." : "삭제"}
            </Button>
          </>
        }
      >
        <p style={{ margin: 0 }}>
          <strong>{pendingDelete?.name}</strong> 에이전트를 삭제하시겠습니까?
        </p>
        {deleteError ? (
          <p style={{ marginTop: "var(--space-3)", color: "var(--color-error)" }}>{deleteError}</p>
        ) : null}
      </Modal>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";

import { errorMessage, listWorkAll } from "@/lib/api-client";
import { useAsyncData } from "@/lib/hooks";
import type { WorkItem } from "@/lib/types";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { KanbanBoard } from "@/components/KanbanBoard";
import { ErrorState } from "@/components/StateViews";

export default function KanbanPage() {
  const router = useRouter();
  const { state, reload } = useAsyncData(() => listWorkAll(), []);

  const cards: WorkItem[] =
    state.status === "success"
      ? state.data.items.map((issue) => ({
          id: String(issue.number),
          title: issue.title,
          owner: issue.assignees.join(", ") || null,
          stage: issue.stage,
          priority: issue.priority,
          taskId: issue.taskId,
          htmlUrl: issue.htmlUrl,
        }))
      : [];

  return (
    <div>
      <PageHeader
        title="Kanban"
        description="단계는 GitHub 사실(assign·PR·머지)에서 유도됩니다 — 이동은 GitHub의 실제 행위로만"
        summary={state.status === "success" ? `총 ${state.data.total}${state.data.syncNote ? ` · ${state.data.syncNote}` : ""}` : undefined}
        actions={
          <Button variant="secondary" onClick={reload}>
            새로고침
          </Button>
        }
      />

      {state.status === "error" ? (
        <ErrorState description={errorMessage(state.error)} onRetry={reload} />
      ) : (
        <KanbanBoard
          cards={cards}
          onCardClick={(card) => router.push(`/work/${card.id}`)}
          state={state.status === "loading" ? "loading" : "populated"}
        />
      )}
    </div>
  );
}

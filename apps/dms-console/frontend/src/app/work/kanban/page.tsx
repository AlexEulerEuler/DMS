"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { listWork, updateWork, errorMessage } from "@/lib/api-client";
import { useAsyncData } from "@/lib/hooks";
import type { WorkItem, WorkStatus } from "@/lib/types";
import { WORK_STATUS_LABEL } from "@/lib/types";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { KanbanBoard } from "@/components/KanbanBoard";
import { LoadingSkeleton, ErrorState } from "@/components/StateViews";

const STATUS_ORDER: WorkStatus[] = ["planned", "in_progress", "review", "done"];

export default function KanbanPage() {
  const router = useRouter();
  const { state, reload } = useAsyncData(() => listWork({ page: 1 }), []);

  // Local copy so drag/keyboard moves reflect instantly (optimistic).
  const [cards, setCards] = useState<WorkItem[]>([]);

  useEffect(() => {
    if (state.status === "success") setCards(state.data.items);
  }, [state]);

  const newWorkButton = (
    <Button variant="primary" onClick={() => router.push("/work/new")}>
      작업 등록
    </Button>
  );

  const counts = STATUS_ORDER.map((status) => {
    const count = cards.filter((card) => (card.status ?? "planned") === status).length;
    return `${WORK_STATUS_LABEL[status]} ${count}`;
  }).join(" · ");

  async function handleCardMove(cardId: string, toStatus: WorkStatus) {
    const previous = cards;
    // Optimistic update.
    setCards((current) =>
      current.map((card) => (card.id === cardId ? { ...card, status: toStatus } : card)),
    );
    try {
      await updateWork(cardId, { status: toStatus });
    } catch {
      // Roll back and re-sync from the server on failure.
      setCards(previous);
      reload();
    }
  }

  return (
    <div>
      <PageHeader
        title="Kanban"
        summary={state.status === "success" ? counts : undefined}
        actions={newWorkButton}
      />

      {state.status === "loading" ? (
        <LoadingSkeleton variant="cards" rows={4} />
      ) : state.status === "error" ? (
        <ErrorState description={errorMessage(state.error)} onRetry={reload} />
      ) : (
        <>
          <KanbanBoard
            cards={cards}
            onCardMove={handleCardMove}
            onCardClick={(card) => router.push(`/work/${card.id}`)}
            state="populated"
          />
          {cards.length === 0 ? (
            <div style={{ marginTop: "var(--space-4)", display: "flex", justifyContent: "center" }}>
              {newWorkButton}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

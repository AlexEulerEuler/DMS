"use client";

import type { Priority, WorkItem, WorkStage } from "@/lib/types";
import { WORK_STAGE_LABEL } from "@/lib/types";

import { Badge } from "./Badge";
import { PriorityChip } from "./Chips";
import { LoadingSkeleton, ErrorState } from "./StateViews";
import type { ListState } from "./StateViews";

import styles from "./KanbanBoard.module.css";

// 읽기 전용 칸반 — 상태는 GitHub 사실에서 유도되므로(10-dev-workflow §1) 드래그·이동이
// 의미상 성립하지 않는다. 상태 변경은 GitHub의 실제 행위(assign·PR·머지)로만 일어난다.
// blocked는 열이 아니라 카드 배지(횡단 상태).
const COLUMNS: { stage: WorkStage; label: string }[] = [
  { stage: "backlog", label: "Backlog" },
  { stage: "todo", label: "Todo" },
  { stage: "in_progress", label: "In Progress" },
  { stage: "review", label: "Review" },
  { stage: "done", label: "Done" },
];

export interface KanbanBoardProps {
  cards: WorkItem[];
  onCardClick: (card: WorkItem) => void;
  state?: ListState;
}

export function KanbanBoard({ cards, onCardClick, state = "populated" }: KanbanBoardProps) {
  if (state === "loading") return <LoadingSkeleton variant="cards" rows={4} />;
  if (state === "error") return <ErrorState />;

  return (
    <div className={styles.board}>
      {COLUMNS.map((column) => {
        const columnCards = cards.filter((card) =>
          column.stage === "backlog"
            ? card.stage === "backlog" || card.stage === "blocked"
            : card.stage === column.stage,
        );
        return (
          <section key={column.stage} className={styles.column} aria-label={`${column.label} 열`}>
            <header className={styles.columnHeader}>
              <span className={styles.columnTitle}>{column.label}</span>
              <Badge tone="neutral" size="sm">
                {columnCards.length}
              </Badge>
            </header>

            <ul className={styles.cardList} role="list">
              {columnCards.length === 0 ? (
                <li className={styles.emptyNote}>작업 없음</li>
              ) : (
                columnCards.map((card) => (
                  <li key={card.id}>
                    <WorkCard card={card} onClick={() => onCardClick(card)} />
                  </li>
                ))
              )}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function WorkCard({ card, onClick }: { card: WorkItem; onClick: () => void }) {
  return (
    <div className={styles.card}>
      <button type="button" className={styles.cardTitleButton} onClick={onClick} title="작업 상세 열기">
        #{card.id} {card.title}
      </button>

      <div className={styles.cardMeta}>담당: {card.owner || "미지정"}</div>
      {card.taskId ? <div className={styles.cardMeta}>계획: {card.taskId}</div> : null}

      <div className={styles.cardFooter}>
        <PriorityChip priority={(card.priority ?? "normal") as Priority} size="sm" />
        {card.stage === "blocked" ? (
          <Badge tone="warning" size="sm">
            {WORK_STAGE_LABEL.blocked}
          </Badge>
        ) : null}
      </div>
    </div>
  );
}

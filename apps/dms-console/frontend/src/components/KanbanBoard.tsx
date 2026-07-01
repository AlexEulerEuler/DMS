"use client";

import { useState } from "react";
import type { DragEvent } from "react";

import type { WorkItem, WorkStatus } from "@/lib/types";
import { WORK_STATUS_LABEL } from "@/lib/types";
import { formatDateRange } from "@/lib/format";

import { Badge } from "./Badge";
import { StatusChip } from "./Chips";
import { Select } from "./forms";
import { LoadingSkeleton, ErrorState } from "./StateViews";
import type { ListState } from "./StateViews";

import styles from "./KanbanBoard.module.css";

interface ColumnDef {
  status: WorkStatus;
  label: string;
}

// Fixed column order + status mapping (screens.md B-1 · README §3).
const COLUMNS: ColumnDef[] = [
  { status: "planned", label: "Todo" },
  { status: "in_progress", label: "In Progress" },
  { status: "review", label: "Review" },
  { status: "done", label: "Done" },
];

const MOVE_OPTIONS: { value: WorkStatus; label: string }[] = COLUMNS.map((column) => ({
  value: column.status,
  label: `${column.label} (${WORK_STATUS_LABEL[column.status]})`,
}));

export interface KanbanBoardProps {
  cards: WorkItem[];
  onCardMove: (cardId: string, toStatus: WorkStatus) => void;
  onCardClick: (card: WorkItem) => void;
  state?: ListState;
}

export function KanbanBoard({ cards, onCardMove, onCardClick, state = "populated" }: KanbanBoardProps) {
  const [dragOver, setDragOver] = useState<WorkStatus | null>(null);
  const [announcement, setAnnouncement] = useState("");

  if (state === "loading") return <LoadingSkeleton variant="cards" rows={4} />;
  if (state === "error") return <ErrorState />;

  function move(cardId: string, to: WorkStatus) {
    const card = cards.find((item) => item.id === cardId);
    onCardMove(cardId, to);
    const label = COLUMNS.find((column) => column.status === to)?.label ?? to;
    if (card) setAnnouncement(`"${card.title}" 작업을 ${label} 열로 이동했습니다.`);
  }

  function handleDrop(event: DragEvent<HTMLElement>, to: WorkStatus) {
    event.preventDefault();
    setDragOver(null);
    const cardId = event.dataTransfer.getData("text/plain");
    if (cardId) move(cardId, to);
  }

  return (
    <div>
      <div className={styles.board}>
        {COLUMNS.map((column) => {
          const columnCards = cards.filter((card) => (card.status ?? "planned") === column.status);
          return (
            <section
              key={column.status}
              className={`${styles.column} ${dragOver === column.status ? styles.columnDragOver : ""}`}
              aria-label={`${column.label} 열`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(column.status);
              }}
              onDragLeave={(event) => {
                // Ignore drag-leave bubbling from child elements.
                if (event.currentTarget.contains(event.relatedTarget as Node)) return;
                setDragOver(null);
              }}
              onDrop={(event) => handleDrop(event, column.status)}
            >
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
                      <WorkCard card={card} onClick={() => onCardClick(card)} onMove={(to) => move(card.id, to)} />
                    </li>
                  ))
                )}
              </ul>
            </section>
          );
        })}
      </div>

      <div aria-live="polite" role="status" className={styles.srOnly}>
        {announcement}
      </div>
    </div>
  );
}

interface WorkCardProps {
  card: WorkItem;
  onClick: () => void;
  onMove: (to: WorkStatus) => void;
}

function WorkCard({ card, onClick, onMove }: WorkCardProps) {
  const status: WorkStatus = card.status ?? "planned";
  return (
    <div
      className={styles.card}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", card.id);
        event.dataTransfer.effectAllowed = "move";
      }}
    >
      <button
        type="button"
        className={styles.cardTitleButton}
        onClick={onClick}
        title="작업 상세 열기"
      >
        {card.title}
      </button>

      <div className={styles.cardMeta}>담당: {card.owner || "미지정"}</div>
      <div className={styles.cardMeta}>일정: {formatDateRange(card.startDate, card.endDate)}</div>

      <div className={styles.cardFooter}>
        <StatusChip status={{ domain: "work", value: status }} size="sm" />
        {card.linkedIssue ? <span className={styles.linkedIssue}>#{card.linkedIssue}</span> : null}
      </div>

      <div className={styles.moveControl} onClick={(event) => event.stopPropagation()}>
        <Select<WorkStatus>
          label="이동"
          value={status}
          options={MOVE_OPTIONS}
          onChange={(to) => {
            if (to !== status) onMove(to);
          }}
        />
      </div>
    </div>
  );
}

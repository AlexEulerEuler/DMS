"use client";

import { useMemo, useState } from "react";

import { GanttGrid } from "@/components/GanttGrid";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { ErrorState, LoadingSkeleton } from "@/components/StateViews";
import { errorMessage, getWbs } from "@/lib/api-client";
import { useAsyncData } from "@/lib/hooks";
import type { CommonStatus, WBSItem, WbsRow } from "@/lib/types";

import styles from "./wbs.module.css";

interface LegendKey {
  label: string;
  className: string;
}

function statusOf(row: WbsRow): CommonStatus {
  if (row.progress >= 100) return "done";
  if (row.progress > 0 || row.openIssues > 0) return "in_progress";
  return "planned";
}

function OverallProgress({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className={styles.overall}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="전체 진행률"
    >
      <span className={styles.overallValue}>전체 진행률 {clamped}%</span>
      <span className={styles.overallTrack}>
        <span className={styles.overallFill} style={{ width: `${clamped}%` }} />
      </span>
    </div>
  );
}

function Legend() {
  const keys: LegendKey[] = [
    { label: "완료", className: styles.swatchDone },
    { label: "진행 중", className: styles.swatchInProgress },
    { label: "진행 예정", className: styles.swatchPlanned },
  ];
  return (
    <div className={styles.legend} aria-label="상태 범례">
      {keys.map((key) => (
        <span key={key.label} className={styles.legendItem}>
          <span className={`${styles.swatch} ${key.className}`} aria-hidden />
          {key.label}
        </span>
      ))}
    </div>
  );
}

/** 진행현황 — 계획(tasks.yaml)의 일정 지정 task 노드를 간트로, 진척은 이슈 집계에서 유도. */
export default function WbsPage() {
  const { state, reload } = useAsyncData(getWbs, []);
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => (prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]));
  };

  const title = "진행현황(WBS)";
  const description = "계획(docs/plan/tasks.yaml)의 일정과 이슈 집계 진척을 주 단위로 표시";

  if (state.status === "loading") {
    return (
      <>
        <PageHeader title={title} description={description} />
        <LoadingSkeleton variant="gantt" rows={6} />
      </>
    );
  }

  if (state.status === "error") {
    return (
      <>
        <PageHeader title={title} description={description} />
        <ErrorState description={errorMessage(state.error)} onRetry={reload} />
      </>
    );
  }

  const rows = state.data.rows;
  const groupTitleById = new Map(rows.map((r) => [r.id, r.title]));
  const dated = rows.filter((r) => r.type === "task" && r.start && r.end);
  const undatedCount = rows.filter((r) => r.type === "task").length - dated.length;

  const items: WBSItem[] = dated.map((row) => ({
    id: row.id,
    group: (row.parent && groupTitleById.get(row.parent)) || "기타",
    title: `${row.id} ${row.title}${row.delayed ? " ⚠ 지연" : ""}`,
    status: statusOf(row),
    owner: row.owner ?? undefined,
    startDate: row.start!,
    endDate: row.end!,
    progress: row.progress,
  }));

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        summary={<OverallProgress value={state.data.overallProgress} />}
        actions={
          <Button variant="secondary" onClick={reload}>
            새로고침
          </Button>
        }
      />
      <Legend />
      {undatedCount > 0 ? (
        <p style={{ color: "var(--color-text-muted)" }}>
          일정 미지정 작업 {undatedCount}건은 간트에 표시되지 않습니다 (Task 트리에서 확인 · 일정은 tasks.yaml PR로 지정).
        </p>
      ) : null}
      <GanttGrid
        items={items}
        milestones={[]}
        timeAxis={state.data.timeAxis}
        today={today}
        collapsedGroups={collapsedGroups}
        onToggleGroup={toggleGroup}
        state={items.length === 0 ? "empty" : "populated"}
      />
    </>
  );
}

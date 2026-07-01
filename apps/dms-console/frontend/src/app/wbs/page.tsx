"use client";

import { useState } from "react";

import { GanttGrid } from "@/components/GanttGrid";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState, LoadingSkeleton } from "@/components/StateViews";
import { getWbs } from "@/lib/api-client";
import { useAsyncData } from "@/lib/hooks";

import styles from "./wbs.module.css";

const TODAY = "2026-07-01";

interface LegendKey {
  label: string;
  className: string;
}

const LEGEND: LegendKey[] = [
  { label: "완료", className: styles.swatchDone },
  { label: "진행 중", className: styles.swatchInProgress },
  { label: "진행 예정", className: styles.swatchPlanned },
];

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
  return (
    <div className={styles.legend} aria-label="상태 범례">
      {LEGEND.map((key) => (
        <span key={key.label} className={styles.legendItem}>
          <span className={`${styles.swatch} ${key.className}`} aria-hidden />
          {key.label}
        </span>
      ))}
    </div>
  );
}

export default function WbsPage() {
  const { state, reload } = useAsyncData(getWbs, []);
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group],
    );
  };

  const title = "진행현황(WBS)";
  const description = "각 업무의 세부 일정과 진행 상태를 월/주 단위로 표시";

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
        <ErrorState description="진행현황을 불러오지 못했습니다." onRetry={reload} />
      </>
    );
  }

  const data = state.data;
  const isEmpty = data.items.length === 0;
  const overall = isEmpty ? 0 : data.overallProgress;

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        summary={<OverallProgress value={overall} />}
      />
      <Legend />
      <GanttGrid
        items={data.items}
        milestones={data.milestones}
        timeAxis={data.timeAxis}
        today={TODAY}
        collapsedGroups={collapsedGroups}
        onToggleGroup={toggleGroup}
        state={isEmpty ? "empty" : "populated"}
      />
    </>
  );
}

"use client";

import { useLayoutEffect, useMemo, useRef, type CSSProperties } from "react";

import type { CommonStatus, WBSItem, WbsMilestoneView } from "@/lib/types";
import { COMMON_STATUS_LABEL } from "@/lib/types";
import { formatDateRange, progressFromStatus } from "@/lib/format";

import { StatusChip } from "./Chips";
import { EmptyState, ErrorState, LoadingSkeleton, type ListState } from "./StateViews";
import styles from "./GanttGrid.module.css";

export interface GanttGridProps {
  items: WBSItem[];
  milestones: WbsMilestoneView[];
  timeAxis: { startDate: string | null; endDate: string | null };
  today?: string;
  collapsedGroups: string[];
  onToggleGroup: (group: string) => void;
  state?: ListState;
}

const MS_PER_DAY = 86_400_000;

// Column widths + row heights, kept as JS constants because the auto-scroll math
// needs the pixel values. Colors/spacing tokens live in the CSS module.
const GROUP_WIDTH = 120;
const TITLE_WIDTH = 220;
const STATUS_WIDTH = 100;
const WEEK_WIDTH = 44;

/** Parse a YYYY-MM-DD string into a UTC Date at midnight (deterministic, TZ-safe). */
function parseDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Monday on or before the given date (UTC). getUTCDay: 0=Sun..6=Sat. */
function mondayOnOrBefore(date: Date): Date {
  const day = date.getUTCDay();
  const diff = (day + 6) % 7; // days since Monday
  return new Date(date.getTime() - diff * MS_PER_DAY);
}

interface Week {
  start: Date; // Monday (UTC)
  monthKey: string; // YYYY-MM of the week's start
  monthLabel: string;
  weekIndexInMonth: number; // 1-based ordinal within its month
}

interface MonthSpan {
  key: string;
  label: string;
  count: number; // number of week cells under this month
}

interface Axis {
  weeks: Week[];
  months: MonthSpan[];
}

/**
 * Build deterministic weekly buckets from timeAxis.startDate..endDate:
 * iterate from the Monday on/before startDate to endDate in 7-day steps.
 * Weeks are grouped under the month label of their Monday.
 */
function buildAxis(startDate: string | null, endDate: string | null): Axis | null {
  if (!startDate || !endDate) return null;
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end || end.getTime() < start.getTime()) return null;

  const weeks: Week[] = [];
  const months: MonthSpan[] = [];
  const monthCounters = new Map<string, number>();

  let cursor = mondayOnOrBefore(start);
  let guard = 0; // guard against runaway loops on malformed data
  while (cursor.getTime() <= end.getTime() && guard < 1000) {
    const y = cursor.getUTCFullYear();
    const mo = cursor.getUTCMonth() + 1;
    const monthKey = `${y}-${String(mo).padStart(2, "0")}`;
    const monthLabel = `${y}년 ${mo}월`;
    const ordinal = (monthCounters.get(monthKey) ?? 0) + 1;
    monthCounters.set(monthKey, ordinal);

    weeks.push({ start: cursor, monthKey, monthLabel, weekIndexInMonth: ordinal });

    const lastMonth = months[months.length - 1];
    if (lastMonth && lastMonth.key === monthKey) {
      lastMonth.count += 1;
    } else {
      months.push({ key: monthKey, label: monthLabel, count: 1 });
    }

    cursor = new Date(cursor.getTime() + 7 * MS_PER_DAY);
    guard += 1;
  }

  if (weeks.length === 0) return null;
  return { weeks, months };
}

/** Index of the week whose 7-day span contains `date`; -1 if outside range. */
function weekIndexOf(weeks: Week[], date: Date): number {
  for (let i = 0; i < weeks.length; i += 1) {
    const wStart = weeks[i].start.getTime();
    const wEnd = wStart + 7 * MS_PER_DAY; // exclusive
    if (date.getTime() >= wStart && date.getTime() < wEnd) return i;
  }
  return -1;
}

/** Index of the week containing `date`, clamped into range for the end edge. */
function endWeekIndexOf(weeks: Week[], date: Date): number {
  const idx = weekIndexOf(weeks, date);
  if (idx !== -1) return idx;
  const first = weeks[0].start.getTime();
  if (date.getTime() >= first) return weeks.length - 1; // past range end → clamp
  return -1;
}

interface BarGeom {
  startIdx: number; // -1 → no bar
  endIdx: number;
  invalidRange: boolean; // end < start
  missingDates: boolean;
}

function computeBar(item: WBSItem, weeks: Week[]): BarGeom {
  if (!item.startDate || !item.endDate || weeks.length === 0) {
    return { startIdx: -1, endIdx: -1, invalidRange: false, missingDates: true };
  }
  const start = parseDate(item.startDate);
  const end = parseDate(item.endDate);
  if (!start || !end) {
    return { startIdx: -1, endIdx: -1, invalidRange: false, missingDates: true };
  }
  const rawStartIdx = weekIndexOf(weeks, start);
  const startIdx = rawStartIdx === -1 ? 0 : rawStartIdx;
  if (end.getTime() < start.getTime()) {
    // invalid: warn + draw only the start week
    return { startIdx, endIdx: startIdx, invalidRange: true, missingDates: false };
  }
  const endIdx = Math.max(endWeekIndexOf(weeks, end), startIdx);
  return { startIdx, endIdx, invalidRange: false, missingDates: false };
}

const BAR_STATUS_CLASS: Record<CommonStatus, string> = {
  planned: styles.barPlanned,
  in_progress: styles.barInProgress,
  done: styles.barDone,
};

interface FlatRow {
  item: WBSItem;
  group: string;
  isFirstInGroup: boolean;
  groupSize: number;
  collapsed: boolean;
}

export function GanttGrid({
  items,
  milestones,
  timeAxis,
  today,
  collapsedGroups,
  onToggleGroup,
  state,
}: GanttGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const axis = useMemo(
    () => buildAxis(timeAxis.startDate, timeAxis.endDate),
    [timeAxis.startDate, timeAxis.endDate],
  );
  const weeks = axis?.weeks ?? [];
  const months = axis?.months ?? [];
  const weekCount = weeks.length;

  // Flattened visible rows (grouped by category, first-seen order).
  const { rows } = useMemo(() => {
    const order: string[] = [];
    const byGroup = new Map<string, WBSItem[]>();
    for (const it of items) {
      if (!byGroup.has(it.group)) {
        byGroup.set(it.group, []);
        order.push(it.group);
      }
      byGroup.get(it.group)!.push(it);
    }
    const flat: FlatRow[] = [];
    for (const group of order) {
      const groupItems = byGroup.get(group)!;
      const collapsed = collapsedGroups.includes(group);
      const visible = collapsed ? [] : groupItems;
      if (visible.length === 0) {
        // Collapsed (or empty) group still needs one header row to show the toggle.
        flat.push({
          item: { id: `__group__${group}`, group, title: "", status: "planned", order: 0 },
          group,
          isFirstInGroup: true,
          groupSize: 0,
          collapsed,
        });
        continue;
      }
      visible.forEach((it, i) => {
        flat.push({
          item: it,
          group,
          isFirstInGroup: i === 0,
          groupSize: visible.length,
          collapsed,
        });
      });
    }
    return { groups: order, rows: flat };
  }, [items, collapsedGroups]);

  const todayIdx = useMemo(() => {
    if (!axis || !today) return -1;
    const d = parseDate(today);
    if (!d) return -1;
    return weekIndexOf(axis.weeks, d);
  }, [axis, today]);

  // Auto-scroll so the current week is visible on mount / when it changes (default on).
  useLayoutEffect(() => {
    if (todayIdx < 0 || !scrollRef.current) return;
    const target = todayIdx * WEEK_WIDTH - WEEK_WIDTH * 3;
    scrollRef.current.scrollLeft = Math.max(0, target);
  }, [todayIdx]);

  const styleVars = {
    ["--gantt-group-width" as string]: `${GROUP_WIDTH}px`,
    ["--gantt-title-width" as string]: `${TITLE_WIDTH}px`,
    ["--gantt-status-width" as string]: `${STATUS_WIDTH}px`,
    ["--gantt-left-width" as string]: `${GROUP_WIDTH + TITLE_WIDTH + STATUS_WIDTH}px`,
    ["--gantt-week-width" as string]: `${WEEK_WIDTH}px`,
    ["--gantt-time-width" as string]: `${weekCount * WEEK_WIDTH}px`,
  } as CSSProperties;

  // ---- non-populated states ----
  if (state === "loading") {
    return <LoadingSkeleton variant="gantt" rows={6} />;
  }
  if (state === "error") {
    return <ErrorState description="일정표를 불러오지 못했습니다." />;
  }
  if (state === "empty" || items.length === 0) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.stateWrap}>
          <EmptyState title="표시할 업무가 없습니다" />
        </div>
      </div>
    );
  }

  const hasAxis = weekCount > 0;

  return (
    <div className={styles.wrapper} style={styleVars}>
      <div className={styles.scroll} ref={scrollRef} tabIndex={0} aria-label="WBS 일정표">
        {/* ===== Header: left titles + month/week time axis (sticky top) ===== */}
        <div className={styles.headerRow}>
          <div className={styles.leftHead}>
            <div className={styles.headCell} style={{ width: GROUP_WIDTH }}>
              구분
            </div>
            <div className={styles.headCell} style={{ width: TITLE_WIDTH }}>
              세부 업무
            </div>
            <div className={styles.headCell} style={{ width: STATUS_WIDTH }}>
              진행상태
            </div>
          </div>
          <div className={styles.timeHead}>
            {hasAxis ? (
              <>
                <div className={styles.monthRow}>
                  {months.map((m) => (
                    <div
                      key={m.key}
                      className={styles.monthCell}
                      style={{ width: m.count * WEEK_WIDTH }}
                    >
                      {m.label}
                    </div>
                  ))}
                </div>
                <div className={styles.weekRow}>
                  {weeks.map((w, i) => (
                    <div
                      key={i}
                      className={styles.weekCell}
                      style={{ width: WEEK_WIDTH }}
                      title={w.start.toISOString().slice(0, 10)}
                    >
                      {w.weekIndexInMonth}주
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className={styles.noAxis}>일정 없음</div>
            )}
          </div>
        </div>

        {/* ===== Milestone lane (above the body rows) ===== */}
        {hasAxis && milestones.length > 0 ? (
          <div className={styles.milestoneRow}>
            <div className={styles.leftMilestone} style={{ width: GROUP_WIDTH + TITLE_WIDTH + STATUS_WIDTH }}>
              마일스톤
            </div>
            <div className={styles.milestoneLane} style={{ width: weekCount * WEEK_WIDTH }}>
              {milestones.map((ms) => {
                const d = parseDate(ms.date);
                const idx = d ? weekIndexOf(weeks, d) : -1;
                if (idx < 0) return null;
                const kindClass = ms.type === "A" ? styles.milestoneKindA : styles.milestoneKindB;
                return (
                  <div
                    key={ms.id}
                    className={styles.milestoneMarker}
                    style={{ left: (idx + 0.5) * WEEK_WIDTH }}
                    title={`마일스톤 ${ms.type} · ${ms.label} · ${ms.date}`}
                  >
                    <span className={`${styles.milestoneTriangle} ${kindClass}`}>▲{ms.type}</span>
                    <span className={styles.milestoneLabel}>{ms.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* ===== Body rows ===== */}
        <div className={styles.body}>
          {rows.map((row) => {
            const { item, group, isFirstInGroup, groupSize, collapsed } = row;
            const isGroupHeaderOnly = groupSize === 0; // collapsed/empty group placeholder
            const bar = isGroupHeaderOnly ? null : computeBar(item, weeks);
            const barVisible = !!bar && bar.startIdx >= 0 && hasAxis;
            const span = barVisible ? bar!.endIdx - bar!.startIdx + 1 : 0;
            const progress = isGroupHeaderOnly ? 0 : progressFromStatus(item.status, item.progress);
            const tooltip = isGroupHeaderOnly
              ? undefined
              : `${item.title} · ${formatDateRange(item.startDate, item.endDate)} · ${
                  COMMON_STATUS_LABEL[item.status]
                } · 진행률 ${progress}%`;

            return (
              <div className={styles.row} key={item.id} title={tooltip}>
                {/* Left sticky info cells */}
                <div className={styles.leftRow}>
                  <div
                    className={`${styles.cell} ${styles.groupCell}`}
                    style={{ width: GROUP_WIDTH }}
                  >
                    {isFirstInGroup ? (
                      <button
                        type="button"
                        className={styles.groupToggle}
                        aria-expanded={!collapsed}
                        onClick={() => onToggleGroup(group)}
                        title={collapsed ? "펼치기" : "접기"}
                      >
                        <span className={styles.caret}>{collapsed ? "▸" : "▾"}</span>
                        <span className={styles.groupName}>{group}</span>
                      </button>
                    ) : null}
                  </div>
                  <div className={`${styles.cell} ${styles.titleCell}`} style={{ width: TITLE_WIDTH }}>
                    {isGroupHeaderOnly ? (
                      <span className={styles.collapsedHint}>접힘</span>
                    ) : (
                      <>
                        <span className={styles.titleText} title={item.title}>
                          {item.title}
                        </span>
                        {item.owner ? <span className={styles.owner}>{item.owner}</span> : null}
                        {bar?.missingDates ? (
                          <span
                            className={styles.noBarMarker}
                            title="시작일/종료일이 지정되지 않은 업무 (막대 미표시)"
                          >
                            {" ?"}
                          </span>
                        ) : null}
                        {bar?.invalidRange ? (
                          <span
                            className={styles.warnMarker}
                            title="종료일이 시작일보다 빠릅니다 (데이터 오류)"
                          >
                            {" ⚠"}
                          </span>
                        ) : null}
                      </>
                    )}
                  </div>
                  <div className={`${styles.cell} ${styles.statusCell}`} style={{ width: STATUS_WIDTH }}>
                    {isGroupHeaderOnly ? null : (
                      <StatusChip status={{ domain: "common", value: item.status }} size="sm" />
                    )}
                  </div>
                </div>

                {/* Right time cells */}
                <div className={styles.timeRow} style={{ width: hasAxis ? weekCount * WEEK_WIDTH : 0 }}>
                  {weeks.map((_, i) => (
                    <div key={i} className={styles.timeCell} style={{ width: WEEK_WIDTH }} />
                  ))}
                  {todayIdx >= 0 ? (
                    <div className={styles.todayLine} style={{ left: todayIdx * WEEK_WIDTH }} />
                  ) : null}
                  {barVisible ? (
                    <div
                      className={[
                        styles.bar,
                        BAR_STATUS_CLASS[item.status],
                        styles.barRoundLeft,
                        styles.barRoundRight,
                        bar!.invalidRange ? styles.barWarn : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={{
                        left: bar!.startIdx * WEEK_WIDTH + 3,
                        width: span * WEEK_WIDTH - 6,
                      }}
                      aria-label={tooltip}
                    />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

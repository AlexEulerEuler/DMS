"use client";

import { useMemo } from "react";

import type { CommonStatus, TaskIA } from "@/lib/types";
import { formatDateRange } from "@/lib/format";

import { StatusChip } from "./Chips";
import { ErrorState, LoadingSkeleton } from "./StateViews";
import type { ListState } from "./StateViews";
import styles from "./TaskTree.module.css";

export interface TaskTreeProps {
  nodes: TaskIA[];
  collapsedIds: string[];
  onToggle: (id: string) => void;
  onView: (node: TaskIA) => void;
  statusFilter: CommonStatus | "all";
  emptyFilterLabel?: string;
  state?: ListState;
  onRetry?: () => void;
}

/** Category node + the task (세부 업무) rows that fall under it (groups flattened). */
interface CategoryBranch {
  category: TaskIA;
  tasks: TaskIA[];
}

function byOrder(a: TaskIA, b: TaskIA): number {
  const ao = a.order ?? 0;
  const bo = b.order ?? 0;
  if (ao !== bo) return ao - bo;
  return a.title.localeCompare(b.title);
}

/**
 * Build category branches from the flat node list. Middle (group) nodes are not
 * rendered as their own rows on this screen: every descendant task of a category
 * (whether direct or under a group) is flattened beneath that category.
 */
function buildBranches(nodes: TaskIA[]): CategoryBranch[] {
  const childrenByParent = new Map<string, TaskIA[]>();
  for (const node of nodes) {
    const parentKey = node.parentId ?? "__root__";
    const bucket = childrenByParent.get(parentKey);
    if (bucket) bucket.push(node);
    else childrenByParent.set(parentKey, [node]);
  }

  const collectTasks = (parentId: string): TaskIA[] => {
    const direct = (childrenByParent.get(parentId) ?? []).slice().sort(byOrder);
    const tasks: TaskIA[] = [];
    for (const child of direct) {
      if (child.type === "task") {
        tasks.push(child);
      } else if (child.type === "group") {
        // Flatten: pull task descendants of the group up under the category.
        tasks.push(...collectTasks(child.id));
      }
    }
    return tasks;
  };

  const categories = nodes.filter((node) => node.type === "category").sort(byOrder);
  return categories.map((category) => ({
    category,
    tasks: collectTasks(category.id),
  }));
}

export function TaskTree({
  nodes,
  collapsedIds,
  onToggle,
  onView,
  statusFilter,
  emptyFilterLabel = "해당 상태의 업무가 없습니다",
  state,
  onRetry,
}: TaskTreeProps) {
  const branches = useMemo(() => buildBranches(nodes), [nodes]);
  const collapsed = useMemo(() => new Set(collapsedIds), [collapsedIds]);

  if (state === "loading") {
    return <LoadingSkeleton variant="table" rows={6} />;
  }
  if (state === "error") {
    return <ErrorState onRetry={onRetry} />;
  }

  const filtering = statusFilter !== "all";

  return (
    <div className={styles.tree} role="tree" aria-label="업무 정보구조 트리">
      {branches.map(({ category, tasks }) => {
        const isCollapsed = collapsed.has(category.id);
        return (
          <div key={category.id} role="treeitem" aria-expanded={!isCollapsed} aria-selected={false}>
            <div className={styles.categoryRow}>
              <button
                type="button"
                className={styles.toggle}
                aria-expanded={!isCollapsed}
                aria-label={isCollapsed ? "펼치기" : "접기"}
                onClick={() => onToggle(category.id)}
              >
                {isCollapsed ? "▸" : "▾"}
              </button>
              <span className={styles.categoryTitle}>{category.title}</span>
              {category.status ? (
                <StatusChip status={{ domain: "common", value: category.status }} size="sm" />
              ) : null}
              <button type="button" className={styles.viewButton} onClick={() => onView(category)}>
                View
              </button>
            </div>

            {isCollapsed ? null : (
              <div className={styles.children} role="group">
                {tasks.length === 0 ? (
                  <p className={styles.emptyFilter}>
                    {filtering ? emptyFilterLabel : "세부 업무가 없습니다"}
                  </p>
                ) : (
                  tasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      role="treeitem"
                      aria-selected={false}
                      className={styles.taskRow}
                      onClick={() => onView(task)}
                    >
                      <span className={styles.taskTitle}>{task.title}</span>
                      {task.status ? (
                        <StatusChip status={{ domain: "common", value: task.status }} size="sm" />
                      ) : null}
                      <span className={styles.taskMeta}>{task.owner || "미지정"}</span>
                      <span className={styles.taskMeta}>
                        {formatDateRange(task.startDate, task.endDate)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

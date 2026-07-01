import type {
  AgentStatus,
  CommonStatus,
  IssueState,
  Priority,
  WorkStatus,
} from "@/lib/types";
import {
  AGENT_STATUS_LABEL,
  COMMON_STATUS_LABEL,
  ISSUE_STATE_LABEL,
  PRIORITY_LABEL,
  WORK_STATUS_LABEL,
} from "@/lib/types";

import styles from "./Chips.module.css";

export type Size = "sm" | "md" | "lg";

export type StatusKind =
  | { domain: "common"; value: CommonStatus }
  | { domain: "work"; value: WorkStatus }
  | { domain: "agent"; value: AgentStatus };

const STATUS_COLOR_VAR: Record<string, string> = {
  planned: "var(--color-status-planned)",
  in_progress: "var(--color-status-in-progress)",
  review: "var(--color-status-in-progress)",
  done: "var(--color-status-done)",
  draft: "var(--color-status-in-progress)",
  confirmed: "var(--color-status-done)",
  on_hold: "var(--color-on-hold)",
};

function statusLabel(kind: StatusKind): string {
  if (kind.domain === "common") return COMMON_STATUS_LABEL[kind.value];
  if (kind.domain === "work") return WORK_STATUS_LABEL[kind.value];
  return AGENT_STATUS_LABEL[kind.value];
}

export interface StatusChipProps {
  status: StatusKind;
  size?: Size;
  showDot?: boolean;
}

export function StatusChip({ status, size = "md", showDot = true }: StatusChipProps) {
  const color = STATUS_COLOR_VAR[status.value] ?? "var(--color-text-muted)";
  return (
    <span className={`${styles.chip} ${styles[size]}`} style={{ color, borderColor: color }}>
      {showDot ? <span className={styles.dot} style={{ background: color }} /> : null}
      {statusLabel(status)}
    </span>
  );
}

const PRIORITY_COLOR_VAR: Record<Priority, string> = {
  urgent: "var(--color-priority-urgent)",
  high: "var(--color-priority-high)",
  normal: "var(--color-priority-normal)",
  low: "var(--color-priority-low)",
};

export interface PriorityChipProps {
  priority: Priority;
  size?: Size;
}

export function PriorityChip({ priority, size = "md" }: PriorityChipProps) {
  const color = PRIORITY_COLOR_VAR[priority];
  return (
    <span className={`${styles.chip} ${styles[size]}`} style={{ color, borderColor: color }}>
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

export interface IssueStateChipProps {
  state: IssueState;
  size?: Size;
}

export function IssueStateChip({ state, size = "md" }: IssueStateChipProps) {
  const color = state === "open" ? "var(--color-status-in-progress)" : "var(--color-status-done)";
  return (
    <span className={`${styles.chip} ${styles[size]}`} style={{ color, borderColor: color }}>
      {ISSUE_STATE_LABEL[state]}
    </span>
  );
}

export interface LabelChipProps {
  name: string;
  color?: string;
  size?: Size;
}

export function LabelChip({ name, color, size = "md" }: LabelChipProps) {
  const hex = color ? `#${color.replace("#", "")}` : undefined;
  return (
    <span
      className={`${styles.labelChip} ${styles[size]}`}
      style={hex ? { background: hex, color: pickTextColor(hex), borderColor: hex } : undefined}
    >
      {name}
    </span>
  );
}

function pickTextColor(hex: string): string {
  const value = hex.replace("#", "");
  if (value.length !== 6) return "var(--color-text)";
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? "#111827" : "#FFFFFF";
}

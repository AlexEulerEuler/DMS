import type { ReactNode } from "react";

import styles from "./StateViews.module.css";

export type ListState = "loading" | "empty" | "error" | "populated";

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      <p className={styles.emptyTitle}>{title}</p>
      {description ? <p className={styles.emptyDescription}>{description}</p> : null}
      {action ? <div className={styles.emptyAction}>{action}</div> : null}
    </div>
  );
}

export interface LoadingSkeletonProps {
  variant?: "table" | "cards" | "form" | "text" | "gantt";
  rows?: number;
}

export function LoadingSkeleton({ variant = "text", rows = 4 }: LoadingSkeletonProps) {
  return (
    <div className={styles.skeleton} role="status" aria-busy="true" aria-label="로딩 중">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className={
            variant === "cards"
              ? styles.skeletonCard
              : variant === "table"
                ? styles.skeletonRow
                : variant === "gantt"
                  ? styles.skeletonGanttRow
                  : styles.skeletonLine
          }
        />
      ))}
    </div>
  );
}

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({ title = "문제가 발생했습니다", description, onRetry }: ErrorStateProps) {
  return (
    <div className={styles.error} role="alert">
      <p className={styles.errorTitle}>{title}</p>
      {description ? <p className={styles.errorDescription}>{description}</p> : null}
      {onRetry ? (
        <button type="button" className={styles.retryButton} onClick={onRetry}>
          다시 시도
        </button>
      ) : null}
    </div>
  );
}

export interface NotFoundProps {
  title?: string;
  description?: string;
  action?: ReactNode;
}

export function NotFound({ title = "없음", description = "존재하지 않는 경로/식별자입니다.", action }: NotFoundProps) {
  return (
    <div className={styles.empty}>
      <p className={styles.emptyTitle}>{title}</p>
      <p className={styles.emptyDescription}>{description}</p>
      {action}
    </div>
  );
}

"use client";

import type { ReactNode } from "react";

import { EmptyState, ErrorState, LoadingSkeleton } from "./StateViews";
import type { ListState } from "./StateViews";
import styles from "./DataTable.module.css";

export interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "center" | "right";
  width?: number | string;
  render?: (row: T) => ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  state?: ListState;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  onRetry?: () => void;
  errorDescription?: string;
}

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  onRowClick,
  state = "populated",
  emptyTitle = "표시할 항목이 없습니다",
  emptyDescription,
  emptyAction,
  onRetry,
  errorDescription,
}: DataTableProps<T>) {
  if (state === "loading") return <LoadingSkeleton variant="table" rows={6} />;
  if (state === "error") return <ErrorState description={errorDescription} onRetry={onRetry} />;
  if (state === "empty" || rows.length === 0)
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                style={{ width: column.width, textAlign: column.align ?? "left" }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={getRowId(row)}
              className={onRowClick ? styles.clickableRow : ""}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={
                onRowClick
                  ? (event) => {
                      if (event.key === "Enter") onRowClick(row);
                    }
                  : undefined
              }
            >
              {columns.map((column) => (
                <td key={column.key} style={{ textAlign: column.align ?? "left" }}>
                  {column.render ? column.render(row) : (row as Record<string, ReactNode>)[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

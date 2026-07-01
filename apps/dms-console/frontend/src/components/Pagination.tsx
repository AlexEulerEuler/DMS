import styles from "./Pagination.module.css";

export interface PaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageSize, totalCount, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (totalPages <= 1) return null;

  return (
    <nav className={styles.pagination} aria-label="페이지네이션">
      <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className={styles.button}>
        이전
      </button>
      <span className={styles.status}>
        {page} / {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className={styles.button}
      >
        다음
      </button>
    </nav>
  );
}

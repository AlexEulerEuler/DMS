import type { ReactNode } from "react";

import styles from "./PageHeader.module.css";

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  summary?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: BreadcrumbItem[];
  /**
   * Optional interceptor for breadcrumb navigation. When provided, breadcrumb
   * links call this instead of navigating directly — used to guard unsaved
   * changes (e.g. Agent detail confirms before leaving).
   */
  onBreadcrumbNavigate?: (to: string) => void;
}

export function PageHeader({
  title,
  description,
  summary,
  actions,
  breadcrumb,
  onBreadcrumbNavigate,
}: PageHeaderProps) {
  return (
    <div className={styles.header}>
      {breadcrumb && breadcrumb.length > 0 ? (
        <nav aria-label="breadcrumb" className={styles.breadcrumb}>
          {breadcrumb.map((item, index) => (
            <span key={`${item.label}-${index}`}>
              {index > 0 ? <span className={styles.breadcrumbSep}>/</span> : null}
              {item.to ? (
                <a
                  href={item.to}
                  className={styles.breadcrumbLink}
                  onClick={
                    onBreadcrumbNavigate
                      ? (event) => {
                          event.preventDefault();
                          onBreadcrumbNavigate(item.to as string);
                        }
                      : undefined
                  }
                >
                  {item.label}
                </a>
              ) : (
                <span>{item.label}</span>
              )}
            </span>
          ))}
        </nav>
      ) : null}
      <div className={styles.top}>
        <div>
          <h1 className={styles.title}>{title}</h1>
          {description ? <p className={styles.description}>{description}</p> : null}
          {summary ? <div className={styles.summary}>{summary}</div> : null}
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
    </div>
  );
}

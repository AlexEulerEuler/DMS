import type { ReactNode } from "react";

import styles from "./Card.module.css";

export interface CardProps {
  title?: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  onClick?: () => void;
  variant?: "default" | "outline";
}

export function Card({ title, meta, children, actions, onClick, variant = "default" }: CardProps) {
  return (
    <div
      className={`${styles.card} ${variant === "outline" ? styles.outline : ""} ${onClick ? styles.clickable : ""}`}
      onClick={onClick}
    >
      {meta ? <div className={styles.meta}>{meta}</div> : null}
      {title ? <div className={styles.title}>{title}</div> : null}
      {children ? <div className={styles.bodyContent}>{children}</div> : null}
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}

export interface CardGridProps {
  children: ReactNode;
  minColumnWidth?: number;
}

export function CardGrid({ children, minColumnWidth = 260 }: CardGridProps) {
  return (
    <div
      className={styles.grid}
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${minColumnWidth}px, 1fr))` }}
    >
      {children}
    </div>
  );
}

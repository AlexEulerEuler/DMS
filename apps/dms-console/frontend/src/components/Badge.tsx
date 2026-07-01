import type { ReactNode } from "react";

import styles from "./Badge.module.css";

export interface BadgeProps {
  children: ReactNode;
  tone?: "neutral" | "primary" | "success" | "warning" | "error" | "info";
  size?: "sm" | "md" | "lg";
}

export function Badge({ children, tone = "neutral", size = "md" }: BadgeProps) {
  return <span className={`${styles.badge} ${styles[tone]} ${styles[size]}`}>{children}</span>;
}

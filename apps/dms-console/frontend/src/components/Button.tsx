import type { ButtonHTMLAttributes } from "react";

import styles from "./Button.module.css";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}

export function Button({ variant = "secondary", className, ...rest }: ButtonProps) {
  return <button className={`${styles.button} ${styles[variant]} ${className ?? ""}`} {...rest} />;
}

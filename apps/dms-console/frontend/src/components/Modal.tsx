"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

import styles from "./Modal.module.css";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  dismissible?: boolean;
}

export function Modal({ open, onClose, title, children, footer, size = "md", dismissible = true }: ModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape" && dismissible) onClose();
    }
    document.addEventListener("keydown", handleKey);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose, dismissible]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={dismissible ? onClose : undefined}>
      <div
        ref={panelRef}
        className={`${styles.panel} ${styles[size]}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        {title ? (
          <div className={styles.header} id="modal-title">
            {title}
          </div>
        ) : null}
        <div className={styles.body}>{children}</div>
        {footer ? <div className={styles.footer}>{footer}</div> : null}
      </div>
    </div>
  );
}

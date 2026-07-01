"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";

import styles from "./AppShell.module.css";
import { Drawer } from "./Drawer";
import {
  PRIMARY_NAV,
  primaryKeyFromPathname,
  secondaryKeyFromPathname,
  secondaryNavFor,
} from "./nav-config";

export interface AppShellProps {
  children: ReactNode;
}

/**
 * Global 3-pane shell (TopBar + Sidebar + ContentArea). Always rendered,
 * even while the content area is loading/erroring (foundation.md §2, §8).
 */
export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname() ?? "/overview";
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const activePrimaryKey = primaryKeyFromPathname(pathname);
  const activeSecondaryKey = secondaryKeyFromPathname(pathname);
  const sections = secondaryNavFor(activePrimaryKey);

  function navigate(to: string) {
    setMenuOpen(false);
    router.push(to);
  }

  const navList = (onNavigate: (to: string) => void) => (
    <nav aria-label="1차 메뉴" className={styles.drawerNav}>
      {PRIMARY_NAV.map((item) => (
        <a
          key={item.key}
          href={item.to}
          className={item.key === activePrimaryKey ? styles.sidebarItemActive : styles.sidebarItem}
          aria-current={item.key === activePrimaryKey ? "page" : undefined}
          onClick={(event) => {
            event.preventDefault();
            onNavigate(item.to);
          }}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <button
          type="button"
          className={styles.menuButton}
          aria-label="메뉴 열기"
          onClick={() => setMenuOpen(true)}
        >
          ☰
        </button>
        <button type="button" className={styles.serviceName} onClick={() => navigate("/overview")}>
          DMS Console
        </button>
        <nav aria-label="1차 메뉴" className={styles.primaryNav}>
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.key}
              href={item.to}
              className={
                item.key === activePrimaryKey
                  ? `${styles.primaryNavItem} ${styles.primaryNavItemActive}`
                  : styles.primaryNavItem
              }
              aria-current={item.key === activePrimaryKey ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <button type="button" className={styles.settingsButton} aria-label="설정">
          설정
        </button>
      </header>

      <div className={styles.body}>
        <nav aria-label="2차 메뉴" className={styles.sidebar}>
          {sections.map((section, index) => (
            <div key={section.groupLabel ?? `section-${index}`}>
              {section.groupLabel ? <div className={styles.groupLabel}>{section.groupLabel}</div> : null}
              {section.items.map((item) => (
                <Link
                  key={item.key}
                  href={item.to}
                  className={item.key === activeSecondaryKey ? styles.sidebarItemActive : styles.sidebarItem}
                  aria-current={item.key === activeSecondaryKey ? "page" : undefined}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <main className={styles.content}>{children}</main>
      </div>

      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} title="메뉴">
        {navList(navigate)}
        {sections.length > 0 ? (
          <div style={{ marginTop: 16 }}>
            {sections.map((section, index) => (
              <div key={section.groupLabel ?? `drawer-section-${index}`}>
                {section.groupLabel ? <div className={styles.groupLabel}>{section.groupLabel}</div> : null}
                {section.items.map((item) => (
                  <a
                    key={item.key}
                    href={item.to}
                    className={item.key === activeSecondaryKey ? styles.sidebarItemActive : styles.sidebarItem}
                    onClick={(event) => {
                      event.preventDefault();
                      navigate(item.to);
                    }}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            ))}
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}

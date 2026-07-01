"use client";

import styles from "./StatusFilter.module.css";

export interface FilterOption<V extends string> {
  value: V;
  label: string;
}

export interface StatusFilterTabsProps<V extends string> {
  value: V;
  options: FilterOption<V>[];
  onChange: (value: V) => void;
}

/** Single-select segmented control — used by Task's 전체/완료/진행중/진행예정 filter. */
export function StatusFilterTabs<V extends string>({ value, options, onChange }: StatusFilterTabsProps<V>) {
  return (
    <div className={styles.tabs} role="tablist">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          className={option.value === value ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export interface StatusFilterSelectProps<V extends string> {
  value: V | "";
  options: FilterOption<V>[];
  onChange: (value: V | "") => void;
  allLabel?: string;
}

/** Dropdown status filter — used by Backlog/Issues/Agent list toolbars. */
export function StatusFilterSelect<V extends string>({
  value,
  options,
  onChange,
  allLabel = "전체 상태",
}: StatusFilterSelectProps<V>) {
  return (
    <select
      className={styles.select}
      value={value}
      aria-label="상태 필터"
      onChange={(event) => onChange(event.target.value as V | "")}
    >
      <option value="">{allLabel}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

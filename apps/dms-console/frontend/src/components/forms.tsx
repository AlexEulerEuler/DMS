"use client";

import { useId } from "react";

import styles from "./forms.module.css";

export interface TextFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  readOnly?: boolean;
  type?: "text" | "search";
  id?: string;
}

function useStableId(id?: string): string {
  const generated = useId();
  return id ?? generated;
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  error,
  disabled,
  required,
  readOnly,
  type = "text",
  id,
}: TextFieldProps) {
  const fieldId = useStableId(id);
  return (
    <div className={styles.field}>
      {label ? (
        <label htmlFor={fieldId} className={styles.label}>
          {label}
          {required ? <span className={styles.required}> *</span> : null}
        </label>
      ) : null}
      <input
        id={fieldId}
        className={`${styles.input} ${error ? styles.inputError : ""}`}
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? (
        <p id={`${fieldId}-error`} className={styles.errorText}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export interface TextAreaProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  readOnly?: boolean;
  id?: string;
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  error,
  disabled,
  required,
  readOnly,
  id,
}: TextAreaProps) {
  const fieldId = useStableId(id);
  return (
    <div className={styles.field}>
      {label ? (
        <label htmlFor={fieldId} className={styles.label}>
          {label}
          {required ? <span className={styles.required}> *</span> : null}
        </label>
      ) : null}
      <textarea
        id={fieldId}
        className={`${styles.textarea} ${error ? styles.inputError : ""}`}
        value={value}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <p className={styles.errorText}>{error}</p> : null}
    </div>
  );
}

export interface SelectOption<V extends string> {
  value: V;
  label: string;
}

export interface SelectProps<V extends string> {
  label?: string;
  value: V | null;
  options: SelectOption<V>[];
  onChange: (value: V) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
}

export function Select<V extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = "선택",
  error,
  disabled,
  required,
  id,
}: SelectProps<V>) {
  const fieldId = useStableId(id);
  return (
    <div className={styles.field}>
      {label ? (
        <label htmlFor={fieldId} className={styles.label}>
          {label}
          {required ? <span className={styles.required}> *</span> : null}
        </label>
      ) : null}
      <select
        id={fieldId}
        className={`${styles.input} ${error ? styles.inputError : ""}`}
        value={value ?? ""}
        disabled={disabled}
        required={required}
        onChange={(event) => onChange(event.target.value as V)}
      >
        {!value ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <p className={styles.errorText}>{error}</p> : null}
    </div>
  );
}

export interface DatePickerProps {
  label?: string;
  value: string | null;
  onChange: (value: string | null) => void;
  min?: string;
  max?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
}

export function DatePicker({ label, value, onChange, min, max, error, disabled, required, id }: DatePickerProps) {
  const fieldId = useStableId(id);
  return (
    <div className={styles.field}>
      {label ? (
        <label htmlFor={fieldId} className={styles.label}>
          {label}
          {required ? <span className={styles.required}> *</span> : null}
        </label>
      ) : null}
      <input
        id={fieldId}
        type="date"
        className={`${styles.input} ${error ? styles.inputError : ""}`}
        value={value ?? ""}
        min={min}
        max={max}
        disabled={disabled}
        required={required}
        onChange={(event) => onChange(event.target.value || null)}
      />
      {error ? <p className={styles.errorText}>{error}</p> : null}
    </div>
  );
}

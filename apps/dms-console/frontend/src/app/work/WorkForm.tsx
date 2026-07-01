"use client";

import type { WorkStatus } from "@/lib/types";
import { WORK_STATUS_LABEL } from "@/lib/types";

import { TextField, TextArea, Select, DatePicker } from "@/components/forms";

export interface WorkFormValues {
  title: string;
  owner: string;
  status: WorkStatus;
  startDate: string | null;
  endDate: string | null;
  description: string;
  linkedIssue: string;
  linkedAgent: string;
}

export const EMPTY_WORK_FORM: WorkFormValues = {
  title: "",
  owner: "",
  status: "planned",
  startDate: null,
  endDate: null,
  description: "",
  linkedIssue: "",
  linkedAgent: "",
};

const STATUS_OPTIONS: { value: WorkStatus; label: string }[] = [
  { value: "planned", label: WORK_STATUS_LABEL.planned },
  { value: "in_progress", label: WORK_STATUS_LABEL.in_progress },
  { value: "review", label: WORK_STATUS_LABEL.review },
  { value: "done", label: WORK_STATUS_LABEL.done },
];

// Sentinel for "no link" so the Select shows a real selected option (not the
// disabled placeholder). Mapped back to "" at the form boundary.
const NONE = "__none__";
const NONE_OPTION = { value: NONE, label: "연결 없음" } as const;

export interface WorkFormProps {
  values: WorkFormValues;
  onChange: (patch: Partial<WorkFormValues>) => void;
  issueOptions: { value: string; label: string }[];
  agentOptions: { value: string; label: string }[];
  titleError?: string;
  dateError?: string;
}

export function WorkForm({
  values,
  onChange,
  issueOptions,
  agentOptions,
  titleError,
  dateError,
}: WorkFormProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", maxWidth: 640 }}>
      <TextField
        label="작업명"
        value={values.title}
        onChange={(value) => onChange({ title: value })}
        required
        error={titleError}
        placeholder="작업명을 입력하세요"
      />

      <TextField
        label="담당"
        value={values.owner}
        onChange={(value) => onChange({ owner: value })}
        placeholder="담당자 (미지정 가능)"
      />

      <Select<WorkStatus>
        label="상태"
        value={values.status}
        options={STATUS_OPTIONS}
        onChange={(value) => onChange({ status: value })}
      />

      <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <DatePicker
            label="시작일"
            value={values.startDate}
            onChange={(value) => onChange({ startDate: value })}
          />
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <DatePicker
            label="종료일"
            value={values.endDate}
            onChange={(value) => onChange({ endDate: value })}
            error={dateError}
          />
        </div>
      </div>

      <TextArea
        label="설명"
        value={values.description}
        onChange={(value) => onChange({ description: value })}
        rows={5}
        placeholder="작업 설명 (선택)"
      />

      <Select<string>
        label="연결 이슈"
        value={values.linkedIssue || NONE}
        options={[NONE_OPTION, ...issueOptions]}
        onChange={(value) => onChange({ linkedIssue: value === NONE ? "" : value })}
      />

      <Select<string>
        label="연결 에이전트"
        value={values.linkedAgent || NONE}
        options={[NONE_OPTION, ...agentOptions]}
        onChange={(value) => onChange({ linkedAgent: value === NONE ? "" : value })}
      />
    </div>
  );
}

/** endDate < startDate → 검증 경고 메시지 (없으면 undefined). */
export function dateRangeError(startDate: string | null, endDate: string | null): string | undefined {
  if (startDate && endDate && endDate < startDate) {
    return "종료일이 시작일보다 빠릅니다.";
  }
  return undefined;
}

"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/Button";
import { ErrorState, LoadingSkeleton } from "@/components/StateViews";
import { deleteInput, errorMessage, listInputs, runPipeline, uploadInput } from "@/lib/api-client";
import type { PipelineRunSummary } from "@/lib/api-client";
import { useAsyncData } from "@/lib/hooks";
import { formatDate } from "@/lib/format";
import type { InputSourceType, InputsResponse } from "@/lib/types";

interface GroupDef {
  type: InputSourceType;
  title: string;
  hint: string;
}

const GROUPS: GroupDef[] = [
  { type: "document", title: "입력 문서", hint: "생성 기준이 되는 원본 문서 (txt·md·csv·pdf)" },
  { type: "master-list", title: "기존 표준 목록", hint: "정합에 참조할 이미 확보된 목록" },
  { type: "baseline", title: "기준 일정", hint: "생성 일정 산출의 기준선 (날짜 포함)" },
];

const muted: React.CSSProperties = { color: "var(--color-text-muted)", fontSize: "var(--font-size-caption)" };

export function InputsPanel({ onGenerated }: { onGenerated?: () => void }) {
  const { state, reload } = useAsyncData<InputsResponse>(listInputs, []);
  const [busyType, setBusyType] = useState<InputSourceType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<PipelineRunSummary | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setResult(null);
    try {
      const summary = await runPipeline({ confirm: true, formats: ["json", "xlsx"] });
      setResult(summary);
      onGenerated?.();
    } catch (genError) {
      setError(errorMessage(genError));
    } finally {
      setGenerating(false);
    }
  }

  async function handleUpload(type: InputSourceType, file: File | undefined) {
    if (!file) return;
    setBusyType(type);
    setError(null);
    try {
      await uploadInput(type, file);
      reload();
    } catch (uploadError) {
      setError(errorMessage(uploadError));
    } finally {
      setBusyType(null);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      await deleteInput(id);
      reload();
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    }
  }

  const inputs: InputsResponse | null = state.status === "success" ? state.data : null;

  return (
    <section style={{ marginBottom: "var(--space-8)" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "var(--space-3)",
          marginBottom: "var(--space-2)",
        }}
      >
        <h3 style={{ fontSize: "var(--font-size-section)", fontWeight: "var(--font-weight-semibold)" }}>
          입력 문서 업로드
        </h3>
        <Button variant="primary" onClick={handleGenerate} disabled={generating}>
          {generating ? "생성 중…" : "파이프라인 생성 실행"}
        </Button>
      </div>
      <p style={{ ...muted, marginBottom: "var(--space-4)" }}>
        입력 3종을 업로드하고 “생성 실행”을 누르면 표준 목록·생성 일정·내보내기 파일이 산출됩니다.
      </p>

      {result ? (
        <p
          role="status"
          style={{
            marginBottom: "var(--space-3)",
            padding: "var(--space-2) var(--space-3)",
            background: "var(--color-primary-tint)",
            color: "var(--color-primary)",
            borderRadius: "var(--radius-sm)",
            fontSize: "var(--font-size-caption)",
          }}
        >
          생성 완료: 표준 목록 {result.version} · 항목 {result.item_count}개(매칭 {result.matched_count} · 신규{" "}
          {result.new_count}) · 마일스톤 {result.milestone_count} · 내보내기 {result.export_ids.length}건
        </p>
      ) : null}

      {error ? (
        <p role="alert" style={{ color: "var(--color-error)", marginBottom: "var(--space-3)" }}>
          {error}
        </p>
      ) : null}

      {state.status === "loading" ? (
        <LoadingSkeleton variant="cards" rows={3} />
      ) : state.status === "error" ? (
        <ErrorState description={errorMessage(state.error)} onRetry={reload} />
      ) : (
        <div style={{ display: "grid", gap: "var(--space-4)" }}>
          {GROUPS.map((group) => (
            <InputGroup
              key={group.type}
              group={group}
              inputs={inputs}
              busy={busyType === group.type}
              onUpload={(file) => handleUpload(group.type, file)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
}

interface InputGroupProps {
  group: GroupDef;
  inputs: InputsResponse | null;
  busy: boolean;
  onUpload: (file: File | undefined) => void;
  onDelete: (id: string) => void;
}

function InputGroup({ group, inputs, busy, onUpload, onDelete }: InputGroupProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const rows =
    group.type === "document"
      ? (inputs?.documents ?? []).map((d) => ({
          id: d.id,
          label: d.fileName,
          meta: `${d.fileType ?? "?"} · ${d.parsedStatus ?? "pending"} · ${formatDate(d.uploadedAt)}`,
        }))
      : group.type === "master-list"
        ? (inputs?.masterLists ?? []).map((m) => ({
            id: m.id,
            label: m.fileName ?? m.id,
            meta: `${m.itemCount ?? 0}개 항목`,
          }))
        : (inputs?.baselines ?? []).map((b) => ({
            id: b.id,
            label: b.fileName ?? b.id,
            meta: b.startDate || b.endDate ? `${b.startDate ?? "?"} ~ ${b.endDate ?? "?"}` : "날짜 없음",
          }));

  return (
    <div
      style={{
        border: "var(--border-width-hairline) solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-4)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-3)" }}>
        <div>
          <div style={{ fontWeight: "var(--font-weight-semibold)" }}>{group.title}</div>
          <div style={muted}>{group.hint}</div>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            style={{ display: "none" }}
            onChange={(event) => {
              onUpload(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? "업로드 중…" : "파일 업로드"}
          </Button>
        </div>
      </div>

      {rows.length > 0 ? (
        <ul style={{ listStyle: "none", margin: "var(--space-3) 0 0", padding: 0, display: "grid", gap: "var(--space-2)" }}>
          {rows.map((row) => (
            <li
              key={row.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "var(--space-3)",
                padding: "var(--space-2) var(--space-3)",
                background: "var(--color-surface)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <span style={{ display: "flex", gap: "var(--space-3)", alignItems: "baseline", minWidth: 0 }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.label}</span>
                <span style={muted}>{row.meta}</span>
              </span>
              <Button variant="ghost" onClick={() => onDelete(row.id)}>
                삭제
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ ...muted, marginTop: "var(--space-3)" }}>업로드된 항목이 없습니다.</p>
      )}
    </div>
  );
}

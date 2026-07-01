"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { TextField, TextArea, Select } from "@/components/forms";
import { createIssue, errorMessage } from "@/lib/api-client";
import type { Priority } from "@/lib/types";
import { PRIORITY_LABEL } from "@/lib/types";

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "urgent", label: PRIORITY_LABEL.urgent },
  { value: "high", label: PRIORITY_LABEL.high },
  { value: "normal", label: PRIORITY_LABEL.normal },
  { value: "low", label: PRIORITY_LABEL.low },
];

export default function NewIssuePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [titleError, setTitleError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();

  async function handleCreate() {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitleError("제목을 입력하세요.");
      return;
    }
    setTitleError(undefined);
    setSubmitError(undefined);
    setSaving(true);
    try {
      const created = await createIssue({ title: trimmed, body: body || undefined, priority });
      router.push(`/issues/${created.id}`);
    } catch (error) {
      setSubmitError(errorMessage(error));
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <PageHeader
        breadcrumb={[{ label: "Issues", to: "/issues" }, { label: "이슈 등록" }]}
        title="이슈 등록 (GitHub에 생성)"
        description="제목·본문은 GitHub에 생성되고, 우선순위는 콘솔 로컬에 저장됩니다."
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", maxWidth: "720px" }}>
        <TextField
          label="제목"
          value={title}
          onChange={(value) => {
            setTitle(value);
            if (titleError) setTitleError(undefined);
          }}
          placeholder="이슈 제목"
          required
          error={titleError}
          disabled={saving}
        />

        <TextArea
          label="본문"
          value={body}
          onChange={setBody}
          rows={8}
          placeholder="이슈 본문 (GitHub에 생성됩니다)"
          disabled={saving}
        />

        <Select
          label="우선순위 (콘솔 로컬)"
          value={priority}
          options={PRIORITY_OPTIONS}
          onChange={(value) => setPriority(value)}
          disabled={saving}
        />

        <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-caption)", margin: 0 }}>
          담당자·라벨은 GitHub에서 관리되며, 생성 후 GitHub 원문에서 지정할 수 있습니다.
        </p>

        {submitError ? (
          <div
            role="alert"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
              padding: "var(--space-3)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-error)",
              color: "var(--color-error)",
            }}
          >
            <span>GitHub 이슈 생성에 실패했습니다.</span>
            <span style={{ fontSize: "var(--font-size-caption)" }}>{submitError}</span>
          </div>
        ) : null}

        <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
          <Button variant="secondary" onClick={() => router.push("/issues")} disabled={saving}>
            취소
          </Button>
          <Button variant="primary" onClick={handleCreate} disabled={saving}>
            {saving ? "생성 중..." : "생성"}
          </Button>
        </div>
      </div>
    </div>
  );
}

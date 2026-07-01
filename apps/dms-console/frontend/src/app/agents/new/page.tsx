"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createAgent, errorMessage } from "@/lib/api-client";
import type { AgentStatus } from "@/lib/types";
import { AGENT_STATUS_LABEL } from "@/lib/types";

import { Button } from "@/components/Button";
import { PageHeader } from "@/components/PageHeader";
import { Select, TextArea, TextField } from "@/components/forms";
import type { SelectOption } from "@/components/forms";

const STATUS_OPTIONS: SelectOption<AgentStatus>[] = (
  ["draft", "confirmed", "on_hold"] as AgentStatus[]
).map((value) => ({ value, label: AGENT_STATUS_LABEL[value] }));

export default function AgentNewPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [planNote, setPlanNote] = useState("");
  const [status, setStatus] = useState<AgentStatus>("draft");

  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) {
      setNameError("에이전트명을 입력하세요.");
      return;
    }
    setNameError(null);
    setSaving(true);
    setSubmitError(null);
    try {
      const created = await createAgent({
        name: name.trim(),
        description: description.trim() || undefined,
        planNote: planNote.trim() || undefined,
        status,
      });
      router.push(`/agents/${created.id}`);
    } catch (error) {
      setSubmitError(errorMessage(error));
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        breadcrumb={[{ label: "Agent", to: "/agents" }, { label: "에이전트 등록" }]}
        title="에이전트 등록"
      />

      <div style={{ maxWidth: 640, display: "grid", gap: "var(--space-5)" }}>
        <TextField
          label="에이전트명"
          value={name}
          onChange={(value) => {
            setName(value);
            if (nameError) setNameError(null);
          }}
          placeholder="에이전트 이름"
          required
          error={nameError ?? undefined}
        />

        <TextField
          label="설명"
          value={description}
          onChange={setDescription}
          placeholder="에이전트에 대한 짧은 설명"
        />

        <TextArea
          label="기획 메모"
          value={planNote}
          onChange={setPlanNote}
          rows={8}
          placeholder="에이전트 기획 내용을 자유롭게 적어 두세요."
        />

        <Select<AgentStatus>
          label="상태"
          value={status}
          options={STATUS_OPTIONS}
          onChange={setStatus}
        />

        {submitError ? (
          <p style={{ margin: 0, color: "var(--color-error)" }}>{submitError}</p>
        ) : null}

        <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
          <Button variant="secondary" onClick={() => router.push("/agents")} disabled={saving}>
            취소
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </Button>
        </div>
      </div>
    </div>
  );
}

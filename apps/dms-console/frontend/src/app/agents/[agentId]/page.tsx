"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  ApiError,
  deleteAgent,
  errorMessage,
  getAgent,
  updateAgent,
} from "@/lib/api-client";
import type { Agent, AgentStatus } from "@/lib/types";
import { AGENT_STATUS_LABEL } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { useAsyncData } from "@/lib/hooks";

import { Button } from "@/components/Button";
import { StatusChip } from "@/components/Chips";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState, LoadingSkeleton, NotFound } from "@/components/StateViews";
import { Select, TextArea, TextField } from "@/components/forms";
import type { SelectOption } from "@/components/forms";

const STATUS_OPTIONS: SelectOption<AgentStatus>[] = (
  ["draft", "confirmed", "on_hold"] as AgentStatus[]
).map((value) => ({ value, label: AGENT_STATUS_LABEL[value] }));

interface FormValues {
  name: string;
  status: AgentStatus;
  description: string;
  planNote: string;
  references: string[];
}

function toForm(agent: Agent): FormValues {
  return {
    name: agent.name ?? "",
    status: agent.status ?? "draft",
    description: agent.description ?? "",
    planNote: agent.planNote ?? "",
    references: agent.references ? [...agent.references] : [],
  };
}

function referencesEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

export default function AgentDetailPage() {
  const router = useRouter();
  const params = useParams<{ agentId: string }>();
  const agentId = params.agentId;

  const { state, reload } = useAsyncData(() => getAgent(agentId), [agentId]);

  const [form, setForm] = useState<FormValues | null>(null);
  const [baseline, setBaseline] = useState<FormValues | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | undefined>(undefined);

  const [nameError, setNameError] = useState<string | null>(null);
  const [newReference, setNewReference] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (state.status === "success") {
      const initial = toForm(state.data);
      setForm(initial);
      setBaseline(initial);
      setUpdatedAt(state.data.updatedAt);
    }
  }, [state]);

  const dirty =
    form !== null &&
    baseline !== null &&
    (form.name !== baseline.name ||
      form.status !== baseline.status ||
      form.description !== baseline.description ||
      form.planNote !== baseline.planNote ||
      !referencesEqual(form.references, baseline.references));

  function patch(partial: Partial<FormValues>) {
    setForm((prev) => (prev ? { ...prev, ...partial } : prev));
  }

  function addReference() {
    const value = newReference.trim();
    if (!value || !form) return;
    patch({ references: [...form.references, value] });
    setNewReference("");
  }

  function removeReference(index: number) {
    if (!form) return;
    patch({ references: form.references.filter((_, i) => i !== index) });
  }

  async function handleSave() {
    if (!form) return;
    if (!form.name.trim()) {
      setNameError("에이전트명을 입력하세요.");
      return;
    }
    setNameError(null);
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateAgent(agentId, {
        name: form.name.trim(),
        status: form.status,
        description: form.description.trim() || undefined,
        planNote: form.planNote.trim() || undefined,
        references: form.references,
      });
      const next = toForm(updated);
      setForm(next);
      setBaseline(next);
      setUpdatedAt(updated.updatedAt);
    } catch (error) {
      setSaveError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  function goToList() {
    if (dirty) {
      setConfirmLeave(true);
      return;
    }
    router.push("/agents");
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAgent(agentId);
      router.push("/agents");
    } catch (error) {
      setDeleteError(errorMessage(error));
      setDeleting(false);
    }
  }

  if (state.status === "loading") {
    return (
      <div>
        <PageHeader
          breadcrumb={[{ label: "Agent", to: "/agents" }, { label: "에이전트 상세" }]}
          title="에이전트 상세"
        />
        <LoadingSkeleton variant="form" rows={6} />
      </div>
    );
  }

  if (state.status === "error") {
    if (state.error instanceof ApiError && state.error.status === 404) {
      return (
        <div>
          <PageHeader
            breadcrumb={[{ label: "Agent", to: "/agents" }, { label: "없음" }]}
            title="에이전트"
          />
          <NotFound
            title="에이전트를 찾을 수 없습니다"
            description="존재하지 않는 에이전트 식별자입니다."
            action={
              <Button variant="secondary" onClick={() => router.push("/agents")}>
                목록으로
              </Button>
            }
          />
        </div>
      );
    }
    return (
      <div>
        <PageHeader
          breadcrumb={[{ label: "Agent", to: "/agents" }, { label: "에이전트 상세" }]}
          title="에이전트 상세"
        />
        <ErrorState description={errorMessage(state.error)} onRetry={reload} />
      </div>
    );
  }

  if (!form) return null;

  return (
    <div>
      <PageHeader
        breadcrumb={[{ label: "Agent", to: "/agents" }, { label: form.name || "에이전트 상세" }]}
        title={form.name || "에이전트 상세"}
        summary={
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
            }}
          >
            <StatusChip status={{ domain: "agent", value: form.status }} size="sm" />
            <span
              style={{
                color: "var(--color-text-muted)",
                fontSize: "var(--font-size-caption)",
              }}
            >
              수정일 {formatDate(updatedAt)}
            </span>
          </span>
        }
      />

      <div style={{ maxWidth: 720, display: "grid", gap: "var(--space-5)" }}>
        <TextField
          label="에이전트명"
          value={form.name}
          onChange={(value) => {
            patch({ name: value });
            if (nameError) setNameError(null);
          }}
          required
          error={nameError ?? undefined}
        />

        <Select<AgentStatus>
          label="상태"
          value={form.status}
          options={STATUS_OPTIONS}
          onChange={(value) => patch({ status: value })}
        />

        <TextField
          label="설명"
          value={form.description}
          onChange={(value) => patch({ description: value })}
          placeholder="에이전트에 대한 짧은 설명"
        />

        <TextArea
          label="기획 메모"
          value={form.planNote}
          onChange={(value) => patch({ planNote: value })}
          rows={8}
          placeholder="에이전트 기획 내용을 자유롭게 적어 두세요."
        />

        <div>
          <div
            style={{
              fontSize: "var(--font-size-caption)",
              fontWeight: 600,
              marginBottom: "var(--space-2)",
            }}
          >
            참고 자료
          </div>
          {form.references.length > 0 ? (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "var(--space-2)" }}>
              {form.references.map((ref, index) => (
                <li
                  key={`${ref}-${index}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-3)",
                    padding: "var(--space-2) var(--space-3)",
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <span
                    style={{
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontSize: "var(--font-size-body)",
                    }}
                  >
                    {ref}
                  </span>
                  <Button variant="ghost" onClick={() => removeReference(index)}>
                    삭제
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: "var(--font-size-caption)" }}>
              등록된 참고 자료가 없습니다.
            </p>
          )}

          <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
            <div style={{ flex: 1 }}>
              <TextField
                value={newReference}
                onChange={setNewReference}
                placeholder="참고 자료 링크(URL)"
              />
            </div>
            <Button variant="secondary" onClick={addReference} disabled={!newReference.trim()}>
              추가
            </Button>
          </div>
        </div>

        {saveError ? <p style={{ margin: 0, color: "var(--color-error)" }}>{saveError}</p> : null}

        <div
          style={{
            display: "flex",
            gap: "var(--space-3)",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Button variant="danger" onClick={() => setConfirmDelete(true)} disabled={saving}>
            삭제
          </Button>
          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            <Button variant="secondary" onClick={goToList} disabled={saving}>
              목록으로
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving || !dirty}>
              {saving ? "저장 중..." : "저장"}
            </Button>
          </div>
        </div>
      </div>

      <Modal
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        title="저장하지 않은 변경"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmLeave(false)}>
              계속 편집
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirmLeave(false);
                router.push("/agents");
              }}
            >
              저장 없이 이동
            </Button>
          </>
        }
      >
        <p style={{ margin: 0 }}>저장하지 않은 변경이 있습니다. 이동하시겠습니까?</p>
      </Modal>

      <Modal
        open={confirmDelete}
        onClose={() => {
          if (!deleting) {
            setConfirmDelete(false);
            setDeleteError(null);
          }
        }}
        title="에이전트 삭제"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setConfirmDelete(false);
                setDeleteError(null);
              }}
              disabled={deleting}
            >
              취소
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? "삭제 중..." : "삭제"}
            </Button>
          </>
        }
      >
        <p style={{ margin: 0 }}>
          <strong>{form.name}</strong> 에이전트를 삭제하시겠습니까?
        </p>
        {deleteError ? (
          <p style={{ marginTop: "var(--space-3)", color: "var(--color-error)" }}>{deleteError}</p>
        ) : null}
      </Modal>
    </div>
  );
}

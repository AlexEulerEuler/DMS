"use client";

import { useMemo, useState } from "react";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { StatusChip } from "@/components/Chips";
import { StatusFilterTabs } from "@/components/StatusFilter";
import { TaskTree } from "@/components/TaskTree";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/StateViews";
import { DatePicker, Select, TextField } from "@/components/forms";
import { useAsyncData } from "@/lib/hooks";
import {
  createTask,
  deleteTask,
  errorMessage,
  listTasks,
  updateTask,
} from "@/lib/api-client";
import type { TaskWritePayload } from "@/lib/api-client";
import type { CommonStatus, TaskIA, TaskNodeType } from "@/lib/types";
import {
  COMMON_STATUS_LABEL,
  TASK_NODE_TYPE_LABEL,
} from "@/lib/types";
import { formatDateRange } from "@/lib/format";

import styles from "./ia.module.css";

type StatusFilter = CommonStatus | "all";

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "done", label: "완료" },
  { value: "in_progress", label: "진행중" },
  { value: "planned", label: "진행예정" },
];

const TYPE_OPTIONS: { value: TaskNodeType; label: string }[] = [
  { value: "category", label: TASK_NODE_TYPE_LABEL.category },
  { value: "group", label: TASK_NODE_TYPE_LABEL.group },
  { value: "task", label: TASK_NODE_TYPE_LABEL.task },
];

const COMMON_STATUS_OPTIONS: { value: CommonStatus; label: string }[] = [
  { value: "planned", label: COMMON_STATUS_LABEL.planned },
  { value: "in_progress", label: COMMON_STATUS_LABEL.in_progress },
  { value: "done", label: COMMON_STATUS_LABEL.done },
];

interface FormDraft {
  type: TaskNodeType;
  title: string;
  parentId: string;
  status: CommonStatus;
  owner: string;
  startDate: string | null;
  endDate: string | null;
}

const EMPTY_DRAFT: FormDraft = {
  type: "category",
  title: "",
  parentId: "",
  status: "planned",
  owner: "",
  startDate: null,
  endDate: null,
};

export default function TaskIaPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const { state, reload } = useAsyncData<TaskIA[]>(
    () => listTasks(statusFilter === "all" ? undefined : statusFilter),
    [statusFilter],
  );

  const [collapsedIds, setCollapsedIds] = useState<string[]>([]);
  // null = closed; { node: null } = create mode; { node } = edit mode.
  const [formState, setFormState] = useState<{ node: TaskIA | null } | null>(null);
  const [viewNode, setViewNode] = useState<TaskIA | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TaskIA | null>(null);

  const nodes = state.status === "success" ? state.data : [];

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
    );
  };

  const handleSaved = () => {
    setFormState(null);
    reload();
  };

  const handleDeleted = () => {
    setPendingDelete(null);
    setViewNode(null);
    reload();
  };

  const header = (
    <PageHeader
      title="IA"
      description="업무 정보구조를 구분 · 중분류 · 세부 업무 계층으로 관리"
    />
  );

  const toolbar = (
    <div className={styles.toolbar}>
      <StatusFilterTabs value={statusFilter} options={FILTER_OPTIONS} onChange={setStatusFilter} />
      <Button variant="primary" onClick={() => setFormState({ node: null })}>
        항목 추가
      </Button>
    </div>
  );

  return (
    <div>
      {header}
      {toolbar}

      {state.status === "loading" ? (
        <LoadingSkeleton variant="table" rows={6} />
      ) : state.status === "error" ? (
        <ErrorState description={errorMessage(state.error)} onRetry={reload} />
      ) : nodes.length === 0 && statusFilter === "all" ? (
        <EmptyState
          title="등록된 업무가 없습니다"
          description="구분·중분류·세부 업무를 추가해 업무 정보구조를 구성하세요."
          action={
            <Button variant="primary" onClick={() => setFormState({ node: null })}>
              항목 추가
            </Button>
          }
        />
      ) : (
        <TaskTree
          nodes={nodes}
          collapsedIds={collapsedIds}
          onToggle={toggleCollapse}
          onView={setViewNode}
          statusFilter={statusFilter}
          emptyFilterLabel="해당 상태의 업무가 없습니다"
        />
      )}

      {formState ? (
        <TaskNodeForm
          nodes={nodes}
          editNode={formState.node}
          onCancel={() => setFormState(null)}
          onSaved={handleSaved}
        />
      ) : null}

      {viewNode ? (
        <NodeViewModal
          node={viewNode}
          onClose={() => setViewNode(null)}
          onRequestEdit={() => {
            setFormState({ node: viewNode });
            setViewNode(null);
          }}
          onRequestDelete={() => setPendingDelete(viewNode)}
        />
      ) : null}

      {pendingDelete ? (
        <DeleteConfirmModal
          node={pendingDelete}
          onCancel={() => setPendingDelete(null)}
          onDeleted={handleDeleted}
        />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create form (Modal)
// ---------------------------------------------------------------------------

interface TaskNodeFormProps {
  nodes: TaskIA[];
  /** null = create; a node = edit that node (label/parent/status/owner/dates). */
  editNode: TaskIA | null;
  onCancel: () => void;
  onSaved: () => void;
}

function draftFromNode(node: TaskIA): FormDraft {
  return {
    type: node.type,
    title: node.title,
    parentId: node.parentId ?? "",
    status: node.status ?? "planned",
    owner: node.owner ?? "",
    startDate: node.startDate ?? null,
    endDate: node.endDate ?? null,
  };
}

function TaskNodeForm({ nodes, editNode, onCancel, onSaved }: TaskNodeFormProps) {
  const isEdit = editNode !== null;
  const [draft, setDraft] = useState<FormDraft>(() =>
    editNode ? draftFromNode(editNode) : EMPTY_DRAFT,
  );
  const [titleError, setTitleError] = useState<string>();
  const [submitError, setSubmitError] = useState<string>();
  const [saving, setSaving] = useState(false);

  // Parent candidates: existing category + group nodes (a 세부 업무/중분류 hangs under these).
  // When editing, a node cannot be reparented under itself.
  const parentOptions = useMemo(
    () =>
      nodes
        .filter((node) => node.type === "category" || node.type === "group")
        .filter((node) => !editNode || node.id !== editNode.id)
        .map((node) => ({
          value: node.id,
          label: `${TASK_NODE_TYPE_LABEL[node.type]} · ${node.title}`,
        })),
    [nodes, editNode],
  );

  const isTask = draft.type === "task";
  const isCategory = draft.type === "category";

  const update = <K extends keyof FormDraft>(key: K, value: FormDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const title = draft.title.trim();
    if (!title) {
      setTitleError("라벨을 입력하세요.");
      return;
    }
    setTitleError(undefined);
    setSubmitError(undefined);

    const payload: TaskWritePayload = {
      type: draft.type,
      title,
      parentId: isCategory ? null : draft.parentId || null,
    };
    if (isTask) {
      payload.status = draft.status;
      if (draft.owner.trim()) payload.owner = draft.owner.trim();
      payload.startDate = draft.startDate;
      payload.endDate = draft.endDate;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await updateTask(editNode.id, payload);
      } else {
        await createTask(payload);
      }
      onSaved();
    } catch (error) {
      setSubmitError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onCancel}
      title={isEdit ? "항목 편집" : "항목 추가"}
      dismissible={!saving}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            취소
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            저장
          </Button>
        </>
      }
    >
      <div className={styles.formStack}>
        <Select<TaskNodeType>
          label="유형"
          value={draft.type}
          options={TYPE_OPTIONS}
          onChange={(value) => update("type", value)}
          disabled={isEdit}
        />

        <TextField
          label="라벨"
          value={draft.title}
          onChange={(value) => {
            update("title", value);
            if (titleError) setTitleError(undefined);
          }}
          placeholder="항목 이름"
          required
          error={titleError}
        />

        <Select<string>
          label="상위 노드"
          value={isCategory ? null : draft.parentId || null}
          options={parentOptions}
          onChange={(value) => update("parentId", value)}
          placeholder={isCategory ? "구분은 상위 노드 없음" : "상위 노드 선택"}
          disabled={isCategory}
        />

        {isTask ? (
          <>
            <Select<CommonStatus>
              label="상태"
              value={draft.status}
              options={COMMON_STATUS_OPTIONS}
              onChange={(value) => update("status", value)}
            />
            <TextField
              label="담당자"
              value={draft.owner}
              onChange={(value) => update("owner", value)}
              placeholder="담당자 (선택)"
            />
            <DatePicker
              label="기한 시작"
              value={draft.startDate}
              onChange={(value) => update("startDate", value)}
              max={draft.endDate ?? undefined}
            />
            <DatePicker
              label="기한 종료"
              value={draft.endDate}
              onChange={(value) => update("endDate", value)}
              min={draft.startDate ?? undefined}
            />
          </>
        ) : null}

        {submitError ? <p className={styles.formError}>{submitError}</p> : null}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Read-only view (Modal) + delete affordance
// ---------------------------------------------------------------------------

interface NodeViewModalProps {
  node: TaskIA;
  onClose: () => void;
  onRequestEdit: () => void;
  onRequestDelete: () => void;
}

function NodeViewModal({ node, onClose, onRequestEdit, onRequestDelete }: NodeViewModalProps) {
  const isTask = node.type === "task";
  const isContainer = node.type === "category" || node.type === "group";

  return (
    <Modal
      open
      onClose={onClose}
      title={node.title}
      footer={
        <>
          {isContainer ? (
            <Button variant="danger" onClick={onRequestDelete}>
              삭제
            </Button>
          ) : null}
          <Button variant="secondary" onClick={onRequestEdit}>
            편집
          </Button>
          <Button variant="ghost" onClick={onClose}>
            닫기
          </Button>
        </>
      }
    >
      <div className={styles.viewStack}>
        <div className={styles.viewRow}>
          <span className={styles.viewLabel}>유형</span>
          <span className={styles.viewValue}>{TASK_NODE_TYPE_LABEL[node.type]}</span>
        </div>
        {node.status ? (
          <div className={styles.viewRow}>
            <span className={styles.viewLabel}>상태</span>
            <span className={styles.viewValue}>
              <StatusChip status={{ domain: "common", value: node.status }} size="sm" />
            </span>
          </div>
        ) : null}
        {isTask ? (
          <>
            <div className={styles.viewRow}>
              <span className={styles.viewLabel}>담당자</span>
              <span className={styles.viewValue}>{node.owner || "미지정"}</span>
            </div>
            <div className={styles.viewRow}>
              <span className={styles.viewLabel}>기한</span>
              <span className={styles.viewValue}>
                {formatDateRange(node.startDate, node.endDate)}
              </span>
            </div>
            {typeof node.progress === "number" ? (
              <div className={styles.viewRow}>
                <span className={styles.viewLabel}>진행률</span>
                <span className={styles.viewValue}>{node.progress}%</span>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Delete confirm (Modal) — cascade delete for category/group
// ---------------------------------------------------------------------------

interface DeleteConfirmModalProps {
  node: TaskIA;
  onCancel: () => void;
  onDeleted: () => void;
}

function DeleteConfirmModal({ node, onCancel, onDeleted }: DeleteConfirmModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>();

  const handleDelete = async () => {
    setDeleting(true);
    setError(undefined);
    try {
      await deleteTask(node.id);
      onDeleted();
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onCancel}
      title="삭제 확인"
      dismissible={!deleting}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={deleting}>
            취소
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            삭제
          </Button>
        </>
      }
    >
      <p className={styles.confirmText}>
        &ldquo;{node.title}&rdquo; {TASK_NODE_TYPE_LABEL[node.type]}와(과) 하위 노드가 모두
        삭제됩니다. 계속하시겠습니까?
      </p>
      {error ? <p className={styles.formError}>{error}</p> : null}
    </Modal>
  );
}

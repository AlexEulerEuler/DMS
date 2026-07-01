"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createWork, listIssues, listAgents, errorMessage } from "@/lib/api-client";
import { useAsyncData } from "@/lib/hooks";
import type { Agent, IssueView, Page } from "@/lib/types";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { LoadingSkeleton } from "@/components/StateViews";

import { WorkForm, EMPTY_WORK_FORM, dateRangeError } from "../WorkForm";
import type { WorkFormValues } from "../WorkForm";

interface Candidates {
  issues: IssueView[];
  agents: Agent[];
}

async function loadCandidates(): Promise<Candidates> {
  // Best-effort: connection candidates must not block work creation.
  const [issuesResult, agentsResult] = await Promise.allSettled([listIssues({}), listAgents({})]);
  const issues = issuesResult.status === "fulfilled" ? (issuesResult.value as Page<IssueView>).items : [];
  const agents = agentsResult.status === "fulfilled" ? (agentsResult.value as Page<Agent>).items : [];
  return { issues, agents };
}

export default function NewWorkPage() {
  const router = useRouter();
  const { state } = useAsyncData(loadCandidates, []);

  const [values, setValues] = useState<WorkFormValues>(EMPTY_WORK_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showTitleError, setShowTitleError] = useState(false);

  const candidates: Candidates = state.status === "success" ? state.data : { issues: [], agents: [] };
  const issueOptions = candidates.issues.map((issue) => ({
    value: String(issue.id),
    label: `#${issue.id} ${issue.title}`,
  }));
  const agentOptions = candidates.agents.map((agent) => ({ value: agent.id, label: agent.name }));

  const dateError = dateRangeError(values.startDate, values.endDate);
  const titleError = showTitleError && !values.title.trim() ? "작업명을 입력하세요." : undefined;

  function patch(next: Partial<WorkFormValues>) {
    setValues((current) => ({ ...current, ...next }));
  }

  async function handleSave() {
    if (!values.title.trim()) {
      setShowTitleError(true);
      return;
    }
    if (dateError) return;

    setSubmitting(true);
    setSaveError(null);
    try {
      await createWork({
        title: values.title.trim(),
        owner: values.owner || null,
        status: values.status,
        startDate: values.startDate,
        endDate: values.endDate,
        description: values.description || null,
        linkedIssue: values.linkedIssue || null,
        linkedAgent: values.linkedAgent || null,
      });
      router.push("/work/backlog");
    } catch (error) {
      setSaveError(errorMessage(error));
      setSubmitting(false);
    }
  }

  const footer = (
    <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-6)" }}>
      <Button variant="secondary" onClick={() => router.back()} disabled={submitting}>
        취소
      </Button>
      <Button variant="primary" onClick={handleSave} disabled={submitting}>
        {submitting ? "저장 중…" : "저장"}
      </Button>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="작업 등록"
        breadcrumb={[{ label: "Backlog", to: "/work/backlog" }, { label: "작업 등록" }]}
      />

      {state.status === "loading" ? (
        <LoadingSkeleton variant="form" rows={6} />
      ) : (
        <>
          <WorkForm
            values={values}
            onChange={patch}
            issueOptions={issueOptions}
            agentOptions={agentOptions}
            titleError={titleError}
            dateError={dateError}
          />
          {saveError ? (
            <p role="alert" style={{ color: "var(--color-error)", marginTop: "var(--space-4)" }}>
              {saveError}
            </p>
          ) : null}
          {footer}
        </>
      )}
    </div>
  );
}

"use client";

import type { ReactNode } from "react";

import { Card, CardGrid } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState, LoadingSkeleton } from "@/components/StateViews";
import { getOverviewDoc, getOverviewMeta, errorMessage } from "@/lib/api-client";
import { useAsyncData } from "@/lib/hooks";
import type { OverviewDoc, PipelineSummary, ProjectMeta } from "@/lib/types";

interface OverviewLanding {
  meta: ProjectMeta;
  pipeline: PipelineSummary;
  doc: OverviewDoc;
}

const META_FIELDS: { key: keyof ProjectMeta; label: string }[] = [
  { key: "version", label: "버전" },
  { key: "language", label: "언어" },
  { key: "branch", label: "브랜치" },
  { key: "package", label: "패키지" },
  { key: "apiEndpoint", label: "API" },
];

function MetaChipRow({ meta }: { meta: ProjectMeta }) {
  const chips = META_FIELDS.map((field) => {
    const value = meta[field.key];
    if (value === undefined || value === null || String(value).trim() === "") return null;
    return { label: field.label, value: String(value) };
  }).filter((chip): chip is { label: string; value: string } => chip !== null);

  if (chips.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "var(--space-2)",
        marginTop: "var(--space-4)",
      }}
    >
      {chips.map((chip) => (
        <span
          key={chip.label}
          style={{
            display: "inline-flex",
            alignItems: "baseline",
            gap: "var(--space-1)",
            padding: "var(--space-1) var(--space-3)",
            border: "var(--border-width-hairline) solid var(--color-border)",
            borderRadius: "var(--radius-full)",
            background: "var(--color-surface)",
            fontSize: "var(--font-size-caption)",
          }}
        >
          <span style={{ color: "var(--color-text-muted)" }}>{chip.label}</span>
          <span style={{ color: "var(--color-text)", fontWeight: "var(--font-weight-medium)" }}>
            {chip.value}
          </span>
        </span>
      ))}
    </div>
  );
}

function OverviewParagraph({ content }: { content: string }) {
  const text = content?.trim();
  if (!text) return null;
  return (
    <p
      style={{
        marginTop: "var(--space-6)",
        color: "var(--color-text)",
        fontSize: "var(--font-size-body)",
        lineHeight: "var(--line-height-body)",
        whiteSpace: "pre-wrap",
      }}
    >
      {text}
    </p>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2
      style={{
        marginTop: "var(--space-8)",
        marginBottom: "var(--space-4)",
        fontSize: "var(--font-size-section)",
        fontWeight: "var(--font-weight-semibold)",
        color: "var(--color-text)",
      }}
    >
      {children}
    </h2>
  );
}

function SummaryCards({ pipeline }: { pipeline: PipelineSummary }) {
  const inputs = pipeline.inputs ?? [];
  const outputs = pipeline.outputs ?? [];
  const hasContent = inputs.length > 0 || outputs.length > 0;
  if (!hasContent) return null;

  return (
    <section>
      <SectionTitle>입력 · 출력</SectionTitle>
      <CardGrid>
        {inputs.map((input) => (
          <Card key={input.key} title={input.title} meta={<span>입력</span>}>
            {input.description ? (
              <span style={{ color: "var(--color-text-muted)" }}>{input.description}</span>
            ) : null}
          </Card>
        ))}
        {outputs.length > 0 ? (
          <Card
            title="출력"
            meta={<span>산출물</span>}
            variant="outline"
          >
            <ul style={{ margin: 0, paddingLeft: "var(--space-5)" }}>
              {outputs.map((output, index) => (
                <li key={`${output.title}-${index}`} style={{ marginBottom: "var(--space-1)" }}>
                  <span style={{ fontWeight: "var(--font-weight-medium)" }}>{output.title}</span>
                  {output.description ? (
                    <span style={{ color: "var(--color-text-muted)" }}>
                      {" — "}
                      {output.description}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </CardGrid>
    </section>
  );
}

function WorkflowDiagram({ pipeline }: { pipeline: PipelineSummary }) {
  const steps = [...(pipeline.workflowSteps ?? [])].sort((a, b) => a.order - b.order);
  if (steps.length === 0) return null;

  return (
    <section>
      <SectionTitle>워크플로우</SectionTitle>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "var(--space-2)",
        }}
      >
        {steps.map((step, index) => (
          <div
            key={`${step.order}-${step.label}`}
            style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--space-2)",
                padding: "var(--space-2) var(--space-4)",
                border: "var(--border-width-hairline) solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                background: "var(--color-surface)",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "var(--space-6)",
                  height: "var(--space-6)",
                  borderRadius: "var(--radius-full)",
                  background: "var(--color-primary)",
                  color: "var(--color-bg)",
                  fontSize: "var(--font-size-caption)",
                  fontWeight: "var(--font-weight-semibold)",
                }}
              >
                {index + 1}
              </span>
              <span style={{ fontSize: "var(--font-size-body)" }}>{step.label}</span>
            </div>
            {index < steps.length - 1 ? (
              <span
                aria-hidden="true"
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: "var(--font-size-section)",
                }}
              >
                →
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function OverviewPage() {
  const { state, reload } = useAsyncData<OverviewLanding>(async () => {
    const [{ meta, pipeline }, doc] = await Promise.all([
      getOverviewMeta(),
      getOverviewDoc("overview"),
    ]);
    return { meta, pipeline, doc };
  }, []);

  return (
    <div>
      <PageHeader
        title="프로젝트 개요"
        description="입력 문서 기반 표준 목록 자동 생성 시스템"
      />

      {state.status === "loading" ? <LoadingSkeleton variant="cards" rows={4} /> : null}

      {state.status === "error" ? (
        <ErrorState description={errorMessage(state.error)} onRetry={reload} />
      ) : null}

      {state.status === "success" ? (
        <>
          <MetaChipRow meta={state.data.meta} />
          <OverviewParagraph content={state.data.doc.content} />
          <div style={{ marginTop: "var(--space-4)" }}>
            <SummaryCards pipeline={state.data.pipeline} />
            <WorkflowDiagram pipeline={state.data.pipeline} />
          </div>
        </>
      ) : null}
    </div>
  );
}

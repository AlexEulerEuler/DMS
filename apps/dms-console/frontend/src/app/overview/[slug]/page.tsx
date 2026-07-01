"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

import { Button } from "@/components/Button";
import { OVERVIEW_DOCS } from "@/components/nav-config";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, LoadingSkeleton, NotFound } from "@/components/StateViews";
import {
  ApiError,
  errorMessage,
  getOverviewDoc,
  getOverviewOutputs,
  resolveDownloadUrl,
} from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { useAsyncData } from "@/lib/hooks";
import { EXPORT_FORMAT_LABEL } from "@/lib/types";
import type { OverviewDoc, OverviewOutputs } from "@/lib/types";

interface DocPayload {
  doc: OverviewDoc;
  outputs: OverviewOutputs | null;
}

// -----------------------------------------------------------------------------
// Doc content renderer: split lines, "- " lines become list items, else <p>.
// -----------------------------------------------------------------------------
function DocContent({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  let key = 0;

  const flushBullets = () => {
    if (bullets.length === 0) return;
    blocks.push(
      <ul
        key={`ul-${key++}`}
        style={{
          margin: "var(--space-2) 0",
          paddingLeft: "var(--space-6)",
          color: "var(--color-text)",
          lineHeight: "var(--line-height-body)",
        }}
      >
        {bullets.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.trimStart().startsWith("- ")) {
      bullets.push(line.trimStart().slice(2));
      continue;
    }
    flushBullets();
    if (line.trim() === "") continue;
    blocks.push(
      <p
        key={`p-${key++}`}
        style={{
          margin: "var(--space-3) 0",
          color: "var(--color-text)",
          lineHeight: "var(--line-height-body)",
          whiteSpace: "pre-wrap",
        }}
      >
        {line}
      </p>,
    );
  }
  flushBullets();

  return <div style={{ fontSize: "var(--font-size-body)" }}>{blocks}</div>;
}

// -----------------------------------------------------------------------------
// Empty-doc state: "문서 준비 중" + links to a couple of other docs.
// -----------------------------------------------------------------------------
function EmptyDocState({ slug }: { slug: string }) {
  const others = OVERVIEW_DOCS.filter((doc) => doc.key !== slug).slice(0, 3);
  return (
    <EmptyState
      title="문서 준비 중"
      description="이 문서는 아직 준비 중입니다. 다른 문서를 확인해 보세요."
      action={
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)" }}>
          {others.map((doc) => (
            <Link key={doc.key} href={doc.to} style={{ color: "var(--color-primary)" }}>
              {doc.label}
            </Link>
          ))}
        </div>
      }
    />
  );
}

// -----------------------------------------------------------------------------
// Download list for /overview/data (masterLists / schedules / export files).
// -----------------------------------------------------------------------------
interface DownloadRow {
  id: string;
  version?: string;
  format?: string;
  createdAt?: string;
  downloadUrl?: string;
}

function DownloadGroup({ title, rows }: { title: string; rows: DownloadRow[] }) {
  return (
    <section style={{ marginTop: "var(--space-6)" }}>
      <h3
        style={{
          fontSize: "var(--font-size-section)",
          fontWeight: "var(--font-weight-semibold)",
          marginBottom: "var(--space-3)",
        }}
      >
        {title}
      </h3>
      {rows.length === 0 ? (
        <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-body)" }}>
          산출물이 없습니다
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {rows.map((row) => (
            <li
              key={row.id}
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "var(--space-3)",
                padding: "var(--space-3) 0",
                borderBottom: "var(--border-width-hairline) solid var(--color-border)",
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-4)", alignItems: "baseline" }}>
                <span style={{ fontWeight: "var(--font-weight-medium)" }}>{row.id}</span>
                {row.version ? (
                  <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-caption)" }}>
                    버전 {row.version}
                  </span>
                ) : null}
                {row.format ? (
                  <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-caption)" }}>
                    {row.format}
                  </span>
                ) : null}
                {row.createdAt ? (
                  <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-caption)" }}>
                    {formatDate(row.createdAt)}
                  </span>
                ) : null}
              </div>
              {row.downloadUrl ? (
                <a
                  href={resolveDownloadUrl(row.downloadUrl)}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: "none" }}
                >
                  <Button variant="secondary" type="button">
                    다운로드
                  </Button>
                </a>
              ) : (
                <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-caption)" }}>
                  다운로드 없음
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DownloadList({ outputs }: { outputs: OverviewOutputs }) {
  const masterRows: DownloadRow[] = (outputs.masterLists ?? []).map((item) => ({
    id: item.id,
    version: item.version,
    createdAt: item.generatedAt,
    downloadUrl: item.downloadUrl,
  }));
  const scheduleRows: DownloadRow[] = (outputs.generatedSchedules ?? []).map((item) => ({
    id: item.id,
    createdAt: item.generatedAt,
    downloadUrl: item.downloadUrl,
  }));
  const exportRows: DownloadRow[] = (outputs.exportFiles ?? []).map((item) => ({
    id: item.id,
    format: EXPORT_FORMAT_LABEL[item.format],
    createdAt: item.createdAt,
    downloadUrl: item.downloadUrl,
  }));

  return (
    <div style={{ marginTop: "var(--space-8)" }}>
      <DownloadGroup title="표준 목록" rows={masterRows} />
      <DownloadGroup title="생성 일정" rows={scheduleRows} />
      <DownloadGroup title="내보내기 파일" rows={exportRows} />
    </div>
  );
}

export default function OverviewDocPage() {
  const params = useParams<{ slug: string }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const isData = slug === "data";

  const { state, reload } = useAsyncData<DocPayload>(async () => {
    if (isData) {
      const [doc, outputs] = await Promise.all([getOverviewDoc(slug), getOverviewOutputs()]);
      return { doc, outputs };
    }
    const doc = await getOverviewDoc(slug);
    return { doc, outputs: null };
  }, [slug]);

  if (state.status === "loading") {
    return (
      <div>
        <PageHeader title="문서" />
        <LoadingSkeleton variant="text" rows={6} />
      </div>
    );
  }

  if (state.status === "error") {
    const error = state.error;
    if (error instanceof ApiError && error.status === 404) {
      return (
        <NotFound
          title="없음"
          description="정의되지 않은 문서입니다."
          action={
            <Link href="/overview" style={{ color: "var(--color-primary)" }}>
              프로젝트 개요로 이동
            </Link>
          }
        />
      );
    }
    return (
      <div>
        <PageHeader title="문서" />
        <ErrorState description={errorMessage(error)} onRetry={reload} />
      </div>
    );
  }

  const { doc, outputs } = state.data;
  const hasContent = typeof doc.content === "string" && doc.content.trim() !== "";

  return (
    <div>
      <PageHeader title={doc.title} />
      {hasContent ? <DocContent content={doc.content} /> : <EmptyDocState slug={slug} />}
      {isData && outputs ? <DownloadList outputs={outputs} /> : null}
    </div>
  );
}

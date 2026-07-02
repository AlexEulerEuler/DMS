"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ErrorState, LoadingSkeleton } from "@/components/StateViews";
import { errorMessage, getDocContent, listDocEntries } from "@/lib/api-client";
import { useAsyncData } from "@/lib/hooks";

const ROOTS = [
  { path: "docs", label: "워크스페이스 문서 (정책·계획·결정)" },
  { path: "apps/dms-console/docs", label: "콘솔 기획·스펙" },
  { path: "AGENTS.md", label: "에이전트 가이드 (진입점)" },
  { path: "README.md", label: "README" },
];

function parentOf(path: string): string | null {
  if (ROOTS.some((r) => r.path === path)) return null;
  const idx = path.lastIndexOf("/");
  return idx > 0 ? path.slice(0, idx) : null;
}

function DirView({ path }: { path: string }) {
  const router = useRouter();
  const { state, reload } = useAsyncData(() => listDocEntries(path), [path]);

  if (state.status === "loading") return <LoadingSkeleton variant="table" rows={6} />;
  if (state.status === "error") return <ErrorState description={errorMessage(state.error)} onRetry={reload} />;

  return (
    <Card title={path}>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {state.data.entries.map((entry) => (
          <li key={entry.path}>
            <button
              type="button"
              onClick={() => router.push(`/overview/docs?path=${encodeURIComponent(entry.path)}`)}
              style={{ background: "none", border: 0, padding: 0, cursor: "pointer", color: "var(--color-primary)", font: "inherit" }}
            >
              {entry.type === "dir" ? "📁" : "📄"} {entry.name}
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function FileView({ path }: { path: string }) {
  const { state, reload } = useAsyncData(() => getDocContent(path), [path]);

  if (state.status === "loading") return <LoadingSkeleton variant="text" rows={10} />;
  if (state.status === "error") return <ErrorState description={errorMessage(state.error)} onRetry={reload} />;

  const { frontMatter, body } = state.data;
  return (
    <Card title={path}>
      {frontMatter ? (
        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", marginBottom: "var(--space-4)" }}>
          {frontMatter.layer ? <Badge tone="neutral" size="sm">layer: {frontMatter.layer}</Badge> : null}
          {frontMatter.status ? (
            <Badge tone={frontMatter.status === "approved" ? "success" : frontMatter.status === "superseded" ? "warning" : "neutral"} size="sm">
              {frontMatter.status}
            </Badge>
          ) : null}
          {frontMatter.owner ? <Badge tone="neutral" size="sm">owner: {frontMatter.owner}</Badge> : null}
        </div>
      ) : null}
      <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0, lineHeight: 1.7 }}>{body}</pre>
    </Card>
  );
}

function DocsBrowser() {
  const params = useSearchParams();
  const path = params.get("path");
  const isFile = Boolean(path && /\.(md|ya?ml)$/.test(path));
  const parent = path ? parentOf(path) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <PageHeader
        title="프로젝트 문서"
        description="리포 문서를 그대로 렌더 — 정본은 리포, 편집은 PR로 (문서 규칙: docs/policy/00-doc-system.md)"
        actions={
          parent !== null || path ? (
            <Link href={parent ? `/overview/docs?path=${encodeURIComponent(parent)}` : "/overview/docs"}>
              <Button variant="secondary">← 상위로</Button>
            </Link>
          ) : undefined
        }
      />

      {!path ? (
        <Card title="문서 루트">
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {ROOTS.map((root) => (
              <li key={root.path}>
                <Link href={`/overview/docs?path=${encodeURIComponent(root.path)}`}>{root.label}</Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : isFile ? (
        <FileView path={path} />
      ) : (
        <DirView path={path} />
      )}
    </div>
  );
}

export default function DocsBrowserPage() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="text" rows={6} />}>
      <DocsBrowser />
    </Suspense>
  );
}

/**
 * 계획 정본 docs/plan/tasks.yaml 파싱 + 이슈 집계로 진척 유도.
 * tasks.yaml은 의도적으로 평탄한 리스트(중첩 없음)라 외부 yaml 의존성 없이 파싱한다 —
 * 형식 규칙은 파일 상단 주석과 docs/README.md 정본 레지스트리 참조.
 */
// 서버 전용 모듈 — 클라이언트 컴포넌트에서 import 금지 (라우트 핸들러만 사용)

import { readDoc } from "./docs";
import type { GhIssue, PlanNode, WbsRow } from "../types";

interface RawEntry {
  [key: string]: string | number | null;
}

/** 평탄한 "- key: value" 목록 전용 미니 파서. 중첩·배열 값은 지원하지 않는다(계약 위반 시 오류). */
export function parseTasksYaml(text: string): RawEntry[] {
  const entries: RawEntry[] = [];
  let current: RawEntry | null = null;
  for (const rawLine of text.split("\n")) {
    const line = rawLine.replace(/\s+#.*$/, "").trimEnd();
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const entryStart = line.match(/^-\s+(.*)$/);
    const body = entryStart ? entryStart[1] : line.trim();
    if (entryStart) {
      current = {};
      entries.push(current);
    }
    if (!current) throw new Error("tasks.yaml 형식 오류: 리스트 항목 밖의 내용");
    const kv = body.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (!kv) throw new Error(`tasks.yaml 형식 오류: '${body}'`);
    const [, key, rawValue] = kv;
    let value: string | number | null = rawValue.replace(/^["']|["']$/g, "");
    if (rawValue === "" || rawValue === "null" || rawValue === "~") value = null;
    else if (/^-?\d+(\.\d+)?$/.test(rawValue)) value = Number(rawValue);
    current[key] = value;
  }
  return entries;
}

export async function loadPlan(): Promise<PlanNode[]> {
  const text = await readDoc("docs/plan/tasks.yaml");
  const entries = parseTasksYaml(text);
  return entries.map((e) => ({
    id: String(e.id ?? ""),
    type: (e.type as PlanNode["type"]) ?? "task",
    title: String(e.title ?? ""),
    parent: e.parent ? String(e.parent) : null,
    owner: e.owner ? String(e.owner) : null,
    start: e.start ? String(e.start) : null,
    end: e.end ? String(e.end) : null,
    progressManual: typeof e.progress === "number" ? e.progress : null,
  }));
}

/** 진척 유도 (10-dev-workflow §5·구 status-taxonomy 환산 재사용):
 * 수동 progress 우선 → 연결 이슈의 done=100/in_progress·review=50/그 외 0 평균 → 이슈 없으면 0. */
export function computeProgress(node: PlanNode, issues: GhIssue[]): number {
  if (node.progressManual !== null) return node.progressManual;
  const linked = issues.filter((i) => i.taskId === node.id);
  if (linked.length === 0) return 0;
  const score = linked.reduce((sum, i) => {
    if (i.stage === "done") return sum + 100;
    if (i.stage === "in_progress" || i.stage === "review") return sum + 50;
    return sum;
  }, 0);
  return Math.round(score / linked.length);
}

export function toWbsRows(nodes: PlanNode[], issues: GhIssue[]): WbsRow[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const childProgress = new Map<string, number[]>();

  const rows: WbsRow[] = nodes.map((node) => {
    const linked = issues.filter((i) => i.taskId === node.id);
    const progress = computeProgress(node, issues);
    if (node.parent && byId.has(node.parent)) {
      const list = childProgress.get(node.parent) ?? [];
      list.push(progress);
      childProgress.set(node.parent, list);
    }
    return {
      ...node,
      progress,
      openIssues: linked.filter((i) => i.state === "open").length,
      closedIssues: linked.filter((i) => i.state === "closed").length,
      delayed: Boolean(node.end && node.end < new Date().toISOString().slice(0, 10) && progress < 100),
    };
  });

  // 상위(category/group) 노드는 자식 progress 평균으로 롤업 (수동값 없을 때)
  for (const row of rows) {
    if (row.type !== "task" && row.progressManual === null) {
      const children = childProgress.get(row.id);
      if (children && children.length > 0) {
        row.progress = Math.round(children.reduce((a, b) => a + b, 0) / children.length);
      }
    }
  }
  return rows;
}

/**
 * 리포 문서 조회 — 문서 브라우저와 계획 파싱의 원천.
 * 개발 편의: 이 프론트가 리포 안에서 실행 중이면 로컬 파일시스템을 읽고(푸시 전 문서도 보임),
 * 배포(Vercel)에서는 GitHub contents API를 읽는다. 두 경로 모두 읽기 전용.
 */
// 서버 전용 모듈 — 클라이언트 컴포넌트에서 import 금지 (라우트 핸들러만 사용)

import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

import { listRepoDir, readRepoFile } from "./github";
import type { DocEntry } from "../types";

/** 문서 브라우저가 노출하는 루트 — 화이트리스트 (그 밖의 경로는 읽지 않는다). */
export const DOC_ROOTS = ["docs", "apps/dms-console/docs", "AGENTS.md", "README.md"] as const;

function repoRootLocal(): string | null {
  // frontend는 <repo>/apps/dms-console/frontend 에 있다
  const candidate = path.resolve(process.cwd(), "../../..");
  return process.env.DMS_DISABLE_LOCAL_DOCS ? null : candidate;
}

function isAllowed(relPath: string): boolean {
  const normalized = path.posix.normalize(relPath);
  if (normalized.startsWith("..") || normalized.includes("\0")) return false;
  return DOC_ROOTS.some((root) => normalized === root || normalized.startsWith(`${root}/`));
}

async function localExists(abs: string): Promise<"file" | "dir" | null> {
  try {
    const s = await stat(abs);
    return s.isDirectory() ? "dir" : "file";
  } catch {
    return null;
  }
}

export async function readDoc(relPath: string): Promise<string> {
  if (!isAllowed(relPath)) throw new Error(`허용되지 않은 문서 경로: ${relPath}`);
  const root = repoRootLocal();
  if (root) {
    const abs = path.join(root, relPath);
    if ((await localExists(abs)) === "file") return readFile(abs, "utf8");
  }
  return readRepoFile(relPath);
}

export async function listDocs(relPath: string): Promise<DocEntry[]> {
  if (!isAllowed(relPath)) throw new Error(`허용되지 않은 문서 경로: ${relPath}`);
  const root = repoRootLocal();
  if (root) {
    const abs = path.join(root, relPath);
    if ((await localExists(abs)) === "dir") {
      const names = await readdir(abs, { withFileTypes: true });
      return names
        .filter((d) => !d.name.startsWith(".") && (d.isDirectory() || /\.(md|ya?ml)$/.test(d.name)))
        .map((d) => ({
          name: d.name,
          path: path.posix.join(relPath, d.name),
          type: d.isDirectory() ? ("dir" as const) : ("file" as const),
        }))
        .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1));
    }
  }
  const rows = await listRepoDir(relPath);
  return rows
    .filter((r) => !r.name.startsWith(".") && (r.type === "dir" || /\.(md|ya?ml)$/.test(r.name)))
    .map((r) => ({ name: r.name, path: r.path, type: r.type }))
    .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1));
}

export interface FrontMatter {
  layer?: string;
  status?: string;
  owner?: string;
  [key: string]: string | undefined;
}

export function parseFrontMatter(text: string): { frontMatter: FrontMatter | null; body: string } {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { frontMatter: null, body: text };
  const frontMatter: FrontMatter = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([A-Za-z_-]+):\s*(.*)$/);
    if (kv) frontMatter[kv[1]] = kv[2].replace(/^["']|["']$/g, "");
  }
  return { frontMatter, body: text.slice(m[0].length) };
}

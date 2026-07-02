/**
 * GitHub 직접 조회 데이터층 (서버 전용). 정본 원칙(ADR-0002): 실행 상태의 정본은 GitHub,
 * 대시보드는 읽기 전용 투영 — 여기서는 조회만 하며 어떤 쓰기도 하지 않는다.
 * 캐시: fetch revalidate 60초 (요청 경로에서 GitHub 라이브 호출을 완충).
 */
// 서버 전용 모듈 — 클라이언트 컴포넌트에서 import 금지 (라우트 핸들러만 사용)

export const OWNER = process.env.DMS_GITHUB_OWNER ?? "AlexEulerEuler";
export const REPO = process.env.DMS_GITHUB_REPO ?? "DMS";
const TOKEN = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;

const API = "https://api.github.com";
export const REVALIDATE_SECONDS = 60;

export class GitHubError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
  }
}

async function gh<T>(path: string, revalidate: number = REVALIDATE_SECONDS): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: {
      accept: "application/vnd.github+json",
      ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}),
    },
    next: { revalidate },
  });
  if (!res.ok) {
    const hint =
      res.status === 403 || res.status === 429
        ? " (레이트리밋 가능성 — GITHUB_TOKEN 환경변수를 설정하세요)"
        : res.status === 404
          ? ` (리포 ${OWNER}/${REPO} 접근 불가 — private이면 토큰 필요)`
          : "";
    throw new GitHubError(res.status, `GitHub API ${res.status}${hint}`);
  }
  return res.json() as Promise<T>;
}

// ── 원시 GitHub 타입 (사용하는 필드만) ─────────────────────────────────────
export interface RawLabel { name: string }
export interface RawUser { login: string; type?: string }
export interface RawIssue {
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  labels: RawLabel[];
  assignees: RawUser[];
  user: RawUser | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  html_url: string;
  comments: number;
  pull_request?: unknown; // 이슈 목록 API는 PR도 포함 — 이 필드로 구분
}
export interface RawPull {
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  draft: boolean;
  merged_at: string | null;
  head: { ref: string };
  user: RawUser | null;
  labels: RawLabel[];
  created_at: string;
  updated_at: string;
  html_url: string;
}
export interface RawComment {
  user: RawUser | null;
  body: string;
  created_at: string;
  html_url: string;
}
export interface RawCommit {
  sha: string;
  html_url: string;
  commit: { message: string; author: { name: string; date: string } | null };
  author: RawUser | null;
}

// ── 조회 (목록은 최근 100건 — 초과분은 syncNote로 표면화) ──────────────────
export const LIST_LIMIT = 100;

export function listIssuesRaw(state: "open" | "closed" | "all" = "all"): Promise<RawIssue[]> {
  return gh<RawIssue[]>(
    `/repos/${OWNER}/${REPO}/issues?state=${state}&per_page=${LIST_LIMIT}&sort=created&direction=desc`,
  ).then((rows) => rows.filter((r) => !r.pull_request));
}

export function getIssueRaw(num: number): Promise<RawIssue> {
  return gh<RawIssue>(`/repos/${OWNER}/${REPO}/issues/${num}`);
}

export function listIssueComments(num: number): Promise<RawComment[]> {
  return gh<RawComment[]>(`/repos/${OWNER}/${REPO}/issues/${num}/comments?per_page=${LIST_LIMIT}`);
}

export function listPullsRaw(state: "open" | "closed" | "all" = "all"): Promise<RawPull[]> {
  return gh<RawPull[]>(
    `/repos/${OWNER}/${REPO}/pulls?state=${state}&per_page=${LIST_LIMIT}&sort=updated&direction=desc`,
  );
}

export function listCommitsRaw(perPage = 50): Promise<RawCommit[]> {
  return gh<RawCommit[]>(`/repos/${OWNER}/${REPO}/commits?per_page=${perPage}`);
}

export interface RepoFile { path: string; type: "file" | "dir"; name: string }

export function listRepoDir(path: string): Promise<RepoFile[]> {
  return gh<RepoFile[]>(`/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path).replaceAll("%2F", "/")}`, 300);
}

export async function readRepoFile(path: string): Promise<string> {
  const data = await gh<{ content?: string; encoding?: string }>(
    `/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path).replaceAll("%2F", "/")}`,
    300,
  );
  if (data.content && data.encoding === "base64") {
    return Buffer.from(data.content, "base64").toString("utf8");
  }
  throw new GitHubError(422, `파일이 아니거나 읽을 수 없음: ${path}`);
}

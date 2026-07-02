#!/usr/bin/env node
// gate 규약 검사 + 티어 판정. 정본: docs/policy/10-dev-workflow.md §3~§5.
// GitHub Actions의 gate 잡 내부 스텝에서 실행된다 (job-level if 금지 — 스킵된 잡은 Success로 처리되는 함정).
// 출력: $GITHUB_OUTPUT에 tier=(t0|t1|t2), fork=(true|false). 규약 위반 시 exit 1.

import { execSync } from "node:child_process";
import { readFileSync, appendFileSync } from "node:fs";

const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
const pr = event.pull_request;
if (!pr) { console.log("PR 이벤트가 아님 — 통과"); process.exit(0); }

const token = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY; // owner/name
const baseRef = pr.base.ref;
const headSha = pr.head.sha;
const labels = pr.labels.map((l) => l.name);
const isFork = pr.head.repo && pr.head.repo.full_name !== repo;
const errors = [];
const warnings = [];

const sh = (cmd) => execSync(cmd, { encoding: "utf8" }).trim();
const out = (k, v) => appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`);

async function gh(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`GitHub API ${path} → ${res.status}`);
  return res.json();
}

// ── 변경 파일 수집 (rename·모드 변경 포함) ─────────────────────────────
sh(`git fetch --no-tags --depth=200 origin ${baseRef}`);
const nameStatus = sh(`git diff --name-status --find-renames origin/${baseRef}...${headSha}`);
const files = nameStatus.split("\n").filter(Boolean).flatMap((line) => {
  const parts = line.split("\t");
  return parts.slice(1); // rename은 구경로·신경로 모두 검사
});

// ── 티어 판정 (docs/policy/10-dev-workflow.md §5 — 라벨은 상향만) ──────
const T2_PATTERNS = [
  /^\.github\//, /^scripts\//, /^docs\/policy\//, /^docs\/principles\.md$/,
  /^docs\/templates\//, /^CLAUDE\.md$/, /(^|\/)AGENTS\.md$/, /^\.claude\//,
  /^package\.json$/, /^package-lock\.json$/,
];
const T0_CONTENT = [/^docs\//, /^work\//, /\.md$/, /\.(png|jpg|jpeg|gif|svg)$/i];

let tier;
if (files.some((f) => T2_PATTERNS.some((re) => re.test(f))) || labels.includes("tier:t2")) {
  tier = "t2";
} else if (
  files.length > 0 &&
  files.every((f) => T0_CONTENT.some((re) => re.test(f))) &&
  pr.additions + pr.deletions < 400
) {
  tier = "t0";
} else {
  tier = "t1";
}

// ── 브랜치 규약 ────────────────────────────────────────────────────────
const branch = pr.head.ref;
const BRANCH_RE = /^(work|feat|fix|docs|chore|refactor)\/(\d+)-[a-z0-9-]+$/;
const EXEMPT_RE = /^(hotfix|bootstrap)\//;
const m = branch.match(BRANCH_RE);
let branchIssue = m ? Number(m[2]) : null;
if (!m && !EXEMPT_RE.test(branch)) {
  errors.push(`브랜치명 '${branch}'이 규약(work/<이슈번호>-<slug> 등)과 불일치`);
}

// ── PR 본문 규약 ───────────────────────────────────────────────────────
const body = pr.body ?? "";
for (const section of ["## 요약", "## 연결", "## 변경 사항", "## 검증", "## 문서 영향", "## 정책 준수"]) {
  if (!body.includes(section)) errors.push(`PR 템플릿 섹션 누락: ${section}`);
}
const linkMatch = body.match(/\b(Closes|Refs)\s+#(\d+)/i);
if (!linkMatch) {
  if (!EXEMPT_RE.test(branch)) errors.push("PR 본문에 'Closes #N' 또는 'Refs #N' 없음");
} else {
  const linkedIssue = Number(linkMatch[2]);
  if (branchIssue && linkedIssue !== branchIssue) {
    errors.push(`이슈 참조 #${linkedIssue}이 브랜치 번호 ${branchIssue}과 불일치`);
  }
  // ready 게이트: 연결 이슈에 ready 라벨이 (부여된 적이) 있어야 착수 승인된 작업
  try {
    const issue = await gh(`/repos/${repo}/issues/${linkedIssue}`);
    const issueLabels = issue.labels.map((l) => l.name);
    if (!issueLabels.includes("ready") && issue.state === "open") {
      const events = await gh(`/repos/${repo}/issues/${linkedIssue}/events?per_page=100`);
      const everReady = events.some((e) => e.event === "labeled" && e.label?.name === "ready");
      if (!everReady) errors.push(`이슈 #${linkedIssue}에 ready 라벨이 부여된 적 없음 (착수 승인 게이트)`);
    }
  } catch (e) { warnings.push(`이슈 #${linkedIssue} 조회 실패: ${e.message}`); }
}

// ── Depends-on 게이트 ─────────────────────────────────────────────────
for (const dep of body.matchAll(/Depends-on:\s*#(\d+)/gi)) {
  try {
    const depIssue = await gh(`/repos/${repo}/issues/${dep[1]}`);
    if (depIssue.state === "open") errors.push(`선행 작업 #${dep[1]}이 아직 open (Depends-on)`);
  } catch (e) { warnings.push(`Depends-on #${dep[1]} 조회 실패: ${e.message}`); }
}

// ── T2 쿨다운: 마지막 실질 커밋 기준 24h (override 라벨은 기록됨) ──────
if (tier === "t2" && !EXEMPT_RE.test(branch)) {
  const lastCommitISO = sh(`git log -1 --no-merges --format=%cI ${headSha}`);
  const ageH = (Date.now() - new Date(lastCommitISO).getTime()) / 3.6e6;
  if (ageH < 24) {
    if (labels.includes("override")) {
      warnings.push(`T2 쿨다운(${ageH.toFixed(1)}h/24h)을 override 라벨로 우회 — 감사 대상으로 기록됨`);
    } else {
      errors.push(
        `T2 쿨다운 미충족: 마지막 실질 커밋 후 ${ageH.toFixed(1)}h (24h 필요). ` +
        `24h 경과 후 'recheck' 라벨을 부착하면 재평가된다. 비상 시 'override' 라벨(기록됨).`
      );
    }
  }
}

// ── fork PR ───────────────────────────────────────────────────────────
if (isFork) warnings.push("fork PR — 에이전트 검수가 실행되지 않으며 사람 검토가 필수 (green check를 신뢰하지 말 것)");

// ── 결과 ──────────────────────────────────────────────────────────────
out("tier", tier);
out("fork", String(isFork));
console.log(`tier=${tier} files=${files.length} (+${pr.additions}/-${pr.deletions})`);
warnings.forEach((w) => console.log(`::warning::${w}`));
if (errors.length) {
  errors.forEach((e) => console.log(`::error::${e}`));
  process.exit(1);
}
console.log("규약 검사 통과");

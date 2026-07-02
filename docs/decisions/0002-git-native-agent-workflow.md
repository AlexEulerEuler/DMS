---
layer: decision
status: approved
owner: product-owner
supersedes: ../archive/dms-console-runtime-v1.md
---

# ADR-0002. Git-native 에이전트 워크플로우 채택 (MCP/중앙 claim 루프 기각)

## 요약

에이전트 작업의 주 경로를 "중앙 SQLite + MCP/claim API + 오케스트레이터"에서
"GitHub 이슈·PR + 리포 문서 + CI 게이트"로 전환한다. 트레이드오프: 중앙 락의 엄밀한
원자성을 포기하는 대신, 개발자 로컬에 서버가 전혀 필요 없는 구조를 얻는다.

## 맥락

Phase 4~6(2026-06)에서 콘솔 백엔드에 에이전트 루프를 구현했다: MCP 서버(`mcp_server.py`),
원자적 클레임 API(`/api/work/{id}/claim|report`), 자율 오케스트레이터(`orchestrator.py`).
그러나 제품 오너가 2026-07-02에 방향을 재정의했다:

1. 개발자는 GitHub 클론 + 각자의 에이전트로 개발한다. MCP나 대시보드를 각자 실행할 필요가 없어야 한다.
2. 대시보드는 전 직군이 진행을 확인하는 읽기 전용 미러다. GitHub PR/이슈로 남는 로그를 보기 좋게 정리한다.
3. 개발·운영 정책을 에이전트가 문서로 읽을 수 있어야 하며, 메타 정책까지 갖춘 계층화 문서 시스템이 필요하다.

중앙 서버가 작업 배분의 필수 경로인 구설계는 1과 정면 충돌한다.

## 결정

- **작업 항목 = GitHub 이슈**, 클레임 = self-assign + 브랜치 push, 상태 = GitHub 사실에서 유도.
  정본: [docs/policy/10-dev-workflow.md](../policy/10-dev-workflow.md)
- **검수 = CI required check** (결정적 체크 1차 + 검수 에이전트 가산, 티어별 머지 조건).
  정본: [docs/policy/20-review-policy.md](../policy/20-review-policy.md)
- **대시보드 = Next.js 단독**(Vercel), GitHub API·리포 문서 직접 조회. FastAPI+SQLite 백엔드 폐지.
- **운영 결정**: 리포 public 전환, 봇 계정 없이 단일 계정 + 토큰 스코프 분리, 기획자·경영자
  write-through 없음(100% 읽기 전용), 기존 SQLite 데이터 폐기, 생성 파이프라인(표준 목록·일정) 제거.

## 기각한 대안

- **중앙 claim API 유지**: 개발자마다 콘솔 접속이 필요해져 요구 1 위반. 원문은
  [archive/dms-console-runtime-v1.md](../archive/dms-console-runtime-v1.md)에 보존.
- **리포 파일에 담당자 기록(push로 클레임)**: 클레임 커밋이 히스토리를 오염시키고 상태 조회가 느림.
  상태는 GitHub API로 즉시 조회 가능한 이슈에 둔다.
- **봇 계정 분리**: 오너 제약으로 불가. 대신 에이전트 세션에 fine-grained PAT(비-admin)를 준다.

## 결과

- 제거: `mcp_server.py`, `orchestrator.py`+`demo_worker.py`, claim/report 엔드포인트,
  업로드 인제스천, 생성 파이프라인, Agent CRUD, FastAPI 백엔드 전체, docker-compose.
- 신설: `AGENTS.md` 계층, `docs/policy/`, `.github/`(이슈 폼·PR 템플릿·gate), `.claude/` 킷.
- 대시보드는 GitHub 직접 조회로 전환 — 데이터 계약은 10-dev-workflow의 라벨 사전·브랜치 규약.
- 후속 작업은 [docs/plan/tasks.yaml](../plan/tasks.yaml)의 T-100번대에 기록.
